import { useEffect, useState } from 'react'
import { WifiOff, Wifi, AlertTriangle } from 'lucide-react'
import { useNetworkStatus } from '../../../hooks/useNetworkStatus'
import { useAuth } from '../../../contexts/AuthContext'
import { useTodos } from '../../../contexts/TodoContext'

const OfflineNotification = () => {
  const { isOnline, wasOffline } = useNetworkStatus()
  const { currentUser } = useAuth()
  const { syncWithFirestore } = useTodos()
  const [showNotification, setShowNotification] = useState(false)
  const [notificationType, setNotificationType] = useState<'offline' | 'online' | 'sync'>('offline')

  useEffect(() => {
    if (!isOnline) {
      setNotificationType('offline')
      setShowNotification(true)
    } else if (wasOffline && currentUser) {
      // 오프라인에서 온라인으로 복구 시 자동 동기화
      setNotificationType('sync')
      setShowNotification(true)
      handleAutoSync()
    } else if (wasOffline) {
      setNotificationType('online')
      setShowNotification(true)
      setTimeout(() => setShowNotification(false), 3000)
    }
  }, [isOnline, wasOffline, currentUser])

  const handleAutoSync = async () => {
    if (currentUser) {
      try {
        await syncWithFirestore()
        setNotificationType('online')
        setTimeout(() => setShowNotification(false), 3000)
      } catch (error) {
        console.error('자동 동기화 실패:', error)
        setTimeout(() => setShowNotification(false), 5000)
      }
    }
  }

  const handleDismiss = () => {
    setShowNotification(false)
  }

  if (!showNotification) return null

  const getNotificationContent = () => {
    switch (notificationType) {
      case 'offline':
        return {
          icon: <WifiOff className="w-5 h-5 text-red-500" />,
          title: '오프라인 모드',
          message: '인터넷 연결이 끊어졌습니다. 로컬에서 작업이 계속됩니다.',
          bgColor: 'bg-red-50 dark:bg-red-900/20',
          borderColor: 'border-red-200 dark:border-red-800',
          textColor: 'text-red-700 dark:text-red-400',
          persistent: true
        }
      case 'sync':
        return {
          icon: <Wifi className="w-5 h-5 text-blue-500 animate-pulse" />,
          title: '동기화 중...',
          message: '온라인 상태로 복구되었습니다. 데이터를 동기화하고 있습니다.',
          bgColor: 'bg-blue-50 dark:bg-blue-900/20',
          borderColor: 'border-blue-200 dark:border-blue-800',
          textColor: 'text-blue-700 dark:text-blue-400',
          persistent: false
        }
      case 'online':
        return {
          icon: <Wifi className="w-5 h-5 text-green-500" />,
          title: '온라인 복구',
          message: '인터넷 연결이 복구되었습니다. 모든 기능을 사용할 수 있습니다.',
          bgColor: 'bg-green-50 dark:bg-green-900/20',
          borderColor: 'border-green-200 dark:border-green-800',
          textColor: 'text-green-700 dark:text-green-400',
          persistent: false
        }
      default:
        return null
    }
  }

  const content = getNotificationContent()
  if (!content) return null

  return (
    <div className="fixed top-4 right-4 z-50 max-w-sm">
      <div className={`${content.bgColor} ${content.borderColor} ${content.textColor} border rounded-lg shadow-lg p-4 transition-all duration-300 transform translate-x-0`}>
        <div className="flex items-start gap-3">
          {content.icon}
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-sm">{content.title}</h4>
            <p className="text-xs mt-1 opacity-90">{content.message}</p>
          </div>
          {!content.persistent && (
            <button
              onClick={handleDismiss}
              className="p-1 hover:bg-black/5 dark:hover:bg-white/5 rounded"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        
        {/* 오프라인 모드 추가 정보 */}
        {notificationType === 'offline' && (
          <div className="mt-3 pt-3 border-t border-red-200 dark:border-red-800">
            <div className="flex items-center gap-2 text-xs">
              <AlertTriangle className="w-3 h-3" />
              <span>로컬 변경사항은 온라인 복구 시 자동 동기화됩니다.</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default OfflineNotification