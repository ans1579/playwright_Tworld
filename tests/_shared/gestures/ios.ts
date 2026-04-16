// tests/qaTest/shared/gestures/ios.ts

import type { Browser } from "webdriverio";
import { waitVisible } from "../actions/ui";

type PointPct = { xPct: number; yPct: number };

// 좌표 기반 스와이프
// - 기기 / 해상도에 따른 차이를 줄이기 위해서 퍼센테이지로 접근
export async function swipeByPercent(driver: Browser, from: PointPct, to: PointPct, opts?: { durationMs?: number; holdMs?: number }) {
    const rect = await driver.getWindowRect();
    const durationMs = opts?.durationMs ?? 450;
    const holdMs = opts?.holdMs ?? 80;

    const startX = Math.round(rect.width * from.xPct);
    const startY = Math.round(rect.height * from.yPct);
    const endX = Math.round(rect.width * to.xPct);
    const endY = Math.round(rect.height * to.yPct);

    await driver.performActions([
        {
            type: "pointer",
            id: "finger1",
            parameters: { pointerType: "touch" },
            actions: [
                { type: "pointerMove", duration: 0, x: startX, y: startY },
                { type: "pointerDown", button: 0 },
                { type: "pause", duration: holdMs },
                { type: "pointerMove", duration: durationMs, x: endX, y: endY },
                { type: "pointerUp", button: 0 },
            ],
        },
    ]);

    await driver.releaseActions();
}

// 기본 스크롤
// - 바텀 시트 스크롤 다운, 스와이프와 충돌 방지
export async function swipeToScroll(driver: Browser, opts?: { durationMs?: number }) {
    await swipeByPercent(driver, { xPct: 0.5, yPct: 0.7 }, { xPct: 0.5, yPct: 0.3 }, { durationMs: opts?.durationMs ?? 420 });
}

export async function swipeClose(driver: Browser, opts?: { durationMs?: number }) {
    await swipeByPercent(driver, { xPct: 0.5, yPct: 0.28 }, { xPct: 0.5, yPct: 0.9 }, { durationMs: opts?.durationMs ?? 600 });
}

export async function tapByPercent(driver: Browser, point: PointPct, opts?: { holdMs?: number }) {
    const rect = await driver.getWindowRect();
    const holdMs = opts?.holdMs ?? 60;

    const x = Math.round(rect.width * point.xPct);
    const y = Math.round(rect.height * point.yPct);

    await driver.performActions([
        {
            type: "pointer",
            id: "fingerTap",
            parameters: { pointerType: "touch" },
            actions: [
                { type: "pointerMove", duration: 0, x, y },
                { type: "pointerDown", button: 0 },
                { type: "pause", duration: holdMs },
                { type: "pointerUp", button: 0 },
            ],
        },
    ]);
    await driver.releaseActions();
}

export async function smartTap(
    driver: Browser,
    selector: string,
    opts?: {
        timeoutMs?: number;
        fallbackTapPct?: PointPct;
        settleMs?: number;
    },
) {
    const timeoutMs = opts?.timeoutMs ?? 15_000;
    const settleMs = opts?.settleMs ?? 250;

    const el = await waitVisible(driver, selector, timeoutMs);

    // 요소 기반 터치
    // try {
    //     await el.touchAction('tap');
    //     await driver.pause(settleMs);
    //     console.log(`요소 터치`)
    //     return { used: '요소 클릭' as const, el };
    // } catch {}

    // 좌표 기반 터치
    if (opts?.fallbackTapPct) {
        await tapByPercent(driver, opts.fallbackTapPct);
        await driver.pause(settleMs);
        console.log(`좌표 터치`);
        return { used: "좌표 클릭" as const, el };
    }
    // 클릭
    await el.click();
    await driver.pause(settleMs);
    console.log(`클릭`);
    return { used: "클릭" as const, el };
}
