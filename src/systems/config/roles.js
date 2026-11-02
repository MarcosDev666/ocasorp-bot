'use strict';
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType } = require('discord.js');
const config = require('../../config');
const { str, bool, channel, role, choices } = require('../../utils/options');
const { cmd, saveSettings, getSettings, yesNo } = require('../../utils/premade');

module.exports = [
  cmd({
    name: 'autorol agregar',
    description: 'Añade un rol automático para los nuevos miembros',
    category: 'Configuración',
    groupDescription: 'Roles automáticos, verificación, boosts y contadores',
    perms: ['ManageGuild'],
    botPerms: ['ManageRoles'],
    options: [role('rol', 'Rol a otorgar automáticamente', true)],
    run: async (ctx) => {
      const r = ctx.roleOpt('rol');
      if (r.managed) return ctx.err('Ese rol es manejado por una integración y no se puede asignar.');
      if (r.position >= ctx.guild.members.me.roles.highest.position) return ctx.err('Ese rol está por encima de mi rol más alto.');
      const settings = await saveSettings(ctx, (g) => { if (!g.autoroleIds.includes(r.id)) g.autoroleIds.push(r.id); });
      return ctx.ok(`✅ ${r} agregado a los autoroles (${settings.autoroleIds.length} en total).`);
    },
  }),
  cmd({
    name: 'autorol quitar',
    description: 'Quita un rol automático',
    category: 'Configuración',
    perms: ['ManageGuild'],
    options: [role('rol', 'Rol a quitar', true)],
    run: async (ctx) => {
      const r = ctx.roleOpt('rol');
      await saveSettings(ctx, (g) => { g.autoroleIds = g.autoroleIds.filter((id) => id !== r.id); });
      return ctx.ok(`✅ ${r} quitado de los autoroles.`);
    },
  }),
  cmd({
    name: 'autorol lista',
    description: 'Lista los roles automáticos configurados',
    category: 'Configuración',
    perms: ['ManageGuild'],
    run: async (ctx) => {
      const settings = await getSettings(ctx);
      return ctx.ok('', {
        title: '🎭 Autoroles',
        description: settings.autoroleIds.length ? settings.autoroleIds.map((id) => `<@&${id}>`).join('\n') : 'No hay autoroles configurados.',
      });
    },
  }),
  cmd({
    name: 'verificacion panel',
    description: 'Publica el panel de verificación',
    category: 'Configuración',
    groupDescription: 'Verificación de miembros y control de acceso al servidor',
    perms: ['ManageGuild'],
    botPerms: ['ManageRoles'],
    options: [channel('canal', 'Canal donde publicar el panel', true)],
    run: async (ctx) => {
      const settings = await getSettings(ctx);
      if (!settings.verification.roleId) return ctx.err('Primero configurá el rol de verificación con `/verificacion configurar`.');
      const ch = ctx.channelOpt('canal');
      const embedMsg = new EmbedBuilder().setColor(config.brand.color).setTitle(settings.verification.title).setDescription(settings.verification.message).setFooter({ text: config.brand.footer });
      const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId(`verify:${settings.verification.roleId}`).setLabel(settings.verification.buttonLabel || 'Verificarme').setEmoji('✅').setStyle(ButtonStyle.Success));
      await ch.send({ embeds: [embedMsg], components: [row] });
      settings.verification.enabled = true;
      settings.verification.channelId = ch.id;
      await settings.save();
      return ctx.ok(`✅ Panel de verificación publicado en <#${ch.id}>.`);
    },
  }),
  cmd({
    name: 'verificacion configurar',
    description: 'Configura el sistema de verificación',
    category: 'Configuración',
    perms: ['ManageGuild'],
    botPerms: ['ManageRoles'],
    options: [
      role('rol', 'Rol que se otorga al verificarse', true),
      role('rol_no_verificado', 'Rol temporal para no verificados', false),
      str('mensaje', 'Mensaje del panel', false, { max_length: 1500 }),
      str('titulo', 'Título del panel', false, { max_length: 120 }),
      str('boton', 'Texto del botón', false, { max_length: 80 }),
    ],
    run: async (ctx) => {
      const settings = await saveSettings(ctx, (g) => {
        g.verification.roleId = ctx.roleOpt('rol').id;
        if (ctx.roleOpt('rol_no_verificado')) g.verification.unverifiedRoleId = ctx.roleOpt('rol_no_verificado').id;
        if (ctx.str('mensaje')) g.verification.message = ctx.str('mensaje');
        if (ctx.str('titulo')) g.verification.title = ctx.str('titulo');
        if (ctx.str('boton')) g.verification.buttonLabel = ctx.str('boton');
        g.verification.enabled = true;
      });
      return ctx.ok('', {
        title: '✅ Verificación configurada',
        fields: [
          { name: 'Rol verificado', value: `<@&${settings.verification.roleId}>`, inline: true },
          { name: 'Rol no verificado', value: settings.verification.unverifiedRoleId ? `<@&${settings.verification.unverifiedRoleId}>` : 'No configurado', inline: true },
          { name: 'Panel', value: settings.verification.channelId ? `<#${settings.verification.channelId}>` : 'Usá `/verificacion panel`', inline: true },
        ],
      });
    },
  }),
  cmd({
    name: 'verificacion desactivar',
    description: 'Desactiva el sistema de verificación',
    category: 'Configuración',
    perms: ['ManageGuild'],
    run: async (ctx) => {
      await saveSettings(ctx, (g) => { g.verification.enabled = false; });
      return ctx.ok('🔕 Verificación desactivada.');
    },
  }),
  cmd({
    name: 'boost configurar',
    description: 'Configura el mensaje y rol de boosts',
    category: 'Configuración',
    perms: ['ManageGuild'],
    options: [channel('canal', 'Canal de anuncios de boost', false), role('rol', 'Rol para boosters', false), str('mensaje', 'Mensaje (usá {user})', false, { max_length: 1000 }), bool('activar', 'Activar o desactivar', false)],
    run: async (ctx) => {
      const settings = await saveSettings(ctx, (g) => {
        if (ctx.channelOpt('canal')) g.boost.channelId = ctx.channelOpt('canal').id;
        if (ctx.roleOpt('rol')) g.boost.roleId = ctx.roleOpt('rol').id;
        if (ctx.str('mensaje')) g.boost.message = ctx.str('mensaje');
        if (ctx.bool('activar') !== null) g.boost.enabled = ctx.bool('activar');
      });
      return ctx.ok('', {
        title: '🚀 Configuración de boosts',
        fields: [
          { name: 'Estado', value: yesNo(settings.boost.enabled), inline: true },
          { name: 'Canal', value: settings.boost.channelId ? `<#${settings.boost.channelId}>` : 'No configurado', inline: true },
          { name: 'Rol', value: settings.boost.roleId ? `<@&${settings.boost.roleId}>` : 'No configurado', inline: true },
        ],
      });
    },
  }),
  cmd({
    name: 'contador crear',
    description: 'Crea un canal contador automático (miembros, bots, tickets...)',
    category: 'Configuración',
    perms: ['ManageGuild'],
    botPerms: ['ManageChannels'],
    options: [
      str('tipo', 'Qué contar', true, { choices: choices(['Miembros', 'members'], ['Humanos', 'humans'], ['Bots', 'bots'], ['Online', 'online'], ['Boosters', 'boosters'], ['Tickets abiertos', 'tickets']) }),
      channel('canal', 'Canal de voz que se usará como contador', false),
      str('formato', 'Formato del nombre (usá {value})', false, { max_length: 100 }),
    ],
    run: async (ctx) => {
      let ch = ctx.channelOpt('canal');
      if (!ch) {
        ch = await ctx.guild.channels.create({ name: `📊 ${ctx.str('tipo')}: 0`, type: ChannelType.GuildVoice, permissionOverwrites: [{ id: ctx.guild.roles.everyone.id, Connect: false }] });
      }
      const fmt = ctx.str('formato') || (ctx.str('tipo') === 'members' ? '👥 Miembros: {value}' : `📊 ${ctx.str('tipo')}: {value}`);
      await saveSettings(ctx, (g) => { g.counters.push({ channelId: ch.id, type: ctx.str('tipo'), format: fmt }); });
      return ctx.ok(`✅ Contador creado en <#${ch.id}>. Se actualiza cada 5 minutos.`);
    },
  }),
  cmd({
    name: 'contador borrar',
    description: 'Elimina un contador configurado',
    category: 'Configuración',
    perms: ['ManageGuild'],
    options: [channel('canal', 'Canal del contador', true)],
    run: async (ctx) => {
      const id = ctx.channelOpt('canal').id;
      await saveSettings(ctx, (g) => { g.counters = g.counters.filter((c) => c.channelId !== id); });
      return ctx.ok('✅ Contador eliminado de la configuración.');
    },
  }),
  cmd({
    name: 'contador lista',
    description: 'Lista los contadores configurados',
    category: 'Configuración',
    perms: ['ManageGuild'],
    run: async (ctx) => {
      const settings = await getSettings(ctx);
      return ctx.ok('', {
        title: '📊 Contadores',
        description: settings.counters.length ? settings.counters.map((c) => `<#${c.channelId}> → \`${c.type}\` · ${c.format}`).join('\n') : 'No hay contadores configurados.',
      });
    },
  }),
];
