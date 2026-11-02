'use strict';
const fs = require('node:fs');
const path = require('node:path');

process.chdir(path.join(__dirname, '..'));
const registry = require('../src/core/registry');
const { loadSystems } = require('../src/core/loader');

const result = loadSystems({});
if (result.errors.length) {
  console.error(result.errors);
  process.exit(1);
}

const commands = registry.all().sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
const byCategory = commands.reduce((acc, cmd) => { (acc[cmd.category] ||= []).push(cmd); return acc; }, {});
const total = commands.length;

const lines = [
  '# 🧩 Sistemas de Ocaso Roleplay Bot',
  '',
  `> Documento generado automáticamente con \`npm run systems\`. **${total} sistemas** implementados sobre discord.js v14 y Minecraft... `,
  '',
];
lines[2] = `> Documento generado automáticamente con \`npm run systems\`. **${total} sistemas** implementados sobre discord.js v14 y MongoDB.`;
lines.push(
  '| Categoría | Sistemas |',
  '| --- | ---: |',
  ...Object.entries(byCategory).map(([cat, list]) => `| ${cat} | ${list.length} |`),
  `| **Total** | **${total}** |`,
  '',
  '---',
  '',
);

for (const [category, list] of Object.entries(byCategory)) {
  lines.push(`## ${category} (${list.length})`, '', '| Sistema | Comando | Descripción | Acceso |', '| --- | --- | --- | --- |');
  for (const cmd of list) {
    const access = cmd.ownerOnly ? 'Dueño' : cmd.staffOnly ? 'Staff' : cmd.perms?.length ? cmd.perms.join(', ') : 'Público';
    lines.push(`| ${cmd.name} | \`/${cmd.name}\` | ${cmd.description.replace(/\|/g, '\\|')} | ${access} |`);
  }
  lines.push('');
}

lines.push('---', '', `*Última actualización: ${new Date().toISOString().slice(0, 10)}*`, '');
fs.writeFileSync(path.join(process.cwd(), 'SYSTEMS.md'), lines.join('\n'));
console.log(`SYSTEMS.md generado con ${total} sistemas en ${Object.keys(byCategory).length} categorías.`);
