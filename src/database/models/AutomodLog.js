'use strict';
const { Schema, model } = require('mongoose');

const automodLogSchema = new Schema({
  guildId: { type: String, required: true, index: true },
  userId: String,
  channelId: String,
  type: String,
  content: String,
  action: String,
  messageId: String,
  createdAt: { type: Date, default: Date.now, index: true },
});

module.exports = model('AutomodLog', automodLogSchema);
