'use strict';
const fs = require('node:fs');
const path = require('node:path');
const registry = require('./registry');

const SYSTEMS_DIR = path.join(__dirname, '..', 'systems');

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || entry.name.startsWith('_')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (entry.name.endsWith('.js')) out.push(full);
  }
  return out;
}

function loadSystems(client) {
  const files = walk(SYSTEMS_DIR);
  let loaded = 0;
  const errors = [];
  for (const file of files) {
    try {
      delete require.cache[require.resolve(file)];
      const mod = require(file);
      if (mod && mod.setup) mod.setup(client);
      const cmds = mod?.commands || mod?.default || mod;
      if (Array.isArray(cmds) || (cmds && cmds.name)) {
        registry.register(cmds, path.relative(SYSTEMS_DIR, file));
        loaded += 1;
      }
    } catch (err) {
      errors.push(`${path.relative(SYSTEMS_DIR, file)}: ${err.message}`);
    }
  }
  client.commands = registry.commands;
  return { files: files.length, loaded, errors, commands: registry.all().length };
}

module.exports = { loadSystems, walk, SYSTEMS_DIR };
