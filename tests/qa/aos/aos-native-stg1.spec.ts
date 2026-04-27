import { test, expect } from "@appium/fixtures.aos";
import { clickPass, isVisible, readText, safeClick, waitVisible } from "@tests/_shared/actions/ui";
import { swipeUpAos, tapCellWithScrollAos } from "@tests/_shared/actions/scroll";
import { TWD, logout, adbShell, clearAppData, defaultBeforeEach, getDriverUdid, resetPermissions } from "./aos-native-stg.shared";
import { adbText } from "@appium/adb.util";

test.use({ appPackage: TWD });

const PERMISSION_MESSAGE = `//*[contains(@resource-id,"permission_message")]`;
const PERMISSION_ALLOW = `//*[contains(@resource-id,"permission_allow_foreground_only_button") or contains(@resource-id,"permission_allow_button")]`;
const PERMISSION_DENY = `//*[contains(@resource-id,"permission_deny_button") or contains(@resource-id,"permission_deny_and_dont_ask_again_button")]`;

async function getAndroidSdkInt(driver: any): Promise<number> {
    const udid = getDriverUdid(driver);
    const raw = (adbText(udid, ["shell", "getprop", "ro.build.version.sdk"], 4000) ?? "").trim();
    const sdk = Number(raw);
    return Number.isFinite(sdk) ? sdk : 0;
}

async function clickIfVisible(driver: any, selector: string, timeout = 1500): Promise<boolean> {
    if (!(await isVisible(driver, selector, timeout))) return false;
    await safeClick(driver, selector);
    return true;
}

async function allowRuntimePermissionIfPresent(driver: any): Promise<boolean> {
    return clickIfVisible(driver, PERMISSION_ALLOW, 2500);
}

async function denyRuntimePermissionIfPresent(driver: any): Promise<boolean> {
    return clickIfVisible(driver, PERMISSION_DENY, 2500);
}

