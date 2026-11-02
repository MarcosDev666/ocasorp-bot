'use strict';
const { EmbedBuilder, ChannelType, PermissionFlagsBits } = require('discord.js');
const config = require('../../config');
const db = require('../../database/models');
const registry = require('../../core/registry');
const { str, bool, channel, choices } = require('../../utils/options');
const { cmd, saveSettings, getSettings, embed, yesNo } = require('../../utils/premade');

const { paginate } = require('../../utils/helpers');
const autoResponses = require('../../services/autoresponses');

const LOG_EVENTS = ['all', 'messageDelete', 'messageEdit', 'memberJoin', 'memberLeave', 'memberUpdate', 'mod', 'automod', 'ticket', 'ban', 'unban', 'channelCreate', 'channelDelete', 'roleCreate', 'roleDelete', 'voice', 'invite', 'application', 'report'];

async function ensureRole(guild, name, color, hoist = false) {
  return guild.roles.cache.find((r) => r.name === name) || guild.roles.create({ name, color, hoist, reason: 'Setup de Ocaso Roleplay' });
}
async function ensureCategory(guild, name) {
  return guild.channels.cache.find((c) => c.type === ChannelType.GuildCategory && c.name === name) || guild.channels.create({ name, type: ChannelType.GuildCategory });
}
async function ensureText(guild, name, parent, overwrites = []) {
  return guild.channels.cache.find((c) => c.type === ChannelType.GuildText && c.name === name) || guild.channels.create({ name, type: ChannelType.GuildText, parent: parent?.id, permissionOverwrites: overwrites });
}

