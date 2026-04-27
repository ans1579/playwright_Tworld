import type { Browser } from "webdriverio";
import { execFileSync } from "node:child_process";
import { isVisible, safeClick } from "@tests/_shared/actions/ui";
import { adbText, resolveAdbPath } from "@appium/adb.util";

export const TWD = `Com.sktelecom.minit.ad.stg`;
const CHROME_PACKAGE = `com.android.chrome`;
const SAMSUNG_BROWSER_PACKAGE = `com.sec.android.app.sbrowser`;
export const logout = `//android.widget.TextView[@text="로그아웃"]`;
export const aiBtn = `//android.view.ViewGroup[@resource-id="Com.sktelecom.minit.ad.stg:id/aiButtonArea"]`;
export const nudge = `//android.widget.Button[@text="nudge"]`;
export const nudgeBtn = `//button[normalize-space(.)='nudge 초기화']`;
export const SSO_ID = `//android.widget.Button[@text="본인 확인된 T ID pleasep@naver.com 010-8832-0456 로 로그인"]`;
export const MENU_BTN = `//android.widget.TextView[@resource-id="Com.sktelecom.minit.ad.stg:id/buttonTextView" and @text="메뉴"]`;

const INTRO_TITLE = `//android.widget.TextView[@resource-id="Com.sktelecom.minit.ad.stg:id/titleTxt"]`;
const INTRO_CANCEL = `//android.widget.TextView[@resource-id="Com.sktelecom.minit.ad.stg:id/cancel"]`;

export function getDriverUdid(driver: Browser): string {
    const udid = (driver as any)?.capabilities?.udid ?? (driver as any)?.capabilities?.['appium:udid'];
    if (!udid) {
        throw new Error(`driver capabilities에 udid가 없습니다.`);
    }
    return String(udid);
}

export function adbShell(args: string[], udid: string) {
    const adbPath = resolveAdbPath();
    execFileSync(adbPath, ["-s", udid, "shell", ...args], { stdio: "ignore" });
}

export function resetPermission(permission: string, appPackage = TWD, udid: string) {
    try {
        adbShell(["pm", "revoke", appPackage, permission], udid);
    } catch {}

    for (const flag of ["user-set", "user-fixed"]) {
        try {
            adbShell(["pm", "clear-permission-flags", appPackage, permission, flag], udid);
        } catch {}
    }
}

export function resetPermissions(permissions: string[], appPackage = TWD, udid: string) {
    for (const permission of permissions) {
        resetPermission(permission, appPackage, udid);
    }
}

export function clearAppData(appPackage = TWD, udid: string) {
    adbShell(["pm", "clear", appPackage], udid);
}

export function forceStopChrome(udid: string) {
    try {
        adbShell(["am", "force-stop", CHROME_PACKAGE], udid);
    } catch {}
}

export function forceStopSamsungBrowser(udid: string) {
    try {
        adbShell(["am", "force-stop", SAMSUNG_BROWSER_PACKAGE], udid);
    } catch {}
}

function isExternalBrowserFocused(udid: string): boolean {
    const displaysOut = adbText(udid, ["shell", "dumpsys", "window", "displays"], 5000) ?? "";
    const windowsOut = adbText(udid, ["shell", "dumpsys", "window", "windows"], 5000) ?? "";
    const focusDump = `${displaysOut}\n${windowsOut}`.toLowerCase();
    return focusDump.includes("com.sec.android.app.sbrowser") || focusDump.includes("com.android.chrome");
}

async function recoverFocusFromExternalBrowser(driver: Browser, udid: string) {
    if (!isExternalBrowserFocused(udid)) return;

    console.warn(`[focus] 외부 브라우저 포커스 감지 -> back + 앱 재활성화 시도`);
    await driver.back().catch(() => {});
    await driver.pause(600);
    await driver.activateApp(TWD);
    await driver.pause(1200);

    if (!isExternalBrowserFocused(udid)) return;
    console.warn(`[focus] 외부 브라우저 포커스 지속 -> 2차 복구(back + activateApp)`);
    await driver.back().catch(() => {});
    await driver.pause(600);
    await driver.activateApp(TWD);
    await driver.pause(1200);
}

export async function closeIntroIfPresent(driver: Browser) {
    const maxRestarts = 2;

    for (let attempt = 0; attempt <= maxRestarts; attempt++) {
        const introVisible = await isVisible(driver, INTRO_TITLE, 1800);
        if (!introVisible) return;

        const cancelVisible = await isVisible(driver, INTRO_CANCEL, 1200);
        if (cancelVisible) {
            await safeClick(driver, INTRO_CANCEL);
            return;
        }

        if (attempt < maxRestarts) {
            console.log(`[intro] 취소 버튼 미노출 -> 앱 재시작 후 재시도 (${attempt + 1}/${maxRestarts})`);
            await restartTwdApp(driver, 1500);
        }
    }
}

export async function restartTwdApp(driver: Browser, waitMs = 2000) {
    try {
        await driver.terminateApp(TWD);
    } catch {}
    await driver.activateApp(TWD);
    if (waitMs > 0) {
        await driver.pause(waitMs);
    }
}

type BasicTestInfo = {
    title: string;
};

export async function defaultBeforeEach(
    driver: Browser,
    testInfo?: BasicTestInfo,
    skipTitles: string[] = []
) {
    const skipRestart = !!testInfo && skipTitles.some((s) => testInfo.title.includes(s));
    const udid = getDriverUdid(driver);

    forceStopChrome(udid);
    forceStopSamsungBrowser(udid);

    if (!skipRestart) {
        await restartTwdApp(driver, 2000);
    }
    await recoverFocusFromExternalBrowser(driver, udid);
    await closeIntroIfPresent(driver);
    await driver.pause(3000);
}
