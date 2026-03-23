// 단말 UDID, 앱 식별자
// export const IOS_UDID = '00008140-001C09881E80801C'; // 16 프로
export const IOS_UDID = '00008030-0009316A2EDA802E'; // 11 프로
export const IOS_BUNDLE_ID = process.env.IOS_BUNDLE_ID ?? 'com.sktelecom.miniTworld.ad.stg';

// WDA 포트 (단말 1 대 1 분리)
export const WDA_LOCAL_PORT = 8102;

// APPIUM 서버 기본값 (ios-01)
export const APPIUM_HOST = '127.0.0.1';
export const APPIUM_PORT = 4724;
export const APPIUM_PATH = '/';