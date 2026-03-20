// tests/qaTest/shared/selectors/ios.ts
export const iosSelectors = {
    // AI Layer 진입 버튼
    aiLayerBtn: `//XCUIElementTypeButton[@name="MY"]`,

    // AI Layer 전체 Ai 추천 메뉴 (진입 확인용)
    aiAssert: `//XCUIElementTypeOther[@name="메뉴선택"]`,

    // AI Layer 화면 닫기 버튼
    aiCloseBtn: `//XCUIElementTypeButton[@name="서비스 종료"]`,

    // 다음 슬라이드 이동
    nextSlideBtn: `//XCUIElementTypeButton[@name="다음 슬라이드로 이동"]`,

    // 2번째 슬라이드 '자세히 보기' -> Type2 상세보기 화면 이동
    slide2DetailBtn: `//XCUIElementTypeButton[@name="자세히보기"]`,

    // Type2 상세보기 화면 진입 확인
    type2Assert: `//XCUIElementTypeStaticText[@name="상세보기"]`,

    // Type2 스크롤링 확인
    type2Scroll: `//XCUIElementTypeStaticText[@name="T가족모아데이터"]`,

    // Type2 핸들바 영역 컨테이너
    type2Handle: ``,

    // Type2 상세보기 화면 닫기
    type2Close: `(//XCUIElementTypeButton[@name="닫기"])[2]`,

    // Type1 MY 보관함 버튼 (즐겨찾기)
    type1My: `//XCUIElementTypeLink[@name="보관함 열기 MY"]`,

    // Type1 my 화면 진입 확인 (히스토리)
    type1Assert: `//XCUIElementTypeStaticText[@name="히스토리"]`,

    // Type1 스크롤 앵커 (전체 버튼)
    type1Scroll: `//XCUIElementTypeOther[@name="히스토리 채널 선택"]`,

    // Type1 my 화면 닫기 (뒤로가기 버튼)
    type1Close: `//XCUIElementTypeButton[@name="이전 페이지"]`,

    // Type5 진입 버튼
    type5Gate: `//XCUIElementTypeButton[@name="T 월드 최근 데이터 사용이 달라졌다면 잔여량을 확인해 보세요"]`,

    // Type5 진입 확인 - 중단 자세히 보기
    type5DetailBtn: `//XCUIElementTypeStaticText[@name="자세히 보기"]`,

    // Type5 화면 닫기
    type5Close: `(//XCUIElementTypeButton[@name="닫기"])[2]`,
} as const;

export type IOSSelectorKey = keyof typeof iosSelectors;
export type IOSSelectors = typeof iosSelectors;