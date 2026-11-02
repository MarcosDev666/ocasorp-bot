'use strict';
const {
  ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, UserSelectMenuBuilder,
  RoleSelectMenuBuilder, ChannelSelectMenuBuilder,
} = require('discord.js');

const row = (...components) => new ActionRowBuilder().addComponents(...components);
const button = (customId, label, style = ButtonStyle.Secondary, extra = {}) => {
  const b = new ButtonBuilder().setCustomId(customId).setLabel(label).setStyle(style);
  if (extra.emoji) b.setEmoji(extra.emoji);
  if (extra.disabled) b.setDisabled(true);
  return b;
};
const linkButton = (label, url, emoji) => {
  const b = new ButtonBuilder().setLabel(label).setStyle(ButtonStyle.Link).setURL(url);
  if (emoji) b.setEmoji(emoji);
  return b;
};
const select = (customId, placeholder, options, extra = {}) => {
  const menu = new StringSelectMenuBuilder().setCustomId(customId).setPlaceholder(placeholder).addOptions(options);
  if (extra.min) menu.setMinValues(extra.min);
  if (extra.max) menu.setMaxValues(extra.max);
  if (extra.disabled) menu.setDisabled(true);
  return menu;
};
const userSelect = (customId, placeholder) => new UserSelectMenuBuilder().setCustomId(customId).setPlaceholder(placeholder);
const roleSelect = (customId, placeholder) => new RoleSelectMenuBuilder().setCustomId(customId).setPlaceholder(placeholder);
const channelSelect = (customId, placeholder) => new ChannelSelectMenuBuilder().setCustomId(customId).setPlaceholder(placeholder);

module.exports = { row, button, linkButton, select, userSelect, roleSelect, channelSelect, ButtonStyle };
