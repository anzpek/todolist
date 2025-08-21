/**
 * 간소화된 반복 할일 시스템
 * 기본 기능부터 확실히 작동시키기 위한 버전
 */

import type { Todo } from '../types/todo'
import { getHolidayInfoSync, isWeekend } from './holidays'

// 중복 예외 설정 인터페이스
export interface ConflictException {
  targetTemplateTitle: string // 중복 대상 템플릿 제목
  scope: 'same_date' | 'same_week' | 'same_month' // 중복 범위
}

// 반복 예외 설정 인터페이스
export interface RecurrenceException {
  type: 'date' | 'weekday' | 'week' | 'month' | 'conflict'
  values: number[] | string[] | ConflictException[] // 날짜: [1,2,3], 요일: [0,1,2], 주: [1,2,3,4], 달: [1,2,3], 중복: ConflictException[]
}

// 간단한 반복 템플릿
export interface SimpleRecurringTemplate {
  id: string
  title: string
  description?: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  type: 'simple' | 'project'
  
  // 반복 설정
  recurrenceType: 'weekly' | 'monthly'
  weekday?: number // 0=일, 1=월, ..., 6=토 (weekly용)
  monthlyDate?: number // 1-31 (monthly용)
  
  // 확장된 월간 반복 설정
  monthlyPattern?: 'date' | 'weekday' // 'date': 특정 날짜, 'weekday': 특정 주의 요일
  monthlyWeek?: 'first' | 'second' | 'third' | 'fourth' | 'last' // 몇 번째 주
  monthlyWeekday?: number // 0=일, 1=월, ..., 6=토 (monthlyPattern이 'weekday'일 때)
  
  // 예외 설정
  exceptions?: RecurrenceException[]
  
  // 공휴일 처리
  holidayHandling?: 'before' | 'after'
  
  isActive: boolean
  createdAt: Date
  updatedAt: Date
  tags?: string[]
}

// 간단한 반복 인스턴스
export interface SimpleRecurringInstance {
  id: string
  templateId: string
  date: Date
  completed: boolean
  completedAt?: Date
  createdAt: Date
  updatedAt: Date
}

class SimpleRecurringSystem {
  // 중복 검사를 위한 템플릿 저장소
  private templates: SimpleRecurringTemplate[] = []
  
  // 템플릿 등록/업데이트
  setTemplates(templates: SimpleRecurringTemplate[]) {
    this.templates = templates
  }
  
  // 특정 날짜에 다른 템플릿의 인스턴스가 있는지 확인
  private hasConflictingInstance(date: Date, currentTemplateId: string, conflictException: ConflictException): boolean {
    const targetTemplates = this.templates.filter(t => 
      t.title === conflictException.targetTemplateTitle && 
      t.id !== currentTemplateId && 
      t.isActive
    )
    
    console.log(`중복 검사 시작: ${date.toDateString()}, 범위: ${conflictException.scope}, 대상: ${conflictException.targetTemplateTitle}`)
    
    for (const template of targetTemplates) {
      const otherInstances = this.generateInstancesForTemplate(template)
      
      for (const instance of otherInstances) {
        const hasConflict = this.checkDateConflict(date, instance.date, conflictException.scope)
        if (hasConflict) {
          console.log(`  중복 발견: ${template.title} - ${instance.date.toDateString()}`)
          return true
        }
      }
    }
    
    return false
  }
  
  // 날짜 충돌 검사 (scope에 따라)
  private checkDateConflict(date1: Date, date2: Date, scope: 'same_date' | 'same_week' | 'same_month'): boolean {
    switch (scope) {
      case 'same_date':
        return date1.toDateString() === date2.toDateString()
      
      case 'same_week':
        // 같은 주인지 확인 (일요일 기준 주)
        const startOfWeek1 = new Date(date1)
        startOfWeek1.setDate(date1.getDate() - date1.getDay())
        const startOfWeek2 = new Date(date2)  
        startOfWeek2.setDate(date2.getDate() - date2.getDay())
        return startOfWeek1.toDateString() === startOfWeek2.toDateString()
      
      case 'same_month':
        return date1.getFullYear() === date2.getFullYear() && 
               date1.getMonth() === date2.getMonth()
      
      default:
        return false
    }
  }
  
