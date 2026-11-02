'use strict';
const {
  ChannelType, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle,
  StringSelectMenuBuilder,
} = require('discord.js');
const config = require('../config');
const db = require('../database/models');
const { saveTranscript } = require('./transcript');
const { sendLog } = require('./logger');

const PRIORITY_COLORS = { baja: 0x95a5a6, normal: 0x3498db, alta: 0xf39c12, urgente: 0xe74c3c };
const PRIORITY_EMOJI = { baja: '🟢', normal: '🔵', alta: '🟠', urgente: '🔴' };

async function createTicket(guild, user, categoryKey, subject) {
  const settings = await db.Guild.get(guild.id);
  if (!settings.tickets?.enabled) throw new Error('El sistema de tickets está desactivado.');
  const open = await db.Ticket.countDocuments({ guildId: guild.id, userId: user.id, status: { $ne: 'closed' } });
  if (open >= (settings.tickets.maxOpenPerUser || 2)) throw new Error(`Ya tenés ${open} ticket(s) abierto(s). Cerrá uno antes de abrir otro.`);
  const category = (settings.tickets.categories || []).find((c) => c.key === categoryKey) || (settings.tickets.categories || [])[0];
  if (!category) throw new Error('No hay categorías de tickets configuradas. Un administrador debe crearlas con `/ticket categoria`.');
  const exists = guild.channels.cache.find((c) => c.topic?.includes(`ticket:${user.id}`) && c.parentId === (category.categoryId || settings.tickets.categoryId));
  if (exists) throw new Error(`Ya tenés un ticket abierto: <#${exists.id}>`);

  const number = await db.Ticket.nextNumber(guild.id);
  const staffRoles = [...new Set([...(settings.tickets.staffRoleIds || []), ...(category.staffRoleIds || []), ...(settings.mod.staffRoleIds || [])])].filter(Boolean);
  const overwrites = [
    { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
    { id: user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.AttachFiles, PermissionFlagsBits.EmbedLinks] },
    { id: guild.members.me.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageChannels, PermissionFlagsBits.ManageMessages, PermissionFlagsBits.AttachFiles] },
  ];
  for (const roleId of staffRoles) {
    overwrites.push({ id: roleId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageMessages, PermissionFlagsBits.AttachFiles] });
  }
  const channelName = `ticket-${String(number).padStart(4, '0')}`;
  const channel = await guild.channels.create({
    name: channelName,
    type: ChannelType.GuildText,
    parent: category.categoryId || settings.tickets.categoryId || null,
    topic: `ticket:${user.id} | Ticket #${number} | ${category.label} | ${subject || 'Sin asunto'}`,
    permissionOverwrites: overwrites,
  });

  const ticket = await db.Ticket.create({
    guildId: guild.id, channelId: channel.id, number, userId: user.id,
    category: category.key, subject: subject || 'Sin asunto', participants: [user.id],
  });

  const embed = new EmbedBuilder()
    .setColor(config.brand.color)
    .setTitle(`${category.emoji || '🎫'} Ticket #${number} • ${category.label}`)
    .setDescription(`Hola ${user}, gracias por contactarte con el staff de **${guild.name}**.\n${subject ? `**Asunto:** ${subject}\n` : ''}\nUn miembro del equipo te va a responder lo antes posible. Mientras esperás, podés dejar toda la información relevante (capturas, IDs, horarios).`)
    .addFields({ name: 'Prioridad', value: `${PRIORITY_EMOJI.normal} Normal`, inline: true }, { name: 'Estado', value: '🟡 Abierto', inline: true })
    .setFooter({ text: `Ocaso Roleplay • Ticket #${number}` })
    .setTimestamp();

  const buttons = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('ticket:claim').setLabel('Reclamar').setEmoji('🙋').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('ticket:add').setLabel('Añadir').setEmoji('➕').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('ticket:priority').setLabel('Prioridad').setEmoji('⚡').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('ticket:close').setLabel('Cerrar').setEmoji('🔒').setStyle(ButtonStyle.Danger),
  );
  const staffMention = staffRoles.length ? staffRoles.map((r) => `<@&${r}>`).join(' ') : '';
  await channel.send({ content: `${user} ${staffMention}`.trim(), embeds: [embed], components: [buttons] });

  await sendLog(guild, 'ticket', new EmbedBuilder().setColor(config.brand.colorOk).setTitle('Ticket abierto').addFields(
    { name: 'Ticket', value: `#${ticket.number} (<#${channel.id}>)`, inline: true },
    { name: 'Usuario', value: `${user.tag} (${user.id})`, inline: true },
    { name: 'Categoría', value: category.label, inline: true },
  ));
  return { ticket, channel, category };
}

