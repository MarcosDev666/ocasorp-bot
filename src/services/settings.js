'use strict';
const db = require('../database/models');

const cache = new Map();
const TTL = 30000;

async function get(guildId, { force = false } = {}) {
  if (!guildId) return null;
  const hit = cache.get(guildId);
  if (!force && hit && Date.now() - hit.at < TTL) return hit.data;
  const data = await db.Guild.get(guildId);
  cache.set(guildId, { at: Date.now(), data });
  return data;
}

function invalidate(guildId) {
  if (guildId) cache.delete(guildId);
  else cache.clear();
}

function set(guildId, data) {
  cache.set(guildId, { at: Date.now(), data });
}

module.exports = { get, invalidate, set, cache };
