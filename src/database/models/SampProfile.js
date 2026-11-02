'use strict';
const { Schema, model } = require('mongoose');

const sampProfileSchema = new Schema({
  guildId: { type: String, required: true, index: true },
  userId: { type: String, required: true, index: true },
  playerName: { type: String, required: true },
  playerId: Number,
  level: { type: Number, default: 1 },
  money: { type: Number, default: 0 },
  bank: { type: Number, default: 0 },
  hours: { type: Number, default: 0 },
  kills: { type: Number, default: 0 },
  deaths: { type: Number, default: 0 },
  faction: String,
  rank: String,
  job: String,
  warns: { type: Number, default: 0 },
  banned: { type: Boolean, default: false },
  verified: { type: Boolean, default: true },
  lastSeen: Date,
}, { timestamps: true });

sampProfileSchema.index({ guildId: 1, userId: 1 }, { unique: true });
sampProfileSchema.index({ guildId: 1, playerName: 1 }, { unique: true });

module.exports = model('SampProfile', sampProfileSchema);
