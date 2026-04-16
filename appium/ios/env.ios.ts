// appium/ios/env.ios.ts
// iOS 공통 기본값(qa.config.ts의 project.use가 우선)

// 단말 UDID
export const IOS_UDID_1 = String(process.env.IOS_UDID_1 ?? "00008140-001C09881E80801C").trim(); // 16 Pro
export const IOS_UDID_2 = String(process.env.IOS_UDID_2 ?? "00008030-0009316A2EDA802E").trim(); // 11 Pro
export const IOS_UDID = IOS_UDID_1;

// 앱 식별자 (현재 기준: T world STG)
export const IOS_BUNDLE_ID = String(process.env.IOS_BUNDLE_ID ?? "com.sktelecom.miniTworld.ad.stg").trim();

// WDA 포트 (단말 1:1 분리)
export const WDA_LOCAL_PORT = Number(process.env.IOS_WDA_LOCAL_PORT_1 ?? 8102);

// Appium 서버 기본값 (ios-1)
export const APPIUM_HOST = process.env.IOS_APPIUM_HOST ?? "127.0.0.1";
export const APPIUM_PORT = Number(process.env.IOS_APPIUM_PORT_1 ?? 5005);
export const APPIUM_PATH = process.env.IOS_APPIUM_PATH ?? "/";
