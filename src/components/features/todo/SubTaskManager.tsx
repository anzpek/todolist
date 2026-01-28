import { useState, forwardRef, useImperativeHandle } from 'react'
import { Plus, X, Edit2, Check } from 'lucide-react'
import { useTodos } from '../../../contexts/TodoContext'
import type { SubTask } from '../../../types/todo'

interface SubTaskManagerProps {
  todoId: string
  subTasks: SubTask[]
}

export interface SubTaskManagerHandle {
  savePending: () => void
}

interface EditingSubTask {
  id: string
  title: string
}

const SubTaskManager = forwardRef<SubTaskManagerHandle, SubTaskManagerProps>(({ todoId, subTasks }, ref) => {
  const { addSubTask, updateSubTask, deleteSubTask, toggleSubTask } = useTodos()
  const [newSubTaskTitle, setNewSubTaskTitle] = useState('')
  const [isAddingSubTask, setIsAddingSubTask] = useState(false)
  const [editingSubTask, setEditingSubTask] = useState<EditingSubTask | null>(null)

  const handleAddSubTask = (e?: React.FormEvent) => {
    if (e) e.preventDefault()

    if (!newSubTaskTitle.trim()) return

    addSubTask(todoId, newSubTaskTitle.trim())
    setNewSubTaskTitle('')
    setIsAddingSubTask(false)
  }

  useImperativeHandle(ref, () => ({
    savePending: () => {
      if (newSubTaskTitle.trim()) {
        handleAddSubTask()
      }
      if (editingSubTask?.title.trim()) {
        handleSaveEdit()
      }
    }
  }))

  const handleStartEdit = (subTask: SubTask) => {
    setEditingSubTask({ id: subTask.id, title: subTask.title })
  }

  const handleSaveEdit = () => {
    if (!editingSubTask || !editingSubTask.title.trim()) return

    updateSubTask(todoId, editingSubTask.id, { title: editingSubTask.title.trim() })
    setEditingSubTask(null)
  }

  const handleCancelEdit = () => {
    setEditingSubTask(null)
  }

  const handleDeleteSubTask = (subTaskId: string) => {
    if (confirm('이 하위 작업을 삭제하시겠습니까?')) {
      deleteSubTask(todoId, subTaskId)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent, action: 'add' | 'edit') => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (action === 'add') {
        handleAddSubTask(e as any)
      } else {
        handleSaveEdit()
      }
    } else if (e.key === 'Escape') {
      if (action === 'add') {
        setIsAddingSubTask(false)
        setNewSubTaskTitle('')
      } else {
        handleCancelEdit()
      }
    }
  }

  return (
    <div className="mt-4 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
          하위 작업 ({subTasks.length})
        </h4>
        {!isAddingSubTask && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              setIsAddingSubTask(true)
            }}
            className="flex items-center gap-1 px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
          >
            <Plus className="w-3 h-3" />
            추가
          </button>
        )}
      </div>

      <div className="space-y-2">
        {subTasks.map((subTask) => (
          <div
            key={subTask.id}
            className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg group"
          >
            {editingSubTask?.id === subTask.id ? (
              <>
                <input
                  type="checkbox"
                  checked={subTask.completed}
                  onChange={() => toggleSubTask(todoId, subTask.id)}
                  onClick={(e) => e.stopPropagation()}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="text"
                  value={editingSubTask.title}
                  onChange={(e) => setEditingSubTask({ ...editingSubTask, title: e.target.value })}
                  onKeyDown={(e) => handleKeyPress(e, 'edit')}
                  onClick={(e) => e.stopPropagation()}
                  className="flex-1 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-600 dark:text-white"
                  placeholder="하위 작업 제목"
                  autoFocus
                />
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleSaveEdit()
                  }}
                  className="p-1 text-green-600 hover:bg-green-100 dark:hover:bg-green-900/20 rounded"
                  title="저장"
                >
                  <Check className="w-3 h-3" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleCancelEdit()
                  }}
                  className="p-1 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-600 rounded"
                  title="취소"
                >
                  <X className="w-3 h-3" />
                </button>
              </>
            ) : (
              <>
                <input
                  type="checkbox"
                  checked={subTask.completed}
                  onChange={() => toggleSubTask(todoId, subTask.id)}
                  onClick={(e) => e.stopPropagation()}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <div className="flex-1">
                  <span className={`text-sm ${subTask.completed ? 'line-through text-gray-500' : 'text-gray-700 dark:text-gray-300'}`}>
                    {subTask.title}
                  </span>
                  {subTask.completed && subTask.completedAt && subTask.completedAt !== null && (
                    <div className="text-xs text-green-600 dark:text-green-400 mt-1">
                      완료: {(() => {
                        try {
                          const date = new Date(subTask.completedAt)
                          if (isNaN(date.getTime())) {
                            console.warn('Invalid Date detected for subtask:', subTask.id, subTask.completedAt)
                            return '날짜 오류'
                          }
                          return date.toLocaleString('ko-KR')
                        } catch (error) {
                          console.error('Date parsing error:', error, subTask.completedAt)
                          return '날짜 오류'
                        }
                      })()}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleStartEdit(subTask)
                    }}
                    className="p-1 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/20 rounded"
                    title="수정"
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDeleteSubTask(subTask.id)
                    }}
                    className="p-1 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/20 rounded"
                    title="삭제"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              </>
            )}
          </div>
        ))}

        {isAddingSubTask && (
          <div className="flex items-center gap-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <input
              type="text"
              value={newSubTaskTitle}
              onChange={(e) => setNewSubTaskTitle(e.target.value)}
              onKeyDown={(e) => handleKeyPress(e, 'add')}
              onClick={(e) => e.stopPropagation()}
              className="flex-1 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-600 dark:text-white"
              placeholder="하위 작업 제목을 입력하세요"
              autoFocus
            />
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                handleAddSubTask()
              }}
              className="p-1 text-green-600 hover:bg-green-100 dark:hover:bg-green-900/20 rounded"
              title="추가"
            >
              <Check className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                setIsAddingSubTask(false)
                setNewSubTaskTitle('')
              }}
              className="p-1 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-600 rounded"
              title="취소"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        {subTasks.length === 0 && !isAddingSubTask && (
          <div className="text-center py-4 text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/30 rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-600">
            하위 작업을 추가해보세요
          </div>
        )}
      </div>
    </div>
  )
})

SubTaskManager.displayName = 'SubTaskManager'

export default SubTaskManager