test.beforeEach(async ({ driver }, testInfo) => {
    const skip = [`AOS 011`, `AOS 012`, `AOS 013`, `AOS 014`, `AOS 017`, `AOS 018`];
    if (skip.some((s) => testInfo.title.includes(s))) {
        return;
    }
    await defaultBeforeEach(driver);
});
test(`Native AOS 005: 로그인 안한 상태에서 로그인하기`, async ({ driver }) => {
    await safeClick(driver, `//android.widget.TextView[@resource-id="Com.sktelecom.minit.ad.stg:id/buttonTextView" and @text="메뉴"]`);
    const isLogIn = await isVisible(driver, logout);

    if (isLogIn) {
        await safeClick(driver, logout);
        await safeClick(driver, `//android.widget.TextView[@resource-id="Com.sktelecom.minit.ad.stg:id/submit"]`);
        await safeClick(driver, `//android.widget.TextView[@text="홈으로"]`);
        await safeClick(driver, `//android.widget.TextView[@resource-id="Com.sktelecom.minit.ad.stg:id/buttonTextView" and @text="메뉴"]`);
        await safeClick(driver, `//android.view.View[@content-desc="로그인 해주세요 "]`);
        if (await isVisible(driver, `//android.app.AlertDialog[@resource-id="modalAlert1"]/android.view.View/android.view.View`)) {
            await safeClick(driver, `//android.widget.Button[@text="확인"]`);
        }
    } else {
        await safeClick(driver, `//android.view.View[@content-desc="로그인 해주세요 "]`);
        if (await isVisible(driver, `//android.app.AlertDialog[@resource-id="modalAlert1"]/android.view.View/android.view.View`)) {
            await safeClick(driver, `//android.widget.Button[@text="확인"]`);
        }
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
});

test(`Native AOS 006: 로그인 상태에서 앱을 종료 후 재실행`, async ({ driver }) => {
    await safeClick(driver, `//android.widget.TextView[@resource-id="Com.sktelecom.minit.ad.stg:id/buttonTextView" and @text="메뉴"]`);
    expect(await isVisible(driver, logout)).toBe(true);
});

test(`Native AOS 008: 로그아웃 팝업`, async ({ driver }) => {
    await safeClick(driver, `//android.widget.TextView[@resource-id="Com.sktelecom.minit.ad.stg:id/buttonTextView" and @text="메뉴"]`);
    await safeClick(driver, logout);
    await waitVisible(driver, `//android.widget.TextView[@resource-id="Com.sktelecom.minit.ad.stg:id/titleTxt"]`);
    const msg = await readText(driver, `//android.widget.TextView[@resource-id="Com.sktelecom.minit.ad.stg:id/titleTxt"]`);
    expect(msg).toContain(`로그아웃`);
    await safeClick(driver, `//android.widget.TextView[@resource-id="Com.sktelecom.minit.ad.stg:id/submit"]`);
    await safeClick(driver, `//android.widget.TextView[@text="홈으로"]`);
    await driver.pause(1000);
});

test(`Native AOS 009: 회원가입`, async ({ driver }) => {
    await driver.pause(3000);
    await safeClick(driver, `//android.widget.TextView[@content-desc="회원가입 버튼"]`);
    await safeClick(driver, `//android.widget.Button[@resource-id="signup"]`);
    await safeClick(driver, `//android.widget.CheckBox[@resource-id="select_agreeAll"]`);
    await driver.pause(1000);
    await safeClick(driver, `//android.widget.Button[@text="시작"]`);
    expect(await isVisible(driver, `//android.widget.TextView[@text="휴대폰 본인인증을 진행해 주세요"]`)).toBe(true);
    await safeClick(driver, `//android.widget.ImageButton[@content-desc="탭 닫기"]`);
});

test(`Native AOS 010: T ID 정보 확인`, async ({ driver }) => {
    await clickPass(driver, `//android.widget.TextView[@content-desc="로그인하기 버튼"]`);
    if (await isVisible(driver, `//android.app.AlertDialog[@resource-id="modalAlert1"]/android.view.View/android.view.View`)) {
        await safeClick(driver, `//android.widget.Button[@text="확인"]`);
    }
    await clickPass(driver, `//android.widget.Button[@text="본인 확인된 T ID pleasep@naver.com 010-8832-0456 로 로그인"]`);
    await driver.pause(3000);
    await safeClick(driver, `//android.widget.TextView[@resource-id="Com.sktelecom.minit.ad.stg:id/buttonTextView" and @text="메뉴"]`);
    await safeClick(driver, `//android.widget.Image[@content-desc="설정"]`);
    await safeClick(driver, `//android.view.View[@text="회원 정보 설정"]`);
    await safeClick(driver, `//android.widget.Button[@text="T ID 정보 관리 T ID 정보 관리는 아이디, 휴대폰번호, 이메일, 비밀번호, 주소 조회/변경이 가능합니다."]`);
    expect(await isVisible(driver, `//android.widget.TextView[@text="백승필"]`)).toBe(true);
});

test(`Native AOS 011: 앱 최초 실행 - 접근 권한 안내`, async ({ driver }) => {
    const udid = getDriverUdid(driver);
    clearAppData(TWD, udid);
    try {
        await driver.terminateApp(TWD);
    } catch {}
    await driver.activateApp(TWD);
    if (await isVisible(driver, `//android.widget.TextView[@resource-id="Com.sktelecom.minit.ad.stg:id/titleTxt"]`)) {
        await safeClick(driver, `//android.widget.TextView[@resource-id="Com.sktelecom.minit.ad.stg:id/cancel"]`);
    }
    if (await isVisible(driver, `//android.widget.Button[@text="다시보지 않음"]`)) {
        await safeClick(driver, `//android.widget.Button[@text="다시보지 않음"]`);
    }
    expect(await isVisible(driver, `//android.widget.TextView[@resource-id="Com.sktelecom.minit.ad.stg:id/titleText"]`)).toBe(true);
    await driver.pause(2000);
});

test(`Native AOS 012: 앱 최초 실행 - 전화 권한`, async ({ driver }) => {
    const udid = getDriverUdid(driver);
    clearAppData(TWD, udid);
    try {
        await driver.terminateApp(TWD);
    } catch {}
    await driver.activateApp(TWD);
    if (await isVisible(driver, `//android.widget.TextView[@resource-id="Com.sktelecom.minit.ad.stg:id/titleTxt"]`)) {
        await safeClick(driver, `//android.widget.TextView[@resource-id="Com.sktelecom.minit.ad.stg:id/cancel"]`);
    }
    if (await isVisible(driver, `//android.widget.Button[@text="다시보지 않음"]`)) {
        await safeClick(driver, `//android.widget.Button[@text="다시보지 않음"]`);
    }
    await waitVisible(driver, `//android.widget.TextView[@resource-id="Com.sktelecom.minit.ad.stg:id/titleText"]`);
    await safeClick(driver, `//android.widget.TextView[@resource-id="Com.sktelecom.minit.ad.stg:id/next"]`);
    const permissionMsg = await waitVisible(driver, `//android.widget.TextView[@resource-id="com.android.permissioncontroller:id/permission_message"]`);
    const msg = String((await permissionMsg.getText()) ?? "").trim();
    expect(msg).toContain(`전화`);
    await driver.pause(2000);
});

test(`Native AOS 013: 앱 최초 실행 - 알림 권한`, async ({ driver }) => {
    const udid = getDriverUdid(driver);
    const sdkInt = await getAndroidSdkInt(driver);
    clearAppData(TWD, udid);
    try {
        await driver.terminateApp(TWD);
    } catch {}
    await driver.activateApp(TWD);
    if (await isVisible(driver, `//android.widget.TextView[@resource-id="Com.sktelecom.minit.ad.stg:id/titleTxt"]`)) {
        await safeClick(driver, `//android.widget.TextView[@resource-id="Com.sktelecom.minit.ad.stg:id/cancel"]`);
    }
    
    await safeClick(driver, `//android.widget.TextView[@resource-id="Com.sktelecom.minit.ad.stg:id/next"]`);
    if (sdkInt >= 33) {
        const permissionMsg = await waitVisible(driver, PERMISSION_MESSAGE);
        const msg = String((await permissionMsg.getText()) ?? "").trim();
        expect(msg).toContain(`알림`);
        await allowRuntimePermissionIfPresent(driver);
    } else {
        // Android 12(API 32) 이하에서는 알림 런타임 권한 팝업이 없을 수 있다.
        await allowRuntimePermissionIfPresent(driver);
        console.log(`[AOS 013] SDK ${sdkInt}: 알림 시스템 팝업 미노출 허용`);
    }
    await driver.pause(2000);
    if (await isVisible(driver, `//android.widget.Button[@text="다시보지 않음"]`)) {
        await safeClick(driver, `//android.widget.Button[@text="다시보지 않음"]`);
    }
});

test(`Native AOS 014: 앱 최초 실행 - 주소록 권한`, async ({ driver }) => {
    const udid = getDriverUdid(driver);
    clearAppData(TWD, udid);
    try {
        await driver.terminateApp(TWD);
    } catch {}
    await driver.activateApp(TWD);
    if (await isVisible(driver, `//android.widget.TextView[@resource-id="Com.sktelecom.minit.ad.stg:id/titleTxt"]`)) {
        await safeClick(driver, `//android.widget.TextView[@resource-id="Com.sktelecom.minit.ad.stg:id/cancel"]`);
    }
    if (await isVisible(driver, `//android.widget.Button[@text="다시보지 않음"]`)) {
        await safeClick(driver, `//android.widget.Button[@text="다시보지 않음"]`);
    }
    await safeClick(driver, `//android.widget.TextView[@resource-id="Com.sktelecom.minit.ad.stg:id/next"]`);
    await allowRuntimePermissionIfPresent(driver);
    await driver.pause(1000);
    await allowRuntimePermissionIfPresent(driver);
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
    await allowRuntimePermissionIfPresent(driver);
    await driver.pause(2000);
    await driver.back().catch(() => {});
});

test(`Native AOS 017: 위치 권한`, async ({ driver }) => {
    const udid = getDriverUdid(driver);
    resetPermissions(["android.permission.ACCESS_FINE_LOCATION", "android.permission.ACCESS_COARSE_LOCATION"], TWD, udid);
    await driver.terminateApp(TWD);
    await driver.activateApp(TWD);
    if (await isVisible(driver, `//android.widget.TextView[@resource-id="Com.sktelecom.minit.ad.stg:id/titleTxt"]`)) {
        await safeClick(driver, `//android.widget.TextView[@resource-id="Com.sktelecom.minit.ad.stg:id/cancel"]`);
    }
    if (await isVisible(driver, `//android.widget.Button[@text="다시보지 않음"]`)) {
        await safeClick(driver, `//android.widget.Button[@text="다시보지 않음"]`);
    }
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
    await allowRuntimePermissionIfPresent(driver);
    await driver.pause(2000);
});

test(`Native AOS 018: 선택 접근 권한 [아니오] 선택`, async ({ driver }) => {
    const udid = getDriverUdid(driver);
    resetPermissions(["android.permission.ACCESS_FINE_LOCATION", "android.permission.ACCESS_COARSE_LOCATION"], TWD, udid);
    try {
        await driver.terminateApp(TWD);
    } catch {}
    await driver.activateApp(TWD);
    if (await isVisible(driver, `//android.widget.TextView[@resource-id="Com.sktelecom.minit.ad.stg:id/titleTxt"]`)) {
        await safeClick(driver, `//android.widget.TextView[@resource-id="Com.sktelecom.minit.ad.stg:id/cancel"]`);
    }
    await driver.pause(4000);
    await safeClick(driver, `//android.widget.TextView[@resource-id="Com.sktelecom.minit.ad.stg:id/buttonTextView" and @text="메뉴"]`);
    await driver.pause(500);
    await safeClick(driver, `//android.widget.TextView[@text="매장 찾기!"]`);
    if (await isVisible(driver, `//android.widget.TextView[@text="외부 페이지로 연결되며, 데이터 무제한 요금제가 아닐 경우 데이터가 차감됩니다."]`)) {
        await safeClick(driver, `//android.widget.Button[@text="확인"]`);
    }
    await denyRuntimePermissionIfPresent(driver);
    if (await isVisible(driver, `//android.widget.TextView[@resource-id="Com.sktelecom.minit.ad.stg:id/messageTxt"]`)) {
        await safeClick(driver, `//android.widget.TextView[@resource-id="Com.sktelecom.minit.ad.stg:id/cancel"]`);
    }
    const msg = await readText(driver, `//android.widget.TextView[@resource-id="Com.sktelecom.minit.ad.stg:id/titleTxt"]`);
    expect(msg.includes(`권한 허용 안내`) || msg.includes(`권한`)).toBe(true);
});

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
    const inSettings = await isVisible(driver, `//android.widget.TextView[contains(@text,"T world")]`, 5000);
    expect(inSettings).toBe(true);
    await driver.pause(1000);
    // 마지막에 위치 권한 다시 허용
    const udid = getDriverUdid(driver);
    adbShell(["pm", "grant", TWD, "android.permission.ACCESS_FINE_LOCATION"], udid);
    adbShell(["pm", "grant", TWD, "android.permission.ACCESS_COARSE_LOCATION"], udid);
    await driver.back().catch(() => {});
});

