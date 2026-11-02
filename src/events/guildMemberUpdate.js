'use strict';
const { Events, EmbedBuilder } = require('discord.js');
const config = require('../config');
const { sendLog } = require('../services/logger');
const { sendBoost } = require('../services/welcome');

module.exports = {
  name: Events.GuildMemberUpdate,
  async run(client, oldMember, newMember) {
    if (!oldMember.premiumSince && newMember.premiumSince) await sendBoost(newMember).catch(() => null);
    if (oldMember.nickname !== newMember.nickname) {
      await sendLog(newMember.guild, 'memberUpdate', new EmbedBuilder().setColor(config.brand.color)
        .setDescription(`📝 **Apodo actualizado**\n${newMember.user.tag}: \`${oldMember.nickname || 'sin apodo'}\` → \`${newMember.nickname || 'sin apodo'}\``));
    }
    const added = newMember.roles.cache.filter((r) => !oldMember.roles.cache.has(r.id));
    const removed = oldMember.roles.cache.filter((r) => !newMember.roles.cache.has(r.id));
    if (added.size || removed.size) {
      await sendLog(newMember.guild, 'memberUpdate', new EmbedBuilder().setColor(config.brand.color)
        .setTitle('Roles actualizados')
        .setDescription(`${newMember} (${newMember.id})`)
        .addFields(
          { name: 'Añadidos', value: added.size ? added.map((r) => `<@${r.id}>`).join(', ') : 'Ninguno', inline: true },
          { name: 'Removidos', value: removed.size ? removed.map((r) => `<@${r.id}>`).join(', ') : 'Ninguno', inline: true },
        ));
    }
  },
};
