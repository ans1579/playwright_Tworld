import type { Browser } from 'webdriverio';

function getContextId(row: unknown): string | undefined {
  if (typeof row === 'string') return row;
  if (row && typeof row === 'object' && 'id' in row && typeof (row as any).id === 'string') {
    return (row as any).id;
  }
  return undefined;
}

// 현재 컨텍스트 목록에서 WEBVIEW_* id 하나를 반환한다.
export async function getWebviewContextId(driver: Browser): Promise<string | null> {
  const rows = await driver.getContexts();
  const ids = rows.map(getContextId).filter((id): id is string => Boolean(id));
  return ids.find((id) => id.startsWith('WEBVIEW')) ?? null;
}

// AOS: 잠깐 대기 후 WEBVIEW로 전환하고, 전환한 context id를 반환한다.
export async function getAndSwitchToWebviewAos(driver: Browser, pauseMs = 3000): Promise<string> {
  if (pauseMs > 0) await driver.pause(pauseMs);

  const webviewId = await getWebviewContextId(driver);
  if (!webviewId) {
    const rows = await driver.getContexts();
    throw new Error(`WEBVIEW 없음: ${JSON.stringify(rows)}`);
  }

  await driver.switchContext(webviewId);
  return webviewId;
}

// iOS: WEBVIEW_* 중 마지막 context로 전환하고, 전환한 context id를 반환한다.
export async function getAndSwitchToWebviewIos(driver: Browser, pauseMs = 3000): Promise<string> {
  if (pauseMs > 0) await driver.pause(pauseMs);

  const rows = await driver.getContexts();
  const ids = rows.map(getContextId).filter((id): id is string => Boolean(id));
  const webIds = ids.filter((id) => id.startsWith('WEBVIEW_'));
  const target = webIds[webIds.length - 1];

  if (!target) {
    throw new Error(`iOS WEBVIEW_* 없음: ${JSON.stringify(rows)}`);
  }

  await driver.switchContext(target);
  console.log(`Target :: ${target}`);
  return target;
}

// backward compatibility
export const getAndSwitchToWebview = getAndSwitchToWebviewAos;
