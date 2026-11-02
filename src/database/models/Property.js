'use strict';
const { Schema, model } = require('mongoose');

const propertySchema = new Schema({
  guildId: { type: String, required: true, index: true },
  type: { type: String, enum: ['casa', 'negocio', 'vehiculo', 'empresa'], default: 'casa' },
  name: { type: String, required: true },
  ownerId: String,
  ownerName: String,
  price: { type: Number, default: 0 },
  location: String,
  description: String,
  status: { type: String, enum: ['disponible', 'ocupada', 'en_venta', 'embargada'], default: 'disponible' },
  locked: { type: Boolean, default: false },
}, { timestamps: true });

propertySchema.index({ guildId: 1, name: 1 }, { unique: true });

module.exports = model('Property', propertySchema);
