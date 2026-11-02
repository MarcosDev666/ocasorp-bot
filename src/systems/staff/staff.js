'use strict';
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType } = require('discord.js');
const config = require('../../config');
const db = require('../../database/models');
const { str, bool, user, role, channel, choices } = require('../../utils/options');
const { cmd, saveSettings, getSettings, embed, yesNo } = require('../../utils/premade');
const { fullDate, timestamp, number } = require('../../utils/format');

const DEFAULT_TYPES = {
  staff: ['¿Cuál es tu nombre y edad?', '¿Qué experiencia tenés como staff?', '¿Cuántas horas por día podés dedicar?', '¿Por qué querés unirte al staff de Ocaso Roleplay?'],
  policia: ['¿Cuál es tu nombre de personaje?', '¿Qué experiencia tenés en rol policial?', '¿Cómo actuarías ante un asalto con rehenes?', '¿Por qué deberíamos elegirte?'],
  medico: ['¿Cuál es tu nombre de personaje?', '¿Qué experiencia tenés en rol médico?', '¿Cómo actuarías en un accidente múltiple?', '¿Por qué deberíamos elegirte?'],
  mecanico: ['¿Cuál es tu nombre de personaje?', '¿Qué experiencia tenés en mecánica?', '¿Qué harías si un cliente no paga?', '¿Por qué deberíamos elegirte?'],
};

