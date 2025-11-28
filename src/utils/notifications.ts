import type { Todo, NotificationSettings } from '../types/todo'
import { startOfWeek, subWeeks, endOfWeek, format } from 'date-fns'
import { ko } from 'date-fns/locale'

export interface NotificationEvent {
  id: string
  todoId?: string
  type: 'reminder' | 'overdue' | 'recurring_suggestion' | 'start_reminder' | 'weekly_report' | 'completion_celebration'
  title: string
  message: string
  scheduledTime: Date
  isRead: boolean
  createdAt: Date
  tag?: string
}

export class NotificationManager {
  private notifications: NotificationEvent[] = []
  private listeners: ((notification: NotificationEvent) => void)[] = []

  constructor() {
    this.loadNotifications()
    this.checkScheduledNotifications()
    this.checkWeeklyReport()

    // 매분마다 알림 체크
    setInterval(() => {
      this.checkScheduledNotifications()
      this.checkWeeklyReport()
    }, 60000)
  }

  private loadNotifications() {
    const saved = localStorage.getItem('notifications')
    if (saved) {
      try {
        this.notifications = JSON.parse(saved).map((n: any) => ({
          ...n,
          scheduledTime: new Date(n.scheduledTime),
          createdAt: new Date(n.createdAt)
        }))
      } catch (error) {
        console.error('Failed to load notifications:', error)
      }
    }
  }

  private saveNotifications() {
    localStorage.setItem('notifications', JSON.stringify(this.notifications))
  }

  private checkScheduledNotifications() {
    const now = new Date()
    const dueNotifications = this.notifications.filter(
      n => n.scheduledTime <= now && !n.isRead
    )

    dueNotifications.forEach(notification => {
      // 이미 표시된 알림은 다시 표시하지 않음 (브라우저 알림 기준)
      // 실제 구현에서는 isRead와 별개로 isShown 같은 플래그가 필요할 수 있음
      // 여기서는 간단히 처리
      this.showBrowserNotification(notification)
      this.listeners.forEach(listener => listener(notification))
    })
  }

