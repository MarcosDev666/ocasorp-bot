'use strict';
const { Schema, model } = require('mongoose');

const giveawaySchema = new Schema({
  guildId: { type: String, required: true, index: true },
  channelId: { type: String, required: true },
  messageId: { type: String, required: true, unique: true },
  hostId: { type: String, required: true },
  prize: { type: String, required: true },
  description: String,
  winnersCount: { type: Number, default: 1 },
  endsAt: { type: Date, required: true, index: true },
  ended: { type: Boolean, default: false },
  winnerIds: [String],
  entries: [String],
  requirements: {
    roleId: String,
    level: Number,
    invites: Number,
    booster: Boolean,
  },
}, { timestamps: true });

module.exports = model('Giveaway', giveawaySchema);
