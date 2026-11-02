'use strict';
const { Client, GatewayIntentBits, Partials, Collection } = require('discord.js');
const config = require('../config');

const intents = [
  GatewayIntentBits.Guilds,
  GatewayIntentBits.GuildMembers,
  GatewayIntentBits.GuildModeration,
  GatewayIntentBits.GuildMessages,
  GatewayIntentBits.MessageContent,
  GatewayIntentBits.GuildMessageReactions,
  GatewayIntentBits.GuildVoiceStates,
  GatewayIntentBits.GuildInvites,
  GatewayIntentBits.GuildEmojisAndStickers,
  GatewayIntentBits.GuildWebhooks,
  GatewayIntentBits.DirectMessages,
  GatewayIntentBits.DirectMessageReactions,
];
if (process.env.USE_PRESENCE_INTENT === 'true') intents.push(GatewayIntentBits.GuildPresences);

const client = new Client({
  intents,
  partials: [Partials.Channel, Partials.GuildMember, Partials.Message, Partials.Reaction, Partials.User, Partials.GuildScheduledEvent],
  allowedMentions: { parse: ['users'], repliedUser: false },
  presence: { status: 'online', activities: [{ name: 'Ocaso Roleplay • SA-MP', type: 3 }] },
});

client.commands = new Collection();
client.cooldowns = new Collection();
client.snipes = new Map();
client.editSnipes = new Map();
client.startedAt = Date.now();
client.config = config;

module.exports = client;
