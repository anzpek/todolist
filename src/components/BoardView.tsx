import { useState, useMemo, useEffect } from 'react'
import { useTheme } from '../contexts/ThemeContext' // Added
import {
    DndContext,
    DragOverlay,
    useSensors,
    useSensor,
    MouseSensor,
    TouchSensor,
    closestCorners,
    type DragStartEvent,
    type DragEndEvent,
    type DragOverEvent
} from '@dnd-kit/core'
import { SortableContext, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useTodos } from '../contexts/TodoContext'
import { useTranslation } from 'react-i18next'
import { format, isSameDay } from 'date-fns'
import { ko, enUS } from 'date-fns/locale'
import KanbanColumn from './KanbanColumn'
import KanbanItem from './KanbanItem'
import type { Priority, TaskType, Todo } from '../types/todo'
import TodoItem from './TodoItem'

interface BoardViewProps {
    searchTerm: string
    priorityFilter: Priority | 'all'
    typeFilter: TaskType | 'all'
    projectFilter: 'all' | 'longterm' | 'shortterm'
    tagFilter: string[]
    completionDateFilter: 'all' | 'today' | 'yesterday' | 'thisWeek' | 'lastWeek' | 'thisMonth'
    onAddTodo: (priority?: Priority) => void
    onEdit: (todo: Todo) => void
    isMobile?: boolean
}

const PRIORITY_COLUMNS: Priority[] = ['urgent', 'high', 'medium', 'low']

