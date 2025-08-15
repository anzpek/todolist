import type { Todo, Priority, TaskType, RecurrenceType } from './todo'

// 반복 태스크 마스터 템플릿
export interface RecurringTemplate {
  id: string
  title: string
  description?: string
  priority: Priority
  type: TaskType
  recurrence: RecurrenceType
  recurrenceDay?: number // 매주 반복시 요일 (0=일요일, 6=토요일)
  recurrenceDate?: number // 매달 반복시 날짜 (1-31, 또는 -1=말일)
  holidayHandling?: 'before' | 'after'
  dueTime?: string
  subTasks?: {
    title: string
    description?: string
    priority: Priority
    dueDate?: Date
    dueTime?: string
  }[]
  project?: 'longterm' | 'shortterm'
  tags?: string[]
  estimatedDuration?: number
  notification?: Todo['notification']
  isActive: boolean // 반복 생성 활성/비활성
  startDate: Date // 반복 시작일
  endDate?: Date // 반복 종료일 (선택사항)
  createdAt: Date
  updatedAt: Date
}

// 반복 태스크 인스턴스
export interface RecurringInstance {
  id: string
  templateId: string // 마스터 템플릿 ID
  instanceDate: Date // 이 인스턴스가 속한 날짜
  completed: boolean
  completedAt?: Date
  skipped: boolean // 건너뛰기 상태
  skippedReason?: string
  // 인스턴스별 개별 수정사항 (선택사항)
  overrides?: {
    title?: string
    description?: string
    priority?: Priority
    dueTime?: string
    tags?: string[]
  }
  createdAt: Date
  updatedAt: Date
}

// 반복 태스크 관리 상태
export interface RecurringTaskState {
  templates: RecurringTemplate[]
  instances: RecurringInstance[]
  lastProcessedDate: Date // 마지막으로 인스턴스를 생성한 날짜
}

// 반복 태스크 액션 타입
export type RecurringAction =
  | { type: 'ADD_TEMPLATE'; payload: RecurringTemplate }
  | { type: 'UPDATE_TEMPLATE'; payload: { id: string; updates: Partial<RecurringTemplate> } }
  | { type: 'DELETE_TEMPLATE'; payload: string }
  | { type: 'TOGGLE_TEMPLATE'; payload: string } // 활성/비활성
  | { type: 'ADD_INSTANCE'; payload: RecurringInstance }
  | { type: 'UPDATE_INSTANCE'; payload: { id: string; updates: Partial<RecurringInstance> } }
  | { type: 'DELETE_INSTANCE'; payload: string }
  | { type: 'COMPLETE_INSTANCE'; payload: string }
  | { type: 'UNCOMPLETE_INSTANCE'; payload: string }
  | { type: 'SKIP_INSTANCE'; payload: { id: string; reason?: string } }
  | { type: 'DELETE_ALL_INSTANCES'; payload: string } // 특정 템플릿의 모든 인스턴스 삭제
  | { type: 'SET_TEMPLATES'; payload: RecurringTemplate[] }
  | { type: 'SET_INSTANCES'; payload: RecurringInstance[] }
  | { type: 'SET_LAST_PROCESSED_DATE'; payload: Date }

// 인스턴스 삭제 옵션
export interface DeleteInstanceOptions {
  deleteType: 'single' | 'future' | 'all' // 단일/미래/전체 삭제
  reason?: string
}

// 반복 태스크 통계
export interface RecurringStats {
  totalTemplates: number
  activeTemplates: number
  totalInstances: number
  completedInstances: number
  skippedInstances: number
  completionRate: number
}