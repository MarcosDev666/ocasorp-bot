'use strict';

const db = require('../../database/models');
const { str, int, user, choices } = require('../../utils/options');
const { cmd, getSettings } = require('../../utils/premade');
const { money, duration, sample, randomInt } = require('../../utils/format');

const SLOTS = ['🍒', '🍋', '🍊', '🍇', '💎', '7️⃣'];

async function userDoc(ctx) {
  return db.User.get(ctx.guildId, ctx.userId);
}
function fmt(settings, amount) {
  return `${settings.economy.symbol} ${money(amount)}`;
}
function cooldown(user, key, ms) {
  const last = user.cooldowns?.[key];
  if (last && Date.now() - new Date(last).getTime() < ms) return ms - (Date.now() - new Date(last).getTime());
  return 0;
}
async function setCooldown(user, key) {
  user.cooldowns[key] = new Date();
  await user.save();
}

module.exports = [
  cmd({
    name: 'eco balance',
    description: 'Muestra tu saldo o el de otro usuario',
    category: 'Economía',
    groupDescription: 'Moneda, trabajo, apuestas, banco y tienda de Ocaso Roleplay',
    options: [user('usuario', 'Usuario (opcional)', false)],
    run: async (ctx) => {
      const settings = await getSettings(ctx);
      const targetUser = ctx.userOpt('usuario') || ctx.user;
      const doc = await db.User.get(ctx.guildId, targetUser.id);
      return ctx.ok('', {
        title: `💰 Economía de ${targetUser.username}`,
        thumbnail: targetUser.displayAvatarURL(),
        fields: [
          { name: 'Cartera', value: fmt(settings, doc.balance), inline: true },
          { name: 'Banco', value: fmt(settings, doc.bank), inline: true },
          { name: 'Total', value: fmt(settings, doc.balance + doc.bank), inline: true },
          { name: 'Inventario', value: `${doc.inventory.length} objeto(s)`, inline: true },
          { name: 'Moneda', value: settings.economy.currency, inline: true },
        ],
      });
    },
  }),
  cmd({
    name: 'eco diario',
    description: 'Reclama tu recompensa diaria',
    category: 'Economía',
    cooldown: 5,
    run: async (ctx) => {
      const settings = await getSettings(ctx);
      const doc = await userDoc(ctx);
      const left = cooldown(doc, 'daily', 24 * 3600000);
      if (left) return ctx.err(`Ya reclamaste tu diario. Volvé en **${duration(left)}**.`);
      const amount = settings.economy.daily;
      doc.balance += amount;
      await setCooldown(doc, 'daily');
      return ctx.ok(`🎁 ¡Reclamaste tu recompensa diaria: **${fmt(settings, amount)}**!\nSaldo actual: **${fmt(settings, doc.balance)}**`);
    },
  }),
  cmd({
    name: 'eco semanal',
    description: 'Reclama tu recompensa semanal',
    category: 'Economía',
    cooldown: 5,
    run: async (ctx) => {
      const settings = await getSettings(ctx);
      const doc = await userDoc(ctx);
      const left = cooldown(doc, 'weekly', 7 * 24 * 3600000);
      if (left) return ctx.err(`Ya reclamaste tu semanal. Volvé en **${duration(left)}**.`);
      doc.balance += settings.economy.weekly;
      await setCooldown(doc, 'weekly');
      return ctx.ok(`🎁 ¡Recompensa semanal: **${fmt(settings, settings.economy.weekly)}**!`);
    },
  }),
  cmd({
    name: 'eco trabajar',
    description: 'Trabaja en Ocaso Roleplay para ganar dinero',
    category: 'Economía',
    run: async (ctx) => {
      const settings = await getSettings(ctx);
      const doc = await userDoc(ctx);
      const left = cooldown(doc, 'work', 3600000);
      if (left) return ctx.err(`Estás cansado. Volvé a trabajar en **${duration(left)}**.`);
      const jobs = ['camionero', 'taxista', 'mecánico', 'repartidor de pizza', 'barrendero', 'seguridad', 'minero', 'pescador'];
      const job = sample(jobs);
      const amount = randomInt(settings.economy.workMin, settings.economy.workMax);
      doc.balance += amount;
      await setCooldown(doc, 'work');
      return ctx.ok(`💼 Trabajaste como **${job}** y ganaste **${fmt(settings, amount)}**.\nSaldo: **${fmt(settings, doc.balance)}**`);
    },
  }),
  cmd({
    name: 'eco pagar',
    description: 'Paga dinero a otro jugador',
    category: 'Economía',
    options: [user('usuario', 'Destinatario', true), int('cantidad', 'Cantidad', true, { min_value: 1 })],
    run: async (ctx) => {
      const settings = await getSettings(ctx);
      const amount = ctx.int('cantidad');
      const targetUser = ctx.userOpt('usuario');
      if (targetUser.id === ctx.userId) return ctx.err('No podés pagarte a vos mismo.');
      if (targetUser.bot) return ctx.err('No podés pagar a un bot.');
      const doc = await userDoc(ctx);
      const fee = Math.ceil(amount * 0.05);
      if (doc.balance < amount + fee) return ctx.err(`No te alcanza: necesitás **${fmt(settings, amount + fee)}** (incluye 5% de comisión). Tu saldo: **${fmt(settings, doc.balance)}**.`);
      const other = await db.User.get(ctx.guildId, targetUser.id);
      doc.balance -= amount + fee;
      other.balance += amount;
      await doc.save();
      await other.save();
      return ctx.ok(`💸 Pagaste **${fmt(settings, amount)}** a ${targetUser} (comisión: ${fmt(settings, fee)}).`);
    },
  }),
  cmd({
    name: 'eco robar',
    description: 'Intenta robarle dinero a otro jugador',
    category: 'Economía',
    cooldown: 10,
    options: [user('usuario', 'Víctima', true)],
    run: async (ctx) => {
      const settings = await getSettings(ctx);
      const targetUser = ctx.userOpt('usuario');
      if (targetUser.bot) return ctx.err('No podés robarle a un bot.');
      if (targetUser.id === ctx.userId) return ctx.err('No podés robarte a vos mismo.');
      const doc = await userDoc(ctx);
      const left = cooldown(doc, 'rob', 3600000);
      if (left) return ctx.err(`La policía te está buscando. Esperá **${duration(left)}**.`);
      const other = await db.User.get(ctx.guildId, targetUser.id);
      if (other.balance < 50) return ctx.err('Ese usuario no tiene suficiente dinero en la cartera.');
      await setCooldown(doc, 'rob');
      if (Math.random() < 0.4) {
        const amount = Math.min(other.balance, randomInt(50, 500));
        other.balance -= amount;
        doc.balance += amount;
        await other.save();
        await doc.save();
        return ctx.ok(`🕵️ ¡Robo exitoso! Le robaste **${fmt(settings, amount)}** a ${targetUser}.`);
      }
      const fine = Math.min(doc.balance, randomInt(50, 300));
      doc.balance -= fine;
      await doc.save();
      return ctx.ok(`🚔 ¡Te atraparon! Pagaste una multa de **${fmt(settings, fine)}**.`);
    },
  }),
  cmd({
    name: 'eco apostar',
    description: 'Apuesta dinero al cara o cruz',
    category: 'Economía',
    options: [int('cantidad', 'Cantidad a apostar', true, { min_value: 10, max_value: 100000 }), str('eleccion', 'Cara o cruz', true, { choices: choices(['Cara', 'cara'], ['Cruz', 'cruz']) })],
    run: async (ctx) => {
      const settings = await getSettings(ctx);
      const doc = await userDoc(ctx);
      const amount = ctx.int('cantidad');
      if (doc.balance < amount) return ctx.err('No tenés suficiente dinero.');
      const result = Math.random() < 0.5 ? 'cara' : 'cruz';
      const won = result === ctx.str('eleccion');
      doc.balance += won ? amount : -amount;
      await doc.save();
      return ctx.ok(`🪙 Salió **${result}**. ${won ? `¡Ganaste **${fmt(settings, amount)}**!` : `Perdiste **${fmt(settings, amount)}**.`}\nSaldo: **${fmt(settings, doc.balance)}**`);
    },
  }),
  cmd({
    name: 'eco tragaperras',
    description: 'Juega a la máquina tragamonedas',
    category: 'Economía',
    cooldown: 5,
    options: [int('apuesta', 'Apuesta (por defecto 250)', false, { min_value: 50, max_value: 25000 })],
    run: async (ctx) => {
      const settings = await getSettings(ctx);
      const doc = await userDoc(ctx);
      const bet = ctx.int('apuesta') || 250;
      if (doc.balance < bet) return ctx.err('No tenés suficiente dinero.');
      const roll = [sample(SLOTS), sample(SLOTS), sample(SLOTS)];
      let multiplier = 0;
      if (roll[0] === roll[1] && roll[1] === roll[2]) multiplier = roll[0] === '7️⃣' ? 10 : 5;
      else if (roll[0] === roll[1] || roll[1] === roll[2] || roll[0] === roll[2]) multiplier = 2;
      const win = bet * multiplier;
      doc.balance += win - bet;
      await doc.save();
      return ctx.ok('', {
        title: '🎰 Tragamonedas',
        description: `## ${roll.join(' | ')}\n\n${multiplier ? `🎉 ¡Ganaste **${fmt(settings, win)}**! (x${multiplier})` : `😢 Perdiste **${fmt(settings, bet)}**.`}`,
        fields: [{ name: 'Saldo', value: fmt(settings, doc.balance), inline: true }],
      });
    },
  }),
  cmd({
    name: 'eco ruleta',
    description: 'Juega a la ruleta (color o paridad)',
    category: 'Economía',
    cooldown: 5,
    options: [
      int('apuesta', 'Apuesta', true, { min_value: 50, max_value: 50000 }),
      str('tipo', 'Tipo de apuesta', true, { choices: choices(['Color', 'color'], ['Paridad', 'paridad']) }),
      str('valor', 'rojo/negro/verde o par/impar', true),
    ],
    run: async (ctx) => {
      const settings = await getSettings(ctx);
      const doc = await userDoc(ctx);
      const bet = ctx.int('apuesta');
      if (doc.balance < bet) return ctx.err('No tenés suficiente dinero.');
      const type = ctx.str('tipo');
      const value = ctx.str('valor').toLowerCase();
      const number = randomInt(0, 36);
      const color = number === 0 ? 'verde' : number % 2 === 0 ? 'negro' : 'rojo';
      const parity = number === 0 ? 'ninguna' : number % 2 === 0 ? 'par' : 'impar';
      let won = false;
      let multiplier = 0;
      if (type === 'color') {
        won = value === color;
        multiplier = color === 'verde' ? 14 : 2;
      } else {
        won = value === parity;
        multiplier = 2;
      }
      doc.balance += won ? bet * multiplier - bet : -bet;
      await doc.save();
      return ctx.ok('', {
        title: '🎡 Ruleta',
        description: `Salió **${number}** (${color}, ${parity}).\n\n${won ? `🎉 ¡Ganaste **${fmt(settings, bet * multiplier)}**!` : `😢 Perdiste **${fmt(settings, bet)}**.`}`,
        fields: [{ name: 'Saldo', value: fmt(settings, doc.balance), inline: true }],
      });
    },
  }),
  cmd({
    name: 'eco banco',
    description: 'Muestra tu cuenta bancaria',
    category: 'Economía',
    run: async (ctx) => {
      const settings = await getSettings(ctx);
      const doc = await userDoc(ctx);
      const interest = Math.floor(doc.bank * ((settings.economy.interest || 1) / 100));
      return ctx.ok('', {
        title: '🏦 Banco de Ocaso Roleplay',
        fields: [
          { name: 'Cartera', value: fmt(settings, doc.balance), inline: true },
          { name: 'Banco', value: fmt(settings, doc.bank), inline: true },
          { name: 'Interés diario', value: `${settings.economy.interest}% → ${fmt(settings, interest)}`, inline: true },
        ],
        footer: 'Usá /eco depositar o /eco retirar para mover tu dinero',
      });
    },
  }),
  cmd({
    name: 'eco depositar',
    description: 'Deposita dinero en el banco',
    category: 'Economía',
    options: [int('cantidad', 'Cantidad', true, { min_value: 1 })],
    run: async (ctx) => {
      const settings = await getSettings(ctx);
      const doc = await userDoc(ctx);
      const amount = ctx.int('cantidad');
      if (doc.balance < amount) return ctx.err('No tenés suficiente dinero en la cartera.');
      doc.balance -= amount;
      doc.bank += amount;
      await doc.save();
      return ctx.ok(`🏦 Depositiste **${fmt(settings, amount)}**. Banco: **${fmt(settings, doc.bank)}**.`);
    },
  }),
  cmd({
    name: 'eco retirar',
    description: 'Retira dinero del banco',
    category: 'Economía',
    options: [int('cantidad', 'Cantidad', true, { min_value: 1 })],
    run: async (ctx) => {
      const settings = await getSettings(ctx);
      const doc = await userDoc(ctx);
      const amount = ctx.int('cantidad');
      if (doc.bank < amount) return ctx.err('No tenés suficiente dinero en el banco.');
      doc.bank -= amount;
      doc.balance += amount;
      await doc.save();
      return ctx.ok(`💵 Retiraste **${fmt(settings, amount)}**. Cartera: **${fmt(settings, doc.balance)}**.`);
    },
  }),
  cmd({
    name: 'eco tienda',
    description: 'Muestra la tienda del servidor',
    category: 'Economía',
    run: async (ctx) => {
      const items = await db.ShopItem.find({ guildId: ctx.guildId, enabled: true }).sort({ price: 1 }).lean();
      if (!items.length) return ctx.err('La tienda está vacía. Un administrador puede agregar productos.');
      return ctx.ok('', {
        title: '🛒 Tienda de Ocaso Roleplay',
        description: items.map((i) => `${i.emoji || '📦'} **${i.name}** — ${money(i.price)}${i.stock >= 0 ? ` · stock: ${i.stock}` : ''}\n> ${i.description || 'Sin descripción'}${i.roleId ? `\n> Rol: <@&${i.roleId}>` : ''}`).join('\n'),
        footer: 'Comprá con /eco comprar',
      });
    },
  }),
  cmd({
    name: 'eco comprar',
    description: 'Compra un objeto de la tienda',
    category: 'Economía',
    options: [str('objeto', 'Nombre del objeto', true, { autocomplete: true })],
    autocomplete: async (ctx) => {
      const items = await db.ShopItem.find({ guildId: ctx.guildId, enabled: true }).limit(25).lean();
      return ctx.interaction.respond(items.filter((i) => i.name.toLowerCase().includes(String(ctx.focused('objeto') || '').toLowerCase())).map((i) => ({ name: `${i.name} — $${i.price}`, value: i.name }))).catch(() => null);
    },
    run: async (ctx) => {
      const settings = await getSettings(ctx);
      const item = await db.ShopItem.findOne({ guildId: ctx.guildId, name: new RegExp(`^${ctx.str('objeto').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'), enabled: true });
      if (!item) return ctx.err('Ese objeto no existe en la tienda.');
      if (item.stock === 0) return ctx.err('Ese objeto está agotado.');
      const doc = await userDoc(ctx);
      if (doc.balance < item.price) return ctx.err(`No tenés suficiente dinero. Necesitás **${fmt(settings, item.price)}**.`);
      doc.balance -= item.price;
      const existing = doc.inventory.find((i) => i.itemId === String(item._id));
      if (existing) existing.quantity += 1;
      else doc.inventory.push({ itemId: String(item._id), name: item.name, quantity: 1 });
      await doc.save();
      if (item.stock > 0) { item.stock -= 1; await item.save(); }
      if (item.roleId) await ctx.member.roles.add(item.roleId, `Compra: ${item.name}`).catch(() => null);
      return ctx.ok(`🛍️ Compraste **${item.name}** por **${fmt(settings, item.price)}**.`);
    },
  }),
  cmd({
    name: 'eco inventario',
    description: 'Muestra tu inventario',
    category: 'Economía',
    options: [user('usuario', 'Usuario (opcional)', false)],
    run: async (ctx) => {
      const targetUser = ctx.userOpt('usuario') || ctx.user;
      const doc = await db.User.get(ctx.guildId, targetUser.id);
      if (!doc.inventory.length) return ctx.ok(`${targetUser.id === ctx.userId ? 'Tu' : 'Su'} inventario está vacío.`);
      return ctx.ok('', {
        title: `🎒 Inventario de ${targetUser.username}`,
        description: doc.inventory.map((i) => `• **${i.name}** x${i.quantity}`).join('\n'),
      });
    },
  }),
  cmd({
    name: 'eco vender',
    description: 'Vende un objeto de tu inventario al 50%',
    category: 'Economía',
    options: [str('objeto', 'Nombre del objeto', true, { autocomplete: true })],
    autocomplete: async (ctx) => {
      const doc = await db.User.get(ctx.guildId, ctx.userId);
      return ctx.interaction.respond(doc.inventory.filter((i) => i.name.toLowerCase().includes(String(ctx.focused('objeto') || '').toLowerCase())).map((i) => ({ name: `${i.name} x${i.quantity}`, value: i.name }))).catch(() => null);
    },
    run: async (ctx) => {
      const settings = await getSettings(ctx);
      const doc = await userDoc(ctx);
      const entry = doc.inventory.find((i) => i.name.toLowerCase() === ctx.str('objeto').toLowerCase());
      if (!entry) return ctx.err('No tenés ese objeto.');
      const item = await db.ShopItem.findById(entry.itemId).catch(() => null);
      const price = Math.floor((item?.price || 0) * 0.5);
      entry.quantity -= 1;
      if (entry.quantity <= 0) doc.inventory = doc.inventory.filter((i) => i.name !== entry.name);
      doc.balance += price;
      await doc.save();
      if (item?.roleId) await ctx.member.roles.remove(item.roleId).catch(() => null);
      return ctx.ok(`💵 Vendiste **${entry.name}** por **${fmt(settings, price)}**.`);
    },
  }),
  cmd({
    name: 'eco ranking',
    description: 'Ranking de los jugadores más ricos',
    category: 'Economía',
    cooldown: 5,
    run: async (ctx) => {
      const docs = await db.User.find({ guildId: ctx.guildId }).sort({ balance: -1, bank: -1 }).limit(10).lean();
      if (!docs.length) return ctx.err('Todavía no hay datos económicos.');
      const medals = ['🥇', '🥈', '🥉'];
      return ctx.ok('', {
        title: '💎 Ranking de riqueza',
        description: docs.map((d, i) => `${medals[i] || `**${i + 1}.**`} <@${d.userId}> — ${money(d.balance + d.bank)}`).join('\n'),
      });
    },
  }),
  cmd({
    name: 'eco crimen',
    description: 'Cometé un crimen para ganar dinero (con riesgo)',
    category: 'Economía',
    run: async (ctx) => {
      const settings = await getSettings(ctx);
      const doc = await userDoc(ctx);
      const left = cooldown(doc, 'crime', 2 * 3600000);
      if (left) return ctx.err(`Todavía estás escondido. Esperá **${duration(left)}**.`);
      const success = Math.random() < 0.5;
      const amount = success ? randomInt(300, 1200) : -randomInt(100, 500);
      doc.balance = Math.max(0, doc.balance + amount);
      await setCooldown(doc, 'crime');
      await doc.save();
      return ctx.ok(success ? `🦹 Cometiste un crimen y ganaste **${fmt(settings, amount)}**.` : `🚔 Te descubrieron y perdiste **${fmt(settings, Math.abs(amount))}**.`);
    },
  }),
  cmd({
    name: 'eco pescar',
    description: 'Pesca en el muelle para ganar dinero',
    category: 'Economía',
    run: async (ctx) => {
      const settings = await getSettings(ctx);
      const doc = await userDoc(ctx);
      const left = cooldown(doc, 'fish', 1800000);
      if (left) return ctx.err(`Los peces no aparecen todavía. Volvé en **${duration(left)}**.`);
      const catchItem = sample(['una lubina', 'un dorado', 'un bagre', 'una trucha', 'una bota vieja', 'un pez raro']);
      const amount = catchItem.includes('bota') ? randomInt(5, 20) : randomInt(100, 450);
      doc.balance += amount;
      await setCooldown(doc, 'fish');
      return ctx.ok(`🎣 Pesaste **${catchItem}** y ganaste **${fmt(settings, amount)}**.`);
    },
  }),
  cmd({
    name: 'eco minar',
    description: 'Mina recursos para ganar dinero',
    category: 'Economía',
    run: async (ctx) => {
      const settings = await getSettings(ctx);
      const doc = await userDoc(ctx);
      const left = cooldown(doc, 'mine', 2700000);
      if (left) return ctx.err(`La mina está ocupada. Volvé en **${duration(left)}**.`);
      const ore = sample(['carbón', 'hierro', 'oro', 'diamante', 'piedra']);
      const amount = { carbón: 120, hierro: 220, oro: 480, diamante: 900, piedra: 40 }[ore] + randomInt(0, 100);
      doc.balance += amount;
      await setCooldown(doc, 'mine');
      return ctx.ok(`⛏️ Minaste **${ore}** y ganaste **${fmt(settings, amount)}**.`);
    },
  }),
  cmd({
    name: 'eco mendigar',
    description: 'Pedí dinero en la calle',
    category: 'Economía',
    run: async (ctx) => {
      const settings = await getSettings(ctx);
      const doc = await userDoc(ctx);
      const left = cooldown(doc, 'beg', 900000);
      if (left) return ctx.err(`Nadie te va a dar más por ahora. Esperá **${duration(left)}**.`);
      const amount = randomInt(10, 120);
      doc.balance += amount;
      await setCooldown(doc, 'beg');
      return ctx.ok(`🥺 Mendigaste y juntaste **${fmt(settings, amount)}**.`);
    },
  }),
  cmd({
    name: 'eco interes',
    description: 'Reclama el interés diario de tu cuenta bancaria',
    category: 'Economía',
    run: async (ctx) => {
      const settings = await getSettings(ctx);
      const doc = await userDoc(ctx);
      const left = cooldown(doc, 'interest', 24 * 3600000);
      if (left) return ctx.err(`El interés se acredita cada 24 horas. Volvé en **${duration(left)}**.`);
      if (doc.bank < 100) return ctx.err('Necesitás al menos $100 en el banco para generar intereses.');
      const amount = Math.floor(doc.bank * ((settings.economy.interest || 1) / 100));
      doc.bank += amount;
      doc.cooldowns.interest = new Date();
      await doc.save();
      return ctx.ok(`🏦 Interés acreditado: **${fmt(settings, amount)}**. Banco: **${fmt(settings, doc.bank)}**.`);
    },
  }),
  cmd({
    name: 'eco premio',
    description: 'Otorga dinero a un usuario (staff)',
    category: 'Economía',
    perms: ['ManageGuild'],
    options: [user('usuario', 'Usuario', true), int('cantidad', 'Cantidad', true, { min_value: 1 }), str('motivo', 'Motivo', false)],
    run: async (ctx) => {
      const settings = await getSettings(ctx);
      const targetUser = ctx.userOpt('usuario');
      const doc = await db.User.get(ctx.guildId, targetUser.id);
      doc.balance += ctx.int('cantidad');
      await doc.save();
      return ctx.ok(`🎁 Se otorgaron **${fmt(settings, ctx.int('cantidad'))}** a ${targetUser}${ctx.str('motivo') ? ` (${ctx.str('motivo')})` : ''}.`);
    },
  }),
  cmd({
    name: 'eco setbal',
    description: 'Establece el saldo de un usuario (staff)',
    category: 'Economía',
    perms: ['ManageGuild'],
    options: [user('usuario', 'Usuario', true), int('cantidad', 'Nuevo saldo', true, { min_value: 0 })],
    run: async (ctx) => {
      const settings = await getSettings(ctx);
      const targetUser = ctx.userOpt('usuario');
      const doc = await db.User.get(ctx.guildId, targetUser.id);
      doc.balance = ctx.int('cantidad');
      await doc.save();
      return ctx.ok(`💰 Saldo de ${targetUser} establecido en **${fmt(settings, doc.balance)}**.`);
    },
  }),
  cmd({
    name: 'eco reset',
    description: 'Reinicia la economía de un usuario (staff)',
    category: 'Economía',
    perms: ['Administrator'],
    options: [user('usuario', 'Usuario', true)],
    run: async (ctx) => {
      const targetUser = ctx.userOpt('usuario');
      await db.User.updateOne({ guildId: ctx.guildId, userId: targetUser.id }, { balance: 0, bank: 0, inventory: [] });
      return ctx.ok(`♻️ Economía de ${targetUser} reiniciada.`);
    },
  }),
];
