import { createContext, useContext, useReducer, useEffect, useRef, useMemo, useCallback, useState } from 'react'
import type { ReactNode } from 'react'
import type { Todo, SubTask, Priority, TaskType } from '../types/todo'
import type { RecurringTemplate, RecurringInstance } from '../types/context'
import { generateId } from '../utils/helpers'
import { simpleRecurringSystem, type SimpleRecurringTemplate, type SimpleRecurringInstance } from '../utils/simpleRecurring'
import { useAuth } from './AuthContext'
import { firestoreService } from '../services/firestoreService'
import { cleanupService } from '../services/cleanupService'
import { deleteField } from '../config/firebase'
import { useCustomHolidays } from './CustomHolidayContext'

interface TodoState {
  todos: Todo[]
  recurringTemplates: SimpleRecurringTemplate[]
  recurringInstances: SimpleRecurringInstance[]
  loading: boolean
  error: string | null
  syncing: boolean
}

type TodoAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_SYNCING'; payload: boolean }
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
  | { type: 'SET_RECURRING_TEMPLATES'; payload: SimpleRecurringTemplate[] }
  | { type: 'ADD_RECURRING_TEMPLATE'; payload: SimpleRecurringTemplate }
  | { type: 'UPDATE_RECURRING_TEMPLATE'; payload: { id: string; updates: Partial<SimpleRecurringTemplate> } }
  | { type: 'DELETE_RECURRING_TEMPLATE'; payload: string }
  | { type: 'SET_RECURRING_INSTANCES'; payload: SimpleRecurringInstance[] }
  | { type: 'UPDATE_RECURRING_INSTANCE'; payload: { id: string; updates: Partial<SimpleRecurringInstance> } }
  | { type: 'GENERATE_RECURRING_INSTANCES' }

interface TodoContextType extends TodoState {
  addTodo: (todoData: Omit<Todo, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>
  updateTodo: (id: string, updates: Partial<Todo>) => Promise<void>
  deleteTodo: (id: string) => Promise<void>
  toggleTodo: (id: string) => Promise<void>
  addSubTask: (todoId: string, title: string) => Promise<void>
  updateSubTask: (todoId: string, subTaskId: string, updates: Partial<SubTask>) => Promise<void>
  deleteSubTask: (todoId: string, subTaskId: string) => Promise<void>
  toggleSubTask: (todoId: string, subTaskId: string) => Promise<void>
  syncWithFirestore: () => Promise<void>
  getTodayTodos: (targetDate?: Date) => Todo[]
  getWeekTodos: () => Todo[]
  getMonthTodos: () => Todo[]
  getOverdueTodos: () => Todo[]
  getTomorrowTodos: (targetDate?: Date) => Todo[]
  getYesterdayIncompleteTodos: (targetDate?: Date) => Todo[]
  isYesterdayIncompleteTodo: (todo: Todo) => boolean
  updateTodoOrder: (todoId: string, newOrder: number) => Promise<void>
  reorderTodos: (sourceIndex: number, destinationIndex: number, todos: Todo[]) => Promise<void>
  getFilteredTodos: (filters: {
    searchTerm?: string
    priorityFilter?: Priority | 'all'
    typeFilter?: TaskType | 'all'
    projectFilter?: 'all' | 'longterm' | 'shortterm'
    tagFilter?: string[]
    completionDateFilter?: 'all' | 'today' | 'yesterday' | 'thisWeek' | 'lastWeek' | 'thisMonth'
    includeCompleted?: boolean
  }) => Todo[]
  // 반복 할일 관련 함수들
  addRecurringTemplate: (template: Omit<SimpleRecurringTemplate, 'id' | 'createdAt' | 'updatedAt'>) => void
  updateRecurringTemplate: (id: string, updates: Partial<SimpleRecurringTemplate>) => void
  deleteRecurringTemplate: (id: string) => void
  generateRecurringInstances: () => void
  getRecurringTodos: () => Todo[]
  cleanupDuplicateTemplates: () => void
  forceRefresh: () => Promise<void>
  manualRefresh: () => Promise<void>
  initializeOrderValues: () => void
  fixRecurringInstances: () => Promise<void>
  cleanupOrphanedData: () => Promise<void>
  validateDataConsistency: () => Promise<void>

  smartCleanupInstances: () => Promise<void>

  // SettingsView에서 사용하는 추가 함수들
  exportData: () => string
  importData: (json: string) => Promise<boolean>
  clearCompleted: () => Promise<void>
  syncWithCloud: () => Promise<void>
  stats: {
    total: number
    completed: number
    pending: number
  }

  // Filter State
  searchQuery: string
  setSearchQuery: (query: string) => void
  filterStatus: 'all' | 'active' | 'completed'
  setFilterStatus: (status: 'all' | 'active' | 'completed') => void
  filterPriority: Priority | 'all'
  setFilterPriority: (priority: Priority | 'all') => void
  filterTags: string[]
  setFilterTags: (tags: string[]) => void
  allTags: string[]
}

const TodoContext = createContext<TodoContextType | undefined>(undefined)

const initialState: TodoState = {
  todos: [],
  recurringTemplates: [],
  recurringInstances: [],
  loading: false,
  error: null,
  syncing: false
}

function todoReducer(state: TodoState, action: TodoAction): TodoState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload }
    case 'SET_SYNCING':
      return { ...state, syncing: action.payload }
    case 'SET_ERROR':
      return { ...state, error: action.payload }
    case 'SET_TODOS':
      // 중복 제거 후 설정
      const uniqueSetTodos = action.payload.filter((todo, index, array) =>
        array.findIndex(t => t.id === todo.id) === index
      )
      if (uniqueSetTodos.length !== action.payload.length) {
        console.warn(`⚠️ SET_TODOS 중복 제거: ${action.payload.length} → ${uniqueSetTodos.length}`)
      }
      return { ...state, todos: uniqueSetTodos }
    case 'ADD_TODO':
      // 기존 할일과 중복 방지
      const existsInCurrent = state.todos.some(t => t.id === action.payload.id)
      if (existsInCurrent) {
        console.warn(`⚠️ ADD_TODO 중복 방지: ${action.payload.id} 이미 존재`)
        return state
      }
      return { ...state, todos: [action.payload, ...state.todos] }
    case 'UPDATE_TODO':
      return {
        ...state,
        todos: state.todos.map(todo =>
          todo.id === action.payload.id
            ? { ...todo, ...action.payload.updates, updatedAt: new Date() }
            : todo
        )
      }
    case 'DELETE_TODO':
      return {
        ...state,
        todos: state.todos.filter(todo => todo.id !== action.payload)
      }
    case 'TOGGLE_TODO': {
      const now = new Date()
      return {
        ...state,
        todos: state.todos.map(todo => {
          if (todo.id === action.payload) {
            const newCompleted = !todo.completed
            // 완료 상태로 변경될 때 알림 트리거 (사이드 이펙트지만 reducer 내에서 호출 - 실제로는 미들웨어나 dispatch 직후가 좋지만 구조상 여기서 처리)
            if (newCompleted) {
              // 비동기로 실행하여 reducer 순수성 유지 노력
              setTimeout(() => {
                import('../utils/notifications').then(({ notificationManager }) => {
                  notificationManager.showCompletionCelebration(todo)
                })
              }, 0)
            }

            return {
              ...todo,
              completed: newCompleted,
              completedAt: newCompleted ? now : undefined,
              updatedAt: now
            }
          }
          return todo
        })
      }
    }
    case 'ADD_SUBTASK':
      return {
        ...state,
        todos: state.todos.map(todo =>
          todo.id === action.payload.todoId
            ? {
              ...todo,
              subTasks: [...(todo.subTasks || []), action.payload.subTask],
              updatedAt: new Date()
            }
            : todo
        )
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
                  ? { ...subTask, ...action.payload.updates, updatedAt: new Date() }
                  : subTask
              ) || [],
              updatedAt: new Date()
            }
            : todo
        )
      }
    case 'DELETE_SUBTASK':
      return {
        ...state,
        todos: state.todos.map(todo =>
          todo.id === action.payload.todoId
            ? {
              ...todo,
              subTasks: todo.subTasks?.filter(subTask => subTask.id !== action.payload.subTaskId) || [],
              updatedAt: new Date()
            }
            : todo
        )
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
                  ? { ...subTask, completed: !subTask.completed, updatedAt: new Date() }
                  : subTask
              ) || [],
              updatedAt: new Date()
            }
            : todo
        )
      }
    case 'SET_RECURRING_TEMPLATES':
      return { ...state, recurringTemplates: action.payload }
    case 'ADD_RECURRING_TEMPLATE':
      return { ...state, recurringTemplates: [action.payload, ...state.recurringTemplates] }
    case 'UPDATE_RECURRING_TEMPLATE':
      return {
        ...state,
        recurringTemplates: state.recurringTemplates.map(template =>
          template.id === action.payload.id
            ? { ...template, ...action.payload.updates, updatedAt: new Date() }
            : template
        )
      }
    case 'DELETE_RECURRING_TEMPLATE':
      return {
        ...state,
        recurringTemplates: state.recurringTemplates.filter(template => template.id !== action.payload),
        recurringInstances: state.recurringInstances.filter(instance => instance.templateId !== action.payload)
      }
    case 'SET_RECURRING_INSTANCES':
      // Firebase 데이터 우선 병합 (Firebase 데이터가 로컬 데이터를 덮어씀)
      console.log('🔄 SET_RECURRING_INSTANCES - Firebase 데이터로 state 업데이트')
      console.log(`   기존 인스턴스 수: ${state.recurringInstances.length}`)
      console.log(`   새 Firebase 인스턴스 수: ${action.payload.length}`)

      // 월간업무보고 상태 확인
      const newMonthlyReport = action.payload.find(i => i.id === 'vCyWLYn3LuDq1nVUPSyE_2025-08-26')
      if (newMonthlyReport) {
        console.log(`   🔧 Firebase 월간업무보고 상태: completed=${newMonthlyReport.completed}`)
      }

      return { ...state, recurringInstances: action.payload }
    case 'UPDATE_RECURRING_INSTANCE':
      return {
        ...state,
        recurringInstances: state.recurringInstances.map(instance =>
          instance.id === action.payload.id
            ? { ...instance, ...action.payload.updates, updatedAt: new Date() }
            : instance
        )
      }
    case 'GENERATE_RECURRING_INSTANCES': {
      // 모든 활성 템플릿에 대해 인스턴스 생성
      let allInstances: SimpleRecurringInstance[] = []

      // localStorage에서 기존 인스턴스 상태 로드 (비로그인 사용자용)
      let savedInstances: SimpleRecurringInstance[] = []
      try {
        const savedData = localStorage.getItem('recurringInstances')
        if (savedData) {
          const parsed = JSON.parse(savedData)
          savedInstances = (parsed as Array<{
            id: string
            templateId: string
            date: string | Date
            completed: boolean
            completedAt?: string | Date
            skipped?: boolean
            createdAt: string | Date
            updatedAt: string | Date
          }>).map((item) => ({
            ...item,
            date: new Date(item.date),
            createdAt: new Date(item.createdAt),
            updatedAt: new Date(item.updatedAt),
            completedAt: item.completedAt ? new Date(item.completedAt) : undefined
          }))
          console.log('📂 localStorage에서 반복 인스턴스 복원:', savedInstances.length, '개')
        }
      } catch (error) {
        console.error('❌ localStorage 인스턴스 로드 실패:', error)
      }

      // 🔥 로그인 사용자와 비로그인 사용자 분리 처리
      // currentUser check removed from reducer as it is not available here.
      // This action should only be dispatched for local generation or we should handle it differently.
      // For now, we assume if this is called, we proceed with local generation logic if appropriate,
      // or we just return state if we want to enforce no-op for logged in users without checking currentUser.
      // However, since we can't check currentUser, we will proceed with the logic that was in the else block
      // but we should be careful.
      // Actually, looking at the logic, it tries to load from localStorage.

      // Let's just keep the logic for non-logged in users (local storage)
      // and assume the caller handles the check.

      // 비로그인 사용자: 로컬 인스턴스 생성 + localStorage 복원
      console.log('👤 비로그인 사용자 - 로컬 인스턴스 생성 시작')

      // allInstances reused from above

      state.recurringTemplates.filter(template => template.isActive).forEach(template => {
        try {
          const instances = simpleRecurringSystem.generateInstances(template)

          // localStorage에서 상태 복원
          const restoredInstances = instances.map(instance => {
            const saved = savedInstances.find(s => s.id === instance.id)
            if (saved) {
              console.log(`🔄 localStorage 인스턴스 상태 복원: ${instance.id} (완료: ${saved.completed})`)
              return {
                ...instance,
                completed: saved.completed,
                completedAt: saved.completedAt,
                updatedAt: saved.updatedAt
              }
            }
            return instance
          })

          allInstances = [...allInstances, ...restoredInstances]
        } catch (error) {
          console.error(`템플릿 ${template.id} 인스턴스 생성 실패:`, error)
        }
      })

      return { ...state, recurringInstances: allInstances }
    }
    default:
      return state
  }
}

