import { test, expect } from "@appium/fixtures.aos";
import { isVisible, safeClick, waitVisible } from "@tests/_shared/actions/ui";
import { TWD, MENU_BTN, SSO_ID, aiBtn, defaultBeforeEach, logout } from "./aos-native-stg.shared";
import { swipeLeftAos } from "@tests/_shared/actions/scroll";

test.use({ appPackage: TWD });

test.beforeEach(async ({ driver }) => {
    await defaultBeforeEach(driver);
});
test(`Native AOS 059: Bottom navi. AI 추천 버튼 비로그인 상태 클릭`, async ({ driver }) => {
    await driver.pause(4000);
    // 비로그인 상태 확인 및 홈 복귀
    await safeClick(driver, MENU_BTN);
    const isLoggedIn = await isVisible(driver, logout);

    if (isLoggedIn) {
        await safeClick(driver, logout);
        await safeClick(driver, `//android.widget.TextView[@resource-id="Com.sktelecom.minit.ad.stg:id/submit"]`);
        await safeClick(driver, `//android.widget.TextView[@text="홈으로"]`);
    } else {
        // 이미 비로그인이면 홈으로 직접 이동
        await safeClick(driver, `//android.widget.TextView[@resource-id="Com.sktelecom.minit.ad.stg:id/buttonTextView" and @text="홈"]`);
    }

    // 홈 화면에서 AI 버튼 클릭
    await safeClick(driver, aiBtn);

    // ── SSO 로그인 진행  ──
    if (await isVisible(driver, `//android.app.AlertDialog[@resource-id="modalAlert1"]/android.view.View/android.view.View`)) {
        await safeClick(driver, `//android.widget.Button[@text="확인"]`);
    }
    await safeClick(driver, SSO_ID);

    await driver.pause(5000);

    // ── AI layer 진입 확인 ─────────────────────────────────────────
    if (await isVisible(driver, `//android.widget.TextView[@text="시작하기"]`)) {
        await safeClick(driver, `//android.widget.TextView[@text="시작하기"]`);
        if (await isVisible(driver, `//android.widget.TextView[@resource-id="com.android.permissioncontroller:id/permission_message"]`)) {
            await safeClick(driver, `//android.widget.Button[@resource-id="com.android.permissioncontroller:id/permission_allow_foreground_only_button"]`);
        }
        await driver.pause(8000);
        if (await isVisible(driver, `//android.widget.TextView[@content-desc="다양한 AI 추천들을 푸시 알림으로 받아 보세요!"]`)) {
            await safeClick(driver, `//android.widget.Button[@text="알림 받기"]`);
        }
        await waitVisible(driver, `//android.view.ViewGroup[@resource-id="Com.sktelecom.minit.ad.stg:id/main"]/android.webkit.WebView/android.webkit.WebView`);
        await safeClick(driver, `//android.view.ViewGroup[@resource-id="Com.sktelecom.minit.ad.stg:id/main"]/android.webkit.WebView/android.webkit.WebView`);
    } else if (await isVisible(driver, `//android.view.ViewGroup[@resource-id="Com.sktelecom.minit.ad.stg:id/main"]/android.webkit.WebView/android.webkit.WebView`)) {
        await driver.pause(7000);
        if (await isVisible(driver, `//android.widget.TextView[@content-desc="다양한 AI 추천들을 푸시 알림으로 받아 보세요!"]`)) {
            await safeClick(driver, `//android.widget.Button[@text="알림 받기"]`);
        }
        await safeClick(driver, `//android.view.ViewGroup[@resource-id="Com.sktelecom.minit.ad.stg:id/main"]/android.webkit.WebView/android.webkit.WebView`);
    }
    if (await isVisible(driver, `//android.widget.TextView[@content-desc="다양한 AI 추천들을 푸시 알림으로 받아 보세요!"]`)) {
        await safeClick(driver, `//android.widget.Button[@text="알림 받기"]`);
    }
    const target = `//android.widget.Spinner[@text="전체 AI 추천"]`;
    let ok = await isVisible(driver, target, 3000).catch(() => false);
    if (!ok) {
        await safeClick(driver, `//android.widget.Button[@text="다음 슬라이드로 이동"]`).catch(() => {});
        await swipeLeftAos(driver);
        await driver.pause(1000);
        ok = await isVisible(driver, target, 5000).catch(() => false);
    }
    expect(ok).toBe(true);
});

