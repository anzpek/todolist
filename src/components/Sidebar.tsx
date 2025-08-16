import { Calendar, Clock, CalendarDays, X, AlertTriangle, ChevronRight, ChevronLeft, Repeat, History, Users, Eye, EyeOff } from 'lucide-react'
import type { ViewType } from '../App'
import { useTodos } from '../contexts/TodoContext'
import { useAuth } from '../contexts/AuthContext'
import { useVacation } from '../contexts/VacationContext'
import { isAdmin } from '../constants/admin'
import ThemeToggle from './ThemeToggle'
import DataBackup from './DataBackup'
import StatsCard from './StatsCard'
import ProjectAnalysis from './ProjectAnalysis'

interface SidebarProps {
  currentView: ViewType | 'recurring' | 'history' | 'analytics' | 'vacation'
  onViewChange: (view: ViewType | 'recurring' | 'history' | 'analytics' | 'vacation') => void
  isOpen: boolean
  onToggle: () => void
  isMobile?: boolean
  forceMobile?: boolean | null
  onToggleForceMobile?: (force: boolean | null) => void
}

const Sidebar = ({ currentView, onViewChange, isOpen, onToggle, isMobile = false, forceMobile = null, onToggleForceMobile }: SidebarProps) => {
  const { getOverdueTodos, getTomorrowTodos, getYesterdayIncompleteTodos, recurringTemplates, recurringInstances } = useTodos()
  const { currentUser } = useAuth()
  const { showVacationsInTodos, toggleVacationDisplay } = useVacation()
  
  // 디버깅: 사용자 정보 확인
  console.log('🔍 Sidebar - currentUser:', currentUser)
  console.log('🔍 Sidebar - currentUser?.email:', currentUser?.email)
  console.log('🔍 Sidebar - isAdmin:', isAdmin(currentUser?.email))
  
  const overdueTodos = getOverdueTodos()
  const tomorrowTodos = getTomorrowTodos()
  const yesterdayTodos = getYesterdayIncompleteTodos()
  
  // 반복 템플릿 통계
  const activeTemplates = recurringTemplates.filter(template => template.isActive)
  
  // 오늘의 반복 인스턴스
  const today = new Date()
  const todayRecurringInstances = recurringInstances.filter(instance => {
    const instanceDate = new Date(instance.date)
    return instanceDate.toDateString() === today.toDateString()
  })
  
  // 기본 네비게이션 아이템
  const baseNavItems: Array<{ id: ViewType | 'recurring' | 'history' | 'analytics' | 'vacation', label: string, icon: any, adminOnly?: boolean }> = [
    { id: 'today', label: '오늘 할일', icon: Clock },
    { id: 'week', label: '이번 주 할일', icon: Calendar },
    { id: 'month', label: '이번 달 할일', icon: CalendarDays },
    { id: 'recurring', label: '반복 관리', icon: Repeat },
    { id: 'history', label: '완료 히스토리', icon: History },
    { id: 'analytics', label: '통계 및 데이터', icon: ChevronRight },
    { id: 'vacation', label: '휴가 관리', icon: Users, adminOnly: true },
  ]

  // 관리자 권한에 따라 필터링
  const navItems = baseNavItems.filter(item => !item.adminOnly || isAdmin(currentUser?.email))

  if (!isOpen) {
    return null
  }

  return (
    <div className={`${
      isMobile 
        ? 'fixed top-0 left-0 z-50 w-80 h-full bg-white dark:bg-gray-800 transform transition-transform duration-300 ease-in-out'
        : 'relative w-64 h-full bg-white dark:bg-gray-800'
    } border-r border-gray-200 dark:border-gray-700 flex flex-col shadow-xl`}>
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <h1 className={`${isMobile ? 'text-lg' : 'text-xl'} font-bold text-gray-900 dark:text-white`}>
          할일 관리
        </h1>
        {isMobile && (
          <button
            onClick={onToggle}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>
        
        <nav className="flex-1 p-4 overflow-y-auto">
          <ul className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = currentView === item.id
              
              return (
                <li key={item.id}>
                  <button
                    onClick={() => {
                      onViewChange(item.id)
                      // 모바일에서 메뉴 선택 시 사이드바 닫기
                      if (isMobile) {
                        onToggle()
                      }
                    }}
                    className={`w-full flex items-center justify-between px-4 py-2 text-left rounded-lg transition-colors ${
                      isActive
                        ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
                        : 'text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700'
                    }`}
                  >
                    <div className="flex items-center">
                      <Icon className="w-5 h-5 mr-3" />
                      <span className="font-medium">{item.label}</span>
                    </div>
                    {item.id === 'recurring' && activeTemplates.length > 0 && (
                      <span className="text-xs bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300 px-2 py-1 rounded-full">
                        {activeTemplates.length}
                      </span>
                    )}
                  </button>
                </li>
              )
            })}
          </ul>

          {/* 오늘의 반복 태스크 */}
          {todayRecurringInstances.length > 0 && (
            <div className="mt-4">
              <div className="flex items-center gap-2 px-4 py-1 text-sm font-medium text-purple-600 dark:text-purple-400">
                <Repeat className="w-4 h-4" />
                <span>오늘 반복 할일 ({todayRecurringInstances.length})</span>
              </div>
              <div className="space-y-1 mt-1">
                {todayRecurringInstances.slice(0, 3).map(instance => {
                  const template = activeTemplates.find(t => t.id === instance.templateId)
                  if (!template) return null
                  
                  return (
                    <div key={instance.id} className={`px-3 py-1 text-sm mx-2 rounded ${
                      instance.completed 
                        ? 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20' 
                        : 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20'
                    }`}>
                      <div className="truncate">{template.title}</div>
                      <div className="text-xs">
                        {instance.completed ? '완료' : '대기 중'}
                      </div>
                    </div>
                  )
                })}
                {todayRecurringInstances.length > 3 && (
                  <div className="px-4 py-1 text-xs text-purple-500 dark:text-purple-400">
                    +{todayRecurringInstances.length - 3}개 더
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 놓친 할일 */}
          {overdueTodos.length > 0 && (
            <div className="mt-4">
              <div className="flex items-center gap-2 px-4 py-1 text-sm font-medium text-red-600 dark:text-red-400">
                <AlertTriangle className="w-4 h-4" />
                <span>놓친 할일 ({overdueTodos.length})</span>
              </div>
              <div className="space-y-1 mt-1">
                {overdueTodos.slice(0, 3).map(todo => (
                  <div key={todo.id} className="px-3 py-1 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 mx-2 rounded">
                    <div className="truncate">{todo.title}</div>
                  </div>
                ))}
                {overdueTodos.length > 3 && (
                  <div className="px-4 py-1 text-xs text-red-500 dark:text-red-400">
                    +{overdueTodos.length - 3}개 더
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 어제 못한 일 */}
          {yesterdayTodos.length > 0 && (
            <div className="mt-4">
              <div className="flex items-center gap-2 px-4 py-1 text-sm font-medium text-orange-600 dark:text-orange-400">
                <ChevronLeft className="w-4 h-4" />
                <span>어제 못한 일 ({yesterdayTodos.length})</span>
              </div>
              <div className="space-y-1 mt-1">
                {yesterdayTodos.slice(0, 3).map(todo => (
                  <div key={todo.id} className="px-3 py-1 text-sm text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 mx-2 rounded">
                    <div className="truncate">{todo.title}</div>
                    {todo.type === 'project' && (
                      <div className="text-xs text-orange-500 dark:text-orange-300">
                        {todo.project === 'longterm' ? '롱텀' : '숏텀'} 프로젝트
                      </div>
                    )}
                  </div>
                ))}
                {yesterdayTodos.length > 3 && (
                  <div className="px-4 py-1 text-xs text-orange-500 dark:text-orange-400">
                    +{yesterdayTodos.length - 3}개 더
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 내일 할일 미리보기 */}
          {tomorrowTodos.length > 0 && (
            <div className="mt-4">
              <div className="flex items-center gap-2 px-4 py-1 text-sm font-medium text-blue-600 dark:text-blue-400">
                <ChevronRight className="w-4 h-4" />
                <span>내일 할일 ({tomorrowTodos.length})</span>
              </div>
              <div className="space-y-1 mt-1">
                {tomorrowTodos.slice(0, 3).map(todo => (
                  <div key={todo.id} className="px-3 py-1 text-sm text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 mx-2 rounded">
                    <div className="truncate">{todo.title}</div>
                    {todo.type === 'project' && (
                      <div className="text-xs text-blue-500 dark:text-blue-300">
                        {todo.project === 'longterm' ? '롱텀' : '숏텀'} 프로젝트
                      </div>
                    )}
                  </div>
                ))}
                {tomorrowTodos.length > 3 && (
                  <div className="px-4 py-1 text-xs text-blue-500 dark:text-blue-400">
                    +{tomorrowTodos.length - 3}개 더
                  </div>
                )}
              </div>
            </div>
          )}
        </nav>
        
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 space-y-3">
          {/* 휴가 표시 토글 (관리자만) */}
          {isAdmin(currentUser?.email) && (
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                휴가 표시
              </label>
              <button
                onClick={toggleVacationDisplay}
                className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded-lg transition-colors ${
                  showVacationsInTodos
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300'
                    : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                <div className="flex items-center">
                  {showVacationsInTodos ? (
                    <Eye className="w-4 h-4 mr-2" />
                  ) : (
                    <EyeOff className="w-4 h-4 mr-2" />
                  )}
                  <span>{showVacationsInTodos ? '휴가 표시됨' : '휴가 숨김'}</span>
                </div>
              </button>
            </div>
          )}
          
          {/* 모바일/데스크톱 전환 */}
          {onToggleForceMobile && (
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                화면 모드
              </label>
              <div className="grid grid-cols-3 gap-1">
                <button
                  onClick={() => onToggleForceMobile?.(false)}
                  className={`px-2 py-2 text-xs rounded-lg transition-colors ${
                    forceMobile === false 
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300' 
                      : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  💻 PC
                </button>
                <button
                  onClick={() => onToggleForceMobile?.(null)}
                  className={`px-2 py-2 text-xs rounded-lg transition-colors ${
                    forceMobile === null 
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300' 
                      : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  🔄 자동
                </button>
                <button
                  onClick={() => onToggleForceMobile?.(true)}
                  className={`px-2 py-2 text-xs rounded-lg transition-colors ${
                    forceMobile === true 
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300' 
                      : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  📱 폰
                </button>
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-center">
                {typeof window !== 'undefined' ? window.innerWidth : 0}px
              </div>
            </div>
          )}
          
          {/* 테마 토글 */}
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
              테마
            </label>
            <ThemeToggle />
          </div>
        </div>
      </div>
  )
}

export default Sidebar