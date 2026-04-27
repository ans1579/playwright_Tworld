// appium/ios/caps.ios.ts
import { IOS_UDID, WDA_LOCAL_PORT } from "./env.ios"

type IosCapsOverrides = {
  udid?: string;
  wdaLocalPort?: number;
};

function parseWebviewBundleIds(raw: string | undefined): string[] {
  const value = String(raw ?? '').trim();
  if (!value) return [];

  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed.map((v) => String(v).trim()).filter(Boolean);
    }
  } catch {}

  return value
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);
}

export function makeIosCaps(bundleId: string, overrides: IosCapsOverrides = {}) {
  const udid = overrides.udid ?? IOS_UDID;
  const wdaLocalPort = overrides.wdaLocalPort ?? WDA_LOCAL_PORT;
  const additionalWebviewBundleIds = parseWebviewBundleIds(
    process.env.IOS_ADDITIONAL_WEBVIEW_BUNDLE_IDS
  );

  const caps: Record<string, any> = {
    platformName: 'iOS',
    'appium:automationName': 'XCUITest',

    'appium:udid': udid,
    'appium:deviceName': udid, // AOS와 동일한 감성(실제론 이름이어도 됨)

    // ✅ 설치된 앱을 bundleId로 실행
    'appium:bundleId': bundleId,

    'appium:noReset': true,
    'appium:newCommandTimeout': 120,

    // ✅ 단말 1:1 포트 분리 핵심
    'appium:wdaLocalPort': wdaLocalPort,
    'appium:useNewWDA': false,
    'appium:wdaStartupRetries': 2,
    'appium:wdaStartupRetryInterval': 10000,
    'appium:wdaConnectionTimeout': 120000,

    // ✅ 속도 튜닝 (iOS 대기시간 단축)
    // 앱 애니메이션/idle 대기 시간을 줄여 클릭 간 템포를 빠르게 함
    'appium:waitForQuiescence': false,
    'appium:waitForIdleTimeout': 1,
    'appium:wdaEventloopIdleDelay': 0,
    'appium:disableAutomaticScreenshots': true,
    'appium:simpleIsVisibleCheck': true,

    // ✅ iOS Hybrid(WebView) 연결 안정화
    // - 늦게 뜨는 WEBVIEW를 기다리기 위한 재시도/타임아웃 설정
    'appium:autoWebview': process.env.IOS_AUTO_WEBVIEW === '1',
    'appium:webviewConnectRetries': Number(process.env.IOS_WEBVIEW_CONNECT_RETRIES ?? 20),
    'appium:webviewConnectTimeout': Number(process.env.IOS_WEBVIEW_CONNECT_TIMEOUT ?? 20000),
    'appium:webkitResponseTimeout': Number(process.env.IOS_WEBKIT_RESPONSE_TIMEOUT ?? 20000),
    'appium:includeSafariInWebviews': process.env.IOS_INCLUDE_SAFARI_IN_WEBVIEWS === '1',
  };

  if (additionalWebviewBundleIds.length > 0) {
    caps['appium:additionalWebviewBundleIds'] = additionalWebviewBundleIds;
  }

  return caps;
}
