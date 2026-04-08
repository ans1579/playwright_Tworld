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
    runWithRecovery: <T>(
        action: (driver: Browser) => Promise<T>,
        onRecovered?: (driver: Browser) => Promise<void> | void
    ) => Promise<T>;
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
    ];
    for (const p of pkgs) {
        try { adb(adbPath, udid, ['uninstall', p]); } catch {}
        try { adb(adbPath, udid, ['shell', 'pm', 'uninstall', '--user', '0', p]); } catch {}
    }
}

let didInitialCleanup = false;

export const test = base.extend<Fixtures>({
    appPackage: [APP_PACKAGE, { option: true }],
    appActivity: [APP_ACTIVITY, { option: true }],

    // 드라이버 매니저 생성
    driverManager: async ({ appPackage, appActivity }, use) => {
        const adbPath = resolveAdbPath();
        if (APPIUM_CLEANUP && !didInitialCleanup) {
            cleanupAppiumPkgs(adbPath, ANDROID_UDID);
            didInitialCleanup = true;
        }

        const mgr = new DriverManager(() => ({
            hostname: APPIUM_HOST,
            port: APPIUM_PORT,
            path: APPIUM_PATH,
            capabilities: makeAosCaps({ appPackage, appActivity }),
            logLevel: 'error',
            connectionRetryTimeout: Number(process.env.APPIUM_CONNECTION_RETRY_TIMEOUT ?? 180000),
            connectionRetryCount: Number(process.env.APPIUM_CONNECTION_RETRY_COUNT ?? 2),
        }));

        try {
            await use(mgr);
        } finally {
            await mgr.dispose();
        }
    },
    // 기본은 원래 WDIO 체이너블 driver 유지
    driver: async({ driverManager }, use) => {
        const driver = await driverManager.ensureAlive();
        await use(driver);
    },
    // 필요 구간에서만 복구 래퍼 사용
    runWithRecovery: async({ driverManager }, use) => {
        await use((action, onRecovered) => driverManager.runWithRecovery(action, onRecovered));
    },
});

export const expect = test.expect;
