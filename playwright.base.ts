import type { PlaywrightTestConfig } from '@playwright/test';

export const commonConfig: PlaywrightTestConfig = {
  testDir: './tests',
  timeout: Number(process.env.QA_TIMEOUT ?? 21_600_000),
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  use: {
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
};

export function makeReporter(outputFolder: string): PlaywrightTestConfig['reporter'] {
  return [
    ['list'],
    ['html', { open: 'never', outputFolder }],
    ['./reporters/open-report-background.cjs', { outputFolder }],
  ];
}
