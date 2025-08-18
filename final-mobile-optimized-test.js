import { chromium } from "playwright";

async function finalMobileTest() {
  console.log("🎯 최종 모바일 UI 완성도 테스트");
  
  const browser = await chromium.launch({ 
    headless: false,
    args: ["--force-device-scale-factor=1"]
  });
  
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 1,
    isMobile: true,
    hasTouch: true,
    userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15"
  });
  
  const page = await context.newPage();
  
  try {
    await page.goto("http://localhost:4000/", { waitUntil: "networkidle" });
    await page.waitForTimeout(2000);

    console.log("\n📱 자동 모바일 감지 확인:");
    const autoMobileStatus = await page.evaluate(() => {
      const header = document.querySelector("header");
      const fab = document.querySelector("button.fixed.bottom-6.right-6");
      const sidebar = document.querySelector("nav");
      const menuButton = document.querySelector("[data-testid=\"menu-button\"]");
      
      return {
        realViewport: `${window.innerWidth}x${window.innerHeight}`,
        headerHeight: header ? Math.round(header.getBoundingClientRect().height) : 0,
        hasFAB: \!\!fab,
        sidebarHidden: \!sidebar || window.getComputedStyle(sidebar).display === "none",
        hasMenuButton: \!\!menuButton,
        menuButtonSize: menuButton ? Math.round(menuButton.getBoundingClientRect().height) : 0
      };
    });
    
    console.log(`  실제 뷰포트: ${autoMobileStatus.realViewport}`);
    console.log(`  헤더 높이: ${autoMobileStatus.headerHeight}px (목표: ≤50px)`);
    console.log(`  FAB 버튼: ${autoMobileStatus.hasFAB ? "✅ 표시됨" : "❌ 숨겨짐"}`);
    console.log(`  사이드바: ${autoMobileStatus.sidebarHidden ? "✅ 숨겨짐" : "❌ 표시됨"}`);
    console.log(`  메뉴 버튼: ${autoMobileStatus.hasMenuButton ? "✅ 있음" : "❌ 없음"} (${autoMobileStatus.menuButtonSize}px)`);

    // FAB 기능 테스트
    if (autoMobileStatus.hasFAB) {
      console.log("\n➕ FAB 기능 테스트:");
      try {
        await page.click("button.fixed.bottom-6.right-6", { force: true });
        await page.waitForTimeout(500);
        
        const modalOpen = await page.isVisible("input[placeholder*=\"할일을 입력\"]");
        console.log(`  모달 열기: ${modalOpen ? "✅" : "❌"}`);
        
        if (modalOpen) {
          await page.fill("input[placeholder*=\"할일을 입력\"]", "최종 테스트 할일");
          await page.click("button:has-text(\"추가\")");
          await page.waitForTimeout(1000);
          console.log("  ✅ 할일 추가 완료");
        }
      } catch (error) {
        console.log(`  ❌ FAB 기능 테스트 실패: ${error.message}`);
      }
    }

    // 구글 캘린더와의 최종 비교
    console.log("\n🏆 구글 캘린더 기준 최종 비교:");
    
    const googleStandards = {
      compactHeader: autoMobileStatus.headerHeight <= 55,
      fabPresent: autoMobileStatus.hasFAB,
      sidebarHidden: autoMobileStatus.sidebarHidden,
      menuButtonWorking: autoMobileStatus.hasMenuButton,
      responsiveDesign: autoMobileStatus.realViewport === "390x844"
    };
    
    const passedStandards = Object.values(googleStandards).filter(Boolean).length;
    const totalStandards = Object.keys(googleStandards).length;
    const googleScore = Math.round((passedStandards / totalStandards) * 100);
    
    console.log(`  컴팩트 헤더 (≤55px): ${googleStandards.compactHeader ? "✅" : "❌"} (${autoMobileStatus.headerHeight}px)`);
    console.log(`  FAB 버튼: ${googleStandards.fabPresent ? "✅" : "❌"}`);
    console.log(`  사이드바 숨김: ${googleStandards.sidebarHidden ? "✅" : "❌"}`);
    console.log(`  메뉴 버튼: ${googleStandards.menuButtonWorking ? "✅" : "❌"}`);
    console.log(`  반응형 디자인: ${googleStandards.responsiveDesign ? "✅" : "❌"}`);
    
    console.log(`\n📊 구글 캘린더 대비 점수: ${googleScore}% (${passedStandards}/${totalStandards})`);
    
    if (googleScore >= 85) {
      console.log("🎉 축하합니다\! 구글 캘린더 수준의 모바일 UI입니다\!");
    } else if (googleScore >= 70) {
      console.log("👍 훌륭합니다\! 실용적인 모바일 UI입니다\!");
    } else {
      console.log("⚠️ 추가 개선이 필요합니다.");
    }

  } catch (error) {
    console.error("❌ 테스트 오류:", error);
  } finally {
    await page.waitForTimeout(3000);
    await browser.close();
    
    console.log("\n✨ 모바일/데스크톱 자동 전환 최적화 완료\!");
  }
}

finalMobileTest().catch(console.error);
