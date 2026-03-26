// appium/fixture.ts
import { test as base } from '@playwright/test';
import type { Browser } from 'webdriverio';
import { DriverManager } from './driverManager';

import { makeIosCaps } from './ios/caps.ios';
import { APPIUM_HOST, APPIUM_PORT, APPIUM_PATH, IOS_UDID, WDA_LOCAL_PORT } from './ios/env.ios';

type Fixtures = {
    driverManager: DriverManager;
    driver: Browser;
    bundleId: string;
    appiumHost: string;
    appiumPort: number;
    appiumPath: string;
    udid: string;
    wdaLocalPort: number;
};

export const test = base.extend<Fixtures>({
    bundleId: ['__BUNDLE_ID_NOT_SET__', { option: true }],
    appiumHost: [APPIUM_HOST, { option: true }],
    appiumPort: [APPIUM_PORT, { option: true }],
    appiumPath: [APPIUM_PATH, { option: true }],
    udid: [IOS_UDID, { option: true }],
    wdaLocalPort: [WDA_LOCAL_PORT, { option: true }],
    
    driverManager: async (
        { bundleId, appiumHost, appiumPort, appiumPath, udid, wdaLocalPort },
        use
    ) => {
        if (!bundleId || bundleId === '__BUNDLE_ID_NOT_SET__') {
            throw new Error('Bundle Id is not set');
        }
        if (!udid) {
            throw new Error('UDID is not set');
        }
        const mgr = new DriverManager(() => ({
            hostname: appiumHost,
            port: appiumPort,
            path: appiumPath,
            capabilities: makeIosCaps(bundleId, { udid, wdaLocalPort }),
            logLevel: 'error',
            connectionRetryTimeout: Number(process.env.APPIUM_CONNECTION_RETRY_TIMEOUT ?? 120000),
            connectionRetryCount: Number(process.env.APPIUM_CONNECTION_RETRY_COUNT ?? 2),
        }));

        // 기존 ensureAlive가 안드로이드 전용이라 보강해서 iOS에서 사용
        const iosEnsureAlive = mgr.ensureAlive.bind(mgr);
        mgr.ensureAlive = async () => {
            try {
                const d = await mgr.get();
                await d.getPageSource();
                return d;
            } catch {
                return await mgr.recreate();
            }
        };

        try {
            await use(mgr);
        } finally {
            await mgr.dispose();
        }
    },
    
    driver: async ({ driverManager }, use) => {
        const driver = await driverManager.get();
        // iOS 클릭 후 내부 애니메이션 대기시간을 줄여 전체 템포 개선
        await (driver as any).updateSettings?.({ animationCoolOffTimeout: 0 }).catch(() => {});
        await use(driver);
    },
});

export const expect = test.expect;
