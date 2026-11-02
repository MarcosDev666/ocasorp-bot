'use strict';
const config = require('../../config');
const db = require('../../database/models');
const samp = require('../../services/samp');
const { str, int } = require('../../utils/options');
const { cmd, embed } = require('../../utils/premade');
const { progressBar, number, chunk } = require('../../utils/format');

const hostOpt = str('ip', 'IP del servidor (por defecto la de Ocaso Roleplay)', false);
const portOpt = int('puerto', 'Puerto del servidor (por defecto 7777)', false, { min_value: 1, max_value: 65535 });

async function resolve(ctx) {
  return { host: ctx.str('ip') || config.brand.samp.host, port: ctx.int('puerto') || config.brand.samp.port };
}

module.exports = [
  cmd({
    name: 'samp estado',
    description: 'Muestra el estado en vivo del servidor SA-MP',
    category: 'SA-MP',
    groupDescription: 'Estado, jugadores y datos en vivo del servidor SA-MP de Ocaso Roleplay',
    options: [hostOpt, portOpt],
    run: async (ctx) => {
      const opts = await resolve(ctx);
      await ctx.defer();
      const start = Date.now();
      const info = await samp.getInfo(opts);
      const ping = Date.now() - start;
      const embedMsg = embed()
        .setTitle(`🟢 ${info.hostname}`)
        .setDescription(`**${info.gamemode}** · ${info.language}\n\`${opts.host}:${opts.port}\``)
        .addFields(
          { name: 'Jugadores', value: `**${info.players}/${info.maxPlayers}**\n${progressBar(info.players, info.maxPlayers)}`, inline: true },
          { name: 'Contraseña', value: info.passworded ? '🔒 Sí' : '🔓 No', inline: true },
          { name: 'Latencia', value: `\`${ping} ms\``, inline: true },
        )
        .setFooter({ text: 'Ocaso Roleplay • Datos en vivo vía query UDP' });
      await ctx.edit({ embeds: [embedMsg] });
    },
  }),
  cmd({
    name: 'samp jugadores',
    description: 'Lista los jugadores conectados al servidor SA-MP',
    category: 'SA-MP',
    options: [hostOpt, portOpt],
    run: async (ctx) => {
      const opts = await resolve(ctx);
      await ctx.defer();
      const players = await samp.getPlayers(opts);
      if (!players.length) return ctx.edit({ embeds: [embed().setDescription('😴 No hay jugadores conectados en este momento.')] });
      const pages = chunk(players, 15).map((list, i) => embed()
        .setTitle(`👥 Jugadores conectados (${players.length})`)
        .setDescription(list.map((p) => `\`#${String(p.id).padStart(2, '0')}\` **${p.name}** · ${p.score} pts · ${p.ping} ms`).join('\n'))
        .setFooter({ text: `Ocaso Roleplay • Página ${i + 1}/${Math.ceil(players.length / 15)}` }));
      const msg = await ctx.interaction.editReply({ embeds: [pages[0]] });
      return msg;
    },
  }),
  cmd({
    name: 'samp reglas',
    description: 'Muestra las reglas configuradas en el servidor SA-MP',
    category: 'SA-MP',
    options: [hostOpt, portOpt],
    run: async (ctx) => {
      const opts = await resolve(ctx);
      await ctx.defer();
      const rules = await samp.getRules(opts);
      const entries = Object.entries(rules);
      if (!entries.length) return ctx.edit({ embeds: [embed().setDescription('El servidor no expone reglas por query.')] });
      const text = entries.map(([k, v]) => `**${k}:** \`${v}\``).join('\n');
      return ctx.edit({ embeds: [embed().setTitle('📜 Reglas del servidor').setDescription(text.length > 4000 ? `${text.slice(0, 3990)}…` : text)] });
    },
  }),
  cmd({
    name: 'samp clientes',
    description: 'Lista las versiones de cliente conectadas al servidor',
    category: 'SA-MP',
    options: [hostOpt, portOpt],
    run: async (ctx) => {
      const opts = await resolve(ctx);
      await ctx.defer();
      const clients = await samp.getClients(opts);
      if (!clients.length) return ctx.edit({ embeds: [embed().setDescription('No hay clientes conectados.')] });
      const versions = clients.reduce((acc, c) => { acc[c.version] = (acc[c.version] || 0) + 1; return acc; }, {});
      return ctx.edit({
        embeds: [embed().setTitle('🖥️ Clientes conectados').setDescription(clients.slice(0, 40).map((c) => `**${c.name}** · ${c.version} · ${c.ping} ms`).join('\n')).addFields({ name: 'Versiones', value: Object.entries(versions).map(([v, n]) => `\`${v}\`: ${n}`).join('\n') || 'Sin datos' })],
      });
    },
  }),
  cmd({
    name: 'samp info',
    description: 'Muestra cómo conectarse a Ocaso Roleplay',
    category: 'SA-MP',
    run: async (ctx) => {
      const { host, port } = config.brand.samp;
      return ctx.ok('', {
        title: '🎮 Cómo conectarse a Ocaso Roleplay',
        description: [
          '**1.** Abrí tu cliente de SA-MP 0.3.DL / 0.3.7.',
          '**2.** Agregá el servidor con la IP y el puerto.',
          '**3.** Seleccionalo y presioná **Connect**.',
          '',
          `**IP:** \`${host}\``,
          `**Puerto:** \`${port}\``,
          config.brand.samp.discord ? `**Discord:** ${config.brand.samp.discord}` : '',
          '',
          '> Si es tu primera vez, leé el canal de reglas y creá tu personaje.',
        ].filter(Boolean).join('\n'),
        fields: [{ name: 'Enlace directo', value: `\`samp://${host}:${port}\`` }],
        thumbnail: ctx.guild?.iconURL() || undefined,
      });
    },
  }),
  cmd({
    name: 'samp conectar',
    description: 'Guía paso a paso para instalar SA-MP y entrar al servidor',
    category: 'SA-MP',
    run: async (ctx) => {
      return ctx.ok('', {
        title: '📥 Guía de conexión',
        description: [
          '**Paso 1 — Descargá SA-MP**',
          'Instalá GTA San Andreas y luego el cliente SA-MP 0.3.7 R5 (o 0.3.DL si el servidor lo requiere).',
          '',
          '**Paso 2 — Abrí el cliente**',
          'Ejecutá `samp.exe` y esperá a que cargue la lista de servidores.',
          '',
          '**Paso 3 — Agregá Ocaso Roleplay**',
          `Presioná **Add Server** e ingresá \`${config.brand.samp.host}:${config.brand.samp.port}\`.`,
          '',
          '**Paso 4 — Conectate**',
          'Seleccioná el servidor y presioná **Connect**. Registrate con `/registro` dentro del juego.',
          '',
          '**Problemas frecuentes**',
          '• Versión incompatible → usá 0.3.7 R5.\n• Error de conexión → desactivá el antivirus o el firewall.\n• Crashing → ejecutá como administrador y en modo compatibilidad Windows 7.',
        ].join('\n'),
      });
    },
  }),
  cmd({
    name: 'samp ping',
    description: 'Mide la latencia del servidor SA-MP con 3 consultas',
    category: 'SA-MP',
    options: [hostOpt, portOpt],
    run: async (ctx) => {
      const opts = await resolve(ctx);
      await ctx.defer();
      const times = [];
      for (let i = 0; i < 3; i += 1) {
        const start = Date.now();
        await samp.getInfo({ ...opts, timeout: 3000 });
        times.push(Date.now() - start);
      }
      const avg = Math.round(times.reduce((a, b) => a + b, 0) / times.length);
      return ctx.edit({ embeds: [embed().setTitle('📡 Latencia del servidor').setDescription(`\`${opts.host}:${opts.port}\``).addFields(
        { name: 'Consultas', value: times.map((t, i) => `#${i + 1}: \`${t} ms\``).join('\n'), inline: true },
        { name: 'Promedio', value: `\`${avg} ms\``, inline: true },
        { name: 'Estado', value: avg < 150 ? '🟢 Excelente' : avg < 350 ? '🟡 Aceptable' : '🟠 Alta', inline: true },
      )] });
    },
  }),
  cmd({
    name: 'samp ranking',
    description: 'Ranking de horas jugadas en el servidor',
    category: 'SA-MP',
    cooldown: 5,
    run: async (ctx) => {
      const profiles = await db.SampProfile.find({ guildId: ctx.guildId }).sort({ hours: -1 }).limit(15).lean();
      if (!profiles.length) return ctx.err('Todavía no hay cuentas de SA-MP vinculadas. Usá `/cuenta vincular` para aparecer en el ranking.');
      const medals = ['🥇', '🥈', '🥉'];
      const list = profiles.map((p, i) => `${medals[i] || `\`${i + 1}.\``} **${p.playerName}** — ${p.hours.toFixed(1)} h · Nv. ${p.level}${p.faction ? ` · ${p.faction}` : ''}`).join('\n');
      return ctx.ok('', { title: '🏆 Ranking de horas jugadas', description: list });
    },
  }),
  cmd({
    name: 'samp stats',
    description: 'Estadísticas generales del rol y del servidor',
    category: 'SA-MP',
    cooldown: 5,
    run: async (ctx) => {
      await ctx.defer();
      const [profiles, factions, properties, tickets, players] = await Promise.all([
        db.SampProfile.countDocuments({ guildId: ctx.guildId }),
        db.Faction.countDocuments({ guildId: ctx.guildId, active: true }),
        db.Property.countDocuments({ guildId: ctx.guildId }),
        db.Ticket.countDocuments({ guildId: ctx.guildId }),
        samp.getInfo().catch(() => null),
      ]);
      const totalHours = await db.SampProfile.aggregate([{ $match: { guildId: ctx.guildId } }, { $group: { _id: null, total: { $sum: '$hours' } } }]);
      return ctx.edit({ embeds: [embed().setTitle('📊 Estadísticas de Ocaso Roleplay').addFields(
        { name: 'Cuentas vinculadas', value: number(profiles), inline: true },
        { name: 'Facciones activas', value: number(factions), inline: true },
        { name: 'Propiedades', value: number(properties), inline: true },
        { name: 'Tickets históricos', value: number(tickets), inline: true },
        { name: 'Horas jugadas (total)', value: number(Math.round(totalHours[0]?.total || 0)), inline: true },
        { name: 'Jugadores online', value: players ? `${players.players}/${players.maxPlayers}` : 'Servidor offline', inline: true },
      ).setFooter({ text: `Miembros del Discord: ${ctx.guild.memberCount}` })] });
    },
  }),
];
