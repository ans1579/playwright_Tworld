import { test } from '@appium/fixtures.aos';
import { APP_PACKAGE } from '@appium/aos/env.aos';
import { getAndSwitchToWebviewAos } from '@tests/_shared/actions/webview';

test(`AOS: 웹뷰 및 네이티브 전환 확인 테스트`, async ({ driver }) => {
    const basicTimeoutMs = 12_000;

    await test.step(`0. 앱 재실행`, async () => {
        try { await driver.terminateApp(APP_PACKAGE) } catch {}
        await driver.activateApp(APP_PACKAGE);
        await driver.pause(300);
    });

    await test.step(`1. Ai Layer 클릭`, async () => {
        await driver.pause(3_000);
        const aiBtn = await driver.$(`//android.view.View[@resource-id="Com.sktelecom.minit.ad.stg:id/centerButton"]`);
        await aiBtn.waitForDisplayed({ timeout: basicTimeoutMs });
        await aiBtn.click();
        await driver.pause(3_000);
    });

    await test.step(`2. 웹뷰 전환`, async () => {
        const web = await getAndSwitchToWebviewAos(driver, 3000);
        
        console.log(`FoundCtx :: ${web}`);
        console.log(`ChangedCtx :: ${await driver.getContext()}`);
        await driver.pause(3000);
    });

    await test.step(`3. 웹뷰 핸들링`, async () => {
        const allBtn = await driver.$(`//div[@role='combobox' and @aria-label='메뉴선택']`);
        await allBtn.waitForDisplayed({ timeout: basicTimeoutMs });
        await driver.pause(3000);
    });

    await test.step(`4. 닫기 버튼 확인 후 클릭`, async () => {
        const closeBtn = await driver.$(`//button[@type='button' and @aria-label='서비스 종료']`);
        await closeBtn.waitForDisplayed({ timeout: basicTimeoutMs });
        await closeBtn.click();
    });

    await test.step(`5. 네이티브로 복귀`, async () => {
        // 마지막은 항상 네이티브로 복귀
        await driver.switchContext('NATIVE_APP');
        const lastCtx = await driver.getContext(); 
        console.log(`last :: ${lastCtx}`);
    });
});
