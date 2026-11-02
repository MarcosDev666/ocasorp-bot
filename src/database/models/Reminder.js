'use strict';
const { Schema, model } = require('mongoose');

const reminderSchema = new Schema({
  userId: { type: String, required: true, index: true },
  guildId: String,
  channelId: String,
  text: { type: String, required: true },
  dueAt: { type: Date, required: true, index: true },
  sent: { type: Boolean, default: false },
  messageId: String,
}, { timestamps: true });

module.exports = model('Reminder', reminderSchema);
