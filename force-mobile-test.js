import { chromium } from 'playwright';

async function forceMobileTest() {
  console.log('🔧 강제 모바일 모드 테스트 (Playwright 뷰포트 이슈 해결)');
  
  const browser = await chromium.launch({ 
    headless: false,
    args: ['--force-device-scale-factor=1']
  });
  
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 1,
    isMobile: true,
    hasTouch: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15'
  });
  
  const page = await context.newPage();
  
  try {
    await page.goto('http://localhost:4000/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    console.log('\n📱 초기 상태 확인:');
    const initialStatus = await page.evaluate(() => {
      const header = document.querySelector('header');
      const fab = document.querySelector('button.fixed.bottom-6.right-6');
      
      return {
        realViewport: `${window.innerWidth}x${window.innerHeight}`,
        playwrightViewport: '390x844',
        headerHeight: header ? Math.round(header.getBoundingClientRect().height) : 0,
        hasFAB: !!fab,
        mobileDetected: window.innerWidth <= 768
      };
    });
    
    console.log(`  Playwright 뷰포트: ${initialStatus.playwrightViewport}`);
    console.log(`  실제 window 크기: ${initialStatus.realViewport}`);
    console.log(`  모바일 감지: ${initialStatus.mobileDetected ? '✅' : '❌'}`);
    console.log(`  헤더 높이: ${initialStatus.headerHeight}px`);
    console.log(`  FAB 버튼: ${initialStatus.hasFAB ? '✅' : '❌'}`);

    // 강제 모바일 모드 활성화
    console.log('\n🎯 강제 모바일 모드 활성화:');
    try {
      // 사이드바 열기
      await page.click('button:has([data-lucide="menu"])', { timeout: 3000 });
      await page.waitForTimeout(500);
      
      // 📱 폰 버튼 클릭
      await page.click('text=📱 폰', { timeout: 3000 });
      await page.waitForTimeout(1000);
      
      console.log('✅ 강제 모바일 모드 활성화 완료');
      
      // 사이드바 닫기 (오버레이 클릭)
      await page.click('.fixed.inset-0.bg-black.bg-opacity-50', { force: true });
      await page.waitForTimeout(500);
      
    } catch (error) {
      console.log(`❌ 강제 모바일 모드 활성화 실패: ${error.message}`);
    }

    // 강제 모바일 모드 후 상태 확인
    console.log('\n📊 강제 모바일 모드 후 상태:');
    const forcedMobileStatus = await page.evaluate(() => {
      const header = document.querySelector('header');
      const fab = document.querySelector('button.fixed.bottom-6.right-6');
      const sidebar = document.querySelector('nav');
      
      // 헤더 내 요소들의 크기 확인
      const menuButton = document.querySelector('button:has([data-lucide="menu"])');
      const title = document.querySelector('h2');
      
      return {
        headerHeight: header ? Math.round(header.getBoundingClientRect().height) : 0,
        headerPadding: header ? window.getComputedStyle(header).padding : '',
        hasFAB: !!fab,
        sidebarHidden: !sidebar || window.getComputedStyle(sidebar).display === 'none',
        menuButtonSize: menuButton ? Math.round(menuButton.getBoundingClientRect().height) : 0,
        titleSize: title ? window.getComputedStyle(title).fontSize : ''
      };
    });
    
    console.log(`  헤더 높이: ${forcedMobileStatus.headerHeight}px (목표: ≤50px)`);
    console.log(`  헤더 패딩: ${forcedMobileStatus.headerPadding}`);
    console.log(`  FAB 버튼: ${forcedMobileStatus.hasFAB ? '✅ 표시됨' : '❌ 숨겨짐'}`);
    console.log(`  사이드바: ${forcedMobileStatus.sidebarHidden ? '✅ 숨겨짐' : '❌ 표시됨'}`);
    console.log(`  메뉴 버튼 높이: ${forcedMobileStatus.menuButtonSize}px`);
    console.log(`  제목 폰트 크기: ${forcedMobileStatus.titleSize}`);

    // FAB 기능 테스트
    if (forcedMobileStatus.hasFAB) {
      console.log('\n➕ FAB 기능 테스트:');
      try {
        await page.click('button.fixed.bottom-6.right-6', { force: true });
        await page.waitForTimeout(500);
        
        const modalOpen = await page.isVisible('input[placeholder*="할일을 입력"]');
        console.log(`  모달 열기: ${modalOpen ? '✅' : '❌'}`);
        
        if (modalOpen) {
          await page.fill('input[placeholder*="할일을 입력"]', '모바일 테스트 할일');
          await page.click('button:has-text("추가")');
          await page.waitForTimeout(1000);
          console.log('  ✅ 할일 추가 완료');
        }
      } catch (error) {
        console.log(`  ❌ FAB 기능 테스트 실패: ${error.message}`);
      }
    }

    // 각 뷰별 모바일 최적화 확인
    console.log('\n📅 각 뷰별 모바일 최적화 확인:');
    
    const views = [
      { name: '오늘', selector: 'text=오늘' },
      { name: '1주일', selector: 'text=1주일' },
      { name: '한달', selector: 'text=한달' }
    ];
    
    for (const view of views) {
      try {
        // 사이드바 열고 뷰 변경
        await page.click('button:has([data-lucide="menu"])', { force: true });
        await page.waitForTimeout(300);
        await page.click(view.selector);
        await page.waitForTimeout(800);
        
        const viewStatus = await page.evaluate(() => {
          const header = document.querySelector('header');
          const main = document.querySelector('main');
          const colorBars = document.querySelectorAll('.h-1.rounded-full');
          
          // 가로 스크롤 확인
          const hasHorizontalScroll = document.documentElement.scrollWidth > document.documentElement.clientWidth;
          
          // 세로 공간 활용도
          const viewportHeight = window.innerHeight;
          const headerHeight = header ? header.getBoundingClientRect().height : 0;
          const mainHeight = main ? main.getBoundingClientRect().height : 0;
          const spaceUtilization = Math.round(((viewportHeight - headerHeight) / viewportHeight) * 100);
          
          return {
            headerHeight: Math.round(headerHeight),
            colorBarsCount: colorBars.length,
            hasHorizontalScroll,
            spaceUtilization,
            viewportHeight
          };
        });
        
        console.log(`  ${view.name} 뷰:`);
        console.log(`    헤더: ${viewStatus.headerHeight}px`);
        console.log(`    컬러 바: ${viewStatus.colorBarsCount}개`);
        console.log(`    가로 스크롤: ${viewStatus.hasHorizontalScroll ? '❌ 있음' : '✅ 없음'}`);
        console.log(`    공간 활용: ${viewStatus.spaceUtilization}%`);
        
      } catch (error) {
        console.log(`  ❌ ${view.name} 뷰 테스트 실패: ${error.message}`);
      }
    }

    // 최종 점수 계산
    console.log('\n🏆 모바일 최적화 점수:');
    
    const criteria = {
      compactHeader: forcedMobileStatus.headerHeight <= 60,
      fabVisible: forcedMobileStatus.hasFAB,
      sidebarHidden: forcedMobileStatus.sidebarHidden,
      mobileButtonSizes: forcedMobileStatus.menuButtonSize <= 44,
      mobileFontSize: forcedMobileStatus.titleSize.includes('16px') || forcedMobileStatus.titleSize.includes('1rem')
    };
    
    const passedCriteria = Object.values(criteria).filter(Boolean).length;
    const totalCriteria = Object.keys(criteria).length;
    const score = Math.round((passedCriteria / totalCriteria) * 100);
    
    console.log(`  컴팩트 헤더 (≤60px): ${criteria.compactHeader ? '✅' : '❌'}`);
    console.log(`  FAB 버튼 표시: ${criteria.fabVisible ? '✅' : '❌'}`);
    console.log(`  사이드바 숨김: ${criteria.sidebarHidden ? '✅' : '❌'}`);
    console.log(`  버튼 크기 최적화: ${criteria.mobileButtonSizes ? '✅' : '❌'}`);
    console.log(`  폰트 크기 최적화: ${criteria.mobileFontSize ? '✅' : '❌'}`);
    
    console.log(`\n📊 최종 점수: ${score}% (${passedCriteria}/${totalCriteria})`);
    
    if (score >= 80) {
      console.log('🎉 훌륭합니다! 모바일 최적화가 잘 되어있습니다!');
    } else if (score >= 60) {
      console.log('👍 좋습니다! 약간의 개선이 더 필요합니다.');
    } else {
      console.log('⚠️ 추가 최적화가 필요합니다.');
    }

  } catch (error) {
    console.error('❌ 테스트 오류:', error);
  } finally {
    await page.waitForTimeout(3000);
    await browser.close();
  }
}

forceMobileTest().catch(console.error);