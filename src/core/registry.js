'use strict';
const { ApplicationCommandOptionType, ApplicationCommandType } = require('discord.js');

const commands = new Map();
const warnings = [];

const DEFAULTS = {
  category: 'General',
  options: [],
  perms: [],
  botPerms: [],
  cooldown: 3,
  ownerOnly: false,
  staffOnly: false,
  guildOnly: true,
  defer: true,
  hidden: false,
};

function normalize(cmd, file) {
  if (!cmd || typeof cmd !== 'object') throw new Error(`Comando inválido en ${file}`);
  if (!cmd.name || typeof cmd.name !== 'string') throw new Error(`Comando sin nombre en ${file}`);
  if (!cmd.description) throw new Error(`El comando ${cmd.name} no tiene descripción`);
  if (typeof cmd.run !== 'function') throw new Error(`El comando ${cmd.name} no tiene función run`);
  if (cmd.name.length > 32 || cmd.name.split(' ').some((p) => p.length > 32)) throw new Error(`Nombre inválido: ${cmd.name}`);
  const normalized = { ...DEFAULTS, ...cmd, file, root: cmd.name.split(' ')[0] };
  normalized.options = (cmd.options || []).map((op) => ({ ...op, type: op.type }));
  return normalized;
}

function register(list, file = 'desconocido') {
  const arr = Array.isArray(list) ? list : [list];
  for (const raw of arr) {
    const cmd = normalize(raw, file);
    if (commands.has(cmd.name)) {
      warnings.push(`Comando duplicado ignorado: ${cmd.name} (${file})`);
      continue;
    }
    commands.set(cmd.name, cmd);
  }
}

function all() {
  return [...commands.values()];
}

function get(name) {
  return commands.get(name);
}

function groups() {
  const map = new Map();
  for (const cmd of commands.values()) {
    const [root, ...rest] = cmd.name.split(' ');
    if (!map.has(root)) map.set(root, { root, subs: [], direct: [] });
    const g = map.get(root);
    if (rest.length) g.subs.push({ cmd, sub: rest.join(' ') });
    else g.direct.push(cmd);
  }
  return map;
}

function slashData() {
  const data = [];
  for (const [, g] of groups()) {
    if (g.subs.length) {
      if (g.direct.length) {
        warnings.push(`El grupo /${g.root} mezcla comando directo y subcomandos; se ignoró el directo.`);
      }
      const seen = new Set();
      const options = [];
      for (const { cmd, sub } of g.subs.sort((a, b) => a.sub.localeCompare(b.sub))) {
        if (seen.has(sub)) { warnings.push(`Subcomando duplicado /${g.root} ${sub}`); continue; }
        seen.add(sub);
        options.push({
          type: ApplicationCommandOptionType.Subcommand,
          name: sub,
          description: cmd.description.slice(0, 100),
          options: cmd.options,
        });
      }
      data.push({
        type: ApplicationCommandType.ChatInput,
        name: g.root,
        description: (g.subs[0].cmd.groupDescription || `Sistema ${g.root} de Ocaso Roleplay`).slice(0, 100),
        options,
      });
    } else if (g.direct.length === 1) {
      const cmd = g.direct[0];
      data.push({
        type: ApplicationCommandType.ChatInput,
        name: cmd.root,
        description: cmd.description.slice(0, 100),
        options: cmd.options,
        default_member_permissions: cmd.defaultMemberPermissions || undefined,
      });
    } else {
      warnings.push(`Grupo /${g.root} con múltiples comandos directos (${g.direct.length})`);
    }
  }
  return data.sort((a, b) => a.name.localeCompare(b.name));
}

module.exports = { register, all, get, groups, slashData, warnings, commands };
