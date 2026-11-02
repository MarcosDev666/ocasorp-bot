'use strict';
const { Schema, model } = require('mongoose');

const feedbackSchema = new Schema({
  guildId: { type: String, required: true, index: true },
  userId: { type: String, required: true },
  rating: { type: Number, min: 1, max: 5 },
  comment: String,
  area: { type: String, default: 'general' },
}, { timestamps: true });

module.exports = model('Feedback', feedbackSchema);
