import { useState } from 'react'
import { Search, Filter, X, Tag, Calendar } from 'lucide-react'
import type { Priority, TaskType } from '../types/todo'

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
    <div className="mb-4">
      <div className="flex gap-2">
        {/* 검색바 */}
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-gray-400" />
          </div>
          <input
            ref={searchInputRef}
            type="text"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white text-sm"
            placeholder="할일 검색..."
          />
        </div>

        {/* 필터 버튼 - 컴팩트 */}
        <button
          onClick={() => setIsFilterOpen(!isFilterOpen)}
          className={`flex items-center gap-1 px-3 py-2 rounded-lg border whitespace-nowrap ${
            hasActiveFilters 
              ? 'bg-blue-50 border-blue-300 text-blue-700 dark:bg-blue-900/20 dark:border-blue-600 dark:text-blue-400'
              : 'bg-white border-gray-300 text-gray-700 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300'
          } hover:bg-gray-50 dark:hover:bg-gray-600`}
        >
          <Filter className="w-4 h-4" />
          <span className="text-sm">필터</span>
          {hasActiveFilters && (
            <span className="bg-blue-500 text-white text-xs px-1.5 py-0.5 rounded-full">
              •
            </span>
          )}
        </button>

        {hasActiveFilters && (
          <button
            onClick={onClearFilters}
            className="flex items-center gap-1 px-2 py-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-600 dark:text-gray-300 dark:hover:bg-gray-500"
            title="필터 초기화"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* 필터 옵션 */}
      {isFilterOpen && (
        <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {/* 우선순위 필터 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                우선순위
              </label>
              <select
                value={priorityFilter}
                onChange={(e) => onPriorityFilterChange(e.target.value as Priority | 'all')}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              >
                <option value="all">전체</option>
                <option value="urgent">긴급</option>
                <option value="high">높음</option>
                <option value="medium">보통</option>
                <option value="low">낮음</option>
              </select>
            </div>

            {/* 타입 필터 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                타입
              </label>
              <select
                value={typeFilter}
                onChange={(e) => onTypeFilterChange(e.target.value as TaskType | 'all')}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              >
                <option value="all">전체</option>
                <option value="simple">단일 태스크</option>
                <option value="project">프로젝트</option>
              </select>
            </div>

            {/* 프로젝트 필터 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                프로젝트 구분
              </label>
              <select
                value={projectFilter}
                onChange={(e) => onProjectFilterChange(e.target.value as 'all' | 'longterm' | 'shortterm')}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                disabled={typeFilter !== 'project' && typeFilter !== 'all'}
              >
                <option value="all">전체</option>
                <option value="longterm">롱텀</option>
                <option value="shortterm">숏텀</option>
              </select>
            </div>

            {/* 태그 필터 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-1">
                <Tag className="w-4 h-4" />
                태그
              </label>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {availableTags.length > 0 ? (
                  availableTags.map(tag => (
                    <label key={tag} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={tagFilter.includes(tag)}
                        onChange={() => handleTagToggle(tag)}
                        className="mr-2 rounded"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300 truncate">
                        {tag}
                      </span>
                    </label>
                  ))
                ) : (
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    태그가 없습니다
                  </div>
                )}
              </div>
            </div>

            {/* 완료일 필터 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                완료일
              </label>
              <select
                value={completionDateFilter}
                onChange={(e) => onCompletionDateFilterChange(e.target.value as typeof completionDateFilter)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              >
                <option value="all">전체</option>
                <option value="today">오늘 완료</option>
                <option value="yesterday">어제 완료</option>
                <option value="thisWeek">이번 주 완료</option>
                <option value="lastWeek">지난 주 완료</option>
                <option value="thisMonth">이번 달 완료</option>
              </select>
            </div>
          </div>

          {/* 필터 요약 */}
          {hasActiveFilters && (
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
              <div className="flex flex-wrap gap-2">
                {tagFilter.length > 0 && (
                  <div className="flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded text-xs">
                    <Tag className="w-3 h-3" />
                    {tagFilter.length}개 태그
                  </div>
                )}
                {completionDateFilter !== 'all' && (
                  <div className="flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded text-xs">
                    <Calendar className="w-3 h-3" />
                    {completionDateFilter === 'today' && '오늘 완료'}
                    {completionDateFilter === 'yesterday' && '어제 완료'}
                    {completionDateFilter === 'thisWeek' && '이번 주 완료'}
                    {completionDateFilter === 'lastWeek' && '지난 주 완료'}
                    {completionDateFilter === 'thisMonth' && '이번 달 완료'}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default SearchFilter