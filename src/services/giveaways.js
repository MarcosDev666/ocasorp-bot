'use strict';
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const config = require('../config');
const db = require('../database/models');
const { duration, timestamp, shuffle } = require('../utils/format');

function requirementsText(req = {}) {
  const list = [];
  if (req.roleId) list.push(`Rol requerido: <@&${req.roleId}>`);
  if (req.level) list.push(`Nivel mínimo: **${req.level}**`);
  if (req.invites) list.push(`Invitaciones mínimas: **${req.invites}**`);
  if (req.booster) list.push('Solo boosters del servidor');
  return list.length ? list.join('\n') : 'Sin requisitos';
}

function giveawayEmbed(giveaway, { ended = giveaway.ended, winnerIds = giveaway.winnerIds } = {}) {
  const embed = new EmbedBuilder()
    .setColor(ended ? config.brand.colorError : config.brand.color)
    .setTitle(`🎉 ${giveaway.prize}`)
    .setDescription(giveaway.description || `¡Participá para ganar **${giveaway.prize}**!`)
    .addFields(
      { name: 'Termina', value: ended ? 'Finalizado' : `${timestamp(giveaway.endsAt)} (${timestamp(giveaway.endsAt, 'f')})`, inline: true },
      { name: 'Ganadores', value: String(giveaway.winnersCount), inline: true },
      { name: 'Participantes', value: String(giveaway.entries.length), inline: true },
      { name: 'Organiza', value: `<@${giveaway.hostId}>`, inline: true },
      { name: 'Requisitos', value: requirementsText(giveaway.requirements) },
    )
    .setFooter({ text: ended ? 'Ocaso Roleplay • Sorteo finalizado' : `Ocaso Roleplay • Sorteo • Duración ${duration(giveaway.endsAt - Date.now())}` })
    .setTimestamp();
  if (ended) {
    embed.addFields({ name: 'Resultado', value: winnerIds?.length ? winnerIds.map((id) => `<@${id}>`).join(', ') : 'Sin participantes válidos' });
  }
  return embed;
}

function giveawayRows(giveaway, { ended = giveaway.ended } = {}) {
  if (ended) return [];
  return [new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`giveaway:enter:${giveaway._id}`).setLabel('Participar').setEmoji('🎉').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`giveaway:info:${giveaway._id}`).setLabel('Requisitos').setEmoji('📋').setStyle(ButtonStyle.Secondary),
  )];
}

function eligible(giveaway, member, userDoc) {
  const req = giveaway.requirements || {};
  if (req.roleId && !member.roles.cache.has(req.roleId)) return 'No tenés el rol requerido.';
  if (req.level && (userDoc?.level || 0) < req.level) return `Necesitás nivel **${req.level}** o superior.`;
  if (req.booster && !member.premiumSince) return 'Este sorteo es exclusivo para boosters del servidor.';
  return null;
}

async function finishGiveaway(client, giveaway) {
  if (!giveaway) return null;
  const guild = client.guilds.cache.get(giveaway.guildId);
  if (!guild) return null;
  const channel = guild.channels.cache.get(giveaway.channelId) || await guild.channels.fetch(giveaway.channelId).catch(() => null);
  const valid = [];
  for (const userId of giveaway.entries) {
    const member = await guild.members.fetch(userId).catch(() => null);
    if (!member) continue;
    const userDoc = await db.User.get(guild.id, userId).catch(() => null);
    if (eligible(giveaway, member, userDoc)) continue;
    valid.push(userId);
  }
  const winners = shuffle(valid).slice(0, giveaway.winnersCount).filter(Boolean);
  giveaway.ended = true;
  giveaway.winnerIds = winners;
  await giveaway.save();

  if (channel?.isTextBased()) {
    const message = await channel.messages.fetch(giveaway.messageId).catch(() => null);
    if (message) await message.edit({ embeds: [giveawayEmbed(giveaway, { ended: true, winnerIds: winners })], components: [] }).catch(() => null);
    await channel.send({
      content: winners.length ? `🎉 ¡Felicitaciones ${winners.map((w) => `<@${w}>`).join(', ')}! Ganaste **${giveaway.prize}**.` : `😢 Nadie cumplió los requisitos para **${giveaway.prize}**.`,
      reply: message ? { messageReference: giveaway.messageId, failIfNotExists: false } : undefined,
      allowedMentions: { users: winners },
    }).catch(() => null);
  }
  return winners;
}

module.exports = { giveawayEmbed, giveawayRows, finishGiveaway, requirementsText, eligible };
