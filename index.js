'use strict';
const fs = require('node:fs');
const path = require('node:path');

const client = require('./src/core/client');
const config = require('./src/config');
const logger = require('./src/utils/logger');
const { loadSystems } = require('./src/core/loader');
const { deployCommands } = require('./src/core/deploy');
const registry = require('./src/core/registry');
const { connect, disconnect } = require('./src/database/connect');

if (!config.token) {
  logger.error('Falta DISCORD_TOKEN en el archivo .env (copiá .env.example a .env).');
  process.exit(1);
}

function loadEvents() {
  const dir = path.join(__dirname, 'src', 'events');
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.js'));
  let count = 0;
  for (const file of files) {
    const mod = require(path.join(dir, file));
    const list = Array.isArray(mod) ? mod : [mod];
    for (const event of list) {
      if (!event?.name || !event?.run) continue;
      if (event.once) client.once(event.name, (...args) => event.run(client, ...args));
      else client.on(event.name, (...args) => event.run(client, ...args));
      count += 1;
    }
  }
  logger.info(`${count} eventos cargados`);
}

async function bootstrap() {
  logger.info('Iniciando Ocaso Roleplay Bot...');
  const result = loadSystems(client);
  logger.info(`${result.commands} sistemas cargados desde ${result.loaded} módulos (${result.files} archivos)`);
  if (result.errors.length) {
    for (const err of result.errors.slice(0, 20)) logger.error(`Sistema: ${err}`);
    if (result.errors.length > 20) logger.error(`... y ${result.errors.length - 20} errores más`);
  }
  for (const warning of registry.warnings) logger.warn(warning);

  await connect();
  await deployCommands();
  loadEvents();

  await client.login(config.token);
}

process.on('unhandledRejection', (err) => logger.error(`Unhandled rejection: ${err?.stack || err}`));
process.on('uncaughtException', (err) => logger.error(`Uncaught exception: ${err?.stack || err}`));

async function shutdown(signal) {
  logger.warn(`Recibido ${signal}, cerrando...`);
  client.destroy();
  await disconnect().catch(() => null);
  process.exit(0);
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

bootstrap().catch((err) => {
  logger.error(`No se pudo iniciar el bot: ${err.stack || err}`);
  process.exit(1);
});
