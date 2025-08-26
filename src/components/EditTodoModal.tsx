import { useState, useEffect } from 'react'
import { X, Calendar, Clock, Flag, FolderPlus, FileText, Save, Minus, Plus } from 'lucide-react'
import { useTodos } from '../contexts/TodoContext'
import SubTaskManager from './SubTaskManager'
import type { Todo, Priority, RecurrenceType, TaskType } from '../types/todo'
import type { RecurrenceException } from '../utils/simpleRecurring'
import { getWeekLabel } from '../utils/helpers'

interface EditTodoModalProps {
  isOpen: boolean
  onClose: () => void
  todo: Todo | null
  isMobile?: boolean
}

const EditTodoModal = ({ isOpen, onClose, todo, isMobile = false }: EditTodoModalProps) => {
  const { updateTodo, updateRecurringTemplate } = useTodos()
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium' as Priority,
    type: 'simple' as TaskType,
    startDate: '',
    startTime: '',
    dueDate: '',
    dueTime: '',
    showStartTime: false, // 시작시간 표시 여부
    showDueTime: false, // 마감시간 표시 여부
    recurrence: 'none' as RecurrenceType,
    recurrenceDay: 1,
    recurrenceDate: 1,
    project: 'shortterm' as 'longterm' | 'shortterm',
    tags: [] as string[],
    exceptions: [] as RecurrenceException[],
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isRecurringTodo, setIsRecurringTodo] = useState(false)

  // 할일 데이터가 변경되면 폼 초기화
  useEffect(() => {
    if (todo && isOpen) {
      const isRecurring = todo.id.startsWith('recurring_')
      setIsRecurringTodo(isRecurring)
      
      setFormData({
        title: todo.title.replace('🔄 ', ''), // 반복 표시 제거
        description: todo.description || '',
        priority: todo.priority,
        type: todo.type,
        startDate: todo.startDate ? new Date(todo.startDate).toISOString().split('T')[0] : '',
        startTime: todo.startTime || '',
        dueDate: todo.dueDate ? new Date(todo.dueDate).toISOString().split('T')[0] : '',
        dueTime: todo.dueDate ? new Date(todo.dueDate).toTimeString().split(' ')[0].substring(0, 5) : (todo.dueTime || ''),
        showStartTime: (todo as any).showStartTime || false, // 시간 표시 여부 가져오기
        showDueTime: (todo as any).showDueTime || false, // 시간 표시 여부 가져오기
        recurrence: todo.recurrence || 'none',
        recurrenceDay: todo.recurrenceDay || 1,
        recurrenceDate: todo.recurrenceDate || 1,
        project: todo.project || 'shortterm',
        tags: todo.tags || [],
        exceptions: [], // 기본값 - 실제로는 템플릿에서 가져와야 함
      })
    }
  }, [todo, isOpen])

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    
    if (!formData.title.trim()) {
      newErrors.title = '할일 제목을 입력해주세요.'
    }
    
    // 시작일과 마감일 비교 검증
    if (formData.startDate && formData.dueDate) {
      try {
        const startDateTime = new Date(`${formData.startDate}T${formData.startTime || '00:00'}`)
        const dueDateTime = new Date(`${formData.dueDate}T${formData.dueTime || '23:59'}`)
        
        if (startDateTime >= dueDateTime) {
          newErrors.startDate = '시작일은 마감일보다 이전이어야 합니다'
        }
      } catch (error) {
        console.error('날짜 검증 오류:', error)
        newErrors.general = '날짜 형식을 확인해주세요'
      }
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm() || !todo) return

    try {
      if (isRecurringTodo) {
        // 반복 할일인 경우 - 템플릿 업데이트
        const templateId = (todo as any)._templateId
        if (templateId) {
          // 반복 템플릿 업데이트
          updateRecurringTemplate(templateId, {
            title: formData.title,
            description: formData.description,
            priority: formData.priority,
            type: formData.type,
            tags: formData.tags,
            exceptions: formData.exceptions
          })
        }
      } else {
        // 일반 할일 업데이트
        const updates: Partial<Todo> = {
          title: formData.title.trim(),
          description: formData.description.trim() || '',
          priority: formData.priority,
          type: formData.type,
          tags: formData.tags
        }

        // 선택적 필드들
        if (formData.startDate) {
          try {
            updates.startDate = new Date(formData.startDate)
            console.log('수정: 시작일 설정됨:', updates.startDate)
          } catch (error) {
            console.error('수정: 시작일 파싱 오류:', error)
            throw new Error('시작일 형식이 올바르지 않습니다')
          }
        }
        if (formData.startTime) {
          updates.startTime = formData.startTime
          console.log('수정: 시작 시간 설정됨:', updates.startTime)
        }
        // 시간 표시 여부 저장
        (updates as any).showStartTime = formData.showStartTime;
        (updates as any).showDueTime = formData.showDueTime;
        // 마감일과 마감시간을 결합해서 완전한 DateTime 객체 생성
        if (formData.dueDate) {
          try {
            const dateStr = formData.dueDate
            const timeStr = formData.dueTime || '23:59' // 마감시간 없으면 입력한 날짜의 23:59로 설정
            const combinedDateTimeStr = `${dateStr}T${timeStr}:00`
            
            updates.dueDate = new Date(combinedDateTimeStr)
            console.log(`수정: 마감일 설정: ${dateStr} ${timeStr} →`, updates.dueDate)
            
            // dueTime은 별도 저장하지 않고 dueDate에 포함
            if (formData.dueTime) {
              console.log('수정: 마감시간이 dueDate에 포함됨:', formData.dueTime)
            }
          } catch (error) {
            console.error('수정: 마감일 파싱 오류:', error)
            throw new Error(`마감일 형식이 올바르지 않습니다: ${formData.dueDate} ${formData.dueTime || ''}`)
          }
        }
        if (formData.type === 'project') {
          updates.project = formData.project
        }

        await updateTodo(todo.id, updates)
      }

      onClose()
    } catch (error) {
      console.error('할일 수정 실패:', error)
      setErrors({ general: '할일 수정 중 오류가 발생했습니다.' })
    }
  }

  const handleChange = (field: string, value: string | number | string[]) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  // 예외 설정 관리 함수들
  const addException = () => {
    setFormData(prev => ({
      ...prev,
      exceptions: [...prev.exceptions, { type: 'date', values: [] }]
    }))
  }

  const removeException = (index: number) => {
    setFormData(prev => ({
      ...prev,
      exceptions: prev.exceptions.filter((_, i) => i !== index)
    }))
  }

  const updateException = (index: number, field: keyof RecurrenceException, value: any) => {
    setFormData(prev => ({
      ...prev,
      exceptions: prev.exceptions.map((exception, i) => 
        i === index ? { ...exception, [field]: value } : exception
      )
    }))
  }

  const updateExceptionValues = (index: number, values: number[] | string[]) => {
    setFormData(prev => ({
      ...prev,
      exceptions: prev.exceptions.map((exception, i) => 
        i === index ? { ...exception, values } : exception
      )
    }))
  }

  if (!isOpen || !todo) return null

  const weekdays = [
    { value: 1, label: '월요일' },
    { value: 2, label: '화요일' },
    { value: 3, label: '수요일' },
    { value: 4, label: '목요일' },
    { value: 5, label: '금요일' },
    { value: 6, label: '토요일' },
    { value: 0, label: '일요일' },
  ]

  return (
    <div className={`fixed inset-0 bg-black bg-opacity-50 z-50 ${isMobile ? '' : 'flex items-center justify-center p-4'}`}>
      <div className={`bg-white dark:bg-gray-800 shadow-xl overflow-y-auto ${
        isMobile 
          ? 'w-full h-full fixed inset-0' 
          : 'w-full max-w-2xl max-h-[90vh] rounded-lg'
      }`}>
        <div className={`flex items-center justify-between border-b border-gray-200 dark:border-gray-700 ${isMobile ? 'px-4 py-3' : 'p-6'}`}>
          <h2 className={`font-semibold text-gray-900 dark:text-white ${isMobile ? 'text-lg' : 'text-xl'}`}>
            할일 수정 {isRecurringTodo ? '(반복 할일)' : ''}
          </h2>
          <button
            onClick={onClose}
            className={`hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg ${isMobile ? 'p-3' : 'p-2'}`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className={`${isMobile ? 'px-4 py-4' : 'p-6'}`}>
          <div className={`${isMobile ? 'space-y-4' : 'space-y-6'}`}>
            {/* 에러 메시지 */}
            {errors.general && (
              <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                {errors.general}
              </div>
            )}

            {/* 제목 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <FileText className="w-4 h-4 inline mr-1" />
                제목 *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => handleChange('title', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white ${
                  errors.title ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                }`}
                placeholder="할일을 입력하세요"
              />
              {errors.title && (
                <p className="mt-1 text-sm text-red-600">{errors.title}</p>
              )}
            </div>

            {/* 설명 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                설명
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                placeholder="할일에 대한 자세한 설명을 입력하세요"
              />
            </div>

            {/* 유형과 우선순위 */}
            <div className="grid grid-cols-2 gap-2 sm:gap-4">
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 sm:mb-2">
                  <FolderPlus className="w-3 h-3 sm:w-4 sm:h-4 inline mr-1" />
                  유형
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => handleChange('type', e.target.value as TaskType)}
                  className="w-full px-2 py-1.5 sm:px-3 sm:py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                >
                  <option value="simple">단일 태스크</option>
                  <option value="project">프로젝트</option>
                </select>
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 sm:mb-2">
                  <Flag className="w-3 h-3 sm:w-4 sm:h-4 inline mr-1" />
                  우선순위
                </label>
                <select
                  value={formData.priority}
                  onChange={(e) => handleChange('priority', e.target.value as Priority)}
                  className="w-full px-2 py-1.5 sm:px-3 sm:py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                >
                  <option value="low">낮음</option>
                  <option value="medium">보통</option>
                  <option value="high">높음</option>
                  <option value="urgent">긴급</option>
                </select>
              </div>
            </div>

            {/* 프로젝트 구분 */}
            {formData.type === 'project' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  프로젝트 구분
                </label>
                <div className="flex space-x-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="shortterm"
                      checked={formData.project === 'shortterm'}
                      onChange={(e) => handleChange('project', e.target.value)}
                      className="mr-2"
                    />
                    숏텀 프로젝트
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="longterm"
                      checked={formData.project === 'longterm'}
                      onChange={(e) => handleChange('project', e.target.value)}
                      className="mr-2"
                    />
                    롱텀 프로젝트
                  </label>
                </div>
              </div>
            )}

            {/* 시작 날짜 및 시간 */}
            <div className="grid grid-cols-2 gap-2 sm:gap-4">
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 sm:mb-2">
                  <Calendar className="w-3 h-3 sm:w-4 sm:h-4 inline mr-1" />
                  시작 날짜
                </label>
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => handleChange('startDate', e.target.value)}
                  className="w-full px-2 py-1.5 sm:px-3 sm:py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 sm:mb-2">
                  <Clock className="w-3 h-3 sm:w-4 sm:h-4 inline mr-1" />
                  시작 시간
                </label>
                <input
                  type="time"
                  value={formData.startTime}
                  onChange={(e) => handleChange('startTime', e.target.value)}
                  className="w-full px-2 py-1.5 sm:px-3 sm:py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>

            {/* 마감 날짜 및 시간 */}
            <div className="grid grid-cols-2 gap-2 sm:gap-4">
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 sm:mb-2">
                  <Calendar className="w-3 h-3 sm:w-4 sm:h-4 inline mr-1" />
                  마감 날짜
                </label>
                <input
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => handleChange('dueDate', e.target.value)}
                  className="w-full px-2 py-1.5 sm:px-3 sm:py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 sm:mb-2">
                  <Clock className="w-3 h-3 sm:w-4 sm:h-4 inline mr-1" />
                  마감 시간
                </label>
                <input
                  type="time"
                  value={formData.dueTime}
                  onChange={(e) => handleChange('dueTime', e.target.value)}
                  className="w-full px-2 py-1.5 sm:px-3 sm:py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>

            {/* 시간 표시 설정 */}
            <div className="flex items-center space-x-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.showStartTime}
                  onChange={(e) => handleChange('showStartTime', e.target.checked)}
                  className="mr-2"
                />
                <Clock className="w-4 h-4 inline mr-1" />
                시작시간 표시
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.showDueTime}
                  onChange={(e) => handleChange('showDueTime', e.target.checked)}
                  className="mr-2"
                />
                <Clock className="w-4 h-4 inline mr-1" />
                마감시간 표시
              </label>
            </div>

            {/* 태그 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                태그
              </label>
              <input
                type="text"
                value={formData.tags.join(', ')}
                onChange={(e) => handleChange('tags', e.target.value.split(',').map(tag => tag.trim()).filter(tag => tag))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                placeholder="태그를 쉼표로 구분하여 입력하세요 (예: 업무, 개인, 중요)"
              />
            </div>

            {/* 하위 작업 (프로젝트 타입인 경우만) */}
            {formData.type === 'project' && todo && !isRecurringTodo && (
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <SubTaskManager 
                  todoId={todo.id} 
                  subTasks={todo.subTasks || []} 
                />
              </div>
            )}

            {/* 반복 할일인 경우 예외 설정 */}
            {isRecurringTodo && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    <Minus className="w-4 h-4 inline mr-1" />
                    예외 설정 (반복에서 제외할 조건)
                  </label>
                  <button
                    type="button"
                    onClick={addException}
                    className="flex items-center gap-1 px-2 py-1 text-sm bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-900/30"
                  >
                    <Plus className="w-3 h-3" />
                    예외 추가
                  </button>
                </div>

                {formData.exceptions.map((exception, index) => (
                  <div key={index} className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <select
                        value={exception.type}
                        onChange={(e) => updateException(index, 'type', e.target.value)}
                        className="flex-1 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                      >
                        <option value="date">특정 날짜</option>
                        <option value="weekday">특정 요일</option>
                        <option value="week">특정 주</option>
                        <option value="month">특정 달</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => removeException(index)}
                        className="ml-2 p-1 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/20 rounded"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2">
                      {exception.type === 'date' && Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                        <label key={day} className="flex items-center space-x-1">
                          <input
                            type="checkbox"
                            checked={(exception.values as number[]).includes(day)}
                            onChange={(e) => {
                              const currentValues = exception.values as number[]
                              const newValues = e.target.checked
                                ? [...currentValues, day]
                                : currentValues.filter(v => v !== day)
                              updateExceptionValues(index, newValues)
                            }}
                            className="text-sm"
                          />
                          <span className="text-xs">{day}일</span>
                        </label>
                      ))}

                      {exception.type === 'weekday' && weekdays.map(day => (
                        <label key={day.value} className="flex items-center space-x-1">
                          <input
                            type="checkbox"
                            checked={(exception.values as number[]).includes(day.value)}
                            onChange={(e) => {
                              const currentValues = exception.values as number[]
                              const newValues = e.target.checked
                                ? [...currentValues, day.value]
                                : currentValues.filter(v => v !== day.value)
                              updateExceptionValues(index, newValues)
                            }}
                            className="text-sm"
                          />
                          <span className="text-xs">{day.label}</span>
                        </label>
                      ))}

                      {exception.type === 'week' && [1, 2, 3, 4, -1].map(week => (
                        <label key={week} className="flex items-center space-x-1">
                          <input
                            type="checkbox"
                            checked={(exception.values as number[]).includes(week)}
                            onChange={(e) => {
                              const currentValues = exception.values as number[]
                              const newValues = e.target.checked
                                ? [...currentValues, week]
                                : currentValues.filter(v => v !== week)
                              updateExceptionValues(index, newValues)
                            }}
                            className="text-sm"
                          />
                          <span className="text-xs">{getWeekLabel(week)}</span>
                        </label>
                      ))}

                      {exception.type === 'month' && Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                        <label key={month} className="flex items-center space-x-1">
                          <input
                            type="checkbox"
                            checked={(exception.values as number[]).includes(month)}
                            onChange={(e) => {
                              const currentValues = exception.values as number[]
                              const newValues = e.target.checked
                                ? [...currentValues, month]
                                : currentValues.filter(v => v !== month)
                              updateExceptionValues(index, newValues)
                            }}
                            className="text-sm"
                          />
                          <span className="text-xs">{month}월</span>
                        </label>
                      ))}
                    </div>

                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {exception.values.length > 0 && (
                        <span>
                          선택된 {exception.type === 'date' ? '날짜' : 
                                  exception.type === 'weekday' ? '요일' :
                                  exception.type === 'week' ? '주차' : '월'}: {exception.values.join(', ')}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 버튼 */}
          <div className={`flex justify-end space-x-3 ${isMobile ? 'mt-6' : 'mt-8'}`}>
            <button
              type="button"
              onClick={onClose}
              className={`text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg ${isMobile ? 'px-6 py-3' : 'px-4 py-2'}`}
            >
              취소
            </button>
            <button
              type="submit"
              className={`flex items-center gap-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 ${isMobile ? 'px-6 py-3' : 'px-4 py-2'}`}
            >
              <Save className="w-4 h-4" />
              저장
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default EditTodoModal