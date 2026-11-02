'use strict';
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, MessageFlags, StringSelectMenuBuilder, UserSelectMenuBuilder } = require('discord.js');
const config = require('../config');
const db = require('../database/models');
const settingsService = require('../services/settings');
const tickets = require('../services/tickets');
const { buildTranscript } = require('../services/transcript');
const { requirementsText } = require('../services/giveaways');
const { sendLog } = require('../services/logger');
const { mention } = require('../utils/helpers');
const { timestamp } = require('../utils/format');

const ephemeral = (interaction, content) => interaction.reply({ content, flags: MessageFlags.Ephemeral }).catch(() => null);

async function getTicket(interaction) {
  const doc = await db.Ticket.findOne({ channelId: interaction.channelId });
  if (!doc) await ephemeral(interaction, '❌ Este canal no está registrado como ticket.');
  return doc;
}

async function ticketHandlers(interaction, action) {
  const channel = interaction.channel;
  if (action === 'open') {
    if (!interaction.isStringSelectMenu()) return;
    const key = interaction.values[0];
    const settings = await settingsService.get(interaction.guildId);
    const cat = (settings.tickets.categories || []).find((c) => c.key === key);
    const modal = new ModalBuilder().setCustomId(`ticket:create:${key}`).setTitle(`Abrir ticket · ${cat?.label || key}`.slice(0, 45));
    modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('subject').setLabel('Asunto').setPlaceholder('Ej: problema con mi cuenta de SA-MP').setStyle(TextInputStyle.Short).setMaxLength(100).setRequired(true)));
    return interaction.showModal(modal);
  }
  if (action === 'claim') {
    const doc = await getTicket(interaction);
    if (!doc) return null;
    if (doc.claimedBy === interaction.user.id) return ephemeral(interaction, 'Ya reclamaste este ticket.');
    doc.claimedBy = interaction.user.id;
    doc.status = 'claimed';
    await doc.save();
    await channel.setTopic(`ticket:${doc.userId} | Ticket #${doc.number} | ${doc.category} | Reclamado por ${interaction.user.tag}`).catch(() => null);
    await channel.send({ embeds: [new EmbedBuilder().setColor(config.brand.colorOk).setDescription(`🙋 **${interaction.user.tag}** reclamó este ticket.`)] }).catch(() => null);
    return interaction.deferUpdate().catch(() => null);
  }
  if (action === 'close') {
    const modal = new ModalBuilder().setCustomId('ticket:close-modal').setTitle('Cerrar ticket');
    modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('reason').setLabel('Motivo del cierre').setStyle(TextInputStyle.Paragraph).setMaxLength(400).setRequired(false)));
    return interaction.showModal(modal);
  }
  if (action === 'add') {
    return interaction.reply({ components: [new ActionRowBuilder().addComponents(new UserSelectMenuBuilder().setCustomId('ticket:add-user').setPlaceholder('Elegí un usuario para añadir'))], flags: MessageFlags.Ephemeral }).catch(() => null);
  }
  if (action === 'remove') {
    return interaction.reply({ components: [new ActionRowBuilder().addComponents(new UserSelectMenuBuilder().setCustomId('ticket:remove-user').setPlaceholder('Elegí un usuario para quitar'))], flags: MessageFlags.Ephemeral }).catch(() => null);
  }
  if (action === 'priority') {
    const options = Object.keys(tickets.PRIORITY_EMOJI).map((p) => ({ label: p, value: p, emoji: tickets.PRIORITY_EMOJI[p] }));
    return interaction.reply({ components: [new ActionRowBuilder().addComponents(new StringSelectMenuBuilder().setCustomId('ticket:priority-set').setPlaceholder('Seleccioná la prioridad').addOptions(options))], flags: MessageFlags.Ephemeral }).catch(() => null);
  }
  if (action === 'transcript') {
    const data = await buildTranscript(channel, 300);
    return interaction.reply({ embeds: [new EmbedBuilder().setColor(config.brand.color).setDescription(`📄 Transcripción generada: **${data.count}** mensajes.`)], files: [{ attachment: Buffer.from(data.html, 'utf8'), name: `${channel.name}-transcript.html` }], flags: MessageFlags.Ephemeral }).catch(() => null);
  }
  return null;
}

