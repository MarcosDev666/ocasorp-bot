'use strict';
const { Schema, model } = require('mongoose');

const reportSchema = new Schema({
  guildId: { type: String, required: true, index: true },
  reporterId: { type: String, required: true },
  targetId: { type: String, required: true },
  targetName: String,
  reason: { type: String, required: true },
  evidence: String,
  type: { type: String, enum: ['jugador', 'staff', 'bug', 'apelacion'], default: 'jugador' },
  status: { type: String, enum: ['abierto', 'en_revision', 'resuelto', 'rechazado'], default: 'abierto' },
  handledBy: String,
  resolution: String,
  messageId: String,
  channelId: String,
  threadId: String,
}, { timestamps: true });

module.exports = model('Report', reportSchema);
