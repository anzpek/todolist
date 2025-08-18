import { createContext, useContext, useReducer, useEffect } from 'react'
import type { ReactNode } from 'react'
import type { Todo, SubTask, Priority, TaskType } from '../types/todo'
import { generateId } from '../utils/helpers'
import { shouldCreateRecurringInstance, createRecurringTodo, getNextRecurrenceDate } from '../utils/recurrence'

interface TodoState {
  todos: Todo[]
  loading: boolean
  error: string | null
}

type TodoAction = 
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_TODOS'; payload: Todo[] }
  | { type: 'ADD_TODO'; payload: Todo }
  | { type: 'UPDATE_TODO'; payload: { id: string; updates: Partial<Todo> } }
  | { type: 'DELETE_TODO'; payload: string }
  | { type: 'TOGGLE_TODO'; payload: string }
  | { type: 'ADD_SUBTASK'; payload: { todoId: string; subTask: SubTask } }
  | { type: 'UPDATE_SUBTASK'; payload: { todoId: string; subTaskId: string; updates: Partial<SubTask> } }
  | { type: 'DELETE_SUBTASK'; payload: { todoId: string; subTaskId: string } }
  | { type: 'TOGGLE_SUBTASK'; payload: { todoId: string; subTaskId: string } }

interface TodoContextType extends TodoState {
  addTodo: (todoData: Omit<Todo, 'id' | 'createdAt' | 'updatedAt'>) => void
  updateTodo: (id: string, updates: Partial<Todo>) => void
  deleteTodo: (id: string) => void
  toggleTodo: (id: string) => void
  addSubTask: (todoId: string, title: string) => void
  updateSubTask: (todoId: string, subTaskId: string, updates: Partial<SubTask>) => void
  deleteSubTask: (todoId: string, subTaskId: string) => void
  toggleSubTask: (todoId: string, subTaskId: string) => void
  getTodayTodos: () => Todo[]
  getWeekTodos: () => Todo[]
  getMonthTodos: () => Todo[]
  getOverdueTodos: () => Todo[]
  getTomorrowTodos: () => Todo[]
  getYesterdayIncompleteTodos: () => Todo[]
  getFilteredTodos: (filters: {
    searchTerm?: string
    priorityFilter?: Priority | 'all'
    typeFilter?: TaskType | 'all'
    projectFilter?: 'all' | 'longterm' | 'shortterm'
    tagFilter?: string[]
    completionDateFilter?: 'all' | 'today' | 'yesterday' | 'thisWeek' | 'lastWeek' | 'thisMonth'
    includeCompleted?: boolean
  }) => Todo[]
}

const initialState: TodoState = {
  todos: [],
  loading: false,
  error: null,
}

function todoReducer(state: TodoState, action: TodoAction): TodoState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload }
    
    case 'SET_ERROR':
      return { ...state, error: action.payload }
    
    case 'SET_TODOS':
      return { ...state, todos: action.payload }
    
    case 'ADD_TODO':
      return { ...state, todos: [...state.todos, action.payload] }
    
    case 'UPDATE_TODO':
      return {
        ...state,
        todos: state.todos.map(todo =>
          todo.id === action.payload.id
            ? { ...todo, ...action.payload.updates, updatedAt: new Date() }
            : todo
        ),
      }
    
    case 'DELETE_TODO':
      return {
        ...state,
        todos: state.todos.filter(todo => todo.id !== action.payload),
      }
    
    case 'TOGGLE_TODO':
      return {
        ...state,
        todos: state.todos.map(todo =>
          todo.id === action.payload
            ? { 
                ...todo, 
                completed: !todo.completed, 
                completedAt: !todo.completed ? new Date() : undefined,
                updatedAt: new Date() 
              }
            : todo
        ),
      }
    
    case 'ADD_SUBTASK':
      return {
        ...state,
        todos: state.todos.map(todo =>
          todo.id === action.payload.todoId
            ? {
                ...todo,
                subTasks: [...(todo.subTasks || []), action.payload.subTask],
                updatedAt: new Date(),
              }
            : todo
        ),
      }
    
    case 'UPDATE_SUBTASK':
      return {
        ...state,
        todos: state.todos.map(todo =>
          todo.id === action.payload.todoId
            ? {
                ...todo,
                subTasks: todo.subTasks?.map(subTask =>
                  subTask.id === action.payload.subTaskId
                    ? { ...subTask, ...action.payload.updates }
                    : subTask
                ),
                updatedAt: new Date(),
              }
            : todo
        ),
      }
    
    case 'DELETE_SUBTASK':
      return {
        ...state,
        todos: state.todos.map(todo =>
          todo.id === action.payload.todoId
            ? {
                ...todo,
                subTasks: todo.subTasks?.filter(subTask => subTask.id !== action.payload.subTaskId),
                updatedAt: new Date(),
              }
            : todo
        ),
      }
    
    case 'TOGGLE_SUBTASK':
      return {
        ...state,
        todos: state.todos.map(todo =>
          todo.id === action.payload.todoId
            ? {
                ...todo,
                subTasks: todo.subTasks?.map(subTask =>
                  subTask.id === action.payload.subTaskId
                    ? { ...subTask, completed: !subTask.completed }
                    : subTask
                ),
                updatedAt: new Date(),
              }
            : todo
        ),
      }
    
    default:
      return state
  }
}

