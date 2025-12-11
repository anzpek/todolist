import { Calendar, Clock, CalendarDays, X, AlertTriangle, ChevronRight, ChevronLeft, Repeat, History, Users, Eye, EyeOff, Settings, Book } from 'lucide-react'
import type { ViewType } from '../types/views'
import { useTodos } from '../contexts/TodoContext'
import { useAuth } from '../contexts/AuthContext'
import { useVacation } from '../contexts/VacationContext'
import { isAdmin } from '../constants/admin'
import ThemeToggle from './ThemeToggle'
import StatsCard from './StatsCard'
import ProjectAnalysis from './ProjectAnalysis'
import { useTranslation } from 'react-i18next'

interface SidebarProps {
  currentView: ViewType | 'recurring' | 'history' | 'analytics' | 'vacation' | 'settings' | 'guide'
  onViewChange: (view: ViewType | 'recurring' | 'history' | 'analytics' | 'vacation' | 'settings' | 'guide') => void
  isOpen: boolean
  onToggle: () => void
  isMobile?: boolean
  forceMobile?: boolean | null
  onToggleForceMobile?: (force: boolean | null) => void
}

const Sidebar = ({ currentView, onViewChange, isOpen, onToggle, isMobile = false, forceMobile = null, onToggleForceMobile }: SidebarProps) => {
  const { t } = useTranslation()
  const { getOverdueTodos, getTomorrowTodos, getYesterdayIncompleteTodos, recurringTemplates, getRecurringTodos, getTodayTodos } = useTodos()
  const { currentUser } = useAuth()
  const { showVacationsInTodos, toggleVacationDisplay } = useVacation()

  const overdueTodos = getOverdueTodos()
  const tomorrowTodos = getTomorrowTodos()
  const yesterdayTodos = getYesterdayIncompleteTodos()
  const todayTodos = getTodayTodos()

  // 반복 템플릿 통계
  const activeTemplates = recurringTemplates.filter(template => template.isActive)

  const menuItems = [
    { id: 'today', label: t('nav.today'), icon: Calendar, count: todayTodos.filter(t => !t.completed).length },
    { id: 'week', label: t('nav.week'), icon: CalendarDays },
    { id: 'month', label: t('nav.month'), icon: Calendar },
    { id: 'recurring', label: t('nav.recurring'), icon: Repeat, count: activeTemplates.length },
    { id: 'history', label: t('nav.history'), icon: History },
    { id: 'analytics', label: t('nav.analytics'), icon: Users },
    { id: 'vacation', label: t('nav.vacation'), icon: Calendar },
    { id: 'guide', label: t('guide.title'), icon: Book },
    { id: 'settings', label: t('nav.settings'), icon: Settings },
  ]

  return (
    <>
      {/* 모바일 오버레이 */}
      {isMobile && isOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity duration-300"
          onClick={onToggle}
        />
      )}

      {/* 사이드바 컨테이너 */}
      <aside
        className={`fixed top-0 left-0 z-50 h-full transition-all duration-300 ease-in-out 
          ${isOpen ? 'translate-x-0' : '-translate-x-full'} 
          ${isMobile ? 'w-[280px]' : 'w-64'}
          glass-card border-r border-white/40 dark:border-gray-700/40 rounded-none
          flex flex-col shadow-2xl pt-[env(safe-area-inset-top)]`}
      >
        {/* 헤더 영역 */}
        <div className="p-6 flex items-center justify-between relative overflow-hidden shrink-0">
          {/* 배경 장식 */}
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-blue-500/10 to-purple-500/10 dark:from-blue-500/5 dark:to-purple-500/5 pointer-events-none" />

          <h1 className="text-2xl font-bold text-gradient-blue relative z-10 tracking-tight">
            Todo List
          </h1>
          {isMobile && (
            <button
              onClick={onToggle}
              className="p-2 rounded-xl hover:bg-white/50 dark:hover:bg-gray-700/50 text-gray-500 dark:text-gray-400 transition-colors relative z-10"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* 메인 네비게이션 */}
        <nav className="flex-1 overflow-y-auto px-4 py-2 space-y-1 custom-scrollbar">
          {menuItems.map((item) => {
            if (item.id === 'analytics' && !isAdmin(currentUser?.email)) return null

            const isActive = currentView === item.id
            const Icon = item.icon

            return (
              <button
                key={item.id}
                onClick={() => {
                  onViewChange(item.id as any)
                  if (isMobile) onToggle()
                }}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 group
                  ${isActive
                    ? 'bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 shadow-sm border border-blue-100/50 dark:border-blue-500/30 backdrop-blur-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-white/50 dark:hover:bg-gray-800/50 hover:text-gray-900 dark:hover:text-gray-200 hover:shadow-sm border border-transparent'
                  }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg transition-colors ${isActive ? 'bg-blue-100 dark:bg-blue-900/40' : 'bg-gray-100/50 dark:bg-gray-800/50 group-hover:bg-white dark:group-hover:bg-gray-700'}`}>
                    <Icon className={`w-5 h-5 ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-200'}`} />
                  </div>
                  <span className="font-medium">{item.label}</span>
                </div>
                {item.count !== undefined && item.count > 0 && (
                  <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${isActive ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'}`}>
                    {item.count}
                  </span>
                )}
              </button>
            )
          })}

          {/* 구분선 */}
          <div className="my-4 border-t border-gray-200/50 dark:border-gray-700/50" />

          {/* 요약 카드 영역 */}
          <div className="space-y-3 px-1">
            {/* 어제 미완료 */}
            {yesterdayTodos.length > 0 && (
              <div className="glass-panel p-4 rounded-xl border-l-4 border-l-orange-400 group hover:scale-[1.02] transition-transform duration-200 bg-orange-50/30 dark:bg-orange-900/10">
                <div className="flex items-center gap-2 mb-2 text-orange-600 dark:text-orange-400">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="text-sm font-bold">{t('nav.summary.yesterday')}</span>
                </div>
                <div className="text-2xl font-bold text-gray-800 dark:text-gray-100">
                  {yesterdayTodos.length}
                  <span className="text-sm font-normal text-gray-500 ml-1">{t('nav.summary.count')}</span>
                </div>
              </div>
            )}

            {/* 오늘 지연 */}
            {overdueTodos.length > 0 && (
              <div className="glass-panel p-4 rounded-xl border-l-4 border-l-red-500 group hover:scale-[1.02] transition-transform duration-200 bg-red-50/30 dark:bg-red-900/10">
                <div className="flex items-center gap-2 mb-2 text-red-600 dark:text-red-400">
                  <Clock className="w-4 h-4" />
                  <span className="text-sm font-bold">{t('nav.summary.overdue')}</span>
                </div>
                <div className="text-2xl font-bold text-gray-800 dark:text-gray-100">
                  {overdueTodos.length}
                  <span className="text-sm font-normal text-gray-500 ml-1">{t('nav.summary.count')}</span>
                </div>
              </div>
            )}

            {/* 내일 예정 */}
            <div className="glass-panel p-4 rounded-xl border-l-4 border-l-blue-400 group hover:scale-[1.02] transition-transform duration-200 bg-blue-50/30 dark:bg-blue-900/10">
              <div className="flex items-center gap-2 mb-2 text-blue-600 dark:text-blue-400">
                <Calendar className="w-4 h-4" />
                <span className="text-sm font-bold">{t('nav.summary.tomorrow')}</span>
              </div>
              <div className="text-2xl font-bold text-gray-800 dark:text-gray-100">
                {tomorrowTodos.length}
                <span className="text-sm font-normal text-gray-500 ml-1">{t('nav.summary.count')}</span>
              </div>
            </div>
          </div>
        </nav>

        {/* 하단 영역 - 정리됨 */}
        <div className="p-4 border-t border-gray-200/50 dark:border-gray-700/50 bg-white/30 dark:bg-gray-900/30 backdrop-blur-sm shrink-0 space-y-4">
          <ThemeToggle />

          <div className="flex items-center justify-between pt-2 border-t border-gray-200/30 dark:border-gray-700/30">
            <p className="text-xs text-gray-400 dark:text-gray-500 font-medium">
              v1.2.0 • Premium
            </p>
            {onToggleForceMobile && (
              <button
                onClick={() => onToggleForceMobile(!forceMobile)}
                className={`p-1.5 rounded-lg transition-all ${forceMobile
                  ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                  : 'hover:bg-white/50 dark:hover:bg-gray-700/50 text-gray-500 dark:text-gray-400'
                  }`}
                title={forceMobile ? "데스크톱 뷰로 전환" : "모바일 뷰 테스트"}
              >
                {forceMobile ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </button>
            )}
          </div>
        </div>
      </aside>
    </>
  )
}

export default Sidebar