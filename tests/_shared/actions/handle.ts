// tests/qaTest/shared/actions/handle.ts
import type { Browser } from "webdriverio";
import { waitVisible, waitNotVisible } from "./ui";
import { time } from "node:console";

type Opt = {
    mode?: 'must' | 'try'; // must: 드래그로 닫혀야 패스, try: 드래그로 닫히지 않으면 x버튼 으로 닫고나서 패스
    vfyMs?: number;
    closeMs?: number;
    throwOnFail?: boolean;
    drag?: {
        holdMs?: number;
        durMs?: number;
        startY?: number;
        endY?: number;
        settleMs?: number;
    };
};

export type Sel = {
    open: string;
    hdl: string;
    close: string;
};

export type Res = {
    ok: boolean;
    used: 'drag' | 'btn';
    mode: 'must' | 'try';
    t: { vfyMs: number; closeMs: number; };
    drag: { holdMs: number; durMs: number; startY: number; endY: number; settleMs: number; };
};

async function dragElToEl(
    driver: Browser,
    fromXPath: string,
    toXPath: string,
    drag: Res['drag'],
) {
    const a = await waitVisible(driver, fromXPath, 10_000);
    const b = await waitVisible(driver, toXPath, 10_000);

    const aLoc = await a.getLocation();
    const aSize = await a.getSize();
    const bLoc = await b.getLocation();
    const bSize = await b.getSize();

    const selx = Math.floor(aLoc.x + aSize.width / 2);
    const sely = Math.floor(aLoc.y + aSize.height / 2 + drag.startY);

    const elx = Math.floor(bLoc.x + bSize.width / 2);
    const ely = Math.floor(bLoc.y + bSize.height / 2 + drag.endY);

    await driver.performActions([
        {
            type: 'pointer',
            id: 'fingerDismiss',
            parameters: { pointerType: 'touch' },
            actions: [
                { type: 'pointerMove', duration: 0, x: selx, y: sely },
                { type: 'pointerDown', button: 0 },
                { type: 'pause', duration: drag.holdMs },
                { type: 'pointerMove', duration: drag.durMs, x: elx, y: ely },
                { type: 'pointerUp', button: 0 },
            ],
        },
    ]);
    await driver.releaseActions();
    await driver.pause(drag.settleMs);
}

async function tapEl(driver: Browser, xpath: string, timeoutMs: number) {
    const el = await waitVisible(driver, xpath, timeoutMs);
    try {
        await el.touchAction('tap');
    } catch {
        await el.click();
    }
    return el;
}

/*
chkDismiss
- 드래그 닫힘 검증 + 실패 시 닫기 버튼으로 정리 + 최종 닫힘 검증
*/
export async function chkDismiss(driver: Browser, sel: Sel, opt?: Opt): Promise<Res> {
    const mode: 'must' | 'try' = opt?.mode ?? 'must';
    const vfyMs = opt?.vfyMs ?? 2_500;
    const closeMs = opt?.closeMs ?? 10_000;

    const drag: Res['drag'] = {
        holdMs: opt?.drag?.holdMs ?? 200,
        durMs: opt?.drag?.durMs ?? 1000,
        startY: opt?.drag?.startY ?? 14,
        endY: opt?.drag?.endY ?? 20,
        settleMs: opt?.drag?.settleMs ?? 350,
    };

    await waitVisible(driver, sel.open, closeMs);
    await waitVisible(driver, sel.hdl, closeMs);
    await waitVisible(driver, sel.close, closeMs);

    let ok = false;
    try {
        await dragElToEl(driver, sel.hdl, sel.close, drag);
        await waitNotVisible(driver, sel.open, vfyMs);
        ok = true;
        return { ok, used: 'drag', mode, t: { vfyMs, closeMs }, drag};
    } catch {
        ok = false;
    }

    await tapEl(driver, sel.close, closeMs);
    await waitNotVisible(driver, sel.open, closeMs);

    const res: Res = { ok, used: 'btn', mode, t: { vfyMs, closeMs }, drag};
    const throwOnFail = opt?.throwOnFail ?? true;

    if (mode === 'must' && throwOnFail) {
        throw new Error(
            `드래그 실패 ( must ), X 버튼으로 닫음\n드래그 = [holdMs:${drag.holdMs} durMs:${drag.durMs} startY:${drag.startY} endY:${drag.endY} settleMs:${drag.settleMs}]`
        );
    }
    return res;
}

