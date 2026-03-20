import { test, expect } from '@appium/fixtures.aos';
import { measureE2E } from '@utils/e2eMetrics';
import { commonRun } from '@flows/common';
import { waitDisplayed } from '@flows/_actions';
import { safeClick } from '@tests/_shared/actions/ui';

const RUNS = 10;

test('E2E 성능: 내 정보 관리 클릭 -> 주소 표시(완료)', async ({ driverManager, appPackage }, testInfo) => {
  const stepTimeoutMs = 60_000;

  // 준비/측정 구간 분리를 위한 timeout
  const PREP_TIMEOUT = 12_000;     // 메뉴 열기/버튼 노출 등 준비 단계
  const UI_TIMEOUT = 12_000;       // 측정 구간 내 클릭
  const END_MARK_TIMEOUT = 20_000; // end marker(주소) 대기

  const MENU = '~btn_menu';
  const MYINFO = '//android.widget.TextView[@text="내 정보 관리"]';
  const ADDRESS =
    '//android.widget.TextView[@text="022** 서울특별시 중랑* ***** **** ***** **"]';

  const result = await measureE2E(
    testInfo,
    {
      runs: RUNS,
      stepTimeoutMs,
      title: 'E2E Perf - MyInfo (click->address)',
      attachName: 'e2e_myinfo_perf.txt',
      csvFormat: 'simple',
    },
    async (_runIndex, { stepTimeoutMs }) => {
      // 매 run마다 살아있는 driver 확보
      let driver = await driverManager.ensureAlive();

      const ctx = {
        driver,
        stepTimeoutMs,
        recover: async () => {
          try { await driver.terminateApp(appPackage); } catch {}
          await driver.activateApp(appPackage);
        },
      };

      // ✅ 준비 단계(측정 제외): 앱 리셋/가드 + 메뉴 열어서 "내 정보 관리"가 보이게 만들기
      await commonRun(ctx, async () => {
        await ctx.recover?.();

        // 메뉴 클릭은 성능 측정에 포함되면 안 되므로 여기(측정 밖)에서 수행
        await safeClick(driver, MENU, { timeoutMs: PREP_TIMEOUT });

        // 내 정보 관리 버튼이 실제로 노출된 상태까지 준비 완료(측정 오염 방지)
        await waitDisplayed(driver, MYINFO, { timeoutMs: PREP_TIMEOUT });
      });

      // ✅ 측정 구간(순수 성능): "내 정보 관리 클릭"부터 "주소 표시 확인"까지
      return {
        measure: async () => {
          await safeClick(driver, MYINFO, { timeoutMs: UI_TIMEOUT });
          await waitDisplayed(driver, ADDRESS, { timeoutMs: END_MARK_TIMEOUT });
        },
      };
    }
  );

  expect(result.successes.length).toBe(RUNS);
});
