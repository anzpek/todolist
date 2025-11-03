import { useState, useEffect } from 'react'
import { Plus, Menu, User, LogOut, ChevronLeft, ChevronRight, Calendar } from 'lucide-react'
import type { ViewType } from '../App'
import { useSwipe } from '../hooks/useSwipe'
import TodoList from './TodoList'
import AddTodoModal from './AddTodoModal'
import StatsCard from './StatsCard'
import ProjectAnalysis from './ProjectAnalysis'
import SearchFilter from './SearchFilter'
import DataBackup from './DataBackup'
import WeeklyCalendarView from './WeeklyCalendarView'
import MonthlyCalendarView from './MonthlyCalendarView'
import RecurringManagement from './RecurringManagement'
import CompletedHistoryView from './CompletedHistoryView'
import AuthModal from './AuthModal'
import FloatingActionButton from './FloatingActionButton'
import VacationDashboard from './VacationManagement/VacationDashboard'
import { useTodos } from '../contexts/TodoContext'
import { useAuth } from '../contexts/AuthContext'
import { format, addDays, subDays, isToday } from 'date-fns'
import { ko } from 'date-fns/locale'
import type { Priority, TaskType } from '../types/todo'

interface MainContentProps {
  currentView: ViewType | 'recurring' | 'history' | 'analytics' | 'vacation'
  isSidebarOpen: boolean
  onToggleSidebar: () => void
  searchInputRef: React.RefObject<HTMLInputElement | null>
  addTodoModalRef: React.RefObject<{ open: () => void } | null>
  isMobile?: boolean
}

