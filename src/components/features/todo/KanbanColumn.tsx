import { useDroppable } from '@dnd-kit/core'
import { Plus } from 'lucide-react'
import { memo } from 'react'
import { useTheme } from '../../../contexts/ThemeContext'

interface KanbanColumnProps {
    id: string
    title: string
    count: number
    priority: string
    children: React.ReactNode
    onAdd: () => void
}

const KanbanColumn = memo(({ id, title, count, priority, children, onAdd }: KanbanColumnProps) => {
    const { setNodeRef } = useDroppable({
        id: id
    })
    const { currentTheme, isDark } = useTheme()
    const isVisualTheme = !!currentTheme.bg

    let borderColor = 'border-gray-200 dark:border-gray-700'
    let headerColor = 'bg-gray-100 dark:bg-gray-800'
    let textColor = 'text-gray-700 dark:text-gray-300'

    if (priority === 'urgent') {
        borderColor = 'border-red-200 dark:border-red-900/30'
        headerColor = 'bg-red-50 dark:bg-red-900/10'
        textColor = 'text-red-700 dark:text-red-400'
    } else if (priority === 'high') {
        borderColor = 'border-orange-200 dark:border-orange-900/30'
        headerColor = 'bg-orange-50 dark:bg-orange-900/10'
        textColor = 'text-orange-700 dark:text-orange-400'
    } else if (priority === 'medium') {
        borderColor = 'border-blue-200 dark:border-blue-900/30'
        headerColor = 'bg-blue-50 dark:bg-blue-900/10'
        textColor = 'text-blue-700 dark:text-blue-400'
    }

    return (
        <div
            ref={setNodeRef}
            className={`
        flex-shrink-0 lg:flex-shrink lg:flex-1 w-80 max-w-[85vw] lg:max-w-none flex flex-col h-full 
        ${isVisualTheme ? 'backdrop-blur-none transition-[background-color] duration-200' : 'bg-gray-50/50 dark:bg-gray-900/20'} rounded-xl border ${borderColor}
        transition-colors snap-center
      `}
            style={isVisualTheme ? { backgroundColor: `rgba(${isDark ? '0, 0, 0' : '255, 255, 255'}, var(--glass-opacity, 0.1))` } : {}}
        >
            {/* Header */}
            <div className={`p-4 flex items-center justify-between sticky top-0 backdrop-blur-sm rounded-t-xl z-10 ${headerColor}`}>
                <div className="flex items-center gap-2">
                    <h3 className={`font-semibold ${textColor}`}>
                        {title}
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-white/50 dark:bg-black/20">
                        {count}
                    </span>
                </div>
                <button
                    onClick={onAdd}
                    className={`
            p-1.5 rounded-lg hover:bg-white/50 dark:hover:bg-black/20 
            transition-colors ${textColor}
          `}
                >
                    <Plus className="w-4 h-4" />
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-3 min-h-0">
                {children}
            </div>
        </div>
    )
})

export default KanbanColumn
