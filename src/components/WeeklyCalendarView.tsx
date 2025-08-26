import { useState, useMemo, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Calendar, Plus, Edit, Trash2, Timer, X } from 'lucide-react'
import { format, startOfWeek, endOfWeek, eachDayOfInterval, addWeeks, subWeeks, isSameDay, isToday, getWeekOfMonth } from 'date-fns'
import { ko } from 'date-fns/locale'
import { useTodos } from '../contexts/TodoContext'
import { useVacation } from '../contexts/VacationContext'
import { useAuth } from '../contexts/AuthContext'
import { isAdmin } from '../constants/admin'
import { useSwipe } from '../hooks/useSwipe'
import TodoItem from './TodoItem'
import VacationItem from './VacationItem'
import EditTodoModal from './EditTodoModal'
import { getHolidayInfoSync, isWeekend, type HolidayInfo } from '../utils/holidays'
import type { Priority, TaskType, Todo } from '../types/todo'

interface WeeklyCalendarViewProps {
  searchTerm: string
  priorityFilter: Priority | 'all'
  typeFilter: TaskType | 'all'
  projectFilter: 'all' | 'longterm' | 'shortterm'
  tagFilter: string[]
  completionDateFilter: 'all' | 'today' | 'yesterday' | 'thisWeek' | 'lastWeek' | 'thisMonth'
  onAddTodo: () => void
  isMobile?: boolean
}

