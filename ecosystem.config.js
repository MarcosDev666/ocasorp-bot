module.exports = {
  apps: [{
    name: 'ocasorp-bot',
    script: 'index.js',
    instances: 1,
    autorestart: true,
    max_memory_restart: '800M',
    env: { NODE_ENV: 'production' },
    error_file: 'logs/error.log',
    out_file: 'logs/out.log',
    time: true,
  }],
};

// Los comandos slash se registran solos al arrancar (index.js), sin pasos extra en el host.
// Si tu hosting reinicia muy seguido y no querés ese PUT en cada arranque,
// agregá DEPLOY_COMMANDS: 'false' dentro de `env` y corré `npm run deploy` cuando cambien los comandos.
