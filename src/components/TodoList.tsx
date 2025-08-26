import { CheckCircle2, Calendar } from 'lucide-react'
import { useState, memo, useMemo } from 'react'
import { useTodos } from '../contexts/TodoContext'
import { useVacation } from '../contexts/VacationContext'
import { useAuth } from '../contexts/AuthContext'
import { isAdmin } from '../constants/admin'
import type { ViewType } from '../App'
import TodoItem from './TodoItem'
import VacationItem from './VacationItem'
import type { Todo, Priority, TaskType } from '../types/todo'

interface TodoListProps {
  currentView: ViewType
  searchTerm?: string
  priorityFilter?: Priority | 'all'
  typeFilter?: TaskType | 'all'
  projectFilter?: 'all' | 'longterm' | 'shortterm'
  tagFilter?: string[]
  completionDateFilter?: 'all' | 'today' | 'yesterday' | 'thisWeek' | 'lastWeek' | 'thisMonth'
  selectedDate?: Date // 오늘 할일 뷰에서 선택된 날짜
}

const TodoList = memo(({ 
  currentView, 
  searchTerm = '', 
  priorityFilter = 'all', 
  typeFilter = 'all', 
  projectFilter = 'all',
  tagFilter = [],
  completionDateFilter = 'all',
  selectedDate
}: TodoListProps) => {
  const { todos, getTodayTodos, getWeekTodos, getMonthTodos, reorderTodos } = useTodos()
  const { currentUser } = useAuth()
  const { showVacationsInTodos, getVacationsForDate, employees } = useVacation()
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)


  // Memoized todo retrieval based on current view
  const currentTodos = useMemo((): Todo[] => {
    switch (currentView) {
      case 'today':
        return getTodayTodos(selectedDate)
      case 'week': 
        return getWeekTodos()
      case 'month':
        return getMonthTodos()
      default:
        return todos
    }
  }, [currentView, selectedDate, getTodayTodos, getWeekTodos, getMonthTodos, todos])

  // Memoized filtering logic
  const filteredTodos = useMemo((): Todo[] => {
    const applyFilters = (todoList: Todo[]): Todo[] => {
    // React key 중복 방지를 위한 강화된 중복 제거
    const seenIds = new Set<string>()
    const uniqueTodos = todoList.filter(todo => {
      if (seenIds.has(todo.id)) {
        console.warn(`⚠️ 중복 키 발견 및 제거: ${todo.id}`)
        return false
      }
      seenIds.add(todo.id)
      return true
    })
    
    if (uniqueTodos.length !== todoList.length) {
      console.warn(`⚠️ 중복 할일 제거 완료: ${todoList.length} → ${uniqueTodos.length}`)
      const duplicateIds = todoList
        .map(t => t.id)
        .filter((id, index, array) => array.indexOf(id) !== index)
      console.warn('중복된 ID들:', [...new Set(duplicateIds)])
    }
    
    return uniqueTodos.filter(todo => {
      // 검색어 필터
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase()
        const matchesTitle = todo.title.toLowerCase().includes(searchLower)
        const matchesDescription = todo.description?.toLowerCase().includes(searchLower) || false
        if (!matchesTitle && !matchesDescription) return false
      }

      // 우선순위 필터
      if (priorityFilter !== 'all' && todo.priority !== priorityFilter) {
        return false
      }

      // 타입 필터
      if (typeFilter !== 'all' && todo.type !== typeFilter) {
        return false
      }

      // 프로젝트 필터 (프로젝트 타입일 때만)
      if (projectFilter !== 'all' && todo.type === 'project' && todo.project !== projectFilter) {
        return false
      }

      return true
    })
    }
    
    return applyFilters(currentTodos)
  }, [currentTodos, searchTerm, priorityFilter, typeFilter, projectFilter, tagFilter, completionDateFilter])
  // 완료되지 않은 할일: 메인 할일이 완료되지 않은 모든 할일
  const incompleteTodos = filteredTodos.filter(todo => !todo.completed)

  // 완료된 할일: 메인 할일이 완료된 것들만 (서브태스크는 별도 처리)
  const completedMainTodos = filteredTodos.filter(todo => todo.completed)

  // 오늘 완료된 서브태스크들을 개별 항목으로 추출 (오늘 뷰에서만)
  const completedSubTasksAsItems: Array<Todo & { isSubTask: true, parentTitle: string, parentDescription?: string }> = []
  
  if (currentView === 'today') {
    const today = selectedDate || new Date()
    today.setHours(0, 0, 0, 0)
    
    filteredTodos.forEach(todo => {
      if (todo.subTasks && todo.subTasks.length > 0) {
        todo.subTasks.forEach(subTask => {
          if (subTask.completed && subTask.completedAt && subTask.completedAt !== null) {
            try {
              const subTaskCompletedDate = new Date(subTask.completedAt)
              subTaskCompletedDate.setHours(0, 0, 0, 0)
              
              if (subTaskCompletedDate.getTime() === today.getTime()) {
                completedSubTasksAsItems.push({
                  ...subTask,
                  type: 'simple' as const,
                  recurrence: 'none' as const,
                  isSubTask: true,
                  parentTitle: todo.title,
                  parentDescription: todo.description,
                  createdAt: subTask.createdAt,
                  updatedAt: subTask.updatedAt
                })
              }
            } catch {
              // 날짜 파싱 오류 무시
            }
          }
        })
      }
    })
  }

  // 완료된 할일 = 완료된 메인 할일 + 오늘 완료된 서브태스크 항목들
  const allCompletedItems = [...completedMainTodos, ...completedSubTasksAsItems]

  // 휴가 데이터 가져오기 (관리자이고 휴가 표시가 활성화된 경우)
  const getDisplayDate = () => {
    if (currentView === 'today' && selectedDate) {
      return selectedDate
    }
    return new Date() // 기본적으로 오늘 날짜
  }

  const shouldShowVacations = isAdmin(currentUser?.email) && showVacationsInTodos
  const vacationsForDate = shouldShowVacations ? getVacationsForDate(getDisplayDate()) : []

  // 드래그 앤 드롭 핸들러
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = async (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault()
    if (draggedIndex === null) return
    
    // 오늘 뷰에서만 드래그 앤 드롭 허용
    if (currentView === 'today') {
      try {
        await reorderTodos(draggedIndex, dropIndex, sortedIncompleteTodos)
      } catch (error) {
        console.error('드래그 앤 드롭 순서 저장 실패:', error)
      }
    }
    
    setDraggedIndex(null)
  }

  const handleDragEnd = () => {
    setDraggedIndex(null)
  }

  // 우선순위별로 정렬 (긴급 > 높음 > 보통 > 낮음)
  const sortByPriority = (todos: Todo[]): Todo[] => {
    const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 }
    return todos.sort((a, b) => {
      // 오늘 뷰에서는 order 값으로 정렬 (드래그 앤 드롭 순서 유지)
      if (currentView === 'today') {
        const orderA = a.order ?? 999
        const orderB = b.order ?? 999
        if (orderA !== orderB) return orderA - orderB
      }
      
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority]
      if (priorityDiff !== 0) return priorityDiff
      
      // 우선순위가 같으면 마감일 순으로 정렬
      if (a.dueDate && b.dueDate) {
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
      }
      if (a.dueDate) return -1
      if (b.dueDate) return 1
      
      // 마감일이 없으면 생성일 순으로 정렬
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    })
  }

  const sortedIncompleteTodos = sortByPriority(incompleteTodos)
  
  // 완료된 할일 정렬 (완료 시간 기준 최신순)
  const sortedCompletedTodos = allCompletedItems.sort((a, b) => {
    const getCompletedTime = (item: any) => {
      // 서브태스크인 경우 completedAt 사용
      if ((item as any).isSubTask && item.completedAt) {
        try {
          return new Date(item.completedAt).getTime()
        } catch {
          return 0
        }
      }
      // 일반 할일인 경우 completedAt 또는 updatedAt 사용
      if (item.completedAt) {
        try {
          return new Date(item.completedAt).getTime()
        } catch {
          return new Date(item.updatedAt).getTime()
        }
      }
      return new Date(item.updatedAt).getTime()
    }
    
    return getCompletedTime(b) - getCompletedTime(a) // 최신순 정렬
  })

  if (filteredTodos.length === 0 && vacationsForDate.length === 0) {
    return (
      <div className="card p-8 text-center text-gray-500 dark:text-gray-400">
        <p className="text-lg mb-2">할일이 없습니다</p>
        <p>새로운 할일을 추가해보세요!</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 휴가 정보 섹션 */}
      {vacationsForDate.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-purple-700 dark:text-purple-300 mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            오늘의 휴가 ({vacationsForDate.length})
          </h3>
          <div className="space-y-2">
            {vacationsForDate.map(vacation => {
              const employee = employees.find(emp => emp.id === vacation.employeeId)
              return (
                <VacationItem
                  key={vacation.id}
                  vacation={vacation}
                  employee={employee}
                  compact={true}
                />
              )
            })}
          </div>
        </div>
      )}

      {sortedIncompleteTodos.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            진행 중인 할일 ({sortedIncompleteTodos.length})
          </h3>
          <div className="space-y-2">
            {sortedIncompleteTodos.map((todo, index) => (
              <div
                key={todo.id}
                draggable={currentView === 'today'}
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
                className={`
                  ${currentView === 'today' ? 'cursor-move' : ''}
                  ${draggedIndex === index ? 'opacity-50' : ''}
                  transition-opacity duration-200
                `}
              >
                <TodoItem todo={todo} />
              </div>
            ))}
          </div>
        </div>
      )}

      {sortedCompletedTodos.length > 0 && (currentView === 'today' || currentView === 'week' || currentView === 'month') && (
        <div>
          <h3 className="text-lg font-semibold text-green-700 dark:text-green-300 mb-4 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5" />
            완료된 할일 ({sortedCompletedTodos.length})
          </h3>
          <div className="space-y-2">
            {sortedCompletedTodos.map(todo => {
              // 서브태스크인 경우 특별한 컴팩트 표시
              if ((todo as any).isSubTask) {
                const subTask = todo as any
                const completedTime = subTask.completedAt ? new Date(subTask.completedAt) : new Date(subTask.updatedAt)
                
                return (
                  <div 
                    key={`subtask-${todo.id}`} 
                    className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg"
                  >
                    <div className="flex-shrink-0">
                      <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-green-800 dark:text-green-200 line-through">
                          {todo.title}
                        </span>
                        <span className="px-1.5 py-0.5 text-xs bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-200 rounded border">
                          하위작업
                        </span>
                      </div>
                      
                      <div className="text-xs text-green-700 dark:text-green-300">
                        <span className="font-medium">상위 프로젝트:</span> {subTask.parentTitle}
                        {subTask.parentDescription && (
                          <span className="ml-2 opacity-75">• {subTask.parentDescription}</span>
                        )}
                      </div>
                      
                      <div className="text-xs text-green-600 dark:text-green-400 mt-1">
                        완료시간: {completedTime.toLocaleTimeString('ko-KR', { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </div>
                    </div>
                  </div>
                )
              }
              
              // 일반 할일
              return <TodoItem key={todo.id} todo={todo} />
            })}
          </div>
        </div>
      )}
    </div>
  )
})

TodoList.displayName = 'TodoList'

export default TodoList