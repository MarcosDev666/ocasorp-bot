'use strict';
const { EmbedBuilder } = require('discord.js');
const config = require('../../config');
const db = require('../../database/models');
const mod = require('../../services/moderation');
const { str, int, user, role, channel } = require('../../utils/options');
const { cmd, target } = require('../../utils/premade');
const { duration, parseDuration, fullDate, timestamp, truncate } = require('../../utils/format');
const { modLog } = require('../../services/logger');

const reasonOpt = str('razon', 'Razón de la sanción', false, { max_length: 500 });
const evidenceOpt = str('evidencia', 'Prueba (link, ID de clip, etc.)', false, { max_length: 500 });

async function punish(ctx, { action, member, durationMs, reason, evidence, type, perms }) {
  const targetMember = member;
  const { user: targetUser } = { user: targetMember?.user };
  const problem = mod.canAct(ctx.member, targetMember, ctx.guild, action);
  if (problem) { await ctx.err(problem); return null; }
  const record = await mod.createCase({ guild: ctx.guild, type, userId: targetUser.id, moderatorId: ctx.userId, reason, duration: durationMs, evidence });
  await mod.dmSanction(ctx.guild, targetUser.id, { action, reason, duration: durationMs ? duration(durationMs) : null });
  await modLog(ctx.guild, { action, target: targetMember, moderator: ctx.member, reason, caseId: record.caseId, duration: durationMs ? duration(durationMs) : null });
  return record;
}

