import { useState } from 'react'
import { Calendar, Clock, ChevronDown, ChevronRight, CheckCircle, RotateCcw } from 'lucide-react'
import { useTodos } from '../contexts/TodoContext'
import { formatDateTime } from '../utils/helpers'
import type { Todo } from '../types/todo'

interface CompletedHistoryViewProps {
  searchTerm?: string
  priorityFilter?: string
  typeFilter?: string
  projectFilter?: string
  tagFilter?: string[]
}

const CompletedHistoryView = ({
  searchTerm = '',
  priorityFilter = 'all',
  typeFilter = 'all',
  projectFilter = 'all',
  tagFilter = []
}: CompletedHistoryViewProps) => {
  const { todos, toggleTodo, getRecurringTodos } = useTodos()
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['today']))
  const [viewMode, setViewMode] = useState<'period' | 'daily' | 'weekly' | 'monthly'>('period')

  // 모든 할일 (일반 + 반복 할일) 가져오기
  const recurringTodos = getRecurringTodos()
  const allTodos = [...todos, ...recurringTodos]

  console.log('📊 완료 히스토리 - 전체 할일:', allTodos.length)
  console.log('📊 완료 히스토리 - 일반 할일:', todos.length)
  console.log('📊 완료 히스토리 - 반복 할일:', recurringTodos.length)

  // 완료된 할일만 필터링 (일반 할일 + 반복 할일 포함)
  const completedMainTodos = allTodos.filter(todo => 
    todo.completed && 
    todo.completedAt &&
    // 검색 필터
    (searchTerm === '' || 
     todo.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
     (todo.description && todo.description.toLowerCase().includes(searchTerm.toLowerCase()))) &&
    // 우선순위 필터
    (priorityFilter === 'all' || todo.priority === priorityFilter) &&
    // 타입 필터
    (typeFilter === 'all' || todo.type === typeFilter) &&
    // 프로젝트 필터
    (projectFilter === 'all' || 
     (projectFilter === 'longterm' && todo.project === 'longterm') ||
     (projectFilter === 'shortterm' && todo.project === 'shortterm')) &&
    // 태그 필터
    (tagFilter.length === 0 || (todo.tags && tagFilter.every(tag => todo.tags?.includes(tag))))
  )

  // 완료된 하위 작업 수집
  const completedSubTasks: Array<Todo & { isSubTask: true, parentTitle: string }> = []
  
  allTodos.forEach(todo => {
    if (todo.subTasks && todo.subTasks.length > 0) {
      todo.subTasks
        .filter(subTask => subTask.completed && subTask.completedAt)
        .forEach(subTask => {
          // 하위 작업도 필터 적용
          const matchesSearch = searchTerm === '' || 
            subTask.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (subTask.description && subTask.description.toLowerCase().includes(searchTerm.toLowerCase()))
          
          const matchesPriority = priorityFilter === 'all' || subTask.priority === priorityFilter
          
          if (matchesSearch && matchesPriority) {
            completedSubTasks.push({
              ...subTask,
              type: 'simple' as const,
              recurrence: 'none' as const,
              isSubTask: true,
              parentTitle: todo.title,
              createdAt: subTask.createdAt,
              updatedAt: subTask.updatedAt
            })
          }
        })
    }
  })

  // 메인 할일과 하위 작업을 합쳐서 완료 시간 순으로 정렬
  const completedTodos = [...completedMainTodos, ...completedSubTasks].sort((a, b) => {
    const dateA = a.completedAt ? new Date(a.completedAt).getTime() : 0
    const dateB = b.completedAt ? new Date(b.completedAt).getTime() : 0
    return dateB - dateA // 최신순 정렬
  })

  console.log('📊 완료 히스토리 - 완료된 할일:', completedTodos.length)
  console.log('📊 완료 히스토리 - 완료된 반복 할일:', completedTodos.filter(t => (t as any)._isRecurringInstance).length)
  
  // 주간업무보고 특별 확인
  const weeklyReportCompleted = completedTodos.find(t => t.title === '주간업무보고')
  if (weeklyReportCompleted) {
    console.log('📊 완료 히스토리 - 주간업무보고 발견:', {
      title: weeklyReportCompleted.title,
      completed: weeklyReportCompleted.completed,
      completedAt: weeklyReportCompleted.completedAt,
      _isRecurringInstance: (weeklyReportCompleted as any)._isRecurringInstance
    })
  } else {
    console.log('📊 완료 히스토리 - 주간업무보고를 찾을 수 없음')
    console.log('📊 완료 히스토리 - 완료된 할일 제목들:', completedTodos.map(t => t.title))
  }

  // 날짜별로 그룹화
  const groupTodosByPeriod = () => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    
    const thisWeekStart = new Date(today)
    thisWeekStart.setDate(today.getDate() - today.getDay())
    
    const lastWeekStart = new Date(thisWeekStart)
    lastWeekStart.setDate(thisWeekStart.getDate() - 7)
    const lastWeekEnd = new Date(thisWeekStart)
    lastWeekEnd.setDate(thisWeekStart.getDate() - 1)
    
    const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1)
    const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1)
    const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0)
    
    const groups = {
      today: [] as Todo[],
      yesterday: [] as Todo[],
      thisWeek: [] as Todo[],
      lastWeek: [] as Todo[],
      thisMonth: [] as Todo[],
      lastMonth: [] as Todo[],
      older: [] as Todo[]
    }

    completedTodos.forEach(todo => {
      if (!todo.completedAt) return
      
      const completedDate = new Date(todo.completedAt)
      const completedDay = new Date(completedDate.getFullYear(), completedDate.getMonth(), completedDate.getDate())
      
      if (completedDay.getTime() === today.getTime()) {
        groups.today.push(todo)
      } else if (completedDay.getTime() === yesterday.getTime()) {
        groups.yesterday.push(todo)
      } else if (completedDate >= thisWeekStart && completedDay < today) {
        groups.thisWeek.push(todo)
      } else if (completedDate >= lastWeekStart && completedDate <= lastWeekEnd) {
        groups.lastWeek.push(todo)
      } else if (completedDate >= thisMonthStart && completedDate < thisWeekStart) {
        groups.thisMonth.push(todo)
      } else if (completedDate >= lastMonthStart && completedDate <= lastMonthEnd) {
        groups.lastMonth.push(todo)
      } else {
        groups.older.push(todo)
      }
    })

    // 각 그룹 내에서 완료 시간순 정렬 (최근 것부터)
    Object.values(groups).forEach(group => {
      group.sort((a, b) => {
        if (!a.completedAt || !b.completedAt) return 0
        return new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
      })
    })

    return groups
  }

  // 날짜별로 그룹화 (일간 뷰)
  const groupTodosByDay = () => {
    const groupedByDay: { [key: string]: Todo[] } = {}
    
    completedTodos.forEach(todo => {
      if (!todo.completedAt) return
      
      const completedDate = new Date(todo.completedAt)
      const dateKey = completedDate.toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'long'
      })
      
      if (!groupedByDay[dateKey]) {
        groupedByDay[dateKey] = []
      }
      groupedByDay[dateKey].push(todo)
    })

    // 각 날짜 그룹을 시간순으로 정렬
    Object.values(groupedByDay).forEach(group => {
      group.sort((a, b) => {
        if (!a.completedAt || !b.completedAt) return 0
        return new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
      })
    })

    // 날짜순으로 정렬된 키들 반환
    const sortedKeys = Object.keys(groupedByDay).sort((a, b) => {
      const dateA = new Date(groupedByDay[a][0].completedAt!)
      const dateB = new Date(groupedByDay[b][0].completedAt!)
      return dateB.getTime() - dateA.getTime()
    })

    return { groupedByDay, sortedKeys }
  }

  // 주별로 그룹화 (주간 뷰)
  const groupTodosByWeek = () => {
    const groupedByWeek: { [key: string]: Todo[] } = {}
    
    completedTodos.forEach(todo => {
      if (!todo.completedAt) return
      
      const completedDate = new Date(todo.completedAt)
      const weekStart = new Date(completedDate)
      weekStart.setDate(completedDate.getDate() - completedDate.getDay())
      weekStart.setHours(0, 0, 0, 0)
      
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekStart.getDate() + 6)
      
      const weekKey = `${weekStart.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })} ~ ${weekEnd.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })}`
      
      if (!groupedByWeek[weekKey]) {
        groupedByWeek[weekKey] = []
      }
      groupedByWeek[weekKey].push(todo)
    })

    // 각 주 그룹을 시간순으로 정렬
    Object.values(groupedByWeek).forEach(group => {
      group.sort((a, b) => {
        if (!a.completedAt || !b.completedAt) return 0
        return new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
      })
    })

    // 주순으로 정렬된 키들 반환
    const sortedKeys = Object.keys(groupedByWeek).sort((a, b) => {
      const dateA = new Date(groupedByWeek[a][0].completedAt!)
      const dateB = new Date(groupedByWeek[b][0].completedAt!)
      return dateB.getTime() - dateA.getTime()
    })

    return { groupedByWeek, sortedKeys }
  }

  // 월별로 그룹화 (월간 뷰)
  const groupTodosByMonth = () => {
    const groupedByMonth: { [key: string]: Todo[] } = {}
    
    completedTodos.forEach(todo => {
      if (!todo.completedAt) return
      
      const completedDate = new Date(todo.completedAt)
      const monthKey = completedDate.toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long'
      })
      
      if (!groupedByMonth[monthKey]) {
        groupedByMonth[monthKey] = []
      }
      groupedByMonth[monthKey].push(todo)
    })

    // 각 월 그룹을 시간순으로 정렬
    Object.values(groupedByMonth).forEach(group => {
      group.sort((a, b) => {
        if (!a.completedAt || !b.completedAt) return 0
        return new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
      })
    })

    // 월순으로 정렬된 키들 반환
    const sortedKeys = Object.keys(groupedByMonth).sort((a, b) => {
      const dateA = new Date(groupedByMonth[a][0].completedAt!)
      const dateB = new Date(groupedByMonth[b][0].completedAt!)
      return dateB.getTime() - dateA.getTime()
    })

    return { groupedByMonth, sortedKeys }
  }

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections)
    if (newExpanded.has(section)) {
      newExpanded.delete(section)
    } else {
      newExpanded.add(section)
    }
    setExpandedSections(newExpanded)
  }

  const renderTodoItem = (todo: Todo) => {
    const priorityColors = {
      low: 'text-gray-500 bg-gray-100 dark:bg-gray-800',
      medium: 'text-blue-700 bg-blue-100 dark:bg-blue-900/30',
      high: 'text-orange-700 bg-orange-100 dark:bg-orange-900/30',
      urgent: 'text-red-700 bg-red-100 dark:bg-red-900/30'
    }

    const handleUncomplete = () => {
      toggleTodo(todo.id)
    }

    return (
      <div key={todo.id} className="border-l-4 border-green-500 bg-green-50 dark:bg-green-900/10 p-4 rounded-r-lg">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <h3 className="font-medium text-green-800 dark:text-green-300 line-through">
                {(todo as any).isSubTask ? 
                  `↳ ${todo.title} (${(todo as any).parentTitle})` : 
                  todo.title
                }
              </h3>
              <span className={`px-2 py-1 rounded text-xs font-medium ${priorityColors[todo.priority]}`}>
                {todo.priority === 'low' && '낮음'}
                {todo.priority === 'medium' && '보통'}
                {todo.priority === 'high' && '높음'}
                {todo.priority === 'urgent' && '긴급'}
              </span>
              {(todo as any).isSubTask && (
                <span className="bg-indigo-200 dark:bg-indigo-800 text-indigo-700 dark:text-indigo-300 px-2 py-1 rounded text-xs font-medium">
                  하위 작업
                </span>
              )}
            </div>
            
            {todo.description && (
              <p className="text-sm text-green-700 dark:text-green-400 mb-2 line-through opacity-75">
                {todo.description}
              </p>
            )}
            
            <div className="flex items-center gap-4 text-xs text-green-600 dark:text-green-400">
              {todo.completedAt && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {formatDateTime(todo.completedAt)} 완료
                </span>
              )}
              
              {/* 반복 할일 표시 */}
              {(todo as any)._isRecurringInstance && (
                <span className="bg-purple-200 dark:bg-purple-800 px-2 py-1 rounded flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  반복 할일
                </span>
              )}
              
              {todo.type === 'project' && (
                <span className="bg-green-200 dark:bg-green-800 px-2 py-1 rounded">
                  {todo.project === 'longterm' ? '롱텀' : '숏텀'} 프로젝트
                </span>
              )}
              
              {todo.tags && todo.tags.length > 0 && (
                <div className="flex gap-1">
                  {todo.tags.map(tag => (
                    <span key={tag} className="bg-green-200 dark:bg-green-800 px-2 py-1 rounded">
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="flex-shrink-0 ml-4">
            <button
              onClick={handleUncomplete}
              className="p-2 hover:bg-green-200 dark:hover:bg-green-800 rounded-lg transition-colors"
              title="할일 목록으로 되돌리기"
            >
              <RotateCcw className="w-4 h-4 text-green-600 dark:text-green-400" />
            </button>
          </div>
        </div>
      </div>
    )
  }

  const renderSection = (title: string, todos: Todo[], key: string, icon: React.ReactNode) => {
    if (todos.length === 0) return null
    
    const isExpanded = expandedSections.has(key)
    
    return (
      <div key={key} className="mb-6">
        <button
          onClick={() => toggleSection(key)}
          className="w-full flex items-center justify-between p-3 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        >
          <div className="flex items-center gap-3">
            {icon}
            <span className="font-medium text-gray-900 dark:text-white">
              {title} ({todos.length}개)
            </span>
          </div>
          {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>
        
        {isExpanded && (
          <div className="mt-3 space-y-3">
            {todos.map(renderTodoItem)}
          </div>
        )}
      </div>
    )
  }

  const groups = groupTodosByPeriod()
  const dailyGroups = groupTodosByDay()
  const weeklyGroups = groupTodosByWeek()
  const monthlyGroups = groupTodosByMonth()
  const totalCompleted = completedTodos.length

  const renderCustomGroupedView = () => {
    if (viewMode === 'daily') {
      const { groupedByDay, sortedKeys } = dailyGroups
      return (
        <div className="space-y-4">
          {sortedKeys.map(dateKey => 
            renderSection(dateKey, groupedByDay[dateKey], `day-${dateKey}`, <Calendar className="w-5 h-5 text-blue-600" />)
          )}
        </div>
      )
    } else if (viewMode === 'weekly') {
      const { groupedByWeek, sortedKeys } = weeklyGroups
      return (
        <div className="space-y-4">
          {sortedKeys.map(weekKey => 
            renderSection(weekKey, groupedByWeek[weekKey], `week-${weekKey}`, <Calendar className="w-5 h-5 text-purple-600" />)
          )}
        </div>
      )
    } else if (viewMode === 'monthly') {
      const { groupedByMonth, sortedKeys } = monthlyGroups
      return (
        <div className="space-y-4">
          {sortedKeys.map(monthKey => 
            renderSection(monthKey, groupedByMonth[monthKey], `month-${monthKey}`, <Calendar className="w-5 h-5 text-indigo-600" />)
          )}
        </div>
      )
    }
    
    // period 모드 (기본)
    return (
      <div className="space-y-4">
        {renderSection('오늘 완료한 할일', groups.today, 'today', <CheckCircle className="w-5 h-5 text-green-600" />)}
        {renderSection('어제 완료한 할일', groups.yesterday, 'yesterday', <Calendar className="w-5 h-5 text-blue-600" />)}
        {renderSection('이번 주 완료한 할일', groups.thisWeek, 'thisWeek', <Calendar className="w-5 h-5 text-purple-600" />)}
        {renderSection('저번 주 완료한 할일', groups.lastWeek, 'lastWeek', <Calendar className="w-5 h-5 text-orange-600" />)}
        {renderSection('이번 달 완료한 할일', groups.thisMonth, 'thisMonth', <Calendar className="w-5 h-5 text-indigo-600" />)}
        {renderSection('저번 달 완료한 할일', groups.lastMonth, 'lastMonth', <Calendar className="w-5 h-5 text-pink-600" />)}
        {renderSection('더 이전에 완료한 할일', groups.older, 'older', <Clock className="w-5 h-5 text-gray-600" />)}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">완료 히스토리</h2>
          <p className="text-gray-600 dark:text-gray-400">
            총 {totalCompleted}개의 할일을 완료했습니다
          </p>
        </div>
      </div>

      {/* 뷰 모드 선택 탭 */}
      <div className="flex space-x-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
        {[
          { key: 'period', label: '기간별' },
          { key: 'daily', label: '일별' },
          { key: 'weekly', label: '주별' },
          { key: 'monthly', label: '월별' }
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setViewMode(key as any)}
            className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
              viewMode === key
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* 통계 */}
      {viewMode === 'period' && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {groups.today.length}
            </div>
            <div className="text-sm text-green-700 dark:text-green-300">오늘</div>
          </div>
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {groups.thisWeek.length + groups.yesterday.length}
            </div>
            <div className="text-sm text-blue-700 dark:text-blue-300">이번 주</div>
          </div>
          <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {groups.thisMonth.length}
            </div>
            <div className="text-sm text-purple-700 dark:text-purple-300">이번 달</div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-gray-600 dark:text-gray-400">
              {groups.lastMonth.length + groups.older.length}
            </div>
            <div className="text-sm text-gray-700 dark:text-gray-300">이전</div>
          </div>
        </div>
      )}
      
      {viewMode === 'daily' && (
        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg text-center">
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {dailyGroups.sortedKeys.length}
          </div>
          <div className="text-sm text-blue-700 dark:text-blue-300">완료한 날</div>
        </div>
      )}
      
      {viewMode === 'weekly' && (
        <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg text-center">
          <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
            {weeklyGroups.sortedKeys.length}
          </div>
          <div className="text-sm text-purple-700 dark:text-purple-300">완료한 주</div>
        </div>
      )}
      
      {viewMode === 'monthly' && (
        <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-lg text-center">
          <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
            {monthlyGroups.sortedKeys.length}
          </div>
          <div className="text-sm text-indigo-700 dark:text-indigo-300">완료한 월</div>
        </div>
      )}

      {/* 완료된 할일 목록 */}
      <div className="space-y-4">
        {renderCustomGroupedView()}
      </div>

      {/* 빈 상태 */}
      {totalCompleted === 0 && (
        <div className="text-center py-12">
          <CheckCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            아직 완료한 할일이 없습니다
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            할일을 완료하면 여기에 히스토리가 표시됩니다.
          </p>
        </div>
      )}
    </div>
  )
}

export default CompletedHistoryView