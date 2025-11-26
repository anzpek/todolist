// 한국 공휴일 API 연동
const HOLIDAY_API_URL = 'https://apis.data.go.kr/B090041/openapi/service/SpcdeInfoService/getRestDeInfo'
const HOLIDAY_API_KEY = '7BZDblK8NIBj32BvDQ5jWi%2FYyHJJfhDHESiBYljCaocAPUQZc8IG5ltkJvlVR8J1AinP5izo2WA2F68xWyUTKA%3D%3D'

// 공휴일 정보 타입
export interface HolidayInfo {
  date: string
  name: string
  isHoliday: boolean
}

export interface CustomHoliday {
  date: string
  isRecurring?: boolean
}

export interface CustomHoliday {
  date: string
  isRecurring?: boolean
}

// 캐시된 공휴일 데이터
let holidayCache: Record<string, string[]> = {}
let holidayInfoCache: Record<string, HolidayInfo[]> = {}

// 공휴일 API에서 데이터 가져오기
async function fetchHolidays(year: number): Promise<string[]> {
  try {
    const response = await fetch(
      `${HOLIDAY_API_URL}?serviceKey=${HOLIDAY_API_KEY}&solYear=${year}&_type=json&numOfRows=50`
    )

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    const holidays: string[] = []

    if (data.response?.body?.items?.item) {
      const items = Array.isArray(data.response.body.items.item)
        ? data.response.body.items.item
        : [data.response.body.items.item]

      items.forEach((item: any) => {
        if (item.locdate) {
          const dateStr = item.locdate.toString()
          const formattedDate = `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`
          holidays.push(formattedDate)
        }
      })
    }

    return holidays
  } catch (error) {
    console.error('공휴일 API 호출 실패:', error)
    // API 호출 실패시 기본 공휴일 데이터 반환
    return getDefaultHolidays(year)
  }
}

// 공휴일 상세 정보 API에서 가져오기
async function fetchHolidayInfos(year: number): Promise<HolidayInfo[]> {
  try {
    const response = await fetch(
      `${HOLIDAY_API_URL}?serviceKey=${HOLIDAY_API_KEY}&solYear=${year}&_type=json&numOfRows=50`
    )

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    const holidayInfos: HolidayInfo[] = []

    if (data.response?.body?.items?.item) {
      const items = Array.isArray(data.response.body.items.item)
        ? data.response.body.items.item
        : [data.response.body.items.item]

      items.forEach((item: any) => {
        if (item.locdate) {
          const dateStr = item.locdate.toString()
          const formattedDate = `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`
          holidayInfos.push({
            date: formattedDate,
            name: item.dateName || '공휴일',
            isHoliday: item.isHoliday === 'Y'
          })
        }
      })
    }

    return holidayInfos
  } catch (error) {
    console.error('공휴일 정보 API 호출 실패:', error)
    // API 호출 실패시 기본 공휴일 정보 반환
    return getDefaultHolidayInfos(year)
  }
}

// 기본 공휴일 데이터 (API 실패시 백업용)
function getDefaultHolidays(year: number): string[] {
  const defaultHolidays: Record<string, string[]> = {
    '2024': [
      '2024-01-01', // 신정
      '2024-02-09', '2024-02-10', '2024-02-11', '2024-02-12', // 설날 연휴
      '2024-03-01', // 삼일절
      '2024-04-10', // 국회의원선거
      '2024-05-05', '2024-05-06', // 어린이날
      '2024-05-15', // 부처님오신날
      '2024-06-06', // 현충일
      '2024-08-15', // 광복절
      '2024-09-16', '2024-09-17', '2024-09-18', // 추석 연휴
      '2024-10-03', // 개천절
      '2024-10-09', // 한글날
      '2024-12-25', // 크리스마스
    ],
    '2025': [
      '2025-01-01', // 신정
      '2025-01-28', '2025-01-29', '2025-01-30', // 설날 연휴
      '2025-03-01', // 삼일절
      '2025-05-05', // 어린이날
      '2025-05-13', // 부처님오신날
      '2025-06-06', // 현충일
      '2025-08-15', // 광복절
      '2025-10-05', '2025-10-06', '2025-10-07', '2025-10-08', // 추석 연휴
      '2025-10-03', // 개천절
      '2025-10-09', // 한글날
      '2025-12-25', // 크리스마스
    ],
    '2026': [
      '2026-01-01', // 신정
      '2026-02-16', '2026-02-17', '2026-02-18', // 설날 연휴
      '2026-03-01', // 삼일절
      '2026-05-05', // 어린이날
      '2026-05-02', // 부처님오신날
      '2026-06-06', // 현충일
      '2026-08-15', // 광복절
      '2026-09-24', '2026-09-25', '2026-09-26', // 추석 연휴
      '2026-10-03', // 개천절
      '2026-10-09', // 한글날
      '2026-12-25', // 크리스마스
    ]
  }

  return defaultHolidays[year.toString()] || []
}

