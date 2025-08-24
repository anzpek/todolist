// 접근성 관련 React 훅들
import { useEffect, useRef, useCallback, useState } from 'react'
import { 
  setupFocusTrap, 
  getFocusableElements,
  handleArrowKeyNavigation,
  ariaLiveManager,
  checkAccessibility
} from '../utils/accessibility'
import { debug } from '../utils/debug'

// 포커스 트랩 훅
export const useFocusTrap = (
  isActive: boolean,
  options: {
    initialFocus?: HTMLElement | null
    onEscape?: () => void
    returnFocus?: HTMLElement | null
  } = {}
) => {
  const containerRef = useRef<HTMLElement>(null)
  const cleanupRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    if (isActive && containerRef.current) {
      cleanupRef.current = setupFocusTrap(containerRef.current, options)
    } else if (cleanupRef.current) {
      cleanupRef.current()
      cleanupRef.current = null
    }

    return () => {
      if (cleanupRef.current) {
        cleanupRef.current()
        cleanupRef.current = null
      }
    }
  }, [isActive, options.onEscape])

  return containerRef
}

// 키보드 네비게이션 훅
export const useKeyboardNavigation = <T extends HTMLElement>(
  items: T[],
  options: {
    orientation?: 'horizontal' | 'vertical' | 'both'
    loop?: boolean
    initialIndex?: number
    onSelectionChange?: (index: number, element: T) => void
  } = {}
) => {
  const [currentIndex, setCurrentIndex] = useState(options.initialIndex ?? 0)
  const { orientation = 'both', loop = true, onSelectionChange } = options

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const newIndex = handleArrowKeyNavigation(
      e,
      items,
      currentIndex,
      {
        orientation,
        loop,
        onSelectionChange: (index) => {
          setCurrentIndex(index)
          onSelectionChange?.(index, items[index])
        }
      }
    )
  }, [items, currentIndex, orientation, loop, onSelectionChange])

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  const setCurrentItem = useCallback((index: number) => {
    if (index >= 0 && index < items.length) {
      setCurrentIndex(index)
      items[index]?.focus()
      onSelectionChange?.(index, items[index])
    }
  }, [items, onSelectionChange])

  return {
    currentIndex,
    setCurrentItem,
    currentItem: items[currentIndex]
  }
}

// ARIA 라이브 알림 훅
export const useAriaLive = () => {
  const announce = useCallback((
    message: string, 
    priority: 'polite' | 'assertive' = 'polite'
  ) => {
    ariaLiveManager.announce(message, priority)
  }, [])

  return { announce }
}

// 접근성 검사 훅 (개발 환경에서만 사용)
export const useAccessibilityCheck = (elementRef: React.RefObject<HTMLElement>) => {
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && elementRef.current) {
      const warnings = checkAccessibility(elementRef.current)
      if (warnings.length > 0) {
        debug.warn(`Accessibility issues in component:`, warnings)
      }
    }
  })
}

// 동적 aria-describedby 관리 훅
export const useAriaDescribedBy = (baseId: string) => {
  const [descriptions, setDescriptions] = useState<string[]>([])

  const addDescription = useCallback((description: string) => {
    setDescriptions(prev => [...prev, description])
  }, [])

  const removeDescription = useCallback((description: string) => {
    setDescriptions(prev => prev.filter(d => d !== description))
  }, [])

  const clearDescriptions = useCallback(() => {
    setDescriptions([])
  }, [])

  // aria-describedby 속성 값 생성
  const ariaDescribedBy = descriptions.length > 0 
    ? descriptions.map((_, index) => `${baseId}-desc-${index}`).join(' ')
    : undefined

  return {
    ariaDescribedBy,
    addDescription,
    removeDescription,
    clearDescriptions,
    descriptions
  }
}

// 색상 모드 변경 알림 훅
export const useColorModeAnnouncement = (isDarkMode: boolean) => {
  const { announce } = useAriaLive()

  useEffect(() => {
    announce(
      `색상 모드가 ${isDarkMode ? '다크 모드' : '라이트 모드'}로 변경되었습니다`,
      'polite'
    )
  }, [isDarkMode, announce])
}

// 페이지 로딩 상태 알림 훅
export const useLoadingAnnouncement = (isLoading: boolean, loadingMessage?: string) => {
  const { announce } = useAriaLive()

  useEffect(() => {
    if (isLoading) {
      announce(loadingMessage || '로딩 중입니다', 'polite')
    }
  }, [isLoading, loadingMessage, announce])
}

// 에러 상태 알림 훅
export const useErrorAnnouncement = (error: string | null) => {
  const { announce } = useAriaLive()

  useEffect(() => {
    if (error) {
      announce(`오류가 발생했습니다: ${error}`, 'assertive')
    }
  }, [error, announce])
}

