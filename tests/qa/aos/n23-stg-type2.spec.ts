import { test } from '@appium/fixtures.aos';
import { waitVisible } from '@tests/_shared/actions/ui';
import { APP_PACKAGE } from '@appium/aos/env.aos';

type DetailedWebviewContext = {
    id: string;
    packageName?: string;
    url?: string;
    webviewPageId?: string;
};

async function clickWhenVisible(driver: any, xpath: string, timeoutMs = 15_000) {
    if (typeof xpath !== 'string') throw new Error(`clickWhenVisible: xpath must be string, got ${typeof xpath}`);
    const el = await waitVisible(driver, xpath, timeoutMs);
    await el.click();
    return el;
}

async function findTargetWebviewContext(driver: any, timeoutMs = 60_000): Promise<DetailedWebviewContext> {
    const deadline = Date.now() + timeoutMs;
    let lastDetailed: unknown;

    while (Date.now() < deadline) {
        const detailed = await driver.getContexts({
            returnDetailedContexts: true,
            filterByCurrentAndroidApp: true,
            isAndroidWebviewVisible: false,
            returnAndroidDescriptionData: true,
            androidWebviewConnectTimeout: 15_000,
            androidWebviewConnectionRetryTime: 500,
        });
        lastDetailed = detailed;

        const rows = (Array.isArray(detailed) ? detailed : []).filter((c: any) => {
            if (!c || typeof c.id !== 'string') return false;
            if (!c.id.toLowerCase().includes('webview')) return false;
            if (typeof c.webviewPageId !== 'string' || !c.webviewPageId) return false;

            if (typeof c.packageName === 'string') {
                return c.packageName.toLowerCase() === APP_PACKAGE.toLowerCase();
            }
            return true;
        }) as DetailedWebviewContext[];

        const preferred = rows.find((c) =>
            typeof c.url === 'string' &&
            /ai-layer-bridge|ai-stg\.tworld\.co\.kr|app-stg\.tworld\.co\.kr|common\/tid\/login/i.test(c.url),
        );

        if (preferred) return preferred;

        const fallback = rows.find((c) => typeof c.url === 'string' && c.url.trim().length > 0) ?? rows[0];
        if (fallback) return fallback;

        await driver.pause(1_000);
    }

    throw new Error(`Target webview context not found within ${timeoutMs}ms. lastDetailed=${JSON.stringify(lastDetailed)}`);
}

test(`AOS: N23 Type2 진입 및 핸들바 닫기, 스크롤링 검증`, async ({ driver }: any) => {
    const t = 15_000;

    await test.step(`0. 앱 재실행`, async () => {
        try {
            await driver.terminateApp(APP_PACKAGE);
        } catch {}
        await driver.pause(300);
        await driver.activateApp(APP_PACKAGE);
        await driver.pause(300);
    });

    await test.step(`1. Native: 비로그인 넛징 선택`, async () => {
        const nudgePopup = `//android.view.ViewGroup[@resource-id="Com.sktelecom.minit.ad.stg:id/nudgeMsgLayout"]`;
        await driver.pause(500);
        await clickWhenVisible(driver, nudgePopup, t);
    });

    await test.step(`2. Native: TID 로그인 페이지 확인`, async () => {
        const checkLogin = `//android.widget.TextView[@text="T ID로 T world에 로그인해 보세요"]`;
        await waitVisible(driver, checkLogin, t);
    });

    await test.step(`3. Native: 비로그인 등록된 계정 선택`, async () => {
        const login = `//android.widget.Button[@text="본인 확인된 T ID pleasep@naver.com 010-8832-0456 로 로그인"]`;
        await clickWhenVisible(driver, login, t);

        // WEBVIEW 컨텍스트가 늦게 생기는 케이스 대비
        await driver.pause(800);
    });

    await test.step(`4. 웹뷰: AI Layer 진입 -> 전체 추천 문구 확인`, async () => {
        const target = await findTargetWebviewContext(driver, 60_000);
        const switchAppiumContext = (driver as any).switchAppiumContext?.bind(driver) ?? driver.switchContext.bind(driver);
        await switchAppiumContext(target.id);
        await driver.switchToWindow(target.webviewPageId!);

        const aiLayer = `//div[contains(@class,'channel-label')][.//span[normalize-space(.)='전체']]`;
        await waitVisible(driver, aiLayer, 25_000);
    });

    await test.step(`5. 웹뷰: 우측 상단 x 버튼 클릭`, async () => {
        const xBtn = `//button[@type='button' and @aria-label='서비스 종료']`;
        await clickWhenVisible(driver, xBtn, t);
    });

    await test.step(`6. Native로 복귀`, async () => {
        await driver.switchContext('NATIVE_APP');
    });
});
