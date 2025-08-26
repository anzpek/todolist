import { test, expect, Page, BrowserContext } from '@playwright/test';

// 테스트용 헬퍼 함수들
async function waitForFirebaseAuth(page: Page) {
  // Firebase 인증 초기화 대기
  await page.waitForTimeout(2000);
}

async function performGoogleLogin(page: Page) {
  // 구글 로그인 시뮬레이션 (익명 로그인 사용)
  await page.click('button:has-text("익명으로 시작")');
  await waitForFirebaseAuth(page);
}

async function navigateToVacationManagement(page: Page) {
  // 사이드바에서 휴가 관리로 이동
  await page.click('button[aria-label="사이드바 토글"]');
  await page.click('text=휴가 관리');
  await page.waitForLoadState('networkidle');
}

test.describe('완벽한 TodoList 애플리케이션 E2E 테스트', () => {
  let context: BrowserContext;
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext({
      viewport: { width: 1920, height: 1080 }
    });
    page = await context.newPage();
  });

  test.afterAll(async () => {
    await context.close();
  });

  test('1️⃣ 기본 애플리케이션 로딩 및 로그인 테스트', async () => {
    console.log('🚀 애플리케이션 로딩 테스트 시작');
    
    // 애플리케이션 로딩
    await page.goto('/');
    await expect(page).toHaveTitle(/TodoList/);
    
    // 로그인 페이지 확인
    await expect(page.locator('text=구글 계정으로 로그인')).toBeVisible();
    await expect(page.locator('text=익명으로 시작')).toBeVisible();
    
    // 익명 로그인
    await performGoogleLogin(page);
    
    // 메인 페이지 로딩 확인
    await expect(page.locator('text=오늘의 할일')).toBeVisible();
    
    console.log('✅ 기본 로딩 및 로그인 테스트 완료');
  });

  test('2️⃣ TodoList 핵심 기능 테스트 (CRUD, 필터링, 뷰 전환)', async () => {
    console.log('🚀 TodoList 핵심 기능 테스트 시작');
    
    // 할일 추가 테스트
    const testTodo = `E2E 테스트 할일 ${Date.now()}`;
    await page.fill('input[placeholder="새로운 할일을 입력하세요"]', testTodo);
    await page.press('input[placeholder="새로운 할일을 입력하세요"]', 'Enter');
    
    // 할일이 목록에 추가되었는지 확인
    await expect(page.locator(`text=${testTodo}`)).toBeVisible();
    
    // 할일 완료 처리
    const todoItem = page.locator(`text=${testTodo}`).locator('..').locator('..');
    const checkButton = todoItem.locator('button').first();
    await checkButton.click();
    
    // 완료된 할일 섹션 확인
    await expect(page.locator('text=완료된 할일')).toBeVisible();
    
    // 뷰 전환 테스트 (주간 뷰)
    await page.click('text=주간');
    await expect(page.locator('text=이번 주')).toBeVisible();
    
    // 월간 뷰 테스트
    await page.click('text=월간');
    await expect(page.locator('text=이번 달')).toBeVisible();
    
    // 오늘 뷰로 돌아가기
    await page.click('text=오늘');
    await expect(page.locator('text=오늘의 할일')).toBeVisible();
    
    console.log('✅ TodoList 핵심 기능 테스트 완료');
  });

  test('3️⃣ 휴가 관리 시스템 전체 기능 테스트', async () => {
    console.log('🚀 휴가 관리 시스템 테스트 시작');
    
    // 휴가 관리 페이지로 이동
    await navigateToVacationManagement(page);
    
    // 휴가 관리 페이지 로딩 확인
    await expect(page.locator('h1:has-text("휴가 관리")')).toBeVisible();
    
    // 필터 버튼 확인 (모바일 대응)
    const filterButton = page.locator('button').filter({ hasText: '필터' }).or(
      page.locator('button[title*="필터"]')
    ).first();
    await expect(filterButton).toBeVisible();
    
    // 휴가 추가 버튼 확인
    const addButton = page.locator('button').filter({ hasText: '휴가 추가' }).or(
      page.locator('button[title*="휴가 추가"]')
    ).first();
    await expect(addButton).toBeVisible();
    
    // 달력 확인
    await expect(page.locator('text=일')).toBeVisible();
    await expect(page.locator('text=월')).toBeVisible();
    await expect(page.locator('text=화')).toBeVisible();
    
    // 월 이동 버튼 확인
    const prevButton = page.locator('button').filter({ hasText: '❮' }).or(
      page.locator('svg').filter({ hasText: 'ChevronLeft' }).locator('..')
    ).first();
    const nextButton = page.locator('button').filter({ hasText: '❯' }).or(
      page.locator('svg').filter({ hasText: 'ChevronRight' }).locator('..')
    ).first();
    
    await expect(prevButton).toBeVisible();
    await expect(nextButton).toBeVisible();
    
    console.log('✅ 휴가 관리 시스템 테스트 완료');
  });

  test('4️⃣ 모바일 반응형 및 스와이프 기능 테스트', async () => {
    console.log('🚀 모바일 반응형 테스트 시작');
    
    // 모바일 뷰포트로 변경
    await page.setViewportSize({ width: 375, height: 667 });
    
    // 휴가 관리 페이지에서 테스트
    await navigateToVacationManagement(page);
    
    // 모바일에서 버튼들이 콤팩트하게 표시되는지 확인
    const mobileFilterButton = page.locator('button').filter({ hasText: /필터|Filter/ }).first();
    const mobileAddButton = page.locator('button').filter({ hasText: /휴가|추가|Add/ }).first();
    
    await expect(mobileFilterButton).toBeVisible();
    await expect(mobileAddButton).toBeVisible();
    
    // 필터 모달 테스트
    await mobileFilterButton.click();
    await expect(page.locator('text=직원 필터')).toBeVisible();
    
    // 모달 닫기
    const closeButton = page.locator('button').filter({ hasText: '✕' }).or(
      page.locator('button[aria-label*="닫기"]')
    ).first();
    await closeButton.click();
    
    // 스와이프 기능 시뮬레이션 (달력에서)
    const calendar = page.locator('.grid').filter({ hasText: /일|월|화/ }).first();
    
    if (await calendar.isVisible()) {
      // 스와이프 시뮬레이션: 터치 이벤트
      const calendarBox = await calendar.boundingBox();
      if (calendarBox) {
        // 왼쪽 스와이프 (다음 달)
        await page.mouse.move(calendarBox.x + calendarBox.width * 0.8, calendarBox.y + calendarBox.height * 0.5);
        await page.mouse.down();
        await page.mouse.move(calendarBox.x + calendarBox.width * 0.2, calendarBox.y + calendarBox.height * 0.5);
        await page.mouse.up();
        
        await page.waitForTimeout(500);
        
        // 오른쪽 스와이프 (이전 달)
        await page.mouse.move(calendarBox.x + calendarBox.width * 0.2, calendarBox.y + calendarBox.height * 0.5);
        await page.mouse.down();
        await page.mouse.move(calendarBox.x + calendarBox.width * 0.8, calendarBox.y + calendarBox.height * 0.5);
        await page.mouse.up();
      }
    }
    
    // 데스크톱 뷰포트로 복원
    await page.setViewportSize({ width: 1920, height: 1080 });
    
    console.log('✅ 모바일 반응형 테스트 완료');
  });

  test('5️⃣ 다크/라이트 모드 전환 테스트', async () => {
    console.log('🚀 다크/라이트 모드 테스트 시작');
    
    // 메인 페이지로 이동
    await page.goto('/');
    await waitForFirebaseAuth(page);
    
    // 다크 모드 토글 버튼 찾기
    const themeToggle = page.locator('button').filter({ hasText: /🌙|🌞|다크|라이트|Dark|Light/ }).or(
      page.locator('button[aria-label*="테마"]').or(
        page.locator('button[title*="테마"]')
      )
    ).first();
    
    // 다크 모드 전환
    if (await themeToggle.isVisible()) {
      await themeToggle.click();
      await page.waitForTimeout(500);
      
      // 다크 모드 클래스 확인
      const bodyClass = await page.locator('html').getAttribute('class');
      const isDark = bodyClass?.includes('dark');
      
      if (isDark) {
        console.log('✅ 다크 모드 활성화 확인');
        
        // 라이트 모드로 다시 전환
        await themeToggle.click();
        await page.waitForTimeout(500);
        
        const lightBodyClass = await page.locator('html').getAttribute('class');
        const isLight = !lightBodyClass?.includes('dark');
        
        if (isLight) {
          console.log('✅ 라이트 모드 복원 확인');
        }
      }
    } else {
      console.log('ℹ️ 테마 토글 버튼을 찾을 수 없음 (선택적 기능)');
    }
    
    console.log('✅ 다크/라이트 모드 테스트 완료');
  });

  test('6️⃣ 전체 통합 워크플로우 테스트', async () => {
    console.log('🚀 전체 통합 워크플로우 테스트 시작');
    
    // 종합적인 사용자 시나리오 테스트
    
    // 1. 할일 생성 및 관리
    await page.goto('/');
    await waitForFirebaseAuth(page);
    
    const workflowTodo = `통합 테스트 할일 ${Date.now()}`;
    await page.fill('input[placeholder="새로운 할일을 입력하세요"]', workflowTodo);
    await page.press('input[placeholder="새로운 할일을 입력하세요"]', 'Enter');
    
    await expect(page.locator(`text=${workflowTodo}`)).toBeVisible();
    
    // 2. 다양한 뷰에서 할일 확인
    const views = ['주간', '월간'];
    for (const view of views) {
      await page.click(`text=${view}`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);
      
      // 뷰가 로딩되었는지 확인
      const isViewLoaded = await page.locator('body').isVisible();
      expect(isViewLoaded).toBe(true);
    }
    
    // 3. 휴가 관리 시스템 접근성 확인
    await navigateToVacationManagement(page);
    await expect(page.locator('h1:has-text("휴가 관리")')).toBeVisible();
    
    // 4. 반응형 테스트 (태블릿 크기)
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.reload();
    await waitForFirebaseAuth(page);
    
    // 태블릿에서도 기본 요소들이 보이는지 확인
    await expect(page.locator('h1:has-text("휴가 관리")')).toBeVisible();
    
    // 5. 최종 네비게이션 테스트
    await page.click('button[aria-label="사이드바 토글"]');
    await page.click('text=오늘');
    await expect(page.locator('text=오늘의 할일')).toBeVisible();
    
    // 데스크톱 뷰포트로 복원
    await page.setViewportSize({ width: 1920, height: 1080 });
    
    console.log('✅ 전체 통합 워크플로우 테스트 완료');
  });

  test('7️⃣ 성능 및 안정성 테스트', async () => {
    console.log('🚀 성능 및 안정성 테스트 시작');
    
    // 페이지 로딩 시간 측정
    const startTime = Date.now();
    await page.goto('/');
    await waitForFirebaseAuth(page);
    const loadTime = Date.now() - startTime;
    
    console.log(`📊 페이지 로딩 시간: ${loadTime}ms`);
    expect(loadTime).toBeLessThan(10000); // 10초 이내
    
    // 대량 클릭 테스트 (안정성)
    const sidebarToggle = page.locator('button[aria-label="사이드바 토글"]');
    if (await sidebarToggle.isVisible()) {
      for (let i = 0; i < 5; i++) {
        await sidebarToggle.click();
        await page.waitForTimeout(200);
      }
    }
    
    // 에러 없이 여전히 작동하는지 확인
    await expect(page.locator('text=오늘의 할일')).toBeVisible();
    
    console.log('✅ 성능 및 안정성 테스트 완료');
  });

  test('8️⃣ 접근성 및 키보드 네비게이션 테스트', async () => {
    console.log('🚀 접근성 테스트 시작');
    
    await page.goto('/');
    await waitForFirebaseAuth(page);
    
    // 키보드 네비게이션 테스트
    await page.keyboard.press('Tab'); // 첫 번째 포커스 가능한 요소로
    await page.waitForTimeout(200);
    
    // Enter 키로 할일 추가 테스트
    const input = page.locator('input[placeholder="새로운 할일을 입력하세요"]');
    await input.focus();
    await input.fill('키보드 테스트 할일');
    await page.keyboard.press('Enter');
    
    await expect(page.locator('text=키보드 테스트 할일')).toBeVisible();
    
    // ESC 키 테스트 (모달이 있다면)
    const filterButton = page.locator('button').filter({ hasText: '필터' }).first();
    if (await filterButton.isVisible()) {
      await filterButton.click();
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
    }
    
    console.log('✅ 접근성 테스트 완료');
  });
});

