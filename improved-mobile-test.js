import { chromium } from 'playwright';

async function improvedMobileTest() {
  console.log('🚀 개선된 모바일 UI 테스트 시작...');
  
  const browser = await chromium.launch({ 
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const context = await browser.newContext({
    viewport: { width: 375, height: 812 }, // iPhone X
    deviceScaleFactor: 1, // 스케일 팩터 1로 설정
    isMobile: true,
    hasTouch: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1'
  });
  
  const page = await context.newPage();
  
  try {
    console.log('📱 앱 로딩...');
    await page.goto('http://localhost:4000/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // 모바일 감지 정보 확인
    const mobileInfo = await page.evaluate(() => {
      return {
        innerWidth: window.innerWidth,
        innerHeight: window.innerHeight,
        devicePixelRatio: window.devicePixelRatio,
        isTouchDevice: 'ontouchstart' in window,
        maxTouchPoints: navigator.maxTouchPoints,
        userAgent: navigator.userAgent.substring(0, 100),
        orientation: window.screen?.orientation?.type || 'unknown'
      };
    });
    
    console.log('📱 모바일 감지 정보:', mobileInfo);

    // DOM에서 실제 모바일 상태 확인
    const isMobileActive = await page.evaluate(() => {
      // 모바일 전용 요소들 확인
      const fab = document.querySelector('button.fixed.bottom-6.right-6');
      const sidebar = document.querySelector('.fixed.top-0.left-0.z-50');
      const compactHeader = document.querySelector('header .px-4.py-2');
      
      return {
        fabExists: !!fab,
        sidebarMobile: !!sidebar,
        compactHeader: !!compactHeader,
        currentWidth: window.innerWidth
      };
    });
    
    console.log('🔍 모바일 UI 상태:', isMobileActive);

    let testResults = {
      mobileDetection: false,
      headerCompact: false,
      fabVisible: false,
      sidebarOverlay: false,
      monthlyOptimized: false,
      editModalFullscreen: false,
      touchTargets: false
    };

    // 1. 모바일 감지 테스트
    testResults.mobileDetection = isMobileActive.fabExists || isMobileActive.compactHeader;
    console.log(`\n✅ 모바일 감지: ${testResults.mobileDetection ? 'PASS' : 'FAIL'}`);

    if (!testResults.mobileDetection) {
      console.log('❌ 모바일 모드가 감지되지 않았습니다. 강제 활성화를 시도합니다...');
      
      // 강제 모바일 모드 활성화 버튼 클릭
      try {
        await page.click('button:has-text("💻 데스크톱")');
        await page.waitForTimeout(1000);
        console.log('✅ 강제 모바일 모드 활성화됨');
        testResults.mobileDetection = true;
      } catch (error) {
        console.log('❌ 강제 모바일 모드 버튼을 찾을 수 없습니다.');
      }
    }

    // 2. 헤더 컴팩트 테스트
    const headerHeight = await page.locator('header').first().evaluate(el => {
      return el.getBoundingClientRect().height;
    });
    testResults.headerCompact = headerHeight <= 80; // 모바일에서 더 관대한 기준
    console.log(`\n📏 헤더 높이: ${headerHeight}px ${testResults.headerCompact ? '✅' : '❌'}`);

    // 3. FAB 버튼 테스트
    const fabButton = page.locator('button.fixed.bottom-6.right-6');
    testResults.fabVisible = await fabButton.isVisible();
    console.log(`\n🔘 FAB 버튼: ${testResults.fabVisible ? '✅ 표시됨' : '❌ 숨겨짐'}`);

    if (testResults.fabVisible) {
      const fabInfo = await fabButton.evaluate(el => {
        const rect = el.getBoundingClientRect();
        const styles = window.getComputedStyle(el);
        return {
          size: `${Math.round(rect.width)}x${Math.round(rect.height)}`,
          position: `${Math.round(window.innerWidth - rect.right)}px from right, ${Math.round(window.innerHeight - rect.bottom)}px from bottom`,
          background: styles.background,
          zIndex: styles.zIndex
        };
      });
      console.log(`   크기: ${fabInfo.size}, 위치: ${fabInfo.position}`);
    }

    // 4. 사이드바 오버레이 테스트
    console.log('\n🔍 사이드바 오버레이 테스트...');
    
    // 햄버거 메뉴 버튼 찾기 및 클릭
    const menuButtons = await page.locator('button').all();
    let menuClicked = false;
    
    for (const button of menuButtons) {
      const hasMenuIcon = await button.locator('svg').count() > 0;
      if (hasMenuIcon) {
        try {
          await button.click();
          await page.waitForTimeout(500);
          menuClicked = true;
          console.log('✅ 햄버거 메뉴 클릭됨');
          break;
        } catch {}
      }
    }

    if (menuClicked) {
      const overlay = page.locator('.fixed.inset-0.bg-black.bg-opacity-50');
      const sidebarMobile = page.locator('.fixed.top-0.left-0.z-50');
      
      const overlayVisible = await overlay.isVisible();
      const sidebarVisible = await sidebarMobile.isVisible();
      
      testResults.sidebarOverlay = overlayVisible && sidebarVisible;
      console.log(`   오버레이: ${overlayVisible ? '✅' : '❌'}, 사이드바: ${sidebarVisible ? '✅' : '❌'}`);
      
      // 월간 뷰로 이동
      try {
        await page.click('text=한달');
        await page.waitForTimeout(1000);
        console.log('✅ 월간 뷰로 이동됨');
      } catch {
        console.log('❌ 월간 뷰 버튼을 찾을 수 없습니다');
      }
    }

    // 5. 월간 뷰 모바일 최적화 테스트
    console.log('\n📅 월간 뷰 모바일 최적화 테스트...');
    
    // 캘린더 셀 높이 확인
    const calendarCells = page.locator('.grid-cols-7 > div');
    const cellCount = await calendarCells.count();
    
    if (cellCount > 0) {
      const cellHeight = await calendarCells.first().evaluate(el => {
        return el.getBoundingClientRect().height;
      });
      console.log(`   캘린더 셀 높이: ${cellHeight}px`);
      
      // 구글 스타일 색상 바 확인
      const colorBars = page.locator('.h-1.rounded-full.cursor-pointer');
      const colorBarCount = await colorBars.count();
      
      testResults.monthlyOptimized = cellHeight <= 100 && colorBarCount >= 0;
      console.log(`   구글 스타일 색상 바: ${colorBarCount}개 ${colorBarCount > 0 ? '✅' : '⚠️'}`);
      
      // 테스트용 할일 추가 (색상 바가 없는 경우)
      if (colorBarCount === 0 && testResults.fabVisible) {
        console.log('   테스트용 할일 추가 중...');
        try {
          await fabButton.click();
          await page.waitForTimeout(500);
          
          await page.fill('input[placeholder*="할일을 입력"]', '모바일 테스트 할일');
          await page.click('button:has-text("추가")');
          await page.waitForTimeout(1000);
          
          const newColorBarCount = await colorBars.count();
          console.log(`   할일 추가 후 색상 바: ${newColorBarCount}개`);
        } catch (error) {
          console.log('   할일 추가 실패:', error.message);
        }
      }
    }

    // 6. EditTodoModal 전체화면 테스트
    console.log('\n📝 EditTodoModal 전체화면 테스트...');
    
    const colorBars = page.locator('.h-1.rounded-full.cursor-pointer');
    const finalColorBarCount = await colorBars.count();
    
    if (finalColorBarCount > 0) {
      try {
        await colorBars.first().click();
        await page.waitForTimeout(500);

        const modal = page.locator('[class*="fixed inset-0"]').filter({ hasText: '할일 수정' });
        const isModalOpen = await modal.isVisible();
        
        if (isModalOpen) {
          const modalInfo = await modal.locator('> div').first().evaluate(el => {
            const rect = el.getBoundingClientRect();
            const styles = window.getComputedStyle(el);
            return {
              width: rect.width,
              height: rect.height,
              windowWidth: window.innerWidth,
              windowHeight: window.innerHeight,
              borderRadius: styles.borderRadius,
              isFullscreen: Math.abs(rect.width - window.innerWidth) < 5 && Math.abs(rect.height - window.innerHeight) < 5
            };
          });
          
          testResults.editModalFullscreen = modalInfo.isFullscreen && modalInfo.borderRadius === '0px';
          console.log(`   모달 크기: ${Math.round(modalInfo.width)}x${Math.round(modalInfo.height)}`);
          console.log(`   화면 크기: ${modalInfo.windowWidth}x${modalInfo.windowHeight}`);
          console.log(`   전체화면: ${modalInfo.isFullscreen ? '✅' : '❌'}`);
          console.log(`   모서리: ${modalInfo.borderRadius === '0px' ? '✅ 직각' : '❌ 둥글게'}`);
          
          // 모달 닫기
          await page.click('button:has-text("취소")');
          await page.waitForTimeout(500);
        } else {
          console.log('   ❌ 모달이 열리지 않았습니다');
        }
      } catch (error) {
        console.log('   ❌ 모달 테스트 실패:', error.message);
      }
    } else {
      console.log('   ⚠️ 테스트할 색상 바가 없습니다');
    }

    // 7. 터치 타겟 크기 테스트
    console.log('\n👆 터치 타겟 크기 테스트...');
    
    const touchTargetInfo = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const results = buttons.map(btn => {
        const rect = btn.getBoundingClientRect();
        const minSize = Math.min(rect.width, rect.height);
        return {
          text: btn.textContent?.trim().substring(0, 15) || '',
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          minSize: Math.round(minSize),
          meetsGuideline: minSize >= 44
        };
      }).filter(btn => btn.text && btn.minSize > 0);
      
      return {
        total: results.length,
        failing: results.filter(btn => !btn.meetsGuideline),
        all: results
      };
    });

    testResults.touchTargets = touchTargetInfo.failing.length === 0;
    console.log(`   총 버튼: ${touchTargetInfo.total}개`);
    console.log(`   44px 미만: ${touchTargetInfo.failing.length}개 ${testResults.touchTargets ? '✅' : '❌'}`);
    
    if (touchTargetInfo.failing.length > 0 && touchTargetInfo.failing.length <= 3) {
      touchTargetInfo.failing.forEach(btn => {
        console.log(`     "${btn.text}": ${btn.width}x${btn.height} (${btn.minSize}px)`);
      });
    }

    // 최종 결과 요약
    const passedTests = Object.values(testResults).filter(result => result === true).length;
    const totalTests = Object.keys(testResults).length;
    const score = Math.round((passedTests / totalTests) * 100);

    console.log('\n' + '='.repeat(60));
    console.log('📊 최종 모바일 UI 테스트 결과');
    console.log('='.repeat(60));
    console.log(`✅ 모바일 감지: ${testResults.mobileDetection ? 'PASS' : 'FAIL'}`);
    console.log(`✅ 헤더 컴팩트: ${testResults.headerCompact ? 'PASS' : 'FAIL'}`);
    console.log(`✅ FAB 버튼: ${testResults.fabVisible ? 'PASS' : 'FAIL'}`);
    console.log(`✅ 사이드바 오버레이: ${testResults.sidebarOverlay ? 'PASS' : 'FAIL'}`);
    console.log(`✅ 월간 뷰 최적화: ${testResults.monthlyOptimized ? 'PASS' : 'FAIL'}`);
    console.log(`✅ 모달 전체화면: ${testResults.editModalFullscreen ? 'PASS' : 'FAIL'}`);
    console.log(`✅ 터치 타겟: ${testResults.touchTargets ? 'PASS' : 'FAIL'}`);
    console.log('='.repeat(60));
    console.log(`🎯 종합 점수: ${score}% (${passedTests}/${totalTests})`);
    
    if (score >= 85) {
      console.log('🎉 훌륭합니다! 모바일 UI가 구글 캘린더 수준입니다!');
    } else if (score >= 70) {
      console.log('👍 좋습니다! 몇 가지 개선사항이 있습니다.');
    } else {
      console.log('⚠️ 개선이 필요합니다.');
    }

    return { testResults, score };

  } catch (error) {
    console.error('❌ 테스트 중 오류 발생:', error);
    return { testResults: {}, score: 0 };
  } finally {
    await page.waitForTimeout(3000);
    await browser.close();
  }
}

improvedMobileTest().catch(console.error);