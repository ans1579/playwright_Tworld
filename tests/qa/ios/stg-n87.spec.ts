import { test, expect } from '@appium/fixtures.ios';
import { AppActions } from '../../../../tworld/mobile/utils/appActions.js';

// iOS 설정 앱으로 세션 시작
const SETTINGS_BUNDLE_ID = `com.apple.Preferences`;
test.use({ bundleId: SETTINGS_BUNDLE_ID });

// 대상 앱 번들 아이디(설정에서 앱 찾을 때 사용)
const TWD = `com.sktelecom.miniTworld.ad.stg`;

test(`N87: iOS 위치권한 끄고 AI Layer 진입`, async ({ driver }) => {
    const app = new AppActions(driver);
    
    await test.step(`0. 위치 권한 해제`, async () => {
        // 설정 앱 진입
        try {
            await driver.terminateApp(SETTINGS_BUNDLE_ID);
        } catch {}
        await driver.activateApp(SETTINGS_BUNDLE_ID);

        // 설정 > 앱 > [STG] T world 이동
        const appsMenu = `//XCUIElementTypeButton[@name="com.apple.settings.apps"]`;
        const stgApp = `//XCUIElementTypeStaticText[@name="[STG] T world"]`;

        expect(await app.scrollToElement(appsMenu, 8)).toBe(true);
        expect(await app.click2(appsMenu, 2000)).toBe(true);

        expect(await app.scrollToElement(stgApp, 8)).toBe(true);
        expect(await app.click2(stgApp, 2000)).toBe(true);
        await driver.pause(1000);

        // 위치 권한을 "다음번에 다시 묻기 또는 내가 공유할 때"로 변경
        expect(await app.click2(`//XCUIElementTypeStaticText[@name="위치"]`, 3000)).toBe(true);
        await driver.pause(1000);
        
        expect(await app.click2(`//XCUIElementTypeCell[@name="다음번에 묻기 또는 내가 공유할 때"]`, 3000)).toBe(true);
        await driver.pause(1000);
    });

    await test.step(`1. 앱 실행 및 AI Layer 클릭`, async () => {
        try {
            await driver.terminateApp(TWD);
        } catch {}
        await driver.activateApp(TWD);
        await driver.pause(2000);
        
        expect(await app.smartClick(`//XCUIElementTypeButton[@name="MY"]`, 3000)).toBe(true);
    });

    await test.step(`2. AI Layer 진입 -> `, async () => {
        await driver.pause(2000);
        const shown = await app.exists(
            `//XCUIElementTypeAlert[@name="‘[STG] T world’ 앱이 사용자의 위치를 사용하도록 허용하겠습니까?"]/XCUIElementTypeOther/XCUIElementTypeOther/XCUIElementTypeOther[2]/XCUIElementTypeScrollView[1]/XCUIElementTypeOther[1]`,
            10000
        );
        expect(shown).toBe(true);
        
        expect(await app.click2(`//XCUIElementTypeButton[@name="앱을 사용하는 동안 허용"]`, 10000)).toBe(true);
    });
})
