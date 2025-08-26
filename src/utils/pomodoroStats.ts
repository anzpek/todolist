// 포모도로 통계 관리 유틸리티

import { format, startOfWeek, startOfMonth, isThisWeek, isThisMonth } from 'date-fns'

export interface PomodoroSession {
  id: string
  todoId?: string
  todoTitle?: string
  startTime: Date
  endTime: Date
  duration: number // 실제 집중 시간 (초)
  phase: 'work' | 'shortBreak' | 'longBreak'
  completed: boolean // 중간에 멈추지 않고 완료했는지
  date: string // YYYY-MM-DD 형식
}

export interface PomodoroStats {
  totalSessions: number
  completedSessions: number
  totalFocusTime: number // 총 집중 시간 (초)
  completionRate: number // 완료율 (%)
  currentStreak: number // 현재 연속 완료 일수
  longestStreak: number // 최장 연속 완료 일수
  averageSessionsPerDay: number
  todayStats: DayStats
  weekStats: WeekStats
  monthStats: MonthStats
  recentSessions: PomodoroSession[]
}

export interface DayStats {
  date: string
  sessions: number
  completedSessions: number
  focusTime: number
  completionRate: number
}

export interface WeekStats {
  weekStart: string
  totalSessions: number
  completedSessions: number
  totalFocusTime: number
  completionRate: number
  dailyBreakdown: DayStats[]
}

export interface MonthStats {
  monthStart: string
  totalSessions: number
  completedSessions: number
  totalFocusTime: number
  completionRate: number
  weeklyBreakdown: WeekStats[]
}

const STORAGE_KEY = 'pomodoroSessions'
const STATS_CACHE_KEY = 'pomodoroStatsCache'

