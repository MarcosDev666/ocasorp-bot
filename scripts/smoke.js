'use strict';
const dgram = require('node:dgram');
const assert = require('node:assert');
const path = require('node:path');

process.chdir(path.join(__dirname, '..'));

const results = [];
function test(name, fn) {
  return Promise.resolve()
    .then(fn)
    .then(() => results.push({ name, ok: true }))
    .catch((err) => results.push({ name, ok: false, err }));
}

function fakeMessage(content, extra = {}) {
  return {
    content,
    guildId: '1',
    channelId: '2',
    attachments: new Map(),
    mentions: { users: new Map(), roles: new Map() },
    member: { permissions: { has: () => false }, roles: { cache: new Map() } },
    author: { id: '3', bot: false },
    ...extra,
  };
}

(async () => {
  const { parseDuration, duration, progressBar, chunk } = require('../src/utils/format');
  const { applyTemplate } = require('../src/services/welcome');
  const { inspect } = require('../src/services/automod');
  const { giveawayEmbed } = require('../src/services/giveaways');
  const { buildTranscript } = require('../src/services/transcript');
  const samp = require('../src/services/samp');
  const { xpForLevel, levelFromXp, xpIntoLevel } = require('../src/services/levels');

  await test('format: duraciones', () => {
    assert.strictEqual(parseDuration('1h'), 3600000);
    assert.strictEqual(parseDuration('2h 30m'), 9000000);
    assert.strictEqual(parseDuration('7d'), 604800000);
    assert.strictEqual(duration(3661000), '1h 1m 1s');
    assert.strictEqual(progressBar(5, 10, 10), '▰▰▰▰▰▱▱▱▱▱');
    assert.strictEqual(chunk([1, 2, 3, 4, 5], 2).length, 3);
  });

  await test('niveles: matemática de XP', () => {
    assert.strictEqual(xpForLevel(0), 100);
    assert.strictEqual(xpForLevel(1), 155);
    assert.strictEqual(levelFromXp(0), 0);
    assert.strictEqual(levelFromXp(100), 1);
    assert.strictEqual(levelFromXp(254), 1);
    assert.strictEqual(levelFromXp(255), 2);
    assert.strictEqual(xpIntoLevel(120), 20);
  });

  await test('bienvenida: plantillas', () => {
    const member = { id: '123', user: { username: 'Ocaso', tag: 'Ocaso#0001', createdTimestamp: Date.now() }, displayName: 'Ocaso', guild: { name: 'Ocaso Roleplay', memberCount: 42 } };
    const text = applyTemplate('Hola {user} de {server}, sos el #{memberCount} ({ip})', member, { ip: '127.0.0.1' });
    assert.strictEqual(text, 'Hola <@123> de Ocaso Roleplay, sos el #42 (127.0.0.1)');
  });

  await test('automod: detecta invitaciones, spam y palabras', () => {
    const settings = {
      automod: {
        enabled: true, action: 'delete',
        invites: { enabled: true }, links: { enabled: false, allow: [] },
        words: { enabled: true, list: ['malapalabra'] },
        caps: { enabled: false, percent: 70, minLength: 12 }, mentions: { enabled: false, max: 5 },
        emojis: { enabled: false, max: 10 }, flood: { enabled: false, max: 3 },
        phishing: { enabled: true }, spam: { enabled: false, threshold: 5, window: 7000 },
        exemptChannels: [], exemptRoles: [], exemptUsers: [],
      },
    };
    assert.deepStrictEqual(inspect(fakeMessage('entrá a discord.gg/ocaso'), settings), ['invites']);
    assert.deepStrictEqual(inspect(fakeMessage('decime malapalabra'), settings), ['words']);
    assert.deepStrictEqual(inspect(fakeMessage('mensaje normal'), settings), []);
    assert.deepStrictEqual(inspect(fakeMessage('regalamos free nitro click aquí'), settings), ['phishing']);
  });

  await test('sorteos: embed con requisitos', () => {
    const giveaway = { prize: 'VIP', description: 'Un mes gratis', winnersCount: 2, endsAt: new Date(Date.now() + 60000), ended: false, entries: ['1', '2'], hostId: '9', requirements: { roleId: '5', level: 3 }, winnerIds: [] };
    const embed = giveawayEmbed(giveaway).toJSON();
    assert.strictEqual(embed.title, '🎉 VIP');
    assert.ok(embed.fields.some((f) => f.name === 'Requisitos' && f.value.includes('<@&5>')));
  });

  await test('transcripción: genera HTML y texto', async () => {
    const fakeChannel = {
      name: 'ticket-0001', guildId: '1',
      messages: {
        fetch: async () => new Map([
          ['1', { id: '1', content: 'hola', createdTimestamp: Date.now() - 5000, author: { tag: 'User#1', id: '1', displayAvatarURL: () => '' }, attachments: new Map(), embeds: [] }],
          ['2', { id: '2', content: 'qué tal', createdTimestamp: Date.now(), author: { tag: 'Staff#1', id: '2', displayAvatarURL: () => '' }, attachments: new Map(), embeds: [] }],
        ]),
      },
    };
    const data = await buildTranscript(fakeChannel, 10);
    assert.strictEqual(data.count, 2);
    assert.ok(data.html.includes('ticket-0001'));
    assert.ok(data.text.includes('hola'));
  });

  await test('samp: consulta UDP real contra un servidor simulado', async () => {
    const server = dgram.createSocket('udp4');
    await new Promise((resolve) => server.bind(0, '127.0.0.1', resolve));
    const port = server.address().port;
    server.on('message', (msg, rinfo) => {
      const opcode = msg.toString('ascii', 10, 11);
      const ip = [...msg.subarray(4, 8)];
      const hostname = Buffer.from('Ocaso Roleplay Test', 'utf8');
      const gamemode = Buffer.from('Ocaso RP v1', 'utf8');
      const language = Buffer.from('Español', 'utf8');
      const header = Buffer.alloc(11);
      header.write('SAMP', 0, 'ascii');
      ip.forEach((n, i) => header.writeUInt8(n, 4 + i));
      header.writeUInt16LE(Number(msg.readUInt16LE(8)), 8);
      header.write(opcode, 10, 'ascii');
      let payload;
      if (opcode === 'i') {
        const str = (b) => { const l = Buffer.alloc(4); l.writeUInt32LE(b.length); return Buffer.concat([l, b]); };
        payload = Buffer.concat([Buffer.from([0]), Buffer.from([12, 0]), Buffer.from([100, 0]), str(hostname), str(gamemode), str(language)]);
      } else if (opcode === 'd') {
        const name = Buffer.concat([Buffer.from([5]), Buffer.from('Ocaso')]);
        const score = Buffer.alloc(4); score.writeInt32LE(50);
        const ping = Buffer.alloc(4); ping.writeInt32LE(30);
        payload = Buffer.concat([Buffer.from([1, 0]), Buffer.from([0]), name, score, ping]);
      } else {
        payload = Buffer.from([0, 0]);
      }
      server.send(Buffer.concat([header, payload]), rinfo.port, rinfo.address);
    });
    try {
      const info = await samp.getInfo({ host: '127.0.0.1', port, timeout: 2000 });
      assert.strictEqual(info.hostname, 'Ocaso Roleplay Test');
      assert.strictEqual(info.players, 12);
      assert.strictEqual(info.maxPlayers, 100);
      assert.strictEqual(info.passworded, false);
      assert.strictEqual(info.gamemode, 'Ocaso RP v1');
      const players = await samp.getPlayers({ host: '127.0.0.1', port, timeout: 2000 });
      assert.strictEqual(players.length, 1);
      assert.strictEqual(players[0].name, 'Ocaso');
      assert.strictEqual(players[0].score, 50);
      const online = await samp.isOnline({ host: '127.0.0.1', port, timeout: 2000 });
      assert.strictEqual(online, true);
      const offline = await samp.isOnline({ host: '127.0.0.1', port: 1, timeout: 300 });
      assert.strictEqual(offline, false);
    } finally {
      server.close();
    }
  });

  await test('samp: valida IP', async () => {
    await assert.rejects(() => samp.getInfo({ host: 'no-es-una-ip', port: 7777, timeout: 300 }));
  });

  let failed = 0;
  for (const r of results) {
    if (r.ok) console.log(`✅ ${r.name}`);
    else { failed += 1; console.error(`❌ ${r.name}\n   ${r.err?.stack || r.err}`); }
  }
  console.log(`\n${results.length - failed}/${results.length} pruebas OK`);
  process.exit(failed ? 1 : 0);
})();
