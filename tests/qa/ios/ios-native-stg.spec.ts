import { test, expect } from '@appium/fixtures.ios';
import { assertScrollable, tapCellWithScroll } from '@tests/_shared/actions/scroll';
import { getHorizontal, getVertical, isVisible, safeClick, waitVisible } from '@tests/_shared/actions/ui';
import { getAndSwitchToWebviewIos } from '@tests/_shared/actions/webview';
import { smartTap, swipeByPercent } from '@tests/_shared/gestures/ios';
import fs from 'node:fs';
import path from 'node:path';
import { action } from 'node_modules/webdriverio/build/commands/browser';
import { addValue, tap, waitForDisplayed } from 'node_modules/webdriverio/build/commands/element';
import { buttonValue } from 'webdriverio';

const TESTFLIGHT = `com.apple.TestFlight`;
const SETTINGS_BUNDLE_ID = `com.apple.Preferences`;
const TWD = 'com.sktelecom.miniTworld.ad.stg';
const logout = `//XCUIElementTypeStaticText[@name="로그아웃"]`;
const aiClose = `//XCUIElementTypeButton[@name="서비스 종료"]`;
const aiAssert = `//XCUIElementTypeOther[@name="메뉴선택"]`;
const aiBtn = `//XCUIElementTypeButton[@name="MY"]`;
const nudgeMessage = `//XCUIElementTypeApplication[@name="[STG] T world"]/XCUIElementTypeWindow[1]/XCUIElementTypeOther/XCUIElementTypeOther/XCUIElementTypeOther/XCUIElementTypeOther/XCUIElementTypeOther/XCUIElementTypeOther/XCUIElementTypeOther[3]/XCUIElementTypeOther[9]/XCUIElementTypeOther/XCUIElementTypeLink`;

async function waitUntilInstalledAndActivated(
    driver: WebdriverIO.Browser,
    bundleId: string,
    timeoutMs = 300000,
    pollMs = 3000
) {
    const endAt = Date.now() + timeoutMs;
    let lastState = 0;
    while (Date.now() < endAt) {
        const state = Number(await driver.execute('mobile: queryAppState', { bundleId }).catch(() => 0));
        lastState = state;

        const installedByCmd = await driver.isAppInstalled(bundleId).catch(() => undefined);
        const isInstalled = typeof installedByCmd === 'boolean' ? installedByCmd : state !== 0;

        if (isInstalled) {
            try {
                await driver.activateApp(bundleId);
                return true;
            } catch {
                // 설치 직후 launch 가능한 시점까지 대기 후 재시도
            }
        }
        await driver.pause(pollMs);
    }
    console.log(`[install-wait] timeout bundleId=${bundleId} lastState=${lastState}`);
    return false;
}

test.afterEach(async ({ driver }, testInfo) => {
    if (testInfo.status === testInfo.expectedStatus) return;

    const num = testInfo.title.match(/iOS\s+(\d+)/i)?.[1] ?? 'unknown';
    const d = new Date();
    const yy = String(d.getFullYear()).slice(-2);
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const mi = String(d.getMinutes()).padStart(2, '0');

    const time = `${yy}${mm}${dd}${hh}${mi}`;
    const dir = path.join(process.cwd(), `test-output`, `screenshot`)
    fs.mkdirSync(dir, {recursive: true});
    await driver.saveScreenshot(`test-output/screenshot/${num}_${time}.png`);

})


test.use({ bundleId: TWD });

test.beforeEach(async ({ driver }, testInfo) => {
    // 제외할 테스트
    const skip = [
        `iOS 010`, `iOS 011`, `iOS 012`, `iOS 014`, `iOS 016`, `iOS 018`, `iOS 078`, `iOS 080`

    ]
    if (skip.some((s) => testInfo.title.includes(s))) {
        return;
    } else {
        // 재시도 시 남아있는 시스템 alert 정리
        if (testInfo.retry > 0) {
            const retryAlertText = await driver.getAlertText().catch(() => '');
            if (retryAlertText) {
                await driver.acceptAlert().catch(() => {});
            }
        }

        // 앱 상태 초기화 - 재실행
        try {
            await driver.terminateApp(TWD);
        } catch {}
        await driver.activateApp(TWD);
    }
});

