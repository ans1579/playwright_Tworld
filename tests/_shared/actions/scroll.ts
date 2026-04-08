// tests/_shared/actions/scroll.ts
import type { Browser } from 'webdriverio';
import { swipeByPercent, swipeToScroll } from '../gestures/ios';
import { find } from './ui';

type SwipePct = {
    from: { xPct: number; yPct: number };
    to: { xPct: number; yPct: number };
    durationMs?: number;
};

export type ScrollOpts = {
    movePx?: number;
    swipe?: SwipePct;
    settleMs?: number;
};

async function getY(driver: Browser, xpath: string): Promise<number | null> {
    try {
        const el = await find(driver, xpath);
        const y = await el.getLocation('y');
        return typeof y === 'number' ? y : null;
    } catch {
        return null;
    }
}

export async function attemptScrollMove(
    driver: Browser,
    probeXPath: string,
    opts?: ScrollOpts
): Promise<{ moved: boolean; yBefore: number | null; yAfter: number | null }> {
    const movePx = opts?.movePx ?? 6;
    const settleMs = opts?.settleMs ?? 250;

    const yBefore = await getY(driver, probeXPath);

    const swipe = opts?.swipe ?? {
        from: { xPct: 0.5, yPct: 0.78 },
        to: { xPct: 0.5, yPct: 0.35 },
        durationMs: 420,
    };

    await swipeByPercent(driver, swipe.from, swipe.to, { durationMs: swipe.durationMs ?? 420 });
    await driver.pause(settleMs);

    const yAfter = await getY(driver, probeXPath);

    if (yBefore == null || yAfter == null) {
        return { moved: false, yBefore, yAfter };
    }

    const moved = Math.abs(yAfter - yBefore) >= movePx;
    return { moved, yBefore, yAfter };
}

export async function assertScrollable(
    driver: Browser,
    probeXPath: string,
    opts?: ScrollOpts
) {
    const r = await attemptScrollMove(driver, probeXPath, opts);
    if (!r.moved) {
        throw new Error(`스크롤이 필요하지만 실패하였음. yBefore=${r.yBefore} | yAfter=${r.yAfter}`);
    }
    return r;
}

export async function assertNotScrollable(
    driver: Browser,
    probeXPath: string,
    opts?: ScrollOpts
) {
    const r = await attemptScrollMove(driver, probeXPath, opts);
    if (r.moved) {
        throw new Error(`스크롤이 필요하지않지만 스크롤됨. yBefore=${r.yBefore} | yAfter=${r.yAfter}`);
    }
    return r;
}

export async function swipeUp(
    driver: Browser,
    opts?: { durationMs?: number; settleMs?: number }
) {
    await swipeToScroll(driver, { durationMs: opts?.durationMs ?? 100 });
    const settleMs = opts?.settleMs ?? 20;
    if (settleMs > 0) {
        await driver.pause(settleMs);
    }
}

export async function tapCellWithScroll(
    driver: Browser,
    xpath: string,
    opts?: { maxSwipes?: number; settleMs?: number; swipeDurationMs?: number }
) {
    const maxSwipes = opts?.maxSwipes ?? 8;

    for (let i = 0; i <= maxSwipes; i++) {
        const candidates = await driver.$$(xpath);
        for (const el of candidates) {
            if (await el.isDisplayed()) {
                await el.click();
                return;
            }
        }

        if (i < maxSwipes) {
            await swipeUp(driver, {
                durationMs: opts?.swipeDurationMs ?? 100,
                settleMs: opts?.settleMs ?? 100,
            });
        }
    }

    throw new Error(`못 찾음: ${xpath}`);
}

type AosSwipeOpts = {
    xPct?: number;
    fromYPct?: number;
    toYPct?: number;
    durationMs?: number;
    holdMs?: number;
    settleMs?: number;
};

type AosHorizontalSwipeOpts = {
    yPct?: number;
    fromXPct?: number;
    toXPct?: number;
    durationMs?: number;
    holdMs?: number;
    settleMs?: number;
};

type ElementTapPctOpts = {
    xPct?: number;
    yPct?: number;
    holdMs?: number;
};

