import { addDays, addWeeks } from 'date-fns'
import type { Priority, RecurrenceType } from '../types/todo'

export interface ParsedTask {
  title: string
  startDate?: Date
  startTime?: string
  dueDate?: Date
  dueTime?: string
  priority?: Priority
  recurrence?: RecurrenceType
  recurrenceDay?: number  // 1=월요일, 2=화요일, ..., 7=일요일
  tags?: string[]
  project?: string
}

export class NaturalLanguageParser {
  // 시간 패턴 개선 - 더 정확한 오전/오후 처리
  private static timePatterns = [
    // 24시간 형식
    { pattern: /(\d{1,2}):(\d{2})/, type: 'hhmm' },
    
    // 오전/오후 시간 (분 포함)
    { pattern: /오전\s*(\d{1,2})시\s*(\d{1,2})분?/, type: 'am_with_min' },
    { pattern: /오후\s*(\d{1,2})시\s*(\d{1,2})분?/, type: 'pm_with_min' },
    
    // 오전/오후 시간 (분 없음)
    { pattern: /오전\s*(\d{1,2})시?/, type: 'am' },
    { pattern: /오후\s*(\d{1,2})시?/, type: 'pm' },
    
    // 일반적인 시간 표현 (분 포함)
    { pattern: /(\d{1,2})시\s*(\d{1,2})분/, type: 'hour_min' },
    { pattern: /(\d{1,2})시/, type: 'hour_only' },
    
    // 자연스러운 시간 표현
    { pattern: /새벽\s*(\d{1,2})시?/, type: 'dawn' },
    { pattern: /아침\s*(\d{1,2})시?/, type: 'morning' },
    { pattern: /점심\s*(\d{1,2})시?/, type: 'lunch' },
    { pattern: /오후\s*늦게/, type: 'late_afternoon' },
    { pattern: /저녁\s*(\d{1,2})시?/, type: 'evening' },
    { pattern: /밤\s*(\d{1,2})시?/, type: 'night' },
    
    // 상대적 시간
    { pattern: /한\s*시간\s*후/, type: 'in_hour' },
    { pattern: /(\d+)\s*시간\s*후/, type: 'in_hours' },
    { pattern: /30분\s*후|반\s*시간\s*후/, type: 'in_30min' },
    { pattern: /(\d+)분\s*후/, type: 'in_minutes' },
  ]

  // 우선순위 패턴 확장
  private static priorityPatterns = [
    { pattern: /긴급|급함|급해|urgent|asap|!!!/i, priority: 'urgent' as Priority },
    { pattern: /중요|높음|high|중대|!!/i, priority: 'high' as Priority },
    { pattern: /보통|medium|일반|normal|!/i, priority: 'medium' as Priority },
    { pattern: /낮음|low|천천히|나중에/i, priority: 'low' as Priority },
  ]

  // 반복 패턴 확장
  private static recurrencePatterns = [
    { pattern: /매일|하루마다|daily|every\s*day/i, recurrence: 'daily' as RecurrenceType },
    { pattern: /매주|주마다|weekly|every\s*week/i, recurrence: 'weekly' as RecurrenceType },
    { pattern: /매달|매월|월마다|monthly|every\s*month/i, recurrence: 'monthly' as RecurrenceType },
    { pattern: /매년|연마다|yearly|every\s*year/i, recurrence: 'yearly' as RecurrenceType },
  ]

  // 요일 패턴
  private static weekdayPatterns = [
    { pattern: /월요일?|monday/i, day: 1 },
    { pattern: /화요일?|tuesday/i, day: 2 },
    { pattern: /수요일?|wednesday/i, day: 3 },
    { pattern: /목요일?|thursday/i, day: 4 },
    { pattern: /금요일?|friday/i, day: 5 },
    { pattern: /토요일?|saturday/i, day: 6 },
    { pattern: /일요일?|sunday/i, day: 7 },
  ]

