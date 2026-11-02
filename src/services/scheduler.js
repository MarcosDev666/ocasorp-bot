'use strict';
const { ActivityType, EmbedBuilder } = require('discord.js');
const config = require('../config');
const db = require('../database/models');
const { finishGiveaway } = require('./giveaways');

const samp = require('./samp');
const logger = require('../utils/logger');

const timers = [];
const state = { lastBirthday: '', lastCleanup: '', lastPresence: 0 };

async function tickGiveaways(client) {
  const due = await db.Giveaway.find({ ended: false, endsAt: { $lte: new Date() } }).limit(20);
  for (const giveaway of due) await finishGiveaway(client, giveaway).catch(() => null);
}

async function tickReminders(client) {
  const due = await db.Reminder.find({ sent: false, dueAt: { $lte: new Date() } }).limit(50);
  for (const reminder of due) {
    reminder.sent = true;
    await reminder.save();
    const user = await client.users.fetch(reminder.userId).catch(() => null);
    if (!user) continue;
    const embed = new EmbedBuilder().setColor(config.brand.color).setTitle('⏰ Recordatorio').setDescription(reminder.text).setTimestamp();
    await user.send({ embeds: [embed] }).catch(() => null);
    if (reminder.channelId) {
      const channel = await client.channels.fetch(reminder.channelId).catch(() => null);
      if (channel?.isTextBased()) await channel.send({ content: `<@${reminder.userId}>`, embeds: [embed] }).catch(() => null);
    }
  }
}

async function tickTempChannels(client) {
  const docs = await db.TempChannel.find({}).limit(200);
  for (const doc of docs) {
    const guild = client.guilds.cache.get(doc.guildId);
    const channel = guild?.channels.cache.get(doc.channelId);
    if (!channel) { await doc.deleteOne().catch(() => null); continue; }
    if (channel.members.size === 0 && Date.now() - new Date(doc.createdAt).getTime() > 60000) {
      await channel.delete('Canal de voz temporal vacío').catch(() => null);
      await doc.deleteOne().catch(() => null);
    }
  }
}

async function tickExpiredCases(client) {
  const due = await db.Case.find({ active: true, expiresAt: { $lte: new Date() }, type: { $in: ['ban', 'tempban', 'mute', 'timeout'] } }).limit(50);
  for (const record of due) {
    const guild = client.guilds.cache.get(record.guildId);
    if (!guild) continue;
    if (record.type === 'ban' || record.type === 'tempban') {
      await guild.bans.remove(record.userId, 'Sanción temporal cumplida').catch(() => null);
    } else if (record.type === 'timeout') {
      const member = await guild.members.fetch(record.userId).catch(() => null);
      if (member) await member.timeout(null, 'Sanción temporal cumplida').catch(() => null);
    } else if (record.type === 'mute') {
      const settings = await db.Guild.get(guild.id);
      const member = await guild.members.fetch(record.userId).catch(() => null);
      if (member && settings.mod.muteRoleId) await member.roles.remove(settings.mod.muteRoleId, 'Sanción temporal cumplida').catch(() => null);
    }
    record.active = false;
    await record.save();
  }
}

async function tickCounters(client) {
  for (const guild of client.guilds.cache.values()) {
    const settings = await db.Guild.get(guild.id).catch(() => null);
    if (!settings?.counters?.length) continue;
    const tickets = await db.Ticket.countDocuments({ guildId: guild.id, status: { $ne: 'closed' } }).catch(() => 0);
    for (const counter of settings.counters) {
      const channel = guild.channels.cache.get(counter.channelId);
      if (!channel) continue;
      const value = {
        members: guild.memberCount,
        humans: guild.members.cache.filter((m) => !m.user.bot).size,
        bots: guild.members.cache.filter((m) => m.user.bot).size,
        online: guild.members.cache.filter((m) => m.presence && m.presence.status !== 'offline').size,
        boosters: guild.premiumSubscriptionCount || 0,
        tickets,
      }[counter.type] ?? 0;
      const name = (counter.format || `{type}: {value}`).replaceAll('{value}', String(value)).replaceAll('{type}', counter.type).slice(0, 100);
      if (channel.name !== name) await channel.setName(name, 'Actualización de contador').catch(() => null);
    }
  }
}

