import { defineConfig } from '@playwright/test';
import { commonConfig, makeReporter } from './playwright.base';

const includeIosProjects =
  process.env.PW_DISABLE_IOS !== '1' &&
  (process.platform === 'darwin' || process.env.PW_INCLUDE_IOS === '1');

const projects: any[] = [];

if (includeIosProjects) {
  projects.push({
    name: 'qa-ios',
    testMatch: /tests\/qa\/ios\/.*\.spec\.ts/,
    retries: 1,
    use: {
      bundleId: 'com.sktelecom.miniTworld.ad.stg',
    } as any,
  });
}

projects.push(
  {
    name: 'qa-aos',
    testMatch: /tests\/qa\/aos\/.*\.spec\.ts/,
    retries: 1,
  }
);

if (!includeIosProjects) {
  const reason =
    process.env.PW_DISABLE_IOS === '1'
      ? 'PW_DISABLE_IOS=1'
      : '비-macOS 또는 PW_INCLUDE_IOS 미설정';
  console.log(`[playwright.config] iOS 프로젝트 자동 비활성화 (${reason})`);
}

// VSCode Playwright 확장은 기본적으로 playwright.config.ts를 사용하므로
// 여기에는 QA 통합 프로젝트를 둔다.
export default defineConfig({
  ...commonConfig,
  outputDir: 'test-output/test-results',
  reporter: makeReporter('test-output/reports/latest'),
  projects,
});
