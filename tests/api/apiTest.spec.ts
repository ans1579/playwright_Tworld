import { test, expect, type Response } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

// 캡처 1건(= 응답 1개)을 CSV 한 줄로 저장하기 위한 구조
type PacketRow = {
  stepNo: number;
  stepName: string;
  ts: string;
  method: string;
  url: string;
  status: number;
  reqHeaders: Record<string, string>;
  reqBody?: string;
  resHeaders: Record<string, string>;
  resBodyPreview?: string;
};

const MOWEB_PATH = '/shop/main?referrer=';
const NOISE_KEYWORDS = ['collect', 'gtm', 'analytics', 'doubleclick', 'beacon', 'events'];

// 광고/통계성 호출은 분석 대상에서 제외
function isNoiseUrl(url: string): boolean {
  const lower = url.toLowerCase();
  return NOISE_KEYWORDS.some((k) => lower.includes(k));
}

// CSV 셀 크기를 과도하게 키우지 않도록 본문 일부만 저장
function cut(text: string, max = 4000): string {
  return text.length > max ? `${text.slice(0, max)} ...(truncated)` : text;
}

// CSV 규칙(따옴표/콤마/줄바꿈) 안전하게 처리
function csvCell(v: unknown): string {
  const s = String(v ?? '');
  return `"${s.replace(/"/g, '""')}"`;
}

// 테스트 중 쌓은 packets 배열을 CSV 텍스트로 변환
function toCsv(rows: PacketRow[]): string {
  const header = [
    'stepNo',
    'stepName',
    'ts',
    'method',
    'url',
    'status',
    'reqBody',
    'resBodyPreview',
    'reqHeaders',
    'resHeaders',
  ];

  const lines = rows.map((r) =>
    [
      r.stepNo,
      r.stepName,
      r.ts,
      r.method,
      r.url,
      r.status,
      r.reqBody ?? '',
      r.resBodyPreview ?? '',
      JSON.stringify(r.reqHeaders ?? {}),
      JSON.stringify(r.resHeaders ?? {}),
    ]
      .map(csvCell)
      .join(',')
  );

  // BOM is added so Excel opens Korean text correctly.
  return `\uFEFF${header.map(csvCell).join(',')}\n${lines.join('\n')}`;
}

