import { test, expect } from "@appium/fixtures.ios";
import { clickPass, isVisible, longPressBySelectorIos, safeClick, waitVisible } from "@tests/_shared/actions/ui";
import { tapCellWithScroll } from "@tests/_shared/actions/scroll";
import { SETTINGS_BUNDLE_ID, TWD, aiBtn, defaultBeforeEach, saveFailureScreenshot } from "./ios-native-stg.shared";

test.use({ bundleId: TWD });

test.afterEach(async ({ driver }, testInfo) => {
    await saveFailureScreenshot(driver, testInfo as any);
});

test.beforeEach(async ({ driver }, testInfo) => {
    await defaultBeforeEach(driver, testInfo as any, [`iOS 080`]);
});

test(`Native iOS 036: 공유하기 1`, async ({ driver }) => {
    await safeClick(driver, `//XCUIElementTypeOther[@name="메뉴 탭"]`);
    await safeClick(driver, `//XCUIElementTypeButton[@name="상품서비스"]`);
    await safeClick(driver, `//XCUIElementTypeLink[@name="부가서비스"]`);
    await safeClick(driver, `//XCUIElementTypeButton[@name="공유"]`);
    expect(await waitVisible(driver, `//XCUIElementTypeOther[@name="부가서비스 | T world"]`)).toBeTruthy();
});

test(`Native iOS 037: 공유하기 2`, async ({ driver }) => {
    await safeClick(driver, `//XCUIElementTypeOther[@name="메뉴 탭"]`);
    await safeClick(driver, `//XCUIElementTypeButton[@name="MY" and @value="1"]`);
    await safeClick(driver, `//XCUIElementTypeStaticText[@name="나의 데이터/통화"]`);
    await tapCellWithScroll(driver, `//XCUIElementTypeLink[@name="데이터 조르기"]`);
    await safeClick(driver, `//XCUIElementTypeButton[@name="조르기 요청"]`);
    expect(await waitVisible(driver, `//XCUIElementTypeNavigationBar[@name="UIActivityContentView"]/XCUIElementTypeOther`)).toBeTruthy();
});

test(`Native iOS 044: 영문 디폴트 설정`, async ({ driver }) => {
    await safeClick(driver, `//XCUIElementTypeOther[@name="메뉴 탭"]`);
    await safeClick(driver, `//XCUIElementTypeStaticText[@name="English!"]`);
    await safeClick(driver, `//XCUIElementTypeOther[@name="MENU 탭"]`);
    await safeClick(driver, `(//XCUIElementTypeLink[@name="setting"])[3]`);
    const engSwitch1 = await waitVisible(driver, `//XCUIElementTypeSwitch[@name="Set English T world as Default"]`);
    const switchValue = String((await engSwitch1.getAttribute(`value`)) ?? "")
        .trim()
        .toLowerCase();
    if (switchValue !== "1") {
        await engSwitch1.click();
    }
    await driver.terminateApp(TWD);
    await driver.activateApp(TWD);
    if (await isVisible(driver, `//XCUIElementTypeAlert[@name="App 업그레이드 안내"]/XCUIElementTypeOther/XCUIElementTypeOther/XCUIElementTypeOther[2]/XCUIElementTypeScrollView[1]/XCUIElementTypeOther[1]`)) {
        await safeClick(driver, `//XCUIElementTypeButton[@name="아니요"]`);
    }
    expect(await waitVisible(driver, `//XCUIElementTypeStaticText[@name="My Information"]`)).toBeTruthy();
    await safeClick(driver, `//XCUIElementTypeOther[@name="MENU 탭"]`);
    await safeClick(driver, `(//XCUIElementTypeLink[@name="setting"])[3]`);
    const engSwitch2 = await waitVisible(driver, `//XCUIElementTypeSwitch[@name="Set English T world as Default"]`);
    const nowValue = String((await engSwitch2.getAttribute("value")) ?? "")
        .trim()
        .toLowerCase();
    if (nowValue === "1") {
        await engSwitch2.click();
    }
});

