// 성능 모니터링 유틸리티
import { debug } from './debug'

// Web Vitals 메트릭 인터페이스
interface WebVitalsMetric {
  name: string
  value: number
  rating: 'good' | 'needs-improvement' | 'poor'
  timestamp: number
}

// 성능 메트릭 수집기
class PerformanceMonitor {
  private metrics: WebVitalsMetric[] = []
  private observers: PerformanceObserver[] = []

  constructor() {
    this.setupObservers()
    this.measureInitialLoad()
  }

  private setupObservers(): void {
    try {
      // LCP (Largest Contentful Paint) 모니터링
      if ('PerformanceObserver' in window) {
        const lcpObserver = new PerformanceObserver((entryList) => {
          const entries = entryList.getEntries()
          const lastEntry = entries[entries.length - 1] as any
          this.recordMetric('LCP', lastEntry.startTime, this.getRating('LCP', lastEntry.startTime))
        })
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] })
        this.observers.push(lcpObserver)

        // FID (First Input Delay) 모니터링
        const fidObserver = new PerformanceObserver((entryList) => {
          for (const entry of entryList.getEntries()) {
            const fid = (entry as any).processingStart - entry.startTime
            this.recordMetric('FID', fid, this.getRating('FID', fid))
          }
        })
        fidObserver.observe({ entryTypes: ['first-input'] })
        this.observers.push(fidObserver)

        // CLS (Cumulative Layout Shift) 모니터링
        let clsValue = 0
        const clsObserver = new PerformanceObserver((entryList) => {
          for (const entry of entryList.getEntries()) {
            if (!(entry as any).hadRecentInput) {
              clsValue += (entry as any).value
            }
          }
          this.recordMetric('CLS', clsValue, this.getRating('CLS', clsValue))
        })
        clsObserver.observe({ entryTypes: ['layout-shift'] })
        this.observers.push(clsObserver)
      }
    } catch (error) {
      debug.error('Performance observer setup failed:', error)
    }
  }

  private measureInitialLoad(): void {
    // DOM 로딩 완료 후 메트릭 수집
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.collectNavigationMetrics())
    } else {
      this.collectNavigationMetrics()
    }
  }

  private collectNavigationMetrics(): void {
    if (performance.getEntriesByType) {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
      if (navigation) {
        // TTFB (Time to First Byte)
        const ttfb = navigation.responseStart - navigation.requestStart
        this.recordMetric('TTFB', ttfb, this.getRating('TTFB', ttfb))

        // DOM Content Loaded
        const domContentLoaded = navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart
        this.recordMetric('DOM_LOADED', domContentLoaded, this.getRating('DOM_LOADED', domContentLoaded))

        // 전체 페이지 로드 시간
        const loadComplete = navigation.loadEventEnd - navigation.loadEventStart
        this.recordMetric('LOAD_COMPLETE', loadComplete, this.getRating('LOAD_COMPLETE', loadComplete))
      }
    }
  }

  private getRating(metric: string, value: number): 'good' | 'needs-improvement' | 'poor' {
    const thresholds: Record<string, { good: number; poor: number }> = {
      'LCP': { good: 2500, poor: 4000 },
      'FID': { good: 100, poor: 300 },
      'CLS': { good: 0.1, poor: 0.25 },
      'TTFB': { good: 800, poor: 1800 },
      'DOM_LOADED': { good: 1000, poor: 3000 },
      'LOAD_COMPLETE': { good: 2000, poor: 5000 }
    }

    const threshold = thresholds[metric]
    if (!threshold) return 'good'

    if (value <= threshold.good) return 'good'
    if (value <= threshold.poor) return 'needs-improvement'
    return 'poor'
  }

  private recordMetric(name: string, value: number, rating: 'good' | 'needs-improvement' | 'poor'): void {
    const metric: WebVitalsMetric = {
      name,
      value,
      rating,
      timestamp: Date.now()
    }

    this.metrics.push(metric)
    debug.log(`Performance metric: ${name} = ${value.toFixed(2)}ms (${rating})`)

    // 성능이 poor인 경우 경고
    if (rating === 'poor') {
      debug.warn(`Poor performance detected: ${name} = ${value.toFixed(2)}ms`)
    }
  }

  // 메모리 사용량 모니터링
  measureMemoryUsage(): void {
    if ('memory' in performance) {
      const memory = (performance as any).memory
      debug.log('Memory usage:', {
        used: `${(memory.usedJSHeapSize / 1024 / 1024).toFixed(2)}MB`,
        total: `${(memory.totalJSHeapSize / 1024 / 1024).toFixed(2)}MB`,
        limit: `${(memory.jsHeapSizeLimit / 1024 / 1024).toFixed(2)}MB`
      })
    }
  }

  // 현재 메트릭 반환
  getMetrics(): WebVitalsMetric[] {
    return [...this.metrics]
  }

  // 메트릭 요약 정보
  getSummary(): Record<string, { value: number; rating: string }> {
    const summary: Record<string, { value: number; rating: string }> = {}
    
    // 각 메트릭의 최신 값
    const metricNames = [...new Set(this.metrics.map(m => m.name))]
    metricNames.forEach(name => {
      const latestMetric = this.metrics
        .filter(m => m.name === name)
        .sort((a, b) => b.timestamp - a.timestamp)[0]
      
      if (latestMetric) {
        summary[name] = {
          value: latestMetric.value,
          rating: latestMetric.rating
        }
      }
    })

    return summary
  }

  // 정리
  cleanup(): void {
    this.observers.forEach(observer => observer.disconnect())
    this.observers = []
    this.metrics = []
  }
}

// 전역 성능 모니터 인스턴스
export const performanceMonitor = new PerformanceMonitor()

// React 컴포넌트 렌더링 성능 측정 훅
export const measureRenderTime = (componentName: string) => {
  const startTime = performance.now()
  
  return () => {
    const endTime = performance.now()
    const renderTime = endTime - startTime
    debug.log(`Render time for ${componentName}: ${renderTime.toFixed(2)}ms`)
    
    if (renderTime > 16.67) { // 60fps 기준
      debug.warn(`Slow render detected: ${componentName} took ${renderTime.toFixed(2)}ms`)
    }
  }
}

// 비동기 작업 성능 측정
export const measureAsyncOperation = async <T>(
  operationName: string, 
  operation: () => Promise<T>
): Promise<T> => {
  const startTime = performance.now()
  try {
    const result = await operation()
    const endTime = performance.now()
    debug.log(`${operationName} completed in ${(endTime - startTime).toFixed(2)}ms`)
    return result
  } catch (error) {
    const endTime = performance.now()
    debug.error(`${operationName} failed after ${(endTime - startTime).toFixed(2)}ms:`, error)
    throw error
  }
}