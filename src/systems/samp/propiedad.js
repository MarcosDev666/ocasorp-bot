'use strict';
const db = require('../../database/models');
const { str, int, user, choices } = require('../../utils/options');
const { cmd, target } = require('../../utils/premade');
const { number } = require('../../utils/format');

const TYPES = [['Casa', 'casa'], ['Negocio', 'negocio'], ['Vehículo', 'vehiculo'], ['Empresa', 'empresa']];
const STATUS = [['Disponible', 'disponible'], ['Ocupada', 'ocupada'], ['En venta', 'en_venta'], ['Embargada', 'embargada']];
const NAME = str('nombre', 'Nombre de la propiedad', true, { autocomplete: true });

module.exports = [
  cmd({
    name: 'propiedad lista',
    description: 'Lista las propiedades del servidor',
    category: 'SA-MP',
    groupDescription: 'Casas, negocios y vehículos del rol',
    options: [str('tipo', 'Filtrar por tipo', false, { choices: choices(...TYPES) }), str('estado', 'Filtrar por estado', false, { choices: choices(...STATUS) })],
    run: async (ctx) => {
      const filter = { guildId: ctx.guildId };
      if (ctx.str('tipo')) filter.type = ctx.str('tipo');
      if (ctx.str('estado')) filter.status = ctx.str('estado');
      const docs = await db.Property.find(filter).sort({ type: 1, name: 1 }).limit(40).lean();
      if (!docs.length) return ctx.err('No hay propiedades que coincidan.');
      return ctx.ok('', {
        title: '🏠 Propiedades',
        description: docs.map((p) => {
          const emoji = { casa: '🏠', negocio: '🏪', vehiculo: '🚗', empresa: '🏢' }[p.type] || '📦';
          return `${emoji} **${p.name}** — ${p.status}${p.ownerName ? ` · ${p.ownerName}` : ''} · $${number(p.price)}`;
        }).join('\n').slice(0, 4000),
        footer: `${docs.length} propiedades mostradas`,
      });
    },
  }),
  cmd({
    name: 'propiedad info',
    description: 'Muestra el detalle de una propiedad',
    category: 'SA-MP',
    options: [NAME],
    autocomplete: async (ctx) => {
      const docs = await db.Property.find({ guildId: ctx.guildId }).limit(25).lean();
      return ctx.interaction.respond(docs.filter((d) => d.name.toLowerCase().includes(String(ctx.focused('nombre') || '').toLowerCase())).map((d) => ({ name: `${d.name} (${d.type})`, value: d.name }))).catch(() => null);
    },
    run: async (ctx) => {
      const doc = await db.Property.findOne({ guildId: ctx.guildId, name: new RegExp(`^${ctx.str('nombre').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') });
      if (!doc) return ctx.err('Propiedad no encontrada.');
      return ctx.ok('', {
        title: `${doc.type === 'casa' ? '🏠' : doc.type === 'negocio' ? '🏪' : doc.type === 'vehiculo' ? '🚗' : '🏢'} ${doc.name}`,
        description: doc.description || 'Sin descripción.',
        fields: [
          { name: 'Tipo', value: doc.type, inline: true },
          { name: 'Estado', value: doc.status, inline: true },
          { name: 'Precio', value: `$${number(doc.price)}`, inline: true },
          { name: 'Dueño', value: doc.ownerName ? `${doc.ownerName}${doc.ownerId ? ` (<@${doc.ownerId}>)` : ''}` : 'Sin dueño', inline: true },
          { name: 'Ubicación', value: doc.location || 'No especificada', inline: true },
          { name: 'Bloqueada', value: doc.locked ? '🔒 Sí' : '🔓 No', inline: true },
        ],
      });
    },
  }),
  cmd({
    name: 'propiedad crear',
    description: 'Registra una propiedad nueva (administración)',
    category: 'SA-MP',
    perms: ['ManageGuild'],
    options: [
      str('nombre', 'Nombre único', true, { max_length: 60 }),
      str('tipo', 'Tipo', true, { choices: choices(...TYPES) }),
      int('precio', 'Precio', false, { min_value: 0 }),
      str('ubicacion', 'Ubicación en el mapa', false, { max_length: 100 }),
      str('descripcion', 'Descripción', false, { max_length: 500 }),
    ],
    run: async (ctx) => {
      const exists = await db.Property.findOne({ guildId: ctx.guildId, name: ctx.str('nombre') });
      if (exists) return ctx.err('Ya existe una propiedad con ese nombre.');
      const doc = await db.Property.create({
        guildId: ctx.guildId, name: ctx.str('nombre'), type: ctx.str('tipo'),
        price: ctx.int('precio') || 0, location: ctx.str('ubicacion'), description: ctx.str('descripcion'),
      });
      return ctx.ok(`✅ Propiedad **${doc.name}** (${doc.type}) registrada.`);
    },
  }),
  cmd({
    name: 'propiedad asignar',
    description: 'Asigna una propiedad a un jugador',
    category: 'SA-MP',
    perms: ['ManageGuild'],
    options: [NAME, user('usuario', 'Nuevo dueño', true), str('nombre_rol', 'Nombre del personaje', false)],
    autocomplete: async (ctx) => {
      const docs = await db.Property.find({ guildId: ctx.guildId }).limit(25).lean();
      return ctx.interaction.respond(docs.map((d) => ({ name: `${d.name} (${d.status})`, value: d.name }))).catch(() => null);
    },
    run: async (ctx) => {
      const doc = await db.Property.findOne({ guildId: ctx.guildId, name: ctx.str('nombre') });
      if (!doc) return ctx.err('Propiedad no encontrada.');
      const { user: targetUser } = await target(ctx);
      if (!targetUser) return ctx.err('Usuario inválido.');
      const profile = await db.SampProfile.findOne({ guildId: ctx.guildId, userId: targetUser.id });
      doc.ownerId = targetUser.id;
      doc.ownerName = ctx.str('nombre_rol') || profile?.playerName || targetUser.username;
      doc.status = 'ocupada';
      await doc.save();
      return ctx.ok(`✅ **${doc.name}** asignada a ${targetUser} (${doc.ownerName}).`);
    },
  }),
  cmd({
    name: 'propiedad liberar',
    description: 'Libera una propiedad de su dueño actual',
    category: 'SA-MP',
    perms: ['ManageGuild'],
    options: [NAME],
    autocomplete: async (ctx) => {
      const docs = await db.Property.find({ guildId: ctx.guildId, status: { $ne: 'disponible' } }).limit(25).lean();
      return ctx.interaction.respond(docs.map((d) => ({ name: d.name, value: d.name }))).catch(() => null);
    },
    run: async (ctx) => {
      const doc = await db.Property.findOne({ guildId: ctx.guildId, name: ctx.str('nombre') });
      if (!doc) return ctx.err('Propiedad no encontrada.');
      doc.ownerId = null;
      doc.ownerName = null;
      doc.status = 'disponible';
      await doc.save();
      return ctx.ok(`🔓 **${doc.name}** quedó disponible nuevamente.`);
    },
  }),
];
