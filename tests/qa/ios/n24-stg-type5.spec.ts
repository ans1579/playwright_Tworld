import { test } from '@appium/fixtures.ios';
import { iosSelectors as s } from '../../_shared/selectors/ios';
import { waitVisible, waitNotVisible } from '../../_shared/actions/ui';
import { assertScrollable } from '../../_shared/actions/scroll';
import { IOS_BUNDLE_ID } from '@appium/ios/env.ios.qa';
import { smartTap } from '../../_shared/gestures/ios';
import { chkDismiss } from '../../_shared/actions/handle';
import { click } from 'node_modules/webdriverio/build/commands/element';

async function clickWhenVisible(driver: any, selector: string, timeout = 15_000) {
    const el = await waitVisible(driver, selector, timeout);
    await el.click();
    return el;
}

test.use({ bundleId: IOS_BUNDLE_ID });

test(`QA iOS: Type5 검증_진입 및 스크롤 여부 확인`, async ({ driver }: any, testInfo) => {
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

        await smartTap(driver, s.aiLayerBtn, {
            timeoutMs: basicTimeoutMs,
            fallbackTapPct: { xPct: 0.5, yPct: 0.90 },
        });
    });

    await test.step(`2. Type1 우측 하단 MY 클릭`, async () => {
        await clickWhenVisible(driver, s.type1My, basicTimeoutMs);
    });

    await test.step(`3. Type5 화면 진입 확인 및 클릭`, async () => {
        await waitVisible(driver, s.type1Assert, basicTimeoutMs);
        await driver.pause(300);
        await clickWhenVisible(driver, s.type1Assert, basicTimeoutMs);
    });

    await test.step(`4. Type5 화면 진입 확인`, async () => {
        await waitVisible(driver, s.type5DetailBtn, basicTimeoutMs);
    });

    await test.step(`5. Type5 스크롤 가능 여부 확인 (스크롤 되면 안됨)`, async () => {
        await waitVisible(driver, s.type2Scroll, basicTimeoutMs);

        const r = await assertScrollable(driver, s.type2Scroll);
        testInfo.annotations.push({
            type: 'scroll',
            description: `moved=${r.moved} | yBefore=${r.yBefore} | yAfter=${r.yAfter}`,
        });
    });
    
    await test.step(`7. Ai Layer 닫기 버튼 클릭 + 닫힘 확인`, async () => {
        await clickWhenVisible(driver, s.aiCloseBtn, basicTimeoutMs);
        await waitNotVisible(driver, s.aiAssert, basicTimeoutMs);
    });

    if (!dragOk) {
        throw new Error(`Type2 핸들바 드래그로 닫기 실패, X 버튼으로만 닫힘 확인`);
    }
});
