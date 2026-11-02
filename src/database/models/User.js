'use strict';
const { Schema, model } = require('mongoose');

const inventoryItem = new Schema({
  itemId: String,
  name: String,
  quantity: { type: Number, default: 1 },
  acquiredAt: { type: Date, default: Date.now },
}, { _id: false });

const userSchema = new Schema({
  userId: { type: String, required: true, index: true },
  guildId: { type: String, required: true, index: true },
  xp: { type: Number, default: 0 },
  level: { type: Number, default: 0 },
  messages: { type: Number, default: 0 },
  voiceMinutes: { type: Number, default: 0 },
  balance: { type: Number, default: 0 },
  bank: { type: Number, default: 0 },
  inventory: [inventoryItem],
  cooldowns: {
    daily: Date, weekly: Date, work: Date, rob: Date, crime: Date, fish: Date, mine: Date, beg: Date, hunt: Date, interest: Date, gamble: Date, rep: Date,
  },
  rep: { type: Number, default: 0 },
  bio: { type: String, default: '' },
  afk: { reason: String, since: Date },
  birthday: { day: Number, month: Number, year: Number },
  warnings: { type: Number, default: 0 },
  notes: [{ text: String, authorId: String, at: { type: Date, default: Date.now } }],
  stats: {
    modActions: { type: Number, default: 0 },
    ticketsClosed: { type: Number, default: 0 },
    suggestions: { type: Number, default: 0 },
    giveawaysWon: { type: Number, default: 0 },
    commandsUsed: { type: Number, default: 0 },
  },
  lastSeen: Date,
  joinedAt: Date,
}, { timestamps: true });

userSchema.index({ guildId: 1, userId: 1 }, { unique: true });

userSchema.statics.get = async function get(guildId, userId) {
  try {
    return await this.findOneAndUpdate(
      { guildId, userId },
      { $setOnInsert: { guildId, userId } },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );
  } catch (err) {
    if (err?.code === 11000) return this.findOne({ guildId, userId });
    throw err;
  }
};

module.exports = model('User', userSchema);
