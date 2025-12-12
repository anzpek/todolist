import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, Calendar, Clock, Inbox } from 'lucide-react'
import { format, isSameDay, isToday } from 'date-fns'
import { ko, enUS } from 'date-fns/locale'
import { useTodos } from '../contexts/TodoContext'
import { useVacation } from '../contexts/VacationContext'
import { useAuth } from '../contexts/AuthContext'
import { isAdmin } from '../constants/admin'
import TodoItem from './TodoItem'
import VacationItem from './VacationItem'
import type { Todo } from '../types/todo'

interface CalendarDayListProps {
    selectedDate: Date
    onEdit: (todo: Todo) => void
    onAdd: () => void
}

const CalendarDayList = ({ selectedDate, onEdit, onAdd }: CalendarDayListProps) => {
    const { t, i18n } = useTranslation()
    const dateLocale = i18n.language === 'ko' ? ko : enUS
    const { todos, toggleTodo, deleteTodo } = useTodos()
    const { currentUser } = useAuth()
    const { showVacationsInTodos, getVacationsForDate, employees } = useVacation()

    // Filter todos for the selected date
    // Logic copied/adapted from MonthlyCalendarView to ensure consistency
    // Ideally, this filtering logic should be a shared hook
    const dayTodos = useMemo(() => {
        return todos.filter(todo => {
            // 1. If completed, show based on completedAt
            if (todo.completed && todo.completedAt) {
                return isSameDay(new Date(todo.completedAt), selectedDate)
            }

            // 2. If not completed
            if (!todo.completed) {
                const startDate = todo.startDate ? new Date(todo.startDate) : null
                const dueDate = todo.dueDate ? new Date(todo.dueDate) : null
                const targetDate = new Date(selectedDate)

                startDate?.setHours(0, 0, 0, 0)
                dueDate?.setHours(0, 0, 0, 0)
                targetDate.setHours(0, 0, 0, 0)

                // Case A: Start and Due Date exist
                if (startDate && dueDate) {
                    return targetDate.getTime() >= startDate.getTime() && targetDate.getTime() <= dueDate.getTime()
                }

                // Case B: Only Start Date (rollover logic)
                if (startDate && !dueDate) {
                    const today = new Date()
                    today.setHours(0, 0, 0, 0)

                    // Show on start date
                    if (targetDate.getTime() === startDate.getTime()) return true

                    // Show rollover if past start date, today or past, and not completed
                    // Note: In Monthly view, we might want to see them on *today* if they are rollover. 
                    // But if clicking a past date, we probably want to see what was scheduled then?
                    // Actually, standard logic: Rollover tasks appear on "Today". They don't appear on "Yesterday" unless they were explicitly for yesterday.
                    // However, for a Calendar View, if I click "Yesterday", I expect to see tasks that were scheduled for yesterday?
                    // Let's stick to the MonthlyCalendarView logic:
                    // "targetDate.getTime() > startDate.getTime() && targetDate.getTime() <= today.getTime()"
                    // This implies if I click yesterday, and a task started 2 days ago, it shows up.
                    if (targetDate.getTime() > startDate.getTime() && targetDate.getTime() <= today.getTime()) {
                        return true
                    }
                    return false
                }

                // Case C: Only Due Date
                if (!startDate && dueDate) {
                    return isSameDay(dueDate, selectedDate)
                }
            }
            return false
        }).sort((a, b) => {
            // Sort by priority then order
            const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 }
            const pDiff = priorityOrder[a.priority] - priorityOrder[b.priority]
            if (pDiff !== 0) return pDiff
            return (a.order || 0) - (b.order || 0)
        })
    }, [todos, selectedDate])

    // Vacations
    const shouldShowVacations = isAdmin(currentUser?.email) && showVacationsInTodos
    const dayVacations = shouldShowVacations ? getVacationsForDate(selectedDate) : []

    const isTodayDate = isToday(selectedDate)

    return (
        <div className="mt-4 animate-fade-in-up">
            {/* Header for the list */}
            <div className="flex items-center justify-between mb-3 px-1">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 w-8 h-8 rounded-full flex items-center justify-center text-sm">
                        {format(selectedDate, 'd')}
                    </span>
                    <span>
                        {format(selectedDate, i18n.language === 'ko' ? 'M월 d일 EEEE' : 'EEEE, MMM d', { locale: dateLocale })}
                    </span>
                    {isTodayDate && (
                        <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 rounded-full">
                            Today
                        </span>
                    )}
                </h3>
                <button
                    onClick={onAdd}
                    className="flex items-center gap-1 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 px-3 py-1.5 rounded-lg transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    {t('common.add')}
                </button>
            </div>

            <div className="space-y-3">
                {/* Vacations */}
                {dayVacations.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
                        {dayVacations.map(vacation => {
                            const employee = employees.find(emp => emp.id === vacation.employeeId)
                            return (
                                <VacationItem
                                    key={vacation.id}
                                    vacation={vacation}
                                    employee={employee}
                                    compact={true}
                                />
                            )
                        })}
                    </div>
                )}

                {/* Tasks */}
                {dayTodos.length > 0 ? (
                    <div className="space-y-2">
                        {dayTodos.map(todo => (
                            <TodoItem
                                key={todo.id}
                                todo={todo}
                                onEdit={onEdit}
                                compact={false} // Use full view for better detail in list mode
                            />
                        ))}
                    </div>
                ) : (
                    dayVacations.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-10 text-gray-400 dark:text-gray-500 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50/50 dark:bg-gray-800/50">
                            <div className="p-3 bg-white dark:bg-gray-800 rounded-full shadow-sm mb-3">
                                <Inbox className="w-8 h-8 text-gray-300 dark:text-gray-600" />
                            </div>
                            <p className="text-sm font-medium">{t('calendar.noTasks')}</p>
                            <button
                                onClick={onAdd}
                                className="mt-2 text-xs text-blue-500 hover:underline"
                            >
                                {t('modal.addTodo.placeholder')}
                            </button>
                        </div>
                    )
                )}
            </div>
        </div>
    )
}

export default CalendarDayList