  // 개별 템플릿의 인스턴스 생성 (충돌 검사 제외)
  private generateInstancesForTemplate(template: SimpleRecurringTemplate): SimpleRecurringInstance[] {
    if (!template.isActive) return []
    
    switch (template.recurrenceType) {
      case 'weekly':
        return this.generateWeeklyInstancesRaw(template)
      case 'monthly':
        return this.generateMonthlyInstancesRaw(template)
      default:
        return []
    }
  }
  
  
  // 월 내에서 몇 번째 주인지 계산 (첫째주=1, 둘째주=2, ..., 마지막주=-1)
  private calculateWeekOfMonth(date: Date): number {
    const year = date.getFullYear()
    const month = date.getMonth()
    const day = date.getDate()
    
    console.log(`calculateWeekOfMonth: ${date.toDateString()}, year=${year}, month=${month+1}, day=${day}`)
    
    // 해당 월의 첫날과 마지막날
    const firstDayOfMonth = new Date(year, month, 1)
    const lastDayOfMonth = new Date(year, month + 1, 0)
    
    // 첫째 주부터 계산 (월의 첫날이 포함된 주가 1주차)
    const firstWeekday = firstDayOfMonth.getDay() // 0=일요일, 1=월요일, ...
    const weekOfMonth = Math.ceil((day + firstWeekday) / 7)
    
    // 해당 월의 총 주수 계산
    const totalDays = lastDayOfMonth.getDate()
    const totalWeeks = Math.ceil((totalDays + firstWeekday) / 7)
    
    console.log(`  firstWeekday=${firstWeekday}, weekOfMonth=${weekOfMonth}, totalWeeks=${totalWeeks}`)
    
    // 마지막 주인지 확인 (마지막주는 -1로 반환)
    if (weekOfMonth === totalWeeks) {
      console.log(`  마지막주로 판정: -1 반환`)
      return -1 // 마지막주 표시
    }
    
    console.log(`  일반 주차: ${weekOfMonth} 반환`)
    return weekOfMonth
  }
  
  // 해당 요일의 마지막 발생일인지 확인 (예: 9월의 마지막 목요일)
  private isLastOccurrenceOfWeekdayInMonth(date: Date): boolean {
    const year = date.getFullYear()
    const month = date.getMonth()
    const weekday = date.getDay()
    
    // 해당 월의 마지막날
    const lastDayOfMonth = new Date(year, month + 1, 0)
    
    // 해당 월에서 같은 요일의 마지막 날짜 찾기
    for (let day = lastDayOfMonth.getDate(); day >= 1; day--) {
      const testDate = new Date(year, month, day)
      if (testDate.getDay() === weekday) {
        const isLast = date.getDate() === day
        console.log(`  ${date.toDateString()}: 같은 요일(${weekday})의 마지막 날은 ${testDate.toDateString()}, 일치: ${isLast}`)
        return isLast
      }
    }
    
    return false
  }