// 세션 저장
export function savePomodoroSession(session: Omit<PomodoroSession, 'id'>): PomodoroSession {
  const sessions = getPomodoroSessions()
  const newSession: PomodoroSession = {
    ...session,
    id: `pomodoro_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  }
  
  sessions.push(newSession)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions))
  
  // 캐시 무효화
  localStorage.removeItem(STATS_CACHE_KEY)
  
  return newSession
}

// 모든 세션 가져오기
export function getPomodoroSessions(): PomodoroSession[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return []
    
    const sessions = JSON.parse(stored) as PomodoroSession[]
    return sessions.map((session) => ({
      ...session,
      startTime: new Date(session.startTime),
      endTime: new Date(session.endTime),
    }))
  } catch (error) {
    console.error('포모도로 세션 로드 실패:', error)
    return []
  }
}

// 특정 날짜의 세션들 가져오기
export function getSessionsByDate(date: Date): PomodoroSession[] {
  const sessions = getPomodoroSessions()
  const targetDate = format(date, 'yyyy-MM-dd')
  
  return sessions.filter(session => session.date === targetDate)
}

// 오늘 통계 계산
export function getTodayStats(): DayStats {
  const today = new Date()
  const todaySessions = getSessionsByDate(today)
  const workSessions = todaySessions.filter(s => s.phase === 'work')
  const completedWorkSessions = workSessions.filter(s => s.completed)
  
  return {
    date: format(today, 'yyyy-MM-dd'),
    sessions: workSessions.length,
    completedSessions: completedWorkSessions.length,
    focusTime: completedWorkSessions.reduce((sum, s) => sum + s.duration, 0),
    completionRate: workSessions.length > 0 ? (completedWorkSessions.length / workSessions.length) * 100 : 0
  }
}

// 이번 주 통계 계산
export function getWeekStats(): WeekStats {
  const now = new Date()
  const weekStart = startOfWeek(now, { weekStartsOn: 0 }) // 일요일 시작
  const sessions = getPomodoroSessions()
  
  const weekSessions = sessions.filter(session => 
    isThisWeek(session.startTime, { weekStartsOn: 0 })
  )
  
  const workSessions = weekSessions.filter(s => s.phase === 'work')
  const completedWorkSessions = workSessions.filter(s => s.completed)
  
  // 일별 분석
  const dailyBreakdown: DayStats[] = []
  for (let i = 0; i < 7; i++) {
    const date = new Date(weekStart)
    date.setDate(date.getDate() + i)
    const dayStats = getSessionsByDate(date)
    const dayWorkSessions = dayStats.filter(s => s.phase === 'work')
    const dayCompletedSessions = dayWorkSessions.filter(s => s.completed)
    
    dailyBreakdown.push({
      date: format(date, 'yyyy-MM-dd'),
      sessions: dayWorkSessions.length,
      completedSessions: dayCompletedSessions.length,
      focusTime: dayCompletedSessions.reduce((sum, s) => sum + s.duration, 0),
      completionRate: dayWorkSessions.length > 0 ? (dayCompletedSessions.length / dayWorkSessions.length) * 100 : 0
    })
  }
  
  return {
    weekStart: format(weekStart, 'yyyy-MM-dd'),
    totalSessions: workSessions.length,
    completedSessions: completedWorkSessions.length,
    totalFocusTime: completedWorkSessions.reduce((sum, s) => sum + s.duration, 0),
    completionRate: workSessions.length > 0 ? (completedWorkSessions.length / workSessions.length) * 100 : 0,
    dailyBreakdown
  }
}

// 이번 달 통계 계산
export function getMonthStats(): MonthStats {
  const now = new Date()
  const monthStart = startOfMonth(now)
  const sessions = getPomodoroSessions()
  
  const monthSessions = sessions.filter(session => 
    isThisMonth(session.startTime)
  )
  
  const workSessions = monthSessions.filter(s => s.phase === 'work')
  const completedWorkSessions = workSessions.filter(s => s.completed)
  
  // 주별 분석 (간단하게 4주로 계산)
  const weeklyBreakdown: WeekStats[] = []
  for (let i = 0; i < 4; i++) {
    const weekStartDate = new Date(monthStart)
    weekStartDate.setDate(weekStartDate.getDate() + (i * 7))
    
    const weekEndDate = new Date(weekStartDate)
    weekEndDate.setDate(weekEndDate.getDate() + 6)
    
    const weekSessions = sessions.filter(session => {
      const sessionDate = new Date(session.startTime)
      return sessionDate >= weekStartDate && sessionDate <= weekEndDate
    })
    
    const weekWorkSessions = weekSessions.filter(s => s.phase === 'work')
    const weekCompletedSessions = weekWorkSessions.filter(s => s.completed)
    
    weeklyBreakdown.push({
      weekStart: format(weekStartDate, 'yyyy-MM-dd'),
      totalSessions: weekWorkSessions.length,
      completedSessions: weekCompletedSessions.length,
      totalFocusTime: weekCompletedSessions.reduce((sum, s) => sum + s.duration, 0),
      completionRate: weekWorkSessions.length > 0 ? (weekCompletedSessions.length / weekWorkSessions.length) * 100 : 0,
      dailyBreakdown: [] // 필요시 구현
    })
  }
  
  return {
    monthStart: format(monthStart, 'yyyy-MM-dd'),
    totalSessions: workSessions.length,
    completedSessions: completedWorkSessions.length,
    totalFocusTime: completedWorkSessions.reduce((sum, s) => sum + s.duration, 0),
    completionRate: workSessions.length > 0 ? (completedWorkSessions.length / workSessions.length) * 100 : 0,
    weeklyBreakdown
  }
}

// 연속 완료 일수 계산
export function calculateStreak(): { current: number; longest: number } {
  const sessions = getPomodoroSessions()
  const workSessions = sessions.filter(s => s.phase === 'work')
  
  // 날짜별로 그룹화
  const sessionsByDate = workSessions.reduce((acc, session) => {
    const date = session.date
    if (!acc[date]) {
      acc[date] = []
    }
    acc[date].push(session)
    return acc
  }, {} as Record<string, PomodoroSession[]>)
  
  // 각 날짜별로 완료 여부 확인
  const completionByDate = Object.keys(sessionsByDate)
    .sort()
    .reverse() // 최신 날짜부터
    .map(date => {
      const daySessions = sessionsByDate[date]
      const completedSessions = daySessions.filter(s => s.completed)
      return {
        date,
        hasCompletedSession: completedSessions.length > 0
      }
    })
  
  // 현재 연속 일수 계산
  let currentStreak = 0
  for (const day of completionByDate) {
    if (day.hasCompletedSession) {
      currentStreak++
    } else {
      break
    }
  }
  
  // 최장 연속 일수 계산
  let longestStreak = 0
  let tempStreak = 0
  
  for (const day of completionByDate.reverse()) { // 다시 오래된 날짜부터
    if (day.hasCompletedSession) {
      tempStreak++
      longestStreak = Math.max(longestStreak, tempStreak)
    } else {
      tempStreak = 0
    }
  }
  
  return {
    current: currentStreak,
    longest: longestStreak
  }
}

// 전체 통계 계산 (캐시 사용)
export function getPomodoroStats(): PomodoroStats {
  try {
    // 캐시 확인 (10분간 유효)
    const cached = localStorage.getItem(STATS_CACHE_KEY)
    if (cached) {
      const { data, timestamp } = JSON.parse(cached)
      if (Date.now() - timestamp < 10 * 60 * 1000) { // 10분
        return data
      }
    }
  } catch (error) {
    // 캐시 오류 무시
  }
  
  const sessions = getPomodoroSessions()
  const workSessions = sessions.filter(s => s.phase === 'work')
  const completedWorkSessions = workSessions.filter(s => s.completed)
  
  const totalFocusTime = completedWorkSessions.reduce((sum, s) => sum + s.duration, 0)
  const completionRate = workSessions.length > 0 ? (completedWorkSessions.length / workSessions.length) * 100 : 0
  
  const streak = calculateStreak()
  const todayStats = getTodayStats()
  const weekStats = getWeekStats()
  const monthStats = getMonthStats()
  
  // 평균 일일 세션 수 계산 (지난 30일 기준)
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const recentSessions = workSessions.filter(s => s.startTime >= thirtyDaysAgo)
  const averageSessionsPerDay = recentSessions.length / 30
  
  const stats: PomodoroStats = {
    totalSessions: workSessions.length,
    completedSessions: completedWorkSessions.length,
    totalFocusTime,
    completionRate,
    currentStreak: streak.current,
    longestStreak: streak.longest,
    averageSessionsPerDay,
    todayStats,
    weekStats,
    monthStats,
    recentSessions: sessions.slice(-20) // 최근 20개 세션
  }
  
  // 캐시 저장
  try {
    localStorage.setItem(STATS_CACHE_KEY, JSON.stringify({
      data: stats,
      timestamp: Date.now()
    }))
  } catch (error) {
    console.warn('통계 캐시 저장 실패:', error)
  }
  
  return stats
}

// 시간 포맷팅 (초 -> 시간:분 형식)
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  
  if (hours > 0) {
    return `${hours}시간 ${minutes}분`
  }
  return `${minutes}분`
}

// 데이터 내보내기
export function exportPomodoroData(): string {
  const sessions = getPomodoroSessions()
  const stats = getPomodoroStats()
  
  return JSON.stringify({
    exportDate: new Date().toISOString(),
    sessions,
    stats
  }, null, 2)
}

// 데이터 가져오기
export function importPomodoroData(jsonData: string): boolean {
  try {
    const data = JSON.parse(jsonData)
    if (data.sessions && Array.isArray(data.sessions)) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data.sessions))
      localStorage.removeItem(STATS_CACHE_KEY) // 캐시 무효화
      return true
    }
    return false
  } catch (error) {
    console.error('포모도로 데이터 가져오기 실패:', error)
    return false
  }
}

// 데이터 초기화
export function clearPomodoroData(): void {
  localStorage.removeItem(STORAGE_KEY)
  localStorage.removeItem(STATS_CACHE_KEY)
}