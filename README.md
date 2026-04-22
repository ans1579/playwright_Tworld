# Playwright 모바일 QA 실행 가이드 (완전 초보자용)

이 문서는 **처음 세팅하는 사람도 그대로 따라 하면 실행**되도록 작성했습니다.
현재 저장소 코드 기준(2026-04-16)으로 정리했습니다.

---

## 1. 프로젝트 개요

이 저장소는 다음 테스트를 실행합니다.

1. 모바일 네이티브 QA 테스트
2. Android(Appium + UiAutomator2)
3. iOS(Appium + XCUITest)
4. Playwright 리포트/트레이스 수집

테스트 파일 위치:

- Android QA: `tests/qa/aos/*`
- iOS QA: `tests/qa/ios/*`

---

## 2. 필수 설치 (최초 1회)

## 2-1. OS 권장

- Android QA: Windows 10/11, macOS 모두 가능
- iOS QA: macOS 필수

## 2-2. Node / npm

이 프로젝트 고정 버전:

- Node.js: `24.13.1`
- npm: `11.11.0`

Node 설치 방식(`nvm`, Homebrew, 공식 pkg)은 환경마다 달라서,
이 단계도 **인터넷 검색 후 직접 설치**를 권장합니다.

추천 검색 키워드:

1. `mac nvm 설치`
2. `node 24 설치 mac`
3. `npm permission denied mac`

설치 후 확인:

```bash
node -v
npm -v
```

프로젝트로 이동:

```bash
cd <repo-root>/playwright
```

의존성 설치:

```bash
npm ci
```

`npm ci`가 실패하면:

```bash
npm install
```

## 2-3. Playwright 설치

패키지는 이미 `devDependencies`에 있으므로 `npm ci`로 설치됩니다.
브라우저 설치가 필요한 경우에만 추가 실행:

```bash
npx playwright install
```

## 2-4. Appium 설치

사내 PC 권한/전역 npm 정책에 따라 설치 방식이 달라질 수 있습니다.
이 경우에도 **인터넷 검색 후 직접 설치**를 권장합니다.

추천 검색 키워드:

1. `appium 3 설치`
2. `npm global install permission denied 해결`
3. `appium uiautomator2 xcuitest driver install`

Appium CLI 설치 (권장: Appium 3.x, 현재 검증 버전 3.3.0):

```bash
npm i -g appium@3.3.0
```

드라이버 설치:

```bash
appium driver install uiautomator2
appium driver install xcuitest
```

설치 확인:

```bash
appium driver list --installed
appium -v
```

## 2-5. Android 필수 도구

1. Android SDK (adb 포함)
2. USB 디버깅 ON

이 부분은 PC/OS 환경마다 설치 경로가 달라서 **인터넷 검색 후 직접 설치**가 가장 안전합니다.

추천 검색 키워드:

1. `mac android sdk adb 설치`
2. `android studio command line tools 설치`
3. `adb 환경변수 설정 mac`

확인:

```bash
adb devices
```

## 2-6. iOS 필수 도구

1. Xcode 설치
2. Developer Mode ON (기기)
3. 기기 신뢰(Trust) 허용

이 부분도 macOS/Xcode 버전에 따라 화면 경로가 달라서 **인터넷 검색 후 직접 설치/설정**을 권장합니다.

추천 검색 키워드:

1. `xcode command line tools 설치`
2. `iphone developer mode 켜기`
3. `ios device trust this computer`

확인:

```bash
xcrun xcdevice list
```

## 2-7. 버전 일괄 확인

```bash
npm run env:versions
```

## 2-8. 설치 난이도 높은 항목은 이렇게 처리

아래 항목은 회사 PC 정책/OS 버전/권한 문제로 절차가 자주 달라집니다.
문서에 억지로 고정하지 말고, 아래 원칙으로 진행하세요.

1. 검색으로 최신 설치 방법 확인
2. 설치 후 이 README의 검증 명령으로 정상 동작 확인
3. 동작 안 되면 에러 로그 그대로 공유

직접 검색 설치 대상:

