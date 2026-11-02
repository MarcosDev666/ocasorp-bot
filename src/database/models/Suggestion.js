'use strict';
const { Schema, model } = require('mongoose');

const suggestionSchema = new Schema({
  guildId: { type: String, required: true, index: true },
  messageId: { type: String, index: true },
  channelId: String,
  authorId: { type: String, required: true },
  content: { type: String, required: true },
  status: { type: String, enum: ['pendiente', 'aprobada', 'rechazada', 'implementada'], default: 'pendiente' },
  upvotes: [String],
  downvotes: [String],
  staffResponse: String,
  reviewedBy: String,
}, { timestamps: true });

module.exports = model('Suggestion', suggestionSchema);
