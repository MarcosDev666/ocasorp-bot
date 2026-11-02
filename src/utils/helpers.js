'use strict';
const {
  PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, MessageFlags,
} = require('discord.js');
const { info } = require('./embed');

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const escapeRegex = (str) => String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const mention = (id) => (id ? `<@${id}>` : '`desconocido`');
const channelMention = (id) => (id ? `<#${id}>` : '`sin canal`');
const roleMention = (id) => (id ? `<@&${id}>` : '`sin rol`');
const code = (s) => `\`${s}\``;
const randomCode = (len = 6) => Array.from({ length: len }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 32)]).join('');
const canModerate = (guild, moderator, target) => {
  if (!guild || !target) return false;
  if (moderator.id === guild.ownerId) return true;
  return moderator.roles.highest.position > target.roles.highest.position;
};

async function fetchMember(guild, id) {
  if (!guild || !id) return null;
  try { return await guild.members.fetch(id); } catch { return null; }
}

async function resolveMember(guild, input) {
  if (!guild || !input) return null;
  const id = String(input).replace(/[<@!>]/g, '');
  const byId = await fetchMember(guild, id);
  if (byId) return byId;
  const members = await guild.members.fetch({ query: String(input), limit: 1 }).catch(() => null);
  return members?.first() || null;
}

async function safeDM(user, payload) {
  try { return await user.send(payload); } catch { return null; }
}

async function findOrCreateChannel(guild, name, options = {}) {
  const existing = guild.channels.cache.find((c) => c.type === ChannelType.GuildText && c.name === name);
  if (existing) return existing;
  return guild.channels.create({ name, type: ChannelType.GuildText, ...options });
}

async function paginate(interaction, pages, { time = 120000, ephemeral = false } = {}) {
  if (!pages.length) return null;
  if (pages.length === 1) return interaction.reply({ embeds: [pages[0]], flags: ephemeral ? MessageFlags.Ephemeral : undefined });
  let page = 0;
  const id = `page:${interaction.id}`;
  const row = () => new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`${id}:prev`).setEmoji('◀️').setStyle(ButtonStyle.Secondary).setDisabled(page === 0),
    new ButtonBuilder().setCustomId(`${id}:count`).setLabel(`${page + 1}/${pages.length}`).setStyle(ButtonStyle.Secondary).setDisabled(true),
    new ButtonBuilder().setCustomId(`${id}:next`).setEmoji('▶️').setStyle(ButtonStyle.Secondary).setDisabled(page === pages.length - 1),
  );
  const wasDeferred = interaction.deferred || interaction.replied;
  const msg = wasDeferred
    ? await interaction.editReply({ embeds: [pages[0]], components: [row()] })
    : await interaction.reply({ embeds: [pages[0]], components: [row()], withResponse: true, flags: ephemeral ? MessageFlags.Ephemeral : undefined });
  const target = wasDeferred ? await interaction.fetchReply() : (msg.resource?.message || msg);
  const collector = target.createMessageComponentCollector({
    time,
    filter: (i) => i.user.id === interaction.user.id && i.customId.startsWith(id),
  });
  collector.on('collect', async (i) => {
    if (i.customId.endsWith('prev')) page = Math.max(0, page - 1);
    if (i.customId.endsWith('next')) page = Math.min(pages.length - 1, page + 1);
    await i.update({ embeds: [pages[page]], components: [row()] });
  });
  collector.on('end', async () => { try { await target.edit({ components: [] }); } catch { /* ignore */ } });
  return target;
}

function chunkByWords(text, max = 1000) {
  const words = String(text).split(' ');
  const out = [];
  let current = '';
  for (const word of words) {
    if ((current + word).length > max) { out.push(current.trim()); current = ''; }
    current += `${word} `;
  }
  if (current.trim()) out.push(current.trim());
  return out;
}

function listLines(items, empty = 'Sin datos') {
  return items.length ? items.join('\n') : empty;
}

function progress(current, max, size = 10) {
  const ratio = Math.max(0, Math.min(1, Number(current) / Math.max(1, Number(max))));
  const filled = Math.round(ratio * size);
  return `${'█'.repeat(filled)}${'░'.repeat(size - filled)} ${Math.round(ratio * 100)}%`;
}

function statusEmbed(title, description) {
  return { embeds: [info(description, { title })] };
}

const isSnowflake = (id) => /^\d{17,20}$/.test(String(id));

module.exports = {
  wait, escapeRegex, mention, channelMention, roleMention, code, randomCode, canModerate, fetchMember,
  resolveMember, safeDM, findOrCreateChannel, paginate, chunkByWords, listLines, progress, statusEmbed,
  isSnowflake, PermissionFlagsBits,
};
