import { useState, useRef, useEffect, lazy, Suspense } from 'react'
import { TodoProvider } from './contexts/TodoContext'
import { ThemeProvider } from './contexts/ThemeContext'
import { AuthProvider } from './contexts/AuthContext'
import { VacationProvider } from './contexts/VacationContext'
import { KeyboardProvider } from './contexts/KeyboardContext'
import { FontSizeProvider } from './contexts/FontSizeContext'
import { CustomHolidayProvider } from './contexts/CustomHolidayContext'
import { useGlobalKeyboard } from './hooks/useGlobalKeyboard'
import { debug } from './utils/debug'
import { performanceMonitor, measureRenderTime } from './utils/performance'
import { errorTracker } from './utils/errorTracking'
import { initializeSecurity, generateSecurityReport } from './utils/security'
import './index.css'

// 레이지 로딩 컴포넌트들
const Sidebar = lazy(() => import('./components/Sidebar'))
const PWAInstallPrompt = lazy(() => import('./components/PWAInstallPrompt'))
import MainContent from './components/MainContent';
const FloatingActionButton = lazy(() => import('./components/FloatingActionButton'))
const ErrorBoundary = lazy(() => import('./components/ErrorBoundary'))
const OfflineNotification = lazy(() => import('./components/OfflineNotification'))

// 로딩 스피너 컴포넌트
const LoadingSpinner = () => (
  <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-900">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
  </div>
)

// 기존 컴포넌트들과의 호환성을 위한 타입
export type ViewType = 'today' | 'week' | 'month'

interface AppInnerProps {
  currentView: ViewType | 'recurring' | 'history' | 'analytics' | 'vacation' | 'settings'
  setCurrentView: (view: ViewType | 'recurring' | 'history' | 'analytics' | 'vacation' | 'settings') => void
  isSidebarOpen: boolean
  setIsSidebarOpen: (open: boolean) => void
  searchInputRef: React.RefObject<HTMLInputElement | null>
  addTodoModalRef: React.RefObject<{ open: () => void } | null>
  isMobile: boolean
  forceMobile: boolean | null
  setForceMobile: (force: boolean | null) => void
}