  // 공휴일 및 주말 처리
  private adjustForHolidays(date: Date, holidayHandling: 'before' | 'after' = 'before'): Date {
    let adjustedDate = new Date(date)
    
    // 공휴일이나 주말인지 확인하고 조정
    let attempts = 0
    const maxAttempts = 10 // 무한루프 방지
    
    while (attempts < maxAttempts) {
      const isHoliday = getHolidayInfoSync(adjustedDate) !== null
      const isWeekendDay = isWeekend(adjustedDate)
      
      console.log(`공휴일 체크: ${adjustedDate.toDateString()}, 공휴일=${isHoliday}, 주말=${isWeekendDay}`)
      
      if (!isHoliday && !isWeekendDay) {
        break // 평일이면 완료
      }
      
      if (holidayHandling === 'before') {
        adjustedDate.setDate(adjustedDate.getDate() - 1)
        console.log(`  공휴일/주말이므로 하루 이전으로: ${adjustedDate.toDateString()}`)
      } else {
        adjustedDate.setDate(adjustedDate.getDate() + 1)
        console.log(`  공휴일/주말이므로 하루 이후로: ${adjustedDate.toDateString()}`)
      }
      
      attempts++
    }
    
    if (attempts >= maxAttempts) {
      console.warn('공휴일 조정에서 최대 시도 횟수 초과, 원래 날짜 유지')
      return date
    }
    
    if (adjustedDate.getTime() !== date.getTime()) {
      console.log(`공휴일 조정 완료: ${date.toDateString()} → ${adjustedDate.toDateString()}`)
    }
    
    return adjustedDate
  }
  
  // 특정 날짜에 같은 제목의 할일이 이미 있는지 확인
  private hasDuplicateOnDate(date: Date, currentTemplateId?: string, templateTitle?: string): boolean {
    if (!templateTitle) return false
    
    const dateString = date.toDateString()
    
    // 현재 시스템에서 생성될 모든 템플릿의 인스턴스를 확인
    for (const template of this.templates) {
      // 자기 자신은 제외
      if (currentTemplateId && template.id === currentTemplateId) {
        continue
      }
      
      // 같은 제목의 템플릿만 검사
      if (template.title === templateTitle && template.isActive) {
        const instances = this.generateInstancesForTemplate(template)
        
        for (const instance of instances) {
          if (instance.date.toDateString() === dateString) {
            console.log(`🔍 중복 발견: "${templateTitle}" - ${dateString}`)
            return true
          }
        }
      }
    }
    
    return false
  }

  // 예외 조건에 해당하는지 확인
  private isExceptionDate(date: Date, exceptions?: RecurrenceException[], currentTemplateId?: string): boolean {
    if (!exceptions || exceptions.length === 0) {
      // localStorage 사용 중단으로 전역 예외 설정 기능 비활성화
      return false
    }
    
    for (const exception of exceptions) {
      switch (exception.type) {
        case 'date':
          // 특정 날짜 제외 (1-31)
          const dayOfMonth = date.getDate()
          if ((exception.values as number[]).includes(dayOfMonth)) {
            return true
          }
          break
          
        case 'weekday':
          // 특정 요일 제외 (0=일요일, 6=토요일)
          const dayOfWeek = date.getDay()
          if ((exception.values as number[]).includes(dayOfWeek)) {
            return true
          }
          break
          
        case 'week':
          // 특정 주 제외 (첫째주=1, 둘째주=2, 셋째주=3, 넷째주=4, 마지막주=-1)
          const weekOfMonth = this.calculateWeekOfMonth(date)
          console.log('예외 체크:', date.toDateString(), '주차:', weekOfMonth, '예외 값들:', exception.values)
          
          // 마지막주 예외 처리: 해당 요일의 마지막 발생일인지 확인
          if ((exception.values as number[]).includes(-1)) {
            const isLastOccurrenceOfWeekday = this.isLastOccurrenceOfWeekdayInMonth(date)
            console.log('마지막주 체크:', date.toDateString(), '해당 요일의 마지막 발생일:', isLastOccurrenceOfWeekday)
            if (isLastOccurrenceOfWeekday) {
              console.log('예외 날짜 제외 (마지막주):', date.toDateString())
              return true
            }
          }
          
          // 일반 주차 예외 처리
          if ((exception.values as number[]).includes(weekOfMonth)) {
            console.log('예외 날짜 제외:', date.toDateString(), '주차:', weekOfMonth)
            return true
          }
          break
          
        case 'month':
          // 특정 달 제외 (1=1월, 12=12월)
          const month = date.getMonth() + 1
          if ((exception.values as number[]).includes(month)) {
            return true
          }
          break
          
        case 'conflict':
          // 다른 템플릿과의 중복 검사
          if (currentTemplateId) {
            const conflictExceptions = exception.values as ConflictException[]
            for (const conflictException of conflictExceptions) {
              console.log('중복 예외 검사:', date.toDateString(), conflictException)
              if (this.hasConflictingInstance(date, currentTemplateId, conflictException)) {
                console.log('중복으로 인한 예외 처리:', date.toDateString())
                return true
              }
            }
          }
          break
      }
    }
    
    return false
  }
  