async function tapElementByPct(
    driver: Browser,
    el: WebdriverIO.Element,
    opts?: ElementTapPctOpts
) {
    const xPct = opts?.xPct ?? 0.5;
    const yPct = opts?.yPct ?? 0.5;
    const holdMs = opts?.holdMs ?? 40;

    const loc = await el.getLocation();
    const size = await el.getSize();
    const x = Math.round(loc.x + size.width * xPct);
    const y = Math.round(loc.y + size.height * yPct);

    await driver.performActions([
        {
            type: 'pointer',
            id: 'finger-element-tap',
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
}

async function swipeByDirectionAos(
    driver: Browser,
    direction: 'up' | 'down' | 'left' | 'right',
    distance = 0.55,
    duration = 500
) {
    const { width, height } = await driver.getWindowRect();

    const centerX = Math.floor(width / 2);
    const centerY = Math.floor(height / 2);
    const offsetX = Math.floor(width * distance * 0.5);
    const offsetY = Math.floor(height * distance * 0.5);

    let startX = centerX;
    let startY = centerY;
    let endX = centerX;
    let endY = centerY;

    switch (direction) {
        case 'up':
            startY = centerY + offsetY;
            endY = centerY - offsetY;
            break;
        case 'down':
            startY = centerY - offsetY;
            endY = centerY + offsetY;
            break;
        case 'left':
            startX = centerX + offsetX;
            endX = centerX - offsetX;
            break;
        case 'right':
            startX = centerX - offsetX;
            endX = centerX + offsetX;
            break;
    }

    await driver.performActions([
        {
            type: 'pointer',
            id: 'finger-aos',
            parameters: { pointerType: 'touch' },
            actions: [
                { type: 'pointerMove', duration: 0, x: startX, y: startY },
                { type: 'pointerDown', button: 0 },
                { type: 'pause', duration: 100 },
                { type: 'pointerMove', duration, x: endX, y: endY },
                { type: 'pointerUp', button: 0 },
            ],
        },
    ]);
    await driver.releaseActions();
}

// AOS 기본 스크롤(상단으로 올리기)
export async function swipeUpAos(
    driver: Browser,
    opts?: AosSwipeOpts
) {
    const xPct = opts?.xPct ?? 0.5;
    const fromYPct = opts?.fromYPct ?? 0.8;
    const toYPct = opts?.toYPct ?? 0.3;
    const durationMs = opts?.durationMs ?? 520;
    const holdMs = opts?.holdMs ?? 100;
    const settleMs = opts?.settleMs ?? 240;
    const rect = await driver.getWindowRect();
    const x = Math.round(rect.width * xPct);
    const startY = Math.round(rect.height * fromYPct);
    const endY = Math.round(rect.height * toYPct);

    await driver.performActions([
        {
            type: 'pointer',
            id: 'finger-aos-up',
            parameters: { pointerType: 'touch' },
            actions: [
                { type: 'pointerMove', duration: 0, x, y: startY },
                { type: 'pointerDown', button: 0 },
                { type: 'pause', duration: holdMs },
                { type: 'pointerMove', duration: durationMs, x, y: endY },
                { type: 'pointerUp', button: 0 },
            ],
        },
    ]);
    await driver.releaseActions();
    await driver.pause(settleMs);
}

// AOS 가로 슬라이드(다음 슬라이드: 1 -> 2, 오른쪽에서 왼쪽으로 이동)
export async function swipeLeftAos(
    driver: Browser,
    opts?: AosHorizontalSwipeOpts
) {
    const yPct = opts?.yPct ?? 0.5;
    const fromXPct = opts?.fromXPct ?? 0.85;
    const toXPct = opts?.toXPct ?? 0.15;
    const durationMs = opts?.durationMs ?? 360;
    const holdMs = opts?.holdMs ?? 80;
    const settleMs = opts?.settleMs ?? 240;
    const rect = await driver.getWindowRect();
    const y = Math.round(rect.height * yPct);
    const startX = Math.round(rect.width * fromXPct);
    const endX = Math.round(rect.width * toXPct);

    await driver.performActions([
        {
            type: 'pointer',
            id: 'finger-aos-left',
            parameters: { pointerType: 'touch' },
            actions: [
                { type: 'pointerMove', duration: 0, x: startX, y },
                { type: 'pointerDown', button: 0 },
                { type: 'pause', duration: holdMs },
                { type: 'pointerMove', duration: durationMs, x: endX, y },
                { type: 'pointerUp', button: 0 },
            ],
        },
    ]);
    await driver.releaseActions();
    await driver.pause(settleMs);
}

// AOS 가로 슬라이드(이전 슬라이드: 2 -> 1, 왼쪽에서 오른쪽으로 이동)
export async function swipeRightAos(
    driver: Browser,
    opts?: AosHorizontalSwipeOpts
) {
    const yPct = opts?.yPct ?? 0.5;
    const fromXPct = opts?.fromXPct ?? 0.15;
    const toXPct = opts?.toXPct ?? 0.85;
    const durationMs = opts?.durationMs ?? 360;
    const holdMs = opts?.holdMs ?? 80;
    const settleMs = opts?.settleMs ?? 240;
    const rect = await driver.getWindowRect();
    const y = Math.round(rect.height * yPct);
    const startX = Math.round(rect.width * fromXPct);
    const endX = Math.round(rect.width * toXPct);

    await driver.performActions([
        {
            type: 'pointer',
            id: 'finger-aos-right',
            parameters: { pointerType: 'touch' },
            actions: [
                { type: 'pointerMove', duration: 0, x: startX, y },
                { type: 'pointerDown', button: 0 },
                { type: 'pause', duration: holdMs },
                { type: 'pointerMove', duration: durationMs, x: endX, y },
                { type: 'pointerUp', button: 0 },
            ],
        },
    ]);
    await driver.releaseActions();
    await driver.pause(settleMs);
}

// AOS: 요소가 보일 때까지 스크롤 후 클릭
export async function tapCellWithScrollAos(
    driver: Browser,
    xpath: string,
    opts?: {
        maxSwipes?: number;
        swipe?: AosSwipeOpts;
        tapPct?: ElementTapPctOpts;
    }
) {
    const maxSwipes = opts?.maxSwipes ?? 8;
    const swipeOpts: AosSwipeOpts = {
        xPct: opts?.swipe?.xPct ?? 0.5,
        fromYPct: opts?.swipe?.fromYPct ?? 0.76,
        toYPct: opts?.swipe?.toYPct ?? 0.42,
        durationMs: opts?.swipe?.durationMs ?? 420,
        holdMs: opts?.swipe?.holdMs ?? 100,
        settleMs: opts?.swipe?.settleMs ?? 180,
    };
    let lastError: unknown = null;

    for (let i = 0; i <= maxSwipes; i++) {
        const viewport = await driver.getWindowRect().catch(() => null);
        const candidates = await driver.$$(xpath);
        for (const el of candidates) {
            const displayed = await el.isDisplayed().catch(() => false);
            if (!displayed) continue;

            // 일부 단말/Appium 조합에서 off-screen 요소도 displayed=true로 나오는 경우가 있어
            // viewport 안에 들어온 요소만 클릭 시도한다.
            if (viewport) {
                const loc = await el.getLocation().catch(() => null);
                const size = await el.getSize().catch(() => null);
                if (loc && size) {
                    const top = loc.y;
                    const bottom = loc.y + size.height;
                    if (bottom <= 0 || top >= viewport.height) continue;
                }
            }

            try {
                if (opts?.tapPct) {
                    await tapElementByPct(driver, el, opts.tapPct);
                } else {
                    await el.click();
                }
                return;
            } catch (error) {
                // 클릭 실패 시 바로 종료하지 않고 다음 후보/다음 스와이프로 진행
                lastError = error;
            }
        }

        if (i < maxSwipes) {
            await swipeUpAos(driver, swipeOpts);
        }
    }

    const reason = lastError ? ` :: lastError=${String((lastError as any)?.message ?? lastError)}` : '';
    throw new Error(`못 찾음(AOS): ${xpath}${reason}`);
}

type WebviewScrollTapOpts = {
    maxScrolls?: number;
    stepPx?: number;
    settleMs?: number;
};

// AOS WEBVIEW: 요소가 보일 때까지 DOM 스크롤 후 클릭
export async function tapCellWithScrollWebviewAos(
    driver: Browser,
    xpath: string,
    opts?: WebviewScrollTapOpts
) {
    const maxScrolls = opts?.maxScrolls ?? 10;
    const stepPx = opts?.stepPx ?? 520;
    const settleMs = opts?.settleMs ?? 220;
    let lastError: unknown = null;

    for (let i = 0; i <= maxScrolls; i += 1) {
        const candidates = await driver.$$(xpath);
        for (const el of candidates) {
            const displayed = await el.isDisplayed().catch(() => false);
            if (!displayed) continue;

            try {
                await el.click();
                return;
            } catch (error) {
                lastError = error;
            }
        }

        // webdriver click이 흔들리는 경우를 위해 DOM click fallback
        try {
            const clicked = await (driver as any).execute(
                (xp: string) => {
                    const node = document.evaluate(
                        xp,
                        document,
                        null,
                        XPathResult.FIRST_ORDERED_NODE_TYPE,
                        null
                    ).singleNodeValue as HTMLElement | null;
                    if (!node) return false;
                    node.scrollIntoView({ block: 'center', inline: 'nearest' });
                    node.click();
                    return true;
                },
                xpath
            );
            if (clicked) return;
        } catch (error) {
            lastError = error;
        }

        if (i < maxScrolls) {
            await (driver as any).execute((dy: number) => {
                window.scrollBy(0, dy);
            }, stepPx);
            await driver.pause(settleMs);
        }
    }

    const reason = lastError ? ` :: lastError=${String((lastError as any)?.message ?? lastError)}` : '';
    throw new Error(`못 찾음(AOS-WEBVIEW): ${xpath}${reason}`);
}
