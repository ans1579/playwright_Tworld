// tests/qaTest/shared/actions/ui.ts
import type { Browser } from "webdriverio";

type RecoveryRunner = <T>(action: (driver: Browser) => Promise<T>) => Promise<T>;

function withSessionRecovery<T>(
    driver: Browser,
    action: (activeDriver: Browser) => Promise<T>
): Promise<T> {
    const runner = (driver as any).__runWithRecovery as RecoveryRunner | undefined;
    if (typeof runner === 'function') {
        return runner(action);
    }
    return action(driver);
}

async function withHardTimeout<T>(work: Promise<T>, timeoutMs: number, label: string): Promise<T> {
    let timer: NodeJS.Timeout | null = null;
    try {
        return await Promise.race([
            work,
            new Promise<T>((_, reject) => {
                timer = setTimeout(() => reject(new Error(`${label} 타임아웃(${timeoutMs}ms)`)), timeoutMs);
            }),
        ]);
    } finally {
        if (timer) clearTimeout(timer);
    }
}

export async function waitVisible(
    driver: Browser,
    selector: string,
    timeoutMs = 5000
) {
    const run = async (activeDriver: Browser) => {
        const retryCount = 2;
        const retryMs = 150;
        let lastError: unknown;

        for (let i = 0; i <= retryCount; i++) {
            try {
                const el = await activeDriver.$(selector);
                await el.waitForDisplayed({ timeout: timeoutMs });
                return el;
            } catch (error) {
                lastError = error;
                if (isSessionTerminatedError(error)) {
                    throw error;
                }
                if (i < retryCount) {
                    await activeDriver.pause(retryMs);
                }
            }
        }

        throw lastError ?? new Error(`waitVisible 실패 :: selector = ${selector}`);
    };

    const work = withSessionRecovery(driver, run);
    if (!isAndroidDriver(driver)) return work;
    return withHardTimeout(work, timeoutMs + 12000, 'waitVisible');
}

export async function readText(
    driver: Browser,
    selector: string,
    timeoutMs = 5000
) {
    const el = await waitVisible(driver, selector, timeoutMs);
    return String((await el.getText()) ?? '').trim();
}

export async function isVisible(
    driver: Browser,
    selector: string,
    timeoutMs = 2000
): Promise<boolean> {
    const run = async () => {
        const retryCount = 1;
        const retryMs = 100;

        for (let i = 0; i <= retryCount; i++) {
            try {
                const el = await driver.$(selector);
                await el.waitForDisplayed({ timeout: timeoutMs });
                return true;
            } catch (error) {
                if (isSessionTerminatedError(error)) {
                    throw error;
                }
                if (i < retryCount) {
                    await driver.pause(retryMs);
                }
            }
        }
        return false;
    };

    if (!isAndroidDriver(driver)) return run();
    return withHardTimeout(run(), timeoutMs + 13000, 'isVisible');
}

export async function waitNotVisible(
    driver: Browser,
    selector: string,
    timeoutMs = 5000
) {
    const el = await driver.$(selector);
    await el.waitForDisplayed({ timeout: timeoutMs, reverse: true });
    return el;
}

type SafeClickOptions = {
    timeoutMs?: number;
    intervalMs?: number;
    retryCount?: number;
    retryMs?: number;
    perAttemptTimeoutMs?: number;
    fastPathTimeoutMs?: number;
    useCenterTapFallback?: boolean;
};

function getErrorMessage(err: unknown): string {
    if (err instanceof Error) return err.message;
    return String(err);
}

function toKoreanReason(err: unknown): string {
    const msg = getErrorMessage(err);

    const notDisplayed = msg.match(/still not displayed after (\d+)ms/i);
    if (notDisplayed) {
        return `요소가 ${notDisplayed[1]}ms 안에 표시되지 않았습니다.`;
    }
    if (msg.includes('A session is either terminated or not started')) {
        return '세션이 종료되었거나 시작되지 않았습니다.';
    }
    if (msg.includes('instrumentation process is not running')) {
        return 'UiAutomator2 instrumentation 프로세스가 중단되었습니다.';
    }
    if (msg.includes('instrumentation process cannot be initialized')) {
        return 'UiAutomator2 instrumentation 초기화에 실패했습니다.';
    }
    if (msg.includes('socket hang up')) {
        return 'Appium 연결이 중간에 끊어졌습니다(socket hang up).';
    }
    return msg;
}

function isSessionTerminatedError(err: unknown): boolean {
    const msg = getErrorMessage(err);
    return (
        msg.includes('invalid session id') ||
        msg.includes('A session is either terminated or not started') ||
        msg.includes('socket hang up') ||
        msg.includes('WebDriverAgent is not running') ||
        msg.includes('xcodebuild exited with code') ||
        msg.includes('Failed to create WDA session') ||
        msg.includes('Could not proxy command to the remote server') ||
        msg.includes('Connection was refused to port') ||
        msg.includes('instrumentation process is not running') ||
        msg.includes('instrumentation process cannot be initialized') ||
        msg.includes('The operation was aborted due to timeout') ||
        msg.includes('cannot be proxied to UiAutomator2 server')
    );
}

