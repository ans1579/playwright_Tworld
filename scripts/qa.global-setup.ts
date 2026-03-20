import fs from 'node:fs';
import path from 'node:path';
import type { FullConfig } from '@playwright/test';

export default async function globalSetup(_: FullConfig) {
  const screenshotDir = path.join(process.cwd(), 'test-output', 'screenshot');
  fs.rmSync(screenshotDir, { recursive: true, force: true });
  fs.mkdirSync(screenshotDir, { recursive: true });
  console.log(`[qa.global-setup] screenshot 폴더 초기화: ${screenshotDir}`);
}