test(`Native iOS 005: 일반 로그인`, async ({ driver }) => {
    await safeClick(driver, `//XCUIElementTypeOther[@name="메뉴 탭"]`);
    const isLogIn = await driver.$(logout).isDisplayed().catch(() => false);
    console.log(`[Test:005] 로그인상태: ${isLogIn ? '로그인' : '비로그인'}`);

    // 로그인 상태라면 로그아웃 처리 후 로그인
    if (isLogIn) {
        await safeClick(driver, logout);
        await safeClick(driver, `//XCUIElementTypeStaticText[@name="예(Y)"]`);
        await safeClick(driver, `//XCUIElementTypeStaticText[@name="홈으로"]`);
        await safeClick(driver, `//XCUIElementTypeOther[@name="메뉴 탭"]`);
        await safeClick(driver, `//XCUIElementTypeStaticText[@name="로그인 해주세요"]`);
    // 이미 로그아웃 상태라면 바로 로그인
    } else if (!isLogIn) {
        await safeClick(driver, `//XCUIElementTypeStaticText[@name="로그인 해주세요"]`);
    }
    // 로그인 Alert
    await driver.pause(3000);
    let alertText = '';
    try {
        alertText = await driver.getAlertText();
    } catch {
        alertText = '';
    }
    console.log(`[Test:005] Alert 감지여부: ${Boolean(alertText)}`);

    if (alertText) {
        await driver.acceptAlert().catch(() => {});
    } else {
        await waitVisible(driver, `//XCUIElementTypeButton[@name="계속"]`, 5000);
        await driver.pause(2000);
        await safeClick(driver, `//XCUIElementTypeButton[@name="계속"]`);
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

});

test(`Native iOS 006: 자동 로그인`, async ({ driver }) => {
    await safeClick(driver, `//XCUIElementTypeOther[@name="메뉴 탭"]`);
    const isLogIn = await driver.$(logout).isDisplayed().catch(() => false);
    console.log(`[Test:006] 로그인상태: ${isLogIn ? '로그인' : '비로그인'}`);
    expect(isLogIn).toBe(true);
});

test(`Native iOS 007: 로그아웃`, async ({ driver }) => {
    await safeClick(driver, `//XCUIElementTypeOther[@name="메뉴 탭"]`);
    const isLogIn = await driver.$(logout).isDisplayed().catch(() => false);
    console.log(`[Test:006] 로그인상태: ${isLogIn ? '로그인' : '비로그인'}`);
    await safeClick(driver, logout);
    await safeClick(driver, `//XCUIElementTypeStaticText[@name="예(Y)"]`);
    await safeClick(driver, `//XCUIElementTypeStaticText[@name="홈으로"]`);
    await safeClick(driver, `//XCUIElementTypeOther[@name="메뉴 탭"]`);
    expect(await isVisible(driver, logout)).toBe(false);
});

test(`Native iOS 008: 회원가입`, async ({ driver }) => {
    await safeClick(driver, `//XCUIElementTypeStaticText[@name="회원가입"]`);
    await safeClick(driver, `//XCUIElementTypeButton[@name="가입하기"]`);
    await driver.acceptAlert().catch(() => {});
    await safeClick(driver, `//XCUIElementTypeOther[@name="필수 약관 모두 동의"]`);
    await safeClick(driver, `//XCUIElementTypeButton[@name="시작"]`);
    expect(await isVisible(driver, `//XCUIElementTypeTextField[@name="이름 입력"]`)).toBe(true);
});

test(`Native iOS 009: T ID 정보 확인`, async ({ driver }) => {
    await safeClick(driver, `//XCUIElementTypeOther[@name="메뉴 탭"]`);
    const isLogIn = await driver.$(logout).isDisplayed().catch(() => false);
    console.log(`[Test:005] 로그인상태: ${isLogIn ? '로그인' : '비로그인'}`);
    if (!isLogIn) {
        await safeClick(driver, `//XCUIElementTypeStaticText[@name="로그인 해주세요"]`);
        await driver.acceptAlert().catch(() => {});
        await safeClick(driver, `//XCUIElementTypeButton[@name="본인 확인된 T ID pleasep@naver.com 010-8832-0456 로 로그인"]`);
    }
    await safeClick(driver, `//XCUIElementTypeImage[@name="설정"]`);
    await safeClick(driver, `//XCUIElementTypeLink[@name="회원 정보 설정 더보기"]`);
    await safeClick(driver, `//XCUIElementTypeButton[contains(@name,"T ID 정보 관리")]`);
    expect(await waitVisible(driver, `//XCUIElementTypeStaticText[@name="백승필"]`)).toBeTruthy();
});


test.describe(`Native iOS 010: `, () => {
    test.use({ bundleId: TESTFLIGHT });

    test(`Native iOS 010: 접근 권한 - 앱 최초 실행`, async ({ driver }) => {
        // 앱이 설치되어있다면 삭제 후 재설치, 삭제되어있다면 그냥 설치
        const state = await driver.execute(`mobile: queryAppState`, { bundleId: TWD });
        if (state !== 0) {
            await driver.removeApp(TWD).catch(() => {});
        }
        await driver.activateApp(TESTFLIGHT);
        await safeClick(driver, `(//XCUIElementTypeButton[@name="설치"])[2]`);
        const ready = await waitUntilInstalledAndActivated(driver, TWD);
        if (!ready) throw new Error(`[Test:010] 설치 완료/실행 확인 실패`);
        await driver.acceptAlert().catch(() => {});
        await safeClick(driver, `(//XCUIElementTypeButton[@name="다음"])[2]`);
        await safeClick(driver, `(//XCUIElementTypeButton[@name="테스트 시작"])[2]`);
        expect(await isVisible(driver, `//XCUIElementTypeStaticText[@name="T world 접근 권한 안내"]`)).toBe(true);
    });
});


test.describe(`Native iOS 011 `, () => {
    test.use({ bundleId: TESTFLIGHT });

    test(`Native iOS 011: 알림 권한 - 앱 최초 실행`, async ({ driver }) => {
        // 앱이 설치되어있다면 삭제 후 재설치, 삭제되어있다면 그냥 설치
        const state = await driver.execute(`mobile: queryAppState`, { bundleId: TWD });
        if (state !== 0) {
            await driver.removeApp(TWD).catch(() => {});
        }
        await driver.activateApp(TESTFLIGHT);
        await safeClick(driver, `(//XCUIElementTypeButton[@name="설치"])[2]`);
        const ready = await waitUntilInstalledAndActivated(driver, TWD);
        if (!ready) throw new Error(`[Test:011] 설치 완료/실행 확인 실패`);
        expect(await isVisible(driver, `//XCUIElementTypeStaticText[@name="‘[STG] T world’에서 알림을 보내고자 합니다."]`)).toBe(true);
        await driver.acceptAlert().catch(() => {});
    });
});


test.describe(`Native iOS 012`, () => {
    test.use({ bundleId: TESTFLIGHT });

    test(`Native iOS 012: 연락처 권한 - 앱 최초 실행`, async ({ driver }) => {
        // 앱이 설치되어있다면 삭제 후 재설치, 삭제되어있다면 그냥 설치
        const state = await driver.execute(`mobile: queryAppState`, { bundleId: TWD });
        if (state !== 0) {
            await driver.removeApp(TWD).catch(() => {});
        }
        await driver.activateApp(TESTFLIGHT);
        await safeClick(driver, `(//XCUIElementTypeButton[@name="설치"])[2]`);
        const ready = await waitUntilInstalledAndActivated(driver, TWD);
        if (!ready) throw new Error(`[Test:012] 설치 완료/실행 확인 실패`);
        await driver.acceptAlert().catch(() => {});
        await safeClick(driver, `(//XCUIElementTypeButton[@name="다음"])[2]`);
        await safeClick(driver, `(//XCUIElementTypeButton[@name="테스트 시작"])[2]`);
        await safeClick(driver, `//XCUIElementTypeButton[@name="확인"]`);
        await safeClick(driver, `//XCUIElementTypeOther[@name="MY 탭"]`);
        await driver.acceptAlert().catch(() => {});
        await safeClick(driver, `//XCUIElementTypeButton[@name="본인 확인된 T ID pleasep@naver.com 010-8832-0456 로 로그인"]`);
        await driver.pause(3000);
        await swipeByPercent(
            driver,
            {xPct: 0.5, yPct: 0.70},
            {xPct: 0.5, yPct: 0.45},
        );
        await safeClick(driver, `//XCUIElementTypeStaticText[@name="나의 데이터/통화"]`);
        await safeClick(driver, `//XCUIElementTypeStaticText[@name="T 끼리 데이터 선물"]`);
        await safeClick(driver, `//XCUIElementTypeOther[@name="연락처"]`);
        expect(await isVisible(driver, `//XCUIElementTypeAlert[@name="‘[STG] T world’이(가) 사용자의 연락처에 접근하려고 합니다."]/XCUIElementTypeOther/XCUIElementTypeOther/XCUIElementTypeOther[2]/XCUIElementTypeScrollView[1]/XCUIElementTypeOther[1]`)).toBe(true);
        await driver.acceptAlert().catch(() => {});
    });
});

test.describe(`Native iOS 014`, () => {
    test.use({ bundleId: TESTFLIGHT });

    test(`Native iOS 014: 위치 권한 - 앱 최초 실행`, async ({ driver }) => {
        // 앱이 설치되어있다면 삭제 후 재설치, 삭제되어있다면 그냥 설치
        const state = await driver.execute(`mobile: queryAppState`, { bundleId: TWD });
        if (state !== 0) {
            await driver.removeApp(TWD).catch(() => {});
        }
        await driver.activateApp(TESTFLIGHT);
        await safeClick(driver, `(//XCUIElementTypeButton[@name="설치"])[2]`);
        const ready = await waitUntilInstalledAndActivated(driver, TWD);
        if (!ready) throw new Error(`[Test:014] 설치 완료/실행 확인 실패`);
        await driver.acceptAlert().catch(() => {});
        await safeClick(driver, `(//XCUIElementTypeButton[@name="다음"])[2]`);
        await safeClick(driver, `(//XCUIElementTypeButton[@name="테스트 시작"])[2]`);
        await safeClick(driver, `//XCUIElementTypeButton[@name="확인"]`);
        await safeClick(driver, `//XCUIElementTypeOther[@name="메뉴 탭"]`);
        await safeClick(driver, `//XCUIElementTypeLink[@name="매장 찾기 매장 찾기!"]`);
        if (await isVisible(driver, `//XCUIElementTypeStaticText[@name="외부 페이지로 연결되며, 데이터 무제한 요금제가 아닐 경우 데이터가 차감됩니다."]`)) {
            await safeClick(driver, `//XCUIElementTypeButton[@name="확인"]`);
        }
    })
})

test.describe(`Native iOS 016`, () => {
    test.use({ bundleId: TESTFLIGHT });
    test(`Native iOS 016: 접근 권한 팝업에서 [아니요] 선택`, async ({ driver }) => {
        // 앱이 설치되어있다면 삭제 후 재설치, 삭제되어있다면 그냥 설치
        const state = await driver.execute(`mobile: queryAppState`, { bundleId: TWD });
        if (state !== 0) {
            await driver.removeApp(TWD).catch(() => {});
        }
        
        await driver.activateApp(TESTFLIGHT);
        await safeClick(driver, `(//XCUIElementTypeButton[@name="설치"])[2]`);
        const ready = await waitUntilInstalledAndActivated(driver, TWD);
        if (!ready) throw new Error(`[Test:016] 설치 완료/실행 확인 실패`);
        await driver.acceptAlert().catch(() => {});
        await safeClick(driver, `(//XCUIElementTypeButton[@name="다음"])[2]`);
        await safeClick(driver, `(//XCUIElementTypeButton[@name="테스트 시작"])[2]`);
        await safeClick(driver, `//XCUIElementTypeButton[@name="확인"]`);
        await safeClick(driver, `//XCUIElementTypeOther[@name="MY 탭"]`);
        await driver.acceptAlert().catch(() => {});
        await safeClick(driver, `//XCUIElementTypeButton[@name="본인 확인된 T ID pleasep@naver.com 010-8832-0456 로 로그인"]`);
        await driver.pause(3000);
        await swipeByPercent(
            driver,
            {xPct: 0.5, yPct: 0.70},
            {xPct: 0.5, yPct: 0.45},
        );
        await safeClick(driver, `//XCUIElementTypeStaticText[@name="나의 데이터/통화"]`);
        await safeClick(driver, `//XCUIElementTypeStaticText[@name="T 끼리 데이터 선물"]`);
        await safeClick(driver, `//XCUIElementTypeOther[@name="연락처"]`);
        await waitVisible(driver, `//XCUIElementTypeAlert[@name="‘[STG] T world’이(가) 사용자의 연락처에 접근하려고 합니다."]/XCUIElementTypeOther/XCUIElementTypeOther/XCUIElementTypeOther[2]/XCUIElementTypeScrollView[1]/XCUIElementTypeOther[1]`);
        await driver.pause(2000);
        await safeClick(driver, `//XCUIElementTypeButton[@name="허용 안 함"]`);
        expect(await isVisible(driver, `//XCUIElementTypeStaticText[@name="연락처 사용 안내"]`)).toBe(true);
    })
})

test(`Native iOS 017: 권한 허용 안내에서 [설정] 클릭`, async ({ driver }) => {
    await safeClick(driver, `//XCUIElementTypeOther[@name="MY 탭"]`);
    await swipeByPercent(
        driver,
        {xPct: 0.5, yPct: 0.70},
        {xPct: 0.5, yPct: 0.45},
    );
    await safeClick(driver, `//XCUIElementTypeStaticText[@name="나의 데이터/통화"]`);
    await safeClick(driver, `//XCUIElementTypeStaticText[@name="T 끼리 데이터 선물"]`);
    await safeClick(driver, `//XCUIElementTypeOther[@name="연락처"]`);
    await waitVisible(driver, `//XCUIElementTypeStaticText[@name="연락처 사용 안내"]`);
    await safeClick(driver, `//XCUIElementTypeButton[@name="설정"]`);
    expect(await waitVisible(driver, `//XCUIElementTypeStaticText[@name="[STG] T world"]`)).toBeTruthy();
});

test.describe(`Native iOS 018`, () => {
    test.use({ bundleId: SETTINGS_BUNDLE_ID });
    test.beforeAll(async ({ driver }) => {
        await driver.terminateApp(SETTINGS_BUNDLE_ID);
        await driver.activateApp(SETTINGS_BUNDLE_ID);
    })
    test(`Native iOS 018: GPS OFF 상태로 [매장 찾기] 선택`, async ({ driver }) => {
        await tapCellWithScroll(driver, `//XCUIElementTypeStaticText[@name="개인정보 보호 및 보안"]`);
        await safeClick(driver, `//XCUIElementTypeStaticText[@name="위치 서비스"]`);
        const locationSwitch = await waitVisible(driver, `//XCUIElementTypeSwitch[@name="위치 서비스"]`);
        const switchValue = String(await locationSwitch.getAttribute(`value`) ?? '').trim().toLowerCase();
        if (switchValue === `1`) {
            await locationSwitch.click();
            await safeClick(driver, `//XCUIElementTypeButton[@name="끄기"]`);
        }
        await driver.terminateApp(TWD);
        await driver.activateApp(TWD);
        await driver.pause(3000);
        await swipeByPercent(
        driver,
        {xPct: 0.5, yPct: 0.75},
        {xPct: 0.5, yPct: 0.40},
        );
        await tapCellWithScroll(driver, `//XCUIElementTypeStaticText[@name="매장 찾기"]`);
        if (await isVisible(driver, `//XCUIElementTypeStaticText[@name="외부 페이지로 연결되며, 데이터 무제한 요금제가 아닐 경우 데이터가 차감됩니다."]`)) {
            await safeClick(driver, `//XCUIElementTypeButton[@name="확인"]`);
        }
        const msg1 = `//XCUIElementTypeStaticText[@name="위치 서비스 이용 안내"]`;
        const msg2 = `//XCUIElementTypeStaticText[@name="[STG] T world에서 사용자의 위치를 확인하도록 허용하려면 위치 서비스를 켜십시오."]`;
        const msg3 = `//XCUIElementTypeStaticText[@name="위치 서비스 권한 허용 안내"]`;
        const shown = (await isVisible(driver, msg1)) || (await isVisible(driver, msg2)) || (await isVisible(driver, msg3));
        expect(shown).toBe(true);
        if (await isVisible(driver, msg2)) {
            await safeClick(driver, `//XCUIElementTypeButton[@name="취소"]`);
        } else if (await isVisible(driver, msg3)) {
            await safeClick(driver, `(//XCUIElementTypeButton[@name="닫기"])[2]`);
        }
        
        // 후처리 (뒤의 테스트들이 권한 때문에 막히는 것을 방지하기 위해서)
        await driver.terminateApp(SETTINGS_BUNDLE_ID);
        await driver.activateApp(SETTINGS_BUNDLE_ID);
        await tapCellWithScroll(driver, `//XCUIElementTypeStaticText[@name="개인정보 보호 및 보안"]`);
        await safeClick(driver, `//XCUIElementTypeStaticText[@name="위치 서비스"]`);
        await waitVisible(driver, `//XCUIElementTypeSwitch[@name="위치 서비스"]`);
        if (switchValue !== '1') {
            await locationSwitch.click();
        }
    })
})

test(`Native iOS 036: 공유하기 1`, async ({ driver }) => {
    await safeClick(driver, `//XCUIElementTypeOther[@name="메뉴 탭"]`);
    await safeClick(driver, `//XCUIElementTypeButton[@name="상품서비스"]`);
    await safeClick(driver, `//XCUIElementTypeLink[@name="부가서비스"]`);
    await safeClick(driver, `//XCUIElementTypeButton[@name="공유"]`);
    expect(await waitVisible(driver, `//XCUIElementTypeOther[@name="부가서비스 | T world"]`)).toBeTruthy();
})

test(`Native iOS 037: 공유하기 2`, async ({ driver }) => {
    await safeClick(driver, `//XCUIElementTypeOther[@name="메뉴 탭"]`);
    await safeClick(driver, `//XCUIElementTypeButton[@name="MY" and @value="1"]`);
    await safeClick(driver, `//XCUIElementTypeStaticText[@name="나의 데이터/통화"]`);
    await tapCellWithScroll(driver, `//XCUIElementTypeLink[@name="데이터 조르기"]`);
    await safeClick(driver, `//XCUIElementTypeButton[@name="조르기 요청"]`);
    expect(await waitVisible(driver, `//XCUIElementTypeNavigationBar[@name="UIActivityContentView"]/XCUIElementTypeOther`)).toBeTruthy();
})

test(`Native iOS 044: 영문 디폴트 설정`, async ({ driver }) => {
    await safeClick(driver, `//XCUIElementTypeOther[@name="메뉴 탭"]`);
    await safeClick(driver, `//XCUIElementTypeStaticText[@name="English!"]`);
    await safeClick(driver, `//XCUIElementTypeOther[@name="MENU 탭"]`);
    await safeClick(driver, `(//XCUIElementTypeLink[@name="setting"])[3]`);
    const engSwitch1 = await waitVisible(driver, `//XCUIElementTypeSwitch[@name="Set English T world as Default"]`);
    const switchValue = String(await engSwitch1.getAttribute(`value`) ?? '').trim().toLowerCase();
    if (switchValue !== '1') {
        await engSwitch1.click();
    }
    await driver.terminateApp(TWD);
    await driver.activateApp(TWD);
    expect(await waitVisible(driver, `//XCUIElementTypeStaticText[@name="My Information"]`)).toBeTruthy();
    await safeClick(driver, `//XCUIElementTypeOther[@name="MENU 탭"]`);
    await safeClick(driver, `(//XCUIElementTypeLink[@name="setting"])[3]`);
    const engSwitch2 = await waitVisible(driver, `//XCUIElementTypeSwitch[@name="Set English T world as Default"]`);
    const nowValue = String(await engSwitch2.getAttribute('value') ?? '').trim().toLowerCase();
    if (nowValue === '1') {
        await engSwitch2.click();
    }
})

test(`Native iOS 045: 과금 팝업`, async ({ driver }) => {
    await safeClick(driver, `//XCUIElementTypeOther[@name="메뉴 탭"]`);
    await safeClick(driver, `//XCUIElementTypeButton[@name="상품서비스"]`);
    await swipeByPercent(
        driver,
        {xPct: 0.5, yPct: 0.73},
        {xPct: 0.5, yPct: 0.40},
    );
    await safeClick(driver, `//XCUIElementTypeStaticText[@name="T 우주"]`);
    if (await isVisible(driver, `//XCUIElementTypeButton[@name="닫기"]`)) {
        await safeClick(driver, `//XCUIElementTypeButton[@name="닫기"]`);
    }
})

test.describe(`Native iOS 078`, () => {
    test.use({bundleId: SETTINGS_BUNDLE_ID});
    test.beforeAll(async ({ driver }) => {
        await driver.terminateApp(SETTINGS_BUNDLE_ID);
        await driver.activateApp(SETTINGS_BUNDLE_ID);
    })
    test(`Native iOS 078: iOS 위치서비스 끄고 AI Layer 진입`, async ({ driver }) => {
        await tapCellWithScroll(driver, `//XCUIElementTypeStaticText[@name="개인정보 보호 및 보안"]`);
        await safeClick(driver, `//XCUIElementTypeStaticText[@name="위치 서비스"]`);
        const locationSwitch = await waitVisible(driver, `//XCUIElementTypeSwitch[@name="위치 서비스"]`);
        const switchValue = String(await locationSwitch.getAttribute(`value`) ?? '').trim().toLowerCase();
        await waitVisible(driver, `//XCUIElementTypeSwitch[@name="위치 서비스"]`);
        if (switchValue === '1') {
            await locationSwitch.click();
            await safeClick(driver, `//XCUIElementTypeButton[@name="끄기"]`);
        }
        await driver.terminateApp(TWD);
        await driver.activateApp(TWD);
        await smartTap(driver, aiBtn, {fallbackTapPct: {xPct: 0.5, yPct: 0.9}});
        const alertText = await driver.getAlertText().catch(() => {});
        if (alertText) {
            await driver.acceptAlert().catch(() => {});
            await safeClick(driver, `//XCUIElementTypeButton[@name="본인 확인된 T ID pleasep@naver.com 010-8832-0456 로 로그인"]`);
        }
        await driver.pause(5000);
        if (await isVisible(driver, `//XCUIElementTypeStaticText[@name="T 월드/T 다이렉트샵/T 멤버십"]`)) {
        await safeClick(driver, `//XCUIElementTypeStaticText[@name="시작하기"]`);
        }
        if (await isVisible(driver, `//XCUIElementTypeAlert[@name="‘[STG] T world’ 앱이 사용자의 위치를 사용하도록 허용하겠습니까?"]`)) {
            await driver.execute(`mobile: alert`, {
                action: 'accept',
                buttonLabel: '앱을 사용하는 동안 허용'
            });
            await driver.pause(3000);
        } else if (await isVisible(driver, `//XCUIElementTypeStaticText[@name="위치 서비스 이용 안내"]`)) {
            await safeClick(driver, `//XCUIElementTypeButton[@name="닫기"]`);
            await driver.pause(3000);
            await safeClick(driver, `//XCUIElementTypeStaticText[@name="다양한 추천들을 둘러보세요"]`);
        }
        expect(await isVisible(driver, aiAssert)).toBe(true);
        await driver.activateApp(SETTINGS_BUNDLE_ID);
        if (switchValue !== '1') {
            await locationSwitch.click();
        }
    })
})

test.describe(`Native iOS 080`, () => {
    test.use({bundleId: SETTINGS_BUNDLE_ID});
    test.beforeAll(async ({ driver }) => {
        await driver.terminateApp(SETTINGS_BUNDLE_ID);
        await driver.activateApp(SETTINGS_BUNDLE_ID);
    })
    test(`Native iOS 080: iOS 알림 허용 끄고 AI Layer 진입`, async ({ driver }) => {
        await tapCellWithScroll(driver, `//XCUIElementTypeStaticText[@name="알림"]`);
        await tapCellWithScroll(driver, `//XCUIElementTypeStaticText[@name="com.sktelecom.miniTworld.ad.stg"]`);
        const notificationSwitch = await waitVisible(driver, `//XCUIElementTypeSwitch[@name="알림 허용"]`);
        const switchValue = String(await notificationSwitch.getAttribute('value') ?? '').trim().toLowerCase();
        if (switchValue === '1') {
            await notificationSwitch.click();
        }
        await driver.terminateApp(TWD);
        await driver.activateApp(TWD);
        await smartTap(driver, aiBtn, {fallbackTapPct: {xPct: 0.5, yPct: 0.9}});
        await driver.pause(5000);
        if (await isVisible(driver, `//XCUIElementTypeStaticText[@name="‘[STG] T world’ 앱이 사용자의 위치를 사용하도록 허용하겠습니까?"]`)) {
            await driver.execute(`mobile: alert`, {
                action: `accept`,
                buttonLabel: `앱을 사용하는 동안 허용`,
            }).catch(async () => {
                await driver.acceptAlert().catch(() => {});
            })
        }
        
        let shown = await isVisible(driver, `//XCUIElementTypeStaticText[@name="기기 설정"]`);
        if (!shown) {
            await safeClick(driver, `//XCUIElementTypeLink[@name="보관함 열기 MY"]`);
            await safeClick(driver, `//XCUIElementTypeButton[@name="설정 열기"]`);
            await safeClick(driver, `//XCUIElementTypeStaticText[@name="AI 추천 서비스 알림 설정"]`);
            const aiSwitch = await waitVisible(driver, `//XCUIElementTypeSwitch[@name="AI 추천 서비스 알림 설정"]`);
            const switchValue = String(await aiSwitch.getAttribute('value') ?? '').trim().toLowerCase();
            if (switchValue === '1') {
                await aiSwitch.click();
            }
            await driver.terminateApp(TWD);
            await driver.activateApp(TWD);
            await smartTap(driver, aiBtn, {fallbackTapPct: {xPct: 0.5, yPct: 0.9}});
            await driver.pause(5000);
            expect(await isVisible(driver, `//XCUIElementTypeStaticText[@name="기기 설정"]`)).toBe(true);
            await safeClick(driver, `//XCUIElementTypeButton[@name="알림 받기"]`);
        } else {
            expect(await isVisible(driver, `//XCUIElementTypeStaticText[@name="기기 설정"]`)).toBe(true);
            await safeClick(driver, `//XCUIElementTypeButton[@name="알림 받기"]`);
        }
    })
})

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
        await smartTap(driver, aiBtn, {fallbackTapPct: {xPct: 0.5, yPct: 0.9}});
    // 이미 로그아웃 상태라면 바로 AI Layer 진입
    } else if (!isLogIn) {
        console.log(`[Test:057] MY진입경로: 바로진입`);
        await smartTap(driver, `(//XCUIElementTypeButton[@name="MY"])[2]`, {fallbackTapPct: {xPct: 0.5, yPct: 0.9}});
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
    await smartTap(driver, aiBtn, {fallbackTapPct: {xPct: 0.5, yPct: 0.9}});
    await driver.pause(5000);
    expect(await waitVisible(driver, aiAssert, 5000)).toBeTruthy();

    await safeClick(driver, aiClose);
    await driver.pause(1000);
});