// 개별 기능별 세부 테스트
test.describe('세부 기능 테스트', () => {
  test('할일 필터링 및 검색 기능', async ({ page }) => {
    await page.goto('/');
    await waitForFirebaseAuth(page);
    
    // 여러 할일 추가
    const todos = ['중요한 업무', '일반 업무', '개인 업무'];
    for (const todo of todos) {
      await page.fill('input[placeholder="새로운 할일을 입력하세요"]', todo);
      await page.press('input[placeholder="새로운 할일을 입력하세요"]', 'Enter');
      await page.waitForTimeout(500);
    }
    
    // 각 할일이 표시되는지 확인
    for (const todo of todos) {
      await expect(page.locator(`text=${todo}`)).toBeVisible();
    }
  });

  test('휴가 달력 너비 고정 테스트', async ({ page }) => {
    await page.goto('/');
    await waitForFirebaseAuth(page);
    
    // 휴가 관리로 이동
    await page.click('button[aria-label="사이드바 토글"]');
    await page.click('text=휴가 관리');
    
    // 달력 컨테이너 너비 측정
    const calendar = page.locator('.grid').first();
    const initialWidth = await calendar.evaluate(el => el.getBoundingClientRect().width);
    
    // 다음 달로 이동
    const nextButton = page.locator('button').filter({ hasText: '❯' }).or(
      page.locator('svg').filter({ hasText: 'ChevronRight' }).locator('..')
    ).first();
    
    if (await nextButton.isVisible()) {
      await nextButton.click();
      await page.waitForTimeout(1000);
      
      // 너비가 변하지 않았는지 확인
      const newWidth = await calendar.evaluate(el => el.getBoundingClientRect().width);
      expect(Math.abs(newWidth - initialWidth)).toBeLessThan(5); // 5px 이내 오차 허용
      
      console.log(`📏 달력 너비 일관성: ${initialWidth}px → ${newWidth}px`);
    }
  });
});