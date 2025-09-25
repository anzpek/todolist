import React, { useState } from 'react'
import { useTodos } from '../contexts/TodoContext'

const QuickStats: React.FC = () => {
  const { stats, todos } = useTodos()
  const [isExpanded, setIsExpanded] = useState(false)

  const todayTodos = todos.filter(todo => {
    if (!todo.dueDate) return false
    const today = new Date()
    const dueDate = new Date(todo.dueDate)
    return dueDate.toDateString() === today.toDateString()
  })

  const overdueTodos = todos.filter(todo => {
    if (!todo.dueDate || todo.completed) return false
    const now = new Date()
    return new Date(todo.dueDate) < now
  })

  const completionRate = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0

  return (
    <div className="fixed bottom-20 right-4 z-30">
      {/* 확장된 통계 패널 */}
      {isExpanded && (
        <div className="mb-3 bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-4 min-w-[200px] animate-fade-in">
          <div className="space-y-3">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary-600 dark:text-primary-400 mb-1">
                {completionRate}%
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">완료율</div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-2">
                <div 
                  className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${completionRate}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-2">
                <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                  {todayTodos.length}
                </div>
                <div className="text-xs text-blue-600 dark:text-blue-400">오늘</div>
              </div>
              
              <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-2">
                <div className="text-lg font-bold text-red-600 dark:text-red-400">
                  {overdueTodos.length}
                </div>
                <div className="text-xs text-red-600 dark:text-red-400">지연</div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div>
                <div className="font-bold text-gray-900 dark:text-white">
                  {stats.total}
                </div>
                <div className="text-gray-600 dark:text-gray-400">전체</div>
              </div>
              <div>
                <div className="font-bold text-green-600 dark:text-green-400">
                  {stats.completed}
                </div>
                <div className="text-gray-600 dark:text-gray-400">완료</div>
              </div>
              <div>
                <div className="font-bold text-orange-600 dark:text-orange-400">
                  {stats.pending}
                </div>
                <div className="text-gray-600 dark:text-gray-400">진행중</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 플로팅 버튼 */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-14 h-14 bg-primary-600 hover:bg-primary-700 text-white rounded-full shadow-lg flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95"
      >
        {isExpanded ? (
          <span className="text-xl">📈</span>
        ) : (
          <div className="flex flex-col items-center">
            <div className="text-xs font-bold">{stats.pending}</div>
            <div className="text-xs leading-none">할일</div>
          </div>
        )}
      </button>
    </div>
  )
}

export default QuickStats