import { useState, useEffect } from 'react'
import {
  Calendar as CalendarIcon,
  CheckCircle2,
  Clock,
  Layout,
  Settings,
  Menu,
  Plus,
  Search,
  Filter,
  X,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  User,
  Users
} from 'lucide-react'
import { format, addDays, subDays, addWeeks, subWeeks, addMonths, subMonths, isSameDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns'
import { ko, enUS } from 'date-fns/locale'
import TodoList from './TodoList'
import WeeklyCalendarView from './WeeklyCalendarView'
import MonthlyCalendarView from './MonthlyCalendarView'
import BoardView from './BoardView'
import StatsCard from './StatsCard'
import ProjectAnalysis from './ProjectAnalysis'
import RecurringManagement from './RecurringManagement'
import CompletedHistoryView from './CompletedHistoryView'
import VacationDashboard from './VacationManagement/VacationDashboard'
import SettingsView from './SettingsView'
import FloatingActionButton from './FloatingActionButton'
import AddTodoModal from './AddTodoModal'
import HelpGuide from './HelpGuide'
import EditTodoModal from './EditTodoModal'
import SharingSettingsView from './SharingSettingsView'
import SearchFilter from './SearchFilter'
import SharingQuickFilter, { type SharingFilterState } from './SharingQuickFilter'
import TodoItem from './TodoItem'
import NotificationCenter from './NotificationCenter'
import { useTodos } from '../contexts/TodoContext'
import { useAuth } from '../contexts/AuthContext'
import { useTranslation } from 'react-i18next'
import type { Priority, TaskType, Todo } from '../types/todo'
import { App } from '@capacitor/app'
import { useTheme } from '../contexts/ThemeContext'
import { firestoreService } from '../services/firestoreService'

interface MainContentProps {
  currentView: 'today' | 'week' | 'month' | 'board' | 'settings' | 'analytics' | 'recurring' | 'history' | 'vacation' | 'guide' | 'sharing'
  isSidebarOpen: boolean
  onToggleSidebar: () => void
  searchInputRef?: any
  addTodoModalRef?: any
  isMobile?: boolean
}

const MainContent = ({ currentView, isSidebarOpen, onToggleSidebar, searchInputRef, isMobile }: MainContentProps) => {
  const { t, i18n } = useTranslation()
  const dateLocale = i18n.language === 'ko' ? ko : enUS
  const { currentUser } = useAuth()
  const { allTags } = useTodos()
  // Add useTheme hook
  const { currentTheme, isDark } = useTheme()
  const isVisualTheme = !!currentTheme.bg

  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null)
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [initialDateForAdd, setInitialDateForAdd] = useState<Date | undefined>(undefined)

  // Search and Filter states
  const [searchQuery, setSearchQuery] = useState('')
  const [filterPriority, setFilterPriority] = useState<Priority | 'all'>('all')
  const [typeFilter, setTypeFilter] = useState<TaskType | 'all'>('all')
  const [projectFilter, setProjectFilter] = useState<'all' | 'longterm' | 'shortterm'>('all')
  const [filterTags, setFilterTags] = useState<string[]>([])
  const [completionDateFilter, setCompletionDateFilter] = useState<'all' | 'today' | 'yesterday' | 'thisWeek' | 'lastWeek' | 'thisMonth'>('all')

  // 새로운 공유 필터 상태 (3개 토글 + 그룹 선택)
  // 새로운 공유 필터 상태 (3개 토글 + 그룹 선택)
  const [sharingFilterState, setSharingFilterState] = useState<SharingFilterState>(() => {
    const saved = localStorage.getItem('sharingFilterState')
    if (saved) {
      try {
        return JSON.parse(saved)
      } catch (e) {
        console.error('Failed to parse sharingFilterState', e)
      }
    }
    return {
      showPersonal: true,
      showMyShared: true,
      showGroupShared: true,
      selectedGroupId: null
    }
  })

  // 필터 상태 유지
  useEffect(() => {
    localStorage.setItem('sharingFilterState', JSON.stringify(sharingFilterState))
  }, [sharingFilterState])

  const [isSharingFilterModalOpen, setIsSharingFilterModalOpen] = useState(false)

  // sharingFilterState를 기존 하위 컴포넌트에서 사용하던 형식으로 변환
  // 하위 컴포넌트들은 아직 새 형식을 지원하지 않으므로 호환성 유지
  const sharingFilter = (() => {
    // 모두 선택된 경우: 전체
    if (sharingFilterState.showPersonal && sharingFilterState.showMyShared && sharingFilterState.showGroupShared) {
      return sharingFilterState.selectedGroupId || 'all'
    }
    // 개인만 선택
    if (sharingFilterState.showPersonal && !sharingFilterState.showMyShared && !sharingFilterState.showGroupShared) {
      return 'private'
    }
    // 내가 공유한 것만
    if (!sharingFilterState.showPersonal && sharingFilterState.showMyShared && !sharingFilterState.showGroupShared) {
      return 'my_shared'
    }
    // 그룹 공유(받은)만
    if (!sharingFilterState.showPersonal && !sharingFilterState.showMyShared && sharingFilterState.showGroupShared) {
      return 'shared'
    }
    // 복합 선택: 전체로 처리하되 필터링은 sharingFilterState로 직접 수행
    return 'all'
  })()
  useEffect(() => {
    if (currentView === 'board') {
      setCompletionDateFilter('today')
    }
  }, [currentView])

  // 딥링크 이벤트 수신: 할일 추가 모달 열기
  useEffect(() => {
    const handleOpenAddModal = () => {
      console.log('Received openAddTodoModal event')
      setInitialDateForAdd(undefined)
      setIsAddModalOpen(true)
    }

    window.addEventListener('openAddTodoModal', handleOpenAddModal)
    return () => {
      window.removeEventListener('openAddTodoModal', handleOpenAddModal)
    }
  }, [])

  // 초대 수락 감지 및 자동 처리 (Sender Side Sync)
  useEffect(() => {
    if (!currentUser?.uid) return

    const unsubscribe = firestoreService.subscribeToSentInvitations(
      currentUser.uid,
      async (requests) => {
        // 수락된 요청만 필터링하여 처리
        const acceptedRequests = requests.filter(r => r.status === 'accepted')

        for (const req of acceptedRequests) {
          console.log('🔔 수락된 초대 감지:', req.toEmail)
          try {
            await firestoreService.processAcceptedInvitation(req)
          } catch (error) {
            console.error('초대 처리 중 오류 발생:', error)
          }
        }
      }
    )
    return () => unsubscribe()
  }, [currentUser?.uid])

  const handleDateChange = (date: Date) => {
    setSelectedDate(date)
  }

  const handlePrev = () => {
    if (currentView === 'week') {
      setSelectedDate(prev => subWeeks(prev, 1))
    } else if (currentView === 'month') {
      setSelectedDate(prev => subMonths(prev, 1))
    } else {
      setSelectedDate(prev => subDays(prev, 1))
    }
  }

  const handleNext = () => {
    if (currentView === 'week') {
      setSelectedDate(prev => addWeeks(prev, 1))
    } else if (currentView === 'month') {
      setSelectedDate(prev => addMonths(prev, 1))
    } else {
      setSelectedDate(prev => addDays(prev, 1))
    }
  }

  const handleToday = () => {
    setSelectedDate(new Date())
  }

  const handleClearFilters = () => {
    setSearchQuery('')
    setFilterPriority('all')
    setTypeFilter('all')
    setProjectFilter('all')
    setFilterTags([])
    setCompletionDateFilter('all')
    setSharingFilterState({
      showPersonal: true,
      showMyShared: true,
      showGroupShared: true,
      selectedGroupId: null
    })
  }

  const handleEditTodo = (todo: Todo) => {
    setEditingTodo(todo)
  }

  // Android Back Button Handling
  useEffect(() => {
    let lastBackPress = 0;

    const handleBackButton = async () => {
      const now = Date.now();

      // 1. Close Add Modal if open
      if (isAddModalOpen) {
        setIsAddModalOpen(false);
        setInitialDateForAdd(undefined);
        return;
      }

      // 2. Close Edit Modal if open
      if (editingTodo) {
        setEditingTodo(null);
        return;
      }

      // 3. Close Sidebar if open on mobile
      if (isMobile && isSidebarOpen) {
        onToggleSidebar();
        return;
      }

      // 4. If current view is NOT 'today', go to 'today' (optional UX, good for "Home" feel)
      /* 
      // User asked: "navigate back to previous screen". Since we don't have a history stack for views, 
      // treating 'today' as home is a common pattern.
      if (currentView !== 'today') {
        // We need a way to change view. But 'currentView' prop is passed down.
        // MainContent receives currentView but cannot change it directly?
        // Wait, MainContent receives `currentView` props, but NO setter.
        // It's controlled by App/AppInner. MainContent cannot change the view directly unless we pass the setter.
        // Refactoring to pass `setCurrentView` is risky.
        // I will skip this part for now or check if I can trigger it.
        // Actually, AppInner passes `setCurrentView` to `Sidebar` and `BottomNavigation`.
        // MainContent does NOT receive `setCurrentView`.
        // So I can't implement "Go Home" here easily without prop drilling.
        // However, user said "Previous screen".
        // I'll stick to: Close Modals -> Confirm Exit.
      }
      */

      // 5. Confirm Exit
      if (now - lastBackPress < 2000) {
        App.exitApp();
      } else {
        lastBackPress = now;
        // Native toast would be better, but we don't have a native toast plugin installed?
        // Let's use a simple DOM toast or alert? Alert is blocking.
        // Or just let them double tap.
        // The user asked: "Ask if they want to exit". 
        // "어플을 종료하시겠습니까? 라고 물어보고 종료하게 만들어줬으면 좋겠어." => Confirmation Dialog.

        const confirmExit = window.confirm(t('common.confirmExit') || '앱을 종료하시겠습니까?');
        if (confirmExit) {
          App.exitApp();
        }
      }
    };

    const setupListener = async () => {
      try {
        await App.addListener('backButton', handleBackButton);
      } catch (e) {
        console.warn('Back button listener setup failed:', e);
      }
    };

    setupListener();

    return () => {
      App.removeAllListeners();
    };
  }, [isAddModalOpen, editingTodo, isSidebarOpen, isMobile, onToggleSidebar, t]);

  return (
    <main className={`flex-1 min-w-0 transition-all duration-300 ease-in-out ${isSidebarOpen ? 'lg:ml-64' : 'lg:ml-20'
      }`}>
      {/* Header Section */}
      <header
        className={`border-b border-white/20 dark:border-white/10 sticky top-0 z-20 pt-[env(safe-area-inset-top)] 
          ${isVisualTheme
            ? 'shadow-none border-white/30 dark:border-white/20 backdrop-blur-none transition-[background-color] duration-200'
            : 'bg-white/70 dark:bg-gray-900/70 backdrop-blur-md'
          }`}
        style={isVisualTheme ? { backgroundColor: `rgba(${isDark ? '0, 0, 0' : '255, 255, 255'}, var(--glass-opacity, 0.1))` } : {}}
      >
        <div className="px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <button
                onClick={onToggleSidebar}
                className="p-2 hover:bg-gray-100 rounded-lg lg:hidden"
              >
                <Menu className="w-6 h-6 text-gray-600" />
              </button>
              <h1 className="text-2xl font-bold text-gray-900">
                {currentView === 'today' && t('nav.today')}
                {currentView === 'week' && t('nav.week')}
                {currentView === 'month' && t('nav.month')}
                {currentView === 'board' && (t('nav.board') || 'Kanban Board')}
                {currentView === 'settings' && t('nav.settings')}
                {currentView === 'analytics' && t('nav.analytics')}
                {currentView === 'recurring' && t('nav.recurring')}
                {currentView === 'history' && t('nav.history')}
                {currentView === 'vacation' && t('nav.vacation')}
                {currentView === 'guide' && t('guide.title')}
              </h1>
            </div>

            {/* User Profile & Add Button */}
            <div className="flex items-center gap-4">

              {/* Quick Sharing Filter (Visible on all views) */}
              <div className="hidden lg:block">
                <SharingQuickFilter
                  filterState={sharingFilterState}
                  onChange={setSharingFilterState}
                />
              </div>

              {/* Mobile Sharing Filter Button */}
              <button
                onClick={() => setIsSharingFilterModalOpen(true)}
                className="lg:hidden p-2 text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 rounded-lg relative"
              >
                <Users className="w-6 h-6" />
                {(!sharingFilterState.showPersonal || !sharingFilterState.showMyShared || !sharingFilterState.showGroupShared || sharingFilterState.selectedGroupId) && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-blue-500 rounded-full" />
                )}
              </button>

              <NotificationCenter />

              <button
                onClick={() => {
                  setInitialDateForAdd(undefined)
                  setIsAddModalOpen(true)
                }}
                className="hidden sm:flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors shadow-sm hover:shadow-md"
              >
                <Plus className="w-5 h-5" />
                <span className="font-medium">{t('common.addTodo')}</span>
              </button>

              <div className="h-8 w-px bg-gray-200 hidden sm:block"></div>

              <div className="flex items-center gap-3">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{currentUser?.displayName || 'User'}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{currentUser?.email || 'user@example.com'}</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center overflow-hidden border border-primary-200">
                  {currentUser?.photoURL ? (
                    <img src={currentUser.photoURL} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-6 h-6 text-primary-600" />
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Search and Date Navigation Stack */}
          <div className="space-y-4">
            {/* Full Width Search Filter */}
            <div className="w-full">
              <SearchFilter
                searchTerm={searchQuery}
                onSearchChange={setSearchQuery}
                priorityFilter={filterPriority}
                onPriorityFilterChange={setFilterPriority}
                typeFilter={typeFilter}
                onTypeFilterChange={setTypeFilter}
                projectFilter={projectFilter}
                onProjectFilterChange={setProjectFilter}
                tagFilter={filterTags}
                onTagFilterChange={setFilterTags}
                completionDateFilter={completionDateFilter}
                onCompletionDateFilterChange={setCompletionDateFilter}
                onClearFilters={handleClearFilters}
                availableTags={allTags}
                searchInputRef={searchInputRef}
              />
            </div>

            {/* Date Navigation (Only for calendar views) */}
            {(currentView === 'today' || currentView === 'week' || currentView === 'month' || currentView === 'board') && (
              <div className="flex items-center justify-center gap-4 glass-panel p-2">
                <button onClick={handlePrev} className="p-1 hover:bg-gray-200 rounded-full">
                  <ChevronLeft className="w-5 h-5 text-gray-600" />
                </button>
                <div
                  onClick={() => {
                    const input = document.getElementById('date-picker-input') as HTMLInputElement
                    if (input && 'showPicker' in HTMLInputElement.prototype) {
                      try {
                        input.showPicker()
                      } catch (err) {
                        // Fallback or ignore
                        input.focus()
                      }
                    } else if (input) {
                      input.focus()
                      input.click() // Try triggering click directly on input
                    }
                  }}
                  className="relative flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer group"
                >
                  <input
                    id="date-picker-input"
                    type="date"
                    value={format(selectedDate, 'yyyy-MM-dd')}
                    onChange={(e) => {
                      if (e.target.value) {
                        handleDateChange(new Date(e.target.value))
                      }
                    }}
                    className="sr-only"
                    aria-label="Select date"
                  />
                  <CalendarIcon className="w-5 h-5 text-primary-600 group-hover:text-primary-700 dark:text-primary-400 dark:group-hover:text-primary-300 transition-colors" />
                  <span className="text-lg font-medium text-gray-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                    {currentView === 'week'
                      ? `${format(startOfWeek(selectedDate, { weekStartsOn: 0 }), i18n.language === 'ko' ? 'M월 d일' : 'MMM d', { locale: dateLocale })} - ${format(endOfWeek(selectedDate, { weekStartsOn: 0 }), i18n.language === 'ko' ? 'M월 d일' : 'MMM d', { locale: dateLocale })}`
                      : currentView === 'month'
                        ? format(selectedDate, i18n.language === 'ko' ? 'yyyy년 M월' : 'MMMM yyyy', { locale: dateLocale })
                        : format(selectedDate, i18n.language === 'ko' ? 'yyyy년 M월 d일 (EEE)' : 'MMM d yyyy (EEE)', { locale: dateLocale })
                    }
                  </span>
                </div>
                <button onClick={handleNext} className="p-1 hover:bg-gray-200 rounded-full">
                  <ChevronRight className="w-5 h-5 text-gray-600" />
                </button>
                <button
                  onClick={handleToday}
                  className="px-3 py-1 text-sm font-medium text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/30 rounded-md border border-primary-200 dark:border-primary-500/30 ml-2"
                >
                  {t('common.today')}
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="p-4 sm:p-6 lg:p-8 max-w-[1920px] mx-auto">
        {currentView === 'today' ? (
          <TodoList
            currentView="today"
            searchTerm={searchQuery}
            priorityFilter={filterPriority}
            typeFilter={typeFilter}
            projectFilter={projectFilter}
            tagFilter={filterTags}
            completionDateFilter={completionDateFilter}
            sharingFilter={sharingFilter}
            sharingFilterState={sharingFilterState}
            selectedDate={selectedDate}
            onDateChange={handleDateChange}
            onEdit={handleEditTodo}
          />
        ) : currentView === 'week' ? (
          <WeeklyCalendarView
            currentDate={selectedDate}
            onDateChange={handleDateChange}
            searchTerm={searchQuery}
            priorityFilter={filterPriority}
            typeFilter={typeFilter}
            projectFilter={projectFilter}
            tagFilter={filterTags}
            completionDateFilter={completionDateFilter}
            sharingFilter={sharingFilter}
            sharingFilterState={sharingFilterState}
            onAddTodo={(date) => {
              setInitialDateForAdd(date)
              setIsAddModalOpen(true)
            }}
            isMobile={isMobile}
          />
        ) : currentView === 'month' ? (
          <div className="space-y-8">
            <MonthlyCalendarView
              currentDate={selectedDate}
              onDateChange={handleDateChange}
              searchTerm={searchQuery}
              priorityFilter={filterPriority}
              typeFilter={typeFilter}
              projectFilter={projectFilter}
              tagFilter={filterTags}
              completionDateFilter={completionDateFilter}
              sharingFilter={sharingFilter}
              sharingFilterState={sharingFilterState}
              onAddTodo={(date) => {
                setInitialDateForAdd(date)
                setIsAddModalOpen(true)
              }}
              isMobile={isMobile}
            />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <TodoList currentView="month" onEdit={handleEditTodo} sharingFilter={sharingFilter} sharingFilterState={sharingFilterState} />
              <div className="hidden lg:block">
                <ProjectAnalysis />
              </div>
            </div>
          </div>
        ) : currentView === 'board' ? (
          <BoardView
            searchTerm={searchQuery}
            priorityFilter={filterPriority}
            typeFilter={typeFilter}
            projectFilter={projectFilter}
            tagFilter={filterTags}
            completionDateFilter={completionDateFilter}
            onAddTodo={(priority) => {
              // We can pre-select priority!
              // But AddTodoModal doesn't accept priority prop yet?
              // Let's check AddTodoModal props or just open standard logic
              setInitialDateForAdd(undefined)
              setIsAddModalOpen(true)
            }}
            onEdit={handleEditTodo}
            isMobile={isMobile}
          />
        ) : currentView === 'analytics' ? (
          <div className="w-full space-y-8">
            <StatsCard />
            <ProjectAnalysis />
          </div>
        ) : currentView === 'recurring' ? (
          <RecurringManagement />
        ) : currentView === 'history' ? (
          <CompletedHistoryView
            searchTerm={searchQuery}
            priorityFilter={filterPriority}
            typeFilter={typeFilter}
            projectFilter={projectFilter}
            tagFilter={filterTags}
          />
        ) : currentView === 'vacation' ? (
          <div className="w-full h-[calc(100vh-100px)] rounded-xl overflow-hidden bg-white dark:bg-gray-900 shadow-sm border border-gray-200 dark:border-gray-800">
            <iframe
              src="https://anzpek.github.io/vacation-manager-react/"
              className="w-full h-full border-0"
              title="Vacation Management System"
              allow="clipboard-write"
            />
          </div>
        ) : currentView === 'settings' ? (
          <SettingsView />
        ) : currentView === 'guide' ? (
          <HelpGuide />
        ) : currentView === 'sharing' ? (
          <SharingSettingsView />
        ) : null}
      </div>

      {/* Mobile Floating Action Button */}
      <div className="md:hidden">
        <FloatingActionButton onClick={() => {
          setInitialDateForAdd(undefined)
          setIsAddModalOpen(true)
        }} />
      </div>

      {/* Add Todo Modal */}
      <AddTodoModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false)
          setInitialDateForAdd(undefined)
        }}
        initialDate={initialDateForAdd}
      />

      {/* Edit Todo Modal */}
      {editingTodo && (
        <EditTodoModal
          isOpen={!!editingTodo}
          onClose={() => setEditingTodo(null)}
          todo={editingTodo}
        />
      )}
      {/* Mobile Sharing Filter Modal */}
      {isSharingFilterModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4 sm:pt-32"
          onClick={() => setIsSharingFilterModalOpen(false)}
        >
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm transition-opacity" />

          <div
            className="relative w-full max-w-sm bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl rounded-2xl p-5 shadow-2xl border border-white/20 dark:border-white/10 ring-1 ring-black/5 animate-in slide-in-from-top-4 duration-200"
            onClick={e => e.stopPropagation()}
            style={{ maxHeight: 'calc(100vh - 140px)', overflowY: 'auto' }}
          >
            <div className="flex items-center justify-between mb-5 pb-4 border-b border-gray-200/50 dark:border-gray-700/50">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <Filter className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                {t('sharing.settingsTitle')}
              </h3>
              <button
                onClick={() => setIsSharingFilterModalOpen(false)}
                className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <SharingQuickFilter
              filterState={sharingFilterState}
              onChange={setSharingFilterState}
              isMobile={true}
            />

            <div className="mt-6 pt-4 border-t border-gray-200/50 dark:border-gray-700/50">
              <button
                onClick={() => setIsSharingFilterModalOpen(false)}
                className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-blue-500/25 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
              >
                <span>{t('common.confirm')}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

export default MainContent