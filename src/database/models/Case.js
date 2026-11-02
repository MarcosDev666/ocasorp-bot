'use strict';
const { Schema, model } = require('mongoose');

const caseSchema = new Schema({
  guildId: { type: String, required: true, index: true },
  caseId: { type: Number, required: true },
  type: { type: String, required: true },
  userId: { type: String, required: true, index: true },
  moderatorId: { type: String, required: true },
  reason: { type: String, default: 'Sin razón especificada' },
  duration: Number,
  expiresAt: Date,
  active: { type: Boolean, default: true },
  evidence: String,
  notes: String,
  removedBy: String,
  removedAt: Date,
}, { timestamps: true });

caseSchema.index({ guildId: 1, caseId: 1 }, { unique: true });
caseSchema.index({ guildId: 1, userId: 1, type: 1, active: 1 });

caseSchema.statics.nextId = async function nextId(guildId) {
  const last = await this.findOne({ guildId }).sort({ caseId: -1 }).lean();
  return (last?.caseId || 0) + 1;
};

module.exports = model('Case', caseSchema);
