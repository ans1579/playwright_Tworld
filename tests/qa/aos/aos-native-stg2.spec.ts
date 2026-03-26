import { test, expect } from '@appium/fixtures.aos';
import { isVisible, longPressByPercent, longPressBySelector, readText, safeClick, waitVisible } from '@tests/_shared/actions/ui';
import { getAndSwitchToWebviewAos } from '@tests/_shared/actions/webview';
import { tapCellWithScrollAos } from '@tests/_shared/actions/scroll';
import { swipeByPercent } from '@tests/_shared/gestures/ios';
import {
  TWD,
  defaultBeforeEach,
} from './aos-native-stg.shared';

test.use({ appPackage: TWD });

test.beforeEach(async ({ driver }, testInfo) => {
  const skip = [`AOS 021`, `AOS 023`, `AOS 024`];
  if (skip.some((s) => testInfo.title.includes(s))) {
    return;
  }
  await defaultBeforeEach(driver);
});
test(`Native AOS 021: 위젯 추가`, async ({ driver }) => {
    await driver.pause(2000);
    await driver.execute(`mobile: pressKey`, {keycode: 3});
    await driver.pause(2000);
    await longPressByPercent(driver, {xPct: 0.1, yPct: 0.5});
    await safeClick(driver, `//android.widget.Button[@text="위젯"]`);
    await driver.pause(2000);
    await swipeByPercent(
        driver,
        {xPct: 0.5, yPct: 0.7},
        {xPct: 0.5, yPct: 0.5}
    );
    await safeClick(driver, `//android.widget.TextView[@resource-id="com.sec.android.app.launcher:id/header_label" and @text="[STG] T world"]`);
    await driver.pause(1000);
    expect(await isVisible(driver, `//android.widget.TextView[@resource-id="com.sec.android.app.launcher:id/expand_cell_label" and @text="T world 1x1"]`)).toBe(true);
    expect(await isVisible(driver, `//android.widget.TextView[@resource-id="com.sec.android.app.launcher:id/expand_cell_label" and @text="T world 2x1"]`)).toBe(true);
    await driver.pause(1000);
    await swipeByPercent(
        driver,
        {xPct: 0.5, yPct: 0.75},
        {xPct: 0.5, yPct: 0.4}
    );
    expect(await isVisible(driver, `//android.widget.TextView[@resource-id="com.sec.android.app.launcher:id/expand_cell_label" and @text="T world 3x1"]`)).toBe(true);
    expect(await isVisible(driver, `//android.widget.TextView[@resource-id="com.sec.android.app.launcher:id/expand_cell_label" and @text="T world 4x2"]`)).toBe(true);
    await safeClick(driver, `(//android.widget.FrameLayout[@resource-id="com.sec.android.app.launcher:id/expand_cell"])[3]/android.widget.LinearLayout`);
    await safeClick(driver, `//android.widget.LinearLayout[@resource-id="com.sec.android.app.launcher:id/list_expand"]/android.widget.LinearLayout[3]`);
    await safeClick(driver, `//android.widget.TextView[@resource-id="Com.sktelecom.minit.ad.stg:id/confirm"]`);
})


test(`Native AOS 023: 위젯 - 메인 페이지 이동 확인`, async ({ driver }) => {
    await driver.execute(`mobile: pressKey`, {keycode: 3});
    await safeClick(driver, `//android.widget.ImageView[@resource-id="Com.sktelecom.minit.ad.stg:id/tLogo"]`);
    if (await isVisible(driver, `//android.widget.TextView[@resource-id="Com.sktelecom.minit.ad.stg:id/titleTxt"]`)) {
        await safeClick(driver, `//android.widget.TextView[@resource-id="Com.sktelecom.minit.ad.stg:id/cancel"]`);
    }
    await driver.pause(4000);
    expect(await isVisible(driver, `//android.widget.TextView[@text="T World"]`)).toBe(true);
})


