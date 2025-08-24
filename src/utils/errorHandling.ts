// Firebase error handling utilities

export interface FirestoreError extends Error {
  code?: string
  customData?: any
}

export class TodoError extends Error {
  constructor(
    message: string,
    public code: string = 'UNKNOWN_ERROR',
    public originalError?: unknown
  ) {
    super(message)
    this.name = 'TodoError'
  }
}

export const handleFirestoreError = (error: unknown, operation: string): TodoError => {
  if (error && typeof error === 'object' && 'code' in error) {
    const firestoreError = error as FirestoreError
    
    switch (firestoreError.code) {
      case 'permission-denied':
        return new TodoError(
          '권한이 없습니다. 로그인 상태를 확인해주세요.',
          'PERMISSION_DENIED',
          error
        )
      case 'not-found':
        return new TodoError(
          '요청한 데이터를 찾을 수 없습니다.',
          'NOT_FOUND',
          error
        )
      case 'unavailable':
        return new TodoError(
          '서버에 일시적으로 접근할 수 없습니다. 잠시 후 다시 시도해주세요.',
          'UNAVAILABLE',
          error
        )
      case 'failed-precondition':
        return new TodoError(
          '데이터 상태가 올바르지 않습니다.',
          'FAILED_PRECONDITION',
          error
        )
      case 'already-exists':
        return new TodoError(
          '이미 존재하는 데이터입니다.',
          'ALREADY_EXISTS',
          error
        )
      default:
        return new TodoError(
          `${operation} 중 오류가 발생했습니다: ${firestoreError.message}`,
          firestoreError.code || 'FIRESTORE_ERROR',
          error
        )
    }
  }
  
  if (error instanceof Error) {
    return new TodoError(
      `${operation} 중 오류가 발생했습니다: ${error.message}`,
      'GENERAL_ERROR',
      error
    )
  }
  
  return new TodoError(
    `${operation} 중 알 수 없는 오류가 발생했습니다.`,
    'UNKNOWN_ERROR',
    error
  )
}

export const isRetriableError = (error: TodoError): boolean => {
  const retriableCodes = ['unavailable', 'deadline-exceeded', 'internal', 'NETWORK_ERROR']
  return retriableCodes.includes(error.code.toLowerCase())
}

export const withRetry = async <T>(
  operation: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 1000
): Promise<T> => {
  let lastError: TodoError | undefined
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error) {
      const todoError = error instanceof TodoError 
        ? error 
        : handleFirestoreError(error, 'Operation')
        
      lastError = todoError
      
      if (!isRetriableError(todoError) || attempt === maxRetries) {
        throw todoError
      }
      
      const delay = baseDelay * Math.pow(2, attempt - 1) // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
  
  throw lastError
}