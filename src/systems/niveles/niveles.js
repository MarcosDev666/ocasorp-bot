'use strict';
const db = require('../../database/models');
const { int, bool, user, role, channel } = require('../../utils/options');
const { cmd, saveSettings, getSettings, yesNo } = require('../../utils/premade');
const { levelCard, addXp } = require('../../services/levels');
const { number } = require('../../utils/format');

module.exports = [
  cmd({
    name: 'nivel perfil',
    description: 'Muestra tu tarjeta de nivel o la de otro usuario',
    category: 'Niveles',
    groupDescription: 'Sistema de experiencia, niveles y recompensas por actividad',
    options: [user('usuario', 'Usuario (opcional)', false)],
    run: async (ctx) => {
      const targetUser = ctx.userOpt('usuario') || ctx.user;
      const doc = await db.User.get(ctx.guildId, targetUser.id);
      return ctx.reply({ embeds: [levelCard(doc, targetUser)] });
    },
  }),
  cmd({
    name: 'nivel ranking',
    description: 'Ranking de nivel del servidor',
    category: 'Niveles',
    cooldown: 5,
    run: async (ctx) => {
      const docs = await db.User.find({ guildId: ctx.guildId }).sort({ level: -1, xp: -1 }).limit(15).lean();
      if (!docs.length) return ctx.err('No hay datos de niveles todavía.');
      const medals = ['🥇', '🥈', '🥉'];
      return ctx.ok('', {
        title: '🏆 Ranking de niveles',
        description: docs.map((d, i) => `${medals[i] || `**${i + 1}.**`} <@${d.userId}> — Nv. **${d.level}** · ${number(d.xp)} XP · ${number(d.messages)} msgs`).join('\n'),
      });
    },
  }),
  cmd({
    name: 'nivel config',
    description: 'Configura el sistema de niveles',
    category: 'Niveles',
    perms: ['ManageGuild'],
    options: [
      bool('activar', 'Activar o desactivar', false),
      channel('canal', 'Canal de anuncios de subida de nivel', false),
      int('multiplicador', 'Multiplicador de XP (x10 = 1.0)', false, { min_value: 1, max_value: 100 }),
      int('xp_mensaje', 'XP base por mensaje', false, { min_value: 1, max_value: 200 }),
      int('xp_voz', 'XP por minuto de voz', false, { min_value: 1, max_value: 100 }),
      bool('anunciar', 'Anunciar subidas de nivel', false),
    ],
    run: async (ctx) => {
      const settings = await saveSettings(ctx, (g) => {
        if (ctx.bool('activar') !== null) g.levels.enabled = ctx.bool('activar');
        if (ctx.channelOpt('canal')) g.levels.channelId = ctx.channelOpt('canal').id;
        if (ctx.int('multiplicador')) g.levels.multiplier = ctx.int('multiplicador') / 10;
        if (ctx.int('xp_mensaje')) g.levels.messageXp = ctx.int('xp_mensaje');
        if (ctx.int('xp_voz')) g.levels.voiceXp = ctx.int('xp_voz');
        if (ctx.bool('anunciar') !== null) g.levels.announce = ctx.bool('anunciar');
      });
      return ctx.ok('', {
        title: '⚙️ Niveles configurados',
        fields: [
          { name: 'Estado', value: yesNo(settings.levels.enabled), inline: true },
          { name: 'Canal', value: settings.levels.channelId ? `<#${settings.levels.channelId}>` : 'No configurado', inline: true },
          { name: 'Multiplicador', value: `x${settings.levels.multiplier}`, inline: true },
          { name: 'XP/mensaje', value: String(settings.levels.messageXp), inline: true },
          { name: 'XP/minuto voz', value: String(settings.levels.voiceXp), inline: true },
          { name: 'Anuncios', value: yesNo(settings.levels.announce), inline: true },
        ],
      });
    },
  }),
  cmd({
    name: 'nivel recompensas',
    description: 'Lista las recompensas por nivel',
    category: 'Niveles',
    run: async (ctx) => {
      const settings = await getSettings(ctx);
      const rewards = settings.levels.rewards || [];
      return ctx.ok('', {
        title: '🎁 Recompensas por nivel',
        description: rewards.length ? rewards.sort((a, b) => a.level - b.level).map((r) => `• Nivel **${r.level}** → <@&${r.roleId}>`).join('\n') : 'No hay recompensas configuradas.',
      });
    },
  }),
  cmd({
    name: 'nivel recompensa-agregar',
    description: 'Añade una recompensa de rol por nivel',
    category: 'Niveles',
    perms: ['ManageGuild'],
    botPerms: ['ManageRoles'],
    options: [int('nivel', 'Nivel', true, { min_value: 1, max_value: 500 }), role('rol', 'Rol a otorgar', true)],
    run: async (ctx) => {
      const r = ctx.roleOpt('rol');
      if (r.position >= ctx.guild.members.me.roles.highest.position) return ctx.err('Ese rol está por encima de mi rol más alto.');
      await saveSettings(ctx, (g) => {
        g.levels.rewards = g.levels.rewards.filter((x) => x.level !== ctx.int('nivel'));
        g.levels.rewards.push({ level: ctx.int('nivel'), roleId: r.id });
      });
      return ctx.ok(`✅ Nivel **${ctx.int('nivel')}** → ${r}.`);
    },
  }),
  cmd({
    name: 'nivel recompensa-quitar',
    description: 'Quita la recompensa de un nivel',
    category: 'Niveles',
    perms: ['ManageGuild'],
    options: [int('nivel', 'Nivel', true, { min_value: 1 })],
    run: async (ctx) => {
      await saveSettings(ctx, (g) => { g.levels.rewards = g.levels.rewards.filter((x) => x.level !== ctx.int('nivel')); });
      return ctx.ok(`✅ Recompensa del nivel **${ctx.int('nivel')}** eliminada.`);
    },
  }),
  cmd({
    name: 'nivel addxp',
    description: 'Otorga XP a un usuario (staff)',
    category: 'Niveles',
    staffOnly: true,
    options: [user('usuario', 'Usuario', true), int('cantidad', 'Cantidad de XP', true, { min_value: 1 }), bool('quitar', 'Quitar en vez de agregar', false)],
    run: async (ctx) => {
      const targetUser = ctx.userOpt('usuario');
      const member = await ctx.guild.members.fetch(targetUser.id).catch(() => null);
      if (!member) return ctx.err('El usuario debe estar en el servidor.');
      const amount = ctx.bool('quitar') ? -ctx.int('cantidad') : ctx.int('cantidad');
      const result = await addXp(member, amount, 'admin');
      return ctx.ok(`✅ ${targetUser} recibió **${amount} XP**. Nivel actual: **${result.level}**.`);
    },
  }),
  cmd({
    name: 'nivel reset',
    description: 'Reinicia el nivel de un usuario (staff)',
    category: 'Niveles',
    perms: ['Administrator'],
    options: [user('usuario', 'Usuario', true)],
    run: async (ctx) => {
      const targetUser = ctx.userOpt('usuario');
      await db.User.updateOne({ guildId: ctx.guildId, userId: targetUser.id }, { xp: 0, level: 0 });
      return ctx.ok(`♻️ Nivel de ${targetUser} reiniciado.`);
    },
  }),
  cmd({
    name: 'nivel top-voz',
    description: 'Ranking de horas en canales de voz',
    category: 'Niveles',
    cooldown: 5,
    run: async (ctx) => {
      const docs = await db.User.find({ guildId: ctx.guildId }).sort({ voiceMinutes: -1 }).limit(10).lean();
      if (!docs.length) return ctx.err('No hay datos de voz todavía.');
      return ctx.ok('', {
        title: '🎙️ Top voz',
        description: docs.map((d, i) => `**${i + 1}.** <@${d.userId}> — ${number(d.voiceMinutes)} minutos`).join('\n'),
      });
    },
  }),
];
