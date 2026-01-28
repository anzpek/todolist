import { useState } from 'react'
import { Search, Filter, X, Tag, Calendar, Check } from 'lucide-react'
import type { Priority, TaskType } from '../../../types/todo'
import { useTranslation } from 'react-i18next'
import { useTodos } from '../../../contexts/TodoContext'

interface SearchFilterProps {
  searchTerm: string
  onSearchChange: (term: string) => void
  priorityFilter: Priority | 'all'
  onPriorityFilterChange: (priority: Priority | 'all') => void
  typeFilter: TaskType | 'all'
  onTypeFilterChange: (type: TaskType | 'all') => void
  projectFilter: 'all' | 'longterm' | 'shortterm'
  onProjectFilterChange: (project: 'all' | 'longterm' | 'shortterm') => void
  tagFilter: string[]
  onTagFilterChange: (tags: string[]) => void
  completionDateFilter: 'all' | 'today' | 'yesterday' | 'thisWeek' | 'lastWeek' | 'thisMonth'
  onCompletionDateFilterChange: (filter: 'all' | 'today' | 'yesterday' | 'thisWeek' | 'lastWeek' | 'thisMonth') => void
  onClearFilters: () => void
  searchInputRef?: React.RefObject<HTMLInputElement | null>
  availableTags: string[]
}