async function giveawayHandlers(interaction, parts) {
  const [action, id] = parts;
  const giveaway = await db.Giveaway.findById(id).catch(() => null);
  if (!giveaway) return ephemeral(interaction, '❌ Ese sorteo ya no existe.');
  if (action === 'info') {
    return interaction.reply({ embeds: [new EmbedBuilder().setColor(config.brand.color).setTitle(giveaway.prize).addFields({ name: 'Requisitos', value: requirementsText(giveaway.requirements) }, { name: 'Participantes', value: String(giveaway.entries.length), inline: true }, { name: 'Termina', value: timestamp(giveaway.endsAt), inline: true })], flags: MessageFlags.Ephemeral }).catch(() => null);
  }
  if (action === 'enter') {
    if (giveaway.ended || giveaway.endsAt.getTime() < Date.now()) return ephemeral(interaction, '❌ Este sorteo ya finalizó.');
    const member = await interaction.guild.members.fetch(interaction.user.id);
    const user = await db.User.get(interaction.guildId, interaction.user.id);
    const req = giveaway.requirements || {};
    if (req.roleId && !member.roles.cache.has(req.roleId)) return ephemeral(interaction, '❌ No tenés el rol requerido para participar.');
    if (req.level && user.level < req.level) return ephemeral(interaction, `❌ Necesitás nivel **${req.level}** (tenés ${user.level}).`);
    if (req.booster && !member.premiumSince) return ephemeral(interaction, '❌ Este sorteo es exclusivo para boosters.');
    if (giveaway.entries.includes(interaction.user.id)) {
      giveaway.entries = giveaway.entries.filter((e) => e !== interaction.user.id);
      await giveaway.save();
      return ephemeral(interaction, '👋 Saliste del sorteo. Podés volver a participar cuando quieras.');
    }
    giveaway.entries.push(interaction.user.id);
    await giveaway.save();
    return ephemeral(interaction, `🎉 ¡Estás participando por **${giveaway.prize}**! Buena suerte.`);
  }
  return null;
}

async function reactionRoleHandler(interaction, parts) {
  const roleId = parts.pop();
  const panelId = parts.join(':');
  const panel = await db.ReactionRole.findOne({ $or: [{ panelId }, { messageId: panelId }] });
  if (!panel) return ephemeral(interaction, '❌ Este panel de roles ya no existe.');
  const pair = panel.pairs.find((p) => p.roleId === roleId);
  if (!pair) return ephemeral(interaction, '❌ Rol no configurado.');
  const member = interaction.member;
  if (member.roles.cache.has(roleId)) {
    await member.roles.remove(roleId, 'Reaction role').catch(() => null);
    return ephemeral(interaction, `✅ Se te quitó el rol ${mention(roleId).replace('<@', '<@&')}.`);
  }
  if (panel.mode === 'unique') {
    const other = panel.pairs.filter((p) => p.roleId !== roleId && member.roles.cache.has(p.roleId));
    if (other.length) await member.roles.remove(other.map((p) => p.roleId), 'Reaction role único').catch(() => null);
  }
  await member.roles.add(roleId, 'Reaction role').catch(() => null);
  return ephemeral(interaction, `✅ Se te otorgó el rol <@&${roleId}>.`);
}

async function suggestionHandler(interaction, parts) {
  const [action, id] = parts;
  const suggestion = await db.Suggestion.findById(id).catch(() => null);
  if (!suggestion) return ephemeral(interaction, '❌ Sugerencia no encontrada.');
  if (['up', 'down'].includes(action)) {
    const field = action === 'up' ? 'upvotes' : 'downvotes';
    const other = action === 'up' ? 'downvotes' : 'upvotes';
    if (suggestion[field].includes(interaction.user.id)) {
      suggestion[field] = suggestion[field].filter((u) => u !== interaction.user.id);
    } else {
      suggestion[field].push(interaction.user.id);
      suggestion[other] = suggestion[other].filter((u) => u !== interaction.user.id);
    }
    await suggestion.save();
    const channel = interaction.guild.channels.cache.get(suggestion.channelId);
    const message = await channel?.messages.fetch(suggestion.messageId).catch(() => null);
    if (message) {
      const embed = EmbedBuilder.from(message.embeds[0]);
      embed.setFields(
        { name: 'Estado', value: suggestion.status, inline: true },
        { name: 'Votos', value: `👍 ${suggestion.upvotes.length} · 👎 ${suggestion.downvotes.length}`, inline: true },
      );
      await message.edit({ embeds: [embed] }).catch(() => null);
    }
    return ephemeral(interaction, `✅ Voto registrado. 👍 ${suggestion.upvotes.length} · 👎 ${suggestion.downvotes.length}`);
  }
  return null;
}

