// appium/caps.ts
import { ANDROID_UDID, APP_PACKAGE, APP_ACTIVITY } from './env.aos';

type AosCapsOverrides = {
  appPackage?: string;
  appActivity?: string;
};

export function makeAosCaps(overrides: AosCapsOverrides = {}) {
  const appPackage = overrides.appPackage ?? APP_PACKAGE;
  const appActivity = overrides.appActivity ?? APP_ACTIVITY;

  return {
    platformName: 'Android',
    'appium:automationName': 'UiAutomator2',

    'appium:udid': ANDROID_UDID,
    'appium:deviceName': ANDROID_UDID,

    'appium:appPackage': appPackage,
    'appium:appActivity': appActivity,
    'appium:appWaitActivity': '*',

    'appium:noReset': true,
    'appium:fullReset': false,
    'appium:dontStopAppOnReset': true,
    'appium:newCommandTimeout': 300,
    'appium:adbExecTimeout': 120000,
    'appium:uiautomator2ServerLaunchTimeout': 120000,
    'appium:androidInstallTimeout': 120000,
    'appium:autoWebview': false,
    'appium:ensureWebviewsHavePages': true,
    'appium:chromedriverAutodownload': true,
    'appium:recreateChromeDriverSessions': false,
    'appium:webviewDevtoolsPort': 10900,
    'appium:chromedriverPorts': [8000, [9000, 9050]],
    'appium:autoGrantPermissions': true,
  };
}
