// scripts/ecosystem.config.cjs
// Cross-platform:
// - APPIUM_BIN 지정 시 해당 실행파일 직접 사용
// - 미지정 시 npx appium 사용 (Windows: npx.cmd)
const isWin = process.platform === 'win32';
const appiumBin = (process.env.APPIUM_BIN || '').trim();
const script = appiumBin || (isWin ? 'npx.cmd' : 'npx');
const useNpx = !appiumBin;

function buildArgs(rawArgs) {
  const parts = useNpx ? ['appium'] : [];
  parts.push(...rawArgs);
  return parts.join(' ');
}

function app(name, rawArgs) {
  return {
    name,
    script,
    args: buildArgs(rawArgs),
    watch: false,
    interpreter: 'none',
  };
}

module.exports = {
  apps: [
    // iOS (4대) - Appium Port + WDA Port 모두 유니크
    app('appium-iOS-01', [
      '-p 5005',
      '-pa /',
      '--driver-xcuitest-webdriveragent-port 8102',
      '--log-timestamp',
      '--local-timezone',
      '--allow-cors',
      '--relaxed-security',
    ]),
    app('appium-iOS-02', [
      '-p 5006',
      '-pa /',
      '--driver-xcuitest-webdriveragent-port 8103',
      '--log-timestamp',
      '--local-timezone',
      '--allow-cors',
      '--relaxed-security',
    ]),
    app('appium-iOS-03', [
      '-p 5007',
      '-pa /',
      '--driver-xcuitest-webdriveragent-port 8104',
      '--log-timestamp',
      '--local-timezone',
      '--allow-cors',
      '--relaxed-security',
    ]),
    app('appium-iOS-04', [
      '-p 5008',
      '-pa /',
      '--driver-xcuitest-webdriveragent-port 8105',
      '--log-timestamp',
      '--local-timezone',
      '--allow-cors',
      '--relaxed-security',
    ]),

    // Android (4대) - Appium Port 유니크
    app('appium-AOS-01', [
      '--port 5001',
      '-pa /',
      '--log-timestamp',
      '--local-timezone',
      '--allow-cors',
      '--relaxed-security',
    ]),
    app('appium-AOS-02', [
      '--port 5002',
      '-pa /',
      '--log-timestamp',
      '--local-timezone',
      '--allow-cors',
      '--relaxed-security',
    ]),
    app('appium-AOS-03', [
      '--port 5003',
      '-pa /',
      '--log-timestamp',
      '--local-timezone',
      '--allow-cors',
      '--relaxed-security',
    ]),
    app('appium-AOS-04', [
      '--port 5004',
      '-pa /',
      '--log-timestamp',
      '--local-timezone',
      '--allow-cors',
      '--relaxed-security',
    ]),
  ],
};
