// appium/driverManager.ts
import { remote } from 'webdriverio';
import type { Browser } from 'webdriverio';

export function isSessionDeadError(e: unknown): boolean {
  const msg = (e as any)?.message ?? String(e);
  return (
    // common transport / session
    msg.includes('socket hang up') ||
    msg.includes('invalid session id') ||
    msg.includes('A session is either terminated or not started') ||
    msg.includes('The operation was aborted due to timeout') ||
    // android uia2
    msg.includes('instrumentation process is not running') ||
    msg.includes('instrumentation process cannot be initialized') ||
    msg.includes('cannot be proxied to UiAutomator2 server') ||
    (msg.includes('UiAutomator2 server') && msg.includes('not running')) ||
    // ios xcuitest / wda
    msg.includes('WebDriverAgent is not running') ||
    msg.includes('xcodebuild exited with code') ||
    msg.includes('Failed to create WDA session') ||
    msg.includes('Could not proxy command to the remote server') ||
    msg.includes('iProxy') ||
    msg.includes('Connection was refused to port')
  );
}

// Backward compatibility
export const isUia2DeadError = isSessionDeadError;

export class DriverManager {
  private driver: Browser | null = null;

  constructor(private makeRemoteOpts: () => any) {}

  async get(): Promise<Browser> {
    if (!this.driver) this.driver = await remote(this.makeRemoteOpts());
    return this.driver;
  }

  async recreate(): Promise<Browser> {
    try { await this.driver?.deleteSession(); } catch {}
    this.driver = await remote(this.makeRemoteOpts());
    return this.driver;
  }

  async runWithRecovery<T>(
    action: (driver: Browser) => Promise<T>,
    onRecovered?: (driver: Browser) => Promise<void> | void
  ): Promise<T> {
    const current = await this.get();
    try {
      return await action(current);
    } catch (e) {
      if (!isSessionDeadError(e)) throw e;
      const recreated = await this.recreate();
      if (onRecovered) {
        await onRecovered(recreated);
      }
      return await action(recreated);
    }
  }

  async ensureAlive(): Promise<Browser> {
    const d = await this.get();
    try {
      await d.getPageSource(); // 헬스체크
      return d;
    } catch (e) {
      if (!isSessionDeadError(e)) throw e;
      return await this.recreate();
    }
  }

  async dispose(): Promise<void> {
    try { await this.driver?.deleteSession(); } catch {}
    this.driver = null;
  }
}
