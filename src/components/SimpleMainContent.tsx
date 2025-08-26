import { useState, useEffect } from 'react'
import { Plus } from 'lucide-react'

interface SimpleTodo {
  id: string
  title: string
  description?: string
  completed: boolean
  createdAt: string
}

const SimpleMainContent = () => {
  const [todos, setTodos] = useState<SimpleTodo[]>([])
  const [newTodoTitle, setNewTodoTitle] = useState('')
  const [newTodoDescription, setNewTodoDescription] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)

  // localStorage에서 할일 로드
  useEffect(() => {
    const savedTodos = localStorage.getItem('simpleTodos')
    if (savedTodos) {
      try {
        setTodos(JSON.parse(savedTodos))
      } catch (error) {
        console.error('할일 로드 실패:', error)
      }
    }
  }, [])

  // localStorage에 할일 저장
  const saveTodos = (newTodos: SimpleTodo[]) => {
    localStorage.setItem('simpleTodos', JSON.stringify(newTodos))
    setTodos(newTodos)
  }

  // 할일 추가
  const addTodo = () => {
    if (!newTodoTitle.trim()) {
      alert('할일 제목을 입력해주세요!')
      return
    }

    const newTodo: SimpleTodo = {
      id: Date.now().toString(),
      title: newTodoTitle.trim(),
      description: newTodoDescription.trim(),
      completed: false,
      createdAt: new Date().toISOString()
    }

    const updatedTodos = [newTodo, ...todos]
    saveTodos(updatedTodos)
    
    // 폼 초기화
    setNewTodoTitle('')
    setNewTodoDescription('')
    setShowAddForm(false)
  }

  // 할일 완료/미완료 토글
  const toggleTodo = (id: string) => {
    const updatedTodos = todos.map(todo =>
      todo.id === id ? { ...todo, completed: !todo.completed } : todo
    )
    saveTodos(updatedTodos)
  }

  // 할일 삭제
  const deleteTodo = (id: string) => {
    if (confirm('이 할일을 삭제하시겠습니까?')) {
      const updatedTodos = todos.filter(todo => todo.id !== id)
      saveTodos(updatedTodos)
    }
  }

  const incompleteTodos = todos.filter(todo => !todo.completed)
  const completedTodos = todos.filter(todo => todo.completed)

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        
        {/* 헤더 */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">🎯 할일 관리</h1>
              <p className="text-gray-600 mt-2">
                총 {todos.length}개 할일 | 완료 {completedTodos.length}개 | 남은 할일 {incompleteTodos.length}개
              </p>
            </div>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg flex items-center gap-2 font-medium transition-colors"
            >
              <Plus size={20} />
              할일 추가
            </button>
          </div>
        </div>

        {/* 할일 추가 폼 */}
        {showAddForm && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">새 할일 추가</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  할일 제목 *
                </label>
                <input
                  type="text"
                  value={newTodoTitle}
                  onChange={(e) => setNewTodoTitle(e.target.value)}
                  placeholder="무엇을 할 예정인가요?"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  설명 (선택사항)
                </label>
                <textarea
                  value={newTodoDescription}
                  onChange={(e) => setNewTodoDescription(e.target.value)}
                  placeholder="할일에 대한 자세한 설명을 입력하세요"
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={addTodo}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                >
                  추가하기
                </button>
                <button
                  onClick={() => setShowAddForm(false)}
                  className="bg-gray-300 hover:bg-gray-400 text-gray-700 px-6 py-2 rounded-lg font-medium transition-colors"
                >
                  취소
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 진행 중인 할일 */}
        {incompleteTodos.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              📋 진행 중인 할일 ({incompleteTodos.length}개)
            </h2>
            <div className="space-y-3">
              {incompleteTodos.map(todo => (
                <div key={todo.id} className="flex items-start gap-4 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                  <button
                    onClick={() => toggleTodo(todo.id)}
                    className="mt-1 w-5 h-5 border-2 border-gray-300 rounded hover:border-blue-500 transition-colors"
                  />
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">{todo.title}</h3>
                    {todo.description && (
                      <p className="text-gray-600 text-sm mt-1">{todo.description}</p>
                    )}
                    <p className="text-gray-400 text-xs mt-2">
                      생성일: {new Date(todo.createdAt).toLocaleDateString('ko-KR')}
                    </p>
                  </div>
                  <button
                    onClick={() => deleteTodo(todo.id)}
                    className="text-red-500 hover:text-red-700 text-sm font-medium transition-colors"
                  >
                    삭제
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 완료된 할일 */}
        {completedTodos.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h2 className="text-xl font-semibold text-green-700 mb-4">
              ✅ 완료된 할일 ({completedTodos.length}개)
            </h2>
            <div className="space-y-3">
              {completedTodos.map(todo => (
                <div key={todo.id} className="flex items-start gap-4 p-4 border border-green-200 rounded-lg bg-green-50">
                  <button
                    onClick={() => toggleTodo(todo.id)}
                    className="mt-1 w-5 h-5 bg-green-500 border-2 border-green-500 rounded text-white flex items-center justify-center hover:bg-green-600 transition-colors"
                  >
                    ✓
                  </button>
                  <div className="flex-1">
                    <h3 className="font-medium text-green-800 line-through">{todo.title}</h3>
                    {todo.description && (
                      <p className="text-green-700 text-sm mt-1 line-through opacity-75">{todo.description}</p>
                    )}
                    <p className="text-green-600 text-xs mt-2">
                      생성일: {new Date(todo.createdAt).toLocaleDateString('ko-KR')}
                    </p>
                  </div>
                  <button
                    onClick={() => deleteTodo(todo.id)}
                    className="text-red-500 hover:text-red-700 text-sm font-medium transition-colors"
                  >
                    삭제
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 빈 상태 */}
        {todos.length === 0 && (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <div className="text-6xl mb-4">📝</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">아직 할일이 없습니다</h3>
            <p className="text-gray-600 mb-6">새로운 할일을 추가해서 시작해보세요!</p>
            <button
              onClick={() => setShowAddForm(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-medium transition-colors"
            >
              첫 번째 할일 추가하기
            </button>
          </div>
        )}

        {/* 푸터 */}
        <div className="text-center text-gray-500 text-sm mt-8">
          <p>💡 새로운 할일 관리 시스템 | 간단하고 확실하게</p>
        </div>

      </div>
    </div>
  )
}

export default SimpleMainContent