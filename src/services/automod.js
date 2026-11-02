'use strict';
const { EmbedBuilder, PermissionsBitField } = require('discord.js');
const config = require('../config');
const db = require('../database/models');
const { sendLog } = require('./logger');

const spamCache = new Map();
const floodCache = new Map();

const INVITE_REGEX = /(discord\.(gg|com\/invite|me\/invite)\/[\w-]+)/i;
const LINK_REGEX = /((https?:\/\/|www\.)[^\s]+)/gi;
const PHISHING_PATTERNS = [
  /steamcommunity\.(com|ru)\/(gift|trade|giveaway)/i,
  /free[\s._-]?nitro/i,
  /discord[\s._-]?(gift|nitro)[\s._-]?(free|scam)/i,
  /nitro[\s._-]?gift/i,
  /airdrop[-_.]?steam/i,
  /csgo[-_.]?(skin|knife).*(free|gift)/i,
  /click\s*(aquí|here)\s*para\s*(ganar|obtener)/i,
];
const ZALGO = /[\u0300-\u036f\u1ab0-\u1aff\u1dc0-\u1dff\u20d0-\u20ff\ufe20-\ufe2f]/g;
const URL_SHORTENERS = /(bit\.ly|tinyurl\.com|goo\.gl|t\.co|is\.gd|shorturl\.at|cutt\.ly)/i;

const normalize = (text) => String(text || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

function isExempt(message, settings) {
  const cfg = settings.automod;
  if (message.member?.permissions?.has(PermissionsBitField.Flags.ManageMessages)) return true;
  if (cfg.exemptUsers?.includes(message.author.id)) return true;
  if (cfg.exemptChannels?.includes(message.channelId)) return true;
  if (message.member?.roles?.cache?.some((r) => cfg.exemptRoles?.includes(r.id))) return true;
  return false;
}

function inspect(message, settings) {
  const cfg = settings.automod;
  const content = message.content || '';
  const violations = [];
  const lower = normalize(content);

  if (cfg.invites?.enabled && INVITE_REGEX.test(content)) violations.push('invites');
  if (cfg.links?.enabled) {
    const links = content.match(LINK_REGEX) || [];
    const allow = (cfg.links.allow || []).map((l) => l.toLowerCase());
    const bad = links.filter((l) => !allow.some((a) => l.toLowerCase().includes(a)));
    if (bad.length) violations.push('links');
  }
  if (cfg.words?.enabled && (cfg.words.list || []).length) {
    const words = cfg.words.list.map(normalize).filter(Boolean);
    if (words.some((w) => lower.includes(w))) violations.push('words');
  }
  if (cfg.caps?.enabled && content.length >= (cfg.caps.minLength || 12)) {
    const letters = content.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ]/g, '');
    if (letters.length >= 8) {
      const upper = (letters.match(/[A-ZÁÉÍÓÚÑ]/g) || []).length;
      if ((upper / letters.length) * 100 >= (cfg.caps.percent || 70)) violations.push('caps');
    }
  }
  if (cfg.mentions?.enabled) {
    const count = message.mentions.users.size + message.mentions.roles.size;
    if (count > (cfg.mentions.max || 6)) violations.push('mentions');
  }
  if (cfg.emojis?.enabled) {
    const custom = (content.match(/<a?:\w+:\d+>/g) || []).length;
    const unicode = (content.match(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu) || []).length;
    if (custom + unicode > (cfg.emojis.max || 12)) violations.push('emojis');
  }
  if ((content.match(ZALGO) || []).length > 15) violations.push('zalgo');
  if (cfg.phishing?.enabled && (PHISHING_PATTERNS.some((r) => r.test(content)) || (URL_SHORTENERS.test(content) && /nitro|free|gift/i.test(content)))) violations.push('phishing');

  if (cfg.flood?.enabled) {
    const key = `${message.guildId}:${message.author.id}`;
    const prev = floodCache.get(key);
    if (prev && prev.content === lower && Date.now() - prev.at < 15000) {
      prev.count += 1;
      prev.at = Date.now();
      if (prev.count >= (cfg.flood.max || 5)) violations.push('flood');
    } else {
      floodCache.set(key, { content: lower, count: 1, at: Date.now() });
      if (floodCache.size > 5000) floodCache.clear();
    }
  }
  if (cfg.spam?.enabled) {
    const key = `${message.guildId}:${message.author.id}`;
    const now = Date.now();
    const windowMs = cfg.spam.window || 7000;
    const arr = (spamCache.get(key) || []).filter((t) => now - t < windowMs);
    arr.push(now);
    spamCache.set(key, arr);
    if (spamCache.size > 5000) spamCache.clear();
    if (arr.length >= (cfg.spam.threshold || 6)) violations.push('spam');
  }
  if (!content && message.attachments.size > 3) violations.push('attachments');
  return [...new Set(violations)];
}

