<div align="center">

# 🌅 Ocaso Roleplay Bot

**Bot de Discord completo para el servidor SA-MP Ocaso Roleplay**

[![discord.js](https://img.shields.io/badge/discord.js-v14-5865F2?style=for-the-badge&logo=discord&logoColor=white)](https://discord.js.org)
[![Node.js](https://img.shields.io/badge/Node.js-20%2B-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org)
[![MongoDB](https://img.shields.io/badge/MongoDB-8-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com)
[![Sistemas](https://img.shields.io/badge/sistemas-230-E8A33D?style=for-the-badge)](./SYSTEMS.md)
[![License](https://img.shields.io/badge/license-MIT-blue?style=for-the-badge)](./LICENSE)

Bienvenidas y despedidas · Tickets · AutoMod · Moderación · Economía · Niveles · Facciones · Sorteos · Eventos · Staff · SA-MP

</div>

---

## 📖 ¿Qué es esto?

Bot de Discord **listo para producción** pensado para un servidor de rol de SA-MP: **Ocaso Roleplay**.
Incluye **230 sistemas** reales (no placeholders) construidos con **discord.js v14**, **MongoDB/Mongoose** y
comandos slash en español, más un sistema de consulta **UDP nativo** para leer el estado del servidor SA-MP.

- 🎫 **Tickets** con categorías, panel con menú, reclamar, prioridad, añadir/quitar usuarios, transcripciones HTML y calificación.
- 🛡️ **AutoMod** con spam, flood, invites, links, phishing, mayúsculas, menciones, emojis, palabras prohibidas, anti-raid, strikes y modo pánico.
- 🔨 **Moderación** completa con casos, warns con escalado, bans temporales, softban, massban, notas y estadísticas de staff.
- 👋 **Bienvenidas/despedidas** configurables, autoroles, verificación, boosts, contadores automáticos y tarjetas de perfil.
- 💰 **Economía** con trabajo, banco, intereses, apuestas, ruleta, tienda e inventario.
- 🎮 **SA-MP**: estado en vivo vía query UDP, jugadores conectados, reglas, clientes, ping, ranking de horas, vinculación de personajes, facciones y propiedades.
- 🎉 **Comunidad**: sorteos con requisitos, eventos con inscripción, roles autoasignables, sugerencias, confesiones, cumpleaños y reputación.
- 🧑‍💼 **Staff**: postulaciones con formularios, apelaciones, whitelist, entrevistas y métricas de actividad.

👉 La lista completa de los **230 sistemas** está en **[SYSTEMS.md](./SYSTEMS.md)** (generada automáticamente desde el código).

---

## 🚀 Requisitos

| Requisito | Versión |
| --- | --- |
| Node.js | 20 o superior (probado en Node 22) |
| MongoDB | 6 o superior (local, Atlas o Docker) |
| Discord Bot | Token + aplicación con el bot añadido al servidor |
| Permisos del bot | `Administrator` recomendado (si no, ver [permisos](#-permisos-que-necesita-el-bot)) |

### Intents privilegiados (obligatorio)

En el [Discord Developer Portal](https://discord.com/developers/applications) → tu aplicación → **Bot** → *Privileged Gateway Intents*:

- ✅ **Server Members Intent** (obligatorio: bienvenidas, autoroles, moderación)
- ✅ **Message Content Intent** (obligatorio: AutoMod, XP, autorespuestas, conteo)
- ⚪ **Presence Intent** (opcional: contador de usuarios online. Activá `USE_PRESENCE_INTENT=true` en el `.env`)

---

## ⚙️ Instalación paso a paso

```bash
# 1. Clonar el repositorio
git clone https://github.com/MarcosDev666/ocasorp-bot.git
cd ocasorp-bot

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
cp .env.example .env
# Editá .env con tu token, client ID y URI de MongoDB

# 4. Registrar los comandos slash
npm run deploy

# 5. Iniciar el bot
npm start
```

> 💡 Para desarrollo usá `npm run dev` (recarga automática con `node --watch`).

### Crear la base de datos con MongoDB Atlas (gratis)

1. Creá un cluster en [MongoDB Atlas](https://www.mongodb.com/atlas).
2. Creá un usuario de base de datos y habilitá el acceso desde tu IP (o `0.0.0.0/0` para probar).
3. Copiá el connection string y pegalo en `MONGODB_URI`, por ejemplo:
   ```env
   MONGODB_URI=mongodb+srv://usuario:password@cluster0.xxxxx.mongodb.net/ocaso-rp
   ```

### MongoDB local con Docker

```bash
docker run -d --name ocasorp-mongo -p 27017:27017 -v ocasorp_mongo:/data/db mongo:7
```

---

## 🔐 Variables de entorno

| Variable | Obligatoria | Descripción |
| --- | ---: | --- |
| `DISCORD_TOKEN` | ✅ | Token del bot (Developer Portal → Bot → Reset Token) |
| `CLIENT_ID` | ✅ | ID de la aplicación (Developer Portal → General Information) |
| `GUILD_ID` | ❌ | ID del servidor de pruebas. Si se define, los comandos se registran al instante en ese servidor |
| `MONGODB_URI` | ✅ | URI de conexión a MongoDB |
| `MONGODB_DB` | ❌ | Nombre de la base de datos (por defecto `ocaso-rp`) |
| `OWNER_IDS` | ❌ | IDs de dueños del bot separados por coma (acceso a comandos `ownerOnly`) |
| `STAFF_ROLE_IDS` | ❌ | IDs de roles de staff separados por coma (comandos `staffOnly`) |
| `SAMP_HOST` | ❌ | IP/dominio del servidor SA-MP de Ocaso Roleplay |
| `SAMP_PORT` | ❌ | Puerto del servidor SA-MP (por defecto `7777`) |
| `SAMP_NAME` | ❌ | Nombre del servidor mostrado en embeds |
| `SAMP_DISCORD` | ❌ | Invitación al Discord de Ocaso Roleplay |
| `BRAND_COLOR` | ❌ | Color principal de los embeds en hex (por defecto `#E8A33D`) |
| `USE_PRESENCE_INTENT` | ❌ | `true` para habilitar el contador de usuarios online (requiere activar el intent) |

---

## 🧭 Primeros pasos en el servidor

1. Invitá el bot con permisos de administrador.
2. Ejecutá **`/setup`** y confirmá: crea categorías, canales y roles recomendados y configura bienvenidas, despedidas, tickets, logs, sugerencias, reportes, economía y niveles.
3. Publicá los paneles:
   - `/ticket panel`
   - `/verificacion panel`
   - `/staff postulacion-panel`
   - `/staff whitelist-panel`
4. Configurá AutoMod: `/automod configurar activar:true` y `/automod estado`.
5. Ajustá la IP del servidor SA-MP en el `.env` y probá `/samp estado`.

> Los comandos con `/sistemas` muestran todos los sistemas agrupados por categoría y `/ayuda comando:<nombre>` explica cada uno.

---

## 🗂️ Estructura del proyecto

```
ocasorp-bot/
├── index.js                  # Punto de entrada: carga sistemas, conecta Mongo y login
├── deploy-commands.js        # Registro de comandos slash (global o por servidor)
├── src/
│   ├── config.js             # Configuración desde .env
│   ├── core/
│   │   ├── client.js         # Cliente de Discord (intents, partials, colecciones)
│   │   ├── context.js        # Contexto de comando: opciones, respuestas, confirmaciones
│   │   ├── loader.js         # Carga automática de los sistemas
│   │   ├── registry.js       # Registro, validación y agrupación de comandos
│   │   └── permissions.js    # Comprobación de permisos y staff
│   ├── database/
│   │   ├── connect.js
│   │   └── models/           # 23 modelos Mongoose (Guild, User, Ticket, Case, ...)
│   ├── events/               # interactionCreate, messageCreate, memberAdd, voice, logs...
│   ├── interactions/         # Botones, menús y modales (tickets, sorteos, reportes...)
│   ├── services/             # SA-MP query, AutoMod, tickets, niveles, transcripciones...
│   ├── systems/              # ➜ 230 sistemas agrupados por categoría
│   └── utils/                # embeds, formato, opciones, componentes, helpers
├── scripts/
│   ├── check.js              # Valida nombres, descripciones y límites de Discord
│   ├── smoke.js              # Pruebas de servicios (incluye servidor SA-MP simulado)
│   ├── dispatch-test.js      # Pruebas del dispatcher de interacciones
│   └── systems-doc.js        # Genera SYSTEMS.md
├── Dockerfile
├── docker-compose.yml
└── SYSTEMS.md                # Documentación de los 230 sistemas
```

### ¿Cómo agrego un sistema nuevo?

Creá un archivo dentro de `src/systems/<categoria>/` que exporte un comando o un array de comandos:

```js
'use strict';
const { cmd, getSettings } = require('../../utils/premade');
const { str } = require('../../utils/options');

module.exports = [
  cmd({
    name: 'saludar',                    // o 'grupo subcomando'
    description: 'Saluda a un usuario',
    category: 'Comunidad',
    options: [str('usuario', 'A quién saludar', true)],
    run: async (ctx) => {
      const user = ctx.str('usuario');
      return ctx.ok(`👋 ¡Hola ${user}!`);
    },
  }),
];
```

El loader lo detecta automáticamente, `/sistemas` lo lista y `npm run deploy` lo publica.  
Si el nombre tiene un espacio (`ticket panel`), se registra como subcomando del grupo `ticket`.

---

## 🧪 Scripts disponibles

| Comando | Qué hace |
| --- | --- |
| `npm start` | Inicia el bot |
| `npm run dev` | Inicia con recarga automática |
| `npm run deploy` | Registra/actualiza los comandos slash |
| `npm test` | Validación de comandos + pruebas de servicios + dispatcher |
| `npm run lint` | ESLint (`no-undef`, `no-unused-vars`, reglas de seguridad) |
| `npm run systems` | Regenera `SYSTEMS.md` a partir del código |

El proyecto está preparado para CI: con `npm ci && npm run lint && npm test` se valida todo antes de desplegar.

---

## 🐳 Docker

```bash
cp .env.example .env   # completá token, client id, etc.
docker compose up -d --build
docker compose logs -f bot
```

`docker-compose.yml` levanta MongoDB 7 + el bot en la misma red, con volumen persistente.

Con PM2 en un VPS:

```bash
npm i -g pm2
pm2 start ecosystem.config.js
pm2 save && pm2 startup
```

---

## 🎮 Sistema SA-MP

El bot habla el **protocolo de query UDP de SA-MP** directamente (sin dependencias externas): envía el paquete
`SAMP` + IP + puerto + opcode y parsea la respuesta.

| Opcode | Datos | Comando |
| --- | --- | --- |
| `i` | hostname, gamemode, idioma, jugadores, contraseña | `/samp estado` |
| `d` | lista de jugadores (id, nombre, score, ping) | `/samp jugadores` |
| `r` | reglas del servidor | `/samp reglas` |
| `c` | clientes conectados y versión | `/samp clientes` |

> El puerto de query es el mismo que el puerto del servidor (`7777` por defecto). Asegurate de que el hosting permita tráfico UDP de salida.

Además, `/cuenta vincular` asocia Discord ↔ personaje, y se usan esos datos en `/perfil`, `/samp ranking`,
`/faccion`, `/propiedad`, postulaciones y sanciones.

---

## 🔑 Permisos que necesita el bot

Con `Administrator` funciona todo. Si preferís permisos mínimos:

```
View Channels, Send Messages, Embed Links, Attach Files, Read Message History,
Manage Messages, Manage Channels, Manage Roles, Manage Nicknames,
Kick Members, Ban Members, Moderate Members, Add Reactions,
Use External Emojis, Mention Everyone, Create Instant Invite,
Manage Events, Create Private Threads, Send Messages in Threads
```

Permisos por comando: cada comando declara `perms` (usuario) y `botPerms` (bot) en su definición, y el handler
los valida antes de ejecutar con mensajes de error claros.

---

## 🛡️ Notas de seguridad y producción

- Nunca subas el archivo `.env` (ya está en `.gitignore`).
- Usá un token distinto para desarrollo y producción; rotalo si se filtra.
- En producción, restringí MongoDB por IP y usá un usuario con permisos solo sobre la base del bot.
- El bot guarda transcripciones en `transcripts/` (ignorado por Git). En Docker queda dentro del contenedor;
  montá un volumen si querés conservarlas.
- Las sanciones temporales se procesan con un scheduler interno (cada 45 s), no dependen de reinicios.
- `/setup`, `/canal nuke`, `/automod modo-panico` y `/eco reset` piden confirmación o permisos elevados.

---

## ❓ Problemas frecuentes

| Problema | Solución |
| --- | --- |
| Los comandos no aparecen | Ejecutá `npm run deploy`. Si son globales, esperá hasta 1 hora. Configurá `GUILD_ID` para pruebas instantáneas. |
| El bot se desconecta al iniciar | Revisá el token y que los intents privilegiados estén activados. |
| "Missing Permissions" | Verificá que el rol del bot esté por encima de los roles que intenta gestionar. |
| AutoMod no borra mensajes | Requiere **Message Content Intent**. Revisá que `/automod configurar activar:true`. |
| `/samp estado` da timeout | Verificá IP/puerto, que el servidor esté online y que el hosting permita query UDP. |
| MongoDB connection timeout | Revisá `MONGODB_URI`, el usuario/contraseña y la lista de IPs permitidas en Atlas. |
| El contador de miembros no cambia | Discord limita los renombrados de canales: el scheduler actualiza cada 10 minutos. |

---

## 📄 Licencia

MIT © Ocaso Roleplay. Ver [LICENSE](./LICENSE).

<div align="center">

Hecho con ❤️ para la comunidad de **Ocaso Roleplay** · SA-MP

</div>
