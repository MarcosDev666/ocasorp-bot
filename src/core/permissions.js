'use strict';
const { PermissionsBitField } = require('discord.js');
const config = require('../config');

const LABELS = {
  Administrator: 'Administrador', ManageGuild: 'Gestionar servidor', ManageRoles: 'Gestionar roles',
  ManageChannels: 'Gestionar canales', KickMembers: 'Expulsar miembros', BanMembers: 'Banear miembros',
  ModerateMembers: 'Moderar miembros', ManageMessages: 'Gestionar mensajes', ManageNicknames: 'Gestionar apodos',
  ViewChannel: 'Ver canales', SendMessages: 'Enviar mensajes', EmbedLinks: 'Insertar enlaces',
  ReadMessageHistory: 'Leer historial', AddReactions: 'Añadir reacciones', ManageWebhooks: 'Gestionar webhooks',
  ManageEvents: 'Gestionar eventos', CreateEvents: 'Crear eventos', CreatePrivateThreads: 'Crear hilos privados',
  CreatePublicThreads: 'Crear hilos públicos', SendMessagesInThreads: 'Enviar mensajes en hilos',
  MentionEveryone: 'Mencionar a todos', ManageThreads: 'Gestionar hilos', UseExternalEmojis: 'Usar emojis externos',
  AttachFiles: 'Adjuntar archivos', Connect: 'Conectar a voz', MoveMembers: 'Mover miembros', DeafenMembers: 'Ensordecer miembros',
};

const label = (perm) => LABELS[perm] || perm;

function isOwner(userId) {
  return config.owners.includes(userId);
}

function isStaff(member) {
  if (!member) return false;
  if (member.permissions.has(PermissionsBitField.Flags.Administrator)) return true;
  if (isOwner(member.id)) return true;
  const roles = config.staffRoles || [];
  return member.roles?.cache?.some((r) => roles.includes(r.id)) || false;
}

function missingMemberPerms(member, perms = []) {
  if (!member) return perms;
  return perms.filter((p) => !member.permissions.has(PermissionsBitField.Flags[p]));
}

function missingBotPerms(guild, perms = []) {
  const me = guild?.members?.me;
  if (!me) return perms;
  return perms.filter((p) => !me.permissions.has(PermissionsBitField.Flags[p]));
}

module.exports = { isOwner, isStaff, missingMemberPerms, missingBotPerms, label };