// test(`Native iOS 045: 과금 팝업`, async ({ driver }) => {
//     await safeClick(driver, `//XCUIElementTypeOther[@name="메뉴 탭"]`);
//     await safeClick(driver, `//XCUIElementTypeButton[@name="상품서비스"]`);
//     await swipeByPercent(
//         driver,
//         {xPct: 0.5, yPct: 0.73},
//         {xPct: 0.5, yPct: 0.40},
//     );
//     await safeClick(driver, `//XCUIElementTypeStaticText[@name="T 우주"]`);
//     if (await isVisible(driver, `//XCUIElementTypeButton[@name="닫기"]`)) {
//         await safeClick(driver, `//XCUIElementTypeButton[@name="닫기"]`);
//     }
// })

// test.describe(`Native iOS 078`, () => {
//     test.use({bundleId: SETTINGS_BUNDLE_ID});
//     test.beforeAll(async ({ driver }) => {
//         await driver.terminateApp(SETTINGS_BUNDLE_ID);
//         await driver.activateApp(SETTINGS_BUNDLE_ID);
//     })
//     test(`Native iOS 078: iOS 위치서비스 끄고 AI Layer 진입`, async ({ driver }) => {
//         await tapCellWithScroll(driver, `//XCUIElementTypeStaticText[@name="개인정보 보호 및 보안"]`);
//         await safeClick(driver, `//XCUIElementTypeStaticText[@name="위치 서비스"]`);
//         const locationSwitch = await waitVisible(driver, `//XCUIElementTypeSwitch[@name="위치 서비스"]`);
//         const switchValue = String(await locationSwitch.getAttribute(`value`) ?? '').trim().toLowerCase();
//         await waitVisible(driver, `//XCUIElementTypeSwitch[@name="위치 서비스"]`);
//         if (switchValue === '1') {
//             await locationSwitch.click();
//             await safeClick(driver, `//XCUIElementTypeButton[@name="끄기"]`);
//         }
//         await driver.terminateApp(TWD);
//         await driver.activateApp(TWD);
//         await smartTap(driver, aiBtn, {fallbackTapPct: {xPct: 0.5, yPct: 0.9}});
//         const alertText = await driver.getAlertText().catch(() => {});
//         if (alertText) {
//             await driver.acceptAlert().catch(() => {});
//             await safeClick(driver, `//XCUIElementTypeButton[@name="본인 확인된 T ID pleasep@naver.com 010-8832-0456 로 로그인"]`);
//         }
//         await driver.pause(5000);
//         if (await isVisible(driver, `//XCUIElementTypeStaticText[@name="T 월드/T 다이렉트샵/T 멤버십"]`)) {
//         await safeClick(driver, `//XCUIElementTypeStaticText[@name="시작하기"]`);
//         }
//         if (await isVisible(driver, `//XCUIElementTypeAlert[@name="‘[STG] T world’ 앱이 사용자의 위치를 사용하도록 허용하겠습니까?"]`)) {
//             await driver.execute(`mobile: alert`, {
//                 action: 'accept',
//                 buttonLabel: '앱을 사용하는 동안 허용'
//             });
//             await driver.pause(3000);
//         } else if (await isVisible(driver, `//XCUIElementTypeStaticText[@name="위치 서비스 이용 안내"]`)) {
//             await safeClick(driver, `//XCUIElementTypeButton[@name="닫기"]`);
//             await driver.pause(3000);
//             await safeClick(driver, `//XCUIElementTypeStaticText[@name="다양한 추천들을 둘러보세요"]`);
//         }
//         expect(await isVisible(driver, aiAssert)).toBe(true);
//         await driver.activateApp(SETTINGS_BUNDLE_ID);
//         if (switchValue !== '1') {
//             await locationSwitch.click();
//         }
//     })
// })

