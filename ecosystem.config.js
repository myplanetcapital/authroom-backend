module.exports = {
    apps : [{
      name: 'authroom-backend',
      script: 'index.js',
      out_file: '/dev/null',
      error_file: '/dev/null',
      instances: 3,
      exec_mode: 'cluster',
      autorestart: true,
      max_memory_restart: '600M'
      
    }
    ],
  
    deploy : {
      production : {
        user : 'ubuntu',
        host : ["192.168.0.35"],
        ssh_options: "StrictHostKeyChecking=no",
        ref  : 'origin/main',
        repo : 'git@github.com:myplanetcapital/authroom-backend.git',
        path : '/var/www/backend/authroom-backend',
        'pre-deploy-local': "echo 'This is a local executed command'",
        'post-deploy' : 'source ~/.nvm/nvm.sh && npm install && pm2 reload ecosystem.config.js --env production',
        'pre-setup': '',
      }
    }
  };