1. Android Studio / Android SDK / adb
2. Xcode / iOS Developer Mode / iOS 실기기 인증
3. Appium 글로벌 설치 권한 이슈(npm global 권한)

---

## 3. 이 프로젝트의 기본 포트/단말 설정

코드 기준 기본값:

### Android (`appium/aos/env.aos.ts`)

- UDID 1: `R3CX60JDSMP`
- UDID 2: `R39WB004NRY`
- Appium: `5001`, `5002`, `5003`, `5004`

### iOS (`appium/ios/env.ios.ts` + `qa.config.ts`)

- UDID 1: `00008140-001C09881E80801C`
- UDID 2: `00008030-0009316A2EDA802E`
- Bundle ID: `com.sktelecom.miniTworld.ad.stg`
- Appium: `5005`, `5006`
- WDA: `8102`, `8103`

원하면 환경변수로 덮어쓸 수 있습니다.

예시:

```bash
ANDROID_UDID_1=<내_안드_UDID> IOS_UDID_1=<내_아이폰_UDID> npm run test:qa
```

---

## 4. Appium 서버 실행 방법 (중요)

테스트 전에 **해당 포트의 Appium 서버를 먼저 실행**해야 합니다.

## 4-1. Android 서버

Android 1번 단말 (5001):

```bash
appium --allow-insecure '*:chromedriver_autodownload,*:adb_shell' --address 127.0.0.1 --port 5001 --base-path / --log-level info
```

Android 2번 단말 (5002):

```bash
appium --allow-insecure '*:chromedriver_autodownload,*:adb_shell' --address 127.0.0.1 --port 5002 --base-path / --log-level info
```

## 4-2. iOS 서버

iOS 1번 단말 (5005):

```bash
appium --address 127.0.0.1 --port 5005 --base-path / --log-level info
```

iOS 2번 단말 (5006):

```bash
appium --address 127.0.0.1 --port 5006 --base-path / --log-level info
```

팁:

1. 포트당 터미널 1개를 열어서 유지하세요.
2. 테스트 중 서버 터미널을 닫으면 세션이 바로 죽습니다.

---

## 5. 가장 쉬운 실행 순서

## 5-1. Android 1대만 실행

터미널 1:

```bash
appium --allow-insecure '*:chromedriver_autodownload,*:adb_shell' --address 127.0.0.1 --port 5001 --base-path / --log-level info
```

터미널 2:

```bash
cd <repo-root>/playwright
npm run test:qa:aos
```

## 5-2. Android 2대 병렬 실행

터미널 1:

```bash
appium --allow-insecure '*:chromedriver_autodownload,*:adb_shell' --address 127.0.0.1 --port 5001 --base-path / --log-level info
```

터미널 2:

```bash
appium --allow-insecure '*:chromedriver_autodownload,*:adb_shell' --address 127.0.0.1 --port 5002 --base-path / --log-level info
```

터미널 3:

```bash
cd <repo-root>/playwright
npm run test:qa:aos:2
```

## 5-3. iOS 1대 실행

터미널 1:

```bash
appium --address 127.0.0.1 --port 5005 --base-path / --log-level info
```

터미널 2:

```bash
cd <repo-root>/playwright
npm run test:qa:ios
```

## 5-4. iOS 2번 단말 단독 실행

터미널 1:

```bash
appium --address 127.0.0.1 --port 5006 --base-path / --log-level info
```

터미널 2:

```bash
cd <repo-root>/playwright
npm run test:qa:ios2
```

---

## 6. 자주 쓰는 명령어

작업 경로:

```bash
cd <repo-root>/playwright
```

전체 QA:

```bash
npm run test:qa
```

Android QA 전체:

```bash
npm run test:qa:aos
```

Android 2대 병렬 QA:

```bash
npm run test:qa:aos:2
```

iOS QA(1번):

```bash
npm run test:qa:ios
```

iOS QA(2번 강제):

```bash
npm run test:qa:ios2
```

AOS stg1~4만:

```bash
npx playwright test tests/qa/aos/aos-native-stg1.spec.ts tests/qa/aos/aos-native-stg2.spec.ts tests/qa/aos/aos-native-stg3.spec.ts tests/qa/aos/aos-native-stg4.spec.ts -c qa.config.ts --project=qa-aos
```

iOS stg1~4만:

```bash
npx playwright test tests/qa/ios/ios-native-stg1.spec.ts tests/qa/ios/ios-native-stg2.spec.ts tests/qa/ios/ios-native-stg3.spec.ts tests/qa/ios/ios-native-stg4.spec.ts -c qa.config.ts --project=qa-ios
```

특정 케이스만 실행 (`-g`):

```bash
npx playwright test tests/qa/aos/aos-native-stg4.spec.ts -c qa.config.ts --project=qa-aos -g "Native AOS 080"
```

---

## 7. 리포트/결과 확인

실행 후 리포트 열기:

```bash
npm run report:qa
```

결과 위치:

1. 테스트 산출물: `test-output/test-results/qa`
2. HTML 리포트: `test-output/reports/qa/latest`

트레이스 열기:

```bash
npx playwright show-trace <trace.zip 경로>
```

---

## 8. 자주 나는 오류와 해결

## 8-1. `adb: device not found`

```bash
adb kill-server
adb start-server
adb devices
```

## 8-2. `qa-ios-2 자동 비활성화`

2번 iOS 단말이 연결되지 않았거나 UDID 불일치입니다.
강제로 실행하려면:

```bash
QA_IOS2_FORCE=1 npx playwright test -c qa.config.ts --project=qa-ios-2
```

Windows PowerShell:

```powershell
$env:QA_IOS2_FORCE='1'; npx playwright test -c qa.config.ts --project=qa-ios-2
```

## 8-3. `세션 create 타임아웃(...)`

1. Appium 서버 포트가 맞는지 확인 (`5001/5002/5005/5006`)
2. 해당 단말 연결 상태 확인 (`adb devices`, `xcrun xcdevice list`)
3. Appium 서버 재시작
4. 실패 케이스만 `-g`로 재실행
5. iOS는 아래 환경변수로 타임아웃을 완화해서 재시도

```bash
IOS_APPIUM_SESSION_CREATE_TIMEOUT_MS=240000 IOS_APPIUM_CONNECTION_RETRY_TIMEOUT=180000 IOS_APPIUM_CONNECTION_RETRY_COUNT=2 npx playwright test tests/qa/ios/ios-native-stg4.spec.ts -c qa.config.ts --project=qa-ios-2 -g "Native iOS 073|Native iOS 074"
```

Windows PowerShell:

```powershell
$env:IOS_APPIUM_SESSION_CREATE_TIMEOUT_MS='240000'; $env:IOS_APPIUM_CONNECTION_RETRY_TIMEOUT='180000'; $env:IOS_APPIUM_CONNECTION_RETRY_COUNT='2'; npx playwright test tests/qa/ios/ios-native-stg4.spec.ts -c qa.config.ts --project=qa-ios-2 -g "Native iOS 073|Native iOS 074"
```

## 8-4. `A session is either terminated or not started`

1. 단말 화면이 잠기지 않았는지 확인
2. Appium 서버 로그에서 직전 에러 확인
3. 서버 재시작 후 재실행

## 8-5. `npm warn Unknown cli config "--project"`

`npm run` 뒤 옵션 전달 시 `--`를 넣어야 합니다.

```bash
npm run test:qa -- --project=qa-aos
```

---

## 9. 병렬 운영 팁

1. Appium 서버는 단말 수만큼 포트 분리
2. `systemPort`, `mjpegServerPort`, `chromedriverPorts` 충돌 금지
3. 처음에는 1대 안정화 후 2대, 4대로 확장
4. 장애 분석 시 Appium 로그와 Playwright trace를 같이 확인

---

## 10. 팀 운영 규칙 권장

1. 실행 담당자는 테스트 코드 수정 없이 실행/리포트만 담당
2. 실패 공유 시 아래 3개를 같이 전달
3. 실행 명령어
4. Appium 로그 마지막 200줄
5. trace.zip 경로