function AppInner({
  currentView,
  setCurrentView,
  isSidebarOpen,
  setIsSidebarOpen,
  searchInputRef,
  addTodoModalRef,
  isMobile,
  forceMobile,
  setForceMobile
}: AppInnerProps) {
  // 렌더링 성능 측정
  const measureRender = measureRenderTime('AppInner')

  // 전역 키보드 단축키 설정 (KeyboardProvider 내에서 호출)
  useGlobalKeyboard()

  // 컴포넌트가 언마운트될 때 렌더링 시간 측정 완료
  useEffect(() => {
    return measureRender
  }, [])

  return (
    <Suspense fallback={<LoadingSpinner />}>
      <div className={`h-screen flex bg-gray-50 dark:bg-gray-900 ${isMobile ? 'relative' : ''}`}>
        {/* 모바일에서 사이드바 오버레이 */}
        {isMobile && isSidebarOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-60 z-40"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* 사이드바 */}
        <Sidebar
          currentView={currentView}
          onViewChange={setCurrentView}
          isOpen={isSidebarOpen}
          onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
          isMobile={isMobile}
          forceMobile={forceMobile}
          onToggleForceMobile={setForceMobile}
        />

        {/* 메인 컨텐츠 */}
        <MainContent
          currentView={currentView}
          isSidebarOpen={isSidebarOpen}
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          searchInputRef={searchInputRef}
          addTodoModalRef={addTodoModalRef}
          isMobile={isMobile}
        />

        {/* 오프라인 알림 */}
        <OfflineNotification />



        {/* PWA 설치 프롬프트 */}
        <PWAInstallPrompt />
      </div>
    </Suspense>
  )
}

function AppContent() {
  const [currentView, setCurrentView] = useState<ViewType | 'recurring' | 'history' | 'analytics' | 'vacation' | 'settings'>('today')
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [isMobile, setIsMobile] = useState(false)
  const [forceMobile, setForceMobile] = useState<boolean | null>(null) // null = 자동감지, true = 강제모바일, false = 강제데스크톱

  const searchInputRef = useRef<HTMLInputElement>(null)
  const addTodoModalRef = useRef<{ open: () => void }>(null)

  // 앱 시작 시 보안, 성능 모니터링 시작
  useEffect(() => {
    debug.log('App 초기화 시작: 보안, 성능 모니터링')

    // 보안 시스템 초기화
    initializeSecurity()

    // 초기 보안 보고서 생성
    const securityReport = generateSecurityReport()
    debug.log('Initial security report:', securityReport)

    // 5초마다 메모리 사용량 체크
    const memoryInterval = setInterval(() => {
      performanceMonitor.measureMemoryUsage()
    }, 5000)

    // 10초마다 에러 통계 로깅
    const errorInterval = setInterval(() => {
      const stats = errorTracker.getErrorStats()
      if (stats.total > 0) {
        debug.log('Error tracking stats:', stats)
      }
    }, 10000)

    // 30초마다 보안 상태 체크 (프로덕션에서는 더 긴 간격 권장)
    const securityInterval = setInterval(() => {
      const report = generateSecurityReport()
      const criticalIssues = report.checks.filter(check => check.status === 'fail')

      if (criticalIssues.length > 0) {
        debug.error('Critical security issues detected:', criticalIssues)
      }
    }, 30000)

    // 정리
    return () => {
      clearInterval(memoryInterval)
      clearInterval(errorInterval)
      clearInterval(securityInterval)
    }
  }, [])

  // 완전히 재작성된 모바일 감지 로직
  useEffect(() => {
    const checkIsMobile = () => {
      const width = window.innerWidth
      const height = window.innerHeight

      debug.log(`모바일 감지 시작: ${width}x${height}`)

      // 1. 강제 모드가 설정된 경우 우선 적용
      if (forceMobile !== null) {
        debug.log(`강제 모드: ${forceMobile ? '모바일' : '데스크톱'}`)
        setIsMobile(forceMobile)
        setIsSidebarOpen(!forceMobile) // 모바일이면 사이드바 닫기
        return
      }

      // 2. 기본 너비 기준 모바일 감지 (가장 중요)
      const isMobileWidth = width <= 768

      // 3. 추가 모바일 감지 조건들
      const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0
      const isMobileUserAgent = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
      const isTabletSize = width > 768 && width <= 1024 && isTouchDevice

      // 4. 고급 모바일 감지 (CSS 미디어 쿼리 + Playwright)
      const mediaQueryMobile = window.matchMedia('(max-width: 768px)').matches
      const mediaQueryTouch = window.matchMedia('(pointer: coarse)').matches
      const isPlaywrightMobile = (width <= 500 && isTouchDevice && isMobileUserAgent) ||
        (isTouchDevice && isMobileUserAgent && window.devicePixelRatio >= 2) ||
        (navigator.userAgent.includes('iPhone') || navigator.userAgent.includes('Android')) ||
        (mediaQueryMobile && isTouchDevice) ||
        (mediaQueryTouch && isMobileUserAgent)

      // 5. 최종 모바일 결정 (명확한 우선순위)
      let detectedMobile = false
      let reason = ''

      if (isPlaywrightMobile) {
        detectedMobile = true
        reason = 'Playwright/고급 모바일 감지'
      } else if (mediaQueryMobile) {
        detectedMobile = true
        reason = `CSS 미디어 쿼리 (≤768px)`
      } else if (isMobileWidth) {
        detectedMobile = true
        reason = `너비 기준 (${width}px ≤ 768px)`
      } else if (isTabletSize) {
        detectedMobile = true
        reason = `태블릿 터치 기기 (${width}px)`
      } else {
        detectedMobile = false
        reason = `데스크톱 (${width}px > 768px)`
      }

      debug.log(`감지 결과: ${detectedMobile ? '모바일' : '데스크톱'} - ${reason}`)
      debug.log(`터치: ${isTouchDevice}, UserAgent: ${isMobileUserAgent}`)
      debug.log(`미디어쿼리: ${mediaQueryMobile}, 터치포인터: ${mediaQueryTouch}, DPR: ${window.devicePixelRatio}`)

      setIsMobile(detectedMobile)

      // 사이드바 상태 설정
      if (detectedMobile) {
        setIsSidebarOpen(false)
        debug.log('모바일 모드: 사이드바 닫음')
      } else {
        setIsSidebarOpen(true)
        debug.log('데스크톱 모드: 사이드바 열림')
      }
    }

    // 즉시 체크
    checkIsMobile()

    // 리사이즈 이벤트 리스너 (throttle 적용)
    let resizeTimeout: NodeJS.Timeout
    const handleResize = () => {
      clearTimeout(resizeTimeout)
      resizeTimeout = setTimeout(checkIsMobile, 100) // 100ms debounce
    }

    window.addEventListener('resize', handleResize)
    window.addEventListener('orientationchange', () => {
      // 방향 변경 후 약간의 지연을 두고 체크
      setTimeout(checkIsMobile, 200)
    })

    // 페이지 로드 완료 후 한 번 더 체크
    const loadTimer = setTimeout(checkIsMobile, 300)

    return () => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('orientationchange', checkIsMobile)
      clearTimeout(resizeTimeout)
      clearTimeout(loadTimer)
    }
  }, [forceMobile])

  // 키보드 단축키 핸들러
  const handleOpenAddTodo = () => {
    addTodoModalRef.current?.open()
  }

  const handleFocusSearch = () => {
    searchInputRef.current?.focus()
  }

  const handleToggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen)
  }

  const handleSwitchToTodayView = () => {
    setCurrentView('today')
  }

  const handleSwitchToWeekView = () => {
    setCurrentView('week')
  }

  const handleSwitchToMonthView = () => {
    setCurrentView('month')
  }

  return (
    <div>
      <KeyboardProvider
        onOpenAddTodo={handleOpenAddTodo}
        onFocusSearch={handleFocusSearch}
        onToggleSidebar={handleToggleSidebar}
        onSwitchToTodayView={handleSwitchToTodayView}
        onSwitchToWeekView={handleSwitchToWeekView}
        onSwitchToMonthView={handleSwitchToMonthView}
      >
        <AppInner
          currentView={currentView}
          setCurrentView={setCurrentView}
          isSidebarOpen={isSidebarOpen}
          setIsSidebarOpen={setIsSidebarOpen}
          searchInputRef={searchInputRef}
          addTodoModalRef={addTodoModalRef}
          isMobile={isMobile}
          forceMobile={forceMobile}
          setForceMobile={setForceMobile}
        />
      </KeyboardProvider>
    </div>
  )
}

function App() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <ErrorBoundary>
        <ThemeProvider>
          <AuthProvider>
            <FontSizeProvider>
              <VacationProvider>
                <CustomHolidayProvider>
                  <TodoProvider>
                    <AppContent />
                  </TodoProvider>
                </CustomHolidayProvider>
              </VacationProvider>
            </FontSizeProvider>
          </AuthProvider>
        </ThemeProvider>
      </ErrorBoundary>
    </Suspense>
  )
}

export default App