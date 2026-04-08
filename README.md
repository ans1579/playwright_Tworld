# Playwright 모바일 QA 실행 가이드 (테스터용)

이 문서는 `playwright` 폴더를 전달받은 테스터가 **코드 수정 없이** 직접 테스트를 실행하고 리포트를 확인할 수 있도록 만든 매뉴얼입니다.

## 1. 이 문서로 할 수 있는 것
1. Android / iOS QA 테스트 실행
2. 특정 파일(stg1~4)만 실행
3. 특정 케이스만 재실행
4. HTML 리포트 확인
5. 시연용 Android 화면 송출(`scrcpy`)

## 2. 처음 1회만 준비
### 2-1. 필수 프로그램
1. Node.js
2. npm
3. Appium
4. Android 테스트 시: Android SDK(`adb`)
5. iOS 테스트 시: Xcode

### 2-2. 권장 버전(검증 완료)
1. Node.js: `24.13.1`
2. npm: `11.11.0`
3. Appium CLI: `3.2.0`

버전 확인:
```bash
cd /Users/p214425/automation/playwright
npm run env:versions
```

### 2-3. 의존성 설치
```bash
cd /Users/p214425/automation/playwright
npm install
```

## 3. 매번 실행 전 체크
### 3-1. 단말 연결 확인
Android:
```bash
adb devices
```

iOS:
```bash
xcrun xcdevice list
```

### 3-2. Appium 서버 실행
Android(Appium 4723):
```bash
appium --allow-insecure '*:chromedriver_autodownload,*:adb_shell' --address 127.0.0.1 --port 4723 --base-path / --log-level info
```

iOS-1(Appium 4724):
```bash
appium --address 127.0.0.1 --port 4724 --base-path / --log-level info
```

iOS-2(Appium 4725, 필요 시):
```bash
appium --address 127.0.0.1 --port 4725 --base-path / --log-level info
```

## 4. 빠른 시작 (Android 시연 기준)
터미널을 2~3개 열고 아래 순서로 실행하면 됩니다.

터미널 1: Appium
```bash
appium --allow-insecure '*:chromedriver_autodownload,*:adb_shell' --address 127.0.0.1 --port 4723 --base-path / --log-level info
```

터미널 2: 화면 송출(선택)
```bash
scrcpy -s R3CX60JDSMP --max-fps=30 --video-bit-rate=8M --max-size=1280 --stay-awake
```

터미널 3: 테스트 실행
```bash
cd /Users/p214425/automation/playwright
npm run test:qa:aos
```

## 5. 테스트 실행 명령어 (복붙용)
작업 경로:
```bash
cd /Users/p214425/automation/playwright
```

전체 QA:
```bash
npm run test:qa
```

Android 전체:
```bash
npm run test:qa:aos
```

iOS(1번 단말) 전체:
```bash
npm run test:qa:ios
```

iOS(2번 단말) 전체:
```bash
npm run test:qa:ios2
```

AOS stg1~4만:
```bash
npx playwright test \
  tests/qa/aos/aos-native-stg1.spec.ts \
  tests/qa/aos/aos-native-stg2.spec.ts \
  tests/qa/aos/aos-native-stg3.spec.ts \
  tests/qa/aos/aos-native-stg4.spec.ts \
  -c qa.config.ts --project=qa-aos
```

iOS stg1~4만:
```bash
npx playwright test \
  tests/qa/ios/ios-native-stg1.spec.ts \
  tests/qa/ios/ios-native-stg2.spec.ts \
  tests/qa/ios/ios-native-stg3.spec.ts \
  tests/qa/ios/ios-native-stg4.spec.ts \
  -c qa.config.ts --project=qa-ios
```

특정 테스트 1개만(`-g`):
```bash
npx playwright test tests/qa/aos/aos-native-stg4.spec.ts -c qa.config.ts --project=qa-aos -g "Native AOS 071"
```

## 6. 리포트 확인
```bash
npm run report:qa
```

결과 파일 위치:
1. 실행 결과: `test-output/test-results/qa`
2. HTML 리포트: `test-output/reports/qa/latest`

## 7. 실패 케이스만 다시 실행
리포트에서 실패한 테스트 제목을 복사해서 `-g`로 재실행:
```bash
npx playwright test tests/qa/aos/aos-native-stg3.spec.ts -c qa.config.ts --project=qa-aos -g "Native AOS 064"
```

## 8. 자주 나는 오류와 해결
### 8-1. `adb: device not found`
```bash
adb kill-server
adb start-server
adb devices
```

### 8-2. `Project(s) "qa-ios-2" not found`
2번 iOS 단말이 자동 비활성화된 상태입니다.
```bash
QA_IOS2_FORCE=1 npx playwright test -c qa.config.ts --project=qa-ios-2
```

### 8-3. `Unknown device or simulator UDID`
```bash
xcrun xcdevice list
IOS_UDID_1=<실제_UDID> npx playwright test -c qa.config.ts --project=qa-ios
```

### 8-4. Appium 세션 오류(`session terminated`, `socket hang up`)
1. 현재 실행 중인 테스트 중지 (`Ctrl + C`)
2. Appium 재시작
3. 단말 재연결 확인(`adb devices`)
4. 실패한 파일/케이스만 재실행

## 9. 운영 원칙 (중요)
1. 테스트 실행자는 `.spec.ts` 파일을 수정하지 않습니다.
2. 기본적으로 이 문서의 명령어만 사용합니다.
3. 오류 공유 시 아래 3가지를 함께 전달하면 가장 빠르게 대응됩니다.
   - 실행 명령어
   - 에러 로그
   - 단말 정보(기종/UDID)

## 10. 향후 계획: 8대 병렬(iOS 4 + AOS 4) 운영
현재 기본 설정은 단일 AOS + iOS 중심으로 작성되어 있습니다.  
향후 8대 병렬 운영 시에는 아래 구조로 확장하면 안정적입니다.

1. 단말별 Appium 포트를 분리합니다.
   - 예시: `aos-1~4 = 4723, 4733, 4743, 4753`
   - 예시: `ios-1~4 = 4724, 4725, 4726, 4727`
2. iOS는 단말별 `wdaLocalPort`도 모두 다르게 설정합니다.
3. `qa.config.ts`에 단말별 프로젝트를 분리합니다.
   - 예시: `qa-aos-1`, `qa-aos-2`, `qa-aos-3`, `qa-aos-4`
   - 예시: `qa-ios-1`, `qa-ios-2`, `qa-ios-3`, `qa-ios-4`
4. 병렬 실행 시 `workers`를 단말 수와 맞춥니다.
   - 예시: `QA_WORKERS=8`
5. Appium 로그를 단말별 파일로 분리 저장합니다.
   - 장애 분석 속도가 크게 좋아집니다.

참고: 8대 병렬은 리소스(CPU/메모리/USB 허브 품질)에 민감하므로, 도입 시 먼저 2대→4대→8대 순서로 점진 확대를 권장합니다.
