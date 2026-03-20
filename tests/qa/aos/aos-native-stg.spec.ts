import { test, expect } from '@appium/fixtures.aos';
import { getHorizontal, getVertical, isVisible, longPressByPercent, longPressBySelector, readText, safeClick, waitVisible } from '@tests/_shared/actions/ui';
import { getAndSwitchToWebview, getAndSwitchToWebviewAos } from '@tests/_shared/actions/webview';
import { execFileSync } from 'node:child_process';
import { ANDROID_UDID } from '@appium/aos/env.aos';
import { swipeUp, swipeUpAos, tapCellWithScrollAos } from '@tests/_shared/actions/scroll';
import { swipeByPercent } from '@tests/_shared/gestures/ios';
import { read } from 'node:fs';

const TWD = `Com.sktelecom.minit.ad.stg`;
const APP_TESTER = `dev.firebase.appdistribution`;
const logout = `//android.widget.TextView[@text="로그아웃"]`;
const aiBtn = `//android.view.ViewGroup[@resource-id="Com.sktelecom.minit.ad.stg:id/aiButtonArea"]`;
const nudge = `//android.widget.Button[@text="nudge"]`;
const nudgeBtn = `//button[normalize-space(.)='nudge 초기화']`;

test.use({ appPackage: TWD });

function adbShell(args: string[]) {
    const adbPath = process.env.ADB_PATH || 'adb';
    execFileSync(adbPath, ['-s', ANDROID_UDID, 'shell', ...args], { stdio: 'ignore' });
}

// 권한 1개를 "최초 실행 직전 상태"로 초기화
function resetPermission(permission: string, appPackage = TWD) {
    try {
        adbShell(['pm', 'revoke', appPackage, permission]);
    } catch {}
    for (const flag of ['user-set', 'user-fixed']) {
        try {
            adbShell(['pm', 'clear-permission-flags', appPackage, permission, flag]);
        } catch {}
    }
}

// 여러 권한 한번에 초기화
function resetPermissions(permissions: string[], appPackage = TWD) {
    for (const permission of permissions) resetPermission(permission, appPackage);
}

// 앱 데이터 전체 초기화(권한/로그인/캐시 포함)
function clearAppData(appPackage = TWD) {
    adbShell(['pm', 'clear', appPackage]);
}

// 사용 예시:
// resetPermission('android.permission.POST_NOTIFICATIONS');
// resetPermissions([
//   'android.permission.POST_NOTIFICATIONS',
//   'android.permission.ACCESS_FINE_LOCATION',
//   'android.permission.ACCESS_COARSE_LOCATION',
//   'android.permission.READ_CONTACTS',
// ]);
// clearAppData(); // 권한+로그인 상태까지 전부 초기화


test.beforeEach(async ({ driver }, testInfo) => {
    try {
        await driver.terminateApp(TWD);
    } catch {}
    await driver.activateApp(TWD);
    await driver.pause(2000);
});

test(`Native AOS 005: 로그인 안한 상태에서 로그인하기`, async ({ driver }) => {
    await safeClick(driver, `//android.widget.TextView[@resource-id="Com.sktelecom.minit.ad.stg:id/buttonTextView" and @text="메뉴"]`);
    const isLogIn = await driver.$(logout).isDisplayed().catch(() => false);

    if (isLogIn) {
        await safeClick(driver, logout);
        await safeClick(driver, `//android.widget.TextView[@resource-id="Com.sktelecom.minit.ad.stg:id/submit"]`);
        await safeClick(driver, `//android.widget.TextView[@text="홈으로"]`);
        await safeClick(driver, `//android.widget.TextView[@resource-id="Com.sktelecom.minit.ad.stg:id/buttonTextView" and @text="메뉴"]`);
        await safeClick(driver, `//android.view.View[@content-desc="로그인 해주세요 "]`);
    } else {
        await safeClick(driver, `//android.view.View[@content-desc="로그인 해주세요 "]`);
    }
    await driver.pause(2000);
    if (await isVisible(driver, `//android.widget.Button[@text="본인 확인된 T ID pleasep@naver.com 010-8832-0456 로 로그인"]`)) {
        await safeClick(driver, `//android.widget.Button[@text="다른 아이디로 로그인"]`);
    }
    const idInput = await waitVisible(driver, `//android.widget.EditText[@resource-id="inputId"]`);
    await idInput.addValue(`pleasep@naver.com`);
    const pwInput = await waitVisible(driver, `//android.widget.EditText[@resource-id="inputPassword"]`);
    await pwInput.addValue(`!test1234`);

    await safeClick(driver, `//android.widget.Button[@text="로그인"]`);
    
    await safeClick(driver, `//android.widget.TextView[@resource-id="Com.sktelecom.minit.ad.stg:id/buttonTextView" and @text="메뉴"]`);
    expect(await isVisible(driver, logout)).toBe(true);
})