test(`Native AOS 020: GPS OFF 상태로 로그인 후 메인 하단 매장찾기 선택`, async ({ driver }) => {
    const udid = getDriverUdid(driver);
    const sdkInt = await getAndroidSdkInt(driver);
    const locationTitle = `//android.widget.TextView[@resource-id="Com.sktelecom.minit.ad.stg:id/titleTxt"]`;
    const locationMessage = `//android.widget.TextView[@resource-id="Com.sktelecom.minit.ad.stg:id/messageTxt"]`;

    adbShell(["settings", "put", "secure", "location_mode", "0"], udid); // OFF
    try {
        await driver.pause(5000);
        if (await isVisible(driver, `//android.widget.TextView[@resource-id="com.google.android.gms:id/alertTitle"]`)) {
            await safeClick(driver, `//android.widget.Button[@resource-id="android:id/button2"]`);
        }
        await safeClick(driver, `//android.widget.TextView[@resource-id="Com.sktelecom.minit.ad.stg:id/buttonTextView" and @text="메뉴"]`);
        await driver.pause(1000);
        const isLogIn = await isVisible(driver, logout);
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

        let locationHint = "";
        if (await isVisible(driver, locationTitle, 2500)) {
            locationHint = await readText(driver, locationTitle);
        } else if (await isVisible(driver, locationMessage, 2500)) {
            locationHint = await readText(driver, locationMessage);
        }

        if (locationHint) {
            expect(locationHint).toContain(`위치`);
        } else if (sdkInt <= 32) {
            // 저버전 단말에서는 GPS OFF 상황에서도 위치 안내 팝업이 미노출될 수 있다.
            console.log(`[AOS 020] SDK ${sdkInt}: 위치 안내 팝업 미노출 허용`);
        } else {
            throw new Error(`[AOS 020] 위치 안내 팝업이 노출되지 않았습니다. SDK=${sdkInt}`);
        }
    } finally {
        adbShell(["settings", "put", "secure", "location_mode", "3"], udid); // ON
    }
});
