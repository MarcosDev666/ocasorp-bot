'use strict';
const { Schema, model } = require('mongoose');

const shopItemSchema = new Schema({
  guildId: { type: String, required: true, index: true },
  name: { type: String, required: true },
  description: String,
  price: { type: Number, required: true },
  roleId: String,
  stock: { type: Number, default: -1 },
  emoji: String,
  enabled: { type: Boolean, default: true },
}, { timestamps: true });

shopItemSchema.index({ guildId: 1, name: 1 }, { unique: true });

module.exports = model('ShopItem', shopItemSchema);
