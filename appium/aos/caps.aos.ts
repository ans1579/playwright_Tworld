// appium/caps.ts
import { ANDROID_UDID, APP_PACKAGE, APP_ACTIVITY } from './env.aos';

type AosCapsOverrides = {
  udid?: string;
  appPackage?: string;
  appActivity?: string;
  systemPort?: number;
  mjpegServerPort?: number;
  webviewDevtoolsPort?: number;
  chromedriverPorts?: Array<number | [number, number]>;
};

export function makeAosCaps(overrides: AosCapsOverrides = {}) {
  const udid = overrides.udid ?? ANDROID_UDID;
  const appPackage = overrides.appPackage ?? APP_PACKAGE;
  const appActivity = overrides.appActivity ?? APP_ACTIVITY;
  const systemPort = overrides.systemPort ?? 8201;
  const mjpegServerPort = overrides.mjpegServerPort ?? 7811;
  const webviewDevtoolsPort = overrides.webviewDevtoolsPort ?? 10901;
  const chromedriverPorts = overrides.chromedriverPorts ?? [8000, [9000, 9050]];

  return {
    platformName: 'Android',
    'appium:automationName': 'UiAutomator2',

    'appium:udid': udid,
    'appium:deviceName': udid,

    'appium:appPackage': appPackage,
    'appium:appActivity': appActivity,
    'appium:appWaitActivity': '*',
    'appium:appWaitForLaunch': false,
    'appium:appWaitDuration': 90000,

    'appium:noReset': true,
    'appium:fullReset': false,
    'appium:dontStopAppOnReset': true,
    'appium:newCommandTimeout': Number(process.env.AOS_NEW_COMMAND_TIMEOUT ?? 600),
    'appium:adbExecTimeout': Number(process.env.AOS_ADB_EXEC_TIMEOUT ?? 180000),
    'appium:uiautomator2ServerInstallTimeout': Number(process.env.AOS_UIA2_SERVER_INSTALL_TIMEOUT ?? 180000),
    'appium:uiautomator2ServerLaunchTimeout': Number(process.env.AOS_UIA2_SERVER_LAUNCH_TIMEOUT ?? 180000),
    'appium:uiautomator2ServerReadTimeout': 180000,
    'appium:androidInstallTimeout': 120000,
    // Android 14+에서 io.appium.settings foreground service(location) 크래시 회피
    'appium:skipDeviceInitialization': true,
    'appium:ignoreHiddenApiPolicyError': true,
    'appium:disableWindowAnimation': true,
    'appium:settings[waitForIdleTimeout]': Number(process.env.AOS_WAIT_FOR_IDLE_TIMEOUT ?? 100),
    'appium:settings[waitForSelectorTimeout]': Number(process.env.AOS_WAIT_FOR_SELECTOR_TIMEOUT ?? 7000),
    'appium:autoWebview': false,
    'appium:ensureWebviewsHavePages': true,
    'appium:chromedriverAutodownload': true,
    'appium:recreateChromeDriverSessions': false,
    'appium:webviewConnectRetries': Number(process.env.AOS_WEBVIEW_CONNECT_RETRIES ?? 10),
    'appium:webviewConnectTimeout': Number(process.env.AOS_WEBVIEW_CONNECT_TIMEOUT ?? 20000),
    'appium:systemPort': systemPort,
    'appium:mjpegServerPort': mjpegServerPort,
    'appium:webviewDevtoolsPort': webviewDevtoolsPort,
    'appium:chromedriverPorts': chromedriverPorts,
    'appium:autoGrantPermissions': true,
  };
}