test(`Native iOS 062: TWD / TDS 각 메인에서 AI Layer 진입`, async ({ driver, }) => {
    await safeClick(driver, `//XCUIElementTypeOther[@name="홈 탭"]`);
    await smartTap(driver, aiBtn, {fallbackTapPct: {xPct: 0.5, yPct: 0.9}});
    await driver.pause(7000);
    
    const twdAssert = await waitVisible(driver, aiAssert, 5000);
    const twdValue = String((await twdAssert.getAttribute(`value`)) ?? '').trim();
    console.log(`[Test:062] 채널값확인(TWD): ${twdValue}`);
    expect(twdValue).toBe('전체');

    await safeClick(driver, aiClose);
    await driver.pause(3000);

    await safeClick(driver, `//XCUIElementTypeOther[@name="T 다이렉트샵 탭"]`);
    await smartTap(driver, aiBtn, {fallbackTapPct: {xPct: 0.5, yPct: 0.9}});
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
    expect(await waitVisible(driver, `//XCUIElementTypeButton[@name="MY"]`, 5000)).toBeTruthy();

    await safeClick(driver, `//XCUIElementTypeOther[@name="MENU 탭"]`);
    await driver.pause(1000);
    const KOR = `(//XCUIElementTypeLink[@name="국문 사이트 이동"])[2]`;
    await safeClick(driver, KOR);
    expect(await waitVisible(driver, aiBtn, 5000)).toBeTruthy();
});

