'use strict';
const { EmbedBuilder } = require('discord.js');
const config = require('../config');
const db = require('../database/models');
const { sendLog } = require('./logger');

function applyTemplate(template, member, extra = {}) {
  const guild = member.guild;
  return String(template || '')
    .replaceAll('{user}', `<@${member.id}>`)
    .replaceAll('{username}', member.user.username)
    .replaceAll('{tag}', member.user.tag)
    .replaceAll('{displayName}', member.displayName)
    .replaceAll('{server}', guild.name)
    .replaceAll('{memberCount}', guild.memberCount)
    .replaceAll('{count}', extra.count ?? guild.memberCount)
    .replaceAll('{ip}', extra.ip ?? `${config.brand.samp.host}:${config.brand.samp.port}`)
    .replaceAll('{port}', extra.port ?? config.brand.samp.port)
    .replaceAll('{createdAt}', `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`);
}

function parseColor(value) {
  if (!value) return config.brand.color;
  const parsed = parseInt(String(value).replace('#', ''), 16);
  return Number.isFinite(parsed) ? parsed : config.brand.color;
}

function buildEmbed(settings, member, type) {
  const cfg = type === 'welcome' ? settings.welcome : settings.goodbye;
  const embed = new EmbedBuilder()
    .setColor(parseColor(cfg.color))
    .setDescription(applyTemplate(cfg.message, member))
    .setTimestamp();
  if (cfg.title) embed.setTitle(applyTemplate(cfg.title, member));
  if (type === 'welcome') {
    if (cfg.thumbnail !== 'none') embed.setThumbnail(cfg.thumbnail || member.user.displayAvatarURL({ size: 256 }));
  }
  if (cfg.image && cfg.image !== 'none') embed.setImage(cfg.image);
  return embed;
}

async function sendWelcome(member) {
  if (!member || member.user.bot) return;
  const settings = await db.Guild.get(member.guild.id).catch(() => null);
  if (!settings) return;

  const roles = [...(settings.autoroleIds || []), ...(settings.welcome.roleIds || [])];
  if (settings.verification?.enabled) {
    if (settings.verification.unverifiedRoleId) {
      await member.roles.add(settings.verification.unverifiedRoleId, 'Verificación pendiente').catch(() => null);
    }
    try {
      const channel = settings.verification.channelId ? `<#${settings.verification.channelId}>` : 'el canal de verificación';
      await member.send({ embeds: [new EmbedBuilder().setColor(config.brand.color).setTitle('Verificá tu cuenta').setDescription(`¡Bienvenido/a a **${member.guild.name}**!\nPara acceder al servidor tenés que verificarte en ${channel}.`)] }).catch(() => null);
    } catch { /* ignore */ }
  } else if (roles.length) {
    await member.roles.add(roles.filter(Boolean), 'Auto-rol de bienvenida').catch(() => null);
  }

  if (!settings.welcome?.enabled || !settings.welcome.channelId) {
    await sendLog(member.guild, 'memberJoin', new EmbedBuilder().setColor(config.brand.colorOk).setTitle('Miembro entró').setDescription(`${member.user.tag} (${member.id})\nCuenta creada <t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`));
    return;
  }
  const channel = member.guild.channels.cache.get(settings.welcome.channelId)
    || await member.guild.channels.fetch(settings.welcome.channelId).catch(() => null);
  if (!channel?.isTextBased()) return;

  const payload = settings.welcome.embed
    ? { embeds: [buildEmbed(settings, member, 'welcome')] }
    : { content: applyTemplate(settings.welcome.message, member) };
  const msg = await channel.send(payload).catch(() => null);
  if (msg && settings.welcome.deleteAfter > 0) setTimeout(() => msg.delete().catch(() => null), settings.welcome.deleteAfter);
  if (settings.welcome.dm) {
    await member.send({ content: applyTemplate(settings.welcome.dmMessage, member) }).catch(() => null);
  }
  await sendLog(member.guild, 'memberJoin', new EmbedBuilder().setColor(config.brand.colorOk).setTitle('Miembro entró').setDescription(`${member.user.tag} (${member.id})`).setThumbnail(member.user.displayAvatarURL()));
}

async function sendGoodbye(member) {
  if (!member || member.user?.bot) return;
  const settings = await db.Guild.get(member.guild.id).catch(() => null);
  if (settings?.goodbye?.enabled && settings.goodbye.channelId) {
    const channel = member.guild.channels.cache.get(settings.goodbye.channelId)
      || await member.guild.channels.fetch(settings.goodbye.channelId).catch(() => null);
    if (channel?.isTextBased()) {
      const payload = settings.goodbye.embed
        ? { embeds: [buildEmbed(settings, member, 'goodbye')] }
        : { content: applyTemplate(settings.goodbye.message, member) };
      const msg = await channel.send(payload).catch(() => null);
      if (msg && settings.goodbye.deleteAfter > 0) setTimeout(() => msg.delete().catch(() => null), settings.goodbye.deleteAfter);
    }
  }
  await sendLog(member.guild, 'memberLeave', new EmbedBuilder().setColor(config.brand.colorError).setTitle('Miembro salió').setDescription(`${member.user?.tag || 'Desconocido'} (${member.id})`).addFields({ name: 'Se unió', value: member.joinedTimestamp ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>` : 'Desconocido', inline: true }));
}

async function sendBoost(member) {
  const settings = await db.Guild.get(member.guild.id).catch(() => null);
  if (!settings) return;
  if (settings.boost?.roleId) await member.roles.add(settings.boost.roleId, 'Boost').catch(() => null);
  if (settings.boost?.enabled && settings.boost.channelId) {
    const channel = member.guild.channels.cache.get(settings.boost.channelId);
    if (channel?.isTextBased()) {
      await channel.send({ content: applyTemplate(settings.boost.message || '¡{user} boosteó el servidor! 🚀', member) }).catch(() => null);
    }
  }
  await sendLog(member.guild, 'boost', new EmbedBuilder().setColor(0xff73fa).setTitle('Nuevo boost').setDescription(`${member.user.tag} boosteó el servidor.`));
}

module.exports = { sendWelcome, sendGoodbye, sendBoost, applyTemplate, buildEmbed };
