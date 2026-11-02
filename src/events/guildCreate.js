'use strict';
const { Events, EmbedBuilder } = require('discord.js');
const db = require('../database/models');
const config = require('../config');
const logger = require('../utils/logger');

module.exports = {
  name: Events.GuildCreate,
  async run(client, guild) {
    await db.Guild.get(guild.id).catch(() => null);
    logger.info(`Nuevo servidor: ${guild.name} (${guild.id}) · ${guild.memberCount} miembros`);
    const owner = await guild.fetchOwner().catch(() => null);
    if (owner) {
      await owner.send({
        embeds: [new EmbedBuilder().setColor(config.brand.color)
          .setTitle('¡Gracias por invitar a Ocaso Roleplay Bot!')
          .setDescription('Para empezar, usá `/setup` y el bot va a crear las categorías, canales y roles recomendados.\n\nPodés ver todos los sistemas con `/sistemas`.')
          .setFooter({ text: config.brand.footer })],
      }).catch(() => null);
    }
  },
};
