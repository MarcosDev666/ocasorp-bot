'use strict';
const dgram = require('node:dgram');
const config = require('../config');

const OPCODES = { INFO: 'i', DETAILED: 'd', RULES: 'r', CLIENTS: 'c', RCON: 'x' };

function readString(buf, offset) {
  const len = buf.readUInt32LE(offset);
  const value = buf.toString('utf8', offset + 4, offset + 4 + len);
  return { value, offset: offset + 4 + len };
}
function readPascal(buf, offset) {
  const len = buf.readUInt8(offset);
  return { value: buf.toString('utf8', offset + 1, offset + 1 + len), offset: offset + 1 + len };
}
function readPascalShort(buf, offset) {
  const len = buf.readUInt16LE(offset);
  return { value: buf.toString('utf8', offset + 2, offset + 2 + len), offset: offset + 2 + len };
}

function query({ host = config.brand.samp.host, port = config.brand.samp.port, opcode = OPCODES.INFO, timeout = 2500 } = {}) {
  return new Promise((resolve, reject) => {
    if (!host || !port) return reject(new Error('Host/puerto de SA-MP no configurado'));
    const [a, b, c, d] = String(host).split('.').map(Number);
    if (![a, b, c, d].every((n) => Number.isInteger(n) && n >= 0 && n <= 255)) {
      return reject(new Error('La IP del servidor SA-MP no es válida (formato IPv4)'));
    }
    const socket = dgram.createSocket('udp4');
    const packet = Buffer.alloc(11);
    packet.write('SAMP', 0, 'ascii');
    packet.writeUInt8(a, 4); packet.writeUInt8(b, 5); packet.writeUInt8(c, 6); packet.writeUInt8(d, 7);
    packet.writeUInt16LE(Number(port), 8);
    packet.write(opcode, 10, 'ascii');

    let finished = false;
    const done = (err, data) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      try { socket.close(); } catch { /* ignore */ }
      if (err) reject(err); else resolve(data);
    };
    const timer = setTimeout(() => done(new Error('El servidor SA-MP no respondió a tiempo (¿está online?)')), timeout);

    socket.once('error', (err) => done(err));
    socket.once('message', (msg) => {
      if (msg.length < 11 || msg.toString('ascii', 0, 4) !== 'SAMP') return done(new Error('Respuesta inválida del servidor'));
      try {
        let offset = 11;
        if (opcode === OPCODES.INFO) {
          const passworded = msg.readUInt8(offset) === 1; offset += 1;
          const players = msg.readUInt16LE(offset); offset += 2;
          const maxPlayers = msg.readUInt16LE(offset); offset += 2;
          const hostname = readString(msg, offset); offset = hostname.offset;
          const gamemode = readString(msg, offset); offset = gamemode.offset;
          const language = readString(msg, offset);
          return done(null, { passworded, players, maxPlayers, hostname: hostname.value, gamemode: gamemode.value, language: language.value, host, port });
        }
        if (opcode === OPCODES.DETAILED) {
          const count = msg.readUInt16LE(offset); offset += 2;
          const players = [];
          for (let i = 0; i < count && offset < msg.length; i += 1) {
            const id = msg.readUInt8(offset); offset += 1;
            const name = readPascal(msg, offset); offset = name.offset;
            const score = msg.readInt32LE(offset); offset += 4;
            const ping = msg.readInt32LE(offset); offset += 4;
            players.push({ id, name: name.value, score, ping });
          }
          return done(null, players);
        }
        if (opcode === OPCODES.RULES) {
          const count = msg.readUInt16LE(offset); offset += 2;
          const rules = {};
          for (let i = 0; i < count && offset < msg.length; i += 1) {
            const key = readPascal(msg, offset); offset = key.offset;
            const val = readPascal(msg, offset); offset = val.offset;
            rules[key.value] = val.value;
          }
          return done(null, rules);
        }
        if (opcode === OPCODES.CLIENTS) {
          const count = msg.readUInt16LE(offset); offset += 2;
          const clients = [];
          for (let i = 0; i < count && offset < msg.length; i += 1) {
            const id = msg.readUInt8(offset); offset += 1;
            const name = readPascal(msg, offset); offset = name.offset;
            const ping = msg.readInt32LE(offset); offset += 4;
            const version = readPascal(msg, offset); offset = version.offset;
            clients.push({ id, name: name.value, ping, version: version.value });
          }
          return done(null, clients);
        }
        return done(new Error('Opcode no soportado'));
      } catch (err) {
        return done(new Error(`No se pudo interpretar la respuesta: ${err.message}`));
      }
    });
    socket.send(packet, 0, packet.length, Number(port), host, (err) => { if (err) done(err); });
  });
}

const getInfo = (opts) => query({ ...opts, opcode: OPCODES.INFO });
const getPlayers = (opts) => query({ ...opts, opcode: OPCODES.DETAILED });
const getRules = (opts) => query({ ...opts, opcode: OPCODES.RULES });
const getClients = (opts) => query({ ...opts, opcode: OPCODES.CLIENTS });
async function isOnline(opts) {
  try { await getInfo(opts); return true; } catch { return false; }
}

module.exports = { query, getInfo, getPlayers, getRules, getClients, isOnline, OPCODES, readPascalShort };
