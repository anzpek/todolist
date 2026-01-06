export type Priority = 'low' | 'medium' | 'high' | 'urgent'

export type SharePermission = 'read' | 'edit' | 'admin'

export interface SharedUser {
  uid: string
  email: string
  displayName?: string
  photoURL?: string | null
  permission: SharePermission
}

export interface SharingRequest {
  id: string
  fromUid: string
  fromEmail: string
  toEmail: string
  todoId: string
  todoTitle: string
  shareName?: string // Optional custom name for the share
  permission: SharePermission
  status: 'pending' | 'accepted' | 'rejected'
  createdAt: Date
}

export interface SharingGroup {
  id: string
  name: string
  members: SharedUser[]       // 수락된 멤버들
  pendingMembers?: SharedUser[] // 초대 대기 중인 멤버들
  isReference?: boolean         // 내가 만든 그룹이 아닌 참조 그룹 여부
  originalGroupId?: string      // 원본 그룹 ID
  originalOwnerId?: string      // 원본 그룹 소유자 UID
  originalOwnerEmail?: string   // 원본 그룹 소유자 이메일
  createdAt: Date
}

export interface TaskVisibility {
  isPersonal: boolean // 내 할 일 목록에 표시
  isShared: boolean   // 공유 관련 목록에 표시
}

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
  googleTaskId?: string
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
  dueReminders: boolean
  dueReminderTiming?: number // 분 단위 (예: 60 = 1시간 전)
  time: string // 마감일 알림 기준 시간 (HH:mm)
  advanceDays: number // dueReminderTiming이 없을 때 며칠 전인지

  startReminder: boolean // 시작일 알림
  startReminderTime?: string // 시작일 알림 시간 (HH:mm)

  weeklyReport: boolean // 주간 리포트
  weeklyReportTime?: string // 주간 리포트 시간 (HH:mm)

  dailyReminder: boolean // 일간 브리핑
  dailyReminderTime: string // 일간 브리핑 시간
  dailyRecurrence?: number[] // 일간 브리핑 요일 (0: 일, 1: 월, ... 6: 토)
  dailyExcludeHolidays?: boolean // 공휴일 제외 여부
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

  // 🔥 월간 특정 주의 요일 설정 추가
  monthlyPattern?: 'date' | 'weekday' // 'date': 특정 날짜, 'weekday': 특정 주의 요일
  monthlyWeek?: 'first' | 'second' | 'third' | 'fourth' | 'last' // 몇 번째 주
  monthlyWeekday?: number // 0=일, 1=월, ..., 6=토 (monthlyPattern이 'weekday'일 때)

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
  showStartTime?: boolean // 시작 시간 표시 여부
  showDueTime?: boolean // 마감 시간 표시 여부
  completedAt?: Date // 완료일
  notification?: NotificationSettings
  order?: number // 정렬 순서 (드래그 앤 드롭용)
  createdAt: Date
  updatedAt: Date

  // 공유 기능 관련
  ownerId?: string // 소유자 UID
  sharedWith?: SharedUser[] // 공유 대상 목록
  sharedWithUids?: string[] // 공유 대상 UID 목록 (쿼리용)
  editorUids?: string[] // 편집 권한 UID 목록 (쿼리용)
  adminUids?: string[] // 관리(삭제) 권한 UID 목록 (쿼리용)
  sharedGroupId?: string // 공유 그룹 ID (그룹 멤버 변경 시 자동 반영용)
  sharedGroupOwnerId?: string // 공유 그룹 소유자 UID
  visibility?: TaskVisibility // 노출 설정 (내 할 일 / 공유 할 일)
  lastModifiedBy?: string // 마지막 수정자 UID (NEW/최근 수정 배지용)
  // 프론트엔드 편의용 (DB 저장 X)
  myPermission?: SharePermission // 현재 사용자의 권한

  // External Integration
  googleTaskId?: string
  googleTaskListId?: string
}

// 공유 알림 (권한 변경, 새 할일 추가 등)
export interface SharingNotification {
  id: string
  type: 'permission_change' | 'todo_added' | 'todo_updated'
  targetUid: string           // 알림 받을 사용자
  fromUid: string             // 변경한 사용자
  fromEmail: string
  groupId?: string
  groupName?: string
  todoId?: string
  todoTitle?: string
  previousPermission?: SharePermission
  newPermission?: SharePermission
  createdAt: Date
  read: boolean
}

export interface TodoStats {
  total: number
  completed: number
  overdue: number
  today: number
  thisWeek: number
  thisMonth: number
}