// 기본 공휴일 정보 데이터 (API 실패시 백업용)
function getDefaultHolidayInfos(year: number): HolidayInfo[] {
  const defaultHolidayInfos: Record<string, HolidayInfo[]> = {
    '2024': [
      { date: '2024-01-01', name: '신정', isHoliday: true },
      { date: '2024-02-09', name: '설날연휴', isHoliday: true },
      { date: '2024-02-10', name: '설날', isHoliday: true },
      { date: '2024-02-11', name: '설날연휴', isHoliday: true },
      { date: '2024-02-12', name: '대체공휴일', isHoliday: true },
      { date: '2024-03-01', name: '삼일절', isHoliday: true },
      { date: '2024-04-10', name: '국회의원선거', isHoliday: true },
      { date: '2024-05-05', name: '어린이날', isHoliday: true },
      { date: '2024-05-06', name: '대체공휴일', isHoliday: true },
      { date: '2024-05-15', name: '부처님오신날', isHoliday: true },
      { date: '2024-06-06', name: '현충일', isHoliday: true },
      { date: '2024-08-15', name: '광복절', isHoliday: true },
      { date: '2024-09-16', name: '추석연휴', isHoliday: true },
      { date: '2024-09-17', name: '추석', isHoliday: true },
      { date: '2024-09-18', name: '추석연휴', isHoliday: true },
      { date: '2024-10-03', name: '개천절', isHoliday: true },
      { date: '2024-10-09', name: '한글날', isHoliday: true },
      { date: '2024-12-25', name: '크리스마스', isHoliday: true },
    ],
    '2025': [
      { date: '2025-01-01', name: '신정', isHoliday: true },
      { date: '2025-01-28', name: '설날연휴', isHoliday: true },
      { date: '2025-01-29', name: '설날', isHoliday: true },
      { date: '2025-01-30', name: '설날연휴', isHoliday: true },
      { date: '2025-03-01', name: '삼일절', isHoliday: true },
      { date: '2025-05-05', name: '어린이날', isHoliday: true },
      { date: '2025-05-13', name: '부처님오신날', isHoliday: true },
      { date: '2025-06-06', name: '현충일', isHoliday: true },
      { date: '2025-08-15', name: '광복절', isHoliday: true },
      { date: '2025-10-05', name: '추석연휴', isHoliday: true },
      { date: '2025-10-06', name: '추석', isHoliday: true },
      { date: '2025-10-07', name: '추석연휴', isHoliday: true },
      { date: '2025-10-08', name: '대체공휴일', isHoliday: true },
      { date: '2025-10-03', name: '개천절', isHoliday: true },
      { date: '2025-10-09', name: '한글날', isHoliday: true },
      { date: '2025-12-25', name: '크리스마스', isHoliday: true },
    ],
    '2026': [
      { date: '2026-01-01', name: '신정', isHoliday: true },
      { date: '2026-02-16', name: '설날연휴', isHoliday: true },
      { date: '2026-02-17', name: '설날', isHoliday: true },
      { date: '2026-02-18', name: '설날연휴', isHoliday: true },
      { date: '2026-03-01', name: '삼일절', isHoliday: true },
      { date: '2026-05-05', name: '어린이날', isHoliday: true },
      { date: '2026-05-02', name: '부처님오신날', isHoliday: true },
      { date: '2026-06-06', name: '현충일', isHoliday: true },
      { date: '2026-08-15', name: '광복절', isHoliday: true },
      { date: '2026-09-24', name: '추석연휴', isHoliday: true },
      { date: '2026-09-25', name: '추석', isHoliday: true },
      { date: '2026-09-26', name: '추석연휴', isHoliday: true },
      { date: '2026-10-03', name: '개천절', isHoliday: true },
      { date: '2026-10-09', name: '한글날', isHoliday: true },
      { date: '2026-12-25', name: '크리스마스', isHoliday: true },
    ]
  }

  return defaultHolidayInfos[year.toString()] || []
}

