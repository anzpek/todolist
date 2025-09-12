import React, { useState, useEffect } from 'react'

interface PWAInstallPromptProps {
  onInstall?: () => void
  onDismiss?: () => void
}

const PWAInstallPrompt: React.FC<PWAInstallPromptProps> = ({ onInstall, onDismiss }) => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [showPrompt, setShowPrompt] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)

  useEffect(() => {
    // iOS 기기 감지
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
    setIsIOS(iOS)

    // PWA 설치 여부 확인
    const isInStandaloneMode = window.matchMedia('(display-mode: standalone)').matches
    const isInstallable = !isInStandaloneMode && !localStorage.getItem('pwa-install-dismissed')
    
    setIsInstalled(isInStandaloneMode)
    
    if (isInstallable && !iOS) {
      // beforeinstallprompt 이벤트 리스너
      const handleBeforeInstallPrompt = (e: Event) => {
        e.preventDefault()
        setDeferredPrompt(e)
        setShowPrompt(true)
      }

      window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

      return () => {
        window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      }
    } else if (isInstallable && iOS) {
      // iOS에서는 수동으로 프롬프트 표시
      const hasShownIOSPrompt = localStorage.getItem('ios-install-prompted')
      if (!hasShownIOSPrompt) {
        setShowPrompt(true)
      }
    }
  }, [])

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt()
      const result = await deferredPrompt.userChoice
      console.log('PWA installation result:', result)
      setDeferredPrompt(null)
    }
    
    setShowPrompt(false)
    onInstall?.()
  }

  const handleDismiss = () => {
    localStorage.setItem('pwa-install-dismissed', 'true')
    if (isIOS) {
      localStorage.setItem('ios-install-prompted', 'true')
    }
    setShowPrompt(false)
    onDismiss?.()
  }

  if (!showPrompt || isInstalled) return null

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-md">
      <div className="bg-primary-600 text-white p-4 rounded-xl shadow-lg border border-primary-500">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 text-2xl">
            📱
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold mb-1">
              앱으로 설치하기
            </h3>
            <p className="text-sm text-blue-100 mb-3">
              {isIOS 
                ? '공유 버튼 → "홈 화면에 추가"를 눌러서 앱을 설치하세요.'
                : 'TodoList를 앱으로 설치해서 더 빠르게 사용해보세요!'
              }
            </p>
            <div className="flex gap-2">
              {!isIOS && (
                <button
                  onClick={handleInstall}
                  className="px-4 py-2 bg-white text-primary-600 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors"
                >
                  설치하기
                </button>
              )}
              <button
                onClick={handleDismiss}
                className="px-4 py-2 bg-primary-500 text-white rounded-lg text-sm font-medium hover:bg-primary-400 transition-colors"
              >
                나중에
              </button>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="flex-shrink-0 text-blue-200 hover:text-white transition-colors p-1"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  )
}

export default PWAInstallPrompt