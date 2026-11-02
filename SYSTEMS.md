# 🧩 Sistemas de Ocaso Roleplay Bot

> Documento generado automáticamente con `npm run systems`. **230 sistemas** implementados sobre discord.js v14 y MongoDB.

| Categoría | Sistemas |
| --- | ---: |
| AutoMod | 22 |
| Comunidad | 18 |
| Configuración | 33 |
| Diversión | 12 |
| Economía | 25 |
| Moderación | 29 |
| Niveles | 9 |
| SA-MP | 28 |
| Staff | 8 |
| Tickets | 13 |
| Utilidad | 33 |
| **Total** | **230** |

---

## AutoMod (22)

| Sistema | Comando | Descripción | Acceso |
| --- | --- | --- | --- |
| automod configurar | `/automod configurar` | Configura el AutoMod de Ocaso Roleplay | ManageGuild |
| automod emojis | `/automod emojis` | Configura el límite de emojis por mensaje | ManageGuild |
| automod estado | `/automod estado` | Muestra el estado detallado de AutoMod | ManageGuild |
| automod flood | `/automod flood` | Configura el filtro de mensajes repetidos (flood) | ManageGuild |
| automod historial | `/automod historial` | Muestra el historial de infracciones de un usuario | Staff |
| automod invites | `/automod invites` | Activa o desactiva el bloqueo de invitaciones de Discord | ManageGuild |
| automod links | `/automod links` | Configura el filtro de enlaces | ManageGuild |
| automod mayusculas | `/automod mayusculas` | Configura el filtro de mayúsculas excesivas | ManageGuild |
| automod menciones | `/automod menciones` | Configura el límite de menciones por mensaje | ManageGuild |
| automod modo-panico | `/automod modo-panico` | Activa el modo pánico (verificación alta + filtros estrictos) | Administrator |
| automod palabras-agregar | `/automod palabras-agregar` | Agrega palabras prohibidas al filtro | ManageGuild |
| automod palabras-lista | `/automod palabras-lista` | Lista las palabras prohibidas configuradas | ManageGuild |
| automod palabras-quitar | `/automod palabras-quitar` | Quita palabras del filtro | ManageGuild |
| automod perdonar | `/automod perdonar` | Borra los strikes de AutoMod de un usuario | Staff |
| automod phishing | `/automod phishing` | Activa la detección de enlaces de phishing | ManageGuild |
| automod raid | `/automod raid` | Configura la detección de raids | ManageGuild |
| automod spam | `/automod spam` | Configura el filtro anti-spam | ManageGuild |
| automod strikes | `/automod strikes` | Configura el escalado de sanciones por strikes | ManageGuild |
| automod whitelist-canal | `/automod whitelist-canal` | Exime un canal de AutoMod | ManageGuild |
| automod whitelist-lista | `/automod whitelist-lista` | Lista las exenciones de AutoMod | ManageGuild |
| automod whitelist-rol | `/automod whitelist-rol` | Exime un rol de AutoMod | ManageGuild |
| automod whitelist-usuario | `/automod whitelist-usuario` | Exime un usuario de AutoMod | ManageGuild |

## Comunidad (18)

