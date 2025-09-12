import React, { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'

const LoginScreen: React.FC = () => {
  const { signInWithGoogle, signInAsGuest } = useAuth()
  const [loading, setLoading] = useState<'google' | 'guest' | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleGoogleSignIn = async () => {
    try {
      setLoading('google')
      setError(null)
      await signInWithGoogle()
    } catch (error: any) {
      setError('구글 로그인에 실패했습니다.')
      console.error('Google sign-in error:', error)
    } finally {
      setLoading(null)
    }
  }

  const handleGuestSignIn = async () => {
    try {
      setLoading('guest')
      setError(null)
      await signInAsGuest()
    } catch (error: any) {
      setError('게스트 로그인에 실패했습니다.')
      console.error('Guest sign-in error:', error)
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* 로고 및 제목 */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">📱</div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            TodoList App
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            모바일 최적화된 할일 관리
          </p>
        </div>

        {/* 로그인 카드 */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 space-y-4">
          <div className="text-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              시작하기
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              로그인하여 데이터를 클라우드에 안전하게 보관하세요
            </p>
          </div>

          {/* 에러 메시지 */}
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg">
              <div className="flex items-center gap-2">
                <span className="text-red-500">⚠️</span>
                <span className="text-sm text-red-800 dark:text-red-200">{error}</span>
              </div>
            </div>
          )}

          {/* 구글 로그인 버튼 */}
          <button
            onClick={handleGoogleSignIn}
            disabled={loading !== null}
            className="w-full flex items-center justify-center gap-3 p-3 bg-white border-2 border-gray-200 hover:border-gray-300 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading === 'google' ? (
              <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
            ) : (
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            )}
            <span className="text-gray-700 font-medium">
              {loading === 'google' ? '로그인 중...' : 'Google로 시작하기'}
            </span>
          </button>

          {/* 구분선 */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200 dark:border-gray-600" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">또는</span>
            </div>
          </div>

          {/* 게스트 로그인 버튼 */}
          <button
            onClick={handleGuestSignIn}
            disabled={loading !== null}
            className="w-full flex items-center justify-center gap-3 p-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading === 'guest' ? (
              <div className="w-5 h-5 border-2 border-gray-400 border-t-gray-600 rounded-full animate-spin" />
            ) : (
              <span className="text-lg">👤</span>
            )}
            <span className="text-gray-700 dark:text-gray-200 font-medium">
              {loading === 'guest' ? '로그인 중...' : '게스트로 시작하기'}
            </span>
          </button>

          {/* 안내 문구 */}
          <div className="text-center pt-4 border-t border-gray-200 dark:border-gray-600">
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
              게스트 로그인 시 데이터는 기기에만 저장됩니다.<br />
              구글 로그인을 통해 클라우드 동기화를 이용하세요.
            </p>
          </div>
        </div>

        {/* 기능 미리보기 */}
        <div className="mt-8 grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl mb-1">✅</div>
            <div className="text-xs text-gray-600 dark:text-gray-400">할일 관리</div>
          </div>
          <div>
            <div className="text-2xl mb-1">📅</div>
            <div className="text-xs text-gray-600 dark:text-gray-400">캘린더 뷰</div>
          </div>
          <div>
            <div className="text-2xl mb-1">☁️</div>
            <div className="text-xs text-gray-600 dark:text-gray-400">클라우드 동기화</div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LoginScreen