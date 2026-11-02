'use strict';

const db = require('../../database/models');
const { str, int, user } = require('../../utils/options');
const { cmd, target } = require('../../utils/premade');
const { number } = require('../../utils/format');
const { isStaff } = require('../../core/permissions');

const NAME_REGEX = /^[A-Za-z0-9_[\]$.=]{3,24}$/;

module.exports = [
  cmd({
    name: 'cuenta vincular',
    description: 'Vincula tu cuenta de Discord con tu personaje de SA-MP',
    category: 'SA-MP',
    cooldown: 10,
    groupDescription: 'Vinculá tu cuenta de Discord con tu personaje de Ocaso Roleplay',
    options: [str('personaje', 'Nombre exacto de tu personaje en SA-MP', true, { min_length: 3, max_length: 24 })],
    run: async (ctx) => {
      const playerName = ctx.str('personaje').trim();
      if (!NAME_REGEX.test(playerName)) return ctx.err('Ese nombre no es válido. Usá entre 3 y 24 caracteres (letras, números, `_`, `[`, `]`, `.`).');
      const existing = await db.SampProfile.findOne({ guildId: ctx.guildId, userId: ctx.userId });
      if (existing) return ctx.err(`Ya tenés vinculado el personaje **${existing.playerName}**. Usá \`/cuenta desvincular\` si querés cambiarlo.`);
      const taken = await db.SampProfile.findOne({ guildId: ctx.guildId, playerName });
      if (taken) return ctx.err(`El personaje **${playerName}** ya está vinculado a otra cuenta de Discord.`);
      const profile = await db.SampProfile.create({ guildId: ctx.guildId, userId: ctx.userId, playerName });
      if (isStaff(ctx.member)) {
        await ctx.member.setNickname(playerName.slice(0, 32)).catch(() => null);
      }
      return ctx.ok('', {
        title: '✅ Cuenta vinculada',
        description: `Tu Discord quedó asociado al personaje **${profile.playerName}** de Ocaso Roleplay.`,
        fields: [
          { name: 'Personaje', value: profile.playerName, inline: true },
          { name: 'Nivel', value: String(profile.level), inline: true },
          { name: 'Facción', value: profile.faction || 'Civil', inline: true },
        ],
      });
    },
  }),
  cmd({
    name: 'cuenta desvincular',
    description: 'Desvincula tu personaje de SA-MP de tu cuenta de Discord',
    category: 'SA-MP',
    run: async (ctx) => {
      const profile = await db.SampProfile.findOneAndDelete({ guildId: ctx.guildId, userId: ctx.userId });
      if (!profile) return ctx.err('No tenés ninguna cuenta vinculada.');
      return ctx.ok(`🔓 Se desvinculó el personaje **${profile.playerName}**. Podés volver a vincular otro cuando quieras.`);
    },
  }),
  cmd({
    name: 'cuenta perfil',
    description: 'Muestra el perfil de rol de un jugador',
    category: 'SA-MP',
    options: [user('usuario', 'Usuario de Discord (opcional)')],
    run: async (ctx) => {
      const { user: targetUser } = await target(ctx);
      const discordUser = targetUser || ctx.user;
      const profile = await db.SampProfile.findOne({ guildId: ctx.guildId, userId: discordUser.id });
      if (!profile) return ctx.err(`${discordUser.id === ctx.userId ? 'No tenés' : `${discordUser.username} no tiene`} una cuenta de SA-MP vinculada.`);
      const kd = profile.deaths ? (profile.kills / profile.deaths).toFixed(2) : profile.kills.toFixed(2);
      return ctx.ok('', {
        title: `🎭 ${profile.playerName}`,
        description: `Perfil de rol de ${discordUser}`,
        thumbnail: discordUser.displayAvatarURL({ size: 256 }),
        fields: [
          { name: 'Nivel', value: String(profile.level), inline: true },
          { name: 'Facción', value: profile.faction || 'Civil', inline: true },
          { name: 'Rango', value: profile.rank || '—', inline: true },
          { name: 'Horas jugadas', value: number(profile.hours), inline: true },
          { name: 'K/D', value: `${number(profile.kills)} / ${number(profile.deaths)} (${kd})`, inline: true },
          { name: 'Trabajo', value: profile.job || 'Desempleado', inline: true },
          { name: 'Dinero', value: `$${number(profile.money)}`, inline: true },
          { name: 'Banco', value: `$${number(profile.bank)}`, inline: true },
          { name: 'Advertencias', value: String(profile.warns), inline: true },
        ],
        footer: 'Ocaso Roleplay • Perfil vinculado',
      });
    },
  }),
  cmd({
    name: 'cuenta editar',
    description: 'Edita las estadísticas de un personaje (staff)',
    category: 'SA-MP',
    perms: ['ManageGuild'],
    options: [
      user('usuario', 'Usuario vinculado', true),
      str('personaje', 'Nuevo nombre de personaje', false, { max_length: 24 }),
      int('nivel', 'Nuevo nivel', false, { min_value: 1, max_value: 1000 }),
      int('dinero', 'Dinero del personaje', false, { min_value: 0 }),
      int('horas', 'Horas jugadas', false, { min_value: 0 }),
      str('faccion', 'Facción', false),
      str('rango', 'Rango dentro de la facción', false),
      int('warns', 'Advertencias', false, { min_value: 0 }),
    ],
    run: async (ctx) => {
      const { user: targetUser } = await target(ctx);
      if (!targetUser) return ctx.err('Usuario inválido.');
      const profile = await db.SampProfile.findOne({ guildId: ctx.guildId, userId: targetUser.id });
      if (!profile) return ctx.err('Ese usuario no tiene una cuenta vinculada.');
      const changes = [];
      const set = (key, value, label) => { if (value !== null && value !== undefined) { profile[key] = value; changes.push(`${label}: \`${value}\``); } };
      set('playerName', ctx.str('personaje'), 'Personaje');
      set('level', ctx.int('nivel'), 'Nivel');
      set('money', ctx.int('dinero'), 'Dinero');
      set('hours', ctx.int('horas'), 'Horas');
      set('faction', ctx.str('faccion'), 'Facción');
      set('rank', ctx.str('rango'), 'Rango');
      set('warns', ctx.int('warns'), 'Warns');
      if (!changes.length) return ctx.err('No especificaste ningún cambio.');
      await profile.save();
      return ctx.ok(`✅ Perfil de **${profile.playerName}** actualizado.\n${changes.join('\n')}`);
    },
  }),
  cmd({
    name: 'cuenta ranking',
    description: 'Ranking de jugadores por nivel de rol',
    category: 'SA-MP',
    cooldown: 5,
    options: [int('limite', 'Cantidad de jugadores (1-25)', false, { min_value: 1, max_value: 25 })],
    run: async (ctx) => {
      const limit = ctx.int('limite') || 10;
      const profiles = await db.SampProfile.find({ guildId: ctx.guildId }).sort({ level: -1, hours: -1 }).limit(limit).lean();
      if (!profiles.length) return ctx.err('Todavía no hay cuentas vinculadas.');
      const medals = ['🥇', '🥈', '🥉'];
      return ctx.ok('', {
        title: '🏅 Ranking de rol',
        description: profiles.map((p, i) => `${medals[i] || `**${i + 1}.**`} **${p.playerName}** — Nv. ${p.level} · ${p.hours.toFixed(1)} h${p.faction ? ` · ${p.faction}` : ''}`).join('\n'),
      });
    },
  }),
];
