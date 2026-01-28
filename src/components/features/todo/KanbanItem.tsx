import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { memo } from 'react'
import TodoItem from './TodoItem'
import type { Todo } from '../../../types/todo'
import { useTheme } from '../../../contexts/ThemeContext' // Added

interface KanbanItemProps {
    todo: Todo
    onEdit: (todo: Todo) => void
    isOverlay?: boolean
}

const KanbanItem = memo(({ todo, onEdit, isOverlay }: KanbanItemProps) => {
    const { currentTheme, isDark } = useTheme() // Added
    const isVisualTheme = !!currentTheme.bg // Added
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({
        id: todo.id,
        data: {
            type: 'Todo',
            todo
        }
    })

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.3 : 1,
    }

    const cardClass = isVisualTheme
        ? 'glass-card backdrop-blur-none transition-[background-color] duration-200'
        : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700'

    const cardStyle = isVisualTheme
        ? { backgroundColor: `rgba(${isDark ? '0, 0, 0' : '255, 255, 255'}, var(--glass-opacity, 0.1))` }
        : {}

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            className={`touch-none ${isOverlay ? 'shadow-2xl scale-105' : ''}`}
        >
            <div
                className={`${cardClass} rounded-xl shadow-sm border`}
                style={cardStyle}
            >
                <TodoItem
                    todo={todo}
                    onEdit={onEdit}
                    compact={true} // Use compact mode if available or just normal
                // We might want to disable swipe in Board View as it interferes with horizontal drag?
                // TodoItem doesn't have 'disableSwipe' prop yet.
                />
            </div>
        </div>
    )
})

export default KanbanItem
