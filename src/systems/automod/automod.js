'use strict';

const db = require('../../database/models');
const { str, int, bool, user, channel, role, choices } = require('../../utils/options');
const { cmd, saveSettings, getSettings, yesNo } = require('../../utils/premade');
const { fullDate } = require('../../utils/format');
const { normalize } = require('../../services/automod');

const toggle = (ctx, path, extra) => saveSettings(ctx, (g) => {
  const cfg = path.split('.').reduce((o, k) => o[k], g);
  if (ctx.bool('activar') !== null) cfg.enabled = ctx.bool('activar');
  if (extra) extra(cfg, g);
});

module.exports = [
  cmd({
    name: 'automod configurar',
    description: 'Configura el AutoMod de Ocaso Roleplay',
    category: 'AutoMod',
    groupDescription: 'Protección automática contra spam, raids, links e insultos',
    perms: ['ManageGuild'],
    options: [
      bool('activar', 'Activar o desactivar AutoMod', false),
      channel('logs', 'Canal de logs de AutoMod', false),
      str('accion', 'Acción por defecto', false, { choices: choices(['Eliminar', 'delete'], ['Advertir', 'warn'], ['Timeout', 'timeout'], ['Expulsar', 'kick'], ['Banear', 'ban']) }),
    ],
    run: async (ctx) => {
      const settings = await saveSettings(ctx, (g) => {
        if (ctx.bool('activar') !== null) g.automod.enabled = ctx.bool('activar');
        if (ctx.channelOpt('logs')) g.automod.logChannelId = ctx.channelOpt('logs').id;
        if (ctx.str('accion')) g.automod.action = ctx.str('accion');
      });
      return ctx.ok('', {
        title: '🛡️ AutoMod',
        fields: [
          { name: 'Estado', value: yesNo(settings.automod.enabled), inline: true },
          { name: 'Logs', value: settings.automod.logChannelId ? `<#${settings.automod.logChannelId}>` : 'No configurado', inline: true },
          { name: 'Acción base', value: settings.automod.action, inline: true },
          { name: 'Filtros activos', value: Object.entries(settings.automod).filter(([, v]) => v?.enabled).map(([k]) => k).join(', ') || 'Ninguno' },
        ],
      });
    },
  }),
  cmd({
    name: 'automod estado',
    description: 'Muestra el estado detallado de AutoMod',
    category: 'AutoMod',
    perms: ['ManageGuild'],
    run: async (ctx) => {
      const s = (await getSettings(ctx)).automod;
      const f = (v) => (v?.enabled ? '✅' : '❌');
      return ctx.ok('', {
        title: '🛡️ Estado de AutoMod',
        fields: [
          { name: 'General', value: `${s.enabled ? '✅ Activado' : '❌ Desactivado'} · acción \`${s.action}\`` },
          { name: 'Filtros', value: `${f(s.spam)} Spam (${s.spam.threshold}/${s.spam.window / 1000}s)\n${f(s.links)} Links\n${f(s.invites)} Invitaciones\n${f(s.words)} Palabras (${s.words.list.length})\n${f(s.caps)} Mayúsculas (${s.caps.percent}%)\n${f(s.mentions)} Menciones (${s.mentions.max})\n${f(s.emojis)} Emojis (${s.emojis.max})\n${f(s.flood)} Flood (${s.flood.max})\n${f(s.phishing)} Phishing\n${f(s.raid)} Anti-raid (${s.raid.joins}/${s.raid.window / 1000}s)` },
          { name: 'Escalado de strikes', value: `Warn: ${s.strikes.warn} · Timeout: ${s.strikes.timeout} · Kick: ${s.strikes.kick} · Ban: ${s.strikes.ban}` },
          { name: 'Exenciones', value: `Canales: ${s.exemptChannels.length} · Roles: ${s.exemptRoles.length} · Usuarios: ${s.exemptUsers.length}` },
        ],
      });
    },
  }),
  cmd({
    name: 'automod spam',
    description: 'Configura el filtro anti-spam',
    category: 'AutoMod',
    perms: ['ManageGuild'],
    options: [bool('activar', 'Activar', false), int('mensajes', 'Mensajes permitidos en la ventana', false, { min_value: 2, max_value: 20 }), int('segundos', 'Tamaño de la ventana en segundos', false, { min_value: 2, max_value: 30 })],
    run: async (ctx) => {
      await toggle(ctx, 'automod.spam', (cfg) => {
        if (ctx.int('mensajes')) cfg.threshold = ctx.int('mensajes');
        if (ctx.int('segundos')) cfg.window = ctx.int('segundos') * 1000;
      });
      return ctx.ok('✅ Filtro anti-spam actualizado.');
    },
  }),
  cmd({
    name: 'automod links',
    description: 'Configura el filtro de enlaces',
    category: 'AutoMod',
    perms: ['ManageGuild'],
    options: [bool('activar', 'Activar', false), str('permitidos', 'Dominios permitidos separados por coma', false)],
    run: async (ctx) => {
      await toggle(ctx, 'automod.links', (cfg) => {
        if (ctx.str('permitidos')) cfg.allow = ctx.str('permitidos').split(',').map((s) => s.trim()).filter(Boolean);
      });
      return ctx.ok('✅ Filtro de enlaces actualizado.');
    },
  }),
  cmd({
    name: 'automod invites',
    description: 'Activa o desactiva el bloqueo de invitaciones de Discord',
    category: 'AutoMod',
    perms: ['ManageGuild'],
    options: [bool('activar', 'Activar', false)],
    run: async (ctx) => { await toggle(ctx, 'automod.invites'); return ctx.ok(`✅ Bloqueo de invitaciones: ${yesNo(ctx.bool('activar'))}`); },
  }),
  cmd({
    name: 'automod palabras-agregar',
    description: 'Agrega palabras prohibidas al filtro',
    category: 'AutoMod',
    perms: ['ManageGuild'],
    options: [str('palabras', 'Palabras separadas por coma', true, { max_length: 500 })],
    run: async (ctx) => {
      const words = ctx.str('palabras').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
      const settings = await saveSettings(ctx, (g) => { g.automod.words.list = [...new Set([...g.automod.words.list, ...words])]; g.automod.words.enabled = true; });
      return ctx.ok(`✅ ${words.length} palabra(s) agregadas. Total: ${settings.automod.words.list.length}.`);
    },
  }),
  cmd({
    name: 'automod palabras-quitar',
    description: 'Quita palabras del filtro',
    category: 'AutoMod',
    perms: ['ManageGuild'],
    options: [str('palabras', 'Palabras separadas por coma', true, { max_length: 500 })],
    run: async (ctx) => {
      const words = ctx.str('palabras').split(',').map((s) => s.trim().toLowerCase());
      const settings = await saveSettings(ctx, (g) => { g.automod.words.list = g.automod.words.list.filter((w) => !words.includes(normalize(w))); });
      return ctx.ok(`✅ Palabras removidas. Quedan ${settings.automod.words.list.length}.`);
    },
  }),
  cmd({
    name: 'automod palabras-lista',
    description: 'Lista las palabras prohibidas configuradas',
    category: 'AutoMod',
    perms: ['ManageGuild'],
    run: async (ctx) => {
      const s = await getSettings(ctx);
      return ctx.ok('', { title: `🚫 Palabras prohibidas (${s.automod.words.list.length})`, description: s.automod.words.list.length ? s.automod.words.list.map((w) => `\`${w}\``).join(', ') : 'No hay palabras configuradas.' });
    },
  }),
  cmd({
    name: 'automod mayusculas',
    description: 'Configura el filtro de mayúsculas excesivas',
    category: 'AutoMod',
    perms: ['ManageGuild'],
    options: [bool('activar', 'Activar', false), int('porcentaje', 'Porcentaje de mayúsculas permitido', false, { min_value: 30, max_value: 100 }), int('minimo', 'Longitud mínima del mensaje', false, { min_value: 5, max_value: 100 })],
    run: async (ctx) => {
      await toggle(ctx, 'automod.caps', (cfg) => {
        if (ctx.int('porcentaje')) cfg.percent = ctx.int('porcentaje');
        if (ctx.int('minimo')) cfg.minLength = ctx.int('minimo');
      });
      return ctx.ok('✅ Filtro de mayúsculas actualizado.');
    },
  }),
  cmd({
    name: 'automod menciones',
    description: 'Configura el límite de menciones por mensaje',
    category: 'AutoMod',
    perms: ['ManageGuild'],
    options: [bool('activar', 'Activar', false), int('maximo', 'Menciones máximas', false, { min_value: 1, max_value: 30 })],
    run: async (ctx) => {
      await toggle(ctx, 'automod.mentions', (cfg) => { if (ctx.int('maximo')) cfg.max = ctx.int('maximo'); });
      return ctx.ok('✅ Filtro de menciones actualizado.');
    },
  }),
  cmd({
    name: 'automod emojis',
    description: 'Configura el límite de emojis por mensaje',
    category: 'AutoMod',
    perms: ['ManageGuild'],
    options: [bool('activar', 'Activar', false), int('maximo', 'Emojis máximos', false, { min_value: 1, max_value: 50 })],
    run: async (ctx) => {
      await toggle(ctx, 'automod.emojis', (cfg) => { if (ctx.int('maximo')) cfg.max = ctx.int('maximo'); });
      return ctx.ok('✅ Filtro de emojis actualizado.');
    },
  }),
  cmd({
    name: 'automod flood',
    description: 'Configura el filtro de mensajes repetidos (flood)',
    category: 'AutoMod',
    perms: ['ManageGuild'],
    options: [bool('activar', 'Activar', false), int('maximo', 'Repeticiones permitidas', false, { min_value: 2, max_value: 15 })],
    run: async (ctx) => {
      await toggle(ctx, 'automod.flood', (cfg) => { if (ctx.int('maximo')) cfg.max = ctx.int('maximo'); });
      return ctx.ok('✅ Filtro de flood actualizado.');
    },
  }),
  cmd({
    name: 'automod phishing',
    description: 'Activa la detección de enlaces de phishing',
    category: 'AutoMod',
    perms: ['ManageGuild'],
    options: [bool('activar', 'Activar', false)],
    run: async (ctx) => { await toggle(ctx, 'automod.phishing'); return ctx.ok(`✅ Antiphishing: ${yesNo(ctx.bool('activar'))}`); },
  }),
  cmd({
    name: 'automod raid',
    description: 'Configura la detección de raids',
    category: 'AutoMod',
    perms: ['ManageGuild'],
    options: [bool('activar', 'Activar', false), int('miembros', 'Miembros que disparan la alerta', false, { min_value: 3, max_value: 100 }), int('segundos', 'Ventana de tiempo', false, { min_value: 5, max_value: 300 })],
    run: async (ctx) => {
      await toggle(ctx, 'automod.raid', (cfg) => {
        if (ctx.int('miembros')) cfg.joins = ctx.int('miembros');
        if (ctx.int('segundos')) cfg.window = ctx.int('segundos') * 1000;
      });
      return ctx.ok('✅ Anti-raid actualizado.');
    },
  }),
  cmd({
    name: 'automod strikes',
    description: 'Configura el escalado de sanciones por strikes',
    category: 'AutoMod',
    perms: ['ManageGuild'],
    options: [int('warn', 'Strikes para advertir', false, { min_value: 1 }), int('timeout', 'Strikes para timeout', false, { min_value: 1 }), int('kick', 'Strikes para expulsar', false, { min_value: 1 }), int('ban', 'Strikes para banear', false, { min_value: 1 })],
    run: async (ctx) => {
      const settings = await saveSettings(ctx, (g) => {
        for (const key of ['warn', 'timeout', 'kick', 'ban']) if (ctx.int(key)) g.automod.strikes[key] = ctx.int(key);
      });
      return ctx.ok(`✅ Escalado actualizado: warn ${settings.automod.strikes.warn} · timeout ${settings.automod.strikes.timeout} · kick ${settings.automod.strikes.kick} · ban ${settings.automod.strikes.ban}`);
    },
  }),
  cmd({
    name: 'automod whitelist-canal',
    description: 'Exime un canal de AutoMod',
    category: 'AutoMod',
    perms: ['ManageGuild'],
    options: [channel('canal', 'Canal', true), bool('quitar', 'Quitar de la lista blanca', false)],
    run: async (ctx) => {
      const id = ctx.channelOpt('canal').id;
      const removing = ctx.bool('quitar');
      await saveSettings(ctx, (g) => { g.automod.exemptChannels = removing ? g.automod.exemptChannels.filter((c) => c !== id) : [...new Set([...g.automod.exemptChannels, id])]; });
      return ctx.ok(`✅ <#${id}> ${removing ? 'ya no está' : 'está'} exento de AutoMod.`);
    },
  }),
  cmd({
    name: 'automod whitelist-rol',
    description: 'Exime un rol de AutoMod',
    category: 'AutoMod',
    perms: ['ManageGuild'],
    options: [role('rol', 'Rol', true), bool('quitar', 'Quitar de la lista blanca', false)],
    run: async (ctx) => {
      const id = ctx.roleOpt('rol').id;
      const removing = ctx.bool('quitar');
      await saveSettings(ctx, (g) => { g.automod.exemptRoles = removing ? g.automod.exemptRoles.filter((r) => r !== id) : [...new Set([...g.automod.exemptRoles, id])]; });
      return ctx.ok(`✅ <@&${id}> ${removing ? 'ya no está' : 'está'} exento de AutoMod.`);
    },
  }),
  cmd({
    name: 'automod whitelist-usuario',
    description: 'Exime un usuario de AutoMod',
    category: 'AutoMod',
    perms: ['ManageGuild'],
    options: [user('usuario', 'Usuario', true), bool('quitar', 'Quitar de la lista blanca', false)],
    run: async (ctx) => {
      const id = ctx.userOpt('usuario').id;
      const removing = ctx.bool('quitar');
      await saveSettings(ctx, (g) => { g.automod.exemptUsers = removing ? g.automod.exemptUsers.filter((u) => u !== id) : [...new Set([...g.automod.exemptUsers, id])]; });
      return ctx.ok(`✅ <@${id}> ${removing ? 'ya no está' : 'está'} exento de AutoMod.`);
    },
  }),
  cmd({
    name: 'automod whitelist-lista',
    description: 'Lista las exenciones de AutoMod',
    category: 'AutoMod',
    perms: ['ManageGuild'],
    run: async (ctx) => {
      const s = (await getSettings(ctx)).automod;
      return ctx.ok('', {
        title: '📋 Lista blanca de AutoMod',
        fields: [
          { name: 'Canales', value: s.exemptChannels.map((c) => `<#${c}>`).join(', ') || 'Ninguno' },
          { name: 'Roles', value: s.exemptRoles.map((r) => `<@&${r}>`).join(', ') || 'Ninguno' },
          { name: 'Usuarios', value: s.exemptUsers.map((u) => `<@${u}>`).join(', ') || 'Ninguno' },
        ],
      });
    },
  }),
  cmd({
    name: 'automod historial',
    description: 'Muestra el historial de infracciones de un usuario',
    category: 'AutoMod',
    staffOnly: true,
    options: [user('usuario', 'Usuario', true), int('limite', 'Cantidad de registros', false, { min_value: 1, max_value: 25 })],
    run: async (ctx) => {
      const targetUser = ctx.userOpt('usuario');
      const logs = await db.AutomodLog.find({ guildId: ctx.guildId, userId: targetUser.id }).sort({ createdAt: -1 }).limit(ctx.int('limite') || 10).lean();
      if (!logs.length) return ctx.ok(`✅ **${targetUser.tag}** no tiene infracciones registradas.`);
      return ctx.ok('', {
        title: `🛡️ Historial de ${targetUser.tag}`,
        description: logs.map((l) => `• ${fullDate(l.createdAt)} — \`${l.type}\` → ${l.action}${l.channelId ? ` en <#${l.channelId}>` : ''}`).join('\n').slice(0, 4000),
      });
    },
  }),
  cmd({
    name: 'automod perdonar',
    description: 'Borra los strikes de AutoMod de un usuario',
    category: 'AutoMod',
    staffOnly: true,
    options: [user('usuario', 'Usuario', true)],
    run: async (ctx) => {
      const targetUser = ctx.userOpt('usuario');
      const res = await db.AutomodLog.deleteMany({ guildId: ctx.guildId, userId: targetUser.id });
      return ctx.ok(`🧹 Se eliminaron **${res.deletedCount}** strikes de ${targetUser}.`);
    },
  }),
  cmd({
    name: 'automod modo-panico',
    description: 'Activa el modo pánico (verificación alta + filtros estrictos)',
    category: 'AutoMod',
    perms: ['Administrator'],
    options: [bool('activar', 'Activar o desactivar', true)],
    run: async (ctx) => {
      const on = ctx.bool('activar');
      await saveSettings(ctx, (g) => {
        g.automod.enabled = on;
        g.automod.spam.threshold = on ? 3 : 6;
        g.automod.mentions.max = on ? 3 : 6;
        g.automod.invites.enabled = true;
        g.automod.raid.enabled = on;
      });
      await ctx.guild.setVerificationLevel(on ? 4 : 1, 'Modo pánico de AutoMod').catch(() => null);
      return ctx.ok(on ? '🚨 **Modo pánico activado.** Verificación del servidor en nivel alto y filtros estrictos.' : '✅ Modo pánico desactivado. Verificación restaurada a nivel medio.');
    },
  }),
];
