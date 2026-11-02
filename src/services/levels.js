'use strict';
const { EmbedBuilder } = require('discord.js');
const config = require('../config');
const db = require('../database/models');
const { progressBar, number } = require('../utils/format');

const xpForLevel = (level) => 5 * level ** 2 + 50 * level + 100;
const levelFromXp = (xp) => {
  let level = 0;
  let remaining = Math.max(0, Number(xp) || 0);
  while (remaining >= xpForLevel(level)) {
    remaining -= xpForLevel(level);
    level += 1;
  }
  return level;
};
const xpIntoLevel = (xp) => {
  let level = 0;
  let remaining = Math.max(0, Number(xp) || 0);
  while (remaining >= xpForLevel(level)) {
    remaining -= xpForLevel(level);
    level += 1;
  }
  return remaining;
};

async function addXp(member, amount, source = 'message', providedSettings = null) {
  if (!member || member.user.bot) return null;
  const settings = providedSettings || await db.Guild.get(member.guild.id).catch(() => null);
  if (!settings?.levels?.enabled) return null;
  const user = await db.User.get(member.guild.id, member.id);
  const gained = Math.max(1, Math.round(amount * (settings.levels.multiplier || 1)));
  const before = user.level;
  user.xp = Math.max(0, user.xp + gained);
  if (source === 'message') user.messages += 1;
  const newLevel = levelFromXp(user.xp);
  user.level = newLevel;
  await user.save();

  if (newLevel > before) {
    const reward = (settings.levels.rewards || []).find((r) => r.level === newLevel);
    if (reward?.roleId) await member.roles.add(reward.roleId, `Recompensa por nivel ${newLevel}`).catch(() => null);
    if (settings.levels.announce && settings.levels.channelId) {
      const channel = member.guild.channels.cache.get(settings.levels.channelId);
      if (channel?.isTextBased()) {
        await channel.send({ embeds: [new EmbedBuilder().setColor(config.brand.color).setDescription(`🎉 ¡${member} subió al **nivel ${newLevel}**!${reward ? `\nDesbloqueó <@&${reward.roleId}>` : ''}`)] }).catch(() => null);
      }
    }
  }
  return { user, gained, level: newLevel, leveledUp: newLevel > before };
}

function levelCard(user, target) {
  const into = xpIntoLevel(user.xp);
  const needed = xpForLevel(user.level);
  return new EmbedBuilder()
    .setColor(config.brand.color)
    .setAuthor({ name: `Perfil de ${target.username}`, iconURL: target.displayAvatarURL() })
    .setThumbnail(target.displayAvatarURL({ size: 256 }))
    .addFields(
      { name: 'Nivel', value: `**${user.level}**`, inline: true },
      { name: 'XP', value: `${number(into)} / ${number(needed)}`, inline: true },
      { name: 'Total', value: `${number(user.xp)} XP`, inline: true },
      { name: 'Progreso', value: progressBar(into, needed, 14) },
      { name: 'Mensajes', value: number(user.messages), inline: true },
      { name: 'Voz', value: `${number(user.voiceMinutes)} min`, inline: true },
    );
}

module.exports = { addXp, xpForLevel, levelFromXp, xpIntoLevel, levelCard };