function isAndroidDriver(driver: Browser): boolean {
    const platformName = String((driver as any).capabilities?.platformName ?? '').toLowerCase();
    return platformName.includes('android');
}

type ClickTarget = WebdriverIO.Element | Record<string, any>;

async function tryAndroidClickGesture(driver: Browser, el: ClickTarget): Promise<boolean> {
    if (!isAndroidDriver(driver)) return false;
    const target = await (el as any);
    const elementId = String(target?.elementId ?? '').trim();
    if (!elementId) return false;

    // 1) WDIO/Appium 환경에서 자주 쓰는 형태
    try {
        if (typeof (driver as any).execute === 'function') {
            await (driver as any).execute('mobile: clickGesture', { elementId });
            return true;
        }
    } catch {}

    // 2) executeScript 형태 fallback
    try {
        if (typeof (driver as any).executeScript === 'function') {
            await (driver as any).executeScript('mobile: clickGesture', [{ elementId }]);
            return true;
        }
    } catch {}

    return false;
}

async function tapElementCenter(driver: Browser, el: ClickTarget) {
    const target = await (el as any);
    const loc = await target.getLocation();
    const size = await target.getSize();
    const x = Math.round(loc.x + size.width / 2);
    const y = Math.round(loc.y + size.height / 2);

    await driver.performActions([
        {
            type: 'pointer',
            id: 'finger-safe-click-center',
            parameters: { pointerType: 'touch' },
            actions: [
                { type: 'pointerMove', duration: 0, x, y },
                { type: 'pointerDown', button: 0 },
                { type: 'pause', duration: 50 },
                { type: 'pointerUp', button: 0 },
            ],
        },
    ]);
    await driver.releaseActions();
}

export async function safeClick(
    driver: Browser,
    selector: string,
    opts?: SafeClickOptions
) {
    const run = async (activeDriver: Browser) => {
        const timeoutMs = opts?.timeoutMs ?? 10000;
        const intervalMs = opts?.intervalMs ?? 80;
        const retryCount = opts?.retryCount ?? 2;
        const retryMs = opts?.retryMs ?? 120;
        const fastPathTimeoutMs = opts?.fastPathTimeoutMs ?? 900;
        const useCenterTapFallback = opts?.useCenterTapFallback ?? true;
        const startedAt = Date.now();
        const deadline = startedAt + timeoutMs;
        let lastError: unknown;

        for (let i = 0; i <= retryCount; i++) {
            const remaining = deadline - Date.now();
            if (remaining <= 0) break;

            // 1차는 빠른 감지, 이후는 남은 예산 전체 사용
            const perAttemptTimeoutMs =
                i === 0
                    ? Math.min(fastPathTimeoutMs, remaining)
                    : remaining;

            try {
                const el = await activeDriver.$(selector);

            let displayedError: unknown;
            try {
                await el.waitForDisplayed({ timeout: perAttemptTimeoutMs, interval: intervalMs });
            } catch (error) {
                displayedError = error;
            }

            // 일부 AOS 화면에서 displayed 판정이 흔들리는 경우가 있어 존재 확인 후 클릭 재시도 허용
            if (displayedError) {
                const exists = await el
                    .waitForExist({
                        timeout: Math.min(1200, Math.max(300, perAttemptTimeoutMs)),
                        interval: intervalMs
                    })
                    .then(() => true)
                    .catch(() => false);

                if (!exists) {
                    throw displayedError;
                }
            }

            await el.waitForEnabled({
                timeout: Math.min(1200, perAttemptTimeoutMs),
                interval: intervalMs
            }).catch(() => {});

            try {
                await el.click();
                return el;
            } catch (clickErr) {
                const clickedByGesture = await tryAndroidClickGesture(activeDriver, el).catch(() => false);
                if (clickedByGesture) {
                    return el;
                }

                if (useCenterTapFallback) {
                    try {
                        await tapElementCenter(activeDriver, el);
                        return el;
                    } catch (centerErr) {
                        lastError = centerErr ?? clickErr;
                        throw lastError;
                    }
                }

                lastError = clickErr;
                throw clickErr;
            }
            } catch (error) {
                lastError = error;
                if (isSessionTerminatedError(error)) {
                    throw error;
                }
                if (i < retryCount) {
                    const pauseMs = Math.min(retryMs + i * 40, Math.max(0, deadline - Date.now()));
                    if (pauseMs > 0) {
                        await activeDriver.pause(pauseMs);
                    }
                }
            }
        }

        const elapsedMs = Date.now() - startedAt;
        throw new Error(
            `safeClick 실패 :: selector = ${selector} :: 경과=${elapsedMs}ms :: 원인=${toKoreanReason(lastError)}`
        );
    };

    const work = withSessionRecovery(driver, run);
    if (!isAndroidDriver(driver)) return work;
    return withHardTimeout(work, (opts?.timeoutMs ?? 10000) + 18000, `safeClick(${selector})`);
}

export async function clickPass(driver: Browser, selector: string, timeout = 8000) {
    try {
        const el = await driver.$(selector);
        await el.waitForDisplayed({ timeout });
        await el.click();
        console.log(`클릭 성공: ${selector}`);
    } catch (error) {
        if (isSessionTerminatedError(error)) {
            throw error;
        }
        console.warn(`클릭 실패(계속 진행): ${selector}`, error);
    }
}

