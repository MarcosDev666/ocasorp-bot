'use strict';
const { Schema, model } = require('mongoose');

const tempChannelSchema = new Schema({
  guildId: { type: String, required: true, index: true },
  channelId: { type: String, required: true, unique: true },
  ownerId: { type: String, required: true },
  name: String,
  createdAt: { type: Date, default: Date.now },
});

module.exports = model('TempChannel', tempChannelSchema);