// 공휴일 데이터 로드 (캐시 포함)
async function loadHolidays(year: number): Promise<string[]> {
  const yearStr = year.toString()

  // 캐시된 데이터가 있으면 반환
  if (holidayCache[yearStr]) {
    return holidayCache[yearStr]
  }

  // API에서 데이터 가져오기
  const holidays = await fetchHolidays(year)
  holidayCache[yearStr] = holidays
  // Cache updated for year

  return holidays
}

// 공휴일 정보 로드 (캐시 포함)
async function loadHolidayInfos(year: number): Promise<HolidayInfo[]> {
  const yearStr = year.toString()

  // 캐시된 데이터가 있으면 반환
  if (holidayInfoCache[yearStr]) {
    return holidayInfoCache[yearStr]
  }

  // API에서 데이터 가져오기
  const holidayInfos = await fetchHolidayInfos(year)
  holidayInfoCache[yearStr] = holidayInfos

  return holidayInfos
}

// 공휴일 여부 확인
export async function isHoliday(date: Date): Promise<boolean> {
  const year = date.getFullYear()
  // 타임존 문제를 피하기 위해 로컬 시간 기준으로 날짜 문자열 생성
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const day = date.getDate().toString().padStart(2, '0')
  const dateStr = `${year}-${month}-${day}`

  try {
    const holidays = await loadHolidays(year)
    return holidays.includes(dateStr)
  } catch (error) {
    console.error('공휴일 확인 중 오류:', error)
    // 오류 발생시 기본 데이터로 확인
    const defaultHolidays = getDefaultHolidays(year)
    return defaultHolidays.includes(dateStr)
  }
}

// 동기 버전 (기존 하드코딩된 데이터 사용)
export function isHolidaySync(date: Date): boolean {
  const year = date.getFullYear()
  // 타임존 문제를 피하기 위해 로컬 시간 기준으로 날짜 문자열 생성
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const day = date.getDate().toString().padStart(2, '0')
  const dateStr = `${year}-${month}-${day}`

  const holidays = getDefaultHolidays(year)
  return holidays.includes(dateStr)
}

export function isWeekend(date: Date): boolean {
  const day = date.getDay()
  return day === 0 || day === 6 // 일요일(0) 또는 토요일(6)
}

export function isNonWorkingDay(date: Date): boolean {
  return isWeekend(date) || isHolidaySync(date)
}

// 특정 날짜의 공휴일 정보 가져오기
export async function getHolidayInfo(date: Date): Promise<HolidayInfo | null> {
  const year = date.getFullYear()
  // 타임존 문제를 피하기 위해 로컬 시간 기준으로 날짜 문자열 생성
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const day = date.getDate().toString().padStart(2, '0')
  const dateStr = `${year}-${month}-${day}`

  try {
    const holidayInfos = await loadHolidayInfos(year)
    return holidayInfos.find(info => info.date === dateStr) || null
  } catch (error) {
    console.error('공휴일 정보 확인 중 오류:', error)
    // 오류 발생시 기본 데이터로 확인
    const defaultHolidayInfos = getDefaultHolidayInfos(year)
    return defaultHolidayInfos.find(info => info.date === dateStr) || null
  }
}

// 동기 버전 (기존 하드코딩된 데이터 사용)
export function getHolidayInfoSync(date: Date): HolidayInfo | null {
  const year = date.getFullYear()
  // 타임존 문제를 피하기 위해 로컬 시간 기준으로 날짜 문자열 생성
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const day = date.getDate().toString().padStart(2, '0')
  const dateStr = `${year}-${month}-${day}`

  const holidayInfos = getDefaultHolidayInfos(year)
  return holidayInfos.find(info => info.date === dateStr) || null
}

// 특정 년도의 모든 공휴일 정보 가져오기
export async function getYearHolidays(year: number): Promise<HolidayInfo[]> {
  try {
    return await loadHolidayInfos(year)
  } catch (error) {
    console.error('연도별 공휴일 정보 조회 실패:', error)
    return getDefaultHolidayInfos(year)
  }
}

// 동기 버전
export function getYearHolidaysSync(year: number): HolidayInfo[] {
  return getDefaultHolidayInfos(year)
}

export async function isNonWorkingDayAsync(date: Date): Promise<boolean> {
  const weekend = isWeekend(date)
  const holiday = await isHoliday(date)
  return weekend || holiday
}

