'use strict';
const db = require('../../database/models');
const { str, int, user, role, choices } = require('../../utils/options');
const { cmd, target } = require('../../utils/premade');


const NAME = str('nombre', 'Nombre de la facción', true, { autocomplete: true });

module.exports = [
  cmd({
    name: 'faccion info',
    description: 'Muestra la información de una facción',
    category: 'SA-MP',
    groupDescription: 'Administrá las facciones y organizaciones de Ocaso Roleplay',
    options: [NAME],
    autocomplete: async (ctx) => {
      const docs = await db.Faction.find({ guildId: ctx.guildId }).limit(25).lean();
      return ctx.interaction.respond(docs.filter((d) => d.name.toLowerCase().includes(String(ctx.focused('nombre') || '').toLowerCase())).map((d) => ({ name: `${d.name} (${d.members.length} miembros)`, value: d.name }))).catch(() => null);
    },
    run: async (ctx) => {
      const faction = await db.Faction.findOne({ guildId: ctx.guildId, name: new RegExp(`^${ctx.str('nombre').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') });
      if (!faction) return ctx.err('No se encontró esa facción.');
      const typeColor = { legal: 0x3498db, ilegal: 0xe74c3c, civil: 0x95a5a6, staff: 0x9b59b6 }[faction.type] || 0x95a5a6;
      return ctx.ok('', {
        title: `🏛️ ${faction.name}`,
        color: typeColor,
        description: faction.description || 'Sin descripción.',
        fields: [
          { name: 'Tipo', value: faction.type, inline: true },
          { name: 'Tag', value: faction.tag ? `[${faction.tag}]` : '—', inline: true },
          { name: 'Líder', value: faction.leaderId ? `<@${faction.leaderId}>` : 'Sin líder', inline: true },
          { name: 'Miembros', value: `${faction.members.length}/${faction.slots || '∞'}`, inline: true },
          { name: 'Rol', value: faction.roleId ? `<@&${faction.roleId}>` : 'Sin rol', inline: true },
          { name: 'Estado', value: faction.active ? '🟢 Activa' : '🔴 Inactiva', inline: true },
        ],
      });
    },
  }),
  cmd({
    name: 'faccion lista',
    description: 'Lista todas las facciones del servidor',
    category: 'SA-MP',
    options: [str('tipo', 'Filtrar por tipo', false, { choices: choices(['Legal', 'legal'], ['Ilegal', 'ilegal'], ['Civil', 'civil'], ['Staff', 'staff']) })],
    run: async (ctx) => {
      const filter = { guildId: ctx.guildId, active: true };
      if (ctx.str('tipo')) filter.type = ctx.str('tipo');
      const factions = await db.Faction.find(filter).sort({ type: 1, name: 1 }).lean();
      if (!factions.length) return ctx.err('No hay facciones registradas todavía.');
      const byType = factions.reduce((acc, f) => { (acc[f.type] ||= []).push(f); return acc; }, {});
      return ctx.ok('', {
        title: `🏛️ Facciones de ${ctx.guild.name}`,
        description: Object.entries(byType).map(([type, list]) => `**${type.toUpperCase()}**\n${list.map((f) => `• **${f.name}** ${f.tag ? `[${f.tag}]` : ''} — ${f.members.length} miembros`).join('\n')}`).join('\n\n'),
      });
    },
  }),
  cmd({
    name: 'faccion miembros',
    description: 'Lista los miembros de una facción',
    category: 'SA-MP',
    options: [NAME],
    autocomplete: async (ctx) => {
      const docs = await db.Faction.find({ guildId: ctx.guildId }).limit(25).lean();
      return ctx.interaction.respond(docs.filter((d) => d.name.toLowerCase().includes(String(ctx.focused('nombre') || '').toLowerCase())).map((d) => ({ name: d.name, value: d.name }))).catch(() => null);
    },
    run: async (ctx) => {
      const faction = await db.Faction.findOne({ guildId: ctx.guildId, name: new RegExp(`^${ctx.str('nombre').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') });
      if (!faction) return ctx.err('Facción no encontrada.');
      if (!faction.members.length) return ctx.ok(`**${faction.name}** todavía no tiene miembros.`);
      const list = faction.members.map((m) => `• <@${m.userId}>${m.playerName ? ` (${m.playerName})` : ''} — ${m.rank || 'Sin rango'}`).join('\n');
      return ctx.ok('', { title: `👥 Miembros de ${faction.name}`, description: list.slice(0, 4000), footer: `${faction.members.length} miembros` });
    },
  }),
  cmd({
    name: 'faccion crear',
    description: 'Crea una facción nueva (administración)',
    category: 'SA-MP',
    perms: ['ManageGuild'],
    options: [
      str('nombre', 'Nombre de la facción', true, { max_length: 60 }),
      str('tipo', 'Tipo', true, { choices: choices(['Legal', 'legal'], ['Ilegal', 'ilegal'], ['Civil', 'civil'], ['Staff', 'staff']) }),
      str('tag', 'Tag corto (ej: LSPD)', false, { max_length: 8 }),
      user('lider', 'Líder de la facción', false),
      role('rol', 'Rol de Discord de la facción', false),
      int('cupos', 'Cupos máximos', false, { min_value: 0, max_value: 500 }),
      str('descripcion', 'Descripción', false, { max_length: 500 }),
    ],
    run: async (ctx) => {
      const exists = await db.Faction.findOne({ guildId: ctx.guildId, name: ctx.str('nombre') });
      if (exists) return ctx.err('Ya existe una facción con ese nombre.');
      const faction = await db.Faction.create({
        guildId: ctx.guildId, name: ctx.str('nombre'), tag: ctx.str('tag'), type: ctx.str('tipo'),
        leaderId: ctx.userOpt('lider')?.id, roleId: ctx.roleOpt('rol')?.id, slots: ctx.int('cupos') || 0, description: ctx.str('descripcion'),
      });
      if (faction.roleId && faction.leaderId) {
        const leader = await ctx.guild.members.fetch(faction.leaderId).catch(() => null);
        if (leader) await leader.roles.add(faction.roleId).catch(() => null);
      }
      return ctx.ok(`✅ Facción **${faction.name}** creada (${faction.type}).`);
    },
  }),
  cmd({
    name: 'faccion borrar',
    description: 'Elimina una facción (administración)',
    category: 'SA-MP',
    perms: ['ManageGuild'],
    options: [NAME],
    autocomplete: async (ctx) => {
      const docs = await db.Faction.find({ guildId: ctx.guildId }).limit(25).lean();
      return ctx.interaction.respond(docs.map((d) => ({ name: d.name, value: d.name }))).catch(() => null);
    },
    run: async (ctx) => {
      const faction = await db.Faction.findOne({ guildId: ctx.guildId, name: ctx.str('nombre') });
      if (!faction) return ctx.err('Facción no encontrada.');
      if (!(await ctx.confirm({ description: `¿Eliminar la facción **${faction.name}** con ${faction.members.length} miembros?`, confirmLabel: 'Eliminar' }))) return null;
      await faction.deleteOne();
      return ctx.ok(`🗑️ Facción **${faction.name}** eliminada.`);
    },
  }),
  cmd({
    name: 'faccion unir',
    description: 'Añade un usuario a una facción',
    category: 'SA-MP',
    perms: ['ManageRoles'],
    options: [NAME, user('usuario', 'Usuario a añadir', true), str('rango', 'Rango dentro de la facción', false)],
    autocomplete: async (ctx) => {
      const docs = await db.Faction.find({ guildId: ctx.guildId }).limit(25).lean();
      return ctx.interaction.respond(docs.map((d) => ({ name: d.name, value: d.name }))).catch(() => null);
    },
    run: async (ctx) => {
      const faction = await db.Faction.findOne({ guildId: ctx.guildId, name: ctx.str('nombre') });
      if (!faction) return ctx.err('Facción no encontrada.');
      const { user: targetUser, member } = await target(ctx);
      if (!targetUser || !member) return ctx.err('El usuario debe estar en el servidor.');
      if (faction.members.some((m) => m.userId === targetUser.id)) return ctx.err('Ese usuario ya pertenece a la facción.');
      if (faction.slots && faction.members.length >= faction.slots) return ctx.err('La facción no tiene cupos disponibles.');
      const profile = await db.SampProfile.findOne({ guildId: ctx.guildId, userId: targetUser.id });
      faction.members.push({ userId: targetUser.id, playerName: profile?.playerName, rank: ctx.str('rango') || 'Miembro' });
      await faction.save();
      if (faction.roleId) await member.roles.add(faction.roleId, `Facción ${faction.name}`).catch(() => null);
      if (profile) { profile.faction = faction.name; profile.rank = ctx.str('rango') || 'Miembro'; await profile.save(); }
      return ctx.ok(`✅ ${targetUser} se unió a **${faction.name}** como **${ctx.str('rango') || 'Miembro'}**.`);
    },
  }),
  cmd({
    name: 'faccion salir',
    description: 'Sale de tu facción actual',
    category: 'SA-MP',
    run: async (ctx) => {
      const faction = await db.Faction.findOne({ guildId: ctx.guildId, 'members.userId': ctx.userId });
      if (!faction) return ctx.err('No pertenecés a ninguna facción.');
      if (faction.leaderId === ctx.userId) return ctx.err('Sos el líder: transferí el liderazgo antes de salir.');
      faction.members = faction.members.filter((m) => m.userId !== ctx.userId);
      await faction.save();
      if (faction.roleId) await ctx.member.roles.remove(faction.roleId).catch(() => null);
      await db.SampProfile.updateOne({ guildId: ctx.guildId, userId: ctx.userId }, { faction: null, rank: null }).catch(() => null);
      return ctx.ok(`👋 Saliste de **${faction.name}**.`);
    },
  }),
  cmd({
    name: 'faccion rango',
    description: 'Cambia el rango de un miembro de la facción',
    category: 'SA-MP',
    perms: ['ManageRoles'],
    options: [NAME, user('usuario', 'Miembro', true), str('rango', 'Nuevo rango', true)],
    autocomplete: async (ctx) => {
      const docs = await db.Faction.find({ guildId: ctx.guildId }).limit(25).lean();
      return ctx.interaction.respond(docs.map((d) => ({ name: d.name, value: d.name }))).catch(() => null);
    },
    run: async (ctx) => {
      const faction = await db.Faction.findOne({ guildId: ctx.guildId, name: ctx.str('nombre') });
      if (!faction) return ctx.err('Facción no encontrada.');
      const memberEntry = faction.members.find((m) => m.userId === ctx.userOpt('usuario')?.id);
      if (!memberEntry) return ctx.err('Ese usuario no pertenece a la facción.');
      memberEntry.rank = ctx.str('rango');
      await faction.save();
      await db.SampProfile.updateOne({ guildId: ctx.guildId, userId: memberEntry.userId }, { rank: memberEntry.rank }).catch(() => null);
      return ctx.ok(`✅ Nuevo rango de <@${memberEntry.userId}>: **${memberEntry.rank}**.`);
    },
  }),
  cmd({
    name: 'faccion editar',
    description: 'Edita los datos de una facción',
    category: 'SA-MP',
    perms: ['ManageGuild'],
    options: [
      NAME,
      str('tag', 'Nuevo tag', false, { max_length: 8 }),
      str('descripcion', 'Nueva descripción', false, { max_length: 500 }),
      user('lider', 'Nuevo líder', false),
      role('rol', 'Nuevo rol de Discord', false),
      int('cupos', 'Nuevos cupos', false, { min_value: 0, max_value: 500 }),
      str('tipo', 'Nuevo tipo', false, { choices: choices(['Legal', 'legal'], ['Ilegal', 'ilegal'], ['Civil', 'civil'], ['Staff', 'staff']) }),
    ],
    autocomplete: async (ctx) => {
      const docs = await db.Faction.find({ guildId: ctx.guildId }).limit(25).lean();
      return ctx.interaction.respond(docs.map((d) => ({ name: d.name, value: d.name }))).catch(() => null);
    },
    run: async (ctx) => {
      const faction = await db.Faction.findOne({ guildId: ctx.guildId, name: ctx.str('nombre') });
      if (!faction) return ctx.err('Facción no encontrada.');
      const changes = [];
      for (const [option, field, label] of [['tag', 'tag', 'Tag'], ['descripcion', 'description', 'Descripción'], ['lider', 'leaderId', 'Líder'], ['rol', 'roleId', 'Rol'], ['cupos', 'slots', 'Cupos'], ['tipo', 'type', 'Tipo']]) {
        const value = option === 'lider' ? ctx.userOpt(option)?.id : option === 'rol' ? ctx.roleOpt(option)?.id : (ctx.str(option) ?? ctx.int(option));
        if (value !== null && value !== undefined) { faction[field] = value; changes.push(`**${label}:** ${value}`); }
      }
      if (!changes.length) return ctx.err('No indicaste cambios.');
      await faction.save();
      return ctx.ok(`✅ Facción **${faction.name}** actualizada.\n${changes.join('\n')}`);
    },
  }),
];
