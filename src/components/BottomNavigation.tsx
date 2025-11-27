import { Calendar, Home, List, Settings, BarChart2 } from 'lucide-react'
import { useTheme } from '../contexts/ThemeContext'

interface BottomNavigationProps {
    currentView: 'today' | 'week' | 'month' | 'settings' | 'analytics'
    onViewChange: (view: 'today' | 'week' | 'month' | 'settings' | 'analytics') => void
    onToggleSidebar: () => void
}

const BottomNavigation = ({ currentView, onViewChange, onToggleSidebar }: BottomNavigationProps) => {
    const { theme } = useTheme()
    const isDark = theme === 'dark'

    const navItems = [
        { id: 'today', icon: Home, label: '오늘' },
        { id: 'week', icon: Calendar, label: '주간' },
        { id: 'month', icon: Calendar, label: '월간' },
        { id: 'settings', icon: Settings, label: '설정' },
        { id: 'menu', icon: List, label: '메뉴', isAction: true },
    ]

    return (
        <nav className="fixed bottom-0 left-0 right-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg border-t border-gray-200 dark:border-gray-800 pb-safe z-40 md:hidden">
            <div className="flex justify-around items-center h-16 px-2">
                {navItems.map((item) => {
                    const Icon = item.icon
                    const isActive = currentView === item.id

                    return (
                        <button
                            key={item.id}
                            onClick={() => {
                                if (item.isAction) {
                                    onToggleSidebar()
                                } else {
                                    onViewChange(item.id as any)
                                }
                            }}
                            className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${isActive
                                ? 'text-blue-600 dark:text-blue-400'
                                : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                                }`}
                        >
                            <Icon className={`w-6 h-6 ${isActive ? 'fill-current' : ''}`} strokeWidth={isActive ? 2.5 : 2} />
                            <span className="text-[10px] font-medium">{item.label}</span>
                        </button>
                    )
                })}
            </div>
        </nav>
    )
}

export default BottomNavigation