test('moweb order packet capture to csv', async ({ page, baseURL }, testInfo) => {
  const packets: PacketRow[] = [];
  // 현재 사용자가 어느 화면 단계에 있는지(패킷에 태깅할 값)
  let currentStepNo = 0;
  let currentStepName = 'landing';

  // 네트워크 응답을 실시간 수집해서 현재 단계(stepNo/stepName)와 함께 기록
  page.on('response', async (res: Response) => {
    try {
      const req = res.request();
      const type = req.resourceType();
      // 문서/이미지 제외, 비즈니스 API가 주로 발생하는 xhr/fetch만 수집
      if (type !== 'xhr' && type !== 'fetch') return;

      const url = req.url();
      if (isNoiseUrl(url)) return;

      const resHeaders = res.headers();
      const contentType = (resHeaders['content-type'] ?? '').toLowerCase();

      let resBodyPreview = '';
      // 응답 본문은 JSON/TEXT만 미리보기 형태로 저장
      if (contentType.includes('application/json') || contentType.includes('text')) {
        try {
          resBodyPreview = cut(await res.text());
        } catch {
          resBodyPreview = '[read-failed]';
        }
      }

      packets.push({
        stepNo: currentStepNo,
        stepName: currentStepName,
        ts: new Date().toISOString(),
        method: req.method(),
        url,
        status: res.status(),
        reqHeaders: req.headers(),
        reqBody: req.postData() ?? '',
        resHeaders,
        resBodyPreview,
      });
    } catch {}
  });

  try {
    // API_BASE_URL 미지정 시 STG moweb 기본값 사용
    await page.goto(`${baseURL ?? 'https://stg.m.shop.tworld.co.kr'}${MOWEB_PATH}`, {
      waitUntil: 'domcontentloaded',
    });

    // 아래 step 블록들은 "실제 클릭/입력 동작"을 넣는 자리
    // 핵심은 각 블록 시작 시 currentStepNo/currentStepName을 먼저 갱신하는 것
    // 그래야 해당 구간에서 발생한 API가 정확히 그 단계로 태깅됨
    await test.step('1. 5G 휴대폰 클릭', async () => {
      currentStepNo = 1;
      currentStepName = '5G 휴대폰 클릭';

      await page.click(`//a[contains(@class,'link-block') and contains(@href,'categoryId=20010014') and normalize-space(.)='휴대폰']`, { timeout: 10000 });
    });

    await test.step('2. 구매할 단말 선택', async () => {
      currentStepNo = 2;
      currentStepName = '구매할 단말 선택';

      await page.click(`//div[contains(@class,'cont-area')][.//span[contains(@class,'device') and normalize-space(.)='갤럭시 S26 울트라']]`, { timeout: 10000 });
    });

    await test.step('3. 다음 클릭 및 기기변경 -> 다음 클릭', async () => {
      currentStepNo = 3;
      currentStepName = '다음 클릭 및 기기변경 -> 다음 클릭';
      await page.click(`//button[@id='showEntryPopup' and not(contains(@style,'display: none'))]`);
      
      await page.click(`//li[@data-entry-cd='11' and @data-entry-nm='신규가입']`);
      
      await page.click(`//button[@id='detailNextStepBtn' and normalize-space(.)='다음']`);
      
      await page.click(`//button[@id='nextBtn' and normalize-space(.)='다음']`);

      await page.click(`//input[@type='checkbox' and @id='chkAddCautionInfo']`);

      await page.click(`//button[@id='addCautionInfoDetailOkBtn' and normalize-space(.)='확인했어요']`);

      await page.click(`//button[@id='addCautionInfoNextBtn' and normalize-space(.)='다음']`);

      await page.click(`//button[@id='btnNextStep' and normalize-space(.)='다음']`);

      await page.click(`//button[@id='btnNextStep' and normalize-space(.)='다음']`);

      await page.click(`//button[@id='moveNextStepBtn' and normalize-space(.)='다음']`);

      await page.click(`//div[contains(@class,'swiper-slide-active') and contains(@class,'tdaGiftSlide')]`);

      await page.click(`(//button[@type='button' and contains(@class,'btnNextStep') and normalize-space(.)='다음'])[1]`);

      await page.click(`(//button[@type='button' and contains(@class,'btnNextStep') and normalize-space(.)='다음'])[1]`);

      await page.click(`//button[@id='giftNextStepBtn' and normalize-space(.)='다음']`);
    });

    await test.step('4. 본인인증 입력', async () => {
      currentStepNo = 4;
      currentStepName = '본인인증 입력';
      await page.fill(`//input[@id='custNm']`, `문지훈`);
      await page.waitForTimeout(1000);
      await page.click(`//button[@id='com_name_NextStep' and normalize-space(.)='다음']`);
      await page.waitForTimeout(1000);
      await page.fill(`//input[@id='ctzBizNum1' and @placeholder='생년월일 6자리']`, ``);
      await page.waitForTimeout(1000);
      await page.fill(`//input[@id='_ctzBizNum2' and @placeholder='뒷번호 7자리']`, '');
    });

    await test.step('5. 본인 확인 및 다음 클릭', async () => {
      currentStepNo = 5;
      currentStepName = '본인 확인 및 다음 클릭';
      await page.click(`//button[@name='selectBtn' and @data-val='true' and normalize-space(.)='네, 맞아요.']`);
      await page.waitForTimeout(1000);
      await page.click(`//button[@id='chg_self_confirm_NextStep' and normalize-space(.)='다음']`);
    });

    await test.step('6. 휴대폰 번호 입력', async () => {
      currentStepNo = 6;
      currentStepName = '번호 입력';
      await page.fill(`//input[@id='userPhoneNumtext']`, '01083081597');
      await page.waitForTimeout(1000);
      await page.click(`//button[@id='com_mobile_num_NextStep' and normalize-space(.)='다음']`);
    });

    await test.step('7. run identity check or skip', async () => {
      currentStepNo = 7;
      currentStepName = 'identity check or skip';
      // TODO
    });

    await test.step('8. select plan', async () => {
      currentStepNo = 8;
      currentStepName = 'select plan';
      // TODO
    });

    await test.step('9. select benefit', async () => {
      currentStepNo = 9;
      currentStepName = 'select benefit';
      // TODO
    });

    await test.step('10. select contract', async () => {
      currentStepNo = 10;
      currentStepName = 'select contract';
      // TODO
    });

    await test.step('11. final identity check', async () => {
      currentStepNo = 11;
      currentStepName = 'final identity check';
      // TODO
    });

    await test.step('12. payment', async () => {
      currentStepNo = 12;
      currentStepName = 'payment';
      // TODO
      // 예시: 결제 완료 후 화면 검증
      // await expect(page.locator('text=Order complete')).toBeVisible();
    });

    // 최소 검증: 캡처가 0건이면 흐름 자체가 동작하지 않은 상태
    expect(packets.length).toBeGreaterThan(0);
  } finally {
    // 실패해도 CSV는 항상 남겨서 원인 분석에 활용할 수 있게 한다.
    const csv = toCsv(packets);
    const csvPath = testInfo.outputPath('packet-capture.csv');
    await writeFile(csvPath, csv, 'utf-8');
    await testInfo.attach('packet-capture.csv', { path: csvPath, contentType: 'text/csv' });

    // report 폴더에도 최신 CSV를 고정 경로로 복사해 빠르게 열 수 있게 한다.
    const reportCsvPath = path.resolve(process.cwd(), 'test-output/reports/api/latest/packet-capture-latest.csv');
    await mkdir(path.dirname(reportCsvPath), { recursive: true });
    await writeFile(reportCsvPath, csv, 'utf-8');
  }
});
