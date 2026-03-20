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
    const fromYPct = opts?.fromYPct ?? 0.72;
    const toYPct = opts?.toYPct ?? 0.30;
    const distance = Math.abs(fromYPct - toYPct) || 0.55;
    const durationMs = opts?.durationMs ?? 520;
    const settleMs = opts?.settleMs ?? 220;
    await swipeByDirectionAos(driver, 'up', distance, durationMs);
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
    const textEq = xpath.match(/@text\s*=\s*["']([^"']+)["']/)?.[1];
    const textContains = xpath.match(/contains\(\s*@text\s*,\s*["']([^"']+)["']\s*\)/)?.[1];
    const targetText = textEq ?? textContains;

    // 1) text 기반 xpath면 UiScrollable(textContains)로 먼저 시도
    if (targetText) {
        const escaped = targetText.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
        const uiScrollable = [
            'new UiScrollable(new UiSelector().scrollable(true).instance(0))',
            `.scrollIntoView(new UiSelector().textContains("${escaped}").instance(0));`,
        ].join('');
        try {
            const el = await driver.$(`android=${uiScrollable}`);
            if (await el.isDisplayed()) {
                await el.click();
                return;
            }
        } catch {}
    }

    for (let i = 0; i <= maxSwipes; i++) {
        const candidates = await driver.$$(xpath);
        for (const el of candidates) {
            if (await el.isDisplayed()) {
                if (opts?.tapPct) {
                    await tapElementByPct(driver, el, opts.tapPct);
                } else {
                    await el.click();
                }
                return;
            }
        }

        if (i < maxSwipes) {
            await swipeUpAos(driver, opts?.swipe);
        }
    }

    throw new Error(`못 찾음(AOS): ${xpath}`);
}
