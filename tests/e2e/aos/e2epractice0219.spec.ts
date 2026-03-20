import { test, expect } from '../../../appium/fixtures.aos';
import { measureE2E } from '../../../utils/e2eMetrics';

// 반복 횟수
const RUNS = 10;

test('E2E 측정: 메뉴 -> 내 정보 관리 진입', async ({ driver, appPackage }, testInfo) => {
  const result = await measureE2E(
    testInfo,
    {
      runs: RUNS,
      stepTimeoutMs: 60_000,
      title: 'E2E Result - MyInfo',
      attachName: 'e2e_myinfo.txt',
      csvFormat: 'simple',
    },
    async (_runIndex, { stepTimeoutMs }) => {
      try { await driver.terminateApp(appPackage); } catch {}
      await driver.activateApp(appPackage);

      const menu = await driver.$('//android.widget.ImageView[@content-desc="btn_menu"]');
      await menu.waitForDisplayed({ timeout: stepTimeoutMs });
      await menu.click();

      const myinfo = await driver.$('//android.widget.TextView[@text="내 정보 관리"]');
      await myinfo.waitForDisplayed({ timeout: stepTimeoutMs });
      await myinfo.click();

      const address = await driver.$('//android.widget.TextView[@text="022** 서울특별시 중랑* ***** **** ***** **"]');
      await address.waitForDisplayed({ timeout: stepTimeoutMs });
    }
  );
  expect(result.successes.length).toBe(RUNS);
});
