'use strict';
const { Schema, model } = require('mongoose');

const confessionSchema = new Schema({
  guildId: { type: String, required: true, index: true },
  number: { type: Number, required: true },
  authorHash: String,
  content: { type: String, required: true },
  messageId: String,
  status: { type: String, enum: ['pendiente', 'publicada', 'rechazada'], default: 'pendiente' },
}, { timestamps: true });

module.exports = model('Confession', confessionSchema);
