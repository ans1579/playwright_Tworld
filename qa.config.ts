import { defineConfig } from '@playwright/test';
import { execSync } from 'node:child_process';
import { commonConfig, makeReporter } from './playwright.base';
import { isAndroidDeviceConnectedByAdb } from './appium/adb.util';
import { IOS_UDID_1, IOS_UDID_2, IOS_UDID_3, IOS_UDID_4 } from './appium/ios/env.ios';
import {
  ANDROID_UDID_1,
  ANDROID_UDID_2,
  ANDROID_UDID_3,
  ANDROID_UDID_4,
  APPIUM_HOST as AOS_APPIUM_HOST,
  APPIUM_PATH as AOS_APPIUM_PATH,
  APPIUM_PORT_1 as AOS_APPIUM_PORT_1,
  APPIUM_PORT_2 as AOS_APPIUM_PORT_2,
  APPIUM_PORT_3 as AOS_APPIUM_PORT_3,
  APPIUM_PORT_4 as AOS_APPIUM_PORT_4,
  AOS_SYSTEM_PORT_1,
  AOS_SYSTEM_PORT_2,
  AOS_SYSTEM_PORT_3,
  AOS_SYSTEM_PORT_4,
  AOS_MJPEG_PORT_1,
  AOS_MJPEG_PORT_2,
  AOS_MJPEG_PORT_3,
  AOS_MJPEG_PORT_4,
  AOS_WEBVIEW_DEVTOOLS_PORT_1,
  AOS_WEBVIEW_DEVTOOLS_PORT_2,
  AOS_WEBVIEW_DEVTOOLS_PORT_3,
  AOS_WEBVIEW_DEVTOOLS_PORT_4,
} from './appium/aos/env.aos';

const IOS_APPIUM_HOST = process.env.IOS_APPIUM_HOST ?? '127.0.0.1';
const IOS_APPIUM_PATH = process.env.IOS_APPIUM_PATH ?? '/';
const IOS_APPIUM_PORT_1 = Number(process.env.IOS_APPIUM_PORT_1 ?? 5005);
const IOS_APPIUM_PORT_2 = Number(process.env.IOS_APPIUM_PORT_2 ?? 5006);
const IOS_APPIUM_PORT_3 = Number(process.env.IOS_APPIUM_PORT_3 ?? 5007);
const IOS_APPIUM_PORT_4 = Number(process.env.IOS_APPIUM_PORT_4 ?? 5008);
const IOS_WDA_LOCAL_PORT_1 = Number(process.env.IOS_WDA_LOCAL_PORT_1 ?? 8102);
const IOS_WDA_LOCAL_PORT_2 = Number(process.env.IOS_WDA_LOCAL_PORT_2 ?? 8103);
const IOS_WDA_LOCAL_PORT_3 = Number(process.env.IOS_WDA_LOCAL_PORT_3 ?? 8104);
const IOS_WDA_LOCAL_PORT_4 = Number(process.env.IOS_WDA_LOCAL_PORT_4 ?? 8105);
const IOS_RETRIES = 1;
const AOS_RETRIES = 1;
const QA_CASE_TIMEOUT_MS = Number(process.env.QA_CASE_TIMEOUT_MS ?? 210000);

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

function isAndroidDeviceConnected(udid: string): boolean {
  if (!udid) return false;
  return isAndroidDeviceConnectedByAdb(udid);
}

const iosSupportedHost = process.platform === 'darwin';
const iosHostBlocked = !iosSupportedHost && process.env.QA_IOS_ALLOW_ON_WINDOWS !== '1';

type IosProjectSlot = {
  name: string;
  udid: string;
  appiumPort: number;
  wdaLocalPort: number;
  force: boolean;
  disable: boolean;
  disableEnvName: string;
};

const iosSlots: IosProjectSlot[] = [
  {
    name: 'qa-ios',
    udid: IOS_UDID_1,
    appiumPort: IOS_APPIUM_PORT_1,
    wdaLocalPort: IOS_WDA_LOCAL_PORT_1,
    force: process.env.QA_IOS1_FORCE === '1',
    disable: process.env.QA_IOS1_DISABLE === '1',
    disableEnvName: 'QA_IOS1_DISABLE',
  },
  {
    name: 'qa-ios-2',
    udid: IOS_UDID_2,
    appiumPort: IOS_APPIUM_PORT_2,
    wdaLocalPort: IOS_WDA_LOCAL_PORT_2,
    force: process.env.QA_IOS2_FORCE === '1',
    disable: process.env.QA_IOS2_DISABLE === '1',
    disableEnvName: 'QA_IOS2_DISABLE',
  },
  {
    name: 'qa-ios-3',
    udid: IOS_UDID_3,
    appiumPort: IOS_APPIUM_PORT_3,
    wdaLocalPort: IOS_WDA_LOCAL_PORT_3,
    force: process.env.QA_IOS3_FORCE === '1',
    disable: process.env.QA_IOS3_DISABLE === '1',
    disableEnvName: 'QA_IOS3_DISABLE',
  },
  {
    name: 'qa-ios-4',
    udid: IOS_UDID_4,
    appiumPort: IOS_APPIUM_PORT_4,
    wdaLocalPort: IOS_WDA_LOCAL_PORT_4,
    force: process.env.QA_IOS4_FORCE === '1',
    disable: process.env.QA_IOS4_DISABLE === '1',
    disableEnvName: 'QA_IOS4_DISABLE',
  },
];

const projects: any[] = [
  // iOS 프로젝트는 macOS 호스트 + 단말 연결 시에만 기본 활성화
];

const enabledIosUdids = new Set<string>();
const enabledIosAppiumPorts = new Set<number>();
const enabledIosWdaPorts = new Set<number>();

