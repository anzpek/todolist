import { useState, useEffect } from 'react'
import { debug } from '../../utils/debug'
import { Calendar, Clock, CalendarDays, X, AlertTriangle, ChevronRight, ChevronLeft, Repeat, History, Users, Eye, EyeOff, Settings, Book, Layout } from 'lucide-react'
import type { ViewType } from '../../types/views'
import { useTodos } from '../../contexts/TodoContext'
import { useAuth } from '../../contexts/AuthContext'
import { useVacation } from '../../contexts/VacationContext'
import { useTheme } from '../../contexts/ThemeContext' // Added
import { isAdmin } from '../../constants/admin'
import ThemeToggle from '../common/ThemeToggle'
import StatsCard from '../features/stats/StatsCard'
import ProjectAnalysis from '../features/stats/ProjectAnalysis'
import { useTranslation } from 'react-i18next'
import { firestoreService } from '../../services/firestoreService'
import { useGoogleTasksSync } from '../../hooks/useGoogleTasksSync'
import GoogleTasksSyncButton from '../features/google-tasks/GoogleTasksSyncButton'

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
  // Import Theme Context to detect visual theme
  const { currentTheme, isDark } = useTheme() // You might need to add useTheme to imports if not present

  const overdueTodos = getOverdueTodos()
  const tomorrowTodos = getTomorrowTodos()
  const yesterdayTodos = getYesterdayIncompleteTodos()
  const todayTodos = getTodayTodos()

  const isVisualTheme = !!currentTheme.bg

  // 반복 템플릿 통계
  const activeTemplates = recurringTemplates.filter(template => template.isActive)

  // 권한 변경 알림 수
  const [permissionNotificationCount, setPermissionNotificationCount] = useState(0)

  // Google Tasks Auto Sync
  const { syncGoogleTasks } = useGoogleTasksSync()
  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    const checkAndSync = async () => {
      if (currentUser?.uid) {
        const settings = await firestoreService.getUserSettings(currentUser.uid)
        if (settings?.autoSyncGoogleTasks) {
          // debug.log('🔄 Auto-syncing Google Tasks...') // console.log -> debug.log
          await syncGoogleTasks({ silent: true }).catch(err => debug.warn('Auto-sync blocked/failed', err))
        }
        return settings?.autoSyncGoogleTasks;
      }
      return false;
    }

    // 화면이 다시 포커스될 때 동기화 (예: 다른 탭 갔다가 왔을 때)
    const handleFocus = () => {
      // debug.log('✨ Window focused: Triggering auto-sync');
      checkAndSync();
    };

    // Run once on mount
    checkAndSync().then((shouldPoll) => {
      if (shouldPoll) {
        // Poll every 30 seconds (30000ms) for better sync
        intervalId = setInterval(async () => {
          // debug.log('⏱️ Polling Google Tasks ...');
          await syncGoogleTasks({ silent: true }).catch(() => { });
        }, 30 * 1000);

        window.addEventListener('focus', handleFocus);
      }
    });

    return () => {
      if (intervalId) clearInterval(intervalId);
      window.removeEventListener('focus', handleFocus);
    }
  }, [currentUser?.uid, syncGoogleTasks])

  // 🔧 최적화: subscribeToIncomingInvitations는 NotificationCenter에서 이미 구독
  // 여기서 중복 구독 제거됨 - Firebase 읽기 50% 감소


  // 권한 변경 알림 구독
  useEffect(() => {
    if (!currentUser?.uid) return
    const unsubscribe = firestoreService.subscribeToSharingNotifications(
      currentUser.uid,
      (notifications) => {
        // 읽지 않은 알림만 카운트
        const unreadCount = notifications.filter(n => !n.read && !n.isRead).length
        setPermissionNotificationCount(unreadCount)
      }
    )
    return () => unsubscribe()
  }, [currentUser?.uid])

  // 총 공유 관련 알림 수 = 권한 변경 알림 (읽지 않은 것만)
  // 🔧 최적화: pendingRequestCount 제거됨 (NotificationCenter에서 처리)
  const totalSharingNotifications = permissionNotificationCount

  // 휴가 관리 접근 권한 목록
  const [vacationAccessList, setVacationAccessList] = useState<string[]>([]);

  useEffect(() => {
    const unsubscribe = firestoreService.subscribeToVacationAccessList((emails) => {
      setVacationAccessList(emails);
    });
    return () => unsubscribe();
  }, []);

  const menuItems = [
    { id: 'today', label: t('nav.today'), icon: Calendar, count: todayTodos.filter(t => !t.completed).length },
    { id: 'week', label: t('nav.week'), icon: CalendarDays },
    { id: 'month', label: t('nav.month'), icon: Calendar },
    { id: 'board', label: t('nav.board') || 'Kanban', icon: Layout },
    { id: 'recurring', label: t('nav.recurring'), icon: Repeat, count: activeTemplates.length },
    { id: 'history', label: t('nav.history'), icon: History },
    { id: 'sharing', label: t('nav.sharing') || '공유 설정', icon: Users, count: totalSharingNotifications, highlight: totalSharingNotifications > 0 },
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
          glass-card
          ${isVisualTheme
            ? 'shadow-none border-r border-white/30 dark:border-white/20 transition-[background-color] duration-200 backdrop-blur-none'
            : 'border-r border-white/40 dark:border-gray-700/40 shadow-2xl transition-[background-color] duration-200'
          }
          flex flex-col pt-[env(safe-area-inset-top)] rounded-none`}
        style={isVisualTheme ? { backgroundColor: `rgba(${isDark ? '0, 0, 0' : '255, 255, 255'}, var(--glass-opacity, 0.1))` } : {}}
      >
        {/* 헤더 영역 */}
        <div className="p-6 flex items-center justify-between relative overflow-hidden shrink-0">
          {/* 배경 장식 */}
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-primary-500/10 to-purple-500/10 dark:from-primary-500/5 dark:to-purple-500/5 pointer-events-none" />

          <h1 className="text-2xl font-bold text-gradient-primary relative z-10 tracking-tight">
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

            // Restrict Vacation Management visibility (Dynamic Check)
            if (item.id === 'vacation') {
              const SUPER_ADMIN = 'lkd0115lkd@gmail.com';
              const hasAccess =
                currentUser?.email === SUPER_ADMIN ||
                (currentUser?.email && vacationAccessList.includes(currentUser.email));

              if (!hasAccess) {
                return null;
              }
            }

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
                    ? 'bg-primary-500/10 dark:bg-primary-500/20 text-primary-600 dark:text-primary-400 shadow-sm border border-primary-100/50 dark:border-primary-500/30 backdrop-blur-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-white/50 dark:hover:bg-gray-800/50 hover:text-gray-900 dark:hover:text-gray-200 hover:shadow-sm border border-transparent'
                  }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg transition-colors ${isActive ? 'bg-primary-100 dark:bg-primary-900/40' : 'bg-gray-100/50 dark:bg-gray-800/50 group-hover:bg-white dark:group-hover:bg-gray-700'}`}>
                    <Icon className={`w-5 h-5 ${isActive ? 'text-primary-600 dark:text-primary-400' : 'text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-200'}`} />
                  </div>
                  <span className="font-medium">{item.label}</span>
                </div>
                {item.count !== undefined && item.count > 0 && (
                  <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${(item as any).highlight
                    ? 'bg-red-500 text-white animate-pulse'
                    : isActive
                      ? 'bg-primary-100 dark:bg-primary-900/40 text-primary-600 dark:text-primary-400'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                    }`}>
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
            <div className="glass-panel p-4 rounded-xl border-l-4 border-l-primary-400 group hover:scale-[1.02] transition-transform duration-200 bg-primary-50/30 dark:bg-primary-900/10">
              <div className="flex items-center gap-2 mb-2 text-primary-600 dark:text-primary-400">
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

        {/* Google Sync Button */}
        <GoogleTasksSyncButton />

        {/* 하단 영역 - 정리됨 */}
        <div className="p-4 border-t border-gray-200/50 dark:border-gray-700/50 bg-white/30 dark:bg-gray-900/30 backdrop-blur-sm shrink-0 space-y-4">
          <ThemeToggle />

          <div className="flex items-center justify-between pt-2 border-t border-gray-200/30 dark:border-gray-700/30">
            <p className="text-xs text-gray-400 dark:text-gray-500 font-medium">
              v1.3.8 • Premium
            </p>
            {onToggleForceMobile && (
              <button
                onClick={() => onToggleForceMobile(!forceMobile)}
                className={`p-1.5 rounded-lg transition-all ${forceMobile
                  ? 'bg-primary-100 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400'
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