test(`Native iOS 064: 비로그인 상태에서 넛징 선택`, async ({ driver }) => {
    // 하단 메뉴 탭 진입
    await safeClick(driver, `//XCUIElementTypeOther[@name="메뉴 탭"]`);

    // 로그인 상태 판별
    const isLogIn = await driver.$(logout).isDisplayed().catch(() => false);
    console.log(`[Test:064] 로그인상태: ${isLogIn ? '로그인' : '비로그인'}`);

    // 로그인 상태라면 로그아웃 처리 후 AI Layer 진입
    if (isLogIn) {
        await safeClick(driver, logout);
        await safeClick(driver, `//XCUIElementTypeStaticText[@name="예(Y)"]`);
        await safeClick(driver, `//XCUIElementTypeStaticText[@name="홈으로"]`);
        await driver.pause(2000);
    // 이미 로그아웃 상태라면 바로 AI Layer 진입
    } else if (!isLogIn) {
        await safeClick(driver, `//XCUIElementTypeOther[@name="홈 탭"]`);
    }
    await safeClick(driver, `//XCUIElementTypeButton[@name="nudge"]`);

    // 웹뷰 전환
    await getAndSwitchToWebviewIos(driver);
    await waitVisible(driver, `//button[normalize-space(.)='nudge 초기화']`);

    const resetQueued = await driver.execute(() => {
        // 웹뷰 안에서 'nudge 초기화' 버튼을 찾는다.
        const btn = [...document.querySelectorAll('button')].find(
            (el) => (el.textContent || '').trim() === 'nudge 초기화'
        ) as HTMLElement | undefined;

        // btn.click()을 바로 실행하면 execute가 오래 붙잡혀 timeout 발생
        // 그래서 "지금 함수가 끝난 직후" 클릭하도록 예약
        // (setTimeout(..., 0) = 지연 없이 다음 순서에 클릭 실행)
        if (!btn) return false;
        window.setTimeout(() => btn.click(), 0);
        return true;
    });
    console.log(`[Test:064] 웹뷰초기화예약결과: ${resetQueued}`);
    await driver.pause(500);

    // 네이티브 전환
    await driver.switchContext('NATIVE_APP');
    console.log(`[Test:064] 컨텍스트전환결과: ${await driver.getContext().catch(() => '확인불가')}`);
    await safeClick(driver, `//XCUIElementTypeButton[@name="확인"]`);
    
    await driver.terminateApp(TWD);
    await driver.activateApp(TWD);
    
    await safeClick(driver, nudgeMessage);
    await driver.acceptAlert().catch(() => {});
    await safeClick(driver, `//XCUIElementTypeButton[@name="본인 확인된 T ID pleasep@naver.com 010-8832-0456 로 로그인"]`);
    await driver.pause(5000);
    expect(await isVisible(driver, aiAssert)).toBe(true);
})

