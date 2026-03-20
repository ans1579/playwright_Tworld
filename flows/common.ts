// flows/common.ts
import type { GuardCtx } from './_guards';
import { guardUnexpectPopups } from './_guards';

// commonRun이 guard 함수들과 타입 충돌 없이 바로 호환되게끔 E2ECtx로 묶어줌
export type E2ECtx = GuardCtx & {
  recover?: () => Promise<void>;
};

// UiAutomator2 죽을 때 recover
function isUia2DeadError(e: unknown): boolean {
  const msg = (e as any)?.message ?? String(e);
  return (
    msg.includes('instrumentation process is not running') ||
    msg.includes('cannot be proxied to UiAutomator2 server') ||
    (msg.includes('UiAutomator2 server') && msg.includes('not running'))
  );
}

export async function commonRun(
  ctx: E2ECtx,
  fn: () => Promise<void>,
  opts: { preGuard?: boolean; postGuard?: boolean; recoverOn?: (e:unknown) => boolean } = {}
) {
  const preGuard = opts.preGuard ?? true;
  const postGuard = opts.postGuard ?? false; // ✅ 기본 false
  const recoverOn = opts.recoverOn ?? isUia2DeadError;

  const runOnce = async () => {
    if (preGuard) await guardUnexpectPopups(ctx);
    await fn();
    if (postGuard) await guardUnexpectPopups(ctx);
  };

  try {
    await runOnce();
  } catch (e) {
    if (!ctx.recover) throw e;
    if (!recoverOn(e)) throw e;
    await ctx.recover();
    await runOnce();
  }
}