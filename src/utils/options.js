'use strict';
const { ApplicationCommandOptionType: T } = require('discord.js');

const opt = (type, name, description, required = false, extra = {}) => ({ type, name, description, required, ...extra });
const str = (name, description, required = false, extra = {}) => opt(T.String, name, description, required, extra);
const int = (name, description, required = false, extra = {}) => opt(T.Integer, name, description, required, extra);
const num = (name, description, required = false, extra = {}) => opt(T.Number, name, description, required, extra);
const bool = (name, description, required = false, extra = {}) => opt(T.Boolean, name, description, required, extra);
const user = (name, description, required = false, extra = {}) => opt(T.User, name, description, required, extra);
const member = (name, description, required = false, extra = {}) => opt(T.User, name, description, required, extra);
const channel = (name, description, required = false, extra = {}) => opt(T.Channel, name, description, required, extra);
const role = (name, description, required = false, extra = {}) => opt(T.Role, name, description, required, extra);
const attachment = (name, description, required = false, extra = {}) => opt(T.Attachment, name, description, required, extra);
const mentionable = (name, description, required = false, extra = {}) => opt(T.Mentionable, name, description, required, extra);
const choices = (...pairs) => pairs.map(([name, value]) => ({ name, value }));
const autocomplete = () => ({ autocomplete: true });

module.exports = { T, opt, str, int, num, bool, user, member, channel, role, attachment, mentionable, choices, autocomplete };