test(`Native AOS 060: Bottom navi. AI 추천 버튼 로그인 상태 클릭`, async ({ driver }) => {
    await driver.pause(4000);
    // 로그인 상태 확인 및 홈 복귀
    await safeClick(driver, MENU_BTN);
    const isLogIn = await isVisible(driver, logout);

    if (isLogIn) {
        // 이미 로그인이면 홈으로 직접 이동
        await safeClick(driver, `//android.widget.TextView[@resource-id="Com.sktelecom.minit.ad.stg:id/buttonTextView" and @text="홈"]`);
    } else {
        await safeClick(driver, `//android.view.View[@content-desc="로그인 해주세요 "]`);
        if (await isVisible(driver, `//android.app.AlertDialog[@resource-id="modalAlert1"]/android.view.View/android.view.View`)) {
            await safeClick(driver, `//android.widget.Button[@text="확인"]`);
        }
        await safeClick(driver, SSO_ID);
    }

    // AI 버튼 클릭
    await safeClick(driver, aiBtn);

    // ── AI layer 진입 확인 ─────────────────────────────────────────
    if (await isVisible(driver, `//android.view.View[@content-desc="시작하기"]`)) {
        await safeClick(driver, `//android.view.View[@content-desc="시작하기"]`);
        await safeClick(driver, `//android.view.ViewGroup[@resource-id="Com.sktelecom.minit.ad.stg:id/main"]/android.webkit.WebView/android.webkit.WebView`);
    }
    if (await isVisible(driver, `//android.view.ViewGroup[@resource-id="Com.sktelecom.minit.ad.stg:id/main"]/android.webkit.WebView/android.webkit.WebView`)) {
        await safeClick(driver, `//android.view.ViewGroup[@resource-id="Com.sktelecom.minit.ad.stg:id/main"]/android.webkit.WebView/android.webkit.WebView`);
    }
    const target = `//android.widget.Spinner[@text="전체 AI 추천"]`;
    let ok = await isVisible(driver, target, 3000).catch(() => false);
    if (!ok) {
        await safeClick(driver, `//android.widget.Button[@text="다음 슬라이드로 이동"]`).catch(() => {});
        await swipeLeftAos(driver);
        await driver.pause(1000);
        ok = await isVisible(driver, target, 5000).catch(() => false);
    }
    expect(ok).toBe(true);
});

test(`Native AOS 063: Bottom navi. AI 추천 버튼 준회원 로그인 상태 클릭`, async ({ driver }) => {
    await driver.pause(4000);
    await safeClick(driver, MENU_BTN);
    const isLoggedIn = await isVisible(driver, logout);

    if (isLoggedIn) {
        if (await isVisible(driver, `//android.widget.Button[@text="문지훈 님"]`)) {
            // 문지훈 계정 → 바로 홈으로 이동
            await safeClick(driver, `//android.widget.TextView[@resource-id="Com.sktelecom.minit.ad.stg:id/buttonTextView" and @text="홈"]`);
        } else {
            // 다른 계정 → 로그아웃 후 재로그인
            await safeClick(driver, logout);
            await safeClick(driver, `//android.widget.TextView[@resource-id="${TWD}:id/submit"]`);
            await safeClick(driver, `//android.widget.TextView[@text="홈으로"]`);
            await safeClick(driver, `//android.widget.TextView[@content-desc="로그인하기 버튼"]`);
            if (await isVisible(driver, `//android.app.AlertDialog[@resource-id="modalAlert1"]/android.view.View/android.view.View`)) {
                await safeClick(driver, `//android.widget.Button[@text="확인"]`);
            }
            await safeClick(driver, `//android.widget.Button[@text="다른 아이디로 로그인"]`);
            const idInput = await waitVisible(driver, `//android.widget.EditText[@resource-id="inputId"]`);
            await idInput.addValue(`01083081597`);
            const pwInput = await waitVisible(driver, `//android.widget.EditText[@resource-id="inputPassword"]`);
            await pwInput.addValue(`!test1234`);
            await safeClick(driver, `//android.widget.Button[@text="로그인"]`);
            await waitVisible(driver, MENU_BTN, 15000);
            await safeClick(driver, `//android.widget.TextView[@resource-id="Com.sktelecom.minit.ad.stg:id/buttonTextView" and @text="홈"]`);
        }
    } else {
        // 비로그인 → 로그인 처리
        await safeClick(driver, `//android.view.View[@content-desc="로그인 해주세요 "]`);
        if (await isVisible(driver, `//android.app.AlertDialog[@resource-id="modalAlert1"]/android.view.View/android.view.View`)) {
            await safeClick(driver, `//android.widget.Button[@text="확인"]`);
        }
        await safeClick(driver, `//android.widget.Button[@text="다른 아이디로 로그인"]`);
        const idInput = await waitVisible(driver, `//android.widget.EditText[@resource-id="inputId"]`);
        await idInput.addValue(`01083081597`);
        const pwInput = await waitVisible(driver, `//android.widget.EditText[@resource-id="inputPassword"]`);
        await pwInput.addValue(`!test1234`);
        await safeClick(driver, `//android.widget.Button[@text="로그인"]`);
        await waitVisible(driver, MENU_BTN, 15000);
    }

    // AI 추천 버튼 클릭
    await safeClick(driver, aiBtn);

    // 권장
    expect(await isVisible(driver, `//android.widget.Button[@text="회선 등록하기"]`)).toBe(true);
});

