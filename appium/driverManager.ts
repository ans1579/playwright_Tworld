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

type DriverManagerOptions = {
  sessionCreateTimeoutMs?: number;
  sessionRecreateTimeoutMs?: number;
  sessionCreateAttempts?: number;
  sessionRecreateAttempts?: number;
  createRetryDelayMs?: number;
  recreateRetryDelayMs?: number;
};

export class DriverManager {
  private driver: Browser | null = null;
  private createInFlight: Promise<Browser> | null = null;
  private createInFlightPhase: 'create' | 'recreate' | null = null;
  private readonly sessionCreateTimeoutMs: number;
  private readonly sessionRecreateTimeoutMs: number;
  private readonly sessionCreateAttempts: number;
  private readonly sessionRecreateAttempts: number;
  private readonly createRetryDelayMs: number;
  private readonly recreateRetryDelayMs: number;

  constructor(
    private makeRemoteOpts: () => any,
    private hooks?: {
      beforeCreate?: (phase: 'create' | 'recreate') => Promise<void> | void;
      onCreateError?: (phase: 'create' | 'recreate', attempt: number, error: unknown) => Promise<void> | void;
    },
    options: DriverManagerOptions = {}
  ) {
    const defaultCreateTimeoutMs = process.platform === 'win32' ? 120000 : 60000;
    const defaultRecreateTimeoutMs = process.platform === 'win32' ? 120000 : 60000;
    const defaultCreateAttempts = process.platform === 'win32' ? 3 : 2;
    const defaultRecreateAttempts = process.platform === 'win32' ? 3 : 2;

    this.sessionCreateTimeoutMs = Number(
      options.sessionCreateTimeoutMs ?? process.env.APPIUM_SESSION_CREATE_TIMEOUT_MS ?? defaultCreateTimeoutMs
    );
    this.sessionRecreateTimeoutMs = Number(
      options.sessionRecreateTimeoutMs ?? process.env.APPIUM_SESSION_RECREATE_TIMEOUT_MS ?? defaultRecreateTimeoutMs
    );
    this.sessionCreateAttempts = Math.max(
      1,
      Number(options.sessionCreateAttempts ?? process.env.APPIUM_SESSION_CREATE_ATTEMPTS ?? defaultCreateAttempts)
    );
    this.sessionRecreateAttempts = Math.max(
      1,
      Number(options.sessionRecreateAttempts ?? process.env.APPIUM_SESSION_RECREATE_ATTEMPTS ?? defaultRecreateAttempts)
    );
    this.createRetryDelayMs = Math.max(
      0,
      Number(options.createRetryDelayMs ?? process.env.APPIUM_SESSION_CREATE_RETRY_DELAY_MS ?? 1500)
    );
    this.recreateRetryDelayMs = Math.max(
      0,
      Number(options.recreateRetryDelayMs ?? process.env.APPIUM_SESSION_RECREATE_RETRY_DELAY_MS ?? 2000)
    );
  }

  private sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async createSessionWithTimeout(timeoutMs: number, phase: 'create' | 'recreate'): Promise<Browser> {
    let timer: NodeJS.Timeout | null = null;
    const timeoutMessage = `세션 ${phase} 타임아웃(${timeoutMs}ms)`;
    let remotePromise: Promise<Browser> | null = null;
    try {
      await this.hooks?.beforeCreate?.(phase);
      remotePromise = remote(this.makeRemoteOpts());
      return await Promise.race([
        remotePromise,
        new Promise<Browser>((_, reject) => {
          timer = setTimeout(() => {
            reject(new Error(timeoutMessage));
          }, timeoutMs);
        }),
      ]);
    } catch (error) {
      // Promise.race 타임아웃으로 빠져나와도 remote 호출은 백그라운드에서 살아있을 수 있음
      // 후속 시도에서 unhandled rejection 경고를 피하기 위해 catch를 붙여둔다.
      if ((error as Error)?.message?.includes(timeoutMessage) && remotePromise) {
        void remotePromise.catch(() => {});
      }
      throw error;
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  private async createSessionWithRetry(phase: 'create' | 'recreate'): Promise<Browser> {
    const timeoutMs = phase === 'create' ? this.sessionCreateTimeoutMs : this.sessionRecreateTimeoutMs;
    const attempts = phase === 'create' ? this.sessionCreateAttempts : this.sessionRecreateAttempts;
    const delayMs = phase === 'create' ? this.createRetryDelayMs : this.recreateRetryDelayMs;
    let lastError: unknown;

    for (let attempt = 1; attempt <= attempts; attempt++) {
      try {
        return await this.createSessionWithTimeout(timeoutMs, phase);
      } catch (error) {
        lastError = error;
        await this.hooks?.onCreateError?.(phase, attempt, error);

        if (attempt >= attempts) break;
        console.warn(
          `[driver] 세션 ${phase} 실패(${attempt}/${attempts}) -> 정리 후 재시도 :: 원인=${(error as Error)?.message ?? String(error)}`
        );
        if (delayMs > 0) {
          await this.sleep(delayMs);
        }
      }
    }

    throw lastError ?? new Error(`세션 ${phase} 실패`);
  }

  private async createOrJoin(phase: 'create' | 'recreate', forceNew = false): Promise<Browser> {
    if (this.createInFlight) {
      if (!forceNew && this.createInFlightPhase === phase) {
        return this.createInFlight;
      }
      try {
        await this.createInFlight;
      } catch {}
    }

    if (!forceNew && this.driver) return this.driver;

    this.createInFlightPhase = phase;
    this.createInFlight = this.createSessionWithRetry(phase)
      .then((created) => {
        this.driver = created;
        return created;
      })
      .finally(() => {
        this.createInFlight = null;
        this.createInFlightPhase = null;
      });

    return this.createInFlight;
  }

  async get(): Promise<Browser> {
    if (this.driver) return this.driver;
    return await this.createOrJoin('create');
  }

  async recreate(): Promise<Browser> {
    try { await this.driver?.deleteSession(); } catch {}
    this.driver = null;
    return await this.createOrJoin('recreate', true);
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
    try { await this.createInFlight; } catch {}
    try { await this.driver?.deleteSession(); } catch {}
    this.driver = null;
  }
}
