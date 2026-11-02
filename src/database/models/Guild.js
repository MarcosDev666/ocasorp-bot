'use strict';
const { Schema, model } = require('mongoose');

const welcome = new Schema({
  enabled: { type: Boolean, default: false },
  channelId: String,
  title: { type: String, default: '¡Bienvenido/a a Ocaso Roleplay!' },
  message: { type: String, default: '¡Hola {user}! Te damos la bienvenida a **{server}**. Ya somos **{memberCount}** miembros.' },
  embed: { type: Boolean, default: true },
  color: String,
  image: String,
  thumbnail: String,
  dm: { type: Boolean, default: false },
  dmMessage: { type: String, default: '¡Gracias por unirte a Ocaso Roleplay! IP: {ip}:{port}' },
  roleIds: [String],
  deleteAfter: { type: Number, default: 0 },
}, { _id: false });

const goodbye = new Schema({
  enabled: { type: Boolean, default: false },
  channelId: String,
  title: { type: String, default: 'Hasta pronto...' },
  message: { type: String, default: '**{user}** abandonó el servidor. Ahora somos **{memberCount}** miembros.' },
  embed: { type: Boolean, default: true },
  color: String,
  image: String,
  deleteAfter: { type: Number, default: 0 },
}, { _id: false });

const guildSchema = new Schema({
  guildId: { type: String, required: true, unique: true, index: true },
  locale: { type: String, default: 'es' },
  setupComplete: { type: Boolean, default: false },
  welcome: { type: welcome, default: () => ({}) },
  goodbye: { type: goodbye, default: () => ({}) },
  autoroleIds: [String],
  boost: { enabled: { type: Boolean, default: false }, channelId: String, message: String, roleId: String },
  verification: {
    enabled: { type: Boolean, default: false },
    roleId: String,
    unverifiedRoleId: String,
    channelId: String,
    message: { type: String, default: 'Presioná el botón para verificarte y acceder al servidor.' },
    title: { type: String, default: 'Verificación de Ocaso Roleplay' },
    buttonLabel: { type: String, default: 'Verificarme' },
  },
  logs: { type: Map, of: String, default: () => new Map() },
  mod: {
    logChannelId: String,
    muteRoleId: String,
    staffRoleIds: [String],
    maxWarnings: { type: Number, default: 3 },
    warnAction: { type: String, default: 'timeout' },
    dmOnSanction: { type: Boolean, default: true },
  },
  automod: {
    enabled: { type: Boolean, default: false },
    logChannelId: String,
    action: { type: String, default: 'delete' },
    spam: { enabled: { type: Boolean, default: true }, threshold: { type: Number, default: 6 }, window: { type: Number, default: 7000 } },
    links: { enabled: { type: Boolean, default: false }, allow: [String] },
    invites: { enabled: { type: Boolean, default: true } },
    words: { enabled: { type: Boolean, default: true }, list: [String] },
    caps: { enabled: { type: Boolean, default: true }, percent: { type: Number, default: 70 }, minLength: { type: Number, default: 12 } },
    mentions: { enabled: { type: Boolean, default: true }, max: { type: Number, default: 6 } },
    emojis: { enabled: { type: Boolean, default: true }, max: { type: Number, default: 12 } },
    flood: { enabled: { type: Boolean, default: true }, max: { type: Number, default: 5 } },
    phishing: { enabled: { type: Boolean, default: true } },
    raid: { enabled: { type: Boolean, default: true }, joins: { type: Number, default: 10 }, window: { type: Number, default: 30000 } },
    exemptChannels: [String],
    exemptRoles: [String],
    exemptUsers: [String],
    strikes: { warn: { type: Number, default: 3 }, timeout: { type: Number, default: 5 }, kick: { type: Number, default: 7 }, ban: { type: Number, default: 10 } },
  },
  tickets: {
    enabled: { type: Boolean, default: false },
    panelChannelId: String,
    panelMessageId: String,
    categoryId: String,
    logChannelId: String,
    staffRoleIds: [String],
    counter: { type: Number, default: 0 },
    maxOpenPerUser: { type: Number, default: 2 },
    message: { type: String, default: 'Elegí una categoría para abrir tu ticket. Nuestro staff te va a atender lo antes posible.' },
    title: { type: String, default: 'Centro de ayuda • Ocaso Roleplay' },
    categories: [{
      key: String,
      label: String,
      emoji: String,
      description: String,
      categoryId: String,
      staffRoleIds: [String],
    }],
    transcriptChannelId: String,
  },
  levels: {
    enabled: { type: Boolean, default: true },
    channelId: String,
    multiplier: { type: Number, default: 1 },
    messageXp: { type: Number, default: 15 },
    voiceXp: { type: Number, default: 8 },
    rewards: [{ level: Number, roleId: String }],
    announce: { type: Boolean, default: true },
  },
  economy: {
    enabled: { type: Boolean, default: true },
    currency: { type: String, default: 'Ocaso Coins' },
    symbol: { type: String, default: '🪙' },
    startBalance: { type: Number, default: 500 },
    daily: { type: Number, default: 500 },
    weekly: { type: Number, default: 2500 },
    workMin: { type: Number, default: 150 },
    workMax: { type: Number, default: 700 },
    interest: { type: Number, default: 1 },
  },
  counting: { enabled: { type: Boolean, default: false }, channelId: String, current: { type: Number, default: 0 }, lastUserId: String, best: { type: Number, default: 0 } },
  starboard: { enabled: { type: Boolean, default: false }, channelId: String, threshold: { type: Number, default: 3 } },
  suggestions: { enabled: { type: Boolean, default: false }, channelId: String },
  reports: { enabled: { type: Boolean, default: false }, channelId: String, roleIds: [String] },
  applications: {
    enabled: { type: Boolean, default: false },
    channelId: String,
    roleIds: [String],
    types: [{ key: String, label: String, description: String, questions: [String], roleId: String }],
    reviewChannelId: String,
  },
  appeals: { enabled: { type: Boolean, default: false }, channelId: String, roleIds: [String] },
  birthdays: { enabled: { type: Boolean, default: false }, channelId: String },
  confessions: { enabled: { type: Boolean, default: false }, channelId: String },
  welcomeCard: { enabled: { type: Boolean, default: false }, background: String },
  tempVoice: { enabled: { type: Boolean, default: false }, hubChannelId: String, categoryId: String, defaultLimit: { type: Number, default: 0 } },
  sticky: { type: Map, of: String, default: () => new Map() },
  counters: [{ channelId: String, type: String, format: String }],
  customPrefix: { type: String, default: '!' },
  maintenance: { type: Boolean, default: false },
  maintenanceMessage: String,
  giveawayDefaults: { winners: { type: Number, default: 1 }, duration: { type: Number, default: 3600000 }, requirements: { type: Object, default: {} } },
  samp: { host: String, port: Number },
}, { timestamps: true, minimize: false });

guildSchema.statics.get = async function get(guildId) {
  try {
    return await this.findOneAndUpdate({ guildId }, { $setOnInsert: { guildId } }, { new: true, upsert: true, setDefaultsOnInsert: true });
  } catch (err) {
    if (err?.code === 11000) return this.findOne({ guildId });
    throw err;
  }
};

module.exports = model('Guild', guildSchema);
