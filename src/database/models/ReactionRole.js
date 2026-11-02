'use strict';
const { Schema, model } = require('mongoose');

const reactionRoleSchema = new Schema({
  guildId: { type: String, required: true, index: true },
  channelId: { type: String, required: true },
  messageId: { type: String, sparse: true },
  panelId: { type: String, unique: true, sparse: true },
  mode: { type: String, enum: ['normal', 'unique', 'verify'], default: 'normal' },
  pairs: [{ emoji: String, roleId: String, label: String }],
  title: String,
  description: String,
}, { timestamps: true });

module.exports = model('ReactionRole', reactionRoleSchema);