test(`Native iOS 065: 로그인 상태에서 메시지 넛징 선택`, async ({ driver }) => {
    await safeClick(driver, `//XCUIElementTypeButton[@name="nudge"]`);

    // 웹뷰 전환
    await getAndSwitchToWebviewIos(driver);
    await waitVisible(driver, `//button[normalize-space(.)='nudge 초기화']`);

    const resetQueued = await driver.execute(() => {
        // 웹뷰 안에서 'nudge 초기화' 버튼을 찾는다.
        const btn = [...document.querySelectorAll('button')].find(
            (el) => (el.textContent || '').trim() === 'nudge 초기화'
        ) as HTMLElement | undefined;

        // btn.click()을 바로 실행하면 execute가 오래 붙잡혀 timeout 발생
        // 그래서 "지금 함수가 끝난 직후" 클릭하도록 예약
        // (setTimeout(..., 0) = 지연 없이 다음 순서에 클릭 실행)
        if (!btn) return false;
        window.setTimeout(() => btn.click(), 0);
        return true;
    });
    console.log(`[Test:065] 웹뷰초기화예약결과: ${resetQueued}`);
    await driver.pause(500);

    // 네이티브 전환
    await driver.switchContext('NATIVE_APP');
    console.log(`[Test:065] 컨텍스트전환결과: ${await driver.getContext().catch(() => '확인불가')}`);
    await safeClick(driver, `//XCUIElementTypeButton[@name="확인"]`);
    
    await driver.terminateApp(TWD);
    await driver.activateApp(TWD);

    await safeClick(driver, nudgeMessage);
    await driver.pause(5000);
    expect(await isVisible(driver, aiAssert)).toBe(true);
})

