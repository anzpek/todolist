export type Priority = 'low' | 'medium' | 'high' | 'urgent'

export type RecurrenceType = 'daily' | 'weekly' | 'monthly' | 'yearly' | 'none'

// 고급 반복 설정 타입들
export type WeeklyRecurrenceType = 'every_week' | 'first_week' | 'second_week' | 'third_week' | 'fourth_week' | 'last_week' | 'exclude_first' | 'exclude_last'

export type MonthlyRecurrenceType = 'by_date' | 'by_weekday' // 날짜별 vs 요일별

export type HolidayHandling = 'before' | 'after' | 'show'

export interface WeeklyRecurrenceOptions {
  type: WeeklyRecurrenceType
  weekday: number // 0=일요일, 1=월요일, ..., 6=토요일
  holidayHandling: HolidayHandling
}

export interface MonthlyRecurrenceOptions {
  type: MonthlyRecurrenceType
  // 날짜별 반복 (by_date)
  date?: number // 1-31, -1=말일, -2=첫번째 근무일, -3=마지막 근무일
  // 요일별 반복 (by_weekday)  
  weekOfMonth?: number // 1=첫째주, 2=둘째주, 3=셋째주, 4=넷째주, -1=마지막주
  weekday?: number // 0=일요일, 1=월요일, ..., 6=토요일
  holidayHandling: HolidayHandling
}

export interface AdvancedRecurrence {
  type: RecurrenceType
  weekly?: WeeklyRecurrenceOptions
  monthly?: MonthlyRecurrenceOptions
  startDate: Date
  endDate?: Date // 반복 종료일 (선택사항)
}

export type TaskType = 'simple' | 'project'

export interface SubTask {
  id: string
  title: string
  description?: string
  completed: boolean
  priority: Priority
  dueDate?: Date // 마감일과 시간 포함 (Date 객체로 저장)
  completedAt?: Date // 완료 시간
  createdAt: Date
  updatedAt: Date
}

export interface ProjectTemplate {
  id: string
  name: string
  description?: string
  category: 'longterm' | 'shortterm'
  subTasks: Omit<SubTask, 'id' | 'createdAt' | 'updatedAt'>[]
  defaultPriority: Priority
  estimatedDuration?: number // 예상 소요 일수
  tags?: string[]
  createdAt: Date
  updatedAt: Date
}

export interface NotificationSettings {
  enabled: boolean
  advanceDays: number // 몇 일 전에 알림
  time: string // 알림 시간 (HH:mm 형식)
}

export interface Todo {
  id: string
  title: string
  description?: string
  completed: boolean
  priority: Priority
  type: TaskType
  dueDate?: Date // 마감일과 시간 포함 (Date 객체로 저장)
  dueTime?: string // 마감 시간 (HH:mm 형식)
  recurrence: RecurrenceType
  recurrenceDay?: number // 매주 반복시 요일 (0=일요일, 6=토요일)
  recurrenceDate?: number // 매달 반복시 날짜 (1-31, -1=말일, -2=첫번째 근무일, -3=마지막 근무일)
  holidayHandling?: 'before' | 'after' // 공휴일 처리 방식
  subTasks?: SubTask[] // 프로젝트 타입일 때만 사용
  project?: 'longterm' | 'shortterm' // 롱텀/숏텀 프로젝트 구분
  templateId?: string // 템플릿에서 생성된 경우 템플릿 ID
  parentId?: string // 롱텀 프로젝트 하위의 프로젝트인 경우 부모 ID
  tags?: string[]
  estimatedDuration?: number
  actualDuration?: number
  startDate?: Date // 실제 시작일
  startTime?: string // 시작 시간 (HH:mm 형식)
  completedAt?: Date // 완료일
  notification?: NotificationSettings
  order?: number // 정렬 순서 (드래그 앤 드롭용)
  createdAt: Date
  updatedAt: Date
}

export interface TodoStats {
  total: number
  completed: number
  overdue: number
  today: number
  thisWeek: number
  thisMonth: number
}