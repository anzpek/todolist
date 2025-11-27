import { useState, useRef, useEffect } from 'react'
import { Check, Trash2, Edit, MoreVertical, Calendar, Clock, ArrowRight, Flag, Play, ChevronDown, ChevronUp } from 'lucide-react'
import { format, isAfter, isBefore, startOfDay, addDays } from 'date-fns'
import { ko } from 'date-fns/locale'
import { useTodos } from '../contexts/TodoContext'
import { useSwipe } from '../hooks/useSwipe'
import type { Todo } from '../types/todo'
import SubTaskManager from './SubTaskManager'

interface TodoItemProps {
  todo: Todo
}

const TodoItem = ({ todo }: TodoItemProps) => {
  const { toggleTodo, deleteTodo, updateTodo } = useTodos()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const [isSwiping, setIsSwiping] = useState(false)
  const itemRef = useRef<HTMLDivElement>(null)
  const [isExpanded, setIsExpanded] = useState(false)

  // 서브태스크 계산
  const totalSubTasks = todo.subTasks?.length || 0
  const completedSubTasks = todo.subTasks?.filter(t => t.completed).length || 0
  const hasSubTasks = totalSubTasks > 0
  const progress = hasSubTasks ? (completedSubTasks / totalSubTasks) * 100 : 0

  // 날짜 관련 로직
  const isOverdue = todo.dueDate && isBefore(new Date(todo.dueDate), startOfDay(new Date())) && !todo.completed
  const isDueToday = todo.dueDate && isAfter(new Date(todo.dueDate), startOfDay(new Date())) && isBefore(new Date(todo.dueDate), addDays(startOfDay(new Date()), 1))
  
  // 날짜 포맷팅 함수
  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'yyyy.MM.dd', { locale: ko })
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
          <Play className="w-3 h-3 text-blue-500" />
          <span>{formatDate(todo.startDate)}</span>
        </div>
      )
    }

    // 마감일만 있는 경우
    if (todo.dueDate) {
      return (
        <div className={`flex items-center gap-1 text-[10px] font-medium bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded ${
          isOverdue ? 'text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'
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

  // 스와이프 핸들러
  const swipeHandlers = useSwipe({
    onSwipeLeft: () => {
      if (confirm('할일을 삭제하시겠습니까?')) {
        deleteTodo(todo.id)
      }
    },
    onSwipeRight: () => toggleTodo(todo.id)
  }, {
    threshold: 50,
    minSwipeDistance: 50
  })

  // 메뉴 외부 클릭 감지
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div 
      ref={itemRef}
      className={`
        relative group mb-3 transition-all duration-300 ease-out
        ${todo.completed ? 'opacity-60' : 'opacity-100'}
      `}
      {...swipeHandlers}
    >
      <div className={`
        relative p-5 rounded-2xl border backdrop-blur-sm transition-all duration-300
        ${todo.completed 
          ? 'bg-gray-50/50 dark:bg-gray-800/30 border-gray-200 dark:border-gray-700' 
          : 'bg-white/70 dark:bg-gray-800/70 border-white/50 dark:border-gray-700 shadow-sm hover:shadow-md hover:-translate-y-0.5'
        }
      `}>
        
        {/* 우측 상단 메타데이터 영역 (태그 + 날짜) */}
        <div className="absolute top-4 right-4 flex flex-col items-end gap-1.5 z-10">
          {/* 1행: 태그들 */}
          <div className="flex items-center gap-1.5">
            {todo.recurring && (
              <span className="px-1.5 py-0.5 text-[10px] font-bold bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 rounded-full border border-purple-200 dark:border-purple-800 flex items-center gap-1">
                <ArrowRight className="w-3 h-3" />
                반복
              </span>
            )}
            
            {todo.priority && todo.priority !== 'medium' && (
              <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full border flex items-center gap-1 ${
                todo.priority === 'urgent'
                  ? 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800'
                  : 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800'
              }`}>
                {todo.priority === 'urgent' ? '긴급' : '높음'}
              </span>
            )}

            {todo.type === 'project' && (
              <span className="px-2 py-0.5 text-[10px] font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 rounded-full border border-indigo-200 dark:border-indigo-800 flex items-center gap-1">
                {todo.project === 'longterm' ? '장기' : '단기'}
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

        <div className="flex items-start gap-4">
          {/* 모던 체크박스 */}
          <button
            onClick={handleToggle}
            className={`
              flex-shrink-0 w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all duration-300 mt-1
              ${todo.completed 
                ? 'bg-blue-500 border-blue-500 text-white scale-110' 
                : 'border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-400 bg-white dark:bg-gray-800'
              }
            `}
          >
            {todo.completed && <Check className="w-4 h-4" strokeWidth={3} />}
          </button>

          <div className="flex-1 min-w-0 pt-0.5 pr-24">
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
                  className="p-0.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 transition-colors"
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
                  <span>진행률</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <div className="h-1.5 w-full bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${
                      progress === 100 ? 'bg-green-500' : 'bg-blue-500'
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
                  subTasks={todo.subTasks || []}
                  onUpdate={(newSubTasks) => updateTodo(todo.id, { subTasks: newSubTasks })}
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