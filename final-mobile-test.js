import { chromium } from 'playwright';

async function finalMobileTest() {
  console.log('🚀 최종 모바일 UI 테스트 시작...');
  
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 375, height: 812 }, // iPhone X 크기
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 3,
  });
  
  const page = await context.newPage();
  
  try {
    console.log('📱 앱 로딩 및 모바일 모드 활성화...');
    await page.goto('http://localhost:4000/', { waitUntil: 'networkidle' });
    
    // 강제로 모바일 모드 활성화
    await page.setViewportSize({ width: 375, height: 812 });
    await page.evaluate(() => {
      for (let i = 0; i < 5; i++) {
        window.dispatchEvent(new Event('resize'));
      }
    });
    await page.waitForTimeout(1000);

    const viewportInfo = await page.evaluate(() => ({
      width: window.innerWidth,
      height: window.innerHeight,
      isMobile: window.innerWidth < 768
    }));
    console.log(`📱 뷰포트: ${viewportInfo.width}x${viewportInfo.height}, 모바일: ${viewportInfo.isMobile}`);

    if (!viewportInfo.isMobile) {
      console.log('❌ 모바일 모드가 활성화되지 않았습니다. 데스크톱 UI로 진행합니다.');
    }

    let testResults = {
      headerCompact: false,
      fabVisible: false,
      sidebarOverlay: false,
      monthlyViewOptimized: false,
      editModalFullscreen: false,
      touchTargets: false,
      overall: false
    };

    // 1. 헤더 컴팩트 테스트
    console.log('\n🔍 1. 헤더 컴팩트 테스트...');
    const headerHeight = await page.locator('header').first().evaluate(el => {
      return el.getBoundingClientRect().height;
    });
    testResults.headerCompact = headerHeight <= 70; // 구글 기준 ~60px
    console.log(`   헤더 높이: ${headerHeight}px ${testResults.headerCompact ? '✅' : '❌'}`);

    // 2. FAB 버튼 테스트
    console.log('\n🔍 2. FAB 버튼 테스트...');
    const fabButton = page.locator('button.fixed.bottom-6.right-6');
    const fabVisible = await fabButton.isVisible();
    testResults.fabVisible = fabVisible;
    console.log(`   FAB 버튼 표시: ${fabVisible ? '✅' : '❌'}`);

    if (fabVisible) {
      const fabStyles = await fabButton.evaluate(el => {
        const rect = el.getBoundingClientRect();
        return {
          size: `${rect.width}x${rect.height}`,
          position: `bottom: ${window.innerHeight - rect.bottom}px, right: ${window.innerWidth - rect.right}px`,
          zIndex: window.getComputedStyle(el).zIndex
        };
      });
      console.log(`   FAB 크기: ${fabStyles.size}, 위치: ${fabStyles.position}, z-index: ${fabStyles.zIndex}`);
    }

    // 3. 사이드바 오버레이 테스트
    console.log('\n🔍 3. 사이드바 오버레이 테스트...');
    // 햄버거 메뉴 클릭
    await page.click('button:has([data-lucide="menu"])');
    await page.waitForTimeout(500);
    
    const overlay = page.locator('.fixed.inset-0.bg-black.bg-opacity-50');
    const overlayVisible = await overlay.isVisible();
    const sidebarVisible = await page.locator('.fixed.top-0.left-0.z-50').isVisible();
    testResults.sidebarOverlay = overlayVisible && sidebarVisible;
    console.log(`   오버레이 표시: ${overlayVisible ? '✅' : '❌'}`);
    console.log(`   사이드바 표시: ${sidebarVisible ? '✅' : '❌'}`);
    
    // 월간 뷰로 이동
    await page.click('text=한달');
    await page.waitForTimeout(1000);

    // 4. 월간 뷰 모바일 최적화 테스트
    console.log('\n🔍 4. 월간 뷰 모바일 최적화 테스트...');
    const calendarCells = page.locator('.grid-cols-7 > div');
    const cellCount = await calendarCells.count();
    if (cellCount > 0) {
      const cellHeight = await calendarCells.first().evaluate(el => {
        return el.getBoundingClientRect().height;
      });
      const hasColorBars = await page.locator('.h-1.rounded-full.cursor-pointer').count() > 0;
      testResults.monthlyViewOptimized = cellHeight <= 100 && hasColorBars; // 모바일에서 80px 목표
      console.log(`   셀 높이: ${cellHeight}px ${cellHeight <= 100 ? '✅' : '❌'}`);
      console.log(`   구글 스타일 색상 바: ${hasColorBars ? '✅' : '❌'}`);
    }

    // 테스트용 할일 추가 (필요시)
    const existingColorBars = await page.locator('.h-1.rounded-full.cursor-pointer').count();
    if (existingColorBars === 0) {
      console.log('   테스트용 할일 추가 중...');
      if (fabVisible) {
        await fabButton.click();
      } else {
        await page.click('button:has-text("할일 추가")');
      }
      await page.waitForTimeout(500);
      await page.fill('input[placeholder*="할일을 입력"]', '모바일 테스트 할일');
      await page.click('button:has-text("추가")');
      await page.waitForTimeout(1000);
    }

    // 5. EditTodoModal 전체화면 테스트
    console.log('\n🔍 5. EditTodoModal 전체화면 테스트...');
    const colorBars = page.locator('.h-1.rounded-full.cursor-pointer');
    const colorBarCount = await colorBars.count();
    if (colorBarCount > 0) {
      await colorBars.first().click();
      await page.waitForTimeout(500);

      const modal = page.locator('[class*="fixed inset-0"]').filter({ hasText: '할일 수정' });
      const isModalOpen = await modal.isVisible();
      
      if (isModalOpen) {
        const modalStyles = await modal.locator('> div').first().evaluate(el => {
          const rect = el.getBoundingClientRect();
          return {
            width: rect.width,
            height: rect.height,
            isFullscreen: rect.width === window.innerWidth && rect.height === window.innerHeight,
            borderRadius: window.getComputedStyle(el).borderRadius
          };
        });
        
        testResults.editModalFullscreen = modalStyles.isFullscreen && modalStyles.borderRadius === '0px';
        console.log(`   모달 크기: ${modalStyles.width}x${modalStyles.height}`);
        console.log(`   전체화면: ${modalStyles.isFullscreen ? '✅' : '❌'}`);
        console.log(`   모서리 둥글기 제거: ${modalStyles.borderRadius === '0px' ? '✅' : '❌'}`);
        
        // 모달 닫기
        await page.click('button:has-text("취소")');
        await page.waitForTimeout(500);
      } else {
        console.log('   ❌ EditTodoModal이 열리지 않았습니다.');
      }
    }

    // 6. 터치 타겟 크기 테스트
    console.log('\n🔍 6. 터치 타겟 크기 테스트...');
    const buttons = await page.locator('button').evaluateAll(elements => {
      return elements.map(el => {
        const rect = el.getBoundingClientRect();
        const minSize = Math.min(rect.width, rect.height);
        return {
          text: el.textContent?.trim().substring(0, 20) || '',
          size: `${rect.width.toFixed(0)}x${rect.height.toFixed(0)}`,
          minSize: minSize,
          meetsGuideline: minSize >= 44
        };
      }).filter(btn => btn.text && btn.minSize > 0);
    });

    const touchTargetIssues = buttons.filter(btn => !btn.meetsGuideline);
    testResults.touchTargets = touchTargetIssues.length === 0;
    console.log(`   총 버튼 수: ${buttons.length}`);
    console.log(`   44px 미만 버튼: ${touchTargetIssues.length}개 ${testResults.touchTargets ? '✅' : '❌'}`);
    
    if (touchTargetIssues.length > 0 && touchTargetIssues.length <= 5) {
      console.log('   문제 버튼들:');
      touchTargetIssues.slice(0, 5).forEach(btn => {
        console.log(`     "${btn.text}": ${btn.size} (${btn.minSize.toFixed(0)}px)`);
      });
    }

    // 전체 평가
    const passedTests = Object.values(testResults).filter(result => result === true).length;
    const totalTests = Object.keys(testResults).length - 1; // overall 제외
    testResults.overall = passedTests >= (totalTests * 0.8); // 80% 이상 통과

    console.log('\n📊 최종 모바일 UI 테스트 결과:');
    console.log('='.repeat(50));
    console.log(`✅ 헤더 컴팩트: ${testResults.headerCompact ? 'PASS' : 'FAIL'}`);
    console.log(`✅ FAB 버튼: ${testResults.fabVisible ? 'PASS' : 'FAIL'}`);
    console.log(`✅ 사이드바 오버레이: ${testResults.sidebarOverlay ? 'PASS' : 'FAIL'}`);
    console.log(`✅ 월간 뷰 최적화: ${testResults.monthlyViewOptimized ? 'PASS' : 'FAIL'}`);
    console.log(`✅ EditTodoModal 전체화면: ${testResults.editModalFullscreen ? 'PASS' : 'FAIL'}`);
    console.log(`✅ 터치 타겟 크기: ${testResults.touchTargets ? 'PASS' : 'FAIL'}`);
    console.log('='.repeat(50));
    console.log(`🎯 전체 평가: ${testResults.overall ? 'PASS' : 'FAIL'} (${passedTests}/${totalTests})`);
    console.log(`📱 모바일 UI 완성도: ${Math.round((passedTests / totalTests) * 100)}%`);

    if (testResults.overall) {
      console.log('\n🎉 축하합니다! 모바일 UI가 구글 캘린더 수준으로 최적화되었습니다!');
    } else {
      console.log('\n⚠️  일부 항목에서 개선이 필요합니다.');
    }

  } catch (error) {
    console.error('❌ 테스트 중 오류 발생:', error);
  } finally {
    await page.waitForTimeout(5000); // 결과 확인을 위한 대기
    await browser.close();
  }
}

finalMobileTest().catch(console.error);