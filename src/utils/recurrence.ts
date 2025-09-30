import type { Todo } from '../types/todo'
import { adjustDateForHoliday, isNonWorkingDay, getFirstWorkdayOfMonth, getLastWorkdayOfMonth } from './holidays'

// 🔥 특정 월의 N번째 특정 요일 찾기 (예: 네번째 주 화요일)
function findNthWeekdayOfMonth(year: number, month: number, weekPosition: 'first' | 'second' | 'third' | 'fourth' | 'last', weekday: number): Date | null {
  // 해당 월의 첫째 날
  const firstDay = new Date(year, month - 1, 1)
  const firstDayOfWeek = firstDay.getDay() // 0=일요일, 6=토요일

  if (weekPosition === 'last') {
    // 마지막 주 처리
    const lastDay = new Date(year, month, 0) // 다음 달 0일 = 이번 달 마지막 날

    // 마지막 날부터 거슬러 올라가면서 해당 요일 찾기
    for (let day = lastDay.getDate(); day >= 1; day--) {
      const testDate = new Date(year, month - 1, day)
      if (testDate.getDay() === weekday) {
        return testDate
      }
    }
  } else {
    // 첫째, 둘째, 셋째, 넷째 주 처리
    const weekNumbers = { 'first': 1, 'second': 2, 'third': 3, 'fourth': 4 }
    const targetWeek = weekNumbers[weekPosition]

    // 해당 월의 첫 번째 해당 요일 찾기
    let daysToAdd = (weekday - firstDayOfWeek + 7) % 7
    let firstOccurrence = new Date(year, month - 1, 1 + daysToAdd)

    // N번째 발생일 계산
    let targetDate = new Date(firstOccurrence)
    targetDate.setDate(targetDate.getDate() + (targetWeek - 1) * 7)

    // 해당 월을 벗어나지 않았는지 확인
    if (targetDate.getMonth() === month - 1) {
      return targetDate
    } else {
      return null
    }
  }

  return null
}

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
      // 🔥 새로운 월간 패턴 처리: 특정 주의 요일
      if (todo.monthlyPattern === 'weekday' &&
          todo.monthlyWeek &&
          todo.monthlyWeekday !== undefined) {

        const monthlyWeek = todo.monthlyWeek
        const monthlyWeekday = todo.monthlyWeekday

        // 다음 월로 이동
        const targetYear = nextDate.getMonth() === 11 ? nextDate.getFullYear() + 1 : nextDate.getFullYear()
        const targetMonth = nextDate.getMonth() === 11 ? 1 : nextDate.getMonth() + 2 // 1-based

        const calculatedDate = findNthWeekdayOfMonth(targetYear, targetMonth, monthlyWeek, monthlyWeekday)
        if (calculatedDate) {
          return calculatedDate
        }
      }

      // 기존 로직: recurrenceDate 기반
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

    // 🔥 새로운 월간 패턴 필드들 복사
    ...originalTodo.monthlyPattern && {
      monthlyPattern: originalTodo.monthlyPattern,
      monthlyWeek: originalTodo.monthlyWeek,
      monthlyWeekday: originalTodo.monthlyWeekday,
    },

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
      
    case 'monthly': {
      // 🔥 새로운 월간 패턴 처리: 특정 주의 요일
      if (todo.monthlyPattern === 'weekday' &&
          todo.monthlyWeek &&
          todo.monthlyWeekday !== undefined) {

        const weeks = {
          'first': '첫째',
          'second': '둘째',
          'third': '셋째',
          'fourth': '네째',
          'last': '마지막'
        } as const

        const weekdays = ['일', '월', '화', '수', '목', '금', '토']
        const monthlyWeek = todo.monthlyWeek
        const monthlyWeekday = todo.monthlyWeekday

        description = `매월 ${weeks[monthlyWeek]} 주 ${weekdays[monthlyWeekday]}요일`
      } else {
        // 기존 로직: recurrenceDate 기반
        if (todo.recurrenceDate === -1) {
          description = '매월 말일'
        } else if (todo.recurrenceDate === -2) {
          description = '매월 첫 번째 근무일'
        } else if (todo.recurrenceDate === -3) {
          description = '매월 마지막 근무일'
        } else {
          description = `매월 ${todo.recurrenceDate || 1}일`
        }
      }
      break
    }
      
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