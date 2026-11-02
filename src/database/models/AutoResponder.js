'use strict';
const { Schema, model } = require('mongoose');

const autoResponderSchema = new Schema({
  guildId: { type: String, required: true, index: true },
  trigger: { type: String, required: true },
  response: { type: String, required: true },
  exact: { type: Boolean, default: false },
  reply: { type: Boolean, default: true },
  enabled: { type: Boolean, default: true },
  uses: { type: Number, default: 0 },
}, { timestamps: true });

autoResponderSchema.index({ guildId: 1, trigger: 1 }, { unique: true });

module.exports = model('AutoResponder', autoResponderSchema);
