import React, { useState } from 'react'
import { Todo } from '../../../types/todo'
import { useTodos } from '../../../contexts/TodoContext'
import { getPriorityColor, getPriorityLabel, formatCompactDate } from '../../../utils/helpers'

interface AdvancedTodoItemProps {
  todo: Todo
  isSubTask?: boolean
  level?: number
}

const AdvancedTodoItem: React.FC<AdvancedTodoItemProps> = ({ 
  todo, 
  isSubTask = false, 
  level = 0 
}) => {
  const { toggleTodo, deleteTodo, updateTodo } = useTodos()
  const [isExpanded, setIsExpanded] = useState(false)

  const handleToggle = () => {
    toggleTodo(todo.id)
  }

  const handleDelete = () => {
    if (confirm(`"${todo.title}" 할일을 삭제하시겠습니까?`)) {
      deleteTodo(todo.id)
    }
  }

  // 서브태스크 진행률 계산
  const hasSubTasks = todo.type === 'project' && todo.subTasks && todo.subTasks.length > 0
  const completedSubTasks = hasSubTasks ? todo.subTasks!.filter(st => st.completed).length : 0
  const totalSubTasks = hasSubTasks ? todo.subTasks!.length : 0
  const progress = hasSubTasks ? Math.round((completedSubTasks / totalSubTasks) * 100) : 0

  // 들여쓰기 스타일
  const indentStyle = {
    paddingLeft: `${level * 20 + 16}px`
  }

  return (
    <div className="border-b border-gray-100 dark:border-gray-700 last:border-b-0">
      {/* 메인 태스크 */}
      <div 
        className="flex items-center gap-3 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
        style={indentStyle}
      >
        {/* 체크박스 */}
        <button
          onClick={handleToggle}
          className="flex-shrink-0 w-5 h-5"
        >
          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
            todo.completed
              ? 'bg-green-500 border-green-500'
              : 'border-gray-300 dark:border-gray-600 hover:border-blue-500'
          }`}>
            {todo.completed && <span className="text-white text-xs">✓</span>}
          </div>
        </button>

        {/* 확장/축소 버튼 (서브태스크가 있는 경우) */}
        {hasSubTasks && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex-shrink-0 w-4 h-4 text-gray-400 hover:text-gray-600"
          >
            <span className={`transform transition-transform ${isExpanded ? 'rotate-90' : ''}`}>
              ▶
            </span>
          </button>
        )}

        {/* 태스크 내용 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`font-medium ${
              todo.completed 
                ? 'line-through text-gray-500 dark:text-gray-400' 
                : 'text-gray-900 dark:text-white'
            }`}>
              {todo.title}
            </span>
            
            {/* 우선순위 배지 */}
            <span className={`px-2 py-1 text-xs rounded ${getPriorityColor(todo.priority)}`}>
              {getPriorityLabel(todo.priority)}
            </span>
          </div>
          
          {/* 설명 */}
          {todo.description && (
            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {todo.description}
            </div>
          )}
          
          {/* 진행률 바 (프로젝트인 경우) */}
          {hasSubTasks && (
            <div className="flex items-center gap-2 mt-2">
              <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                진행률 {completedSubTasks}/{totalSubTasks} ({progress}%)
              </span>
            </div>
          )}
        </div>

        {/* 마감일 */}
        {todo.dueDate && (
          <div className="text-xs text-gray-500 dark:text-gray-400">
            마감: {formatCompactDate(todo.dueDate)}
          </div>
        )}

        {/* 액션 버튼들 */}
        <div className="flex items-center gap-1">
          <button className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded text-xs">
            📄
          </button>
          <button className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded text-xs">
            🔗
          </button>
          <button 
            onClick={handleDelete}
            className="p-1 hover:bg-red-100 dark:hover:bg-red-900/20 rounded text-xs text-red-600"
          >
            🗑
          </button>
        </div>
      </div>

      {/* 서브태스크 (확장된 경우만 표시) */}
      {hasSubTasks && isExpanded && todo.subTasks && (
        <div className="bg-gray-50 dark:bg-gray-800/50">
          {todo.subTasks.map((subTask) => (
            <div
              key={subTask.id}
              className="flex items-center gap-3 py-2"
              style={{ paddingLeft: `${(level + 1) * 20 + 16}px` }}
            >
              <button
                onClick={() => {
                  const updatedSubTasks = todo.subTasks!.map(st =>
                    st.id === subTask.id ? { ...st, completed: !st.completed } : st
                  )
                  updateTodo(todo.id, { subTasks: updatedSubTasks })
                }}
                className="flex-shrink-0 w-4 h-4"
              >
                <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                  subTask.completed
                    ? 'bg-green-500 border-green-500'
                    : 'border-gray-300 dark:border-gray-600'
                }`}>
                  {subTask.completed && <span className="text-white text-xs">✓</span>}
                </div>
              </button>
              
              <span className={`text-sm ${
                subTask.completed 
                  ? 'line-through text-gray-500 dark:text-gray-400' 
                  : 'text-gray-700 dark:text-gray-300'
              }`}>
                {subTask.text}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default AdvancedTodoItem