import type { Browser } from 'webdriverio';
import fs from 'node:fs';
import path from 'node:path';
import { isVisible, safeClick } from '@tests/_shared/actions/ui';

export const TESTFLIGHT = `com.apple.TestFlight`;
export const SETTINGS_BUNDLE_ID = `com.apple.Preferences`;
export const TWD = 'com.sktelecom.miniTworld.ad.stg';

export const logout = `//XCUIElementTypeStaticText[@name="로그아웃"]`;
export const aiClose = `//XCUIElementTypeButton[@name="서비스 종료"]`;
export const aiAssert = `//XCUIElementTypeOther[@name="메뉴선택"]`;
export const aiBtn = `//XCUIElementTypeButton[@name="icon_ai_button"]`;
export const nudgeMessage = `//XCUIElementTypeApplication[@name="[STG] T world"]/XCUIElementTypeWindow[1]/XCUIElementTypeOther/XCUIElementTypeOther/XCUIElementTypeOther/XCUIElementTypeOther/XCUIElementTypeOther/XCUIElementTypeOther/XCUIElementTypeOther[3]/XCUIElementTypeOther[9]/XCUIElementTypeOther/XCUIElementTypeLink`;

const UPGRADE_POPUP = `//XCUIElementTypeAlert[@name="App 업그레이드 안내"]/XCUIElementTypeOther/XCUIElementTypeOther/XCUIElementTypeOther[2]/XCUIElementTypeScrollView[1]/XCUIElementTypeOther[1]`;
const UPGRADE_NO = `//XCUIElementTypeButton[@name="아니요"]`;

export async function waitUntilInstalledAndActivated(
  driver: Browser,
  bundleId: string,
  timeoutMs = 300000,
  pollMs = 3000
) {
  const endAt = Date.now() + timeoutMs;
  let lastState = 0;

  while (Date.now() < endAt) {
    const state = Number(
      await driver.execute('mobile: queryAppState', { bundleId }).catch(() => 0)
    );
    lastState = state;

    const installedByCmd = await driver.isAppInstalled(bundleId).catch(() => undefined);
    const isInstalled = typeof installedByCmd === 'boolean' ? installedByCmd : state !== 0;

    if (isInstalled) {
      try {
        await driver.activateApp(bundleId);
        return true;
      } catch {
        // 설치 직후 launch 가능한 시점까지 대기 후 재시도
      }
    }

    await driver.pause(pollMs);
  }

  console.log(`[install-wait] timeout bundleId=${bundleId} lastState=${lastState}`);
  return false;
}

type BasicTestInfo = {
  title: string;
  retry: number;
  status?: string;
  expectedStatus?: string;
};

export async function saveFailureScreenshot(driver: Browser, testInfo: BasicTestInfo) {
  if (testInfo.status === testInfo.expectedStatus) return;

  const num = testInfo.title.match(/iOS\s+(\d+)/i)?.[1] ?? 'unknown';
  const d = new Date();
  const yy = String(d.getFullYear()).slice(-2);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  const time = `${yy}${mm}${dd}${hh}${mi}`;

  const dir = path.join(process.cwd(), `test-output`, `screenshot`);
  fs.mkdirSync(dir, { recursive: true });
  await driver.saveScreenshot(`test-output/screenshot/${num}_${time}.png`);
}

export async function defaultBeforeEach(
  driver: Browser,
  testInfo: BasicTestInfo,
  skipTitles: string[] = []
) {
  if (skipTitles.some((s) => testInfo.title.includes(s))) {
    return;
  }

  // 재시도 시 남아있는 시스템 alert 정리
  if (testInfo.retry > 0) {
    const retryAlertText = await driver.getAlertText().catch(() => '');
    if (retryAlertText) {
      await driver.acceptAlert().catch(() => {});
    }
  }

  // 앱 상태 초기화 - 재실행
  try {
    await driver.terminateApp(TWD);
  } catch {}
  await driver.activateApp(TWD);
  await driver.pause(3000);

  if (await isVisible(driver, UPGRADE_POPUP)) {
    await safeClick(driver, UPGRADE_NO);
  }
}
