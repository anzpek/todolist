/**
 * 간소화된 반복 할일 시스템
 * 기본 기능부터 확실히 작동시키기 위한 버전
 */

import type { Todo } from '../types/todo'
import { getHolidayInfoSync, isWeekend, getFirstWorkdayOfMonth, getLastWorkdayOfMonth, checkIsHoliday, type CustomHoliday } from './holidays'

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
  recurrenceType: 'daily' | 'weekly' | 'monthly'
  weekday?: number // 0=일, 1=월, ..., 6=토 (weekly용)
  monthlyDate?: number // 1-31 (monthly용)

  // 확장된 월간 반복 설정
  monthlyPattern?: 'date' | 'weekday' // 'date': 특정 날짜, 'weekday': 특정 주의 요일
  monthlyWeek?: 'first' | 'second' | 'third' | 'fourth' | 'last' // 몇 번째 주
  monthlyWeekday?: number // 0=일, 1=월, ..., 6=토 (monthlyPattern이 'weekday'일 때)

  // 예외 설정
  exceptions?: RecurrenceException[]

  // 공휴일 처리
  holidayHandling?: 'before' | 'after' | 'show'

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
  order?: number
  skipped?: boolean
  skippedReason?: string
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
    const targetTemplate = this.templates.find(t => t.title === conflictException.targetTemplateTitle && t.id !== currentTemplateId);

    if (!targetTemplate) {
      return false;
    }

    // 무한 재귀를 피하기 위해 충돌 검사를 제외한 Raw 인스턴스 생성 함수 사용
    const targetInstances = this.generateInstancesForTemplate(targetTemplate);

    for (const instance of targetInstances) {
      if (this.checkDateConflict(date, instance.date, conflictException.scope)) {
        console.log(`[Conflict] ${date.toDateString()}에 ${targetTemplate.title}와(과) 충돌 발생`);
        return true;
      }
    }

    return false;
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
  private generateInstancesForTemplate(template: SimpleRecurringTemplate, customHolidays: CustomHoliday[] = []): SimpleRecurringInstance[] {
    if (!template.isActive) return []

    switch (template.recurrenceType) {
      case 'daily':
        return this.generateDailyInstancesRaw(template, customHolidays)
      case 'weekly':
        return this.generateWeeklyInstancesRaw(template, customHolidays)
      case 'monthly':
        return this.generateMonthlyInstancesRaw(template, customHolidays)
      default:
        return []
    }
  }


  // 월 내에서 몇 번째 주인지 계산 (첫째주=1, 둘째주=2, ..., 마지막주=-1)
  private calculateWeekOfMonth(date: Date): number {
    const year = date.getFullYear()
    const month = date.getMonth()
    const day = date.getDate()

    console.log(`calculateWeekOfMonth: ${date.toDateString()}, year=${year}, month=${month + 1}, day=${day}`)

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
  private adjustForHolidays(date: Date, holidayHandling: 'before' | 'after' | 'show' = 'show', customHolidays: CustomHoliday[] = []): Date {
    let adjustedDate = new Date(date)

    // 'show' 옵션이면 날짜 조정하지 않고 그대로 반환
    if (holidayHandling === 'show') {
      console.log(`🎯 공휴일 'show' 설정: ${adjustedDate.toDateString()} 그대로 사용`)
      return adjustedDate
    }

    console.log(`🔍 공휴일 조정 시작: ${date.toDateString()}, 옵션: ${holidayHandling}`)

    const isHoliday = checkIsHoliday(adjustedDate, customHolidays)
    const isWeekendDay = isWeekend(adjustedDate)

    console.log(`   원본 날짜 상태: 공휴일=${isHoliday}, 주말=${isWeekendDay}`)

    // 이미 평일이면 조정하지 않음
    if (!isHoliday && !isWeekendDay) {
      console.log(`   ✅ 이미 평일이므로 조정 불필요`)
      return adjustedDate
    }

    // 공휴일/주말일 때만 조정
    const originalMonth = adjustedDate.getMonth()
    let attempts = 0
    const maxAttempts = 15 // 충분한 시도 횟수

    while (attempts < maxAttempts) {
      if (holidayHandling === 'before') {
        adjustedDate.setDate(adjustedDate.getDate() - 1)
        console.log(`   ← 하루 이전으로: ${adjustedDate.toDateString()}`)
      } else {
        adjustedDate.setDate(adjustedDate.getDate() + 1)
        console.log(`   → 하루 이후로: ${adjustedDate.toDateString()}`)
      }

      const currentIsHoliday = checkIsHoliday(adjustedDate, customHolidays)
      const currentIsWeekend = isWeekend(adjustedDate)

      console.log(`   체크: 공휴일=${currentIsHoliday}, 주말=${currentIsWeekend}`)

      if (!currentIsHoliday && !currentIsWeekend) {
        console.log(`   ✅ 평일 발견: ${adjustedDate.toDateString()}`)
        break
      }

      attempts++
    }

    if (attempts >= maxAttempts) {
      console.warn(`⚠️ 공휴일 조정 최대 시도 초과 (${maxAttempts}회), 원래 날짜 반환`)
      console.log(`   원래 날짜 반환: ${date.toDateString()}`)
      return date
    }

    console.log(`🎯 공휴일 조정 완료: ${date.toDateString()} → ${adjustedDate.toDateString()}`)
    return adjustedDate
  }

  // 특정 날짜에 같은 제목의 할일이 이미 있는지 확인 (재귀 호출 방지를 위해 비활성화)
  private hasDuplicateOnDate(date: Date, currentTemplateId?: string, templateTitle?: string): boolean {
    // 🔥 무한 재귀 호출 방지: 내부 Set를 사용하므로 항상 false 반환
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

  // 일간 반복 인스턴스 생성 - Raw (충돌 검사 제외)
  private generateDailyInstancesRaw(template: SimpleRecurringTemplate, customHolidays: CustomHoliday[] = []): SimpleRecurringInstance[] {
    if (template.recurrenceType !== 'daily') {
      return []
    }

    const instances: SimpleRecurringInstance[] = []
    const today = new Date()
    const startDate = new Date(template.createdAt)
    const endOfYear = new Date(today)
    endOfYear.setFullYear(today.getFullYear() + 1) // 1년 후까지 생성

    // 시작일부터 연말까지 매일 인스턴스 생성
    let currentDate = new Date(startDate)

    while (currentDate <= endOfYear) {
      const todayDateOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate())
      const currentDateOnly = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate())

      if (currentDateOnly >= todayDateOnly) {
        if (!this.isExceptionDate(currentDate, template.exceptions, template.id)) {
          const holidayHandling = template.holidayHandling || 'show'
          const finalDate = this.adjustForHolidays(currentDate, holidayHandling, customHolidays)

          if (!this.hasDuplicateOnDate(finalDate, template.id, template.title)) {
            // 🔥 수정: 이미 한국시간이므로 추가 변환 없이 날짜만 추출
            const dateStr = `${finalDate.getFullYear()}-${(finalDate.getMonth() + 1).toString().padStart(2, '0')}-${finalDate.getDate().toString().padStart(2, '0')}`
            const uniqueId = `${template.id}_${dateStr}`

            instances.push({
              id: uniqueId,
              templateId: template.id,
              date: finalDate,
              completed: false,
              createdAt: new Date(),
              updatedAt: new Date(),
              order: -1000 // 반복 할일을 맨 위에 표시
            })
          }
        }
      }

      // 다음날로 이동
      currentDate.setDate(currentDate.getDate() + 1)
    }

    return instances
  }

  // 주간 반복 인스턴스 생성 - Raw (충돌 검사 제외)
  private generateWeeklyInstancesRaw(template: SimpleRecurringTemplate, customHolidays: CustomHoliday[] = []): SimpleRecurringInstance[] {
    if (template.recurrenceType !== 'weekly' || template.weekday === undefined) {
      return []
    }

    const instances: SimpleRecurringInstance[] = []
    const today = new Date()
    const startDate = new Date(template.createdAt) // 템플릿 생성일을 시작일로 사용
    const endOfYear = new Date(today)
    endOfYear.setFullYear(today.getFullYear() + 1) // 1년 후까지 생성

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
          const holidayHandling = template.holidayHandling || 'show' // 기본값 설정
          console.log(`[${template.title}] 원본 날짜: ${currentDate.toDateString()}, 공휴일 처리: ${holidayHandling}`)
          console.log(`[${template.title}] 템플릿 전체 데이터:`, template)

          // 공휴일인지 확인
          const isHoliday = getHolidayInfoSync(currentDate) !== null
          const isWeekendDay = isWeekend(currentDate)
          console.log(`[${template.title}] 공휴일 여부: ${isHoliday}, 주말 여부: ${isWeekendDay}`)

          // 수정된 로직: adjustForHolidays 함수가 내부적으로 공휴일/주말 확인을 하므로 무조건 호출
          const finalDate = this.adjustForHolidays(currentDate, holidayHandling, customHolidays)

          if (finalDate.getTime() !== currentDate.getTime()) {
            console.log(`[${template.title}] 공휴일 조정: ${currentDate.toDateString()} → ${finalDate.toDateString()}`)
          }

          // 중복 검사: 같은 제목의 할일이 이미 해당 날짜에 있으면 생성하지 않음
          if (this.hasDuplicateOnDate(finalDate, template.id, template.title)) {
            console.log(`🚫 중복 할일 발견으로 생성 제외: "${template.title}" - ${finalDate.toDateString()}`)
          } else {
            // 🔥 수정: 이미 한국시간이므로 추가 변환 없이 날짜만 추출
            const dateStr = `${finalDate.getFullYear()}-${(finalDate.getMonth() + 1).toString().padStart(2, '0')}-${finalDate.getDate().toString().padStart(2, '0')}`
            const uniqueId = `${template.id}_${dateStr}`

            // 월간업무보고 특별 로깅
            if (template.title.includes('월간업무보고')) {
              console.log(`📋 월간업무보고 인스턴스 생성:`)
              console.log(`   최종 날짜: ${finalDate.toDateString()} (${finalDate.getDate()}일)`)
              console.log(`   생성된 ID: ${uniqueId}`)
            }

            instances.push({
              id: uniqueId,
              templateId: template.id,
              date: finalDate,
              completed: false,
              createdAt: new Date(),
              updatedAt: new Date(),
              order: -1000 // 반복 할일을 맨 위에 표시
            })
          }
        }
      }

      // 다음 주로 이동 (7일 추가)
      currentDate.setDate(currentDate.getDate() + 7)
    }

    return instances
  }

  // 특정 월의 N번째 특정 요일 찾기 (예: 네번째 주 화요일)
  private findNthWeekdayOfMonth(year: number, month: number, weekPosition: 'first' | 'second' | 'third' | 'fourth' | 'last', weekday: number): Date | null {
    // 해당 월의 첫째 날
    const firstDay = new Date(year, month - 1, 1)
    const firstDayOfWeek = firstDay.getDay() // 0=일요일, 6=토요일

    console.log(`   findNthWeekdayOfMonth: ${year}년 ${month}월, ${weekPosition} 주 ${['일', '월', '화', '수', '목', '금', '토'][weekday]}요일`)
    console.log(`   첫째 날: ${firstDay.toDateString()}, 첫째 날 요일: ${['일', '월', '화', '수', '목', '금', '토'][firstDayOfWeek]}`)

    if (weekPosition === 'last') {
      // 마지막 주 처리
      const lastDay = new Date(year, month, 0) // 다음 달 0일 = 이번 달 마지막 날
      console.log(`   마지막 날: ${lastDay.toDateString()}`)

      // 마지막 날부터 거슬러 올라가면서 해당 요일 찾기
      for (let day = lastDay.getDate(); day >= 1; day--) {
        const testDate = new Date(year, month - 1, day)
        if (testDate.getDay() === weekday) {
          console.log(`   마지막 ${['일', '월', '화', '수', '목', '금', '토'][weekday]}요일: ${testDate.toDateString()}`)
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

      console.log(`   첫 번째 ${['일', '월', '화', '수', '목', '금', '토'][weekday]}요일: ${firstOccurrence.toDateString()}`)

      // N번째 발생일 계산
      let targetDate = new Date(firstOccurrence)
      targetDate.setDate(targetDate.getDate() + (targetWeek - 1) * 7)

      console.log(`   ${targetWeek}번째 ${['일', '월', '화', '수', '목', '금', '토'][weekday]}요일: ${targetDate.toDateString()}`)

      // 해당 월을 벗어나지 않았는지 확인
      if (targetDate.getMonth() === month - 1) {
        return targetDate
      } else {
        console.log(`   ❌ ${targetWeek}번째 주가 해당 월을 벗어남`)
        return null
      }
    }

    return null
  }

  // 🔥 완전히 새로 작성된 월간 반복 인스턴스 생성 함수
  private generateMonthlyInstancesRaw(template: SimpleRecurringTemplate, customHolidays: CustomHoliday[] = []): SimpleRecurringInstance[] {
    if (template.recurrenceType !== 'monthly') {
      return []
    }

    console.log(`\n🔥 [${template.title}] 새로운 월간 반복 로직 시작`)
    console.log(`   전체 템플릿 데이터:`, JSON.stringify(template, null, 2))
    console.log(`   monthlyDate: ${template.monthlyDate}`)
    console.log(`   monthlyPattern: ${template.monthlyPattern}`)
    console.log(`   monthlyWeek: ${template.monthlyWeek}`)
    console.log(`   monthlyWeekday: ${template.monthlyWeekday}`)

    const instances: SimpleRecurringInstance[] = []
    const createdDates = new Set<string>() // 중복 방지를 위한 날짜 추적

    // 현재 시간 (한국 시간)
    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth() + 1 // 1-based
    const currentDay = now.getDate()

    console.log(`   현재: ${currentYear}년 ${currentMonth}월 ${currentDay}일`)

    // 12개월간 인스턴스 생성
    for (let monthsFromNow = 0; monthsFromNow < 12; monthsFromNow++) {
      // 타겟 년월 계산
      let targetYear = currentYear
      let targetMonth = currentMonth + monthsFromNow

      if (targetMonth > 12) {
        targetYear += Math.floor((targetMonth - 1) / 12)
        targetMonth = ((targetMonth - 1) % 12) + 1
      }

      console.log(`\n📅 처리 중: ${targetYear}년 ${targetMonth}월`)

      let targetDate: Date | null = null

      // 🔥 새로운 월간 패턴 처리
      if (template.monthlyPattern === 'weekday' && template.monthlyWeek && template.monthlyWeekday !== undefined) {
        // 특정 주의 요일 (예: 매월 네번째 주 화요일)
        console.log(`   패턴: 매월 ${template.monthlyWeek} 주 ${['일', '월', '화', '수', '목', '금', '토'][template.monthlyWeekday]}요일`)

        targetDate = this.findNthWeekdayOfMonth(targetYear, targetMonth, template.monthlyWeek, template.monthlyWeekday)

        if (targetDate) {
          console.log(`   ${template.monthlyWeek} 주 ${['일', '월', '화', '수', '목', '금', '토'][template.monthlyWeekday]}요일: ${targetDate.toDateString()}`)
        } else {
          console.log(`   ❌ ${targetYear}년 ${targetMonth}월에 ${template.monthlyWeek} 주 ${['일', '월', '화', '수', '목', '금', '토'][template.monthlyWeekday]}요일이 없음`)
        }

      } else if (template.monthlyDate === -1) {
        // 말일
        targetDate = new Date(targetYear, targetMonth, 0) // 다음 달 0일 = 이번 달 말일
        console.log(`   말일: ${targetDate.toDateString()}`)

      } else if (template.monthlyDate === -2) {
        // 첫 번째 근무일
        targetDate = getFirstWorkdayOfMonth(targetYear, targetMonth)
        console.log(`   첫 번째 근무일: ${targetDate.toDateString()}`)

      } else if (template.monthlyDate === -3) {
        // 마지막 근무일
        targetDate = getLastWorkdayOfMonth(targetYear, targetMonth)
        console.log(`   마지막 근무일: ${targetDate.toDateString()}`)

      } else if (template.monthlyDate && template.monthlyDate > 0) {
        // 특정 날짜
        targetDate = new Date(targetYear, targetMonth - 1, template.monthlyDate)

        // 해당 월에 그 날짜가 없으면 건너뛰기
        if (targetDate.getMonth() !== (targetMonth - 1)) {
          console.log(`   ⚠️ ${targetYear}년 ${targetMonth}월에는 ${template.monthlyDate}일이 없음`)
          continue
        }
        console.log(`   특정 날짜 ${template.monthlyDate}일: ${targetDate.toDateString()}`)
      } else {
        // 기본값: 매월 1일
        targetDate = new Date(targetYear, targetMonth - 1, 1)
        console.log(`   기본값 (매월 1일): ${targetDate.toDateString()}`)
      }

      // 유효한 날짜인지 확인
      if (!targetDate) {
        console.log(`   ❌ 유효하지 않은 날짜`)
        continue
      }

      // 과거 날짜는 제외 (현재 월의 경우 오늘 이후만)
      const today = new Date(currentYear, currentMonth - 1, currentDay)
      if (targetDate < today) {
        console.log(`   ⏰ 과거 날짜 제외: ${targetDate.toDateString()}`)
        continue
      }

      // 공휴일 조정 (특정 날짜만)
      let finalDate = targetDate
      if (template.monthlyDate && template.monthlyDate > 0) {
        const holidayHandling = template.holidayHandling || 'show'
        finalDate = this.adjustForHolidays(targetDate, holidayHandling, customHolidays)
        if (finalDate.getTime() !== targetDate.getTime()) {
          console.log(`   🔄 공휴일 조정: ${targetDate.toDateString()} → ${finalDate.toDateString()}`)
        }
      }

      // 예외 날짜 확인
      if (this.isExceptionDate(finalDate, template.exceptions, template.id)) {
        console.log(`   🚫 예외 날짜 제외: ${finalDate.toDateString()}`)
        continue
      }

      // 인스턴스 생성 (중복 방지)
      const dateStr = `${finalDate.getFullYear()}-${(finalDate.getMonth() + 1).toString().padStart(2, '0')}-${finalDate.getDate().toString().padStart(2, '0')}`

      // 🔥 중복 방지: 같은 날짜에 이미 인스턴스가 생성되었는지 확인
      if (createdDates.has(dateStr)) {
        console.log(`   🚫 중복 방지: ${dateStr} 이미 생성됨`)
        continue
      }

      const uniqueId = `${template.id}_${dateStr}`
      createdDates.add(dateStr) // 생성된 날짜 추가

      instances.push({
        id: uniqueId,
        templateId: template.id,
        date: finalDate,
        completed: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        order: -1000
      })

      console.log(`   ✅ 인스턴스 생성: ${finalDate.toDateString()} (ID: ${uniqueId})`)
    }

    console.log(`🎯 [${template.title}] 총 ${instances.length}개 인스턴스 생성 완료`)
    return instances
  }

  // 특정 월의 특정 주 특정 요일 계산 (예: 2024년 1월의 마지막 주 수요일)
  private calculateMonthlyWeekday(year: number, month: number, week: 'first' | 'second' | 'third' | 'fourth' | 'last', weekday: number): Date | null {
    // month는 1-based이므로 Date() 생성자를 위해 0-based로 변환
    const jsMonth = month - 1
    const lastDayOfMonth = new Date(year, jsMonth + 1, 0)

    console.log(`🗓️ calculateMonthlyWeekday: ${year}년 ${month}월 ${week} 주 ${['일', '월', '화', '수', '목', '금', '토'][weekday]}요일`)
    console.log(`🗓️ 해당 월의 마지막 날: ${lastDayOfMonth.getDate()}일`)

    if (week === 'last') {
      // 마지막 주의 해당 요일 찾기
      console.log(`🔍 마지막 주 ${['일', '월', '화', '수', '목', '금', '토'][weekday]}요일을 찾는 중...`)

      for (let day = lastDayOfMonth.getDate(); day >= 1; day--) {
        const date = new Date(year, jsMonth, day) // 🔥 수정: jsMonth 사용
        const dayOfWeek = date.getDay()

        if (dayOfWeek === weekday) {
          console.log(`✅ 마지막 ${['일', '월', '화', '수', '목', '금', '토'][weekday]}요일 발견: ${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`)
          return date
        }
      }
    } else {
      // 첫 번째, 두 번째, 세 번째, 네 번째 주의 해당 요일 찾기
      const weekNumbers = { 'first': 1, 'second': 2, 'third': 3, 'fourth': 4 }
      const targetWeek = weekNumbers[week]

      let weekCount = 0
      for (let day = 1; day <= lastDayOfMonth.getDate(); day++) {
        const date = new Date(year, jsMonth, day) // 🔥 수정: jsMonth 사용
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

  // 일간 반복 인스턴스 생성 (충돌 검사 포함)
  generateDailyInstances(template: SimpleRecurringTemplate, customHolidays: CustomHoliday[] = []): SimpleRecurringInstance[] {
    return this.generateDailyInstancesRaw(template, customHolidays)
  }

  // 주간 반복 인스턴스 생성 (충돌 검사 포함)
  generateWeeklyInstances(template: SimpleRecurringTemplate, customHolidays: CustomHoliday[] = []): SimpleRecurringInstance[] {
    return this.generateWeeklyInstancesRaw(template, customHolidays)
  }

  // 월간 반복 인스턴스 생성 (충돌 검사 포함)
  generateMonthlyInstances(template: SimpleRecurringTemplate, customHolidays: CustomHoliday[] = []): SimpleRecurringInstance[] {
    return this.generateMonthlyInstancesRaw(template, customHolidays)
  }

  // 템플릿에서 인스턴스 생성 (중복 제거 포함)
  generateInstances(template: SimpleRecurringTemplate, customHolidays: CustomHoliday[] = []): SimpleRecurringInstance[] {
    if (!template.isActive) return []

    let instances: SimpleRecurringInstance[] = []

    switch (template.recurrenceType) {
      case 'daily':
        instances = this.generateDailyInstances(template, customHolidays)
        break
      case 'weekly':
        instances = this.generateWeeklyInstances(template, customHolidays)
        break
      case 'monthly':
        instances = this.generateMonthlyInstances(template, customHolidays)
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

    // 주간업무보고 특별 로깅
    if (instance.id === 'PUH4xT3lVY5aK2vuQyUe_2025-08-21') {
      console.log('🔄🔄🔄 convertToTodo 호출됨 - 주간업무보고')
      console.log('  입력 instance.completed:', instance.completed, typeof instance.completed)
      console.log('  입력 instance 전체:', JSON.stringify(instance, null, 2))
      console.log('  템플릿 제목:', template.title)
    }

    // 월간업무보고 인스턴스 정보 확인 (간소화)
    if (template.title.includes('월간업무보고')) {
      console.log('🔥 월간업무보고 convertToTodo - ID:', instance.id, '완료:', instance.completed)
    }

    // 🔥 월간업무보고 우선순위 강제 수정
    const isMonthlyReport = template.title.includes('월간업무보고') ||
      template.title.includes('월간 업무보고') ||
      template.title.includes('업무보고') ||
      template.title.includes('업무 보고')

    const finalPriority = isMonthlyReport ? 'urgent' : template.priority

    if (isMonthlyReport && template.priority !== 'urgent') {
      console.log(`🔥 월간업무보고 우선순위 강제 수정: ${template.priority} → urgent`)
    }

    const todo = {
      id: todoId,
      title: template.title,
      description: template.description,
      completed: instance.completed,
      priority: finalPriority,
      type: template.type,
      dueDate: undefined,
      startDate: instance.date,
      createdAt: instance.createdAt,
      updatedAt: instance.updatedAt,
      completedAt: instance.completedAt,
      tags: [...(template.tags || [])],
      order: instance.order, // 반복할일의 order 값 포함

      // 메타데이터 - 반복 할일 식별용
      _isRecurringInstance: true,
      _instanceId: instance.id,
      _templateId: template.id
    } as Todo & {
      _isRecurringInstance: boolean
      _instanceId: string
      _templateId: string
    }

    // 주간업무보고 결과 로깅
    if (instance.id === 'PUH4xT3lVY5aK2vuQyUe_2025-08-21') {
      console.log('📋📋📋 convertToTodo 결과 - 주간업무보고')
      console.log('  출력 todo.completed:', todo.completed, typeof todo.completed)
      console.log('  출력 todo 전체:', JSON.stringify(todo, null, 2))
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
      if (!(todo as any)._isRecurringInstance) {
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
      // order 값이 있으면 order 우선 정렬
      const orderA = a.order || 0
      const orderB = b.order || 0

      if (orderA !== orderB) {
        return orderA - orderB // order가 낮을수록 위에 표시
      }

      // order가 같으면 날짜순 정렬
      const dateA = a.dueDate || new Date(0)
      const dateB = b.dueDate || new Date(0)
      return dateA.getTime() - dateB.getTime()
    })
  }
}

export const simpleRecurringSystem = new SimpleRecurringSystem()
export default simpleRecurringSystem