| Sistema | Comando | Descripción | Acceso |
| --- | --- | --- | --- |
| bio | `/bio` | Establece tu biografía de perfil | Público |
| confesion | `/confesion` | Envía una confesión anónima al staff | Público |
| cumpleanos | `/cumpleanos` | Configura tu fecha de cumpleaños | Público |
| cumpleanos-config | `/cumpleanos-config` | Configura los anuncios de cumpleaños | ManageGuild |
| evento-crear | `/evento-crear` | Crea un evento comunitario | ManageEvents |
| evento-finalizar | `/evento-finalizar` | Finaliza un evento y anuncia a los participantes | ManageEvents |
| evento-lista | `/evento-lista` | Lista los próximos eventos | Público |
| feedback | `/feedback` | Enviá feedback sobre el servidor o el staff | Público |
| perfil | `/perfil` | Muestra el perfil completo de un usuario | Público |
| rep | `/rep` | Dale reputación a otro usuario | Público |
| rep-ranking | `/rep-ranking` | Ranking de reputación del servidor | Público |
| roles-reaccion-crear | `/roles-reaccion-crear` | Crea un panel de roles autoasignables | ManageGuild |
| roles-reaccion-lista | `/roles-reaccion-lista` | Lista los paneles de roles autoasignables | ManageGuild |
| sorteo-crear | `/sorteo-crear` | Crea un sorteo en el canal actual | ManageGuild |
| sorteo-finalizar | `/sorteo-finalizar` | Finaliza un sorteo antes de tiempo | ManageGuild |
| sorteo-reroll | `/sorteo-reroll` | Vuelve a sortear un sorteo finalizado | ManageGuild |
| starboard-config | `/starboard-config` | Configura el canal de mensajes destacados | ManageGuild |
| sugerencias-config | `/sugerencias-config` | Configura el canal de sugerencias | ManageGuild |

## Configuración (33)

| Sistema | Comando | Descripción | Acceso |
| --- | --- | --- | --- |
| autorol agregar | `/autorol agregar` | Añade un rol automático para los nuevos miembros | ManageGuild |
| autorol lista | `/autorol lista` | Lista los roles automáticos configurados | ManageGuild |
| autorol quitar | `/autorol quitar` | Quita un rol automático | ManageGuild |
| ayuda | `/ayuda` | Lista los comandos disponibles o explica uno en detalle | Público |
| bienvenida canal | `/bienvenida canal` | Establece el canal de bienvenidas | ManageGuild |
| bienvenida configurar | `/bienvenida configurar` | Configura el sistema de bienvenidas | ManageGuild |
| bienvenida desactivar | `/bienvenida desactivar` | Desactiva las bienvenidas | ManageGuild |
| bienvenida imagen | `/bienvenida imagen` | Establece la imagen o miniatura de bienvenida | ManageGuild |
| bienvenida mensaje | `/bienvenida mensaje` | Establece el mensaje y título de bienvenida | ManageGuild |
| bienvenida test | `/bienvenida test` | Envía un mensaje de bienvenida de prueba | ManageGuild |
| boost configurar | `/boost configurar` | Configura el mensaje y rol de boosts | ManageGuild |
| config autorespuesta-borrar | `/config autorespuesta-borrar` | Elimina una respuesta automática | ManageGuild |
| config autorespuesta-crear | `/config autorespuesta-crear` | Crea una respuesta automática a palabras clave | ManageGuild |
| config comando-borrar | `/config comando-borrar` | Elimina un comando personalizado | ManageGuild |
| config comando-crear | `/config comando-crear` | Crea un comando personalizado con prefijo | ManageGuild |
| config logs | `/config logs` | Configura el canal de logs por tipo de evento | ManageGuild |
| config mantenimiento | `/config mantenimiento` | Activa o desactiva el modo mantenimiento del bot | Dueño |
| config prefijo | `/config prefijo` | Cambia el prefijo de comandos personalizados | ManageGuild |
| config sticky | `/config sticky` | Fija un mensaje al final de un canal | ManageChannels |
| config ver | `/config ver` | Muestra la configuración actual del bot en el servidor | ManageGuild |
| contador borrar | `/contador borrar` | Elimina un contador configurado | ManageGuild |
| contador crear | `/contador crear` | Crea un canal contador automático (miembros, bots, tickets...) | ManageGuild |
| contador lista | `/contador lista` | Lista los contadores configurados | ManageGuild |
| despedida canal | `/despedida canal` | Establece el canal de despedidas | ManageGuild |
| despedida configurar | `/despedida configurar` | Configura el sistema de despedidas | ManageGuild |
| despedida desactivar | `/despedida desactivar` | Desactiva las despedidas | ManageGuild |
| despedida mensaje | `/despedida mensaje` | Establece el mensaje de despedida | ManageGuild |
| despedida test | `/despedida test` | Envía un mensaje de despedida de prueba | ManageGuild |
| setup | `/setup` | Crea la estructura recomendada de canales y roles | Administrator |
| sistemas | `/sistemas` | Lista todos los sistemas del bot agrupados por categoría | Público |
| verificacion configurar | `/verificacion configurar` | Configura el sistema de verificación | ManageGuild |
| verificacion desactivar | `/verificacion desactivar` | Desactiva el sistema de verificación | ManageGuild |
| verificacion panel | `/verificacion panel` | Publica el panel de verificación | ManageGuild |

