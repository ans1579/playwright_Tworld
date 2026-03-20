import { test as base } from '@playwright/test';
import type { Browser} from 'webdriverio';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { makeAosCaps } from './aos/caps.aos';
import { ANDROID_UDID, APPIUM_HOST, APPIUM_PORT, APPIUM_PATH, APPIUM_CLEANUP, APP_PACKAGE, APP_ACTIVITY } from './aos/env.aos';
import { DriverManager } from './driverManager';

type Fixtures = {
    driverManager: DriverManager;
    driver: Browser;
    appPackage: string;
    appActivity: string;
};

function resolveAdbPath(): string {
    const env = process.env.ADB_PATH;
    if (env && fs.existsSync(env)) return env;

    try {
        const which = execFileSync('which', ['adb'], { encoding: 'utf-8' }).trim();
        if (which) return which;
    } catch {}

    const sdk = process.env.ANDROID_SDK_ROOT || process.env.ANDROID_HOME;
    if (sdk) {
        const adbPath = path.join(sdk, 'platform-tools', 'adb');
        if (fs.existsSync(adbPath)) return adbPath;
    }

    throw new Error('adb를 찾을 수 없습니다.')
}

function adb(adbPath: string, udid: string, args: string[]) {
    execFileSync(adbPath, ['-s', udid, ...args], { stdio: 'ignore' });
}

function cleanupAppiumPkgs(adbPath: string, udid: string) {
    const pkgs = [
        'io.appium.uiautomator2.server',
        'io.appium.uiautomator2.server.test',
        'io.appium.settings',
    ];
    for (const p of pkgs) {
        try { adb(adbPath, udid, ['uninstall', p]); } catch {}
        try { adb(adbPath, udid, ['shell', 'pm', 'uninstall', '--user', '0', p]); } catch {}
    }
}

export const test = base.extend<Fixtures>({
    appPackage: [APP_PACKAGE, { option: true }],
    appActivity: [APP_ACTIVITY, { option: true }],

    // 드라이버 매니저 생성
    driverManager: async ({ appPackage, appActivity }, use) => {
        const adbPath = resolveAdbPath();
        if (APPIUM_CLEANUP) cleanupAppiumPkgs(adbPath, ANDROID_UDID);

        const mgr = new DriverManager(() => ({
            hostname: APPIUM_HOST,
            port: APPIUM_PORT,
            path: APPIUM_PATH,
            capabilities: makeAosCaps({ appPackage, appActivity }),
            logLevel: 'error',
        }));

        try {
            await use(mgr);
        } finally {
            await mgr.dispose();
        }
    },
    // 기존 드라이버는 유지하면서 manager에서 꺼내서 사용
    driver: async({ driverManager }, use) => {
        const driver = await driverManager.get();
        await use(driver);
    },
});

export const expect = test.expect;
