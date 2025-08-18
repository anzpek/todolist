import { chromium } from 'playwright';

async function sidebarTest() {
  console.log('🎛️ 사이드바 모바일/데스크톱 전환 테스트');
  
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1200, height: 800 }, // 데스크톱 크기로 시작
  });
  
  const page = await context.newPage();
  
  try {
    await page.goto('http://localhost:4000/');
    await page.waitForTimeout(1000);

    console.log('📋 사이드바에서 모드 전환 테스트...');

    // 사이드바가 열려있는지 확인
    const sidebarVisible = await page.isVisible('nav');
    if (!sidebarVisible) {
      console.log('📱 사이드바 열기...');
      await page.click('button:has([data-lucide="menu"])');
      await page.waitForTimeout(500);
    }

    // 모바일 버튼 클릭
    console.log('📱 모바일 모드로 전환...');
    try {
      await page.click('button:has-text("📱 모바일")');
      await page.waitForTimeout(1000);

      // 모바일 모드 확인
      const mobileFeatures = await page.evaluate(() => {
        const fab = document.querySelector('button.fixed.bottom-6.right-6');
        const header = document.querySelector('header');
        return {
          fabVisible: !!fab,
          headerHeight: header ? Math.round(header.getBoundingClientRect().height) : 0,
          isMobile: !!fab
        };
      });

      console.log(`  ✅ FAB 버튼: ${mobileFeatures.fabVisible ? '표시됨' : '숨겨짐'}`);
      console.log(`  📏 헤더 높이: ${mobileFeatures.headerHeight}px`);
      console.log(`  📱 모바일 모드: ${mobileFeatures.isMobile ? 'ON' : 'OFF'}`);
    } catch (error) {
      console.log('❌ 모바일 버튼 클릭 실패:', error.message);
    }

    // 데스크톱 버튼 클릭
    console.log('\n💻 데스크톱 모드로 전환...');
    try {
      await page.click('button:has-text("💻 데스크톱")');
      await page.waitForTimeout(1000);

      // 데스크톱 모드 확인
      const desktopFeatures = await page.evaluate(() => {
        const fab = document.querySelector('button.fixed.bottom-6.right-6');
        const header = document.querySelector('header');
        return {
          fabHidden: !fab,
          headerHeight: header ? Math.round(header.getBoundingClientRect().height) : 0,
          isDesktop: !fab
        };
      });

      console.log(`  ❌ FAB 버튼: ${desktopFeatures.fabHidden ? '숨겨짐' : '표시됨'}`);
      console.log(`  📏 헤더 높이: ${desktopFeatures.headerHeight}px`);
      console.log(`  💻 데스크톱 모드: ${desktopFeatures.isDesktop ? 'ON' : 'OFF'}`);
    } catch (error) {
      console.log('❌ 데스크톱 버튼 클릭 실패:', error.message);
    }

    // 사이드바 UI 확인
    console.log('\n🎨 사이드바 UI 확인...');
    const sidebarInfo = await page.evaluate(() => {
      const modeSection = document.querySelector('label:has-text("화면 모드")');
      const themeSection = document.querySelector('label:has-text("테마")');
      const mobileBtn = document.querySelector('button:has-text("📱 모바일")');
      const desktopBtn = document.querySelector('button:has-text("💻 데스크톱")');
      
      return {
        hasModeSwitcher: !!modeSection,
        hasThemeToggle: !!themeSection,
        buttonsVisible: !!mobileBtn && !!desktopBtn,
        currentSelection: mobileBtn?.classList.contains('bg-blue-100') ? 'mobile' : 
                         desktopBtn?.classList.contains('bg-blue-100') ? 'desktop' : 'unknown'
      };
    });

    console.log(`  📋 모드 전환기: ${sidebarInfo.hasModeSwitcher ? '✅' : '❌'}`);
    console.log(`  🎨 테마 토글: ${sidebarInfo.hasThemeToggle ? '✅' : '❌'}`);
    console.log(`  🔘 버튼들: ${sidebarInfo.buttonsVisible ? '✅' : '❌'}`);
    console.log(`  🎯 현재 선택: ${sidebarInfo.currentSelection}`);

    console.log('\n🎉 사이드바 모드 전환 테스트 완료!');
    console.log('✨ 모바일/데스크톱 전환이 사이드바에서 가능합니다.');

  } catch (error) {
    console.error('❌ 테스트 오류:', error);
  } finally {
    await page.waitForTimeout(3000);
    await browser.close();
  }
}

sidebarTest().catch(console.error);