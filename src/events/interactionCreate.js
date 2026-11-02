'use strict';
const { Events, MessageFlags } = require('discord.js');
const registry = require('../core/registry');
const { createContext } = require('../core/context');
const { isStaff, isOwner, missingMemberPerms, missingBotPerms, label } = require('../core/permissions');
const { error } = require('../utils/embed');
const db = require('../database/models');
const settingsService = require('../services/settings');
const logger = require('../utils/logger');
const { handleComponent, handleModal } = require('../interactions');

async function replyError(interaction, description) {
  const payload = { embeds: [error(description)], flags: MessageFlags.Ephemeral };
  try {
    if (interaction.deferred) await interaction.editReply({ embeds: [error(description)] });
    else if (interaction.replied) await interaction.followUp(payload);
    else await interaction.reply(payload);
  } catch { /* ignore */ }
}

function cooldownLeft(client, key, seconds) {
  if (!seconds) return 0;
  const now = Date.now();
  const expires = client.cooldowns.get(key);
  if (expires && expires > now) return expires - now;
  client.cooldowns.set(key, now + seconds * 1000);
  if (client.cooldowns.size > 5000) {
    for (const [k, v] of client.cooldowns) if (v < now) client.cooldowns.delete(k);
  }
  return 0;
}

module.exports = {
  name: Events.InteractionCreate,
  async run(client, interaction) {
    try {
      if (interaction.isAutocomplete()) {
        const sub = interaction.options.getSubcommand(false);
        const key = sub ? `${interaction.commandName} ${sub}` : interaction.commandName;
        const command = registry.get(key);
        if (command?.autocomplete) await command.autocomplete(createContext(interaction, client, command));
        return;
      }
      if (interaction.isButton() || interaction.isStringSelectMenu() || interaction.isUserSelectMenu() || interaction.isRoleSelectMenu() || interaction.isChannelSelectMenu() || interaction.isModalSubmit()) {
        if (interaction.customId?.startsWith('page:') || interaction.customId?.startsWith('confirm:')) return;
        if (interaction.isModalSubmit()) return await handleModal(interaction, client);
        return await handleComponent(interaction, client);
      }
      if (!interaction.isChatInputCommand()) return;

      const sub = interaction.options.getSubcommand(false);
      const key = sub ? `${interaction.commandName} ${sub}` : interaction.commandName;
      const command = registry.get(key);
      if (!command) return replyError(interaction, `El sistema \`${key}\` no está cargado. Avisá a un administrador.`);

      if (command.guildOnly && !interaction.guild) return replyError(interaction, 'Este comando solo funciona dentro de un servidor.');

      const guildSettings = interaction.guild ? await settingsService.get(interaction.guild.id) : null;
      if (guildSettings?.maintenance && !isOwner(interaction.user.id)) {
        return replyError(interaction, guildSettings.maintenanceMessage || 'El bot está en mantenimiento. Intentá más tarde.');
      }

      if (command.ownerOnly && !isOwner(interaction.user.id) && interaction.guild?.ownerId !== interaction.user.id) return replyError(interaction, 'Este comando es exclusivo del dueño del servidor o del equipo técnico del bot.');
      if (command.staffOnly && !isStaff(interaction.member)) return replyError(interaction, 'Este comando es exclusivo del staff.');
      const missingMember = missingMemberPerms(interaction.member, command.perms || []);
      if (missingMember.length) return replyError(interaction, `Te faltan permisos: ${missingMember.map(label).join(', ')}`);
      const missingBot = missingBotPerms(interaction.guild, command.botPerms || []);
      if (missingBot.length) return replyError(interaction, `Me faltan permisos: ${missingBot.map(label).join(', ')}`);

      const remaining = cooldownLeft(client, `${command.name}:${interaction.user.id}`, command.cooldown);
      if (remaining) return replyError(interaction, `Esperá **${(remaining / 1000).toFixed(1)}s** antes de volver a usar \`/${command.name}\`.`);

      if (command.defer !== false && !interaction.deferred && !interaction.replied) {
        await interaction.deferReply(command.ephemeral ? { flags: MessageFlags.Ephemeral } : {});
      }

      const ctx = createContext(interaction, client, command);
      await command.run(ctx);

      if (interaction.guild) {
        db.User.updateOne({ guildId: interaction.guild.id, userId: interaction.user.id }, { $inc: { 'stats.commandsUsed': 1 }, $set: { lastSeen: new Date() } }, { upsert: false }).catch(() => null);
      }
    } catch (err) {
      logger.error(`Error en interacción ${interaction.commandName || interaction.customId}: ${err.stack || err.message}`);
      if (interaction.isRepliable()) await replyError(interaction, `Ocurrió un error al ejecutar la acción.\n\`\`\`${String(err.message).slice(0, 300)}\`\`\``);
    }
  },
};
