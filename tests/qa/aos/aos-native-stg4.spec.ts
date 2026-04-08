import { test, expect } from "@appium/fixtures.aos";
import { getHorizontal, getVertical, isVisible, readText, safeClick, waitVisible } from "@tests/_shared/actions/ui";
import { getAndSwitchToWebviewAos } from "@tests/_shared/actions/webview";
import { assertScrollable, swipeLeftAos } from "@tests/_shared/actions/scroll";
import { TWD, MENU_BTN, SSO_ID, adbShell, aiBtn, defaultBeforeEach, logout, nudge, nudgeBtn, resetPermission, resetPermissions } from "./aos-native-stg.shared";

test.use({ appPackage: TWD });

test.beforeEach(async ({ driver }) => {
    await defaultBeforeEach(driver);
});
test(`Native AOS 066: 비로그인 상태에서 메시지 넛징 선택`, async ({ driver }) => {
    await driver.pause(3000);
    await safeClick(driver, MENU_BTN);
    const isLoggedIn = await isVisible(driver, logout);
    if (isLoggedIn) {
        await safeClick(driver, logout);
        await safeClick(driver, `//android.widget.TextView[@resource-id="${TWD}:id/submit"]`);
        await safeClick(driver, `//android.widget.TextView[@text="홈으로"]`);
    } else {
        await safeClick(driver, `//android.widget.TextView[@resource-id="Com.sktelecom.minit.ad.stg:id/buttonTextView" and @text="홈"]`);
    }
    await safeClick(driver, nudge);
    await getAndSwitchToWebviewAos(driver);
    await safeClick(driver, nudgeBtn);
    await driver.switchContext(`NATIVE_APP`);
    await safeClick(driver, `//android.widget.Button[@resource-id="android:id/button1"]`);
    await safeClick(driver, `//android.widget.TextView[@resource-id="Com.sktelecom.minit.ad.stg:id/buttonTextView" and @text="홈"]`);
    await driver.pause(3000);
    if (await isVisible(driver, `//android.view.ViewGroup[@resource-id="Com.sktelecom.minit.ad.stg:id/nudgeMsgLayout"]`)) {
        await safeClick(driver, `//android.view.ViewGroup[@resource-id="Com.sktelecom.minit.ad.stg:id/nudgeMsgLayout"]`);
    }
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
    const target = `//android.widget.Spinner[@text="전체 AI 추천"]`;
    let ok = await isVisible(driver, target, 3000).catch(() => false);
    if (!ok) {
        await safeClick(driver, `//android.widget.Button[@text="다음 슬라이드로 이동"]`).catch(() => {});
        await swipeLeftAos(driver);
        await driver.pause(1000);
        ok = await isVisible(driver, target, 5000).catch(() => false);
    }
    expect(ok).toBe(true);
    const msg = await readText(driver, target);
    expect(msg).toContain(`전체 AI 추천`);
});

