// 단말 UDID / APP_PACKAGE / APP_ACTIVITY
export const ANDROID_UDID = process.env.ANDROID_UDID ?? `R3CX60JDSMP`;
export const APP_PACKAGE = process.env.AOS_APP_PACKAGE ?? `Com.sktelecom.minit.ad.stg`;
// export const APP_PACKAGE = process.env.AOS_APP_PACKAGE ?? `com.sktelecom.minit`;
export const APP_ACTIVITY =
    process.env.AOS_APP_ACTIVITY ?? `com.sktelecom.minit.scene.intro.IntroActivity`;
// Appium 서버 설정
export const APPIUM_HOST = process.env.AOS_APPIUM_HOST ?? '127.0.0.1';
export const APPIUM_PORT = Number(process.env.AOS_APPIUM_PORT ?? 4723);
export const APPIUM_PATH = process.env.AOS_APPIUM_PATH ?? '/';
// 기본 OFF: 명시적으로 켠 경우(1/true/yes/on)만 cleanup 수행
export const APPIUM_CLEANUP = /^(1|true|yes|y|on)$/i.test(
  String(process.env.AOS_APPIUM_CLEANUP ?? '').trim()
);
