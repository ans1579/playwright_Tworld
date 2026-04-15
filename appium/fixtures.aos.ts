import { test as base } from '@playwright/test';
import type { Browser} from 'webdriverio';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { makeAosCaps } from './aos/caps.aos';
import {
    ANDROID_UDID,
    APPIUM_HOST,
    APPIUM_PORT,
    APPIUM_PATH,
    APPIUM_CLEANUP,
    APP_PACKAGE,
    APP_ACTIVITY,
    AOS_SYSTEM_PORT_1,
    AOS_MJPEG_PORT_1,
    AOS_WEBVIEW_DEVTOOLS_PORT_1,
} from './aos/env.aos';
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
    udid: string;
    appiumHost: string;
    appiumPort: number;
    appiumPath: string;
    systemPort: number;
    mjpegServerPort: number;
    webviewDevtoolsPort: number;
    chromedriverPorts: Array<number | [number, number]>;
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

function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function makeAppiumUrl(host: string, port: number, basePath: string, endpoint: string) {
    const normalizedBasePath = basePath && basePath !== '/'
        ? `/${basePath.replace(/^\/+|\/+$/g, '')}`
        : '';
    const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    return `http://${host}:${port}${normalizedBasePath}${normalizedEndpoint}`;
}

function extractSessionIds(payload: any): string[] {
    const value = payload?.value;
    if (!Array.isArray(value)) return [];
    return value
        .map((item: any) => String(item?.id ?? item?.sessionId ?? '').trim())
        .filter(Boolean);
}

async function purgeAppiumSessions(host: string, port: number, basePath: string) {
    const timeoutMs = Number(process.env.APPIUM_PURGE_TIMEOUT_MS ?? 2500);
    const listEndpoints = ['/sessions', '/appium/sessions', '/wd/hub/sessions'];

    let sessionIds: string[] = [];
    let lastError: unknown = null;
    let notFoundOnly = true;

    for (const endpoint of listEndpoints) {
        const listUrl = makeAppiumUrl(host, port, basePath, endpoint);
        const listController = new AbortController();
        const listTimer = setTimeout(() => listController.abort(), timeoutMs);
        try {
            const res = await fetch(listUrl, { method: 'GET', signal: listController.signal });
            if (res.status === 404) {
                continue;
            }
            notFoundOnly = false;
            if (!res.ok) {
                lastError = new Error(`status=${res.status}`);
                continue;
            }

            const body = await res.json().catch(() => ({}));
            sessionIds = extractSessionIds(body);
            break;
        } catch (error) {
            lastError = error;
            notFoundOnly = false;
        } finally {
            clearTimeout(listTimer);
        }
    }

    // Appium 버전에 따라 sessions 목록 API가 비활성일 수 있다(404). 이 경우 조용히 스킵.
    if (notFoundOnly) {
        return;
    }
    if (lastError && !sessionIds.length) {
        throw lastError;
    }

    if (!sessionIds.length) return;
    console.warn(`[appium 정리] 남아있는 세션 ${sessionIds.length}개 삭제 시도`);

    for (const sessionId of sessionIds) {
        const deleteUrl = makeAppiumUrl(host, port, basePath, `/session/${sessionId}`);
        const deleteController = new AbortController();
        const deleteTimer = setTimeout(() => deleteController.abort(), timeoutMs);
        try {
            await fetch(deleteUrl, { method: 'DELETE', signal: deleteController.signal });
        } catch (error) {
            console.warn(`[appium 정리] 세션 삭제 실패 :: sessionId=${sessionId} :: 원인=${String((error as Error)?.message ?? error)}`);
        } finally {
            clearTimeout(deleteTimer);
        }
    }
}

async function ensureAppiumHealthy(host: string, port: number, basePath: string) {
    const retries = Number(process.env.APPIUM_HEALTHCHECK_RETRIES ?? 2);
    const timeoutMs = Number(process.env.APPIUM_HEALTHCHECK_TIMEOUT_MS ?? 2500);
    const intervalMs = Number(process.env.APPIUM_HEALTHCHECK_INTERVAL_MS ?? 400);
    const url = makeAppiumUrl(host, port, basePath, '/status');

    let lastError: unknown;
    for (let i = 0; i <= retries; i++) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);
        try {
            const res = await fetch(url, { method: 'GET', signal: controller.signal });
            if (res.ok) {
                return;
            }
            lastError = new Error(`status=${res.status}`);
        } catch (error) {
            lastError = error;
        } finally {
            clearTimeout(timer);
        }

        if (i < retries) {
            await sleep(intervalMs);
        }
    }

    const reason = lastError instanceof Error ? lastError.message : String(lastError ?? 'unknown');
    throw new Error(`Appium 헬스체크 실패 :: ${url} :: 원인=${reason}`);
}

