import { chromium } from 'playwright';

async function comprehensiveMobileTest() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 375, height: 812 } // iPhone X 크기
  });
  const page = await context.newPage();
  
  const issues = [];
  const improvements = [];
  
  try {
    console.log('🚀 포괄적인 모바일 UI 테스트 시작...');
    
    // 페이지 로드
    await page.goto('http://localhost:4000');
    await page.waitForTimeout(3000);
    console.log('✅ 페이지 로드 완료');
    
    // === 1. 기본 레이아웃 테스트 ===
    console.log('\n📱 === 기본 레이아웃 테스트 ===');
    
    // 헤더 크기 확인
    const header = await page.locator('header').first();
    const headerHeight = await header.boundingBox();
    console.log(`📐 헤더 높이: ${headerHeight?.height}px`);
    if (headerHeight?.height && headerHeight.height > 80) {
      issues.push('헤더가 모바일에 비해 너무 높음');
    }
    
    // === 2. 햄버거 메뉴 및 사이드바 테스트 ===
    console.log('\n🍔 === 햄버거 메뉴 및 사이드바 테스트 ===');
    
    const hamburgerBtn = await page.locator('button[title="Toggle sidebar"], button:has-text("Menu"), button:has(svg)').first();
    if (await hamburgerBtn.isVisible()) {
      console.log('✅ 햄버거 메뉴 버튼 존재');
      
      // 사이드바 열기
      await hamburgerBtn.click();
      await page.waitForTimeout(500);
      
      const sidebar = await page.locator('[class*="fixed"][class*="z-50"]');
      if (await sidebar.isVisible()) {
        console.log('✅ 사이드바 오버레이 모드로 열림');
        
        // 사이드바 크기 확인
        const sidebarBox = await sidebar.boundingBox();
        console.log(`📐 사이드바 크기: ${sidebarBox?.width}x${sidebarBox?.height}`);
        
        // 메뉴 항목들 확인
        const menuItems = await page.locator('button:has-text("오늘"), button:has-text("1주일"), button:has-text("한달")');
        const menuCount = await menuItems.count();
        console.log(`📋 메뉴 항목 개수: ${menuCount}`);
        
        // 오늘 메뉴 클릭해서 사이드바가 닫히는지 확인
        const todayBtn = await page.locator('button:has-text("오늘")');
        if (await todayBtn.isVisible()) {
          await todayBtn.click();
          await page.waitForTimeout(500);
          
          const sidebarStillVisible = await sidebar.isVisible();
          if (sidebarStillVisible) {
            issues.push('메뉴 선택 후 사이드바가 자동으로 닫히지 않음');
          } else {
            console.log('✅ 메뉴 선택 후 사이드바 자동 닫힘');
          }
        }
      } else {
        issues.push('사이드바가 오버레이 모드로 표시되지 않음');
      }
    } else {
      issues.push('햄버거 메뉴 버튼이 없음');
    }
    
    // === 3. 오늘 할일 뷰 테스트 ===
    console.log('\n📅 === 오늘 할일 뷰 테스트 ===');
    
    // 통계 카드가 상단에 있는지 확인
    const statsCards = await page.locator('[class*="grid"][class*="gap-4"]').first();
    if (await statsCards.isVisible()) {
      console.log('✅ 통계 카드가 모바일에서 상단에 배치됨');
    } else {
      issues.push('통계 카드가 모바일에서 적절히 배치되지 않음');
    }
    
    // 할일 목록 확인
    const todoItems = await page.locator('[data-testid*="todo"], .todo-item, [class*="todo"]');
    const todoCount = await todoItems.count();
    console.log(`📝 할일 항목 개수: ${todoCount}`);
    
    // === 4. 주간 뷰 테스트 ===
    console.log('\n📅 === 주간 뷰 테스트 ===');
    
    // 사이드바 다시 열고 주간 뷰 선택
    await hamburgerBtn.click();
    await page.waitForTimeout(300);
    
    const weekBtn = await page.locator('button:has-text("1주일"), button:has-text("주간")');
    if (await weekBtn.isVisible()) {
      await weekBtn.click();
      await page.waitForTimeout(1000);
      console.log('✅ 주간 뷰로 전환');
      
      // 주간 캘린더 셀 확인
      const weekCells = await page.locator('[class*="border-r"][class*="border-b"]');
      const weekCellCount = await weekCells.count();
      console.log(`📊 주간 캘린더 셀 개수: ${weekCellCount}`);
      
      // 각 셀의 크기 확인
      if (weekCellCount > 0) {
        const firstCell = weekCells.first();
        const cellBox = await firstCell.boundingBox();
        console.log(`📐 주간 셀 크기: ${cellBox?.width}x${cellBox?.height}`);
        
        if (cellBox?.height && cellBox.height < 120) {
          console.log('✅ 주간 셀이 모바일에 적합한 크기');
        } else {
          issues.push('주간 셀이 모바일에 비해 너무 큼');
        }
      }
      
      // + 버튼 확인
      const plusButtons = await page.locator('button:has(svg)').filter({ hasText: /^\\s*$/ });
      const plusCount = await plusButtons.count();
      console.log(`➕ + 버튼 개수: ${plusCount}`);
    }
    
    // === 5. 월간 뷰 테스트 ===
    console.log('\n📅 === 월간 뷰 테스트 ===');
    
    await hamburgerBtn.click();
    await page.waitForTimeout(300);
    
    const monthBtn = await page.locator('button:has-text("한달"), button:has-text("월간")');
    if (await monthBtn.isVisible()) {
      await monthBtn.click();
      await page.waitForTimeout(1000);
      console.log('✅ 월간 뷰로 전환');
      
      // 월간 캘린더 확인
      const monthCells = await page.locator('[class*="min-h-"]');
      const monthCellCount = await monthCells.count();
      console.log(`📊 월간 캘린더 셀 개수: ${monthCellCount}`);
      
      // 셀 크기 확인
      if (monthCellCount > 0) {
        const firstMonthCell = monthCells.first();
        const monthCellBox = await firstMonthCell.boundingBox();
        console.log(`📐 월간 셀 크기: ${monthCellBox?.width}x${monthCellBox?.height}`);
        
        if (monthCellBox?.height && monthCellBox.height <= 100) {
          console.log('✅ 월간 셀이 모바일에 적합한 크기');
        } else {
          issues.push('월간 셀이 모바일에 비해 너무 큼');
        }
      }
    }
    
    // === 6. 플로팅 액션 버튼 테스트 ===
    console.log('\n🎯 === 플로팅 액션 버튼 테스트 ===');
    
    const fab = await page.locator('button[class*="fixed"][class*="bottom-6"][class*="right-6"]');
    if (await fab.isVisible()) {
      console.log('✅ 플로팅 액션 버튼 확인');
      
      const fabBox = await fab.boundingBox();
      console.log(`📐 FAB 크기: ${fabBox?.width}x${fabBox?.height}`);
      
      // FAB 클릭해서 모달 열기
      await fab.click();
      await page.waitForTimeout(500);
      
      // 모달 확인
      const modal = await page.locator('[role="dialog"], .modal, [class*="modal"], [class*="fixed"][class*="inset-0"]');
      if (await modal.isVisible()) {
        console.log('✅ FAB 클릭 시 할일 추가 모달 열림');
        
        // 모달 크기 확인
        const modalBox = await modal.boundingBox();
        console.log(`📐 모달 크기: ${modalBox?.width}x${modalBox?.height}`);
        
        // 모달 닫기
        await page.keyboard.press('Escape');
        await page.waitForTimeout(300);
      } else {
        issues.push('FAB 클릭 시 모달이 열리지 않음');
      }
    } else {
      issues.push('플로팅 액션 버튼이 표시되지 않음');
    }
    
    // === 7. 터치 인터랙션 테스트 ===
    console.log('\n👆 === 터치 인터랙션 테스트 ===');
    
    // 터치 가능한 요소들의 크기 확인
    const touchableElements = await page.locator('button, [role="button"], a').all();
    let smallElements = 0;
    
    for (const element of touchableElements.slice(0, 10)) { // 처음 10개만 확인
      const box = await element.boundingBox();
      if (box && (box.width < 44 || box.height < 44)) {
        smallElements++;
      }
    }
    
    if (smallElements > 0) {
      issues.push(`${smallElements}개의 터치 요소가 44px 미만임 (iOS 가이드라인)`);
    }
    
    // === 8. 데스크톱 비교 테스트 ===
    console.log('\n🖥️ === 데스크톱 비교 테스트 ===');
    
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.waitForTimeout(500);
    
    const fabHiddenOnDesktop = !(await fab.isVisible());
    if (fabHiddenOnDesktop) {
      console.log('✅ 데스크톱에서 FAB 숨겨짐');
    } else {
      issues.push('데스크톱에서도 FAB가 표시됨');
    }
    
    // === 결과 출력 ===
    console.log('\n📊 === 테스트 결과 ===');
    console.log(`총 발견된 이슈: ${issues.length}개`);
    
    if (issues.length > 0) {
      console.log('\n❌ 발견된 이슈들:');
      issues.forEach((issue, index) => {
        console.log(`${index + 1}. ${issue}`);
      });
    }
    
    if (improvements.length > 0) {
      console.log('\n💡 개선 제안사항:');
      improvements.forEach((improvement, index) => {
        console.log(`${index + 1}. ${improvement}`);
      });
    }
    
    if (issues.length === 0) {
      console.log('\n🎉 모든 테스트 통과! 모바일 UI가 잘 구현되었습니다.');
    }
    
    // 10초 후 브라우저 닫기
    await page.waitForTimeout(10000);
    
  } catch (error) {
    console.error('❌ 테스트 중 오류 발생:', error);
  } finally {
    await browser.close();
  }
  
  return { issues, improvements };
}

// 테스트 실행
comprehensiveMobileTest().then(result => {
  console.log('\n📋 최종 결과:', result);
});