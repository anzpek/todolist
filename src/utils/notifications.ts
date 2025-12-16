import type { Todo, NotificationSettings } from '../types/todo'
import { startOfWeek, subWeeks, endOfWeek, format, addDays, getDay, isSameDay } from 'date-fns'
import { ko } from 'date-fns/locale'
import { LocalNotifications, type PermissionStatus } from '@capacitor/local-notifications'
import { Capacitor } from '@capacitor/core'

/* CustomHoliday Interface copy to avoid dependency cycle */
interface CustomHoliday {
  date: string // YYYY-MM-DD
  name: string
  isRecurring?: boolean
}

export interface NotificationEvent {
  id: string
  todoId?: string
  type: 'reminder' | 'overdue' | 'recurring_suggestion' | 'start_reminder' | 'weekly_report' | 'completion_celebration' | 'daily_briefing'
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

  // ID Constants
  private static readonly DAILY_ID_BASE = 100000;
  private static readonly START_REMINDER_ID_BASE = 200000; // Not strictly used for ID gen but reserved concept
  private static readonly WEEKLY_REPORT_ID = 900000;

  constructor() {
    this.loadNotifications()
    this.checkScheduledNotifications()
    this.checkWeeklyReport()
    this.initializeNativeNotifications()

    setInterval(() => {
      this.checkScheduledNotifications()
      this.checkWeeklyReport()
    }, 60000)

    // 리스너 등록: 알림 클릭 시 앱 열기 등 처리
    if (Capacitor.isNativePlatform()) {
      LocalNotifications.addListener('localNotificationActionPerformed', (notification) => {
        console.log('🔔 Notification action performed:', notification.actionId, notification.notification.id)
        // actionId가 'tap'이거나 'OPEN_APP'이면 앱은 자동으로 열리지만, 
        // 추가적인 라우팅이나 로직이 필요하면 여기에 작성
      })
    }
  }

  private async ensureChannel() {
    if (Capacitor.isNativePlatform()) {
      try {
        await LocalNotifications.createChannel({
          id: 'todo_alert_channel',
          name: 'Todo 알림 (중요)',
          description: '중요한 할일 알림',
          importance: 5,
          visibility: 1,
          vibration: true
        })
      } catch (e) {
        console.error('Failed to create notification channel', e)
      }
    }
  }

  private async initializeNativeNotifications() {
    if (Capacitor.isNativePlatform()) {
      // 1. 채널 생성 보장
      await this.ensureChannel()

      // 2. 권한 요청
      try {
        await LocalNotifications.requestPermissions()
      } catch (e) {
        console.error('Failed to request permissions', e)
      }

      // 3. 액션 타입 등록
      try {
        await LocalNotifications.registerActionTypes({
          types: [
            {
              id: 'REMINDER_ACTIONS',
              actions: [
                {
                  id: 'COMPLETE',
                  title: '완료하기',
                  foreground: true
                },
                {
                  id: 'SNOOZE',
                  title: '15분 뒤 알림',
                  destructive: false,
                  foreground: false
                }
              ]
            },
            {
              id: 'DAILY_BRIEFING_ACTIONS',
              actions: [
                {
                  id: 'OPEN_APP',
                  title: '어플로 확인',
                  foreground: true
                },
                {
                  id: 'DISMISS',
                  title: '닫기',
                  destructive: false,
                  foreground: false
                }
              ]
            }
          ]
        })
      } catch (e) {
        console.error('Failed to register action types', e)
      }

      console.log('Native notifications initialized')
    }
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

  public async showNotification(options: { title: string; body: string; tag?: string }) {
    if (Capacitor.isNativePlatform()) {
      try {
        // 알림 보내기 직전에 채널 다시 확인
        await this.ensureChannel()

        await LocalNotifications.schedule({
          notifications: [{
            title: options.title,
            body: options.body,
            id: Date.now() % 100000, // Safe ID
            schedule: { at: new Date(Date.now() + 1000) },
            channelId: 'default'
          }]
        })
      } catch (e) { console.error('Show notification failed', e) }
    } else if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(options.title, {
        body: options.body,
        tag: options.tag
      })
    }
  }
  private checkScheduledNotifications() {
    // 네이티브는 자체 스케줄러 사용하므로 웹에서만 체크
    if (Capacitor.isNativePlatform()) return

    const now = new Date()
    // 예정된 시간이지났고 아직 읽지 않은(또는 처리되지 않은) 알림
    // 실제로는 '발송되지 않은' 알림을 찾아야 하지만, 여기서는 간소화하여
    // scheduledTime이 지났는지 체크. 브라우저 알림은 한 번만 띄워야 하므로
    // 별도 플래그나 상태 관리가 필요할 수 있음. 
    // 여기서는 간단히.. 사실 이 로직은 개선이 필요함. (중복 발송 방지)

    // 이전에 발송된 적 없는 알림만 필터링하는 로직이 필요하나,
    // 현재 구조에서는 isRead로만 구분함.
    // 하지만 isRead는 사용자가 확인했을 때임.
    // 따라서 'sent' 플래그가 없으므로 정확하진 않음.
    // 일단 기존 로직 유지.

    const dueNotifications = this.notifications.filter(
      n => n.scheduledTime <= now && n.scheduledTime > new Date(now.getTime() - 60000 * 5) && !n.isRead
      // 5분 이내의 것만 (너무 오래된 건 무시)
    )

    dueNotifications.forEach(notification => {
      // 브라우저 알림은 태그를 이용해 중복 방지
      this.showBrowserNotification(notification)
      this.listeners.forEach(listener => listener(notification))
    })
  }