async function pollHandler(interaction, parts) {
  const [action, id, index] = parts;
  if (action !== 'vote') return null;
  const poll = await db.Poll.findById(id).catch(() => null);
  if (!poll || poll.ended) return ephemeral(interaction, '❌ Esta encuesta ya terminó.');
  const option = poll.options[Number(index)];
  if (!option) return ephemeral(interaction, '❌ Opción inválida.');
  if (option.votes.includes(interaction.user.id)) {
    option.votes = option.votes.filter((u) => u !== interaction.user.id);
  } else {
    if (!poll.multiple) for (const o of poll.options) o.votes = o.votes.filter((u) => u !== interaction.user.id);
    option.votes.push(interaction.user.id);
  }
  await poll.save();
  const total = poll.options.reduce((acc, o) => acc + o.votes.length, 0);
  const channel = interaction.guild.channels.cache.get(poll.channelId);
  const message = await channel?.messages.fetch(poll.messageId).catch(() => null);
  if (message) {
    const embed = EmbedBuilder.from(message.embeds[0]);
    embed.setDescription(`${poll.question}\n\n${poll.options.map((o, i) => `**${i + 1}.** ${o.label} — ${o.votes.length} voto(s) · ${total ? Math.round((o.votes.length / total) * 100) : 0}%`).join('\n')}`);
    await message.edit({ embeds: [embed] }).catch(() => null);
  }
  return ephemeral(interaction, '✅ Voto registrado.');
}

async function applicationHandler(interaction, parts) {
  const [action, id] = parts;
  if (action === 'start') {
    const settings = await settingsService.get(interaction.guildId);
    const type = (settings.applications?.types || []).find((t) => t.key === id);
    if (!type) return ephemeral(interaction, '❌ Ese tipo de postulación no existe.');
    const modal = new ModalBuilder().setCustomId(`app:modal:${type.key}`).setTitle(`Postulación · ${type.label}`.slice(0, 45));
    type.questions.slice(0, 5).forEach((q, i) => {
      modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId(`q${i}`).setLabel(q.slice(0, 45)).setStyle(TextInputStyle.Paragraph).setMaxLength(800).setRequired(true)));
    });
    return interaction.showModal(modal);
  }
  const app = await db.Application.findById(id).catch(() => null);
  if (!app) return ephemeral(interaction, '❌ Postulación no encontrada.');
  const settings = await settingsService.get(app.guildId);
  const type = (settings.applications?.types || []).find((t) => t.key === app.type);
  if (!['accept', 'reject'].includes(action)) return null;
  app.status = action === 'accept' ? 'aceptada' : 'rechazada';
  app.reviewedBy = interaction.user.id;
  await app.save();
  const guild = interaction.guild;
  if (action === 'accept') {
    const member = await guild.members.fetch(app.userId).catch(() => null);
    const roleId = type?.roleId || settings.applications.roleIds?.[0];
    if (member && roleId) await member.roles.add(roleId, 'Postulación aceptada').catch(() => null);
    await member?.send({ embeds: [new EmbedBuilder().setColor(config.brand.colorOk).setTitle('✅ Postulación aceptada').setDescription(`¡Felicitaciones! Tu postulación para **${type?.label || app.type}** en **${guild.name}** fue aceptada.`)] }).catch(() => null);
  } else {
    const member = await guild.members.fetch(app.userId).catch(() => null);
    await member?.send({ embeds: [new EmbedBuilder().setColor(config.brand.colorError).setTitle('❌ Postulación rechazada').setDescription(`Tu postulación para **${type?.label || app.type}** en **${guild.name}** no fue aceptada esta vez. Podés volver a intentarlo más adelante.`)] }).catch(() => null);
  }
  const embed = EmbedBuilder.from(interaction.message.embeds[0]).setColor(action === 'accept' ? config.brand.colorOk : config.brand.colorError)
    .addFields({ name: 'Revisado por', value: interaction.user.tag, inline: true });
  await interaction.update({ embeds: [embed], components: [] }).catch(() => null);
  await sendLog(guild, 'application', new EmbedBuilder().setColor(config.brand.color).setTitle(`Postulación ${app.status}`).addFields({ name: 'Usuario', value: `<@${app.userId}>`, inline: true }, { name: 'Tipo', value: type?.label || app.type, inline: true }, { name: 'Staff', value: interaction.user.tag, inline: true }));
  return null;
}

