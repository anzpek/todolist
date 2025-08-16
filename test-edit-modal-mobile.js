import { chromium } from 'playwright';

async function testEditModalMobile() {
  console.log('🚀 모바일 EditTodoModal 테스트 시작...');
  
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 375, height: 667 }, // iPhone SE 크기
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  
  const page = await context.newPage();
  
  try {
    console.log('📱 앱 로딩 중...');
    await page.goto('http://localhost:4000/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // 뷰포트 크기 확인 및 강제 모바일 모드 활성화
    await page.evaluate(() => {
      console.log('Current viewport:', window.innerWidth, 'x', window.innerHeight);
      // 여러 번 리사이즈 이벤트 발생
      for (let i = 0; i < 3; i++) {
        window.dispatchEvent(new Event('resize'));
      }
    });
    await page.waitForTimeout(1000);

    // 모바일 뷰인지 확인
    const viewportInfo = await page.evaluate(() => ({
      width: window.innerWidth,
      height: window.innerHeight,
      isMobile: window.innerWidth < 768
    }));
    console.log(`📱 뷰포트: ${viewportInfo.width}x${viewportInfo.height}, 모바일: ${viewportInfo.isMobile}`);

    // 월간 뷰로 이동
    console.log('📅 월간 뷰로 이동...');
    
    // 사이드바가 열려있는지 확인하고 월간 뷰 클릭
    const sidebarItems = await page.locator('nav .flex.items-center.justify-between').allTextContents();
    console.log('사이드바 항목들:', sidebarItems);
    
    // 이번 달 할일 버튼 클릭 (실제 텍스트 사용)
    try {
      await page.click('text=한달');
    } catch {
      try {
        // 메뉴 버튼 클릭 후 사이드바에서 선택
        await page.click('button[class*="hover:bg-gray-100"]:has(svg)'); // 햄버거 메뉴
        await page.waitForTimeout(500);
        await page.click('text=한달');
      } catch {
        console.log('월간 뷰 버튼을 찾을 수 없어 기본 뷰를 사용합니다.');
      }
    }
    await page.waitForTimeout(1000);

    // 기존 할일이 있는지 확인하고, 없으면 할일 추가
    const existingTodos = await page.locator('.grid-cols-7 .cursor-pointer[style*="bg-"]').count();
    console.log(`📝 기존 할일 개수: ${existingTodos}`);

    if (existingTodos === 0) {
      console.log('➕ 테스트용 할일 추가 중...');
      
      // 모바일 FAB 버튼 찾기 (여러 방법 시도)
      let fabFound = false;
      try {
        // FAB 버튼이 있는지 확인
        const fabButton = page.locator('button.fixed.bottom-6.right-6');
        if (await fabButton.isVisible()) {
          await fabButton.click();
          fabFound = true;
          console.log('✅ 모바일 FAB 버튼 클릭됨');
        }
      } catch {}

      if (!fabFound) {
        try {
          // 헤더의 할일 추가 버튼 클릭
          await page.click('button:has-text("할일 추가"), button:has(svg):not([class*="Menu"])');
          fabFound = true;
          console.log('✅ 헤더 할일 추가 버튼 클릭됨');
        } catch {}
      }

      if (!fabFound) {
        console.log('❌ 할일 추가 버튼을 찾을 수 없습니다.');
        return;
      }
      
      await page.waitForTimeout(500);
      
      // 할일 정보 입력
      await page.fill('input[placeholder*="할일을 입력"]', '모바일 모달 테스트 할일');
      await page.click('button:has-text("추가")');
      await page.waitForTimeout(1000);
    }

    // 구글 스타일 색상 바 클릭하여 EditTodoModal 열기
    console.log('🎯 구글 스타일 색상 바 클릭...');
    const colorBars = page.locator('.grid-cols-7 .h-1.rounded-full.cursor-pointer');
    const barCount = await colorBars.count();
    console.log(`🎨 색상 바 개수: ${barCount}`);

    if (barCount > 0) {
      await colorBars.first().click();
      await page.waitForTimeout(500);

      // EditTodoModal이 열렸는지 확인
      const modal = page.locator('[class*="fixed inset-0"]').filter({ hasText: '할일 수정' });
      const isModalOpen = await modal.isVisible();
      console.log(`📝 EditTodoModal 열림: ${isModalOpen}`);

      if (isModalOpen) {
        // 모바일에서 전체화면인지 확인
        const modalElement = modal.locator('> div').first();
        const modalStyles = await modalElement.evaluate(el => {
          const rect = el.getBoundingClientRect();
          const styles = window.getComputedStyle(el);
          return {
            width: rect.width,
            height: rect.height,
            borderRadius: styles.borderRadius,
            windowWidth: window.innerWidth,
            windowHeight: window.innerHeight,
            hasFullscreen: rect.width === window.innerWidth && rect.height === window.innerHeight
          };
        });

        console.log('📐 모달 크기 분석:');
        console.log(`  - 모달 크기: ${modalStyles.width}x${modalStyles.height}`);
        console.log(`  - 화면 크기: ${modalStyles.windowWidth}x${modalStyles.windowHeight}`);
        console.log(`  - 전체화면 여부: ${modalStyles.hasFullscreen}`);
        console.log(`  - 모서리 둥글기: ${modalStyles.borderRadius}`);

        // 구글 캘린더와 비교
        const isGoogleStyle = modalStyles.hasFullscreen && modalStyles.borderRadius === '0px';
        console.log(`✨ 구글 캘린더 스타일 모달: ${isGoogleStyle ? '✅' : '❌'}`);

        // 헤더 높이 확인
        const headerHeight = await page.locator('.flex.items-center.justify-between').first().evaluate(el => {
          return el.getBoundingClientRect().height;
        });
        console.log(`📏 헤더 높이: ${headerHeight}px`);

        // 버튼 크기 확인 (터치 타겟)
        const buttons = await page.locator('button').evaluateAll(elements => {
          return elements.map(el => {
            const rect = el.getBoundingClientRect();
            return {
              text: el.textContent?.trim() || '',
              width: rect.width,
              height: rect.height,
              meetsGuideline: Math.min(rect.width, rect.height) >= 44
            };
          });
        });

        const touchTargetIssues = buttons.filter(btn => !btn.meetsGuideline && btn.text);
        console.log(`👆 터치 타겟 분석:`);
        console.log(`  - 총 버튼 수: ${buttons.length}`);
        console.log(`  - 44px 미만 버튼: ${touchTargetIssues.length}개`);
        
        if (touchTargetIssues.length > 0) {
          console.log('❌ 44px 미만 버튼들:');
          touchTargetIssues.forEach(btn => {
            console.log(`     "${btn.text}": ${Math.min(btn.width, btn.height)}px`);
          });
        }

        // 모달 닫기 테스트
        console.log('🔄 모달 닫기 테스트...');
        await page.click('button:has-text("취소")');
        await page.waitForTimeout(500);

        const isModalClosed = !(await modal.isVisible());
        console.log(`❌ 모달 닫힘: ${isModalClosed}`);

        // 결과 요약
        console.log('\n📊 모바일 EditTodoModal 테스트 결과:');
        console.log(`✅ 모달 열기: ${isModalOpen ? 'PASS' : 'FAIL'}`);
        console.log(`✅ 전체화면 스타일: ${isGoogleStyle ? 'PASS' : 'FAIL'}`);
        console.log(`✅ 터치 타겟: ${touchTargetIssues.length === 0 ? 'PASS' : 'FAIL'}`);
        console.log(`✅ 모달 닫기: ${isModalClosed ? 'PASS' : 'FAIL'}`);
      } else {
        console.log('❌ EditTodoModal이 열리지 않았습니다.');
      }
    } else {
      console.log('❌ 클릭할 수 있는 색상 바를 찾을 수 없습니다.');
    }

  } catch (error) {
    console.error('❌ 테스트 중 오류 발생:', error);
  } finally {
    await page.waitForTimeout(3000); // 결과 확인을 위한 대기
    await browser.close();
  }
}

testEditModalMobile().catch(console.error);