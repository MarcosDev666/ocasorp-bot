'use strict';

const { str, int, bool, channel } = require('../../utils/options');
const { cmd, saveSettings, getSettings, yesNo } = require('../../utils/premade');
const { buildEmbed, applyTemplate } = require('../../services/welcome');

const preview = async (ctx, type) => {
  const settings = await getSettings(ctx);
  const cfg = type === 'welcome' ? settings.welcome : settings.goodbye;
  if (!cfg.channelId) return ctx.err('Primero configurá un canal.');
  const channelObj = ctx.guild.channels.cache.get(cfg.channelId);
  if (!channelObj?.isTextBased()) return ctx.err('El canal configurado no es válido.');
  const payload = cfg.embed ? { embeds: [buildEmbed(settings, ctx.member, type === 'welcome' ? 'welcome' : 'goodbye')] } : { content: applyTemplate(cfg.message, ctx.member) };
  if (type === 'welcome') {
    await channelObj.send({ ...payload, content: `${payload.content || ''}\n> *Mensaje de prueba solicitado por ${ctx.user.tag}*`.trim() }).catch(() => null);
  } else {
    await channelObj.send(payload).catch(() => null);
  }
  return ctx.ok(`✅ Mensaje de prueba enviado a <#${cfg.channelId}>.`);
};