async function reportHandler(interaction, parts) {
  const [action, id] = parts;
  const report = await db.Report.findById(id).catch(() => null);
  if (!report) return ephemeral(interaction, '❌ Reporte no encontrado.');
  if (action === 'claim') {
    report.status = 'en_revision';
    report.handledBy = interaction.user.id;
    await report.save();
    await interaction.reply({ embeds: [new EmbedBuilder().setColor(config.brand.color).setDescription(`🙋 ${interaction.user.tag} tomó este reporte.`)] }).catch(() => null);
    return null;
  }
  if (action === 'resolve') {
    const modal = new ModalBuilder().setCustomId(`report:resolve-modal:${id}`).setTitle('Resolver reporte');
    modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('resolution').setLabel('Resolución').setStyle(TextInputStyle.Paragraph).setRequired(true).setMaxLength(500)));
    return interaction.showModal(modal);
  }
  return null;
}

async function confessionHandler(interaction, parts) {
  const [action, id] = parts;
  const confession = await db.Confession.findById(id).catch(() => null);
  if (!confession) return ephemeral(interaction, '❌ Confesión no encontrada.');
  const settings = await settingsService.get(confession.guildId);
  if (action === 'approve') {
    confession.status = 'publicada';
    await confession.save();
    const channel = interaction.guild.channels.cache.get(settings?.confessions?.channelId);
    if (!channel?.isTextBased()) return ephemeral(interaction, '❌ No hay canal de confesiones configurado.');
    const embed = new EmbedBuilder().setColor(0x2b2d31).setTitle(`Confesión #${confession.number}`).setDescription(confession.content).setFooter({ text: 'Ocaso Roleplay • Confesiones anónimas' });
    const msg = await channel.send({ embeds: [embed] }).catch(() => null);
    if (msg) { confession.messageId = msg.id; await confession.save(); }
    return interaction.update({ embeds: [EmbedBuilder.from(interaction.message.embeds[0]).setColor(config.brand.colorOk).setFooter({ text: `Aprobada por ${interaction.user.tag}` })], components: [] }).catch(() => null);
  }
  if (action === 'reject') {
    confession.status = 'rechazada';
    await confession.save();
    return interaction.update({ embeds: [EmbedBuilder.from(interaction.message.embeds[0]).setColor(config.brand.colorError).setFooter({ text: `Rechazada por ${interaction.user.tag}` })], components: [] }).catch(() => null);
  }
  return null;
}

async function eventHandler(interaction, parts) {
  const [action, id] = parts;
  const event = await db.CommunityEvent.findById(id).catch(() => null);
  if (!event) return ephemeral(interaction, '❌ Evento no encontrado.');
  if (event.status !== 'programado') return ephemeral(interaction, '❌ Este evento ya no admite inscripciones.');
  const idx = event.participants.indexOf(interaction.user.id);
  if (action === 'join') {
    if (idx >= 0) return ephemeral(interaction, 'Ya estás inscripto en este evento.');
    if (event.capacity > 0 && event.participants.length >= event.capacity) return ephemeral(interaction, '❌ El evento está lleno.');
    event.participants.push(interaction.user.id);
    await event.save();
    return ephemeral(interaction, `✅ Te inscribiste en **${event.title}**.`);
  }
  if (action === 'leave') {
    if (idx < 0) return ephemeral(interaction, 'No estás inscripto.');
    event.participants.splice(idx, 1);
    await event.save();
    return ephemeral(interaction, `👋 Te desinscribiste de **${event.title}**.`);
  }
  return null;
}

