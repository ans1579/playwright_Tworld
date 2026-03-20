import { test, expect } from '@appium/fixtures.aos';
import { execFileSync } from 'node:child_process';
import { ANDROID_UDID, APP_PACKAGE } from '@appium/aos/env.aos';
import { getAndSwitchToWebviewAos } from '@tests/_shared/actions/webview';


function adbShell(args: string[]) {
    const adbPath = process.env.ADB_PATH || 'adb';
    execFileSync(adbPath, ['-s', ANDROID_UDID, 'shell', ...args], { stdio: 'ignore' });
}

function resetNotificationPermission() {
    const permission = 'android.permission.POST_NOTIFICATIONS';

    // Appium mobile: shell(adb_shell) 의존 없이 로컬 adb로 권한만 초기화한다.
    // 앱 데이터는 유지되므로 로그인 상태는 그대로 유지된다.
    adbShell(['pm', 'revoke', APP_PACKAGE, permission]);

    // user-set / user-fixed 플래그가 남아 있으면 시스템이 팝업을 생략할 수 있어 함께 초기화.
    // 일부 디바이스/OS에서 미지원일 수 있으므로 실패해도 테스트는 계속 진행한다.
    for (const flag of ['user-set', 'user-fixed']) {
        try {
            adbShell(['pm', 'clear-permission-flags', APP_PACKAGE, permission, flag]);
        } catch {}
    }
}

test(`N95: AOS 알림 허용 끄고 AI Layer 최초 진입`, async ({ driver }) => {
    const basicTimeoutMs = 10_000;

    await test.step(`0. 알림 권한 초기화`, async () => {
        // 앱 재실행 전에 권한 상태를 먼저 리셋해야 "최초 진입" 조건을 안정적으로 재현할 수 있다.
        resetNotificationPermission();
    });

    await test.step(`1. 앱 재실행`, async () => {
        // 프로세스를 재기동해 방금 변경한 권한 상태를 앱 런타임에 반영한다.
        try {
            await driver.terminateApp(APP_PACKAGE);
        } catch {}
        await driver.activateApp(APP_PACKAGE);
        await driver.pause(3000);
    });

    await test.step(`2. AI Layer 버튼 클릭`, async () => {
        // AI Layer 진입 시점에서 알림 권한 안내/팝업이 노출되는 시나리오를 유도한다.
        const aiBtn = await driver.$(`//android.view.View[@resource-id="Com.sktelecom.minit.ad.stg:id/centerButton"]`);
        await aiBtn.click();
        await driver.pause(3000);
    });

    await test.step(`3. AI Layer 진입 - 웹뷰 전환`, async () => {
        const web = await getAndSwitchToWebviewAos(driver, basicTimeoutMs);
        await driver.pause(3000);
    })

    await test.step(`4. 알림 끄고 AI Layer 최조 진입 시 문구 확인`, async () => {
        // 권한 미허용 상태에서 기대 UI(기기 설정 안내 링크)가 보이는지 검증한다.
        const firstText = await driver.$(`//a[@area='layer_push' and normalize-space(.)='기기 설정']`);
        await firstText.waitForDisplayed({ timeout: basicTimeoutMs});

        expect(await firstText.isDisplayed()).toBeTruthy();
    });

    await test.step(`5. 네이티브 전환`, async () => {
        await driver.switchContext(`NATIVE_APP`);
        const ctx = await driver.getContext();
        console.log(`ctx :: ${ctx}`);
    })
});