## Diversión (12)

| Sistema | Comando | Descripción | Acceso |
| --- | --- | --- | --- |
| 8ball | `/8ball` | Preguntale algo a la bola mágica | Público |
| abrazar | `/abrazar` | Abraza a un usuario | Público |
| chiste | `/chiste` | Cuenta un chiste de rol | Público |
| coinflip | `/coinflip` | Lanza una moneda al aire | Público |
| dato | `/dato` | Muestra un dato curioso sobre rol y SA-MP | Público |
| dice | `/dice` | Tira uno o varios dados | Público |
| preferirias | `/preferirias` | ¿Qué preferirías? El bot elige dos opciones | Público |
| rate | `/rate` | Puntúa algo del 0 al 100 | Público |
| reto | `/reto` | Propone un reto para el rol | Público |
| rps | `/rps` | Jugá piedra, papel o tijera contra el bot | Público |
| ship | `/ship` | Calcula la compatibilidad entre dos usuarios | Público |
| verdad | `/verdad` | Hace una pregunta de verdad | Público |

## Economía (25)

| Sistema | Comando | Descripción | Acceso |
| --- | --- | --- | --- |
| eco apostar | `/eco apostar` | Apuesta dinero al cara o cruz | Público |
| eco balance | `/eco balance` | Muestra tu saldo o el de otro usuario | Público |
| eco banco | `/eco banco` | Muestra tu cuenta bancaria | Público |
| eco comprar | `/eco comprar` | Compra un objeto de la tienda | Público |
| eco crimen | `/eco crimen` | Cometé un crimen para ganar dinero (con riesgo) | Público |
| eco depositar | `/eco depositar` | Deposita dinero en el banco | Público |
| eco diario | `/eco diario` | Reclama tu recompensa diaria | Público |
| eco interes | `/eco interes` | Reclama el interés diario de tu cuenta bancaria | Público |
| eco inventario | `/eco inventario` | Muestra tu inventario | Público |
| eco mendigar | `/eco mendigar` | Pedí dinero en la calle | Público |
| eco minar | `/eco minar` | Mina recursos para ganar dinero | Público |
| eco pagar | `/eco pagar` | Paga dinero a otro jugador | Público |
| eco pescar | `/eco pescar` | Pesca en el muelle para ganar dinero | Público |
| eco premio | `/eco premio` | Otorga dinero a un usuario (staff) | ManageGuild |
| eco ranking | `/eco ranking` | Ranking de los jugadores más ricos | Público |
| eco reset | `/eco reset` | Reinicia la economía de un usuario (staff) | Administrator |
| eco retirar | `/eco retirar` | Retira dinero del banco | Público |
| eco robar | `/eco robar` | Intenta robarle dinero a otro jugador | Público |
| eco ruleta | `/eco ruleta` | Juega a la ruleta (color o paridad) | Público |
| eco semanal | `/eco semanal` | Reclama tu recompensa semanal | Público |
| eco setbal | `/eco setbal` | Establece el saldo de un usuario (staff) | ManageGuild |
| eco tienda | `/eco tienda` | Muestra la tienda del servidor | Público |
| eco trabajar | `/eco trabajar` | Trabaja en Ocaso Roleplay para ganar dinero | Público |
| eco tragaperras | `/eco tragaperras` | Juega a la máquina tragamonedas | Público |
| eco vender | `/eco vender` | Vende un objeto de tu inventario al 50% | Público |

## Moderación (29)

