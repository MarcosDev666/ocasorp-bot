'use strict';
const { Schema, model } = require('mongoose');

const ticketSchema = new Schema({
  guildId: { type: String, required: true, index: true },
  channelId: { type: String, required: true, unique: true },
  number: { type: Number, required: true },
  userId: { type: String, required: true },
  category: { type: String, default: 'general' },
  subject: String,
  status: { type: String, enum: ['open', 'claimed', 'closed'], default: 'open' },
  priority: { type: String, enum: ['baja', 'normal', 'alta', 'urgente'], default: 'normal' },
  claimedBy: String,
  participants: [String],
  closedBy: String,
  closedAt: Date,
  closeReason: String,
  transcript: String,
  messageCount: { type: Number, default: 1 },
  rating: { type: Number, min: 1, max: 5 },
  feedback: String,
}, { timestamps: true });

ticketSchema.statics.nextNumber = async function nextNumber(guildId) {
  const Guild = require('./Guild');
  const guild = await Guild.get(guildId);
  guild.tickets.counter += 1;
  await guild.save();
  return guild.tickets.counter;
};

module.exports = model('Ticket', ticketSchema);
