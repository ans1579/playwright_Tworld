import { test, expect } from 'appium/fixtures.ios';
import { tapCellWithScroll } from '@tests/_shared/actions/scroll';
import { isVisible, safeClick, waitVisible } from '@tests/_shared/actions/ui';

// iOS 설정 앱으로 세션 시작
const SETTINGS_BUNDLE_ID = `com.apple.Preferences`;
test.use({ bundleId: SETTINGS_BUNDLE_ID });

const TWD = `com.sktelecom.miniTworld.ad.stg`

test(`N89: iOS 알림권한 끄고 AI Layer 진입`, async ({ driver }) => {
    
    await test.step(`0. 알림 권한 해제`, async () => {
        await driver.activateApp(SETTINGS_BUNDLE_ID);
        await driver.pause(1000);

        // 설정 -> 앱 -> [STG] T world -> 알림 -> 알림 해제
        await tapCellWithScroll(driver, '//XCUIElementTypeButton[@name="com.apple.settings.apps"]');
        await tapCellWithScroll(driver, `//XCUIElementTypeStaticText[@name="[STG] T world"]`);
        await safeClick(driver, `//XCUIElementTypeStaticText[@name="알림"]`);

        const notificationSwitch = await waitVisible(driver, `//XCUIElementTypeSwitch[@name="알림 허용"]`);
        const switchValue = String((await notificationSwitch.getAttribute('value')) ?? '').trim().toLowerCase();
        if (switchValue === '1') {
            await notificationSwitch.click();
        }
        await driver.pause(1000);
    });

    await test.step(`1. 앱 실행 및 AI Layer 진입`, async () => {
        try {
            await driver.terminateApp(TWD);
        } catch {}
        await driver.activateApp(TWD);
        await driver.pause(3000);
        
        const aiBtn = `//XCUIElementTypeButton[@name="MY"]`;
        
        await safeClick(driver, aiBtn);
    });

    const notify = `//XCUIElementTypeStaticText[@name="기기 설정"]`;

    await test.step(`2. 권한 메세지 1차 확인`, async () => {
        await driver.pause(3000);
        let shown = await isVisible(driver, notify);
        if (!shown) {
            await test.step(`2-1. My 진입 및 앱 내부 알림 설정 해제`, async () => {
                await safeClick(driver, `//XCUIElementTypeLink[@name="보관함 열기 MY"]`);
                await safeClick(driver, `//XCUIElementTypeButton[@name="설정 열기"]`);
                await safeClick(driver, `//XCUIElementTypeOther[@name="기사"]/XCUIElementTypeOther[2]/XCUIElementTypeOther[1]`);
                
                const aiSwitch = await waitVisible(driver, `//XCUIElementTypeSwitch[@name="AI 추천 서비스 알림 설정"]`);
                const switchValue = String((await aiSwitch.getAttribute(`value`)) ?? '').trim().toLowerCase();
                if (switchValue === '1') {
                    await aiSwitch.click();
                }
                await driver.pause(1000);
            });

            await test.step(`2-2. 뒤로가기 -> AI Layer 재진입`, async () => {
                const backPage = `//XCUIElementTypeButton[@name="이전 페이지"]`;
                await safeClick(driver, backPage);
                await safeClick(driver, backPage);
                await safeClick(driver, backPage);
            })
        }

        await driver.pause(2000);
        shown = await isVisible(driver, notify, 6000);
        expect(shown).toBe(true);
    }); 
});