const TodoContext = createContext<TodoContextType | undefined>(undefined)

export function TodoProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(todoReducer, initialState)

  // 로컬 스토리지에서 데이터 로드
  useEffect(() => {
    const savedTodos = localStorage.getItem('todos')
    if (savedTodos) {
      try {
        const todos = JSON.parse(savedTodos).map((todo: any) => ({
          ...todo,
          createdAt: new Date(todo.createdAt),
          updatedAt: new Date(todo.updatedAt),
          dueDate: todo.dueDate ? new Date(todo.dueDate) : undefined,
          completedAt: todo.completedAt ? new Date(todo.completedAt) : undefined,
          subTasks: todo.subTasks?.map((subTask: any) => ({
            ...subTask,
            createdAt: new Date(subTask.createdAt),
          })),
        }))
        dispatch({ type: 'SET_TODOS', payload: todos })
      } catch (error) {
        console.error('Failed to load todos from localStorage:', error)
      }
    }
  }, [])

  // 상태 변경시 로컬 스토리지에 저장
  useEffect(() => {
    localStorage.setItem('todos', JSON.stringify(state.todos))
  }, [state.todos])

  const addTodo = (todoData: Omit<Todo, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newTodo: Todo = {
      ...todoData,
      id: generateId(),
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    dispatch({ type: 'ADD_TODO', payload: newTodo })
  }

  const updateTodo = (id: string, updates: Partial<Todo>) => {
    dispatch({ type: 'UPDATE_TODO', payload: { id, updates } })
  }

  const deleteTodo = (id: string) => {
    dispatch({ type: 'DELETE_TODO', payload: id })
  }

  const toggleTodo = (id: string) => {
    const todo = state.todos.find(t => t.id === id)
    if (!todo) return

    // 프로젝트 타입이고 서브태스크가 있다면, 서브태스크 완료 여부 확인
    if (todo.type === 'project' && todo.subTasks && todo.subTasks.length > 0) {
      const allSubTasksCompleted = todo.subTasks.every(subTask => subTask.completed)
      
      // 모든 서브태스크가 완료되지 않았으면 프로젝트를 완료할 수 없음
      if (!allSubTasksCompleted && !todo.completed) {
        const incompleteTasks = todo.subTasks.filter(subTask => !subTask.completed).length
        alert(`프로젝트를 완료하려면 남은 ${incompleteTasks}개의 하위 작업을 먼저 완료해주세요.`)
        return
      }
    }

    // 할일을 완료 상태로 토글
    dispatch({ type: 'TOGGLE_TODO', payload: id })

    // 할일이 완료되고 반복 설정이 있으면 새로운 반복 인스턴스 생성
    if (!todo.completed && shouldCreateRecurringInstance({ ...todo, completed: true })) {
      const nextDate = getNextRecurrenceDate(todo)
      if (nextDate) {
        const newTodoData = createRecurringTodo(todo, nextDate)
        const newTodo: Todo = {
          ...newTodoData,
          id: generateId(),
          createdAt: new Date(),
          updatedAt: new Date(),
        }
        dispatch({ type: 'ADD_TODO', payload: newTodo })
      }
    }
  }

  const addSubTask = (todoId: string, title: string) => {
    const subTask: SubTask = {
      id: generateId(),
      title,
      completed: false,
      priority: 'medium',
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    dispatch({ type: 'ADD_SUBTASK', payload: { todoId, subTask } })
  }

  const updateSubTask = (todoId: string, subTaskId: string, updates: Partial<SubTask>) => {
    dispatch({ type: 'UPDATE_SUBTASK', payload: { todoId, subTaskId, updates } })
  }

  const deleteSubTask = (todoId: string, subTaskId: string) => {
    dispatch({ type: 'DELETE_SUBTASK', payload: { todoId, subTaskId } })
  }

  const toggleSubTask = (todoId: string, subTaskId: string) => {
    dispatch({ type: 'TOGGLE_SUBTASK', payload: { todoId, subTaskId } })
    
    // 서브태스크 토글 후 프로젝트 완료 상태 확인 및 업데이트
    setTimeout(() => {
      const todo = state.todos.find(t => t.id === todoId)
      if (todo && todo.type === 'project' && todo.subTasks && todo.subTasks.length > 0) {
        const allSubTasksCompleted = todo.subTasks.every(subTask => subTask.completed)
        
        // 모든 서브태스크가 완료되었는데 프로젝트가 미완료 상태라면 자동 완료
        if (allSubTasksCompleted && !todo.completed) {
          dispatch({ type: 'TOGGLE_TODO', payload: todoId })
        }
        // 서브태스크 중 미완료가 있는데 프로젝트가 완료 상태라면 미완료로 변경
        else if (!allSubTasksCompleted && todo.completed) {
          dispatch({ type: 'TOGGLE_TODO', payload: todoId })
        }
      }
    }, 0)
  }

  const getTodayTodos = () => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    return state.todos.filter(todo => {
      // 마감일이 있는 경우: 오늘이 마감일인 할일만
      if (todo.dueDate) {
        const dueDate = new Date(todo.dueDate)
        dueDate.setHours(0, 0, 0, 0)
        return dueDate >= today && dueDate < tomorrow
      }
      
      // 마감일이 없는 경우: 생성일이 오늘이거나 미완료인 중요한 할일만
      const createdDate = new Date(todo.createdAt)
      createdDate.setHours(0, 0, 0, 0)
      
      // 오늘 생성된 할일이거나, 고우선순위 미완료 할일
      return (createdDate >= today && createdDate < tomorrow) || 
             (!todo.completed && (todo.priority === 'high' || todo.priority === 'urgent'))
    })
  }

  const getOverdueTodos = () => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    return state.todos.filter(todo => {
      if (!todo.dueDate || todo.completed) return false
      const dueDate = new Date(todo.dueDate)
      dueDate.setHours(0, 0, 0, 0)
      return dueDate < today
    })
  }

  const getTomorrowTodos = () => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(0, 0, 0, 0)
    const dayAfterTomorrow = new Date(tomorrow)
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1)

    return state.todos.filter(todo => {
      if (!todo.dueDate) return false
      const dueDate = new Date(todo.dueDate)
      dueDate.setHours(0, 0, 0, 0)
      return dueDate >= tomorrow && dueDate < dayAfterTomorrow
    })
  }

  const getWeekTodos = () => {
    const today = new Date()
    const startOfWeek = new Date(today)
    startOfWeek.setDate(today.getDate() - today.getDay())
    startOfWeek.setHours(0, 0, 0, 0)
    const endOfWeek = new Date(startOfWeek)
    endOfWeek.setDate(startOfWeek.getDate() + 7)

    return state.todos.filter(todo => {
      // 마감일이 없는 할일은 주간 뷰에도 포함
      if (!todo.dueDate) return true
      
      const dueDate = new Date(todo.dueDate)
      return dueDate >= startOfWeek && dueDate < endOfWeek
    })
  }

  const getMonthTodos = () => {
    const today = new Date()
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1)

    return state.todos.filter(todo => {
      // 마감일이 없는 할일은 월간 뷰에도 포함
      if (!todo.dueDate) return true
      
      const dueDate = new Date(todo.dueDate)
      return dueDate >= startOfMonth && dueDate < endOfMonth
    })
  }

  const getYesterdayIncompleteTodos = () => {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    yesterday.setHours(0, 0, 0, 0)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    return state.todos.filter(todo => {
      if (todo.completed) return false
      
      // 마감일이 어제인 미완료 할일
      if (todo.dueDate) {
        const dueDate = new Date(todo.dueDate)
        dueDate.setHours(0, 0, 0, 0)
        return dueDate >= yesterday && dueDate < today
      }
      
      return false
    })
  }

  const getFilteredTodos = (filters: {
    searchTerm?: string
    priorityFilter?: Priority | 'all'
    typeFilter?: TaskType | 'all'
    projectFilter?: 'all' | 'longterm' | 'shortterm'
    tagFilter?: string[]
    completionDateFilter?: 'all' | 'today' | 'yesterday' | 'thisWeek' | 'lastWeek' | 'thisMonth'
    includeCompleted?: boolean
  }) => {
    const {
      searchTerm = '',
      priorityFilter = 'all',
      typeFilter = 'all',
      projectFilter = 'all',
      tagFilter = [],
      completionDateFilter = 'all',
      includeCompleted = false
    } = filters

    return state.todos.filter(todo => {
      // 완료 상태 필터
      if (!includeCompleted && todo.completed) return false

      // 검색어 필터
      if (searchTerm && !todo.title.toLowerCase().includes(searchTerm.toLowerCase()) &&
          !todo.description?.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false
      }

      // 우선순위 필터
      if (priorityFilter !== 'all' && todo.priority !== priorityFilter) return false

      // 타입 필터
      if (typeFilter !== 'all' && todo.type !== typeFilter) return false

      // 프로젝트 필터
      if (projectFilter !== 'all') {
        if (todo.type !== 'project') return false
        if (todo.project !== projectFilter) return false
      }

      // 태그 필터
      if (tagFilter.length > 0) {
        if (!todo.tags || !tagFilter.some(tag => todo.tags!.includes(tag))) {
          return false
        }
      }

      // 완료일 필터
      if (completionDateFilter !== 'all' && todo.completed && todo.completedAt) {
        const completedDate = new Date(todo.completedAt)
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        
        const yesterday = new Date(today)
        yesterday.setDate(yesterday.getDate() - 1)
        
        const thisWeekStart = new Date(today)
        thisWeekStart.setDate(today.getDate() - today.getDay()) // 이번 주 일요일
        
        const lastWeekStart = new Date(thisWeekStart)
        lastWeekStart.setDate(thisWeekStart.getDate() - 7)
        const lastWeekEnd = new Date(thisWeekStart)
        lastWeekEnd.setDate(thisWeekStart.getDate() - 1)
        
        const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1)
        
        const completedDateOnly = new Date(completedDate)
        completedDateOnly.setHours(0, 0, 0, 0)
        
        switch (completionDateFilter) {
          case 'today':
            if (completedDateOnly.getTime() !== today.getTime()) return false
            break
          case 'yesterday':
            if (completedDateOnly.getTime() !== yesterday.getTime()) return false
            break
          case 'thisWeek':
            if (completedDate < thisWeekStart) return false
            break
          case 'lastWeek':
            if (completedDate < lastWeekStart || completedDate > lastWeekEnd) return false
            break
          case 'thisMonth':
            if (completedDate < thisMonthStart) return false
            break
        }
      } else if (completionDateFilter !== 'all') {
        // 완료일 필터가 설정되었지만 할일이 미완료이거나 완료일이 없는 경우
        return false
      }

      return true
    })
  }

  const value: TodoContextType = {
    ...state,
    addTodo,
    updateTodo,
    deleteTodo,
    toggleTodo,
    addSubTask,
    updateSubTask,
    deleteSubTask,
    toggleSubTask,
    getTodayTodos,
    getWeekTodos,
    getMonthTodos,
    getOverdueTodos,
    getTomorrowTodos,
    getYesterdayIncompleteTodos,
    getFilteredTodos,
  }

  return <TodoContext.Provider value={value}>{children}</TodoContext.Provider>
}

export function useTodos() {
  const context = useContext(TodoContext)
  if (context === undefined) {
    throw new Error('useTodos must be used within a TodoProvider')
  }
  return context
}