  // 태그 패턴 확장
  private static tagPatterns = [
    /#([^\s#]+)/g,
    /@([^\s@]+)/g,
    /\[([^\]]+)\]/g, // [태그] 형식
  ]

  // 프로젝트 패턴 확장
  private static projectPatterns = [
    /프로젝트:\s*([^,\n]+)/i,
    /project:\s*([^,\n]+)/i,
    /관련:\s*([^,\n]+)/i,
  ]

  static parse(input: string): ParsedTask {
    let cleanTitle = input.trim()
    const result: ParsedTask = {
      title: '',
    }

    // 시간 파싱 (시간이 명시적으로 지정된 경우만)
    const timeMatch = this.extractTime(cleanTitle)
    if (timeMatch.time && timeMatch.isTimeSpecified) {
      result.dueTime = timeMatch.time
      cleanTitle = timeMatch.cleanText
    }

    // 날짜 파싱
    const dateMatch = this.extractDate(cleanTitle)
    if (dateMatch.date) {
      result.dueDate = dateMatch.date
      cleanTitle = dateMatch.cleanText
      
      // 날짜는 있지만 시간이 명시되지 않은 경우, 시간은 설정하지 않음
      if (!timeMatch.isTimeSpecified) {
        result.dueTime = undefined
      }
    }

    // 우선순위 파싱
    const priorityMatch = this.extractPriority(cleanTitle)
    if (priorityMatch.priority) {
      result.priority = priorityMatch.priority
      cleanTitle = priorityMatch.cleanText
    }

    // 반복 설정 파싱
    const recurrenceMatch = this.extractRecurrence(cleanTitle)
    if (recurrenceMatch.recurrence) {
      result.recurrence = recurrenceMatch.recurrence
      cleanTitle = recurrenceMatch.cleanText
    }

    // 요일 파싱 (매주 반복일 때)
    if (result.recurrence === 'weekly') {
      const weekdayMatch = this.extractWeekday(cleanTitle)
      if (weekdayMatch.day) {
        result.recurrenceDay = weekdayMatch.day
        cleanTitle = weekdayMatch.cleanText
      }
    }

    // 태그 파싱
    const tagMatch = this.extractTags(cleanTitle)
    if (tagMatch.tags.length > 0) {
      result.tags = tagMatch.tags
      cleanTitle = tagMatch.cleanText
    }

    // 프로젝트 파싱
    const projectMatch = this.extractProject(cleanTitle)
    if (projectMatch.project) {
      result.project = projectMatch.project
      cleanTitle = projectMatch.cleanText
    }

    // 최종 제목 정리
    result.title = cleanTitle.replace(/\s+/g, ' ').trim()

    return result
  }

  private static extractTime(text: string): { time?: string; cleanText: string; isTimeSpecified?: boolean } {
    for (const timePattern of this.timePatterns) {
      const match = text.match(timePattern.pattern)
      if (match) {
        let hour = 0
        let minute = 0
        let isTimeSpecified = true // 기본적으로 시간이 명시되었다고 가정

        switch (timePattern.type) {
          case 'hhmm':
            hour = parseInt(match[1])
            minute = parseInt(match[2])
            break

          case 'am_with_min':
            hour = parseInt(match[1])
            minute = parseInt(match[2])
            if (hour === 12) hour = 0 // 오전 12시는 0시
            break

          case 'pm_with_min':
            hour = parseInt(match[1])
            minute = parseInt(match[2])
            if (hour !== 12) hour += 12 // 오후 12시는 그대로, 나머지는 +12
            break

          case 'am':
            hour = parseInt(match[1])
            minute = 0
            if (hour === 12) hour = 0 // 오전 12시는 0시
            break

          case 'pm':
            hour = parseInt(match[1])
            minute = 0
            if (hour !== 12) hour += 12 // 오후 12시는 그대로, 나머지는 +12
            break

          case 'hour_min':
            hour = parseInt(match[1])
            minute = parseInt(match[2])
            break

          case 'hour_only':
            hour = parseInt(match[1])
            minute = 0
            break

          case 'dawn': // 새벽 (4-6시)
            hour = match[1] ? parseInt(match[1]) : 5
            minute = 0
            if (hour > 6) hour = 5 // 새벽은 보통 5시로 설정
            break

          case 'morning': // 아침 (7-9시)
            hour = match[1] ? parseInt(match[1]) : 8
            minute = 0
            if (hour > 11 || hour < 7) hour = 8
            break

          case 'lunch': // 점심 (12-13시)
            hour = match[1] ? parseInt(match[1]) : 12
            minute = 0
            if (hour < 12 || hour > 14) hour = 12
            break

          case 'late_afternoon': // 오후 늦게 (17-18시)
            hour = 17
            minute = 0
            isTimeSpecified = false // 구체적 시간이 명시되지 않음
            break

          case 'evening': // 저녁 (18-21시)
            hour = match[1] ? parseInt(match[1]) : 19
            minute = 0
            if (hour < 18) hour += 12 // 저녁이면 오후로 변환
            if (hour > 21) hour = 19
            break

          case 'night': // 밤 (22-23시)
            hour = match[1] ? parseInt(match[1]) : 22
            minute = 0
            if (hour < 22) hour += 12
            if (hour > 23) hour = 22
            break

          case 'in_hour': // 1시간 후
            const nowPlusHour = new Date()
            nowPlusHour.setHours(nowPlusHour.getHours() + 1)
            hour = nowPlusHour.getHours()
            minute = nowPlusHour.getMinutes()
            break

          case 'in_hours': // N시간 후
            const hours = parseInt(match[1])
            const nowPlusHours = new Date()
            nowPlusHours.setHours(nowPlusHours.getHours() + hours)
            hour = nowPlusHours.getHours()
            minute = nowPlusHours.getMinutes()
            break

          case 'in_30min': // 30분 후
            const nowPlus30 = new Date()
            nowPlus30.setMinutes(nowPlus30.getMinutes() + 30)
            hour = nowPlus30.getHours()
            minute = nowPlus30.getMinutes()
            break

          case 'in_minutes': // N분 후
            const minutes = parseInt(match[1])
            const nowPlusMin = new Date()
            nowPlusMin.setMinutes(nowPlusMin.getMinutes() + minutes)
            hour = nowPlusMin.getHours()
            minute = nowPlusMin.getMinutes()
            break
        }

        // 시간 유효성 검사
        if (hour < 0 || hour > 23) hour = 9 // 기본값
        if (minute < 0 || minute > 59) minute = 0

        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
        return {
          time: timeString,
          cleanText: text.replace(match[0], '').trim(),
          isTimeSpecified
        }
      }
    }
    return { cleanText: text, isTimeSpecified: false }
  }

  private static extractDate(text: string): { date?: Date; cleanText: string } {
    const now = new Date()

    // 절대적 날짜 패턴들
    const datePatterns = [
      // 년월일 형식
      { pattern: /(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일/, type: 'yyyy_mm_dd' },
      { pattern: /(\d{1,2})월\s*(\d{1,2})일/, type: 'mm_dd' },
      { pattern: /(\d{1,2})\/(\d{1,2})/, type: 'mm_slash_dd' },
      { pattern: /(\d{4})-(\d{1,2})-(\d{1,2})/, type: 'yyyy_dash_mm_dash_dd' },
      
      // 상대적 날짜
      { pattern: /오늘|today/i, type: 'today' },
      { pattern: /내일|tomorrow/i, type: 'tomorrow' },
      { pattern: /모레|day\s*after\s*tomorrow/i, type: 'day_after_tomorrow' },
      { pattern: /어제|yesterday/i, type: 'yesterday' },
      
      // 기간 후
      { pattern: /(\d+)일\s*후/, type: 'days_later' },
      { pattern: /(\d+)주\s*후/, type: 'weeks_later' },
      { pattern: /(\d+)개월\s*후|(\d+)달\s*후/, type: 'months_later' },
      
      // 자연스러운 표현
      { pattern: /이번\s*주\s*말|주말/, type: 'this_weekend' },
      { pattern: /다음\s*주\s*말|다음\s*주말/, type: 'next_weekend' },
      { pattern: /이번\s*주/, type: 'this_week' },
      { pattern: /다음\s*주/, type: 'next_week' },
      { pattern: /이번\s*달\s*말|월말/, type: 'end_of_month' },
      { pattern: /다음\s*달|다음\s*월/, type: 'next_month' },
      
      // 특정 날짜 표현
      { pattern: /(\d{1,2})일\s*까지/, type: 'by_day' },
      { pattern: /이번\s*달\s*(\d{1,2})일/, type: 'this_month_day' },
      { pattern: /다음\s*달\s*(\d{1,2})일/, type: 'next_month_day' },
    ]

    for (const datePattern of datePatterns) {
      const match = text.match(datePattern.pattern)
      if (match) {
        let date: Date | null = null

        switch (datePattern.type) {
          case 'yyyy_mm_dd':
            date = new Date(parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]))
            break

          case 'mm_dd':
            date = new Date(now.getFullYear(), parseInt(match[1]) - 1, parseInt(match[2]))
            // 만약 날짜가 과거라면 다음 해로 설정
            if (date < now) {
              date.setFullYear(now.getFullYear() + 1)
            }
            break

          case 'mm_slash_dd':
            date = new Date(now.getFullYear(), parseInt(match[1]) - 1, parseInt(match[2]))
            if (date < now) {
              date.setFullYear(now.getFullYear() + 1)
            }
            break

          case 'yyyy_dash_mm_dash_dd':
            date = new Date(parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]))
            break

          case 'today':
            date = new Date(now)
            break

          case 'tomorrow':
            date = addDays(now, 1)
            break

          case 'day_after_tomorrow':
            date = addDays(now, 2)
            break

          case 'yesterday':
            date = addDays(now, -1)
            break

          case 'days_later':
            date = addDays(now, parseInt(match[1]))
            break

          case 'weeks_later':
            date = addWeeks(now, parseInt(match[1]))
            break

          case 'months_later':
            const monthsToAdd = parseInt(match[1]) || parseInt(match[2])
            date = new Date(now)
            date.setMonth(date.getMonth() + monthsToAdd)
            break

          case 'this_weekend':
            // 이번 주 토요일
            const daysToSaturday = 6 - now.getDay()
            date = addDays(now, daysToSaturday)
            break

          case 'next_weekend':
            // 다음 주 토요일
            const daysToNextSaturday = 6 - now.getDay() + 7
            date = addDays(now, daysToNextSaturday)
            break

          case 'this_week':
            // 이번 주 금요일
            const daysToFriday = 5 - now.getDay()
            date = addDays(now, daysToFriday >= 0 ? daysToFriday : daysToFriday + 7)
            break

          case 'next_week':
            // 다음 주 월요일
            const daysToNextMonday = 1 - now.getDay() + 7
            date = addDays(now, daysToNextMonday)
            break

          case 'end_of_month':
            // 이번 달 마지막 날
            date = new Date(now.getFullYear(), now.getMonth() + 1, 0)
            break

          case 'next_month':
            // 다음 달 1일
            date = new Date(now.getFullYear(), now.getMonth() + 1, 1)
            break

          case 'by_day':
            const day = parseInt(match[1])
            date = new Date(now.getFullYear(), now.getMonth(), day)
            if (date < now) {
              date.setMonth(date.getMonth() + 1)
            }
            break

          case 'this_month_day':
            date = new Date(now.getFullYear(), now.getMonth(), parseInt(match[1]))
            break

          case 'next_month_day':
            date = new Date(now.getFullYear(), now.getMonth() + 1, parseInt(match[1]))
            break
        }

        if (date) {
          return {
            date,
            cleanText: text.replace(match[0], '').trim()
          }
        }
      }
    }

    // 요일 처리
    const dayOfWeek = this.extractDayOfWeek(text)
    if (dayOfWeek.date) {
      return dayOfWeek
    }

    return { cleanText: text }
  }

  private static extractDayOfWeek(text: string): { date?: Date; cleanText: string } {
    const now = new Date()
    const currentDay = now.getDay() // 0 = 일요일
    
    const dayMappings = [
      { patterns: ['일요일', '일', 'sunday', 'sun'], targetDay: 0 },
      { patterns: ['월요일', '월', 'monday', 'mon'], targetDay: 1 },
      { patterns: ['화요일', '화', 'tuesday', 'tue'], targetDay: 2 },
      { patterns: ['수요일', '수', 'wednesday', 'wed'], targetDay: 3 },
      { patterns: ['목요일', '목', 'thursday', 'thu'], targetDay: 4 },
      { patterns: ['금요일', '금', 'friday', 'fri'], targetDay: 5 },
      { patterns: ['토요일', '토', 'saturday', 'sat'], targetDay: 6 },
    ]

    // 특정 수식어가 있는지 확인
    const isNextWeek = /다음\s*주|next\s*week/i.test(text)
    const isThisWeek = /이번\s*주|this\s*week/i.test(text)

    for (const { patterns, targetDay } of dayMappings) {
      for (const pattern of patterns) {
        const regex = new RegExp(`\\b${pattern}\\b`, 'i')
        if (regex.test(text)) {
          let daysUntilTarget = targetDay - currentDay
          
          if (isNextWeek) {
            // 다음 주 명시적 지정
            daysUntilTarget += 7
            if (daysUntilTarget <= 0) daysUntilTarget += 7
          } else if (isThisWeek) {
            // 이번 주 명시적 지정
            if (daysUntilTarget < 0) daysUntilTarget += 7
          } else {
            // 기본: 다음 발생하는 해당 요일
            if (daysUntilTarget <= 0) daysUntilTarget += 7
          }

          return {
            date: addDays(now, daysUntilTarget),
            cleanText: text.replace(regex, '').replace(/다음\s*주|이번\s*주|next\s*week|this\s*week/gi, '').trim()
          }
        }
      }
    }

    return { cleanText: text }
  }

  private static extractPriority(text: string): { priority?: Priority; cleanText: string } {
    for (const { pattern, priority } of this.priorityPatterns) {
      if (pattern.test(text)) {
        return {
          priority,
          cleanText: text.replace(pattern, '').trim()
        }
      }
    }
    return { cleanText: text }
  }

  private static extractRecurrence(text: string): { recurrence?: RecurrenceType; cleanText: string } {
    for (const { pattern, recurrence } of this.recurrencePatterns) {
      if (pattern.test(text)) {
        return {
          recurrence,
          cleanText: text.replace(pattern, '').trim()
        }
      }
    }
    return { cleanText: text }
  }

  private static extractTags(text: string): { tags: string[]; cleanText: string } {
    const tags: string[] = []
    let cleanText = text

    for (const pattern of this.tagPatterns) {
      const matches = text.matchAll(pattern)
      for (const match of matches) {
        tags.push(match[1])
        cleanText = cleanText.replace(match[0], '').trim()
      }
    }

    return { tags, cleanText }
  }

  private static extractProject(text: string): { project?: string; cleanText: string } {
    for (const pattern of this.projectPatterns) {
      const match = text.match(pattern)
      if (match) {
        return {
          project: match[1].trim(),
          cleanText: text.replace(match[0], '').trim()
        }
      }
    }
    return { cleanText: text }
  }

  private static extractWeekday(text: string): { day?: number; cleanText: string } {
    for (const { pattern, day } of this.weekdayPatterns) {
      const match = text.match(pattern)
      if (match) {
        return {
          day,
          cleanText: text.replace(match[0], '').trim()
        }
      }
    }
    return { cleanText: text }
  }

  // 예시 사용법을 위한 정적 메소드
  static getExamples(): string[] {
    return [
      // 기본 예시
      "회의 준비 내일 오후 2시 30분 중요",
      "보고서 작성 금요일까지 긴급 #업무",
      "운동하기 매일 오전 7시",
      
      // 시간 없는 마감일
      "프로젝트 검토 이번 주말까지 @팀장",
      "세금 신고 4월 15일 높음",
      "치과 예약 다음 주 월요일",
      
      // 자연스러운 시간 표현
      "점심 약속 내일 점심시간에 [개인]",
      "저녁 운동 매일 저녁 7시",
      "새벽 독서 매일 새벽 6시",
      
      // 상대적 시간
      "긴급 통화 30분 후",
      "회의 준비 2시간 후 급함",
      "프레젠테이션 준비 3일 후 asap",
      
      // 다양한 날짜 표현
      "장보기 이번 달 말까지 천천히",
      "여행 계획 다음 달 첫 주 [휴가]",
      "건강검진 예약 12/25 오전 9시",
      
      // 복합 표현
      "팀 회의 다음 주 화요일 오후 늦게 #회의 @전체",
      "분기 보고서 월말까지 높음 관련: 기획팀"
    ]
  }
}