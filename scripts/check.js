'use strict';
const path = require('node:path');

process.chdir(path.join(__dirname, '..'));
const registry = require('../src/core/registry');
const { loadSystems, walk, SYSTEMS_DIR } = require('../src/core/loader');

const errors = [];
const warns = [];
const client = {};
const result = loadSystems(client);
for (const err of result.errors) errors.push(`Sistema: ${err}`);

const NAME_RE = /^[-_\p{L}\p{N}]{1,32}$/u;
const OPT_NAME_RE = /^[-_\p{L}\p{N}]{1,32}$/u;
const TYPES = new Set([3, 4, 5, 6, 7, 8, 9, 10, 11]);

for (const cmd of registry.all()) {
  for (const part of cmd.name.split(' ')) {
    if (!NAME_RE.test(part) || part !== part.toLowerCase()) errors.push(`Nombre inválido: ${cmd.name}`);
  }
  if (!cmd.description || cmd.description.length > 100) errors.push(`Descripción inválida (${cmd.description?.length}): ${cmd.name}`);
  const seen = new Set();
  let optionalSeen = false;
  for (const opt of cmd.options || []) {
    if (!OPT_NAME_RE.test(opt.name) || opt.name !== opt.name.toLowerCase()) errors.push(`Opción inválida ${cmd.name}.${opt.name}`);
    if (seen.has(opt.name)) errors.push(`Opción duplicada ${cmd.name}.${opt.name}`);
    seen.add(opt.name);
    if (!opt.description || opt.description.length > 100) errors.push(`Descripción de opción inválida ${cmd.name}.${opt.name} (${opt.description?.length})`);
    if (!TYPES.has(opt.type)) errors.push(`Tipo de opción inválido ${cmd.name}.${opt.name} = ${opt.type}`);
    if (opt.required && optionalSeen) errors.push(`Opción requerida después de opcional: ${cmd.name}.${opt.name}`);
    if (!opt.required) optionalSeen = true;
    if (opt.choices && opt.choices.some((c) => String(c.name).length > 100)) errors.push(`Choice demasiado largo: ${cmd.name}.${opt.name}`);
    if (opt.choices && opt.choices.length > 25) errors.push(`Demasiadas choices: ${cmd.name}.${opt.name}`);
  }
}

const data = registry.slashData();
if (data.length > 100) errors.push(`Demasiados comandos raíz: ${data.length} (máximo 100)`);

// Validación estructural con los builders oficiales de discord.js
const { SlashCommandBuilder } = require('discord.js');
function addOptions(builder, options = []) {
  for (const opt of options) {
    const apply = (x) => {
      if (opt.required !== undefined) x.setRequired(opt.required);
      if (opt.choices) x.addChoices(...opt.choices.map((c) => ({ name: c.name, value: c.value })));
      if (opt.min_length !== undefined) x.setMinLength(opt.min_length);
      if (opt.max_length !== undefined) x.setMaxLength(opt.max_length);
      if (opt.min_value !== undefined) x.setMinValue(opt.min_value);
      if (opt.max_value !== undefined) x.setMaxValue(opt.max_value);
      if (opt.autocomplete) x.setAutocomplete(true);
      return x;
    };
    const name = opt.name;
    const description = opt.description;
    switch (opt.type) {
      case 3: builder.addStringOption((o) => apply(o.setName(name).setDescription(description))); break;
      case 4: builder.addIntegerOption((o) => apply(o.setName(name).setDescription(description))); break;
      case 5: builder.addBooleanOption((o) => apply(o.setName(name).setDescription(description))); break;
      case 6: builder.addUserOption((o) => apply(o.setName(name).setDescription(description))); break;
      case 7: builder.addChannelOption((o) => apply(o.setName(name).setDescription(description))); break;
      case 8: builder.addRoleOption((o) => apply(o.setName(name).setDescription(description))); break;
      case 9: builder.addMentionableOption((o) => apply(o.setName(name).setDescription(description))); break;
      case 10: builder.addNumberOption((o) => apply(o.setName(name).setDescription(description))); break;
      case 11: builder.addAttachmentOption((o) => apply(o.setName(name).setDescription(description))); break;
      default: errors.push(`Tipo de opción no soportado en ${name}: ${opt.type}`);
    }
  }
  return builder;
}
for (const root of data) {
  try {
    const builder = new SlashCommandBuilder().setName(root.name).setDescription(root.description);
    for (const opt of root.options || []) {
      if (opt.type === 1) builder.addSubcommand((sub) => addOptions(sub.setName(opt.name).setDescription(opt.description), opt.options));
      else addOptions(builder, [opt]);
    }
    builder.toJSON();
  } catch (err) {
    errors.push(`Builder /${root.name}: ${err.message}`);
  }
}
for (const root of data) {
  if ((root.options?.length || 0) > 25) errors.push(`Demasiadas opciones/subcomandos en /${root.name}: ${root.options.length} (máximo 25)`);
  for (const opt of root.options || []) {
    if ((opt.options?.length || 0) > 25) errors.push(`Demasiadas opciones en /${root.name} ${opt.name}`);
  }
}

for (const warning of registry.warnings) warns.push(warning);

const categories = registry.all().reduce((acc, c) => { acc[c.category] = (acc[c.category] || 0) + 1; return acc; }, {});
console.log(`Sistemas: ${registry.all().length}`);
console.log(`Comandos raíz: ${data.length}`);
console.log(`Módulos cargados: ${result.loaded} (${walk(SYSTEMS_DIR).length} archivos)`);
console.log('Categorías:', categories);
if (warns.length) console.log('Avisos:', warns);
if (errors.length) {
  console.error(`\n${errors.length} ERRORES:`);
  for (const err of errors) console.error(` - ${err}`);
  process.exit(1);
}
console.log('\n✅ Validación OK');
