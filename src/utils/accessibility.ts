// 접근성 유틸리티 함수들
import { debug } from './debug'

// ARIA 레이블 생성 유틸리티
export const createAriaLabel = (
  baseLabel: string,
  context?: string,
  state?: string
): string => {
  let label = baseLabel
  if (context) label += `, ${context}`
  if (state) label += `, ${state}`
  return label
}

// 포커스 트랩을 위한 포커스 가능한 요소 선택자
export const FOCUSABLE_ELEMENTS = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
  'details',
  'summary'
].join(', ')

// 포커스 가능한 요소 찾기
export const getFocusableElements = (container: HTMLElement): HTMLElement[] => {
  return Array.from(
    container.querySelectorAll<HTMLElement>(FOCUSABLE_ELEMENTS)
  ).filter(el => {
    // 숨겨진 요소는 제외
    const style = window.getComputedStyle(el)
    return (
      style.display !== 'none' &&
      style.visibility !== 'hidden' &&
      el.offsetWidth > 0 &&
      el.offsetHeight > 0
    )
  })
}

// 포커스 트랩 설정
export const setupFocusTrap = (
  container: HTMLElement,
  options: {
    initialFocus?: HTMLElement | null
    onEscape?: () => void
    returnFocus?: HTMLElement | null
  } = {}
) => {
  const focusableElements = getFocusableElements(container)
  const firstFocusable = focusableElements[0]
  const lastFocusable = focusableElements[focusableElements.length - 1]
  
  // 이전 포커스된 요소 저장
  const previousActiveElement = document.activeElement as HTMLElement | null

  // 초기 포커스 설정
  if (options.initialFocus && focusableElements.includes(options.initialFocus)) {
    options.initialFocus.focus()
  } else if (firstFocusable) {
    firstFocusable.focus()
  }

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && options.onEscape) {
      options.onEscape()
      return
    }

    if (e.key === 'Tab') {
      if (e.shiftKey) {
        // Shift + Tab (역방향)
        if (document.activeElement === firstFocusable) {
          e.preventDefault()
          lastFocusable?.focus()
        }
      } else {
        // Tab (순방향)
        if (document.activeElement === lastFocusable) {
          e.preventDefault()
          firstFocusable?.focus()
        }
      }
    }
  }

  container.addEventListener('keydown', handleKeyDown)

  // 정리 함수 반환
  return () => {
    container.removeEventListener('keydown', handleKeyDown)
    
    // 원래 포커스 복원
    const returnElement = options.returnFocus || previousActiveElement
    if (returnElement && document.contains(returnElement)) {
      returnElement.focus()
    }
  }
}

// 스크린 리더 전용 텍스트 생성
export const createScreenReaderText = (text: string): HTMLElement => {
  const element = document.createElement('span')
  element.textContent = text
  element.className = 'sr-only'
  element.setAttribute('aria-hidden', 'false')
  return element
}

// 색상 대비 계산 (WCAG 기준)
export const calculateColorContrast = (
  color1: string,
  color2: string
): number => {
  const getLuminance = (color: string): number => {
    // 간단한 luminance 계산 (실제로는 더 복잡한 계산 필요)
    const rgb = color.match(/\d+/g)
    if (!rgb || rgb.length < 3) return 0
    
    const [r, g, b] = rgb.map(n => {
      const sRGB = parseInt(n) / 255
      return sRGB <= 0.03928 
        ? sRGB / 12.92 
        : Math.pow((sRGB + 0.055) / 1.055, 2.4)
    })
    
    return 0.2126 * r + 0.7152 * g + 0.0722 * b
  }

  const lum1 = getLuminance(color1)
  const lum2 = getLuminance(color2)
  const brightest = Math.max(lum1, lum2)
  const darkest = Math.min(lum1, lum2)
  
  return (brightest + 0.05) / (darkest + 0.05)
}

// 키보드 네비게이션 도우미
export const handleArrowKeyNavigation = (
  e: KeyboardEvent,
  elements: HTMLElement[],
  currentIndex: number,
  options: {
    orientation?: 'horizontal' | 'vertical' | 'both'
    loop?: boolean
    onSelectionChange?: (newIndex: number) => void
  } = {}
) => {
  const { orientation = 'both', loop = true, onSelectionChange } = options
  let newIndex = currentIndex

  switch (e.key) {
    case 'ArrowDown':
      if (orientation === 'vertical' || orientation === 'both') {
        e.preventDefault()
        newIndex = currentIndex + 1
      }
      break
    case 'ArrowUp':
      if (orientation === 'vertical' || orientation === 'both') {
        e.preventDefault()
        newIndex = currentIndex - 1
      }
      break
    case 'ArrowRight':
      if (orientation === 'horizontal' || orientation === 'both') {
        e.preventDefault()
        newIndex = currentIndex + 1
      }
      break
    case 'ArrowLeft':
      if (orientation === 'horizontal' || orientation === 'both') {
        e.preventDefault()
        newIndex = currentIndex - 1
      }
      break
    case 'Home':
      e.preventDefault()
      newIndex = 0
      break
    case 'End':
      e.preventDefault()
      newIndex = elements.length - 1
      break
    default:
      return currentIndex
  }

  // 경계 처리
  if (newIndex < 0) {
    newIndex = loop ? elements.length - 1 : 0
  } else if (newIndex >= elements.length) {
    newIndex = loop ? 0 : elements.length - 1
  }

  // 새 요소에 포커스
  if (elements[newIndex]) {
    elements[newIndex].focus()
    onSelectionChange?.(newIndex)
  }

  return newIndex
}

