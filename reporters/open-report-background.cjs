const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');

class OpenReportBackgroundReporter {
  constructor(options = {}) {
    this.outputFolder = options.outputFolder || 'test-output/reports/latest';
  }

  async onEnd() {
    if (process.env.CI) return;
    if (process.platform !== 'darwin') return;
    // 필요 시 명시적으로 비활성화
    if (process.env.PW_NO_BG_REPORT === '1') return;

    const reportIndex = path.resolve(process.cwd(), this.outputFolder, 'index.html');
    if (!fs.existsSync(reportIndex)) return;

    const reportUrl = `file://${reportIndex.replace(/ /g, '%20')}`;
    const reportPrefix = `file://${path.dirname(reportIndex).replace(/ /g, '%20')}/`;

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

if chromeRunning then
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

  if not reportTabUpdated then
    do shell script "open -g -a \\"Google Chrome\\" " & quoted form of reportUrl
  end if
else
  do shell script "open -g -a \\"Google Chrome\\" " & quoted form of reportUrl
end if

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