test(`Native AOS 064: 정회원 로그인 후 TWD/TDS 각 메인에서 바텀 navi AI 추천 버튼 선택`, async ({ driver }) => {
    await driver.pause(4000);
    await safeClick(driver, MENU_BTN);
    const isLoggedIn = await isVisible(driver, logout);
    if (isLoggedIn) {
        await safeClick(driver, logout);
        await safeClick(driver, `//android.widget.TextView[@resource-id="${TWD}:id/submit"]`);
        await safeClick(driver, `//android.widget.TextView[@text="홈으로"]`);
    }
    await safeClick(driver, aiBtn);
    if (await isVisible(driver, `//android.app.AlertDialog[@resource-id="modalAlert1"]/android.view.View/android.view.View`)) {
        await safeClick(driver, `//android.widget.Button[@text="확인"]`);
    }
    await safeClick(driver, SSO_ID);
    await driver.pause(5000);
    if (await isVisible(driver, `//android.view.View[@content-desc="시작하기"]`)) {
        await safeClick(driver, `//android.view.View[@content-desc="시작하기"]`);
        await driver.pause(3000);
        await safeClick(driver, `//android.view.ViewGroup[@resource-id="${TWD}:id/main"]/android.webkit.WebView/android.webkit.WebView`);
    }

    const targetTwd = `//android.widget.Spinner[@text="전체 AI 추천"]`;
    let ok = await isVisible(driver, targetTwd, 3000).catch(() => false);
    if (!ok) {
        await safeClick(driver, `//android.widget.Button[@text="다음 슬라이드로 이동"]`).catch(() => {});
        await swipeLeftAos(driver);
        await driver.pause(1000);
        ok = await isVisible(driver, targetTwd, 5000).catch(() => false);
    }
    expect(ok).toBe(true);
    await safeClick(driver, `//android.widget.Button[@content-desc="서비스 종료"]`);
    await safeClick(driver, `//android.widget.TextView[@resource-id="Com.sktelecom.minit.ad.stg:id/buttonTextView" and @text="T 다이렉트샵"]`);
    await driver.pause(3000);
    if (await waitVisible(driver, `//android.view.View[@text="T direct shop"]`)) {
        await safeClick(driver, aiBtn);
    }
    await driver.pause(3000);
    const targetTds = `//android.widget.Spinner[@text="T 다이렉트샵"]`;
    ok = await isVisible(driver, targetTds, 3000).catch(() => false);
    if (!ok) {
        await safeClick(driver, `//android.widget.Button[@text="다음 슬라이드로 이동"]`).catch(() => {});
        await swipeLeftAos(driver);
        await driver.pause(1000);
        ok = await isVisible(driver, targetTds, 5000).catch(() => false);
    }
    expect(ok).toBe(true);
});

test(`Native AOS 065: 한 영 Tworld 전환하며 Bottom navi 구성 및 버튼 확인`, async ({ driver }) => {
    await driver.pause(4000);
    await safeClick(driver, MENU_BTN);
    await safeClick(driver, `//android.view.View[@content-desc="English!"]`);
    expect(await isVisible(driver, `//android.view.ViewGroup[@content-desc="My 버튼"]`)).toBe(true);
    expect(await isVisible(driver, `//android.widget.TextView[@resource-id="Com.sktelecom.minit.ad.stg:id/buttonTextView" and @text="HOME"]`)).toBe(true);
    expect(await isVisible(driver, `//android.widget.TextView[@resource-id="Com.sktelecom.minit.ad.stg:id/buttonTextView" and @text="MENU"]`)).toBe(true);
    await safeClick(driver, `//android.widget.TextView[@resource-id="Com.sktelecom.minit.ad.stg:id/buttonTextView" and @text="MENU"]`);
    await safeClick(driver, `//android.view.View[@content-desc="국문 사이트 이동"]/android.view.View/android.widget.TextView`);
    expect(await isVisible(driver, `//android.widget.TextView[@resource-id="Com.sktelecom.minit.ad.stg:id/buttonTextView" and @text="홈"]`)).toBe(true);
    expect(await isVisible(driver, `//android.widget.TextView[@resource-id="Com.sktelecom.minit.ad.stg:id/buttonTextView" and @text="T 다이렉트샵"]`)).toBe(true);
    expect(await isVisible(driver, aiBtn)).toBe(true);
});
