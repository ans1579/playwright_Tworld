import { defineConfig } from '@playwright/test';
import { commonConfig, makeReporter } from './playwright.base';
import { IOS_BUNDLE_ID } from '@appium/ios/env.ios';

export default defineConfig({
  ...commonConfig,
  outputDir: 'test-output/test-results/e2e',
  // archive script가 latest 폴더를 참조하므로 e2e는 기존 경로 유지
  reporter: makeReporter('test-output/reports/latest'),
  projects: [
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
  ],
});
