import { chromium } from 'playwright';

async function realMobileAnalysis() {
  console.log('📱 실제 모바일 뷰포트 분석 (iPhone 13 크기)');
  
  const browser = await chromium.launch({ 
    headless: false,
    args: ['--force-device-scale-factor=1']
  });
  
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 }, // iPhone 13 크기
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15'
  });
  
  const page = await context.newPage();
  
  try {
    await page.goto('http://localhost:4000/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    console.log('\n🎯 실제 모바일 환경에서 문제점 분석:');

    // 초기 상태 확인
    const initialState = await page.evaluate(() => {
      return {
        windowSize: `${window.innerWidth}x${window.innerHeight}`,
        devicePixelRatio: window.devicePixelRatio,
        isTouchDevice: 'ontouchstart' in window,
        userAgent: navigator.userAgent.includes('iPhone')
      };
    });
    
    console.log(`📐 실제 뷰포트: ${initialState.windowSize}`);
    console.log(`📱 기기 정보: ${initialState.devicePixelRatio}x, 터치: ${initialState.isTouchDevice}, iPhone: ${initialState.userAgent}`);

    // 강제 모바일 모드 활성화
    try {
      // 먼저 사이드바 열기
      const menuButton = await page.waitForSelector('button:has([data-lucide="menu"])', { timeout: 5000 });
      await menuButton.click();
      await page.waitForTimeout(500);
      
      // 모바일 버튼 클릭
      const mobileButton = await page.waitForSelector('button:has-text("📱 모바일")', { timeout: 5000 });
      await mobileButton.click();
      await page.waitForTimeout(1000);
      console.log('✅ 강제 모바일 모드 활성화');
    } catch (error) {
      console.log('⚠️ 모바일 모드 활성화 실패:', error.message);
    }

    // 1. 좌우 스크롤 문제 (실제 모바일에서)
    console.log('\n1️⃣ 실제 모바일에서 좌우 스크롤 문제:');
    const mobileScrollIssues = await page.evaluate(() => {
      const viewportWidth = window.innerWidth;
      const documentWidth = Math.max(
        document.body.scrollWidth,
        document.body.offsetWidth,
        document.documentElement.clientWidth,
        document.documentElement.scrollWidth,
        document.documentElement.offsetWidth
      );
      
      // 현재 스크롤 가능 여부 확인
      const canScrollHorizontally = document.documentElement.scrollWidth > document.documentElement.clientWidth;
      
      // 화면 밖으로 나가는 요소들 찾기
      const problematicElements = [];
      const allElements = document.querySelectorAll('*');
      
      allElements.forEach(el => {
        const rect = el.getBoundingClientRect();
        if (rect.right > viewportWidth + 5) { // 5px 여유분
          problematicElements.push({
            tag: el.tagName.toLowerCase(),
            class: el.className.substring(0, 50),
            right: Math.round(rect.right),
            width: Math.round(rect.width)
          });
        }
      });
      
      return {
        viewportWidth,
        documentWidth,
        canScrollHorizontally,
        overflowElements: problematicElements.slice(0, 5),
        hasHorizontalScrollbar: canScrollHorizontally
      };
    });

    console.log(`  뷰포트: ${mobileScrollIssues.viewportWidth}px`);
    console.log(`  문서 너비: ${mobileScrollIssues.documentWidth}px`);
    console.log(`  좌우 스크롤 필요: ${mobileScrollIssues.hasHorizontalScrollbar ? '❌ 있음' : '✅ 없음'}`);
    
    if (mobileScrollIssues.overflowElements.length > 0) {
      console.log('  🚨 화면 밖 요소들:');
      mobileScrollIssues.overflowElements.forEach(el => {
        console.log(`    ${el.tag}: ${el.width}px, right: ${el.right}px`);
        console.log(`      class: ${el.class}`);
      });
    }

    // 2. 세로 공간 효율성 (모바일)
    console.log('\n2️⃣ 모바일 세로 공간 효율성:');
    const mobileVerticalSpace = await page.evaluate(() => {
      const viewportHeight = window.innerHeight;
      const documentHeight = Math.max(
        document.body.scrollHeight,
        document.body.offsetHeight,
        document.documentElement.clientHeight,
        document.documentElement.scrollHeight,
        document.documentElement.offsetHeight
      );
      
      const header = document.querySelector('header');
      const main = document.querySelector('main') || document.querySelector('.flex-1');
      const footer = document.querySelector('footer');
      
      const headerHeight = header ? header.getBoundingClientRect().height : 0;
      const footerHeight = footer ? footer.getBoundingClientRect().height : 0;
      const mainHeight = main ? main.getBoundingClientRect().height : 0;
      
      const availableHeight = viewportHeight - headerHeight - footerHeight;
      const contentHeight = mainHeight;
      const unusedSpace = Math.max(0, availableHeight - contentHeight);
      
      // 실제 콘텐츠 요소들의 높이
      const todoElements = document.querySelectorAll('[class*="todo"], [class*="calendar"], .grid');
      let actualContentHeight = 0;
      todoElements.forEach(el => {
        actualContentHeight += el.getBoundingClientRect().height;
      });
      
      return {
        viewportHeight,
        documentHeight,
        headerHeight: Math.round(headerHeight),
        availableHeight: Math.round(availableHeight),
        contentHeight: Math.round(contentHeight),
        actualContentHeight: Math.round(actualContentHeight),
        unusedSpace: Math.round(unusedSpace),
        spaceEfficiency: Math.round((actualContentHeight / availableHeight) * 100),
        needsVerticalScroll: documentHeight > viewportHeight
      };
    });

    console.log(`  뷰포트 높이: ${mobileVerticalSpace.viewportHeight}px`);
    console.log(`  헤더 높이: ${mobileVerticalSpace.headerHeight}px (구글: ~50px)`);
    console.log(`  사용 가능 높이: ${mobileVerticalSpace.availableHeight}px`);
    console.log(`  실제 콘텐츠: ${mobileVerticalSpace.actualContentHeight}px`);
    console.log(`  공간 효율성: ${mobileVerticalSpace.spaceEfficiency}%`);
    console.log(`  미사용 공간: ${mobileVerticalSpace.unusedSpace}px`);
    console.log(`  세로 스크롤: ${mobileVerticalSpace.needsVerticalScroll ? '❌ 필요' : '✅ 불필요'}`);

    // 3. 각 뷰별 상세 분석
    const views = [
      { name: 'today', korean: '오늘', selector: 'text=오늘' },
      { name: 'week', korean: '1주일', selector: 'text=1주일' },
      { name: 'month', korean: '한달', selector: 'text=한달' }
    ];

    for (const view of views) {
      console.log(`\n📅 ${view.korean} 뷰 모바일 분석:`);
      
      try {
        // 사이드바 열고 뷰 변경
        await page.click('button:has([data-lucide="menu"])', { force: true });
        await page.waitForTimeout(300);
        await page.click(view.selector);
        await page.waitForTimeout(1000);
        
        const viewAnalysis = await page.evaluate((viewName) => {
          // 텍스트 요소들의 래핑 상태 분석
          const textElements = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6, p, span, div')).filter(el => {
            const text = el.textContent?.trim();
            return text && text.length > 3 && el.children.length === 0;
          });
          
          const textAnalysis = textElements.map(el => {
            const rect = el.getBoundingClientRect();
            const computedStyle = window.getComputedStyle(el);
            const lineHeight = parseFloat(computedStyle.lineHeight) || 20;
            const fontSize = parseFloat(computedStyle.fontSize) || 14;
            const estimatedLines = Math.round(rect.height / (lineHeight > fontSize ? lineHeight : fontSize * 1.2));
            
            return {
              text: el.textContent?.trim().substring(0, 30) || '',
              width: Math.round(rect.width),
              height: Math.round(rect.height),
              estimatedLines,
              isWrapped: estimatedLines > 1,
              fontSize: Math.round(fontSize)
            };
          });
          
          const wrappedCount = textAnalysis.filter(t => t.isWrapped).length;
          
          // 컬러 바나 할일 요소들
          const colorBars = document.querySelectorAll('.h-1.rounded-full, [class*="todo"], [class*="task"]');
          const todoCards = document.querySelectorAll('[class*="bg-"][class*="rounded"]');
          
          // 캘린더 그리드가 있는지 확인
          const calendarGrid = document.querySelector('.grid');
          const gridCells = calendarGrid ? calendarGrid.querySelectorAll('div').length : 0;
          
          return {
            viewName,
            totalTextElements: textAnalysis.length,
            wrappedTextElements: wrappedCount,
            wrappingPercentage: textAnalysis.length > 0 ? Math.round((wrappedCount / textAnalysis.length) * 100) : 0,
            colorBarsCount: colorBars.length,
            todoCardsCount: todoCards.length,
            hasCalendarGrid: !!calendarGrid,
            gridCellsCount: gridCells,
            textSamples: textAnalysis.filter(t => t.isWrapped).slice(0, 3)
          };
        }, view.name);
        
        console.log(`  텍스트 요소: ${viewAnalysis.totalTextElements}개`);
        console.log(`  래핑된 텍스트: ${viewAnalysis.wrappedTextElements}개 (${viewAnalysis.wrappingPercentage}%)`);
        console.log(`  컬러 바: ${viewAnalysis.colorBarsCount}개`);
        console.log(`  할일 카드: ${viewAnalysis.todoCardsCount}개`);
        console.log(`  캘린더 그리드: ${viewAnalysis.hasCalendarGrid ? `✅ (${viewAnalysis.gridCellsCount}셀)` : '❌'}`);
        
        if (viewAnalysis.textSamples.length > 0) {
          console.log('  래핑 텍스트 예시:');
          viewAnalysis.textSamples.forEach(sample => {
            console.log(`    "${sample.text}" (${sample.width}px, ${sample.estimatedLines}줄, ${sample.fontSize}px)`);
          });
        }
        
      } catch (error) {
        console.log(`  ❌ ${view.korean} 뷰 분석 실패: ${error.message}`);
      }
    }

    // 4. 구글 캘린더와의 직접 비교
    console.log('\n🏆 구글 캘린더 vs 현재 앱 비교:');
    
    const finalComparison = await page.evaluate(() => {
      const header = document.querySelector('header');
      const fab = document.querySelector('button.fixed.bottom-6.right-6');
      const colorBars = document.querySelectorAll('.h-1.rounded-full');
      const sidebar = document.querySelector('nav');
      
      return {
        headerHeight: header ? Math.round(header.getBoundingClientRect().height) : 0,
        hasFAB: !!fab,
        colorBarsCount: colorBars.length,
        hasSidebar: !!sidebar,
        screenUtilization: Math.round((window.innerHeight - (header ? header.getBoundingClientRect().height : 0)) / window.innerHeight * 100)
      };
    });
    
    console.log('구글 캘린더 기준:');
    console.log(`  헤더: ~50px | 현재: ${finalComparison.headerHeight}px ${finalComparison.headerHeight <= 60 ? '✅' : '❌'}`);
    console.log(`  FAB 버튼: ✅ | 현재: ${finalComparison.hasFAB ? '✅' : '❌'}`);
    console.log(`  컬러 바: 많음 | 현재: ${finalComparison.colorBarsCount}개 ${finalComparison.colorBarsCount > 0 ? '✅' : '❌'}`);
    console.log(`  오버레이 사이드바: ✅ | 현재: ${finalComparison.hasSidebar ? '✅' : '❌'}`);
    console.log(`  화면 활용률: ~90% | 현재: ${finalComparison.screenUtilization}%`);

    console.log('\n📝 즉시 개선 필요사항:');
    const improvements = [];
    
    if (finalComparison.headerHeight > 60) {
      improvements.push(`헤더 높이 축소: ${finalComparison.headerHeight}px → ~50px`);
    }
    
    if (!finalComparison.hasFAB) {
      improvements.push('FAB 버튼 활성화 문제 해결');
    }
    
    if (mobileScrollIssues.hasHorizontalScrollbar) {
      improvements.push('좌우 스크롤 완전 제거');
    }
    
    if (mobileVerticalSpace.spaceEfficiency < 70) {
      improvements.push(`세로 공간 효율성 개선: ${mobileVerticalSpace.spaceEfficiency}% → 80%+`);
    }
    
    improvements.forEach((item, i) => {
      console.log(`  ${i + 1}. ${item}`);
    });

  } catch (error) {
    console.error('❌ 분석 오류:', error);
  } finally {
    await page.waitForTimeout(5000);
    await browser.close();
  }
}

realMobileAnalysis().catch(console.error);