import { test, expect } from '@appium/fixtures.aos';
import { getHorizontal, getVertical, isVisible, safeClick } from '@tests/_shared/actions/ui';
import { assertScrollable } from '@tests/_shared/actions/scroll';


const TWD = `Com.sktelecom.minit.ad.stg`;

test(`N86: AOS Type1 화면 진입, 스크롤링 및 닫힘 확인`, async ({ driver }) => {
    
    await test.step(`0. 앱 재실행`, async () => {
        try {
            await driver.terminateApp(TWD);
        } catch {}
        await driver.activateApp(TWD);
        await driver.pause(2000);
    });

    await test.step(`1. AI Layer 진입 및 웹뷰 전환`, async () => {
        const aiBtn = `//android.widget.Button[@content-desc="추천 서비스"]`;
        await safeClick(driver, aiBtn);
        await driver.pause(3000);

        const contexts = await driver.getContexts() as string[];
        const web = contexts.filter((c) => c.startsWith('WEBVIEW_'));
        const target = web[web.length - 1];

        if (!target) {
            throw new Error(`WEBVIEW 컨텍스트를 찾지 못함: ${JSON.stringify(contexts)}`);
        }

        await driver.switchContext(target);
        console.log('TargetWebview : ' + target);
        await driver.pause(3000);
    });

    await test.step(`2. Type1: 보관함 MY 진입 및 뒤로가기 위치 판별`, async() => {
        await safeClick(driver, `//img[@alt='보관함 열기']/ancestor::div[1]`);
        await driver.pause(2000);

        // 스크롤 가능 검증
        await assertScrollable(driver, `//button[contains(@title,'히스토리 접기')]`)

        const locX = await getHorizontal(driver, `//button[@type='button' and @aria-label='이전 페이지']`);
        const  locY = await getVertical(driver, `//button[@type='button' and @aria-label='이전 페이지']`);
        console.log(`X : ${locX} | Y : ${locY}`);

        if (locX !== 'left' || locY !== 'top') {
            throw new Error(`뒤로가기 위치가 좌측 상단이 아님 x = ${locX}, y = ${locY}`);
        } else {
            expect(await isVisible(driver, `//button[@type='button' and @aria-label='이전 페이지']`)).toBe(true);
        }
    })
})