async function closeTicket(channel, closer, reason = 'Sin motivo especificado', { deleteAfter = 5 } = {}) {
  const ticket = await db.Ticket.findOne({ channelId: channel.id });
  if (!ticket) throw new Error('Este canal no está registrado como ticket.');
  if (ticket.status === 'closed') throw new Error('El ticket ya está cerrado.');
  const settings = await db.Guild.get(channel.guildId);
  const data = await saveTranscript(channel);

  ticket.status = 'closed';
  ticket.closedBy = closer.id;
  ticket.closedAt = new Date();
  ticket.closeReason = reason;
  ticket.transcript = data.file;
  await ticket.save();

  const summary = new EmbedBuilder()
    .setColor(config.brand.colorError)
    .setTitle(`🎫 Ticket #${ticket.number} cerrado`)
    .addFields(
      { name: 'Abierto por', value: `<@${ticket.userId}>`, inline: true },
      { name: 'Cerrado por', value: `${closer.tag}`, inline: true },
      { name: 'Motivo', value: reason, inline: true },
      { name: 'Mensajes', value: String(data.count), inline: true },
    );

  const logChannelId = settings.tickets.logChannelId || settings.tickets.transcriptChannelId || settings.mod.logChannelId;
  if (logChannelId) {
    const logChannel = channel.guild.channels.cache.get(logChannelId) || await channel.guild.channels.fetch(logChannelId).catch(() => null);
    if (logChannel?.isTextBased()) {
      await logChannel.send({ embeds: [summary], files: [{ attachment: data.file, name: data.fileName }] }).catch(() => null);
    }
  }
  await sendLog(channel.guild, 'ticket', summary);

  const closedEmbed = new EmbedBuilder().setColor(config.brand.colorError).setDescription(`🔒 Ticket cerrado por ${closer}.\n**Motivo:** ${reason}\n\nEste canal se eliminará en ${deleteAfter} segundos. Se guardó una transcripción.`);
  await channel.send({ embeds: [closedEmbed] }).catch(() => null);

  try {
    const owner = await channel.guild.members.fetch(ticket.userId);
    const dm = new EmbedBuilder().setColor(config.brand.color)
      .setTitle(`Ticket #${ticket.number} cerrado`)
      .setDescription(`Tu ticket en **${channel.guild.name}** fue cerrado por **${closer.tag || closer.user?.tag || 'Staff'}**.\n**Motivo:** ${reason}\n\n¿Cómo calificás la atención recibida?`)
      .setFooter({ text: 'Ocaso Roleplay • Gracias por tu feedback' });
    const row = new ActionRowBuilder().addComponents([1, 2, 3, 4, 5].map((n) => new ButtonBuilder().setCustomId(`ticket:rate:${ticket._id}:${n}`).setLabel(`${'⭐'.repeat(n)}`).setStyle(ButtonStyle.Secondary)));
    await owner.send({ embeds: [dm], components: [row] }).catch(() => null);
  } catch { /* ignore */ }

  if (deleteAfter > 0) {
    setTimeout(() => channel.delete(`Ticket #${ticket.number} cerrado`).catch(() => null), deleteAfter * 1000);
  }
  return { ticket, transcript: data };
}

function panelPayload(settings) {
  const cats = settings.tickets.categories || [];
  const embed = new EmbedBuilder()
    .setColor(config.brand.color)
    .setTitle(settings.tickets.title || 'Centro de ayuda • Ocaso Roleplay')
    .setDescription(settings.tickets.message || 'Elegí una categoría para abrir tu ticket.')
    .addFields({ name: 'Categorías disponibles', value: cats.length ? cats.map((c) => `${c.emoji || '🎫'} **${c.label}** — ${c.description || 'Sin descripción'}`).join('\n') : 'Sin categorías configuradas' })
    .setFooter({ text: 'Ocaso Roleplay • Soporte' })
    .setTimestamp();
  const components = cats.length
    ? [new ActionRowBuilder().addComponents(new StringSelectMenuBuilder().setCustomId('ticket:open').setPlaceholder('Seleccioná una categoría').addOptions(cats.map((c) => ({ label: c.label, value: c.key, description: (c.description || '').slice(0, 100), emoji: c.emoji || undefined }))))]
    : [];
  return { embeds: [embed], components };
}

async function addUserToTicket(channel, userId) {
  await channel.permissionOverwrites.edit(userId, { ViewChannel: true, SendMessages: true, ReadMessageHistory: true, AttachFiles: true });
  await db.Ticket.updateOne({ channelId: channel.id }, { $addToSet: { participants: userId } });
}
async function removeUserFromTicket(channel, userId) {
  await channel.permissionOverwrites.edit(userId, { ViewChannel: false });
  await db.Ticket.updateOne({ channelId: channel.id }, { $pull: { participants: userId } });
}

module.exports = { createTicket, closeTicket, panelPayload, addUserToTicket, removeUserFromTicket, PRIORITY_COLORS, PRIORITY_EMOJI };
