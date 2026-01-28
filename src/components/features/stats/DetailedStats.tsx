import React, { useState } from 'react'
import { useTodos } from '../../../contexts/TodoContext'
import { useTranslation } from 'react-i18next'

const DetailedStats: React.FC = () => {
  const { todos, stats, searchQuery, setSearchQuery, filterCompleted, setFilterCompleted, addTodo } = useTodos()
  const { t } = useTranslation()
  const [showAddForm, setShowAddForm] = useState(false)
  const [newTodoTitle, setNewTodoTitle] = useState('')

  const handleAddTodo = () => {
    if (newTodoTitle.trim()) {
      addTodo({
        title: newTodoTitle.trim(),
        completed: false,
        type: 'single',
        priority: 'medium'
      })
      setNewTodoTitle('')
      setShowAddForm(false)
    }
  }

  // 상세 통계 계산
  const completionRate = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0
  const scheduledCount = todos.filter(todo =>
    !todo.completed && todo.dueDate && new Date(todo.dueDate) > new Date()
  ).length
  const overdueCount = todos.filter(todo =>
    !todo.completed && todo.dueDate && new Date(todo.dueDate) < new Date()
  ).length

  const priorityStats = {
    urgent: todos.filter(t => t.priority === 'urgent').length,
    high: todos.filter(t => t.priority === 'high').length,
    medium: todos.filter(t => t.priority === 'medium').length,
    low: todos.filter(t => t.priority === 'low').length
  }

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700 mb-6">
      {/* 메인 통계 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
            <span className="text-lg">≡</span>
          </button>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">{t('detailedStats.title')}</h1>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2"
          >
            <span>+</span>
            {t('common.addTodo')}
          </button>
          <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
            <span>👤</span>
          </button>
          <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
            <span>🔔</span>
          </button>
        </div>
      </div>

      {/* 상세 통계 카드들 */}
      <div className="grid grid-cols-6 gap-4 mb-6">
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">{completionRate}%</div>
          <div className="text-xs text-gray-600 dark:text-gray-400">{t('detailedStats.completionRate')}</div>
        </div>

        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">{stats.pending}</div>
          <div className="text-xs text-gray-600 dark:text-gray-400">{t('detailedStats.inProgress')}</div>
        </div>

        <div className="text-center">
          <div className="text-2xl font-bold text-purple-600">{scheduledCount}</div>
          <div className="text-xs text-gray-600 dark:text-gray-400">{t('detailedStats.scheduled')}</div>
        </div>

        <div className="text-center">
          <div className="text-2xl font-bold text-red-600">{overdueCount}</div>
          <div className="text-xs text-gray-600 dark:text-gray-400">{t('detailedStats.overdue')}</div>
        </div>

        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">{priorityStats.urgent}</div>
          <div className="text-xs text-gray-600 dark:text-gray-400">{t('detailedStats.urgent')}</div>
        </div>

        <div className="text-center">
          <div className="text-2xl font-bold text-orange-600">{priorityStats.high}</div>
          <div className="text-xs text-gray-600 dark:text-gray-400">{t('detailedStats.high')}</div>
        </div>
      </div>

      {/* 검색 및 필터 */}
      <div className="flex items-center gap-4">
        <div className="flex-1 relative">
          <input
            type="text"
            placeholder={t('search.placeholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
          <span className="absolute left-3 top-2.5 text-gray-400">🔍</span>
        </div>
        <button className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2">
          <span>🔽</span>
          {t('detailedStats.filter')}
        </button>
      </div>

      {/* 할일 추가 폼 */}
      {showAddForm && (
        <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder={t('modal.addTodo.placeholder')}
              value={newTodoTitle}
              onChange={(e) => setNewTodoTitle(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddTodo()}
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              autoFocus
            />
            <button
              onClick={handleAddTodo}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
            >
              {t('common.add')}
            </button>
            <button
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-700 rounded-lg"
            >
              {t('common.cancel')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default DetailedStats