  private showBrowserNotification(notification: NotificationEvent) {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(notification.title, {
        body: notification.message,
        icon: '/favicon.ico',
        tag: notification.tag || notification.id // 태그로 중복 방지
      })
    }
  }

  // --- Main Scheduling Logic ---

  public async scheduleAllNotifications(
    settings: NotificationSettings,
    todos: Todo[],
    customHolidays: CustomHoliday[]
  ) {
    console.log('🔄 Scheduling all notifications...')

    // 0. (Web) 미래 예정된 알림들 청소 (재설정을 위해)
    const now = new Date()
    this.notifications = this.notifications.filter(n => n.scheduledTime <= now)

    // 1. (Native) 모든 기존 스케줄 취소
    if (Capacitor.isNativePlatform()) {
      try {
        const pending = await LocalNotifications.getPending()
        if (pending.notifications.length > 0) {
          await LocalNotifications.cancel({ notifications: pending.notifications })
        }
      } catch (e) {
        console.error('Failed to cancel native notifications', e)
      }
    }

    // 2. 일간 브리핑 스케줄링
    await this.scheduleDailyBriefing(settings, todos, customHolidays)

    // 3. 주간 리포트 스케줄링
    await this.scheduleWeeklyReport(settings)

    // 4. 개별 Todo 알림 스케줄링
    for (const todo of todos) {
      if (!todo.completed) {
        await this.scheduleReminder(todo, settings)
        await this.scheduleStartReminder(todo, settings)
      }
    }

    this.saveNotifications()
    console.log('✅ All notifications scheduled successfully')
  }

  public async scheduleDailyBriefing(
    settings: NotificationSettings,
    todos: Todo[],
    customHolidays: CustomHoliday[]
  ) {
    if (!settings.dailyReminder || !settings.dailyReminderTime) return

    const [hours, minutes] = settings.dailyReminderTime.split(':').map(Number)
    const recurrence = settings.dailyRecurrence || [1, 2, 3, 4, 5]

    const nativeNotifications = []

    for (let i = 0; i < 14; i++) {
      const targetDate = addDays(new Date(), i)
      targetDate.setHours(hours, minutes, 0, 0)

      if (targetDate <= new Date()) continue

      const dayOfWeek = getDay(targetDate)
      if (!recurrence.includes(dayOfWeek)) continue

      if (settings.dailyExcludeHolidays) {
        const isHoliday = customHolidays.some(h => isSameDay(targetDate, new Date(h.date)))
        if (isHoliday) continue
      }

      const message = this.buildFutureBriefingMessage(todos, targetDate)
      const idStr = (NotificationManager.DAILY_ID_BASE + i).toString()

      // Web: Add to local list
      this.notifications.push({
        id: idStr,
        type: 'daily_briefing',
        title: '오늘의 할일 📋',
        message: message,
        scheduledTime: targetDate,
        isRead: false,
        createdAt: new Date(),
        tag: `daily_${i}`
      })

      // Native: Prepare for schedule
      if (Capacitor.isNativePlatform()) {
        nativeNotifications.push({
          id: NotificationManager.DAILY_ID_BASE + i,
          title: '오늘의 할일 📋',
          body: message,
          schedule: { at: targetDate, allowWhileIdle: true },
          channelId: 'todo_alert_channel',
          actionTypeId: 'DAILY_BRIEFING_ACTIONS',
          extra: { type: 'daily_briefing' },
          smallIcon: 'ic_puppy',
          iconColor: '#4F46E5',
          largeIcon: 'ic_puppy'
        })
      }
    }

    if (nativeNotifications.length > 0) {
      await LocalNotifications.schedule({ notifications: nativeNotifications })
    }
  }

  private buildFutureBriefingMessage(todos: Todo[], targetDate: Date): string {
    const targetDateStr = format(targetDate, 'yyyy-MM-dd')
    const relevantTodos = todos.filter(t => {
      if (t.completed) return false
      const dueMatch = t.dueDate ? format(new Date(t.dueDate), 'yyyy-MM-dd') === targetDateStr : false
      const startMatch = t.startDate ? format(new Date(t.startDate), 'yyyy-MM-dd') <= targetDateStr : false
      return dueMatch || startMatch
    })

    if (relevantTodos.length === 0) return '오늘 예정된 할일을 확인해보세요! 📝'
    return `오늘 ${relevantTodos.length}개의 할일이 예정되어 있습니다.`
  }

  public async scheduleWeeklyReport(settings: NotificationSettings) {
    if (!settings.weeklyReport || !settings.weeklyReportTime) return

    const [hours, minutes] = settings.weeklyReportTime.split(':').map(Number)
    let targetDate = new Date()
    targetDate.setHours(hours, minutes, 0, 0)

    while (getDay(targetDate) !== 1 || targetDate <= new Date()) {
      targetDate = addDays(targetDate, 1)
      targetDate.setHours(hours, minutes, 0, 0)
    }

    // Web
    this.notifications.push({
      id: NotificationManager.WEEKLY_REPORT_ID.toString(),
      type: 'weekly_report',
      title: '주간 성과 리포트 📊',
      message: '지난 한 주의 성과를 확인해보세요!',
      scheduledTime: targetDate,
      isRead: false,
      createdAt: new Date()
    })

    // Native
    if (Capacitor.isNativePlatform()) {
      await LocalNotifications.schedule({
        notifications: [{
          id: NotificationManager.WEEKLY_REPORT_ID,
          title: '주간 성과 리포트 📊',
          body: '지난 한 주의 성과를 확인해보세요!',
          schedule: { at: targetDate, allowWhileIdle: true, every: 'week' },
          channelId: 'todo_alert_channel',
          extra: { type: 'weekly_report' },
          smallIcon: 'ic_puppy',
          iconColor: '#4F46E5',
          largeIcon: 'ic_puppy'
        }]
      })
    }
  }

  public async scheduleReminder(todo: Todo, settings: NotificationSettings) {
    if (!settings.dueReminders || !todo.dueDate) return

    let reminderTime = new Date(todo.dueDate)
    if (settings.dueReminderTiming !== undefined) {
      reminderTime = new Date(reminderTime.getTime() - settings.dueReminderTiming * 60000)
    } else {
      reminderTime.setDate(reminderTime.getDate() - settings.advanceDays)
      const [hours, minutes] = settings.time.split(':').map(Number)
      reminderTime.setHours(hours, minutes, 0, 0)
    }

    if (reminderTime <= new Date()) return

    const id = this.hashCode(todo.id)

    // Web
    this.notifications.push({
      id: id.toString(),
      todoId: todo.id,
      type: 'reminder',
      title: '마감 임박 알림',
      message: `"${todo.title}" 마감 시간이 다가옵니다.`,
      scheduledTime: reminderTime,
      isRead: false,
      createdAt: new Date(),
      tag: `reminder-${todo.id}`
    })

    // Native
    if (Capacitor.isNativePlatform()) {
      await LocalNotifications.schedule({
        notifications: [{
          title: '마감 임박 알림',
          body: `"${todo.title}" 마감 시간이 다가옵니다.`,
          id: id,
          schedule: { at: reminderTime, allowWhileIdle: true },
          channelId: 'todo_alert_channel',
          actionTypeId: 'REMINDER_ACTIONS',
          extra: { todoId: todo.id, type: 'reminder' },
          smallIcon: 'ic_puppy',
          iconColor: '#4F46E5',
          largeIcon: 'ic_puppy'
        }]
      })
    }
  }

  public async scheduleStartReminder(todo: Todo, settings: NotificationSettings) {
    if (!settings.startReminder || !todo.startDate || !settings.startReminderTime) return

    const [hours, minutes] = settings.startReminderTime.split(':').map(Number)
    const startTime = new Date(todo.startDate)
    startTime.setHours(hours, minutes, 0, 0)

    if (startTime <= new Date()) return

    const id = this.hashCode(todo.id + "_start")

    // Web
    this.notifications.push({
      id: id.toString(),
      todoId: todo.id,
      type: 'start_reminder',
      title: '할일 시작 알림 🚀',
      message: `"${todo.title}" 시작일입니다.`,
      scheduledTime: startTime,
      isRead: false,
      createdAt: new Date(),
      tag: `start-${todo.id}`
    })

    if (Capacitor.isNativePlatform()) {
      await LocalNotifications.schedule({
        notifications: [{
          title: '할일 시작 알림 🚀',
          body: `"${todo.title}" 시작일입니다.`,
          id: id,
          schedule: { at: startTime, allowWhileIdle: true },
          channelId: 'default',
          actionTypeId: 'REMINDER_ACTIONS',
          extra: { todoId: todo.id, type: 'start_reminder' },
          smallIcon: 'ic_puppy',
          iconColor: '#4F46E5',
          largeIcon: 'ic_puppy'
        }]
      })
    }
  }

  // --- Helpers ---
  private hashCode(str: string): number {
    let hash = 0, i, chr;
    if (str.length === 0) return hash;
    for (i = 0; i < str.length; i++) {
      chr = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + chr;
      hash |= 0;
    }
    return Math.abs(hash);
  }

  public isSupported(): boolean {
    if (Capacitor.isNativePlatform()) return true
    return 'Notification' in window
  }

  public async requestPermission(): Promise<boolean> {
    if (Capacitor.isNativePlatform()) {
      const result = await LocalNotifications.requestPermissions()
      return result.display === 'granted'
    }
    if ('Notification' in window) {
      const permission = await Notification.requestPermission()
      return permission === 'granted'
    }
    return false
  }

  public async checkPermissions(): Promise<PermissionStatus> {
    if (Capacitor.isNativePlatform()) {
      return await LocalNotifications.checkPermissions()
    }
    // Web fallback
    if ('Notification' in window) {
      return { display: Notification.permission === 'granted' ? 'granted' : Notification.permission === 'denied' ? 'denied' : 'prompt' }
    }
    return { display: 'denied' }
  }


  // Legacy/Unused methods stubs
  public async cancelDailyBriefing() { }
  private checkWeeklyReport() { }
  public scheduleOverdueNotification(todo: Todo) { }
  public suggestRecurringTask(todo: Todo) { }
  public showCompletionCelebration(todo: Todo) { }
  public markAsRead(id: string) { }
  public dismissNotification(id: string) { }
  public getUnreadNotifications() { return [] }
  public getAllNotifications() { return [] }
  public addListener(l: any) { }
  public removeListener(l: any) { }
  public async clearNotificationsForTodo(todoId: string) {
    // Also remove from local
    this.notifications = this.notifications.filter(n => n.todoId !== todoId)
    this.saveNotifications()

    if (Capacitor.isNativePlatform()) {
      const id1 = this.hashCode(todoId)
      const id2 = this.hashCode(todoId + "_start")
      await LocalNotifications.cancel({ notifications: [{ id: id1 }, { id: id2 }] })
    }
  }
}

export const notificationManager = new NotificationManager()