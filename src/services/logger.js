'use strict';
const { EmbedBuilder } = require('discord.js');
const config = require('../config');
const db = require('../database/models');

const EVENT_LABELS = {
  messageDelete: 'Mensaje eliminado', messageEdit: 'Mensaje editado', memberJoin: 'Miembro entró',
  memberLeave: 'Miembro salió', memberUpdate: 'Miembro actualizado', ban: 'Ban', unban: 'Unban',
  channelCreate: 'Canal creado', channelDelete: 'Canal eliminado', channelUpdate: 'Canal actualizado',
  roleCreate: 'Rol creado', roleDelete: 'Rol eliminado', roleUpdate: 'Rol actualizado',
  voice: 'Voz', mod: 'Moderación', ticket: 'Ticket', automod: 'AutoMod', invite: 'Invitación',
  boost: 'Boost', application: 'Postulación', report: 'Reporte', economy: 'Economía', level: 'Nivel',
};

async function logChannel(guild, event) {
  if (!guild) return null;
  const settings = await db.Guild.get(guild.id).catch(() => null);
  if (!settings) return null;
  const id = settings.logs?.get?.(event) || settings.logs?.get?.('all') || (event === 'mod' ? settings.mod?.logChannelId : null);
  if (!id) return null;
  return guild.channels.cache.get(id) || guild.channels.fetch(id).catch(() => null);
}

async function sendLog(guild, event, embed) {
  try {
    const channel = await logChannel(guild, event);
    if (!channel?.isTextBased?.()) return null;
    const payload = embed instanceof EmbedBuilder ? embed : new EmbedBuilder(embed);
    payload.setFooter({ text: `${config.brand.footer} • ${EVENT_LABELS[event] || event}` }).setTimestamp();
    return await channel.send({ embeds: [payload], allowedMentions: { parse: [] } });
  } catch {
    return null;
  }
}

async function modLog(guild, { action, target, moderator, reason, caseId, duration, color = config.brand.color, extra }) {
  const fields = [
    { name: 'Usuario', value: target ? `${target.tag || target.username || target} (${target.id || target})` : 'Desconocido', inline: true },
    { name: 'Moderador', value: moderator ? `${moderator.tag || moderator.username || moderator} (${moderator.id || moderator})` : 'Sistema', inline: true },
  ];
  if (caseId) fields.push({ name: 'Caso', value: `#${caseId}`, inline: true });
  if (duration) fields.push({ name: 'Duración', value: duration, inline: true });
  fields.push({ name: 'Razón', value: reason || 'Sin razón especificada' });
  if (extra) fields.push({ name: 'Detalles', value: extra });
  const embed = new EmbedBuilder().setColor(color).setTitle(`🔨 ${action}`).addFields(fields);
  return sendLog(guild, 'mod', embed);
}

module.exports = { sendLog, modLog, logChannel, EVENT_LABELS };
