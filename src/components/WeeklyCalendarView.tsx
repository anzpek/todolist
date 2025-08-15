import { useState, useMemo, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Calendar, Plus, Edit, Trash2, Timer } from 'lucide-react'
import { format, startOfWeek, endOfWeek, eachDayOfInterval, addWeeks, subWeeks, isSameDay, isToday, getWeekOfMonth } from 'date-fns'
import { ko } from 'date-fns/locale'
import { useTodos } from '../contexts/TodoContext'
import { useSwipe } from '../hooks/useSwipe'
import TodoItem from './TodoItem'
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
  const { getFilteredTodos, toggleTodo, deleteTodo } = useTodos()

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
      if (!todo.dueDate) return false
      return isSameDay(todo.dueDate, date)
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
          
          return (
            <div key={index} className="border-r border-gray-200 dark:border-gray-700 last:border-r-0 relative flex flex-col">
              {/* 날짜 헤더 */}
              <div className={`${isMobile ? 'p-1' : 'p-2'} border-b border-gray-200 dark:border-gray-700 text-center ${
                isTodayDay 
                  ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300' 
                  : holidayInfo || isWeekendDay
                  ? 'bg-red-50 dark:bg-red-900/20'
                  : 'bg-gray-50 dark:bg-gray-700/50'
              }`}>
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

              {/* 할일 목록 */}
              <div className={`${isMobile ? 'px-0.5 py-1 min-h-[150px] space-y-0.5' : 'p-2 min-h-[200px] space-y-1'} flex-1`}>
                {dayTodos.slice(0, isMobile ? 2 : 3).map(todo => (
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
                    {todo.dueTime && (
                      <div className={`${isMobile ? 'text-[9px]' : 'text-xs'} text-gray-500 dark:text-gray-400 ${isMobile ? 'mt-0.5' : 'mt-1'}`}>
                        {todo.dueTime}
                      </div>
                    )}
                    {todo.type === 'project' && (
                      <div className={`${isMobile ? 'text-[9px]' : 'text-xs'} text-blue-600 dark:text-blue-400 ${isMobile ? 'mt-0.5' : 'mt-1'}`}>
                        {todo.project === 'longterm' ? '롱텀' : '숏텀'}
                      </div>
                    )}
                    
                    {/* 호버 시 나타나는 액션 버튼들 */}
                    <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleTodo(todo.id)
                        }}
                        className="p-1 bg-white dark:bg-gray-800 rounded shadow-sm hover:bg-gray-100 dark:hover:bg-gray-700"
                        title={todo.completed ? '완료 취소' : '완료 처리'}
                      >
                        <div className={`w-2 h-2 rounded-full ${
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
                        className="p-1 bg-white dark:bg-gray-800 rounded shadow-sm hover:bg-red-100 dark:hover:bg-red-900/30"
                        title="삭제"
                      >
                        <Trash2 className="w-2 h-2 text-red-600" />
                      </button>
                    </div>
                  </div>
                ))}
                
                {dayTodos.length > (isMobile ? 2 : 3) && (
                  <div className="text-xs text-gray-500 dark:text-gray-400 text-center py-1">
                    +{dayTodos.length - (isMobile ? 2 : 3)}개 더
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

      {/* 선택된 날짜의 상세 할일 목록 (옵션) */}
      {weekDays.some(day => getTodosForDate(day).length > 0) && (
        <div className="mt-8">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            이번 주 상세 할일
          </h3>
          <div className="space-y-2">
            {weekDays.map(day => {
              const dayTodos = getTodosForDate(day)
              if (dayTodos.length === 0) return null
              
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
    </div>
  )
}

export default WeeklyCalendarView