async function handleComponent(interaction, client) {
  const [prefix, ...parts] = interaction.customId.split(':');
  try {
    switch (prefix) {
      case 'ticket': {
        if (interaction.customId === 'ticket:add-user' && interaction.isUserSelectMenu()) {
          const doc = await getTicket(interaction);
          if (!doc) return null;
          await tickets.addUserToTicket(interaction.channel, interaction.values[0]);
          return interaction.reply({ content: `✅ <@${interaction.values[0]}> fue añadido al ticket.`, flags: MessageFlags.Ephemeral }).catch(() => null);
        }
        if (interaction.customId === 'ticket:remove-user' && interaction.isUserSelectMenu()) {
          await tickets.removeUserFromTicket(interaction.channel, interaction.values[0]);
          return interaction.reply({ content: `✅ <@${interaction.values[0]}> fue removido del ticket.`, flags: MessageFlags.Ephemeral }).catch(() => null);
        }
        if (interaction.customId === 'ticket:priority-set' && interaction.isStringSelectMenu()) {
          const doc = await getTicket(interaction);
          if (!doc) return null;
          doc.priority = interaction.values[0];
          await doc.save();
          await interaction.channel.send({ embeds: [new EmbedBuilder().setColor(tickets.PRIORITY_COLORS[doc.priority] || config.brand.color).setDescription(`⚡ Prioridad actualizada a **${doc.priority}** por ${interaction.user}.`)] }).catch(() => null);
          return interaction.reply({ content: `✅ Prioridad: **${doc.priority}**`, flags: MessageFlags.Ephemeral }).catch(() => null);
        }
        if (parts[0] === 'rate') {
          const [, ticketId, rating] = parts;
          const doc = await db.Ticket.findById(ticketId).catch(() => null);
          if (doc) { doc.rating = Number(rating); doc.feedback = `Calificación de ${interaction.user.tag}`; await doc.save(); }
          return interaction.update({ embeds: [new EmbedBuilder().setColor(config.brand.colorOk).setDescription(`¡Gracias por calificar la atención con ${'⭐'.repeat(Number(rating) || 1)}!`)], components: [] }).catch(() => null);
        }
        return await ticketHandlers(interaction, parts[0]);
      }
      case 'giveaway': return await giveawayHandlers(interaction, parts);
      case 'rr': return await reactionRoleHandler(interaction, parts);
      case 'suggest': return await suggestionHandler(interaction, parts);
      case 'poll': return await pollHandler(interaction, parts);
      case 'app': return await applicationHandler(interaction, parts);
      case 'report': return await reportHandler(interaction, parts);
      case 'confession': return await confessionHandler(interaction, parts);
      case 'event': return await eventHandler(interaction, parts);
      case 'verify': {
        const roleId = parts[0];
        const member = interaction.member;
        if (member.roles.cache.has(roleId)) return ephemeral(interaction, '✅ Ya estás verificado.');
        await member.roles.add(roleId, 'Verificación').catch(() => null);
        const settings = await settingsService.get(interaction.guildId);
        if (settings?.verification?.unverifiedRoleId) await member.roles.remove(settings.verification.unverifiedRoleId, 'Verificación completada').catch(() => null);
        return ephemeral(interaction, '✅ ¡Verificación completada! Ya tenés acceso al servidor.');
      }
      default:
        return null;
    }
  } catch (err) {
    return ephemeral(interaction, `❌ Error: ${err.message}`);
  }
}

