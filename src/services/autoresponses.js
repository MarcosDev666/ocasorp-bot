'use strict';
const db = require('../database/models');

const cache = new Map();
const TTL = 60000;

async function get(guildId) {
  const hit = cache.get(guildId);
  if (hit && Date.now() - hit.at < TTL) return hit.data;
  const [responders, commands] = await Promise.all([
    db.AutoResponder.find({ guildId, enabled: true }).lean().catch(() => []),
    db.CustomCommand.find({ guildId }).lean().catch(() => []),
  ]);
  const data = { responders, commands };
  cache.set(guildId, { at: Date.now(), data });
  return data;
}

function invalidate(guildId) {
  if (guildId) cache.delete(guildId);
  else cache.clear();
}

function findResponder(responders, content) {
  const text = String(content || '').toLowerCase();
  return responders.find((r) => (r.exact ? text.trim() === r.trigger.toLowerCase() : text.includes(r.trigger.toLowerCase())));
}

module.exports = { get, invalidate, findResponder };
