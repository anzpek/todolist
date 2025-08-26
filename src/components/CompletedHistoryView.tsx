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
  const [fourthStatMode, setFourthStatMode] = useState<'yesterday' | 'lastWeek' | 'lastMonth'>('yesterday')

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
  const completedSubTasks: Array<Todo & { isSubTask: true, parentTitle: string, parentDescription?: string }> = []
  
  allTodos.forEach(todo => {
    if (todo.subTasks && todo.subTasks.length > 0) {
      todo.subTasks
        .filter(subTask => subTask.completed && subTask.completedAt && subTask.completedAt !== null)
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
              parentDescription: todo.description, // 부모 할일의 설명 추가
              createdAt: subTask.createdAt,
              updatedAt: subTask.updatedAt
            })
          }
        })
    }
  })

  // 메인 할일과 하위 작업을 합쳐서 완료 시간 순으로 정렬
  const completedTodos = [...completedMainTodos, ...completedSubTasks].sort((a, b) => {
    const getValidTime = (date: any) => {
      if (!date) return 0
      try {
        const time = new Date(date).getTime()
        return isNaN(time) ? 0 : time
      } catch {
        return 0
      }
    }
    
    const dateA = getValidTime(a.completedAt)
    const dateB = getValidTime(b.completedAt)
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
        // 이번 주의 오늘, 어제를 제외한 나머지 날들
        groups.thisWeek.push(todo)
      } else if (completedDate >= lastWeekStart && completedDate < thisWeekStart) {
        // 저번 주
        groups.lastWeek.push(todo)
      } else if (completedDate >= thisMonthStart && completedDate < lastWeekStart) {
        // 이번 달의 저번 주 이전 날들
        groups.thisMonth.push(todo)
      } else if (completedDate >= lastMonthStart && completedDate < thisMonthStart) {
        // 저번 달 (7월)
        groups.lastMonth.push(todo)
      } else if (completedDate < lastMonthStart) {
        // 그 이전 달들 (6월 이전)
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
        month: '2-digit',
        day: '2-digit',
        weekday: 'short'
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
      
      const weekKey = `${weekStart.toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' })} ~ ${weekEnd.toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' })}`
      
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
        month: '2-digit'
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

  const cycleFourthStat = () => {
    setFourthStatMode(current => {
      switch (current) {
        case 'yesterday': return 'lastWeek'
        case 'lastWeek': return 'lastMonth'  
        case 'lastMonth': return 'yesterday'
        default: return 'yesterday'
      }
    })
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
      <div key={todo.id} className="border-l-2 border-green-500 bg-green-50 dark:bg-green-900/10 p-2 sm:p-3 rounded-r-lg">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1 mb-1">
              <CheckCircle className="w-3 h-3 text-green-600 flex-shrink-0" />
              <h3 className="text-xs sm:text-sm font-medium text-green-800 dark:text-green-300 line-through truncate">
                {(todo as any).isSubTask ? 
                  `↳ ${todo.title} (${(todo as any).parentTitle})` : 
                  todo.title
                }
              </h3>
            </div>
            
            {/* 태그와 설명 */}
            <div className="flex flex-wrap items-center gap-1 mb-1">
              {(todo as any).isSubTask ? (
                (todo as any).parentDescription && (
                  <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-1 py-0.5 rounded text-xs">
                    {(todo as any).parentDescription}
                  </span>
                )
              ) : (
                todo.description && (
                  <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-1 py-0.5 rounded text-xs">
                    {todo.description}
                  </span>
                )
              )}
              
              <span className={`px-1 py-0.5 rounded text-xs ${priorityColors[todo.priority]}`}>
                {todo.priority === 'low' && '낮음'}
                {todo.priority === 'medium' && '보통'}
                {todo.priority === 'high' && '높음'}
                {todo.priority === 'urgent' && '긴급'}
              </span>
              
              {(todo as any).isSubTask && (
                <span className="bg-indigo-200 dark:bg-indigo-800 text-indigo-700 dark:text-indigo-300 px-1 py-0.5 rounded text-xs">
                  하위작업
                </span>
              )}
              
              {(todo as any)._isRecurringInstance && (
                <span className="bg-purple-200 dark:bg-purple-800 text-purple-700 dark:text-purple-300 px-1 py-0.5 rounded text-xs">
                  반복할일
                </span>
              )}
              
              {todo.type === 'project' && (
                <span className="bg-green-200 dark:bg-green-800 text-green-700 dark:text-green-300 px-1 py-0.5 rounded text-xs">
                  {todo.project === 'longterm' ? '롱텀' : '숏텀'}
                </span>
              )}
            </div>
            
            {/* 완료 시간 */}
            {todo.completedAt && (
              <div className="text-xs text-green-600 dark:text-green-400">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {formatDateTime(todo.completedAt)} 완료
                </span>
              </div>
            )}
          </div>
          
          {/* 액션 버튼 */}
          <div className="flex items-start">
            <button
              onClick={handleUncomplete}
              className="p-1 hover:bg-green-100 dark:hover:bg-green-800 rounded transition-colors"
              title="완료 취소"
            >
              <RotateCcw className="w-3 h-3 text-green-600 dark:text-green-400" />
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
      <div key={key} className="mb-4">
        <button
          onClick={() => toggleSection(key)}
          className="w-full flex items-center justify-between p-2 sm:p-3 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        >
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="w-4 h-4 flex-shrink-0">{icon}</div>
            <span className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white flex-1 leading-tight">
              {title} ({todos.length}개)
            </span>
          </div>
          {isExpanded ? <ChevronDown className="w-4 h-4 flex-shrink-0" /> : <ChevronRight className="w-4 h-4 flex-shrink-0" />}
        </button>
        
        {isExpanded && (
          <div className="mt-2 space-y-2">
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

  const getFourthStatData = () => {
    switch (fourthStatMode) {
      case 'yesterday':
        return {
          count: groups.yesterday.length,
          label: '어제',
          color: 'text-orange-600 dark:text-orange-400'
        }
      case 'lastWeek':
        return {
          count: groups.lastWeek.length,
          label: '저번주',
          color: 'text-indigo-600 dark:text-indigo-400'
        }
      case 'lastMonth':
        return {
          count: groups.lastMonth.length,
          label: '저번달',
          color: 'text-pink-600 dark:text-pink-400'
        }
      default:
        return {
          count: groups.yesterday.length,
          label: '어제',
          color: 'text-orange-600 dark:text-orange-400'
        }
    }
  }

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
    <div className="space-y-3 sm:space-y-4">
      {/* 헤더 - 컴팩트 */}
      <div className="text-center">
        <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-1">완료 히스토리</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          총 {totalCompleted}개의 할일을 완료했습니다
        </p>
      </div>

      {/* 뷰 모드 선택 탭 - 컴팩트 */}
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
            className={`flex-1 px-2 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-colors ${
              viewMode === key
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* 통계 - 한 줄로 표시 */}
      {viewMode === 'period' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm border">
          <div className="grid grid-cols-4 gap-1">
            <div className="text-center px-2 py-2">
              <div className="text-lg sm:text-xl font-bold text-green-600 dark:text-green-400">
                {groups.today.length}
              </div>
              <div className="text-xs text-green-700 dark:text-green-300 leading-tight">오늘</div>
            </div>
            <div className="text-center px-2 py-2">
              <div className="text-lg sm:text-xl font-bold text-blue-600 dark:text-blue-400">
                {groups.today.length + groups.yesterday.length + groups.thisWeek.length}
              </div>
              <div className="text-xs text-blue-700 dark:text-blue-300 leading-tight">이번 주</div>
            </div>
            <div className="text-center px-2 py-2">
              <div className="text-lg sm:text-xl font-bold text-purple-600 dark:text-purple-400">
                {totalCompleted - groups.lastMonth.length - groups.older.length}
              </div>
              <div className="text-xs text-purple-700 dark:text-purple-300 leading-tight">이번 달</div>
            </div>
            <button 
              onClick={cycleFourthStat}
              className="text-center px-2 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors cursor-pointer"
              title="클릭하여 어제 → 저번주 → 저번달 순환"
            >
              <div className={`text-lg sm:text-xl font-bold ${getFourthStatData().color}`}>
                {getFourthStatData().count}
              </div>
              <div className={`text-xs leading-tight ${getFourthStatData().color.replace('text-', 'text-').replace('600', '700').replace('400', '300')}`}>
                {getFourthStatData().label}
              </div>
            </button>
          </div>
        </div>
      )}
      
      {viewMode === 'daily' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm border text-center">
          <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
            {dailyGroups.sortedKeys.length}
          </div>
          <div className="text-xs text-blue-700 dark:text-blue-300">완료한 날</div>
        </div>
      )}
      
      {viewMode === 'weekly' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm border text-center">
          <div className="text-lg font-bold text-purple-600 dark:text-purple-400">
            {weeklyGroups.sortedKeys.length}
          </div>
          <div className="text-xs text-purple-700 dark:text-purple-300">완료한 주</div>
        </div>
      )}
      
      {viewMode === 'monthly' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm border text-center">
          <div className="text-lg font-bold text-indigo-600 dark:text-indigo-400">
            {monthlyGroups.sortedKeys.length}
          </div>
          <div className="text-xs text-indigo-700 dark:text-indigo-300">완료한 월</div>
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