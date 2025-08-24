// Type definitions for context data structures

export interface RecurringTemplate {
  id: string
  title: string
  description?: string
  type: 'single' | 'project'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  tags: string[]
  recurrence: {
    type: 'weekly' | 'monthly'
    interval?: number
    weekday?: number
    date?: number
    holidayHandling?: 'before' | 'after'
  }
  createdAt: Date
  updatedAt: Date
}

export interface RecurringInstance {
  id: string
  templateId: string
  date: Date
  completed: boolean
  completedAt?: Date
  skipped?: boolean
  originalTemplate: RecurringTemplate
  createdAt: Date
  updatedAt: Date
}

export interface ParsedLocalStorageData {
  todos?: any[] // Will be replaced with Todo[] after import cleanup
  templates?: RecurringTemplate[]
  instances?: RecurringInstance[]
}

export interface VacationData {
  id: string
  employeeId: number
  date: string
  type: string
  createdAt?: number
  updatedAt?: number
}