'use strict';
const crypto = require('node:crypto');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const config = require('../../config');
const db = require('../../database/models');
const { str, int, choices } = require('../../utils/options');
const { cmd, embed, getSettings } = require('../../utils/premade');
const { parseDuration, duration, timestamp, fullDate, truncate } = require('../../utils/format');

module.exports = [
  cmd({
    name: 'snipe',
    description: 'Muestra el último mensaje eliminado del canal',
    category: 'Utilidad',
    groupDescription: 'Herramientas rápidas: snipe, AFK, recordatorios, encuestas y más',
    options: [int('posicion', 'Posición en el historial (1 = último)', false, { min_value: 1, max_value: 10 })],
    run: async (ctx) => {
      const snipe = ctx.client.snipes.get(ctx.channelId);
      if (!snipe) return ctx.err('No hay mensajes eliminados recientemente en este canal.');
      return ctx.reply({ embeds: [embed().setColor(config.brand.colorError).setAuthor({ name: snipe.author, iconURL: snipe.avatar || undefined }).setDescription(truncate(snipe.content, 2000)).setFooter({ text: `Eliminado ${timestamp(snipe.createdAt)}` })] });
    },
  }),
  cmd({
    name: 'editsnipe',
    description: 'Muestra la última edición de mensaje en el canal',
    category: 'Utilidad',
    run: async (ctx) => {
      const snipe = ctx.client.editSnipes.get(ctx.channelId);
      if (!snipe) return ctx.err('No hay ediciones recientes en este canal.');
      return ctx.reply({ embeds: [embed().setColor(config.brand.colorWarn).setAuthor({ name: snipe.author || 'Desconocido' }).addFields({ name: 'Antes', value: truncate(snipe.before, 1000) }, { name: 'Después', value: truncate(snipe.after, 1000) }).setFooter({ text: `Editado ${timestamp(snipe.at)}` })] });
    },
  }),
  cmd({
    name: 'afk',
    description: 'Activa o desactiva tu estado AFK',
    category: 'Utilidad',
    options: [str('razon', 'Motivo por el que estás AFK', false, { max_length: 200 })],
    run: async (ctx) => {
      const doc = await db.User.get(ctx.guildId, ctx.userId);
      if (doc.afk?.since) {
        doc.afk = { reason: null, since: null };
        await doc.save();
        return ctx.ok('👋 Se desactivó tu estado AFK.');
      }
      doc.afk = { reason: ctx.str('razon') || 'Sin razón especificada', since: new Date() };
      await doc.save();
      return ctx.ok(`💤 Estás AFK: **${doc.afk.reason}**. Se quitará cuando escribas.`);
    },
  }),
  cmd({
    name: 'recordatorio',
    description: 'Programa un recordatorio y te lo envío por MD',
    category: 'Utilidad',
    guildOnly: false,
    options: [str('tiempo', 'Cuándo (ej: 10m, 2h, 3d)', true), str('texto', 'Qué querés recordar', true, { max_length: 500 })],
    run: async (ctx) => {
      const ms = parseDuration(ctx.str('tiempo'));
      if (!ms || ms < 30000) return ctx.err('Indicá un tiempo válido (mínimo 30 segundos). Ejemplos: `10m`, `2h`, `3d`.');
      if (ms > 365 * 86400000) return ctx.err('El máximo es de 365 días.');
      await db.Reminder.create({ userId: ctx.userId, guildId: ctx.guildId, channelId: ctx.channelId, text: ctx.str('texto'), dueAt: new Date(Date.now() + ms) });
      return ctx.ok(`⏰ Te voy a recordar **${ctx.str('texto')}** en **${duration(ms)}** (<t:${Math.floor((Date.now() + ms) / 1000)}:R>).`);
    },
  }),
  cmd({
    name: 'recordatorios-lista',
    description: 'Lista tus recordatorios pendientes',
    category: 'Utilidad',
    run: async (ctx) => {
      const docs = await db.Reminder.find({ userId: ctx.userId, sent: false }).sort({ dueAt: 1 }).limit(20).lean();
      if (!docs.length) return ctx.ok('No tenés recordatorios pendientes.');
      return ctx.ok('', { title: '⏰ Tus recordatorios', description: docs.map((d) => `• ${truncate(d.text, 100)} — <t:${Math.floor(new Date(d.dueAt).getTime() / 1000)}:R>`).join('\n') });
    },
  }),
  cmd({
    name: 'calc',
    description: 'Calcula una operación matemática',
    category: 'Utilidad',
    options: [str('operacion', 'Operación (ej: (12+8)*3/4)', true, { max_length: 200 })],
    run: async (ctx) => {
      const expr = ctx.str('operacion').replace(/,/g, '.');
      if (!/^[\d\s+\-*/().%^]+$/.test(expr)) return ctx.err('Solo se permiten números y operadores ( + - * / % ^ ).');
      try {
        const safe = expr.replace(/\^/g, '**');
        const result = Function(`"use strict"; return (${safe});`)();
        if (typeof result !== 'number' || !Number.isFinite(result)) throw new Error('Resultado inválido');
        return ctx.ok(`🧮 \`${expr}\` = **${result}**`, { title: 'Calculadora' });
      } catch {
        return ctx.err('No se pudo calcular esa operación.');
      }
    },
  }),
  cmd({
    name: 'timestamp',
    description: 'Convierte una fecha a formato de Discord',
    category: 'Utilidad',
    options: [str('fecha', 'Fecha (AAAA-MM-DD HH:MM) o "ahora"', true)],
    run: async (ctx) => {
      const input = ctx.str('fecha');
      const date = input.toLowerCase() === 'ahora' ? new Date() : new Date(input.includes('T') ? input : input.replace(' ', 'T'));
      if (Number.isNaN(date.getTime())) return ctx.err('Fecha inválida. Usá el formato `2026-12-31 23:59`.');
      const unix = Math.floor(date.getTime() / 1000);
      return ctx.ok('', {
        title: '🕐 Timestamps',
        description: ['t', 'T', 'd', 'D', 'f', 'F', 'R'].map((s) => `**${s}**: \`<t:${unix}:${s}>\` → <t:${unix}:${s}>`).join('\n'),
        footer: fullDate(date),
      });
    },
  }),
  cmd({
    name: 'base64',
    description: 'Codifica o decodifica texto en Base64',
    category: 'Utilidad',
    options: [str('texto', 'Texto', true, { max_length: 1500 }), str('accion', 'Codificar o decodificar', true, { choices: choices(['Codificar', 'codificar'], ['Decodificar', 'decodificar']) })],
    run: async (ctx) => {
      try {
        const result = ctx.str('accion') === 'codificar' ? Buffer.from(ctx.str('texto')).toString('base64') : Buffer.from(ctx.str('texto'), 'base64').toString('utf8');
        return ctx.reply({ embeds: [embed().setTitle('🔐 Base64').setDescription(`\`\`\`${truncate(result, 1900)}\`\`\``)] });
      } catch { return ctx.err('No se pudo procesar el texto.'); }
    },
  }),
  cmd({
    name: 'hash',
    description: 'Genera el hash de un texto',
    category: 'Utilidad',
    options: [str('texto', 'Texto', true, { max_length: 1500 }), str('algoritmo', 'Algoritmo', false, { choices: choices(['MD5', 'md5'], ['SHA1', 'sha1'], ['SHA256', 'sha256'], ['SHA512', 'sha512']) })],
    run: async (ctx) => {
      const algo = ctx.str('algoritmo') || 'sha256';
      const hash = crypto.createHash(algo).update(ctx.str('texto')).digest('hex');
      return ctx.reply({ embeds: [embed().setTitle(`#️⃣ ${algo.toUpperCase()}`).setDescription(`\`\`\`${hash}\`\`\``)] });
    },
  }),
  cmd({
    name: 'uuid',
    description: 'Genera un UUID v4 aleatorio',
    category: 'Utilidad',
    run: async (ctx) => ctx.reply({ embeds: [embed().setTitle('🆔 UUID v4').setDescription(`\`${crypto.randomUUID()}\``)] }),
  }),
  cmd({
    name: 'color',
    description: 'Muestra un color aleatorio o uno específico',
    category: 'Utilidad',
    options: [str('hex', 'Color hexadecimal (ej: #E8A33D)', false)],
    run: async (ctx) => {
      const input = ctx.str('hex');
      let hex = input ? input.replace('#', '') : crypto.randomBytes(3).toString('hex');
      if (!/^[0-9a-f]{6}$/i.test(hex)) return ctx.err('Color inválido. Usá el formato `#RRGGBB`.');
      const int = parseInt(hex, 16);
      const r = (int >> 16) & 255; const g = (int >> 8) & 255; const b = int & 255;
      return ctx.reply({ embeds: [embed().setColor(int).setTitle(`🎨 #${hex.toUpperCase()}`).addFields({ name: 'RGB', value: `${r}, ${g}, ${b}`, inline: true }, { name: 'Decimal', value: String(int), inline: true }, { name: 'Hex', value: `#${hex.toUpperCase()}`, inline: true }).setDescription(`[Vista previa](https://www.color-hex.com/color/${hex})`)] });
    },
  }),
  cmd({
    name: 'encuesta',
    description: 'Crea una encuesta con hasta 5 opciones',
    category: 'Utilidad',
    options: [
      str('pregunta', 'Pregunta', true, { max_length: 250 }),
      str('opcion1', 'Opción 1', true, { max_length: 80 }),
      str('opcion2', 'Opción 2', true, { max_length: 80 }),
      str('opcion3', 'Opción 3', false, { max_length: 80 }),
      str('opcion4', 'Opción 4', false, { max_length: 80 }),
      str('opcion5', 'Opción 5', false, { max_length: 80 }),
    ],
    run: async (ctx) => {
      const labels = [1, 2, 3, 4, 5].map((i) => ctx.str(`opcion${i}`)).filter(Boolean);
      const doc = await db.Poll.create({ guildId: ctx.guildId, channelId: ctx.channelId, authorId: ctx.userId, question: ctx.str('pregunta'), options: labels.map((l) => ({ label: l, votes: [] })) });
      const voteEmbed = embed().setTitle('📊 Encuesta').setDescription(`**${doc.question}**\n\n${doc.options.map((o, i) => `**${i + 1}.** ${o.label} — 0 votos · 0%`).join('\n')}`).setFooter({ text: `Creada por ${ctx.user.tag}` });
      const msg = await ctx.channel.send({ embeds: [voteEmbed], components: [new ActionRowBuilder().addComponents(labels.slice(0, 5).map((l, i) => new ButtonBuilder().setCustomId(`poll:vote:${doc._id}:${i}`).setLabel(`${i + 1}`).setStyle(ButtonStyle.Secondary)))] });
      doc.messageId = msg.id;
      await doc.save();
      return ctx.ok(`✅ Encuesta publicada: ${msg.url}`);
    },
  }),
  cmd({
    name: 'sugerir',
    defer: false,
    description: 'Envía una sugerencia al staff',
    category: 'Utilidad',
    run: async (ctx) => {
      const settings = await getSettings(ctx);
      if (!settings.suggestions?.enabled || !settings.suggestions.channelId) return ctx.err('El sistema de sugerencias no está configurado.');
      const modal = new ModalBuilder().setCustomId('suggest:modal').setTitle('Enviar sugerencia');
      modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('content').setLabel('Tu sugerencia').setStyle(TextInputStyle.Paragraph).setMaxLength(1500).setRequired(true)));
      return ctx.modal(modal);
    },
  }),
  cmd({
    name: 'bug',
    defer: false,
    description: 'Reporta un bug del servidor o del bot',
    category: 'Utilidad',
    run: async (ctx) => {
      const settings = await getSettings(ctx);
      if (!settings.reports?.enabled || !settings.reports.channelId) return ctx.err('El sistema de reportes no está configurado.');
      const modal = new ModalBuilder().setCustomId('report:modal:bug').setTitle('Reportar un bug');
      modal.addComponents(
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('target').setLabel('¿Dónde ocurrió?').setPlaceholder('Ej: /trabajar, mapa de Los Santos').setStyle(TextInputStyle.Short).setMaxLength(100).setRequired(true)),
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('reason').setLabel('Descripción del bug').setStyle(TextInputStyle.Paragraph).setMaxLength(1000).setRequired(true)),
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('evidence').setLabel('Evidencia (links)').setStyle(TextInputStyle.Paragraph).setMaxLength(500).setRequired(false)),
      );
      return ctx.modal(modal);
    },
  }),
];
