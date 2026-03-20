// scripts/ecosystem.config.cjs
module.exports = {
  apps: [
    // =========================
    // iOS (2대) - Appium Port + WDA Port 모두 유니크
    // =========================
    {
      name: 'appium-iOS-01',
      script: '/Users/p214425/.nvm/versions/node/v24.13.1/bin/appium',
      args: [
        '-p 15002',
        '-pa /',
        '--driver-xcuitest-webdriveragent-port 8102',
        '--log-timestamp',
        '--local-timezone',
        '--allow-cors',
        '--relaxed-security'
      ].join(' '),
      watch: false
    },
    {
      name: 'appium-iOS-02',
      script: '/Users/p214425/.nvm/versions/node/v24.13.1/bin/appium',
      args: [
        '-p 15003',
        '-pa /',
        '--driver-xcuitest-webdriveragent-port 8103',
        '--log-timestamp',
        '--local-timezone',
        '--allow-cors',
        '--relaxed-security'
      ].join(' '),
      watch: false
    },

    // =========================
    // Android (2대) - Appium Port 유니크
    // =========================
    {
      name: 'appium-AOS-01',
      script: '/Users/p214425/.nvm/versions/node/v24.13.1/bin/appium',
      args: [
        '--port 4723',
        '-pa /',
        '--log-timestamp',
        '--local-timezone',
        '--allow-cors',
        '--relaxed-security'
      ].join(' '),
      watch: false
    },
    {
      name: 'appium-AOS-02',
      script: '/Users/p214425/.nvm/versions/node/v24.13.1/bin/appium',
      args: [
        '--port 4724',
        '-pa /',
        '--log-timestamp',
        '--local-timezone',
        '--allow-cors',
        '--relaxed-security'
      ].join(' '),
      watch: false
    }
  ]
};