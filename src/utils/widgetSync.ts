import type { Todo } from '../types/todo'

interface Vacation {
    id: string
    employeeId: number
    date: string
    type: string
    employeeName?: string
}

interface SyncWidgetOptions {
    todos: Todo[]
    vacations?: Vacation[]
}

export const syncWidget = async (todosOrOptions: Todo[] | SyncWidgetOptions) => {
    try {
        const { Capacitor } = await import('@capacitor/core')
        if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') return

        // Dynamic import to avoid issues on non-native
        let TodoListWidget
        try {
            const module = await import('../plugins/TodoListWidget')
            TodoListWidget = module.default
        } catch (e) {
            console.warn('Widget plugin not found', e)
            return
        }

        if (!TodoListWidget) return

        // 입력 형식 처리 (배열 또는 객체)
        let todos: Todo[]
        let vacations: Vacation[] = []

        if (Array.isArray(todosOrOptions)) {
            todos = todosOrOptions
        } else {
            todos = todosOrOptions.todos
            vacations = todosOrOptions.vacations || []
        }

        const now = new Date()
        now.setHours(0, 0, 0, 0)

        console.log('📱 syncWidget: Starting with', todos.length, 'todos,', vacations.length, 'vacations')

        // ========================================
        // 오늘 할일 위젯용 - 오늘 할일 (완료된 것 포함)
        // ========================================
        const widgetTodos = todos.filter((todo) => {
            // 완료된 할일도 포함 (오늘 완료한 것)
            if (todo.completed && todo.completedAt) {
                const completedDate = new Date(todo.completedAt)
                completedDate.setHours(0, 0, 0, 0)
                return completedDate.getTime() === now.getTime()
            }

            // 미완료 할일
            if (!todo.completed) {
                if (todo.startDate) {
                    const start = new Date(todo.startDate)
                    start.setHours(0, 0, 0, 0)
                    return now >= start
                }
                if (todo.dueDate) {
                    const due = new Date(todo.dueDate)
                    due.setHours(0, 0, 0, 0)
                    return now >= due
                }
                return true // Inbox
            }

            return false
        })

        console.log('📱 syncWidget: Filtered to', widgetTodos.length, 'today todos')

        const sorted = [...widgetTodos].sort((a, b) => {
            // Priority map
            const pMap: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 }
            const pA = pMap[a.priority] ?? 2
            const pB = pMap[b.priority] ?? 2
            if (pA !== pB) return pA - pB

            // Due Date
            if (a.dueDate && b.dueDate) return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
            if (a.dueDate) return -1
            if (b.dueDate) return 1

            return (a.order ?? 0) - (b.order ?? 0)
        })

        // 오늘 할일 위젯용 데이터 (30개 제한)
        const todayWidgetData = sorted.slice(0, 30).map((t) => {
            // 날짜를 ISO 문자열로 안전하게 변환
            let dueDateStr = ''
            if (t.dueDate) {
                try {
                    dueDateStr = t.dueDate instanceof Date
                        ? t.dueDate.toISOString()
                        : new Date(t.dueDate).toISOString()
                } catch (e) {
                    dueDateStr = String(t.dueDate)
                }
            }

            // subTasks null 체크
            const subTasks = t.subTasks || []
            const completedSubTasks = subTasks.filter(s => s.completed).length
            const progress = subTasks.length > 0
                ? Math.round((completedSubTasks / subTasks.length) * 100)
                : -1

            return {
                id: t.id || '',
                title: t.title || '',
                completed: t.completed || false,
                priority: t.priority || 'medium',
                description: t.description || '',
                dueDate: dueDateStr,
                progress
            }
        })

        console.log('📱 syncWidget: Today widget data:', todayWidgetData.length, 'items')

        // ========================================
        // 캘린더 위젯용 - 미완료 + 날짜가 있는 모든 할일 + 반복 할일
        // ========================================
        const calendarFiltered = todos.filter((todo) => {
            if (todo.completed) return false
            // 날짜가 있는 할일
            if (todo.startDate || todo.dueDate) return true
            // 반복 할일 (날짜가 없어도 recurrence가 있으면 표시)
            if (todo.recurrence && todo.recurrence !== 'none') return true
            return false
        })

        // 우선순위 정렬 추가
        const calendarSorted = [...calendarFiltered].sort((a, b) => {
            const pMap: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 }
            const pA = pMap[a.priority] ?? 2
            const pB = pMap[b.priority] ?? 2
            return pA - pB
        })

        const calendarTodos = calendarSorted.map((t) => {
            let dueDateStr = ''
            let startDateStr = ''

            if (t.dueDate) {
                try {
                    dueDateStr = t.dueDate instanceof Date
                        ? t.dueDate.toISOString()
                        : new Date(t.dueDate).toISOString()
                } catch (e) {
                    dueDateStr = String(t.dueDate)
                }
            }

            if (t.startDate) {
                try {
                    startDateStr = t.startDate instanceof Date
                        ? t.startDate.toISOString()
                        : new Date(t.startDate).toISOString()
                } catch (e) {
                    startDateStr = String(t.startDate)
                }
            }

            return {
                title: t.title || '',
                completed: false,
                priority: t.priority || 'medium',
                dueDate: dueDateStr,
                startDate: startDateStr
            }
        })

        console.log('📱 syncWidget: Calendar widget data:', calendarTodos.length, 'items')

        // ========================================
        // 휴가 데이터 처리
        // ========================================
        const vacationData = vacations.map(v => ({
            id: v.id,
            date: v.date,
            type: v.type,
            employeeName: v.employeeName || ''
        }))

        console.log('📱 syncWidget: Vacation data:', vacationData.length, 'items')

        const transparency = parseInt(localStorage.getItem('widgetTransparency') || '80')

        const combinedData = {
            today: todayWidgetData,
            calendar: calendarTodos,
            vacations: vacationData
        }

        console.log('📱 syncWidget: Sending combined data to native...')

        await TodoListWidget.updateWidget({
            data: JSON.stringify(combinedData),
            date: new Date().toLocaleDateString(),
            transparency
        })

        console.log('📱 syncWidget: SUCCESS!')

    } catch (error) {
        console.error('Widget sync failed', error)
    }
}
