'use strict';
const { EmbedBuilder } = require('discord.js');
const config = require('../config');
const { brand } = config;

function baseEmbed(data = {}) {
  const embed = new EmbedBuilder()
    .setColor(data.color ?? brand.color)
    .setFooter({ text: data.footer ?? brand.footer })
    .setTimestamp(data.timestamp === undefined ? new Date() : data.timestamp ?? null);
  if (data.title) embed.setTitle(data.title);
  if (data.description) embed.setDescription(data.description);
  if (data.author) embed.setAuthor(data.author);
  if (data.thumbnail) embed.setThumbnail(data.thumbnail);
  if (data.image) embed.setImage(data.image);
  if (data.fields?.length) embed.addFields(data.fields);
  if (data.url) embed.setURL(data.url);
  return embed;
}

const ok = (description, data = {}) => baseEmbed({ ...data, description, color: brand.colorOk });
const error = (description, data = {}) => baseEmbed({ ...data, description, color: brand.colorError });
const warn = (description, data = {}) => baseEmbed({ ...data, description, color: brand.colorWarn });
const info = (description, data = {}) => baseEmbed({ ...data, description });

function brandEmbed(title, description, data = {}) {
  return baseEmbed({ ...data, title: `${title}`, description });
}

module.exports = { baseEmbed, ok, error, warn, info, brandEmbed };
