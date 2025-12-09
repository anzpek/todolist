import React, { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { motion } from 'framer-motion'
import { CheckSquare, ArrowRight, CheckCircle2, Layout, Zap } from 'lucide-react'

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
    <div className="min-h-screen w-full flex bg-white font-sans">
      {/* Left Side - Visual & Brand (Desktop Only) */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-slate-900 text-white z-0">
        {/* Background Gradients */}
        <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-br from-blue-600/20 via-slate-900 to-slate-900 z-0" />
        <div className="absolute -top-20 -left-20 w-96 h-96 bg-blue-500/30 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-full h-1/2 bg-gradient-to-t from-slate-900 to-transparent z-10" />

        <div className="relative z-20 flex flex-col justify-between p-16 w-full">
          <div>
            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30 mb-8">
              <CheckSquare className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-4xl font-bold leading-tight mb-6 tracking-tight">
              Manage your work <br />
              <span className="text-blue-400">efficiently.</span>
            </h1>
            <p className="text-slate-400 text-lg max-w-sm leading-relaxed">
              복잡한 일정을 심플하게 관리하세요. <br />
              개인, 팀, 기업 모두를 위한 최고의 생산성 도구.
            </p>
          </div>

          <div className="grid gap-6">
            {[
              { icon: Layout, title: "직관적인 보드 뷰", desc: "한눈에 파악하는 업무 흐름" },
              { icon: Zap, title: "실시간 동기화", desc: "언제 어디서나 끊김 없는 연결" },
              { icon: CheckCircle2, title: "스마트한 알림", desc: "놓치지 않는 중요한 일정" }
            ].map((feature, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + idx * 0.1 }}
                className="flex items-start gap-4 p-4 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm hover:bg-white/10 transition-colors"
              >
                <div className="p-2 bg-blue-500/20 rounded-lg">
                  <feature.icon className="w-5 h-5 text-blue-300" />
                </div>
                <div>
                  <h3 className="font-semibold text-white mb-1">{feature.title}</h3>
                  <p className="text-sm text-slate-400">{feature.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="text-xs text-slate-600 mt-12">
            © 2025 Todolist Corp. Trusted by leaders.
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 lg:p-16 bg-white relative z-50">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-md space-y-8"
        >
          <div className="text-center lg:text-left">
            <h2 className="text-3xl font-bold text-slate-900 tracking-tight">로그인</h2>
            <p className="mt-2 text-slate-500">계정을 선택하여 계속하세요</p>
          </div>

          {error && (
            <div className="p-4 bg-red-50 text-red-600 text-sm font-medium rounded-lg flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-red-600" />
              {error}
            </div>
          )}

          <div className="space-y-4">
            <button
              onClick={handleGoogleSignIn}
              disabled={loading !== null}
              className="w-full h-14 bg-white border border-slate-200 text-slate-700 rounded-xl font-semibold flex items-center justify-center gap-3 hover:bg-slate-50 hover:border-slate-300 transition-all focus:ring-4 focus:ring-slate-100 disabled:opacity-70 disabled:cursor-not-allowed group"
            >
              {loading === 'google' ? (
                <div className="w-5 h-5 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
              ) : (
                <>
                  <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
                  <span className="group-hover:text-slate-900 transition-colors">Google 계정으로 계속하기</span>
                </>
              )}
            </button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-100"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-slate-400">또는</span>
              </div>
            </div>

            <button
              onClick={handleGuestSignIn}
              disabled={loading !== null}
              className="w-full h-14 bg-slate-900 text-white rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-slate-800 transition-all focus:ring-4 focus:ring-slate-200 disabled:opacity-70 disabled:cursor-not-allowed shadow-xl shadow-slate-200"
            >
              {loading === 'guest' ? (
                <div className="w-5 h-5 border-2 border-slate-600 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>게스트로 체험하기</span>
                  <ArrowRight className="w-4 h-4 text-slate-400" />
                </>
              )}
            </button>
          </div>

          <p className="text-center text-xs text-slate-400 mt-8">
            계속 진행시 이용약관 및 개인정보처리방침에 동의하게 됩니다.
          </p>
        </motion.div>
      </div>
    </div>
  )
}

export default LoginScreen