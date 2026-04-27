import { test as base } from '@playwright/test';
import type { Browser } from 'webdriverio';
import { execFileSync } from 'node:child_process';
import { makeAosCaps } from './aos/caps.aos';
import { resolveAdbPath, adbText as adbTextByUdid } from './adb.util';
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

type AppiumEndpointCandidate = {
    basePath: string;
    url: string;
};

function adb(adbPath: string, udid: string, args: string[]) {
    execFileSync(adbPath, ['-s', udid, ...args], { stdio: 'ignore' });
}

function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeAppiumBasePath(basePath: string): string {
    const normalizedSlashes = String(basePath || '/').replace(/\\/g, '/').trim();
    if (!normalizedSlashes || normalizedSlashes === '/') return '/';
    return `/${normalizedSlashes.replace(/^\/+|\/+$/g, '')}`;
}

function makeAppiumUrl(host: string, port: number, basePath: string, endpoint: string) {
    const normalizedBasePath = normalizeAppiumBasePath(basePath);
    const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    return `http://${host}:${port}${normalizedBasePath === '/' ? '' : normalizedBasePath}${normalizedEndpoint}`;
}

function buildAppiumEndpoints(host: string, port: number, basePath: string, endpoint: string): AppiumEndpointCandidate[] {
    const normalizedInput = normalizeAppiumBasePath(basePath);
    const baseCandidates = [normalizedInput, '/', '/wd/hub', '/appium'];
    const seen = new Set<string>();
    const results: AppiumEndpointCandidate[] = [];
    for (const base of baseCandidates) {
        const normalizedBase = normalizeAppiumBasePath(base);
        if (seen.has(normalizedBase)) continue;
        seen.add(normalizedBase);
        results.push({
            basePath: normalizedBase,
            url: makeAppiumUrl(host, port, normalizedBase, endpoint),
        });
    }
    return results;
}

function readAdbDevices(adbPath: string): string {
    try {
        return String(execFileSync(adbPath, ['devices'], { encoding: 'utf-8', timeout: 5000 }) || '').trim();
    } catch {
        return '';
    }
}