test(`Native AOS 006: 로그인 상태에서 앱을 종료 후 재실행`, async ({ driver }) => {
    await safeClick(driver, `//android.widget.TextView[@resource-id="Com.sktelecom.minit.ad.stg:id/buttonTextView" and @text="메뉴"]`);
    expect(await isVisible(driver, logout)).toBe(true);
})

test(`Native AOS 008: 로그아웃 팝업`, async ({ driver }) => {
    await safeClick(driver, `//android.widget.TextView[@resource-id="Com.sktelecom.minit.ad.stg:id/buttonTextView" and @text="메뉴"]`);
    await safeClick(driver, logout);
    await safeClick(driver, `//android.widget.TextView[@resource-id="Com.sktelecom.minit.ad.stg:id/submit"]`);
    await safeClick(driver, `//android.widget.TextView[@text="홈으로"]`);
    await safeClick(driver, `//android.widget.TextView[@resource-id="Com.sktelecom.minit.ad.stg:id/buttonTextView" and @text="메뉴"]`);  
    expect(await isVisible(driver, logout)).toBe(false);
})

test(`Native AOS 010: T ID 정보 확인`, async ({ driver }) => {
    await safeClick(driver, `//android.widget.TextView[@content-desc="로그인하기 버튼"]`);
    await safeClick(driver, `//android.widget.Button[@text="본인 확인된 T ID pleasep@naver.com 010-8832-0456 로 로그인"]`);
    await driver.pause(3000);
    await safeClick(driver, `//android.widget.TextView[@resource-id="Com.sktelecom.minit.ad.stg:id/buttonTextView" and @text="메뉴"]`);
    await safeClick(driver, `//android.widget.Image[@content-desc="설정"]`);
    await safeClick(driver, `//android.view.View[@text="회원 정보 설정"]`);
    await safeClick(driver, `//android.widget.Button[@text="T ID 정보 관리 T ID 정보 관리는 아이디, 휴대폰번호, 이메일, 비밀번호, 주소 조회/변경이 가능합니다."]`);
    expect(await isVisible(driver, `//android.widget.TextView[@text="백승필"]`)).toBe(true);
})


test(`Native AOS 011: 앱 최초 실행 - 접근 권한 안내`, async ({ driver }) => {
    clearAppData(TWD);
    try {
        await driver.terminateApp(TWD);
    } catch {}
    await driver. activateApp(TWD);
    expect(await isVisible(driver, `//android.widget.TextView[@resource-id="Com.sktelecom.minit.ad.stg:id/titleText"]`)).toBe(true);
    await driver.pause(2000);
});

test(`Native AOS 012: 앱 최초 실행 - 전화 권한`, async ({ driver }) => {
    clearAppData(TWD);
    try {
        await driver.terminateApp(TWD);
    } catch {}
    await driver.activateApp(TWD);
    await waitVisible(driver, `//android.widget.TextView[@resource-id="Com.sktelecom.minit.ad.stg:id/titleText"]`);
    await safeClick(driver, `//android.widget.TextView[@resource-id="Com.sktelecom.minit.ad.stg:id/next"]`);
    const permissionMsg = await waitVisible(driver, `//android.widget.TextView[@resource-id="com.android.permissioncontroller:id/permission_message"]`);
    const msg = String((await permissionMsg.getText()) ?? '').trim();
    expect(msg).toContain(`전화`);
    await driver.pause(2000);
});

test(`Native AOS 013: 앱 최초 실행 - 알림 권한`, async ({ driver }) => {
    clearAppData(TWD);
    try {
        await driver.terminateApp(TWD);
    } catch {}
    await driver.activateApp(TWD);
    await safeClick(driver, `//android.widget.TextView[@resource-id="Com.sktelecom.minit.ad.stg:id/next"]`);
    await safeClick(driver, `//android.widget.Button[@resource-id="com.android.permissioncontroller:id/permission_allow_button"]`);
    const permissionMsg = await waitVisible(driver, `//android.widget.TextView[@resource-id="com.android.permissioncontroller:id/permission_message"]`);
    const msg = String((await permissionMsg.getText()) ?? '').trim();
    expect(msg).toContain(`알림`);
    await driver.pause(2000);
})

