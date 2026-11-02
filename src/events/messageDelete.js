'use strict';
const { Events, EmbedBuilder } = require('discord.js');
const client = require('../core/client');
const config = require('../config');
const { sendLog } = require('../services/logger');

module.exports = {
  name: Events.MessageDelete,
  async run(_client, message) {
    if (!message.guild || message.author?.bot) return;
    client.snipes.set(message.channelId, {
      content: message.content || '*(sin contenido)*',
      author: message.author?.tag || 'Desconocido',
      authorId: message.author?.id,
      avatar: message.author?.displayAvatarURL?.() || null,
      attachments: [...message.attachments.values()].map((a) => a.url),
      createdAt: new Date(),
    });
    await sendLog(message.guild, 'messageDelete', new EmbedBuilder().setColor(config.brand.colorError)
      .setTitle('Mensaje eliminado')
      .setDescription(`**Autor:** ${message.author?.tag || 'Desconocido'} (${message.author?.id || '?'})\n**Canal:** <#${message.channelId}>`)
      .addFields({ name: 'Contenido', value: (message.content || '*(sin contenido)*').slice(0, 1000) }));
  },
};
