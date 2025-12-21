import { useState, useRef, useEffect } from 'react'
import { Check, Trash2, Edit, MoreVertical, Calendar, Clock, ArrowRight, Flag, Play, ChevronDown, ChevronUp, RotateCcw, Users, Sparkles, RefreshCw } from 'lucide-react'
import { format, isAfter, isBefore, startOfDay, addDays, differenceInHours } from 'date-fns'
import { ko, enUS } from 'date-fns/locale'
import { useTranslation } from 'react-i18next'
import { useTodos } from '../contexts/TodoContext'
import { useAuth } from '../contexts/AuthContext'
import { useSwipe } from '../hooks/useSwipe'
import type { Todo } from '../types/todo'
import SubTaskManager from './SubTaskManager'

interface TodoItemProps {
  todo: Todo
  onEdit?: (todo: Todo) => void
  compact?: boolean
}

const TodoItem = ({ todo, onEdit, compact = false }: TodoItemProps) => {
  const { t, i18n } = useTranslation()
  const dateLocale = i18n.language === 'ko' ? ko : enUS
  const { toggleTodo, deleteTodo, updateTodo } = useTodos()
  const { currentUser } = useAuth()
  const [isSwiping, setIsSwiping] = useState(false)
  const itemRef = useRef<HTMLDivElement>(null)
  const [isExpanded, setIsExpanded] = useState(false)

  // NEW/최근 수정 배지 계산 (공유 할일에만 적용)
  const isSharedTodo = todo.visibility?.isShared
  const hoursThreshold = 24 // 24시간 이내
  const now = new Date()

  // NEW: 다른 사용자가 생성한 공유 할일 (24시간 이내)
  const isNewSharedTodo = isSharedTodo &&
    todo.ownerId &&
    todo.ownerId !== currentUser?.uid &&
    todo.createdAt &&
    differenceInHours(now, new Date(todo.createdAt)) <= hoursThreshold

  // 최근 수정: 다른 사용자가 수정한 공유 할일 (24시간 이내, 생성 후 수정된 경우)
  const isRecentlyModified = isSharedTodo &&
    todo.lastModifiedBy &&
    todo.lastModifiedBy !== currentUser?.uid &&
    todo.updatedAt &&
    todo.createdAt &&
    new Date(todo.updatedAt).getTime() !== new Date(todo.createdAt).getTime() &&
    differenceInHours(now, new Date(todo.updatedAt)) <= hoursThreshold

  // 서브태스크 계산
  const totalSubTasks = todo.subTasks?.length || 0
  const completedSubTasks = todo.subTasks?.filter(t => t.completed).length || 0
  const hasSubTasks = totalSubTasks > 0
  const progress = hasSubTasks ? (completedSubTasks / totalSubTasks) * 100 : 0

  // 날짜 관련 로직
  const isOverdue = todo.dueDate && isBefore(new Date(todo.dueDate), startOfDay(new Date())) && !todo.completed
  const isDueToday = todo.dueDate && isAfter(new Date(todo.dueDate), startOfDay(new Date())) && isBefore(new Date(todo.dueDate), addDays(startOfDay(new Date()), 1))

  // 날짜 포맷팅 함수
  const formatDate = (date: Date | string) => {
    return format(new Date(date), 'yyyy.MM.dd', { locale: dateLocale })
  }

  // 날짜 표시 렌더링
  const renderDateDisplay = () => {
    if (!todo.startDate && !todo.dueDate) return null

    // 시작일과 마감일이 모두 있는 경우
    if (todo.startDate && todo.dueDate) {
      return (
        <div className="flex items-center gap-1 text-[10px] font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
          <span>{formatDate(todo.startDate)}</span>
          <span className="text-gray-400">~</span>
          <span className={`${isOverdue ? 'text-red-500 font-bold' : ''}`}>
            {formatDate(todo.dueDate)}
          </span>
        </div>
      )
    }

    // 시작일만 있는 경우
    if (todo.startDate) {
      return (
        <div className="flex items-center gap-1 text-[10px] font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
          <Play className="w-3 h-3 text-primary-500" />
          <span>{formatDate(todo.startDate)}</span>
        </div>
      )
    }

    // 마감일만 있는 경우
    if (todo.dueDate) {
      return (
        <div className={`flex items-center gap-1 text-[10px] font-medium bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded ${isOverdue ? 'text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'
          }`}>
          <Flag className={`w-3 h-3 ${isOverdue ? 'text-red-500 fill-red-500' : 'text-gray-400'}`} />
          <span>{formatDate(todo.dueDate)}</span>
        </div>
      )
    }
  }

  const handleToggle = () => {
    if (!isSwiping) {
      toggleTodo(todo.id)
    }
  }

  // 권한 체크
  const canEdit = !todo.myPermission || todo.myPermission === 'edit' || todo.myPermission === 'admin';
  const canDelete = !todo.myPermission || todo.myPermission === 'admin';

  // 스와이프 핸들러
  const swipeHandlers = useSwipe({
    onSwipeLeft: () => {
      if (canDelete && confirm(t('calendar.deleteConfirm'))) {
        deleteTodo(todo.id)
      }
    },
    onSwipeRight: () => {
      if (canEdit) toggleTodo(todo.id)
    }
  }, {
    minSwipeDistance: 50
  })

  // 우선순위별 테두리 색상 (모바일용)
  const getPriorityBorderColor = () => {
    if (todo.completed) return 'border-gray-200 dark:border-gray-700'
    switch (todo.priority) {
      case 'urgent': return 'border-red-500 dark:border-red-500'
      case 'high': return 'border-orange-500 dark:border-orange-500'
      case 'medium': return 'border-primary-500 dark:border-primary-500' // 일반(보통)도 색상 표시
      default: return 'border-gray-200 dark:border-gray-700'
    }
  }

  return (
    <div
      ref={itemRef}
      className={`
        relative group mb-3 transition-all duration-300 ease-out
        ${todo.completed ? 'opacity-60' : 'opacity-100'}
      `}
      onClick={() => {
        // 읽기 전용이어도 상세 내용은 볼 수 있어야 하므로 모달은 열리게 함 (모달 내부에서 수정 불가능하게 처리됨)
        onEdit?.(todo)
      }}
      {...swipeHandlers}
    >
      <div className={`
        relative p-5 rounded-2xl border backdrop-blur-sm transition-all duration-300
        ${todo.completed
          ? 'bg-gray-50/50 dark:bg-gray-800/30 border-gray-200 dark:border-gray-700'
          : `bg-white/70 dark:bg-gray-800/70 shadow-sm hover:shadow-md hover:-translate-y-0.5 ${getPriorityBorderColor()} md:border-white/50 md:dark:border-gray-700`
        }
      `}>

        {/* 우측 상단 메타데이터 영역 (태그 + 날짜) - PC 버전 (Compact 모드에서는 숨김) */}
        {!compact && (
          <div className="hidden md:flex absolute top-4 right-20 flex-col items-end gap-1.5 z-10">
            {/* 1행: 태그들 */}
            <div className="flex items-center gap-1.5">
              {todo.visibility?.isShared && (
                <span className="px-1.5 py-0.5 text-[10px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 rounded-full border border-blue-200 dark:border-blue-800 flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  {t('sharing.shared') || 'Shared'}
                </span>
              )}

              {/* NEW 배지 */}
              {isNewSharedTodo && (
                <span className="px-1.5 py-0.5 text-[10px] font-bold bg-green-500 text-white rounded-full flex items-center gap-1 animate-pulse">
                  <Sparkles className="w-3 h-3" />
                  NEW
                </span>
              )}

              {/* 최근 수정 배지 */}
              {!isNewSharedTodo && isRecentlyModified && (
                <span className="px-1.5 py-0.5 text-[10px] font-bold bg-orange-500 text-white rounded-full flex items-center gap-1">
                  <RefreshCw className="w-3 h-3" />
                  최근 수정
                </span>
              )}

              {todo.recurrence && todo.recurrence !== 'none' && (
                <span className="px-1.5 py-0.5 text-[10px] font-bold bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 rounded-full border border-purple-200 dark:border-purple-800 flex items-center gap-1">
                  <ArrowRight className="w-3 h-3" />
                  {t('modal.addTodo.recurrence')}
                </span>
              )}

              {todo.priority && todo.priority !== 'medium' && (
                <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full border flex items-center gap-1 ${todo.priority === 'urgent'
                  ? 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800'
                  : todo.priority === 'high'
                    ? 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800'
                    : 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-900/30 dark:text-gray-300 dark:border-gray-800'
                  }`}>
                  {todo.priority === 'urgent'
                    ? t('modal.addTodo.urgent')
                    : todo.priority === 'high'
                      ? t('modal.addTodo.high')
                      : t('modal.addTodo.low')}
                </span>
              )}

              {todo.type === 'project' && (
                <span className="px-2 py-0.5 text-[10px] font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 rounded-full border border-indigo-200 dark:border-indigo-800 flex items-center gap-1">
                  {todo.project === 'longterm' ? t('projectTemplate.longterm') : t('projectTemplate.shortterm')}
                  {hasSubTasks && (
                    <span className="ml-1 opacity-80">
                      {completedSubTasks}/{totalSubTasks}
                    </span>
                  )}
                </span>
              )}
            </div>

            {/* 2행: 날짜 정보 (우측 정렬) */}
            {renderDateDisplay()}
          </div>
        )}

        {/* 모바일용 메타데이터 (반복 아이콘, 장기 뱃지) */}
        <div className="md:hidden absolute top-4 right-20 flex items-center gap-1.5 z-10">
          {/* NEW 배지 (모바일) */}
          {isNewSharedTodo && (
            <span className="px-1.5 py-0.5 text-[10px] font-bold bg-green-500 text-white rounded-full flex items-center gap-0.5 animate-pulse">
              <Sparkles className="w-3 h-3" />
              NEW
            </span>
          )}
          {/* 최근 수정 배지 (모바일) */}
          {!isNewSharedTodo && isRecentlyModified && (
            <span className="px-1.5 py-0.5 text-[10px] font-bold bg-orange-500 text-white rounded-full flex items-center gap-0.5">
              <RefreshCw className="w-3 h-3" />
              수정됨
            </span>
          )}
          {todo.visibility?.isShared && (
            <Users className="w-4 h-4 text-blue-500" />
          )}
          {todo.recurrence && todo.recurrence !== 'none' && (
            <RotateCcw className="w-4 h-4 text-purple-500" />
          )}
          {todo.type === 'project' && todo.project === 'longterm' && (
            <span className="px-1.5 py-0.5 text-[10px] font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 rounded-full border border-indigo-200 dark:border-indigo-800">
              {t('projectTemplate.longterm')}
            </span>
          )}
        </div>

        {/* Action Buttons (Always visible) */}
        <div className="absolute top-4 right-4 z-20 flex flex-col items-end gap-1">
          <div className="flex items-center gap-1">
            {canEdit && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onEdit?.(todo)
                }}
                className="p-1.5 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                title={t('common.edit')}
              >
                <Edit className="w-4 h-4" />
              </button>
            )}
            {canDelete && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  if (window.confirm(t('common.deleteConfirm') || '이 할일을 삭제하시겠습니까?')) {
                    deleteTodo(todo.id)
                  }
                }}
                className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                title={t('common.delete')}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        <div className="flex items-start gap-4">
          {/* 모던 체크박스 */}
          <button
            onClick={(e) => {
              e.stopPropagation()
              if (canEdit) handleToggle()
            }}
            disabled={!canEdit}
            className={`
              flex-shrink-0 w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all duration-300 mt-1
              ${todo.completed
                ? 'bg-primary-500 border-primary-500 text-white scale-110'
                : 'border-gray-300 dark:border-gray-600 hover:border-primary-400 dark:hover:border-primary-400 bg-white dark:bg-gray-800'
              }
              ${!canEdit ? 'opacity-50 cursor-not-allowed' : ''}
            `}
          >
            {todo.completed && <Check className="w-4 h-4" strokeWidth={3} />}
          </button>

          <div className="flex-1 min-w-0 pt-0.5 pr-28 sm:pr-24">
            {/* 제목 및 확장 버튼 */}
            <div className="flex items-start gap-2">
              <h3 className={`
                text-base font-semibold leading-snug transition-all duration-300 break-words
                ${todo.completed
                  ? 'text-gray-400 dark:text-gray-500 line-through decoration-2 decoration-gray-300'
                  : 'text-gray-900 dark:text-white'
                }
              `}>
                {todo.title}
              </h3>

              {/* 확장 버튼 (하위 작업이 있을 때만 표시) */}
              {hasSubTasks && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setIsExpanded(!isExpanded)
                  }}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                >
                  {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
              )}
            </div>

            {/* 설명 (존재할 경우) */}
            {todo.description && (
              <p className={`mt-1.5 text-sm line-clamp-2 ${todo.completed ? 'text-gray-400' : 'text-gray-600 dark:text-gray-300'}`}>
                {todo.description}
              </p>
            )}

            {/* 하단 정보 (태그 등) */}
            <div className="flex flex-wrap items-center gap-2 mt-3">
              {/* 모바일(또는 Compact 모드)에서 날짜를 하단에 표시 */}
              <div className={compact ? '' : 'md:hidden'}>
                {renderDateDisplay()}
              </div>

              {todo.tags && todo.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {todo.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="text-[10px] px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-md font-medium"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* 서브태스크 진행률 바 (프로젝트인 경우) */}
            {hasSubTasks && !todo.completed && (
              <div className="mt-3 w-full">
                <div className="flex justify-between text-[10px] text-gray-500 mb-1">
                  <span>{t('common.progress')}</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <div className="h-1.5 w-full bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${progress === 100 ? 'bg-green-500' : 'bg-primary-500'
                      }`}
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}

            {/* 확장된 하위 작업 목록 */}
            {isExpanded && (
              <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700/50 animate-fade-in-down">
                <SubTaskManager
                  todoId={todo.id}
                  subTasks={todo.subTasks || []}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default TodoItem