async function tickSticky(client) {
  for (const guild of client.guilds.cache.values()) {
    const settings = await db.Guild.get(guild.id).catch(() => null);
    if (!settings?.sticky?.size) continue;
    for (const [channelId, content] of settings.sticky.entries()) {
      const channel = guild.channels.cache.get(channelId);
      if (!channel?.isTextBased()) continue;
      const messages = await channel.messages.fetch({ limit: 1 }).catch(() => null);
      if (!messages) continue;
      const last = messages.first();
      if (last && last.author.id === client.user.id && last.content === content) continue;
      await channel.send({ content }).catch(() => null);
    }
  }
}

async function tickBirthdays(client) {
  const now = new Date();
  const today = `${now.getUTCDate()}-${now.getUTCMonth() + 1}`;
  if (state.lastBirthday === today) return;
  if (now.getUTCHours() < 12) return;
  state.lastBirthday = today;
  const users = await db.User.find({ 'birthday.day': now.getUTCDate(), 'birthday.month': now.getUTCMonth() + 1 }).limit(50);
  for (const user of users) {
    const guild = client.guilds.cache.get(user.guildId);
    if (!guild) continue;
    const settings = await db.Guild.get(guild.id).catch(() => null);
    const channel = settings?.birthdays?.channelId ? guild.channels.cache.get(settings.birthdays.channelId) : null;
    if (channel?.isTextBased()) {
      await channel.send({ content: `🎂 ¡Feliz cumpleaños <@${user.userId}>! Todo el equipo de **${guild.name}** te desea un gran día.`, allowedMentions: { users: [user.userId] } }).catch(() => null);
    }
  }
}

async function tickPresence(client) {
  if (Date.now() - state.lastPresence < 120000) return;
  state.lastPresence = Date.now();
  try {
    const info = await samp.getInfo({ host: config.brand.samp.host, port: config.brand.samp.port, timeout: 2000 });
    client.user.setPresence({
      activities: [{ name: `Ocaso RP • ${info.players}/${info.maxPlayers} online`, type: ActivityType.Watching }],
      status: 'online',
    });
  } catch {
    client.user.setPresence({ activities: [{ name: 'Ocaso Roleplay • SA-MP', type: ActivityType.Watching }], status: 'idle' });
  }
}

async function tickCleanup() {
  const key = new Date().toISOString().slice(0, 13);
  if (state.lastCleanup === key) return;
  state.lastCleanup = key;
  await db.AutomodLog.deleteMany({ createdAt: { $lt: new Date(Date.now() - 30 * 86400000) } }).catch(() => null);
  await db.Reminder.deleteMany({ sent: true, createdAt: { $lt: new Date(Date.now() - 30 * 86400000) } }).catch(() => null);
}

async function safety(name, fn, client) {
  try { await fn(client); } catch (err) { logger.error(`Scheduler ${name}: ${err.message}`); }
}

function start(client) {
  const every = (ms, name, fn) => {
    const timer = setInterval(() => safety(name, fn, client), ms);
    timer.unref?.();
    timers.push(timer);
    safety(name, fn, client);
  };
  every(15000, 'giveaways', tickGiveaways);
  every(30000, 'reminders', tickReminders);
  every(60000, 'tempchannels', tickTempChannels);
  every(45000, 'expired-cases', tickExpiredCases);
  every(600000, 'counters', tickCounters);
  every(90000, 'sticky', tickSticky);
  every(600000, 'birthdays', tickBirthdays);
  every(120000, 'presence', tickPresence);
  every(3600000, 'cleanup', tickCleanup);
  logger.info('Scheduler iniciado (9 tareas periódicas)');
}

function stop() {
  for (const timer of timers) clearInterval(timer);
  timers.length = 0;
}

module.exports = { start, stop, tickGiveaways, tickReminders, tickTempChannels, tickCounters, tickSticky };
