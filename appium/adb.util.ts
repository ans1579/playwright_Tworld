import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

let cachedAdbPath: string | null = null;
let warnedAdbResolveFailure = false;

function pickExistingAdbPath(value: string | undefined, isWin: boolean, lookedUp: string[]): string | null {
  if (!value) return null;
  const adbBin = isWin ? 'adb.exe' : 'adb';
  const trimmed = value.trim().replace(/^"(.*)"$/, '$1');
  if (!trimmed) return null;

  const candidates = [trimmed];
  if (fs.existsSync(trimmed) && fs.statSync(trimmed).isDirectory()) {
    candidates.push(path.join(trimmed, adbBin));
    candidates.push(path.join(trimmed, 'adb'));
  }

  for (const candidate of candidates) {
    lookedUp.push(candidate);
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return candidate;
    }
  }

  return null;
}

export function resolveAdbPath(): string {
  if (cachedAdbPath) return cachedAdbPath;

  const isWin = process.platform === 'win32';
  const adbBin = isWin ? 'adb.exe' : 'adb';
  const lookedUp: string[] = [];

  const fromEnv = pickExistingAdbPath(process.env.ADB_PATH, isWin, lookedUp);
  if (fromEnv) {
    cachedAdbPath = fromEnv;
    return fromEnv;
  }

  try {
    const lookupCmd = isWin ? 'where' : 'which';
    const out = execFileSync(lookupCmd, ['adb'], { encoding: 'utf-8' });
    const lines = out
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    for (const line of lines) {
      const candidate = pickExistingAdbPath(line, isWin, lookedUp);
      if (candidate) {
        cachedAdbPath = candidate;
        return candidate;
      }
    }
  } catch {}

  const sdkCandidates = [
    process.env.ANDROID_SDK_ROOT,
    process.env.ANDROID_HOME,
    process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, 'Android', 'Sdk') : undefined,
    process.env.USERPROFILE ? path.join(process.env.USERPROFILE, 'AppData', 'Local', 'Android', 'Sdk') : undefined,
  ].filter(Boolean) as string[];

  for (const sdk of sdkCandidates) {
    const candidate = pickExistingAdbPath(path.join(sdk, 'platform-tools', adbBin), isWin, lookedUp);
    if (candidate) {
      cachedAdbPath = candidate;
      return candidate;
    }
  }

  throw new Error(
    `adb를 찾을 수 없습니다. ADB_PATH 또는 ANDROID_SDK_ROOT/ANDROID_HOME를 확인하세요. 시도 경로: ${lookedUp.join(
      ' | '
    )}`
  );
}

export function adbText(udid: string, args: string[], timeoutMs = 5000): string | null {
  try {
    const adbPath = resolveAdbPath();
    const out = execFileSync(adbPath, ['-s', udid, ...args], {
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: timeoutMs,
    });
    return String(out ?? '').trim();
  } catch {
    return null;
  }
}

export function isAndroidDeviceConnectedByAdb(udid: string): boolean {
  if (!udid) return false;
  const state = adbText(udid, ['get-state'], 4000);
  if (state?.toLowerCase() === 'device') return true;

  try {
    const adbPath = resolveAdbPath();
    const out = execFileSync(adbPath, ['devices'], {
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'ignore'],
      timeout: 5000,
    });
    return out
      .split(/\r?\n/)
      .some((line) => line.trim().startsWith(`${udid}\tdevice`));
  } catch (error) {
    if (!warnedAdbResolveFailure) {
      warnedAdbResolveFailure = true;
      console.warn(`[adb] Android 단말 연결 체크 실패: ${String((error as Error)?.message ?? error)}`);
    }
    return false;
  }
}
