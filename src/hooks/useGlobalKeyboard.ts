import { useEffect } from 'react'
import { useKeyboard } from '../contexts/KeyboardContext'

export const useGlobalKeyboard = () => {
  const {
    openAddTodoModal,
    focusSearch,
    toggleSidebar,
    switchToTodayView,
    switchToWeekView,
    switchToMonthView,
  } = useKeyboard()

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ctrl/Cmd + 키 조합 처리
      if (event.ctrlKey || event.metaKey) {
        switch (event.key.toLowerCase()) {
          case '1':
            event.preventDefault()
            switchToTodayView()
            break
          case '2':
            event.preventDefault()
            switchToWeekView()
            break
          case '3':
            event.preventDefault()
            switchToMonthView()
            break
          case 'b':
            event.preventDefault()
            toggleSidebar()
            break
          case 'n':
            event.preventDefault()
            openAddTodoModal()
            break
          case 'f':
            event.preventDefault()
            focusSearch()
            break
          case 'k':
            event.preventDefault()
            showKeyboardShortcuts()
            break
        }
      }

      // ESC 키 처리
      if (event.key === 'Escape') {
        // 모달이나 드롭다운이 열려있으면 닫기
        const activeModals = document.querySelectorAll('[role="dialog"]')
        if (activeModals.length > 0) {
          event.preventDefault()
          // 가장 최근에 열린 모달의 닫기 버튼 클릭
          const closeButton = activeModals[activeModals.length - 1].querySelector('[aria-label="닫기"], [data-close]')
          if (closeButton) {
            (closeButton as HTMLElement).click()
          }
        }
      }
    }

    const showKeyboardShortcuts = () => {
      // 키보드 단축키 도움말 표시
      const shortcuts = [
        'Ctrl+1: 오늘 뷰',
        'Ctrl+2: 주간 뷰', 
        'Ctrl+3: 월간 뷰',
        'Ctrl+N: 새 할일 추가',
        'Ctrl+F: 검색',
        'Ctrl+B: 사이드바 토글',
        'Ctrl+K: 단축키 도움말',
        'ESC: 모달 닫기'
      ]
      
      alert('🎯 키보드 단축키:\n\n' + shortcuts.join('\n'))
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [
    openAddTodoModal,
    focusSearch,
    toggleSidebar,
    switchToTodayView,
    switchToWeekView,
    switchToMonthView,
  ])
}