| Sistema | Comando | Descripción | Acceso |
| --- | --- | --- | --- |
| canal addrole | `/canal addrole` | Añade un rol a un miembro | ManageRoles |
| canal hide | `/canal hide` | Oculta el canal actual para todos | ManageChannels |
| canal lock | `/canal lock` | Bloquea el canal actual para que nadie escriba | ManageChannels |
| canal nick | `/canal nick` | Cambia el apodo de un miembro | ManageNicknames |
| canal nuke | `/canal nuke` | Clona y recrea el canal eliminando todo el historial | ManageChannels |
| canal purge | `/canal purge` | Borra mensajes en el canal actual | ManageMessages |
| canal remrole | `/canal remrole` | Quita un rol a un miembro | ManageRoles |
| canal slowmode | `/canal slowmode` | Configura el modo lento del canal | ManageChannels |
| canal unhide | `/canal unhide` | Vuelve a mostrar el canal actual | ManageChannels |
| canal unlock | `/canal unlock` | Desbloquea el canal actual | ManageChannels |
| mod ban | `/mod ban` | Banea a un miembro del servidor | BanMembers |
| mod banlist | `/mod banlist` | Lista los usuarios baneados del servidor | BanMembers |
| mod caso | `/mod caso` | Muestra un caso de moderación por número | ModerateMembers |
| mod casos | `/mod casos` | Lista el historial de sanciones de un usuario | ModerateMembers |
| mod clearwarns | `/mod clearwarns` | Borra todas las advertencias de un usuario | ModerateMembers |
| mod delwarn | `/mod delwarn` | Elimina una advertencia por número de caso | ModerateMembers |
| mod kick | `/mod kick` | Expulsa a un miembro del servidor | KickMembers |
| mod massban | `/mod massban` | Banea a varios usuarios por ID a la vez | BanMembers |
| mod nota | `/mod nota` | Añade una nota interna sobre un usuario | ModerateMembers |
| mod notas | `/mod notas` | Muestra las notas internas de un usuario | ModerateMembers |
| mod sanciones | `/mod sanciones` | Muestra las últimas sanciones del servidor | ModerateMembers |
| mod softban | `/mod softban` | Banea y desbanea para borrar mensajes del usuario | BanMembers |
| mod stats | `/mod stats` | Estadísticas de moderación de un staff | Público |
| mod tempban | `/mod tempban` | Banea temporalmente a un miembro | BanMembers |
| mod timeout | `/mod timeout` | Silencia temporalmente a un miembro | ModerateMembers |
| mod timeout-quitar | `/mod timeout-quitar` | Quita el timeout de un miembro | ModerateMembers |
| mod unban | `/mod unban` | Desbanea a un usuario por su ID | BanMembers |
| mod warn | `/mod warn` | Advierte a un miembro | ModerateMembers |
| mod warns | `/mod warns` | Muestra las advertencias de un miembro | ModerateMembers |

## Niveles (9)

| Sistema | Comando | Descripción | Acceso |
| --- | --- | --- | --- |
| nivel addxp | `/nivel addxp` | Otorga XP a un usuario (staff) | Staff |
| nivel config | `/nivel config` | Configura el sistema de niveles | ManageGuild |
| nivel perfil | `/nivel perfil` | Muestra tu tarjeta de nivel o la de otro usuario | Público |
| nivel ranking | `/nivel ranking` | Ranking de nivel del servidor | Público |
| nivel recompensa-agregar | `/nivel recompensa-agregar` | Añade una recompensa de rol por nivel | ManageGuild |
| nivel recompensa-quitar | `/nivel recompensa-quitar` | Quita la recompensa de un nivel | ManageGuild |
| nivel recompensas | `/nivel recompensas` | Lista las recompensas por nivel | Público |
| nivel reset | `/nivel reset` | Reinicia el nivel de un usuario (staff) | Administrator |
| nivel top-voz | `/nivel top-voz` | Ranking de horas en canales de voz | Público |

## SA-MP (28)

