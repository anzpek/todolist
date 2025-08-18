import { chromium } from 'playwright';

async function quickMobileTest() {
  console.log('🚀 빠른 모바일 UI 확인...');
  
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 375, height: 812 },
    deviceScaleFactor: 1,
    isMobile: true,
    hasTouch: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15'
  });
  
  const page = await context.newPage();
  
  try {
    await page.goto('http://localhost:4000/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // 강제 모바일 모드 활성화
    try {
      await page.click('button:has-text("💻 데스크톱")', { force: true });
      console.log('✅ 모바일 모드 활성화됨');
    } catch {
      // 이미 모바일 모드일 수 있음
      console.log('⚠️ 모바일 모드 버튼 클릭 실패 - 이미 활성화되었을 수 있음');
    }
    await page.waitForTimeout(1000);

    // 현재 상태 확인
    const status = await page.evaluate(() => {
      const fab = document.querySelector('button.fixed.bottom-6.right-6');
      const header = document.querySelector('header');
      
      return {
        windowSize: `${window.innerWidth}x${window.innerHeight}`,
        fabVisible: !!fab,
        headerHeight: header ? Math.round(header.getBoundingClientRect().height) : 0,
        fabClickable: fab ? !fab.style.pointerEvents : false
      };
    });

    console.log('📱 현재 상태:', status);

    // 헤더에서 월간 뷰로 이동
    console.log('📱 햄버거 메뉴 클릭...');
    try {
      // 햄버거 메뉴 버튼 찾기 (Menu 아이콘이 있는 버튼)
      await page.click('button:has([data-lucide="menu"])', { force: true });
      await page.waitForTimeout(500);
      
      console.log('📅 월간 뷰 선택...');
      await page.click('text=한달');
      await page.waitForTimeout(1000);
      console.log('✅ 월간 뷰로 이동됨');
    } catch (error) {
      console.log('❌ 메뉴 클릭 실패:', error.message);
    }

    // FAB 클릭해서 할일 추가
    if (status.fabVisible) {
      console.log('➕ FAB 버튼으로 할일 추가 시도...');
      try {
        // force 옵션으로 클릭
        await page.click('button.fixed.bottom-6.right-6', { force: true });
        await page.waitForTimeout(500);
        
        await page.fill('input[placeholder*="할일을 입력"]', '테스트 할일');
        await page.click('button:has-text("추가")');
        await page.waitForTimeout(1000);
        console.log('✅ 할일 추가 성공');
      } catch (error) {
        console.log('❌ FAB 클릭 실패:', error.message);
      }
    }

    // 색상 바 확인 및 모달 테스트
    const colorBars = await page.locator('.h-1.rounded-full.cursor-pointer').count();
    console.log(`🎨 색상 바 개수: ${colorBars}`);

    if (colorBars > 0) {
      console.log('📝 EditTodoModal 테스트...');
      await page.click('.h-1.rounded-full.cursor-pointer');
      await page.waitForTimeout(500);

      const modalInfo = await page.evaluate(() => {
        const modal = document.querySelector('[class*="fixed inset-0"]');
        if (!modal) return null;
        
        const modalInner = modal.children[0];
        const rect = modalInner.getBoundingClientRect();
        
        return {
          modalSize: `${Math.round(rect.width)}x${Math.round(rect.height)}`,
          screenSize: `${window.innerWidth}x${window.innerHeight}`,
          isFullscreen: Math.abs(rect.width - window.innerWidth) < 10 && Math.abs(rect.height - window.innerHeight) < 10
        };
      });

      if (modalInfo) {
        console.log(`📱 모달: ${modalInfo.modalSize}, 화면: ${modalInfo.screenSize}`);
        console.log(`✨ 전체화면: ${modalInfo.isFullscreen ? '✅' : '❌'}`);
        
        // 모달 닫기
        await page.click('button:has-text("취소")');
      }
    }

    console.log('\n✅ 테스트 완료! 브라우저를 3초 후 닫습니다.');

  } catch (error) {
    console.error('❌ 오류:', error);
  } finally {
    await page.waitForTimeout(3000);
    await browser.close();
  }
}

quickMobileTest().catch(console.error);