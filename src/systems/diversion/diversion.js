'use strict';
const { str, int, user, choices } = require('../../utils/options');
const { cmd, embed } = require('../../utils/premade');
const { sample, randomInt, progressBar } = require('../../utils/format');

const ANSWERS = [
  'Sí, definitivamente.', 'No cuentes con eso.', 'Sin dudas.', 'Mi respuesta es no.', 'Podés confiar en ello.',
  'Mejor no te digo ahora.', 'Muy probablemente.', 'Preguntá de nuevo más tarde.', 'Concéntrate y volvé a preguntar.',
  'No apuesto por eso.', 'Absolutamente.', 'Los astros dicen que no.', 'Todo apunta a que sí.', 'Ni en pedo.',
];
const JOKES = [
  '¿Qué le dice un policía a otro en el rol? — Che, ¿viste el nuevo sospechoso? Tiene "wanted" hasta en la firma.',
  'Un civil entra al banco y dice: "Vengo a depositar". El cajero: "¿Dinero?" — "No, una denuncia por robo".',
  '¿Por qué el mecánico de Ocaso nunca se queda sin trabajo? Porque los autos aparecen volando del puente.',
  'Un taxista frena en seco y le dice al pasajero: "Llegamos". El pasajero: "Pero si estamos en el mismo lugar".',
  'Mi personaje tiene tanta plata que el banco le pidió un préstamo a él.',
  '¿Cuál es el trabajo más peligroso del rol? Ser civil con micrófono abierto en el chat global.',
  'El de la tienda 24/7 me dijo "si no vas a comprar, no molestes". Ahora soy dueño de la tienda 24/7.',
];
const FACTS = [
  'Ocaso Roleplay es una comunidad de rol que combina economía, facciones y vida civil.',
  'SA-MP permite hasta 1000 jugadores por servidor en su versión 0.3.7.',
  'GTA San Andreas salió en 2004 y sigue vivo gracias a mods como SA-MP y MTA.',
  'El nombre "Ocaso" hace referencia al atardecer, símbolo de transición y nuevas historias.',
  'Los roles de policía suelen tener protocolos de uso de fuerza para evitar abusos.',
  'El rol médico requiere coordinación para las escenas de emergencia.',
  'Una economía sana en un servidor de rol necesita sumideros de dinero (impuestos, multas, alquileres).',
];
const TRUTHS = [
  '¿Cuál fue tu primer nombre de personaje en SA-MP?', '¿Alguna vez usaste un cheat en un servidor?', '¿Cuál es tu facción favorita del rol?',
  '¿Cuántas horas tenés en GTA San Andreas?', '¿Cuál fue tu peor muerte en rol?', '¿A quién del servidor le tenés más respeto?',
  '¿Cuál es la escena más graciosa que viviste?', '¿Robaste alguna vez en el rol sin que te descubran?',
];
const DARES = [
  'Escribí un mensaje completamente en mayúsculas en el chat general (una sola vez).', 'Cambiá tu apodo e incluí "en práctica" por una hora.',
  'Mandale un piropo a tu personaje favorito del servidor.', 'Contá en el chat de voz cómo empezaste en SA-MP.',
  'Usá un emoji distinto en cada mensaje que envíes durante 10 minutos.', 'Hacé una escena de baile en el centro de Los Santos.',
  'Escribí una historia de 5 líneas sobre tu personaje.', 'Pedile a un staff una foto de perfil de rol y usala un rato.',
];
const WOULD_YOU = [
  ['ser policía de día y ladrón de noche', 'ser médico con licencia y miedo a la sangre'],
  ['tener un auto tuneado pero sin seguro', 'tener un auto feo pero blindado'],
  ['trabajar en un negocio 24/7', 'ser taxista en hora pico'],
  ['vivir en Los Santos', 'vivir en San Fierro'],
  ['tener $1.000.000 pero fama de tramposo', 'tener $10.000 y buena reputación'],
];

