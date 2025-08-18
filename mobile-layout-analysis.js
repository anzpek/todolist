import { chromium } from 'playwright';

async function analyzeMobileLayout() {
  console.log('🔍 모바일 레이아웃 상세 분석 시작...');
  
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
      await page.waitForTimeout(1000);
    } catch {
      console.log('⚠️ 이미 모바일 모드일 수 있음');
    }

    console.log('\n🎯 사용자 지적 문제점 분석:');
    
    // 1. 좌우 스크롤 문제 분석
    console.log('\n1️⃣ 좌우 스크롤 문제 분석:');
    const scrollIssues = await page.evaluate(() => {
      const body = document.body;
      const html = document.documentElement;
      
      // 전체 콘텐츠 너비
      const contentWidth = Math.max(
        body.scrollWidth, body.offsetWidth,
        html.clientWidth, html.scrollWidth, html.offsetWidth
      );
      
      const viewportWidth = window.innerWidth;
      const horizontalOverflow = contentWidth > viewportWidth;
      
      // 오버플로우 발생 요소들 찾기
      const elements = Array.from(document.querySelectorAll('*'));
      const overflowElements = elements.filter(el => {
        const rect = el.getBoundingClientRect();
        return rect.right > viewportWidth || rect.width > viewportWidth;
      }).map(el => ({
        tag: el.tagName.toLowerCase(),
        class: el.className,
        width: Math.round(el.getBoundingClientRect().width),
        right: Math.round(el.getBoundingClientRect().right)
      }));
      
      return {
        viewportWidth,
        contentWidth: Math.round(contentWidth),
        horizontalOverflow,
        overflowCount: overflowElements.length,
        overflowElements: overflowElements.slice(0, 5) // 처음 5개만
      };
    });

    console.log(`  뷰포트 너비: ${scrollIssues.viewportWidth}px`);
    console.log(`  콘텐츠 너비: ${scrollIssues.contentWidth}px`);
    console.log(`  좌우 오버플로우: ${scrollIssues.horizontalOverflow ? '❌ 발생' : '✅ 없음'}`);
    console.log(`  오버플로우 요소: ${scrollIssues.overflowCount}개`);
    
    if (scrollIssues.overflowElements.length > 0) {
      console.log('  문제 요소들:');
      scrollIssues.overflowElements.forEach(el => {
        console.log(`    ${el.tag}.${el.class}: ${el.width}px (right: ${el.right}px)`);
      });
    }

    // 2. 세로 공간 활용 분석
    console.log('\n2️⃣ 세로 공간 활용 분석:');
    const verticalSpace = await page.evaluate(() => {
      const viewportHeight = window.innerHeight;
      const bodyHeight = Math.max(
        document.body.scrollHeight, 
        document.body.offsetHeight,
        document.documentElement.clientHeight,
        document.documentElement.scrollHeight,
        document.documentElement.offsetHeight
      );
      
      const header = document.querySelector('header');
      const main = document.querySelector('main');
      
      const headerHeight = header ? header.getBoundingClientRect().height : 0;
      const mainHeight = main ? main.getBoundingClientRect().height : 0;
      const availableHeight = viewportHeight - headerHeight;
      const contentHeight = mainHeight;
      const unusedSpace = Math.max(0, availableHeight - contentHeight);
      
      // 스크롤 필요 여부
      const needsVerticalScroll = bodyHeight > viewportHeight;
      
      return {
        viewportHeight,
        bodyHeight: Math.round(bodyHeight),
        headerHeight: Math.round(headerHeight),
        availableHeight: Math.round(availableHeight),
        contentHeight: Math.round(contentHeight),
        unusedSpace: Math.round(unusedSpace),
        needsVerticalScroll,
        spaceUtilization: Math.round((contentHeight / availableHeight) * 100)
      };
    });

    console.log(`  뷰포트 높이: ${verticalSpace.viewportHeight}px`);
    console.log(`  전체 콘텐츠 높이: ${verticalSpace.bodyHeight}px`);
    console.log(`  헤더 높이: ${verticalSpace.headerHeight}px`);
    console.log(`  사용 가능 높이: ${verticalSpace.availableHeight}px`);
    console.log(`  콘텐츠 높이: ${verticalSpace.contentHeight}px`);
    console.log(`  미사용 공간: ${verticalSpace.unusedSpace}px`);
    console.log(`  세로 스크롤 필요: ${verticalSpace.needsVerticalScroll ? '❌ 필요함' : '✅ 불필요'}`);
    console.log(`  공간 활용률: ${verticalSpace.spaceUtilization}%`);

    // 3. 텍스트 래핑 문제 분석
    console.log('\n3️⃣ 텍스트 래핑 문제 분석:');
    
    // 각 뷰별로 테스트
    const views = ['today', 'week', 'month'];
    for (const view of views) {
      console.log(`\n📅 ${view.toUpperCase()} 뷰 분석:`);
      
      // 뷰 변경
      try {
        await page.click('button:has([data-lucide="menu"])', { force: true });
        await page.waitForTimeout(300);
        
        if (view === 'today') await page.click('text=오늘');
        else if (view === 'week') await page.click('text=1주일');
        else if (view === 'month') await page.click('text=한달');
        
        await page.waitForTimeout(800);
      } catch (e) {
        console.log(`  뷰 변경 실패: ${e.message}`);
        continue;
      }

      const textAnalysis = await page.evaluate(() => {
        const textElements = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6, p, span, div')).filter(el => {
          const text = el.textContent?.trim();
          return text && text.length > 5 && el.children.length === 0; // 텍스트만 있는 요소
        });
        
        const analysis = textElements.map(el => {
          const rect = el.getBoundingClientRect();
          const text = el.textContent?.trim() || '';
          const isWrapped = rect.height > 30; // 대략적인 한 줄 높이보다 높으면 래핑된 것으로 간주
          
          return {
            text: text.substring(0, 20) + (text.length > 20 ? '...' : ''),
            width: Math.round(rect.width),
            height: Math.round(rect.height),
            isWrapped,
            tag: el.tagName.toLowerCase()
          };
        });
        
        const wrappedElements = analysis.filter(el => el.isWrapped);
        
        return {
          totalTextElements: analysis.length,
          wrappedElements: wrappedElements.length,
          wrappingRate: Math.round((wrappedElements.length / analysis.length) * 100),
          examples: wrappedElements.slice(0, 3)
        };
      });

      console.log(`  텍스트 요소: ${textAnalysis.totalTextElements}개`);
      console.log(`  래핑된 요소: ${textAnalysis.wrappedElements}개`);
      console.log(`  래핑 비율: ${textAnalysis.wrappingRate}%`);
      
      if (textAnalysis.examples.length > 0) {
        console.log('  래핑 예시:');
        textAnalysis.examples.forEach(ex => {
          console.log(`    "${ex.text}" (${ex.width}px × ${ex.height}px)`);
        });
      }
    }

    // 4. 다른 할일 앱과 비교를 위한 현재 상태 요약
    console.log('\n4️⃣ 현재 상태 요약:');
    
    const currentState = await page.evaluate(() => {
      const isMobile = !!document.querySelector('button.fixed.bottom-6.right-6');
      const header = document.querySelector('header');
      const main = document.querySelector('main');
      
      return {
        isMobileMode: isMobile,
        headerHeight: header ? Math.round(header.getBoundingClientRect().height) : 0,
        mainPadding: main ? window.getComputedStyle(main).padding : '',
        screenDensity: `${window.innerWidth}x${window.innerHeight}`,
        hasFAB: !!document.querySelector('button.fixed.bottom-6.right-6'),
        hasColorBars: document.querySelectorAll('.h-1.rounded-full').length > 0
      };
    });
    
    console.log(`  모바일 모드: ${currentState.isMobileMode ? '✅' : '❌'}`);
    console.log(`  헤더 높이: ${currentState.headerHeight}px`);
    console.log(`  메인 패딩: ${currentState.mainPadding}`);
    console.log(`  화면 크기: ${currentState.screenDensity}`);
    console.log(`  FAB 버튼: ${currentState.hasFAB ? '✅' : '❌'}`);
    console.log(`  구글 스타일 바: ${currentState.hasColorBars ? '✅' : '❌'}`);

    // 5. 개선 권장사항
    console.log('\n💡 개선 권장사항:');
    
    const recommendations = [];
    
    if (scrollIssues.horizontalOverflow) {
      recommendations.push('좌우 스크롤 제거: max-width: 100vw 적용, 오버플로우 요소 수정');
    }
    
    if (verticalSpace.unusedSpace > 100) {
      recommendations.push(`세로 공간 활용: ${verticalSpace.unusedSpace}px 미사용 공간 활용`);
    }
    
    if (verticalSpace.needsVerticalScroll && verticalSpace.unusedSpace > 50) {
      recommendations.push('불필요한 세로 스크롤 제거: 콘텐츠 높이 최적화');
    }
    
    recommendations.forEach((rec, i) => {
      console.log(`  ${i + 1}. ${rec}`);
    });
    
    console.log('\n📱 다음 단계: 구글 폴더 이미지와 비교 후 구체적 개선 실행');

  } catch (error) {
    console.error('❌ 분석 오류:', error);
  } finally {
    await page.waitForTimeout(3000);
    await browser.close();
  }
}

analyzeMobileLayout().catch(console.error);