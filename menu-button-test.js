import { chromium } from 'playwright';

async function menuButtonTest() {
  console.log('🔍 메뉴 버튼 접근성 테스트');
  
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

    console.log('\n🎯 메뉴 버튼 분석:');
    
    const buttonAnalysis = await page.evaluate(() => {
      const menuButton = document.querySelector('[data-testid="menu-button"]');
      const menuByLucide = document.querySelector('button:has([data-lucide="menu"])');
      const allButtons = document.querySelectorAll('button');
      
      const findMenuButtons = Array.from(allButtons).filter(btn => {
        const text = btn.textContent?.toLowerCase() || '';
        const hasMenuIcon = btn.querySelector('[data-lucide="menu"]');
        const hasMenuClass = btn.className.includes('menu');
        return hasMenuIcon || hasMenuClass || text.includes('menu');
      });
      
      return {
        menuButtonExists: !!menuButton,
        menuByLucideExists: !!menuByLucide,
        allButtonsCount: allButtons.length,
        menuButtonsFound: findMenuButtons.length,
        menuButtonDetails: menuButton ? {
          visible: window.getComputedStyle(menuButton).display !== 'none',
          position: window.getComputedStyle(menuButton).position,
          zIndex: window.getComputedStyle(menuButton).zIndex,
          width: Math.round(menuButton.getBoundingClientRect().width),
          height: Math.round(menuButton.getBoundingClientRect().height),
          top: Math.round(menuButton.getBoundingClientRect().top),
          left: Math.round(menuButton.getBoundingClientRect().left),
          className: menuButton.className
        } : null
      };
    });
    
    console.log(`  data-testid 메뉴 버튼: ${buttonAnalysis.menuButtonExists ? '✅ 존재함' : '❌ 없음'}`);
    console.log(`  Lucide 메뉴 버튼: ${buttonAnalysis.menuByLucideExists ? '✅ 존재함' : '❌ 없음'}`);
    console.log(`  전체 버튼 수: ${buttonAnalysis.allButtonsCount}개`);
    console.log(`  메뉴 관련 버튼: ${buttonAnalysis.menuButtonsFound}개`);
    
    if (buttonAnalysis.menuButtonDetails) {
      const details = buttonAnalysis.menuButtonDetails;
      console.log(`  메뉴 버튼 상세:`);
      console.log(`    크기: ${details.width}x${details.height}px`);
      console.log(`    위치: (${details.left}, ${details.top})`);
      console.log(`    보임: ${details.visible ? '✅' : '❌'}`);
      console.log(`    z-index: ${details.zIndex}`);
      console.log(`    클래스: ${details.className}`);
    }

    // 다양한 셀렉터로 메뉴 버튼 클릭 시도
    console.log('\n🖱️ 메뉴 버튼 클릭 테스트:');
    
    const selectors = [
      '[data-testid="menu-button"]',
      'button:has([data-lucide="menu"])',
      'header button:first-child',
      'button[title*="메뉴"]',
      'button[aria-label*="메뉴"]'
    ];
    
    let successfulSelector = null;
    
    for (const selector of selectors) {
      try {
        console.log(`  ${selector} 시도...`);
        const element = await page.locator(selector).first();
        const isVisible = await element.isVisible();
        console.log(`    보임: ${isVisible ? '✅' : '❌'}`);
        
        if (isVisible) {
          await element.click({ timeout: 2000, force: true });
          await page.waitForTimeout(500);
          
          // 사이드바가 열렸는지 확인
          const sidebarOpen = await page.isVisible('nav');
          if (sidebarOpen) {
            console.log(`    ✅ 성공! ${selector}로 사이드바 열림`);
            successfulSelector = selector;
            break;
          } else {
            console.log(`    ❌ 클릭했지만 사이드바 안 열림`);
          }
        }
      } catch (error) {
        console.log(`    ❌ 실패: ${error.message.substring(0, 50)}...`);
      }
    }
    
    if (successfulSelector) {
      console.log(`\n🎛️ 사이드바 오버레이 테스트 (${successfulSelector} 사용):`);
      
      const overlayStatus = await page.evaluate(() => {
        const sidebar = document.querySelector('nav');
        const overlay = document.querySelector('.fixed.inset-0.bg-black.bg-opacity-50');
        
        return {
          sidebarVisible: !!sidebar && window.getComputedStyle(sidebar).display !== 'none',
          overlayVisible: !!overlay,
          sidebarClasses: sidebar ? sidebar.className : '',
          overlayClasses: overlay ? overlay.className : ''
        };
      });
      
      console.log(`  사이드바 표시: ${overlayStatus.sidebarVisible ? '✅' : '❌'}`);
      console.log(`  오버레이 배경: ${overlayStatus.overlayVisible ? '✅' : '❌'}`);
      console.log(`  사이드바 클래스: ${overlayStatus.sidebarClasses}`);
      
      // 모드 전환 버튼 테스트
      console.log('\n🔄 모드 전환 버튼 테스트:');
      try {
        const modeButtons = await page.locator('text=💻 PC').count();
        const autoButton = await page.locator('text=🔄 자동').count();
        const mobileButton = await page.locator('text=📱 폰').count();
        
        console.log(`  PC 버튼: ${modeButtons > 0 ? '✅' : '❌'}`);
        console.log(`  자동 버튼: ${autoButton > 0 ? '✅' : '❌'}`);
        console.log(`  모바일 버튼: ${mobileButton > 0 ? '✅' : '❌'}`);
        
        const totalModeButtons = modeButtons + autoButton + mobileButton;
        console.log(`  총 모드 버튼: ${totalModeButtons}개 (예상: 3개)`);
        
      } catch (error) {
        console.log(`  ❌ 모드 버튼 테스트 실패: ${error.message}`);
      }
      
      // 사이드바 닫기 테스트
      console.log('\n❌ 사이드바 닫기 테스트:');
      try {
        if (overlayStatus.overlayVisible) {
          await page.click('.fixed.inset-0.bg-black.bg-opacity-50', { force: true });
          await page.waitForTimeout(500);
          
          const sidebarClosed = await page.evaluate(() => {
            const sidebar = document.querySelector('nav');
            return !sidebar || window.getComputedStyle(sidebar).display === 'none';
          });
          
          console.log(`  오버레이 클릭으로 닫기: ${sidebarClosed ? '✅' : '❌'}`);
        } else {
          console.log('  ⚠️ 오버레이가 없어서 닫기 테스트 생략');
        }
      } catch (error) {
        console.log(`  ❌ 사이드바 닫기 실패: ${error.message}`);
      }
      
    } else {
      console.log('\n❌ 어떤 셀렉터로도 메뉴 버튼을 클릭할 수 없습니다.');
      
      // DOM 구조 분석
      console.log('\n🔍 DOM 구조 분석:');
      const domStructure = await page.evaluate(() => {
        const header = document.querySelector('header');
        if (!header) return 'header 요소를 찾을 수 없음';
        
        const headerHTML = header.innerHTML.substring(0, 200) + '...';
        const firstButton = header.querySelector('button');
        
        return {
          headerHTML,
          firstButtonExists: !!firstButton,
          firstButtonClass: firstButton ? firstButton.className : null,
          firstButtonText: firstButton ? firstButton.textContent?.trim() : null
        };
      });
      
      console.log(`  헤더 HTML: ${domStructure.headerHTML || domStructure}`);
      if (typeof domStructure === 'object') {
        console.log(`  첫 번째 버튼: ${domStructure.firstButtonExists ? '✅' : '❌'}`);
        console.log(`  버튼 클래스: ${domStructure.firstButtonClass || 'N/A'}`);
        console.log(`  버튼 텍스트: "${domStructure.firstButtonText || 'N/A'}"`);
      }
    }

  } catch (error) {
    console.error('❌ 테스트 오류:', error);
  } finally {
    await page.waitForTimeout(3000);
    await browser.close();
  }
}

menuButtonTest().catch(console.error);