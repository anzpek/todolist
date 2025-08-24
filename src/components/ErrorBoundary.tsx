import React from 'react'
import { errorTracker, createErrorBoundaryHandler } from '../utils/errorTracking'
import { debug } from '../utils/debug'

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  errorId?: string;
  retryCount: number;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallbackComponent?: React.ComponentType<{ error: Error; retry: () => void }>;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private handleError = createErrorBoundaryHandler('ErrorBoundary')

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null,
      retryCount: 0
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // 에러 추적 시스템에 기록
    const errorId = errorTracker.trackReactError(error, {
      componentStack: errorInfo.componentStack,
      errorBoundary: 'ErrorBoundary'
    })

    debug.error('Error caught by ErrorBoundary:', error, errorInfo);

    this.setState({
      hasError: true,
      error,
      errorInfo,
      errorId
    });

    // 사용자 정의 에러 핸들러 호출
    this.props.onError?.(error, errorInfo)

    // 글로벌 에러 핸들러 호출
    this.handleError(error, errorInfo)
  }

  private handleRetry = () => {
    const newRetryCount = this.state.retryCount + 1
    
    // 최대 3번까지 재시도 허용
    if (newRetryCount <= 3) {
      debug.log(`ErrorBoundary retry attempt ${newRetryCount}/3`)
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        errorId: undefined,
        retryCount: newRetryCount
      })
    } else {
      debug.warn('ErrorBoundary max retry attempts reached')
    }
  }

  private handleReload = () => {
    debug.log('ErrorBoundary triggering page reload')
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      // 사용자 정의 fallback 컴포넌트가 있으면 사용
      if (this.props.fallbackComponent && this.state.error) {
        const FallbackComponent = this.props.fallbackComponent
        return <FallbackComponent error={this.state.error} retry={this.handleRetry} />
      }

      return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
          <div className="max-w-2xl mx-auto text-center">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
              <div className="text-red-600 dark:text-red-400 text-6xl mb-4">⚠️</div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                앱에서 오류가 발생했습니다
              </h1>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                예상치 못한 오류가 발생했습니다. 아래 옵션을 시도해보세요.
              </p>
              
              {this.state.errorId && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  오류 ID: {this.state.errorId}
                </p>
              )}

              <div className="space-y-4">
                {/* 재시도 버튼 (최대 3회) */}
                {this.state.retryCount < 3 && (
                  <button
                    onClick={this.handleRetry}
                    className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    다시 시도 ({this.state.retryCount}/3)
                  </button>
                )}
                
                <button
                  onClick={this.handleReload}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  페이지 새로고침
                </button>
                
                <details className="text-left">
                  <summary className="cursor-pointer text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
                    개발자 정보 보기
                  </summary>
                  <div className="mt-2 p-3 bg-gray-100 dark:bg-gray-700 rounded text-xs font-mono text-red-600 dark:text-red-400 overflow-auto max-h-64">
                    <p><strong>오류:</strong> {this.state.error?.message}</p>
                    <p><strong>재시도 횟수:</strong> {this.state.retryCount}/3</p>
                    {this.state.errorId && (
                      <p><strong>추적 ID:</strong> {this.state.errorId}</p>
                    )}
                    <p><strong>스택 추적:</strong></p>
                    <pre className="whitespace-pre-wrap">{this.state.error?.stack}</pre>
                    {this.state.errorInfo && (
                      <div>
                        <p><strong>컴포넌트 스택:</strong></p>
                        <pre className="whitespace-pre-wrap">{this.state.errorInfo.componentStack}</pre>
                      </div>
                    )}
                  </div>
                </details>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;