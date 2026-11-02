'use strict';
const { Events, EmbedBuilder } = require('discord.js');
const config = require('../config');
const { sendWelcome } = require('../services/welcome');
const settingsService = require('../services/settings');
const { sendLog } = require('../services/logger');
const db = require('../database/models');

const joinCache = new Map();

async function checkRaid(guild, settings) {
  if (!settings?.automod?.enabled || !settings.automod.raid?.enabled) return null;
  const now = Date.now();
  const key = guild.id;
  const windowMs = settings.automod.raid.window || 30000;
  const arr = (joinCache.get(key) || []).filter((t) => now - t < windowMs);
  arr.push(now);
  joinCache.set(key, arr);
  if (arr.length < (settings.automod.raid.joins || 10)) return null;
  joinCache.set(key, []);
  const embed = new EmbedBuilder().setColor(config.brand.colorError)
    .setTitle('🚨 Posible raid detectado')
    .setDescription(`Se unieron **${arr.length}** miembros en ${Math.round(windowMs / 1000)}s.\nConsiderá activar el modo pánico con \`/automod modo-panico\`.`)
    .setTimestamp();
  await sendLog(guild, 'automod', embed);
  if (settings.automod.logChannelId) {
    const ch = guild.channels.cache.get(settings.automod.logChannelId);
    if (ch?.isTextBased()) await ch.send({ embeds: [embed] }).catch(() => null);
  }
  return arr.length;
}

module.exports = {
  name: Events.GuildMemberAdd,
  async run(client, member) {
    const settings = await settingsService.get(member.guild.id).catch(() => null);
    await checkRaid(member.guild, settings).catch(() => null);
    await sendWelcome(member).catch(() => null);
    await db.User.updateOne(
      { guildId: member.guild.id, userId: member.id },
      { $set: { joinedAt: new Date() }, $setOnInsert: { guildId: member.guild.id, userId: member.id } },
      { upsert: true },
    ).catch(() => null);
  },
};
