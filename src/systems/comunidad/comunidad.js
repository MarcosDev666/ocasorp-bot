'use strict';
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const db = require('../../database/models');
const { str, int, bool, user, role, channel } = require('../../utils/options');
const { cmd, saveSettings, getSettings, embed, yesNo } = require('../../utils/premade');
const { giveawayEmbed, giveawayRows, finishGiveaway } = require('../../services/giveaways');

const { parseDuration, duration, timestamp, number, shuffle } = require('../../utils/format');

module.exports = [
  cmd({
    name: 'perfil',
    description: 'Muestra el perfil completo de un usuario',
    category: 'Comunidad',
    groupDescription: 'Perfiles, reputación, cumpleaños, eventos y sorteos de la comunidad',
    options: [user('usuario', 'Usuario (opcional)')],
    run: async (ctx) => {
      const targetUser = ctx.userOpt('usuario') || ctx.user;
      const [doc, samp] = await Promise.all([
        db.User.get(ctx.guildId, targetUser.id),
        db.SampProfile.findOne({ guildId: ctx.guildId, userId: targetUser.id }).catch(() => null),
      ]);
      const member = await ctx.guild.members.fetch(targetUser.id).catch(() => null);
      return ctx.reply({ embeds: [embed()
        .setAuthor({ name: targetUser.tag, iconURL: targetUser.displayAvatarURL() })
        .setThumbnail(targetUser.displayAvatarURL({ size: 256 }))
        .setDescription(doc.bio || 'Sin biografía. Podés escribir una con `/bio`.')
        .addFields(
          { name: 'Nivel', value: `${doc.level} · ${number(doc.xp)} XP`, inline: true },
          { name: 'Reputación', value: `⭐ ${doc.rep}`, inline: true },
          { name: 'Mensajes', value: number(doc.messages), inline: true },
          { name: 'Personaje', value: samp?.playerName || 'No vinculado', inline: true },
          { name: 'Facción', value: samp?.faction || 'Civil', inline: true },
          { name: 'Horas de rol', value: samp ? number(samp.hours) : '—', inline: true },
          { name: 'Cumpleaños', value: doc.birthday?.day ? `${doc.birthday.day}/${doc.birthday.month}` : 'No configurado', inline: true },
          { name: 'Se unió', value: member?.joinedTimestamp ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>` : '—', inline: true },
          { name: 'Economía', value: `$${number(doc.balance)} · banco $${number(doc.bank)}`, inline: true },
        )] });
    },
  }),
  cmd({
    name: 'bio',
    description: 'Establece tu biografía de perfil',
    category: 'Comunidad',
    options: [str('texto', 'Tu biografía (máx 300 caracteres)', true, { max_length: 300 })],
    run: async (ctx) => {
      const doc = await db.User.get(ctx.guildId, ctx.userId);
      doc.bio = ctx.str('texto');
      await doc.save();
      return ctx.ok('✅ Biografía actualizada.');
    },
  }),
  cmd({
    name: 'rep',
    description: 'Dale reputación a otro usuario',
    category: 'Comunidad',
    options: [user('usuario', 'Usuario', true)],
    run: async (ctx) => {
      const targetUser = ctx.userOpt('usuario');
      if (targetUser.id === ctx.userId) return ctx.err('No podés darte reputación a vos mismo.');
      if (targetUser.bot) return ctx.err('No podés darle reputación a un bot.');
      const doc = await db.User.get(ctx.guildId, ctx.userId);
      if (doc.cooldowns.rep && Date.now() - new Date(doc.cooldowns.rep).getTime() < 24 * 3600000) {
        return ctx.err(`Ya diste reputación hoy. Volvé en **${duration(24 * 3600000 - (Date.now() - new Date(doc.cooldowns.rep).getTime()))}**.`);
      }
      const other = await db.User.get(ctx.guildId, targetUser.id);
      other.rep += 1;
      doc.cooldowns.rep = new Date();
      await other.save();
      await doc.save();
      return ctx.ok(`⭐ Le diste **+1 de reputación** a ${targetUser}. Ahora tiene **${other.rep}**.`);
    },
  }),
  cmd({
    name: 'rep-ranking',
    description: 'Ranking de reputación del servidor',
    category: 'Comunidad',
    cooldown: 5,
    run: async (ctx) => {
      const docs = await db.User.find({ guildId: ctx.guildId, rep: { $gt: 0 } }).sort({ rep: -1 }).limit(10).lean();
      if (!docs.length) return ctx.err('Todavía nadie tiene reputación.');
      return ctx.ok('', { title: '⭐ Ranking de reputación', description: docs.map((d, i) => `**${i + 1}.** <@${d.userId}> — ${d.rep} puntos`).join('\n') });
    },
  }),
  cmd({
    name: 'cumpleanos',
    description: 'Configura tu fecha de cumpleaños',
    category: 'Comunidad',
    options: [int('dia', 'Día', true, { min_value: 1, max_value: 31 }), int('mes', 'Mes', true, { min_value: 1, max_value: 12 }), int('anio', 'Año (opcional)', false, { min_value: 1900, max_value: 2020 })],
    run: async (ctx) => {
      const day = ctx.int('dia');
      const month = ctx.int('mes');
      const test = new Date(2024, month - 1, day);
      if (test.getDate() !== day || test.getMonth() !== month - 1) return ctx.err('Esa fecha no existe.');
      const doc = await db.User.get(ctx.guildId, ctx.userId);
      doc.birthday = { day, month, year: ctx.int('anio') || null };
      await doc.save();
      return ctx.ok(`🎂 Cumpleaños guardado: **${day}/${month}**${ctx.int('anio') ? `/${ctx.int('anio')}` : ''}.`);
    },
  }),
  cmd({
    name: 'cumpleanos-config',
    description: 'Configura los anuncios de cumpleaños',
    category: 'Comunidad',
    perms: ['ManageGuild'],
    options: [channel('canal', 'Canal de anuncios', false), bool('activar', 'Activar o desactivar', false), bool('lista', 'Listar los cumpleaños del mes', false), int('mes', 'Mes a listar', false, { min_value: 1, max_value: 12 })],
    run: async (ctx) => {
      if (ctx.bool('lista')) {
        const month = ctx.int('mes') || new Date().getMonth() + 1;
        const docs = await db.User.find({ guildId: ctx.guildId, 'birthday.month': month }).sort({ 'birthday.day': 1 }).lean();
        return ctx.ok('', { title: `🎂 Cumpleaños de mes ${month}`, description: docs.map((d) => `• <@${d.userId}> — ${d.birthday.day}/${month}`).join('\n') || 'No hay cumpleaños registrados este mes.' });
      }
      const settings = await saveSettings(ctx, (g) => {
        if (ctx.channelOpt('canal')) g.birthdays.channelId = ctx.channelOpt('canal').id;
        if (ctx.bool('activar') !== null) g.birthdays.enabled = ctx.bool('activar');
      });
      return ctx.ok('', { title: '🎂 Cumpleaños', fields: [{ name: 'Estado', value: yesNo(settings.birthdays.enabled), inline: true }, { name: 'Canal', value: settings.birthdays.channelId ? `<#${settings.birthdays.channelId}>` : 'No configurado', inline: true }] });
    },
  }),
  cmd({
    name: 'sugerencias-config',
    description: 'Configura el canal de sugerencias',
    category: 'Comunidad',
    perms: ['ManageGuild'],
    options: [channel('canal', 'Canal de sugerencias', true), bool('activar', 'Activar o desactivar', false)],
    run: async (ctx) => {
      const settings = await saveSettings(ctx, (g) => {
        g.suggestions.channelId = ctx.channelOpt('canal').id;
        g.suggestions.enabled = ctx.bool('activar') !== null ? ctx.bool('activar') : true;
      });
      return ctx.ok(`✅ Sugerencias ${settings.suggestions.enabled ? 'activadas' : 'desactivadas'} en <#${settings.suggestions.channelId}>.`);
    },
  }),
  cmd({
    name: 'sorteo-crear',
    description: 'Crea un sorteo en el canal actual',
    category: 'Comunidad',
    perms: ['ManageGuild'],
    botPerms: ['AddReactions'],
    options: [
      str('premio', 'Premio del sorteo', true, { max_length: 200 }),
      str('duracion', 'Duración (ej: 1h, 3d)', true),
      int('ganadores', 'Cantidad de ganadores', false, { min_value: 1, max_value: 20 }),
      str('descripcion', 'Descripción', false, { max_length: 500 }),
      role('rol_requerido', 'Rol requerido para participar', false),
      int('nivel_requerido', 'Nivel mínimo', false, { min_value: 0 }),
      bool('solo_boosters', 'Solo boosters', false),
    ],
    run: async (ctx) => {
      const ms = parseDuration(ctx.str('duracion'));
      if (!ms || ms < 60000) return ctx.err('Duración inválida. Usá por ejemplo `30m`, `2h`, `7d`.');
      const giveaway = await db.Giveaway.create({
        guildId: ctx.guildId, channelId: ctx.channelId, messageId: `pending-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, hostId: ctx.userId,
        prize: ctx.str('premio'), description: ctx.str('descripcion'), winnersCount: ctx.int('ganadores') || 1,
        endsAt: new Date(Date.now() + ms),
        requirements: { roleId: ctx.roleOpt('rol_requerido')?.id, level: ctx.int('nivel_requerido') || null, booster: ctx.bool('solo_boosters') || false },
      });
      const msg = await ctx.channel.send({ embeds: [giveawayEmbed(giveaway)], components: giveawayRows(giveaway) });
      giveaway.messageId = msg.id;
      await giveaway.save();
      return ctx.ok(`🎉 Sorteo **${giveaway.prize}** creado: ${msg.url}`);
    },
  }),
  cmd({
    name: 'sorteo-finalizar',
    description: 'Finaliza un sorteo antes de tiempo',
    category: 'Comunidad',
    perms: ['ManageGuild'],
    options: [str('mensaje_id', 'ID del mensaje del sorteo', true)],
    run: async (ctx) => {
      const giveaway = await db.Giveaway.findOne({ guildId: ctx.guildId, messageId: ctx.str('mensaje_id'), ended: false });
      if (!giveaway) return ctx.err('Sorteo no encontrado o ya finalizado.');
      const winners = await finishGiveaway(ctx.client, giveaway);
      return ctx.ok(`🏁 Sorteo finalizado. Ganadores: ${winners.length ? winners.map((w) => `<@${w}>`).join(', ') : 'ninguno'}.`);
    },
  }),
  cmd({
    name: 'sorteo-reroll',
    description: 'Vuelve a sortear un sorteo finalizado',
    category: 'Comunidad',
    perms: ['ManageGuild'],
    options: [str('mensaje_id', 'ID del mensaje del sorteo', true)],
    run: async (ctx) => {
      const giveaway = await db.Giveaway.findOne({ guildId: ctx.guildId, messageId: ctx.str('mensaje_id'), ended: true });
      if (!giveaway) return ctx.err('Sorteo no encontrado o todavía no finalizó.');
      const winners = shuffle(giveaway.entries).slice(0, giveaway.winnersCount);
      giveaway.winnerIds = winners;
      await giveaway.save();
      return ctx.ok(`🔄 Nuevo sorteo: ${winners.length ? winners.map((w) => `<@${w}>`).join(', ') : 'sin participantes'}.`);
    },
  }),
  cmd({
    name: 'roles-reaccion-crear',
    description: 'Crea un panel de roles autoasignables',
    category: 'Comunidad',
    perms: ['ManageGuild'],
    botPerms: ['ManageRoles'],
    options: [
      str('titulo', 'Título del panel', true, { max_length: 120 }),
      role('rol1', 'Primer rol', true),
      str('descripcion', 'Descripción', false, { max_length: 1000 }),
      str('emoji1', 'Emoji del primer rol', false),
      role('rol2', 'Segundo rol', false), str('emoji2', 'Emoji del segundo rol', false),
      role('rol3', 'Tercer rol', false), str('emoji3', 'Emoji del tercer rol', false),
      role('rol4', 'Cuarto rol', false), str('emoji4', 'Emoji del cuarto rol', false),
      role('rol5', 'Quinto rol', false), str('emoji5', 'Emoji del quinto rol', false),
      bool('exclusivo', 'Solo un rol a la vez', false),
    ],
    run: async (ctx) => {
      const pairs = [];
      for (let i = 1; i <= 5; i += 1) {
        const r = ctx.roleOpt(`rol${i}`);
        if (!r) continue;
        if (r.position >= ctx.guild.members.me.roles.highest.position) return ctx.err(`El rol ${r} está por encima de mi rol más alto.`);
        pairs.push({ roleId: r.id, emoji: ctx.str(`emoji${i}`) || '🎭', label: r.name });
      }
      if (!pairs.length) return ctx.err('Necesitás al menos un rol.');
      const panelId = `rr-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
      const components = [];
      for (let i = 0; i < pairs.length; i += 5) {
        components.push(new ActionRowBuilder().addComponents(pairs.slice(i, i + 5).map((p) => new ButtonBuilder().setCustomId(`rr:${panelId}:${p.roleId}`).setEmoji(p.emoji).setLabel(p.label.slice(0, 80)).setStyle(ButtonStyle.Secondary))));
      }
      const msg = await ctx.channel.send({ embeds: [embed().setTitle(ctx.str('titulo')).setDescription(ctx.str('descripcion') || 'Elegí tus roles con los botones de abajo.')], components });
      await db.ReactionRole.create({ guildId: ctx.guildId, channelId: ctx.channelId, messageId: msg.id, panelId, mode: ctx.bool('exclusivo') ? 'unique' : 'normal', pairs, title: ctx.str('titulo'), description: ctx.str('descripcion') });
      return ctx.ok(`✅ Panel de roles publicado: ${msg.url}`);
    },
  }),
  cmd({
    name: 'roles-reaccion-lista',
    description: 'Lista los paneles de roles autoasignables',
    category: 'Comunidad',
    perms: ['ManageGuild'],
    run: async (ctx) => {
      const panels = await db.ReactionRole.find({ guildId: ctx.guildId }).limit(20).lean();
      if (!panels.length) return ctx.err('No hay paneles configurados.');
      return ctx.ok('', {
        title: '🎭 Paneles de roles',
        description: panels.map((p) => `• **${p.title || 'Panel'}** en <#${p.channelId}> — ${p.pairs.length} roles · modo \`${p.mode}\`${p.messageId ? `\n> https://discord.com/channels/${ctx.guildId}/${p.channelId}/${p.messageId}` : ''}`).join('\n'),
      });
    },
  }),
  cmd({
    name: 'starboard-config',
    description: 'Configura el canal de mensajes destacados',
    category: 'Comunidad',
    perms: ['ManageGuild'],
    options: [channel('canal', 'Canal de starboard', false), int('estrellas', 'Reacciones necesarias', false, { min_value: 1, max_value: 20 }), bool('activar', 'Activar o desactivar', false)],
    run: async (ctx) => {
      const settings = await saveSettings(ctx, (g) => {
        if (ctx.channelOpt('canal')) g.starboard.channelId = ctx.channelOpt('canal').id;
        if (ctx.int('estrellas')) g.starboard.threshold = ctx.int('estrellas');
        if (ctx.bool('activar') !== null) g.starboard.enabled = ctx.bool('activar');
      });
      return ctx.ok('', { title: '⭐ Starboard', fields: [
        { name: 'Estado', value: yesNo(settings.starboard.enabled), inline: true },
        { name: 'Canal', value: settings.starboard.channelId ? `<#${settings.starboard.channelId}>` : 'No configurado', inline: true },
        { name: 'Umbral', value: `${settings.starboard.threshold} ⭐`, inline: true },
      ] });
    },
  }),
  cmd({
    name: 'confesion',
    defer: false,
    description: 'Envía una confesión anónima al staff',
    category: 'Comunidad',
    run: async (ctx) => {
      const settings = await getSettings(ctx);
      if (!settings.confessions?.channelId) return ctx.err('Las confesiones no están configuradas.');
      const modal = new ModalBuilder().setCustomId('confession:modal').setTitle('Enviar confesión anónima');
      modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('content').setLabel('Tu confesión').setStyle(TextInputStyle.Paragraph).setMaxLength(1000).setRequired(true)));
      return ctx.modal(modal);
    },
  }),
  cmd({
    name: 'evento-crear',
    description: 'Crea un evento comunitario',
    category: 'Comunidad',
    perms: ['ManageEvents'],
    options: [
      str('titulo', 'Título del evento', true, { max_length: 100 }),
      str('fecha', 'Fecha y hora (AAAA-MM-DD HH:MM)', true),
      str('lugar', 'Lugar en el mapa', false, { max_length: 100 }),
      int('cupos', 'Cupos (0 = ilimitados)', false, { min_value: 0, max_value: 500 }),
      str('premio', 'Premio', false, { max_length: 200 }),
      str('descripcion', 'Descripción', false, { max_length: 1000 }),
    ],
    run: async (ctx) => {
      const date = new Date(ctx.str('fecha').replace(' ', 'T'));
      if (Number.isNaN(date.getTime())) return ctx.err('Fecha inválida. Usá `AAAA-MM-DD HH:MM`.');
      if (date.getTime() < Date.now()) return ctx.err('La fecha debe ser futura.');
      const event = await db.CommunityEvent.create({
        guildId: ctx.guildId, hostId: ctx.userId, title: ctx.str('titulo'), description: ctx.str('descripcion'),
        location: ctx.str('lugar'), startsAt: date, capacity: ctx.int('cupos') || 0, prize: ctx.str('premio'), channelId: ctx.channelId,
      });
      const eventEmbed = embed().setTitle(`🎉 ${event.title}`).setDescription(event.description || '¡No te lo pierdas!').addFields(
        { name: '📅 Fecha', value: `<t:${Math.floor(date.getTime() / 1000)}:F>`, inline: true },
        { name: '📍 Lugar', value: event.location || 'Por definir', inline: true },
        { name: '🎟️ Cupos', value: event.capacity ? `${event.participants.length}/${event.capacity}` : 'Ilimitados', inline: true },
        { name: '🏆 Premio', value: event.prize || 'Sin premio', inline: true },
        { name: 'Organiza', value: `<@${ctx.userId}>`, inline: true },
      ).setFooter({ text: `Evento #${event._id.toString().slice(-5)}` });
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`event:join:${event._id}`).setLabel('Anotarme').setEmoji('✅').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`event:leave:${event._id}`).setLabel('Salir').setEmoji('🚪').setStyle(ButtonStyle.Secondary),
      );
      const msg = await ctx.channel.send({ embeds: [eventEmbed], components: [row] });
      event.messageId = msg.id;
      await event.save();
      return ctx.ok(`✅ Evento creado: ${msg.url}`);
    },
  }),
  cmd({
    name: 'evento-lista',
    description: 'Lista los próximos eventos',
    category: 'Comunidad',
    run: async (ctx) => {
      const events = await db.CommunityEvent.find({ guildId: ctx.guildId, status: 'programado', startsAt: { $gte: new Date() } }).sort({ startsAt: 1 }).limit(10).lean();
      if (!events.length) return ctx.err('No hay eventos programados.');
      return ctx.ok('', {
        title: '🎉 Próximos eventos',
        description: events.map((e) => `**${e.title}** — ${timestamp(e.startsAt, 'F')}\n> ${e.location || 'Lugar por definir'} · ${e.participants.length}${e.capacity ? `/${e.capacity}` : ''} anotados`).join('\n\n'),
      });
    },
  }),
  cmd({
    name: 'evento-finalizar',
    description: 'Finaliza un evento y anuncia a los participantes',
    category: 'Comunidad',
    perms: ['ManageEvents'],
    options: [str('evento', 'Evento a finalizar', true, { autocomplete: true })],
    autocomplete: async (ctx) => {
      const events = await db.CommunityEvent.find({ guildId: ctx.guildId, status: 'programado' }).limit(25).lean();
      return ctx.interaction.respond(events.filter((e) => e.title.toLowerCase().includes(String(ctx.focused('evento') || '').toLowerCase())).map((e) => ({ name: e.title, value: String(e._id) }))).catch(() => null);
    },
    run: async (ctx) => {
      const event = await db.CommunityEvent.findById(ctx.str('evento')).catch(() => null);
      if (!event) return ctx.err('Evento no encontrado.');
      event.status = 'finalizado';
      await event.save();
      const channel = ctx.guild.channels.cache.get(event.channelId);
      const msg = await channel?.messages.fetch(event.messageId).catch(() => null);
      if (msg) await msg.edit({ components: [] }).catch(() => null);
      return ctx.ok(`🏁 Evento **${event.title}** finalizado con **${event.participants.length}** participantes.`);
    },
  }),
  cmd({
    name: 'feedback',
    defer: false,
    description: 'Enviá feedback sobre el servidor o el staff',
    category: 'Comunidad',
    run: async (ctx) => {
      const modal = new ModalBuilder().setCustomId('feedback:modal').setTitle('Feedback de Ocaso Roleplay');
      modal.addComponents(
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('rating').setLabel('Puntuación del 1 al 5').setStyle(TextInputStyle.Short).setMaxLength(1).setRequired(true)),
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('comment').setLabel('Comentario').setStyle(TextInputStyle.Paragraph).setMaxLength(1000).setRequired(true)),
      );
      return ctx.modal(modal);
    },
  }),
];