test(`Native AOS 014: 앱 최초 실행 - 주소록 권한`, async ({ driver }) => {
    clearAppData(TWD);
    try {
        await driver.terminateApp(TWD);
    } catch {}
    await driver.activateApp(TWD)
    await safeClick(driver, `//android.widget.TextView[@resource-id="Com.sktelecom.minit.ad.stg:id/next"]`);
    await safeClick(driver, `//android.widget.Button[@resource-id="com.android.permissioncontroller:id/permission_allow_button"]`);
    await driver.pause(1000);
    await safeClick(driver, `//android.widget.Button[@resource-id="com.android.permissioncontroller:id/permission_allow_button"]`);
    await driver.pause(3000);
    await safeClick(driver, `//android.widget.Button[@text="다시보지 않음"]`);
    await safeClick(driver, `//android.widget.TextView[@resource-id="Com.sktelecom.minit.ad.stg:id/buttonTextView" and @text="메뉴"]`);
    await safeClick(driver, `//android.widget.TextView[@text="T 끼리 데이터 선물"]`);
    await safeClick(driver, `//android.widget.Button[@text="본인 확인된 T ID pleasep@naver.com 010-8832-0456 로 로그인"]`);
    await driver.pause(3000);
    await safeClick(driver, `//android.widget.Button[@resource-id="fe-contact"]`);
    const msg = await readText(driver, `//android.widget.TextView[@resource-id="Com.sktelecom.minit.ad.stg:id/messageTxt"]`);
    expect(msg).toContain(`주소록`);
    await safeClick(driver, `//android.widget.TextView[@resource-id="Com.sktelecom.minit.ad.stg:id/submit"]`);
    await safeClick(driver, `//android.widget.Button[@resource-id="com.android.permissioncontroller:id/permission_allow_button"]`);
    await driver.pause(2000);
    await driver.back().catch(() => {});
})


test(`Native AOS 017: 위치 권한`, async ({ driver }) => {
    resetPermissions([
        'android.permission.ACCESS_FINE_LOCATION', 
        'android.permission.ACCESS_COARSE_LOCATION',
    ], TWD);
    await driver.terminateApp(TWD);
    await driver.activateApp(TWD);
    await driver.pause(3000);
    await safeClick(driver, `//android.widget.TextView[@resource-id="Com.sktelecom.minit.ad.stg:id/buttonTextView" and @text="메뉴"]`);
    await driver.pause(500);
    await safeClick(driver, `//android.widget.TextView[@text="매장 찾기!"]`);
    if (await isVisible(driver, `//android.widget.TextView[@text="외부 페이지로 연결되며, 데이터 무제한 요금제가 아닐 경우 데이터가 차감됩니다."]`)) {
        await safeClick(driver, `//android.widget.Button[@text="확인"]`);
    }
    const msg = await readText(driver, `//android.widget.TextView[@resource-id="Com.sktelecom.minit.ad.stg:id/messageTxt"]`);
    expect(msg).toContain(`위치`);
    await safeClick(driver, `//android.widget.TextView[@resource-id="Com.sktelecom.minit.ad.stg:id/submit"]`);
    await driver.pause(1000);
    await safeClick(driver, `//android.widget.Button[@resource-id="com.android.permissioncontroller:id/permission_allow_foreground_only_button"]`);
    await driver.pause(2000);
})


test(`Native AOS 018: 선택 접근 권한 [아니오] 선택`, async ({ driver }) => {
    resetPermissions([
        'android.permission.ACCESS_FINE_LOCATION', 
        'android.permission.ACCESS_COARSE_LOCATION',
    ], TWD);
    try { await driver.terminateApp(TWD); } catch {};
    await driver.activateApp(TWD);
    await driver.pause(4000);
    await safeClick(driver, `//android.widget.TextView[@resource-id="Com.sktelecom.minit.ad.stg:id/buttonTextView" and @text="메뉴"]`);
    await driver.pause(500);
    await safeClick(driver, `//android.widget.TextView[@text="매장 찾기!"]`);
    if (await isVisible(driver, `//android.widget.TextView[@text="외부 페이지로 연결되며, 데이터 무제한 요금제가 아닐 경우 데이터가 차감됩니다."]`)) {
        await safeClick(driver, `//android.widget.Button[@text="확인"]`);
    }
    if (await isVisible(driver, `//android.widget.TextView[@resource-id="Com.sktelecom.minit.ad.stg:id/messageTxt"]`)) {
        await safeClick(driver, `//android.widget.TextView[@resource-id="Com.sktelecom.minit.ad.stg:id/cancel"]`);
    }
    const msg = await readText(driver, `//android.widget.TextView[@resource-id="Com.sktelecom.minit.ad.stg:id/titleTxt"]`);
    expect(msg).toContain(`권한 허용 안내`);
})

