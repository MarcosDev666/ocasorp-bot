'use strict';
const { REST, Routes } = require('discord.js');
const config = require('../config');
const logger = require('../utils/logger');
const registry = require('./registry');

/**
 * Registra/actualiza los comandos slash en Discord.
 * Se ejecuta en cada arranque del bot (index.js), así el host no necesita un paso extra:
 *  - con GUILD_ID → registro instantáneo en ese servidor;
 *  - sin GUILD_ID → registro global (puede tardar hasta 1 hora en aparecer).
 * Es idempotente: reemplaza el set de comandos, no los duplica.
 * @param {{ force?: boolean }} [opts] force ignora DEPLOY_COMMANDS (usado por `npm run deploy`).
 * @returns {Promise<Array|null>} los comandos registrados, o null si se omitió/falló.
 */
async function deployCommands({ force = false } = {}) {
  if (!force && !config.deployCommands) {
    logger.info('Registro de comandos omitido (DEPLOY_COMMANDS=false).');
    return null;
  }

  if (!config.token || !config.clientId) {
    logger.warn('No se registraron los comandos: faltan DISCORD_TOKEN y/o CLIENT_ID en el .env.');
    return null;
  }

  const warningsBefore = registry.warnings.length;
  const data = registry.slashData();
  for (const warning of registry.warnings.slice(warningsBefore)) logger.warn(warning);

  // Salvaguarda: nunca mandar un body vacío, borraría todos los comandos existentes.
  if (!data.length) {
    logger.error('No hay comandos cargados; se cancela el registro para no borrar los existentes.');
    return null;
  }

  const scope = config.guildId ? `en el servidor ${config.guildId}` : 'globalmente';
  logger.info(`Registrando ${data.length} comandos raíz (${registry.all().length} sistemas) ${scope}...`);

  try {
    const rest = new REST({ version: '10' }).setToken(config.token);
    const route = config.guildId
      ? Routes.applicationGuildCommands(config.clientId, config.guildId)
      : Routes.applicationCommands(config.clientId);
    const body = await rest.put(route, { body: data });
    logger.success(`Comandos registrados: ${body.length} ${scope}.`);
    if (!config.guildId) logger.warn('Los comandos globales pueden tardar hasta 1 hora en aparecer.');
    return body;
  } catch (err) {
    logger.error(`No se pudieron registrar los comandos: ${err?.message || err}`);
    return null;
  }
}

module.exports = { deployCommands };
