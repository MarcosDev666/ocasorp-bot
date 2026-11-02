'use strict';
const { REST, Routes } = require('discord.js');
const config = require('./src/config');
const logger = require('./src/utils/logger');
const registry = require('./src/core/registry');
const { loadSystems } = require('./src/core/loader');

async function main() {
  if (!config.token || !config.clientId) {
    logger.error('Configurá DISCORD_TOKEN y CLIENT_ID en el archivo .env');
    process.exit(1);
  }
  const client = { commands: new Map() };
  const result = loadSystems(client);
  for (const err of result.errors) logger.error(`Sistema: ${err}`);
  const data = registry.slashData();
  logger.info(`Registrando ${data.length} comandos raíz (${result.commands} sistemas)...`);

  const rest = new REST({ version: '10' }).setToken(config.token);
  const route = config.guildId
    ? Routes.applicationGuildCommands(config.clientId, config.guildId)
    : Routes.applicationCommands(config.clientId);
  const body = await rest.put(route, { body: data });
  logger.success(`Listo: ${body.length} comandos registrados ${config.guildId ? `en el servidor ${config.guildId}` : 'globalmente'}.`);
  if (!config.guildId) logger.warn('Los comandos globales pueden tardar hasta 1 hora en aparecer.');
}

main().catch((err) => {
  logger.error(err.stack || err.message);
  process.exit(1);
});
