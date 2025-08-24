import { describe, it, expect, vi } from 'vitest'
import { TodoError, handleFirestoreError, isRetriableError, withRetry } from '../errorHandling'

describe('TodoError', () => {
  it('should create error with message and code', () => {
    const error = new TodoError('Test message', 'TEST_CODE')
    
    expect(error.message).toBe('Test message')
    expect(error.code).toBe('TEST_CODE')
    expect(error.name).toBe('TodoError')
  })

  it('should default to UNKNOWN_ERROR code', () => {
    const error = new TodoError('Test message')
    
    expect(error.code).toBe('UNKNOWN_ERROR')
  })

  it('should store original error', () => {
    const originalError = new Error('Original')
    const error = new TodoError('Wrapped', 'WRAP_ERROR', originalError)
    
    expect(error.originalError).toBe(originalError)
  })
})

describe('handleFirestoreError', () => {
  it('should handle permission-denied error', () => {
    const firestoreError = { code: 'permission-denied', message: 'Permission denied' }
    
    const result = handleFirestoreError(firestoreError, 'testOperation')
    
    expect(result).toBeInstanceOf(TodoError)
    expect(result.code).toBe('PERMISSION_DENIED')
    expect(result.message).toContain('권한이 없습니다')
  })

  it('should handle not-found error', () => {
    const firestoreError = { code: 'not-found', message: 'Document not found' }
    
    const result = handleFirestoreError(firestoreError, 'testOperation')
    
    expect(result).toBeInstanceOf(TodoError)
    expect(result.code).toBe('NOT_FOUND')
    expect(result.message).toContain('찾을 수 없습니다')
  })

  it('should handle unavailable error', () => {
    const firestoreError = { code: 'unavailable', message: 'Service unavailable' }
    
    const result = handleFirestoreError(firestoreError, 'testOperation')
    
    expect(result).toBeInstanceOf(TodoError)
    expect(result.code).toBe('UNAVAILABLE')
    expect(result.message).toContain('일시적으로 접근할 수 없습니다')
  })

  it('should handle unknown errors', () => {
    const unknownError = { code: 'unknown-code', message: 'Unknown error' }
    
    const result = handleFirestoreError(unknownError, 'testOperation')
    
    expect(result).toBeInstanceOf(TodoError)
    expect(result.code).toBe('unknown-code')
    expect(result.message).toContain('testOperation 중 오류가 발생했습니다')
  })

  it('should handle regular Error objects', () => {
    const error = new Error('Regular error')
    
    const result = handleFirestoreError(error, 'testOperation')
    
    expect(result).toBeInstanceOf(TodoError)
    expect(result.code).toBe('GENERAL_ERROR')
    expect(result.message).toContain('Regular error')
  })

  it('should handle non-error values', () => {
    const result = handleFirestoreError('string error', 'testOperation')
    
    expect(result).toBeInstanceOf(TodoError)
    expect(result.code).toBe('UNKNOWN_ERROR')
    expect(result.message).toContain('알 수 없는 오류')
  })
})

describe('isRetriableError', () => {
  it('should identify retriable errors', () => {
    const retriableError = new TodoError('Test', 'unavailable')
    expect(isRetriableError(retriableError)).toBe(true)
  })

  it('should identify non-retriable errors', () => {
    const nonRetriableError = new TodoError('Test', 'permission-denied')
    expect(isRetriableError(nonRetriableError)).toBe(false)
  })
})

describe('withRetry', () => {
  it('should succeed on first attempt', async () => {
    const operation = vi.fn().mockResolvedValue('success')
    
    const result = await withRetry(operation)
    
    expect(result).toBe('success')
    expect(operation).toHaveBeenCalledTimes(1)
  })

  it('should retry retriable errors', async () => {
    const retriableError = new TodoError('Unavailable', 'unavailable')
    const operation = vi.fn()
      .mockRejectedValueOnce(retriableError)
      .mockRejectedValueOnce(retriableError)
      .mockResolvedValue('success')
    
    const result = await withRetry(operation)
    
    expect(result).toBe('success')
    expect(operation).toHaveBeenCalledTimes(3)
  })

  it('should not retry non-retriable errors', async () => {
    const nonRetriableError = new TodoError('Permission denied', 'permission-denied')
    const operation = vi.fn().mockRejectedValue(nonRetriableError)
    
    await expect(withRetry(operation)).rejects.toThrow(nonRetriableError)
    expect(operation).toHaveBeenCalledTimes(1)
  })

  it('should fail after max retries', async () => {
    const retriableError = new TodoError('Unavailable', 'unavailable')
    const operation = vi.fn().mockRejectedValue(retriableError)
    
    await expect(withRetry(operation, 2)).rejects.toThrow(retriableError)
    expect(operation).toHaveBeenCalledTimes(2)
  })

  it('should respect custom retry count', async () => {
    const retriableError = new TodoError('Unavailable', 'unavailable')
    const operation = vi.fn().mockRejectedValue(retriableError)
    
    await expect(withRetry(operation, 1)).rejects.toThrow(retriableError)
    expect(operation).toHaveBeenCalledTimes(1)
  })
})