test(`Native AOS 024: 위젯 노출 항목 변경`, async ({ driver }) => {
    await driver.execute(`mobile: pressKey`, {keycode: 3});
    await safeClick(driver, `//android.widget.ImageView[@resource-id="Com.sktelecom.minit.ad.stg:id/widgetSetting"]`);
    await safeClick(driver, `//android.widget.LinearLayout[@resource-id="Com.sktelecom.minit.ad.stg:id/moveToWidgetSetting"]`);
    if (await isVisible(driver, `//android.widget.TextView[@resource-id="Com.sktelecom.minit.ad.stg:id/titleTxt"]`)) {
        await safeClick(driver, `//android.widget.TextView[@resource-id="Com.sktelecom.minit.ad.stg:id/cancel"]`);
    }
    await driver.pause(4000);
    await safeClick(driver, `//android.widget.Button[@resource-id="Com.sktelecom.minit.ad.stg:id/widgetDataSelected"]`);
    await safeClick(driver, `//android.widget.TextView[@resource-id="Com.sktelecom.minit.ad.stg:id/displayName" and @text="미설정"]`);
    await safeClick(driver,`//android.widget.Button[@resource-id="Com.sktelecom.minit.ad.stg:id/widgetVoiceSelected"]`);
    await safeClick(driver, `//android.widget.TextView[@resource-id="Com.sktelecom.minit.ad.stg:id/displayName" and @text="미설정"]`);
    await safeClick(driver, `//android.widget.Button[@resource-id="Com.sktelecom.minit.ad.stg:id/widgetSmsSelected"]`);
    await safeClick(driver, `//android.widget.TextView[@resource-id="Com.sktelecom.minit.ad.stg:id/displayName" and @text="미설정"]`);
    await driver.execute(`mobile: pressKey`, {keycode: 3});
    await driver.pause(3000);
    const msg1 = await readText(driver, `//android.widget.TextView[@resource-id="Com.sktelecom.minit.ad.stg:id/dataLimit"]`);
    const msg2 = await readText(driver, `//android.widget.TextView[@resource-id="Com.sktelecom.minit.ad.stg:id/callLimitSideText"]`);
    const msg3 = await readText(driver, `//android.widget.TextView[@resource-id="Com.sktelecom.minit.ad.stg:id/smsLimitSideText"]`);
    expect([msg1, msg2, msg3].every(v => String(v ?? '').includes('미설정'))).toBe(true);

    // 위젯 삭제 - 테스트 반복을 위함
    await longPressBySelector(driver, `//android.widget.RelativeLayout[@resource-id="Com.sktelecom.minit.ad.stg:id/widgetLayout"]`);
    await safeClick(driver, `//android.widget.TextView[@resource-id="com.sec.android.app.launcher:id/global_option_label" and @text="홈에서 삭제"]`);
})

test(`Native AOS 037: 공유하기 1`, async ({ driver }) => {
    await driver.pause(3000);
    await safeClick(driver, `//android.widget.TextView[@resource-id="Com.sktelecom.minit.ad.stg:id/buttonTextView" and @text="메뉴"]`);
    await safeClick(driver, `//android.view.View[@resource-id="editTab_button_1"]`);
    await safeClick(driver, `//android.widget.TextView[@text="부가서비스"]`);
    await driver.pause(2000);
    await safeClick(driver, `//android.widget.Button[@resource-id="fe-bt-share"]`);
    const msg = await readText(driver, `//android.widget.TextView[@resource-id="com.android.intentresolver:id/sem_chooser_main_title"]`);
    expect(msg).toContain(`T world`);
    await driver.back().catch(() => {});
})

test(`Native AOS 038: 공유하기 2`, async ({ driver }) => {
    await driver.pause(3000);
    await safeClick(driver, `//android.widget.TextView[@resource-id="Com.sktelecom.minit.ad.stg:id/buttonTextView" and @text="메뉴"]`);
    await driver.pause(1000);
    await safeClick(driver, `//android.widget.TextView[@text="나의 데이터/통화"]`);
    await driver.pause(2000);
    await tapCellWithScrollAos(driver, `//android.widget.TextView[@text="데이터 조르기"]`);
    if (await waitVisible(driver, `//android.widget.TextView[@text="SKT를 이용하는 고객에게 문자와 SNS로 데이터 조르기를 하실 수 있습니다."]`)) {
        await safeClick(driver, `//android.widget.Button[@text="조르기 요청"]`);
    }
    const msg = await readText(driver, `//android.widget.TextView[@resource-id="com.android.intentresolver:id/sem_chooser_text_type_content"]`);
    expect(msg).toContain(`조르기`);
    await driver.back().catch(() => {});
})

test(`Native AOS 041: App 설치 여부 확인`, async ({ driver }) => {
    await driver.pause(3000);
    await safeClick(driver, `//android.widget.TextView[@resource-id="Com.sktelecom.minit.ad.stg:id/buttonTextView" and @text="메뉴"]`);
    await getAndSwitchToWebviewAos(driver);
    const c = await driver.getContext();
    console.log(`웹뷰 변경? = ${c}`);
    await tapCellWithScrollAos(driver, `//span[contains(@class,'btn-more') and normalize-space(.)='더 보기']`);
    await driver.pause(2000);
    const ctxs = await driver.getContexts();
    console.log(`ctxs = ${ctxs}`);
    await driver.switchContext(`NATIVE_APP`);
    expect(await isVisible(driver, `//android.view.View[@content-desc="설치된 앱 T 아이디"]`)).toBe(true);
    expect(await isVisible(driver, `//android.view.View[@content-desc="에이닷 설치된 앱 에이닷"]`)).toBe(true);
})


