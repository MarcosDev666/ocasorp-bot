'use strict';
const { Schema, model } = require('mongoose');

const applicationSchema = new Schema({
  guildId: { type: String, required: true, index: true },
  userId: { type: String, required: true, index: true },
  type: { type: String, required: true },
  answers: [{ question: String, answer: String }],
  status: { type: String, enum: ['pendiente', 'en_revision', 'aceptada', 'rechazada'], default: 'pendiente' },
  reviewedBy: String,
  reviewNote: String,
  messageId: String,
  channelId: String,
  threadId: String,
}, { timestamps: true });

applicationSchema.index({ guildId: 1, userId: 1, type: 1, status: 1 });

module.exports = model('Application', applicationSchema);
