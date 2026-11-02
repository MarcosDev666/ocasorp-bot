'use strict';
const { EmbedBuilder } = require('discord.js');
const config = require('../config');
const settings = require('../services/settings');

const cmd = (data) => ({ cooldown: 3, category: 'General', ...data });
const ADMIN = { perms: ['ManageGuild'] };
const MOD = { perms: ['ModerateMembers'] };
const STAFF = { staffOnly: true };

const getSettings = (ctx) => settings.get(ctx.guildId);
const saveSettings = async (ctx, fn) => {
  const guild = await settings.get(ctx.guildId);
  if (fn) await fn(guild);
  await guild.save();
  settings.invalidate(ctx.guildId);
  return guild;
};

async function target(ctx, name = 'usuario') {
  const user = ctx.userOpt(name);
  if (!user) return { user: null, member: null };
  const member = await ctx.guild.members.fetch(user.id).catch(() => null);
  return { user, member };
}

function embed(data) {
  return new EmbedBuilder()
    .setColor(data.color ?? config.brand.color)
    .setFooter({ text: data.footer ?? config.brand.footer })
    .setTimestamp();
}

const now = () => new Date();
const cut = (s, n = 1000) => (String(s).length > n ? `${String(s).slice(0, n - 1)}…` : String(s));
const yesNo = (v) => (v ? '✅ Activado' : '❌ Desactivado');

module.exports = { cmd, ADMIN, MOD, STAFF, getSettings, saveSettings, target, embed, now, cut, yesNo };
