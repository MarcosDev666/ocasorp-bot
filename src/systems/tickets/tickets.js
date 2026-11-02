'use strict';

const db = require('../../database/models');
const { str, int, user, role, channel, choices } = require('../../utils/options');
const { cmd, saveSettings, getSettings, embed } = require('../../utils/premade');
const { panelPayload, closeTicket, addUserToTicket, PRIORITY_EMOJI } = require('../../services/tickets');
const { saveTranscript } = require('../../services/transcript');
const { isStaff } = require('../../core/permissions');


async function currentTicket(ctx) {
  const doc = await db.Ticket.findOne({ channelId: ctx.channelId });
  if (!doc) { await ctx.err('Este canal no es un ticket.'); return null; }
  return doc;
}

module.exports = [
  cmd({
    name: 'ticket panel',
    description: 'Publica el panel de apertura de tickets',
    category: 'Tickets',
    groupDescription: 'Sistema de soporte con tickets, categorías y transcripciones',
    perms: ['ManageGuild'],
    options: [channel('canal', 'Canal donde publicar el panel', false), str('mensaje', 'Mensaje del panel', false, { max_length: 1500 })],
    run: async (ctx) => {
      const settings = await getSettings(ctx);
      if (!settings.tickets.categories.length) return ctx.err('Primero creá al menos una categoría con `/ticket categoria-crear`.');
      const ch = ctx.channelOpt('canal') || ctx.channel;
      if (ctx.str('mensaje')) { settings.tickets.message = ctx.str('mensaje'); await settings.save(); }
      const msg = await ch.send(panelPayload(settings));
      settings.tickets.enabled = true;
      settings.tickets.panelChannelId = ch.id;
      settings.tickets.panelMessageId = msg.id;
      await settings.save();
      return ctx.ok(`✅ Panel de tickets publicado en <#${ch.id}>.`);
    },
  }),
  cmd({
    name: 'ticket cerrar',
    description: 'Cierra el ticket actual y genera la transcripción',
    category: 'Tickets',
    options: [str('motivo', 'Motivo del cierre', false, { max_length: 400 })],
    run: async (ctx) => {
      const doc = await currentTicket(ctx);
      if (!doc) return null;
      if (doc.userId !== ctx.userId && !isStaff(ctx.member)) return ctx.err('Solo el autor del ticket o el staff puede cerrarlo.');
      const reason = ctx.str('motivo') || 'Sin motivo especificado';
      await ctx.ok('🔒 Cerrando el ticket y generando la transcripción...');
      await closeTicket(ctx.channel, ctx.user, reason);
      return null;
    },
  }),
  cmd({
    name: 'ticket anadir',
    description: 'Añade un usuario al ticket actual',
    category: 'Tickets',
    staffOnly: true,
    options: [user('usuario', 'Usuario a añadir', true)],
    run: async (ctx) => {
      const doc = await currentTicket(ctx);
      if (!doc) return null;
      const targetUser = ctx.userOpt('usuario');
      await addUserToTicket(ctx.channel, targetUser.id);
      return ctx.ok(`✅ ${targetUser} añadido al ticket.`);
    },
  }),
  cmd({
    name: 'ticket quitar',
    description: 'Quita un usuario del ticket actual',
    category: 'Tickets',
    staffOnly: true,
    options: [user('usuario', 'Usuario a quitar', true)],
    run: async (ctx) => {
      const doc = await currentTicket(ctx);
      if (!doc) return null;
      const targetUser = ctx.userOpt('usuario');
      if (targetUser.id === doc.userId) return ctx.err('No podés quitar al autor del ticket.');
      await ctx.channel.permissionOverwrites.edit(targetUser.id, { ViewChannel: false }).catch(() => null);
      await db.Ticket.updateOne({ channelId: ctx.channelId }, { $pull: { participants: targetUser.id } });
      return ctx.ok(`✅ ${targetUser} removido del ticket.`);
    },
  }),
  cmd({
    name: 'ticket reclamar',
    description: 'Reclama el ticket actual como staff',
    category: 'Tickets',
    staffOnly: true,
    run: async (ctx) => {
      const doc = await currentTicket(ctx);
      if (!doc) return null;
      doc.claimedBy = ctx.userId;
      doc.status = 'claimed';
      await doc.save();
      await ctx.channel.setTopic(`ticket:${doc.userId} | Ticket #${doc.number} | ${doc.category} | Reclamado por ${ctx.user.tag}`).catch(() => null);
      return ctx.ok('🙋 Reclamaste el ticket.');
    },
  }),
  cmd({
    name: 'ticket prioridad',
    description: 'Cambia la prioridad del ticket actual',
    category: 'Tickets',
    staffOnly: true,
    options: [str('nivel', 'Prioridad', true, { choices: choices(['Baja', 'baja'], ['Normal', 'normal'], ['Alta', 'alta'], ['Urgente', 'urgente']) })],
    run: async (ctx) => {
      const doc = await currentTicket(ctx);
      if (!doc) return null;
      doc.priority = ctx.str('nivel');
      await doc.save();
      return ctx.ok(`${PRIORITY_EMOJI[doc.priority]} Prioridad actualizada a **${doc.priority}**.`);
    },
  }),
  cmd({
    name: 'ticket transcript',
    description: 'Genera la transcripción del ticket actual',
    category: 'Tickets',
    staffOnly: true,
    run: async (ctx) => {
      const doc = await currentTicket(ctx);
      if (!doc) return null;
      const data = await saveTranscript(ctx.channel);
      return ctx.reply({ embeds: [embed().setDescription(`📄 Transcripción de **${data.count}** mensajes.`)], files: [{ attachment: data.file, name: data.fileName }] }, true);
    },
  }),
  cmd({
    name: 'ticket lista',
    description: 'Lista los tickets abiertos',
    category: 'Tickets',
    staffOnly: true,
    run: async (ctx) => {
      const docs = await db.Ticket.find({ guildId: ctx.guildId, status: { $ne: 'closed' } }).sort({ createdAt: 1 }).limit(30).lean();
      if (!docs.length) return ctx.ok('No hay tickets abiertos.');
      return ctx.ok('', {
        title: `🎫 Tickets abiertos (${docs.length})`,
        description: docs.map((t) => `• <#${t.channelId}> — <@${t.userId}> · ${t.category} · ${PRIORITY_EMOJI[t.priority] || ''} ${t.priority}${t.claimedBy ? ` · 🙋 <@${t.claimedBy}>` : ''}`).join('\n'),
      });
    },
  }),
  cmd({
    name: 'ticket categoria-crear',
    description: 'Crea una categoría de tickets',
    category: 'Tickets',
    perms: ['ManageGuild'],
    options: [
      str('clave', 'Clave interna (sin espacios)', true, { max_length: 20 }),
      str('nombre', 'Nombre visible', true, { max_length: 60 }),
      str('emoji', 'Emoji de la categoría', false, { max_length: 4 }),
      str('descripcion', 'Descripción', false, { max_length: 100 }),
      channel('categoria', 'Categoría de Discord donde se crearán los tickets', false),
      role('rol_staff', 'Rol de staff que atiende esta categoría', false),
    ],
    run: async (ctx) => {
      const key = ctx.str('clave').toLowerCase().replace(/\s+/g, '-');
      if (!/^[a-z0-9_-]+$/.test(key)) return ctx.err('La clave solo puede tener letras minúsculas, números, `_` y `-`.');
      const settings = await getSettings(ctx);
      if (settings.tickets.categories.some((c) => c.key === key)) return ctx.err('Ya existe una categoría con esa clave.');
      await saveSettings(ctx, (g) => {
        g.tickets.categories.push({
          key, label: ctx.str('nombre'), emoji: ctx.str('emoji') || '🎫', description: ctx.str('descripcion'),
          categoryId: ctx.channelOpt('categoria')?.id, staffRoleIds: ctx.roleOpt('rol_staff') ? [ctx.roleOpt('rol_staff').id] : [],
        });
      });
      return ctx.ok(`✅ Categoría **${ctx.str('nombre')}** creada con la clave \`${key}\`.`);
    },
  }),
  cmd({
    name: 'ticket categoria-borrar',
    description: 'Elimina una categoría de tickets',
    category: 'Tickets',
    perms: ['ManageGuild'],
    options: [str('clave', 'Clave de la categoría', true, { autocomplete: true })],
    autocomplete: async (ctx) => {
      const settings = await getSettings(ctx);
      return ctx.interaction.respond(settings.tickets.categories.filter((c) => c.key.includes(String(ctx.focused('clave') || '').toLowerCase())).map((c) => ({ name: c.label, value: c.key }))).catch(() => null);
    },
    run: async (ctx) => {
      const key = ctx.str('clave');
      const settings = await getSettings(ctx);
      if (!settings.tickets.categories.some((c) => c.key === key)) return ctx.err('Categoría no encontrada.');
      await saveSettings(ctx, (g) => { g.tickets.categories = g.tickets.categories.filter((c) => c.key !== key); });
      return ctx.ok(`🗑️ Categoría \`${key}\` eliminada.`);
    },
  }),
  cmd({
    name: 'ticket categoria-lista',
    description: 'Lista las categorías de tickets',
    category: 'Tickets',
    perms: ['ManageGuild'],
    run: async (ctx) => {
      const settings = await getSettings(ctx);
      if (!settings.tickets.categories.length) return ctx.err('No hay categorías configuradas.');
      return ctx.ok('', {
        title: '🎫 Categorías de tickets',
        description: settings.tickets.categories.map((c) => `${c.emoji || '🎫'} **${c.label}** · \`${c.key}\`\n> ${c.description || 'Sin descripción'}\n> Canal: ${c.categoryId ? `<#${c.categoryId}>` : 'sin categoría'} · Staff: ${c.staffRoleIds?.length ? c.staffRoleIds.map((r) => `<@&${r}>`).join(', ') : 'general'}`).join('\n\n'),
      });
    },
  }),
  cmd({
    name: 'ticket configurar',
    description: 'Configura el sistema de tickets',
    category: 'Tickets',
    perms: ['ManageGuild'],
    options: [
      channel('categoria', 'Categoría de Discord por defecto', false),
      channel('logs', 'Canal de logs y transcripciones', false),
      role('rol_staff', 'Rol de staff general', false),
      int('max_abiertos', 'Máximo de tickets abiertos por usuario', false, { min_value: 1, max_value: 10 }),
    ],
    run: async (ctx) => {
      const settings = await saveSettings(ctx, (g) => {
        if (ctx.channelOpt('categoria')) g.tickets.categoryId = ctx.channelOpt('categoria').id;
        if (ctx.channelOpt('logs')) g.tickets.logChannelId = ctx.channelOpt('logs').id;
        if (ctx.roleOpt('rol_staff') && !g.tickets.staffRoleIds.includes(ctx.roleOpt('rol_staff').id)) g.tickets.staffRoleIds.push(ctx.roleOpt('rol_staff').id);
        if (ctx.int('max_abiertos')) g.tickets.maxOpenPerUser = ctx.int('max_abiertos');
      });
      return ctx.ok('', {
        title: '⚙️ Tickets configurados',
        fields: [
          { name: 'Categoría', value: settings.tickets.categoryId ? `<#${settings.tickets.categoryId}>` : 'No configurada', inline: true },
          { name: 'Logs', value: settings.tickets.logChannelId ? `<#${settings.tickets.logChannelId}>` : 'No configurado', inline: true },
          { name: 'Staff', value: settings.tickets.staffRoleIds.map((r) => `<@&${r}>`).join(', ') || 'No configurado', inline: true },
          { name: 'Máx. por usuario', value: String(settings.tickets.maxOpenPerUser), inline: true },
          { name: 'Categorías', value: String(settings.tickets.categories.length), inline: true },
        ],
      });
    },
  }),
  cmd({
    name: 'ticket stats',
    description: 'Estadísticas del sistema de tickets',
    category: 'Tickets',
    staffOnly: true,
    run: async (ctx) => {
      const [total, open, closed, ratings] = await Promise.all([
        db.Ticket.countDocuments({ guildId: ctx.guildId }),
        db.Ticket.countDocuments({ guildId: ctx.guildId, status: { $ne: 'closed' } }),
        db.Ticket.countDocuments({ guildId: ctx.guildId, status: 'closed' }),
        db.Ticket.aggregate([{ $match: { guildId: ctx.guildId, rating: { $exists: true } } }, { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } }]),
      ]);
      return ctx.ok('', {
        title: '📊 Estadísticas de tickets',
        fields: [
          { name: 'Total históricos', value: String(total), inline: true },
          { name: 'Abiertos', value: String(open), inline: true },
          { name: 'Cerrados', value: String(closed), inline: true },
          { name: 'Calificación', value: ratings[0] ? `${ratings[0].avg.toFixed(1)}/5 (${ratings[0].count} votos)` : 'Sin votos', inline: true },
        ],
      });
    },
  }),
];