const BoardView = ({
    searchTerm,
    priorityFilter,
    typeFilter,
    projectFilter,
    tagFilter,
    completionDateFilter,
    onAddTodo,
    onEdit,
    isMobile = false
}: BoardViewProps) => {
    const { t, i18n } = useTranslation()
    const { currentTheme, isDark } = useTheme() // Added
    const isVisualTheme = !!currentTheme.bg // Added
    const dateLocale = i18n.language === 'ko' ? ko : enUS
    const { getFilteredTodos, updateTodo } = useTodos()
    const [activeId, setActiveId] = useState<string | null>(null)

    // Configure sensors for drag detection
    const sensors = useSensors(
        useSensor(MouseSensor, {
            activationConstraint: {
                distance: 10,
            },
        }),
        useSensor(TouchSensor, {
            activationConstraint: {
                delay: 250,
                tolerance: 5,
            },
        })
    )

    const filteredTodos = useMemo(() => {
        // 1. Get ALL candidates (ignore completionDateFilter in context call to avoid filtering out active tasks)
        // We pass includeCompleted: true to get completed tasks too, so we can show those completed today.
        const candidates = getFilteredTodos({
            searchTerm,
            priorityFilter,
            typeFilter,
            projectFilter,
            tagFilter,
            completionDateFilter: 'all', // Force 'all' here to get active tasks
            includeCompleted: true
        })

        // 2. Apply "Date Focus" filter locally
        if (completionDateFilter === 'today') {
            const today = new Date()
            today.setHours(0, 0, 0, 0)

            return candidates.filter(todo => {
                // A. Completed Today
                if (todo.completed) {
                    return todo.completedAt && isSameDay(new Date(todo.completedAt), today)
                }

                // B. Active Tasks Layout (My Day)
                // Logic: StartDate <= Today AND (DueDate >= Today OR No DueDate)
                const startDate = todo.startDate ? new Date(todo.startDate) : null
                const dueDate = todo.dueDate ? new Date(todo.dueDate) : null

                if (startDate) startDate.setHours(0, 0, 0, 0)
                if (dueDate) dueDate.setHours(0, 0, 0, 0)

                // 1. Period: Start <= Today <= Due
                if (startDate && dueDate) {
                    return today >= startDate && today <= dueDate
                }
                // 2. Start Only: Start <= Today
                if (startDate && !dueDate) {
                    return today >= startDate
                }
                // 3. Due Only: Due >= Today (Approaching or Due Today)
                // Actually, standard "Today" view usually shows overdue too? 
                // Context getTodayTodos logic: "Due date >= today" (persistent).
                // Let's stick to: "Show if relevant today".
                if (!startDate && dueDate) {
                    // If overdue, it should be in "Overdue" or handled. 
                    // But here we just want to show "Today's Stack".
                    // Let's show everything ending today or future? Use context logic:
                    // return dueDate >= today
                    return isSameDay(dueDate, today) || dueDate < today // Show overdue too?
                    // Let's match context getTodayTodos line 1570: return dueDate >= today (persistent)
                    return dueDate >= today
                }

                // 4. No Dates: Always show
                if (!startDate && !dueDate) return true

                return false
            })
        }

        return candidates
    }, [searchTerm, priorityFilter, typeFilter, projectFilter, tagFilter, completionDateFilter, getFilteredTodos])

    // Group todos by priority
    const columns = useMemo(() => {
        const grouped: Record<Priority, Todo[]> = {
            urgent: [],
            high: [],
            medium: [],
            low: []
        }

        filteredTodos.forEach(todo => {
            if (grouped[todo.priority]) {
                grouped[todo.priority].push(todo)
            }
        })

        // Sort by order within columns
        Object.keys(grouped).forEach(key => {
            grouped[key as Priority].sort((a, b) => (a.order || 0) - (b.order || 0))
        })

        return grouped
    }, [filteredTodos])

    // Find active todo object for drag overlay
    const activeTodo = useMemo(() => {
        if (!activeId) return null
        return filteredTodos.find(todo => todo.id === activeId)
    }, [activeId, filteredTodos])

    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(event.active.id as string)
    }

    const handleDragOver = (event: DragOverEvent) => {
        const { active, over } = event
        if (!over) return

        const activeId = active.id as string
        const overId = over.id as string

        // If over a container (column)
        if (PRIORITY_COLUMNS.includes(overId as Priority)) {
            // Find the todo
            const activeTodo = filteredTodos.find(t => t.id === activeId)
            if (activeTodo && activeTodo.priority !== overId) {
                // Optimization: We could tentatively update local state for smoother UI
                // But for now, we'll rely on DragEnd to commit changes
            }
        }
    }

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event

        if (!over) {
            setActiveId(null)
            return
        }

        const activeId = active.id as string
        const overId = over.id as string // Can be a todo ID or a column ID (priority)

        const activeTodo = filteredTodos.find(t => t.id === activeId)
        if (!activeTodo) {
            setActiveId(null)
            return
        }

        let newPriority: Priority = activeTodo.priority

        // 1. Dropped over a Column (Empty space or header)
        if (PRIORITY_COLUMNS.includes(overId as Priority)) {
            newPriority = overId as Priority
        }
        // 2. Dropped over another Item
        else {
            const overTodo = filteredTodos.find(t => t.id === overId)
            if (overTodo) {
                newPriority = overTodo.priority
            }
        }

        // Update Priority if changed
        if (activeTodo.priority !== newPriority) {
            updateTodo(activeId, { priority: newPriority })
        }

        // TODO: Handle reordering within the same column (need to update 'order' field)
        // For MVP, we just switch priority. Reordering logic requires robust 'order' management in backend/context.

        setActiveId(null)
    }

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
        >
            <div className="flex h-full gap-4 overflow-x-auto pb-4 items-start snap-x snap-mandatory px-4">
                {PRIORITY_COLUMNS.map(priority => (
                    <KanbanColumn
                        key={priority}
                        id={priority}
                        title={t(`modal.addTodo.${priority}`) || priority.toUpperCase()}
                        count={columns[priority].length}
                        priority={priority}
                        onAdd={() => onAddTodo(priority)}
                    >
                        <SortableContext
                            items={columns[priority].map(t => t.id)}
                            strategy={verticalListSortingStrategy}
                        >
                            <div className="space-y-3 min-h-[100px]">
                                {columns[priority].map(todo => (
                                    <KanbanItem key={todo.id} todo={todo} onEdit={onEdit} />
                                ))}
                            </div>
                        </SortableContext>
                    </KanbanColumn>
                ))}
            </div>

            <DragOverlay>
                {activeTodo ? (
                    <div className="transform rotate-3 opacity-90 cursor-grabbing">
                        <KanbanItem todo={activeTodo} onEdit={() => { }} isOverlay />
                    </div>
                ) : null}
            </DragOverlay>
        </DndContext >
    )
}

export default BoardView
