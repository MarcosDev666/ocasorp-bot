'use strict';
const {
  Events, EmbedBuilder, AuditLogEvent,
} = require('discord.js');
const config = require('../config');
const { sendLog } = require('../services/logger');
const logger = require('../utils/logger');

const channelLog = {
  name: Events.ChannelCreate,
  async run(client, channel) {
    if (!channel.guild) return;
    await sendLog(channel.guild, 'channelCreate', new EmbedBuilder().setColor(config.brand.colorOk).setTitle('Canal creado').setDescription(`📁 ${channel} (${channel.name}) · \`${channel.type}\``));
  },
};
const channelDelete = {
  name: Events.ChannelDelete,
  async run(client, channel) {
    if (!channel.guild) return;
    await sendLog(channel.guild, 'channelDelete', new EmbedBuilder().setColor(config.brand.colorError).setTitle('Canal eliminado').setDescription(`🗑️ #${channel.name} · \`${channel.type}\``));
  },
};
const channelUpdate = {
  name: Events.ChannelUpdate,
  async run(client, oldChannel, newChannel) {
    if (!newChannel.guild) return;
    const changes = [];
    if (oldChannel.name !== newChannel.name) changes.push(`**Nombre:** \`${oldChannel.name}\` → \`${newChannel.name}\``);
    if (oldChannel.parentId !== newChannel.parentId) changes.push('**Categoría** modificada');
    if (oldChannel.topic !== newChannel.topic) changes.push('**Tema** modificado');
    if (!changes.length) return;
    await sendLog(newChannel.guild, 'channelUpdate', new EmbedBuilder().setColor(config.brand.colorWarn).setTitle('Canal actualizado').setDescription(changes.join('\n')));
  },
};
const roleCreate = {
  name: Events.GuildRoleCreate,
  async run(client, role) {
    await sendLog(role.guild, 'roleCreate', new EmbedBuilder().setColor(config.brand.colorOk).setTitle('Rol creado').setDescription(`@${role.name} · \`${role.id}\``));
  },
};
const roleDelete = {
  name: Events.GuildRoleDelete,
  async run(client, role) {
    await sendLog(role.guild, 'roleDelete', new EmbedBuilder().setColor(config.brand.colorError).setTitle('Rol eliminado').setDescription(`@${role.name} · \`${role.id}\``));
  },
};
const roleUpdate = {
  name: Events.GuildRoleUpdate,
  async run(client, oldRole, newRole) {
    const changes = [];
    if (oldRole.name !== newRole.name) changes.push(`**Nombre:** \`${oldRole.name}\` → \`${newRole.name}\``);
    if (oldRole.hexColor !== newRole.hexColor) changes.push(`**Color:** ${oldRole.hexColor} → ${newRole.hexColor}`);
    if (oldRole.permissions.bitfield !== newRole.permissions.bitfield) changes.push('**Permisos** modificados');
    if (!changes.length) return;
    await sendLog(newRole.guild, 'roleUpdate', new EmbedBuilder().setColor(config.brand.colorWarn).setTitle('Rol actualizado').setDescription(`${newRole}\n${changes.join('\n')}`));
  },
};
const banAdd = {
  name: Events.GuildBanAdd,
  async run(client, ban) {
    const logs = await ban.guild.fetchAuditLogs({ type: AuditLogEvent.MemberBanAdd, limit: 1 }).catch(() => null);
    const entry = logs?.entries?.first();
    await sendLog(ban.guild, 'ban', new EmbedBuilder().setColor(config.brand.colorError).setTitle('Usuario baneado').setDescription(`🔨 **${ban.user.tag}** (${ban.user.id})\n**Razón:** ${ban.reason || entry?.reason || 'Sin especificar'}\n**Por:** ${entry?.executor?.tag || 'Desconocido'}`));
  },
};
const banRemove = {
  name: Events.GuildBanRemove,
  async run(client, ban) {
    await sendLog(ban.guild, 'unban', new EmbedBuilder().setColor(config.brand.colorOk).setTitle('Usuario desbaneado').setDescription(`🔓 **${ban.user.tag}** (${ban.user.id})`));
  },
};
const inviteCreate = {
  name: Events.InviteCreate,
  async run(client, invite) {
    if (!invite.guild) return;
    await sendLog(invite.guild, 'invite', new EmbedBuilder().setColor(config.brand.color).setTitle('Invitación creada').setDescription(`\`${invite.code}\` por **${invite.inviter?.tag || 'Desconocido'}**\nCanal: <#${invite.channelId}> · Usos: ${invite.maxUses || '∞'}`));
  },
};
const inviteDelete = {
  name: Events.InviteDelete,
  async run(client, invite) {
    if (!invite.guild) return;
    await sendLog(invite.guild, 'invite', new EmbedBuilder().setColor(config.brand.colorWarn).setTitle('Invitación eliminada').setDescription(`\`${invite.code}\` en <#${invite.channelId}>`));
  },
};
const guildDelete = {
  name: Events.GuildDelete,
  async run(client, guild) {
    logger.warn(`El bot salió de ${guild.name} (${guild.id}); los datos se conservan en MongoDB.`);
  },
};

module.exports = [channelLog, channelDelete, channelUpdate, roleCreate, roleDelete, roleUpdate, banAdd, banRemove, inviteCreate, inviteDelete, guildDelete];