module.exports = [
  cmd({
    name: 'setup',
    description: 'Crea la estructura recomendada de canales y roles',
    category: 'Configuración',
    groupDescription: 'Configuración general, logs, ayuda y administración del bot',
    perms: ['Administrator'],
    botPerms: ['ManageChannels', 'ManageRoles'],
    cooldown: 30,
    run: async (ctx) => {
      if (!(await ctx.confirm({ description: 'Voy a crear categorías, canales y roles si no existen, y a configurar los sistemas principales. ¿Continuamos?', confirmLabel: 'Hacer setup' }))) return null;
      await ctx.defer();
      const guild = ctx.guild;
      const everyone = guild.roles.everyone;
      const staffRole = await ensureRole(guild, 'Staff', 0xe8a33d, true);
      const memberRole = await ensureRole(guild, 'Miembro', 0x2ecc71);
      const verifiedRole = await ensureRole(guild, 'Verificado', 0x3498db);
      const boosterRole = await ensureRole(guild, 'Booster', 0xff73fa);
      const info = await ensureCategory(guild, '📢 INFORMACIÓN');
      const rp = await ensureCategory(guild, '🎮 OCASO ROLEPLAY');
      const support = await ensureCategory(guild, '🎫 SOPORTE');
      const staffCat = await ensureCategory(guild, '🛠️ STAFF');
      const voiceCat = await ensureCategory(guild, '🔊 CANALES DE VOZ');
      const rules = await ensureText(guild, 'reglas', info);
      const announcements = await ensureText(guild, 'anuncios', info);
      const welcome = await ensureText(guild, 'bienvenida', info);
      const goodbye = await ensureText(guild, 'despedida', info);
      const verify = await ensureText(guild, 'verificacion', info);
      const connect = await ensureText(guild, 'como-conectar', rp);
      const general = await ensureText(guild, 'general', rp);
      const suggestions = await ensureText(guild, 'sugerencias', rp);
      const confessions = await ensureText(guild, 'confesiones', rp);
      const openTicket = await ensureText(guild, 'abrir-ticket', support);
      const reports = await ensureText(guild, 'reportes', support);
      const appeals = await ensureText(guild, 'apelaciones', support);
      const logs = await ensureText(guild, 'logs', staffCat, [{ id: everyone.id, deny: [PermissionFlagsBits.ViewChannel] }, { id: staffRole.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }]);
      const staffChat = await ensureText(guild, 'staff-chat', staffCat, [{ id: everyone.id, deny: [PermissionFlagsBits.ViewChannel] }, { id: staffRole.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }]);
      const ticketCategory = guild.channels.cache.find((c) => c.type === ChannelType.GuildCategory && c.name === 'TICKETS') || await guild.channels.create({ name: 'TICKETS', type: ChannelType.GuildCategory });
      const hub = guild.channels.cache.find((c) => c.type === ChannelType.GuildVoice && c.name === '➕ Crear canal') || await guild.channels.create({ name: '➕ Crear canal', type: ChannelType.GuildVoice, parent: voiceCat.id });

      await saveSettings(ctx, (g) => {
        g.setupComplete = true;
        g.welcome.enabled = true; g.welcome.channelId = welcome.id; g.welcome.roleIds = [memberRole.id];
        g.goodbye.enabled = true; g.goodbye.channelId = goodbye.id;
        g.autoroleIds = [memberRole.id];
        g.mod.staffRoleIds = [staffRole.id];
        g.mod.logChannelId = logs.id;
        g.logs.set('all', logs.id);
        g.logs.set('mod', logs.id);
        g.logs.set('automod', logs.id);
        g.logs.set('ticket', logs.id);
        g.suggestions.enabled = true; g.suggestions.channelId = suggestions.id;
        g.reports.enabled = true; g.reports.channelId = reports.id; g.reports.roleIds = [staffRole.id];
        g.appeals.enabled = true; g.appeals.channelId = appeals.id;
        g.confessions.enabled = true; g.confessions.channelId = confessions.id;
        g.birthdays.enabled = true; g.birthdays.channelId = general.id;
        g.tickets.enabled = true; g.tickets.categoryId = ticketCategory.id; g.tickets.logChannelId = logs.id; g.tickets.staffRoleIds = [staffRole.id];
        g.tickets.categories = [
          { key: 'general', label: 'Soporte general', emoji: '🎫', description: 'Dudas y problemas generales', categoryId: ticketCategory.id, staffRoleIds: [staffRole.id] },
          { key: 'reporte', label: 'Reportar jugador', emoji: '🚨', description: 'Reportá a un jugador con pruebas', categoryId: ticketCategory.id, staffRoleIds: [staffRole.id] },
          { key: 'apelacion', label: 'Apelar sanción', emoji: '⚖️', description: 'Apelá un ban o sanción', categoryId: ticketCategory.id, staffRoleIds: [staffRole.id] },
          { key: 'compra', label: 'Tienda / compras', emoji: '🛒', description: 'Problemas con compras o donaciones', categoryId: ticketCategory.id, staffRoleIds: [staffRole.id] },
        ];
        g.applications.types = [
          { key: 'staff', label: 'Staff', questions: ['¿Cuál es tu nombre y edad?', '¿Qué experiencia tenés como staff?', '¿Cuántas horas por día podés dedicar?', '¿Por qué querés unirte?'], roleId: staffRole.id },
          { key: 'policia', label: 'Policía', questions: ['¿Nombre de personaje?', '¿Experiencia en rol policial?', '¿Cómo actuarías ante un rehén?', '¿Por qué deberíamos elegirte?'], roleId: null },
          { key: 'medico', label: 'Médico', questions: ['¿Nombre de personaje?', '¿Experiencia en rol médico?', '¿Cómo actuarías en un accidente múltiple?', '¿Por qué deberíamos elegirte?'], roleId: null },
        ];
        g.applications.enabled = true;
        g.applications.channelId = general.id;
        g.applications.reviewChannelId = staffChat.id;
        g.verification.roleId = verifiedRole.id;
        g.verification.channelId = verify.id;
        g.boost.roleId = boosterRole.id;
        g.boost.channelId = announcements.id;
        g.boost.enabled = true;
        g.levels.enabled = true;
        g.levels.channelId = general.id;
        g.economy.enabled = true;
        g.starboard.enabled = true;
        g.starboard.channelId = general.id;
        g.tempVoice.enabled = true;
        g.tempVoice.hubChannelId = hub.id;
        g.tempVoice.categoryId = voiceCat.id;
      });

      await rules.send({ embeds: [new EmbedBuilder().setColor(config.brand.color).setTitle('📜 Reglas de Ocaso Roleplay').setDescription('1. Respetá a todos los miembros.\n2. No hagas DM (Deathmatch) sin rol previo.\n3. No abuses de bugs ni cheats.\n4. Interpretá tu personaje (IC ≠ OOC).\n5. Las decisiones del staff deben respetarse.\n6. Prohibido el spam, doxxing y contenido ilegal.\n\nAl verificarte aceptás estas reglas.')] }).catch(() => null);
      await openTicket.send({ embeds: [new EmbedBuilder().setColor(config.brand.color).setTitle('🎫 Centro de ayuda').setDescription('Elegí una categoría para abrir un ticket. El staff te atenderá lo antes posible.')] }).catch(() => null);
      await connect.send({ embeds: [new EmbedBuilder().setColor(config.brand.color).setTitle('🎮 Cómo conectarse').setDescription(`**IP:** \`${config.brand.samp.host}\`\n**Puerto:** \`${config.brand.samp.port}\`\n\nAbrí SA-MP, agregá el servidor y conectate.`)] }).catch(() => null);

      return ctx.edit({ embeds: [new EmbedBuilder().setColor(config.brand.colorOk).setTitle('✅ Setup completado').setDescription('Se crearon las categorías, canales y roles recomendados.').addFields(
        { name: 'Canales', value: [rules, announcements, welcome, goodbye, verify, connect, general, suggestions, confessions, openTicket, reports, appeals, logs, staffChat, hub].map((c) => `<#${c.id}>`).join('\n').slice(0, 1024) },
        { name: 'Roles', value: [staffRole, memberRole, verifiedRole, boosterRole].map((r) => `${r}`).join('\n'), inline: true },
        { name: 'Siguientes pasos', value: '• `/verificacion panel`\n• `/ticket panel`\n• `/staff postulacion-panel`\n• `/automod configurar`', inline: true },
      ).setFooter({ text: 'Ocaso Roleplay • Setup' })] });
    },
  }),
  cmd({
    name: 'config ver',
    description: 'Muestra la configuración actual del bot en el servidor',
    category: 'Configuración',
    perms: ['ManageGuild'],
    run: async (ctx) => {
      const s = await getSettings(ctx);
      return ctx.ok('', {
        title: `⚙️ Configuración de ${ctx.guild.name}`,
        fields: [
          { name: 'Bienvenidas', value: `${yesNo(s.welcome.enabled)} · ${s.welcome.channelId ? `<#${s.welcome.channelId}>` : 'sin canal'}`, inline: true },
          { name: 'Despedidas', value: `${yesNo(s.goodbye.enabled)} · ${s.goodbye.channelId ? `<#${s.goodbye.channelId}>` : 'sin canal'}`, inline: true },
          { name: 'Verificación', value: `${yesNo(s.verification.enabled)} · ${s.verification.roleId ? `<@&${s.verification.roleId}>` : 'sin rol'}`, inline: true },
          { name: 'Tickets', value: `${yesNo(s.tickets.enabled)} · ${s.tickets.categories.length} categorías`, inline: true },
          { name: 'AutoMod', value: yesNo(s.automod.enabled), inline: true },
          { name: 'Niveles', value: `${yesNo(s.levels.enabled)} · x${s.levels.multiplier}`, inline: true },
          { name: 'Economía', value: `${yesNo(s.economy.enabled)} · ${s.economy.currency}`, inline: true },
          { name: 'Logs', value: s.logs.size ? [...s.logs.keys()].join(', ') : 'Sin configurar' },
          { name: 'Prefijo custom', value: `\`${s.customPrefix}\``, inline: true },
          { name: 'Mantenimiento', value: yesNo(s.maintenance), inline: true },
          { name: 'Sistemas cargados', value: `${registry.all().length}`, inline: true },
        ],
      });
    },
  }),
  cmd({
    name: 'config logs',
    description: 'Configura el canal de logs por tipo de evento',
    category: 'Configuración',
    perms: ['ManageGuild'],
    options: [
      str('evento', 'Tipo de evento', true, { choices: LOG_EVENTS.map((e) => ({ name: e, value: e })), autocomplete: false }),
      channel('canal', 'Canal de logs', false),
      bool('quitar', 'Quitar la configuración del evento', false),
    ],
    run: async (ctx) => {
      const event = ctx.str('evento');
      const remove = ctx.bool('quitar');
      if (!ctx.channelOpt('canal') && !remove) return ctx.err('Indicá un canal o usá `quitar: true`.');
      await saveSettings(ctx, (g) => {
        if (remove) g.logs.delete(event);
        else g.logs.set(event, ctx.channelOpt('canal').id);
        if (event === 'mod' && ctx.channelOpt('canal')) g.mod.logChannelId = ctx.channelOpt('canal').id;
      });
      const s = await getSettings(ctx);
      return ctx.ok('', {
        title: '📋 Logs configurados',
        description: s.logs.size ? [...s.logs.entries()].map(([e, id]) => `• \`${e}\` → <#${id}>`).join('\n') : 'No hay logs configurados.',
      });
    },
  }),
  cmd({
    name: 'config mantenimiento',
    description: 'Activa o desactiva el modo mantenimiento del bot',
    category: 'Configuración',
    ownerOnly: true,
    options: [bool('activar', 'Activar mantenimiento', true), str('mensaje', 'Mensaje para los usuarios', false, { max_length: 300 })],
    run: async (ctx) => {
      const s = await saveSettings(ctx, (g) => { g.maintenance = ctx.bool('activar'); if (ctx.str('mensaje')) g.maintenanceMessage = ctx.str('mensaje'); });
      return ctx.ok(`🛠️ Modo mantenimiento ${s.maintenance ? '**activado**' : '**desactivado**'}.`);
    },
  }),
  cmd({
    name: 'config prefijo',
    description: 'Cambia el prefijo de comandos personalizados',
    category: 'Configuración',
    perms: ['ManageGuild'],
    options: [str('prefijo', 'Nuevo prefijo (1-3 caracteres)', true, { min_length: 1, max_length: 3 })],
    run: async (ctx) => {
      await saveSettings(ctx, (g) => { g.customPrefix = ctx.str('prefijo'); });
      return ctx.ok(`✅ Prefijo cambiado a \`${ctx.str('prefijo')}\`. Los comandos personalizados se usan así: \`${ctx.str('prefijo')}nombre\`.`);
    },
  }),
  cmd({
    name: 'config sticky',
    description: 'Fija un mensaje al final de un canal',
    category: 'Configuración',
    perms: ['ManageChannels'],
    options: [channel('canal', 'Canal', true), str('mensaje', 'Texto del mensaje fijo', false, { max_length: 1500 }), bool('quitar', 'Quitar el mensaje fijo', false)],
    run: async (ctx) => {
      const ch = ctx.channelOpt('canal');
      if (ctx.bool('quitar')) {
        await saveSettings(ctx, (g) => { g.sticky.delete(ch.id); });
        return ctx.ok(`✅ Mensaje fijo de <#${ch.id}> eliminado.`);
      }
      if (!ctx.str('mensaje')) return ctx.err('Indicá el mensaje o usá `quitar: true`.');
      await saveSettings(ctx, (g) => { g.sticky.set(ch.id, ctx.str('mensaje')); });
      await ch.send({ content: ctx.str('mensaje') }).catch(() => null);
      return ctx.ok(`📌 Mensaje fijo configurado en <#${ch.id}>. Se reenviará cuando quede atrás.`);
    },
  }),
  cmd({
    name: 'config autorespuesta-crear',
    description: 'Crea una respuesta automática a palabras clave',
    category: 'Configuración',
    perms: ['ManageGuild'],
    options: [str('disparador', 'Palabra o frase', true, { max_length: 100 }), str('respuesta', 'Respuesta del bot', true, { max_length: 1500 }), bool('exacto', 'Solo si el mensaje es exactamente igual', false), bool('responder', 'Responder citando el mensaje', false)],
    run: async (ctx) => {
      const trigger = ctx.str('disparador').toLowerCase();
      await db.AutoResponder.findOneAndUpdate(
        { guildId: ctx.guildId, trigger },
        { response: ctx.str('respuesta'), exact: ctx.bool('exacto') || false, reply: ctx.bool('responder') ?? true, enabled: true },
        { upsert: true, new: true },
      );
      autoResponses.invalidate(ctx.guildId);
      return ctx.ok(`✅ Auto-respuesta creada para \`${trigger}\`.`);
    },
  }),
  cmd({
    name: 'config autorespuesta-borrar',
    description: 'Elimina una respuesta automática',
    category: 'Configuración',
    perms: ['ManageGuild'],
    options: [str('disparador', 'Palabra o frase', true, { autocomplete: true })],
    autocomplete: async (ctx) => {
      const docs = await db.AutoResponder.find({ guildId: ctx.guildId }).limit(25).lean();
      return ctx.interaction.respond(docs.filter((d) => d.trigger.includes(String(ctx.focused('disparador') || '').toLowerCase())).map((d) => ({ name: d.trigger, value: d.trigger }))).catch(() => null);
    },
    run: async (ctx) => {
      const res = await db.AutoResponder.deleteOne({ guildId: ctx.guildId, trigger: ctx.str('disparador').toLowerCase() });
      autoResponses.invalidate(ctx.guildId);
      if (!res.deletedCount) return ctx.err('No existe esa auto-respuesta.');
      return ctx.ok('🗑️ Auto-respuesta eliminada.');
    },
  }),
  cmd({
    name: 'config comando-crear',
    description: 'Crea un comando personalizado con prefijo',
    category: 'Configuración',
    perms: ['ManageGuild'],
    options: [str('nombre', 'Nombre sin espacios', true, { max_length: 32 }), str('respuesta', 'Respuesta (usá {user} y {args})', true, { max_length: 1500 }), bool('embed', 'Enviar como embed', false)],
    run: async (ctx) => {
      const name = ctx.str('nombre').toLowerCase().replace(/\s+/g, '-');
      await db.CustomCommand.findOneAndUpdate(
        { guildId: ctx.guildId, name },
        { response: ctx.str('respuesta'), embed: ctx.bool('embed') || false, authorId: ctx.userId },
        { upsert: true, new: true },
      );
      autoResponses.invalidate(ctx.guildId);
      const s = await getSettings(ctx);
      return ctx.ok(`✅ Comando \`${s.customPrefix}${name}\` creado.`);
    },
  }),
  cmd({
    name: 'config comando-borrar',
    description: 'Elimina un comando personalizado',
    category: 'Configuración',
    perms: ['ManageGuild'],
    options: [str('nombre', 'Nombre del comando', true, { autocomplete: true })],
    autocomplete: async (ctx) => {
      const docs = await db.CustomCommand.find({ guildId: ctx.guildId }).limit(25).lean();
      return ctx.interaction.respond(docs.filter((d) => d.name.includes(String(ctx.focused('nombre') || '').toLowerCase())).map((d) => ({ name: d.name, value: d.name }))).catch(() => null);
    },
    run: async (ctx) => {
      const res = await db.CustomCommand.deleteOne({ guildId: ctx.guildId, name: ctx.str('nombre').toLowerCase() });
      autoResponses.invalidate(ctx.guildId);
      if (!res.deletedCount) return ctx.err('No existe ese comando.');
      return ctx.ok('🗑️ Comando eliminado.');
    },
  }),
  cmd({
    name: 'ayuda',
    description: 'Lista los comandos disponibles o explica uno en detalle',
    category: 'Configuración',
    options: [str('comando', 'Comando a explicar', false, { autocomplete: true })],
    autocomplete: async (ctx) => {
      const query = String(ctx.focused('comando') || '').toLowerCase();
      return ctx.interaction.respond(registry.all().filter((c) => c.name.includes(query)).slice(0, 25).map((c) => ({ name: `/${c.name}`, value: c.name }))).catch(() => null);
    },
    run: async (ctx) => {
      if (ctx.str('comando')) {
        const name = ctx.str('comando').replace(/^\//, '');
        const command = registry.get(name);
        if (!command) return ctx.err('No encontré ese comando.');
        return ctx.ok('', {
          title: `/${command.name}`,
          description: command.description,
          fields: [
            { name: 'Categoría', value: command.category, inline: true },
            { name: 'Cooldown', value: `${command.cooldown}s`, inline: true },
            { name: 'Staff only', value: command.staffOnly ? 'Sí' : 'No', inline: true },
            { name: 'Permisos', value: command.perms?.length ? command.perms.join(', ') : 'Ninguno', inline: true },
            { name: 'Opciones', value: command.options?.length ? command.options.map((o) => `\`${o.name}\`${o.required ? '*' : ''}`).join(', ') : 'Sin opciones' },
          ],
        });
      }
      const cats = registry.all().reduce((acc, c) => { (acc[c.category] ||= []).push(c); return acc; }, {});
      return ctx.ok('', {
        title: '📚 Ayuda de Ocaso Roleplay Bot',
        description: `Hay **${registry.all().length} sistemas** disponibles en **${Object.keys(cats).length} categorías**.\nUsá \`/ayuda comando:<nombre>\` para ver el detalle.\n\n` + Object.entries(cats).map(([cat, list]) => `**${cat}** (${list.length})\n${list.slice(0, 12).map((c) => `\`/${c.name}\``).join(' ')}${list.length > 12 ? ` … +${list.length - 12}` : ''}`).join('\n\n').slice(0, 4000),
        footer: 'Ocaso Roleplay • SA-MP',
      });
    },
  }),
  cmd({
    name: 'sistemas',
    description: 'Lista todos los sistemas del bot agrupados por categoría',
    category: 'Configuración',
    cooldown: 5,
    options: [str('categoria', 'Filtrar por categoría', false, { choices: choices(['SA-MP', 'SA-MP'], ['Tickets', 'Tickets'], ['AutoMod', 'AutoMod'], ['Moderación', 'Moderación'], ['Economía', 'Economía'], ['Niveles', 'Niveles'], ['Utilidad', 'Utilidad'], ['Diversión', 'Diversión'], ['Comunidad', 'Comunidad'], ['Staff', 'Staff']) })],
    run: async (ctx) => {
      const all = registry.all().filter((c) => !c.hidden);
      const filtered = ctx.str('categoria') ? all.filter((c) => c.category === ctx.str('categoria')) : all;
      const cats = filtered.reduce((acc, c) => { (acc[c.category] ||= []).push(c); return acc; }, {});
      const pages = Object.entries(cats).map(([cat, list]) => embed().setTitle(`🧩 ${cat} (${list.length} sistemas)`).setDescription(list.map((c) => `\`/${c.name}\` — ${c.description}`).join('\n').slice(0, 4000)));
      if (!pages.length) return ctx.err('No hay sistemas en esa categoría.');
      pages.push(embed().setTitle(`📊 Resumen: ${all.length} sistemas`).setDescription(Object.entries(all.reduce((acc, c) => { acc[c.category] = (acc[c.category] || 0) + 1; return acc; }, {})).map(([cat, n]) => `• **${cat}**: ${n}`).join('\n')));
      return paginate(ctx.interaction, pages);
    },
  }),
];
