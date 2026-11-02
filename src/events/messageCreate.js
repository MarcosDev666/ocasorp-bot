'use strict';
const { Events, EmbedBuilder } = require('discord.js');
const config = require('../config');
const db = require('../database/models');
const settingsService = require('../services/settings');
const automod = require('../services/automod');
const { addXp } = require('../services/levels');
const autoResponses = require('../services/autoresponses');
const { sendLog } = require('../services/logger');
const logger = require('../utils/logger');

const afkCooldown = new Map();
const xpCooldown = new Map();
const XP_INTERVAL = 60000;

async function handleCounting(message, settings) {
  const cfg = settings.counting;
  if (!cfg?.enabled || cfg.channelId !== message.channelId) return true;
  const num = Number(message.content.trim());
  if (!Number.isInteger(num)) {
    await message.delete().catch(() => null);
    return false;
  }
  if (cfg.lastUserId === message.author.id) {
    await message.react('⚠️').catch(() => null);
    await message.reply({ content: '⚠️ No podés contar dos veces seguidas.', allowedMentions: { repliedUser: false } }).catch(() => null);
    return false;
  }
  if (num === cfg.current + 1) {
    cfg.current = num;
    cfg.lastUserId = message.author.id;
    cfg.best = Math.max(cfg.best || 0, num);
    await settings.save();
    await message.react('✅').catch(() => null);
    return true;
  }
  const last = cfg.current;
  cfg.current = 0;
  cfg.lastUserId = null;
  await settings.save();
  await message.react('❌').catch(() => null);
  await message.reply({ content: `💥 **${message.author.username}** rompió la racha en **${last}**. Se reinicia en **1**.`, allowedMentions: { repliedUser: false } }).catch(() => null);
  return false;
}

module.exports = {
  name: Events.MessageCreate,
  async run(client, message) {
    if (!message.guild || message.author.bot) return;
    if (!message.content && !message.attachments.size) return;
    const settings = await settingsService.get(message.guildId).catch(() => null);
    if (!settings) return;

    const blocked = await automod.run(message, settings).catch((err) => { logger.error(`AutoMod: ${err.message}`); return null; });
    if (blocked) return;

    const continued = await handleCounting(message, settings).catch(() => true);
    if (!continued) return;

    if (settings.levels?.enabled) {
      const lastXp = xpCooldown.get(message.author.id) || 0;
      if (Date.now() - lastXp >= XP_INTERVAL) {
        xpCooldown.set(message.author.id, Date.now());
        if (xpCooldown.size > 10000) xpCooldown.clear();
        const xp = settings.levels.messageXp || 15;
        await addXp(message.member, Math.floor(Math.random() * 5) + xp - 2, 'message', settings).catch(() => null);
      }
    }

    if (message.member && afkCooldown.get(message.author.id) !== true) {
      const afkUser = await db.User.findOne({ guildId: message.guildId, userId: message.author.id, 'afk.since': { $ne: null } }).catch(() => null);
      if (afkUser?.afk?.since) {
        afkUser.afk = { reason: null, since: null };
        await afkUser.save().catch(() => null);
        afkCooldown.set(message.author.id, true);
        setTimeout(() => afkCooldown.delete(message.author.id), 5000);
        await message.reply({ content: `👋 ¡Bienvenido/a de vuelta, ${message.author}! Quité tu estado de AFK.`, allowedMentions: { repliedUser: false } }).catch(() => null);
      }
      if (message.mentions.users.size && message.mentions.users.size <= 3) {
        for (const user of message.mentions.users.values()) {
          const target = await db.User.findOne({ guildId: message.guildId, userId: user.id, 'afk.since': { $ne: null } }).catch(() => null);
          if (target?.afk?.since) {
            await message.reply({ content: `💤 **${user.username}** está AFK: ${target.afk.reason || 'sin razón'} (${'<t:' + Math.floor(target.afk.since.getTime() / 1000) + ':R>'})`, allowedMentions: { repliedUser: false } }).catch(() => null);
          }
        }
      }
    }

    const { responders, commands } = await autoResponses.get(message.guildId).catch(() => ({ responders: [], commands: [] }));
    const responder = autoResponses.findResponder(responders, message.content);
    if (responder) {
      if (responder.reply) await message.reply({ content: responder.response, allowedMentions: { repliedUser: false } }).catch(() => null);
      else await message.channel.send({ content: responder.response }).catch(() => null);
      db.AutoResponder.updateOne({ _id: responder._id }, { $inc: { uses: 1 } }).catch(() => null);
    }

    const prefix = settings.customPrefix || '!';
    if (message.content.startsWith(prefix)) {
      const [name, ...args] = message.content.slice(prefix.length).trim().split(/\s+/);
      const custom = commands.find((c) => c.name.toLowerCase() === String(name).toLowerCase());
      if (custom) {
        const payload = custom.embed
          ? { embeds: [new EmbedBuilder().setColor(config.brand.color).setTitle(custom.name).setDescription(custom.response.replaceAll('{user}', `<@${message.author.id}>`).replaceAll('{args}', args.join(' ') || '—'))] }
          : { content: custom.response.replaceAll('{user}', `<@${message.author.id}>`).replaceAll('{args}', args.join(' ') || '—') };
        await message.reply({ ...payload, allowedMentions: { repliedUser: false } }).catch(() => null);
        db.CustomCommand.updateOne({ _id: custom._id }, { $inc: { uses: 1 } }).catch(() => null);
      }
    }

    if (settings.suggestions?.enabled && settings.suggestions.channelId === message.channelId) {
      void sendLog;
    }
  },
};
