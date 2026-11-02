'use strict';
const { Schema, model } = require('mongoose');

const factionSchema = new Schema({
  guildId: { type: String, required: true, index: true },
  name: { type: String, required: true },
  tag: String,
  type: { type: String, enum: ['legal', 'ilegal', 'civil', 'staff'], default: 'civil' },
  description: String,
  color: String,
  leaderId: String,
  roleId: String,
  slots: { type: Number, default: 0 },
  members: [{ userId: String, playerName: String, rank: String, joinedAt: { type: Date, default: Date.now } }],
  active: { type: Boolean, default: true },
}, { timestamps: true });

factionSchema.index({ guildId: 1, name: 1 }, { unique: true });

module.exports = model('Faction', factionSchema);
