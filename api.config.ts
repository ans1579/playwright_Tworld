import { defineConfig } from '@playwright/test';
import { commonConfig, makeReporter } from './playwright.base';

export default defineConfig({
  ...commonConfig,
  outputDir: 'test-output/test-results/api',
  reporter: makeReporter('test-output/reports/api/latest'),
  // API 전용 테스트 폴더/패턴
  testDir: './tests/api',
  projects: [
    {
      name: 'api',
      use: {
        baseURL: process.env.API_BASE_URL ?? 'https://stg.shop.tworld.co.kr',
        headless: false,
        launchOptions: {
          slowMo: 200,
        },
        trace: 'off',
        screenshot: 'off',
        video: 'off',
      },
    },
  ],
});
