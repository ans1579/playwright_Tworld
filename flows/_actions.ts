// flows/_actions.ts
import type { Browser } from "webdriverio";

export type WaitOpts = { timeoutMs?: number; intervalMs?: number };

// 단순 sleep
// 안정화 대기용, 느려짐 위험 있음
export async function sleep(ms: number) {
    await new Promise((r) => setTimeout(r, ms));
}

// 셀렉터의 요소가 존재하는지만 확인
export async function exists(driver: Browser, selector: string, timeoutMs = 500): Promise<boolean> {
    try {
        const el = await driver.$(selector);
        await el.isExisting();
        return true;
    } catch {
        return false;
    }
}

// 셀렉터의 요소가 화면에 표시될 때까지 기다림
// 화면 전환, 진입 완료 확인용
export async function waitDisplayed(
    driver: Browser,
    selector: string,
    opts: WaitOpts = {}
): Promise<void> {
    const { timeoutMs = 5000, intervalMs = 250 } = opts;
    const el = await driver.$(selector);
    await el.waitForDisplayed({ timeout: timeoutMs, interval: intervalMs });
}

// 버튼이 존재하면 클릭, 없으면 패스
// 팝업 등 사용
export async function tapIfExists(driver: Browser, selector: string): Promise<boolean> {
  try {
    const el = await driver.$(selector);
    if (!(await el.isExisting())) return false;
    // 팝업은 보이는 버튼을 눌러야 하므로 displayed도 확인(원하면 생략 가능)
    if (!(await el.isDisplayed())) return false;
    await el.click();
    return true;
  } catch {
    return false;
  }
}
