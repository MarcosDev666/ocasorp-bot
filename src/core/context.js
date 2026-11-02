'use strict';
const { MessageFlags, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { ok, error, warn, info, baseEmbed } = require('../utils/embed');
const db = require('../database/models');

async function send(interaction, payload, ephemeral = false, withResponse = false) {
  const body = typeof payload === 'string' ? { embeds: [info(payload)] } : { ...payload };
  if (ephemeral && !interaction.deferred) body.flags = MessageFlags.Ephemeral;
  if (interaction.deferred) return interaction.editReply(body);
  if (interaction.replied) return interaction.followUp(body);
  return interaction.reply({ ...body, withResponse: withResponse || undefined });
}

function createContext(interaction, client, command) {
  const o = interaction.options;
  const get = (name) => o?.get(name) ?? null;
  const value = (name) => get(name)?.value ?? null;

  const ctx = {
    interaction, client, command, db,
    guild: interaction.guild,
    channel: interaction.channel,
    user: interaction.user,
    member: interaction.member,
    guildId: interaction.guildId,
    userId: interaction.user.id,
    channelId: interaction.channelId,
    createdTimestamp: interaction.createdTimestamp,

    opt: value,
    str: (n) => o?.getString(n) ?? null,
    int: (n) => o?.getInteger(n) ?? null,
    num: (n) => o?.getNumber(n) ?? null,
    bool: (n) => o?.getBoolean(n) ?? null,
    userOpt: (n) => o?.getUser(n) ?? null,
    memberOpt: (n) => o?.getMember(n) ?? null,
    channelOpt: (n) => o?.getChannel(n) ?? null,
    roleOpt: (n) => o?.getRole(n) ?? null,
    att: (n) => o?.getAttachment(n) ?? null,
    mention: (n) => o?.getMentionable(n) ?? null,
    focused: (n) => o?.getFocused(n) ?? null,

    reply: (payload, ephemeral = false) => send(interaction, payload, ephemeral),
    ok: (description, data = {}) => send(interaction, { embeds: [ok(description, data)] }, data.ephemeral ?? false),
    err: (description) => send(interaction, { embeds: [error(description)] }, true),
    warn: (description) => send(interaction, { embeds: [warn(description)] }, true),
    info: (description, data = {}) => send(interaction, { embeds: [info(description)], ...data }, false),
    embed: (data) => send(interaction, { embeds: [baseEmbed(data)] }),

    defer: (ephemeral = false) =>
      interaction.deferred || interaction.replied ? null : interaction.deferReply(ephemeral ? { flags: MessageFlags.Ephemeral } : {}),
    edit: (payload) => interaction.editReply(typeof payload === 'string' ? { embeds: [info(payload)] } : payload),
    follow: (payload, ephemeral = false) => interaction.followUp({ ...(typeof payload === 'string' ? { embeds: [info(payload)] } : payload), flags: ephemeral ? MessageFlags.Ephemeral : undefined }),
    modal: (modal) => interaction.showModal(modal),

    async confirm({ title = '¿Confirmás la acción?', description = 'Esta acción puede ser irreversible.', confirmLabel = 'Confirmar', cancelLabel = 'Cancelar', danger = true } = {}) {
      const id = `confirm:${interaction.id}`;
      const components = [new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`${id}:yes`).setLabel(confirmLabel).setStyle(danger ? ButtonStyle.Danger : ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`${id}:no`).setLabel(cancelLabel).setStyle(ButtonStyle.Secondary),
      )];
      const response = await send(interaction, { embeds: [warn(description, { title })], components }, true, true);
      const msg = response?.resource?.message || response;
      if (!msg?.awaitMessageComponent) return false;
      try {
        const i = await msg.awaitMessageComponent({ time: 60000, filter: (x) => x.user.id === interaction.user.id });
        const yes = i.customId.endsWith(':yes');
        await i.update({ embeds: [yes ? ok('Acción confirmada.') : info('Acción cancelada.')], components: [] });
        return yes;
      } catch {
        try { await msg.edit({ components: [] }); } catch { /* ignore */ }
        return false;
      }
    },
  };
  return ctx;
}

module.exports = { createContext, send };
