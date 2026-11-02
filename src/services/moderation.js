'use strict';
const { EmbedBuilder } = require('discord.js');
const config = require('../config');
const db = require('../database/models');
const { modLog } = require('./logger');
const { applyTemplate } = require('./welcome');

async function createCase({ guild, type, userId, moderatorId, reason, duration = null, evidence = null }) {
  let caseId;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    caseId = await db.Case.nextId(guild.id);
    try {
      return await db.Case.create({
        guildId: guild.id, caseId, type, userId, moderatorId,
        reason: reason || 'Sin razón especificada', duration,
        expiresAt: duration ? new Date(Date.now() + duration) : null, evidence,
      });
    } catch (err) {
      if (!String(err.message).includes('duplicate')) throw err;
    }
  }
  throw new Error('No se pudo generar el ID del caso');
}

async function dmSanction(guild, userId, { action, reason, duration }) {
  try {
    const user = await guild.client.users.fetch(userId);
    const settings = await db.Guild.get(guild.id).catch(() => null);
    if (settings && settings.mod?.dmOnSanction === false) return;
    await user.send({ embeds: [new EmbedBuilder().setColor(config.brand.colorError)
      .setTitle(`Sanción en ${guild.name}`)
      .setDescription(`**Acción:** ${action}\n**Razón:** ${reason}${duration ? `\n**Duración:** ${duration}` : ''}\n\nSi creés que es un error, podés apelar en el servidor.`)] }).catch(() => null);
  } catch { /* ignore */ }
}

async function warn({ guild, member, moderator, reason }) {
  const settings = await db.Guild.get(guild.id);
  const user = await db.User.get(guild.id, member.id);
  user.warnings += 1;
  await user.save();
  const record = await createCase({ guild, type: 'warn', userId: member.id, moderatorId: moderator.id, reason });
  await dmSanction(guild, member.id, { action: 'Advertencia', reason });
  const max = settings.mod?.maxWarnings || 3;
  let escalated = null;
  if (user.warnings >= max) {
    const action = settings.mod?.warnAction || 'timeout';
    const duration = 30 * 60 * 1000;
    if (action === 'timeout' && member.moderatable) { await member.timeout(duration, `Límite de advertencias alcanzado (${user.warnings}/${max})`).catch(() => null); escalated = 'timeout 30m'; }
    if (action === 'kick' && member.kickable) { await member.kick(`Límite de advertencias (${user.warnings}/${max})`).catch(() => null); escalated = 'kick'; }
    if (action === 'ban' && member.bannable) { await member.ban({ reason: `Límite de advertencias (${user.warnings}/${max})` }).catch(() => null); escalated = 'ban'; }
    user.warnings = 0;
    await user.save();
  }
  await modLog(guild, { action: 'Advertencia', target: member, moderator, reason, caseId: record.caseId, extra: `Total: ${user.warnings}/${max}${escalated ? `\nEscalado a: ${escalated}` : ''}` });
  return { record, total: user.warnings, max, escalated };
}

async function getWarnings(guildId, userId) {
  return db.Case.find({ guildId, userId, type: 'warn', active: true }).sort({ createdAt: -1 });
}

async function clearWarnings(guildId, userId, moderatorId) {
  const res = await db.Case.updateMany({ guildId, userId, type: 'warn', active: true }, { active: false, removedBy: moderatorId, removedAt: new Date() });
  await db.User.updateOne({ guildId, userId }, { warnings: 0 });
  return res.modifiedCount;
}

async function purge(guild, channel, amount, filter = null, moderator) {
  let deleted;
  if (filter) deleted = await channel.bulkDelete(amount, true);
  else deleted = await channel.bulkDelete(amount, true);
  await modLog(guild, { action: 'Purga de mensajes', target: { tag: channel.name, id: channel.id }, moderator, reason: `${deleted.size} mensajes eliminados${filter ? ` · filtro: ${filter}` : ''}` });
  return deleted.size;
}

async function lockChannel(channel, moderator, reason = 'Canal bloqueado') {
  await channel.permissionOverwrites.edit(channel.guild.roles.everyone, { SendMessages: false });
  await modLog(channel.guild, { action: 'Canal bloqueado', target: { tag: channel.name, id: channel.id }, moderator, reason });
}

async function unlockChannel(channel, moderator, reason = 'Canal desbloqueado') {
  await channel.permissionOverwrites.edit(channel.guild.roles.everyone, { SendMessages: null });
  await modLog(channel.guild, { action: 'Canal desbloqueado', target: { tag: channel.name, id: channel.id }, moderator, reason });
}

function canAct(moderator, target, guild, action = 'moderate') {
  if (!target) return 'No se encontró al usuario.';
  if (target.id === moderator.id) return 'No podés aplicarte una sanción a vos mismo.';
  if (target.id === guild.client.user.id) return 'No puedo sancionarme a mí mismo.';
  if (target.id === guild.ownerId) return 'No se puede sancionar al dueño del servidor.';
  if (moderator.id !== guild.ownerId && moderator.roles.highest.position <= target.roles.highest.position) return 'Tu rol jerárquico no es mayor al del usuario.';
  if (action === 'ban' && !target.bannable) return 'No tengo permisos para banear a este usuario.';
  if (action === 'kick' && !target.kickable) return 'No puedo expulsar a este usuario.';
  if (action === 'timeout' && !target.moderatable) return 'No puedo moderar (timeout) a este usuario.';
  return null;
}

module.exports = { createCase, dmSanction, warn, getWarnings, clearWarnings, purge, lockChannel, unlockChannel, canAct, applyTemplate };
