// scripts/run_e2e_archive.mjs
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

function pad2(n) { return String(n).padStart(2, '0'); }

function timestamp() {
    const d = new Date();
    const yy = pad2(d.getFullYear() % 100);
    const mm = pad2(d.getMonth() + 1);
    const dd = pad2(d.getDate());
    const HH = pad2(d.getHours());
    const MM = pad2(d.getMinutes());
    return `${yy}${mm}${dd}-${HH}${MM}`;
}

/** 동일 분 중복 시 <root>/<base>-01, -02 ... 반환 */
function uniqueArchiveDir(root, baseName) {
    const baseDir = path.join(root, baseName);
    if (!fs.existsSync(baseDir)) return baseDir;

    for (let i = 1; i < 100; i++) {
        const dir = `${baseDir}-${pad2(i)}`;
        if (!fs.existsSync(dir)) return dir;
    }
    throw new Error('아카이브 폴더명 충돌');
}

// args에서 iOS/AOS 추정해서 분리하여 저장
function detectPlatform(args) {
    const joined = args.join(' ').toLowerCase();

    if (joined.includes('iostest') || joined.includes('.ios.') || joined.includes('ios/')) return 'ios';
    if (joined.includes('aostest') || joined.includes('.aos.') || joined.includes('aos/')) return 'aos';

    // 못 찾으면 env로 구분
    const env = (process.env.E2E_PLATFORM || '').toLowerCase();
    if (env === 'ios' || env === 'aos') return env;

    return 'misc';
}

const args = process.argv.slice(2);

// ✅ Playwright config에서 html outputFolder를 'test-output/reports/latest'로 바꿨다는 전제
const reportsRoot = path.resolve(process.cwd(), 'test-output', 'reports');
const latestDir = path.join(reportsRoot, 'latest');

const platform = detectPlatform(args);
const platformRoot = path.join(reportsRoot, platform);

// ✅ prefix 통일 (A_ / I_ / M_)
const prefix = platform === 'aos' ? 'A_' : platform === 'ios' ? 'I_' : 'M_';
const baseName = `${prefix}${timestamp()}`;
const archiveDir = uniqueArchiveDir(platformRoot, baseName);

const cmd = ['npx', 'playwright', 'test', '--workers=1', ...args].join(' ');
execSync(cmd, { stdio: 'inherit' });

if (fs.existsSync(latestDir)) {
    fs.mkdirSync(platformRoot, { recursive: true });
    fs.cpSync(latestDir, archiveDir, { recursive: true });
    console.log(`Archived -> ${archiveDir}`);
} else {
    console.warn('test-output/reports/latest 없음, 아카이브 생략');
}