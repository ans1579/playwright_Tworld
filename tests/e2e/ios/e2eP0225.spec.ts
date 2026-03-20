import { test, expect } from '@appium/fixtures.ios' 
import { measureE2E } from '@utils/e2eMetrics'
import { IOS_BUNDLE_ID } from '@appium/ios/env.ios'
import { commonRun } from 'flows/common';
import { waitDisplayed } from 'flows/_actions';
import { safeClick } from '@tests/_shared/actions/ui';

const RUNS = 10;

test('E2E iOS: 공지사항 클릭 -> 진입 확인', async({ driverManager }, testInfo) => {
    const stepTimeoutMs = 60_000;
    const uiTimeoutMs = 12_000;
    const endTimeoutMs = 20_000;

    const result = await measureE2E(
        testInfo,
        {
            runs: RUNS,
            stepTimeoutMs,
            title: 'E2E iOS 02.25',
            attachName: 'e2e_iOS_02_25.txt',
            csvFormat: 'simple',
        },
        async (_runIndex, { stepTimeoutMs }) => {
            let driver = await driverManager.ensureAlive();

            const ctx = {
                driver,
                stepTimeoutMs,
                recover: async () => {
                    try { await driver.terminateApp(IOS_BUNDLE_ID); } catch {}
                    await driver.activateApp(IOS_BUNDLE_ID);
                },
            };
            await commonRun(ctx, async () => {
                await ctx.recover?.();

                // 메뉴 클릭
                await safeClick(driver, '//XCUIElementTypeButton[@name="main.header.menu"]', {timeoutMs: uiTimeoutMs });
                // 공지 사항 버튼이 화면에 보이면 준비
                await waitDisplayed(driver, '//XCUIElementTypeButton[@name="공지사항"]', { timeoutMs: uiTimeoutMs });
            });

            // 측정 시작(클릭부터 진입 확인까지)
            return {
                measure: async () => {
                    await safeClick(driver, '//XCUIElementTypeButton[@name="공지사항"]', { timeoutMs: uiTimeoutMs });
                    await waitDisplayed(driver, '//XCUIElementTypeStaticText[@name="T ID 고객센터에서 알려드립니다."]', { timeoutMs: endTimeoutMs });
                },
            };
        }
    );
    expect(result.successes.length).toBe(RUNS);
})