async function escalate(message, settings, types) {
  const cfg = settings.automod;
  const member = message.member;
  let action = cfg.action || 'delete';
  const strikes = await db.AutomodLog.countDocuments({
    guildId: message.guildId,
    userId: message.author.id,
    createdAt: { $gte: new Date(Date.now() - 86400000) },
  }).catch(() => 0);
  const s = cfg.strikes || {};
  if (strikes + 1 >= (s.ban || 10)) action = 'ban';
  else if (strikes + 1 >= (s.kick || 7)) action = 'kick';
  else if (strikes + 1 >= (s.timeout || 5)) action = 'timeout';
  else if (strikes + 1 >= (s.warn || 3)) action = 'warn';

  if (action === 'delete' || action === 'warn' || action === 'timeout' || action === 'kick' || action === 'ban') {
    await message.delete().catch(() => null);
  }
  if (action === 'timeout' && member?.moderatable) await member.timeout(10 * 60 * 1000, `AutoMod: ${types.join(', ')}`).catch(() => null);
  if (action === 'kick' && member?.kickable) await member.kick(`AutoMod: ${types.join(', ')}`).catch(() => null);
  if (action === 'ban' && member?.bannable) await member.ban({ reason: `AutoMod: ${types.join(', ')}` }).catch(() => null);
  return { action, strikes: strikes + 1 };
}

async function run(message, settings) {
  if (!settings?.automod?.enabled || !message.guild) return null;
  if (!message.content && !message.attachments.size) return null;
  if (isExempt(message, settings)) return null;
  const violations = inspect(message, settings);
  if (!violations.length) return null;

  const { action, strikes } = await escalate(message, settings, violations);
  const log = await db.AutomodLog.create({
    guildId: message.guildId,
    userId: message.author.id,
    channelId: message.channelId,
    type: violations.join(','),
    content: String(message.content || '').slice(0, 1200),
    action,
    messageId: message.id,
  }).catch(() => null);

  const embed = new EmbedBuilder()
    .setColor(config.brand.colorWarn)
    .setTitle('🛡️ AutoMod')
    .addFields(
      { name: 'Usuario', value: `${message.author.tag} (${message.author.id})`, inline: true },
      { name: 'Canal', value: `<#${message.channelId}>`, inline: true },
      { name: 'Infracción', value: violations.join(', '), inline: true },
      { name: 'Acción', value: action, inline: true },
      { name: 'Strikes (24h)', value: String(strikes), inline: true },
    );
  if (message.content) embed.addFields({ name: 'Contenido', value: `\`\`\`${message.content.slice(0, 900)}\`\`\`` });
  await sendLog(message.guild, 'automod', embed);
  if (settings.automod.logChannelId) {
    const ch = message.guild.channels.cache.get(settings.automod.logChannelId);
    if (ch?.isTextBased()) await ch.send({ embeds: [embed] }).catch(() => null);
  }
  if (action !== 'delete') {
    await message.author.send({ embeds: [new EmbedBuilder().setColor(config.brand.colorWarn).setDescription(`Tu mensaje en **${message.guild.name}** fue eliminado por AutoMod.\nMotivo: \`${violations.join(', ')}\`\nAcción: \`${action}\``)] }).catch(() => null);
  }
  return { violations, action, strikes, log };
}

module.exports = { run, inspect, isExempt, normalize, INVITE_REGEX, LINK_REGEX, PHISHING_PATTERNS };
