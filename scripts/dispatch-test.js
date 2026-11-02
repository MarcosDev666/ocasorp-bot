'use strict';
const assert = require('node:assert');
const path = require('node:path');
process.chdir(path.join(__dirname, '..'));

const registry = require('../src/core/registry');
const db = require('../src/database/models');
const event = require('../src/events/interactionCreate');
const settings = require('../src/services/settings');

// Stubs de base de datos para probar el dispatcher sin MongoDB
db.Guild.get = async () => ({ maintenance: false, save: async () => {} });
db.User.updateOne = async () => ({ acknowledged: true });
settings.cache.clear();

const client = { cooldowns: new Map(), commands: registry.commands };
const baseMember = (perms = true) => ({
  id: 'u1',
  permissions: { has: () => perms },
  roles: { cache: new Map(), highest: { position: 10 } },
});

function makeInteraction(overrides = {}) {
  const interaction = {
    commandName: 'test',
    guildId: '1',
    channelId: '2',
    user: { id: 'u1', tag: 'user#0001' },
    member: baseMember(true),
    guild: {
      id: '1',
      ownerId: 'owner',
      channels: { cache: new Map() },
      members: { me: { id: 'bot', permissions: { has: () => true }, roles: { highest: { position: 99 } } } },
    },
    options: {
      getSubcommand: () => null,
      get: () => null,
      getString: () => null,
      getInteger: () => null,
      getBoolean: () => null,
      getUser: () => null,
      getMember: () => null,
      getChannel: () => null,
      getRole: () => null,
      getNumber: () => null,
      getAttachment: () => null,
      getMentionable: () => null,
      getFocused: () => null,
    },
    deferred: false,
    replied: false,
    last: null,
    isChatInputCommand: () => true,
    isAutocomplete: () => false,
    isButton: () => false,
    isStringSelectMenu: () => false,
    isUserSelectMenu: () => false,
    isRoleSelectMenu: () => false,
    isChannelSelectMenu: () => false,
    isModalSubmit: () => false,
    isRepliable: () => true,
    deferReply: async function deferReply() { this.deferred = true; },
    editReply: async function editReply(payload) { this.last = payload; return payload; },
    reply: async function reply(payload) { this.last = payload; this.replied = true; return payload; },
    followUp: async function followUp(payload) { this.last = payload; return payload; },
    ...overrides,
  };
  return interaction;
}

const results = [];
const check = (name, fn) => { try { fn(); results.push([name, true]); } catch (err) { results.push([name, false, err]); } };

(async () => {
  registry.register({ name: 'test', description: 'Comando de prueba', run: async (ctx) => { await ctx.edit('funcionó'); } }, 'test.js');
  let i = makeInteraction();
  await event.run(client, i);
  check('despacha y responde', () => {
    assert.strictEqual(i.deferred, true);
    assert.ok(i.last.embeds);
  });

  registry.register({ name: 'boom', description: 'Comando que falla', run: async () => { throw new Error('boom'); } }, 'test.js');
  i = makeInteraction({ commandName: 'boom' });
  await event.run(client, i);
  check('captura errores del comando', () => {
    const text = JSON.stringify(i.last);
    assert.ok(text.includes('Ocurrió un error'));
  });

  registry.register({ name: 'secure', description: 'Comando con permisos', perms: ['BanMembers'], run: async (ctx) => ctx.edit('ok') }, 'test.js');
  i = makeInteraction({ commandName: 'secure', member: baseMember(false) });
  await event.run(client, i);
  check('bloquea por permisos faltantes', () => {
    assert.ok(JSON.stringify(i.last).includes('Te faltan permisos'));
  });

  registry.register({ name: 'slow', description: 'Comando con cooldown', cooldown: 60, run: async (ctx) => ctx.edit('ok') }, 'test.js');
  i = makeInteraction({ commandName: 'slow' });
  await event.run(client, i);
  const j = makeInteraction({ commandName: 'slow' });
  await event.run(client, j);
  check('aplica cooldown', () => {
    assert.ok(JSON.stringify(j.last).includes('Esperá'));
  });

  registry.register({ name: 'maint', description: 'Comando en mantenimiento', run: async (ctx) => ctx.edit('ok') }, 'test.js');
  db.Guild.get = async () => ({ maintenance: true, maintenanceMessage: 'En mantenimiento', save: async () => {} });
  settings.cache.clear();
  i = makeInteraction({ commandName: 'maint' });
  await event.run(client, i);
  check('bloquea en mantenimiento', () => {
    assert.ok(JSON.stringify(i.last).includes('mantenimiento'));
  });

  let failed = 0;
  for (const [name, ok, err] of results) {
    if (ok) console.log(`✅ ${name}`);
    else { failed += 1; console.error(`❌ ${name}: ${err.message}`); }
  }
  console.log(`\n${results.length - failed}/${results.length} pruebas de dispatch OK`);
  process.exit(failed ? 1 : 0);
})();
