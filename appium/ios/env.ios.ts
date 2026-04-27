// appium/ios/env.ios.ts
// iOS 공통 기본값(qa.config.ts의 project.use가 우선)

// 단말 UDID
export const IOS_UDID_1 = String(process.env.IOS_UDID_1 ?? "00008140-000A24D90A8B001C").trim(); // iPhone 16
export const IOS_UDID_2 = String(process.env.IOS_UDID_2 ?? "544ff4fea20e6bbea629f84f33fed9b363076ff7").trim(); // 8 plus
export const IOS_UDID_3 = String(process.env.IOS_UDID_3 ?? "00008101-000948D602A2001E").trim(); // 12 프로맥스
export const IOS_UDID_4 = String(process.env.IOS_UDID_4 ?? "").trim();
export const IOS_UDID = IOS_UDID_1;

// 앱 식별자 (현재 기준: T world STG)
export const IOS_BUNDLE_ID = String(process.env.IOS_BUNDLE_ID ?? "com.sktelecom.miniTworld.ad.stg").trim();

// WDA 포트 (단말 1:1 분리)
export const WDA_LOCAL_PORT = Number(process.env.IOS_WDA_LOCAL_PORT_1 ?? 8102);
export const WDA_LOCAL_PORT_2 = Number(process.env.IOS_WDA_LOCAL_PORT_2 ?? 8103);
export const WDA_LOCAL_PORT_3 = Number(process.env.IOS_WDA_LOCAL_PORT_3 ?? 8104);
export const WDA_LOCAL_PORT_4 = Number(process.env.IOS_WDA_LOCAL_PORT_4 ?? 8105);

// Appium 서버 기본값 (ios-1)
export const APPIUM_HOST = process.env.IOS_APPIUM_HOST ?? "127.0.0.1";
export const APPIUM_PORT = Number(process.env.IOS_APPIUM_PORT_1 ?? 5005);
export const APPIUM_PORT_2 = Number(process.env.IOS_APPIUM_PORT_2 ?? 5006);
export const APPIUM_PORT_3 = Number(process.env.IOS_APPIUM_PORT_3 ?? 5007);
export const APPIUM_PORT_4 = Number(process.env.IOS_APPIUM_PORT_4 ?? 5008);
export const APPIUM_PATH = process.env.IOS_APPIUM_PATH ?? "/";
