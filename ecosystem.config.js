module.exports = {
  apps: [{
    name: 'authroom-api',
    script: 'index.js',
    out_file: '/dev/null',
    error_file: '/dev/null',
    instances: 1,
    exec_mode: 'cluster',
    autorestart: true,
    max_memory_restart: '600M'

  }]
};
