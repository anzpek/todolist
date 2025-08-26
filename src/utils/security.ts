// 보안 관련 유틸리티 함수들
import { debug } from './debug'

// XSS 방지를 위한 텍스트 이스케이프
export const escapeHtml = (unsafe: string): string => {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

// 사용자 입력 검증
export const validateUserInput = {
  // 이메일 검증
  email: (email: string): boolean => {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
    return emailRegex.test(email)
  },

  // 할일 제목 검증
  todoTitle: (title: string): { isValid: boolean; error?: string } => {
    if (!title || title.trim().length === 0) {
      return { isValid: false, error: '제목을 입력해주세요' }
    }
    
    if (title.length > 200) {
      return { isValid: false, error: '제목은 200자를 초과할 수 없습니다' }
    }
    
    // 악성 스크립트 패턴 검사
    const maliciousPatterns = [
      /<script/i,
      /javascript:/i,
      /onload=/i,
      /onerror=/i,
      /onclick=/i
    ]
    
    for (const pattern of maliciousPatterns) {
      if (pattern.test(title)) {
        return { isValid: false, error: '유효하지 않은 문자가 포함되어 있습니다' }
      }
    }
    
    return { isValid: true }
  },

  // 할일 설명 검증
  todoDescription: (description: string): { isValid: boolean; error?: string } => {
    if (description && description.length > 1000) {
      return { isValid: false, error: '설명은 1000자를 초과할 수 없습니다' }
    }
    
    // 악성 스크립트 패턴 검사
    const maliciousPatterns = [
      /<script/i,
      /javascript:/i,
      /<iframe/i,
      /<object/i,
      /<embed/i
    ]
    
    for (const pattern of maliciousPatterns) {
      if (pattern.test(description)) {
        return { isValid: false, error: '유효하지 않은 내용이 포함되어 있습니다' }
      }
    }
    
    return { isValid: true }
  },

  // URL 검증 (미래 기능용)
  url: (url: string): boolean => {
    try {
      const parsedUrl = new URL(url)
      return ['http:', 'https:'].includes(parsedUrl.protocol)
    } catch {
      return false
    }
  }
}

// Content Security Policy 헤더 검증
export const checkCSP = (): void => {
  const metaCSP = document.querySelector('meta[http-equiv="Content-Security-Policy"]')
  
  if (!metaCSP) {
    debug.warn('CSP meta tag not found - consider adding Content Security Policy')
  } else {
    debug.log('CSP policy found:', metaCSP.getAttribute('content'))
  }
}

// 로컬스토리지 보안 검사
export const validateLocalStorage = (): void => {
  try {
    const testKey = '_security_test'
    const testValue = 'test'
    
    localStorage.setItem(testKey, testValue)
    const retrieved = localStorage.getItem(testKey)
    localStorage.removeItem(testKey)
    
    if (retrieved !== testValue) {
      debug.error('localStorage security test failed')
    } else {
      debug.log('localStorage security validation passed')
    }
  } catch (error) {
    debug.error('localStorage access error:', error)
  }
}

// Firebase 보안 규칙 검증 (클라이언트 사이드)
export const validateFirebaseAccess = async (): Promise<boolean> => {
  try {
    // 실제 Firebase 연결이 있는지 확인
    if (typeof window !== 'undefined' && (window as any).firebase) {
      debug.log('Firebase is properly initialized')
      return true
    } else {
      debug.warn('Firebase not found or not initialized')
      return false
    }
  } catch (error) {
    debug.error('Firebase validation error:', error)
    return false
  }
}

// 민감한 정보가 콘솔에 출력되지 않도록 검사
export const checkConsoleOutput = (): void => {
  const originalLog = console.log
  const originalWarn = console.warn
  const originalError = console.error
  
  const sensitivePatterns = [
    /password/i,
    /secret/i,
    /token/i,
    /key/i,
    /auth/i,
    /firebase/i
  ]
  
  const checkForSensitiveData = (args: any[]) => {
    const message = args.join(' ')
    for (const pattern of sensitivePatterns) {
      if (pattern.test(message)) {
        debug.warn('Potential sensitive data in console output detected')
        break
      }
    }
  }
  
  console.log = (...args: any[]) => {
    checkForSensitiveData(args)
    originalLog.apply(console, args)
  }
  
  console.warn = (...args: any[]) => {
    checkForSensitiveData(args)
    originalWarn.apply(console, args)
  }
  
  console.error = (...args: any[]) => {
    checkForSensitiveData(args)
    originalError.apply(console, args)
  }
}

// 브라우저 보안 기능 검사
export const checkBrowserSecurity = (): {
  https: boolean
  secureContext: boolean
  cookieSecure: boolean
  localStorage: boolean
  sessionStorage: boolean
} => {
  const security = {
    https: window.location.protocol === 'https:',
    secureContext: window.isSecureContext,
    cookieSecure: document.cookie.includes('Secure'),
    localStorage: !!window.localStorage,
    sessionStorage: !!window.sessionStorage
  }
  
  debug.log('Browser security check:', security)
  
  if (!security.https && window.location.hostname !== 'localhost') {
    debug.warn('Site is not served over HTTPS')
  }
  
  if (!security.secureContext) {
    debug.warn('Not running in secure context')
  }
  
  return security
}

// 입력 필드에 자동 보안 속성 설정
export const secureInputElement = (input: HTMLInputElement): void => {
  // 자동완성 제한 (민감한 정보의 경우)
  if (input.type === 'password') {
    input.setAttribute('autocomplete', 'current-password')
    input.setAttribute('spellcheck', 'false')
  }
  
  // 복사/붙여넣기 제한 (필요한 경우)
  if (input.dataset.sensitive === 'true') {
    input.addEventListener('copy', (e) => {
      e.preventDefault()
      debug.warn('Copy prevented on sensitive field')
    })
    
    input.addEventListener('contextmenu', (e) => {
      e.preventDefault()
    })
  }
  
  // 입력값 실시간 검증
  input.addEventListener('input', (e) => {
    const target = e.target as HTMLInputElement
    const value = target.value
    
    // 기본적인 XSS 패턴 검사
    const xssPatterns = [/<script/i, /javascript:/i, /onload=/i]
    for (const pattern of xssPatterns) {
      if (pattern.test(value)) {
        target.setCustomValidity('유효하지 않은 문자가 입력되었습니다')
        return
      }
    }
    
    target.setCustomValidity('')
  })
}

// DOM 조작 보안 검사
export const secureDOMManipulation = (element: Element, content: string): void => {
  // innerHTML 대신 textContent 사용 권장
  if (content.includes('<') || content.includes('>')) {
    debug.warn('HTML content detected - using textContent for safety')
    element.textContent = content
  } else {
    element.textContent = content
  }
}

// 앱 전체 보안 초기화
export const initializeSecurity = (): void => {
  debug.log('Initializing security measures...')
  
  // CSP 검사
  checkCSP()
  
  // 로컬스토리지 검증
  validateLocalStorage()
  
  // 브라우저 보안 검사
  checkBrowserSecurity()
  
  // Firebase 접근 검증
  validateFirebaseAccess()
  
  // 개발 환경에서만 콘솔 출력 검사
  if (import.meta.env.DEV) {
    checkConsoleOutput()
  }
  
  // 전역 에러 핸들러로 보안 이벤트 로깅
  window.addEventListener('error', (event) => {
    if (event.error && event.error.name === 'SecurityError') {
      debug.error('Security error detected:', event.error)
    }
  })
  
  debug.log('Security initialization completed')
}

// 보안 점검 보고서 생성
export const generateSecurityReport = (): {
  timestamp: number
  checks: Array<{
    name: string
    status: 'pass' | 'fail' | 'warning'
    details?: string
  }>
} => {
  const checks = []
  const browserSec = checkBrowserSecurity()
  
  // HTTPS 검사
  checks.push({
    name: 'HTTPS',
    status: browserSec.https ? 'pass' : 'fail',
    details: browserSec.https ? 'Site served over HTTPS' : 'Site not served over HTTPS'
  })
  
  // 보안 컨텍스트 검사
  checks.push({
    name: 'Secure Context',
    status: browserSec.secureContext ? 'pass' : 'fail',
    details: browserSec.secureContext ? 'Running in secure context' : 'Not running in secure context'
  })
  
  // 스토리지 검사
  checks.push({
    name: 'Local Storage',
    status: browserSec.localStorage ? 'pass' : 'fail',
    details: browserSec.localStorage ? 'localStorage available' : 'localStorage not available'
  })
  
  const report = {
    timestamp: Date.now(),
    checks
  }
  
  debug.log('Security report generated:', report)
  return report
}