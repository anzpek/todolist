import { useState, useEffect, useRef } from 'react'
import { X, Calendar, Clock, Tag, Flag, AlertCircle, Repeat, Plus, Check } from 'lucide-react'
import { format, addDays, isSameDay } from 'date-fns'
import { ko } from 'date-fns/locale'
import { useTodos } from '../contexts/TodoContext'
import type { Priority, RecurrenceType } from '../types/todo'

interface AddTodoModalProps {
  isOpen: boolean
  onClose: () => void
  initialDate?: Date
}

const AddTodoModal = ({ isOpen, onClose, initialDate }: AddTodoModalProps) => {
  const { addTodo, allTags } = useTodos()
  const [text, setText] = useState('')
  const [showTagInput, setShowTagInput] = useState(false)
  const [newTag, setNewTag] = useState('')
  const [isNaturalLanguageMode, setIsNaturalLanguageMode] = useState(true)

  const initialFormState = {
    dueDate: format(initialDate || new Date(), 'yyyy-MM-dd'),
    dueTime: '',
    priority: 'medium' as Priority,
    tags: [] as string[],
    recurrence: 'none' as RecurrenceType,
    recurrenceDay: new Date().getDay(),
    recurrenceDate: new Date().getDate(),
    weekOfMonth: 1,
    monthlyRecurrenceType: 'by_date' as 'by_date' | 'by_weekday',
    holidayHandling: 'show',
    showStartTime: false,
    showDueTime: false
  }

  const [formData, setFormData] = useState(initialFormState)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
    if (isOpen) {
      setFormData(prev => ({
        ...prev,
        dueDate: format(initialDate || new Date(), 'yyyy-MM-dd')
      }))
    }
  }, [isOpen, initialDate])

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
  }

  const handleAddTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      handleChange('tags', [...formData.tags, newTag.trim()])
      setNewTag('')
      setShowTagInput(false)
    }
  }

  const toggleTag = (tag: string) => {
    if (formData.tags.includes(tag)) {
      handleChange('tags', formData.tags.filter(t => t !== tag))
    } else {
      handleChange('tags', [...formData.tags, tag])
    }
  }

  const parseNaturalLanguage = (input: string) => {
    const today = new Date()
    let date = today
    let time = ''
    let priority: Priority = 'medium'
    let tags: string[] = []

    // 날짜 파싱
    if (input.includes('오늘')) date = today
    else if (input.includes('내일')) date = addDays(today, 1)
    else if (input.includes('모레')) date = addDays(today, 2)

    // 우선순위 파싱
    if (input.includes('!긴급') || input.includes('!높음')) priority = 'high'
    else if (input.includes('!낮음')) priority = 'low'

    // 태그 파싱 (#태그)
    const tagMatch = input.match(/#(\S+)/g)
    if (tagMatch) {
      tags = tagMatch.map(t => t.slice(1))
    }

    return {
      dueDate: format(date, 'yyyy-MM-dd'),
      dueTime: time,
      priority,
      tags
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!text.trim()) {
      setErrors(prev => ({ ...prev, text: '할일 내용을 입력해주세요' }))
      return
    }

    const todoData = {
      text,
      completed: false,
      ...formData,
      recurrence: formData.recurrence === 'none' ? undefined : {
        type: formData.recurrence,
        interval: 1,
        days: formData.recurrence === 'weekly' ? [formData.recurrenceDay] : undefined,
        monthDay: formData.recurrence === 'monthly' && formData.monthlyRecurrenceType === 'by_date' ? formData.recurrenceDate : undefined,
        weekOfMonth: formData.recurrence === 'monthly' && formData.monthlyRecurrenceType === 'by_weekday' ? formData.weekOfMonth : undefined,
        dayOfWeek: formData.recurrence === 'monthly' && formData.monthlyRecurrenceType === 'by_weekday' ? formData.recurrenceDay : undefined,
        holidayHandling: formData.holidayHandling
      }
    }

    addTodo(todoData)
    onClose()
    setText('')
    setFormData(initialFormState)
  }

  const weekdays = [
    { value: 0, label: '일' },
    { value: 1, label: '월' },
    { value: 2, label: '화' },
    { value: 3, label: '수' },
    { value: 4, label: '목' },
    { value: 5, label: '금' },
    { value: 6, label: '토' },
  ]

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm transition-opacity" onClick={onClose} />

      <div className="flex min-h-full items-center justify-center p-4">
        <form
          onSubmit={handleSubmit}
          className="relative w-full max-w-lg bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 transform transition-all"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              새로운 할일
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-6">
            {/* 입력 모드 토글 */}
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setIsNaturalLanguageMode(!isNaturalLanguageMode)}
                className={`text-xs px-3 py-1.5 rounded-full transition-colors ${isNaturalLanguageMode
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                    : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                  }`}
              >
                {isNaturalLanguageMode ? '✨ 자연어 입력 켜짐' : '기본 입력 모드'}
              </button>
            </div>

            {/* 할일 내용 입력 */}
            <div>
              <input
                ref={inputRef}
                type="text"
                value={text}
                onChange={(e) => {
                  setText(e.target.value)
                  if (isNaturalLanguageMode) {
                    const parsed = parseNaturalLanguage(e.target.value)
                    setFormData(prev => ({ ...prev, ...parsed }))
                  }
                }}
                placeholder={isNaturalLanguageMode ? "예: 내일 오후 2시 회의 !긴급 #업무" : "할일을 입력하세요"}
                className="w-full text-lg px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border-0 rounded-xl focus:ring-2 focus:ring-blue-500 placeholder-gray-400 dark:text-white"
              />
              {errors.text && <p className="mt-1 text-sm text-red-600">{errors.text}</p>}
            </div>

            {/* 태그 선택 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Tag className="w-4 h-4 inline mr-1" />
                태그
              </label>
              <div className="flex flex-wrap gap-2 mb-2">
                {allTags.map(tag => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className={`px-3 py-1 rounded-full text-sm transition-colors ${formData.tags.includes(tag)
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                        : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                  >
                    #{tag}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setShowTagInput(true)}
                  className="px-3 py-1 rounded-full text-sm border border-dashed border-gray-300 text-gray-500 hover:border-gray-400 hover:text-gray-600 transition-colors"
                >
                  + 태그 추가
                </button>
              </div>
              {showTagInput && (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    placeholder="새 태그 입력"
                    className="flex-1 px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                  />
                  <button
                    type="button"
                    onClick={handleAddTag}
                    className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    추가
                  </button>
                </div>
              )}
            </div>

            {/* 우선순위 선택 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Flag className="w-4 h-4 inline mr-1" />
                우선순위
              </label>
              <div className="flex gap-4">
                {[
                  { value: 'high', label: '높음', color: 'text-red-600 bg-red-50 dark:bg-red-900/20' },
                  { value: 'medium', label: '중간', color: 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20' },
                  { value: 'low', label: '낮음', color: 'text-green-600 bg-green-50 dark:bg-green-900/20' }
                ].map(priority => (
                  <label
                    key={priority.value}
                    className={`flex-1 flex items-center justify-center p-3 rounded-xl cursor-pointer transition-all ${formData.priority === priority.value
                        ? `ring-2 ring-blue-500 ${priority.color}`
                        : 'bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                  >
                    <input
                      type="radio"
                      name="priority"
                      value={priority.value}
                      checked={formData.priority === priority.value}
                      onChange={(e) => handleChange('priority', e.target.value)}
                      className="sr-only"
                    />
                    <span className="font-medium">{priority.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* 마감일과 시간 */}
            <div className="grid grid-cols-2 gap-2 sm:gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  마감일
                </label>
                <input
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => handleChange('dueDate', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
                {errors.dueDate && <p className="mt-1 text-sm text-red-600">{errors.dueDate}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <Clock className="w-4 h-4 inline mr-1" />
                  마감시간
                </label>
                <input
                  type="time"
                  value={formData.dueTime}
                  onChange={(e) => handleChange('dueTime', e.target.value)}
                  disabled={!formData.dueDate}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
              </div>
            </div>

            {/* 시간 표시 설정 */}
            {!isNaturalLanguageMode && (
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
            )}

            {/* 반복 설정 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Repeat className="w-4 h-4 inline mr-1" />
                반복 설정
              </label>
              <select
                value={formData.recurrence}
                onChange={(e) => handleChange('recurrence', e.target.value as RecurrenceType)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              >
                <option value="none">반복 안함</option>
                <option value="daily">매일</option>
                <option value="weekly">매주</option>
                <option value="monthly">매달</option>
                <option value="yearly">매년</option>
              </select>
            </div>

            {/* 반복 상세 설정 */}
            {formData.recurrence === 'weekly' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  요일 선택
                </label>
                <select
                  value={formData.recurrenceDay}
                  onChange={(e) => handleChange('recurrenceDay', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                >
                  {weekdays.map(day => (
                    <option key={day.value} value={day.value}>{day.label}</option>
                  ))}
                </select>
              </div>
            )}

            {formData.recurrence === 'monthly' && (
              <div className="space-y-4">
                {/* 월간 반복 타입 선택 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    반복 방식
                  </label>
                  <div className="flex space-x-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        checked={formData.monthlyRecurrenceType === 'by_date'}
                        onChange={() => setFormData(prev => ({ ...prev, monthlyRecurrenceType: 'by_date' }))}
                        className="mr-2"
                      />
                      날짜 기준 (예: 매월 15일)
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        checked={formData.monthlyRecurrenceType === 'by_weekday'}
                        onChange={() => setFormData(prev => ({ ...prev, monthlyRecurrenceType: 'by_weekday' }))}
                        className="mr-2"
                      />
                      요일 기준 (예: 매월 첫째주 월요일)
                    </label>
                  </div>
                </div>

                {/* 날짜 기준 설정 */}
                {formData.monthlyRecurrenceType === 'by_date' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      날짜 선택
                    </label>
                    <select
                      value={formData.recurrenceDate}
                      onChange={(e) => handleChange('recurrenceDate', parseInt(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                    >
                      {Array.from({ length: 31 }, (_, i) => i + 1).map(date => (
                        <option key={date} value={date}>{date}일</option>
                      ))}
                      <option value={-1}>말일</option>
                    </select>
                  </div>
                )}

                {/* 요일 기준 설정 */}
                {formData.monthlyRecurrenceType === 'by_weekday' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        주차 선택
                      </label>
                      <select
                        value={formData.weekOfMonth}
                        onChange={(e) => handleChange('weekOfMonth', parseInt(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                      >
                        <option value={1}>첫째주</option>
                        <option value={2}>둘째주</option>
                        <option value={3}>셋째주</option>
                        <option value={4}>넷째주</option>
                        <option value={-1}>마지막주</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        요일 선택
                      </label>
                      <select
                        value={formData.recurrenceDay}
                        onChange={(e) => handleChange('recurrenceDay', parseInt(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                      >
                        {weekdays.map(day => (
                          <option key={day.value} value={day.value}>{day.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 공휴일 처리 설정 (반복 설정 시에만 표시) */}
            {formData.recurrence !== 'none' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  공휴일 처리
                </label>
                <select
                  value={formData.holidayHandling}
                  onChange={(e) => handleChange('holidayHandling', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                >
                  <option value="show">그대로 표시 (기본)</option>
                  <option value="skip">건너뛰기 (다음 반복일에 생성)</option>
                  <option value="next_day">다음 날로 미루기</option>
                  <option value="prev_day">이전 날로 당기기</option>
                </select>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  * 반복 예정일이 공휴일인 경우 어떻게 처리할지 설정합니다.
                </p>
              </div>
            )}
          </div>

          {/* 하단 버튼 */}
          <div className="flex justify-end gap-3 pt-6 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
            >
              취소
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:shadow-lg hover:shadow-blue-500/30 transition-all duration-300 transform hover:-translate-y-0.5 font-medium"
            >
              <Plus className="w-4 h-4" />
              추가하기
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default AddTodoModal