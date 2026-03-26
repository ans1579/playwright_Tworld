import { test, expect } from '@appium/fixtures.ios';
import { isVisible, safeClick, waitVisible } from '@tests/_shared/actions/ui';
import {
  TWD,
  aiAssert,
  aiBtn,
  aiClose,
  defaultBeforeEach,
  logout,
  saveFailureScreenshot,
} from './ios-native-stg.shared';

test.use({ bundleId: TWD });

test.afterEach(async ({ driver }, testInfo) => {
  await saveFailureScreenshot(driver, testInfo as any);
});

test.beforeEach(async ({ driver }, testInfo) => {
  await defaultBeforeEach(driver, testInfo as any);
});
test(`Native iOS 057: 비로그인 AI Layer 접속`, async ({ driver }) => {
    // 하단 메뉴 탭 진입
    await safeClick(driver, `//XCUIElementTypeOther[@name="메뉴 탭"]`);

    // 로그인 상태 판별
    const isLogIn = await driver.$(logout).isDisplayed().catch(() => false);
    console.log(`[Test:057] 로그인상태: ${isLogIn ? '로그인' : '비로그인'}`);

    // 로그인 상태라면 로그아웃 처리 후 AI Layer 진입
    if (isLogIn) {
        console.log(`[Test:57] MY진입경로: 로그아웃후`);
        await safeClick(driver, logout);
        await safeClick(driver, `//XCUIElementTypeStaticText[@name="예(Y)"]`);
        await safeClick(driver, `//XCUIElementTypeStaticText[@name="홈으로"]`);
        await driver.pause(2000);
        await safeClick(driver, aiBtn);
    // 이미 로그아웃 상태라면 바로 AI Layer 진입
    } else if (!isLogIn) {
        console.log(`[Test:057] MY진입경로: 바로진입`);
        await safeClick(driver, aiBtn);
    }

    // 권한/SSO 안내 팝업 노출 대기
    await driver.pause(4000);

    // iOS 시스템 alert면 alert API로 처리, 아니면 일반 네이티브 버튼으로 처리
    // isAlertOpen()이 없는 환경이라 getAlertText() 성공 여부로 alert 존재를 판단한다.
    let alertText = '';
    try {
        alertText = await driver.getAlertText();
    } catch {
        alertText = '';
    }
    console.log(`[Test:057] Alert 감지여부: ${Boolean(alertText)}`);

    if (alertText) {
        await driver.acceptAlert().catch(() => {});
    } else {
        await waitVisible(driver, `//XCUIElementTypeButton[@name="계속"]`, 5000);
        await driver.pause(2000);
        await safeClick(driver, `//XCUIElementTypeButton[@name="계속"]`);

        await safeClick(driver, `//XCUIElementTypeOther[@name="메뉴 탭"]`);
        expect(await waitVisible(driver, logout)).toBeTruthy();
    };

    // 로그인 화면 전환 대기
    await driver.pause(2000);

    // 로그인 정보 입력
    // 1. 아이디 입력 칸을 먼저 찾고 아이디 및 비번 입력 시도
    // 2. 없으면 '다른 아이디로 로그인' 클릭 이후 다시 아이디 및 비번 입력 재시도
    const idInput = await (async () => {
        try {
            return await waitVisible(driver, `//XCUIElementTypeTextField[@name="아이디 입력"]`, 3000);
        } catch {
            await safeClick(driver, `//XCUIElementTypeButton[@name="다른 아이디로 로그인"]`);
            return await waitVisible(driver, `//XCUIElementTypeTextField[@name="아이디 입력"]`, 5000);
        }
    })();

    await idInput.click();
    await idInput.addValue(`pleasep@naver.com`);
    await driver.pause(1000);

    const pwInput = await waitVisible(driver, `//XCUIElementTypeSecureTextField[@name="비밀번호 입력"]`, 10000);
    await pwInput.click();
    await pwInput.addValue(`!test1234`);

    await safeClick(driver, `//XCUIElementTypeButton[@name="로그인"]`);
    await driver.pause(5000);
    if (await isVisible(driver, `//XCUIElementTypeStaticText[@name="T 월드/T 다이렉트샵/T 멤버십"]`)) {
        await safeClick(driver, `//XCUIElementTypeStaticText[@name="시작하기"]`);
    }
    expect(await waitVisible(driver, aiAssert, 5000)).toBeTruthy();
    await safeClick(driver, aiClose);
    await driver.pause(3000);
});

test(`Native iOS 058: 로그인 상태에서 AI Layer 접속`, async ({ driver }) => {
    await safeClick(driver, aiBtn);
    await driver.pause(5000);
    expect(await waitVisible(driver, aiAssert, 5000)).toBeTruthy();

    await safeClick(driver, aiClose);
    await driver.pause(1000);
});



test(`Native iOS 062: TWD / TDS 각 메인에서 AI Layer 진입`, async ({ driver, }) => {
    await safeClick(driver, `//XCUIElementTypeOther[@name="홈 탭"]`);
    await safeClick(driver, aiBtn);
    await driver.pause(7000);
    
    const twdAssert = await waitVisible(driver, aiAssert, 5000);
    const twdValue = String((await twdAssert.getAttribute(`value`)) ?? '').trim();
    console.log(`[Test:062] 채널값확인(TWD): ${twdValue}`);
    expect(twdValue).toBe('전체');

    await safeClick(driver, aiClose);
    await driver.pause(3000);

    await safeClick(driver, `//XCUIElementTypeOther[@name="T 다이렉트샵 탭"]`);
    await safeClick(driver, aiBtn);
    await driver.pause(7000);
    
    const tdsAssert = await waitVisible(driver, aiAssert, 5000);
    const tdsValue = String((await tdsAssert.getAttribute(`value`)) ?? '').trim();
    console.log(`[Test:062] 채널값확인(TDS): ${tdsValue}`);
    expect(tdsValue).toBe('T 다이렉트샵');

    await safeClick(driver, aiClose);
    await driver.pause(1000);
});

test(`Native iOS 063: 한영 전환하며 바텀 구성 및 버튼확인`, async ({ driver }) => {
    await safeClick(driver, `//XCUIElementTypeOther[@name="메뉴 탭"]`);
    await driver.pause(1000);
    const ENG = `//XCUIElementTypeStaticText[@name="English!"]`;
    await safeClick(driver, ENG);
    expect(await waitVisible(driver, aiBtn, 5000)).toBeTruthy();

    await safeClick(driver, `//XCUIElementTypeOther[@name="MENU 탭"]`);
    await driver.pause(1000);
    const KOR = `(//XCUIElementTypeLink[@name="국문 사이트 이동"])[2]`;
    await safeClick(driver, KOR);
    expect(await waitVisible(driver, aiBtn, 5000)).toBeTruthy();
});

