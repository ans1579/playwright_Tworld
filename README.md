# Playwright 모바일 QA 실행 가이드 (비개발자용)

이 문서는 **코드 수정 없이 테스트 실행/리포트 확인**만 할 수 있도록 만든 매뉴얼입니다.

## 1. 이 가이드로 할 수 있는 것
- iOS / Android QA 테스트 실행
- 특정 파일(예: stg1~4)만 실행
- 실패 케이스 재실행
- HTML 리포트 확인

## 2. 사전 준비 (최초 1회)
### 2-1. 필수 설치
- Node.js 18+
- npm
- Appium 2.x
- iOS 테스트 시: Xcode 설치
- AOS 테스트 시: Android SDK + `adb`

### 2-2. 의존성 설치
```bash
cd /Users/p214425/automation/playwright
npm install
```

## 3. 단말 연결 확인
### iOS
```bash
xcrun xcdevice list
```

### Android
```bash
adb devices
```

## 4. Appium 서버 실행
테스트 전에 Appium 서버를 먼저 실행합니다.

### 4-1. AOS (포트 4723)
```bash
appium --allow-insecure '*:chromedriver_autodownload,*:adb_shell' --address 127.0.0.1 --port 4723 --base-path / --log-level info
```

### 4-2. iOS 1번 단말 (포트 4724)
```bash
appium --address 127.0.0.1 --port 4724 --base-path / --log-level info
```

### 4-3. iOS 2번 단말 (포트 4725, 필요 시)
```bash
appium --address 127.0.0.1 --port 4725 --base-path / --log-level info
```

## 5. 테스트 실행 (복붙용)
작업 경로:
```bash
cd /Users/p214425/automation/playwright
```

### 5-1. 전체 QA
```bash
npm run test:qa
```

### 5-2. 플랫폼별 실행
```bash
# iOS (1번 단말)
npx playwright test -c qa.config.ts --project=qa-ios

# iOS (2번 단말)
npx playwright test -c qa.config.ts --project=qa-ios-2

# Android
npx playwright test -c qa.config.ts --project=qa-aos
```

### 5-3. iOS STG 1~4 파일만 실행
```bash
npx playwright test \
  tests/qa/ios/ios-native-stg1.spec.ts \
  tests/qa/ios/ios-native-stg2.spec.ts \
  tests/qa/ios/ios-native-stg3.spec.ts \
  tests/qa/ios/ios-native-stg4.spec.ts \
  -c qa.config.ts --project=qa-ios
```

### 5-4. AOS STG 1~4 파일만 실행
```bash
npx playwright test \
  tests/qa/aos/aos-native-stg1.spec.ts \
  tests/qa/aos/aos-native-stg2.spec.ts \
  tests/qa/aos/aos-native-stg3.spec.ts \
  tests/qa/aos/aos-native-stg4.spec.ts \
  -c qa.config.ts --project=qa-aos
```

### 5-5. 특정 케이스 1개만 실행 (`-g`)
```bash
npx playwright test tests/qa/ios/ios-native-stg3.spec.ts -c qa.config.ts --project=qa-ios -g "Native iOS 061"
```

## 6. 리포트 확인
```bash
npm run report:qa
```

리포트 경로:
- 결과: `test-output/test-results/qa`
- HTML: `test-output/reports/qa/latest`

## 7. 실패 케이스만 다시 돌릴 때
### 방법 A (권장): 케이스 제목으로 재실행
리포트에서 실패한 테스트 제목 확인 후 `-g`로 재실행:
```bash
npx playwright test tests/qa/aos/aos-native-stg4.spec.ts -c qa.config.ts --project=qa-aos -g "Native AOS 074"
```

### 방법 B: 파일 단위 재실행
```bash
npx playwright test tests/qa/aos/aos-native-stg4.spec.ts -c qa.config.ts --project=qa-aos
```

## 8. 자주 발생하는 오류 / 빠른 해결
### 8-1. `Project(s) "qa-ios-2" not found`
- 2번 iOS 단말이 자동 비활성화된 상태입니다.
- 해결:
  1. 단말 연결 확인 (`xcrun xcdevice list`)
  2. Appium 4725 실행 확인
  3. 필요 시 강제 활성화:
```bash
QA_IOS2_FORCE=1 npx playwright test -c qa.config.ts --project=qa-ios-2
```

### 8-2. `Unknown device or simulator UDID`
- UDID가 실제 연결 단말과 다릅니다.
- 해결:
  - `xcrun xcdevice list`에서 UDID 확인
  - 일회성 UDID 지정 후 실행:
```bash
IOS_UDID_1=<실제_UDID> npx playwright test -c qa.config.ts --project=qa-ios
```

### 8-3. `adb: device not found`
- Android 단말 연결 불안정입니다.
- 해결:
```bash
adb kill-server
adb start-server
adb devices
```

## 9. 이 문서 기준 운영 원칙
- 테스트 실행자는 **테스트 파일(.spec.ts) 수정하지 않음**
- 기본적으로 아래 명령만 사용:
  - `npm run test:qa`
  - `npx playwright test ...`
  - `npm run report:qa`

---
문제 재현이 어려우면, 실패 로그 + 실행 커맨드 + 단말 정보(UDID/기종)를 같이 전달하면 가장 빨리 원인 파악할 수 있습니다.
