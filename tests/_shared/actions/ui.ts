// tests/qaTest/shared/actions/ui.ts
import type { Browser } from "webdriverio";

export async function waitVisible(
    driver: Browser,
    selector: string,
    timeoutMs = 5000
) {
    const el = await driver.$(selector);
    await el.waitForDisplayed({ timeout: timeoutMs });
    return el;
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
    timeoutMs = 5000
): Promise<boolean> {
    try {
        const el = await driver.$(selector);
        await el.waitForDisplayed({ timeout: timeoutMs });
        return true;
    } catch {
        return false;
    }
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
};

export async function safeClick(
    driver: Browser,
    selector: string,
    opts?: SafeClickOptions
) {
    const timeoutMs = opts?.timeoutMs ?? 4000;
    const intervalMs = 100;
    const retryCount = 2;
    const retryMs = 100;

    for (let i=0; i<=retryCount; i++) {
        try {
            const el = await driver.$(selector);
            await el.waitForDisplayed({ timeout: timeoutMs, interval: intervalMs });
            try {
                await el.click();
            } catch {
                await el.touchAction('tap');
            }
            return el;
        } catch {
            if (i < retryCount) {
                await driver.pause(retryMs);
            }
        }
    }
    throw new Error(`safeClick 실패 :: selector = ${selector}`);
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

// 퍼센트 좌표 기준 롱프레스 (AOS 위젯 진입 등에 사용)
export async function longPressByPercent(
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

type LongPressSelectorOptions = {
    timeoutMs?: number;
    holdMs?: number;
    settleMs?: number;
};

// selector 요소의 중심 좌표를 롱프레스
export async function longPressBySelector(
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