test(`Native AOS 019: 권한 허용 안내에서 [설정] 선택`, async ({ driver }) => {
    await safeClick(driver, `//android.widget.TextView[@resource-id="Com.sktelecom.minit.ad.stg:id/buttonTextView" and @text="메뉴"]`);
    await driver.pause(500);
    await safeClick(driver, `//android.widget.TextView[@text="매장 찾기!"]`);
    if (await isVisible(driver, `//android.widget.TextView[@text="외부 페이지로 연결되며, 데이터 무제한 요금제가 아닐 경우 데이터가 차감됩니다."]`)) {
        await safeClick(driver, `//android.widget.Button[@text="확인"]`);
    }
    if (await isVisible(driver, `//android.widget.TextView[@resource-id="Com.sktelecom.minit.ad.stg:id/messageTxt"]`)) {
        await safeClick(driver, `//android.widget.TextView[@resource-id="Com.sktelecom.minit.ad.stg:id/cancel"]`);
    }
    await safeClick(driver, `//android.widget.TextView[@resource-id="Com.sktelecom.minit.ad.stg:id/submit"]`);
    await driver.pause(1000);
    const msg = await readText(driver, `//android.widget.TextView[@resource-id="com.android.settings:id/entity_header_title"]`);
    expect(msg).toContain(`[STG] T world`);
    await driver.pause(1000);
    // 마지막에 위치 권한 다시 허용
    adbShell(['pm', 'grant', TWD, 'android.permission.ACCESS_FINE_LOCATION']);
    adbShell(['pm', 'grant', TWD, 'android.permission.ACCESS_COARSE_LOCATION']);
    await driver.back().catch(() => {});
})

test(`Native AOS 020: GPS OFF 상태로 로그인 후 메인 하단 매장찾기 선택`, async ({ driver }) => {
    adbShell(['settings', 'put', 'secure', 'location_mode', '0']); // OFF
    await driver.pause(3000);
    await safeClick(driver, `//android.widget.TextView[@resource-id="Com.sktelecom.minit.ad.stg:id/buttonTextView" and @text="메뉴"]`);
    await driver.pause(1000);
    const isLogIn = await driver.$(logout).isDisplayed().catch(() => false);
    if (!isLogIn) {
        await safeClick(driver, `//android.view.View[@content-desc="로그인 해주세요 "]`);
        await safeClick(driver, `//android.widget.Button[@text="본인 확인된 T ID pleasep@naver.com 010-8832-0456 로 로그인"]`);
        await safeClick(driver, `//android.widget.TextView[@resource-id="Com.sktelecom.minit.ad.stg:id/buttonTextView" and @text="홈"]`);
    } else {
        await safeClick(driver, `//android.widget.TextView[@resource-id="Com.sktelecom.minit.ad.stg:id/buttonTextView" and @text="홈"]`);
    }
    await driver.pause(2000);
    await tapCellWithScrollAos(driver, `//android.widget.TextView[contains(@text,"매장 찾기")]`);
    if (await isVisible(driver, `//android.widget.TextView[@text="외부 페이지로 연결되며, 데이터 무제한 요금제가 아닐 경우 데이터가 차감됩니다."]`)) {
        await safeClick(driver, `//android.widget.Button[@text="확인"]`);
    }
    const msg = await readText(driver, `//android.widget.TextView[@resource-id="Com.sktelecom.minit.ad.stg:id/titleTxt"]`);
    expect(msg).toContain(`위치`);
    adbShell(['settings', 'put', 'secure', 'location_mode', '3']); // ON
})


test(`Native AOS 021: 위젯 추가`, async ({ driver }) => {
    await driver.execute(`mobile: pressKey`, {keycode: 3});
    await longPressByPercent(driver, {xPct: 0.1, yPct: 0.5});
    await safeClick(driver, `//android.widget.Button[@text="위젯"]`);
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
    await driver.pause(4000);
    expect(await isVisible(driver, `//android.widget.TextView[@text="T World"]`)).toBe(true);
})


test(`Native AOS 024: 위젯 노출 항목 변경`, async ({ driver }) => {
    await driver.execute(`mobile: pressKey`, {keycode: 3});
    await safeClick(driver, `//android.widget.ImageView[@resource-id="Com.sktelecom.minit.ad.stg:id/widgetSetting"]`);
    await safeClick(driver, `//android.widget.LinearLayout[@resource-id="Com.sktelecom.minit.ad.stg:id/moveToWidgetSetting"]`);
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