export const TodoProvider = ({ children }: { children: ReactNode }) => {
  const [state, dispatch] = useReducer(todoReducer, initialState)
  const { currentUser, loading: authLoading } = useAuth()
  const { customHolidays } = useCustomHolidays()

  // Filter State
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'completed'>('all')
  const [filterPriority, setFilterPriority] = useState<Priority | 'all'>('all')
  const [filterTags, setFilterTags] = useState<string[]>([])

  const todoUnsubscribeRef = useRef<(() => void) | null>(null)
  const templateUnsubscribeRef = useRef<(() => void) | null>(null)
  const instanceUnsubscribeRef = useRef<(() => void) | null>(null)

  // Firebase 실시간 구독 설정
  useEffect(() => {
    // 인증 로딩 중이면 대기
    if (authLoading) {
      return
    }

    if (!currentUser) {
      console.log('❌ 비로그인 상태')
      loadFromLocalStorage()
      return
    }

    console.log('✅ 로그인 상태 - 사용자:', currentUser.uid)

    dispatch({ type: 'SET_LOADING', payload: true })

    // Firestore 실시간 구독 시작 (기존 구독 정리)
    if (todoUnsubscribeRef.current) {
      todoUnsubscribeRef.current()
      todoUnsubscribeRef.current = null
    }
    if (templateUnsubscribeRef.current) {
      templateUnsubscribeRef.current()
      templateUnsubscribeRef.current = null
    }
    if (instanceUnsubscribeRef.current) {
      instanceUnsubscribeRef.current()
      instanceUnsubscribeRef.current = null
    }

    // 마이그레이션과 구독을 비동기로 처리
    const initializeFirestore = async () => {
      try {
        // 먼저 마이그레이션 실행
        await migrateLocalDataToFirestore()

        if (!currentUser) return;

        // 그 다음 구독 시작 (마이그레이션된 데이터 포함)
        console.log('마이그레이션 완료 후 구독 시작 - 사용자:', currentUser.uid)

        // 1. Firestore 할일 실시간 구독 (간단하고 직접적)
        console.log('🔗 Firestore 할일 구독 시작 - 사용자 ID:', currentUser.uid)

        todoUnsubscribeRef.current = firestoreService.subscribeTodos(
          currentUser.uid,
          (todos) => {
            console.log('📨 Firestore에서 할일 업데이트 수신:', todos.length, '개')
            console.log('📋 Firestore에서 로드된 모든 할일 ID:', todos.map(t => t.id))

            // 바로 적용 (중복 제거는 reducer에서 처리)
            dispatch({ type: 'SET_TODOS', payload: todos })
            dispatch({ type: 'SET_LOADING', payload: false })
            dispatch({ type: 'SET_ERROR', payload: null })
          }
        )

        // 2. Firestore 반복 템플릿 실시간 구독
        templateUnsubscribeRef.current = firestoreService.subscribeRecurringTemplates(
          currentUser.uid,
          (templates) => {
            dispatch({ type: 'SET_RECURRING_TEMPLATES', payload: templates })
            console.log('반복 템플릿 Firestore에서 로드됨:', templates.length, '개')
          }
        )

        // 3. Firestore 반복 인스턴스 실시간 구독
        console.log('🚀 반복 인스턴스 실시간 구독 설정 시작...')

        // 먼저 직접 데이터 조회로 확인
        console.log('🔍 실시간 구독 전에 직접 데이터 조회로 확인...')
        console.log('👤 현재 사용자 정보:')
        console.log('  UID:', currentUser.uid)
        console.log('  Email:', currentUser.email)
        console.log('  DisplayName:', currentUser.displayName)
        console.log('📍 Firestore 경로: users/' + currentUser.uid + '/recurringInstances')

        const directInstances = await firestoreService.getRecurringInstances(currentUser.uid)
        const directWeeklyReport = directInstances.find(i => i.id === 'PUH4xT3lVY5aK2vuQyUe_2025-08-21')
        if (directWeeklyReport) {
          console.log('🎯🎯🎯 직접 조회한 주간업무보고 데이터:')
          console.log('  completed:', directWeeklyReport.completed, typeof directWeeklyReport.completed)
          console.log('  completedAt:', directWeeklyReport.completedAt)
          console.log('  전체 객체:', JSON.stringify(directWeeklyReport, null, 2))
          console.log('📍 해당 문서의 전체 경로: users/' + currentUser.uid + '/recurringInstances/PUH4xT3lVY5aK2vuQyUe_2025-08-21')
        }

        // 🔥 월간업무보고 직접 조회 추가
        const directMonthlyReport = directInstances.find(i => i.id === 'vCyWLYn3LuDq1nVUPSyE_2025-08-26')
        if (directMonthlyReport) {
          console.log('🔥🔥🔥 직접 조회한 월간업무보고 데이터:')
          console.log('  ID:', directMonthlyReport.id)
          console.log('  completed:', directMonthlyReport.completed, typeof directMonthlyReport.completed)
          console.log('  completedAt:', directMonthlyReport.completedAt)
          console.log('  updatedAt:', directMonthlyReport.updatedAt)
        } else {
          console.log('❌ 직접 조회에서 월간업무보고를 찾을 수 없음')
          console.log('📋 전체 직접 조회 인스턴스:', directInstances.map(i => i.id))
        }

        const instanceUnsubscribe = firestoreService.subscribeRecurringInstances(
          currentUser.uid,
          (instances) => {
            console.log('🔄 실시간 구독 데이터 수신 - 개수:', instances.length)
            console.log('⏰ 구독 수신 시각:', new Date().toISOString())

            // 🔍 월간업무보고 완료 상태 확인 (간소화)
            const monthlyReports = instances.filter(i => i.templateId === 'vCyWLYn3LuDq1nVUPSyE')
            if (monthlyReports.length > 0) {
              console.log('🔄 Firebase 구독 - 월간업무보고:')
              monthlyReports.forEach(report => {
                console.log(`   ID: ${report.id}, 완료: ${report.completed}`)

                // 현재 로컬 상태와 비교
                const currentLocal = state.recurringInstances.find(i => i.id === report.id)
                if (currentLocal && currentLocal.completed !== report.completed) {
                  console.log(`   ⚠️ 상태 불일치: 로컬(${currentLocal.completed}) vs Firebase(${report.completed})`)
                }
              })
            }

            dispatch({ type: 'SET_RECURRING_INSTANCES', payload: instances })
            console.log('✅ Firebase 구독 데이터 dispatch 완료')
          }
        )

        if (instanceUnsubscribe) {
          console.log('✅ 반복 인스턴스 실시간 구독 설정 성공')
          instanceUnsubscribeRef.current = instanceUnsubscribe

          // 🔧 간소화된 Firebase 강제 동기화
          setTimeout(async () => {
            try {
              console.log('🔧 Firebase 강제 동기화 실행...')
              const freshInstances = await firestoreService.getRecurringInstances(currentUser.uid)

              // 월간업무보고 상태 확인
              const monthlyReport = freshInstances.find(i => i.id === 'vCyWLYn3LuDq1nVUPSyE_2025-08-26')
              if (monthlyReport) {
                console.log(`🔧 Firebase 월간업무보고: ID=${monthlyReport.id}, 완료=${monthlyReport.completed}`)
              }

              // 강제 동기화 (Firebase 데이터를 최종 진실로 사용)
              dispatch({ type: 'SET_RECURRING_INSTANCES', payload: freshInstances })
              console.log('✅ Firebase 강제 동기화 완료')

            } catch (error) {
              console.error('❌ Firebase 강제 동기화 실패:', error)
            }
          }, 3000) // 3초 후 실행
        } else {
          console.error('❌ 반복 인스턴스 실시간 구독 설정 실패')
        }

      } catch (error) {
        console.error('Firestore 초기화 실패:', error)
        dispatch({ type: 'SET_LOADING', payload: false })
        dispatch({ type: 'SET_ERROR', payload: 'Firebase 연결에 실패했습니다.' })
      }
    }

    initializeFirestore()

    // 컴포넌트 언마운트 시 구독 해제
    return () => {
      if (todoUnsubscribeRef.current) todoUnsubscribeRef.current()
      if (templateUnsubscribeRef.current) templateUnsubscribeRef.current()
      if (instanceUnsubscribeRef.current) instanceUnsubscribeRef.current()
    }
  }, [currentUser, authLoading])

  // 반복 템플릿이 변경될 때마다 인스턴스 재생성
  useEffect(() => {
    if (state.recurringTemplates.length === 0) return

    console.log('🔄 반복 템플릿 변경 감지 - 인스턴스 재생성 시작')
    console.log('📋 현재 템플릿 수:', state.recurringTemplates.length)

    const generateRecurringInstances = async () => {
      try {
        // 비로그인 사용자: 로컬 생성
        if (!currentUser) {
          const allInstances: SimpleRecurringInstance[] = []

          for (const template of state.recurringTemplates) {
            try {
              console.log(`📝 템플릿 처리 중: ${template.title}`)
              const instances = simpleRecurringSystem.generateInstances(template, customHolidays)
              allInstances.push(...instances)
              console.log(`✅ 템플릿 ${template.title}: ${instances.length}개 인스턴스 생성`)
            } catch (error) {
              console.error(`❌ 템플릿 ${template.title} 인스턴스 생성 실패:`, error)
            }
          }

          console.log('📊 총 생성된 인스턴스:', allInstances.length)
          dispatch({ type: 'SET_RECURRING_INSTANCES', payload: allInstances })
          return
        }

        // Firebase 사용자: 각 템플릿별로 재생성
        for (const template of state.recurringTemplates) {
          try {
            console.log(`🔥 Firebase 템플릿 재생성: ${template.title}`)
            await firestoreService.regenerateRecurringInstances(template.id, currentUser.uid)
          } catch (error) {
            console.error(`❌ Firebase 템플릿 ${template.title} 재생성 실패:`, error)
          }
        }

        console.log('✅ 모든 템플릿 재생성 완료')
      } catch (error) {
        console.error('❌ 반복 인스턴스 재생성 실패:', error)
      }
    }

    generateRecurringInstances()
  }, [state.recurringTemplates, currentUser, customHolidays])

  // 새로운 반복 인스턴스를 Firebase에 동기화
  useEffect(() => {
    if (!currentUser || state.recurringInstances.length === 0) return

    const syncInstancesToFirebase = async () => {
      try {
        console.log(`🔄 반복 인스턴스 Firebase 동기화 확인 중... (총 ${state.recurringInstances.length}개)`)

        // Firebase에서 기존 인스턴스 조회
        const existingInstances = await firestoreService.getRecurringInstances(currentUser.uid)
        const existingIds = new Set(existingInstances.map(i => i.id))

        console.log(`📂 Firebase에 기존 인스턴스: ${existingInstances.length}개`)
        console.log(`📋 로컬 인스턴스: ${state.recurringInstances.length}개`)

        // 새로운 인스턴스만 Firebase에 추가 (실제로 없는 것들만)
        const newInstances = state.recurringInstances.filter(instance => {
          const isNew = !existingIds.has(instance.id)
          if (isNew) {
            console.log(`🆕 새로운 인스턴스 발견: ${instance.id} (날짜: ${instance.date})`)
          }
          return isNew
        })

        if (newInstances.length > 0) {
          console.log(`🔄 Firebase에 새로운 반복 인스턴스 ${newInstances.length}개 추가 시작...`)

          for (const instance of newInstances) {
            try {
              // 인스턴스를 Firebase에 동일한 ID로 저장
              const firestoreId = await firestoreService.addRecurringInstance({
                ...instance,
                // ID 유지를 위해 직접 설정 (일반적으로는 Firestore가 생성하지만)
                id: instance.id
              }, currentUser.uid)
              console.log(`✅ 반복 인스턴스 Firebase 추가 성공: ${instance.id} -> Firestore ID: ${firestoreId}`)
            } catch (error) {
              console.error(`❌ 반복 인스턴스 Firebase 추가 실패: ${instance.id}`, error)
            }
          }

          console.log(`🎉 반복 인스턴스 Firebase 동기화 완료!`)
        } else {
          console.log(`✅ 모든 반복 인스턴스가 이미 Firebase에 동기화되어 있음`)
        }
      } catch (error) {
        console.error('❌ 반복 인스턴스 Firebase 동기화 실패:', error)
      }
    }

    // Widget Update Logic
    useEffect(() => {
      // Only run on mobile (could check Platform) but for now just try-catch
      const updateWidget = async () => {
        try {
          const { Capacitor } = await import('@capacitor/core');
          if (Capacitor.getPlatform() !== 'android') return;

          const TodoListWidget = (await import('../plugins/TodoListWidget')).default;

          // Get Today's incomplete tasks
          const todosForWidget = state.todos.filter(todo => {
            if (todo.completed) return false;

            const targetDate = new Date();
            targetDate.setHours(0, 0, 0, 0);

            let isVisible = false;
            if (todo.startDate) {
              const start = new Date(todo.startDate);
              start.setHours(0, 0, 0, 0);
              if (targetDate >= start) isVisible = true;
            } else if (todo.dueDate) {
              const due = new Date(todo.dueDate);
              due.setHours(0, 0, 0, 0);
              if (targetDate >= due) isVisible = true;
            } else {
              // No dates - skip
            }

            return isVisible;
          });

          // Sort by priority/time
          const sorted = todosForWidget.sort((a, b) => {
            // Priority
            const pMap: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };
            const pA = pMap[a.priority] || 2;
            const pB = pMap[b.priority] || 2;
            if (pA !== pB) return pA - pB;
            return 0;
          });

          const widgetData = sorted.slice(0, 5).map(t => ({
            title: t.title,
            completed: t.completed,
            priority: t.priority
          }));

          await TodoListWidget.updateWidget({
            data: JSON.stringify(widgetData),
            date: new Date().toLocaleDateString()
          });
          console.log('📱 Widget Updated:', widgetData.length, 'tasks');

        } catch (e) {
          // Ignore errors
        }
      };

      const timeout = setTimeout(updateWidget, 1000); // Debounce
      return () => clearTimeout(timeout);
    }, [state.todos]);

    // localStorage에서 데이터 로드 (비로그인 상태용)

    // Notification Action Listener
    useEffect(() => {
      const setupListener = async () => {
        try {
          const { Capacitor } = await import('@capacitor/core');
          if (Capacitor.getPlatform() !== 'android') return;

          const { LocalNotifications } = await import('@capacitor/local-notifications');

          // Remove existing listeners to prevent duplicates (if any mechanism existed)
          // Capacitor plugins usually handle addListener cumulatively, so we should clean up.

          const listener = await LocalNotifications.addListener('localNotificationActionPerformed', async (notification) => {
            console.log('🔔 Notification Action Performed:', notification.actionId);

            const actionId = notification.actionId;
            const todoId = notification.notification.extra?.todoId;

            if (actionId === 'COMPLETE' && todoId) {
              // Find todo and toggle if not completed
              // Since we are inside the context provider, we can't easily access 'toggleTodo' function from *outside* usually,
              // but here we are inside the component. However, 'state' is available.

              // We need to dispatch directly or call the function.
              // We have 'dispatch' available!
              console.log('✅ Completing task via notification:', todoId);

              // Optimistic update locally
              dispatch({ type: 'TOGGLE_TODO', payload: todoId });

              // Sync to Firestore (manually since dispatch doesn't do side effects except notification trigger)
              if (currentUser) {
                // We'd ideally call 'toggleTodo' logic but that's defined in the context *value* which we are creating.
                // We can use a ref to access the latest function if needed, or just duplicate the logic.
                // Let's duplicate the simple toggle logic for reliability or better yet, define toggleTodo outside? No.

                // Let's use the dispatch + firestore call.
                const todo = state.todos.find(t => t.id === todoId);
                if (todo) {
                  await firestoreService.updateTodo(currentUser.uid, todoId, {
                    completed: !todo.completed, // Logic in reducer might have flipped it already?
                    // Wait, async state update issue. 
                    // It's safer to just fetch fresh or assume 'COMPLETE' means set to true.
                    completed: true,
                    completedAt: new Date(),
                    updatedAt: new Date()
                  });
                }
              }

              // Remove notification
              await LocalNotifications.removeAllDeliveredNotifications(); // Or specific one
            }
            else if (actionId === 'SNOOZE' && todoId) {
              console.log('zzz Snoozing task:', todoId);
              // Reschedule for 15 min later
              const snoozeTime = new Date(Date.now() + 15 * 60 * 1000);

              // We need to schedule it again.
              // We can Reuse NotificationManager logic but it's a class instance.
              // We can import the instance.
              const { notificationManager } = await import('../utils/notifications');
              const todo = state.todos.find(t => t.id === todoId);
              if (todo) {
                // Hacky way to force reschedule without settings override?
                // Let's just use LocalNotifications directly for Snooze
                await LocalNotifications.schedule({
                  notifications: [{
                    title: notification.notification.title || 'Snoozed Task',
                    body: notification.notification.body || 'Reminder',
                    id: notification.notification.id + 1, // New ID
                    schedule: { at: snoozeTime },
                    actionTypeId: 'REMINDER_ACTIONS',
                    extra: { todoId }
                  }]
                });
              }
            }
          });

          return () => {
            listener.remove();
          };

        } catch (e) {
          console.warn('Failed to setup notification listeners', e);
        }
      };

      // We need to handle cleanup async, but useEffect cleanup must be sync.
      // The listener promise returns an object with remove().
      let cleanup: (() => void) | undefined;

      setupListener().then(c => cleanup = c);

      return () => {
        if (cleanup) cleanup();
      };
    }, [state.todos, currentUser]); // deps? We rely on state.todos for finding task.

    // localStorage에서 데이터 로드 (비로그인 상태용)
    // Only run on mobile (could check Platform) but for now just try-catch
    const updateWidget = async () => {
      try {
        const { Capacitor } = await import('@capacitor/core');
        if (Capacitor.getPlatform() !== 'android') return;

        const TodoListWidget = (await import('../plugins/TodoListWidget')).default;

        // Get Today's incomplete tasks
        const today = new Date();
        const todosForWidget = state.todos.filter(todo => {
          if (todo.completed) return false;

          // Logic similar to getTodayTodos but simplified
          const targetDate = new Date();
          targetDate.setHours(0, 0, 0, 0);

          if (todo.startDate) {
            const start = new Date(todo.startDate);
            start.setHours(0, 0, 0, 0);
            if (targetDate < start) return false; // Future
          }
          // If due date is passed and not completed, keeping it (overdue) is typical for "Today" views
          // But strict "Today" view might differ. Let's use getTodayTodos logic:
          // Actually, let's just use the helper function logic re-implemented or simplified:

          // Simplified: Start Date <= Today OR (No Start Date AND Due Date == Today)
          // For widget, let's show anything relevant for "Now"

          // Let's filter for "Actionable Today"
          // 1. Start Date exists and <= Today
          // 2. Or (No Start Date) and (Due Date exists and <= Today)
          // 3. Or (No dates) - maybe skip? User usually wants dated tasks on widget.

          let isVisible = false;
          if (todo.startDate) {
            const start = new Date(todo.startDate);
            start.setHours(0, 0, 0, 0);
            if (targetDate >= start) isVisible = true;
          } else if (todo.dueDate) {
            const due = new Date(todo.dueDate);
            due.setHours(0, 0, 0, 0);
            if (targetDate >= due) isVisible = true;
          } else {
            // No dates - show if high priority? or skip. 
            // Let's skip undated tasks for widget to save space.
          }

          return isVisible;
        });

        // Sort by priority/time
        const sorted = todosForWidget.sort((a, b) => {
          // Priority
          const pMap: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };
          const pA = pMap[a.priority] || 2;
          const pB = pMap[b.priority] || 2;
          if (pA !== pB) return pA - pB;
          return 0;
        });

        const widgetData = sorted.slice(0, 5).map(t => ({
          title: t.title,
          completed: t.completed,
          priority: t.priority
        }));

        await TodoListWidget.updateWidget({
          data: JSON.stringify(widgetData),
          date: new Date().toLocaleDateString()
        });
        console.log('📱 Widget Updated:', widgetData.length, 'tasks');

      } catch (e) {
        // Ignore errors (e.g. not on Android or plugin not found)
        console.debug('Widget update failed/skipped', e);
      }
    };

    const timeout = setTimeout(updateWidget, 1000); // Debounce
    return () => clearTimeout(timeout);
  }, [state.todos]);

  // localStorage에서 데이터 로드 (비로그인 상태용)
  const loadFromLocalStorage = () => {
    try {
      console.log('=== localStorage에서 데이터 로드 시작 ===')

      // 로그인된 경우 localStorage 데이터 무시 (개인 전용 모드)
      if (currentUser) {
        console.log('👤 로그인된 사용자 - 개인 Firebase 데이터만 사용')
        dispatch({ type: 'SET_TODOS', payload: [] })
        dispatch({ type: 'SET_RECURRING_TEMPLATES', payload: [] })
        dispatch({ type: 'SET_LOADING', payload: false })
        return
      }

      // 할일 데이터 로드 (비로그인 사용자만 localStorage 사용)
      if (!currentUser) {
        const todosJson = localStorage.getItem('todos')
        if (todosJson) {
          const parsedTodos = JSON.parse(todosJson)
          const todos = parsedTodos.map((todo: any) => ({
            ...todo,
            createdAt: new Date(todo.createdAt),
            updatedAt: new Date(todo.updatedAt),
            dueDate: todo.dueDate ? new Date(todo.dueDate) : undefined,
            startDate: todo.startDate ? new Date(todo.startDate) : undefined,
            completedAt: todo.completedAt ? new Date(todo.completedAt) : undefined
          }))
          console.log('localStorage에서 할일 로드 (비로그인):', todos.length, '개')
          dispatch({ type: 'SET_TODOS', payload: todos })
        }
      } else {
        console.log('로그인된 사용자 - localStorage 할일 로드 건너뜀 (Firestore 사용)')
      }

      // 반복 템플릿 데이터 로드 (비로그인 사용자만)
      if (!currentUser) {
        const templatesJson = localStorage.getItem('recurringTemplates')
        if (templatesJson) {
          const parsedTemplates = JSON.parse(templatesJson)
          const templates = parsedTemplates.map((template: any) => ({
            ...template,
            createdAt: new Date(template.createdAt),
            updatedAt: new Date(template.updatedAt)
          }))
          console.log('localStorage에서 반복 템플릿 로드:', templates.length, '개')
          dispatch({ type: 'SET_RECURRING_TEMPLATES', payload: templates })
        }
      } else {
        console.log('🚫 로그인된 사용자 - localStorage 템플릿 로드 완전 비활성화 (Firestore 전용)')
      }

      dispatch({ type: 'SET_LOADING', payload: false })
      console.log('=== localStorage 데이터 로드 완료 ===')
    } catch (error) {
      console.error('localStorage 데이터 로드 실패:', error)
      dispatch({ type: 'SET_ERROR', payload: 'localStorage 데이터 로드 중 오류가 발생했습니다.' })
      dispatch({ type: 'SET_LOADING', payload: false })
    }
  }

  // localStorage에 데이터 저장 (비로그인 상태용)
  const saveToLocalStorage = () => {
    // 로그인된 사용자는 localStorage 사용 안함
    if (currentUser) {
      console.log('로그인된 사용자 - localStorage 저장 건너뜀')
      return
    }

    try {
      localStorage.setItem('todos', JSON.stringify(state.todos))
      localStorage.setItem('recurringTemplates', JSON.stringify(state.recurringTemplates))
      console.log('localStorage에 데이터 저장 완료 (비로그인)')
    } catch (error) {
      console.error('localStorage 저장 실패:', error)
    }
  }

  // localStorage에서 Firestore로 데이터 마이그레이션 (개인 전용 모드에서는 비활성화)
  const migrateLocalDataToFirestore = async () => {
    if (!currentUser) return

    try {
      console.log('=== localStorage → Firestore 마이그레이션 확인 ===')

      if (!currentUser) return;

      // 로그인 사용자 - localStorage 완전 비활성화, 마이그레이션 건너뜀 (이전에는 return으로 막았으나, 이제는 마이그레이션 시도)
      console.log('🔄 로그인 사용자 - localStorage 데이터 마이그레이션 시도')

      // 마이그레이션 완료 여부 확인
      const migrationFlag = localStorage.getItem(`migrated_${currentUser.uid}`)
      if (migrationFlag) {
        console.log('이미 마이그레이션 완료된 사용자:', currentUser.uid)
        return
      }

      console.log('마이그레이션 시작 - 사용자:', currentUser.uid)

      // localStorage에서 할일 데이터 확인
      const todosJson = localStorage.getItem('todos')
      const templatesJson = localStorage.getItem('recurringTemplates')

      if (todosJson || templatesJson) {
        console.log('마이그레이션할 localStorage 데이터 발견')

        // 할일 데이터 마이그레이션
        if (todosJson) {
          const localTodos = JSON.parse(todosJson)
          if (localTodos.length > 0) {
            console.log(`${localTodos.length}개의 할일을 Firestore로 마이그레이션`)

            // 각 할일을 개별적으로 Firestore에 추가
            for (const todo of localTodos) {
              try {
                await firestoreService.addTodo({
                  ...todo,
                  createdAt: new Date(todo.createdAt),
                  updatedAt: new Date(todo.updatedAt),
                  dueDate: todo.dueDate ? new Date(todo.dueDate) : undefined,
                  startDate: todo.startDate ? new Date(todo.startDate) : undefined,
                  completedAt: todo.completedAt ? new Date(todo.completedAt) : undefined
                }, currentUser.uid)
                console.log(`할일 마이그레이션 성공: ${todo.title}`)
              } catch (error) {
                console.error(`할일 마이그레이션 실패: ${todo.title}`, error)
              }
            }
          }
        }

        // 반복 템플릿 데이터 마이그레이션
        if (templatesJson) {
          const localTemplates = JSON.parse(templatesJson)
          if (localTemplates.length > 0) {
            console.log(`${localTemplates.length}개의 반복 템플릿을 Firestore로 마이그레이션`)

            for (const template of localTemplates) {
              try {
                await firestoreService.addRecurringTemplate({
                  ...template,
                  createdAt: new Date(template.createdAt),
                  updatedAt: new Date(template.updatedAt)
                }, currentUser.uid)
                console.log(`반복 템플릿 마이그레이션 성공: ${template.title}`)
              } catch (error) {
                console.error(`반복 템플릿 마이그레이션 실패: ${template.title}`, error)
              }
            }
          }
        }

        // 마이그레이션 완료 후 localStorage 데이터 백업 및 정리
        const backupData = {
          todos: todosJson ? JSON.parse(todosJson) : [],
          recurringTemplates: templatesJson ? JSON.parse(templatesJson) : [],
          migratedAt: new Date().toISOString(),
          userId: currentUser.uid
        }
        localStorage.setItem(`migrated_backup_${currentUser.uid}`, JSON.stringify(backupData))

        // 마이그레이션 완료 플래그 설정
        localStorage.setItem(`migrated_${currentUser.uid}`, new Date().toISOString())

        // 기존 localStorage 데이터 제거 (마이그레이션 완료)
        localStorage.removeItem('todos')
        localStorage.removeItem('recurringTemplates')

        console.log('=== 마이그레이션 완료: localStorage 데이터 정리됨 ===')
      } else {
        console.log('마이그레이션할 localStorage 데이터가 없음')
        // 데이터가 없어도 마이그레이션 완료로 표시
        localStorage.setItem(`migrated_${currentUser.uid}`, new Date().toISOString())
      }

    } catch (error) {
      console.error('마이그레이션 실패:', error)
      dispatch({ type: 'SET_ERROR', payload: '데이터 마이그레이션 중 오류가 발생했습니다.' })
    }
  }

  // 반복 템플릿이 변경될 때마다 simpleRecurringSystem에 동기화
  useEffect(() => {
    // 🔥 로그인 사용자는 simpleRecurringSystem 사용 금지!
    if (currentUser) {
      console.log('🚫 로그인 사용자 - simpleRecurringSystem 동기화 차단!')
      return
    }

    simpleRecurringSystem.setTemplates(state.recurringTemplates)
  }, [state.recurringTemplates, currentUser])

  // 비로그인 상태에서 todos가 변경될 때마다 localStorage에 저장
  useEffect(() => {
    if (!currentUser && !authLoading) {
      console.log('📦 localStorage 저장 중 - todos 변경:', state.todos.length)
      saveToLocalStorage()
    }
  }, [state.todos, currentUser, authLoading])

  // 비로그인 상태에서 반복 템플릿이 변경될 때마다 localStorage에 저장
  useEffect(() => {
    if (!currentUser && !authLoading) {
      console.log('📦 localStorage 저장 중 - 템플릿 변경:', state.recurringTemplates.length)
      saveToLocalStorage()
    }
  }, [state.recurringTemplates, currentUser, authLoading])

  // Firestore와 동기화
  const syncWithFirestore = async () => {
    if (!currentUser) return

    dispatch({ type: 'SET_SYNCING', payload: true })
    try {
      const todos = await firestoreService.getTodos(currentUser.uid)
      dispatch({ type: 'SET_TODOS', payload: todos })
      dispatch({ type: 'SET_ERROR', payload: null })

      // 데이터 로드 후 order 값이 없는 할일들 초기화
      setTimeout(() => {
        initializeOrderValues()
      }, 500)

      // 디버그용: window 객체에 함수 노출
      if (typeof window !== 'undefined') {
        (window as any).initializeOrderValues = initializeOrderValues;

        // 강제 Firebase 동기화 함수 추가
        (window as any).forceFirebaseSync = async () => {
          if (!currentUser) {
            console.log('❌ 로그인이 필요합니다')
            return
          }

          try {
            console.log('🔧 수동 Firebase 강제 동기화 시작...')
            const freshInstances = await firestoreService.getRecurringInstances(currentUser.uid)

            const monthlyReport = freshInstances.find(i => i.id === 'vCyWLYn3LuDq1nVUPSyE_2025-08-26')
            if (monthlyReport) {
              console.log('🔧 수동 동기화 - Firebase 월간업무보고 상태:', monthlyReport.completed)
            }

            dispatch({ type: 'SET_RECURRING_INSTANCES', payload: freshInstances })
            console.log('✅ 수동 Firebase 동기화 완료!')

            // 결과 확인
            setTimeout(() => {
              const afterSync = freshInstances.find(i => i.id === 'vCyWLYn3LuDq1nVUPSyE_2025-08-26')
              if (afterSync) {
                console.log('🔍 수동 동기화 후 확인:', afterSync.completed)
              }
            }, 1000)

          } catch (error) {
            console.error('❌ 수동 Firebase 동기화 실패:', error)
          }
        }

        console.log('🔧 디버그 함수 등록됨: window.forceFirebaseSync()')
      }
    } catch (error) {
      console.error('Firestore 동기화 실패:', error)
      dispatch({ type: 'SET_ERROR', payload: '동기화 중 오류가 발생했습니다.' })
    } finally {
      dispatch({ type: 'SET_SYNCING', payload: false })
    }
  }

  // localStorage 사용 중단 - Firestore 전용

  // 할일 추가
  const addTodo = async (todoData: Omit<Todo, 'id' | 'createdAt' | 'updatedAt'>) => {
    console.log('addTodo 호출됨:', todoData, '사용자:', currentUser?.uid)

    // 새로 추가되는 할일이 같은 우선순위 그룹의 맨 위에 오도록 order 계산
    const getNewTodoOrder = (priority: string): number => {
      const samePriorityTodos = state.todos.filter(todo =>
        todo.priority === priority && !todo.completed
      )

      if (samePriorityTodos.length === 0) {
        // 해당 우선순위의 첫 번째 할일인 경우
        const priorityOrder = { urgent: 0, high: 1000, medium: 2000, low: 3000 }
        return priorityOrder[priority as keyof typeof priorityOrder] || 2000
      }

      // 같은 우선순위 할일들의 최소 order 값을 찾아서 그보다 작게 설정
      const minOrder = Math.min(...samePriorityTodos.map(todo => todo.order || 999))
      return Math.max(0, minOrder - 1)
    }

    const newTodo: Todo = {
      ...todoData,
      id: generateId(),
      createdAt: new Date(),
      updatedAt: new Date(),
      order: getNewTodoOrder(todoData.priority)
    }

    try {
      if (currentUser) {
        console.log('Firestore에 할일 추가 중:', newTodo.title)

        // Firestore에 저장 (ID는 Firestore가 생성)
        try {
          const firestoreId = await firestoreService.addTodo(newTodo, currentUser.uid)
          console.log('Firestore 할일 추가 성공, ID:', firestoreId)

          // Firestore ID로 로컬 상태 업데이트
          const firestoreTodo = { ...newTodo, id: firestoreId }
          dispatch({ type: 'ADD_TODO', payload: firestoreTodo })
          console.log('✅ 로컬 상태 업데이트 완료 - Firestore ID 사용:', firestoreId)
        } catch (firestoreError) {
          console.error('Firestore 저장 실패:', firestoreError)
          throw firestoreError
        }
      } else {
        // 비로그인 사용자: 메모리에 저장 후 localStorage에 즉시 저장
        console.log('비로그인 모드: 메모리에 할일 추가')
        dispatch({ type: 'ADD_TODO', payload: newTodo })

        // 비로그인 사용자만 localStorage 사용
        console.log('🚫 로그인된 사용자 - localStorage 저장 완전 비활성화')
      }
    } catch (error) {
      console.error('할일 추가 실패:', error)
      dispatch({ type: 'SET_ERROR', payload: '할일 추가 중 오류가 발생했습니다.' })
    }
  }

  // 할일 업데이트
  const updateTodo = async (id: string, updates: Partial<Todo>) => {
    try {
      if (currentUser) {
        await firestoreService.updateTodo(id, updates, currentUser.uid)
      } else {
        // 비로그인 사용자: 메모리에서 업데이트 후 localStorage에 자동 저장
        console.log('비로그인 모드: 메모리에서 할일 업데이트')
        dispatch({ type: 'UPDATE_TODO', payload: { id, updates } })
        // localStorage 저장은 useEffect에서 자동으로 처리됨
      }
    } catch (error) {
      console.error('할일 업데이트 실패:', error)
      dispatch({ type: 'SET_ERROR', payload: '할일 업데이트 중 오류가 발생했습니다.' })
    }
  }

  // 할일 삭제 (반복 할일 처리 개선)
  const deleteTodo = async (id: string) => {
    try {
      const allTodos = [...state.todos, ...getRecurringTodos()];
      const todoInState = allTodos.find(t => t.id === id);

      const isRecurringTodo = id.startsWith('recurring_') || (todoInState as any)?._isRecurringInstance;

      if (isRecurringTodo) {
        console.log('🔄 반복 할일 "건너뛰기" 처리:', id);

        let instanceId = (todoInState as any)?._instanceId;
        if (!instanceId && id.startsWith('recurring_')) {
          instanceId = id.replace('recurring_', '');
        }

        if (!instanceId) {
          console.error('❌ 인스턴스 ID를 찾을 수 없어 삭제 처리 불가:', id);
          return;
        }

        const updates = {
          skipped: true,
          skippedReason: 'manual_deletion'
        };

        // Optimistic UI update
        const updatedInstances = state.recurringInstances.map(i =>
          i.id === instanceId ? { ...i, ...updates } : i
        );
        dispatch({ type: 'SET_RECURRING_INSTANCES', payload: updatedInstances });

        // Persist change to Firestore
        if (currentUser) {
          try {
            await firestoreService.updateRecurringInstance(instanceId, updates, currentUser.uid);
            console.log('✅ Firestore 반복 인스턴스 "skipped"로 업데이트 완료:', instanceId);
          } catch (error) {
            console.error('❌ Firestore 반복 인스턴스 업데이트 실패:', error);
            dispatch({ type: 'SET_RECURRING_INSTANCES', payload: state.recurringInstances });
            dispatch({ type: 'SET_ERROR', payload: '반복 할일 삭제에 실패했습니다.' });
          }
        }
        return;
      }

      // 일반 할일 삭제 처리
      if (currentUser) {
        await firestoreService.deleteTodo(id, currentUser.uid);
      } else {
        dispatch({ type: 'DELETE_TODO', payload: id });
      }
      console.log('✅ 일반 할일 삭제 완료:', id);

    } catch (error) {
      console.error('할일 삭제 실패:', error);
      dispatch({ type: 'SET_ERROR', payload: '할일 삭제 중 오류가 발생했습니다.' });
    }
  }

  // 할일 토글
  const toggleTodo = async (id: string) => {
    console.log('📝 할일 토글 시작:', id)

    // 🔥 월간업무보고 토글 특별 추적
    if (id.includes('월간업무보고') || id.includes('vCyWLYn3LuDq1nVUPSyE')) {
      console.log('🔥🔥🔥 월간업무보고 토글 시작!')
      console.log('  토글 대상 ID:', id)
    }

    // 반복 인스턴스인지 확인 (_isRecurringInstance 메타데이터 사용)
    const allTodos = [...state.todos, ...getRecurringTodos()]
    const targetTodo = allTodos.find(t => t.id === id)

    // 기간 할일 특별 처리: 시작일과 마감일이 모두 있는 일반 할일
    const periodTodo = state.todos.find(t => t.id === id)
    if (periodTodo && periodTodo.startDate && periodTodo.dueDate && !(periodTodo as any)._isRecurringInstance) {
      console.log('📅 기간 할일 토글:', id, '시작일:', periodTodo.startDate, '마감일:', periodTodo.dueDate)

      const updates: Partial<Todo> & { completedAt?: Date | ReturnType<typeof deleteField> } = {
        completed: !periodTodo.completed,
        ...(
          !periodTodo.completed
            ? { completedAt: new Date() }
            : { completedAt: deleteField() as unknown as Date }
        )
      }

      try {
        // 먼저 로컬 상태를 즉시 업데이트
        dispatch({ type: 'TOGGLE_TODO', payload: id })

        // Firestore 업데이트
        if (currentUser) {
          await firestoreService.updateTodo(id, updates, currentUser.uid)
          console.log('✅ 기간 할일 Firestore 업데이트 성공:', id)
        } else {
          console.log('✅ 비로그인 모드: 기간 할일 메모리에서 토글')
        }

        console.log(`✅ 기간 할일 토글 완료: ${id}`)
        return
      } catch (error: unknown) {
        console.error('❌ 기간 할일 토글 실패:', error)
        // 에러 발생시 이전 상태로 되돌림
        dispatch({ type: 'TOGGLE_TODO', payload: id })
        dispatch({ type: 'SET_ERROR', payload: '할일 상태 변경 중 오류가 발생했습니다.' })
        return
      }
    }

    if (targetTodo && (targetTodo as any)._isRecurringInstance) {
      console.log('🔄 반복 할일 토글:', id)

      // 인스턴스 ID 추출: recurring_ 접두사 제거
      let instanceId = (targetTodo as any)._instanceId

      // 메타데이터에서 인스턴스 ID를 가져올 수 없는 경우 ID에서 직접 추출
      if (!instanceId && id.startsWith('recurring_')) {
        instanceId = id.replace('recurring_', '')
        console.log('📍 ID에서 인스턴스 ID 추출:', instanceId)
      } else {
        console.log('📍 메타데이터에서 인스턴스 ID:', instanceId)
      }

      const instance = state.recurringInstances.find(i => i.id === instanceId)

      if (instance) {
        console.log('✅ 기존 인스턴스 발견:', instance)
        const updatedInstance = {
          ...instance,
          completed: !instance.completed,
          completedAt: !instance.completed ? new Date() : undefined,
          updatedAt: new Date()
        }

        // Firebase에 저장 후 실시간 구독으로 상태 업데이트 (동기화 문제 해결)
        if (currentUser) {
          try {
            console.log(`🔄 Firebase에 기존 반복 인스턴스 업데이트 중: ${instanceId}`)
            console.log(`📋 업데이트 데이터:`, {
              completed: updatedInstance.completed,
              completedAt: updatedInstance.completedAt
            })

            const updateData: any = {
              completed: updatedInstance.completed
            }

            // completedAt 처리: undefined면 null, 아니면 Date 객체 저장
            if (updatedInstance.completedAt === undefined) {
              console.log('🗑️ completedAt이 undefined -> null 사용')
              updateData.completedAt = null
            } else {
              console.log('📅 completedAt 설정:', updatedInstance.completedAt)
              updateData.completedAt = updatedInstance.completedAt
            }

            console.log('📋 최종 업데이트 데이터:', updateData)

            // 🔧 즉시 UI 반응을 위한 임시 로컬 업데이트 (Firebase 구독이 곧 덮어씀)
            console.log('⚡ 즉시 UI 반응을 위한 임시 로컬 업데이트')
            const updatedInstances = state.recurringInstances.map(i => i.id === instanceId ? updatedInstance : i)
            dispatch({
              type: 'SET_RECURRING_INSTANCES',
              payload: updatedInstances
            })
            console.log('✅ 임시 로컬 상태 업데이트 완료 (Firebase 구독이 최종 확인)')

            // Firebase 업데이트 실행
            console.log(`🔄 Firestore 업데이트 실행 - instanceId: ${instanceId}`)
            console.log(`📋 전송할 데이터:`, updateData)
            console.log(`⏰ 업데이트 시작 시각: ${new Date().toISOString()}`)

            await firestoreService.updateRecurringInstance(instanceId, updateData, currentUser.uid)

            console.log('✅ 반복 할일 상태 Firebase에 저장 완료')
            console.log(`⏰ 업데이트 완료 시각: ${new Date().toISOString()}`)

            // 월간업무보고 완료 상태 간단 확인
            if (targetTodo?.title.includes('월간업무보고')) {
              console.log('✅ 월간업무보고 완료 변경:', updatedInstance.completed)
            }

            // 주간업무보고 특별 로깅
            if (instanceId.includes('weekly_work_report')) {
              console.log(`🔍 주간업무보고 Firestore 업데이트: completed=${updateData.completed}`)
            }

            // ✨ Firestore 동기화 대기 제거 - 실시간 구독으로만 동기화 (completion state 충돌 방지)
            console.log('✅ Firestore 업데이트 완료 - 실시간 구독 의존')

          } catch (error) {
            console.error('❌ Firebase 저장 실패:', error)
            // Firebase 저장 실패 시 로컬 상태를 원래대로 되돌리기
            dispatch({
              type: 'SET_RECURRING_INSTANCES',
              payload: state.recurringInstances
            })
            dispatch({ type: 'SET_ERROR', payload: '반복 할일 상태 변경 중 오류가 발생했습니다.' })
          }
        } else {
          // 비로그인 사용자: 메모리 상태만 업데이트 (localStorage 사용 안함)
          const updatedInstances = state.recurringInstances.map(i => i.id === instanceId ? updatedInstance : i)
          dispatch({
            type: 'SET_RECURRING_INSTANCES',
            payload: updatedInstances
          })
          console.log('🚫 비로그인 사용자 - localStorage 사용 비활성화, 메모리만 업데이트')
        }

        console.log('✅ 기존 반복 할일 토글 완료')
        return
      } else {
        console.log('📝 로컬 인스턴스가 없음. 새 인스턴스 생성:', instanceId)

        // 인스턴스 ID에서 템플릿 ID와 날짜 추출
        const idParts = instanceId.split('_')
        if (idParts.length >= 2) {
          const templateId = idParts[0]
          const dateStr = idParts.slice(1).join('_') // 날짜 부분 재조합

          // 해당 템플릿 찾기
          const template = state.recurringTemplates.find(t => t.id === templateId)

          if (template) {
            console.log('✅ 템플릿 발견:', template)

            // 새 인스턴스 생성
            const newInstance = {
              id: instanceId,
              templateId: templateId,
              date: new Date(dateStr),
              completed: true, // 처음 토글이므로 완료로 설정
              completedAt: new Date(),
              createdAt: new Date(),
              updatedAt: new Date()
            }

            // Firebase에 저장 후 실시간 구독으로 상태 업데이트
            if (currentUser) {
              try {
                console.log(`🔄 Firebase에 새 반복 인스턴스 생성 중: ${instanceId}`)
                console.log(`📋 새 인스턴스 데이터:`, newInstance)

                // 먼저 낙관적 업데이트 (즉각적인 UI 반응성)
                const updatedInstances = [...state.recurringInstances, newInstance]
                dispatch({
                  type: 'SET_RECURRING_INSTANCES',
                  payload: updatedInstances
                })
                console.log('✅ 새 인스턴스 낙관적 로컬 상태 업데이트 완료')

                // Firebase에 저장
                await firestoreService.updateRecurringInstance(instanceId, {
                  templateId: newInstance.templateId,
                  date: newInstance.date,
                  completed: newInstance.completed,
                  completedAt: newInstance.completedAt
                  // createdAt, updatedAt은 Firestore 서비스에서 serverTimestamp()로 자동 설정
                }, currentUser.uid)
                console.log('✅ 새 반복 할일 인스턴스 Firebase에 생성 완료')

                // ✨ 수동 새로고침 비활성화 - 실시간 구독으로만 동기화 (completion state 충돌 방지)
                console.log('🔄 새 인스턴스 수동 새로고침 비활성화 - 실시간 구독 의존')

              } catch (error) {
                console.error('❌ 새 인스턴스 Firebase 생성 실패:', error)
                // Firebase 저장 실패 시 로컬 상태를 원래대로 되돌리기
                dispatch({
                  type: 'SET_RECURRING_INSTANCES',
                  payload: state.recurringInstances
                })
                dispatch({ type: 'SET_ERROR', payload: '새 반복 할일 인스턴스 생성 중 오류가 발생했습니다.' })
              }
            } else {
              // 비로그인 사용자: 메모리 상태만 업데이트 (localStorage 사용 안함)
              const updatedInstances = [...state.recurringInstances, newInstance]
              dispatch({
                type: 'SET_RECURRING_INSTANCES',
                payload: updatedInstances
              })
              console.log('🚫 비로그인 사용자 - localStorage 사용 비활성화, 메모리만 업데이트')
            }

            console.log('✅ 새 반복 할일 토글 완료')
            return
          } else {
            console.error('❌ 템플릿을 찾을 수 없음:', templateId)
          }
        } else {
          console.error('❌ 인스턴스 ID 형식이 잘못됨:', instanceId)
        }

        console.error('❌ 반복 인스턴스를 찾을 수 없음:', instanceId)
        console.log('📋 현재 인스턴스 목록:', state.recurringInstances.map(i => i.id))
        console.log('📋 현재 템플릿 목록:', state.recurringTemplates.map(t => t.id))
        return
      }
    }

    // 일반 할일 처리
    const basicTodo = state.todos.find(t => t.id === id)
    if (!basicTodo) {
      console.error('Todo not found:', id)
      return
    }

    const updates: Partial<Todo> & { completedAt?: Date | ReturnType<typeof deleteField> } = {
      completed: !basicTodo.completed,
      ...(
        !basicTodo.completed
          ? { completedAt: new Date() }
          : { completedAt: deleteField() as unknown as Date }
      )
    }

    try {
      // 먼저 로컬 상태를 즉시 업데이트
      dispatch({ type: 'TOGGLE_TODO', payload: id })

      // 반복 할일인지 확인 (recurring_ 또는 _isRecurringInstance 체크)
      const allTodosForCheck = [...state.todos, ...getRecurringTodos()]
      const todoForCheck = allTodosForCheck.find(t => t.id === id)
      const isRecurringTodo = id.startsWith('recurring_') || (todoForCheck as any)?._isRecurringInstance

      // Firestore 전용 처리 (localStorage 사용 중단)
      if (currentUser && !isRecurringTodo) {
        await firestoreService.updateTodo(id, updates, currentUser.uid)
        console.log('Firestore 업데이트 성공:', id)
      } else if (isRecurringTodo) {
        // 반복 할일은 로컬 상태에서만 관리
        console.log('반복 할일 상태 업데이트:', id)

        // 반복 할일의 order 값 업데이트도 지원
        if (updates.order !== undefined) {
          console.log('반복 할일 order 업데이트:', id, '새 order:', updates.order)

          // 반복 인스턴스 업데이트
          dispatch({
            type: 'UPDATE_RECURRING_INSTANCE',
            payload: {
              id: id,
              updates: { order: updates.order } // order를 인스턴스에 추가
            }
          })
        }
      } else {
        // 비로그인 사용자: 메모리에서만 관리
        console.log('비로그인 모드: 메모리에서 할일 토글')
      }

      console.log(`할일 토글 성공: ${id} (반복할일: ${isRecurringTodo})`)
    } catch (error: unknown) {
      console.error('할일 토글 실패:', error)
      // 에러 발생시 이전 상태로 되돌림
      dispatch({ type: 'TOGGLE_TODO', payload: id })
      dispatch({ type: 'SET_ERROR', payload: '할일 상태 변경 중 오류가 발생했습니다.' })
    }
  }

  // 서브태스크 추가
  const addSubTask = async (todoId: string, title: string) => {
    const newSubTask: SubTask = {
      id: generateId(),
      title,
      completed: false,
      priority: 'medium',
      createdAt: new Date(),
      updatedAt: new Date()
    }

    try {
      if (currentUser) {
        await firestoreService.addSubTask(newSubTask, currentUser.uid, todoId)
      } else {
        dispatch({ type: 'ADD_SUBTASK', payload: { todoId, subTask: newSubTask } })
        // Firestore 전용 모드 - localStorage 사용 안함
      }
    } catch (error) {
      console.error('서브태스크 추가 실패:', error)
      dispatch({ type: 'SET_ERROR', payload: '하위 작업 추가 중 오류가 발생했습니다.' })
    }
  }

  // 서브태스크 업데이트
  const updateSubTask = async (todoId: string, subTaskId: string, updates: Partial<SubTask>) => {
    try {
      if (currentUser) {
        await firestoreService.updateSubTask(subTaskId, updates, currentUser.uid, todoId)
      } else {
        dispatch({ type: 'UPDATE_SUBTASK', payload: { todoId, subTaskId, updates } })
        // Firestore 전용 모드 - localStorage 사용 안함
      }
    } catch (error) {
      console.error('서브태스크 업데이트 실패:', error)
      dispatch({ type: 'SET_ERROR', payload: '하위 작업 업데이트 중 오류가 발생했습니다.' })
    }
  }

  // 서브태스크 삭제
  const deleteSubTask = async (todoId: string, subTaskId: string) => {
    try {
      if (currentUser) {
        await firestoreService.deleteSubTask(subTaskId, currentUser.uid, todoId)
      } else {
        dispatch({ type: 'DELETE_SUBTASK', payload: { todoId, subTaskId } })
        // Firestore 전용 모드 - localStorage 사용 안함
      }
    } catch (error) {
      console.error('서브태스크 삭제 실패:', error)
      dispatch({ type: 'SET_ERROR', payload: '하위 작업 삭제 중 오류가 발생했습니다.' })
    }
  }

  // 서브태스크 토글
  const toggleSubTask = async (todoId: string, subTaskId: string) => {
    console.log('🔄 서브태스크 토글 시작:', { todoId, subTaskId })

    const todo = state.todos.find(t => t.id === todoId)
    const subTask = todo?.subTasks?.find(st => st.id === subTaskId)
    if (!subTask) {
      console.error('❌ 서브태스크를 찾을 수 없음:', { todoId, subTaskId })
      return
    }

    const isCompleting = !subTask.completed
    console.log('📊 서브태스크 상태:', {
      현재완료상태: subTask.completed,
      변경후상태: isCompleting,
      기존완료시간: subTask.completedAt
    })

    // deleteField() 대신 null 사용으로 Firestore 배열 내부 오류 해결
    const updates = {
      completed: isCompleting,
      completedAt: isCompleting ? new Date() : null as any
    }

    console.log('📝 업데이트 데이터:', updates)

    await updateSubTask(todoId, subTaskId, updates)
  }

  // 순차적 반복 할일 필터링 (미완료된 가장 오래된 인스턴스만 표시)
  const filterSequentialRecurring = (todos: Todo[]): Todo[] => {
    const templateGroups = new Map<string, Todo[]>();
    const nonRecurring: Todo[] = [];

    todos.forEach(todo => {
      const isRecurring = (todo as any)._isRecurringInstance || todo.id.startsWith('recurring_');
      const templateId = (todo as any)._templateId;

      if (isRecurring && templateId) {
        if (!templateGroups.has(templateId)) {
          templateGroups.set(templateId, []);
        }
        templateGroups.get(templateId)!.push(todo);
      } else {
        nonRecurring.push(todo);
      }
    });

    const filteredRecurring: Todo[] = [];
    templateGroups.forEach((groupTodos) => {
      // 1. 완료된 할일은 모두 표시 (히스토리)
      const completed = groupTodos.filter(t => t.completed);
      filteredRecurring.push(...completed);

      // 2. 미완료 할일은 날짜순 정렬 후 가장 오래된 것 1개만 표시
      const incomplete = groupTodos.filter(t => !t.completed);
      if (incomplete.length > 0) {
        incomplete.sort((a, b) => {
          const dateA = a.startDate ? new Date(a.startDate).getTime() : 0;
          const dateB = b.startDate ? new Date(b.startDate).getTime() : 0;
          return dateA - dateB;
        });
        filteredRecurring.push(incomplete[0]);

        if (incomplete.length > 1) {
          console.log(`🔒 순차적 필터링: ${incomplete[0].title} (표시), ${incomplete.length - 1}개 숨김`);
        }
      }
    });

    return [...nonRecurring, ...filteredRecurring];
  }

  // 날짜별 할일 필터링 함수들 (중복 방지 강화)
  const getTodayTodos = (targetDate?: Date) => {
    const today = targetDate ? new Date(targetDate) : new Date()
    today.setHours(0, 0, 0, 0) // 시간 부분을 00:00:00으로 설정

    console.log('🗓️ getTodayTodos 호출됨, 대상 날짜:', today.toDateString())

    const regularTodos = state.todos.filter(todo => {
      console.log(`🔍 할일 체크: "${todo.title}"`)
      console.log(`  startDate: ${todo.startDate ? new Date(todo.startDate).toDateString() : 'null'}`)
      console.log(`  dueDate: ${todo.dueDate ? new Date(todo.dueDate).toDateString() : 'null'}`)
      console.log(`  completed: ${todo.completed}`)

      // 완료된 할일의 경우: 메인 할일이 오늘 완료되었거나, 서브태스크 중 오늘 완료된 것이 있으면 표시
      if (todo.completed) {
        // 메인 할일이 오늘 완료된 경우
        if (todo.completedAt) {
          const completedDate = new Date(todo.completedAt)
          completedDate.setHours(0, 0, 0, 0)
          if (completedDate.getTime() === today.getTime()) {
            return true
          }
        }

        // 서브태스크 중 오늘 완료된 것이 있는지 확인
        if (todo.subTasks && todo.subTasks.length > 0) {
          const hasSubTaskCompletedToday = todo.subTasks.some(subTask => {
            if (subTask.completed && subTask.completedAt && subTask.completedAt !== null) {
              try {
                const subTaskCompletedDate = new Date(subTask.completedAt)
                subTaskCompletedDate.setHours(0, 0, 0, 0)
                return subTaskCompletedDate.getTime() === today.getTime()
              } catch {
                return false
              }
            }
            return false
          })
          if (hasSubTaskCompletedToday) {
            console.log(`📋 "${todo.title}" - 오늘 완료된 서브태스크 있음`)
            return true
          }
        }

        return false // 메인할일도 서브태스크도 오늘 완료되지 않은 경우
      }

      // 미완료 할일의 경우 - 기간 기반 로직
      const startDate = todo.startDate ? new Date(todo.startDate) : null
      const dueDate = todo.dueDate ? new Date(todo.dueDate) : null

      if (startDate) startDate.setHours(0, 0, 0, 0)
      if (dueDate) dueDate.setHours(0, 0, 0, 0)

      console.log(`  처리된 startDate: ${startDate ? startDate.toDateString() : 'null'}`)
      console.log(`  처리된 dueDate: ${dueDate ? dueDate.toDateString() : 'null'}`)

      // 1. 시작일과 마감일이 모두 있는 경우: 기간 내에 포함되는지 확인
      if (startDate && dueDate) {
        const isInPeriod = today.getTime() >= startDate.getTime() && today.getTime() <= dueDate.getTime()
        console.log(`📅 기간 할일 체크: "${todo.title}"`)
        console.log(`  시작일: ${startDate.toDateString()}, 마감일: ${dueDate.toDateString()}`)
        console.log(`  오늘: ${today.toDateString()}, 기간 내 포함: ${isInPeriod}`)
        // 미완료 할일: 시작일~마감일 기간 내 모든 날짜에 표시
        return isInPeriod
      }

      // 2. 시작일만 있는 경우: 시작일 이후 모든 날짜에 표시
      if (startDate && !dueDate) {
        return today.getTime() >= startDate.getTime()
      }

      // 3. 마감일만 있는 경우: 마감일까지 지속적으로 표시
      if (!startDate && dueDate) {
        // 마감일이 오늘이거나 이후인 경우: 지속적으로 표시
        if (dueDate.getTime() >= today.getTime()) {
          console.log(`📅 마감일 할일 체크: "${todo.title}" - 마감일까지 표시`)
          console.log(`  마감일: ${dueDate.toDateString()}, 오늘: ${today.toDateString()}`)
          return true
        }

        // 마감일이 지난 경우: 어제 못한 일로만 처리 (오늘 할일에는 표시 안함)
        console.log(`📅 마감일 지난 할일: "${todo.title}" - 어제 할일로만 표시`)
        return false
      }

      // 3. 마감일도 시작일도 없는 미완료 할일 (일반적인 할일)
      if (!todo.dueDate && !todo.startDate) {
        return true
      }

      return false
    })

    // 반복 할일 추가
    const todayRecurringList = getRecurringTodos()
    const filteredTodayRecurring = todayRecurringList.filter(todo => {
      if (todo.startDate) {
        const startDate = new Date(todo.startDate)
        startDate.setHours(0, 0, 0, 0)

        // 1. 오늘 시작하는 할일
        if (startDate.getTime() === today.getTime()) {
          return true
        }

        // 2. 과거에 시작했지만 아직 완료하지 않은 할일 (이월)
        if (startDate.getTime() < today.getTime() && !todo.completed) {
          console.log(`➡️ 이월된 반복 할일: "${todo.title}" (${startDate.toLocaleDateString()})`)
          return true
        }
      }
      return false
    })

    // 중복 제거
    const seenIds = new Set<string>()
    const allTodos = [...regularTodos, ...filteredTodayRecurring]
    const uniqueTodos = allTodos.filter(todo => {
      if (seenIds.has(todo.id)) {
        console.warn(`⚠️ 중복 키 발견 및 제거: ${todo.id}`)
        return false
      }
      seenIds.add(todo.id)
      return true
    })

    return filterSequentialRecurring(uniqueTodos)
  }

  const getWeekTodos = () => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    console.log('📅 getWeekTodos 호출됨')

    // 월간업무보고 디버깅 (간단)
    const allRecurring = getRecurringTodos()
    const monthlyReports = allRecurring.filter(t => t.title.includes('월간업무보고'))
    if (monthlyReports.length > 0) {
      console.log('📅 getWeekTodos - 월간업무보고:', monthlyReports[0]?.priority || 'none')
    }

    // 이번 주의 시작일 (일요일)
    const startOfWeek = new Date(today)
    startOfWeek.setDate(today.getDate() - today.getDay())
    startOfWeek.setHours(0, 0, 0, 0)

    // 이번 주의 마지막일 (토요일)
    const endOfWeek = new Date(startOfWeek)
    endOfWeek.setDate(startOfWeek.getDate() + 6)
    endOfWeek.setHours(0, 0, 0, 0) // 시간을 00:00:00으로 통일

    const regularTodos = state.todos.filter(todo => {

      // 완료된 할일의 경우: 이번 주에 완료된 것만 표시
      if (todo.completed && todo.completedAt) {
        const completedDate = new Date(todo.completedAt)
        completedDate.setHours(0, 0, 0, 0)
        return completedDate >= startOfWeek && completedDate <= endOfWeek
      }

      // 미완료 할일의 경우 - 기간 기반 로직
      if (!todo.completed) {
        const startDate = todo.startDate ? new Date(todo.startDate) : null
        const dueDate = todo.dueDate ? new Date(todo.dueDate) : null

        if (startDate) startDate.setHours(0, 0, 0, 0)
        if (dueDate) dueDate.setHours(0, 0, 0, 0)

        // 1. 시작일과 마감일이 모두 있는 경우: 기간이 이번 주와 겹치는지 확인
        if (startDate && dueDate) {
          // 미완료 할일: 할일 기간과 주간 범위가 겹치면 표시
          // 겹침 조건: 할일 마감일 >= 주간 시작일 AND 할일 시작일 <= 주간 마지막일
          const overlapsWeek = dueDate.getTime() >= startOfWeek.getTime() && startDate.getTime() <= endOfWeek.getTime()
          return overlapsWeek
        }

        // 2. 시작일만 있는 경우: 시작일이 이번 주 이전이거나 이번 주에 시작
        if (startDate && !dueDate) {
          return startDate <= endOfWeek
        }

        // 3. 마감일만 있는 경우: 마감일이 오늘 이후이면 표시 (getTodayTodos와 동일한 로직)
        if (!startDate && dueDate) {
          // 마감일이 오늘 이후이면 표시 (마감일까지 지속적으로)
          return dueDate >= today
        }

        // 4. 날짜가 없는 일반 할일 - 오늘 할일과 동일하게 표시
        if (!startDate && !dueDate) {
          return true
        }
      }

      return false
    })

    // 반복 할일 추가 - 기간 기반 로직 적용
    const weeklyRecurringTodos = getRecurringTodos()
    const weekRecurringTodos = weeklyRecurringTodos.filter(todo => {
      // 월간업무보고 특별 디버깅
      if (todo.title.includes('월간업무보고')) {
        console.log(`🔍 주간뷰 - 월간업무보고 필터링: completed=${todo.completed}, completedAt=${todo.completedAt}`)
      }

      // ✅ 완료된 반복 할일: 이번 주에 완료된 것만 표시
      if (todo.completed) {
        if (todo.completedAt) {
          const completedDate = new Date(todo.completedAt)
          completedDate.setHours(0, 0, 0, 0)
          const isInThisWeek = completedDate >= startOfWeek && completedDate <= endOfWeek

          if (todo.title.includes('월간업무보고')) {
            console.log(`   ✅ 완료된 월간업무보고: 완료일=${completedDate.toDateString()}, 이번주포함=${isInThisWeek}`)
          }

          return isInThisWeek
        }

        if (todo.title.includes('월간업무보고')) {
          console.log(`   ❌ 완료된 월간업무보고: 완료일 없음 - 표시 안함`)
        }

        return false // 완료되었지만 완료일이 없으면 표시 안함
      }

      // 🔥 미완료 반복 할일만 처리 - 기간 기반 로직
      // (완료된 할일은 위에서 이미 처리하여 여기 도달하지 않음)
      const startDate = todo.startDate ? new Date(todo.startDate) : null
      const dueDate = todo.dueDate ? new Date(todo.dueDate) : null

      if (startDate) startDate.setHours(0, 0, 0, 0)
      if (dueDate) dueDate.setHours(0, 0, 0, 0)

      // 1. 시작일과 마감일이 모두 있는 경우: 기간이 이번 주와 겹치는지 확인
      if (startDate && dueDate) {
        // 반복 할일: 할일 기간과 주간 범위가 겹치면 표시
        const overlapsWeek = dueDate.getTime() >= startOfWeek.getTime() && startDate.getTime() <= endOfWeek.getTime()
        console.log(`🔄 주간 반복 기간 할일 체크: "${todo.title}"`)
        console.log(`  할일 기간: ${startDate.toDateString()} ~ ${dueDate.toDateString()}`)
        console.log(`  주간 범위: ${startOfWeek.toDateString()} ~ ${endOfWeek.toDateString()}`)
        console.log(`  겹침 여부: ${overlapsWeek}`)
        return overlapsWeek
      }

      // 2. 시작일만 있는 경우: 시작일이 이번 주 이전이거나 이번 주에 시작
      if (startDate && !dueDate) {
        return startDate <= endOfWeek
      }

      // 3. 마감일만 있는 경우: 마감일이 이번 주 시작일 이후면 지속적으로 표시
      if (!startDate && dueDate) {
        // 마감일이 이번 주 시작일 이후면 표시 (마감일까지 지속적으로)
        return dueDate >= startOfWeek
      }

      // 4. 날짜가 없는 반복 할일
      if (!startDate && !dueDate) {
        return true
      }

      return false
    })

    const allWeekTodos = [...regularTodos, ...weekRecurringTodos]

    // 🔥 오늘 할일과 동일한 정렬 적용
    console.log('📊 getWeekTodos 정렬 전 월간업무보고 개수:', allWeekTodos.filter(t => t.title.includes('월간업무보고')).length)

    // 우선순위별 정렬 (urgent → high → medium → low)
    const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 }
    const sortedWeekTodos = allWeekTodos.sort((a, b) => {
      const priorityDiff = priorityOrder[a.priority as keyof typeof priorityOrder] - priorityOrder[b.priority as keyof typeof priorityOrder]
      if (priorityDiff !== 0) {
        return priorityDiff
      }
      // 같은 우선순위면 order → 날짜순 정렬
      const orderA = a.order || 0
      const orderB = b.order || 0
      if (orderA !== orderB) {
        return orderA - orderB
      }
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    })

    console.log('📊 getWeekTodos 정렬 후 월간업무보고:', sortedWeekTodos.filter(t => t.title.includes('월간업무보고')).map(t => `${t.title}: ${t.priority}`))

    return filterSequentialRecurring(sortedWeekTodos)
  }

  const getMonthTodos = () => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    console.log('📆 getMonthTodos 호출됨')

    // 이번 달의 시작일 (1일)
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
    startOfMonth.setHours(0, 0, 0, 0)

    // 이번 달의 마지막일 (말일)
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0)
    endOfMonth.setHours(0, 0, 0, 0) // 시간을 00:00:00으로 통일

    const regularTodos = state.todos.filter(todo => {

      // 완료된 할일의 경우: 이번 달에 완료된 것만 표시
      if (todo.completed && todo.completedAt) {
        const completedDate = new Date(todo.completedAt)
        completedDate.setHours(0, 0, 0, 0)
        return completedDate >= startOfMonth && completedDate <= endOfMonth
      }

      // 미완료 할일의 경우 - 기간 기반 로직
      if (!todo.completed) {
        const startDate = todo.startDate ? new Date(todo.startDate) : null
        const dueDate = todo.dueDate ? new Date(todo.dueDate) : null

        if (startDate) startDate.setHours(0, 0, 0, 0)
        if (dueDate) dueDate.setHours(0, 0, 0, 0)

        // 1. 시작일과 마감일이 모두 있는 경우: 기간이 이번 달과 겹치는지 확인
        if (startDate && dueDate) {
          // 미완료 할일: 할일 기간과 월간 범위가 겹치면 표시
          // 겹침 조건: 할일 마감일 >= 월간 시작일 AND 할일 시작일 <= 월간 마지막일
          const overlapsMonth = dueDate.getTime() >= startOfMonth.getTime() && startDate.getTime() <= endOfMonth.getTime()
          return overlapsMonth
        }

        // 2. 시작일만 있는 경우: 시작일이 이번 달 이전이거나 이번 달에 시작
        if (startDate && !dueDate) {
          return startDate <= endOfMonth
        }

        // 3. 마감일만 있는 경우: 마감일이 오늘 이후이면 표시 (getTodayTodos와 동일한 로직)
        if (!startDate && dueDate) {
          // 마감일이 오늘 이후이면 표시 (마감일까지 지속적으로)
          return dueDate >= today
        }

        // 4. 날짜가 없는 일반 할일 - 오늘 할일과 동일하게 표시
        if (!startDate && !dueDate) {
          return true
        }
      }

      return false
    })

    // 반복 할일 추가 - 기간 기반 로직 적용
    const monthlyRecurringTodos = getRecurringTodos()
    const monthRecurringTodos = monthlyRecurringTodos.filter(todo => {
      // ✅ 완료된 반복 할일: 이번 달에 완료된 것만 표시
      if (todo.completed) {
        if (todo.completedAt) {
          const completedDate = new Date(todo.completedAt)
          completedDate.setHours(0, 0, 0, 0)
          return completedDate >= startOfMonth && completedDate <= endOfMonth
        }
        return false // 완료되었지만 완료일이 없으면 표시 안함
      }

      // 🔥 미완료 반복 할일만 처리 - 기간 기반 로직
      // (완료된 할일은 위에서 이미 처리하여 여기 도달하지 않음)
      const startDate = todo.startDate ? new Date(todo.startDate) : null
      const dueDate = todo.dueDate ? new Date(todo.dueDate) : null

      if (startDate) startDate.setHours(0, 0, 0, 0)
      if (dueDate) dueDate.setHours(0, 0, 0, 0)

      // 1. 시작일과 마감일이 모두 있는 경우: 기간이 이번 달과 겹치는지 확인
      if (startDate && dueDate) {
        // 반복 할일: 할일 기간과 월간 범위가 겹치면 표시
        const overlapsMonth = dueDate.getTime() >= startOfMonth.getTime() && startDate.getTime() <= endOfMonth.getTime()
        console.log(`🔄 월간 반복 기간 할일 체크: "${todo.title}"`)
        console.log(`  할일 기간: ${startDate.toDateString()} ~ ${dueDate.toDateString()}`)
        console.log(`  월간 범위: ${startOfMonth.toDateString()} ~ ${endOfMonth.toDateString()}`)
        console.log(`  겹침 여부: ${overlapsMonth}`)
        return overlapsMonth
      }

      // 2. 시작일만 있는 경우: 시작일이 이번 달 이전이거나 이번 달에 시작
      if (startDate && !dueDate) {
        return startDate <= endOfMonth
      }

      // 3. 마감일만 있는 경우: 마감일이 이번 달 시작일 이후면 지속적으로 표시
      if (!startDate && dueDate) {
        // 마감일이 이번 달 시작일 이후면 표시 (마감일까지 지속적으로)
        return dueDate >= startOfMonth
      }

      // 4. 날짜가 없는 반복 할일
      if (!startDate && !dueDate) {
        return true
      }

      return false
    })

    const allMonthTodos = [...regularTodos, ...monthRecurringTodos]

    // 🔥 오늘 할일과 동일한 정렬 적용
    console.log('📊 getMonthTodos 정렬 전 월간업무보고 개수:', allMonthTodos.filter(t => t.title.includes('월간업무보고')).length)

    // 우선순위별 정렬 (urgent → high → medium → low)
    const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 }
    const sortedMonthTodos = allMonthTodos.sort((a, b) => {
      const priorityDiff = priorityOrder[a.priority as keyof typeof priorityOrder] - priorityOrder[b.priority as keyof typeof priorityOrder]
      if (priorityDiff !== 0) {
        return priorityDiff
      }
      // 같은 우선순위면 order → 날짜순 정렬
      const orderA = a.order || 0
      const orderB = b.order || 0
      if (orderA !== orderB) {
        return orderA - orderB
      }
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    })

    console.log('📊 getMonthTodos 정렬 후 월간업무보고:', sortedMonthTodos.filter(t => t.title.includes('월간업무보고')).map(t => `${t.title}: ${t.priority}`))

    return filterSequentialRecurring(sortedMonthTodos)
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

  const getTomorrowTodos = (targetDate?: Date) => {
    const baseDate = targetDate || new Date()
    const tomorrow = new Date(baseDate)
    tomorrow.setDate(tomorrow.getDate() + 1)

    return state.todos.filter(todo => {
      if (!todo.dueDate) return false
      const dueDate = new Date(todo.dueDate)
      return dueDate.toDateString() === tomorrow.toDateString()
    })
  }

  const getYesterdayIncompleteTodos = (targetDate?: Date) => {
    const baseDate = targetDate || new Date()
    const today = new Date(baseDate)
    today.setHours(0, 0, 0, 0)

    return state.todos.filter(todo => {
      if (todo.completed || !todo.dueDate) return false
      const dueDate = new Date(todo.dueDate)
      dueDate.setHours(0, 0, 0, 0)

      // 마감일이 오늘보다 이전인 미완료 할일들을 어제 할일로 처리
      return dueDate.getTime() < today.getTime()
    })
  }

  const isYesterdayIncompleteTodo = (todo: Todo) => {
    if (todo.completed || !todo.dueDate) return false
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const dueDate = new Date(todo.dueDate)
    dueDate.setHours(0, 0, 0, 0)

    // 마감일이 오늘보다 이전인 미완료 할일들을 어제 할일로 처리
    return dueDate.getTime() < today.getTime()
  }

  const updateTodoOrder = async (todoId: string, newOrder: number) => {
    // 반복 할일인지 확인
    const isRecurringTodo = todoId.startsWith('recurring_')

    if (isRecurringTodo) {
      // 반복 할일의 경우: instanceId 추출하고 UPDATE_RECURRING_INSTANCE 사용
      const instanceId = todoId.replace('recurring_', '')

      dispatch({
        type: 'UPDATE_RECURRING_INSTANCE',
        payload: {
          id: instanceId,
          updates: { order: newOrder }
        }
      })

      console.log('반복 할일 순서 업데이트 성공', { todoId, instanceId, newOrder })
    } else {
      // 일반 할일의 경우: 기존 로직 사용
      dispatch({
        type: 'UPDATE_TODO',
        payload: {
          id: todoId,
          updates: { order: newOrder, updatedAt: new Date() }
        }
      })

      // Firestore에도 저장 (인증된 사용자만)
      if (currentUser?.uid) {
        try {
          await firestoreService.updateTodo(todoId, { order: newOrder }, currentUser.uid)
          console.log('할일 순서 Firestore 저장 성공', { todoId, newOrder })
        } catch (error) {
          console.error('할일 순서 Firestore 저장 실패:', error)
          // 에러가 발생해도 로컬 state는 유지
        }
      }
    }
  }

  const reorderTodos = async (sourceIndex: number, destinationIndex: number, todos: Todo[]) => {
    const reorderedTodos = Array.from(todos)
    const [removed] = reorderedTodos.splice(sourceIndex, 1)
    reorderedTodos.splice(destinationIndex, 0, removed)

    // 새로운 순서로 order 값 업데이트 (병렬 처리)
    const updatePromises = reorderedTodos.map((todo, index) =>
      updateTodoOrder(todo.id, index)
    )

    try {
      await Promise.all(updatePromises)
      console.log('모든 할일 순서 업데이트 완료', { count: updatePromises.length })
    } catch (error) {
      console.error('할일 순서 업데이트 중 일부 실패:', error)
    }
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
    // 일반 할일과 반복 할일을 모두 포함
    const allTodos = [...state.todos, ...getRecurringTodos()]

    // 현재 날짜 (시간 00:00:00으로 설정)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    return allTodos.filter(todo => {
      // 🚨 미래의 반복 할일 숨김 처리 (사용자 요청)
      // 반복 할일이면서 시작일이 내일 이후인 경우 기본 목록에서 제외
      // 단, completionDateFilter가 있는 경우(특정 날짜 조회)는 제외하지 않음
      if (todo.startDate && !filters.completionDateFilter) {
        const startDate = new Date(todo.startDate)
        startDate.setHours(0, 0, 0, 0)

        if (startDate > today) {
          return false
        }
      }
      // 검색어 필터
      if (filters.searchTerm) {
        const searchLower = filters.searchTerm.toLowerCase()
        const matchesTitle = todo.title.toLowerCase().includes(searchLower)
        const matchesDescription = todo.description?.toLowerCase().includes(searchLower) || false
        const matchesTags = todo.tags?.some(tag => tag.toLowerCase().includes(searchLower)) || false

        if (!matchesTitle && !matchesDescription && !matchesTags) {
          return false
        }
      }

      // 우선순위 필터
      if (filters.priorityFilter && filters.priorityFilter !== 'all') {
        if (todo.priority !== filters.priorityFilter) return false
      }

      // 타입 필터
      if (filters.typeFilter && filters.typeFilter !== 'all') {
        if (todo.type !== filters.typeFilter) return false
      }

      // 프로젝트 필터
      if (filters.projectFilter && filters.projectFilter !== 'all') {
        if (todo.project !== filters.projectFilter) return false
      }

      // 태그 필터
      if (filters.tagFilter && filters.tagFilter.length > 0) {
        const todoTags = todo.tags || []
        const hasMatchingTag = filters.tagFilter.some(filterTag =>
          todoTags.includes(filterTag)
        )
        if (!hasMatchingTag) return false
      }

      // 완료일 필터
      if (filters.completionDateFilter && filters.completionDateFilter !== 'all' && todo.completedAt) {
        const completedDate = new Date(todo.completedAt)
        const today = new Date()

        switch (filters.completionDateFilter) {
          case 'today':
            if (completedDate.toDateString() !== today.toDateString()) return false
            break
          case 'yesterday':
            const yesterday = new Date()
            yesterday.setDate(today.getDate() - 1)
            if (completedDate.toDateString() !== yesterday.toDateString()) return false
            break
          case 'thisWeek':
            const startOfWeek = new Date(today)
            startOfWeek.setDate(today.getDate() - today.getDay())
            startOfWeek.setHours(0, 0, 0, 0)
            if (completedDate < startOfWeek) return false
            break
          case 'lastWeek':
            const startOfLastWeek = new Date(today)
            startOfLastWeek.setDate(today.getDate() - today.getDay() - 7)
            startOfLastWeek.setHours(0, 0, 0, 0)
            const endOfLastWeek = new Date(today)
            endOfLastWeek.setDate(today.getDate() - today.getDay() - 1)
            endOfLastWeek.setHours(23, 59, 59, 999)
            if (completedDate < startOfLastWeek || completedDate > endOfLastWeek) return false
            break
          case 'thisMonth':
            const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
            if (completedDate < startOfMonth) return false
            break
        }
      }

      // 완료 상태 필터
      if (filters.includeCompleted === false && todo.completed) {
        return false
      }

      return true
    })
  }

  // 반복 할일 관련 함수들
  const addRecurringTemplate = async (templateData: Omit<SimpleRecurringTemplate, 'id' | 'createdAt' | 'updatedAt'>) => {
    console.log('=== 반복 템플릿 추가 시작 ===')
    console.log('currentUser:', currentUser)
    console.log('templateData:', templateData)

    try {
      if (currentUser) {
        // Firestore 전용 저장
        console.log('Firestore 모드로 저장 시도')
        const firestoreId = await firestoreService.addRecurringTemplate(templateData, currentUser.uid)
        console.log('반복 템플릿 Firestore 저장 성공:', firestoreId)

        // 🔥 인스턴스 생성은 useEffect에서 자동으로 처리됨 (중복 방지)
        console.log('✅ 템플릿 저장 완료 - 인스턴스는 useEffect에서 자동 생성됨')
      } else {
        // 비로그인 사용자: 메모리에 저장 후 localStorage에 자동 저장
        console.log('비로그인 모드: 메모리에 반복 템플릿 추가')
        const newTemplate: SimpleRecurringTemplate = {
          ...templateData,
          id: generateId(),
          createdAt: new Date(),
          updatedAt: new Date()
        }
        dispatch({ type: 'ADD_RECURRING_TEMPLATE', payload: newTemplate })
        // localStorage 저장은 useEffect에서 자동으로 처리됨
      }
      console.log('=== 반복 템플릿 추가 완료 ===')
    } catch (error) {
      console.error('반복 템플릿 추가 실패:', error)
      dispatch({ type: 'SET_ERROR', payload: '반복 할일 추가 중 오류가 발생했습니다.' })
    }
  }

  const updateRecurringTemplate = async (id: string, updates: Partial<SimpleRecurringTemplate>) => {
    console.log('🔧 반복 템플릿 수정 시작')
    console.log('템플릿 ID:', id)
    console.log('수정 데이터:', updates)

    try {
      if (currentUser) {
        console.log('🔥 Firebase 사용자 - 템플릿만 업데이트 (인스턴스는 useEffect에서 자동 처리)')

        // 1. Firestore 템플릿 업데이트 (인스턴스 재생성은 하지 않음)
        console.log('1️⃣ Firestore 템플릿 업데이트만 수행')
        await firestoreService.updateRecurringTemplate(id, updates, currentUser.uid)
        console.log('✅ 반복 템플릿 Firestore 업데이트 완료:', id)

        // 2. 로컬 상태 템플릿 업데이트
        console.log('2️⃣ 로컬 상태 템플릿 업데이트')
        dispatch({ type: 'UPDATE_RECURRING_TEMPLATE', payload: { id, updates } })
        console.log('✅ 로컬 상태 템플릿 업데이트 완료')

        // 📝 NOTE: 인스턴스 재생성은 useEffect에서 템플릿 변경을 감지하여 자동으로 처리됩니다.
        console.log('💡 인스턴스 재생성은 useEffect에서 자동 처리됩니다.')

      } else {
        // 비로그인 사용자: 메모리에서 업데이트
        console.log('비로그인 모드: 메모리에서 반복 템플릿 업데이트')

        // 1. 기존 할일 중 해당 템플릿에서 생성된 것들 삭제
        const todosToRemove = state.todos.filter((todo: any) => todo._templateId === id)
        console.log(`템플릿 ${id}에서 생성된 할일 ${todosToRemove.length}개 발견`)

        for (const todo of todosToRemove) {
          console.log(`할일 삭제: ${todo.title} (${todo.id})`)
          dispatch({ type: 'DELETE_TODO', payload: todo.id })
        }

        // 2. 템플릿 업데이트
        dispatch({ type: 'UPDATE_RECURRING_TEMPLATE', payload: { id, updates } })

        // 3. 새로운 할일들 생성
        setTimeout(() => {
          console.log('업데이트된 템플릿으로 새로운 할일 생성 시작')
          generateRecurringInstances()
        }, 100)
      }
      console.log('=== 반복 템플릿 수정 완료 ===')
    } catch (error) {
      console.error('반복 템플릿 업데이트 실패:', error)
      dispatch({ type: 'SET_ERROR', payload: '반복 할일 업데이트 중 오류가 발생했습니다.' })
    }
  }



  const deleteRecurringTemplate = async (id: string) => {
    try {
      if (currentUser) {
        // 즉시 UI에서 제거 (낙관적 업데이트)
        dispatch({ type: 'DELETE_RECURRING_TEMPLATE', payload: id })
        console.log('✅ 즉시 UI에서 반복 템플릿 제거:', id)

        // Firestore에서 실제 삭제
        await firestoreService.deleteRecurringTemplate(id, currentUser.uid)
        console.log('✅ 반복 템플릿 Firestore 삭제 성공:', id)
      } else {
        // 비로그인 사용자: 메모리에서 삭제 후 localStorage 저장
        console.log('비로그인 모드: 메모리에서 반복 템플릿 삭제')
        dispatch({ type: 'DELETE_RECURRING_TEMPLATE', payload: id })

        // 비로그인 사용자만 localStorage 사용
        console.log('🚫 비로그인 사용자 - localStorage 사용 비활성화, 메모리만 업데이트')
      }
    } catch (error) {
      console.error('반복 템플릿 삭제 실패:', error)
      dispatch({ type: 'SET_ERROR', payload: '반복 할일 삭제 중 오류가 발생했습니다.' })
    }
  }

  // 중복된 반복 템플릿 정리 함수 (개선된 버전)
  const cleanupDuplicateTemplates = async () => {
    if (!currentUser) return; // 안전을 위해 로그인 사용자만 자동 정리

    console.log('🧹 중복 반복 템플릿 정리 시작 (Deep Check)')

    // 서명(Signature) 기반 그룹화
    const groups: { [key: string]: SimpleRecurringTemplate[] } = {}

    state.recurringTemplates.forEach(template => {
      // 중복 판단 기준: 제목 + 반복유형 + (요일 or 월간설정)
      const signatureParts = [
        template.title,
        template.recurrenceType,
        template.recurrenceType === 'weekly' ? template.weekday : '',
        template.recurrenceType === 'monthly' ? `${template.monthlyDate}-${template.monthlyPattern}-${template.monthlyWeek}-${template.monthlyWeekday}` : ''
      ]
      const signature = signatureParts.join('|')

      if (!groups[signature]) {
        groups[signature] = []
      }
      groups[signature].push(template)
    })

    const duplicates = Object.values(groups).filter(items => items.length > 1)

    if (duplicates.length > 0) {
      console.log(`❌ ${duplicates.length}개 그룹의 중복 템플릿 발견`)

      for (const items of duplicates) {
        // 생성일 역순 정렬 (최신 유지)
        const sorted = items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        const toKeep = sorted[0]
        const toDelete = sorted.slice(1)

        console.log(`🗑️ '${toKeep.title}' 중복 ${toDelete.length}개 삭제 예정`)

        // 중복 템플릿 삭제 (Firestore에서도 삭제됨)
        for (const template of toDelete) {
          await deleteRecurringTemplate(template.id)
        }
      }
      console.log('✅ 중복 정리 완료')

      // 정리 후 화면 새로고침 권장
      // window.location.reload() // 너무 공격적이므로 생략
    } else {
      console.log('✅ 중복된 템플릿이 없습니다.')
    }
  }

  // 템플릿 로드 시 중복 자동 정리
  useEffect(() => {
    if (state.recurringTemplates.length > 0 && currentUser) {
      const timer = setTimeout(() => {
        cleanupDuplicateTemplates();
      }, 2000); // 로드 후 2초 뒤 실행
      return () => clearTimeout(timer);
    }
  }, [state.recurringTemplates, currentUser]);

  const generateRecurringInstances = () => {
    // 🔥 로그인 사용자는 Firebase에서만 데이터 관리 (로컬 생성 완전 비활성화)
    if (currentUser) {
      console.log('🚫🚫🚫 로그인 사용자 - 로컬 인스턴스 생성 완전 차단!')
      return
    }

    // 🔥 추가 보호: authLoading 중일 때도 차단
    if (authLoading) {
      console.log('⏳ 인증 로딩 중 - 인스턴스 생성 대기')
      return
    }

    let allInstances: SimpleRecurringInstance[] = []

    state.recurringTemplates.filter(template => template.isActive).forEach(template => {
      try {
        const instances = simpleRecurringSystem.generateInstances(template)
        allInstances = [...allInstances, ...instances]
      } catch (error) {
        console.error(`템플릿 ${template.id} 인스턴스 생성 실패:`, error)
      }
    })

    dispatch({ type: 'SET_RECURRING_INSTANCES', payload: allInstances })

    // Firestore 전용 모드 - localStorage 사용 안함
  }

  // 반복 인스턴스를 일반 할일로 변환하여 반환 (중복 키 방지)
  const getRecurringTodos = (): Todo[] => {
    if (state.recurringTemplates.length === 0 || state.recurringInstances.length === 0) {
      return [];
    }

    // "skipped"가 true가 아닌 인스턴스만 필터링
    const activeInstances = state.recurringInstances.filter(instance => !instance.skipped);

    const recurringTodos = activeInstances.map(instance => {
      const template = state.recurringTemplates.find(t => t.id === instance.templateId);
      if (!template) {
        return null; // 템플릿이 없으면 변환 불가
      }
      return simpleRecurringSystem.convertToTodo(instance, template);
    }).filter((todo): todo is Todo => todo !== null); // null이 아닌 Todo 객체만 필터링

    return recurringTodos;
  }

  // 기존 할일들에 order 값을 초기화하는 함수
  const initializeOrderValues = () => {
    // 일반 할일들
    const todosNeedingOrder = state.todos.filter(todo =>
      !todo.completed && (todo.order === undefined || todo.order === null)
    )

    // 반복할일들도 포함
    const recurringTodos = getRecurringTodos().filter(todo =>
      !todo.completed && (todo.order === undefined || todo.order === null)
    )

    const allTodosNeedingOrder = [...todosNeedingOrder, ...recurringTodos]

    if (allTodosNeedingOrder.length === 0) return

    console.log('🔧 Order 값 초기화 대상:', allTodosNeedingOrder.length, '개')

    // 우선순위별로 그룹화
    const priorityGroups = {
      urgent: allTodosNeedingOrder.filter(t => t.priority === 'urgent'),
      high: allTodosNeedingOrder.filter(t => t.priority === 'high'),
      medium: allTodosNeedingOrder.filter(t => t.priority === 'medium'),
      low: allTodosNeedingOrder.filter(t => t.priority === 'low')
    }

    // 각 그룹별로 생성일 순으로 정렬한 후 order 값 할당
    const updatedTodos: Todo[] = []
    const updatedRecurringInstances: string[] = []

    Object.entries(priorityGroups).forEach(([priority, todos], priorityIndex) => {
      if (todos.length === 0) return

      // 생성일 순으로 정렬 (오래된 것부터)
      const sortedTodos = todos.sort((a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      )

      // order 값 할당 (우선순위별 베이스 값 + 인덱스)
      const baseOrder = priorityIndex * 1000
      sortedTodos.forEach((todo, index) => {
        const orderValue = baseOrder + index * 10

        if ((todo as any)._isRecurringInstance) {
          // 반복할일인 경우
          console.log('🔄 반복할일 order 초기화:', todo.title, '→', orderValue)
          const instanceId = (todo as any)._instanceId
          updatedRecurringInstances.push(instanceId)
          dispatch({
            type: 'UPDATE_RECURRING_INSTANCE',
            payload: {
              id: instanceId,
              updates: { order: orderValue }
            }
          })
        } else {
          // 일반 할일인 경우
          updatedTodos.push({
            ...todo,
            order: orderValue
          })
        }
      })
    })

    // 일반 할일들을 Firestore와 로컬 상태에 반영
    updatedTodos.forEach(async (todo) => {
      try {
        if (currentUser) {
          await firestoreService.updateTodo(todo.id, { order: todo.order }, currentUser.uid)
        }
        dispatch({ type: 'UPDATE_TODO', payload: { id: todo.id, updates: { order: todo.order } } })
      } catch (error) {
        console.error('Order 값 초기화 실패:', todo.id, error)
      }
    })

    console.log('✅ Order 초기화 완료:', updatedTodos.length, '개 일반 할일,', updatedRecurringInstances.length, '개 반복할일')
  }

  // 강제 새로고침 함수 추가
  const forceRefresh = async () => {
    if (!currentUser) {
      console.log('❌ 사용자가 로그인하지 않음')
      return
    }

    console.log('🔄 Firestore 강제 새로고침 시작...')
    dispatch({ type: 'SET_LOADING', payload: true })

    try {
      // 직접 데이터 조회
      const todos = await firestoreService.getTodos(currentUser.uid)
      console.log('✅ 강제 새로고침 성공:', todos.length, '개 할일')
      dispatch({ type: 'SET_TODOS', payload: todos })
      dispatch({ type: 'SET_ERROR', payload: null })
    } catch (error: unknown) {
      console.error('❌ 강제 새로고침 실패:', error)
      dispatch({ type: 'SET_ERROR', payload: '데이터 새로고침에 실패했습니다.' })
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false })
    }
  }

  // 🚨 긴급 수정: Firebase 반복 인스턴스 완전 재생성
  const fixRecurringInstances = async () => {
    if (!currentUser) {
      console.log('❌ 로그인하지 않은 사용자')
      return
    }

    console.log('🚨 긴급 수정: Firebase 반복 인스턴스 완전 재생성 시작')

    try {
      // 1. 모든 기존 반복 인스턴스 삭제
      console.log('1️⃣ 모든 기존 반복 인스턴스 삭제 중...')
      const existingInstances = await firestoreService.getRecurringInstances(currentUser.uid)
      console.log(`삭제할 인스턴스 개수: ${existingInstances.length}`)

      for (const instance of existingInstances) {
        await firestoreService.deleteRecurringInstance(instance.id, currentUser.uid)
        console.log(`✅ 인스턴스 삭제: ${instance.id}`)
      }

      // 2. 모든 활성 템플릿에 대해 새 인스턴스 생성
      console.log('2️⃣ 새 인스턴스 생성 중...')
      const activeTemplates = state.recurringTemplates.filter(t => t.isActive)
      console.log(`활성 템플릿 개수: ${activeTemplates.length}`)

      for (const template of activeTemplates) {
        console.log(`🔄 템플릿 처리: ${template.title} (monthlyDate: ${template.monthlyDate})`)

        // simpleRecurringSystem으로 새 인스턴스 생성
        const newInstances = simpleRecurringSystem.generateInstances(template)
        console.log(`생성된 인스턴스: ${newInstances.length}개`)

        // Firebase에 저장
        for (const instance of newInstances) {
          const instanceData = {
            templateId: instance.templateId,
            date: instance.date,
            completed: false,
            createdAt: instance.createdAt,
            updatedAt: instance.updatedAt
          }

          const savedId = await firestoreService.addRecurringInstance(instanceData, currentUser.uid)
          console.log(`✅ 인스턴스 저장: ${savedId} - ${instance.date.toDateString()}`)
        }
      }

      // 3. 로컬 상태 새로고침
      console.log('3️⃣ 로컬 상태 새로고침 중...')
      await forceRefresh()

      console.log('✅ 긴급 수정 완료!')
      alert('✅ 반복 할일 문제가 수정되었습니다!\n페이지를 새로고침해주세요.')

    } catch (error) {
      console.error('❌ 긴급 수정 실패:', error)
      alert('❌ 수정 중 오류가 발생했습니다.')
    }
  }

  // 수동 새로고침 함수 (삭제 후 호출용)
  const manualRefresh = async () => {
    if (!currentUser) {
      console.log('❌ 로그인하지 않은 사용자')
      return
    }

    console.log('🔄 수동 새로고침 시작 (삭제 후 호출)')
    try {
      const todos = await firestoreService.getTodos(currentUser.uid)
      console.log('✅ 수동 새로고침 성공:', todos.length, '개 할일')
      dispatch({ type: 'SET_TODOS', payload: todos })
    } catch (error) {
      console.error('❌ 수동 새로고침 실패:', error)
    }
  }



  // Firebase 고아 데이터 정리 함수
  const cleanupOrphanedData = useCallback(async () => {
    if (!currentUser?.uid) {
      console.log('로그인 확인 중...')
      return
    }

    try {
      console.log('🧹 고아 데이터 정리 시작')
      const result = await cleanupService.cleanupOrphanedInstances(currentUser.uid)

      console.log('✅ 고아 데이터 정리 완료:', result)
      alert(`✅ 정리 완료!\n- 고아 인스턴스: ${result.orphanedInstances}개\n- 고아 할일: ${result.orphanedTodos}개\n- 총 정리: ${result.totalCleaned}개`)

      // 화면 새로고침
      await forceRefresh()

    } catch (error) {
      console.error('❌ 고아 데이터 정리 실패:', error)
      alert('❌ 정리 중 오류가 발생했습니다.')
    }
  }, [currentUser])

  // 데이터 정합성 검증 함수
  const validateDataConsistency = useCallback(async () => {
    if (!currentUser?.uid) {
      console.log('로그인 확인 중...')
      return
    }

    try {
      console.log('🔍 데이터 정합성 검증 시작')
      const stats = await cleanupService.validateTemplateConsistency(currentUser.uid)

      console.log('✅ 데이터 정합성 검증 완료 - 콘솔을 확인하세요')
      alert(`✅ 검증 완료!\n총 ${stats.size}개 템플릿의 데이터 현황을 콘솔에서 확인하세요.`)

    } catch (error) {
      console.error('❌ 데이터 정합성 검증 실패:', error)
      alert('❌ 검증 중 오류가 발생했습니다.')
    }
  }, [currentUser])



  // 스마트 인스턴스 정리 함수 (반복 관리 화면용 - 안전함)
  const smartCleanupInstances = useCallback(async () => {
    if (!currentUser?.uid) {
      console.log('로그인 확인 중...')
      return
    }

    const confirmation = window.confirm(
      '🧹 안전한 정리를 실행합니다:\n\n' +
      '🗑️ 삭제: 삭제된 템플릿의 고아 인스턴스만\n' +
      '✅ 유지: 모든 활성 템플릿의 인스턴스\n\n' +
      '반복 할일들은 그대로 보입니다. 계속하시겠습니까?'
    )

    if (!confirmation) {
      console.log('❌ 사용자가 취소했습니다')
      return
    }

    try {
      console.log('🧹 스마트 정리 시작')
      const result = await cleanupService.smartCleanupInstances(currentUser.uid)

      console.log('✅ 스마트 정리 완료:', result)
      alert(`✅ 안전 정리 완료!\n\n` +
        `삭제: ${result.deletedInstances}개 고아 인스턴스\n` +
        `유지: ${result.keptInstances}개 활성 인스턴스\n\n` +
        `반복 할일들 그대로 보입니다! 🎉`)

      // 화면 새로고침 (짧은 딜레이)
      setTimeout(() => {
        window.location.reload()
      }, 1000)

    } catch (error) {
      console.error('❌ 스마트 정리 실패:', error)
      alert('❌ 스마트 정리 중 오류가 발생했습니다.')
    }
  }, [currentUser])

  // 🚨 개발자 콘솔에서 사용할 수 있도록 전역 함수로 노출
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).fixRecurringInstances = fixRecurringInstances;
      (window as any).cleanupOrphanedData = cleanupOrphanedData;
      (window as any).validateDataConsistency = validateDataConsistency;
      (window as any).smartCleanupInstances = smartCleanupInstances;

      // 간단 상태 확인
      (window as any).checkLoginStatus = () => {
        console.log('로그인 상태:', currentUser ? '✅ 로그인됨' : '❌ 로그인 안됨')
        if (currentUser) console.log('사용자:', currentUser.email)
      }

      // 인스턴스 강제 재생성 함수
      (window as any).forceRegenerateInstances = async () => {
        if (!currentUser?.uid) {
          console.log('로그인 상태 확인 필요')
          return
        }

        console.log('🔄 반복 인스턴스 강제 재생성 시작...')
        try {
          // 모든 활성 템플릿에 대해 인스턴스 재생성
          await Promise.all(
            state.recurringTemplates
              .filter(template => template.isActive !== false)
              .map(template =>
                firestoreService.regenerateRecurringInstances(template.id, currentUser.uid)
              )
          )

          console.log('✅ 인스턴스 재생성 완료! 페이지를 새로고침하세요.')
          setTimeout(() => window.location.reload(), 1000)

        } catch (error) {
          console.error('❌ 인스턴스 재생성 실패:', error)
        }
      }

      // 🔥 출장비 지급 신청 템플릿 수정 함수
      (window as any).fixBusinessTripTemplate = async () => {
        if (!currentUser?.uid) {
          console.log('로그인 상태 확인 필요')
          return
        }

        try {
          console.log('🔧 출장비 지급 신청 템플릿 수정 시작...')

          // 출장비 지급 신청 템플릿 찾기
          const businessTripTemplate = state.recurringTemplates.find(t =>
            t.title.includes('출장비') && t.title.includes('지급') && t.title.includes('신청')
          )

          if (!businessTripTemplate) {
            console.log('❌ 출장비 지급 신청 템플릿을 찾을 수 없습니다')
            console.log('📋 현재 템플릿들:', state.recurringTemplates.map(t => t.title))
            return
          }

          console.log('📋 기존 템플릿 데이터:', businessTripTemplate)

          // 새로운 월간 패턴으로 업데이트
          const updates = {
            monthlyPattern: 'weekday' as const,
            monthlyWeek: 'fourth' as const,
            monthlyWeekday: 2, // 화요일 (0=일, 1=월, 2=화, 3=수, 4=목, 5=금, 6=토)
            monthlyDate: undefined // 기존 날짜 설정 제거
          }

          console.log('🔍 요일 확인:')
          console.log('  0=일, 1=월, 2=화, 3=수, 4=목, 5=금, 6=토')
          console.log(`  설정값 2 = ${['일', '월', '화', '수', '목', '금', '토'][2]}요일`)

          console.log('🔧 적용할 업데이트:', updates)

          await firestoreService.updateRecurringTemplate(businessTripTemplate.id, updates, currentUser.uid)

          console.log('✅ 출장비 지급 신청 템플릿 수정 완료!')
          console.log('🔄 인스턴스 재생성 중...')

          // 해당 템플릿의 인스턴스 재생성
          await firestoreService.regenerateRecurringInstances(businessTripTemplate.id, currentUser.uid)

          console.log('🎯 모든 작업 완료! 페이지를 새로고침하세요.')
          setTimeout(() => window.location.reload(), 1000)

        } catch (error) {
          console.error('❌ 템플릿 수정 실패:', error)
        }
      }

      // 사용법 안내
      console.log('  - cleanupOrphanedData(): 고아 데이터 정리')
    }
  }, [])

  // SettingsView 지원 함수 구현
  const exportData = useCallback(() => {
    const data = {
      todos: state.todos,
      recurringTemplates: state.recurringTemplates,
      recurringInstances: state.recurringInstances,
      exportedAt: new Date().toISOString(),
      version: '1.0.0'
    }
    return JSON.stringify(data, null, 2)
  }, [state])

  const importData = useCallback(async (json: string) => {
    try {
      const data = JSON.parse(json)
      if (!data.todos) throw new Error('Invalid data format')

      // 날짜 문자열을 Date 객체로 변환
      const todos = data.todos.map((t: any) => ({
        ...t,
        createdAt: new Date(t.createdAt),
        updatedAt: new Date(t.updatedAt),
        dueDate: t.dueDate ? new Date(t.dueDate) : undefined,
        startDate: t.startDate ? new Date(t.startDate) : undefined,
        completedAt: t.completedAt ? new Date(t.completedAt) : undefined
      }))

      // 현재 사용자가 있으면 Firestore에 저장, 없으면 로컬 상태 업데이트
      if (currentUser) {
        // Firestore 일괄 저장 로직은 복잡하므로 여기서는 간단히 로컬 상태만 업데이트하고
        // 실제로는 각 항목을 add하는 것이 좋지만, 대량 데이터의 경우 주의 필요
        // 여기서는 로컬 상태만 업데이트하는 것으로 처리 (실제 동기화는 별도 로직 필요)
        dispatch({ type: 'SET_TODOS', payload: todos })
      } else {
        dispatch({ type: 'SET_TODOS', payload: todos })
      }

      return true
    } catch (e) {
      console.error('Import failed:', e)
      return false
    }
  }, [currentUser])

  const clearCompleted = useCallback(async () => {
    const completedTodos = state.todos.filter(t => t.completed)
    for (const todo of completedTodos) {
      await deleteTodo(todo.id)
    }
  }, [state.todos, deleteTodo])

  const syncWithCloud = useCallback(async () => {
    await syncWithFirestore()
  }, [syncWithFirestore])

  const stats = useMemo(() => ({
    total: state.todos.length,
    completed: state.todos.filter(t => t.completed).length,
    pending: state.todos.filter(t => !t.completed).length
  }), [state.todos])

  const allTags = useMemo(() => {
    const tags = new Set<string>()
    state.todos.forEach(todo => {
      todo.tags?.forEach(tag => tags.add(tag))
    })
    return Array.from(tags).sort()
  }, [state.todos])

  // 모든 함수가 정의된 후 완전한 value 객체 생성
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
    syncWithFirestore,
    getTodayTodos,
    getWeekTodos,
    getMonthTodos,
    getOverdueTodos,
    getTomorrowTodos,
    getYesterdayIncompleteTodos,
    isYesterdayIncompleteTodo,
    updateTodoOrder,
    reorderTodos,
    getFilteredTodos,
    addRecurringTemplate,
    updateRecurringTemplate,
    deleteRecurringTemplate,
    generateRecurringInstances,
    getRecurringTodos,
    cleanupDuplicateTemplates,
    forceRefresh,
    manualRefresh,
    initializeOrderValues,
    fixRecurringInstances,
    cleanupOrphanedData,
    validateDataConsistency,
    smartCleanupInstances,
    exportData,
    importData,
    clearCompleted,
    syncWithCloud,
    stats,
    searchQuery,
    setSearchQuery,
    filterStatus,
    setFilterStatus,
    filterPriority,
    setFilterPriority,
    filterTags,
    setFilterTags,
    allTags
  }

  return (
    <TodoContext.Provider value={value}>
      {children}
    </TodoContext.Provider>
  )
}

export const useTodos = () => {
  const context = useContext(TodoContext)
  if (context === undefined) {
    throw new Error('useTodos must be used within a TodoProvider')
  }
  return context
}