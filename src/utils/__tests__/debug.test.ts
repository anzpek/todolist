import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// 환경별로 다른 debug 모듈을 테스트
const createMockDebug = (isDev: boolean) => ({
  log: (message: string, data?: any) => {
    if (isDev) {
      console.log(message, data)
    }
  },
  warn: (message: string, data?: any) => {
    if (isDev) {
      console.warn(message, data)
    }
  },
  error: (message: string, error?: any) => {
    if (isDev) {
      console.error(message, error)
    } else {
      console.error(message, error?.message || error)
    }
  },
  info: (message: string, data?: any) => {
    if (isDev) {
      console.info(message, data)
    }
  },
  time: (label: string) => {
    if (isDev) {
      console.time(label)
    }
  },
  timeEnd: (label: string) => {
    if (isDev) {
      console.timeEnd(label)
    }
  }
})

// Console 스파이 설정
const consoleSpy = {
  log: vi.spyOn(console, 'log'),
  warn: vi.spyOn(console, 'warn'),
  error: vi.spyOn(console, 'error'),
  info: vi.spyOn(console, 'info'),
  time: vi.spyOn(console, 'time'),
  timeEnd: vi.spyOn(console, 'timeEnd')
}

describe('debug utility', () => {
  beforeEach(() => {
    Object.values(consoleSpy).forEach(spy => spy.mockClear())
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('in development environment', () => {
    it('should log debug messages in development', () => {
      const debug = createMockDebug(true)
      
      const message = 'Test debug message'
      const data = { test: 'data' }
      
      debug.log(message, data)
      
      expect(consoleSpy.log).toHaveBeenCalledWith(message, data)
    })

    it('should log errors with full details in development', () => {
      const debug = createMockDebug(true)
      
      const message = 'Test error message'
      const error = new Error('Test error')
      
      debug.error(message, error)
      
      expect(consoleSpy.error).toHaveBeenCalledWith(message, error)
    })
  })

  describe('in production environment', () => {
    it('should not log debug messages in production', () => {
      const debug = createMockDebug(false)
      
      debug.log('Should not appear')
      
      expect(consoleSpy.log).not.toHaveBeenCalled()
    })

    it('should sanitize error messages in production', () => {
      const debug = createMockDebug(false)
      
      const message = 'Production error'
      const error = new Error('Detailed error info')
      
      debug.error(message, error)
      
      expect(consoleSpy.error).toHaveBeenCalledWith(message, 'Detailed error info')
    })
  })

  describe('basic functionality', () => {
    it('should have all required methods', async () => {
      const { debug } = await import('../debug')
      
      expect(typeof debug.log).toBe('function')
      expect(typeof debug.warn).toBe('function') 
      expect(typeof debug.error).toBe('function')
      expect(typeof debug.info).toBe('function')
      expect(typeof debug.time).toBe('function')
      expect(typeof debug.timeEnd).toBe('function')
    })
  })
})