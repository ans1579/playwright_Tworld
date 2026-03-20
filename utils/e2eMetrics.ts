// utils/e2eMetrics.ts
import type { TestInfo } from '@playwright/test';

export type RunMs = { run: number; ms: number };

export type E2EMetricOptions = {
  runs?: number;                 // 반복 횟수 (기본 5)
  stepTimeoutMs?: number;        // 각 스텝 타임아웃 (기본 60_000)
  retryOnFail?: number;          // 실패 시 재시도 횟수 (기본 1)
  stopOnFail?: boolean;          // 2회 실패 시 즉시 중단 (기본 true)
  title?: string;                // 요약 상단 타이틀
  attachName?: string;           // attach 파일명
  csvFormat?: 'csv' | 'simple';  // 출력 포맷 (기본 simple)
};

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return -1;
  if (p <= 0) return sorted[0];
  if (p >= 100) return sorted[sorted.length - 1];

  const idx = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];

  const w = idx - lo;
  return Math.round(sorted[lo] * (1 - w) + sorted[hi] * w);
}

function formatSuccessMs(rows: RunMs[], format: 'csv' | 'simple'): string {
  if (format === 'csv') {
    return ['run,ms', ...rows.map((r) => `${r.run},${r.ms}`)].join('\n');
  }
  return ['run-ms', ...rows.map((r) => `${r.run}. ${r.ms}`)].join('\n');
}

export type MeasureRunContext = { stepTimeoutMs: number };

/**
 * 확장 모드에서 oneRun이 반환하는 블록 구조.
 * - measure: ✅ 이 블록만 ms 측정 대상(= 순수 E2E 성능 구간)
 * - verify : ✅ 성공/실패 판정만. 시간 측정 제외(옵션)
 */
export type MeasureVerifyBlocks = {
  measure: () => Promise<void>;
  verify?: () => Promise<void>;
};

function hrMs(): number {
  return Number(process.hrtime.bigint()) / 1e6;
}

/**
 * runs만큼 반복 측정, 실패 시 retry(기본 1회), 성공한 run만 통계/CSV attach.
 *
 * 하위호환:
 * - oneRun이 void(아무것도 반환하지 않음)면: 기존처럼 "oneRun 전체" 시간을 측정한다.
 *
 * 확장 모드:
 * - oneRun이 {measure, verify}를 반환하면:
 *   - measure만 시간 측정(= 순수 성능 ms)
 *   - verify는 시간 측정 제외(성공/실패 판정만)
 */
export async function measureE2E(
  testInfo: TestInfo,
  opts: E2EMetricOptions,
  oneRun: (
    runIndex: number,
    ctx: MeasureRunContext
  ) => Promise<void | MeasureVerifyBlocks>
): Promise<{
  successes: RunMs[];
  stats: { avg: number; min: number; max: number; p5: number; p95: number };
}> {
  const {
    runs = 5,
    stepTimeoutMs = 60_000,
    retryOnFail = 1,
    stopOnFail = true,
    title = 'E2E Result',
    attachName = 'e2e_result.txt',
    csvFormat = 'simple',
  } = opts;

  testInfo.setTimeout(runs * stepTimeoutMs + 120_000);

  const successes: RunMs[] = [];

  for (let run = 0; run < runs; run++) {
    let ok = false;
    let lastErr = '';

    const ctx: MeasureRunContext = { stepTimeoutMs };

    for (let attempt = 0; attempt < 1 + retryOnFail; attempt++) {
      try {
        const t0 = hrMs();

        const maybeBlocks = await oneRun(run, ctx);

        // ✅ 기존 모드: oneRun 전체가 측정 구간
        if (!maybeBlocks) {
          const t1 = hrMs();
          successes.push({ run, ms: Math.round(t1 - t0) });
          ok = true;
          break;
        }

        // ✅ 확장 모드: measure만 측정, verify는 측정 제외
        const tMeasure0 = hrMs();
        await maybeBlocks.measure();
        const tMeasure1 = hrMs();

        // verify는 시간 제외(실패 시 catch로)
        if (maybeBlocks.verify) {
          await maybeBlocks.verify();
        }

        successes.push({ run, ms: Math.round(tMeasure1 - tMeasure0) });
        ok = true;
        break;
      } catch (e: any) {
        lastErr = e?.message ?? String(e);

        await testInfo.attach(`fail_run${run}_attempt${attempt}.txt`, {
          body: Buffer.from(lastErr, 'utf-8'),
          contentType: 'text/plain',
        });
      }
    }

    if (!ok && stopOnFail) {
      throw new Error(`재시도 실패 - 테스트를 중단합니다: ${lastErr ?? ''}`);
    }
  }

  const times = successes.map((s) => s.ms).sort((a, b) => a - b);
  if (times.length === 0) {
    throw new Error(`성공한 테스트가 없음 - 통계를 계산할 수 없습니다.`);
  }

  const min = times[0];
  const max = times[times.length - 1];
  const avg = Math.round(times.reduce((a, b) => a + b, 0) / times.length);
  const p5 = percentile(times, 5);
  const p95 = percentile(times, 95);

  const csv = formatSuccessMs(successes, csvFormat);
  const summary = [
    `${title}`,
    `RUNS= ${runs}`,
    `SUCCESS= ${successes.length}`,
    `AVG= ${avg}ms`,
    `MIN= ${min}ms`,
    `P5 = ${p5}ms`,
    `P95= ${p95}ms`,
    `MAX= ${max}ms`,
    '',
    '',
    csv,
    '',
  ].join('\n');

  await testInfo.attach(attachName, {
    body: Buffer.from(summary, 'utf-8'),
    contentType: 'text/plain',
  });

  return { successes, stats: { avg, min, max, p5, p95 } };
}