  // 주간 반복 인스턴스 생성 - Raw (충돌 검사 제외)
  private generateWeeklyInstancesRaw(template: SimpleRecurringTemplate): SimpleRecurringInstance[] {
    if (template.recurrenceType !== 'weekly' || template.weekday === undefined) {
      return []
    }
    
    const instances: SimpleRecurringInstance[] = []
    const today = new Date()
    const startDate = new Date(template.createdAt) // 템플릿 생성일을 시작일로 사용
    const endOfYear = new Date(today.getFullYear(), 11, 31) // 올해 12월 31일
    
    // 시작일부터 템플릿의 해당 요일 첫 번째 발생일 찾기
    const startWeekday = template.weekday
    let firstOccurrence = new Date(startDate)
    
    // 시작일이 해당 요일이 아니면 다음 해당 요일로 이동
    const daysToAdd = (startWeekday - startDate.getDay() + 7) % 7
    if (daysToAdd > 0) {
      firstOccurrence.setDate(startDate.getDate() + daysToAdd)
    }
    
    // 첫 번째 발생일부터 연말까지 주간 간격으로 인스턴스 생성
    let currentDate = new Date(firstOccurrence)
    
    while (currentDate <= endOfYear) {
      // 현재 날짜가 오늘 이후인 경우만 인스턴스 생성 (과거 할일은 제외)
      // 날짜만 비교 (시간 제외)
      const todayDateOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate())
      const currentDateOnly = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate())
      
      if (currentDateOnly >= todayDateOnly) {
        // 예외 조건 확인
        if (!this.isExceptionDate(currentDate, template.exceptions, template.id)) {
          // 공휴일 처리 적용
          const holidayHandling = template.holidayHandling || 'before' // 기본값 설정
          console.log(`[${template.title}] 원본 날짜: ${currentDate.toDateString()}, 공휴일 처리: ${holidayHandling}`)
          console.log(`[${template.title}] 템플릿 전체 데이터:`, template)
          
          // 공휴일인지 확인
          const isHoliday = getHolidayInfoSync(currentDate) !== null
          const isWeekendDay = isWeekend(currentDate)
          console.log(`[${template.title}] 공휴일 여부: ${isHoliday}, 주말 여부: ${isWeekendDay}`)
          
          // 수정된 로직: adjustForHolidays 함수가 내부적으로 공휴일/주말 확인을 하므로 무조건 호출
          const finalDate = this.adjustForHolidays(currentDate, holidayHandling)
          
          if (finalDate.getTime() !== currentDate.getTime()) {
            console.log(`[${template.title}] 공휴일 조정: ${currentDate.toDateString()} → ${finalDate.toDateString()}`)
          }
          
          // 중복 검사: 같은 제목의 할일이 이미 해당 날짜에 있으면 생성하지 않음
          if (this.hasDuplicateOnDate(finalDate, template.id, template.title)) {
            console.log(`🚫 중복 할일 발견으로 생성 제외: "${template.title}" - ${finalDate.toDateString()}`)
          } else {
            // 결정적 ID 생성: 템플릿ID + 날짜 (타임스탬프 제거로 일관성 보장)
            const uniqueId = `${template.id}_${finalDate.toISOString().split('T')[0]}`
            
            instances.push({
              id: uniqueId,
              templateId: template.id,
              date: finalDate,
              completed: false,
              createdAt: new Date(),
              updatedAt: new Date()
            })
          }
        }
      }
      
