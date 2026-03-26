import { defineConfig } from '@playwright/test';
import { IOS_BUNDLE_ID } from '@appium/ios/env.ios';
import { commonConfig, makeReporter } from './playwright.base';

// VSCode Playwright 확장은 기본적으로 playwright.config.ts를 사용하므로
// 여기에는 QA/E2E/API를 모두 포함한 통합 프로젝트를 둔다.
export default defineConfig({
  ...commonConfig,
  outputDir: 'test-output/test-results',
  reporter: makeReporter('test-output/reports/latest'),
  projects: [
    {
      name: 'qa-ios',
      testMatch: /tests\/qa\/ios\/.*\.spec\.ts/,
      retries: 1,
      use: {
        bundleId: 'com.sktelecom.miniTworld.ad.stg',
      } as any,
    },
    {
      name: 'qa-aos',
      testMatch: /tests\/qa\/aos\/.*\.spec\.ts/,
      retries: 1,
    },
    {
      name: 'e2e-ios',
      testMatch: /tests\/e2e\/ios\/.*\.spec\.ts/,
      use: {
        bundleId: IOS_BUNDLE_ID,
      } as any,
    },
    {
      name: 'e2e-aos',
      testMatch: /tests\/e2e\/aos\/.*\.spec\.ts/,
    },
    {
      name: 'api',
      testMatch: /tests\/api\/.*\.spec\.ts/,
      use: {
        baseURL: process.env.API_BASE_URL ?? 'https://stg.m.shop.tworld.co.kr',
        headless: false,
        launchOptions: {
          slowMo: 200,
        },
      },
    },
  ],
});
