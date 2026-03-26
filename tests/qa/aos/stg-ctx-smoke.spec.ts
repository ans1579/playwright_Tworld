import { test } from '@appium/fixtures.aos';
import { APP_PACKAGE } from '@appium/aos/env.aos';
import { getAndSwitchToWebviewAos } from '@tests/_shared/actions/webview';
import { isVisible, safeClick } from '@tests/_shared/actions/ui';

const tworld = `com.sktelecom.minit`;
test.use({appPackage: tworld, appActivity: `com.sktelecom.minit.scene.main.MainActivity`});
test(`AOS: 웹뷰 및 네이티브 전환 확인 테스트`, async ({ driver }) => {
    const basicTimeoutMs = 12_000;

    await test.step(`0. 앱 재실행`, async () => {
        // 다른 패키지(STG) 백그라운드 웹뷰가 컨텍스트에 섞이지 않도록 정리
        if (APP_PACKAGE.toLowerCase() !== tworld.toLowerCase()) {
            try { await driver.terminateApp(APP_PACKAGE); } catch {}
        }
        try { await driver.terminateApp(tworld) } catch {}
        await driver.activateApp(tworld);
        await driver.pause(300);
        if (await isVisible(driver, `//android.widget.TextView[@resource-id="Com.sktelecom.minit.ad.stg:id/titleTxt"]`)) {
            await safeClick(driver, `//android.widget.TextView[@resource-id="Com.sktelecom.minit.ad.stg:id/cancel"]`);
        }
    });

    await test.step(`1. Ai Layer 클릭`, async () => {
        await driver.pause(3_000);
        const aiBtn = await driver.$(`//android.widget.TextView[@resource-id="com.sktelecom.minit:id/buttonTextView" and @text="메뉴"]`);
        await aiBtn.waitForDisplayed({ timeout: basicTimeoutMs });
        await aiBtn.click();
        await driver.pause(3_000);
    });

    await test.step(`2. 웹뷰 전환`, async () => {
        const ctxs = (await driver.getContexts()) as string[];
        console.log('[contexts]', ctxs);

        const webview = ctxs.find((ctx) => ctx.startsWith('WEBVIEW'));
        if (!webview) {
            throw new Error(`WEBVIEW context 없음: ${JSON.stringify(ctxs)}`);
        }

        const switched = await getAndSwitchToWebviewAos(driver, 0, tworld);
        console.log('[switched]', switched);
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