module.exports = [
  cmd({
    name: 'staff postulacion-config',
    description: 'Configura un tipo de postulación',
    category: 'Staff',
    groupDescription: 'Reclutamiento, reportes, whitelist y herramientas internas del staff',
    perms: ['ManageGuild'],
    options: [
      str('tipo', 'Clave del tipo (staff, policia, medico, mecanico...)', true, { max_length: 20 }),
      str('nombre', 'Nombre visible', false, { max_length: 60 }),
      str('preguntas', 'Preguntas separadas por |', false, { max_length: 1000 }),
      role('rol', 'Rol que se otorga si es aceptada', false),
      channel('canal_revision', 'Canal donde llegan las postulaciones', false),
      bool('activar', 'Activar postulaciones', false),
    ],
    run: async (ctx) => {
      const key = ctx.str('tipo').toLowerCase().replace(/\s+/g, '-');
      const questions = ctx.str('preguntas') ? ctx.str('preguntas').split('|').map((q) => q.trim()).filter(Boolean) : DEFAULT_TYPES[key] || ['¿Por qué querés postularte?', '¿Qué experiencia tenés?', '¿Cuánto tiempo podés dedicar?'];
      if (questions.length > 5) return ctx.err('Podés configurar como máximo 5 preguntas.');
      const settings = await saveSettings(ctx, (g) => {
        const existing = g.applications.types.find((t) => t.key === key);
        const payload = { key, label: ctx.str('nombre') || key, questions, roleId: ctx.roleOpt('rol')?.id || existing?.roleId, description: existing?.description };
        if (existing) Object.assign(existing, payload);
        else g.applications.types.push(payload);
        if (ctx.channelOpt('canal_revision')) g.applications.reviewChannelId = ctx.channelOpt('canal_revision').id;
        if (ctx.bool('activar') !== null) g.applications.enabled = ctx.bool('activar');
        else g.applications.enabled = true;
      });
      return ctx.ok('', {
        title: `✅ Postulación \`${key}\` configurada`,
        fields: [
          { name: 'Preguntas', value: questions.map((q, i) => `${i + 1}. ${q}`).join('\n') },
          { name: 'Revisión', value: settings.applications.reviewChannelId ? `<#${settings.applications.reviewChannelId}>` : 'No configurado', inline: true },
          { name: 'Rol', value: ctx.roleOpt('rol') ? `${ctx.roleOpt('rol')}` : 'No configurado', inline: true },
        ],
      });
    },
  }),
  cmd({
    name: 'staff postulacion-panel',
    description: 'Publica el panel de postulaciones',
    category: 'Staff',
    perms: ['ManageGuild'],
    options: [channel('canal', 'Canal donde publicar', true)],
    run: async (ctx) => {
      const settings = await getSettings(ctx);
      const types = settings.applications.types.slice(0, 4);
      if (!types.length) return ctx.err('Configurá primero un tipo con `/staff postulacion-config`.');
      const panelEmbed = embed().setTitle('📋 Postulaciones de Ocaso Roleplay').setDescription('Elegí el puesto al que querés postularte. Te vamos a enviar un formulario y el staff lo revisará.').addFields(types.map((t) => ({ name: t.label, value: `${t.questions.length} preguntas${t.roleId ? ` · premio: <@&${t.roleId}>` : ''}`, inline: true })));
      const row = new ActionRowBuilder().addComponents(types.map((t) => new ButtonBuilder().setCustomId(`app:start:${t.key}`).setLabel(t.label.slice(0, 80)).setEmoji('📝').setStyle(ButtonStyle.Primary)));
      const msg = await ctx.channelOpt('canal').send({ embeds: [panelEmbed], components: [row] });
      await saveSettings(ctx, (g) => { g.applications.enabled = true; g.applications.channelId = msg.channelId; });
      return ctx.ok(`✅ Panel publicado: ${msg.url}`);
    },
  }),
  cmd({
    name: 'staff postulacion-lista',
    description: 'Lista las postulaciones pendientes',
    category: 'Staff',
    staffOnly: true,
    options: [str('estado', 'Filtrar por estado', false, { choices: choices(['Pendientes', 'pendiente'], ['En revisión', 'en_revision'], ['Aceptadas', 'aceptada'], ['Rechazadas', 'rechazada']) })],
    run: async (ctx) => {
      const status = ctx.str('estado') || 'pendiente';
      const apps = await db.Application.find({ guildId: ctx.guildId, status }).sort({ createdAt: -1 }).limit(20).lean();
      if (!apps.length) return ctx.ok(`No hay postulaciones en estado \`${status}\`.`);
      return ctx.ok('', {
        title: `📋 Postulaciones (${status})`,
        description: apps.map((a) => `• **${a.type}** — <@${a.userId}> · ${fullDate(a.createdAt)} · ID \`${a._id}\``).join('\n'),
        footer: 'Usá los botones del mensaje de revisión para aceptar o rechazar',
      });
    },
  }),
  cmd({
    name: 'staff reportes-config',
    description: 'Configura el sistema de reportes y apelaciones',
    category: 'Staff',
    perms: ['ManageGuild'],
    options: [channel('canal', 'Canal de reportes', false), channel('apelaciones', 'Canal de apelaciones', false), role('rol', 'Rol a mencionar en nuevos reportes', false), bool('activar', 'Activar reportes', false)],
    run: async (ctx) => {
      const settings = await saveSettings(ctx, (g) => {
        if (ctx.channelOpt('canal')) { g.reports.channelId = ctx.channelOpt('canal').id; g.reports.enabled = true; }
        if (ctx.channelOpt('apelaciones')) { g.appeals.channelId = ctx.channelOpt('apelaciones').id; g.appeals.enabled = true; }
        if (ctx.roleOpt('rol') && !g.reports.roleIds.includes(ctx.roleOpt('rol').id)) g.reports.roleIds.push(ctx.roleOpt('rol').id);
        if (ctx.bool('activar') !== null) g.reports.enabled = ctx.bool('activar');
      });
      return ctx.ok('', {
        title: '🚨 Reportes configurados',
        fields: [
          { name: 'Estado', value: yesNo(settings.reports.enabled), inline: true },
          { name: 'Canal', value: settings.reports.channelId ? `<#${settings.reports.channelId}>` : 'No configurado', inline: true },
          { name: 'Apelaciones', value: settings.appeals.channelId ? `<#${settings.appeals.channelId}>` : 'No configurado', inline: true },
          { name: 'Rol', value: settings.reports.roleIds.map((r) => `<@&${r}>`).join(', ') || 'Ninguno', inline: true },
        ],
      });
    },
  }),
  cmd({
    name: 'staff whitelist-panel',
    description: 'Publica el panel de whitelist (reglas + verificación)',
    category: 'Staff',
    perms: ['ManageGuild'],
    botPerms: ['ManageRoles'],
    options: [channel('canal', 'Canal de whitelist', true), role('rol', 'Rol que se otorga al aceptar', true), str('mensaje', 'Mensaje con las reglas', false, { max_length: 2000 })],
    run: async (ctx) => {
      const r = ctx.roleOpt('rol');
      if (r.position >= ctx.guild.members.me.roles.highest.position) return ctx.err('Ese rol está por encima de mi rol más alto.');
      const whitelistEmbed = new EmbedBuilder().setColor(config.brand.color).setTitle('✅ Whitelist de Ocaso Roleplay')
        .setDescription(ctx.str('mensaje') || 'Leé las reglas del servidor y presioná **Aceptar** para acceder a todos los canales.\n\nAl aceptar confirmás que leíste y aceptás las reglas del rol.')
        .setFooter({ text: config.brand.footer });
      const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId(`verify:${r.id}`).setLabel('Acepto las reglas').setEmoji('✅').setStyle(ButtonStyle.Success));
      await ctx.channelOpt('canal').send({ embeds: [whitelistEmbed], components: [row] });
      await saveSettings(ctx, (g) => { g.verification.roleId = r.id; g.verification.enabled = true; g.verification.channelId = ctx.channelOpt('canal').id; });
      return ctx.ok('✅ Panel de whitelist publicado.');
    },
  }),
  cmd({
    name: 'staff apelacion',
    description: 'Enviá una apelación de sanción',
    category: 'Staff',
    options: [str('usuario_o_id', 'Tu usuario o ID sancionado', true), str('motivo', 'Motivo de la apelación', true, { max_length: 1000 })],
    run: async (ctx) => {
      const settings = await getSettings(ctx);
      const channel = settings.appeals?.channelId ? ctx.guild.channels.cache.get(settings.appeals.channelId) : null;
      const doc = await db.Report.create({ guildId: ctx.guildId, reporterId: ctx.userId, targetId: ctx.str('usuario_o_id'), targetName: ctx.str('usuario_o_id'), reason: ctx.str('motivo'), type: 'apelacion', channelId: channel?.id });
      if (channel?.isTextBased()) {
        const appealEmbed = new EmbedBuilder().setColor(config.brand.colorWarn).setTitle('⚖️ Nueva apelación').addFields(
          { name: 'Usuario', value: `${ctx.user.tag} (${ctx.userId})`, inline: true },
          { name: 'Sancionado', value: ctx.str('usuario_o_id'), inline: true },
          { name: 'Motivo', value: ctx.str('motivo') },
        ).setTimestamp();
        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId(`report:claim:${doc._id}`).setLabel('Tomar').setEmoji('🙋').setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId(`report:resolve:${doc._id}`).setLabel('Resolver').setEmoji('✅').setStyle(ButtonStyle.Success),
        );
        const msg = await channel.send({ embeds: [appealEmbed], components: [row] });
        doc.messageId = msg.id;
        await doc.save();
      }
      return ctx.ok('✅ Apelación enviada. El staff la revisará a la brevedad.');
    },
  }),
  cmd({
    name: 'staff stats',
    description: 'Estadísticas de actividad del staff',
    category: 'Staff',
    staffOnly: true,
    options: [user('staff', 'Miembro del staff (opcional)', false)],
    run: async (ctx) => {
      const staffUser = ctx.userOpt('staff') || ctx.user;
      const member = await ctx.guild.members.fetch(staffUser.id).catch(() => null);
      const [cases, tickets, apps, reports] = await Promise.all([
        db.Case.countDocuments({ guildId: ctx.guildId, moderatorId: staffUser.id }),
        db.Ticket.countDocuments({ guildId: ctx.guildId, claimedBy: staffUser.id }),
        db.Application.countDocuments({ guildId: ctx.guildId, reviewedBy: staffUser.id }),
        db.Report.countDocuments({ guildId: ctx.guildId, handledBy: staffUser.id }),
      ]);
      const doc = await db.User.get(ctx.guildId, staffUser.id);
      return ctx.ok('', {
        title: `📊 Actividad de ${staffUser.tag}`,
        thumbnail: staffUser.displayAvatarURL(),
        fields: [
          { name: 'Sanciones', value: number(cases), inline: true },
          { name: 'Tickets reclamados', value: number(tickets), inline: true },
          { name: 'Postulaciones revisadas', value: number(apps), inline: true },
          { name: 'Reportes resueltos', value: number(reports), inline: true },
          { name: 'Mensajes', value: number(doc.messages), inline: true },
          { name: 'Se unió', value: member?.joinedTimestamp ? timestamp(member.joinedTimestamp) : '—', inline: true },
        ],
      });
    },
  }),
  cmd({
    name: 'staff entrevista',
    description: 'Crea una entrevista privada con un postulante',
    category: 'Staff',
    staffOnly: true,
    botPerms: ['CreatePrivateThreads', 'SendMessagesInThreads'],
    options: [user('usuario', 'Postulante', true), channel('canal', 'Canal donde crear el hilo', false), str('pregunta', 'Primera pregunta', false, { max_length: 300 })],
    run: async (ctx) => {
      const targetUser = ctx.userOpt('usuario');
      const ch = ctx.channelOpt('canal') || ctx.channel;
      if (!ch?.isTextBased()) return ctx.err('Canal inválido.');
      if (ch.type !== ChannelType.GuildText) return ctx.err('El canal debe ser de texto.');
      const thread = await ch.threads.create({
        name: `entrevista-${targetUser.username}`.slice(0, 90),
        type: ChannelType.PrivateThread,
        invitable: false,
        reason: `Entrevista solicitada por ${ctx.user.tag}`,
      }).catch((err) => { ctx.err(`No se pudo crear el hilo: ${err.message}`); return null; });
      if (!thread) return null;
      await thread.members.add(targetUser.id).catch(() => null);
      await thread.members.add(ctx.userId).catch(() => null);
      await thread.send({
        content: `${targetUser} ${ctx.user}`,
        embeds: [embed().setTitle('🎤 Entrevista').setDescription(ctx.str('pregunta') || '¡Hola! Gracias por postularte. Empecemos con la entrevista.')],
      });
      return ctx.ok(`✅ Entrevista creada: ${thread}`);
    },
  }),
];
