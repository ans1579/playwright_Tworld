// 단말 UDID / APP_PACKAGE / APP_ACTIVITY
export const ANDROID_UDID = process.env.ANDROID_UDID ?? `R3CX60JDSMP`;
export const APP_PACKAGE = process.env.AOS_APP_PACKAGE ?? `Com.sktelecom.minit.ad.stg`;
export const APP_ACTIVITY =
    process.env.AOS_APP_ACTIVITY ?? `com.sktelecom.minit.scene.intro.IntroActivity`;

// Appium 서버 설정
export const APPIUM_HOST = process.env.AOS_APPIUM_HOST ?? '127.0.0.1';
export const APPIUM_PORT = Number(process.env.AOS_APPIUM_PORT ?? 4723);
export const APPIUM_PATH = process.env.AOS_APPIUM_PATH ?? '/';
export const APPIUM_CLEANUP = process.env.AOS_APPIUM_CLEANUP === '1';
