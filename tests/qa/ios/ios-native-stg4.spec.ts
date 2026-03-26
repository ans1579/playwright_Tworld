import { test, expect } from '@appium/fixtures.ios';
import { assertScrollable } from '@tests/_shared/actions/scroll';
import { getHorizontal, getVertical, isVisible, safeClick, waitVisible } from '@tests/_shared/actions/ui';
import { getAndSwitchToWebviewIos } from '@tests/_shared/actions/webview';
import {
  TWD,
  aiAssert,
  aiClose,
  aiBtn,
  defaultBeforeEach,
  logout,
  nudgeMessage,
  saveFailureScreenshot,
} from './ios-native-stg.shared';

test.use({ bundleId: TWD });

test.afterEach(async ({ driver }, testInfo) => {
  await saveFailureScreenshot(driver, testInfo as any);
});

test.beforeEach(async ({ driver }, testInfo) => {
  await defaultBeforeEach(driver, testInfo as any);
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
    if (await isVisible(driver ,`//XCUIElementTypeAlert[@name="App 업그레이드 안내"]/XCUIElementTypeOther/XCUIElementTypeOther/XCUIElementTypeOther[2]/XCUIElementTypeScrollView[1]/XCUIElementTypeOther[1]`)) {
        await safeClick(driver, `//XCUIElementTypeButton[@name="아니요"]`);
    }
    
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
    if (await isVisible(driver ,`//XCUIElementTypeAlert[@name="App 업그레이드 안내"]/XCUIElementTypeOther/XCUIElementTypeOther/XCUIElementTypeOther[2]/XCUIElementTypeScrollView[1]/XCUIElementTypeOther[1]`)) {
        await safeClick(driver, `//XCUIElementTypeButton[@name="아니요"]`);
    }

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
    if (await isVisible(driver ,`//XCUIElementTypeAlert[@name="App 업그레이드 안내"]/XCUIElementTypeOther/XCUIElementTypeOther/XCUIElementTypeOther[2]/XCUIElementTypeScrollView[1]/XCUIElementTypeOther[1]`)) {
        await safeClick(driver, `//XCUIElementTypeButton[@name="아니요"]`);
    }

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
    if (await isVisible(driver ,`//XCUIElementTypeAlert[@name="App 업그레이드 안내"]/XCUIElementTypeOther/XCUIElementTypeOther/XCUIElementTypeOther[2]/XCUIElementTypeScrollView[1]/XCUIElementTypeOther[1]`)) {
        await safeClick(driver, `//XCUIElementTypeButton[@name="아니요"]`);
    }
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
    if (await isVisible(driver ,`//XCUIElementTypeAlert[@name="App 업그레이드 안내"]/XCUIElementTypeOther/XCUIElementTypeOther/XCUIElementTypeOther[2]/XCUIElementTypeScrollView[1]/XCUIElementTypeOther[1]`)) {
        await safeClick(driver, `//XCUIElementTypeButton[@name="아니요"]`);
    }
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
    await safeClick(driver, aiBtn);
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
