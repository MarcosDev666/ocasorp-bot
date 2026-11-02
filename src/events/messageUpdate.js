'use strict';
const { Events, EmbedBuilder } = require('discord.js');
const client = require('../core/client');
const config = require('../config');
const { sendLog } = require('../services/logger');

module.exports = {
  name: Events.MessageUpdate,
  async run(_client, oldMessage, newMessage) {
    if (!newMessage.guild || newMessage.author?.bot) return;
    if (oldMessage.content === newMessage.content) return;
    client.editSnipes.set(newMessage.channelId, {
      before: oldMessage.content || '*(vacío)*',
      after: newMessage.content || '*(vacío)*',
      author: newMessage.author?.tag,
      at: new Date(),
    });
    await sendLog(newMessage.guild, 'messageEdit', new EmbedBuilder().setColor(config.brand.colorWarn)
      .setTitle('Mensaje editado')
      .setDescription(`**Autor:** ${newMessage.author?.tag}\n**Canal:** <#${newMessage.channelId}> · [Ir al mensaje](${newMessage.url})`)
      .addFields(
        { name: 'Antes', value: (oldMessage.content || '*(vacío)*').slice(0, 900) },
        { name: 'Después', value: (newMessage.content || '*(vacío)*').slice(0, 900) },
      ));
  },
};
