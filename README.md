# Playwright Mobile QA

`Playwright + WebdriverIO + Appium` 기반의 모바일 QA 자동화 프로젝트입니다.

## 1) 환경 준비

### 필수
- Node.js 18+
- npm
- Appium 2.x
- iOS: Xcode / WebDriverAgent 실행 가능한 상태
- Android: Android SDK / `adb` 사용 가능 상태

### 의존성 설치
```bash
cd /Users/p214425/automation/playwright
npm install
```

## 2) 기본 단말/포트 설정

현재 기본값:
- iOS 1 (`qa-ios`)
  - UDID: `00008140-001C09881E80801C` (iPhone 16 Pro)
  - Appium: `127.0.0.1:4724`
  - WDA: `8102`
- iOS 2 (`qa-ios-2`)
  - UDID: `00008030-0009316A2EDA802E` (iPhone 11 Pro)
  - Appium: `127.0.0.1:4725`
  - WDA: `8103`
- AOS (`qa-aos`)
  - UDID: `R3CX60JDSMP`
  - Appium: `127.0.0.1:4723`

관련 파일:
- `appium/ios/env.ios.ts`
- `appium/aos/env.aos.ts`
- `qa.config.ts`

## 3) Appium 서버 실행 예시

### iOS 1
```bash
appium --address 127.0.0.1 --port 4724 --base-path / --log-level info
```

### iOS 2
```bash
appium --address 127.0.0.1 --port 4725 --base-path / --log-level info
```

### Android
```bash
appium --address 127.0.0.1 --port 4723 --base-path / --log-level info
```

## 4) 테스트 실행

### 전체 QA
```bash
npm run test:qa
```

### 프로젝트별 실행
```bash
# iOS 1
npx playwright test -c qa.config.ts --project=qa-ios

# iOS 2
npx playwright test -c qa.config.ts --project=qa-ios-2

# Android
npx playwright test -c qa.config.ts --project=qa-aos
```

### 특정 파일만 실행
```bash
npx playwright test tests/qa/ios/ios-native-stg.spec.ts -c qa.config.ts --project=qa-ios
```

### 특정 케이스(제목)만 실행
```bash
npx playwright test tests/qa/ios/ios-native-stg.spec.ts -c qa.config.ts --project=qa-ios-2 -g "Native iOS 045"
```

## 5) 리포트

```bash
# QA 리포트 열기
npm run report:qa
```

기본 경로:
- 테스트 결과: `test-output/test-results/qa`
- HTML 리포트: `test-output/reports/qa/latest`

## 6) 자주 쓰는 환경변수

### iOS 재시도 횟수
```bash
QA_IOS_RETRIES=1 npx playwright test -c qa.config.ts --project=qa-ios
```

### iOS 2 강제 활성화 / 비활성화
```bash
# 강제 활성화
QA_IOS2_FORCE=1 npx playwright test -c qa.config.ts --project=qa-ios-2

# 비활성화
QA_IOS2_DISABLE=1 npx playwright test -c qa.config.ts --project=qa-ios
```

### iOS 단말 UDID 일회성 변경
```bash
IOS_UDID_1=<UDID> npx playwright test -c qa.config.ts --project=qa-ios
IOS_UDID_2=<UDID> npx playwright test -c qa.config.ts --project=qa-ios-2
```

## 7) 문제 해결

### `qa-ios-2 자동 비활성화 (udid=...)` 로그
- `qa.config.ts`에서 2번 단말 연결 여부를 자동 확인합니다.
- 해결:
  1. 단말 연결 확인 (`xcrun xcdevice list`)
  2. Appium 4725 포트 기동 확인
  3. 필요 시 `QA_IOS2_FORCE=1` 사용

### `App with bundle identifier ... unknown`
- 앱이 단말에 설치되어 있지 않거나, `bundleId`가 실제 앱과 다를 때 발생합니다.
- 해결:
  1. 단말 앱 설치 상태 확인
  2. 테스트별 `test.use({ bundleId: ... })` 값 확인
  3. 환경 파일의 기본 bundleId 확인

