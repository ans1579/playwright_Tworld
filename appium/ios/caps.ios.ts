// appium/ios/caps.ios.ts
import { IOS_UDID, WDA_LOCAL_PORT } from "./env.ios"

type IosCapsOverrides = {
  udid?: string;
  wdaLocalPort?: number;
};

export function makeIosCaps(bundleId: string, overrides: IosCapsOverrides = {}) {
  const udid = overrides.udid ?? IOS_UDID;
  const wdaLocalPort = overrides.wdaLocalPort ?? WDA_LOCAL_PORT;

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
  };
  return caps;
}
