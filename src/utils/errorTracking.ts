// 에러 추적 시스템
import { debug } from './debug'
import { TodoError } from './errorHandling'

// 에러 심각도 레벨
type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical'

// 에러 정보 인터페이스
interface ErrorInfo {
  id: string
  message: string
  stack?: string
  severity: ErrorSeverity
  timestamp: number
  url: string
  userAgent: string
  userId?: string
  context?: Record<string, any>
  resolved: boolean
}

// React 에러 정보
interface ReactErrorInfo {
  componentStack: string
  errorBoundary?: string
}

class ErrorTracker {
  private errors: ErrorInfo[] = []
  private maxErrors = 100 // 메모리 관리를 위한 최대 에러 수

  constructor() {
    this.setupGlobalErrorHandling()
  }

  private setupGlobalErrorHandling(): void {
    // 전역 JavaScript 에러 처리
    window.addEventListener('error', (event) => {
      this.trackError({
        message: event.message,
        stack: event.error?.stack,
        severity: 'high',
        context: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno
        }
      })
    })

    // Promise rejection 처리
    window.addEventListener('unhandledrejection', (event) => {
      const error = event.reason
      this.trackError({
        message: error?.message || 'Unhandled promise rejection',
        stack: error?.stack,
        severity: 'high',
        context: {
          type: 'unhandled_promise_rejection',
          reason: error
        }
      })
    })

    // 리소스 로딩 에러 처리
    window.addEventListener('error', (event) => {
      if (event.target !== window) {
        this.trackError({
          message: 'Resource loading failed',
          severity: 'medium',
          context: {
            type: 'resource_error',
            element: (event.target as Element)?.tagName,
            source: (event.target as any)?.src || (event.target as any)?.href
          }
        })
      }
    }, true)
  }

  // 에러 추적
  trackError(errorData: {
    message: string
    stack?: string
    severity: ErrorSeverity
    context?: Record<string, any>
    userId?: string
  }): string {
    const error: ErrorInfo = {
      id: this.generateErrorId(),
      message: errorData.message,
      stack: errorData.stack,
      severity: errorData.severity,
      timestamp: Date.now(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      userId: errorData.userId,
      context: errorData.context,
      resolved: false
    }

    this.errors.push(error)

    // 메모리 관리
    if (this.errors.length > this.maxErrors) {
      this.errors = this.errors.slice(-this.maxErrors)
    }

    // 심각한 에러는 즉시 로깅
    if (error.severity === 'critical' || error.severity === 'high') {
      debug.error(`[ErrorTracker] ${error.severity.toUpperCase()}: ${error.message}`, {
        id: error.id,
        stack: error.stack,
        context: error.context
      })
    } else {
      debug.warn(`[ErrorTracker] ${error.severity.toUpperCase()}: ${error.message}`)
    }

    return error.id
  }

  // React 에러 추적
  trackReactError(error: Error, errorInfo: ReactErrorInfo, userId?: string): string {
    return this.trackError({
      message: `React Error: ${error.message}`,
      stack: error.stack,
      severity: 'high',
      context: {
        type: 'react_error',
        componentStack: errorInfo.componentStack,
        errorBoundary: errorInfo.errorBoundary
      },
      userId
    })
  }

  // Firebase 에러 추적
  trackFirebaseError(error: any, operation: string, userId?: string): string {
    const severity: ErrorSeverity = this.getFirebaseErrorSeverity(error.code)
    
    return this.trackError({
      message: `Firebase Error in ${operation}: ${error.message}`,
      stack: error.stack,
      severity,
      context: {
        type: 'firebase_error',
        code: error.code,
        operation,
        customData: error.customData
      },
      userId
    })
  }

  // 사용자 액션 에러 추적
  trackUserActionError(action: string, error: Error, userId?: string): string {
    return this.trackError({
      message: `User Action Error (${action}): ${error.message}`,
      stack: error.stack,
      severity: 'medium',
      context: {
        type: 'user_action_error',
        action,
        timestamp: Date.now()
      },
      userId
    })
  }

  private getFirebaseErrorSeverity(code: string): ErrorSeverity {
    const criticalCodes = ['internal', 'unavailable', 'data-loss']
    const highCodes = ['permission-denied', 'unauthenticated', 'failed-precondition']
    const mediumCodes = ['not-found', 'already-exists', 'invalid-argument']
    
    if (criticalCodes.includes(code)) return 'critical'
    if (highCodes.includes(code)) return 'high'
    if (mediumCodes.includes(code)) return 'medium'
    return 'low'
  }

  private generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  // 에러 해결 처리
  resolveError(errorId: string): boolean {
    const error = this.errors.find(e => e.id === errorId)
    if (error) {
      error.resolved = true
      debug.log(`Error resolved: ${errorId}`)
      return true
    }
    return false
  }

  // 에러 통계
  getErrorStats(): {
    total: number
    resolved: number
    unresolved: number
    bySeverity: Record<ErrorSeverity, number>
    recent: ErrorInfo[]
  } {
    const total = this.errors.length
    const resolved = this.errors.filter(e => e.resolved).length
    const unresolved = total - resolved
    
    const bySeverity = this.errors.reduce((acc, error) => {
      acc[error.severity] = (acc[error.severity] || 0) + 1
      return acc
    }, {} as Record<ErrorSeverity, number>)

    const recent = this.errors
      .slice(-10)
      .sort((a, b) => b.timestamp - a.timestamp)

    return {
      total,
      resolved,
      unresolved,
      bySeverity,
      recent
    }
  }

  // 심각한 에러 목록
  getCriticalErrors(): ErrorInfo[] {
    return this.errors.filter(e => 
      (e.severity === 'critical' || e.severity === 'high') && !e.resolved
    )
  }

  // 에러 검색
  searchErrors(query: string): ErrorInfo[] {
    const lowercaseQuery = query.toLowerCase()
    return this.errors.filter(error => 
      error.message.toLowerCase().includes(lowercaseQuery) ||
      error.stack?.toLowerCase().includes(lowercaseQuery)
    )
  }

  // 에러 내보내기 (분석용)
  exportErrors(): string {
    return JSON.stringify(this.errors, null, 2)
  }

  // 정리
  cleanup(): void {
    this.errors = []
  }
}

// 전역 에러 트래커 인스턴스
export const errorTracker = new ErrorTracker()

// React Error Boundary용 헬퍼
export const createErrorBoundaryHandler = (boundaryName: string) => {
  return (error: Error, errorInfo: { componentStack: string }) => {
    errorTracker.trackReactError(error, {
      componentStack: errorInfo.componentStack,
      errorBoundary: boundaryName
    })
  }
}

// 비동기 작업 에러 래핑
export const withErrorTracking = async <T>(
  operation: () => Promise<T>,
  operationName: string,
  userId?: string
): Promise<T> => {
  try {
    return await operation()
  } catch (error) {
    const err = error as Error
    errorTracker.trackError({
      message: `Operation failed: ${operationName} - ${err.message}`,
      stack: err.stack,
      severity: 'medium',
      context: {
        operation: operationName
      },
      userId
    })
    throw error
  }
}