test(`Native iOS 069: 정회원 로그인 후 TWD/TDS 각 메인에서 넛징 선택`, async ({ driver }) => {
    await safeClick(driver, `//XCUIElementTypeButton[@name="nudge"]`);

    // 웹뷰 전환
    await getAndSwitchToWebviewIos(driver);
    await waitVisible(driver, `//button[normalize-space(.)='nudge 초기화']`);

    const resetQueued = await driver.execute(() => {
        // 웹뷰 안에서 'nudge 초기화' 버튼을 찾는다.
        const btn = [...document.querySelectorAll('button')].find(
            (el) => (el.textContent || '').trim() === 'nudge 초기화'
        ) as HTMLElement | undefined;

        // btn.click()을 바로 실행하면 execute가 오래 붙잡혀 timeout 발생
        // 그래서 "지금 함수가 끝난 직후" 클릭하도록 예약
        // (setTimeout(..., 0) = 지연 없이 다음 순서에 클릭 실행)
        if (!btn) return false;
        window.setTimeout(() => btn.click(), 0);
        return true;
    });
    console.log(`[Test:069] 웹뷰초기화예약결과: ${resetQueued}`);
    await driver.pause(500);

    // 네이티브 전환
    await driver.switchContext('NATIVE_APP');
    console.log(`[Test:069] 컨텍스트전환결과: ${await driver.getContext().catch(() => '확인불가')}`);
    await safeClick(driver, `//XCUIElementTypeButton[@name="확인"]`);

    // TWD 넛징 확인
    await driver.terminateApp(TWD);
    await driver.activateApp(TWD);

    await safeClick(driver, nudgeMessage);
    await driver.pause(5000);
    const twdAssert = await waitVisible(driver, aiAssert, 5000);
    const twdValue = String((await twdAssert.getAttribute(`value`)) ?? '').trim();
    expect(twdValue).toBe('전체');

    await safeClick(driver, aiClose);
    await driver.pause(1000);    
    
    // TDS 넛징 확인
    await safeClick(driver, `//XCUIElementTypeOther[@name="T 다이렉트샵 탭"]`);
    await safeClick(driver, nudgeMessage);
    await driver.pause(5000);
    const tdsAssert = await waitVisible(driver, aiAssert, 5000);
    const tdsValue = String((await tdsAssert.getAttribute(`value`)) ?? '').trim();
    expect(tdsValue).toBe('T 다이렉트샵');
});