const MainContent = ({ currentView, isSidebarOpen, onToggleSidebar, searchInputRef, addTodoModalRef, isMobile = false }: MainContentProps) => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [priorityFilter, setPriorityFilter] = useState<Priority | 'all'>('all')
  const [typeFilter, setTypeFilter] = useState<TaskType | 'all'>('all')
  const [projectFilter, setProjectFilter] = useState<'all' | 'longterm' | 'shortterm'>('all')
  const [tagFilter, setTagFilter] = useState<string[]>([])
  const [completionDateFilter, setCompletionDateFilter] = useState<'all' | 'today' | 'yesterday' | 'thisWeek' | 'lastWeek' | 'thisMonth'>('all')
  const [currentViewState, setCurrentViewState] = useState<ViewType | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date>(new Date()) // 오늘 할일의 현재 선택된 날짜
  
  const { getTomorrowTodos, getYesterdayIncompleteTodos, todos } = useTodos()
  const { currentUser, logout, isAnonymous } = useAuth()

  // 사용 가능한 태그 목록 추출
  const availableTags = Array.from(new Set(
    todos.flatMap(todo => todo.tags || [])
  )).sort()

  // 날짜 네비게이션 함수들
  const goToPreviousDay = () => {
    setSelectedDate(prev => subDays(prev, 1))
  }

  const goToNextDay = () => {
    setSelectedDate(prev => addDays(prev, 1))
  }

  const goToToday = () => {
    setSelectedDate(new Date())
  }

  // 스와이프 네비게이션 핸들러
  const handleSwipeNavigation = () => {
    switch (currentView) {
      case 'today':
        return {
          onSwipeLeft: goToNextDay,      // 왼쪽 스와이프 → 다음날
          onSwipeRight: goToPreviousDay  // 오른쪽 스와이프 → 이전날
        }
      case 'week':
        // WeeklyCalendarView의 navigation은 컴포넌트 내부에서 처리
        return {}
      case 'month':
        // MonthlyCalendarView의 navigation은 컴포넌트 내부에서 처리  
        return {}
      default:
        return {}
    }
  }

  // 스와이프 훅 설정
  const swipeHandlers = useSwipe(handleSwipeNavigation(), {
    minSwipeDistance: 60 // 최소 60px 스와이프 거리
  })

  // 선택된 날짜의 할일들 필터링
  // const getSelectedDateTodos = () => {
  //   return todos.filter(todo => {
  //     if (todo.dueDate && isSameDay(todo.dueDate, selectedDate)) {
  //       return true
  //     }
  //     // dueDate가 없으면 createdAt 기준으로 오늘 생성된 할일만
  //     if (!todo.dueDate && isSameDay(todo.createdAt, selectedDate)) {
  //       return true
  //     }
  //     return false
  //   })
  // }
  
  // AddTodoModal ref 설정
  useEffect(() => {
    if (addTodoModalRef) {
      addTodoModalRef.current = {
        open: () => setIsAddModalOpen(true)
      }
    }
  }, [addTodoModalRef])
  
  // 키보드 단축키 이벤트 리스너
  useEffect(() => {
    const handleOpenAddTodoModal = () => {
      setIsAddModalOpen(true)
    }
    
    const handleFocusSearch = () => {
      searchInputRef.current?.focus()
    }
    
    const handleToggleSidebar = () => {
      onToggleSidebar()
    }
    
    const handleSwitchView = (event: CustomEvent) => {
      const view = event.detail as ViewType
      setCurrentViewState(view)
    }
    
    // 커스텀 이벤트 리스너 등록
    window.addEventListener('openAddTodoModal', handleOpenAddTodoModal)
    window.addEventListener('focusSearch', handleFocusSearch)
    window.addEventListener('toggleSidebar', handleToggleSidebar)
    window.addEventListener('switchView', handleSwitchView as EventListener)
    
    return () => {
      window.removeEventListener('openAddTodoModal', handleOpenAddTodoModal)
      window.removeEventListener('focusSearch', handleFocusSearch)
      window.removeEventListener('toggleSidebar', handleToggleSidebar)
      window.removeEventListener('switchView', handleSwitchView as EventListener)
    }
  }, [searchInputRef, onToggleSidebar])
  
  // 실제 사용할 뷰는 currentViewState가 있으면 우선, 없으면 props의 currentView
  const activeView = currentViewState || currentView
  
  // currentView가 변경되면 currentViewState 초기화
  useEffect(() => {
    setCurrentViewState(null)
  }, [currentView])

  const handleClearFilters = () => {
    setSearchTerm('')
    setPriorityFilter('all')
    setTypeFilter('all')
    setProjectFilter('all')
    setTagFilter([])
    setCompletionDateFilter('all')
  }

  const getViewTitle = (view: ViewType | 'recurring' | 'history' | 'analytics' | 'vacation') => {
    switch (view) {
      case 'today':
        return '오늘 할일'
      case 'week':
        return '이번 주 할일'
      case 'month':
        return '이번 달 할일'
      case 'recurring':
        return '반복 태스크 관리'
      case 'history':
        return '완료 히스토리'
      case 'analytics':
        return '통계 및 데이터'
      case 'vacation':
        return '휴가 관리'
      default:
        return '할일'
    }
  }

  return (
    <div className="flex-1 flex flex-col bg-gray-50 dark:bg-gray-900" data-testid="main-content">
      <header className={`bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 ${isMobile ? 'px-3 py-0' : 'px-6 py-2'} flex-shrink-0`}>
        <div className={`flex items-center justify-between ${isMobile ? 'h-[44px]' : ''}`}>
          <div className="flex items-center gap-2">
            <button
              onClick={onToggleSidebar}
              className={`${isMobile ? 'p-1 min-w-[32px] min-h-[32px]' : 'p-2'} hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg flex items-center justify-center`}
              data-testid="menu-button"
            >
              <Menu className={`${isMobile ? 'w-4 h-4' : 'w-5 h-5'}`} />
            </button>
            <h2 className={`${isMobile ? 'text-sm font-medium leading-none' : 'text-2xl font-bold'} text-gray-900 dark:text-white`}>
              {getViewTitle(activeView)}
            </h2>
          </div>
          
          
          <div className="flex items-center gap-2">
            {/* 할일 추가 버튼 - 모든 뷰에서 표시 */}
            {activeView !== 'recurring' && activeView !== 'history' && activeView !== 'analytics' && activeView !== 'vacation' && (
              <button 
                onClick={() => setIsAddModalOpen(true)}
                className={`${isMobile ? 'p-1 min-w-[28px] min-h-[28px]' : 'btn-primary'} hidden md:flex items-center gap-2`}
              >
                <Plus className={`${isMobile ? 'w-3 h-3' : 'w-4 h-4'}`} />
                {!isMobile && '할일 추가'}
              </button>
            )}
            
            {/* 사용자 정보 및 인증 버튼 */}
            {currentUser ? (
              <div className="flex items-center gap-2">
                {!isMobile && (
                  <div className="flex items-center gap-2 px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-lg">
                    <User className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {isAnonymous ? '게스트' : (currentUser.displayName || currentUser.email)}
                    </span>
                    {isAnonymous && (
                      <span className="text-xs text-yellow-600 dark:text-yellow-400 ml-1">
                        (임시)
                      </span>
                    )}
                  </div>
                )}
                <button
                  onClick={logout}
                  className={`${isMobile ? 'p-1 min-w-[28px] min-h-[28px]' : 'p-2'} hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-600 dark:text-gray-300 flex items-center justify-center`}
                  title="로그아웃"
                >
                  <LogOut className={`${isMobile ? 'w-3 h-3' : 'w-4 h-4'}`} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsAuthModalOpen(true)}
                className={`btn-secondary flex items-center gap-2 ${isMobile ? 'px-1 py-1 min-w-[28px] min-h-[28px]' : ''}`}
              >
                <User className={`${isMobile ? 'w-3 h-3' : 'w-4 h-4'}`} />
                {!isMobile && '로그인'}
              </button>
            )}
          </div>
        </div>
      </header>
      
      <main 
        className={`flex-1 ${isMobile ? 'p-4' : 'p-6'} overflow-y-auto`}
        {...(isMobile && (currentView === 'today' || currentView === 'week' || currentView === 'month') ? {
          onTouchStart: swipeHandlers.onTouchStart,
          onTouchMove: swipeHandlers.onTouchMove,
          onTouchEnd: swipeHandlers.onTouchEnd
        } : {})}
      >
        <div className={`${isMobile ? 'w-full' : 'max-w-7xl'} mx-auto`}>
          
          {activeView !== 'recurring' && activeView !== 'history' && activeView !== 'analytics' && activeView !== 'vacation' && (
            <SearchFilter
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              priorityFilter={priorityFilter}
              onPriorityFilterChange={setPriorityFilter}
              typeFilter={typeFilter}
              onTypeFilterChange={setTypeFilter}
              projectFilter={projectFilter}
              onProjectFilterChange={setProjectFilter}
              tagFilter={tagFilter}
              onTagFilterChange={setTagFilter}
              completionDateFilter={completionDateFilter}
              onCompletionDateFilterChange={setCompletionDateFilter}
              onClearFilters={handleClearFilters}
              searchInputRef={searchInputRef}
              availableTags={availableTags}
            />
          )}
          
          {activeView === 'recurring' ? (
            <RecurringManagement />
          ) : activeView === 'history' ? (
            <CompletedHistoryView
              searchTerm={searchTerm}
              priorityFilter={priorityFilter}
              typeFilter={typeFilter}
              projectFilter={projectFilter}
              tagFilter={tagFilter}
            />
          ) : activeView === 'today' ? (
            <div className={`${isMobile ? 'space-y-6' : 'grid grid-cols-1 lg:grid-cols-12 gap-6'}`}>
              {/* 모바일에서 먼저 보여줄 통계 - 더 콤팩트하게 */}
              {isMobile && (
                <div className="bg-white dark:bg-gray-800 rounded-lg px-3 py-1.5 border border-gray-200 dark:border-gray-700 mb-2 overflow-x-auto">
                  <div className="flex justify-center items-center gap-4 min-w-[280px]">
                    <StatsCard layout="compact" />
                    <div className="w-px h-4 bg-gray-300 dark:bg-gray-600"></div>
                    <ProjectAnalysis layout="compact" />
                  </div>
                </div>
              )}
              
              {/* 어제 못한 일 - 왼쪽 */}
              <div className={`${isMobile ? '' : 'lg:col-span-2'}`}>
                <div className={`${isMobile ? '' : 'sticky top-0'}`}>
                  <div className="mb-3">
                    <h3 className="text-base font-semibold text-orange-600 dark:text-orange-400">
                      어제 못한 일
                    </h3>
                    {getYesterdayIncompleteTodos(selectedDate).length === 0 && (
                      <div className="text-center mt-2">
                        <span className="text-xs text-gray-400 dark:text-gray-500">
                          없음
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    {getYesterdayIncompleteTodos(selectedDate).slice(0, 8).map(todo => (
                      <div key={todo.id} className="p-2 bg-orange-50 dark:bg-orange-900/20 rounded border border-orange-200 dark:border-orange-800">
                        <div className="text-sm text-orange-700 dark:text-orange-300 truncate">{todo.title}</div>
                        {todo.type === 'project' && (
                          <div className="text-xs text-orange-500 dark:text-orange-400 mt-1">
                            {todo.project === 'longterm' ? '롱텀' : '숏텀'}
                          </div>
                        )}
                        {todo.dueTime && (
                          <div className="text-xs text-orange-500 dark:text-orange-400">
                            {todo.dueTime}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* 오늘 할일 - 메인 */}
              <div className={`${isMobile ? '' : 'lg:col-span-6'}`}>
                <div className={`flex items-center justify-between mb-4 ${isMobile ? 'overflow-x-auto' : ''}`}>
                  <h3 className={`${isMobile ? 'text-base flex-shrink-0' : 'text-lg'} font-semibold text-gray-900 dark:text-white ${isMobile ? 'min-w-[120px]' : ''}`}>
                    {isToday(selectedDate) ? '오늘 할일' : `${format(selectedDate, 'M월 d일 (E)', { locale: ko })} 할일`}
                  </h3>
                  <div className={`flex items-center gap-1 ${isMobile ? 'flex-shrink-0' : ''}`}>
                    <button
                      onClick={goToPreviousDay}
                      className="p-1.5 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                      title="이전 날"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={goToToday}
                      className={`px-2 py-1 text-xs rounded transition-colors ${
                        isToday(selectedDate) 
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300' 
                          : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                      title="오늘로 이동"
                    >
                      <Calendar className="w-3 h-3" />
                    </button>
                    <button
                      onClick={goToNextDay}
                      className="p-1.5 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                      title="다음 날"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <TodoList 
                  currentView={activeView} 
                  searchTerm={searchTerm}
                  priorityFilter={priorityFilter}
                  typeFilter={typeFilter}
                  projectFilter={projectFilter}
                  tagFilter={tagFilter}
                  completionDateFilter={completionDateFilter}
                  selectedDate={selectedDate}
                />
              </div>

              {/* 내일 할일 - 오른쪽 */}
              <div className={`${isMobile ? '' : 'lg:col-span-4'}`}>
                <div className={`${isMobile ? '' : 'sticky top-0'}`}>
                  <div className="mb-3">
                    <h3 className="text-base font-semibold text-blue-600 dark:text-blue-400">
                      내일 할일
                    </h3>
                    {getTomorrowTodos(selectedDate).length === 0 && (
                      <div className="text-center mt-2">
                        <span className="text-xs text-gray-400 dark:text-gray-500">
                          없음
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    {getTomorrowTodos(selectedDate).slice(0, 8).map(todo => (
                      <div key={todo.id} className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800">
                        <div className="text-sm text-blue-700 dark:text-blue-300 truncate">{todo.title}</div>
                        {todo.type === 'project' && (
                          <div className="text-xs text-blue-500 dark:text-blue-400 mt-1">
                            {todo.project === 'longterm' ? '롱텀' : '숏텀'}
                          </div>
                        )}
                        {todo.dueTime && (
                          <div className="text-xs text-blue-500 dark:text-blue-400">
                            {todo.dueTime}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : activeView === 'week' ? (
            <WeeklyCalendarView
              searchTerm={searchTerm}
              priorityFilter={priorityFilter}
              typeFilter={typeFilter}
              projectFilter={projectFilter}
              tagFilter={tagFilter}
              completionDateFilter={completionDateFilter}
              onAddTodo={() => setIsAddModalOpen(true)}
              isMobile={isMobile}
            />
          ) : activeView === 'month' ? (
            <MonthlyCalendarView
              searchTerm={searchTerm}
              priorityFilter={priorityFilter}
              typeFilter={typeFilter}
              projectFilter={projectFilter}
              tagFilter={tagFilter}
              completionDateFilter={completionDateFilter}
              onAddTodo={() => setIsAddModalOpen(true)}
              isMobile={isMobile}
            />
          ) : activeView === 'analytics' ? (
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">할일 통계</h3>
                  <StatsCard layout="full" />
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">프로젝트 분석</h3>
                  <ProjectAnalysis layout="full" />
                </div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">데이터 관리</h3>
                <DataBackup />
              </div>
            </div>
          ) : activeView === 'vacation' ? (
            <div className="max-w-7xl mx-auto">
              <VacationDashboard />
            </div>
          ) : (
            <div className="max-w-4xl mx-auto">
              <TodoList 
                currentView={activeView} 
                searchTerm={searchTerm}
                priorityFilter={priorityFilter}
                typeFilter={typeFilter}
                projectFilter={projectFilter}
                tagFilter={tagFilter}
                completionDateFilter={completionDateFilter}
              />
            </div>
          )}
        </div>
      </main>


      <AddTodoModal 
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
      />
      
      <AuthModal 
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />
      <FloatingActionButton onClick={() => setIsAddModalOpen(true)} />
    </div>
  )
}

export default MainContent