async function handleModal(interaction, client) {
  const [prefix, action, ...parts] = interaction.customId.split(':');
  try {
    if (prefix === 'ticket' && action === 'create') {
      const key = parts[0];
      const subject = interaction.fields.getTextInputValue('subject');
      const { channel, ticket } = await tickets.createTicket(interaction.guild, interaction.user, key, subject);
      return interaction.reply({ content: `✅ Ticket creado: <#${channel.id}> (#${ticket.number})`, flags: MessageFlags.Ephemeral }).catch(() => null);
    }
    if (prefix === 'ticket' && action === 'close-modal') {
      const reason = interaction.fields.getTextInputValue('reason') || 'Sin motivo especificado';
      await interaction.reply({ content: '🔒 Cerrando ticket y generando transcripción...', flags: MessageFlags.Ephemeral }).catch(() => null);
      await tickets.closeTicket(interaction.channel, interaction.user, reason);
      return null;
    }
    if (prefix === 'suggest') {
      const content = interaction.fields.getTextInputValue('content');
      const settings = await settingsService.get(interaction.guildId);
      const channel = interaction.guild.channels.cache.get(settings?.suggestions?.channelId);
      if (!channel?.isTextBased()) return ephemeral(interaction, '❌ No hay canal de sugerencias configurado.');
      const doc = await db.Suggestion.create({ guildId: interaction.guildId, channelId: channel.id, authorId: interaction.user.id, content });
      const embed = new EmbedBuilder().setColor(config.brand.color).setAuthor({ name: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() }).setDescription(content)
        .addFields({ name: 'Estado', value: 'pendiente', inline: true }, { name: 'Votos', value: '👍 0 · 👎 0', inline: true }).setFooter({ text: `ID: ${doc._id}` });
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`suggest:up:${doc._id}`).setEmoji('👍').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`suggest:down:${doc._id}`).setEmoji('👎').setStyle(ButtonStyle.Secondary),
      );
      const msg = await channel.send({ embeds: [embed], components: [row] });
      doc.messageId = msg.id;
      await doc.save();
      return interaction.reply({ content: `✅ Sugerencia enviada a <#${channel.id}>.`, flags: MessageFlags.Ephemeral }).catch(() => null);
    }
    if (prefix === 'report' && action === 'modal') {
      const type = parts[0] || 'jugador';
      const target = interaction.fields.getTextInputValue('target');
      const reason = interaction.fields.getTextInputValue('reason');
      const evidence = interaction.fields.getTextInputValue('evidence') || 'Sin evidencia';
      const settings = await settingsService.get(interaction.guildId);
      const channel = interaction.guild.channels.cache.get(settings?.reports?.channelId);
      if (!channel?.isTextBased()) return ephemeral(interaction, '❌ No hay canal de reportes configurado.');
      const doc = await db.Report.create({ guildId: interaction.guildId, reporterId: interaction.user.id, targetId: target, targetName: target, reason, evidence, type, channelId: channel.id });
      const embed = new EmbedBuilder().setColor(config.brand.colorWarn).setTitle(`🚨 Reporte #${doc._id.toString().slice(-6)}`).addFields(
        { name: 'Tipo', value: type, inline: true }, { name: 'Reportado', value: target, inline: true },
        { name: 'Reportado por', value: interaction.user.tag, inline: true }, { name: 'Razón', value: reason },
        { name: 'Evidencia', value: evidence },
      ).setTimestamp();
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`report:claim:${doc._id}`).setLabel('Tomar').setEmoji('🙋').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId(`report:resolve:${doc._id}`).setLabel('Resolver').setEmoji('✅').setStyle(ButtonStyle.Success),
      );
      const msg = await channel.send({ embeds: [embed], components: [row] });
      doc.messageId = msg.id;
      await doc.save();
      return interaction.reply({ content: '✅ Reporte enviado al staff. Gracias por ayudar.', flags: MessageFlags.Ephemeral }).catch(() => null);
    }
    if (prefix === 'report' && action === 'resolve-modal') {
      const id = parts[0];
      const resolution = interaction.fields.getTextInputValue('resolution');
      const report = await db.Report.findById(id).catch(() => null);
      if (!report) return ephemeral(interaction, '❌ Reporte no encontrado.');
      report.status = 'resuelto';
      report.resolution = resolution;
      report.handledBy = interaction.user.id;
      await report.save();
      await interaction.reply({ content: '✅ Reporte resuelto.', flags: MessageFlags.Ephemeral }).catch(() => null);
      const channel = interaction.guild.channels.cache.get(report.channelId);
      const msg = await channel?.messages.fetch(report.messageId).catch(() => null);
      if (msg) await msg.edit({ embeds: [EmbedBuilder.from(msg.embeds[0]).setColor(config.brand.colorOk).addFields({ name: 'Resolución', value: resolution })], components: [] }).catch(() => null);
      return null;
    }
    if (prefix === 'app' && action === 'modal') {
      const typeKey = parts[0];
      const settings = await settingsService.get(interaction.guildId);
      const type = (settings?.applications?.types || []).find((t) => t.key === typeKey);
      if (!type) return ephemeral(interaction, '❌ Tipo de postulación inválido.');
      const answers = type.questions.map((q, i) => ({ question: q, answer: interaction.fields.getTextInputValue(`q${i}`) }));
      const doc = await db.Application.create({ guildId: interaction.guildId, userId: interaction.user.id, type: typeKey, answers });
      const reviewChannel = interaction.guild.channels.cache.get(settings.applications.reviewChannelId || settings.applications.channelId);
      if (reviewChannel?.isTextBased()) {
        const embed = new EmbedBuilder().setColor(config.brand.color).setTitle(`📋 Postulación · ${type.label}`).setAuthor({ name: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() })
          .setDescription(answers.map((a) => `**${a.question}**\n${a.answer}`).join('\n\n').slice(0, 4000)).setFooter({ text: `ID: ${doc._id}` }).setTimestamp();
        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId(`app:accept:${doc._id}`).setLabel('Aceptar').setEmoji('✅').setStyle(ButtonStyle.Success),
          new ButtonBuilder().setCustomId(`app:reject:${doc._id}`).setLabel('Rechazar').setEmoji('❌').setStyle(ButtonStyle.Danger),
        );
        const msg = await reviewChannel.send({ embeds: [embed], components: [row] });
        doc.messageId = msg.id;
        doc.channelId = reviewChannel.id;
        await doc.save();
      }
      return interaction.reply({ content: '✅ Postulación enviada. Te avisaremos por MD.', flags: MessageFlags.Ephemeral }).catch(() => null);
    }
    if (prefix === 'confession' && action === 'modal') {
      const content = interaction.fields.getTextInputValue('content');
      const settings = await settingsService.get(interaction.guildId);
      if (!settings?.confessions?.channelId) return ephemeral(interaction, '❌ Las confesiones no están configuradas.');
      const count = await db.Confession.countDocuments({ guildId: interaction.guildId });
      const doc = await db.Confession.create({ guildId: interaction.guildId, number: count + 1, content, authorHash: require('node:crypto').createHash('sha256').update(`${interaction.user.id}:${config.brand.name}`).digest('hex').slice(0, 16) });
      const reviewChannel = interaction.guild.channels.cache.get(settings.mod?.logChannelId || settings.confessions.channelId);
      const embed = new EmbedBuilder().setColor(0x2b2d31).setTitle(`Confesión #${doc.number} (pendiente)`).setDescription(content).setFooter({ text: `Enviada por hash ${doc.authorHash}` });
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`confession:approve:${doc._id}`).setLabel('Publicar').setEmoji('✅').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`confession:reject:${doc._id}`).setLabel('Rechazar').setEmoji('❌').setStyle(ButtonStyle.Danger),
      );
      await reviewChannel.send({ embeds: [embed], components: [row] }).catch(() => null);
      return interaction.reply({ content: '✅ Confesión enviada al staff para revisión.', flags: MessageFlags.Ephemeral }).catch(() => null);
    }
    if (prefix === 'feedback' && action === 'modal') {
      const rating = Number(interaction.fields.getTextInputValue('rating'));
      const comment = interaction.fields.getTextInputValue('comment');
      if (!Number.isInteger(rating) || rating < 1 || rating > 5) return ephemeral(interaction, '❌ La puntuación debe ser un número del 1 al 5.');
      await db.Feedback.create({ guildId: interaction.guildId, userId: interaction.user.id, rating, comment });
      return interaction.reply({ content: '✅ ¡Gracias por tu feedback!', flags: MessageFlags.Ephemeral }).catch(() => null);
    }
    return null;
  } catch (err) {
    return ephemeral(interaction, `❌ Error: ${err.message}`);
  }
}

module.exports = { handleComponent, handleModal };
