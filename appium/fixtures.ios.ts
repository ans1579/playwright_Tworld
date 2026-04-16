// appium/fixture.ts
import { test as base } from '@playwright/test';
import type { Browser } from 'webdriverio';
import { DriverManager } from './driverManager';

import { makeIosCaps } from './ios/caps.ios';
import { APPIUM_HOST, APPIUM_PORT, APPIUM_PATH, IOS_UDID, WDA_LOCAL_PORT } from './ios/env.ios';

type SessionKeyOptions = {
    bundleId: string;
    appiumHost: string;
    appiumPort: number;
    appiumPath: string;
    udid: string;
    wdaLocalPort: number;
    testFile: string;
};

type SessionPool = {
    getManager: (options: SessionKeyOptions) => Promise<DriverManager>;
};

type TestFixtures = {
    driverManager: DriverManager;
    driver: Browser;
    bundleId: string;
    appiumHost: string;
    appiumPort: number;
    appiumPath: string;
    udid: string;
    wdaLocalPort: number;
};

type WorkerFixtures = {
    sessionPool: SessionPool;
};

function makeSessionKey(options: SessionKeyOptions): string {
    return [
        options.bundleId,
        options.appiumHost,
        String(options.appiumPort),
        options.appiumPath,
        options.udid,
        String(options.wdaLocalPort),
        options.testFile,
    ].join('::');
}

function createIosDriverManager(options: SessionKeyOptions): DriverManager {
    const mgr = new DriverManager(
        () => ({
            hostname: options.appiumHost,
            port: options.appiumPort,
            path: options.appiumPath,
            capabilities: makeIosCaps(options.bundleId, {
                udid: options.udid,
                wdaLocalPort: options.wdaLocalPort,
            }),
            logLevel: 'error',
            // iOS는 WDA cold start 시간이 길 수 있어 기본값을 완화한다.
            connectionRetryTimeout: Number(process.env.IOS_APPIUM_CONNECTION_RETRY_TIMEOUT ?? process.env.APPIUM_CONNECTION_RETRY_TIMEOUT ?? 120000),
            connectionRetryCount: Number(process.env.IOS_APPIUM_CONNECTION_RETRY_COUNT ?? process.env.APPIUM_CONNECTION_RETRY_COUNT ?? 1),
        }),
        undefined,
        {
            sessionCreateTimeoutMs: Number(process.env.IOS_APPIUM_SESSION_CREATE_TIMEOUT_MS ?? process.env.APPIUM_SESSION_CREATE_TIMEOUT_MS ?? 180000),
            sessionRecreateTimeoutMs: Number(process.env.IOS_APPIUM_SESSION_RECREATE_TIMEOUT_MS ?? process.env.APPIUM_SESSION_RECREATE_TIMEOUT_MS ?? 180000),
            sessionCreateAttempts: Number(process.env.IOS_APPIUM_SESSION_CREATE_ATTEMPTS ?? process.env.APPIUM_SESSION_CREATE_ATTEMPTS ?? 2),
            sessionRecreateAttempts: Number(process.env.IOS_APPIUM_SESSION_RECREATE_ATTEMPTS ?? process.env.APPIUM_SESSION_RECREATE_ATTEMPTS ?? 2),
            createRetryDelayMs: Number(process.env.IOS_APPIUM_SESSION_CREATE_RETRY_DELAY_MS ?? process.env.APPIUM_SESSION_CREATE_RETRY_DELAY_MS ?? 2000),
            recreateRetryDelayMs: Number(process.env.IOS_APPIUM_SESSION_RECREATE_RETRY_DELAY_MS ?? process.env.APPIUM_SESSION_RECREATE_RETRY_DELAY_MS ?? 2500),
        }
    );

    return mgr;
}

export const test = base.extend<TestFixtures, WorkerFixtures>({
    bundleId: ['__BUNDLE_ID_NOT_SET__', { option: true }],
    appiumHost: [APPIUM_HOST, { option: true }],
    appiumPort: [APPIUM_PORT, { option: true }],
    appiumPath: [APPIUM_PATH, { option: true }],
    udid: [IOS_UDID, { option: true }],
    wdaLocalPort: [WDA_LOCAL_PORT, { option: true }],

    sessionPool: [async ({}, use) => {
        const byKey = new Map<string, DriverManager>();
        const pool: SessionPool = {
            getManager: async (options: SessionKeyOptions) => {
                const key = makeSessionKey(options);
                let mgr = byKey.get(key);
                if (!mgr) {
                    mgr = createIosDriverManager(options);
                    byKey.set(key, mgr);
                }
                return mgr;
            },
        };

        try {
            await use(pool);
        } finally {
            await Promise.allSettled(
                Array.from(byKey.values()).map(async (mgr) => {
                    await mgr.dispose();
                }),
            );
        }
    }, { scope: 'worker' }],

    driverManager: async ({ sessionPool, bundleId, appiumHost, appiumPort, appiumPath, udid, wdaLocalPort }, use, testInfo) => {
        if (!bundleId || bundleId === '__BUNDLE_ID_NOT_SET__') {
            throw new Error('Bundle Id is not set');
        }
        if (!udid) {
            throw new Error('UDID is not set');
        }

        const mgr = await sessionPool.getManager({
            bundleId,
            appiumHost,
            appiumPort,
            appiumPath,
            udid,
            wdaLocalPort,
            testFile: testInfo.file,
        });
        await use(mgr);
    },

    driver: async ({ driverManager }, use) => {
        const driver = await driverManager.ensureAlive();
        (driver as any).__runWithRecovery = <T>(action: (d: Browser) => Promise<T>) =>
            driverManager.runWithRecovery(action);
        // iOS 클릭 후 내부 애니메이션 대기시간을 줄여 전체 템포 개선
        await (driver as any).updateSettings?.({ animationCoolOffTimeout: 0 }).catch(() => {});
        await use(driver);
    },
});

export const expect = test.expect;