| Sistema | Comando | Descripción | Acceso |
| --- | --- | --- | --- |
| cuenta desvincular | `/cuenta desvincular` | Desvincula tu personaje de SA-MP de tu cuenta de Discord | Público |
| cuenta editar | `/cuenta editar` | Edita las estadísticas de un personaje (staff) | ManageGuild |
| cuenta perfil | `/cuenta perfil` | Muestra el perfil de rol de un jugador | Público |
| cuenta ranking | `/cuenta ranking` | Ranking de jugadores por nivel de rol | Público |
| cuenta vincular | `/cuenta vincular` | Vincula tu cuenta de Discord con tu personaje de SA-MP | Público |
| faccion borrar | `/faccion borrar` | Elimina una facción (administración) | ManageGuild |
| faccion crear | `/faccion crear` | Crea una facción nueva (administración) | ManageGuild |
| faccion editar | `/faccion editar` | Edita los datos de una facción | ManageGuild |
| faccion info | `/faccion info` | Muestra la información de una facción | Público |
| faccion lista | `/faccion lista` | Lista todas las facciones del servidor | Público |
| faccion miembros | `/faccion miembros` | Lista los miembros de una facción | Público |
| faccion rango | `/faccion rango` | Cambia el rango de un miembro de la facción | ManageRoles |
| faccion salir | `/faccion salir` | Sale de tu facción actual | Público |
| faccion unir | `/faccion unir` | Añade un usuario a una facción | ManageRoles |
| propiedad asignar | `/propiedad asignar` | Asigna una propiedad a un jugador | ManageGuild |
| propiedad crear | `/propiedad crear` | Registra una propiedad nueva (administración) | ManageGuild |
| propiedad info | `/propiedad info` | Muestra el detalle de una propiedad | Público |
| propiedad liberar | `/propiedad liberar` | Libera una propiedad de su dueño actual | ManageGuild |
| propiedad lista | `/propiedad lista` | Lista las propiedades del servidor | Público |
| samp clientes | `/samp clientes` | Lista las versiones de cliente conectadas al servidor | Público |
| samp conectar | `/samp conectar` | Guía paso a paso para instalar SA-MP y entrar al servidor | Público |
| samp estado | `/samp estado` | Muestra el estado en vivo del servidor SA-MP | Público |
| samp info | `/samp info` | Muestra cómo conectarse a Ocaso Roleplay | Público |
| samp jugadores | `/samp jugadores` | Lista los jugadores conectados al servidor SA-MP | Público |
| samp ping | `/samp ping` | Mide la latencia del servidor SA-MP con 3 consultas | Público |
| samp ranking | `/samp ranking` | Ranking de horas jugadas en el servidor | Público |
| samp reglas | `/samp reglas` | Muestra las reglas configuradas en el servidor SA-MP | Público |
| samp stats | `/samp stats` | Estadísticas generales del rol y del servidor | Público |

## Staff (8)

| Sistema | Comando | Descripción | Acceso |
| --- | --- | --- | --- |
| staff apelacion | `/staff apelacion` | Enviá una apelación de sanción | Público |
| staff entrevista | `/staff entrevista` | Crea una entrevista privada con un postulante | Staff |
| staff postulacion-config | `/staff postulacion-config` | Configura un tipo de postulación | ManageGuild |
| staff postulacion-lista | `/staff postulacion-lista` | Lista las postulaciones pendientes | Staff |
| staff postulacion-panel | `/staff postulacion-panel` | Publica el panel de postulaciones | ManageGuild |
| staff reportes-config | `/staff reportes-config` | Configura el sistema de reportes y apelaciones | ManageGuild |
| staff stats | `/staff stats` | Estadísticas de actividad del staff | Staff |
| staff whitelist-panel | `/staff whitelist-panel` | Publica el panel de whitelist (reglas + verificación) | ManageGuild |

## Tickets (13)

