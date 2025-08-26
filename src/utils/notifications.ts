import type { Todo, NotificationSettings } from '../types/todo'

export interface NotificationEvent {
  id: string
  todoId: string
  type: 'reminder' | 'overdue' | 'recurring_suggestion'
  title: string
  message: string
  scheduledTime: Date
  isRead: boolean
  createdAt: Date
}

export class NotificationManager {
  private notifications: NotificationEvent[] = []
  private listeners: ((notification: NotificationEvent) => void)[] = []

  constructor() {
    this.loadNotifications()
    this.checkScheduledNotifications()
    
    // 매분마다 알림 체크
    setInterval(() => {
      this.checkScheduledNotifications()
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
      this.showBrowserNotification(notification)
      this.listeners.forEach(listener => listener(notification))
    })
  }

  private showBrowserNotification(notification: NotificationEvent) {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(notification.title, {
        body: notification.message,
        icon: '/favicon.ico',
        badge: '/favicon.ico'
      })
    }
  }

  public requestPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      return Promise.resolve('denied')
    }
    return Notification.requestPermission()
  }

  public scheduleReminder(todo: Todo, settings: NotificationSettings) {
    if (!settings.enabled || !todo.dueDate) return

    const reminderTime = new Date(todo.dueDate)
    reminderTime.setDate(reminderTime.getDate() - settings.advanceDays)
    
    // 시간 설정
    const [hours, minutes] = settings.time.split(':').map(Number)
    reminderTime.setHours(hours, minutes, 0, 0)

    // 이미 지난 시간이면 알림 생성하지 않음
    if (reminderTime <= new Date()) return

    const notification: NotificationEvent = {
      id: `reminder_${todo.id}_${Date.now()}`,
      todoId: todo.id,
      type: 'reminder',
      title: '할일 알림',
      message: `"${todo.title}" 마감일이 ${settings.advanceDays}일 남았습니다.`,
      scheduledTime: reminderTime,
      isRead: false,
      createdAt: new Date()
    }

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
      createdAt: new Date()
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
      createdAt: new Date()
    }

    this.notifications.push(suggestion)
    this.saveNotifications()
    this.listeners.forEach(listener => listener(suggestion))
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