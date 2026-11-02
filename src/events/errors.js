'use strict';
const { Events } = require('discord.js');
const logger = require('../utils/logger');

module.exports = [
  { name: Events.Error, run: (client, err) => logger.error(`Cliente Discord: ${err.stack || err.message}`) },
  { name: Events.Warn, run: (client, msg) => logger.warn(`Cliente Discord: ${msg}`) },
  { name: Events.ShardDisconnect, run: (client, event, id) => logger.warn(`Shard ${id} desconectado (código ${event.code})`) },
  { name: Events.ShardReconnect, run: (client, id) => logger.info(`Shard ${id} reconectando...`) },
];