test(`Native iOS 070: 넛징 노출 후 x영역 터치`, async ({ driver }) => {
    await safeClick(driver, `//XCUIElementTypeButton[@name="nudge"]`);

    // 웹뷰 전환
    await getAndSwitchToWebviewIos(driver);
    await waitVisible(driver, `//button[normalize-space(.)='nudge 초기화']`);

    const resetQueued = await driver.execute(() => {
        // 웹뷰 안에서 'nudge 초기화' 버튼을 찾는다.
        const btn = [...document.querySelectorAll('button')].find(
            (el) => (el.textContent || '').trim() === 'nudge 초기화'
        ) as HTMLElement | undefined;

        // btn.click()을 바로 실행하면 execute가 오래 붙잡혀 timeout 발생
        // 그래서 "지금 함수가 끝난 직후" 클릭하도록 예약
        // (setTimeout(..., 0) = 지연 없이 다음 순서에 클릭 실행)
        if (!btn) return false;
        window.setTimeout(() => btn.click(), 0);
        return true;
    });
    console.log(`[Test:070] 웹뷰초기화 예약 결과: ${resetQueued}`);
    await driver.pause(500);

    // 네이티브 전환
    await driver.switchContext('NATIVE_APP');
    console.log(`[Test:070] 컨텍스트 전환 결과: ${await driver.getContext().catch(() => '확인불가')}`);
    await safeClick(driver, `//XCUIElementTypeButton[@name="확인"]`);

    await driver.terminateApp(TWD);
    await driver.activateApp(TWD);
    await driver.pause(1000);

    // 넛징 메세지 x 클릭
    await safeClick(driver, `(//XCUIElementTypeButton[@name="닫기"])[2]`);
    // 넛징 메세지 미노출 확인
    const visible = await driver.$(nudgeMessage).isDisplayed().catch(() => false);
    const ctx78 = await driver.getContext().catch(() => '확인불가');
    console.log(`[Test:070] 넛징 노출여부: ${visible}, 컨텍스트: ${ctx78}`);
    expect(visible).toBe(false);
});

