import React, { useState, useEffect } from 'react'
import { notificationManager } from '../utils/notifications'
import { useTodos } from '../contexts/TodoContext'
import { useCustomHolidays } from '../contexts/CustomHolidayContext'
import type { NotificationSettings as NotificationSettingsType } from '../types/todo'

interface NotificationSettingsProps {
  onClose: () => void
}

const NotificationSettings: React.FC<NotificationSettingsProps> = ({ onClose }) => {
  const { todos } = useTodos()
  const { customHolidays } = useCustomHolidays()
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [supported, setSupported] = useState(false)

  // 초기 설정값
  const defaultSettings: NotificationSettingsType = {
    dueReminders: true,
    dueReminderTiming: 60,
    time: '09:00',
    advanceDays: 0,
    startReminder: false,
    startReminderTime: '09:00',
    weeklyReport: false,
    weeklyReportTime: '09:00',
    dailyReminder: true,
    dailyReminderTime: '09:00',
    dailyRecurrence: [1, 2, 3, 4, 5], // 월~금
    dailyExcludeHolidays: false
  }

  const [settings, setSettings] = useState<NotificationSettingsType>(defaultSettings)

  useEffect(() => {
    // 네이티브 플랫폼 안전 체크
    const initializePermission = async () => {
      try {
        const { Capacitor } = await import('@capacitor/core')
        if (Capacitor.isNativePlatform()) {
          try {
            const status = await notificationManager.checkPermissions()
            // Map 'prompt' to 'default' for React state compatibility
            const display = status.display === 'prompt' ? 'default' : status.display
            setPermission(display as NotificationPermission)
            console.log('Native permission status:', display)
          } catch (e) {
            console.error('Failed to check native permissions:', e)
            setPermission('denied')
          }
        } else if (typeof Notification !== 'undefined') {
          setPermission(Notification.permission)
        } else {
          setPermission('default')
        }
      } catch (e) {
        console.error('Permission check failed', e)
        if (typeof Notification !== 'undefined') {
          setPermission(Notification.permission)
        } else {
          setPermission('default')
        }
      }
    }

    initializePermission()
    setSupported(notificationManager.isSupported())

    // 로컬 스토리지 로드 및 마이그레이션
    const savedSettings = localStorage.getItem('notification-settings')
    if (savedSettings) {
      const parsed = JSON.parse(savedSettings)

      // 마이그레이션 로직: 기존 reminderTime -> dailyReminderTime
      if (parsed.reminderTime && !parsed.dailyReminderTime) {
        parsed.dailyReminderTime = parsed.reminderTime
      }

      setSettings({
        ...defaultSettings,
        ...parsed,
        // 호환성 처리
        dueReminderTiming: parsed.dueReminderTiming ?? (parsed.advanceDays ? parsed.advanceDays * 24 * 60 : 60)
      })
    }
  }, [])

  const handlePermissionRequest = async () => {
    const granted = await notificationManager.requestPermission()
    setPermission(granted ? 'granted' : 'denied')
  }

  const handleCheckPermission = async () => {
    try {
      if (typeof notificationManager.checkPermissions === 'function') {
        const status = await notificationManager.checkPermissions()
        const display = status.display === 'prompt' ? 'default' : status.display

        console.log('Manual check result:', display)
        setPermission(display as NotificationPermission)

        if (display === 'denied') {
          // 여전히 거부된 상태
          alert('⚠️ 여전히 권한이 "차단" 상태입니다.\n\n시스템 설정에서 권한을 허용했는데도 이 메시지가 뜬다면, 앱을 완전히 종료했다가 다시 실행해주세요.')
        } else if (display === 'granted') {
          alert('✅ 권한이 확인되었습니다! 이제 알림을 받을 수 있습니다.')
        } else {
          // default/prompt 상태
          alert(`현재 권한 상태: ${display}\n알림을 허용하려면 "허용하기" 버튼을 눌러주세요.`)
        }
      } else {
        await handlePermissionRequest()
      }
    } catch (e: any) {
      console.error('Failed to check permission manually:', e)
      alert(`오류가 발생했습니다: ${e.message || JSON.stringify(e)}`)
    }
  }

  const handleSettingChange = async (key: keyof NotificationSettingsType, value: any) => {
    const newSettings = { ...settings, [key]: value }
    setSettings(newSettings)
    localStorage.setItem('notification-settings', JSON.stringify(newSettings))

    // 설정 변경 시 스케줄링 업데이트 (즉시 반영)
    if (permission === 'granted') {
      await notificationManager.scheduleAllNotifications(newSettings, todos, customHolidays)
    }
  }

  const toggleDay = (dayIndex: number) => {
    const currentDays = settings.dailyRecurrence || []
    let newDays
    if (currentDays.includes(dayIndex)) {
      newDays = currentDays.filter(d => d !== dayIndex)
    } else {
      newDays = [...currentDays, dayIndex].sort()
    }
    handleSettingChange('dailyRecurrence', newDays)
  }

  const testNotification = async () => {
    try {
      await notificationManager.showNotification({
        title: '테스트 알림',
        body: '알림이 정상적으로 작동합니다! 🎉',
        tag: 'test'
      })
      alert('테스트 알림을 보냈습니다.\n(잠시 후 도착합니다)')
    } catch (e: any) {
      alert('테스트 알림 실패: ' + e.message)
    }
  }

  const weekDays = ['일', '월', '화', '수', '목', '금', '토']

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
              현재 환경에서는 알림 기능을 지원하지 않습니다.
            </p>
            <button onClick={onClose} className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg">확인</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* 헤더 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            알림 설정
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
            ✕
          </button>
        </div>

        {/* 내용 */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* 권한 상태 표시 (기존 코드 유지) */}
          <div className="space-y-3">
            {permission === 'default' && (
              <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg">
                <p className="text-sm text-yellow-800 dark:text-yellow-200 mb-2">알림 권한이 필요합니다.</p>
                <button onClick={handlePermissionRequest} className="w-full px-3 py-2 bg-yellow-600 text-white text-sm rounded-lg">허용하기</button>
              </div>
            )}
            {permission === 'denied' && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg">
                <div className="flex items-start gap-3 mb-2">
                  <span className="text-xl">⚠️</span>
                  <div>
                    <p className="text-sm font-bold text-red-800 dark:text-red-200">
                      알림 권한이 차단되었습니다.
                    </p>
                    <p className="text-xs text-red-600 dark:text-red-300 mt-1">
                      설정 앱에서 알림을 켜주세요.
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleCheckPermission}
                  className="w-full px-3 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
                >
                  권한 다시 확인하기 ↻
                </button>
              </div>
            )}
            {permission === 'granted' && (
              <button onClick={testNotification} className="w-full px-3 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700">테스트 알림 보내기</button>
            )}
          </div>

          {permission === 'granted' && (
            <div className="space-y-6">
              {/* 일간 브리핑 설정 */}
              <div className="space-y-3 border-b border-gray-200 dark:border-gray-700 pb-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-gray-900 dark:text-white">일간 브리핑</h3>
                    <p className="text-xs text-gray-600 dark:text-gray-400">매일 아침 오늘의 할일 브리핑</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={settings.dailyReminder} onChange={(e) => handleSettingChange('dailyReminder', e.target.checked)} className="sr-only peer" />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                {settings.dailyReminder && (
                  <div className="space-y-4 pl-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-700 dark:text-gray-300">시간</span>
                      <input type="time" value={settings.dailyReminderTime} onChange={(e) => handleSettingChange('dailyReminderTime', e.target.value)} className="px-2 py-1 border rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                    </div>

                    <div>
                      <span className="text-sm text-gray-700 dark:text-gray-300 block mb-2">반복 요일</span>
                      <div className="flex justify-between gap-1">
                        {weekDays.map((day, index) => (
                          <button
                            key={index}
                            onClick={() => toggleDay(index)}
                            className={`w-8 h-8 rounded-full text-xs font-medium transition-colors ${settings.dailyRecurrence?.includes(index)
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                              }`}
                          >
                            {day}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-700 dark:text-gray-300">공휴일 제외</span>
                      <input
                        type="checkbox"
                        checked={settings.dailyExcludeHolidays}
                        onChange={(e) => handleSettingChange('dailyExcludeHolidays', e.target.checked)}
                        className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* 시작일 알림 설정 */}
              <div className="space-y-3 border-b border-gray-200 dark:border-gray-700 pb-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-gray-900 dark:text-white">시작일 알림</h3>
                    <p className="text-xs text-gray-600 dark:text-gray-400">할일 시작 시간에 알림</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={settings.startReminder} onChange={(e) => handleSettingChange('startReminder', e.target.checked)} className="sr-only peer" />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                  </label>
                </div>
                {settings.startReminder && (
                  <div className="flex items-center justify-between pl-2">
                    <span className="text-sm text-gray-700 dark:text-gray-300">시간</span>
                    <input type="time" value={settings.startReminderTime || '09:00'} onChange={(e) => handleSettingChange('startReminderTime', e.target.value)} className="px-2 py-1 border rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                  </div>
                )}
              </div>

              {/* 주간 리포트 설정 */}
              <div className="space-y-3 border-b border-gray-200 dark:border-gray-700 pb-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-gray-900 dark:text-white">주간 리포트</h3>
                    <p className="text-xs text-gray-600 dark:text-gray-400">매주 월요일 지난주 성과 요약</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={settings.weeklyReport} onChange={(e) => handleSettingChange('weeklyReport', e.target.checked)} className="sr-only peer" />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                  </label>
                </div>
                {settings.weeklyReport && (
                  <div className="flex items-center justify-between pl-2">
                    <span className="text-sm text-gray-700 dark:text-gray-300">시간</span>
                    <input type="time" value={settings.weeklyReportTime || '09:00'} onChange={(e) => handleSettingChange('weeklyReportTime', e.target.value)} className="px-2 py-1 border rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                  </div>
                )}
              </div>

              {/* 마감 임박 알림 (기존 유지) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-gray-900 dark:text-white">마감 임박 알림</h3>
                    <p className="text-xs text-gray-600 dark:text-gray-400">할일 마감 전 미리 알림</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={settings.dueReminders} onChange={(e) => handleSettingChange('dueReminders', e.target.checked)} className="sr-only peer" />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                  </label>
                </div>
                {settings.dueReminders && (
                  <div className="pl-2">
                    <select value={settings.dueReminderTiming} onChange={(e) => handleSettingChange('dueReminderTiming', Number(e.target.value))} className="w-full px-3 py-2 border rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                      <option value={10}>10분 전</option>
                      <option value={30}>30분 전</option>
                      <option value={60}>1시간 전</option>
                      <option value={180}>3시간 전</option>
                      <option value={1440}>1일 전</option>
                      <option value={2880}>2일 전</option>
                    </select>
                  </div>
                )}
              </div>

            </div>
          )}
        </div>

        {/* 푸터 */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
          <button onClick={onClose} className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">
            완료
          </button>
        </div>
      </div>
    </div>
  )
}

export default NotificationSettings