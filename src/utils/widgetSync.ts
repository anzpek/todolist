import type { Todo } from '../types/todo'

export const syncWidget = async (todos: Todo[]) => {
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

        const now = new Date()
        now.setHours(0, 0, 0, 0)

        // ========================================
        // 오늘 할일 위젯용 - 기존 로직 유지
        // ========================================
        const widgetTodos = todos.filter((todo) => {
            if (todo.completed) return false
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
        })

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
        const todayWidgetData = sorted.slice(0, 30).map((t) => ({
            title: t.title,
            completed: t.completed,
            priority: t.priority,
            description: t.description || '',
            dueDate: t.dueDate || '',
            progress: t.subTasks?.length > 0
                ? Math.round((t.subTasks.filter(s => s.completed).length / t.subTasks.length) * 100)
                : -1
        }))

        // ========================================
        // 캘린더 위젯용 - 미완료 + 날짜가 있는 모든 할일
        // ========================================
        const calendarTodos = todos.filter((todo) => {
            if (todo.completed) return false
            return todo.startDate || todo.dueDate
        }).map((t) => ({
            title: t.title,
            completed: false,
            priority: t.priority,
            dueDate: t.dueDate ? new Date(t.dueDate).toISOString() : '',
            startDate: t.startDate ? new Date(t.startDate).toISOString() : ''
        }))

        const transparency = parseInt(localStorage.getItem('widgetTransparency') || '80')

        const combinedData = {
            today: todayWidgetData,
            calendar: calendarTodos
        }

        await TodoListWidget.updateWidget({
            data: JSON.stringify(combinedData),
            date: new Date().toLocaleDateString(),
            transparency
        })
        console.log('Widget synced:', todayWidgetData.length, 'today tasks,', calendarTodos.length, 'calendar tasks')

    } catch (error) {
        console.error('Widget sync failed', error)
    }
}
