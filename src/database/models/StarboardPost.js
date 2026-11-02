'use strict';
const { Schema, model } = require('mongoose');

const starboardSchema = new Schema({
  guildId: { type: String, required: true, index: true },
  messageId: { type: String, required: true, unique: true },
  channelId: String,
  authorId: String,
  starboardMessageId: String,
  stars: { type: Number, default: 0 },
  content: String,
});

module.exports = model('StarboardPost', starboardSchema);