test.describe(`Native iOS 080`, () => {
    test.use({ bundleId: SETTINGS_BUNDLE_ID });
    test.beforeAll(async ({ driver }) => {
        await driver.terminateApp(SETTINGS_BUNDLE_ID);
        await driver.activateApp(SETTINGS_BUNDLE_ID);
    });
    test(`Native iOS 080: iOS 알림 허용 끄고 AI Layer 진입`, async ({ driver }) => {
        await tapCellWithScroll(driver, `//XCUIElementTypeStaticText[@name="알림"]`);
        await tapCellWithScroll(driver, `//XCUIElementTypeStaticText[@name="com.sktelecom.miniTworld.ad.stg"]`);
        const notificationSwitch = await waitVisible(driver, `//XCUIElementTypeSwitch[@name="알림 허용"]`);
        const switchValue = String((await notificationSwitch.getAttribute("value")) ?? "")
            .trim()
            .toLowerCase();
        if (switchValue === "1") {
            await notificationSwitch.click();
        }
        await driver.terminateApp(TWD);
        await driver.activateApp(TWD);
        if (await isVisible(driver, `//XCUIElementTypeAlert[@name="App 업그레이드 안내"]/XCUIElementTypeOther/XCUIElementTypeOther/XCUIElementTypeOther[2]/XCUIElementTypeScrollView[1]/XCUIElementTypeOther[1]`)) {
            await safeClick(driver, `//XCUIElementTypeButton[@name="아니요"]`);
        }
        await safeClick(driver, aiBtn);
        await driver.pause(5000);
        if (await isVisible(driver, `//XCUIElementTypeStaticText[@name="시작하기"]`)) {
            await safeClick(driver, `//XCUIElementTypeStaticText[@name="시작하기"]`);
        }
        if (await isVisible(driver, `//XCUIElementTypeStaticText[@name="‘[STG] T world’ 앱이 사용자의 위치를 사용하도록 허용하겠습니까?"]`)) {
            await driver
                .execute(`mobile: alert`, {
                    action: `accept`,
                    buttonLabel: `앱을 사용하는 동안 허용`,
                })
                .catch(async () => {
                    await driver.pause(2000);
                    const text = await driver.getAlertText().catch(() => "");
                    if (text) {
                        await driver.acceptAlert().catch(() => {});
                    }
                });
        }
        if (await isVisible(driver, `//XCUIElementTypeStaticText[@name="AI가 제안"]`)) {
            await safeClick(driver, `//XCUIElementTypeApplication[@name="[STG] T world"]/XCUIElementTypeWindow[1]/XCUIElementTypeOther[2]/XCUIElementTypeOther/XCUIElementTypeOther/XCUIElementTypeOther/XCUIElementTypeOther/XCUIElementTypeWebView/XCUIElementTypeWebView/XCUIElementTypeWebView/XCUIElementTypeOther/XCUIElementTypeOther`);
        }
        let shown = await isVisible(driver, `//XCUIElementTypeStaticText[@name="기기 설정"]`);
        if (!shown) {
            await safeClick(driver, `//XCUIElementTypeLink[@name="보관함 열기 MY"]`);
            await clickPass(driver, `//XCUIElementTypeLink[@name="보관함 열기 MY"]`);
            await safeClick(driver, `//XCUIElementTypeButton[@name="설정 열기"]`);
            await safeClick(driver, `//XCUIElementTypeStaticText[@name="AI 추천 서비스 알림 설정"]`);
            const aiSwitch = await waitVisible(driver, `//XCUIElementTypeSwitch[@name="AI 추천 서비스 알림 설정"]`);
            const switchValue = String((await aiSwitch.getAttribute("value")) ?? "")
                .trim()
                .toLowerCase();
            if (switchValue === "1") {
                await aiSwitch.click();
            }
            await driver.terminateApp(TWD);
            await driver.activateApp(TWD);
            if (await isVisible(driver, `//XCUIElementTypeAlert[@name="App 업그레이드 안내"]/XCUIElementTypeOther/XCUIElementTypeOther/XCUIElementTypeOther[2]/XCUIElementTypeScrollView[1]/XCUIElementTypeOther[1]`)) {
                await safeClick(driver, `//XCUIElementTypeButton[@name="아니요"]`);
            }
            await safeClick(driver, aiBtn);
            await driver.pause(5000);
            await safeClick(driver, `//XCUIElementTypeApplication[@name="[STG] T world"]`).catch(() => {});
            expect(await isVisible(driver, `//XCUIElementTypeStaticText[@name="기기 설정"]`)).toBe(true);
            await safeClick(driver, `//XCUIElementTypeButton[@name="알림 받기"]`);
        } else {
            expect(await isVisible(driver, `//XCUIElementTypeStaticText[@name="기기 설정"]`)).toBe(true);
            await safeClick(driver, `//XCUIElementTypeButton[@name="알림 받기"]`);
        }
        await driver.pause(3000);
    });
});
