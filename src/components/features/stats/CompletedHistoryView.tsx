import { useState, useMemo, useEffect } from 'react'
import { Calendar, Clock, ChevronDown, ChevronRight, CheckCircle, RotateCcw, AlignLeft, LayoutGrid, Box, Archive, Repeat } from 'lucide-react'
import { format } from 'date-fns'
import { ko, enUS } from 'date-fns/locale'
import { useTranslation } from 'react-i18next'
import { useTodos } from '../../../contexts/TodoContext'
import { useTheme } from '../../../contexts/ThemeContext'
import type { Todo } from '../../../types/todo'

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
  const {
    todos,
    toggleTodo,
    deleteTodo,
    // @ts-ignore - Context updated but type definitions might need refresh
    loadYearlyTodos,
    // @ts-ignore
    historicalTodos,
    // @ts-ignore
    historicalYear,
    loading: contextLoading
  } = useTodos()

  const { currentTheme, isDark } = useTheme()
  const isVisualTheme = !!currentTheme.bg
  const { t, i18n } = useTranslation()
  const dateLocale = i18n.language === 'ko' ? ko : enUS

  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [viewMode, setViewMode] = useState<'list' | 'analysis'>('list')
  const [groupMode, setGroupMode] = useState<'period' | 'daily' | 'weekly' | 'monthly'>('period')
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['today', 'yesterday', 'thisWeek']))

  // 연도 변경 시 데이터 로드
  useEffect(() => {
    if (loadYearlyTodos) {
      loadYearlyTodos(selectedYear)
    }
  }, [selectedYear, loadYearlyTodos])

  // 데이터 소스 결정 (히스토리 vs 현재)
  const rawCompletedTodos = useMemo(() => {
    // 1. 선택된 연도가 로드된 히스토리 연도와 같으면 히스토리 데이터 사용 (권장)
    if (historicalYear === selectedYear && historicalTodos && historicalTodos.length > 0) {
      return historicalTodos
    }

    // 2. 히스토리가 없거나 다르면? 
    // 만약 현재 연도라면 todos(Active+Recent)에서 가져올 수 있지만, 
    // 7일 지난 완료 항목은 todos에 없을 수 있음.
    // 따라서 historicalTodos가 로드되길 기다리는 것이 맞음.
    // 하지만 UI 깜빡임 방지를 위해 우선 todos에서라도 찾아서 보여줌.

    const relevantTodos = historicalYear === selectedYear ? historicalTodos : todos;

    return relevantTodos.filter((todo: Todo) => {
      if (!todo.completedAt) return false
      // @ts-ignore
      const completedYear = new Date(todo.completedAt).getFullYear()
      return completedYear === selectedYear && todo.completed
    })
  }, [todos, historicalTodos, historicalYear, selectedYear])

  // 필터링 적용
  const completedTodos = useMemo(() => {
    let filtered = rawCompletedTodos

    if (searchTerm) {
      filtered = filtered.filter((todo: Todo) =>
        todo.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (todo.description && todo.description.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    }

    if (priorityFilter !== 'all') {
      filtered = filtered.filter((todo: Todo) => todo.priority === priorityFilter)
    }

    if (typeFilter !== 'all') {
      filtered = filtered.filter((todo: Todo) => todo.type === typeFilter)
    }

    if (projectFilter !== 'all') {
      filtered = filtered.filter((todo: Todo) => todo.project === projectFilter)
    }

    if (tagFilter.length > 0) {
      filtered = filtered.filter((todo: Todo) =>
        todo.tags && tagFilter.some(tag => todo.tags!.includes(tag))
      )
    }

    // 최신순 정렬
    return filtered.sort((a: Todo, b: Todo) => {
      // @ts-ignore
      return new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime()
    })
  }, [rawCompletedTodos, searchTerm, priorityFilter, typeFilter, projectFilter, tagFilter])

  // 분석 데이터 계산
  const analysisData = useMemo(() => {
    const total = completedTodos.length
    if (total === 0) return null

    const byProject: Record<string, number> = {}
    const byPriority: Record<string, number> = {}
    const byTag: Record<string, number> = {}
    const byMonth: Record<string, number> = {}

    completedTodos.forEach((todo: Todo) => {
      // Project
      const project = todo.project || 'Unassigned'
      byProject[project] = (byProject[project] || 0) + 1

      // Priority
      const priority = todo.priority
      byPriority[priority] = (byPriority[priority] || 0) + 1

      // Tags
      if (todo.tags && todo.tags.length > 0) {
        todo.tags.forEach(tag => {
          byTag[tag] = (byTag[tag] || 0) + 1
        })
      } else {
        byTag['No Tags'] = (byTag['No Tags'] || 0) + 1
      }

      // Month
      if (todo.completedAt) {
        const month = new Date(todo.completedAt).getMonth() + 1
        byMonth[month] = (byMonth[month] || 0) + 1
      }
    })

    return { total, byProject, byPriority, byTag, byMonth }
  }, [completedTodos])

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections)
    if (newExpanded.has(section)) {
      newExpanded.delete(section)
    } else {
      newExpanded.add(section)
    }
    setExpandedSections(newExpanded)
  }

  // 그룹화 함수들
  const groupTodosByDay = () => {
    const groupedByDay: { [key: string]: Todo[] } = {}

    completedTodos.forEach((todo: Todo) => {
      if (!todo.completedAt) return

      const completedDate = new Date(todo.completedAt)
      const dateKey = format(completedDate, i18n.language === 'ko' ? 'M월 d일 (E)' : 'MMM d (E)', { locale: dateLocale })

      if (!groupedByDay[dateKey]) {
        groupedByDay[dateKey] = []
      }
      groupedByDay[dateKey].push(todo)
    })

    const sortedKeys = Object.keys(groupedByDay).sort((a, b) => { // 날짜 내림차순
      // 키 문자열 비교가 어려울 수 있으니 첫 번째 아이템의 시간으로 비교
      const dateA = new Date(groupedByDay[a][0].completedAt!)
      const dateB = new Date(groupedByDay[b][0].completedAt!)
      return dateB.getTime() - dateA.getTime()
    })

    return { groupedByDay, sortedKeys }
  }

  const groupTodosByWeek = () => {
    const groupedByWeek: { [key: string]: Todo[] } = {}

    completedTodos.forEach((todo: Todo) => {
      if (!todo.completedAt) return

      const completedDate = new Date(todo.completedAt)
      const weekStart = new Date(completedDate)
      weekStart.setDate(completedDate.getDate() - completedDate.getDay()) // 일요일 시작
      weekStart.setHours(0, 0, 0, 0)

      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekStart.getDate() + 6)

      const weekKey = `${format(weekStart, i18n.language === 'ko' ? 'M월 d일' : 'MMM d', { locale: dateLocale })} ~ ${format(weekEnd, i18n.language === 'ko' ? 'M월 d일' : 'MMM d', { locale: dateLocale })}`

      if (!groupedByWeek[weekKey]) {
        groupedByWeek[weekKey] = []
      }
      groupedByWeek[weekKey].push(todo)
    })

    const sortedKeys = Object.keys(groupedByWeek).sort((a, b) => {
      const dateA = new Date(groupedByWeek[a][0].completedAt!)
      const dateB = new Date(groupedByWeek[b][0].completedAt!)
      return dateB.getTime() - dateA.getTime()
    })

    return { groupedByWeek, sortedKeys }
  }

  const groupTodosByMonth = () => {
    const groupedByMonth: { [key: string]: Todo[] } = {}

    completedTodos.forEach((todo: Todo) => {
      if (!todo.completedAt) return

      const completedDate = new Date(todo.completedAt)
      const monthKey = format(completedDate, i18n.language === 'ko' ? 'yyyy년 M월' : 'MMMM yyyy', { locale: dateLocale })

      if (!groupedByMonth[monthKey]) {
        groupedByMonth[monthKey] = []
      }
      groupedByMonth[monthKey].push(todo)
    })

    const sortedKeys = Object.keys(groupedByMonth).sort((a, b) => {
      const dateA = new Date(groupedByMonth[a][0].completedAt!)
      const dateB = new Date(groupedByMonth[b][0].completedAt!)
      return dateB.getTime() - dateA.getTime()
    })

    return { groupedByMonth, sortedKeys }
  }

  const renderTodoItem = (todo: Todo) => {
    const handleUncomplete = (e: React.MouseEvent) => {
      e.stopPropagation()
      toggleTodo(todo.id)
    }

    const handleDelete = (e: React.MouseEvent) => {
      e.stopPropagation()
      if (window.confirm('정말 삭제하시겠습니까?')) {
        deleteTodo(todo.id)
      }
    }

    // @ts-ignore
    const isSubTask = todo.isSubTask
    // @ts-ignore
    const isRecurring = todo._isRecurringInstance

    return (
      <div key={todo.id} className={`border-l-2 border-green-500 p-2 sm:p-3 rounded-r-lg ${isVisualTheme ? 'bg-green-50/20 backdrop-blur-none' : 'bg-green-50 dark:bg-green-900/10'}`} style={isVisualTheme ? { backgroundColor: `rgba(${isDark ? '0, 0, 0' : '255, 255, 255'}, var(--glass-opacity, 0.05))` } : {}}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1 mb-1">
              <CheckCircle className="w-3 h-3 text-green-600 flex-shrink-0" />
              <h3 className="text-xs sm:text-sm font-medium text-green-800 dark:text-green-300 line-through truncate">
                {isSubTask ?
                  `↳ ${todo.title} (${(todo as any).parentTitle})` :
                  todo.title
                }
              </h3>
            </div>

            {todo.description && (
              <p className="text-xs text-green-700 dark:text-green-400 line-clamp-1 mb-1 opacity-70">
                {todo.description}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-2 text-[10px] sm:text-xs text-green-700 dark:text-green-400 opacity-70">
              <span className="flex items-center gap-0.5">
                <Calendar className="w-3 h-3" />
                완료: {todo.completedAt ? format(new Date(todo.completedAt), 'M/d HH:mm') : '-'}
              </span>

              {todo.priority !== 'medium' && (
                <span className={`px-1.5 py-0.5 rounded ${todo.priority === 'urgent' ? 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300' :
                    todo.priority === 'high' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300' :
                      'bg-gray-100 text-gray-800'
                  }`}>
                  {todo.priority === 'urgent' ? '긴급' : todo.priority === 'high' ? '높음' : '낮음'}
                </span>
              )}

              {isRecurring && (
                <span className="flex items-center gap-0.5 text-purple-600 dark:text-purple-400">
                  <Repeat className="w-3 h-3" />
                  반복
                </span>
              )}

              {todo.project && (
                <span className="bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300 px-1.5 py-0.5 rounded">
                  {todo.project === 'longterm' ? '장기' : '단기'}
                </span>
              )}

              {todo.tags && todo.tags.map(tag => (
                <span key={tag} className="text-blue-600 dark:text-blue-400">#{tag}</span>
              ))}
            </div>
          </div>

          <div className="flex items-start">
            <button onClick={handleUncomplete} className="p-1 hover:bg-green-100 dark:hover:bg-green-800 rounded transition-colors" title="완료 취소">
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
        <button onClick={() => toggleSection(key)} className={`w-full flex items-center justify-between p-2 sm:p-3 rounded-lg transition-colors ${isVisualTheme ? 'backdrop-blur-none hover:bg-white/10' : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700'}`} style={isVisualTheme ? { backgroundColor: `rgba(${isDark ? '0, 0, 0' : '255, 255, 255'}, var(--glass-opacity, 0.1))` } : {}}>
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

  return (
    <div className="space-y-4">
      {/* Header and Controls */}
      <div className={`p-4 rounded-xl shadow-sm border transaction-all duration-300 ${isVisualTheme ? 'backdrop-blur-md bg-white/30 border-white/20' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'}`}>
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-4">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-500" />
            {t('nav.history')}
          </h2>

          <div className="flex items-center gap-2">
            {/* Year Selector */}
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium border focus:ring-2 focus:ring-blue-500 outline-none transition-colors
                ${isVisualTheme
                  ? 'bg-white/40 border-white/30 text-gray-900 placeholder-gray-600'
                  : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-gray-100'
                }`}
            >
              {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i + 1).reverse().map(year => (
                <option key={year} value={year}>{year}년</option>
              ))}
            </select>

            {/* View Mode Toggle */}
            <div className={`flex p-1 rounded-lg ${isVisualTheme ? 'bg-black/10' : 'bg-gray-100 dark:bg-gray-700'}`}>
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${viewMode === 'list'
                    ? 'bg-white dark:bg-gray-600 shadow text-blue-600 dark:text-blue-400'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
              >
                목록
              </button>
              <button
                onClick={() => setViewMode('analysis')}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${viewMode === 'analysis'
                    ? 'bg-white dark:bg-gray-600 shadow text-blue-600 dark:text-blue-400'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
              >
                분석
              </button>
            </div>
          </div>
        </div>

        {/* List View Controls (only in list mode) */}
        {viewMode === 'list' && (
          <div className="flex gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
            {(['period', 'daily', 'weekly', 'monthly'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setGroupMode(mode)}
                className={`flex-1 sm:flex-none px-3 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-all whitespace-nowrap ${groupMode === mode
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                    : isVisualTheme
                      ? 'bg-white/20 text-gray-800 dark:text-white hover:bg-white/30'
                      : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
              >
                {mode === 'period' ? '기간별' :
                  mode === 'daily' ? '일별' :
                    mode === 'weekly' ? '주별' : '월별'}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Main Content */}
      {viewMode === 'list' ? (
        <div className="space-y-4">
          {completedTodos.length === 0 ? (
            <div className={`text-center py-10 rounded-xl ${isVisualTheme ? 'bg-white/30 backdrop-blur-md' : 'bg-white dark:bg-gray-800'}`}>
              <p className="text-gray-500 dark:text-gray-400">
                {contextLoading ? '데이터 로딩 중...' : '완료된 할 일이 없습니다.'}
              </p>
            </div>
          ) : (
            <>
              {groupMode === 'period' && (
                <>
                  {(() => {
                    const todayTodos = completedTodos.filter((todo: Todo) => {
                      if (!todo.completedAt) return false
                      const completedDate = new Date(todo.completedAt)
                      const today = new Date()
                      return completedDate.toDateString() === today.toDateString()
                    })
                    return renderSection(t('nav.today'), todayTodos, 'today', <Calendar className="w-4 h-4 text-blue-500" />)
                  })()}

                  {(() => {
                    const yesterdayTodos = completedTodos.filter((todo: Todo) => {
                      if (!todo.completedAt) return false
                      const completedDate = new Date(todo.completedAt)
                      const yesterday = new Date()
                      yesterday.setDate(yesterday.getDate() - 1)
                      return completedDate.toDateString() === yesterday.toDateString()
                    })
                    return renderSection('어제', yesterdayTodos, 'yesterday', <Clock className="w-4 h-4 text-orange-500" />)
                  })()}

                  {(() => {
                    const thisWeekTodos = completedTodos.filter((todo: Todo) => {
                      if (!todo.completedAt) return false
                      const completedDate = new Date(todo.completedAt)
                      const today = new Date()
                      const yesterday = new Date()
                      yesterday.setDate(yesterday.getDate() - 1)

                      if (completedDate.toDateString() === today.toDateString()) return false
                      if (completedDate.toDateString() === yesterday.toDateString()) return false

                      const startOfWeek = new Date(today)
                      startOfWeek.setDate(today.getDate() - today.getDay())
                      startOfWeek.setHours(0, 0, 0, 0)

                      return completedDate >= startOfWeek
                    })
                    return renderSection('이번 주', thisWeekTodos, 'thisWeek', <AlignLeft className="w-4 h-4 text-purple-500" />)
                  })()}

                  {(() => {
                    const thisMonthTodos = completedTodos.filter((todo: Todo) => {
                      if (!todo.completedAt) return false
                      const completedDate = new Date(todo.completedAt)
                      const today = new Date()

                      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
                      const startOfWeek = new Date(today)
                      startOfWeek.setDate(today.getDate() - today.getDay())
                      startOfWeek.setHours(0, 0, 0, 0)

                      if (completedDate >= startOfWeek) return false
                      return completedDate >= startOfMonth
                    })
                    return renderSection('이번 달', thisMonthTodos, 'thisMonth', <LayoutGrid className="w-4 h-4 text-green-500" />)
                  })()}

                  {(() => {
                    // 지난 달 및 그 이전 (연도 내에서)
                    const olderTodos = completedTodos.filter((todo: Todo) => {
                      if (!todo.completedAt) return false
                      const completedDate = new Date(todo.completedAt)
                      const today = new Date()
                      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)

                      return completedDate < startOfMonth
                    })
                    return renderSection('이전 활동', olderTodos, 'older', <Archive className="w-4 h-4 text-gray-400" />)
                  })()}
                </>
              )}

              {groupMode === 'daily' && (() => {
                const { groupedByDay, sortedKeys } = groupTodosByDay()
                return sortedKeys.map(key => renderSection(key, groupedByDay[key], key, <Calendar className="w-4 h-4 text-blue-500" />))
              })()}

              {groupMode === 'weekly' && (() => {
                const { groupedByWeek, sortedKeys } = groupTodosByWeek()
                return sortedKeys.map(key => renderSection(key, groupedByWeek[key], key, <AlignLeft className="w-4 h-4 text-purple-500" />))
              })()}

              {groupMode === 'monthly' && (() => {
                const { groupedByMonth, sortedKeys } = groupTodosByMonth()
                return sortedKeys.map(key => renderSection(key, groupedByMonth[key], key, <LayoutGrid className="w-4 h-4 text-orange-500" />))
              })()}
            </>
          )}
        </div>
      ) : (
        // Analysis View
        <div className={`p-6 rounded-xl space-y-6 ${isVisualTheme ? 'bg-white/30 backdrop-blur-md' : 'bg-white dark:bg-gray-800'}`}>
          {analysisData && (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-center">
                  <p className="text-sm text-gray-500 dark:text-gray-400">총 완료 태스크</p>
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{analysisData.total}</p>
                </div>
                <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20 text-center">
                  <p className="text-sm text-gray-500 dark:text-gray-400">월 평균</p>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">{(analysisData.total / 12).toFixed(1)}</p>
                </div>
              </div>

              {/* Projects */}
              <div>
                <h3 className="text-lg font-semibold mb-3">프로젝트별</h3>
                <div className="space-y-2">
                  {Object.entries(analysisData.byProject).sort(([, a], [, b]) => b - a).map(([project, count]) => (
                    <div key={project} className="flex items-center gap-2">
                      <div className="w-24 text-sm truncate">{project === 'longterm' ? '장기' : project === 'shortterm' ? '단기' : '미지정'}</div>
                      <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500" style={{ width: `${(count / analysisData.total) * 100}%` }}></div>
                      </div>
                      <div className="text-sm font-medium w-12 text-right">{count}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tags */}
              <div>
                <h3 className="text-lg font-semibold mb-3">태그별</h3>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(analysisData.byTag).sort(([, a], [, b]) => b - a).map(([tag, count]) => (
                    <span key={tag} className="px-3 py-1 rounded-full text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                      #{tag} <span className="font-bold ml-1">{count}</span>
                    </span>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

export default CompletedHistoryView