export function adjustDateForHoliday(date: Date, direction: 'before' | 'after'): Date {
  const adjustedDate = new Date(date)

  while (isNonWorkingDay(adjustedDate)) {
    if (direction === 'before') {
      adjustedDate.setDate(adjustedDate.getDate() - 1)
    } else {
      adjustedDate.setDate(adjustedDate.getDate() + 1)
    }
  }

  return adjustedDate
}

export async function adjustDateForHolidayAsync(date: Date, direction: 'before' | 'after'): Promise<Date> {
  const adjustedDate = new Date(date)

  while (await isNonWorkingDayAsync(adjustedDate)) {
    if (direction === 'before') {
      adjustedDate.setDate(adjustedDate.getDate() - 1)
    } else {
      adjustedDate.setDate(adjustedDate.getDate() + 1)
    }
  }

  return adjustedDate
}

export function getNextWorkingDay(date: Date): Date {
  return adjustDateForHoliday(date, 'after')
}

export function getPreviousWorkingDay(date: Date): Date {
  return adjustDateForHoliday(date, 'before')
}

export async function getNextWorkingDayAsync(date: Date): Promise<Date> {
  return adjustDateForHolidayAsync(date, 'after')
}

export async function getPreviousWorkingDayAsync(date: Date): Promise<Date> {
  return adjustDateForHolidayAsync(date, 'before')
}

// 캐시 초기화 (필요시 사용)
export function clearHolidayCache(): void {
  holidayCache = {}
  holidayInfoCache = {}
  // Cache cleared
}

// 여러 년도의 공휴일 미리 로드 (성능 향상용)
export async function preloadHolidays(years: number[]): Promise<void> {
  try {
    await Promise.all(years.map(year => Promise.all([
      loadHolidays(year),
      loadHolidayInfos(year)
    ])))
  } catch (error) {
    console.error('공휴일 데이터 사전 로드 실패:', error)
  }
}

// 월의 첫 번째 근무일 계산
export function getFirstWorkdayOfMonth(year: number, month: number): Date {
  const firstDay = new Date(year, month - 1, 1) // month는 0-based이므로 -1
  let currentDay = new Date(firstDay)

  while (isNonWorkingDay(currentDay)) {
    currentDay.setDate(currentDay.getDate() + 1)
  }

  return currentDay
}

// 월의 마지막 근무일 계산
export function getLastWorkdayOfMonth(year: number, month: number): Date {
  const lastDay = new Date(year, month, 0) // 다음 달 0일 = 이번 달 마지막 날
  let currentDay = new Date(lastDay)

  while (isNonWorkingDay(currentDay)) {
    currentDay.setDate(currentDay.getDate() - 1)
  }

  return currentDay
}

// 비동기 버전 - 공휴일 API 사용
export async function getFirstWorkdayOfMonthAsync(year: number, month: number): Promise<Date> {
  const firstDay = new Date(year, month - 1, 1)
  let currentDay = new Date(firstDay)

  while (await isNonWorkingDayAsync(currentDay)) {
    currentDay.setDate(currentDay.getDate() + 1)
  }

  return currentDay
}

export async function getLastWorkdayOfMonthAsync(year: number, month: number): Promise<Date> {
  const lastDay = new Date(year, month, 0)
  let currentDay = new Date(lastDay)

  while (await isNonWorkingDayAsync(currentDay)) {
    currentDay.setDate(currentDay.getDate() - 1)
  }

  return currentDay
}

// 커스텀 공휴일 포함 확인
export function checkIsHoliday(date: Date, customHolidays: CustomHoliday[]): boolean {
  // 1. 기본 공휴일 확인
  if (isHolidaySync(date)) return true

  // 2. 커스텀 공휴일 확인
  const year = date.getFullYear()
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const day = date.getDate().toString().padStart(2, '0')
  const dateStr = `${year}-${month}-${day}`
  const monthDay = `${month}-${day}`

  return customHolidays.some(holiday => {
    // Ensure isRecurring is treated as boolean
    const isRecurring = !!holiday.isRecurring

    if (isRecurring) {
      // Robust date comparison: split and compare month/day parts
      const parts = holiday.date.split('-')
      if (parts.length === 3) {
        const hMonth = parts[1].padStart(2, '0')
        const hDay = parts[2].padStart(2, '0')
        const hMonthDay = `${hMonth}-${hDay}`
        return hMonthDay === monthDay
      }
      // Fallback to simple string check if format is unexpected
      return holiday.date.endsWith(monthDay)
    }
    return holiday.date === dateStr
  })
}