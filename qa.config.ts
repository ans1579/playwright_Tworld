import { defineConfig } from '@playwright/test';
import { execSync } from 'node:child_process';
import { commonConfig, makeReporter } from './playwright.base';
import { IOS_UDID_1, IOS_UDID_2 } from './appium/ios/env.ios';

const IOS_APPIUM_HOST = process.env.IOS_APPIUM_HOST ?? '127.0.0.1';
const IOS_APPIUM_PATH = process.env.IOS_APPIUM_PATH ?? '/';
const IOS_APPIUM_PORT_1 = Number(process.env.IOS_APPIUM_PORT_1 ?? 4724);
const IOS_APPIUM_PORT_2 = Number(process.env.IOS_APPIUM_PORT_2 ?? 4725);
const IOS_WDA_LOCAL_PORT_1 = Number(process.env.IOS_WDA_LOCAL_PORT_1 ?? 8102);
const IOS_WDA_LOCAL_PORT_2 = Number(process.env.IOS_WDA_LOCAL_PORT_2 ?? 8103);
const IOS_RETRIES = 1;
const AOS_RETRIES = 1;

function isIosDeviceConnected(udid: string): boolean {
  if (!udid) return false;
  try {
    const out = execSync('xcrun xcdevice list', {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    return out.includes(udid);
  } catch {
    return false;
  }
}

const forceIos2 = process.env.QA_IOS2_FORCE === '1';
const disableIos2 = process.env.QA_IOS2_DISABLE === '1';
const canUseSecondDevice = IOS_UDID_2 !== IOS_UDID_1 && isIosDeviceConnected(IOS_UDID_2);
const enableIos2 = !disableIos2 && (forceIos2 || canUseSecondDevice);

const projects: any[] = [
  {
    name: 'qa-ios',
    testMatch: /tests\/qa\/ios\/.*\.spec\.ts/,
    retries: IOS_RETRIES,
    use: {
      udid: IOS_UDID_1,
      appiumHost: IOS_APPIUM_HOST,
      appiumPort: IOS_APPIUM_PORT_1,
      appiumPath: IOS_APPIUM_PATH,
      wdaLocalPort: IOS_WDA_LOCAL_PORT_1,
    } as any,
  },
];

if (enableIos2) {
  projects.push({
    name: 'qa-ios-2',
    testMatch: /tests\/qa\/ios\/.*\.spec\.ts/,
    retries: IOS_RETRIES,
    use: {
      udid: IOS_UDID_2,
      appiumHost: IOS_APPIUM_HOST,
      appiumPort: IOS_APPIUM_PORT_2,
      appiumPath: IOS_APPIUM_PATH,
      wdaLocalPort: IOS_WDA_LOCAL_PORT_2,
    } as any,
  });
} else {
  console.log(`[qa.config] qa-ios-2 자동 비활성화 (udid=${IOS_UDID_2})`);
}

projects.push({
  name: 'qa-aos',
  testMatch: /tests\/qa\/aos\/.*\.spec\.ts/,
  retries: AOS_RETRIES,
});

export default defineConfig({
  ...commonConfig,
  globalSetup: './scripts/qa.global-setup.ts',
  workers: Number(process.env.QA_WORKERS ?? 1),
  outputDir: 'test-output/test-results/qa',
  reporter: makeReporter('test-output/reports/qa/latest'),
  projects,
});
