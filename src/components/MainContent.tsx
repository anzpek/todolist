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
  User
} from 'lucide-react'
import { format, addDays, subDays, addWeeks, subWeeks, addMonths, subMonths, isSameDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns'
import { ko } from 'date-fns/locale'
import TodoList from './TodoList'
import WeeklyCalendarView from './WeeklyCalendarView'
import MonthlyCalendarView from './MonthlyCalendarView'
import StatsCard from './StatsCard'
import ProjectAnalysis from './ProjectAnalysis'
import RecurringManagement from './RecurringManagement'
import CompletedHistoryView from './CompletedHistoryView'
import VacationDashboard from './VacationManagement/VacationDashboard'
import SettingsView from './SettingsView'
import FloatingActionButton from './FloatingActionButton'
import AddTodoModal from './AddTodoModal'
import EditTodoModal from './EditTodoModal'
import SearchFilter from './SearchFilter'
import TodoItem from './TodoItem'
import { useTodos } from '../contexts/TodoContext'
import { useAuth } from '../contexts/AuthContext'
import type { Priority, TaskType, Todo } from '../types/todo'

interface MainContentProps {
  currentView: 'today' | 'week' | 'month' | 'settings' | 'analytics' | 'recurring' | 'history' | 'vacation'
  isSidebarOpen: boolean
  onToggleSidebar: () => void
  searchInputRef?: any
  addTodoModalRef?: any
  isMobile?: boolean
}

const MainContent = ({ currentView, isSidebarOpen, onToggleSidebar, searchInputRef, isMobile }: MainContentProps) => {
  const { currentUser } = useAuth()
  const { allTags } = useTodos()
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null)
  const [selectedDate, setSelectedDate] = useState(new Date())

  // Search and Filter states
  const [searchQuery, setSearchQuery] = useState('')
  const [filterPriority, setFilterPriority] = useState<Priority | 'all'>('all')
  const [typeFilter, setTypeFilter] = useState<TaskType | 'all'>('all')
  const [projectFilter, setProjectFilter] = useState<'all' | 'longterm' | 'shortterm'>('all')
  const [filterTags, setFilterTags] = useState<string[]>([])
  const [completionDateFilter, setCompletionDateFilter] = useState<'all' | 'today' | 'yesterday' | 'thisWeek' | 'lastWeek' | 'thisMonth'>('all')

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
  }

  const handleEditTodo = (todo: Todo) => {
    setEditingTodo(todo)
  }

  return (
    <main className={`flex-1 min-w-0 transition-all duration-300 ease-in-out ${isSidebarOpen ? 'lg:ml-64' : 'lg:ml-20'
      }`}>
      {/* Header Section */}
      <header className="bg-white/70 dark:bg-gray-900/70 backdrop-blur-md border-b border-white/20 dark:border-white/10 sticky top-0 z-20">
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
                {currentView === 'today' && 'Today'}
                {currentView === 'week' && 'Weekly Calendar'}
                {currentView === 'month' && 'Monthly Calendar'}
                {currentView === 'settings' && 'Settings'}
                {currentView === 'analytics' && 'Analytics'}
                {currentView === 'recurring' && 'Recurring Tasks'}
                {currentView === 'history' && 'History'}
                {currentView === 'vacation' && 'Vacation Management'}
              </h1>
            </div>

            {/* User Profile & Add Button */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="hidden sm:flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors shadow-sm hover:shadow-md"
              >
                <Plus className="w-5 h-5" />
                <span className="font-medium">할일 추가</span>
              </button>

              <div className="h-8 w-px bg-gray-200 hidden sm:block"></div>

              <div className="flex items-center gap-3">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{currentUser?.displayName || 'User'}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{currentUser?.email || 'user@example.com'}</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center overflow-hidden border border-indigo-200">
                  {currentUser?.photoURL ? (
                    <img src={currentUser.photoURL} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-6 h-6 text-indigo-600" />
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
            {(currentView === 'today' || currentView === 'week' || currentView === 'month') && (
              <div className="flex items-center justify-center gap-4 glass-panel p-2">
                <button onClick={handlePrev} className="p-1 hover:bg-gray-200 rounded-full">
                  <ChevronLeft className="w-5 h-5 text-gray-600" />
                </button>
                <div className="flex items-center gap-2">
                  <CalendarIcon className="w-5 h-5 text-indigo-600" />
                  <span className="text-lg font-medium text-gray-900 dark:text-white">
                    {currentView === 'week'
                      ? `${format(startOfWeek(selectedDate, { weekStartsOn: 0 }), 'M월 d일', { locale: ko })} - ${format(endOfWeek(selectedDate, { weekStartsOn: 0 }), 'M월 d일', { locale: ko })}`
                      : currentView === 'month'
                        ? format(selectedDate, 'yyyy년 M월', { locale: ko })
                        : format(selectedDate, 'yyyy년 M월 d일 (EEE)', { locale: ko })
                    }
                  </span>
                </div>
                <button onClick={handleNext} className="p-1 hover:bg-gray-200 rounded-full">
                  <ChevronRight className="w-5 h-5 text-gray-600" />
                </button>
                <button
                  onClick={handleToday}
                  className="px-3 py-1 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-md border border-indigo-200 dark:border-indigo-500/30 ml-2"
                >
                  Today
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
            onAddTodo={() => setIsAddModalOpen(true)}
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
              onAddTodo={() => setIsAddModalOpen(true)}
              isMobile={isMobile}
            />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <TodoList currentView="month" onEdit={handleEditTodo} />
              <div className="hidden lg:block">
                <ProjectAnalysis />
              </div>
            </div>
          </div>
        ) : currentView === 'analytics' ? (
          <div className="w-full space-y-8">
            <StatsCard />
            <ProjectAnalysis />
          </div>
        ) : currentView === 'recurring' ? (
          <RecurringManagement />
        ) : currentView === 'history' ? (
          <CompletedHistoryView />
        ) : currentView === 'vacation' ? (
          <VacationDashboard />
        ) : currentView === 'settings' ? (
          <SettingsView />
        ) : null}
      </div>

      {/* Mobile Floating Action Button */}
      <div className="md:hidden">
        <FloatingActionButton onClick={() => setIsAddModalOpen(true)} />
      </div>

      {/* Add Todo Modal */}
      <AddTodoModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
      />

      {/* Edit Todo Modal */}
      {editingTodo && (
        <EditTodoModal
          isOpen={!!editingTodo}
          onClose={() => setEditingTodo(null)}
          todo={editingTodo}
        />
      )}
    </main>
  )
}

export default MainContent