| Sistema | Comando | Descripción | Acceso |
| --- | --- | --- | --- |
| ticket anadir | `/ticket anadir` | Añade un usuario al ticket actual | Staff |
| ticket categoria-borrar | `/ticket categoria-borrar` | Elimina una categoría de tickets | ManageGuild |
| ticket categoria-crear | `/ticket categoria-crear` | Crea una categoría de tickets | ManageGuild |
| ticket categoria-lista | `/ticket categoria-lista` | Lista las categorías de tickets | ManageGuild |
| ticket cerrar | `/ticket cerrar` | Cierra el ticket actual y genera la transcripción | Público |
| ticket configurar | `/ticket configurar` | Configura el sistema de tickets | ManageGuild |
| ticket lista | `/ticket lista` | Lista los tickets abiertos | Staff |
| ticket panel | `/ticket panel` | Publica el panel de apertura de tickets | ManageGuild |
| ticket prioridad | `/ticket prioridad` | Cambia la prioridad del ticket actual | Staff |
| ticket quitar | `/ticket quitar` | Quita un usuario del ticket actual | Staff |
| ticket reclamar | `/ticket reclamar` | Reclama el ticket actual como staff | Staff |
| ticket stats | `/ticket stats` | Estadísticas del sistema de tickets | Staff |
| ticket transcript | `/ticket transcript` | Genera la transcripción del ticket actual | Staff |

## Utilidad (33)

| Sistema | Comando | Descripción | Acceso |
| --- | --- | --- | --- |
| afk | `/afk` | Activa o desactiva tu estado AFK | Público |
| avatar | `/avatar` | Muestra el avatar de un usuario | Público |
| banner | `/banner` | Muestra el banner de un usuario | Público |
| base64 | `/base64` | Codifica o decodifica texto en Base64 | Público |
| boosters | `/boosters` | Lista los usuarios que boostearon el servidor | Público |
| bots | `/bots` | Lista los bots del servidor | Público |
| bug | `/bug` | Reporta un bug del servidor o del bot | Público |
| calc | `/calc` | Calcula una operación matemática | Público |
| canales | `/canales` | Lista los canales del servidor por categoría | Público |
| channelinfo | `/channelinfo` | Muestra información de un canal | Público |
| color | `/color` | Muestra un color aleatorio o uno específico | Público |
| editsnipe | `/editsnipe` | Muestra la última edición de mensaje en el canal | Público |
| emoji | `/emoji` | Muestra información de un emoji del servidor | Público |
| encuesta | `/encuesta` | Crea una encuesta con hasta 5 opciones | Público |
| hash | `/hash` | Genera el hash de un texto | Público |
| icono | `/icono` | Muestra el ícono del servidor | Público |
| id | `/id` | Obtiene el ID de un usuario, rol o canal | Público |
| inactivos | `/inactivos` | Lista usuarios sin actividad reciente registrada | Staff |
| invitacion | `/invitacion` | Crea una invitación al canal actual | CreateInstantInvite |
| miembros | `/miembros` | Muestra el desglose de miembros del servidor | Público |
| permisos | `/permisos` | Muestra los permisos de un miembro | Público |
| ping | `/ping` | Muestra la latencia del bot y de la API de Discord | Público |
| recordatorio | `/recordatorio` | Programa un recordatorio y te lo envío por MD | Público |
| recordatorios-lista | `/recordatorios-lista` | Lista tus recordatorios pendientes | Público |
| roleinfo | `/roleinfo` | Muestra información de un rol | Público |
| roles | `/roles` | Lista los roles del servidor | Público |
| serverinfo | `/serverinfo` | Muestra información del servidor | Público |
| snipe | `/snipe` | Muestra el último mensaje eliminado del canal | Público |
| sugerir | `/sugerir` | Envía una sugerencia al staff | Público |
| timestamp | `/timestamp` | Convierte una fecha a formato de Discord | Público |
| uptime | `/uptime` | Muestra hace cuánto está online el bot | Público |
| userinfo | `/userinfo` | Muestra información detallada de un usuario | Público |
| uuid | `/uuid` | Genera un UUID v4 aleatorio | Público |

---

*Última actualización: 2026-11-02*
