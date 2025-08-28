import { CheckCircle2, Calendar } from 'lucide-react'
import { useState, memo, useMemo, useEffect } from 'react'
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
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)


  // Memoized todo retrieval based on current view
  const currentTodos = useMemo((): Todo[] => {
    let result: Todo[] = []
    switch (currentView) {
      case 'today':
        result = getTodayTodos(selectedDate)
        break
      case 'week': 
        result = getWeekTodos()
        break
      case 'month':
        result = getMonthTodos()
        break
      default:
        result = todos
    }
    
    // 🔍 간단 디버깅: 각 뷰의 월간업무보고 데이터 확인
    const monthlyReports = result.filter(t => t.title.includes('월간업무보고'))
    if (monthlyReports.length > 0) {
      console.log(`📊 ${currentView}뷰 - 월간업무보고:`, monthlyReports.length, '개, priority:', monthlyReports[0]?.priority)
    }
    
    return result
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

  const handleDragStart = (e: React.DragEvent, index: number) => {
    console.log('🔥 드래그 시작:', index, sortedIncompleteTodos[index]?.title)
    
    setDraggedIndex(index)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', index.toString())
  }

  const handleDragOver = (e: React.DragEvent, hoverIndex?: number) => {
    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer.dropEffect = 'move'
    
    if (hoverIndex !== undefined && hoverIndex !== dragOverIndex) {
      setDragOverIndex(hoverIndex)
    }
  }

  const handleDrop = async (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault()
    console.log('🎯 드롭 시도:', draggedIndex, '→', dropIndex)
    console.log('📋 드래그된 할일:', sortedIncompleteTodos[draggedIndex!]?.title)
    console.log('📋 드롭될 위치:', dropIndex, dropIndex < sortedIncompleteTodos.length ? `${sortedIncompleteTodos[dropIndex]?.title} 위` : '맨 끝')
    
    if (draggedIndex === null) return
    
    try {
      if (draggedIndex !== dropIndex) {
        // 아래로 드래그하는 경우 배열 조작 특성상 dropIndex를 1 감소시켜야 함
        let adjustedDropIndex = dropIndex
        if (dropIndex > draggedIndex) {
          adjustedDropIndex = dropIndex - 1
          console.log(`⬇️ 아래로 드래그: dropIndex ${dropIndex} → ${adjustedDropIndex}`)
        }
        
        // 예상 결과 미리 계산해서 로그
        const testArray = Array.from(sortedIncompleteTodos)
        const [removed] = testArray.splice(draggedIndex, 1)
        testArray.splice(adjustedDropIndex, 0, removed)
        
        console.log('🔄 예상 결과:')
        testArray.forEach((todo, index) => {
          console.log(`  ${index}: ${todo.title}`)
        })
        
        await reorderTodos(draggedIndex, adjustedDropIndex, sortedIncompleteTodos)
        console.log('✅ 드래그 앤 드롭 성공')
      }
    } catch (error) {
      console.error('❌ 드래그 앤 드롭 저장 실패:', error)
    }
    
    // 상태 초기화
    setDraggedIndex(null)
    setDragOverIndex(null)
  }

  const handleDragEnd = () => {
    setDraggedIndex(null)
    setDragOverIndex(null)
  }

  // 우선순위별로 정렬 (긴급 > 높음 > 보통 > 낮음)
  const sortByPriority = (todos: Todo[]): Todo[] => {
    const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 }
    
    const sorted = todos.sort((a, b) => {
      // 🔥 우선순위가 다르면 우선순위로만 정렬
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority]
      if (priorityDiff !== 0) {
        console.log(`🎯 우선순위 정렬: ${a.title}(${a.priority}) vs ${b.title}(${b.priority}) → ${priorityDiff}`)
        return priorityDiff
      }
      
      // 🔥 같은 우선순위 내에서만 order 값으로 정렬
      const orderA = a.order
      const orderB = b.order
      
      // 둘 다 order 값이 있는 경우에만 order로 정렬
      if (orderA !== undefined && orderB !== undefined) {
        if (orderA !== orderB) {
          console.log(`📊 같은 우선순위 내 order 정렬: ${a.title}(${orderA}) vs ${b.title}(${orderB})`)
          return orderA - orderB
        }
      }
      
      // 🔥 같은 우선순위에서 한쪽만 order가 있는 경우 - 우선순위가 같으므로 order 우선
      if (orderA !== undefined && orderB === undefined) return -1
      if (orderA === undefined && orderB !== undefined) return 1
      
      // order가 같은 경우(둘 다 없거나 같은 값)에만 추가 정렬 기준 적용
      
      // 마감일이 있는 것 우선
      if (a.dueDate && b.dueDate) {
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
      }
      if (a.dueDate) return -1
      if (b.dueDate) return 1
      
      // 둘 다 order가 없고 마감일도 없으면 생성일 역순 (최신이 위쪽)
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })
    
    return sorted
  }

  const sortedIncompleteTodos = sortByPriority(incompleteTodos)
  
  // 정렬된 할일 사용
  const displayTodos = sortedIncompleteTodos
  
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
    <div className="space-y-6 relative">
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

      {/* 진행 중인 할일 섹션 */}
      {sortedIncompleteTodos.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            진행 중인 할일 ({sortedIncompleteTodos.length})
          </h3>
          <div 
            className="relative"
            onDragOver={(e) => {
              e.preventDefault()
              if (draggedIndex === null) return
              
              // 전체 컨테이너에서 위치 계산
              const container = e.currentTarget
              const rect = container.getBoundingClientRect()
              const y = e.clientY - rect.top
              
              // 각 아이템의 위치를 찾아서 드롭 인덱스 결정
              const items = container.querySelectorAll('[data-todo-index]')
              let newDropIndex = items.length // 기본값: 맨 끝
              
              // 디버깅을 위한 로그
              console.log('🖱️ 마우스 Y 위치:', y, '전체 아이템:', items.length, '드래그 중인 인덱스:', draggedIndex)
              
              // 각 아이템을 순회하며 마우스 위치와 비교
              for (let i = 0; i < items.length; i++) {
                const itemRect = items[i].getBoundingClientRect()
                const itemTop = itemRect.top - rect.top
                const itemBottom = itemRect.bottom - rect.top
                const itemMidY = itemTop + (itemBottom - itemTop) / 2
                
                console.log(`📋 아이템 ${i}: top=${itemTop.toFixed(1)}, mid=${itemMidY.toFixed(1)}, bottom=${itemBottom.toFixed(1)}`)
                
                if (y < itemMidY) {
                  // 아이템의 상반부에 마우스가 있으면 해당 아이템 위에 삽입
                  newDropIndex = i
                  console.log(`✅ 아이템 ${i} 상반부에서 드롭 인덱스 결정: ${newDropIndex}`)
                  break
                }
              }
              
              console.log(`🎯 최종 드롭 인덱스: ${newDropIndex} (draggedIndex: ${draggedIndex})`)
              
              // 변경이 없는 경우는 스킵
              if (newDropIndex === draggedIndex) {
                console.log('❌ 자기 자신의 위치이므로 스킵')
                setDragOverIndex(null)
                return
              }
              
              setDragOverIndex(newDropIndex)
            }}
            onDrop={(e) => {
              e.preventDefault()
              if (dragOverIndex !== null) {
                handleDrop(e, dragOverIndex)
              }
            }}
            style={{
              background: draggedIndex !== null ? 'linear-gradient(to bottom, #dbeafe 0%, #dbeafe 100%)' : 'transparent'
            }}
          >
            {sortedIncompleteTodos.map((todo, index) => {
              return (
                <div key={todo.id} className="relative">
                  {/* 드롭 인디케이터 */}
                  {draggedIndex !== null && dragOverIndex === index && (
                    <div className="absolute top-0 left-0 right-0 h-1 bg-blue-500 z-30" />
                  )}
                  
                  {/* 할일 아이템 */}
                  <div 
                    data-todo-index={index}
                    draggable 
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragEnd={handleDragEnd}
                    className={`
                      cursor-grab active:cursor-grabbing transition-all duration-200 relative
                      ${draggedIndex === index ? 'scale-105 shadow-lg z-20' : ''}
                      mb-1
                    `}
                  >
                    <TodoItem todo={todo} />
                  </div>
                  
                  {/* 마지막 아이템 후 드롭 인디케이터 */}
                  {draggedIndex !== null && dragOverIndex === index + 1 && index === sortedIncompleteTodos.length - 1 && (
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-500 z-30" />
                  )}
                </div>
              )
            })}
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