const SearchFilter = ({
  searchTerm,
  onSearchChange,
  priorityFilter,
  onPriorityFilterChange,
  typeFilter,
  onTypeFilterChange,
  projectFilter,
  onProjectFilterChange,
  tagFilter,
  onTagFilterChange,
  completionDateFilter,
  onCompletionDateFilterChange,
  onClearFilters,
  searchInputRef,
  availableTags
}: SearchFilterProps) => {
  const { t } = useTranslation()
  const [isFilterOpen, setIsFilterOpen] = useState(false)

  const hasActiveFilters = priorityFilter !== 'all' || typeFilter !== 'all' || projectFilter !== 'all' || searchTerm.length > 0 || tagFilter.length > 0 || completionDateFilter !== 'all'

  const handleTagToggle = (tag: string) => {
    if (tagFilter.includes(tag)) {
      onTagFilterChange(tagFilter.filter(t => t !== tag))
    } else {
      onTagFilterChange([...tagFilter, tag])
    }
  }

  return (
    <div className="mb-6 relative z-30">
      <div className="flex gap-3">
        {/* 검색바 */}
        <div className="relative flex-1 group">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
          </div>
          <input
            ref={searchInputRef}
            type="text"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="block w-full pl-10 pr-3 py-2.5 bg-white/50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 backdrop-blur-sm transition-all duration-200 text-sm placeholder-gray-400 dark:text-white shadow-sm hover:bg-white/80 dark:hover:bg-gray-800/80"
            placeholder={t('search.placeholder')}
          />
        </div>

        {/* 필터 버튼 */}
        <button
          onClick={() => setIsFilterOpen(!isFilterOpen)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all duration-200 ${hasActiveFilters || isFilterOpen
            ? 'bg-blue-500 text-white border-blue-600 shadow-md shadow-blue-500/20'
            : 'bg-white/50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-800 backdrop-blur-sm shadow-sm'
            }`}
        >
          <Filter className="w-4 h-4" />
          <span className="text-sm font-medium hidden sm:inline">{t('search.filter')}</span>
          {hasActiveFilters && (
            <span className="bg-white/20 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
              {t('search.on')}
            </span>
          )}
        </button>

        {hasActiveFilters && (
          <button
            onClick={onClearFilters}
            className="flex items-center justify-center w-10 h-10 rounded-xl bg-gray-100 text-gray-500 hover:bg-red-50 hover:text-red-500 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-red-900/30 dark:hover:text-red-400 transition-colors border border-transparent hover:border-red-200 dark:hover:border-red-800"
            title={t('search.clear')}
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* 필터 옵션 패널 */}
      <div className={`
        absolute top-full left-0 right-0 mt-2 p-5 
        glass-panel shadow-xl transform origin-top transition-all duration-300 ease-out
        ${isFilterOpen ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 -translate-y-2 pointer-events-none'}
      `}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">

          {/* 우선순위 필터 */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              {t('search.priority')}
            </label>
            <select
              value={priorityFilter}
              onChange={(e) => onPriorityFilterChange(e.target.value as Priority | 'all')}
              className="w-full px-3 py-2 bg-white/50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 text-sm transition-colors"
            >
              <option value="all">{t('search.all')}</option>
              <option value="urgent">🚨 {t('modal.addTodo.urgent')}</option>
              <option value="high">🔴 {t('modal.addTodo.high')}</option>
              <option value="medium">🟡 {t('modal.addTodo.medium')}</option>
              <option value="low">🟢 {t('modal.addTodo.low')}</option>
            </select>
          </div>

          {/* 타입 필터 */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              {t('search.type')}
            </label>
            <select
              value={typeFilter}
              onChange={(e) => onTypeFilterChange(e.target.value as TaskType | 'all')}
              className="w-full px-3 py-2 bg-white/50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 text-sm transition-colors"
            >
              <option value="all">{t('search.all')}</option>
              <option value="simple">📝 {t('modal.addTodo.simpleTask')}</option>
              <option value="project">🚀 {t('modal.addTodo.project')}</option>
            </select>
          </div>

          {/* 프로젝트 필터 */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              {t('search.projectCategory')}
            </label>
            <select
              value={projectFilter}
              onChange={(e) => onProjectFilterChange(e.target.value as 'all' | 'longterm' | 'shortterm')}
              className="w-full px-3 py-2 bg-white/50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={typeFilter !== 'project' && typeFilter !== 'all'}
            >
              <option value="all">{t('search.all')}</option>
              <option value="longterm">📅 {t('modal.addTodo.longTermProject') || (t('projectTemplate.longterm'))} {t('modal.addTodo.project')}</option>
              <option value="shortterm">⚡ {t('modal.addTodo.shortTermProject') || (t('projectTemplate.shortterm'))} {t('modal.addTodo.project')}</option>
            </select>
          </div>

          {/* 태그 필터 */}
          <div className="space-y-2 sm:col-span-2 lg:col-span-1">
            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1">
              <Tag className="w-3 h-3" />
              {t('search.tags')}
            </label>
            <div className="p-2 bg-white/50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg max-h-32 overflow-y-auto custom-scrollbar">
              {availableTags.length > 0 ? (
                <div className="space-y-1">
                  {availableTags.map(tag => (
                    <label key={tag} className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded cursor-pointer transition-colors">
                      <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${tagFilter.includes(tag)
                        ? 'bg-blue-500 border-blue-500 text-white'
                        : 'border-gray-300 dark:border-gray-600'
                        }`}>
                        {tagFilter.includes(tag) && <Check className="w-3 h-3" />}
                      </div>
                      <input
                        type="checkbox"
                        checked={tagFilter.includes(tag)}
                        onChange={() => handleTagToggle(tag)}
                        className="hidden"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300 truncate">
                        {tag}
                      </span>
                    </label>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-gray-500 dark:text-gray-400 text-center py-2">
                  {t('search.noTags')}
                </div>
              )}
            </div>
          </div>

          {/* 완료일 필터 */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {t('search.completionDate')}
            </label>
            <select
              value={completionDateFilter}
              onChange={(e) => onCompletionDateFilterChange(e.target.value as typeof completionDateFilter)}
              className="w-full px-3 py-2 bg-white/50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 text-sm transition-colors"
            >
              <option value="all">{t('search.all')}</option>
              <option value="today">{t('search.todayCompleted')}</option>
              <option value="yesterday">{t('search.yesterdayCompleted')}</option>
              <option value="thisWeek">{t('search.thisWeekCompleted')}</option>
              <option value="lastWeek">{t('search.lastWeekCompleted')}</option>
              <option value="thisMonth">{t('search.thisMonthCompleted')}</option>
            </select>
          </div>
        </div>

        {/* 필터 요약 */}
        {hasActiveFilters && (
          <div className="mt-5 pt-4 border-t border-gray-200/50 dark:border-gray-700/50">
            <div className="flex flex-wrap gap-2">
              {tagFilter.length > 0 && (
                <div className="flex items-center gap-1 px-2.5 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-xs font-medium border border-blue-200 dark:border-blue-800">
                  <Tag className="w-3 h-3" />
                  {tagFilter.length}{t('search.countTags')}
                </div>
              )}
              {completionDateFilter !== 'all' && (
                <div className="flex items-center gap-1 px-2.5 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full text-xs font-medium border border-green-200 dark:border-green-800">
                  <Calendar className="w-3 h-3" />
                  {completionDateFilter === 'today' && t('search.todayCompleted')}
                  {completionDateFilter === 'yesterday' && t('search.yesterdayCompleted')}
                  {completionDateFilter === 'thisWeek' && t('search.thisWeekCompleted')}
                  {completionDateFilter === 'lastWeek' && t('search.lastWeekCompleted')}
                  {completionDateFilter === 'thisMonth' && t('search.thisMonthCompleted')}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div >
  )
}

export default SearchFilter