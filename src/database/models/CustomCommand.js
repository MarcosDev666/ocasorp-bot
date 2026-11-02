'use strict';
const { Schema, model } = require('mongoose');

const customCommandSchema = new Schema({
  guildId: { type: String, required: true, index: true },
  name: { type: String, required: true },
  response: { type: String, required: true },
  embed: { type: Boolean, default: false },
  authorId: String,
  uses: { type: Number, default: 0 },
}, { timestamps: true });

customCommandSchema.index({ guildId: 1, name: 1 }, { unique: true });

module.exports = model('CustomCommand', customCommandSchema);