function adbIgnoreError(adbPath: string, udid: string, args: string[]) {
    try {
        adb(adbPath, udid, args);
    } catch {}
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

function cleanupUia2SessionArtifacts(adbPath: string, udid: string, systemPort: number, mjpegServerPort: number) {
    adbIgnoreError(adbPath, udid, ['forward', '--remove', `tcp:${systemPort}`]);
    adbIgnoreError(adbPath, udid, ['forward', '--remove', `tcp:${mjpegServerPort}`]);

    adbIgnoreError(adbPath, udid, ['shell', 'am', 'force-stop', 'io.appium.uiautomator2.server']);
    adbIgnoreError(adbPath, udid, ['shell', 'am', 'force-stop', 'io.appium.uiautomator2.server.test']);
    adbIgnoreError(adbPath, udid, ['shell', 'pkill', '-f', 'uiautomator']);
}

const cleanedUdidSet = new Set<string>();

export const test = base.extend<Fixtures>({
    appPackage: [APP_PACKAGE, { option: true }],
    appActivity: [APP_ACTIVITY, { option: true }],
    udid: [ANDROID_UDID, { option: true }],
    appiumHost: [APPIUM_HOST, { option: true }],
    appiumPort: [APPIUM_PORT, { option: true }],
    appiumPath: [APPIUM_PATH, { option: true }],
    systemPort: [AOS_SYSTEM_PORT_1, { option: true }],
    mjpegServerPort: [AOS_MJPEG_PORT_1, { option: true }],
    webviewDevtoolsPort: [AOS_WEBVIEW_DEVTOOLS_PORT_1, { option: true }],
    chromedriverPorts: [[8000, [9000, 9050]], { option: true }],

    // 드라이버 매니저 생성
    driverManager: async ({
        appPackage,
        appActivity,
        udid,
        appiumHost,
        appiumPort,
        appiumPath,
        systemPort,
        mjpegServerPort,
        webviewDevtoolsPort,
        chromedriverPorts,
    }, use) => {
        const resolvedUdid = udid;
        const resolvedAppiumPort = appiumPort;
        const resolvedSystemPort = systemPort;
        const resolvedMjpegServerPort = mjpegServerPort;
        const resolvedWebviewDevtoolsPort = webviewDevtoolsPort;
        const resolvedChromedriverPorts = chromedriverPorts;

        const adbPath = resolveAdbPath();
        if (APPIUM_CLEANUP && !cleanedUdidSet.has(resolvedUdid)) {
            cleanupAppiumPkgs(adbPath, resolvedUdid);
            cleanedUdidSet.add(resolvedUdid);
        }

        const mgr = new DriverManager(
            () => ({
                hostname: appiumHost,
                port: resolvedAppiumPort,
                path: appiumPath,
                capabilities: makeAosCaps({
                    udid: resolvedUdid,
                    appPackage,
                    appActivity,
                    systemPort: resolvedSystemPort,
                    mjpegServerPort: resolvedMjpegServerPort,
                    webviewDevtoolsPort: resolvedWebviewDevtoolsPort,
                    chromedriverPorts: resolvedChromedriverPorts,
                }),
                logLevel: 'error',
                connectionRetryTimeout: Number(process.env.APPIUM_CONNECTION_RETRY_TIMEOUT ?? 30000),
                connectionRetryCount: Number(process.env.APPIUM_CONNECTION_RETRY_COUNT ?? 0),
            }),
            {
                beforeCreate: async () => {
                    await ensureAppiumHealthy(appiumHost, resolvedAppiumPort, appiumPath);
                    await purgeAppiumSessions(appiumHost, resolvedAppiumPort, appiumPath).catch((error) => {
                        console.warn(`[appium 정리] 세션 목록 정리 실패(계속 진행) :: ${String((error as Error)?.message ?? error)}`);
                    });
                    cleanupUia2SessionArtifacts(adbPath, resolvedUdid, resolvedSystemPort, resolvedMjpegServerPort);
                },
                onCreateError: async (phase, attempt, error) => {
                    const reason = String((error as Error)?.message ?? error);
                    console.warn(`[driver] 세션 ${phase} 실패 감지(시도 ${attempt}) :: 정리 후 재시도 준비 :: 원인=${reason}`);
                    await ensureAppiumHealthy(appiumHost, resolvedAppiumPort, appiumPath).catch(() => {});
                    await purgeAppiumSessions(appiumHost, resolvedAppiumPort, appiumPath).catch(() => {});
                    cleanupUia2SessionArtifacts(adbPath, resolvedUdid, resolvedSystemPort, resolvedMjpegServerPort);
                },
            }
        );

        try {
            await use(mgr);
        } finally {
            await mgr.dispose();
        }
    },
    // 기본은 원래 WDIO 체이너블 driver 유지
    driver: async({ driverManager, appPackage }, use) => {
        const recoveryActivatePauseMs = Number(process.env.AOS_RECOVERY_ACTIVATE_PAUSE_MS ?? 1500);
        const driver = await driverManager.ensureAlive();
        (driver as any).__runWithRecovery = <T>(action: (d: Browser) => Promise<T>) =>
            driverManager.runWithRecovery(action, async (recovered) => {
                // 세션 재생성 직후 앱을 전면으로 복원해 다음 액션 실패를 줄인다.
                await recovered.activateApp(appPackage).catch(() => {});
                if (recoveryActivatePauseMs > 0) {
                    await recovered.pause(recoveryActivatePauseMs).catch(() => {});
                }
            });
        await use(driver);
    },
    // 필요 구간에서만 복구 래퍼 사용
    runWithRecovery: async({ driverManager }, use) => {
        await use((action, onRecovered) => driverManager.runWithRecovery(action, onRecovered));
    },
});

export const expect = test.expect;