const WeeklyCalendarView = ({ 
  searchTerm, 
  priorityFilter, 
  typeFilter, 
  projectFilter,
  tagFilter,
  completionDateFilter,
  onAddTodo,
  isMobile = false 
}: WeeklyCalendarViewProps) => {
  const [currentWeek, setCurrentWeek] = useState(new Date())
  const [holidayInfos, setHolidayInfos] = useState<Record<string, HolidayInfo>>({})
  const [selectedTodo, setSelectedTodo] = useState<Todo | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isDateModalOpen, setIsDateModalOpen] = useState(false)
  const [selectedDateTodos, setSelectedDateTodos] = useState<Todo[]>([])
  const [selectedDateVacations, setSelectedDateVacations] = useState<Array<{id: string; employeeId: number; date: string; type: string}>>([])
  const { getFilteredTodos, toggleTodo, deleteTodo } = useTodos()
  const { currentUser } = useAuth()
  const { showVacationsInTodos, getVacationsForDate, employees } = useVacation()

  const weekDays = useMemo(() => {
    const start = startOfWeek(currentWeek, { weekStartsOn: 0 }) // 일요일 시작
    const end = endOfWeek(currentWeek, { weekStartsOn: 0 })
    return eachDayOfInterval({ start, end })
  }, [currentWeek])

  // 몇째주 계산
  const weekOfMonth = useMemo(() => {
    return getWeekOfMonth(currentWeek, { weekStartsOn: 0 })
  }, [currentWeek])

  // 공휴일 정보 로드
  useEffect(() => {
    const loadHolidayInfos = () => {
      const newHolidayInfos: Record<string, HolidayInfo> = {}
      weekDays.forEach(day => {
        const holidayInfo = getHolidayInfoSync(day)
        if (holidayInfo) {
          newHolidayInfos[day.toISOString().split('T')[0]] = holidayInfo
        }
      })
      setHolidayInfos(newHolidayInfos)
    }

    loadHolidayInfos()
  }, [weekDays])

  const filteredTodos = useMemo(() => {
    return getFilteredTodos({
      searchTerm,
      priorityFilter,
      typeFilter,
      projectFilter,
      tagFilter,
      completionDateFilter,
      includeCompleted: true
    })
  }, [searchTerm, priorityFilter, typeFilter, projectFilter, tagFilter, completionDateFilter, getFilteredTodos])

  const getTodosForDate = (date: Date) => {
    return filteredTodos.filter(todo => {
      // 완료된 할일의 경우: 완료날짜가 해당 날짜인 것만 표시
      if (todo.completed && todo.completedAt) {
        return isSameDay(todo.completedAt, date)
      }
      
      // 미완료 할일의 경우 - 기간 기반 로직
      if (!todo.completed) {
        const startDate = todo.startDate ? new Date(todo.startDate) : null
        const dueDate = todo.dueDate ? new Date(todo.dueDate) : null
        
        // 시작일과 마감일이 모두 있는 경우: 해당 날짜가 기간 내에 있는지 확인
        if (startDate && dueDate) {
          const targetDate = new Date(date)
          startDate.setHours(0, 0, 0, 0)
          dueDate.setHours(0, 0, 0, 0)
          targetDate.setHours(0, 0, 0, 0)
          
          return targetDate.getTime() >= startDate.getTime() && targetDate.getTime() <= dueDate.getTime()
        }
        
        // 시작일만 있는 경우: 시작일 이후 모든 날짜에 표시
        if (startDate && !dueDate) {
          const targetDate = new Date(date)
          startDate.setHours(0, 0, 0, 0)
          targetDate.setHours(0, 0, 0, 0)
          return targetDate.getTime() >= startDate.getTime()
        }
        
        // 마감일만 있는 경우: 마감일에 표시
        if (!startDate && dueDate) {
          return isSameDay(dueDate, date)
        }
        
        // 날짜가 없는 할일: 표시하지 않음
        return false
      }
      
      return false
    })
  }

  const goToPreviousWeek = () => {
    setCurrentWeek(prev => subWeeks(prev, 1))
  }

  const goToNextWeek = () => {
    setCurrentWeek(prev => addWeeks(prev, 1))
  }

  const goToCurrentWeek = () => {
    setCurrentWeek(new Date())
  }

  // 스와이프 핸들러 설정
  const swipeHandlers = useSwipe({
    onSwipeLeft: goToNextWeek,      // 왼쪽 스와이프 → 다음 주
    onSwipeRight: goToPreviousWeek  // 오른쪽 스와이프 → 이전 주
  }, {
    minSwipeDistance: 60
  })

  return (
    <div 
      className="space-y-4"
      {...(isMobile ? {
        onTouchStart: swipeHandlers.onTouchStart,
        onTouchMove: swipeHandlers.onTouchMove,
        onTouchEnd: swipeHandlers.onTouchEnd
      } : {})}
    >
      {/* 헤더 */}
      <div className={`flex items-center ${isMobile ? 'flex-col gap-2' : 'justify-between'}`}>
        <div className={`flex items-center ${isMobile ? 'w-full justify-between' : 'gap-4'}`}>
          <h2 className={`${isMobile ? 'text-base' : 'text-xl'} font-semibold text-gray-900 dark:text-white ${isMobile ? 'flex-1 text-center min-w-0' : ''}`}>
            {format(currentWeek, 'yyyy년 M월', { locale: ko })} {weekOfMonth}째주
          </h2>
          <div className={`flex items-center ${isMobile ? 'gap-1' : 'gap-2'}`}>
            <button
              onClick={goToPreviousWeek}
              className={`${isMobile ? 'p-1' : 'p-2'} hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg`}
              title="이전 주"
            >
              <ChevronLeft className={`${isMobile ? 'w-3 h-3' : 'w-4 h-4'}`} />
            </button>
            <button
              onClick={goToCurrentWeek}
              className={`${isMobile ? 'px-2 py-1 text-xs' : 'px-3 py-1 text-sm'} bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/40`}
            >
              이번 주
            </button>
            <button
              onClick={goToNextWeek}
              className={`${isMobile ? 'p-1' : 'p-2'} hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg`}
              title="다음 주"
            >
              <ChevronRight className={`${isMobile ? 'w-3 h-3' : 'w-4 h-4'}`} />
            </button>
          </div>
        </div>
        
        {/* 날짜 범위는 데스크톱에서만 표시 */}
        {!isMobile && (
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {format(weekDays[0], 'M월 d일', { locale: ko })} - {format(weekDays[6], 'M월 d일', { locale: ko })}
          </div>
        )}
      </div>

      {/* 주간 캘린더 그리드 */}
      <div className="grid grid-cols-7 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* 요일 헤더 */}
        {weekDays.map((day, index) => {
          const dayTodos = getTodosForDate(day)
          const completedCount = dayTodos.filter(todo => todo.completed).length
          const totalCount = dayTodos.length
          const dateStr = day.toISOString().split('T')[0]
          const holidayInfo = holidayInfos[dateStr]
          const isWeekendDay = isWeekend(day)
          const isTodayDay = isToday(day)
          
          // 휴가 정보 가져오기
          const shouldShowVacations = isAdmin(currentUser?.email) && showVacationsInTodos
          const dayVacations = shouldShowVacations ? getVacationsForDate(day) : []
          
          return (
            <div key={index} className="border-r border-gray-200 dark:border-gray-700 last:border-r-0 relative flex flex-col">
              {/* 날짜 헤더 */}
              <div 
                className={`${isMobile ? 'p-1' : 'p-2'} border-b border-gray-200 dark:border-gray-700 text-center cursor-pointer hover:bg-opacity-80 transition-colors ${
                  isTodayDay 
                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300' 
                    : holidayInfo || isWeekendDay
                    ? 'bg-red-50 dark:bg-red-900/20'
                    : 'bg-gray-50 dark:bg-gray-700/50'
                }`}
                onClick={() => {
                  if (dayTodos.length > 0 || dayVacations.length > 0) {
                    setSelectedDateTodos(dayTodos)
                    setSelectedDateVacations(dayVacations)
                    setIsDateModalOpen(true)
                  }
                }}
              >
                <div className={`text-xs font-medium mb-1 ${
                  holidayInfo || isWeekendDay 
                    ? 'text-red-600 dark:text-red-400' 
                    : 'text-gray-600 dark:text-gray-400'
                }`}>
                  {format(day, 'E', { locale: ko })}
                </div>
                <div className="flex items-center justify-center">
                  <div className={`text-lg font-semibold ${
                    isTodayDay 
                      ? 'text-blue-700 dark:text-blue-300' 
                      : holidayInfo || isWeekendDay
                      ? 'text-red-700 dark:text-red-300'
                      : 'text-gray-900 dark:text-white'
                  }`}>
                    {format(day, 'd')}
                  </div>
                  {/* 데스크톱에서만 옆에 공휴일 표시 */}
                  {holidayInfo && !isMobile && (
                    <div className="text-xs text-red-600 dark:text-red-400 font-medium ml-1">
                      {holidayInfo.name}
                    </div>
                  )}
                </div>
              </div>

              {/* 휴가 및 할일 목록 */}
              <div className={`${isMobile ? 'px-0.5 py-1 min-h-[150px] space-y-0.5' : 'p-2 min-h-[200px] space-y-1'} flex-1`}>
                {/* 휴가 정보 먼저 표시 */}
                {dayVacations.slice(0, Math.max(0, 8 - dayTodos.length)).map(vacation => {
                  const employee = employees.find(emp => emp.id === vacation.employeeId)
                  return (
                    <div
                      key={`vacation-${vacation.id}`}
                      className={`${isMobile ? 'p-1 text-[9px]' : 'p-2 text-xs'} rounded border cursor-pointer hover:shadow-md transition-all ${
                        vacation.type === '연차' 
                          ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 hover:bg-green-100 dark:hover:bg-green-900/30'
                          : vacation.type === '오전' || vacation.type === '오후'
                          ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/30'
                          : vacation.type === '특별'
                          ? 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800 hover:bg-purple-100 dark:hover:bg-purple-900/30'
                          : vacation.type === '병가'
                          ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/30'
                          : 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 hover:bg-yellow-100 dark:hover:bg-yellow-900/30'
                      }`}
                      title={employee ? `${employee.name} - ${vacation.type}` : `직원 ${vacation.employeeId} - ${vacation.type}`}
                    >
                      <div className="truncate">
                        {isMobile 
                          ? `${vacation.type}` 
                          : employee 
                          ? `${employee.name} ${vacation.type}`
                          : `직원${vacation.employeeId} ${vacation.type}`
                        }
                      </div>
                    </div>
                  )
                })}
                
                {dayTodos.slice(0, Math.max(0, 8 - dayVacations.length)).map(todo => (
                  <div
                    key={todo.id}
                    className={`group relative ${isMobile ? 'p-1' : 'p-2'} rounded ${isMobile ? 'text-[10px]' : 'text-xs'} border cursor-pointer hover:shadow-md transition-all ${
                      todo.completed
                        ? 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 opacity-60'
                        : todo.priority === 'urgent'
                        ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/30'
                        : todo.priority === 'high'
                        ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800 hover:bg-orange-100 dark:hover:bg-orange-900/30'
                        : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/30'
                    }`}
                    onClick={() => {
                      setSelectedTodo(todo)
                      setIsEditModalOpen(true)
                    }}
                  >
                    <div className={`font-medium truncate ${isMobile ? 'text-[10px]' : 'text-xs'} ${
                      todo.completed ? 'line-through text-gray-500' : 'text-gray-900 dark:text-white'
                    }`}>
                      {todo.title}
                    </div>
                    {/* 시간 정보 표시 - showStartTime이나 showDueTime이 체크되었을 때만 표시 */}
                    <div className={`${isMobile ? 'text-[9px]' : 'text-xs'} text-gray-500 dark:text-gray-400 ${isMobile ? 'mt-0.5' : 'mt-1'}`}>
                      {(todo.showStartTime && todo.startTime) && (
                        <span>시작: {todo.startTime}</span>
                      )}
                      {(todo.showStartTime && todo.startTime) && (todo.showDueTime && todo.dueDate && new Date(todo.dueDate).getHours() !== 23 && new Date(todo.dueDate).getMinutes() !== 59) && (
                        <span> | </span>
                      )}
                      {(todo.showDueTime && todo.dueDate) && (() => {
                        const dueDate = new Date(todo.dueDate);
                        // 마감시간이 23:59가 아닌 경우에만 시간 표시
                        if (!(dueDate.getHours() === 23 && dueDate.getMinutes() === 59)) {
                          return <span>마감: {dueDate.toTimeString().slice(0, 5)}</span>
                        }
                        return null;
                      })()}
                    </div>
                    
                    {/* 호버 시 나타나는 액션 버튼들 */}
                    <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleTodo(todo.id)
                        }}
                        className="p-1.5 bg-white dark:bg-gray-800 rounded shadow-sm hover:bg-gray-100 dark:hover:bg-gray-700"
                        title={todo.completed ? '완료 취소' : '완료 처리'}
                      >
                        <div className={`w-3 h-3 rounded-full ${
                          todo.completed ? 'bg-green-600' : 'border border-gray-400'
                        }`} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          if (confirm(`"${todo.title}" 할일을 삭제하시겠습니까?`)) {
                            deleteTodo(todo.id)
                          }
                        }}
                        className="p-1.5 bg-white dark:bg-gray-800 rounded shadow-sm hover:bg-red-100 dark:hover:bg-red-900/30"
                        title="삭제"
                      >
                        <Trash2 className="w-3 h-3 text-red-600" />
                      </button>
                    </div>
                  </div>
                ))}
                
                {(dayTodos.length + dayVacations.length) > 8 && (
                  <div 
                    className="text-xs text-gray-500 dark:text-gray-400 text-center py-1 cursor-pointer hover:text-blue-600"
                    onClick={() => {
                      setSelectedDateTodos(dayTodos)
                      setSelectedDateVacations(dayVacations)
                      setIsDateModalOpen(true)
                    }}
                  >
                    +{(dayTodos.length + dayVacations.length) - 8}개 더
                  </div>
                )}
                
                {/* + 버튼을 할일 목록 바로 아래에 표시 */}
                <button
                  onClick={onAddTodo}
                  className={`w-full ${isMobile ? 'h-6' : 'h-8'} border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg flex items-center justify-center text-gray-400 hover:border-blue-400 hover:text-blue-400 transition-colors`}
                  title="할일 추가"
                >
                  <Plus className={`${isMobile ? 'w-2.5 h-2.5' : 'w-3 h-3'}`} />
                </button>
              </div>

              {/* 모바일에서 공휴일 표시를 셀의 절대적 하단에 배치 */}
              {holidayInfo && isMobile && (
                <div className="absolute bottom-0 left-0 right-0">
                  <div className="text-[9px] text-red-600 dark:text-red-400 font-medium text-center bg-red-50 dark:bg-red-900/20 py-0.5 leading-tight">
                    {holidayInfo.name}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* 선택된 날짜의 상세 할일 및 휴가 목록 (옵션) */}
      {weekDays.some(day => {
        const dayTodos = getTodosForDate(day)
        const shouldShowVacations = isAdmin(currentUser?.email) && showVacationsInTodos
        const dayVacations = shouldShowVacations ? getVacationsForDate(day) : []
        return dayTodos.length > 0 || dayVacations.length > 0
      }) && (
        <div className="mt-8">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            이번 주 상세 정보
          </h3>
          <div className="space-y-2">
            {weekDays.map(day => {
              const dayTodos = getTodosForDate(day)
              const shouldShowVacations = isAdmin(currentUser?.email) && showVacationsInTodos
              const dayVacations = shouldShowVacations ? getVacationsForDate(day) : []
              if (dayTodos.length === 0 && dayVacations.length === 0) return null
              
              return (
                <div key={day.toISOString()}>
                  <h4 className="text-md font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    {format(day, 'M월 d일 (E)', { locale: ko })}
                    {isToday(day) && (
                      <span className="px-2 py-1 text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300 rounded">
                        오늘
                      </span>
                    )}
                  </h4>
                  <div className="space-y-2">
                    {/* 휴가 정보 먼저 표시 */}
                    {dayVacations.map(vacation => {
                      const employee = employees.find(emp => emp.id === vacation.employeeId)
                      return (
                        <div
                          key={`vacation-${vacation.id}`}
                          className={`p-3 rounded-lg border cursor-pointer hover:shadow-md transition-all ${
                            vacation.type === '연차' 
                              ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                              : vacation.type === '오전' || vacation.type === '오후'
                              ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                              : vacation.type === '특별'
                              ? 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800'
                              : vacation.type === '병가'
                              ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                              : 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            {employee && (
                              <div
                                className="w-6 h-6 rounded-full flex items-center justify-center text-white text-sm font-semibold"
                                style={{ backgroundColor: employee.color }}
                              >
                                {employee.name.charAt(0)}
                              </div>
                            )}
                            <div className="flex-1 truncate">
                              <div className={`font-medium text-gray-900 dark:text-white truncate ${isMobile ? 'text-sm' : 'text-base'}`}>
                                {employee ? employee.name : `직원 ${vacation.employeeId}`}
                              </div>
                            </div>
                            <div className={`px-2 py-1 text-xs font-medium rounded ${
                              vacation.type === '연차' 
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200'
                                : vacation.type === '오전' || vacation.type === '오후'
                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200'
                                : vacation.type === '특별'
                                ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-200'
                                : vacation.type === '병가'
                                ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200'
                                : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200'
                            }`}>
                              {vacation.type}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                    
                    {/* 할일 목록 */}
                    {dayTodos.map(todo => (
                      <TodoItem key={todo.id} todo={todo} />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
      
      {/* 편집 모달 */}
      {selectedTodo && (
        <EditTodoModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false)
            setSelectedTodo(null)
          }}
          todo={selectedTodo}
          isMobile={isMobile}
        />
      )}
      
      {/* 날짜 클릭 모달 */}
      {isDateModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setIsDateModalOpen(false)}>
          <div 
            className={`bg-white dark:bg-gray-800 rounded-lg shadow-xl ${isMobile ? 'w-[90vw] max-h-[80vh]' : 'w-[500px] max-h-[600px]'} overflow-hidden`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* 모달 헤더 */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                {selectedDateTodos.length > 0 && selectedDateTodos[0].dueDate ? 
                  format(selectedDateTodos[0].dueDate, 'M월 d일 (E)', { locale: ko }) : 
                  '할일 및 휴가'
                } ({selectedDateTodos.length + selectedDateVacations.length}개)
              </h3>
              <button
                onClick={() => setIsDateModalOpen(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            {/* 모달 내용 */}
            <div className="p-4 overflow-y-auto max-h-[500px]">
              {(selectedDateTodos.length > 0 || selectedDateVacations.length > 0) ? (
                <div className="space-y-3">
                  {/* 휴가 정보 먼저 표시 */}
                  {selectedDateVacations.map(vacation => {
                    const employee = employees.find(emp => emp.id === vacation.employeeId)
                    return (
                      <div
                        key={`vacation-${vacation.id}`}
                        className={`p-2 rounded border ${
                          vacation.type === '연차' 
                            ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                            : vacation.type === '오전' || vacation.type === '오후'
                            ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                            : vacation.type === '특별'
                            ? 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800'
                            : vacation.type === '병가'
                            ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                            : 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {employee && (
                            <div
                              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-semibold"
                              style={{ backgroundColor: employee.color }}
                            >
                              {employee.name.charAt(0)}
                            </div>
                          )}
                          <div className="flex-1">
                            <div className="font-medium text-gray-900 dark:text-white">
                              {employee ? employee.name : `직원 ${vacation.employeeId}`}
                            </div>
                          </div>
                          <div className={`px-2 py-1 text-xs font-medium rounded ${
                            vacation.type === '연차' 
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200'
                              : vacation.type === '오전' || vacation.type === '오후'
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200'
                              : vacation.type === '특별'
                              ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-200'
                              : vacation.type === '병가'
                              ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200'
                              : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200'
                          }`}>
                            {vacation.type}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                  
                  {/* 할일 목록 */}
                  {selectedDateTodos.map(todo => (
                    <div
                      key={todo.id}
                      className={`p-2 rounded border cursor-pointer hover:shadow-md transition-all ${
                        todo.completed
                          ? 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 opacity-60'
                          : todo.priority === 'urgent'
                          ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                          : todo.priority === 'high'
                          ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800'
                          : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                      }`}
                      onClick={() => {
                        setSelectedTodo(todo)
                        setIsEditModalOpen(true)
                        setIsDateModalOpen(false)
                      }}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className={`font-medium truncate ${todo.completed ? 'line-through text-gray-500' : 'text-gray-900 dark:text-white'}`}>
                            {todo.title}
                          </div>
                          {/* 시간 정보 표시 */}
                          {((todo.showStartTime && todo.startTime) || (todo.showDueTime && todo.dueDate)) && (
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              {(todo.showStartTime && todo.startTime) && (
                                <span>시작: {todo.startTime}</span>
                              )}
                              {(todo.showStartTime && todo.startTime) && (todo.showDueTime && todo.dueDate) && (() => {
                                const dueDate = new Date(todo.dueDate);
                                // 마감시간이 23:59가 아닌 경우에만 구분자 표시
                                if (!(dueDate.getHours() === 23 && dueDate.getMinutes() === 59)) {
                                  return <span> | </span>
                                }
                                return null;
                              })()}
                              {(todo.showDueTime && todo.dueDate) && (() => {
                                const dueDate = new Date(todo.dueDate);
                                // 마감시간이 23:59가 아닌 경우에만 시간 표시
                                if (!(dueDate.getHours() === 23 && dueDate.getMinutes() === 59)) {
                                  return <span>마감: {dueDate.toTimeString().slice(0, 5)}</span>
                                }
                                return null;
                              })()}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {todo.type === 'project' && (
                            <span className={`text-xs px-1.5 py-0.5 rounded ${
                              todo.project === 'longterm' 
                                ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400'
                                : 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                            }`}>
                              {todo.project === 'longterm' ? '롱텀' : '숏텀'}
                            </span>
                          )}
                          {todo.priority && todo.priority !== 'medium' && (
                            <span className={`text-xs px-1.5 py-0.5 rounded ${
                              todo.priority === 'urgent' 
                                ? 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                                : todo.priority === 'high'
                                ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400'
                                : 'bg-gray-100 text-gray-700 dark:bg-gray-900/20 dark:text-gray-400'
                            }`}>
                              {todo.priority === 'urgent' ? '긴급' : todo.priority === 'high' ? '높음' : '낮음'}
                            </span>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              toggleTodo(todo.id)
                            }}
                            className="p-1 bg-white dark:bg-gray-700 rounded shadow-sm hover:bg-gray-100 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-600"
                            title={todo.completed ? '완료 취소' : '완료 처리'}
                          >
                            <div className={`w-3 h-3 rounded-full ${
                              todo.completed ? 'bg-green-600' : 'border border-gray-400'
                            }`} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              if (confirm(`"${todo.title}" 할일을 삭제하시겠습니까?`)) {
                                deleteTodo(todo.id)
                                // 모달에서 삭제된 할일 제거
                                const updatedTodos = selectedDateTodos.filter(t => t.id !== todo.id)
                                if (updatedTodos.length === 0 && selectedDateVacations.length === 0) {
                                  setIsDateModalOpen(false)
                                }
                              }
                            }}
                            className="p-1 bg-white dark:bg-gray-700 rounded shadow-sm hover:bg-red-100 dark:hover:bg-red-800 border border-gray-200 dark:border-gray-600"
                            title="삭제"
                          >
                            <Trash2 className="w-3 h-3 text-red-600" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                  선택한 날짜에 할일이 없습니다.
                </div>
              )}
            </div>
            
            {/* 모달 푸터 */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
              <button
                onClick={() => setIsDateModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default WeeklyCalendarView