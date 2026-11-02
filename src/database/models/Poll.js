'use strict';
const { Schema, model } = require('mongoose');

const pollSchema = new Schema({
  guildId: { type: String, required: true, index: true },
  channelId: String,
  messageId: { type: String, unique: true, sparse: true },
  authorId: String,
  question: { type: String, required: true },
  options: [{ label: String, emoji: String, votes: [String] }],
  multiple: { type: Boolean, default: false },
  anonymous: { type: Boolean, default: false },
  endsAt: Date,
  ended: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = model('Poll', pollSchema);