export async function find(driver: Browser, selector: string) {
    return await driver.$(selector);
};


// 좌측 / 우측 판단
export type Horizontal = 'left' | 'right';
export async function getHorizontal(
    driver: WebdriverIO.Browser,
    selector: string,
    timeoutMs = 5000
): Promise<Horizontal> {
    const el = await driver.$(selector);
    await el.waitForDisplayed({ timeout: timeoutMs });

    const screen = await driver.getWindowRect();
    const position = await el.getLocation();
    const size = await el.getSize();

    // 요소의 중심점 x = 값 왼쪽 모서리 x 좌표 + 크기 / 2
    const elCenterX = position.x + size.width / 2;
    // 전체화면의 중심점 x = 전체 화면 길이 / 2
    const screenCenterX = screen.width / 2;

    return elCenterX < screenCenterX ? 'left' : 'right';
}

// 상  / 하 판단
export type Vertical = 'top' | 'bottom';
export async function getVertical(
    driver: WebdriverIO.Browser,
    selector: string,
    timeoutMs = 5000
): Promise<Vertical> {
    const el = await driver.$(selector);
    await el.waitForDisplayed({ timeout: timeoutMs });

    const screen = await driver.getWindowRect();
    const position = await el.getLocation();
    const size = await el.getSize();

    // 요소의 중심점 y = 값 왼쪽 모서리 y 좌표 + 크기 / 2
    const elCenterY = position.y + size.height / 2;
    // 전체화면의 중심점 y = 전체 화면 높이 / 2
    const screenCenterY = screen.height / 2;

    return elCenterY < screenCenterY ? 'top' : 'bottom';
}

type LongPressOptions = {
    xPct?: number;
    yPct?: number;
    holdMs?: number;
    settleMs?: number;
};

// AOS 전용 호출명: 퍼센트 좌표 기준 롱프레스 (위젯 진입 등에 사용)
export async function longPressByPercentAos(
    driver: Browser,
    opts?: LongPressOptions
) {
    const xPct = opts?.xPct ?? 0.5;
    const yPct = opts?.yPct ?? 0.5;
    const holdMs = opts?.holdMs ?? 1200;
    const settleMs = opts?.settleMs ?? 400;

    const rect = await driver.getWindowRect();
    const x = Math.round(rect.width * xPct);
    const y = Math.round(rect.height * yPct);

    await driver.performActions([
        {
            type: 'pointer',
            id: 'finger-long-press',
            parameters: { pointerType: 'touch' },
            actions: [
                { type: 'pointerMove', duration: 0, x, y },
                { type: 'pointerDown', button: 0 },
                { type: 'pause', duration: holdMs },
                { type: 'pointerUp', button: 0 },
            ],
        },
    ]);
    await driver.releaseActions();
    await driver.pause(settleMs);
}

// iOS 전용 호출명 (동작은 W3C touch action 공용 구현 사용)
export async function longPressByPercentIos(
    driver: Browser,
    opts?: LongPressOptions
) {
    return longPressByPercentAos(driver, opts);
}

type LongPressSelectorOptions = {
    timeoutMs?: number;
    holdMs?: number;
    settleMs?: number;
};

// AOS 전용 호출명: selector 요소의 중심 좌표를 롱프레스
export async function longPressBySelectorAos(
    driver: Browser,
    selector: string,
    opts?: LongPressSelectorOptions
) {
    const timeoutMs = opts?.timeoutMs ?? 5000;
    const holdMs = opts?.holdMs ?? 1200;
    const settleMs = opts?.settleMs ?? 400;

    const el = await waitVisible(driver, selector, timeoutMs);
    const loc = await el.getLocation();
    const size = await el.getSize();
    const x = Math.round(loc.x + size.width / 2);
    const y = Math.round(loc.y + size.height / 2);

    await driver.performActions([
        {
            type: 'pointer',
            id: 'finger-long-press-selector',
            parameters: { pointerType: 'touch' },
            actions: [
                { type: 'pointerMove', duration: 0, x, y },
                { type: 'pointerDown', button: 0 },
                { type: 'pause', duration: holdMs },
                { type: 'pointerUp', button: 0 },
            ],
        },
    ]);
    await driver.releaseActions();
    await driver.pause(settleMs);
}

// iOS 전용 호출명 (동작은 W3C touch action 공용 구현 사용)
export async function longPressBySelectorIos(
    driver: Browser,
    selector: string,
    opts?: LongPressSelectorOptions
) {
    return longPressBySelectorAos(driver, selector, opts);
}

// 하위 호환 alias (점진적 전환용)
export async function longPressByPercent(
    driver: Browser,
    opts?: LongPressOptions
) {
    return longPressByPercentAos(driver, opts);
}

// 하위 호환 alias (점진적 전환용)
export async function longPressBySelector(
    driver: Browser,
    selector: string,
    opts?: LongPressSelectorOptions
) {
    return longPressBySelectorAos(driver, selector, opts);
}
