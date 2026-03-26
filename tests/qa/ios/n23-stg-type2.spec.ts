import { test } from '@appium/fixtures.ios';
import { iosSelectors as s } from '../../_shared/selectors/ios';
import { safeClick, waitVisible, waitNotVisible } from '../../_shared/actions/ui';
import { assertScrollable } from '../../_shared/actions/scroll';
import { IOS_BUNDLE_ID } from '@appium/ios/env.ios.qa';
import { chkDismiss } from '../../_shared/actions/handle';

async function clickWhenVisible(driver: any, selector: string, timeout = 15_000) {
    const el = await waitVisible(driver, selector, timeout);
    await el.click();
    return el;
}

test.use({ bundleId: IOS_BUNDLE_ID });

test(`QA iOS: Type2 검증_진입 및 스크롤 여부 확인`, async ({ driver }: any, testInfo) => {
    const basicTimeoutMs = 15_000;
    let dragOk = true;

    await test.step(`0. 앱 재실행`, async () => {
        try {
            await driver.terminateApp(IOS_BUNDLE_ID);
        } catch {}

        await driver.pause(300);
        await driver.activateApp(IOS_BUNDLE_ID);
        await driver.pause(300);
    });

    await test.step(`1. AI Layer 클릭`, async () => {
        await waitVisible(driver, s.aiLayerBtn, basicTimeoutMs);

        await safeClick(driver, s.aiLayerBtn);
    });

    await test.step(`2. 다음 슬라이드 이동`, async () => {
        await clickWhenVisible(driver, s.nextSlideBtn, basicTimeoutMs);
    });

    await test.step(`3. Type2 화면 진입 - 2번째 슬라이드 '자세히 보기' 클릭`, async () => {
        await clickWhenVisible(driver, s.slide2DetailBtn, basicTimeoutMs);
    });

    await test.step(`4. Type2 화면 진입 확인`, async () => {
        await waitVisible(driver, s.type2Assert, basicTimeoutMs);
    });

    await test.step(`5. Type2 스크롤 가능 여부 확인 (스크롤 되어야 함)`, async () => {
        await waitVisible(driver, s.type2Scroll, basicTimeoutMs);

        const r = await assertScrollable(driver, s.type2Scroll);
        testInfo.annotations.push({
            type: 'scroll',
            description: `moved=${r.moved} | yBefore=${r.yBefore} | yAfter=${r.yAfter}`,
        });
    });

    await test.step(`6. Type2 드래그 닫힘 MUST 검증 + fallback 정리`, async () => {
        const r = await chkDismiss(
            driver,
            { open: s.type2Assert, hdl: s.type2Handle, close: s.type2Close },
            { mode: 'must', throwOnFail: false, vfyMs: 2500, closeMs: basicTimeoutMs },
        );
        dragOk = r.ok;

        if (!r.ok) {
            testInfo.annotations.push({
                type: 'type2 핸들바 닫기 검증',
                description: `실패: 핸들바 드래그로 닫기 실패. used = ${r.used}`
            });
        }
    });

    await test.step(`7. Ai Layer 닫기 버튼 클릭 + 닫힘 확인`, async () => {
        await clickWhenVisible(driver, s.aiCloseBtn, basicTimeoutMs);
        await waitNotVisible(driver, s.aiAssert, basicTimeoutMs);
    });

    if (!dragOk) {
        throw new Error(`Type2 핸들바 드래그로 닫기 실패, X 버튼으로만 닫힘 확인`);
    }
});