test(`Native AOS 067: 로그인 상태에서 메시지 넛징 선택`, async ({ driver }) => {
    await driver.pause(3000);
    await safeClick(driver, MENU_BTN);
    const isLoggedIn = await isVisible(driver, logout);
    if (!isLoggedIn) {
        await safeClick(driver, `//android.view.View[@content-desc="로그인 해주세요 "]`);
        if (await isVisible(driver, `//android.app.AlertDialog[@resource-id="modalAlert1"]/android.view.View/android.view.View`)) {
            await safeClick(driver, `//android.widget.Button[@text="확인"]`);
        }
        await safeClick(driver, SSO_ID);
        await safeClick(driver, `//android.widget.TextView[@resource-id="Com.sktelecom.minit.ad.stg:id/buttonTextView" and @text="홈"]`);
    } else {
        await safeClick(driver, `//android.widget.TextView[@resource-id="Com.sktelecom.minit.ad.stg:id/buttonTextView" and @text="홈"]`);
    }
    await safeClick(driver, nudge);
    await getAndSwitchToWebviewAos(driver);
    await safeClick(driver, nudgeBtn);
    await driver.switchContext(`NATIVE_APP`);
    await safeClick(driver, `//android.widget.Button[@resource-id="android:id/button1"]`);
    await safeClick(driver, `//android.widget.TextView[@resource-id="Com.sktelecom.minit.ad.stg:id/buttonTextView" and @text="홈"]`);
    await driver.pause(3000);
    if (await isVisible(driver, `//android.view.ViewGroup[@resource-id="Com.sktelecom.minit.ad.stg:id/nudgeMsgLayout"]`)) {
        await safeClick(driver, `//android.view.ViewGroup[@resource-id="Com.sktelecom.minit.ad.stg:id/nudgeMsgLayout"]`);
    }
    await driver.pause(5000);
    if (await isVisible(driver, `//android.view.View[@content-desc="시작하기"]`)) {
        await safeClick(driver, `//android.view.View[@content-desc="시작하기"]`);
        await driver.pause(3000);
        await safeClick(driver, `//android.view.ViewGroup[@resource-id="${TWD}:id/main"]/android.webkit.WebView/android.webkit.WebView`);
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
    const msg = await readText(driver, target);
    expect(msg).toContain(`전체 AI 추천`);
});

test(`Native AOS 070: 준회원 로그인 후 메시지 넛징 선택`, async ({ driver }) => {
    await driver.pause(3000);
    await safeClick(driver, MENU_BTN);
    const isLoggedIn = await isVisible(driver, logout);
    if (isLoggedIn) {
        if (await isVisible(driver, `//android.widget.Button[@text="문지훈 님"]`)) {
            await safeClick(driver, `//android.widget.TextView[@resource-id="Com.sktelecom.minit.ad.stg:id/buttonTextView" and @text="홈"]`);
        } else {
            await safeClick(driver, logout);
            await safeClick(driver, `//android.widget.TextView[@resource-id="${TWD}:id/submit"]`);
            await safeClick(driver, `//android.widget.TextView[@text="홈으로"]`);
            await safeClick(driver, `//android.widget.TextView[@content-desc="로그인하기 버튼"]`);
            if (await isVisible(driver, `//android.app.AlertDialog[@resource-id="modalAlert1"]/android.view.View/android.view.View`)) {
                await safeClick(driver, `//android.widget.Button[@text="확인"]`);
            }
            await safeClick(driver, `//android.widget.Button[@text="본인 확인된 T ID ansrlwn1579@gmail.com 010-8308-1597 로 로그인"]`);
        }
    } else {
        await safeClick(driver, `//android.view.View[@content-desc="로그인 해주세요 "]`);
        if (await isVisible(driver, `//android.app.AlertDialog[@resource-id="modalAlert1"]/android.view.View/android.view.View`)) {
            await safeClick(driver, `//android.widget.Button[@text="확인"]`);
        }
        await safeClick(driver, `//android.widget.Button[@text="본인 확인된 T ID ansrlwn1579@gmail.com 010-8308-1597 로 로그인"]`);
        await safeClick(driver, `//android.widget.TextView[@resource-id="Com.sktelecom.minit.ad.stg:id/buttonTextView" and @text="홈"]`);
    }
    await safeClick(driver, nudge);
    await getAndSwitchToWebviewAos(driver);
    await safeClick(driver, nudgeBtn);
    await driver.switchContext(`NATIVE_APP`);
    await safeClick(driver, `//android.widget.Button[@resource-id="android:id/button1"]`);
    await safeClick(driver, `//android.widget.TextView[@resource-id="Com.sktelecom.minit.ad.stg:id/buttonTextView" and @text="홈"]`);
    await driver.pause(3000);
    if (await isVisible(driver, `//android.view.ViewGroup[@resource-id="Com.sktelecom.minit.ad.stg:id/nudgeMsgLayout"]`)) {
        await safeClick(driver, `//android.view.ViewGroup[@resource-id="Com.sktelecom.minit.ad.stg:id/nudgeMsgLayout"]`);
    }
    await driver.pause(3000);
    expect(await isVisible(driver, `//android.widget.Button[@text="회선 등록하기"]`)).toBe(true);
});

test(`Native AOS 071: 정회원 로그인 후 각 메인에서 메시지 넛징 선택`, async ({ driver }) => {
    await driver.pause(3000);
    await safeClick(driver, MENU_BTN);
    const isLoggedIn = await isVisible(driver, logout);
    if (isLoggedIn) {
        if (await isVisible(driver, `//android.widget.Button[@text="아이폰열넷프맥"]`)) {
            await safeClick(driver, `//android.widget.TextView[@resource-id="Com.sktelecom.minit.ad.stg:id/buttonTextView" and @text="홈"]`);
        } else {
            await safeClick(driver, logout);
            await safeClick(driver, `//android.widget.TextView[@resource-id="${TWD}:id/submit"]`);
            await safeClick(driver, `//android.widget.TextView[@text="홈으로"]`);
            await safeClick(driver, `//android.widget.TextView[@content-desc="로그인하기 버튼"]`);
            if (await isVisible(driver, `//android.app.AlertDialog[@resource-id="modalAlert1"]/android.view.View/android.view.View`)) {
                await safeClick(driver, `//android.widget.Button[@text="확인"]`);
            }
            await safeClick(driver, SSO_ID);
        }
    } else {
        await safeClick(driver, `//android.view.View[@content-desc="로그인 해주세요 "]`);
        if (await isVisible(driver, `//android.app.AlertDialog[@resource-id="modalAlert1"]/android.view.View/android.view.View`)) {
            await safeClick(driver, `//android.widget.Button[@text="확인"]`);
        }
        await safeClick(driver, SSO_ID);
        await safeClick(driver, `//android.widget.TextView[@resource-id="Com.sktelecom.minit.ad.stg:id/buttonTextView" and @text="홈"]`);
    }
    await safeClick(driver, nudge);
    await getAndSwitchToWebviewAos(driver);
    await safeClick(driver, nudgeBtn);
    await driver.switchContext(`NATIVE_APP`);
    await safeClick(driver, `//android.widget.Button[@resource-id="android:id/button1"]`);
    await safeClick(driver, `//android.widget.TextView[@resource-id="Com.sktelecom.minit.ad.stg:id/buttonTextView" and @text="홈"]`);
    await driver.pause(3000);
    if (await isVisible(driver, `//android.view.ViewGroup[@resource-id="Com.sktelecom.minit.ad.stg:id/nudgeMsgLayout"]`)) {
        await safeClick(driver, `//android.view.ViewGroup[@resource-id="Com.sktelecom.minit.ad.stg:id/nudgeMsgLayout"]`);
    }
    await driver.pause(6000);
    const targetTwd = `//android.widget.Spinner[@text="전체 AI 추천"]`;
    let ok = await isVisible(driver, targetTwd, 3000).catch(() => false);
    if (!ok) {
        await safeClick(driver, `//android.widget.Button[@text="다음 슬라이드로 이동"]`).catch(() => {});
        await swipeLeftAos(driver);
        await driver.pause(1000);
        ok = await isVisible(driver, targetTwd, 5000).catch(() => false);
    }
    expect(ok).toBe(true);
    const twdMsg = await readText(driver, targetTwd);
    expect(twdMsg).toContain(`전체 AI 추천`);
    await safeClick(driver, `//android.widget.Button[@content-desc="서비스 종료"]`);
    await safeClick(driver, `//android.widget.TextView[@resource-id="Com.sktelecom.minit.ad.stg:id/buttonTextView" and @text="T 다이렉트샵"]`);
    await driver.pause(3000);
    if (await isVisible(driver, `//android.view.ViewGroup[@resource-id="Com.sktelecom.minit.ad.stg:id/nudgeMsgLayout"]`)) {
        await safeClick(driver, `//android.view.ViewGroup[@resource-id="Com.sktelecom.minit.ad.stg:id/nudgeMsgLayout"]`);
    }
    await driver.pause(6000);
    const targetTds = `//android.widget.Spinner[@text="T 다이렉트샵"]`;
    ok = await isVisible(driver, targetTds, 3000).catch(() => false);
    if (!ok) {
        await safeClick(driver, `//android.widget.Button[@text="다음 슬라이드로 이동"]`).catch(() => {});
        await swipeLeftAos(driver);
        await driver.pause(1000);
        ok = await isVisible(driver, targetTds, 5000).catch(() => false);
    }
    expect(ok).toBe(true);
    const tdsMsg = await readText(driver, targetTds);
    expect(tdsMsg).toContain(`T 다이렉트샵`);
});

test(`Native AOS 072: 메시지 넛징 노출 후 x 영역 터치`, async ({ driver }) => {
    await driver.pause(3000);
    await safeClick(driver, nudge);
    await getAndSwitchToWebviewAos(driver);
    await safeClick(driver, nudgeBtn);
    await driver.switchContext(`NATIVE_APP`);
    await safeClick(driver, `//android.widget.Button[@resource-id="android:id/button1"]`);
    await safeClick(driver, `//android.widget.TextView[@resource-id="Com.sktelecom.minit.ad.stg:id/buttonTextView" and @text="홈"]`);
    await driver.pause(3000);
    if (await isVisible(driver, `//android.view.ViewGroup[@resource-id="Com.sktelecom.minit.ad.stg:id/nudgeMsgLayout"]`)) {
        await safeClick(driver, `//android.view.ViewGroup[@resource-id="Com.sktelecom.minit.ad.stg:id/nudgeMsgLayout"]/android.view.View`);
    }
    expect(await isVisible(driver, `//android.view.ViewGroup[@resource-id="Com.sktelecom.minit.ad.stg:id/nudgeMsgLayout"]`)).toBe(false);
});

test(`Native AOS 073: 앱 재실행 후 같은 계정으로 로그인`, async ({ driver }) => {
    await driver.pause(3000);
    expect(await isVisible(driver, `//android.view.ViewGroup[@resource-id="Com.sktelecom.minit.ad.stg:id/nudgeMsgLayout"]`)).toBe(false);
});

test(`Native AOS 074: 각 채널에 맞는 메시지 넛징 노출 확인`, async ({ driver }) => {
    const twdMsg = [
        '"AI 추천이 발견했어요! 내게 필요한 것 모아 보기"의 썸네일 이미지 링크',
        '"T 월드·T 다이렉트샵·T 멤버십에서 AI가 필요한 정보만 모았어요"의 썸네일 이미지 링크',
        '"혹시 변경해야 할 정보는 없는지 AI T 서비스로 체크해 볼까요?"의 썸네일 이미지 링크',
        '"고객센터에 문의했던 내용 AI T 서비스가 해결해 드려요"의 썸네일 이미지 링크',
        '"구매부터 요금제 관리, 혜택까지 AI가 나의 T 서비스를 밀착 관리"의 썸네일 이미지 링크',
        '"T 서비스 1000% 활용 방법! 나에게 맞는 정보만 모아 드려요"의 썸네일 이미지 링크',
        '"시간 절약을 위한 맞춤 솔루션 AI가 필요한 기능을 찾아왔어요"의 썸네일 이미지 링크',
        '"T의 멈추지 않는 추천 매일이 새로워지는 탐색 시작!"의 썸네일 이미지 링크',
        '"꼭 필요한 순간에 맞춤 제안 시간·상황에 맞춰 알려 드려요"의 썸네일 이미지 링크',
        '"이용할수록 더 정확해져요 어제보다 더 똑똑해진 추천 보기"의 썸네일 이미지 링크',
        '"T 아이디 로그인 후 AI 추천 받기! 지금 필요한 것만 골라 보세요"의 썸네일 이미지 링크',
        '"OTT 요금제가 궁금하셨다면? 추천 요금제를 확인해 보세요"의 썸네일 이미지 링크',
        '"워치·태블릿, 제대로 활용하려면? 전용 요금제를 추천드려요"의 썸네일 이미지 링크',
    ];
    const tdsMsg = ['"헌 집 줄게 새집 다오! 쓰던 폰 보상받고 새 폰 주문하기!"의 썸네일 이미지 링크'];
    const nudgeSelector = `//android.view.ViewGroup[@resource-id="Com.sktelecom.minit.ad.stg:id/nudgeMsgLayout"]`;
    const normalize = (s: string) => s.replace(/\s+/g, " ").trim();
    const matchesAny = (actual: string, candidates: string[]) => {
        const a = normalize(actual);
        return candidates.map(normalize).some((c) => a === c || a.includes(c) || c.includes(a));
    };
    const readNudgeDesc = async () => normalize(String((await (await waitVisible(driver, nudgeSelector)).getAttribute(`content-desc`)) ?? ""));

    await driver.pause(3000);
    await safeClick(driver, nudge);
    await getAndSwitchToWebviewAos(driver);
    await safeClick(driver, nudgeBtn);
    await driver.switchContext(`NATIVE_APP`);
    await safeClick(driver, `//android.widget.Button[@resource-id="android:id/button1"]`);
    await safeClick(driver, `//android.widget.TextView[@resource-id="Com.sktelecom.minit.ad.stg:id/buttonTextView" and @text="홈"]`);
    const twdNudgeName = await readNudgeDesc();
    expect(matchesAny(twdNudgeName, twdMsg)).toBe(true);
    await driver.pause(2000);

    await safeClick(driver, `//android.widget.TextView[@resource-id="Com.sktelecom.minit.ad.stg:id/buttonTextView" and @text="T 다이렉트샵"]`);
    await driver.waitUntil(
        async () => {
            const now = await readNudgeDesc();
            return now !== twdNudgeName && matchesAny(now, tdsMsg);
        },
        { timeout: 8000, interval: 300 },
    );
    const tdsNudgeName = await readNudgeDesc();
    expect(matchesAny(tdsNudgeName, tdsMsg)).toBe(true);
});

test(`Native AOS 075: AI Layer 진입`, async ({ driver }) => {
    await driver.pause(2000);
    await safeClick(driver, aiBtn);
    if (await isVisible(driver, `//android.widget.TextView[@text="T ID로 T world에 로그인해 보세요"]`)) {
        if (await isVisible(driver, `//android.app.AlertDialog[@resource-id="modalAlert1"]/android.view.View/android.view.View`)) {
            await safeClick(driver, `//android.widget.Button[@text="확인"]`);
        }
        await safeClick(driver, `//android.widget.Button[@text="본인 확인된 T ID pleasep@naver.com 010-8832-0456 로 로그인"]`);
    }
    await driver.pause(3000);
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

test(`Native AOS 076: AI Layer 종료`, async ({ driver }) => {
    await driver.pause(2000);
    await safeClick(driver, aiBtn);
    if (await isVisible(driver, `//android.widget.TextView[@text="T ID로 T world에 로그인해 보세요"]`)) {
        if (await isVisible(driver, `//android.app.AlertDialog[@resource-id="modalAlert1"]/android.view.View/android.view.View`)) {
            await safeClick(driver, `//android.widget.Button[@text="확인"]`);
        }
        await safeClick(driver, `//android.widget.Button[@text="본인 확인된 T ID pleasep@naver.com 010-8832-0456 로 로그인"]`);
    }
    await driver.pause(7000);
    if (await isVisible(driver, `//android.view.View[@content-desc="시작하기"]`)) {
        await safeClick(driver, `//android.view.View[@content-desc="시작하기"]`);
        await driver.pause(3000);
        await safeClick(driver, `//android.view.ViewGroup[@resource-id="${TWD}:id/main"]/android.webkit.WebView/android.webkit.WebView`);
    }
    await safeClick(driver, `//android.widget.Button[@content-desc="서비스 종료"]`);
    await driver.pause(3000);
    expect(await isVisible(driver, `//android.widget.Spinner[@text="전체 AI 추천"]`)).toBe(false);
});

test(`Native AOS 079: AI Layer 진입 후 Type1 화면 진입 및 스크롤링, 닫힘 확인`, async ({ driver }) => {
    await driver.pause(2000);
    await safeClick(driver, aiBtn);
    if (await isVisible(driver, `//android.widget.TextView[@text="T ID로 T world에 로그인해 보세요"]`)) {
        if (await isVisible(driver, `//android.app.AlertDialog[@resource-id="modalAlert1"]/android.view.View/android.view.View`)) {
            await safeClick(driver, `//android.widget.Button[@text="확인"]`);
        }
        await safeClick(driver, `//android.widget.Button[@text="본인 확인된 T ID pleasep@naver.com 010-8832-0456 로 로그인"]`);
    }
    await driver.pause(5000);
    if (await isVisible(driver, `//android.view.View[@content-desc="시작하기"]`)) {
        await safeClick(driver, `//android.view.View[@content-desc="시작하기"]`);
        await driver.pause(3000);
        await safeClick(driver, `//android.view.ViewGroup[@resource-id="${TWD}:id/main"]/android.webkit.WebView/android.webkit.WebView`);
    }
    await driver.pause(3000);
    await safeClick(driver, `//android.view.View[@content-desc="보관함 열기 MY"]`);

    const locX = await getHorizontal(driver, `//android.widget.Button[@content-desc="이전 페이지"]`);
    const locY = await getVertical(driver, `//android.widget.Button[@content-desc="이전 페이지"]`);
    console.log(`x : ${locX} | y : ${locY}`);
    expect({ x: locX, y: locY }).toEqual({ x: "left", y: "top" });

    const scrollable = await assertScrollable(driver, `//android.widget.TextView[@text="히스토리"]`);
    expect(scrollable.moved).toBe(true);
});

test(`Native AOS 080: AOS 위치 옵션 끄고 AI Layer 최초 진입`, async ({ driver }) => {
    resetPermissions(["android.permission.ACCESS_FINE_LOCATION", "android.permission.ACCESS_COARSE_LOCATION"], TWD);
    await driver.pause(2000);
    await safeClick(driver, aiBtn);
    if (await isVisible(driver, `//android.widget.TextView[@text="T ID로 T world에 로그인해 보세요"]`)) {
        if (await isVisible(driver, `//android.app.AlertDialog[@resource-id="modalAlert1"]/android.view.View/android.view.View`)) {
            await safeClick(driver, `//android.widget.Button[@text="확인"]`);
        }
        await safeClick(driver, `//android.widget.Button[@text="본인 확인된 T ID pleasep@naver.com 010-8832-0456 로 로그인"]`);
    }
    await driver.pause(5000);
    expect(await isVisible(driver, `//android.widget.TextView[@resource-id="com.android.permissioncontroller:id/permission_message"]`)).toBe(true);
    await safeClick(driver, `//android.widget.Button[@resource-id="com.android.permissioncontroller:id/permission_allow_foreground_only_button"]`);
    await driver.pause(3000);
    adbShell(["pm", "grant", TWD, "android.permission.ACCESS_FINE_LOCATION"]);
    adbShell(["pm", "grant", TWD, "android.permission.ACCESS_COARSE_LOCATION"]);
});

test(`Native AOS 082: AOS 앱 알림 허용 끄고 AI Layer 최초 진입`, async ({ driver }) => {
    resetPermission("android.permission.POST_NOTIFICATIONS", TWD);
    await driver.pause(2000);
    await safeClick(driver, aiBtn);
    if (await isVisible(driver, `//android.widget.TextView[@text="T ID로 T world에 로그인해 보세요"]`)) {
        if (await isVisible(driver, `//android.app.AlertDialog[@resource-id="modalAlert1"]/android.view.View/android.view.View`)) {
            await safeClick(driver, `//android.widget.Button[@text="확인"]`);
        }
        await safeClick(driver, `//android.widget.Button[@text="본인 확인된 T ID pleasep@naver.com 010-8832-0456 로 로그인"]`);
    }
    await driver.pause(5000);
    if (await isVisible(driver, `//android.view.View[@content-desc="시작하기"]`)) {
        await safeClick(driver, `//android.view.View[@content-desc="시작하기"]`);
        await safeClick(driver, `//android.view.ViewGroup[@resource-id="${TWD}:id/main"]/android.webkit.WebView/android.webkit.WebView`);
    }
    await safeClick(driver, `//android.view.View[@content-desc="보관함 열기 MY"]`);
    await safeClick(driver, `//android.widget.Button[@content-desc="설정 열기"]`);
    await safeClick(driver, `//android.view.View[@content-desc="AI 추천 서비스 알림 설정"]`);
    const notificationSwitch = await waitVisible(driver, `//android.widget.CheckBox[@content-desc="AI 추천 서비스 알림 설정"]`);
    await notificationSwitch.click().catch(() => {});
    await driver.terminateApp(TWD);
    await driver.activateApp(TWD);
    if (await isVisible(driver, `//android.widget.TextView[@resource-id="Com.sktelecom.minit.ad.stg:id/titleTxt"]`)) {
        await safeClick(driver, `//android.widget.TextView[@resource-id="Com.sktelecom.minit.ad.stg:id/cancel"]`);
    }
    await driver.pause(2000);
    await safeClick(driver, aiBtn);
    await driver.pause(6000);
    expect(await isVisible(driver, `//android.widget.TextView[@content-desc="다양한 AI 추천들을 푸시 알림으로 받아 보세요!"]`)).toBe(true);
    await safeClick(driver, `//android.widget.Button[@text="알림 받기"]`);
    adbShell(["pm", "grant", TWD, "android.permission.POST_NOTIFICATIONS"]);
    await driver.pause(1000);
});
