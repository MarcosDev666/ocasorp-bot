'use strict';
const { Events, ActivityType } = require('discord.js');
const logger = require('../utils/logger');
const config = require('../config');
const scheduler = require('../services/scheduler');
const registry = require('../core/registry');
const db = require('../database/models');

module.exports = {
  name: Events.ClientReady,
  once: true,
  async run(client) {
    logger.success(`Conectado como ${client.user.tag} en ${client.guilds.cache.size} servidor(es).`);
    logger.info(`${registry.all().length} sistemas disponibles.`);
    client.user.setPresence({
      activities: [{ name: `Ocaso Roleplay • ${client.guilds.cache.size} servidores`, type: ActivityType.Watching }],
      status: 'online',
    });
    for (const guild of client.guilds.cache.values()) {
      await db.Guild.get(guild.id).catch(() => null);
      await guild.members.fetch().catch(() => null);
    }
    scheduler.start(client);
    logger.info(`Invitación: https://discord.com/api/oauth2/authorize?client_id=${config.clientId}&permissions=8&scope=bot%20applications.commands`);
  },
};
