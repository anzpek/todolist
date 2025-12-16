import React, { useEffect } from 'react'
import { useTodos } from '../contexts/TodoContext'
import { useCustomHolidays } from '../contexts/CustomHolidayContext'
import { notificationManager } from '../utils/notifications'
import type { NotificationSettings } from '../types/todo'

export const NotificationController: React.FC = () => {
    const { todos } = useTodos()
    const { customHolidays } = useCustomHolidays()

    useEffect(() => {
        const savedSettings = localStorage.getItem('notification-settings')
        if (savedSettings) {
            try {
                const settings: NotificationSettings = JSON.parse(savedSettings)

                // 데이터 변경 시 알림 재스케줄링 (Debounce 2초)
                const timer = setTimeout(() => {
                    notificationManager.scheduleAllNotifications(settings, todos, customHolidays)
                }, 2000)

                return () => clearTimeout(timer)
            } catch (e) {
                console.error('Failed to parse notification settings', e)
            }
        }
    }, [todos, customHolidays])

    // 설정 변경 이벤트 리스너 (NotificationSettings에서 localStorage 변경 시 발생시키는 이벤트가 있다면 좋겠지만, 
    // 현재는 NotificationSettings에서 직접 scheduleAllNotifications를 호출하므로 여기서는 데이터 변경만 감지하면 됨)
    // 다만, 다른 탭에서 변경되거나 초기화 시점을 위해 window focus 이벤트 등도 고려 가능하나 일단 생략

    return null
}
