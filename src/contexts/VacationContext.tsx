import { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react'
import type { ReactNode } from 'react'
import { useAuth } from './AuthContext'
import { isAdmin } from '../constants/admin'
import vacationFirebaseService from '../services/vacationFirebaseService'

interface Employee {
  id: number;
  name: string;
  team: string;
  position: string;
  color: string;
}

interface Vacation {
  id: string;
  employeeId: number;
  date: string;
  type: string;
  createdAt: number;
  updatedAt: number;
}

interface VacationContextType {
  employees: Employee[]
  vacations: Vacation[]
  loading: boolean
  showVacationsInTodos: boolean
  toggleVacationDisplay: () => void
  refreshVacationData: () => Promise<void>
  getVacationsForDate: (date: Date) => Vacation[]
  loadMonthVacations: (year: number, month: number) => Promise<void>
}

const VacationContext = createContext<VacationContextType | undefined>(undefined)

export const VacationProvider = ({ children }: { children: ReactNode }) => {
  const { currentUser } = useAuth()
  const [employees, setEmployees] = useState<Employee[]>([])
  const [vacations, setVacations] = useState<Vacation[]>([])
  const [loading, setLoading] = useState(false)
  const [showVacationsInTodos, setShowVacationsInTodos] = useState(() => {
    const saved = localStorage.getItem('showVacationsInTodos')
    return saved ? JSON.parse(saved) : true
  })

  // 휴가 맵핑 (성능 최적화: O(1) 조회)
  const vacationsMap = useMemo(() => {
    const map = new Map<string, Vacation[]>()
    vacations.forEach(v => {
      const list = map.get(v.date) || []
      list.push(v)
      map.set(v.date, list)
    })
    return map
  }, [vacations])

  // 휴가 표시 토글
  const toggleVacationDisplay = useCallback(() => {
    setShowVacationsInTodos(prev => {
      const newValue = !prev
      localStorage.setItem('showVacationsInTodos', JSON.stringify(newValue))
      return newValue
    })
  }, [])

  // 휴가 데이터 로드
  const refreshVacationData = useCallback(async () => {
    if (!currentUser || !isAdmin(currentUser.email)) {
      return
    }

    setLoading(true)
    try {
      const [employeesData, vacationsData] = await Promise.all([
        vacationFirebaseService.getEmployees('보상지원부'),
        vacationFirebaseService.getVacations('보상지원부')
      ])

      setEmployees(employeesData)
      setVacations(vacationsData)
    } catch (error) {
      console.error('휴가 데이터 로드 실패:', error)
    } finally {
      setLoading(false)
    }
  }, [currentUser])

  // 특정 날짜의 휴가 가져오기 (최적화됨)
  const getVacationsForDate = useCallback((date: Date): Vacation[] => {
    if (!showVacationsInTodos) return []

    // Date -> YYYY-MM-DD 변환 (Local Time)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const dateStr = `${year}-${month}-${day}`

    return vacationsMap.get(dateStr) || []
  }, [showVacationsInTodos, vacationsMap])

  // Placeholder for loadMonthVacations to satisfy App.tsx interface
  const loadMonthVacations = useCallback(async (year: number, month: number) => {
    // Current legacy implementation loads all data via refreshVacationData
    // So we don't need to do specific month loading here, but we must provide the function.
    // Optionally trigger refresh if empty?
    if (vacations.length === 0 && currentUser && isAdmin(currentUser.email || '')) {
      await refreshVacationData();
    }
  }, [vacations.length, currentUser, refreshVacationData])

  // 사용자 로그인 시 데이터 로드
  useEffect(() => {
    if (currentUser && isAdmin(currentUser.email)) {
      refreshVacationData()
    }
  }, [currentUser, refreshVacationData])

  const value = useMemo(() => ({
    employees,
    vacations,
    loading,
    showVacationsInTodos,
    toggleVacationDisplay,
    refreshVacationData,
    getVacationsForDate,
    loadMonthVacations
  }), [employees, vacations, loading, showVacationsInTodos, toggleVacationDisplay, refreshVacationData, getVacationsForDate, loadMonthVacations])

  return (
    <VacationContext.Provider value={value}>
      {children}
    </VacationContext.Provider>
  )
}

export const useVacation = () => {
  const context = useContext(VacationContext)
  if (context === undefined) {
    throw new Error('useVacation must be used within a VacationProvider')
  }
  return context
}