for (const slot of iosSlots) {
  let reason = '';

  if (iosHostBlocked) {
    reason = '비-macOS 호스트';
  } else if (slot.disable) {
    reason = `${slot.disableEnvName}=1`;
  } else if (!slot.udid) {
    reason = 'UDID 미설정';
  } else if (enabledIosUdids.has(slot.udid)) {
    reason = `중복 UDID(${slot.udid})`;
  } else if (enabledIosAppiumPorts.has(slot.appiumPort)) {
    reason = `중복 Appium 포트(${slot.appiumPort})`;
  } else if (enabledIosWdaPorts.has(slot.wdaLocalPort)) {
    reason = `중복 WDA 포트(${slot.wdaLocalPort})`;
  } else {
    const connected = isIosDeviceConnected(slot.udid);
    if (!slot.force && !connected) {
      reason = `단말 미연결(udid=${slot.udid})`;
    }
  }

  if (reason) {
    console.log(`[qa.config] ${slot.name} 자동 비활성화 (${reason})`);
    continue;
  }

  enabledIosUdids.add(slot.udid);
  enabledIosAppiumPorts.add(slot.appiumPort);
  enabledIosWdaPorts.add(slot.wdaLocalPort);

  projects.push({
    name: slot.name,
    testMatch: /tests\/qa\/ios\/.*\.spec\.ts/,
    retries: IOS_RETRIES,
    timeout: QA_CASE_TIMEOUT_MS,
    workers: 1,
    use: {
      udid: slot.udid,
      appiumHost: IOS_APPIUM_HOST,
      appiumPort: slot.appiumPort,
      appiumPath: IOS_APPIUM_PATH,
      wdaLocalPort: slot.wdaLocalPort,
    } as any,
  });
}

projects.push({
  name: 'qa-aos',
  testMatch: /tests\/qa\/aos\/.*\.spec\.ts/,
  retries: AOS_RETRIES,
  timeout: Number(process.env.QA_AOS_TEST_TIMEOUT ?? QA_CASE_TIMEOUT_MS),
  workers: 1,
  use: {
    udid: ANDROID_UDID_1,
    appiumHost: AOS_APPIUM_HOST,
    appiumPort: AOS_APPIUM_PORT_1,
    appiumPath: AOS_APPIUM_PATH,
    systemPort: AOS_SYSTEM_PORT_1,
    mjpegServerPort: AOS_MJPEG_PORT_1,
    webviewDevtoolsPort: AOS_WEBVIEW_DEVTOOLS_PORT_1,
    chromedriverPorts: [8000, [9000, 9050]],
  } as any,
});

const aosExtra = [
  {
    name: 'qa-aos-2',
    udid: ANDROID_UDID_2,
    appiumPort: AOS_APPIUM_PORT_2,
    systemPort: AOS_SYSTEM_PORT_2,
    mjpegServerPort: AOS_MJPEG_PORT_2,
    webviewDevtoolsPort: AOS_WEBVIEW_DEVTOOLS_PORT_2,
    chromedriverPorts: [8001, [9051, 9100]] as Array<number | [number, number]>,
    force: process.env.QA_AOS2_FORCE === '1',
    disable: process.env.QA_AOS2_DISABLE === '1',
  },
  {
    name: 'qa-aos-3',
    udid: ANDROID_UDID_3,
    appiumPort: AOS_APPIUM_PORT_3,
    systemPort: AOS_SYSTEM_PORT_3,
    mjpegServerPort: AOS_MJPEG_PORT_3,
    webviewDevtoolsPort: AOS_WEBVIEW_DEVTOOLS_PORT_3,
    chromedriverPorts: [8002, [9101, 9150]] as Array<number | [number, number]>,
    force: process.env.QA_AOS3_FORCE === '1',
    disable: process.env.QA_AOS3_DISABLE === '1',
  },
  {
    name: 'qa-aos-4',
    udid: ANDROID_UDID_4,
    appiumPort: AOS_APPIUM_PORT_4,
    systemPort: AOS_SYSTEM_PORT_4,
    mjpegServerPort: AOS_MJPEG_PORT_4,
    webviewDevtoolsPort: AOS_WEBVIEW_DEVTOOLS_PORT_4,
    chromedriverPorts: [8003, [9151, 9200]] as Array<number | [number, number]>,
    force: process.env.QA_AOS4_FORCE === '1',
    disable: process.env.QA_AOS4_DISABLE === '1',
  },
];

for (const p of aosExtra) {
  const canUse = p.udid && isAndroidDeviceConnected(p.udid);
  const enable = !p.disable && (p.force || canUse);
  if (enable) {
    projects.push({
      name: p.name,
      testMatch: /tests\/qa\/aos\/.*\.spec\.ts/,
      retries: AOS_RETRIES,
      timeout: Number(process.env.QA_AOS_TEST_TIMEOUT ?? QA_CASE_TIMEOUT_MS),
      workers: 1,
      use: {
        udid: p.udid,
        appiumHost: AOS_APPIUM_HOST,
        appiumPort: p.appiumPort,
        appiumPath: AOS_APPIUM_PATH,
        systemPort: p.systemPort,
        mjpegServerPort: p.mjpegServerPort,
        webviewDevtoolsPort: p.webviewDevtoolsPort,
        chromedriverPorts: p.chromedriverPorts,
      } as any,
    });
  } else {
    console.log(`[qa.config] ${p.name} 자동 비활성화 (udid=${p.udid || '미설정'})`);
  }
}

export default defineConfig({
  ...commonConfig,
  globalSetup: './scripts/qa.global-setup.ts',
  workers: Number(process.env.QA_WORKERS ?? 1),
  outputDir: 'test-output/test-results/qa',
  reporter: makeReporter('test-output/reports/qa/latest'),
  projects,
});
