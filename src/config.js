'use strict';
require('dotenv').config({ quiet: true });

const int = (v, def) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : def);
const list = (v) => String(v || '').split(',').map((s) => s.trim()).filter(Boolean);

module.exports = {
  token: process.env.DISCORD_TOKEN,
  clientId: process.env.CLIENT_ID,
  guildId: process.env.GUILD_ID || null,
  // Registro automático de comandos slash al arrancar (DEPLOY_COMMANDS=false para desactivarlo)
  deployCommands: String(process.env.DEPLOY_COMMANDS ?? 'true').toLowerCase() !== 'false',
  owners: list(process.env.OWNER_IDS),
  staffRoles: list(process.env.STAFF_ROLE_IDS),
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/ocaso-rp',
  mongoDb: process.env.MONGODB_DB || 'ocaso-rp',
  brand: {
    name: process.env.SAMP_NAME || 'Ocaso Roleplay',
    short: 'Ocaso RP',
    color: parseInt((process.env.BRAND_COLOR || '#E8A33D').replace('#', ''), 16) || 0xe8a33d,
    colorError: 0xed4245,
    colorOk: 0x57f287,
    colorWarn: 0xfee75c,
    samp: {
      host: process.env.SAMP_HOST || '127.0.0.1',
      port: int(process.env.SAMP_PORT, 7777),
      discord: process.env.SAMP_DISCORD || '',
    },
    footer: 'Ocaso Roleplay • SA-MP',
  },
};
