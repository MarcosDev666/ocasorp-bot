'use strict';
const { Events } = require('discord.js');
const { sendGoodbye } = require('../services/welcome');

module.exports = {
  name: Events.GuildMemberRemove,
  async run(client, member) {
    await sendGoodbye(member).catch(() => null);
  },
};
