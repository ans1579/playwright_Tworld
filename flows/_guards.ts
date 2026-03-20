// flows/_guards.ts
import type { Browser } from "webdriverio";
import { sleep, tapIfExists } from "./_actions";

// 가드 컨텍스트
export type GuardCtx = {
    driver: Browser;
    stepTimeoutMs: number;
};

// 팝업 처리용
// 하나라도 클릭되면 잠깐 sleep 후 다시 스캔
// 아무것도 클릭되지 않으면 종료
// - acted = true : 1개 이상 처리함
// - acted = false: 처리하지 않음
export async function guardUnexpectPopups(
    ctx: GuardCtx,
    opts?: { maxPasses?: number }
) {
    const { driver, stepTimeoutMs } = ctx;
    const maxPasses = opts?.maxPasses ?? 6;

    /*
    버튼 selector
    - 순서 중요 (허용, 다음, 건너뛰기 등 진행에 필요한 버튼부터)
    - 필요시 추가
    */
   const candidates: string[] = [
    '//*[@text="허용"]',
    '//*[@text="확인"]',
    '//*[@text="닫기"]',
    '//*[@text="다음"]',
    '//*[@text="건너뛰기"]',
    '//*[@text="나중에"]',
    '//*[@text="오늘 하루 보지 않기"]',
    '//*[@text="다시 보지 않기"]',
    '//*[@text="다시보지않기"]',
    
    '//*[@text="Allow"]',
    '//*[@text="OK"]',
    '//*[@text="Close"]',
    '//*[@text="Next"]',
    '//*[@text="Skip"]',
    
    // 안드로이드 리소스 ID
    '//*[@resource-id="com.android.permissioncontroller:id/permission_allow_button"]',
    '//*[@resource-id="com.android.permissioncontroller:id/permission_allow_foreground_only_button"]',

    // 일부 공통 close content-desc
    '//*[@content-desc="닫기"]',
    '//*[@content-desc="Close"]',

    // 취소, 아니오, 거절
    '//*[@text="취소"]',
    '//*[@text="Cancel"]',
    '//*[@text="아니요"]',
    '//*[@text="No"]',
    '//*[@resource-id="com.android.permissioncontroller:id/permission_deny_button"]',
   ];

   let acted = false;

   for (let pass=0; pass<maxPasses; pass++) {
    let didSomethingPass = false;

    for (const cand of candidates) {
        const quickTimeout = Math.min(350, Math.floor(stepTimeoutMs / 10));

        const clicked = await tapIfExists(driver, cand);
        if(clicked) {
            didSomethingPass = true;
            acted = true;
            // 찾았다면 잠시 sleep -> 다시 스캔 시작
            await sleep(250);
            break;
        }
    }
    // 아무것도 못찾았다면 바로 종료
    if(!didSomethingPass) break;
   }
   return acted;
}

// 화면이 조작 가능한 상태인지 확인
// - 팝업이 셀렉터를 가리는 것을 방지
// - ready 전후로 팝업가드를 실행함
export async function guardAppReady(
    ctx: GuardCtx,
    rootSelector: string,
    opts?: { timeoutMs?: number }
) {
    const { driver } = ctx;
    const timeoutMs = opts?.timeoutMs ?? ctx.stepTimeoutMs;
    
    // ready 전 팝업 제거
    await guardUnexpectPopups(ctx);

    const el = await driver.$(rootSelector);
    await el.waitForDisplayed({ timeout: timeoutMs, interval: 250 });

    // ready 후 팝업 제거
    await guardUnexpectPopups(ctx);
}