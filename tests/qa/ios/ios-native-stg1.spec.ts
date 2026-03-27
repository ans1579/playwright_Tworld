import { test, expect } from '@appium/fixtures.ios';
import { isVisible, safeClick, waitVisible } from '@tests/_shared/actions/ui';
import { tapCellWithScroll } from '@tests/_shared/actions/scroll';
import { swipeByPercent } from '@tests/_shared/gestures/ios';
import {
  TESTFLIGHT,
  SETTINGS_BUNDLE_ID,
  TWD,
  defaultBeforeEach,
  logout,
  saveFailureScreenshot,
  waitUntilInstalledAndActivated,
} from './ios-native-stg.shared';

test.use({ bundleId: TWD });

test.afterEach(async ({ driver }, testInfo) => {
  await saveFailureScreenshot(driver, testInfo as any);
});

test.beforeEach(async ({ driver }, testInfo) => {
  await defaultBeforeEach(driver, testInfo as any, [
    `iOS 010`,
    `iOS 011`,
    `iOS 012`,
    `iOS 014`,
    `iOS 016`,
    `iOS 018`,
  ]);
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
    await idInput.setValue(`pleasep@naver.com`);
    await driver.pause(1000);

    const pwInput = await waitVisible(driver, `//XCUIElementTypeSecureTextField[@name="비밀번호 입력"]`, 10000);
    await pwInput.setValue(`!test1234`);
    await safeClick(driver, `//XCUIElementTypeButton[@name="로그인"]`);
    await driver.pause(3000);
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
        if (await isVisible(driver ,`//XCUIElementTypeAlert[@name="App 업그레이드 안내"]/XCUIElementTypeOther/XCUIElementTypeOther/XCUIElementTypeOther[2]/XCUIElementTypeScrollView[1]/XCUIElementTypeOther[1]`)) {
            await safeClick(driver, `//XCUIElementTypeButton[@name="아니요"]`);
        }
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
        if (await isVisible(driver ,`//XCUIElementTypeAlert[@name="App 업그레이드 안내"]/XCUIElementTypeOther/XCUIElementTypeOther/XCUIElementTypeOther[2]/XCUIElementTypeScrollView[1]/XCUIElementTypeOther[1]`)) {
            await safeClick(driver, `//XCUIElementTypeButton[@name="아니요"]`);
        }
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
        if (await isVisible(driver ,`//XCUIElementTypeAlert[@name="App 업그레이드 안내"]/XCUIElementTypeOther/XCUIElementTypeOther/XCUIElementTypeOther[2]/XCUIElementTypeScrollView[1]/XCUIElementTypeOther[1]`)) {
            await safeClick(driver, `//XCUIElementTypeButton[@name="아니요"]`);
        }
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
        if (await isVisible(driver ,`//XCUIElementTypeAlert[@name="App 업그레이드 안내"]/XCUIElementTypeOther/XCUIElementTypeOther/XCUIElementTypeOther[2]/XCUIElementTypeScrollView[1]/XCUIElementTypeOther[1]`)) {
            await safeClick(driver, `//XCUIElementTypeButton[@name="아니요"]`);
        }
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
        if (await isVisible(driver ,`//XCUIElementTypeAlert[@name="App 업그레이드 안내"]/XCUIElementTypeOther/XCUIElementTypeOther/XCUIElementTypeOther[2]/XCUIElementTypeScrollView[1]/XCUIElementTypeOther[1]`)) {
            await safeClick(driver, `//XCUIElementTypeButton[@name="아니요"]`);
        }
        await driver.pause(3000);
        await swipeByPercent(
        driver,
        {xPct: 0.5, yPct: 0.75},        {xPct: 0.5, yPct: 0.40},
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
