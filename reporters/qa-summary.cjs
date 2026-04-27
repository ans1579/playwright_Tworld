const fs = require('node:fs');
const path = require('node:path');

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function toRel(fromDir, targetPath) {
  if (!targetPath) return '';
  try {
    const rel = path.relative(fromDir, targetPath);
    return rel.split(path.sep).join('/');
  } catch {
    return targetPath;
  }
}

function nowStamp() {
  const d = new Date();
  const y = String(d.getFullYear());
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `${y}${m}${day}-${hh}${mm}${ss}`;
}

function escapeHtml(s) {
  return String(s ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function getProjectName(test) {
  try {
    if (test?.parent && typeof test.parent.project === 'function') {
      return test.parent.project()?.name ?? 'unknown';
    }
  } catch {}
  try {
    const pathParts = typeof test?.titlePath === 'function' ? test.titlePath() : [];
    if (Array.isArray(pathParts) && pathParts.length > 0) return String(pathParts[0]);
  } catch {}
  return 'unknown';
}

function extractMessage(result) {
  const direct = result?.error?.message;
  if (direct) return direct;
  const first = Array.isArray(result?.errors) ? result.errors.find((e) => e?.message) : null;
  return first?.message ?? '';
}

function extractStack(result) {
  const direct = result?.error?.stack;
  if (direct) return direct;
  const first = Array.isArray(result?.errors) ? result.errors.find((e) => e?.stack) : null;
  return first?.stack ?? '';
}

function normalizePath(p) {
  return String(p || '').split(path.sep).join('/');
}

function toWorkspaceRel(absPath) {
  if (!absPath) return '';
  try {
    return normalizePath(path.relative(process.cwd(), absPath));
  } catch {
    return normalizePath(absPath);
  }
}

function pickFailurePoint(stack, fallbackFile, fallbackLine) {
  const lines = String(stack || '').split('\n');
  const matches = [];
  for (const line of lines) {
    const m = line.match(/(\/[^\s)]+?\.(?:ts|tsx|js|jsx)):(\d+):(\d+)/);
    if (m) {
      matches.push({
        file: m[1],
        line: Number(m[2] || 0),
      });
    }
  }

  const preferred =
    matches.find((m) => /\/tests\//.test(m.file)) ||
    matches.find((m) => /\/appium\//.test(m.file)) ||
    matches[0];

  if (preferred) {
    return `${toWorkspaceRel(preferred.file)}:${preferred.line || 1}`;
  }

  if (fallbackFile) {
    return `${normalizePath(fallbackFile)}:${fallbackLine || 1}`;
  }
  return '-';
}

function pickSelectorHint(message, stack) {
  const text = `${String(message || '')}\n${String(stack || '')}`;
  const candidates = [];

  const byQuotedKey = [
    /(?:selector|xpath)\s*[:=]?\s*"((?:\\.|[^"\\]){4,4000})"/gi,
    /(?:selector|xpath)\s*[:=]?\s*'((?:\\.|[^'\\]){4,4000})'/gi,
    /(?:selector|xpath)\s*[:=]?\s*`((?:\\.|[^`\\]){4,4000})`/gi,
    /element\s*\(\s*"xpath"\s*,\s*"([^"]+)"\s*\)/gi,
    /locator\(([^)]+)\)/gi,
    /No such element:\s*(.+)/gi,
    /element\s*\(\s*"(.+?)"\s*\)\s*still\s+/gi,
  ];
  for (const rx of byQuotedKey) {
    for (const m of text.matchAll(rx)) {
      const raw = String(m[1] || '').trim();
      if (raw) candidates.push(raw);
    }
  }

  for (const line of text.split('\n')) {
    const s = line.trim();
    if (!s) continue;
    if (/^\/\//.test(s)) candidates.push(s);
    if (/XCUIElementType|android\.widget|android\.view|-ios class chain|accessibility id/i.test(s)) {
      candidates.push(s);
    }
  }

  const preferred =
    candidates.find((c) => /^\/\//.test(c)) ||
    candidates.find((c) => /XCUIElementType/.test(c)) ||
    candidates.find((c) => /android\./i.test(c)) ||
    candidates[0];

  if (!preferred) return '-';
  let normalized = preferred.trim();
  normalized = normalized.replace(/\\\//g, '/');
  const xpathStart = normalized.indexOf('//');
  if (xpathStart >= 0) normalized = normalized.slice(xpathStart);
  normalized = normalized.replace(/^["'`]|["'`]$/g, '');
  normalized = normalized.replace(/\\(["'`])/g, '$1');
  return normalized.length > 2000 ? `${normalized.slice(0, 2000)}...` : normalized;
}

function pickAttachment(result, predicate) {
  const atts = Array.isArray(result?.attachments) ? result.attachments : [];
  return atts.find(predicate);
}

function statusClass(status) {
  if (status === 'passed') return 'passed';
  if (status === 'failed' || status === 'timedOut' || status === 'interrupted') return 'failed';
  if (status === 'skipped') return 'skipped';
  return 'unknown';
}

function firstLine(message) {
  const line = String(message ?? '').split('\n')[0].trim();
  return line || '(메시지 없음)';
}

function escapeForDoubleQuotes(s) {
  return String(s ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\r?\n/g, ' ');
}

function buildReproCommand(filePath, project, title) {
  const cliFile = String(filePath || '').trim();
  const cliProject = String(project || '').trim() || 'qa-aos';
  const cliTitle = escapeForDoubleQuotes(title || '');

  if (!cliFile) {
    return `npx playwright test -c qa.config.ts --project=${cliProject} -g "${cliTitle}"`;
  }
  return `npx playwright test ${cliFile} -c qa.config.ts --project=${cliProject} -g "${cliTitle}"`;
}

let cachedSpecLocationIndex = null;

function collectSpecFiles(rootDir) {
  const result = [];
  const stack = [rootDir];
  while (stack.length > 0) {
    const current = stack.pop();
    let entries = [];
    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      const p = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(p);
        continue;
      }
      if (!entry.isFile()) continue;
      if (/\.spec\.(ts|tsx|js|jsx)$/i.test(entry.name)) {
        result.push(p);
      }
    }
  }
  return result;
}

function buildSpecLocationIndex() {
  if (cachedSpecLocationIndex) return cachedSpecLocationIndex;
  const index = new Map();
  const testsRoot = path.resolve(process.cwd(), 'tests');
  const specFiles = collectSpecFiles(testsRoot);
  for (const file of specFiles) {
    let content = '';
    try {
      content = fs.readFileSync(file, 'utf8');
    } catch {
      continue;
    }
    const lines = content.split(/\r?\n/);
    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i];
      const m = line.match(/\btest(?:\.(?:only|skip|fixme))?\s*\(\s*(['"`])(.+?)\1/);
      if (!m) continue;
      const title = String(m[2] || '').trim();
      if (!title || index.has(title)) continue;
      index.set(title, { file, line: i + 1 });
    }
  }
  cachedSpecLocationIndex = index;
  return index;
}

function pickSpecFromStack(stack) {
  const lines = String(stack || '').split('\n');
  for (const line of lines) {
    const m = line.match(/(\/[^\s)]+?\.(?:ts|tsx|js|jsx)):(\d+):(\d+)/);
    if (!m) continue;
    const file = m[1];
    const lineNo = Number(m[2] || 1);
    if (/\/tests\/.+\.spec\.(?:ts|tsx|js|jsx)$/i.test(file)) {
      return { file, line: lineNo };
    }
  }
  return null;
}

function pickCaseLocation(title, stack, fallbackFile, fallbackLine) {
  const normalizedFallbackFile = String(fallbackFile || '');
  const normalizedFallbackLine = Number(fallbackLine || 1);

  if (/\.spec\.(?:ts|tsx|js|jsx)$/i.test(normalizedFallbackFile)) {
    return {
      filePath: toWorkspaceRel(normalizedFallbackFile),
      fileRef: `${path.basename(normalizedFallbackFile)}:${normalizedFallbackLine || 1}`,
    };
  }

  const fromStack = pickSpecFromStack(stack);
  if (fromStack?.file) {
    return {
      filePath: toWorkspaceRel(fromStack.file),
      fileRef: `${path.basename(fromStack.file)}:${fromStack.line || 1}`,
    };
  }

  const specIndex = buildSpecLocationIndex();
  const byTitle = specIndex.get(String(title || '').trim());
  if (byTitle?.file) {
    return {
      filePath: toWorkspaceRel(byTitle.file),
      fileRef: `${path.basename(byTitle.file)}:${byTitle.line || 1}`,
    };
  }

  if (normalizedFallbackFile) {
    return {
      filePath: toWorkspaceRel(normalizedFallbackFile),
      fileRef: `${path.basename(normalizedFallbackFile)}:${normalizedFallbackLine || 1}`,
    };
  }

  return { filePath: '', fileRef: '-' };
}

function resolveExistingPath(rawPath) {
  if (!rawPath) return '';
  const direct = path.isAbsolute(rawPath) ? rawPath : path.resolve(process.cwd(), rawPath);
  if (fs.existsSync(direct)) return direct;
  try {
    const normalized = path.resolve(rawPath);
    if (fs.existsSync(normalized)) return normalized;
  } catch {}
  return '';
}

function formatDuration(ms) {
  const totalSec = Math.max(0, Math.round((Number(ms) || 0) / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return m > 0 ? `${m}분 ${s}초` : `${s}초`;
}

class QASummaryReporter {
  constructor(options = {}) {
    this.outputFolder = options.outputFolder || 'test-output/reports/qa/latest';
    this.runResults = new Map();
    this.startedAt = Date.now();
  }

  onTestEnd(test, result) {
    const id = test?.id ?? `${test?.location?.file || 'unknown'}::${test?.title || 'unknown'}`;
    const item = {
      id,
      title: test?.title ?? 'unknown',
      file: test?.location?.file ?? '',
      line: test?.location?.line ?? 0,
      project: getProjectName(test),
      retry: result?.retry ?? 0,
      status: result?.status ?? 'unknown',
      duration: result?.duration ?? 0,
      message: extractMessage(result),
      stack: extractStack(result),
      startedAt: result?.startTime ? new Date(result.startTime).getTime() : Date.now(),
      screenshotPath:
        pickAttachment(
          result,
          (a) =>
            (a?.contentType && String(a.contentType).startsWith('image/')) ||
            /screenshot/i.test(a?.name || '')
        )?.path ?? '',
      tracePath:
        pickAttachment(
          result,
          (a) => /trace/i.test(a?.name || '') || /\.zip$/i.test(a?.path || '')
        )?.path ?? '',
    };

    if (!this.runResults.has(id)) {
      this.runResults.set(id, []);
    }
    this.runResults.get(id).push(item);
  }

  onEnd(fullResult) {
    const latestDir = path.resolve(process.cwd(), this.outputFolder);
    ensureDir(latestDir);

    const all = Array.from(this.runResults.values());
    const finals = all.map((attempts) =>
      attempts.reduce((acc, cur) => (cur.retry >= acc.retry ? cur : acc), attempts[0])
    );
    const attemptCountById = new Map(
      all
        .filter((attempts) => attempts?.[0]?.id)
        .map((attempts) => [attempts[0].id, attempts.length])
    );

    const total = finals.length;
    const passed = finals.filter((r) => r.status === 'passed').length;
    const failedRows = finals.filter((r) => ['failed', 'timedOut', 'interrupted'].includes(r.status));
    const failed = failedRows.length;
    const skipped = finals.filter((r) => r.status === 'skipped').length;
    const failureRate = total > 0 ? ((failed / total) * 100).toFixed(1) : '0.0';
    const avgCaseDurationMs =
      total > 0 ? Math.round(finals.reduce((sum, row) => sum + (row.duration || 0), 0) / total) : 0;
    const maxCaseDurationMs =
      total > 0 ? Math.max(...finals.map((row) => Number(row.duration || 0))) : 0;

    const flaky = all.filter((attempts) => {
      if (attempts.length <= 1) return false;
      const final = attempts.reduce((acc, cur) => (cur.retry >= acc.retry ? cur : acc), attempts[0]);
      const hadFailure = attempts.some((a) => ['failed', 'timedOut', 'interrupted'].includes(a.status));
      return final.status === 'passed' && hadFailure;
    }).length;

    const runStatus = fullResult?.status ?? (failed > 0 ? 'failed' : 'passed');
    const finishedAt = Date.now();
    const firstTestStartMs =
      finals.length > 0 ? Math.min(...finals.map((row) => Number(row.startedAt || this.startedAt))) : this.startedAt;
    const durationMs = Math.max(0, finishedAt - firstTestStartMs);
    const stamp = nowStamp();

    const runsDir = path.join(path.dirname(latestDir), 'runs');
    ensureDir(runsDir);
    const runDir = path.join(runsDir, `${stamp}__${runStatus}`);
    ensureDir(runDir);

    const artifactDir = path.join(latestDir, 'artifacts', stamp);
    const artifactCache = new Map();

    const stageArtifact = (sourcePath, kind, idx) => {
      if (!sourcePath) return '';
      const cacheKey = `${kind}::${sourcePath}`;
      if (artifactCache.has(cacheKey)) return artifactCache.get(cacheKey);

      const absSource = resolveExistingPath(sourcePath);
      if (!absSource) return '';

      ensureDir(artifactDir);
      const ext = path.extname(absSource) || (kind === 'trace' ? '.zip' : '.png');
      const fileName = `${String(idx).padStart(3, '0')}-${kind}${ext}`;
      const dest = path.join(artifactDir, fileName);

      try {
        fs.copyFileSync(absSource, dest);
      } catch {
        return '';
      }

      const rel = toRel(latestDir, dest);
      artifactCache.set(cacheKey, rel);
      return rel;
    };

    const sortedFinals = [...finals].sort((a, b) => (a.startedAt || 0) - (b.startedAt || 0));
    const allViews = sortedFinals.map((r, idx) => {
      const shotRel = stageArtifact(r.screenshotPath, 'screenshot', idx + 1);
      const traceRel = stageArtifact(r.tracePath, 'trace', idx + 1);
      const caseLocation = pickCaseLocation(r.title, r.stack, r.file, r.line);
      const fileRef = caseLocation.fileRef;
      const failureRef = pickFailurePoint(r.stack, r.file, r.line);
      const selectorHint = pickSelectorHint(r.message, r.stack);
      const attempts = Math.max(1, Number(attemptCountById.get(r.id) || 1));
      const filePathForCli = caseLocation.filePath;
      const reproCmd = buildReproCommand(filePathForCli, r.project, r.title);
      return {
        idx: idx + 1,
        project: r.project,
        title: r.title,
        filePathForCli,
        fileRef,
        failureRef,
        selectorHint,
        status: r.status,
        retry: r.retry || 0,
        attempts,
        durationMs: Number(r.duration || 0),
        durationSec: Math.round((r.duration || 0) / 1000),
        message: r.message || '-',
        messageShort: firstLine(r.message || '-'),
        reproCmd,
        shotRel,
        traceRel,
      };
    });
    const failedViews = allViews.filter((r) => ['failed', 'timedOut', 'interrupted'].includes(r.status));

    const projectOptions = Array.from(new Set(failedViews.map((r) => r.project))).sort();
    const projectOptionsHtml = projectOptions
      .map((p) => `<option value="${escapeHtml(p)}">${escapeHtml(p)}</option>`)
      .join('');

    const failRowsHtml = failedViews
      .map((v) => {
        const dataText = `${v.project} ${v.title} ${v.fileRef} ${v.failureRef} ${v.selectorHint} ${v.status} ${v.message}`.toLowerCase();
        const shotCell = v.shotRel
          ? `<a href="${escapeHtml(v.shotRel)}" target="_blank">원본</a>
             <button class="btn-link" data-shot="${escapeHtml(v.shotRel)}" onclick="openShot(event, this.dataset.shot)">🔍 확대</button>`
          : '-';
        const traceCell = v.traceRel ? `<a href="${escapeHtml(v.traceRel)}" target="_blank">📊 Trace</a>` : '-';
        return `
        <tr data-fail-row data-project="${escapeHtml(v.project)}" data-shot="${v.shotRel ? '1' : '0'}" data-text="${escapeHtml(
          dataText
        )}">
          <td class="center">${v.idx}</td>
          <td><span class="project-tag">${escapeHtml(v.project)}</span></td>
          <td class="case-title">${escapeHtml(v.title)}</td>
          <td><code class="file-ref">${escapeHtml(v.fileRef)}</code></td>
          <td class="center"><span class="badge ${statusClass(v.status)}">${escapeHtml(v.status)}</span></td>
          <td class="center duration-col">${v.durationSec}초</td>
          <td class="msg">
            <details>
              <summary class="error-summary">오류 상세 보기</summary>
              <div class="error-details">
                <div class="err-kv"><strong>실패 지점:</strong> <code>${escapeHtml(v.failureRef)}</code></div>
                <div class="err-kv"><strong>셀렉터/XPath:</strong> <code class="selector-code">${escapeHtml(v.selectorHint)}</code></div>
                <div class="err-kv"><strong>테스트 파일:</strong> <code>${escapeHtml(v.fileRef)}</code></div>
                <div class="err-kv">
                  <strong>재실행 명령어:</strong>
                  <div class="cmd-wrapper">
                    <code class="cmd-code">${escapeHtml(v.reproCmd)}</code>
                    <button class="copy-btn" data-cmd="${escapeHtml(v.reproCmd)}" onclick="copyCmd(this.dataset.cmd)" title="복사">📋</button>
                  </div>
                </div>
                <div class="err-kv"><strong>전체 에러 메시지:</strong></div>
                <pre class="err-pre">${escapeHtml(v.message)}</pre>
              </div>
            </details>
          </td>
          <td class="center detail-col">${shotCell}</td>
          <td class="center">${traceCell}</td>
        </tr>`;
      })
      .join('');

    const allRowsHtml = allViews
      .map((v) => {
        const shotCell = v.shotRel
          ? `<button class="btn-link-mini" data-shot="${escapeHtml(v.shotRel)}" onclick="openShot(event, this.dataset.shot)" title="스크린샷 보기">🔍</button>`
          : '-';
        return `
        <tr data-all-row>
          <td class="center">${v.idx}</td>
          <td class="project-col"><span class="project-tag">${escapeHtml(v.project)}</span></td>
          <td class="case-col">${escapeHtml(v.title)}</td>
          <td class="center"><span class="badge ${statusClass(v.status)}">${escapeHtml(v.status)}</span></td>
          <td class="center duration-col">${formatDuration(v.durationMs)}</td>
          <td class="failure-col"><code class="file-ref">${escapeHtml(v.failureRef)}</code></td>
          <td class="error-col">${escapeHtml(v.messageShort)}</td>
          <td class="center detail-col">${shotCell}</td>
        </tr>`;
      })
      .join('');

    const shotGalleryHtml = failedViews
      .filter((v) => Boolean(v.shotRel))
      .map(
        (v) => `
      <figure class="shot-card" data-project="${escapeHtml(v.project)}">
        <button class="shot-btn" data-shot="${escapeHtml(v.shotRel)}" onclick="openShot(event, this.dataset.shot)">
          <img src="${escapeHtml(v.shotRel)}" alt="${escapeHtml(v.title)}" loading="lazy" />
        </button>
        <figcaption>
          <div class="shot-title">${escapeHtml(v.title)}</div>
          <div class="shot-meta">${escapeHtml(v.project)} · ${escapeHtml(v.fileRef)}</div>
        </figcaption>
      </figure>`
      )
      .join('');

    const failedDetailLogsHtml = failedViews
      .map(
        (v) => `
      <tr>
        <td class="center">${v.idx}</td>
        <td><span class="project-tag">${escapeHtml(v.project)}</span></td>
        <td class="case-title">${escapeHtml(v.title)}</td>
        <td><code class="file-ref">${escapeHtml(v.failureRef)}</code></td>
        <td><pre class="err-pre">${escapeHtml(v.message || '-')}</pre></td>
      </tr>`
      )
      .join('');

    const failedReproRowsHtml = failedViews
      .map(
        (v) => `
      <tr>
        <td class="center">${v.idx}</td>
        <td><span class="project-tag">${escapeHtml(v.project)}</span></td>
        <td class="case-title">${escapeHtml(v.title)}</td>
        <td>
          <div class="cmd-wrapper">
            <code class="cmd-code">${escapeHtml(v.reproCmd)}</code>
            <button class="copy-btn" data-cmd="${escapeHtml(v.reproCmd)}" onclick="copyCmd(this.dataset.cmd)" title="복사">📋</button>
          </div>
        </td>
      </tr>`
      )
      .join('');

    const meta = {
      stamp,
      status: runStatus,
      total,
      passed,
      failed,
      skipped,
      flaky,
      failureRate: Number(failureRate),
      finishedAt,
      durationMs,
      durationSec: Math.round(durationMs / 1000),
      avgCaseDurationMs,
      maxCaseDurationMs,
      outputFolder: this.outputFolder,
    };

    const indexReportRel = fs.existsSync(path.join(latestDir, 'index.html')) ? 'index.html' : '';

    const recentRuns = fs
      .readdirSync(runsDir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => path.join(runsDir, d.name, 'meta.json'))
      .filter((p) => fs.existsSync(p))
      .map((p) => {
        try {
          return JSON.parse(fs.readFileSync(p, 'utf-8'));
        } catch {
          return null;
        }
      })
      .filter(Boolean)
      .filter((m) => m.stamp !== stamp);

    const mergedRuns = [meta, ...recentRuns].sort((a, b) => b.finishedAt - a.finishedAt).slice(0, 12);

    const trendRows = mergedRuns
      .map(
        (m) => `
      <tr>
        <td>${escapeHtml(m.stamp)}</td>
        <td class="center"><span class="badge ${m.status === 'passed' ? 'passed' : 'failed'}">${escapeHtml(m.status)}</span></td>
        <td class="center">${m.total}</td>
        <td class="center">${m.failed}</td>
        <td class="center">${m.failureRate}%</td>
      </tr>`
      )
      .join('');

    const statusIcon = runStatus === 'passed' ? '✅' : '❌';
    const statusText = runStatus === 'passed' ? '성공' : '실패';

    const html = `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>QA 테스트 결과 리포트</title>
  <style>
    :root {
      --bg: #f8f9fc;
      --line: #e1e4eb;
      --card: #ffffff;
      --text: #1a202c;
      --sub: #64748b;
      --blue: #3b82f6;
      --blue-light: #dbeafe;
      --red: #ef4444;
      --red-light: #fee2e2;
      --green: #10b981;
      --green-light: #d1fae5;
      --amber: #f59e0b;
      --amber-light: #fef3c7;
      --gray: #6b7280;
      --gray-light: #f3f4f6;
      --shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      --shadow-lg: 0 10px 25px rgba(0, 0, 0, 0.15);
    }
    
    * { box-sizing: border-box; }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans KR", Arial, sans-serif;
      margin: 0;
      background: var(--bg);
      color: var(--text);
      line-height: 1.6;
    }
    
    .wrap {
      max-width: 1660px;
      margin: 0 auto;
      padding: 24px 20px 40px;
    }
    
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 32px 28px;
      border-radius: 16px;
      margin-bottom: 28px;
      box-shadow: var(--shadow-lg);
    }
    
    .header h1 {
      margin: 0 0 8px 0;
      font-size: 32px;
      font-weight: 700;
      display: flex;
      align-items: center;
      gap: 12px;
    }
    
    .header-meta {
      font-size: 15px;
      opacity: 0.95;
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
      margin-top: 12px;
    }
    
    .header-meta-item {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    
    .status-badge-large {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: rgba(255, 255, 255, 0.2);
      padding: 8px 16px;
      border-radius: 24px;
      font-weight: 600;
      font-size: 16px;
    }
    
    .guide {
      display: grid;
      grid-template-columns: 1.5fr 1fr;
      gap: 16px;
      margin-bottom: 24px;
    }
    
    .guide-box {
      border: 1px solid var(--line);
      border-radius: 14px;
      padding: 20px;
      background: var(--card);
      box-shadow: var(--shadow);
    }
    
    .guide-title {
      font-size: 15px;
      font-weight: 700;
      color: var(--gray);
      margin-bottom: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .guide-desc {
      font-size: 15px;
      line-height: 1.7;
      color: var(--text);
    }
    
    .guide-desc b {
      color: var(--blue);
    }
    
    .actions {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
      margin-top: 16px;
    }
    
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border: 1px solid var(--line);
      border-radius: 10px;
      padding: 10px 16px;
      font-size: 14px;
      font-weight: 600;
      background: var(--card);
      color: var(--text);
      text-decoration: none;
      transition: all 0.2s;
      cursor: pointer;
    }
    
    .btn:hover {
      transform: translateY(-1px);
      box-shadow: var(--shadow);
    }
    
    .btn.primary {
      border-color: var(--blue);
      background: var(--blue);
      color: white;
    }
    
    .btn.primary:hover {
      background: #2563eb;
    }
    
    .stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
      gap: 16px;
      margin-bottom: 28px;
    }
    
    .stat-card {
      border: 1px solid var(--line);
      border-radius: 14px;
      padding: 20px;
      background: var(--card);
      box-shadow: var(--shadow);
      transition: transform 0.2s;
    }
    
    .stat-card:hover {
      transform: translateY(-2px);
    }
    
    .stat-label {
      font-size: 13px;
      font-weight: 600;
      color: var(--sub);
      margin-bottom: 8px;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    
    .stat-value {
      font-size: 36px;
      font-weight: 800;
      line-height: 1;
    }
    
    .stat-value.success { color: var(--green); }
    .stat-value.error { color: var(--red); }
    .stat-value.neutral { color: var(--blue); }
    
    .panel {
      margin-bottom: 24px;
      border: 1px solid var(--line);
      border-radius: 14px;
      padding: 24px;
      background: var(--card);
      box-shadow: var(--shadow);
    }
    
    .panel h2 {
      margin: 0 0 20px 0;
      font-size: 22px;
      font-weight: 700;
      color: var(--text);
      display: flex;
      align-items: center;
      gap: 10px;
    }
    
    .tools {
      display: grid;
      grid-template-columns: 1.5fr 1fr auto;
      gap: 12px;
      margin-bottom: 20px;
    }
    
    input[type="search"],
    select {
      border: 2px solid var(--line);
      border-radius: 10px;
      padding: 12px 14px;
      font-size: 14px;
      font-family: inherit;
      transition: border-color 0.2s;
    }
    
    input[type="search"]:focus,
    select:focus {
      outline: none;
      border-color: var(--blue);
    }
    
    .chip {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
      color: var(--text);
      padding: 8px 12px;
      background: var(--gray-light);
      border-radius: 10px;
      cursor: pointer;
      user-select: none;
    }
    
    .chip input[type="checkbox"] {
      cursor: pointer;
    }
    
    .table-scroll {
      overflow-x: auto;
      margin: 0 -24px;
      padding: 0 24px;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 12px;
      min-width: 1200px;
    }
    
    thead {
      background: var(--gray-light);
    }
    
    th {
      padding: 14px 12px;
      font-size: 13px;
      font-weight: 700;
      text-align: left;
      color: var(--gray);
      text-transform: uppercase;
      letter-spacing: 0.3px;
      border-bottom: 2px solid var(--line);
    }
    
    td {
      padding: 16px 12px;
      font-size: 14px;
      border-bottom: 1px solid var(--line);
      vertical-align: top;
    }
    
    tr:hover {
      background: #f9fafb;
    }
    
    .center {
      text-align: center;
    }

    .duration-col {
      white-space: nowrap;
      min-width: 86px;
      font-variant-numeric: tabular-nums;
    }

    .detail-col {
      white-space: nowrap;
      min-width: 64px;
    }
    
    .project-tag {
      display: inline-block;
      background: var(--blue-light);
      color: var(--blue);
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 600;
    }
    
    .case-title {
      font-weight: 500;
      line-height: 1.5;
    }
    
    .file-ref {
      font-family: ui-monospace, Menlo, Monaco, Consolas, "Courier New", monospace;
      font-size: 12px;
      background: var(--gray-light);
      padding: 3px 6px;
      border-radius: 4px;
      color: var(--gray);
    }
    
    .badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-radius: 20px;
      padding: 5px 12px;
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    
    .badge.failed {
      background: var(--red-light);
      color: var(--red);
    }
    
    .badge.passed {
      background: var(--green-light);
      color: var(--green);
    }
    
    .badge.skipped {
      background: var(--gray-light);
      color: var(--gray);
    }
    
    .badge.unknown {
      background: var(--amber-light);
      color: var(--amber);
    }
    
    .msg {
      max-width: 480px;
    }
    
    details {
      cursor: pointer;
    }
    
    .error-summary {
      color: var(--blue);
      font-weight: 600;
      padding: 6px 0;
      user-select: none;
    }
    
    .error-summary:hover {
      color: #2563eb;
    }
    
    .error-details {
      margin-top: 12px;
      padding: 16px;
      background: #f8fafc;
      border-radius: 8px;
      border: 1px solid var(--line);
    }
    
    .err-kv {
      margin-bottom: 12px;
    }
    
    .err-kv:last-child {
      margin-bottom: 0;
    }
    
    .err-kv strong {
      display: block;
      font-size: 13px;
      color: var(--gray);
      margin-bottom: 6px;
    }
    
    .selector-code {
      display: block;
      white-space: pre-wrap;
      word-break: break-all;
    }
    
    .cmd-wrapper {
      display: flex;
      align-items: center;
      gap: 8px;
      background: white;
      padding: 10px;
      border-radius: 6px;
      border: 1px solid var(--line);
    }
    
    .cmd-code {
      flex: 1;
      font-family: ui-monospace, Menlo, Monaco, Consolas, "Courier New", monospace;
      font-size: 12px;
      word-break: break-all;
      white-space: pre-wrap;
    }
    
    .copy-btn {
      border: none;
      background: var(--blue);
      color: white;
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 16px;
      cursor: pointer;
      transition: all 0.2s;
      flex-shrink: 0;
    }
    
    .copy-btn:hover {
      background: #2563eb;
      transform: scale(1.05);
    }
    
    .copy-btn:active {
      transform: scale(0.95);
    }
    
    .err-pre {
      margin: 0;
      padding: 12px;
      background: white;
      border: 1px solid var(--line);
      border-radius: 6px;
      font-family: ui-monospace, Menlo, Monaco, Consolas, "Courier New", monospace;
      font-size: 12px;
      white-space: pre-wrap;
      word-break: break-word;
      max-height: 280px;
      overflow: auto;
      line-height: 1.5;
    }
    
    a {
      color: var(--blue);
      text-decoration: none;
      font-weight: 600;
    }
    
    a:hover {
      text-decoration: underline;
    }
    
    .btn-link {
      border: none;
      background: transparent;
      color: var(--blue);
      cursor: pointer;
      font-size: 14px;
      font-weight: 600;
      padding: 4px 8px;
      border-radius: 4px;
      transition: background 0.2s;
    }
    
    .btn-link:hover {
      background: var(--blue-light);
    }
    
    .btn-link-mini {
      border: none;
      background: var(--gray-light);
      cursor: pointer;
      font-size: 16px;
      padding: 4px 8px;
      border-radius: 4px;
      transition: all 0.2s;
    }
    
    .btn-link-mini:hover {
      background: var(--blue-light);
      transform: scale(1.1);
    }
    
    .count {
      color: var(--sub);
      font-size: 14px;
      margin-top: 12px;
      font-weight: 600;
    }
    
    .shots {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 16px;
    }
    
    .shot-card {
      margin: 0;
      border: 2px solid var(--line);
      border-radius: 12px;
      overflow: hidden;
      background: white;
      transition: all 0.3s;
    }
    
    .shot-card:hover {
      border-color: var(--blue);
      box-shadow: var(--shadow-lg);
      transform: translateY(-2px);
    }
    
    .shot-btn {
      border: none;
      background: #1a202c;
      width: 100%;
      padding: 0;
      cursor: zoom-in;
      position: relative;
      overflow: hidden;
    }
    
    .shot-btn::after {
      content: '🔍';
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      font-size: 32px;
      opacity: 0;
      transition: opacity 0.3s;
    }
    
    .shot-btn:hover::after {
      opacity: 1;
    }
    
    .shot-btn img {
      width: 100%;
      height: 200px;
      object-fit: cover;
      display: block;
      transition: all 0.3s;
    }
    
    .shot-btn:hover img {
      opacity: 0.6;
      transform: scale(1.05);
    }
    
    .shot-title {
      font-size: 14px;
      font-weight: 600;
      padding: 12px 12px 4px;
      line-height: 1.4;
    }
    
    .shot-meta {
      font-size: 12px;
      color: var(--sub);
      padding: 0 12px 12px;
    }
    
    .empty {
      color: var(--sub);
      font-size: 15px;
      text-align: center;
      padding: 40px 20px;
      background: var(--gray-light);
      border-radius: 8px;
    }
    
    .modal {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.85);
      display: none;
      align-items: center;
      justify-content: center;
      z-index: 9999;
      padding: 20px;
      backdrop-filter: blur(4px);
    }
    
    .modal.show {
      display: flex;
    }
    
    .modal-box {
      position: relative;
      max-width: 95%;
      max-height: 95%;
      animation: modalZoom 0.3s ease-out;
    }
    
    @keyframes modalZoom {
      from {
        transform: scale(0.9);
        opacity: 0;
      }
      to {
        transform: scale(1);
        opacity: 1;
      }
    }
    
    .modal img {
      max-width: 100%;
      max-height: 90vh;
      border-radius: 12px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
    }
    
    .close {
      position: absolute;
      top: -16px;
      right: -16px;
      border: none;
      background: white;
      border-radius: 50%;
      width: 40px;
      height: 40px;
      cursor: pointer;
      font-size: 24px;
      line-height: 1;
      box-shadow: var(--shadow-lg);
      transition: all 0.2s;
    }
    
    .close:hover {
      transform: scale(1.1);
      background: var(--red);
      color: white;
    }
    
    .project-col { min-width: 110px; }
    .case-col { min-width: 300px; }
    .failure-col { min-width: 280px; }
    .error-col { min-width: 400px; }
    
    @media (max-width: 1024px) {
      .guide {
        grid-template-columns: 1fr;
      }
      
      .stats {
        grid-template-columns: repeat(2, 1fr);
      }
      
      .tools {
        grid-template-columns: 1fr;
      }
      
      .shots {
        grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      }
    }
    
    @media (max-width: 640px) {
      .wrap {
        padding: 16px 12px 32px;
      }
      
      .header {
        padding: 24px 20px;
      }
      
      .header h1 {
        font-size: 24px;
      }
      
      .stats {
        grid-template-columns: 1fr;
      }
    }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="header">
      <h1>
        ${statusIcon} QA 자동화 테스트 결과
        <span class="status-badge-large">${statusText}</span>
      </h1>
      <div class="header-meta">
        <div class="header-meta-item">📅 실행시각: ${escapeHtml(stamp)}</div>
        <div class="header-meta-item">⏱️ 소요시간: ${escapeHtml(formatDuration(durationMs))}</div>
      </div>
    </div>

    <div class="guide">
      <div class="guide-box">
        <div class="guide-title">📋 확인 가이드</div>
        <div class="guide-desc">
          <b>1단계:</b> 실패율이 0%면 배포 가능합니다.<br/>
          <b>2단계:</b> 실패가 있다면 아래 <b>실패 케이스</b>에서 스크린샷과 Trace를 먼저 확인하세요.<br/>
          <b>3단계:</b> 전체 케이스 목록에서 각 테스트의 수행시간과 실패 지점을 검토하세요.
        </div>
        <div class="actions">
          ${indexReportRel ? `<a class="btn primary" href="${escapeHtml(indexReportRel)}" target="_blank">📊 Playwright 상세 리포트</a>` : ''}
          <a class="btn" href="./qa-summary.meta.json" target="_blank">💾 JSON 다운로드</a>
        </div>
      </div>
      <div class="guide-box">
        <div class="guide-title">📁 저장 위치</div>
        <div class="guide-desc">
          <b>현재 실행:</b><br/>
          reports/qa/latest/artifacts/${escapeHtml(stamp)}<br/><br/>
          <b>과거 이력:</b><br/>
          reports/qa/runs/
        </div>
      </div>
    </div>

    <div class="stats">
      <div class="stat-card">
        <div class="stat-label">총 케이스 수</div>
        <div class="stat-value neutral">${total}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">✅ 성공</div>
        <div class="stat-value success">${passed}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">❌ 실패</div>
        <div class="stat-value error">${failed}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">📊 실패율</div>
        <div class="stat-value error">${failureRate}%</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">⏱️ 전체 수행시간</div>
        <div class="stat-value neutral" style="font-size: 20px;">${escapeHtml(formatDuration(durationMs))}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">⏱️ 평균 케이스 시간</div>
        <div class="stat-value neutral" style="font-size: 20px;">${escapeHtml(formatDuration(avgCaseDurationMs))}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">⏱️ 최대 케이스 시간</div>
        <div class="stat-value neutral" style="font-size: 20px;">${escapeHtml(formatDuration(maxCaseDurationMs))}</div>
      </div>
    </div>

    <div class="panel">
      <h2>❌ 실패 케이스 (${failed}건)</h2>
      <div class="tools">
        <input id="searchInput" type="search" placeholder="🔍 케이스명이나 에러 메시지로 검색하기" />
        <select id="projectFilter">
          <option value="">전체 프로젝트</option>
          ${projectOptionsHtml}
        </select>
      </div>
      <div class="table-scroll">
        <table>
          <thead>
            <tr>
              <th class="center">#</th>
              <th>프로젝트</th>
              <th>테스트 케이스</th>
              <th>테스트 파일</th>
              <th class="center">상태</th>
              <th class="center">소요시간</th>
              <th>에러 정보</th>
              <th class="center">스크린샷</th>
              <th class="center">Trace</th>
            </tr>
          </thead>
          <tbody id="failBody">
            ${failRowsHtml || '<tr><td colspan="9" class="empty">✅ 실패한 케이스가 없습니다!</td></tr>'}
          </tbody>
        </table>
      </div>
      <div class="count" id="visibleCount">표시: ${failed} / ${failed}</div>
    </div>

    <div class="panel">
      <h2>📋 전체 케이스 목록 (${total}건)</h2>
      <div class="table-scroll">
        <table>
          <thead>
            <tr>
              <th class="center">#</th>
              <th>프로젝트</th>
              <th>테스트 케이스</th>
              <th class="center">상태</th>
              <th class="center">소요시간</th>
              <th>실패 지점</th>
              <th>에러 요약</th>
              <th class="center detail-col">상세</th>
            </tr>
          </thead>
          <tbody>
            ${allRowsHtml || '<tr><td colspan="8" class="empty">데이터가 없습니다.</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>

    <div class="panel">
      <h2>📝 실패 상세 로그</h2>
      <div class="table-scroll">
        <table>
          <thead>
            <tr>
              <th class="center">#</th>
              <th>프로젝트</th>
              <th>테스트 케이스</th>
              <th>실패 지점</th>
              <th>에러 메시지</th>
            </tr>
          </thead>
          <tbody>
            ${failedDetailLogsHtml || '<tr><td colspan="5" class="empty">실패 로그가 없습니다.</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>

    <div class="panel">
      <h2>🔄 실패 케이스 재실행 명령어</h2>
      <div class="table-scroll">
        <table>
          <thead>
            <tr>
              <th class="center">#</th>
              <th>프로젝트</th>
              <th>테스트 케이스</th>
              <th>재실행 커맨드</th>
            </tr>
          </thead>
          <tbody>
            ${failedReproRowsHtml || '<tr><td colspan="4" class="empty">재실행할 케이스가 없습니다.</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>

    <div class="panel">
      <h2>📸 실패 스크린샷 갤러리</h2>
      <div class="shots">
        ${shotGalleryHtml || '<div class="empty">💡 실패 스크린샷이 없습니다.</div>'}
      </div>
    </div>

    <div id="shotModal" class="modal" onclick="closeShot()">
      <div class="modal-box" onclick="event.stopPropagation()">
        <button class="close" onclick="closeShot()" aria-label="닫기">✕</button>
        <img id="shotModalImg" src="" alt="스크린샷 미리보기" />
      </div>
    </div>
  </div>

  <script>
    const searchInput = document.getElementById('searchInput');
    const projectFilter = document.getElementById('projectFilter');
    const rows = Array.from(document.querySelectorAll('tr[data-fail-row]'));
    const visibleCount = document.getElementById('visibleCount');
    const galleries = Array.from(document.querySelectorAll('.shot-card'));

    function normalize(v) {
      return String(v || '').toLowerCase();
    }

    function applyFilter() {
      const keyword = normalize(searchInput.value).trim();
      const project = projectFilter.value;
      let shown = 0;

      rows.forEach((row) => {
        const rowProject = row.dataset.project || '';
        const txt = normalize(row.dataset.text);
        const okKeyword = !keyword || txt.includes(keyword);
        const okProject = !project || rowProject === project;
        const ok = okKeyword && okProject;
        row.style.display = ok ? '' : 'none';
        if (ok) shown += 1;
      });

      galleries.forEach((card) => {
        const cardProject = card.dataset.project || '';
        const okProject = !project || cardProject === project;
        card.style.display = okProject ? '' : 'none';
      });

      if (visibleCount) {
        visibleCount.textContent = '표시: ' + shown + ' / ' + rows.length;
      }
    }

    function openShot(event, src) {
      if (event) event.preventDefault();
      if (!src) return;
      const modal = document.getElementById('shotModal');
      const img = document.getElementById('shotModalImg');
      img.src = src;
      modal.classList.add('show');
      document.body.style.overflow = 'hidden';
    }

    function closeShot() {
      const modal = document.getElementById('shotModal');
      const img = document.getElementById('shotModalImg');
      modal.classList.remove('show');
      img.src = '';
      document.body.style.overflow = '';
    }

    async function copyCmd(text) {
      const value = String(text || '');
      if (!value) return;
      try {
        await navigator.clipboard.writeText(value);
        // 복사 성공 피드백
        const btn = event.target;
        const originalText = btn.textContent;
        btn.textContent = '✓';
        btn.style.background = 'var(--green)';
        setTimeout(() => {
          btn.textContent = originalText;
          btn.style.background = 'var(--blue)';
        }, 1000);
      } catch {
        window.prompt('아래 명령어를 복사하세요:', value);
      }
    }

    searchInput?.addEventListener('input', applyFilter);
    projectFilter?.addEventListener('change', applyFilter);
    
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') closeShot();
    });

    applyFilter();

    window.openShot = openShot;
    window.closeShot = closeShot;
    window.copyCmd = copyCmd;
  </script>
</body>
</html>`;

    fs.writeFileSync(path.join(latestDir, 'qa-summary.html'), html, 'utf-8');
    fs.writeFileSync(path.join(latestDir, 'qa-summary.meta.json'), JSON.stringify(meta, null, 2), 'utf-8');
    fs.writeFileSync(path.join(runDir, 'meta.json'), JSON.stringify(meta, null, 2), 'utf-8');

    try {
      fs.cpSync(latestDir, runDir, { recursive: true, force: true });
    } catch (e) {
      console.warn('[qa-summary] archive copy failed:', e?.message || e);
    }

    console.log(`\n✅ QA Summary Report generated: ${path.join(latestDir, 'qa-summary.html')}\n`);
  }
}

module.exports = QASummaryReporter;
