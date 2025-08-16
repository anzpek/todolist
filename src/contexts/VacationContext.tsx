import { createContext, useContext, useEffect, useState } from 'react'
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

  // 휴가 표시 토글
  const toggleVacationDisplay = () => {
    const newValue = !showVacationsInTodos
    setShowVacationsInTodos(newValue)
    localStorage.setItem('showVacationsInTodos', JSON.stringify(newValue))
  }

  // 휴가 데이터 로드
  const refreshVacationData = async () => {
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
  }

  // 특정 날짜의 휴가 가져오기
  const getVacationsForDate = (date: Date): Vacation[] => {
    if (!showVacationsInTodos) return []
    
    // 로컬 시간대를 고려한 날짜 문자열 생성
    const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    const dateStr = localDate.toISOString().split('T')[0]
    
    console.log('🔍 휴가 검색:', {
      originalDate: date,
      localDate: localDate,
      dateStr: dateStr,
      availableVacations: vacations.map(v => ({ id: v.id, date: v.date, type: v.type }))
    })
    
    return vacations.filter(vacation => vacation.date === dateStr)
  }

  // 사용자 로그인 시 데이터 로드
  useEffect(() => {
    if (currentUser && isAdmin(currentUser.email)) {
      refreshVacationData()
    }
  }, [currentUser])

  const value: VacationContextType = {
    employees,
    vacations,
    loading,
    showVacationsInTodos,
    toggleVacationDisplay,
    refreshVacationData,
    getVacationsForDate
  }

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