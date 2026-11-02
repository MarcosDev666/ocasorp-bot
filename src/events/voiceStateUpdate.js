'use strict';
const { Events, ChannelType, EmbedBuilder } = require('discord.js');
const config = require('../config');
const db = require('../database/models');
const settingsService = require('../services/settings');
const { addXp } = require('../services/levels');
const { sendLog } = require('../services/logger');

const voiceSessions = new Map();

module.exports = {
  name: Events.VoiceStateUpdate,
  async run(client, oldState, newState) {
    const member = newState.member || oldState.member;
    if (!member || member.user.bot) return;
    const guild = member.guild;
    const settings = await settingsService.get(guild.id).catch(() => null);

    if (oldState.channelId && oldState.channelId !== newState.channelId) {
      const temp = await db.TempChannel.findOne({ channelId: oldState.channelId }).catch(() => null);
      const channel = guild.channels.cache.get(oldState.channelId);
      if (temp && channel && channel.members.size === 0) {
        await channel.delete('Canal temporal vacío').catch(() => null);
        await temp.deleteOne().catch(() => null);
      }
    }

    if (settings?.tempVoice?.enabled && newState.channelId === settings.tempVoice.hubChannelId && !oldState.channelId) {
      try {
        const channel = await guild.channels.create({
          name: `🔊 ${member.displayName}`.slice(0, 100),
          type: ChannelType.GuildVoice,
          parent: settings.tempVoice.categoryId || null,
          permissionOverwrites: [
            { id: guild.roles.everyone.id, ViewChannel: true, Connect: true },
            { id: member.id, ViewChannel: true, Connect: true, ManageChannels: true, MoveMembers: true },
          ],
        });
        await db.TempChannel.create({ guildId: guild.id, channelId: channel.id, ownerId: member.id, name: channel.name });
        await member.voice.setChannel(channel).catch(() => null);
      } catch { /* ignore */ }
    }

    const key = `${guild.id}:${member.id}`;
    if (!oldState.channelId && newState.channelId) voiceSessions.set(key, Date.now());
    if (oldState.channelId && !newState.channelId) {
      const since = voiceSessions.get(key);
      voiceSessions.delete(key);
      if (since && settings?.levels?.enabled) {
        const minutes = Math.floor((Date.now() - since) / 60000);
        if (minutes > 0) {
          const user = await db.User.get(guild.id, member.id).catch(() => null);
          if (user) {
            user.voiceMinutes += minutes;
            await user.save().catch(() => null);
            await addXp(member, minutes * (settings.levels.voiceXp || 8), 'voice', settings).catch(() => null);
          }
        }
      }
    }

    if (!settings?.logs?.size) return;
    if (oldState.channelId !== newState.channelId) {
      const embed = new EmbedBuilder().setColor(config.brand.color)
        .setDescription(`${newState.channelId ? '🔊' : '🔇'} **${member.user.tag}** ${newState.channelId ? `se conectó a <#${newState.channelId}>` : `se desconectó de <#${oldState.channelId}>`}`);
      await sendLog(guild, 'voice', embed);
    }
  },
};