  private showBrowserNotification(notification: NotificationEvent) {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(notification.title, {
        body: notification.message,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: notification.tag || notification.id
      })
    }
  }

  public showNotification(options: { title: string; body: string; tag?: string }) {
    if (this.isSupported() && Notification.permission === 'granted') {
      new Notification(options.title, {
        body: options.body,
        icon: '/favicon.ico',
        tag: options.tag
      })
    }
  }

  public isSupported(): boolean {
    return 'Notification' in window
  }

  public requestPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      return Promise.resolve('denied')
    }
    return Notification.requestPermission()
  }

  public scheduleReminder(todo: Todo, settings: NotificationSettings) {
    if (!settings.enabled || !todo.dueDate) return

    let reminderTime = new Date(todo.dueDate)

    // 새로운 방식: 분 단위 설정 (dueReminderTiming)
    if (settings.dueReminderTiming !== undefined) {
      // 마감 시간에서 설정된 분만큼 뺌
      reminderTime = new Date(reminderTime.getTime() - settings.dueReminderTiming * 60000)
    } else {
      // 기존 방식: 일 단위 설정 (advanceDays) - 하위 호환성 유지
      reminderTime.setDate(reminderTime.getDate() - settings.advanceDays)
      // 시간 설정 (일간 브리핑 시간 사용)
      const [hours, minutes] = settings.time.split(':').map(Number)
      reminderTime.setHours(hours, minutes, 0, 0)
    }

    // 이미 지난 시간이면 알림 생성하지 않음
    if (reminderTime <= new Date()) return

    const notification: NotificationEvent = {
      id: `reminder_${todo.id}_${Date.now()}`,
      todoId: todo.id,
      type: 'reminder',
      title: '마감 임박 알림',
      message: `"${todo.title}" 마감 시간이 다가옵니다.`,
      scheduledTime: reminderTime,
      isRead: false,
      createdAt: new Date(),
      tag: `reminder-${todo.id}`
    }

    // 기존 동일한 알림 제거 후 추가
    this.notifications = this.notifications.filter(n => n.tag !== `reminder-${todo.id}`)
    this.notifications.push(notification)
    this.saveNotifications()
  }

  public scheduleStartReminder(todo: Todo, settings: NotificationSettings) {
    if (!settings.enabled || !settings.startReminder || !todo.startDate) return

    const startTime = new Date(todo.startDate)

    // 이미 지난 시간이면 알림 생성하지 않음
    if (startTime <= new Date()) return

    const notification: NotificationEvent = {
      id: `start_${todo.id}_${Date.now()}`,
      todoId: todo.id,
      type: 'start_reminder',
      title: '할일 시작 알림',
      message: `"${todo.title}" 시작 시간입니다.`,
      scheduledTime: startTime,
      isRead: false,
      createdAt: new Date(),
      tag: `start-${todo.id}`
    }

    this.notifications = this.notifications.filter(n => n.tag !== `start-${todo.id}`)
    this.notifications.push(notification)
    this.saveNotifications()
  }

  public scheduleOverdueNotification(todo: Todo) {
    if (!todo.dueDate || todo.completed) return

    const overdueTime = new Date(todo.dueDate)
    overdueTime.setDate(overdueTime.getDate() + 1)
    overdueTime.setHours(9, 0, 0, 0) // 다음날 오전 9시

    const notification: NotificationEvent = {
      id: `overdue_${todo.id}_${Date.now()}`,
      todoId: todo.id,
      type: 'overdue',
      title: '할일 지연',
      message: `"${todo.title}" 할일이 지연되었습니다.`,
      scheduledTime: overdueTime,
      isRead: false,
      createdAt: new Date(),
      tag: `overdue-${todo.id}`
    }

    this.notifications.push(notification)
    this.saveNotifications()
  }

  public suggestRecurringTask(todo: Todo) {
    if (todo.recurrence === 'none') return

    const suggestion: NotificationEvent = {
      id: `recurring_${todo.id}_${Date.now()}`,
      todoId: todo.id,
      type: 'recurring_suggestion',
      title: '반복 할일 제안',
      message: `"${todo.title}" 반복 할일을 다시 생성하시겠습니까?`,
      scheduledTime: new Date(), // 즉시 표시
      isRead: false,
      createdAt: new Date(),
      tag: `recurring-${todo.id}`
    }

    this.notifications.push(suggestion)
    this.saveNotifications()
    this.listeners.forEach(listener => listener(suggestion))
  }

  public showCompletionCelebration(todo: Todo) {
    // 설정 확인
    const settingsJson = localStorage.getItem('notification-settings')
    if (settingsJson) {
      const settings = JSON.parse(settingsJson)
      if (!settings.completionCelebration) return
    }

    const notification: NotificationEvent = {
      id: `completion_${todo.id}_${Date.now()}`,
      todoId: todo.id,
      type: 'completion_celebration',
      title: '할일 완료! 🎉',
      message: `"${todo.title}" 완료를 축하합니다!`,
      scheduledTime: new Date(),
      isRead: false,
      createdAt: new Date(),
      tag: `completion-${todo.id}`
    }

    // 브라우저 알림만 표시하고 목록에는 저장하지 않음 (선택적)
    this.showBrowserNotification(notification)
  }

  private checkWeeklyReport() {
    const now = new Date()
    // 매주 월요일 오전 9시에 체크
    if (now.getDay() === 1 && now.getHours() === 9 && now.getMinutes() === 0) {
      const lastCheck = localStorage.getItem('lastWeeklyReport')
      const todayStr = now.toDateString()

      if (lastCheck !== todayStr) {
        this.generateWeeklyReport()
        localStorage.setItem('lastWeeklyReport', todayStr)
      }
    }
  }

  private generateWeeklyReport() {
    // 지난주 데이터 계산 로직은 실제로는 TodoContext 등에서 가져와야 하지만
    // 여기서는 간단히 알림만 생성
    const notification: NotificationEvent = {
      id: `weekly_report_${Date.now()}`,
      type: 'weekly_report',
      title: '주간 리포트',
      message: '지난주 할일 성과를 확인해보세요!',
      scheduledTime: new Date(),
      isRead: false,
      createdAt: new Date(),
      tag: 'weekly-report'
    }

    this.notifications.push(notification)
    this.saveNotifications()
    this.showBrowserNotification(notification)
  }

  public markAsRead(notificationId: string) {
    const notification = this.notifications.find(n => n.id === notificationId)
    if (notification) {
      notification.isRead = true
      this.saveNotifications()
    }
  }

  public dismissNotification(notificationId: string) {
    this.notifications = this.notifications.filter(n => n.id !== notificationId)
    this.saveNotifications()
  }

  public getUnreadNotifications(): NotificationEvent[] {
    return this.notifications.filter(n => !n.isRead)
  }

  public getAllNotifications(): NotificationEvent[] {
    return [...this.notifications].sort((a, b) =>
      b.createdAt.getTime() - a.createdAt.getTime()
    )
  }

  public addListener(listener: (notification: NotificationEvent) => void) {
    this.listeners.push(listener)
  }

  public removeListener(listener: (notification: NotificationEvent) => void) {
    this.listeners = this.listeners.filter(l => l !== listener)
  }

  public clearNotificationsForTodo(todoId: string) {
    this.notifications = this.notifications.filter(n => n.todoId !== todoId)
    this.saveNotifications()
  }
}

// 전역 알림 매니저 인스턴스
export const notificationManager = new NotificationManager()