      // 다음 주로 이동 (7일 추가)
      currentDate.setDate(currentDate.getDate() + 7)
    }
    
    return instances
  }
  
  // 월간 반복 인스턴스 생성 - Raw (충돌 검사 제외)
  private generateMonthlyInstancesRaw(template: SimpleRecurringTemplate): SimpleRecurringInstance[] {
    if (template.recurrenceType !== 'monthly') {
      return []
    }
    
    const instances: SimpleRecurringInstance[] = []
    const today = new Date()
    const startDate = new Date(template.createdAt) // 템플릿 생성일을 시작일로 사용
    const endOfYear = new Date(today.getFullYear(), 11, 31) // 올해 12월 31일
    
    // 시작 월부터 연말까지 월간 반복 인스턴스 생성
    let currentYear = startDate.getFullYear()
    let currentMonth = startDate.getMonth()
    
    while (currentYear <= endOfYear.getFullYear() && 
           (currentYear < endOfYear.getFullYear() || currentMonth <= endOfYear.getMonth())) {
      
      let targetDate: Date | null = null
      
      // 패턴에 따라 날짜 계산
      if (template.monthlyPattern === 'weekday' && template.monthlyWeek && template.monthlyWeekday !== undefined) {
        // 특정 주의 요일 (예: 매월 마지막 주 수요일)
        targetDate = this.calculateMonthlyWeekday(currentYear, currentMonth, template.monthlyWeek, template.monthlyWeekday)
      } else if (template.monthlyDate !== undefined) {
        // 특정 날짜 (예: 매월 15일)
        if (template.monthlyDate === -1) {
          // 말일
          targetDate = new Date(currentYear, currentMonth + 1, 0)
        } else {
          // 특정 날짜
          targetDate = new Date(currentYear, currentMonth, template.monthlyDate)
          
          // 해당 월에 그 날짜가 있는지 확인 (예: 2월 30일 같은 경우)
          if (targetDate.getMonth() !== currentMonth) {
            // 다음 달로 이동
            currentMonth++
            if (currentMonth >= 12) {
              currentMonth = 0
              currentYear++
            }
            continue // 해당 월에 없는 날짜는 건너뛰기
          }
        }
      }
      
      if (targetDate) {
        // 날짜만 비교 (시간 제외)
        const todayDateOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate())
        const targetDateOnly = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate())
        
        if (targetDateOnly >= todayDateOnly) {
        // 예외 조건 확인
        if (!this.isExceptionDate(targetDate, template.exceptions, template.id)) {
          // 공휴일 처리 적용
          const holidayHandling = template.holidayHandling || 'before' // 기본값 설정
          console.log(`[${template.title}] 원본 날짜: ${targetDate.toDateString()}, 공휴일 처리: ${holidayHandling}`)
          console.log(`[${template.title}] 템플릿 전체 데이터:`, template)
          
          // 공휴일인지 확인
          const isHoliday = getHolidayInfoSync(targetDate) !== null
          const isWeekendDay = isWeekend(targetDate)
          console.log(`[${template.title}] 공휴일 여부: ${isHoliday}, 주말 여부: ${isWeekendDay}`)
          
          // 수정된 로직: adjustForHolidays 함수가 내부적으로 공휴일/주말 확인을 하므로 무조건 호출
          const finalDate = this.adjustForHolidays(targetDate, holidayHandling)
          
          if (finalDate.getTime() !== targetDate.getTime()) {
            console.log(`[${template.title}] 공휴일 조정: ${targetDate.toDateString()} → ${finalDate.toDateString()}`)
          }
          
          // 중복 검사: 같은 제목의 할일이 이미 해당 날짜에 있으면 생성하지 않음
          if (this.hasDuplicateOnDate(finalDate, template.id, template.title)) {
            console.log(`🚫 중복 할일 발견으로 생성 제외: "${template.title}" - ${finalDate.toDateString()}`)
          } else {
            // 결정적 ID 생성: 템플릿ID + 날짜 (타임스탬프 제거로 일관성 보장)
            const uniqueId = `${template.id}_${finalDate.toISOString().split('T')[0]}`
            
            instances.push({
              id: uniqueId,
              templateId: template.id,
              date: finalDate,
              completed: false,
              createdAt: new Date(),
              updatedAt: new Date()
            })
          }
        }
        }
      }
      
      // 다음 달로 이동
      currentMonth++
      if (currentMonth >= 12) {
        currentMonth = 0
        currentYear++
      }
    }
    
    return instances
  }
  
  // 특정 월의 특정 주 특정 요일 계산 (예: 2024년 1월의 마지막 주 수요일)
  private calculateMonthlyWeekday(year: number, month: number, week: 'first' | 'second' | 'third' | 'fourth' | 'last', weekday: number): Date | null {
    const lastDayOfMonth = new Date(year, month + 1, 0)
    
    if (week === 'last') {
      // 마지막 주의 해당 요일 찾기
      for (let day = lastDayOfMonth.getDate(); day >= 1; day--) {
        const date = new Date(year, month, day)
        if (date.getDay() === weekday) {
          return date
        }
      }
    } else {
      // 첫 번째, 두 번째, 세 번째, 네 번째 주의 해당 요일 찾기
      const weekNumbers = { 'first': 1, 'second': 2, 'third': 3, 'fourth': 4 }
      const targetWeek = weekNumbers[week]
      
      let weekCount = 0
      for (let day = 1; day <= lastDayOfMonth.getDate(); day++) {
        const date = new Date(year, month, day)
        if (date.getDay() === weekday) {
          weekCount++
          if (weekCount === targetWeek) {
            return date
          }
        }
      }
    }
    
    return null
  }
  
  // 주간 반복 인스턴스 생성 (충돌 검사 포함)
  generateWeeklyInstances(template: SimpleRecurringTemplate): SimpleRecurringInstance[] {
    return this.generateWeeklyInstancesRaw(template)
  }
  
  // 월간 반복 인스턴스 생성 (충돌 검사 포함)
  generateMonthlyInstances(template: SimpleRecurringTemplate): SimpleRecurringInstance[] {
    return this.generateMonthlyInstancesRaw(template)
  }
  
  // 템플릿에서 인스턴스 생성 (중복 제거 포함)
  generateInstances(template: SimpleRecurringTemplate): SimpleRecurringInstance[] {
    if (!template.isActive) return []
    
    let instances: SimpleRecurringInstance[] = []
    
    switch (template.recurrenceType) {
      case 'weekly':
        instances = this.generateWeeklyInstances(template)
        break
      case 'monthly':
        instances = this.generateMonthlyInstances(template)
        break
      default:
        return []
    }
    
    // 중복 제거: 같은 날짜에 같은 템플릿의 인스턴스가 여러 개 있으면 하나만 남김
    const uniqueInstances = this.removeDuplicateInstances(instances)
    
    return uniqueInstances
  }
  
  // 중복 인스턴스 제거
  private removeDuplicateInstances(instances: SimpleRecurringInstance[]): SimpleRecurringInstance[] {
    const dateMap = new Map<string, SimpleRecurringInstance>()
    
    for (const instance of instances) {
      const dateKey = `${instance.templateId}_${instance.date.toDateString()}`
      
      // 같은 템플릿의 같은 날짜 인스턴스가 이미 있으면 최신 것만 유지
      if (!dateMap.has(dateKey) || dateMap.get(dateKey)!.createdAt < instance.createdAt) {
        if (dateMap.has(dateKey)) {
          console.log(`🔧 중복 인스턴스 제거: ${instance.date.toDateString()}`)
        }
        dateMap.set(dateKey, instance)
      }
    }
    
    return Array.from(dateMap.values()).sort((a, b) => a.date.getTime() - b.date.getTime())
  }
  
  // 인스턴스를 일반 할일로 변환 (결정적 ID 보장)
  convertToTodo(instance: SimpleRecurringInstance, template: SimpleRecurringTemplate): Todo {
    // 일관된 ID 생성: recurring_ + 인스턴스ID (인스턴스 ID가 이미 결정적이므로)
    const todoId = `recurring_${instance.id}`
    
    const todo = {
      id: todoId,
      title: template.title,
      description: template.description,
      completed: instance.completed,
      priority: template.priority,
      type: template.type,
      dueDate: instance.date,
      createdAt: instance.createdAt,
      updatedAt: instance.updatedAt,
      completedAt: instance.completedAt,
      tags: [...(template.tags || [])],
      
      // 메타데이터 - 반복 할일 식별용
      _isRecurringInstance: true,
      _instanceId: instance.id,
      _templateId: template.id
    } as Todo & {
      _isRecurringInstance: boolean
      _instanceId: string
      _templateId: string
    }
    
    return todo
  }
  
  // 오늘 할일 필터링
  getTodayInstances(instances: SimpleRecurringInstance[]): SimpleRecurringInstance[] {
    const today = new Date()
    const todayStr = today.toDateString()
    
    return instances.filter(instance => 
      instance.date.toDateString() === todayStr
    )
  }
  
  // 이번 주 할일 필터링  
  getWeekInstances(instances: SimpleRecurringInstance[]): SimpleRecurringInstance[] {
    const today = new Date()
    const startOfWeek = new Date(today)
    startOfWeek.setDate(today.getDate() - today.getDay()) // 이번 주 일요일
    const endOfWeek = new Date(startOfWeek)
    endOfWeek.setDate(startOfWeek.getDate() + 6) // 이번 주 토요일
    
    return instances.filter(instance => 
      instance.date >= startOfWeek && instance.date <= endOfWeek
    )
  }
  
  // 이번 달 할일 필터링
  getMonthInstances(instances: SimpleRecurringInstance[]): SimpleRecurringInstance[] {
    const today = new Date()
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0)
    
    return instances.filter(instance => 
      instance.date >= startOfMonth && instance.date <= endOfMonth
    )
  }
  
  // 전체 할일 목록에서 중복 반복 할일 제거
  removeDuplicateTodos(todos: Todo[]): Todo[] {
    const titleDateMap = new Map<string, Todo>()
    const nonRecurringTodos: Todo[] = []
    
    for (const todo of todos) {
      // 반복 할일이 아닌 경우 그대로 유지
      if (!todo._isRecurringInstance) {
        nonRecurringTodos.push(todo)
        continue
      }
      
      // 반복 할일인 경우 중복 검사
      const key = `${todo.title}_${todo.dueDate?.toDateString() || 'no-date'}`
      
      if (!titleDateMap.has(key)) {
        titleDateMap.set(key, todo)
        console.log(`📋 반복 할일 유지: "${todo.title}" - ${todo.dueDate?.toDateString()}`)
      } else {
        console.log(`🗑️ 중복 반복 할일 제거: "${todo.title}" - ${todo.dueDate?.toDateString()}`)
      }
    }
    
    // 반복 할일 아닌 것들과 중복 제거된 반복 할일들을 합침
    const uniqueRecurringTodos = Array.from(titleDateMap.values())
    const result = [...nonRecurringTodos, ...uniqueRecurringTodos]
    
    console.log(`📊 중복 제거 결과: ${todos.length} → ${result.length} (${todos.length - result.length}개 제거)`)
    
    return result.sort((a, b) => {
      const dateA = a.dueDate || new Date(0)
      const dateB = b.dueDate || new Date(0)
      return dateA.getTime() - dateB.getTime()
    })
  }
}

export const simpleRecurringSystem = new SimpleRecurringSystem()
export default simpleRecurringSystem