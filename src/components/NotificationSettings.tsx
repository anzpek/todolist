import React, { useState, useEffect } from 'react'
import { notificationManager } from '../utils/notifications'

interface NotificationSettingsProps {
  onClose: () => void
}

const NotificationSettings: React.FC<NotificationSettingsProps> = ({ onClose }) => {
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [supported, setSupported] = useState(false)
  const [settings, setSettings] = useState({
    dueReminders: true,
    completionCelebration: true,
    dailyReminder: true,
    reminderTime: '09:00'
  })

  useEffect(() => {
    setPermission(Notification.permission)
    setSupported(notificationManager.isSupported())
    
    // 로컬 스토리지에서 설정 로드
    const savedSettings = localStorage.getItem('notification-settings')
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings))
    }
  }, [])

  const handlePermissionRequest = async () => {
    const granted = await notificationManager.requestPermission()
    setPermission(granted ? 'granted' : 'denied')
  }

  const handleSettingChange = (key: keyof typeof settings, value: boolean | string) => {
    const newSettings = { ...settings, [key]: value }
    setSettings(newSettings)
    localStorage.setItem('notification-settings', JSON.stringify(newSettings))
  }

  const testNotification = async () => {
    await notificationManager.showNotification({
      title: '테스트 알림',
      body: '알림이 정상적으로 작동합니다! 🎉',
      tag: 'test'
    })
  }

  if (!supported) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full p-6">
          <div className="text-center">
            <div className="text-4xl mb-4">❌</div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              알림 지원 안됨
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              현재 브라우저에서는 알림 기능을 지원하지 않습니다.
            </p>
            <button
              onClick={onClose}
              className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              확인
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full max-h-[90vh] overflow-hidden">
        {/* 헤더 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            알림 설정
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            <span className="text-xl">✕</span>
          </button>
        </div>

        {/* 내용 */}
        <div className="p-6 space-y-6">
          {/* 권한 상태 */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white">권한 상태</h3>
            
            {permission === 'default' && (
              <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-yellow-600 dark:text-yellow-400">⚠️</span>
                  <span className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                    알림 권한이 필요합니다
                  </span>
                </div>
                <p className="text-xs text-yellow-700 dark:text-yellow-300 mb-3">
                  할일 알림을 받으려면 브라우저 알림 권한을 허용해주세요.
                </p>
                <button
                  onClick={handlePermissionRequest}
                  className="w-full px-3 py-2 bg-yellow-600 text-white text-sm rounded-lg hover:bg-yellow-700 transition-colors"
                >
                  알림 권한 허용하기
                </button>
              </div>
            )}

            {permission === 'granted' && (
              <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-green-600 dark:text-green-400">✅</span>
                  <span className="text-sm font-medium text-green-800 dark:text-green-200">
                    알림 권한 허용됨
                  </span>
                </div>
                <button
                  onClick={testNotification}
                  className="w-full px-3 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
                >
                  테스트 알림 보내기
                </button>
              </div>
            )}

            {permission === 'denied' && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-red-600 dark:text-red-400">❌</span>
                  <span className="text-sm font-medium text-red-800 dark:text-red-200">
                    알림 권한 차단됨
                  </span>
                </div>
                <p className="text-xs text-red-700 dark:text-red-300">
                  브라우저 설정에서 직접 알림 권한을 허용해주세요.
                </p>
              </div>
            )}
          </div>

          {/* 알림 설정 */}
          {permission === 'granted' && (
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-gray-900 dark:text-white">알림 옵션</h3>
              
              <div className="space-y-3">
                {/* 마감 알림 */}
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      마감 알림
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      할일 마감 1시간 전 알림
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.dueReminders}
                      onChange={(e) => handleSettingChange('dueReminders', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                {/* 완료 축하 */}
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      완료 축하
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      할일 완료시 축하 알림
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.completionCelebration}
                      onChange={(e) => handleSettingChange('completionCelebration', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                {/* 일간 리마인더 */}
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      일간 리마인더
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      매일 정해진 시간에 할일 확인 알림
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.dailyReminder}
                      onChange={(e) => handleSettingChange('dailyReminder', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                {/* 리마인더 시간 */}
                {settings.dailyReminder && (
                  <div className="pl-4 border-l-2 border-gray-200 dark:border-gray-600">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        알림 시간
                      </div>
                      <input
                        type="time"
                        value={settings.reminderTime}
                        onChange={(e) => handleSettingChange('reminderTime', e.target.value)}
                        className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 푸터 */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            완료
          </button>
        </div>
      </div>
    </div>
  )
}

export default NotificationSettings