import { Clock, Calendar, AlertCircle, CheckCircle2, Circle, ChevronDown, ChevronRight, Repeat, Timer, Edit, Trash2, RotateCcw } from 'lucide-react'
import { useState } from 'react'
import type { Todo } from '../types/todo'
import { useTodos } from '../contexts/TodoContext'
// import { useRecurring } from '../contexts/RecurringContext' // Removed for simplified system
import { formatDate, formatTime, formatDateTime, isOverdue, getPriorityColor, getPriorityLabel } from '../utils/helpers'
import { getRecurrenceDescription } from '../utils/recurrence'
import { isRecurringInstanceTodo } from '../utils/recurringHelpers'
// import { getInstanceIdFromRecurringTodo } from '../utils/recurringHelpers' // Unused in simplified system
import SubTaskManager from './SubTaskManager'
import PomodoroTimer from './PomodoroTimer'
import EditTodoModal from './EditTodoModal'

interface TodoItemProps {
  todo: Todo
}

const TodoItem = ({ todo }: TodoItemProps) => {
  const { toggleTodo, isYesterdayIncompleteTodo, deleteTodo } = useTodos()
  // const { completeInstance, uncompleteInstance } = useRecurring() // Removed for simplified system
  const [isExpanded, setIsExpanded] = useState(false)
  const [isTimerOpen, setIsTimerOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)

  const isTaskOverdue = todo.dueDate ? isOverdue(todo.dueDate, todo.dueTime) : false
  const isYesterdayTask = isYesterdayIncompleteTodo(todo)
  const hasSubTasks = todo.type === 'project' && todo.subTasks && todo.subTasks.length > 0
  const completedSubTasks = hasSubTasks ? todo.subTasks!.filter(st => st.completed).length : 0
  const totalSubTasks = hasSubTasks ? todo.subTasks!.length : 0
  const progress = hasSubTasks ? (completedSubTasks / totalSubTasks) * 100 : 0

  // 반복 인스턴스인지 확인
  const isRecurringInstance = isRecurringInstanceTodo(todo)
  // const instanceId = getInstanceIdFromRecurringTodo(todo) // Unused in simplified system

  // 날짜 형식 변환 함수
  const formatCompactDate = (date: Date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}.${month}.${day}.`
  }

  const formatCompactDateTime = (date: Date) => {
    const dateStr = formatCompactDate(date)
    const timeStr = date.toLocaleTimeString('ko-KR', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
    return `${dateStr} ${timeStr}`
  }

  const handleToggle = () => {
    // 간소화된 시스템에서는 모든 할일을 동일하게 처리
    toggleTodo(todo.id)
  }

  const handleDelete = () => {
    if (confirm(`"${todo.title}" 할일을 삭제하시겠습니까?`)) {
      deleteTodo(todo.id)
    }
  }


  return (
    <div className={`card ${todo.completed ? 'p-2 mb-1.5 bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800' : 'p-2 mb-1.5'} ${isTaskOverdue && !todo.completed ? 'border-red-300 bg-red-50 dark:bg-red-900/20' : ''}`}>
      <div className="flex items-center gap-2">
        <button
          onClick={handleToggle}
          className="flex-shrink-0 hover:scale-110 transition-transform"
        >
          {todo.completed ? (
            <CheckCircle2 className="w-4 h-4 text-green-600" />
          ) : (
            <Circle className="w-4 h-4 text-gray-400 hover:text-blue-600" />
          )}
        </button>

        <div className="flex-1 min-w-0">
          {/* 첫 번째 줄: 제목, 우선순위, 태그들, 버튼들 */}
          <div className="flex items-center justify-between gap-1">
            <div className="flex items-center gap-1 min-w-0 flex-1">
              <h3 className={`text-xs font-medium truncate ${todo.completed ? 'line-through text-green-700 dark:text-green-300' : 'text-gray-900 dark:text-white'}`}>
                {todo.title}
              </h3>
              <span className={`px-1 py-0.5 text-[8px] rounded border ${getPriorityColor(todo.priority)} flex-shrink-0`}>
                {getPriorityLabel(todo.priority)}
              </span>
              {isYesterdayTask && (
                <span className="px-1 py-0.5 text-[8px] bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200 rounded flex-shrink-0">
                  어제
                </span>
              )}
              {todo.type === 'project' && (
                <span className="px-1 py-0.5 text-[8px] bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded flex-shrink-0">
                  {todo.project === 'longterm' ? '롱텀' : '숏텀'}
                </span>
              )}
            </div>

            <div className="flex items-center gap-0.5 flex-shrink-0">
              {isRecurringInstance && (
                <div className="p-0.5" title="반복 할일">
                  <Repeat className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                </div>
              )}
              <button
                onClick={() => setIsEditOpen(true)}
                className="p-0.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                title="할일 편집"
              >
                <Edit className="w-3 h-3" />
              </button>
              
              <button
                onClick={() => setIsTimerOpen(true)}
                className="p-0.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                title="포모도로 타이머 시작"
                disabled={todo.completed}
              >
                <Timer className="w-3 h-3" />
              </button>
              
              <button
                onClick={handleDelete}
                className="p-0.5 hover:bg-red-100 dark:hover:bg-red-800 rounded"
                title="할일 삭제"
              >
                <Trash2 className="w-3 h-3 text-red-600" />
              </button>
            </div>
          </div>

          {todo.description && (
            <p className={`text-sm mb-2 ${todo.completed ? 'text-green-600 dark:text-green-400' : 'text-gray-600 dark:text-gray-300'}`}>
              {todo.description}
            </p>
          )}

          {/* 두 번째 줄: 날짜 정보만 간단하게 */}
          {(todo.dueDate || todo.completed) && (
            <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">
              {todo.dueDate && (
                <span className={isTaskOverdue && !todo.completed ? 'text-red-600' : 'text-gray-600 dark:text-gray-400'}>
                  마감: {formatCompactDate(todo.dueDate)}{todo.dueTime && ` ${formatTime(todo.dueTime)}`}
                  {isTaskOverdue && !todo.completed && ' ⚠️'}
                </span>
              )}
              {todo.completed && todo.completedAt && (
                <span className="text-green-600 dark:text-green-400 ml-2">
                  완료: {formatCompactDateTime(todo.completedAt)}
                </span>
              )}
            </div>
          )}

          {hasSubTasks && isExpanded && (
            <div className="mt-3 pl-4 border-l-2 border-gray-200 dark:border-gray-600">
              <SubTaskManager todoId={todo.id} subTasks={todo.subTasks!} />
            </div>
          )}
        </div>
      </div>
      
      <PomodoroTimer
        isOpen={isTimerOpen}
        onClose={() => setIsTimerOpen(false)}
        todoTitle={todo.title}
        todoId={todo.id}
      />
      
      <EditTodoModal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        todo={todo}
      />
    </div>
  )
}

export default TodoItem