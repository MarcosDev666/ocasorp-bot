'use strict';
const { PermissionsBitField, ChannelType } = require('discord.js');
const os = require('node:os');
const config = require('../../config');
const db = require('../../database/models');
const { str, int, user, role, channel, mentionable, choices } = require('../../utils/options');
const { cmd, embed } = require('../../utils/premade');
const { duration, number, timestamp, truncate } = require('../../utils/format');

module.exports = [
  cmd({
    name: 'ping',
    description: 'Muestra la latencia del bot y de la API de Discord',
    category: 'Utilidad',
    groupDescription: 'Comandos de información y utilidades generales',
    cooldown: 2,
    run: async (ctx) => {
      const sent = Date.now();
      await ctx.defer();
      const ws = ctx.client.ws.ping;
      const rtt = Date.now() - sent;
      const start = Date.now();
      await ctx.client.rest.get('/gateway');
      const api = Date.now() - start;
      return ctx.edit({ embeds: [embed().setTitle('🏓 Pong!').addFields(
        { name: 'WebSocket', value: `\`${ws} ms\``, inline: true },
        { name: 'API', value: `\`${api} ms\``, inline: true },
        { name: 'Respuesta', value: `\`${rtt} ms\``, inline: true },
      )] });
    },
  }),
  cmd({
    name: 'uptime',
    description: 'Muestra hace cuánto está online el bot',
    category: 'Utilidad',
    run: async (ctx) => ctx.ok('', {
      title: '⏱️ Uptime',
      fields: [
        { name: 'Bot', value: duration(Date.now() - ctx.client.startedAt), inline: true },
        { name: 'Sistema', value: duration(os.uptime() * 1000), inline: true },
        { name: 'Proceso', value: duration(process.uptime() * 1000), inline: true },
      ],
    }),
  }),
  cmd({
    name: 'avatar',
    description: 'Muestra el avatar de un usuario',
    category: 'Utilidad',
    options: [user('usuario', 'Usuario (opcional)'), str('tamano', 'Tamaño en píxeles', false, { choices: choices(['64', '128', '256', '512', '1024', '2048', '4096']) })],
    run: async (ctx) => {
      const targetUser = ctx.userOpt('usuario') || ctx.user;
      const size = Number(ctx.str('tamano')) || 512;
      const url = targetUser.displayAvatarURL({ size, extension: 'png' });
      return ctx.reply({ embeds: [embed().setTitle(`🖼️ Avatar de ${targetUser.tag}`).setImage(url).setDescription(`[Descargar](${url})`)] });
    },
  }),
  cmd({
    name: 'banner',
    description: 'Muestra el banner de un usuario',
    category: 'Utilidad',
    options: [user('usuario', 'Usuario (opcional)')],
    run: async (ctx) => {
      const targetUser = ctx.userOpt('usuario') || ctx.user;
      const fetched = await ctx.client.users.fetch(targetUser.id, { force: true }).catch(() => targetUser);
      const url = fetched.bannerURL({ size: 1024 });
      if (!url) return ctx.err(`${targetUser.username} no tiene banner.`);
      return ctx.reply({ embeds: [embed().setTitle(`🎨 Banner de ${targetUser.tag}`).setImage(url).setDescription(`[Descargar](${url})`)] });
    },
  }),
  cmd({
    name: 'userinfo',
    description: 'Muestra información detallada de un usuario',
    category: 'Utilidad',
    options: [user('usuario', 'Usuario (opcional)')],
    run: async (ctx) => {
      const targetUser = ctx.userOpt('usuario') || ctx.user;
      const member = await ctx.guild.members.fetch(targetUser.id).catch(() => null);
      const doc = await db.User.get(ctx.guildId, targetUser.id).catch(() => null);
      const fields = [
        { name: 'ID', value: `\`${targetUser.id}\``, inline: true },
        { name: 'Bot', value: targetUser.bot ? '🤖 Sí' : 'No', inline: true },
        { name: 'Cuenta creada', value: `<t:${Math.floor(targetUser.createdTimestamp / 1000)}:F>`, inline: true },
      ];
      if (member) {
        fields.push(
          { name: 'Se unió', value: member.joinedTimestamp ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:F>` : 'Desconocido', inline: true },
          { name: 'Apodo', value: member.nickname || 'Sin apodo', inline: true },
          { name: 'Rol más alto', value: member.roles.highest ? `${member.roles.highest}` : 'Ninguno', inline: true },
          { name: `Roles (${member.roles.cache.size - 1})`, value: member.roles.cache.filter((r) => r.id !== ctx.guild.id).map((r) => `${r}`).slice(0, 20).join(', ') || 'Ninguno' },
        );
      }
      if (doc) {
        fields.push(
          { name: 'Nivel', value: `${doc.level} (${number(doc.xp)} XP)`, inline: true },
          { name: 'Mensajes', value: number(doc.messages), inline: true },
          { name: 'Advertencias', value: String(doc.warnings), inline: true },
        );
      }
      return ctx.reply({ embeds: [embed().setTitle(`👤 ${targetUser.tag}`).setThumbnail(targetUser.displayAvatarURL({ size: 256 })).addFields(fields)] });
    },
  }),
  cmd({
    name: 'serverinfo',
    description: 'Muestra información del servidor',
    category: 'Utilidad',
    run: async (ctx) => {
      const g = ctx.guild;
      const owner = await g.fetchOwner().catch(() => null);
      const channels = g.channels.cache;
      return ctx.reply({ embeds: [embed()
        .setTitle(`🏰 ${g.name}`)
        .setThumbnail(g.iconURL({ size: 256 }))
        .setImage(g.bannerURL({ size: 1024 }) || null)
        .addFields(
          { name: 'ID', value: `\`${g.id}\``, inline: true },
          { name: 'Dueño', value: owner ? `${owner.user.tag}` : 'Desconocido', inline: true },
          { name: 'Creado', value: `<t:${Math.floor(g.createdTimestamp / 1000)}:F>`, inline: true },
          { name: 'Miembros', value: number(g.memberCount), inline: true },
          { name: 'Canales', value: `${channels.filter((c) => c.type === ChannelType.GuildText).size} texto · ${channels.filter((c) => c.type === ChannelType.GuildVoice).size} voz`, inline: true },
          { name: 'Roles', value: String(g.roles.cache.size), inline: true },
          { name: 'Boosts', value: `${g.premiumSubscriptionCount || 0} (Nivel ${g.premiumTier})`, inline: true },
          { name: 'Verificación', value: String(g.verificationLevel), inline: true },
          { name: 'Emojis', value: `${g.emojis.cache.size}`, inline: true },
        )] });
    },
  }),
  cmd({
    name: 'roleinfo',
    description: 'Muestra información de un rol',
    category: 'Utilidad',
    options: [role('rol', 'Rol', true)],
    run: async (ctx) => {
      const r = ctx.roleOpt('rol');
      return ctx.reply({ embeds: [embed().setColor(r.color || config.brand.color).setTitle(`🎭 ${r.name}`).addFields(
        { name: 'ID', value: `\`${r.id}\``, inline: true },
        { name: 'Color', value: r.hexColor, inline: true },
        { name: 'Posición', value: String(r.position), inline: true },
        { name: 'Miembros', value: String(r.members.size), inline: true },
        { name: 'Mencionable', value: r.mentionable ? 'Sí' : 'No', inline: true },
        { name: 'Se muestra separado', value: r.hoist ? 'Sí' : 'No', inline: true },
        { name: 'Creado', value: `<t:${Math.floor(r.createdTimestamp / 1000)}:F>`, inline: true },
        { name: 'Permisos destacados', value: r.permissions.toArray().slice(0, 15).map((p) => `\`${p}\``).join(', ') || 'Ninguno' },
      )] });
    },
  }),
  cmd({
    name: 'channelinfo',
    description: 'Muestra información de un canal',
    category: 'Utilidad',
    options: [channel('canal', 'Canal (por defecto el actual)')],
    run: async (ctx) => {
      const ch = ctx.channelOpt('canal') || ctx.channel;
      return ctx.reply({ embeds: [embed().setTitle(`📁 #${ch.name}`).addFields(
        { name: 'ID', value: `\`${ch.id}\``, inline: true },
        { name: 'Tipo', value: String(ch.type), inline: true },
        { name: 'Categoría', value: ch.parent ? ch.parent.name : 'Ninguna', inline: true },
        { name: 'Creado', value: `<t:${Math.floor(ch.createdTimestamp / 1000)}:F>`, inline: true },
        { name: 'Slowmode', value: `${ch.rateLimitPerUser || 0}s`, inline: true },
        { name: 'NSFW', value: ch.nsfw ? 'Sí' : 'No', inline: true },
        { name: 'Tema', value: truncate(ch.topic || 'Sin tema', 300) },
      )] });
    },
  }),
  cmd({
    name: 'icono',
    description: 'Muestra el ícono del servidor',
    category: 'Utilidad',
    run: async (ctx) => {
      const url = ctx.guild.iconURL({ size: 1024 });
      if (!url) return ctx.err('El servidor no tiene ícono.');
      return ctx.reply({ embeds: [embed().setTitle(`🖼️ ${ctx.guild.name}`).setImage(url).setDescription(`[Descargar](${url})`)] });
    },
  }),
  cmd({
    name: 'id',
    description: 'Obtiene el ID de un usuario, rol o canal',
    category: 'Utilidad',
    options: [mentionable('objetivo', 'Usuario, rol o canal', true)],
    run: async (ctx) => {
      const obj = ctx.mention('objetivo');
      return ctx.reply({ embeds: [embed().setTitle('🆔 ID').setDescription(`**${obj.name || obj.username || obj.tag}**\n\`${obj.id}\`\n\nMenchión: \`${obj.toString()}\``)] });
    },
  }),
  cmd({
    name: 'miembros',
    description: 'Muestra el desglose de miembros del servidor',
    category: 'Utilidad',
    run: async (ctx) => {
      const g = ctx.guild;
      const humans = g.members.cache.filter((m) => !m.user.bot).size;
      const bots = g.members.cache.filter((m) => m.user.bot).size;
      return ctx.reply({ embeds: [embed().setTitle('📊 Miembros').addFields(
        { name: 'Total', value: number(g.memberCount), inline: true },
        { name: 'Humanos', value: number(humans), inline: true },
        { name: 'Bots', value: number(bots), inline: true },
        { name: 'Boosts', value: String(g.premiumSubscriptionCount || 0), inline: true },
        { name: 'En voz', value: String(g.members.cache.filter((m) => m.voice.channelId).size), inline: true },
      )] });
    },
  }),
  cmd({
    name: 'emoji',
    description: 'Muestra información de un emoji del servidor',
    category: 'Utilidad',
    options: [str('emoji', 'Nombre o ID del emoji', true)],
    run: async (ctx) => {
      const query = ctx.str('emoji').replace(/[^a-zA-Z0-9_]/g, '');
      const emoji = ctx.guild.emojis.cache.find((e) => e.name === query || e.id === query);
      if (!emoji) return ctx.err('Emoji no encontrado en este servidor.');
      return ctx.reply({ embeds: [embed().setTitle(`😀 ${emoji.name}`).setThumbnail(emoji.imageURL({ size: 256 })).addFields(
        { name: 'ID', value: `\`${emoji.id}\``, inline: true },
        { name: 'Animado', value: emoji.animated ? 'Sí' : 'No', inline: true },
        { name: 'Uso', value: `\`${emoji.toString()}\``, inline: true },
        { name: 'Creado', value: `<t:${Math.floor(emoji.createdTimestamp / 1000)}:R>`, inline: true },
      )] });
    },
  }),
  cmd({
    name: 'invitacion',
    description: 'Crea una invitación al canal actual',
    category: 'Utilidad',
    perms: ['CreateInstantInvite'],
    botPerms: ['CreateInstantInvite'],
    options: [str('duracion', 'Duración (ej: 1h, 1d, 7d)', false), str('usos', 'Usos máximos (0 = ilimitados)', false)],
    run: async (ctx) => {
      const maxAge = ctx.str('duracion') ? Math.min(604800, Math.floor((require('../../utils/format').parseDuration(ctx.str('duracion')) || 3600000) / 1000)) : 86400;
      const maxUses = Math.max(0, Number(ctx.str('usos')) || 0);
      const invite = await ctx.channel.createInvite({ maxAge, maxUses, reason: `Invitación creada por ${ctx.user.tag}` });
      return ctx.reply({ embeds: [embed().setTitle('🔗 Invitación creada').setDescription(`\`${invite.url}\`\n\n**Expira:** ${maxAge ? duration(maxAge * 1000) : 'nunca'}\n**Usos:** ${maxUses || 'ilimitados'}`)] });
    },
  }),
  cmd({
    name: 'boosters',
    description: 'Lista los usuarios que boostearon el servidor',
    category: 'Utilidad',
    run: async (ctx) => {
      const boosters = ctx.guild.members.cache.filter((m) => m.premiumSince).map((m) => `• ${m} — desde ${timestamp(m.premiumSince, 'R')}`);
      return ctx.reply({ embeds: [embed().setTitle(`🚀 Boosters (${boosters.length})`).setDescription(boosters.join('\n') || 'Nadie ha boosteado el servidor todavía.')] });
    },
  }),
  cmd({
    name: 'bots',
    description: 'Lista los bots del servidor',
    category: 'Utilidad',
    run: async (ctx) => {
      const bots = ctx.guild.members.cache.filter((m) => m.user.bot).map((m) => `• ${m.user.tag} (\`${m.id}\`)`);
      return ctx.reply({ embeds: [embed().setTitle(`🤖 Bots (${bots.length})`).setDescription(bots.join('\n').slice(0, 4000) || 'No hay bots.')] });
    },
  }),
  cmd({
    name: 'inactivos',
    description: 'Lista usuarios sin actividad reciente registrada',
    category: 'Utilidad',
    staffOnly: true,
    options: [int('dias', 'Días sin actividad', false, { min_value: 1, max_value: 365 })],
    run: async (ctx) => {
      const days = ctx.int('dias') || 30;
      const cutoff = new Date(Date.now() - days * 86400000);
      const docs = await db.User.find({ guildId: ctx.guildId, $or: [{ lastSeen: { $lt: cutoff } }, { lastSeen: null }] }).limit(25).lean();
      if (!docs.length) return ctx.ok('No se encontraron usuarios inactivos.');
      return ctx.ok('', {
        title: `😴 Inactivos (+${days} días)`,
        description: docs.map((d) => `• <@${d.userId}> — último uso: ${d.lastSeen ? timestamp(d.lastSeen) : 'nunca'}`).join('\n'),
        footer: 'Basado en la última interacción registrada con el bot',
      });
    },
  }),
  cmd({
    name: 'roles',
    description: 'Lista los roles del servidor',
    category: 'Utilidad',
    run: async (ctx) => {
      const roles = ctx.guild.roles.cache.sort((a, b) => b.position - a.position).map((r) => `• ${r} — ${r.members.size} miembros`);
      return ctx.reply({ embeds: [embed().setTitle(`🎭 Roles (${roles.length})`).setDescription(roles.join('\n').slice(0, 4000))] });
    },
  }),
  cmd({
    name: 'canales',
    description: 'Lista los canales del servidor por categoría',
    category: 'Utilidad',
    run: async (ctx) => {
      const groups = new Map();
      for (const ch of ctx.guild.channels.cache.values()) {
        const key = ch.parent?.name || 'Sin categoría';
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(`<#${ch.id}>`);
      }
      const text = [...groups.entries()].map(([k, v]) => `**${k}**\n${v.join(' ')}`).join('\n\n');
      return ctx.reply({ embeds: [embed().setTitle('📚 Canales').setDescription(text.slice(0, 4000))] });
    },
  }),
  cmd({
    name: 'permisos',
    description: 'Muestra los permisos de un miembro',
    category: 'Utilidad',
    options: [user('usuario', 'Miembro (opcional)')],
    run: async (ctx) => {
      const targetUser = ctx.userOpt('usuario') || ctx.user;
      const member = await ctx.guild.members.fetch(targetUser.id).catch(() => null);
      if (!member) return ctx.err('Miembro no encontrado.');
      const perms = member.permissions.toArray();
      return ctx.reply({ embeds: [embed().setTitle(`🔑 Permisos de ${targetUser.tag}`).setDescription(perms.length ? perms.map((p) => `\`${p}\``).join(', ') : 'Sin permisos destacados.').setFooter({ text: member.permissions.has(PermissionsBitField.Flags.Administrator) ? 'Administrador (todos los permisos)' : `${perms.length} permisos` })] });
    },
  }),
];
