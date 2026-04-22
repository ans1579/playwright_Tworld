#!/usr/bin/env node
const { spawn } = require('node:child_process');

const args = process.argv.slice(2);
const sep = args.indexOf('--');

if (sep <= 0 || sep === args.length - 1) {
  console.error(
    '[run-with-env] usage: node scripts/run-with-env.cjs KEY=VALUE [KEY=VALUE ...] -- <command> [args...]'
  );
  process.exit(1);
}

const envPairs = args.slice(0, sep);
const rawCmd = args[sep + 1];
const rawCmdArgs = args.slice(sep + 2);

const nextEnv = { ...process.env };
for (const pair of envPairs) {
  const eq = pair.indexOf('=');
  if (eq <= 0) continue;
  const key = pair.slice(0, eq).trim();
  const value = pair.slice(eq + 1);
  if (!key) continue;
  nextEnv[key] = value;
}

let cmd = rawCmd;
let cmdArgs = rawCmdArgs;

// npm script 밖에서 실행해도 playwright/appium 실행이 되도록 npx로 보정
if (rawCmd === 'playwright' || rawCmd === 'appium') {
  cmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  cmdArgs = [rawCmd, ...rawCmdArgs];
}

const child = spawn(cmd, cmdArgs, {
  env: nextEnv,
  stdio: 'inherit',
  shell: process.platform === 'win32',
});

child.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 1);
});