module.exports = [
  cmd({
    name: 'bienvenida configurar',
    description: 'Configura el sistema de bienvenidas',
    category: 'Configuración',
    groupDescription: 'Mensajes de bienvenida y despedida para Ocaso Roleplay',
    perms: ['ManageGuild'],
    options: [
      channel('canal', 'Canal de bienvenidas', false),
      bool('activar', 'Activar o desactivar', false),
      bool('embed', 'Usar embed (en vez de texto plano)', false),
      bool('dm', 'Enviar también un MD al nuevo miembro', false),
      int('borrar_despues', 'Borrar el mensaje después de X minutos (0 = nunca)', false, { min_value: 0, max_value: 1440 }),
      str('color', 'Color hex del embed (ej: #E8A33D)', false),
    ],
    run: async (ctx) => {
      const settings = await saveSettings(ctx, (g) => {
        if (ctx.channelOpt('canal')) g.welcome.channelId = ctx.channelOpt('canal').id;
        if (ctx.bool('activar') !== null) g.welcome.enabled = ctx.bool('activar');
        if (ctx.bool('embed') !== null) g.welcome.embed = ctx.bool('embed');
        if (ctx.bool('dm') !== null) g.welcome.dm = ctx.bool('dm');
        if (ctx.int('borrar_despues') !== null) g.welcome.deleteAfter = ctx.int('borrar_despues') * 60000;
        if (ctx.str('color')) g.welcome.color = ctx.str('color');
      });
      return ctx.ok('', {
        title: '⚙️ Bienvenidas configuradas',
        fields: [
          { name: 'Estado', value: yesNo(settings.welcome.enabled), inline: true },
          { name: 'Canal', value: settings.welcome.channelId ? `<#${settings.welcome.channelId}>` : 'No configurado', inline: true },
          { name: 'Embed', value: yesNo(settings.welcome.embed), inline: true },
          { name: 'MD', value: yesNo(settings.welcome.dm), inline: true },
          { name: 'Auto-borrado', value: settings.welcome.deleteAfter ? `${settings.welcome.deleteAfter / 60000} min` : 'Nunca', inline: true },
        ],
        footer: 'Variables: {user} {username} {tag} {server} {memberCount} {ip} {port}',
      });
    },
  }),
  cmd({
    name: 'bienvenida canal',
    description: 'Establece el canal de bienvenidas',
    category: 'Configuración',
    perms: ['ManageGuild'],
    options: [channel('canal', 'Canal de bienvenidas', true)],
    run: async (ctx) => {
      const ch = ctx.channelOpt('canal');
      if (!ch.isTextBased()) return ctx.err('El canal debe ser de texto.');
      await saveSettings(ctx, (g) => { g.welcome.channelId = ch.id; g.welcome.enabled = true; });
      return ctx.ok(`✅ Canal de bienvenidas establecido en <#${ch.id}>.`);
    },
  }),
  cmd({
    name: 'bienvenida mensaje',
    description: 'Establece el mensaje y título de bienvenida',
    category: 'Configuración',
    perms: ['ManageGuild'],
    options: [
      str('mensaje', 'Mensaje (podés usar variables)', true, { max_length: 1800 }),
      str('titulo', 'Título del embed', false, { max_length: 120 }),
    ],
    run: async (ctx) => {
      await saveSettings(ctx, (g) => {
        g.welcome.message = ctx.str('mensaje');
        if (ctx.str('titulo')) g.welcome.title = ctx.str('titulo');
      });
      return ctx.ok('✅ Mensaje de bienvenida actualizado.\n\n**Vista previa:**\n' + applyTemplate(ctx.str('mensaje'), ctx.member, { count: ctx.guild.memberCount }));
    },
  }),
  cmd({
    name: 'bienvenida imagen',
    description: 'Establece la imagen o miniatura de bienvenida',
    category: 'Configuración',
    perms: ['ManageGuild'],
    options: [str('url', 'URL de la imagen (usá "none" para quitar)', true), str('tipo', 'imagen o thumbnail', false, { choices: [{ name: 'Imagen', value: 'image' }, { name: 'Miniatura', value: 'thumbnail' }] })],
    run: async (ctx) => {
      const url = ctx.str('url');
      if (url !== 'none' && !/^https?:\/\//.test(url)) return ctx.err('La URL debe empezar con http:// o https://');
      const type = ctx.str('tipo') || 'image';
      await saveSettings(ctx, (g) => { g.welcome[type] = url; });
      return ctx.ok(`✅ ${type === 'image' ? 'Imagen' : 'Miniatura'} de bienvenida ${url === 'none' ? 'eliminada' : 'actualizada'}.`);
    },
  }),
  cmd({
    name: 'bienvenida test',
    description: 'Envía un mensaje de bienvenida de prueba',
    category: 'Configuración',
    perms: ['ManageGuild'],
    run: async (ctx) => preview(ctx, 'welcome'),
  }),
  cmd({
    name: 'bienvenida desactivar',
    description: 'Desactiva las bienvenidas',
    category: 'Configuración',
    perms: ['ManageGuild'],
    run: async (ctx) => {
      await saveSettings(ctx, (g) => { g.welcome.enabled = false; });
      return ctx.ok('🔕 Bienvenidas desactivadas.');
    },
  }),
  cmd({
    name: 'despedida configurar',
    description: 'Configura el sistema de despedidas',
    category: 'Configuración',
    groupDescription: 'Mensajes de despedida del servidor',
    perms: ['ManageGuild'],
    options: [
      channel('canal', 'Canal de despedidas', false),
      bool('activar', 'Activar o desactivar', false),
      bool('embed', 'Usar embed', false),
      int('borrar_despues', 'Borrar el mensaje después de X minutos', false, { min_value: 0, max_value: 1440 }),
      str('color', 'Color hex del embed', false),
    ],
    run: async (ctx) => {
      const settings = await saveSettings(ctx, (g) => {
        if (ctx.channelOpt('canal')) g.goodbye.channelId = ctx.channelOpt('canal').id;
        if (ctx.bool('activar') !== null) g.goodbye.enabled = ctx.bool('activar');
        if (ctx.bool('embed') !== null) g.goodbye.embed = ctx.bool('embed');
        if (ctx.int('borrar_despues') !== null) g.goodbye.deleteAfter = ctx.int('borrar_despues') * 60000;
        if (ctx.str('color')) g.goodbye.color = ctx.str('color');
      });
      return ctx.ok('', {
        title: '⚙️ Despedidas configuradas',
        fields: [
          { name: 'Estado', value: yesNo(settings.goodbye.enabled), inline: true },
          { name: 'Canal', value: settings.goodbye.channelId ? `<#${settings.goodbye.channelId}>` : 'No configurado', inline: true },
          { name: 'Embed', value: yesNo(settings.goodbye.embed), inline: true },
        ],
      });
    },
  }),
  cmd({
    name: 'despedida canal',
    description: 'Establece el canal de despedidas',
    category: 'Configuración',
    perms: ['ManageGuild'],
    options: [channel('canal', 'Canal de despedidas', true)],
    run: async (ctx) => {
      const ch = ctx.channelOpt('canal');
      await saveSettings(ctx, (g) => { g.goodbye.channelId = ch.id; g.goodbye.enabled = true; });
      return ctx.ok(`✅ Canal de despedidas establecido en <#${ch.id}>.`);
    },
  }),
  cmd({
    name: 'despedida mensaje',
    description: 'Establece el mensaje de despedida',
    category: 'Configuración',
    perms: ['ManageGuild'],
    options: [str('mensaje', 'Mensaje (podés usar variables)', true, { max_length: 1800 }), str('titulo', 'Título', false, { max_length: 120 })],
    run: async (ctx) => {
      await saveSettings(ctx, (g) => { g.goodbye.message = ctx.str('mensaje'); if (ctx.str('titulo')) g.goodbye.title = ctx.str('titulo'); });
      return ctx.ok('✅ Mensaje de despedida actualizado.');
    },
  }),
  cmd({
    name: 'despedida test',
    description: 'Envía un mensaje de despedida de prueba',
    category: 'Configuración',
    perms: ['ManageGuild'],
    run: async (ctx) => preview(ctx, 'goodbye'),
  }),
  cmd({
    name: 'despedida desactivar',
    description: 'Desactiva las despedidas',
    category: 'Configuración',
    perms: ['ManageGuild'],
    run: async (ctx) => {
      await saveSettings(ctx, (g) => { g.goodbye.enabled = false; });
      return ctx.ok('🔕 Despedidas desactivadas.');
    },
  }),
];
