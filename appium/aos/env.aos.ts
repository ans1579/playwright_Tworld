// 단말 UDID / APP_PACKAGE / APP_ACTIVITY
export const ANDROID_UDID_1 = String(process.env.ANDROID_UDID_1 ?? "R3CW206MA0Y").trim(); // 23 울트라
export const ANDROID_UDID_2 = String(process.env.ANDROID_UDID_2 ?? "R3CN80F903N").trim(); // Z 플립
export const ANDROID_UDID_3 = String(process.env.ANDROID_UDID_3 ?? "R3CY40JZR5K").trim(); // 폴드 7
export const ANDROID_UDID_4 = String(process.env.ANDROID_UDID_4 ?? "330066dcc982c38d").trim(); // 와이드
export const ANDROID_UDID = ANDROID_UDID_1;
export const APP_PACKAGE = process.env.AOS_APP_PACKAGE ?? `Com.sktelecom.minit.ad.stg`;
export const APP_ACTIVITY = process.env.AOS_APP_ACTIVITY ?? `com.sktelecom.minit.scene.intro.IntroActivity`;
// Appium 서버 설정
export const APPIUM_HOST = process.env.AOS_APPIUM_HOST ?? "127.0.0.1";
export const APPIUM_PORT_1 = Number(process.env.AOS_APPIUM_PORT_1 ?? process.env.AOS_APPIUM_PORT ?? 5001);
export const APPIUM_PORT_2 = Number(process.env.AOS_APPIUM_PORT_2 ?? 5002);
export const APPIUM_PORT_3 = Number(process.env.AOS_APPIUM_PORT_3 ?? 5003);
export const APPIUM_PORT_4 = Number(process.env.AOS_APPIUM_PORT_4 ?? 5004);
export const APPIUM_PORT = APPIUM_PORT_1;
export const APPIUM_PATH = process.env.AOS_APPIUM_PATH ?? "/";

// 병렬 실행 포트(단말별 고정 분리)
export const AOS_SYSTEM_PORT_1 = Number(process.env.AOS_SYSTEM_PORT_1 ?? 8201);
export const AOS_SYSTEM_PORT_2 = Number(process.env.AOS_SYSTEM_PORT_2 ?? 8202);
export const AOS_SYSTEM_PORT_3 = Number(process.env.AOS_SYSTEM_PORT_3 ?? 8203);
export const AOS_SYSTEM_PORT_4 = Number(process.env.AOS_SYSTEM_PORT_4 ?? 8204);

export const AOS_MJPEG_PORT_1 = Number(process.env.AOS_MJPEG_PORT_1 ?? 7811);
export const AOS_MJPEG_PORT_2 = Number(process.env.AOS_MJPEG_PORT_2 ?? 7812);
export const AOS_MJPEG_PORT_3 = Number(process.env.AOS_MJPEG_PORT_3 ?? 7813);
export const AOS_MJPEG_PORT_4 = Number(process.env.AOS_MJPEG_PORT_4 ?? 7814);

export const AOS_WEBVIEW_DEVTOOLS_PORT_1 = Number(process.env.AOS_WEBVIEW_DEVTOOLS_PORT_1 ?? 10901);
export const AOS_WEBVIEW_DEVTOOLS_PORT_2 = Number(process.env.AOS_WEBVIEW_DEVTOOLS_PORT_2 ?? 10902);
export const AOS_WEBVIEW_DEVTOOLS_PORT_3 = Number(process.env.AOS_WEBVIEW_DEVTOOLS_PORT_3 ?? 10903);
export const AOS_WEBVIEW_DEVTOOLS_PORT_4 = Number(process.env.AOS_WEBVIEW_DEVTOOLS_PORT_4 ?? 10904);
// 기본 OFF: 명시적으로 켠 경우(1/true/yes/on)만 cleanup 수행
export const APPIUM_CLEANUP = /^(1|true|yes|y|on)$/i.test(String(process.env.AOS_APPIUM_CLEANUP ?? "").trim());