test(`Native iOS 071: 같은 계정으로 앱 재실행`, async ({ driver }) => {
    // TWD 넛징 메세지 미노출 확인
    const visible = await driver.$(nudgeMessage).isDisplayed().catch(() => false);
    const ctx79 = await driver.getContext().catch(() => '확인불가');
    console.log(`[Test:071] 넛징 노출여부: ${visible}, 컨텍스트: ${ctx79}`);
    expect(visible).toBe(false);
});

test(`Native iOS 072: TWD / TDS 각 채널에 맞는 넛징 메세지 노출 확인`, async ({ driver }) => {
    const twdMsg = [
        '"AI 추천이 발견했어요! 내게 필요한 것 모아 보기"의 썸네일 이미지', '"T 월드·T 다이렉트샵·T 멤버십에서 AI가 필요한 정보만 모았어요"의 썸네일 이미지', 
        '"혹시 변경해야 할 정보는 없는지 AI T 서비스로 체크해 볼까요?"의 썸네일 이미지', '"고객센터에 문의했던 내용 AI T 서비스가 해결해 드려요"의 썸네일 이미지', 
        '"구매부터 요금제 관리, 혜택까지 AI가 나의 T 서비스를 밀착 관리"의 썸네일 이미지', '"T 서비스 1000% 활용 방법! 나에게 맞는 정보만 모아 드려요"의 썸네일 이미지', 
        '"시간 절약을 위한 맞춤 솔루션 AI가 필요한 기능을 찾아왔어요"의 썸네일 이미지', '"꼭 필요한 순간에 맞춤 제안 시간·상황에 맞춰 알려 드려요"의 썸네일 이미지', 
        '"T의 멈추지 않는 추천 매일이 새로워지는 탐색 시작!"의 썸네일 이미지',
    ];
    const tdsMsg = [
        '"헌 집 줄게 새집 다오! 쓰던 폰 보상받고 새 폰 주문하기!"의 썸네일 이미지',
    ];

    await safeClick(driver, `//XCUIElementTypeButton[@name="nudge"]`);

    // 웹뷰 전환
    await getAndSwitchToWebviewIos(driver);
    await waitVisible(driver, `//button[normalize-space(.)='nudge 초기화']`);

    const resetQueued = await driver.execute(() => {
        // 웹뷰 안에서 'nudge 초기화' 버튼을 찾는다.
        const btn = [...document.querySelectorAll('button')].find(
            (el) => (el.textContent || '').trim() === 'nudge 초기화'
        ) as HTMLElement | undefined;

        // btn.click()을 바로 실행하면 execute가 오래 붙잡혀 timeout 발생
        // 그래서 "지금 함수가 끝난 직후" 클릭하도록 예약
        // (setTimeout(..., 0) = 지연 없이 다음 순서에 클릭 실행)
        if (!btn) return false;
        window.setTimeout(() => btn.click(), 0);
        return true;
    });
    console.log(`[Test:072] 웹뷰초기화 예약 결과: ${resetQueued}`);
    await driver.pause(500);

    // 네이티브 전환
    await driver.switchContext('NATIVE_APP');
    console.log(`[Test:072] 컨텍스트 전환 결과: ${await driver.getContext().catch(() => '확인불가')}`);
    await safeClick(driver, `//XCUIElementTypeButton[@name="확인"]`);

    await driver.terminateApp(TWD);
    await driver.activateApp(TWD);
    await driver.pause(1000);

    // 메인(TWD) 진입
    // twdMsg가 넛징 메세지의 name값을 포함하는지 검증
    const twdNudgeName = String((await (await waitVisible(driver, nudgeMessage, 5000)).getAttribute(`name`)) ?? '').trim();
    expect(twdMsg).toContain(twdNudgeName);

    // TDS 진입
    // tdsMsg가 넛징 메세지의 name값을 포함하는지 검증
    await safeClick(driver, `//XCUIElementTypeOther[@name="T 다이렉트샵 탭"]`);
    const tdsNudgeName = String((await (await waitVisible(driver, nudgeMessage, 5000)).getAttribute(`name`)) ?? '').trim();
    expect(tdsMsg).toContain(tdsNudgeName);
})

test(`Native iOS 077: Type1 화면 진입 및 스크롤링, 닫힘 위치 확인`, async ({ driver }) => {
    await smartTap(driver, aiBtn, {fallbackTapPct: {xPct: 0.5, yPct: 0.9}});
    await driver.pause(5000);
    await safeClick(driver, `//XCUIElementTypeLink[@name="보관함 열기 MY"]`);
    
    // 스크롤 가능 여부
    const scrollable = await assertScrollable(driver, `//XCUIElementTypeStaticText[@name="즐겨찾기"]`);
    expect(scrollable.moved).toBe(true);

    // 뒤로가기의 위치가 왼쪽 상단인지 확인
    const locX = await getHorizontal(driver, `//XCUIElementTypeButton[@name="이전 페이지"]`);
    const locY = await getVertical(driver, `//XCUIElementTypeButton[@name="이전 페이지"]`);
    console.log(`x : ${locX} | y : ${locY}`);
    expect({ x: locX, y: locY}).toEqual({ x: 'left', y: 'top'});
})