// 접근성 검사 및 경고
export const checkAccessibility = (element: HTMLElement): string[] => {
  const warnings: string[] = []

  // 버튼에 텍스트나 aria-label이 있는지 확인
  if (element.tagName === 'BUTTON') {
    const hasText = element.textContent?.trim()
    const hasAriaLabel = element.getAttribute('aria-label')
    const hasAriaLabelledBy = element.getAttribute('aria-labelledby')
    
    if (!hasText && !hasAriaLabel && !hasAriaLabelledBy) {
      warnings.push('Button without accessible text or aria-label')
    }
  }

  // 이미지에 alt 텍스트가 있는지 확인
  if (element.tagName === 'IMG') {
    const alt = element.getAttribute('alt')
    if (alt === null) {
      warnings.push('Image without alt attribute')
    }
  }

  // 폼 요소에 레이블이 있는지 확인
  if (['INPUT', 'SELECT', 'TEXTAREA'].includes(element.tagName)) {
    const id = element.id
    const hasLabel = id && document.querySelector(`label[for="${id}"]`)
    const hasAriaLabel = element.getAttribute('aria-label')
    const hasAriaLabelledBy = element.getAttribute('aria-labelledby')
    
    if (!hasLabel && !hasAriaLabel && !hasAriaLabelledBy) {
      warnings.push(`Form element (${element.tagName}) without associated label`)
    }
  }

  // 대화형 요소에 키보드 접근성이 있는지 확인
  const isInteractive = ['BUTTON', 'A', 'INPUT', 'SELECT', 'TEXTAREA'].includes(element.tagName)
  const hasTabindex = element.getAttribute('tabindex') !== null
  
  if (isInteractive || hasTabindex) {
    const style = window.getComputedStyle(element)
    if (style.display === 'none' || style.visibility === 'hidden') {
      warnings.push('Interactive element is hidden but still in tab order')
    }
  }

  if (warnings.length > 0) {
    debug.warn('Accessibility warnings found:', warnings)
  }

  return warnings
}

// 실시간 알림을 위한 aria-live 영역 관리
class AriaLiveManager {
  private politeRegion: HTMLElement
  private assertiveRegion: HTMLElement

  constructor() {
    // polite 영역 (중요하지 않은 알림)
    this.politeRegion = document.createElement('div')
    this.politeRegion.setAttribute('aria-live', 'polite')
    this.politeRegion.setAttribute('aria-atomic', 'true')
    this.politeRegion.className = 'sr-only'
    document.body.appendChild(this.politeRegion)

    // assertive 영역 (중요한 알림)
    this.assertiveRegion = document.createElement('div')
    this.assertiveRegion.setAttribute('aria-live', 'assertive')
    this.assertiveRegion.setAttribute('aria-atomic', 'true')
    this.assertiveRegion.className = 'sr-only'
    document.body.appendChild(this.assertiveRegion)
  }

  announce(message: string, priority: 'polite' | 'assertive' = 'polite') {
    const region = priority === 'assertive' ? this.assertiveRegion : this.politeRegion
    
    // 기존 메시지 지우기
    region.textContent = ''
    
    // 약간의 지연 후 새 메시지 설정 (스크린 리더가 변경사항을 감지하도록)
    setTimeout(() => {
      region.textContent = message
    }, 100)

    debug.log(`Aria live announcement (${priority}): ${message}`)
  }

  cleanup() {
    this.politeRegion.remove()
    this.assertiveRegion.remove()
  }
}

// 전역 aria-live 관리자
export const ariaLiveManager = new AriaLiveManager()

// 페이지 제목 동적 업데이트 (스크린 리더 알림)
export const updatePageTitle = (newTitle: string, announce = false) => {
  document.title = newTitle
  
  if (announce) {
    ariaLiveManager.announce(`페이지 제목이 변경되었습니다: ${newTitle}`, 'polite')
  }
}

// 건너뛰기 링크 생성
export const createSkipLink = (targetId: string, text: string): HTMLElement => {
  const skipLink = document.createElement('a')
  skipLink.href = `#${targetId}`
  skipLink.textContent = text
  skipLink.className = 'skip-link sr-only focus:not-sr-only focus:absolute focus:top-0 focus:left-0 z-50 bg-blue-600 text-white p-2'
  
  skipLink.addEventListener('click', (e) => {
    e.preventDefault()
    const target = document.getElementById(targetId)
    if (target) {
      target.focus()
      target.scrollIntoView({ behavior: 'smooth' })
    }
  })
  
  return skipLink
}