// 성공 알림 훅
export const useSuccessAnnouncement = (successMessage: string | null) => {
  const { announce } = useAriaLive()

  useEffect(() => {
    if (successMessage) {
      announce(successMessage, 'polite')
    }
  }, [successMessage, announce])
}

// 리스트 변경 알림 훅
export const useListChangeAnnouncement = <T>(
  items: T[], 
  getItemName: (item: T) => string,
  options: {
    announceAdd?: boolean
    announceRemove?: boolean
    announceReorder?: boolean
  } = {}
) => {
  const { announce } = useAriaLive()
  const previousItemsRef = useRef<T[]>([])
  const { announceAdd = true, announceRemove = true, announceReorder = false } = options

  useEffect(() => {
    const previousItems = previousItemsRef.current
    
    if (previousItems.length === 0 && items.length > 0) {
      // 초기 로딩은 알림하지 않음
      previousItemsRef.current = [...items]
      return
    }

    if (items.length > previousItems.length && announceAdd) {
      // 항목 추가
      const addedItems = items.slice(previousItems.length)
      if (addedItems.length === 1) {
        announce(`${getItemName(addedItems[0])}이(가) 추가되었습니다`, 'polite')
      } else {
        announce(`${addedItems.length}개의 항목이 추가되었습니다`, 'polite')
      }
    } else if (items.length < previousItems.length && announceRemove) {
      // 항목 제거
      const removedCount = previousItems.length - items.length
      if (removedCount === 1) {
        announce(`항목이 삭제되었습니다`, 'polite')
      } else {
        announce(`${removedCount}개의 항목이 삭제되었습니다`, 'polite')
      }
    } else if (items.length === previousItems.length && announceReorder) {
      // 순서 변경 감지 (간단한 비교)
      const hasOrderChanged = items.some((item, index) => item !== previousItems[index])
      if (hasOrderChanged) {
        announce('항목 순서가 변경되었습니다', 'polite')
      }
    }

    previousItemsRef.current = [...items]
  }, [items, getItemName, announce, announceAdd, announceRemove, announceReorder])
}

// 탭/아코디언 네비게이션 훅
export const useTabNavigation = (
  tabs: { id: string; title: string; disabled?: boolean }[],
  initialTabIndex = 0
) => {
  const [activeTabIndex, setActiveTabIndex] = useState(initialTabIndex)
  const tabRefs = useRef<(HTMLElement | null)[]>([])

  const handleKeyDown = useCallback((e: KeyboardEvent, tabIndex: number) => {
    let newIndex = tabIndex

    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        e.preventDefault()
        do {
          newIndex = (newIndex + 1) % tabs.length
        } while (tabs[newIndex]?.disabled)
        break

      case 'ArrowLeft':
      case 'ArrowUp':
        e.preventDefault()
        do {
          newIndex = newIndex === 0 ? tabs.length - 1 : newIndex - 1
        } while (tabs[newIndex]?.disabled)
        break

      case 'Home':
        e.preventDefault()
        newIndex = 0
        while (tabs[newIndex]?.disabled && newIndex < tabs.length - 1) {
          newIndex++
        }
        break

      case 'End':
        e.preventDefault()
        newIndex = tabs.length - 1
        while (tabs[newIndex]?.disabled && newIndex > 0) {
          newIndex--
        }
        break

      default:
        return
    }

    if (newIndex !== tabIndex && !tabs[newIndex]?.disabled) {
      setActiveTabIndex(newIndex)
      tabRefs.current[newIndex]?.focus()
    }
  }, [tabs])

  const getTabProps = useCallback((index: number) => ({
    ref: (el: HTMLElement | null) => {
      tabRefs.current[index] = el
    },
    role: 'tab',
    'aria-selected': activeTabIndex === index,
    'aria-controls': `tabpanel-${tabs[index]?.id}`,
    id: `tab-${tabs[index]?.id}`,
    tabIndex: activeTabIndex === index ? 0 : -1,
    disabled: tabs[index]?.disabled,
    onKeyDown: (e: KeyboardEvent) => handleKeyDown(e, index),
    onClick: () => !tabs[index]?.disabled && setActiveTabIndex(index)
  }), [activeTabIndex, tabs, handleKeyDown])

  const getTabPanelProps = useCallback((index: number) => ({
    role: 'tabpanel',
    id: `tabpanel-${tabs[index]?.id}`,
    'aria-labelledby': `tab-${tabs[index]?.id}`,
    hidden: activeTabIndex !== index,
    tabIndex: activeTabIndex === index ? 0 : -1
  }), [activeTabIndex, tabs])

  return {
    activeTabIndex,
    setActiveTabIndex,
    getTabProps,
    getTabPanelProps
  }
}