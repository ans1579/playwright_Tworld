const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');

class OpenReportBackgroundReporter {
  constructor(options = {}) {
    this.outputFolder = options.outputFolder || 'test-output/reports/qa/latest';
  }

  async onEnd() {
    if (process.env.CI) return;
    if (process.platform !== 'darwin') return;
    // 필요 시 명시적으로 비활성화
    if (process.env.PW_NO_BG_REPORT === '1') return;

    const reportDir = path.resolve(process.cwd(), this.outputFolder);
    const preferred = [
      path.join(reportDir, 'qa-summary.html'),
      path.join(reportDir, 'index.html'),
    ];
    const reportFile = preferred.find((p) => fs.existsSync(p));
    if (!reportFile) return;

    const reportUrl = `file://${reportFile.replace(/ /g, '%20')}`;
    const reportPrefix = `file://${path.dirname(reportFile).replace(/ /g, '%20')}/`;

    // 요구사항:
    // 1) 리포트 탭이 있으면 그 탭 URL만 갱신
    // 2) 없으면 백그라운드로만 1회 오픈 (탭 증식 최소화)
    // 3) 기존 포그라운드 앱 복원 시도
    const script = `
set reportUrl to "${reportUrl}"
set reportPrefix to "${reportPrefix}"
set previousFrontApp to ""

tell application "System Events"
  try
    set previousFrontApp to name of first application process whose frontmost is true
  end try
  set chromeRunning to exists (processes where name is "Google Chrome")
end tell

on updateExistingReportTab(reportUrl, reportPrefix)
  set reportTabUpdated to false
  tell application "Google Chrome"
    repeat with w in windows
      repeat with t in tabs of w
        try
          set tabUrl to URL of t
          if tabUrl starts with reportPrefix then
            set URL of t to reportUrl
            set reportTabUpdated to true
            exit repeat
          end if
        end try
      end repeat
      if reportTabUpdated then exit repeat
    end repeat
  end tell
  return reportTabUpdated
end updateExistingReportTab

if chromeRunning then
  set reportTabUpdated to my updateExistingReportTab(reportUrl, reportPrefix)

  -- 바로 새 탭을 열지 않고, 잠깐 대기 후 한번 더 기존 탭 탐색
  if not reportTabUpdated then
    delay 0.2
    set reportTabUpdated to my updateExistingReportTab(reportUrl, reportPrefix)
  end if

  if not reportTabUpdated then
    do shell script "open -g -a \\"Google Chrome\\" " & quoted form of reportUrl
  end if
else
  do shell script "open -g -a \\"Google Chrome\\" " & quoted form of reportUrl
end if

-- 혹시라도 포커스를 가져갔으면 복원 시도
if previousFrontApp is not "" then
  delay 0.05
  try
    tell application previousFrontApp to activate
  end try
end if
`;

    const child = spawn('osascript', ['-e', script], {
      detached: true,
      stdio: 'ignore',
    });
    child.unref();
  }
}

module.exports = OpenReportBackgroundReporter;