test(`Native AOS 042: 웹뷰의 파일첨부 확인`, async ({ driver }) => {
    await driver.pause(3000);
    await safeClick(driver, `//android.widget.TextView[@resource-id="Com.sktelecom.minit.ad.stg:id/buttonTextView" and @text="메뉴"]`);
    await getAndSwitchToWebviewAos(driver);
    await safeClick(driver, `//button[@role='tab'][.//span[normalize-space(.)='고객 지원']]`);
    await driver.pause(1000);
    await safeClick(driver, `//a[@href='/customer/emailconsult' and normalize-space(.)='상담 하기']`);
    await driver.pause(1000);
    await safeClick(driver, `//button[@aria-controls='file-pop' and normalize-space(.)='파일 첨부하기']`);
    await driver.pause(1000);
    await driver.switchContext(`NATIVE_APP`);
    await safeClick(driver, `(//android.widget.Button[@text="선택된 파일 없음"])[1]`);
    await driver.pause(1000);
    await safeClick(driver, `(//android.widget.ImageView[@resource-id="com.google.android.documentsui:id/icon_thumb"])[1]`);
    await driver.pause(1000);
    await safeClick(driver, `//android.widget.Button[@resource-id="fe-upload-ok"]`);
    const msg = await readText(driver, `//android.widget.Button[@text="삭제"]`);
    expect(msg).toContain('삭제');
})


test(`Native AOS 045: 영문 디폴트 설정`, async ({ driver }) => {
    const switchSpan = `//span[contains(@class,'fe-set-eng') and contains(@class,'btn-switch')]`;
    const getSwitchState = async (label: string) => {
        const el = await waitVisible(driver, switchSpan);
        const className = String(await el.getAttribute(`class`) ?? '').trim().toLowerCase();
        const isOn = className.includes(`active`) || className.includes(`on`) || className.includes(`checked`);
        console.log(`[Test:045] ${label} 스위치 상태: ${isOn ? `ON` : `OFF`} | class=${className}`);
        return isOn;
    };

    await driver.pause(3000);
    await safeClick(driver, `//android.widget.TextView[@resource-id="Com.sktelecom.minit.ad.stg:id/buttonTextView" and @text="메뉴"]`);
    await safeClick(driver, `//android.view.View[@content-desc="English!"]`);
    await safeClick(driver, `//android.widget.TextView[@resource-id="Com.sktelecom.minit.ad.stg:id/buttonTextView" and @text="MENU"]`);
    await driver.pause(1000);
    await safeClick(driver, `//android.view.View[@content-desc="setting"]/android.view.View/android.widget.TextView`);
    await getAndSwitchToWebviewAos(driver);
    if (!(await getSwitchState(`변경 전`))) {
        console.log(`[Test:045] 스위치 ON 전환 클릭`);
        await safeClick(driver, switchSpan);
    }
    await driver.pause(3000);
    await driver.switchContext(`NATIVE_APP`).catch(() => {});
    await driver.terminateApp(TWD);
    await driver.activateApp(TWD);
    if (await isVisible(driver, `//android.widget.TextView[@resource-id="Com.sktelecom.minit.ad.stg:id/titleTxt"]`)) {
        await safeClick(driver, `//android.widget.TextView[@resource-id="Com.sktelecom.minit.ad.stg:id/cancel"]`);
    }
    await driver.pause(3000);
    await getAndSwitchToWebviewAos(driver);
    const msg = await readText(driver, `//a[@data-url='/en/myt-fare/submain' and normalize-space(.)='My Bills']`);
    expect(msg).toContain(`My Bills`);
    await driver.pause(1000);
    await driver.switchContext(`NATIVE_APP`).catch(() => {});
    await safeClick(driver, `//android.widget.TextView[@resource-id="Com.sktelecom.minit.ad.stg:id/buttonTextView" and @text="MENU"]`);
    await driver.pause(1000);
    await safeClick(driver, `//android.view.View[@content-desc="setting"]/android.view.View/android.widget.TextView`);
    await driver.pause(1000);
    await getAndSwitchToWebviewAos(driver);
    await driver.pause(1000);
    if (await getSwitchState(`복구 전`)) {
        console.log(`[Test:045] 스위치 OFF 복구 클릭`);
        await safeClick(driver, switchSpan);
    }
    await driver.switchContext(`NATIVE_APP`);
})


test(`Native AOS 047: 앱 종료 - 뒤로가기`, async ({ driver }) => {
    await driver.pause(4000);
    await driver.back().catch(() => {});
    await driver.back().catch(() => {});
    await safeClick(driver, `//android.widget.Button[@text="종료"]`);
    expect(await isVisible(driver, `//android.widget.TextView[@text="T World"]`)).toBe(false);
})

