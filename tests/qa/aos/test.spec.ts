import { test, expect } from '@appium/fixtures.aos';
import { tapCellWithScrollAos } from '@tests/_shared/actions/scroll';
import { isVisible, safeClick } from '@tests/_shared/actions/ui';

const UPLUS = `com.lguplus.mobile.cs`;

test.use({ appPackage: UPLUS})

test(`test u+`, async ({ driver }) => {
    await driver.terminateApp(UPLUS);
    await driver.activateApp(UPLUS);
    await driver.pause(5000);
    await safeClick(driver, `//android.view.View[@resource-id="__layout"]/android.view.View/android.view.View[2]/android.view.View/android.widget.ListView/android.view.View[4]`);
    await tapCellWithScrollAos(driver, `//android.widget.Button[@resource-id="_uid_159"]`);
    await safeClick(driver, `//android.widget.Button[@resource-id="_uid_160"]`);
    await driver.pause(3000);
    await safeClick(driver, `//android.view.View[@content-desc="OTT 메뉴 이동"]`);
    await safeClick(driver, `//android.widget.Button[@text="넷플릭스 + 유튜브 프리미엄 연간권상세페이지 이동 넷플릭스 + 유튜브 프리미엄 연간권 넷플릭스+유튜브 프리미엄 국내 유일 월 18,900원! 할인율 14% 최종 금액 월 18,900원 할인 전 금액 월 21,900원"]`);
    expect(await isVisible(driver, `//android.widget.TextView[@text="넷플릭스 + 유튜브 프리미엄 연간권"]`)).toBe(true);
})