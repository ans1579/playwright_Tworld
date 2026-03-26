import type { Browser } from 'webdriverio';

type MobileContextBrowser = Browser & {
  getContexts: () => Promise<string[]>;
  switchContext: (name: string) => Promise<void>;
  getContext?: () => Promise<string>;
  getCurrentPackage?: () => Promise<string>;
};

function asMobileContextBrowser(driver: Browser): MobileContextBrowser {
  return driver as MobileContextBrowser;
}

// 현재 컨텍스트 목록에서 WEBVIEW_* id 하나를 반환한다.
export async function getWebviewContextId(driver: Browser, packageHint?: string): Promise<string | null> {
  const d = asMobileContextBrowser(driver);
  const contexts = await d.getContexts();
  const webviews = contexts.filter((id) => id.startsWith('WEBVIEW'));
  if (webviews.length === 0) return null;

  const hint = String(packageHint ?? '').trim().toLowerCase();
  if (hint) {
    const matched = webviews.find((id) => id.toLowerCase().includes(hint));
    if (matched) return matched;
  }

  // 일반적으로 마지막 WEBVIEW가 현재 활성 웹뷰인 경우가 많다.
  return webviews[webviews.length - 1];
}

// AOS: 잠깐 대기 후 WEBVIEW로 전환하고, 전환한 context id를 반환한다.
export async function getAndSwitchToWebviewAos(
  driver: Browser,
  pauseMs = 3000,
  packageHint?: string
): Promise<string> {
  const d = asMobileContextBrowser(driver);
  const maxTry = 3;
  let lastErr: unknown = null;
  let lastContexts: string[] = [];

  const currentPackage =
    packageHint ||
    (typeof d.getCurrentPackage === 'function'
      ? await d.getCurrentPackage().catch(() => '')
      : '');

  for (let i = 0; i < maxTry; i += 1) {
    try {
      if (i === 0) {
        if (pauseMs > 0) await d.pause(pauseMs);
      } else {
        await d.pause(700);
      }

      const webviewId = await getWebviewContextId(d, currentPackage);
      if (!webviewId) {
        const contexts = await d.getContexts();
        lastContexts = contexts;
        throw new Error(`WEBVIEW 없음: ${JSON.stringify(contexts)}`);
      }

      await d.switchContext(webviewId);

      let cur = '';
      if (typeof d.getContext === 'function') {
        cur = await d.getContext().catch(() => '');
      }
      if (cur && cur.startsWith('WEBVIEW')) {
        return webviewId;
      }

      throw new Error(`컨텍스트 전환 확인 실패: current=${String(cur)}`);
    } catch (err) {
      lastContexts = await d.getContexts().catch(() => []);
      lastErr = err;
    }
  }

  throw new Error(
    `WEBVIEW 전환 실패: currentPackage=${String(currentPackage)} contexts=${JSON.stringify(lastContexts)} error=${String(lastErr)}`
  );
}

// iOS: WEBVIEW_* 중 마지막 context로 전환하고, 전환한 context id를 반환한다.
export async function getAndSwitchToWebviewIos(driver: Browser, pauseMs = 3000): Promise<string> {
  const d = asMobileContextBrowser(driver);
  if (pauseMs > 0) await d.pause(pauseMs);

  const contexts = await d.getContexts();
  const webIds = contexts.filter((id) => id.startsWith('WEBVIEW_'));
  const target = webIds[webIds.length - 1];

  if (!target) {
    throw new Error(`iOS WEBVIEW_* 없음: ${JSON.stringify(contexts)}`);
  }

  await d.switchContext(target);
  console.log(`Target :: ${target}`);
  return target;
}

// backward compatibility
export const getAndSwitchToWebview = getAndSwitchToWebviewAos;
