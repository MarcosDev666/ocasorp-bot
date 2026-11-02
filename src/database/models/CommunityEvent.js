'use strict';
const { Schema, model } = require('mongoose');

const eventSchema = new Schema({
  guildId: { type: String, required: true, index: true },
  hostId: { type: String, required: true },
  title: { type: String, required: true },
  description: String,
  location: String,
  startsAt: { type: Date, required: true },
  capacity: { type: Number, default: 0 },
  participants: [String],
  status: { type: String, enum: ['programado', 'en_curso', 'finalizado', 'cancelado'], default: 'programado' },
  messageId: String,
  channelId: String,
  prize: String,
}, { timestamps: true });

module.exports = model('CommunityEvent', eventSchema);