module.exports = [
  cmd({
    name: '8ball',
    description: 'Preguntale algo a la bola mágica',
    category: 'Diversión',
    groupDescription: 'Juegos y comandos de entretenimiento para la comunidad',
    options: [str('pregunta', 'Tu pregunta', true, { max_length: 300 })],
    run: async (ctx) => ctx.reply({ embeds: [embed().setTitle('🎱 Bola mágica').addFields({ name: 'Pregunta', value: ctx.str('pregunta') }, { name: 'Respuesta', value: `**${sample(ANSWERS)}**` })] }),
  }),
  cmd({
    name: 'coinflip',
    description: 'Lanza una moneda al aire',
    category: 'Diversión',
    run: async (ctx) => ctx.reply({ embeds: [embed().setTitle('🪙 Cara o cruz').setDescription(`Salió **${Math.random() < 0.5 ? 'cara' : 'cruz'}**.`)] }),
  }),
  cmd({
    name: 'dice',
    description: 'Tira uno o varios dados',
    category: 'Diversión',
    options: [int('caras', 'Cantidad de caras (por defecto 6)', false, { min_value: 2, max_value: 100 }), int('cantidad', 'Cantidad de dados (1-10)', false, { min_value: 1, max_value: 10 })],
    run: async (ctx) => {
      const faces = ctx.int('caras') || 6;
      const count = ctx.int('cantidad') || 1;
      const rolls = Array.from({ length: count }, () => randomInt(1, faces));
      return ctx.reply({ embeds: [embed().setTitle('🎲 Dados').setDescription(`\`${rolls.join(' + ')}\` = **${rolls.reduce((a, b) => a + b, 0)}**`).setFooter({ text: `${count}d${faces}` })] });
    },
  }),
  cmd({
    name: 'rps',
    description: 'Jugá piedra, papel o tijera contra el bot',
    category: 'Diversión',
    options: [str('eleccion', 'Tu elección', true, { choices: choices(['Piedra', 'piedra'], ['Papel', 'papel'], ['Tijera', 'tijera']) })],
    run: async (ctx) => {
      const user = ctx.str('eleccion');
      const bot = sample(['piedra', 'papel', 'tijera']);
      const wins = { piedra: 'tijera', papel: 'piedra', tijera: 'papel' };
      const result = user === bot ? '🤝 Empate' : wins[user] === bot ? '🎉 ¡Ganaste!' : '🤖 Gané yo';
      return ctx.reply({ embeds: [embed().setTitle('✌️ Piedra, papel o tijera').addFields({ name: 'Vos', value: user, inline: true }, { name: 'Bot', value: bot, inline: true }).setDescription(result)] });
    },
  }),
  cmd({
    name: 'ship',
    description: 'Calcula la compatibilidad entre dos usuarios',
    category: 'Diversión',
    options: [user('usuario1', 'Primer usuario', true), user('usuario2', 'Segundo usuario', false)],
    run: async (ctx) => {
      const a = ctx.userOpt('usuario1');
      const b = ctx.userOpt('usuario2') || ctx.user;
      const key = [a.id, b.id].sort().join(':');
      let hash = 0;
      for (const char of key) hash = (hash * 31 + char.charCodeAt(0)) % 1000;
      const percent = hash % 101;
      const phrase = percent > 85 ? '¡Almas gemelas del rol! 💍' : percent > 60 ? 'Hay química... 😏' : percent > 40 ? 'Podría funcionar con esfuerzo. 😅' : percent > 20 ? 'Mejor sigan como amigos. 🤝' : 'Ni en pedo. 💔';
      return ctx.reply({ embeds: [embed().setTitle('💘 Ship').setDescription(`**${a.username}** + **${b.username}**\n\n${progressBar(percent, 100, 12)}\n\n**${percent}%** — ${phrase}`)] });
    },
  }),
  cmd({
    name: 'rate',
    description: 'Puntúa algo del 0 al 100',
    category: 'Diversión',
    options: [str('cosa', 'Qué querés puntuar', true, { max_length: 200 })],
    run: async (ctx) => {
      const value = randomInt(0, 100);
      return ctx.reply({ embeds: [embed().setTitle(`⭐ Puntuación: ${value}/100`).setDescription(`**${ctx.str('cosa')}**\n${progressBar(value, 100, 12)}`)] });
    },
  }),
  cmd({
    name: 'chiste',
    description: 'Cuenta un chiste de rol',
    category: 'Diversión',
    run: async (ctx) => ctx.reply({ embeds: [embed().setTitle('😂 Chiste').setDescription(sample(JOKES))] }),
  }),
  cmd({
    name: 'dato',
    description: 'Muestra un dato curioso sobre rol y SA-MP',
    category: 'Diversión',
    run: async (ctx) => ctx.reply({ embeds: [embed().setTitle('💡 Dato curioso').setDescription(sample(FACTS))] }),
  }),
  cmd({
    name: 'preferirias',
    description: '¿Qué preferirías? El bot elige dos opciones',
    category: 'Diversión',
    run: async (ctx) => {
      const [a, b] = sample(WOULD_YOU);
      return ctx.reply({ embeds: [embed().setTitle('🤔 ¿Qué preferirías?').setDescription(`**A)** ${a}\n\n**B)** ${b}`).setFooter({ text: 'Respondé en el chat con A o B' })] });
    },
  }),
  cmd({
    name: 'verdad',
    description: 'Hace una pregunta de verdad',
    category: 'Diversión',
    run: async (ctx) => ctx.reply({ embeds: [embed().setTitle('💬 Verdad').setDescription(sample(TRUTHS))] }),
  }),
  cmd({
    name: 'reto',
    description: 'Propone un reto para el rol',
    category: 'Diversión',
    run: async (ctx) => ctx.reply({ embeds: [embed().setTitle('🔥 Reto').setDescription(sample(DARES))] }),
  }),
  cmd({
    name: 'abrazar',
    description: 'Abraza a un usuario',
    category: 'Diversión',
    options: [user('usuario', 'A quién querés abrazar', true)],
    run: async (ctx) => {
      const targetUser = ctx.userOpt('usuario');
      return ctx.reply({ embeds: [embed().setTitle('🤗 Abrazo').setDescription(`${ctx.user} le dio un abrazo enorme a ${targetUser}.`)] });
    },
  }),
];
