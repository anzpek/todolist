import type { Todo } from '../types/todo'
import { adjustDateForHoliday, isNonWorkingDay, getFirstWorkdayOfMonth, getLastWorkdayOfMonth } from './holidays'

export function getNextRecurrenceDate(todo: Todo, fromDate: Date = new Date()): Date | null {
  if (todo.recurrence === 'none' || !todo.dueDate) {
    return null
  }

  const nextDate = new Date(fromDate)
  
  switch (todo.recurrence) {
    case 'daily':
      nextDate.setDate(nextDate.getDate() + 1)
      break
      
    case 'weekly': {
      // 다음 주 같은 요일로 설정
      const targetDay = todo.recurrenceDay || 1 // 기본값: 월요일
      const currentDay = nextDate.getDay()
      const daysUntilTarget = (targetDay - currentDay + 7) % 7 || 7
      nextDate.setDate(nextDate.getDate() + daysUntilTarget)
      break
    }
      
    case 'monthly': {
      const targetDate = todo.recurrenceDate || 1
      
      if (targetDate === -1) {
        // 말일로 설정
        nextDate.setMonth(nextDate.getMonth() + 1)
        nextDate.setDate(0) // 이전 달의 마지막 날
      } else if (targetDate === -2) {
        // 첫 번째 근무일로 설정
        const nextMonth = nextDate.getMonth() + 1
        const nextYear = nextMonth > 11 ? nextDate.getFullYear() + 1 : nextDate.getFullYear()
        const adjustedMonth = nextMonth > 11 ? 0 : nextMonth
        return getFirstWorkdayOfMonth(nextYear, adjustedMonth + 1) // month는 1-based
      } else if (targetDate === -3) {
        // 마지막 근무일로 설정
        const nextMonth = nextDate.getMonth() + 1
        const nextYear = nextMonth > 11 ? nextDate.getFullYear() + 1 : nextDate.getFullYear()
        const adjustedMonth = nextMonth > 11 ? 0 : nextMonth
        return getLastWorkdayOfMonth(nextYear, adjustedMonth + 1) // month는 1-based
      } else {
        // 특정 날짜로 설정
        nextDate.setMonth(nextDate.getMonth() + 1)
        nextDate.setDate(targetDate)
        
        // 해당 월에 그 날짜가 없으면 말일로 조정
        if (nextDate.getDate() !== targetDate) {
          nextDate.setDate(0)
        }
      }
      break
    }
      
    case 'yearly':
      nextDate.setFullYear(nextDate.getFullYear() + 1)
      break
      
    default:
      return null
  }
  
  // 공휴일 처리
  if (todo.holidayHandling && isNonWorkingDay(nextDate)) {
    return adjustDateForHoliday(nextDate, todo.holidayHandling)
  }
  
  return nextDate
}

export function createRecurringTodo(originalTodo: Todo, newDueDate: Date): Omit<Todo, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    title: originalTodo.title,
    description: originalTodo.description,
    completed: false,
    priority: originalTodo.priority,
    type: originalTodo.type,
    dueDate: newDueDate,
    dueTime: originalTodo.dueTime,
    recurrence: originalTodo.recurrence,
    recurrenceDay: originalTodo.recurrenceDay,
    recurrenceDate: originalTodo.recurrenceDate,
    holidayHandling: originalTodo.holidayHandling,
    subTasks: originalTodo.type === 'project' ? [] : undefined,
    project: originalTodo.project,
  }
}

export function shouldCreateRecurringInstance(todo: Todo): boolean {
  if (todo.recurrence === 'none' || !todo.completed || !todo.dueDate) {
    return false
  }
  
  const nextDate = getNextRecurrenceDate(todo)
  if (!nextDate) {
    return false
  }
  
  // 다음 반복 날짜가 현재 날짜 이후인지 확인
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  nextDate.setHours(0, 0, 0, 0)
  
  return nextDate >= today
}

export function getRecurrenceDescription(todo: Todo): string {
  if (todo.recurrence === 'none') {
    return '반복 안함'
  }
  
  let description = ''
  
  switch (todo.recurrence) {
    case 'daily':
      description = '매일'
      break
      
    case 'weekly': {
      const weekdays = ['일', '월', '화', '수', '목', '금', '토']
      const dayName = weekdays[todo.recurrenceDay || 1]
      description = `매주 ${dayName}요일`
      break
    }
      
    case 'monthly':
      if (todo.recurrenceDate === -1) {
        description = '매월 말일'
      } else if (todo.recurrenceDate === -2) {
        description = '매월 첫 번째 근무일'
      } else if (todo.recurrenceDate === -3) {
        description = '매월 마지막 근무일'
      } else {
        description = `매월 ${todo.recurrenceDate || 1}일`
      }
      break
      
    case 'yearly':
      description = '매년'
      break
  }
  
  if (todo.holidayHandling) {
    const direction = todo.holidayHandling === 'before' ? '전날' : '다음날'
    description += ` (공휴일시 ${direction})`
  }
  
  return description
}

// 미완료된 반복 업무들을 확인하고 새로운 인스턴스를 생성해야 하는지 판단
export function checkAndCreateRecurringTodos(todos: Todo[]): Omit<Todo, 'id' | 'createdAt' | 'updatedAt'>[] {
  const newTodos: Omit<Todo, 'id' | 'createdAt' | 'updatedAt'>[] = []
  
  todos.forEach(todo => {
    if (shouldCreateRecurringInstance(todo)) {
      const nextDate = getNextRecurrenceDate(todo)
      if (nextDate) {
        const newTodo = createRecurringTodo(todo, nextDate)
        newTodos.push(newTodo)
      }
    }
  })
  
  return newTodos
}