async function ensureAdbDeviceReady(adbPath: string, udid: string) {
    const stateRetries = Number(process.env.AOS_DEVICE_READY_RETRIES ?? 40);
    const stateIntervalMs = Number(process.env.AOS_DEVICE_READY_INTERVAL_MS ?? 1000);
    const bootRetries = Number(process.env.AOS_BOOT_READY_RETRIES ?? 25);
    const bootIntervalMs = Number(process.env.AOS_BOOT_READY_INTERVAL_MS ?? 1000);

    try {
        execFileSync(adbPath, ['start-server'], { stdio: 'ignore', timeout: 5000 });
    } catch {}

    let state = '';
    for (let i = 0; i < stateRetries; i++) {
        state = (adbTextByUdid(udid, ['get-state'], 4000) ?? '').toLowerCase();
        if (state === 'device') break;
        if (i < stateRetries - 1) {
            await sleep(stateIntervalMs);
        }
    }

    if (state !== 'device') {
        const devicesOut = readAdbDevices(adbPath);
        throw new Error(
            `ADB 단말 준비 실패(udid=${udid}, state=${state || 'unknown'}). adb devices=${devicesOut || 'empty'}`
        );
    }

    let bootCompleted = '';
    for (let i = 0; i < bootRetries; i++) {
        bootCompleted = (adbTextByUdid(udid, ['shell', 'getprop', 'sys.boot_completed'], 4000) ?? '').trim();
        if (bootCompleted.endsWith('1')) break;
        if (i < bootRetries - 1) {
            await sleep(bootIntervalMs);
        }
    }

    if (!bootCompleted.endsWith('1')) {
        throw new Error(`단말 부팅 완료 대기 실패(udid=${udid}, sys.boot_completed=${bootCompleted || 'empty'})`);
    }

    const shellReady = adbTextByUdid(udid, ['shell', 'echo', 'ready'], 4000);
    if (!shellReady || !shellReady.toLowerCase().includes('ready')) {
        throw new Error(`ADB shell 응답 확인 실패(udid=${udid})`);
    }
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
    const listEndpoints = buildAppiumEndpoints(host, port, basePath, '/sessions');

    let sessionIds: string[] = [];
    let listed = false;
    let resolvedBasePath = normalizeAppiumBasePath(basePath);

    for (const candidate of listEndpoints) {
        const listController = new AbortController();
        const listTimer = setTimeout(() => listController.abort(), timeoutMs);
        try {
            const res = await fetch(candidate.url, { method: 'GET', signal: listController.signal });
            if (!res.ok) {
                continue;
            }

            const body = await res.json().catch(() => ({}));
            sessionIds = extractSessionIds(body);
            listed = true;
            resolvedBasePath = candidate.basePath;
            break;
        } catch (error) {
            // 목록 조회 실패는 세션 생성의 필수 조건이 아니므로 조용히 다음 엔드포인트 시도
            void error;
        } finally {
            clearTimeout(listTimer);
        }
    }

    // Appium 버전/구성에 따라 목록 API가 비활성(404/500 등)일 수 있다.
    // 이 정리는 best-effort 이므로 조회 실패 시 조용히 스킵한다.
    if (!listed) {
        return;
    }

    if (!sessionIds.length) return;
    console.warn(`[appium 정리] 남아있는 세션 ${sessionIds.length}개 삭제 시도`);

    for (const sessionId of sessionIds) {
        const deleteUrl = makeAppiumUrl(host, port, resolvedBasePath, `/session/${sessionId}`);
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
    const statusEndpoints = buildAppiumEndpoints(host, port, basePath, '/status');

    let lastError: unknown;
    let lastUrl = '';
    for (let i = 0; i <= retries; i++) {
        for (const endpoint of statusEndpoints) {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), timeoutMs);
            lastUrl = endpoint.url;
            try {
                const res = await fetch(endpoint.url, { method: 'GET', signal: controller.signal });
                if (res.ok) {
                    return;
                }
                lastError = new Error(`status=${res.status}`);
            } catch (error) {
                lastError = error;
            } finally {
                clearTimeout(timer);
            }
        }

        if (i < retries) {
            await sleep(intervalMs);
        }
    }

    const reason = lastError instanceof Error ? lastError.message : String(lastError ?? 'unknown');
    throw new Error(`Appium 헬스체크 실패 :: ${lastUrl} :: 원인=${reason}`);
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
        const resolvedAppiumPath = normalizeAppiumBasePath(appiumPath);
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
                path: resolvedAppiumPath,
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
                connectionRetryTimeout: Number(process.env.APPIUM_CONNECTION_RETRY_TIMEOUT ?? 120000),
                connectionRetryCount: Number(process.env.APPIUM_CONNECTION_RETRY_COUNT ?? 2),
            }),
            {
                beforeCreate: async () => {
                    await ensureAdbDeviceReady(adbPath, resolvedUdid);
                    await ensureAppiumHealthy(appiumHost, resolvedAppiumPort, resolvedAppiumPath);
                    await purgeAppiumSessions(appiumHost, resolvedAppiumPort, resolvedAppiumPath).catch((error) => {
                        console.warn(`[appium 정리] 세션 목록 정리 실패(계속 진행) :: ${String((error as Error)?.message ?? error)}`);
                    });
                    cleanupUia2SessionArtifacts(adbPath, resolvedUdid, resolvedSystemPort, resolvedMjpegServerPort);
                },
                onCreateError: async (phase, attempt, error) => {
                    const reason = String((error as Error)?.message ?? error);
                    console.warn(`[driver] 세션 ${phase} 실패 감지(시도 ${attempt}) :: 정리 후 재시도 준비 :: 원인=${reason}`);
                    await ensureAdbDeviceReady(adbPath, resolvedUdid).catch(() => {});
                    await ensureAppiumHealthy(appiumHost, resolvedAppiumPort, resolvedAppiumPath).catch(() => {});
                    await purgeAppiumSessions(appiumHost, resolvedAppiumPort, resolvedAppiumPath).catch(() => {});
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
    driver: async({ driverManager, appPackage }, use, testInfo) => {
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

        if (testInfo.status !== testInfo.expectedStatus) {
            try {
                const screenshotPath = testInfo.outputPath(`failure-${Date.now()}.png`);
                await driver.saveScreenshot(screenshotPath);
                await testInfo.attach('failure-screenshot', {
                    path: screenshotPath,
                    contentType: 'image/png',
                });
            } catch (error: any) {
                console.warn(`[aos.fixture] 실패 스크린샷 저장 실패: ${error?.message ?? error}`);
            }
        }
    },
    // 필요 구간에서만 복구 래퍼 사용
    runWithRecovery: async({ driverManager }, use) => {
        await use((action, onRecovered) => driverManager.runWithRecovery(action, onRecovered));
    },
});

export const expect = test.expect;
