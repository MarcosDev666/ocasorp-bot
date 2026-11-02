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