module.exports = [
  cmd({
    name: 'mod ban',
    description: 'Banea a un miembro del servidor',
    category: 'Moderación',
    groupDescription: 'Sanciones, purgas y herramientas staff de Ocaso Roleplay',
    perms: ['BanMembers'],
    botPerms: ['BanMembers'],
    options: [user('usuario', 'Usuario a banear', true), reasonOpt, int('borrar_mensajes', 'Borrar mensajes de los últimos X días', false, { min_value: 0, max_value: 7 }), evidenceOpt],
    run: async (ctx) => {
      const { user: targetUser, member } = await target(ctx);
      if (!targetUser) return ctx.err('Usuario inválido.');
      const reason = ctx.str('razon') || 'Sin razón especificada';
      const problem = member ? mod.canAct(ctx.member, member, ctx.guild, 'ban') : null;
      if (problem) return ctx.err(problem);
      const record = await mod.createCase({ guild: ctx.guild, type: 'ban', userId: targetUser.id, moderatorId: ctx.userId, reason, evidence: ctx.str('evidencia') });
      await mod.dmSanction(ctx.guild, targetUser.id, { action: 'Ban', reason });
      const banned = await ctx.guild.bans.create(targetUser.id, { reason: `${ctx.user.tag}: ${reason}`, deleteMessageSeconds: (ctx.int('borrar_mensajes') || 0) * 86400 }).then(() => true).catch(async (err) => { await ctx.err(`No se pudo banear: ${err.message}`); return false; });
      if (!banned) return null;
      await modLog(ctx.guild, { action: 'Ban', target: targetUser, moderator: ctx.member, reason, caseId: record.caseId });
      return ctx.ok(`🔨 **${targetUser.tag}** fue baneado. Caso **#${record.caseId}**.\n**Razón:** ${reason}`);
    },
  }),
  cmd({
    name: 'mod tempban',
    description: 'Banea temporalmente a un miembro',
    category: 'Moderación',
    perms: ['BanMembers'],
    botPerms: ['BanMembers'],
    options: [user('usuario', 'Usuario', true), str('duracion', 'Duración (ej: 2h, 3d)', true), reasonOpt],
    run: async (ctx) => {
      const { user: targetUser, member } = await target(ctx);
      if (!member) return ctx.err('El usuario debe estar en el servidor.');
      const ms = parseDuration(ctx.str('duracion'));
      if (!ms || ms < 60000) return ctx.err('Duración inválida. Ejemplos: `30m`, `12h`, `7d`.');
      const reason = ctx.str('razon') || 'Sin razón especificada';
      const record = await punish(ctx, { action: 'Ban temporal', member, durationMs: ms, reason, type: 'tempban' });
      if (!record) return null;
      const banned = await ctx.guild.bans.create(targetUser.id, { reason: `${ctx.user.tag}: ${reason}` }).then(() => true).catch(async (err) => { await ctx.err(`No se pudo banear: ${err.message}`); return false; });
      if (!banned) return null;
      return ctx.ok(`⏳ **${targetUser.tag}** fue baneado por **${duration(ms)}**. Caso **#${record.caseId}**.`);
    },
  }),
  cmd({
    name: 'mod unban',
    description: 'Desbanea a un usuario por su ID',
    category: 'Moderación',
    perms: ['BanMembers'],
    botPerms: ['BanMembers'],
    options: [str('id', 'ID del usuario', true), reasonOpt],
    run: async (ctx) => {
      const id = ctx.str('id').replace(/[^0-9]/g, '');
      if (!id) return ctx.err('ID inválido.');
      const reason = ctx.str('razon') || 'Sin razón';
      const banned = await ctx.guild.bans.fetch(id).catch(() => null);
      if (!banned) return ctx.err('Ese usuario no está baneado.');
      const unbanned = await ctx.guild.bans.remove(id, `${ctx.user.tag}: ${reason}`).then(() => true).catch(async (err) => { await ctx.err(`No se pudo desbanear: ${err.message}`); return false; });
      if (!unbanned) return null;
      const record = await mod.createCase({ guild: ctx.guild, type: 'unban', userId: id, moderatorId: ctx.userId, reason });
      await modLog(ctx.guild, { action: 'Unban', target: banned.user, moderator: ctx.member, reason, caseId: record.caseId });
      return ctx.ok(`🔓 **${banned.user.tag}** fue desbaneado. Caso **#${record.caseId}**.`);
    },
  }),
  cmd({
    name: 'mod kick',
    description: 'Expulsa a un miembro del servidor',
    category: 'Moderación',
    perms: ['KickMembers'],
    botPerms: ['KickMembers'],
    options: [user('usuario', 'Usuario', true), reasonOpt],
    run: async (ctx) => {
      const { member } = await target(ctx);
      if (!member) return ctx.err('El usuario debe estar en el servidor.');
      const reason = ctx.str('razon') || 'Sin razón especificada';
      const record = await punish(ctx, { action: 'Expulsión', member, reason, type: 'kick' });
      if (!record) return null;
      const kicked = await member.kick(`${ctx.user.tag}: ${reason}`).then(() => true).catch(async (err) => { await ctx.err(`No se pudo expulsar: ${err.message}`); return false; });
      if (!kicked) return null;
      return ctx.ok(`👢 **${member.user.tag}** fue expulsado. Caso **#${record.caseId}**.`);
    },
  }),
  cmd({
    name: 'mod timeout',
    description: 'Silencia temporalmente a un miembro',
    category: 'Moderación',
    perms: ['ModerateMembers'],
    botPerms: ['ModerateMembers'],
    options: [user('usuario', 'Usuario', true), str('duracion', 'Duración (máx 28d)', true), reasonOpt],
    run: async (ctx) => {
      const { member } = await target(ctx);
      if (!member) return ctx.err('El usuario debe estar en el servidor.');
      const ms = parseDuration(ctx.str('duracion'));
      if (!ms || ms < 5000) return ctx.err('Duración inválida.');
      if (ms > 28 * 86400000) return ctx.err('El máximo de timeout es 28 días.');
      const reason = ctx.str('razon') || 'Sin razón especificada';
      const record = await punish(ctx, { action: 'Timeout', member, durationMs: ms, reason, type: 'timeout' });
      if (!record) return null;
      const muted = await member.timeout(ms, `${ctx.user.tag}: ${reason}`).then(() => true).catch(async (err) => { await ctx.err(`No se pudo aplicar timeout: ${err.message}`); return false; });
      if (!muted) return null;
      return ctx.ok(`🔇 **${member.user.tag}** quedó en timeout por **${duration(ms)}**. Caso **#${record.caseId}**.`);
    },
  }),
  cmd({
    name: 'mod warn',
    description: 'Advierte a un miembro',
    category: 'Moderación',
    perms: ['ModerateMembers'],
    options: [user('usuario', 'Usuario', true), reasonOpt],
    run: async (ctx) => {
      const { member } = await target(ctx);
      if (!member) return ctx.err('El usuario debe estar en el servidor.');
      const problem = mod.canAct(ctx.member, member, ctx.guild, 'timeout');
      if (problem) return ctx.err(problem);
      const result = await mod.warn({ guild: ctx.guild, member, moderator: ctx.member, reason: ctx.str('razon') || 'Sin razón especificada' });
      return ctx.ok(`⚠️ **${member.user.tag}** recibió una advertencia (${result.total}/${result.max}). Caso **#${result.record.caseId}**.${result.escalated ? `\n🚨 Escalado a **${result.escalated}**.` : ''}`);
    },
  }),
  cmd({
    name: 'mod warns',
    description: 'Muestra las advertencias de un miembro',
    category: 'Moderación',
    perms: ['ModerateMembers'],
    options: [user('usuario', 'Usuario', true)],
    run: async (ctx) => {
      const targetUser = ctx.userOpt('usuario');
      const warns = await mod.getWarnings(ctx.guildId, targetUser.id);
      if (!warns.length) return ctx.ok(`✅ **${targetUser.tag}** no tiene advertencias activas.`);
      return ctx.ok('', {
        title: `⚠️ Advertencias de ${targetUser.tag}`,
        description: warns.map((w) => `**#${w.caseId}** · ${fullDate(w.createdAt)} · <@${w.moderatorId}>\n> ${truncate(w.reason, 200)}`).join('\n\n').slice(0, 4000),
        footer: `${warns.length} advertencia(s)`,
      });
    },
  }),
  cmd({
    name: 'mod delwarn',
    description: 'Elimina una advertencia por número de caso',
    category: 'Moderación',
    perms: ['ModerateMembers'],
    options: [int('caso', 'Número de caso', true, { min_value: 1 })],
    run: async (ctx) => {
      const record = await db.Case.findOne({ guildId: ctx.guildId, caseId: ctx.int('caso'), type: 'warn' });
      if (!record) return ctx.err('No se encontró esa advertencia.');
      record.active = false;
      record.removedBy = ctx.userId;
      record.removedAt = new Date();
      await record.save();
      await db.User.updateOne({ guildId: ctx.guildId, userId: record.userId }, { $inc: { warnings: -1 } });
      return ctx.ok(`✅ Advertencia **#${record.caseId}** eliminada.`);
    },
  }),
  cmd({
    name: 'mod clearwarns',
    description: 'Borra todas las advertencias de un usuario',
    category: 'Moderación',
    perms: ['ModerateMembers'],
    options: [user('usuario', 'Usuario', true)],
    run: async (ctx) => {
      const targetUser = ctx.userOpt('usuario');
      const count = await mod.clearWarnings(ctx.guildId, targetUser.id, ctx.userId);
      await modLog(ctx.guild, { action: 'Advertencias limpiadas', target: targetUser, moderator: ctx.member, reason: `${count} advertencias` });
      return ctx.ok(`🧹 Se eliminaron **${count}** advertencias de ${targetUser}.`);
    },
  }),
  cmd({
    name: 'canal purge',
    description: 'Borra mensajes en el canal actual',
    category: 'Moderación',
    perms: ['ManageMessages'],
    botPerms: ['ManageMessages'],
    options: [int('cantidad', 'Cantidad (1-100)', true, { min_value: 1, max_value: 100 }), user('usuario', 'Solo mensajes de este usuario', false)],
    run: async (ctx) => {
      const amount = ctx.int('cantidad');
      const targetUser = ctx.userOpt('usuario');
      const messages = await ctx.channel.messages.fetch({ limit: 100 });
      const filtered = targetUser ? messages.filter((m) => m.author.id === targetUser.id).first(amount) : messages.first(amount);
      const deleted = await ctx.channel.bulkDelete(filtered, true).catch((err) => ctx.err(`No se pudo purgar: ${err.message}`));
      if (!deleted) return null;
      const message = await ctx.ok(`🧹 **${deleted.size}** mensajes eliminados${targetUser ? ` de ${targetUser}` : ''}.`);
      setTimeout(() => ctx.interaction.deleteReply().catch(() => null), 4000);
      return message;
    },
  }),
  cmd({
    name: 'canal slowmode',
    description: 'Configura el modo lento del canal',
    category: 'Moderación',
    groupDescription: 'Herramientas de gestión de canales y roles',
    perms: ['ManageChannels'],
    botPerms: ['ManageChannels'],
    options: [int('segundos', 'Segundos entre mensajes (0 = desactivar)', true, { min_value: 0, max_value: 21600 }), channel('canal', 'Canal (por defecto el actual)', false)],
    run: async (ctx) => {
      const ch = ctx.channelOpt('canal') || ctx.channel;
      await ch.setRateLimitPerUser(ctx.int('segundos'), `${ctx.user.tag}`);
      return ctx.ok(`🐌 Modo lento de <#${ch.id}>: **${ctx.int('segundos')}s**.`);
    },
  }),
  cmd({
    name: 'canal lock',
    description: 'Bloquea el canal actual para que nadie escriba',
    category: 'Moderación',
    perms: ['ManageChannels'],
    botPerms: ['ManageChannels'],
    options: [str('razon', 'Razón', false)],
    run: async (ctx) => {
      await ctx.channel.permissionOverwrites.edit(ctx.guild.roles.everyone, { SendMessages: false });
      await mod.lockChannel(ctx.channel, ctx.member, ctx.str('razon') || 'Canal bloqueado');
      return ctx.ok('🔒 Canal bloqueado.');
    },
  }),
  cmd({
    name: 'canal unlock',
    description: 'Desbloquea el canal actual',
    category: 'Moderación',
    perms: ['ManageChannels'],
    botPerms: ['ManageChannels'],
    run: async (ctx) => {
      await ctx.channel.permissionOverwrites.edit(ctx.guild.roles.everyone, { SendMessages: null });
      await mod.unlockChannel(ctx.channel, ctx.member, 'Canal desbloqueado');
      return ctx.ok('🔓 Canal desbloqueado.');
    },
  }),
  cmd({
    name: 'canal hide',
    description: 'Oculta el canal actual para todos',
    category: 'Moderación',
    perms: ['ManageChannels'],
    botPerms: ['ManageChannels'],
    run: async (ctx) => {
      await ctx.channel.permissionOverwrites.edit(ctx.guild.roles.everyone, { ViewChannel: false });
      return ctx.ok('🙈 Canal oculto.');
    },
  }),
  cmd({
    name: 'canal unhide',
    description: 'Vuelve a mostrar el canal actual',
    category: 'Moderación',
    perms: ['ManageChannels'],
    botPerms: ['ManageChannels'],
    run: async (ctx) => {
      await ctx.channel.permissionOverwrites.edit(ctx.guild.roles.everyone, { ViewChannel: true });
      return ctx.ok('👀 Canal visible nuevamente.');
    },
  }),
  cmd({
    name: 'canal nuke',
    description: 'Clona y recrea el canal eliminando todo el historial',
    category: 'Moderación',
    perms: ['ManageChannels'],
    botPerms: ['ManageChannels'],
    options: [str('confirmacion', 'Escribí NUKE para confirmar', true)],
    run: async (ctx) => {
      if (ctx.str('confirmacion').toUpperCase() !== 'NUKE') return ctx.err('Escribí `NUKE` para confirmar.');
      const clone = await ctx.channel.clone({ reason: `Nuke por ${ctx.user.tag}` });
      await ctx.edit('💥 Canal recreado, redirigiendo...').catch(() => null);
      await ctx.channel.delete(`Nuke por ${ctx.user.tag}`);
      await clone.send({ embeds: [new EmbedBuilder().setColor(config.brand.colorError).setDescription(`💥 Canal recreado por **${ctx.user.tag}**.`)] }).catch(() => null);
      return null;
    },
  }),
  cmd({
    name: 'canal nick',
    description: 'Cambia el apodo de un miembro',
    category: 'Moderación',
    perms: ['ManageNicknames'],
    botPerms: ['ManageNicknames'],
    options: [user('usuario', 'Miembro', true), str('apodo', 'Nuevo apodo (vacío = quitar)', false, { max_length: 32 })],
    run: async (ctx) => {
      const { member } = await target(ctx);
      if (!member) return ctx.err('Miembro no encontrado.');
      const changed = await member.setNickname(ctx.str('apodo') || null, `Por ${ctx.user.tag}`).then(() => true).catch(async (err) => { await ctx.err(`No se pudo cambiar el apodo: ${err.message}`); return false; });
      if (!changed) return null;
      return ctx.ok(`✅ Apodo de ${member} actualizado.`);
    },
  }),
  cmd({
    name: 'canal addrole',
    description: 'Añade un rol a un miembro',
    category: 'Moderación',
    perms: ['ManageRoles'],
    botPerms: ['ManageRoles'],
    options: [user('usuario', 'Miembro', true), role('rol', 'Rol', true)],
    run: async (ctx) => {
      const { member } = await target(ctx);
      if (!member) return ctx.err('Miembro no encontrado.');
      const r = ctx.roleOpt('rol');
      if (r.position >= ctx.guild.members.me.roles.highest.position) return ctx.err('Ese rol está por encima de mi rol más alto.');
      const added = await member.roles.add(r, `Por ${ctx.user.tag}`).then(() => true).catch(async (err) => { await ctx.err(`No se pudo añadir el rol: ${err.message}`); return false; });
      if (!added) return null;
      return ctx.ok(`✅ ${r} añadido a ${member}.`);
    },
  }),
  cmd({
    name: 'canal remrole',
    description: 'Quita un rol a un miembro',
    category: 'Moderación',
    perms: ['ManageRoles'],
    botPerms: ['ManageRoles'],
    options: [user('usuario', 'Miembro', true), role('rol', 'Rol', true)],
    run: async (ctx) => {
      const { member } = await target(ctx);
      if (!member) return ctx.err('Miembro no encontrado.');
      const removed = await member.roles.remove(ctx.roleOpt('rol'), `Por ${ctx.user.tag}`).then(() => true).catch(async (err) => { await ctx.err(`No se pudo quitar el rol: ${err.message}`); return false; });
      if (!removed) return null;
      return ctx.ok(`✅ Rol removido de ${member}.`);
    },
  }),
  cmd({
    name: 'mod massban',
    description: 'Banea a varios usuarios por ID a la vez',
    category: 'Moderación',
    perms: ['BanMembers'],
    botPerms: ['BanMembers'],
    options: [str('ids', 'IDs separados por coma o espacios', true), reasonOpt],
    run: async (ctx) => {
      const ids = ctx.str('ids').split(/[\s,]+/).map((s) => s.replace(/[^0-9]/g, '')).filter((s) => s.length >= 17);
      if (!ids.length) return ctx.err('No se detectaron IDs válidos.');
      if (ids.length > 50) return ctx.err('Máximo 50 usuarios por operación.');
      const reason = ctx.str('razon') || 'Ban masivo';
      const results = { ok: 0, fail: 0 };
      for (const id of ids) {
        const done = await ctx.guild.bans.create(id, { reason: `${ctx.user.tag}: ${reason}` }).then(() => true).catch(() => false);
        if (done) results.ok += 1; else results.fail += 1;
        await mod.createCase({ guild: ctx.guild, type: 'ban', userId: id, moderatorId: ctx.userId, reason }).catch(() => null);
      }
      return ctx.ok(`🔨 Ban masivo: **${results.ok}** exitosos, **${results.fail}** fallidos.`);
    },
  }),
  cmd({
    name: 'mod banlist',
    description: 'Lista los usuarios baneados del servidor',
    category: 'Moderación',
    perms: ['BanMembers'],
    botPerms: ['BanMembers'],
    options: [int('pagina', 'Página', false, { min_value: 1 })],
    run: async (ctx) => {
      const bans = await ctx.guild.bans.fetch({ limit: 100 });
      if (!bans.size) return ctx.ok('✅ No hay usuarios baneados.');
      const list = [...bans.values()];
      const page = Math.max(1, ctx.int('pagina') || 1);
      const perPage = 15;
      const slice = list.slice((page - 1) * perPage, page * perPage);
      return ctx.ok('', {
        title: `🔨 Baneados (${bans.size})`,
        description: slice.map((b) => `• **${b.user.tag}** (${b.user.id})\n> ${truncate(b.reason || 'Sin razón', 120)}`).join('\n'),
        footer: `Página ${page}/${Math.ceil(list.length / perPage)}`,
      });
    },
  }),
  cmd({
    name: 'mod caso',
    description: 'Muestra un caso de moderación por número',
    category: 'Moderación',
    perms: ['ModerateMembers'],
    options: [int('numero', 'Número de caso', true, { min_value: 1 })],
    run: async (ctx) => {
      const record = await db.Case.findOne({ guildId: ctx.guildId, caseId: ctx.int('numero') });
      if (!record) return ctx.err('Caso no encontrado.');
      return ctx.ok('', {
        title: `📁 Caso #${record.caseId} · ${record.type}`,
        description: `**Usuario:** <@${record.userId}> (\`${record.userId}\`)\n**Moderador:** <@${record.moderatorId}>\n**Razón:** ${record.reason}`,
        fields: [
          { name: 'Estado', value: record.active ? '🟢 Activo' : '⚪ Inactivo', inline: true },
          { name: 'Duración', value: record.duration ? duration(record.duration) : 'Permanente', inline: true },
          { name: 'Expira', value: record.expiresAt ? timestamp(record.expiresAt) : 'Nunca', inline: true },
          { name: 'Creado', value: fullDate(record.createdAt), inline: true },
          { name: 'Evidencia', value: record.evidence || 'Sin evidencia', inline: false },
        ],
      });
    },
  }),
  cmd({
    name: 'mod casos',
    description: 'Lista el historial de sanciones de un usuario',
    category: 'Moderación',
    perms: ['ModerateMembers'],
    options: [user('usuario', 'Usuario', true), int('limite', 'Cantidad', false, { min_value: 1, max_value: 30 })],
    run: async (ctx) => {
      const targetUser = ctx.userOpt('usuario');
      const records = await db.Case.find({ guildId: ctx.guildId, userId: targetUser.id }).sort({ caseId: -1 }).limit(ctx.int('limite') || 15).lean();
      if (!records.length) return ctx.ok(`✅ ${targetUser} no tiene sanciones.`);
      return ctx.ok('', {
        title: `📁 Historial de ${targetUser.tag}`,
        description: records.map((r) => `**#${r.caseId}** · ${r.type} · ${fullDate(r.createdAt)} ${r.active ? '🟢' : '⚪'}\n> ${truncate(r.reason, 160)}`).join('\n'),
      });
    },
  }),
  cmd({
    name: 'mod nota',
    description: 'Añade una nota interna sobre un usuario',
    category: 'Moderación',
    perms: ['ModerateMembers'],
    options: [user('usuario', 'Usuario', true), str('texto', 'Nota', true, { max_length: 500 })],
    run: async (ctx) => {
      const targetUser = ctx.userOpt('usuario');
      const doc = await db.User.get(ctx.guildId, targetUser.id);
      doc.notes.push({ text: ctx.str('texto'), authorId: ctx.userId });
      await doc.save();
      return ctx.ok(`📝 Nota añadida a **${targetUser.tag}** (${doc.notes.length} en total).`);
    },
  }),
  cmd({
    name: 'mod notas',
    description: 'Muestra las notas internas de un usuario',
    category: 'Moderación',
    perms: ['ModerateMembers'],
    options: [user('usuario', 'Usuario', true)],
    run: async (ctx) => {
      const targetUser = ctx.userOpt('usuario');
      const doc = await db.User.get(ctx.guildId, targetUser.id);
      if (!doc.notes.length) return ctx.ok('Sin notas para ese usuario.');
      return ctx.ok('', {
        title: `📝 Notas de ${targetUser.tag}`,
        description: doc.notes.slice(-15).map((n) => `• ${fullDate(n.at)} · <@${n.authorId}>\n> ${truncate(n.text, 200)}`).join('\n'),
      });
    },
  }),
  cmd({
    name: 'mod stats',
    description: 'Estadísticas de moderación de un staff',
    category: 'Moderación',
    options: [user('usuario', 'Staff (por defecto vos)', false)],
    run: async (ctx) => {
      const targetUser = ctx.userOpt('usuario') || ctx.user;
      const [total, byType] = await Promise.all([
        db.Case.countDocuments({ guildId: ctx.guildId, moderatorId: targetUser.id }),
        db.Case.aggregate([{ $match: { guildId: ctx.guildId, moderatorId: targetUser.id } }, { $group: { _id: '$type', count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
      ]);
      if (!total) return ctx.ok(`${targetUser.tag} no tiene acciones registradas.`);
      return ctx.ok('', {
        title: `📊 Moderación de ${targetUser.tag}`,
        description: byType.map((t) => `• **${t._id}:** ${t.count}`).join('\n'),
        footer: `${total} acciones totales`,
      });
    },
  }),
  cmd({
    name: 'mod softban',
    description: 'Banea y desbanea para borrar mensajes del usuario',
    category: 'Moderación',
    perms: ['BanMembers'],
    botPerms: ['BanMembers'],
    options: [user('usuario', 'Usuario', true), int('dias', 'Días de mensajes a borrar', false, { min_value: 1, max_value: 7 }), reasonOpt],
    run: async (ctx) => {
      const { user: targetUser, member } = await target(ctx);
      if (!targetUser) return ctx.err('Usuario inválido.');
      const reason = ctx.str('razon') || 'Softban';
      const problem = member ? mod.canAct(ctx.member, member, ctx.guild, 'ban') : null;
      if (problem) return ctx.err(problem);
      await ctx.guild.bans.create(targetUser.id, { reason: `${ctx.user.tag}: ${reason}`, deleteMessageSeconds: (ctx.int('dias') || 1) * 86400 });
      await ctx.guild.bans.remove(targetUser.id, 'Softban: limpieza de mensajes').catch(() => null);
      const record = await mod.createCase({ guild: ctx.guild, type: 'softban', userId: targetUser.id, moderatorId: ctx.userId, reason });
      return ctx.ok(`🧹 **${targetUser.tag}** recibió un softban (mensajes eliminados). Caso **#${record.caseId}**.`);
    },
  }),
  cmd({
    name: 'mod timeout-quitar',
    description: 'Quita el timeout de un miembro',
    category: 'Moderación',
    perms: ['ModerateMembers'],
    botPerms: ['ModerateMembers'],
    options: [user('usuario', 'Usuario', true), reasonOpt],
    run: async (ctx) => {
      const { member } = await target(ctx);
      if (!member) return ctx.err('Miembro no encontrado.');
      await member.timeout(null, `${ctx.user.tag}: ${ctx.str('razon') || 'Timeout removido'}`).catch((err) => ctx.err(err.message));
      return ctx.ok(`🔊 Timeout removido a ${member}.`);
    },
  }),
  cmd({
    name: 'mod sanciones',
    description: 'Muestra las últimas sanciones del servidor',
    category: 'Moderación',
    perms: ['ModerateMembers'],
    options: [int('limite', 'Cantidad', false, { min_value: 1, max_value: 30 })],
    run: async (ctx) => {
      const records = await db.Case.find({ guildId: ctx.guildId, type: { $nin: ['note'] } }).sort({ caseId: -1 }).limit(ctx.int('limite') || 10).lean();
      if (!records.length) return ctx.ok('No hay sanciones registradas.');
      return ctx.ok('', {
        title: '📁 Últimas sanciones',
        description: records.map((r) => `**#${r.caseId}** · ${r.type} · <@${r.userId}> · <@${r.moderatorId}> · ${timestamp(r.createdAt, 'R')}\n> ${truncate(r.reason, 120)}`).join('\n').slice(0, 4000),
      });
    },
  }),
];
