import { useState } from 'react'
import SearchFilter from './SearchFilter'
import MonthlyCalendarView from './MonthlyCalendarView'
import WeeklyCalendarView from './WeeklyCalendarView'
import AddRecurringModal from './AddRecurringModal'
import EditTodoModal from './EditTodoModal'
import SubTaskManager from './SubTaskManager'
import TodoItem from './TodoItem'
import type { Priority, TaskType, Todo, SubTask } from '../types/todo'

const ComponentShowcase = () => {
  const [activeComponent, setActiveComponent] = useState<string>('search')
  const [searchTerm, setSearchTerm] = useState('')
  const [priorityFilter, setPriorityFilter] = useState<Priority | 'all'>('all')
  const [typeFilter, setTypeFilter] = useState<TaskType | 'all'>('all')
  const [projectFilter, setProjectFilter] = useState<'all' | 'longterm' | 'shortterm'>('all')
  const [tagFilter, setTagFilter] = useState<string[]>([])
  const [completionDateFilter, setCompletionDateFilter] = useState<'all' | 'today' | 'yesterday' | 'thisWeek' | 'lastWeek' | 'thisMonth'>('all')
  
  const [showRecurringModal, setShowRecurringModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)

  // 샘플 데이터
  const sampleTodo: Todo = {
    id: '1',
    title: '샘플 프로젝트 할일',
    description: '이것은 샘플 할일입니다.',
    priority: 'high',
    type: 'project',
    completed: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    tags: ['개발', '프로젝트'],
    project: 'longterm',
    subTasks: [
      {
        id: '1-1',
        title: '요구사항 분석',
        completed: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: '1-2', 
        title: 'UI 디자인',
        completed: false,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: '1-3',
        title: '개발 진행',
        completed: false,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]
  }

  const [subTasks, setSubTasks] = useState<SubTask[]>(sampleTodo.subTasks || [])

  const availableTags = ['개발', '프로젝트', '회의', '학습', '문서화']

  const clearFilters = () => {
    setSearchTerm('')
    setPriorityFilter('all')
    setTypeFilter('all')
    setProjectFilter('all')
    setTagFilter([])
    setCompletionDateFilter('all')
  }

  const components = [
    { key: 'search', label: '검색 필터' },
    { key: 'monthly', label: '월간 캘린더' },
    { key: 'weekly', label: '주간 캘린더' },
    { key: 'todoitem', label: '할일 아이템' },
    { key: 'subtask', label: '서브태스크 관리' },
    { key: 'modals', label: '모달들' }
  ]

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            컴포넌트 쇼케이스
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Phase 2에서 개발된 UI 컴포넌트들을 확인해보세요.
          </p>
        </div>

        {/* 컴포넌트 선택 탭 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm mb-6">
          <div className="flex flex-wrap gap-2 p-4 border-b border-gray-200 dark:border-gray-700">
            {components.map((comp) => (
              <button
                key={comp.key}
                onClick={() => setActiveComponent(comp.key)}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  activeComponent === comp.key
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {comp.label}
              </button>
            ))}
          </div>

          <div className="p-6">
            {/* 검색 필터 */}
            {activeComponent === 'search' && (
              <div>
                <h2 className="text-xl font-semibold mb-4">검색 필터 컴포넌트</h2>
                <SearchFilter
                  searchTerm={searchTerm}
                  onSearchChange={setSearchTerm}
                  priorityFilter={priorityFilter}
                  onPriorityFilterChange={setPriorityFilter}
                  typeFilter={typeFilter}
                  onTypeFilterChange={setTypeFilter}
                  projectFilter={projectFilter}
                  onProjectFilterChange={setProjectFilter}
                  tagFilter={tagFilter}
                  onTagFilterChange={setTagFilter}
                  completionDateFilter={completionDateFilter}
                  onCompletionDateFilterChange={setCompletionDateFilter}
                  onClearFilters={clearFilters}
                  availableTags={availableTags}
                />
              </div>
            )}

            {/* 월간 캘린더 */}
            {activeComponent === 'monthly' && (
              <div>
                <h2 className="text-xl font-semibold mb-4">월간 캘린더 뷰</h2>
                <MonthlyCalendarView
                  searchTerm={searchTerm}
                  priorityFilter={priorityFilter}
                  typeFilter={typeFilter}
                  projectFilter={projectFilter}
                  tagFilter={tagFilter}
                  completionDateFilter={completionDateFilter}
                  onAddTodo={() => alert('할일 추가 기능')}
                />
              </div>
            )}

            {/* 주간 캘린더 */}
            {activeComponent === 'weekly' && (
              <div>
                <h2 className="text-xl font-semibold mb-4">주간 캘린더 뷰</h2>
                <WeeklyCalendarView
                  searchTerm={searchTerm}
                  priorityFilter={priorityFilter}
                  typeFilter={typeFilter}
                  projectFilter={projectFilter}
                  tagFilter={tagFilter}
                  completionDateFilter={completionDateFilter}
                  onAddTodo={() => alert('할일 추가 기능')}
                />
              </div>
            )}

            {/* 할일 아이템 */}
            {activeComponent === 'todoitem' && (
              <div>
                <h2 className="text-xl font-semibold mb-4">향상된 할일 아이템</h2>
                <div className="space-y-4">
                  <TodoItem
                    todo={sampleTodo}
                    onEdit={(todo) => {
                      console.log('Edit todo:', todo)
                      setShowEditModal(true)
                    }}
                    showCompletionTime={true}
                    showSubTasks={true}
                    compactMode={false}
                  />
                  
                  <TodoItem
                    todo={{
                      ...sampleTodo,
                      id: '2',
                      title: '간단한 할일',
                      type: 'simple',
                      subTasks: [],
                      completed: true,
                      completedAt: new Date()
                    }}
                    onEdit={(todo) => console.log('Edit simple todo:', todo)}
                    showCompletionTime={true}
                    compactMode={true}
                  />
                </div>
              </div>
            )}

            {/* 서브태스크 관리 */}
            {activeComponent === 'subtask' && (
              <div>
                <h2 className="text-xl font-semibold mb-4">서브태스크 관리 시스템</h2>
                <SubTaskManager
                  subTasks={subTasks}
                  onSubTasksChange={setSubTasks}
                  showProgress={true}
                />
              </div>
            )}

            {/* 모달들 */}
            {activeComponent === 'modals' && (
              <div>
                <h2 className="text-xl font-semibold mb-4">모달 컴포넌트들</h2>
                <div className="space-y-4">
                  <button
                    onClick={() => setShowRecurringModal(true)}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                  >
                    반복 일정 추가 모달 열기
                  </button>
                  
                  <button
                    onClick={() => setShowEditModal(true)}
                    className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
                  >
                    할일 편집 모달 열기
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 모달들 */}
        <AddRecurringModal
          isOpen={showRecurringModal}
          onClose={() => setShowRecurringModal(false)}
          onSubmit={(template) => {
            console.log('Recurring template:', template)
            setShowRecurringModal(false)
          }}
        />

        <EditTodoModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          onSubmit={(todo) => {
            console.log('Updated todo:', todo)
            setShowEditModal(false)
          }}
          todo={sampleTodo}
        />
      </div>
    </div>
  )
}

export default ComponentShowcase