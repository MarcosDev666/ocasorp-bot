'use strict';
const { Events, EmbedBuilder } = require('discord.js');
const config = require('../config');
const db = require('../database/models');
const settingsService = require('../services/settings');

const STAR = '⭐';

async function updateStarboard(reaction, user) {
  if (user.bot) return;
  if (reaction.partial) await reaction.fetch().catch(() => null);
  const message = reaction.message;
  if (!message?.guild) return;
  if (reaction.emoji.name !== STAR) return;
  const settings = await settingsService.get(message.guild.id).catch(() => null);
  if (!settings?.starboard?.enabled || !settings.starboard.channelId) return;
  if (message.channelId === settings.starboard.channelId) return;
  if (message.author?.bot) return;

  const stars = Math.max(0, (reaction.count || 1) - (reaction.me ? 1 : 0));
  const channel = message.guild.channels.cache.get(settings.starboard.channelId);
  if (!channel?.isTextBased()) return;
  const existing = await db.StarboardPost.findOne({ guildId: message.guild.id, messageId: message.id }).catch(() => null);
  const threshold = settings.starboard.threshold || 3;

  if (stars >= threshold) {
    const embed = new EmbedBuilder()
      .setColor(config.brand.color)
      .setAuthor({ name: message.author?.tag || 'Desconocido', iconURL: message.author?.displayAvatarURL?.() })
      .setDescription((message.content || '*(sin contenido)*').slice(0, 2000))
      .addFields({ name: 'Canal original', value: `<#${message.channelId}>`, inline: true }, { name: 'Estrellas', value: `${STAR} ${stars}`, inline: true })
      .setTimestamp(message.createdTimestamp)
      .setFooter({ text: 'Ocaso Roleplay • Starboard' });
    const image = [...(message.attachments?.values?.() || [])].find((a) => a.contentType?.startsWith('image/') || /\.(png|jpe?g|gif|webp)$/i.test(a.url));
    if (image) embed.setImage(image.url);
    if (message.url) embed.setURL(message.url);
    if (existing) {
      if (existing.starboardMessageId) {
        const posted = await channel.messages.fetch(existing.starboardMessageId).catch(() => null);
        if (posted) await posted.edit({ embeds: [embed] }).catch(() => null);
      }
      existing.stars = stars;
      existing.content = message.content;
      await existing.save().catch(() => null);
    } else {
      const posted = await channel.send({ content: `${STAR} **${stars}** · <#${message.channelId}>`, embeds: [embed] }).catch(() => null);
      if (!posted) return;
      await db.StarboardPost.create({
        guildId: message.guild.id, messageId: message.id, channelId: message.channelId,
        authorId: message.author?.id, starboardMessageId: posted.id, stars, content: message.content,
      }).catch(() => null);
    }
    return;
  }

  if (existing) {
    if (stars <= 0 && existing.starboardMessageId) {
      const posted = await channel.messages.fetch(existing.starboardMessageId).catch(() => null);
      if (posted) await posted.delete().catch(() => null);
      await existing.deleteOne().catch(() => null);
    } else {
      existing.stars = stars;
      await existing.save().catch(() => null);
    }
  }
}

module.exports = [
  {
    name: Events.MessageReactionAdd,
    async run(client, reaction, user) {
      await updateStarboard(reaction, user).catch(() => null);
    },
  },
  {
    name: Events.MessageReactionRemove,
    async run(client, reaction, user) {
      await updateStarboard(reaction, user).catch(() => null);
    },
  },
];
