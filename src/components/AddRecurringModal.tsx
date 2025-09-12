import { useState } from 'react'
import { X, Plus, Minus, Flag } from 'lucide-react'
import { useTodos } from '../contexts/TodoContext'
import type { SimpleRecurringTemplate, RecurrenceException, ConflictException } from '../utils/simpleRecurring'
import { getWeekLabel } from '../utils/helpers'
// import RecurringFormFields from './common/RecurringFormFields'

interface AddRecurringModalProps {
  isOpen: boolean
  onClose: () => void
}

const AddRecurringModal = ({ isOpen, onClose }: AddRecurringModalProps) => {
  const { addRecurringTemplate, recurringTemplates } = useTodos()
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent',
    type: 'simple' as 'simple' | 'project',
    recurrenceType: 'daily' as 'daily' | 'weekly' | 'monthly',
    weekday: 1, // 월요일
    monthlyDate: 1,
    monthlyPattern: 'date' as 'date' | 'weekday',
    monthlyWeek: 'first' as 'first' | 'second' | 'third' | 'fourth' | 'last',
    monthlyWeekday: 3, // 수요일
    tags: [] as string[],
    exceptions: [] as RecurrenceException[],
    holidayHandling: 'before' as 'before' | 'after' | 'show'
  })

  const [isLoading, setIsLoading] = useState(false)

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

  const updateExceptionValues = (index: number, values: number[] | string[] | any[]) => {
    setFormData(prev => ({
      ...prev,
      exceptions: prev.exceptions.map((exception, i) => 
        i === index ? { ...exception, values } : exception
      )
    }))
  }

  // 중복 예외 추가
  const addConflictException = (exceptionIndex: number) => {
    const currentException = formData.exceptions[exceptionIndex]
    const currentExceptions = (currentException.values as ConflictException[]) || []
    const newException: ConflictException = {
      targetTemplateTitle: '',
      scope: 'same_week'
    }
    updateExceptionValues(exceptionIndex, [...currentExceptions, newException])
  }
  
  // 중복 예외 제거
  const removeConflictException = (exceptionIndex: number, conflictIndex: number) => {
    const currentException = formData.exceptions[exceptionIndex]
    const currentExceptions = (currentException.values as ConflictException[]) || []
    updateExceptionValues(exceptionIndex, currentExceptions.filter((_, i) => i !== conflictIndex))
  }
  
  // 중복 예외 업데이트
  const updateConflictException = (exceptionIndex: number, conflictIndex: number, field: keyof ConflictException, value: any) => {
    const currentException = formData.exceptions[exceptionIndex]
    const currentExceptions = (currentException.values as ConflictException[]) || []
    const updatedExceptions = currentExceptions.map((conflictException, i) => 
      i === conflictIndex ? { ...conflictException, [field]: value } : conflictException
    )
    updateExceptionValues(exceptionIndex, updatedExceptions)
  }

  // 요일 옵션
  const weekdays = [
    { value: 0, label: '일요일' },
    { value: 1, label: '월요일' },
    { value: 2, label: '화요일' },
    { value: 3, label: '수요일' },
    { value: 4, label: '목요일' },
    { value: 5, label: '금요일' },
    { value: 6, label: '토요일' }
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.title.trim()) return

    setIsLoading(true)

    try {
      console.log('=== AddRecurringModal 템플릿 생성 시작 ===')
      console.log('폼 데이터:', formData)
      
      const templateData: Omit<SimpleRecurringTemplate, 'id' | 'createdAt' | 'updatedAt'> = {
        title: formData.title.trim(),
        description: formData.description.trim() || undefined,
        priority: formData.priority,
        type: formData.type,
        recurrenceType: formData.recurrenceType,
        isActive: true,
        tags: formData.tags,
        exceptions: formData.exceptions,
        holidayHandling: formData.holidayHandling // 중요: 공휴일 처리 설정 포함
      }

      console.log('공휴일 처리 설정:', templateData.holidayHandling)

      // 반복 설정에 따라 필요한 필드 추가
      if (formData.recurrenceType === 'weekly') {
        templateData.weekday = formData.weekday
      } else if (formData.recurrenceType === 'monthly') {
        if (formData.monthlyPattern === ('weekday' as any)) {
          (templateData as any).monthlyPattern = 'weekday';
          (templateData as any).monthlyWeek = formData.monthlyWeek;
          (templateData as any).monthlyWeekday = formData.monthlyWeekday;
        } else {
          (templateData as any).monthlyPattern = 'date';
          (templateData as any).monthlyDate = formData.monthlyDate;
        }
      }

      console.log('최종 템플릿 데이터:', templateData)
      
      await addRecurringTemplate(templateData)
      onClose()
      
      // 폼 리셋
      setFormData({
        title: '',
        description: '',
        priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent',
        type: 'simple' as 'simple' | 'project',
        recurrenceType: 'daily' as 'daily' | 'weekly' | 'monthly',
        weekday: 1,
        monthlyDate: 1,
        monthlyPattern: 'date' as 'date' | 'weekday',
        monthlyWeek: 'first' as 'first' | 'second' | 'third' | 'fourth' | 'last',
        monthlyWeekday: 3,
        tags: [],
        exceptions: [],
        holidayHandling: 'before' as 'before' | 'after' | 'show'
      })
      
      console.log('=== AddRecurringModal 템플릿 생성 완료 ===')
    } catch (error) {
      console.error('반복 템플릿 추가 실패:', error)
      alert('반복 템플릿 추가에 실패했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            반복 템플릿 추가
          </h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 제목 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              제목
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="반복 할일 제목을 입력하세요"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              required
            />
          </div>

          {/* 설명 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              설명 (선택사항)
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="반복 할일에 대한 설명을 입력하세요"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              rows={2}
            />
          </div>

          {/* 우선순위 */}
          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 sm:mb-2">
              <Flag className="w-3 h-3 sm:w-4 sm:h-4 inline mr-1" />
              우선순위
            </label>
            <select
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
              className="w-full px-2 py-1.5 sm:px-3 sm:py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            >
              <option value="low">낮음</option>
              <option value="medium">보통</option>
              <option value="high">높음</option>
              <option value="urgent">긴급</option>
            </select>
          </div>

          {/* 반복 주기 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              반복 주기
            </label>
            <select
              value={formData.recurrenceType}
              onChange={(e) => setFormData({ ...formData, recurrenceType: e.target.value as any })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="daily">매일</option>
              <option value="weekly">매주</option>
              <option value="monthly">매월</option>
            </select>
          </div>

          {/* 주간 반복 설정 */}
          {formData.recurrenceType === 'weekly' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                요일
              </label>
              <select
                value={formData.weekday}
                onChange={(e) => setFormData({ ...formData, weekday: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value={0}>일요일</option>
                <option value={1}>월요일</option>
                <option value={2}>화요일</option>
                <option value={3}>수요일</option>
                <option value={4}>목요일</option>
                <option value={5}>금요일</option>
                <option value={6}>토요일</option>
              </select>
            </div>
          )}

          {/* 월간 반복 설정 */}
          {formData.recurrenceType === 'monthly' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  월간 패턴
                </label>
                <select
                  value={formData.monthlyPattern}
                  onChange={(e) => setFormData({ ...formData, monthlyPattern: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="date">특정 날짜 (예: 매월 15일)</option>
                  <option value="weekday">특정 주의 요일 (예: 매월 마지막 주 수요일)</option>
                </select>
              </div>

              {formData.monthlyPattern === 'date' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    날짜
                  </label>
                  <select
                    value={formData.monthlyDate}
                    onChange={(e) => setFormData({ ...formData, monthlyDate: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                      <option key={day} value={day}>
                        {day}일
                      </option>
                    ))}
                    <option value={-1}>말일</option>
                    <option value={-2}>첫 번째 근무일</option>
                    <option value={-3}>마지막 근무일</option>
                  </select>
                </div>
              )}

              {formData.monthlyPattern === 'weekday' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      몇 번째 주
                    </label>
                    <select
                      value={formData.monthlyWeek}
                      onChange={(e) => setFormData({ ...formData, monthlyWeek: e.target.value as any })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="first">첫 번째 주</option>
                      <option value="second">두 번째 주</option>
                      <option value="third">세 번째 주</option>
                      <option value="fourth">네 번째 주</option>
                      <option value="last">마지막 주</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      요일
                    </label>
                    <select
                      value={formData.monthlyWeekday}
                      onChange={(e) => setFormData({ ...formData, monthlyWeekday: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value={0}>일요일</option>
                      <option value={1}>월요일</option>
                      <option value={2}>화요일</option>
                      <option value={3}>수요일</option>
                      <option value={4}>목요일</option>
                      <option value={5}>금요일</option>
                      <option value={6}>토요일</option>
                    </select>
                  </div>
                </>
              )}
            </>
          )}

          {/* 공휴일 처리 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              공휴일 처리
            </label>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="holidayHandling"
                  value="before"
                  checked={formData.holidayHandling === 'before'}
                  onChange={(e) => setFormData({ ...formData, holidayHandling: e.target.value as 'before' | 'after' | 'show' })}
                  className="mr-2 text-blue-600"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">공휴일 이전으로 이동</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="holidayHandling"
                  value="after"
                  checked={formData.holidayHandling === 'after'}
                  onChange={(e) => setFormData({ ...formData, holidayHandling: e.target.value as 'before' | 'after' | 'show' })}
                  className="mr-2 text-blue-600"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">공휴일 이후로 이동</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="holidayHandling"
                  value="show"
                  checked={formData.holidayHandling === 'show'}
                  onChange={(e) => setFormData({ ...formData, holidayHandling: e.target.value as 'before' | 'after' | 'show' })}
                  className="mr-2 text-blue-600"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">공휴일날 표시</span>
              </label>
            </div>
          </div>

          {/* 예외 설정 */}
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
                    <option value="date">특정 날짜 제외</option>
                    <option value="weekday">특정 요일 제외</option>
                    <option value="week">특정 주차 제외</option>
                    <option value="month">특정 달 제외</option>
                    <option value="conflict">다른 템플릿과 중복</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => removeException(index)}
                    className="ml-2 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
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
                        className="text-blue-600 rounded focus:ring-blue-500"
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
                        className="text-blue-600 rounded focus:ring-blue-500"
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
                        className="text-blue-600 rounded focus:ring-blue-500"
                      />
                      <span className="text-xs">
                        {getWeekLabel(week)}
                      </span>
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
                        className="text-blue-600 rounded focus:ring-blue-500"
                      />
                      <span className="text-xs">{month}월</span>
                    </label>
                  ))}

                  {exception.type === 'conflict' && (
                    <div className="col-span-full space-y-3">
                      {((exception.values as ConflictException[]) || []).map((conflictException, conflictIndex) => (
                        <div key={conflictIndex} className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                              중복 예외 규칙 {conflictIndex + 1}
                            </span>
                            <button
                              type="button"
                              onClick={() => removeConflictException(index, conflictIndex)}
                              className="text-red-500 hover:text-red-700 p-1"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                          
                          <div className="space-y-3">
                            {/* 대상 템플릿 선택 */}
                            <div>
                              <label className="block text-xs font-medium text-blue-800 dark:text-blue-200 mb-1">
                                대상 템플릿
                              </label>
                              <select
                                value={conflictException.targetTemplateTitle}
                                onChange={(e) => updateConflictException(index, conflictIndex, 'targetTemplateTitle', e.target.value)}
                                className="w-full px-2 py-1 text-sm border border-blue-300 dark:border-blue-600 rounded focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 dark:text-white"
                              >
                                <option value="">템플릿 선택</option>
                                {recurringTemplates.map(t => (
                                  <option key={t.id} value={t.title}>
                                    {t.title}
                                  </option>
                                ))}
                              </select>
                            </div>
                            
                            {/* 중복 범위 선택 */}
                            <div>
                              <label className="block text-xs font-medium text-blue-800 dark:text-blue-200 mb-1">
                                중복 조건
                              </label>
                              <select
                                value={conflictException.scope}
                                onChange={(e) => updateConflictException(index, conflictIndex, 'scope', e.target.value)}
                                className="w-full px-2 py-1 text-sm border border-blue-300 dark:border-blue-600 rounded focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 dark:text-white"
                              >
                                <option value="same_date">같은 날짜 중복</option>
                                <option value="same_week">같은 주 중복</option>
                                <option value="same_month">같은 달 중복</option>
                              </select>
                            </div>
                          </div>
                          
                          {/* 설명 */}
                          <div className="mt-2 p-2 bg-blue-100 dark:bg-blue-800/30 rounded text-xs text-blue-700 dark:text-blue-300">
                            <strong>규칙:</strong> "{conflictException.targetTemplateTitle || '선택된 템플릿'}"이(가) {
                              conflictException.scope === 'same_date' ? '같은 날짜' : 
                              conflictException.scope === 'same_week' ? '같은 주' : '같은 달'
                            }에 있으면 이 템플릿의 해당 일정을 제외합니다.
                          </div>
                        </div>
                      ))}
                      
                      {/* 중복 예외 추가 버튼 */}
                      <button
                        type="button"
                        onClick={() => addConflictException(index)}
                        className="w-full py-2 px-3 text-sm border-2 border-dashed border-blue-300 dark:border-blue-600 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30 flex items-center justify-center gap-2"
                      >
                        <Plus className="w-4 h-4" />
                        중복 규칙 추가
                      </button>
                    </div>
                  )}
                </div>
                
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {exception.values.length > 0 && exception.type !== 'conflict' && (
                    <span>
                      선택된 {exception.type === 'date' ? '날짜' : 
                              exception.type === 'weekday' ? '요일' :
                              exception.type === 'week' ? '주차' : '월'}: {exception.values.join(', ')}
                    </span>
                  )}
                  {exception.type === 'conflict' && exception.values.length > 0 && (
                    <span>
                      설정된 중복 예외: {(exception.values as ConflictException[]).length}개
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* 버튼 */}
          <div className="flex gap-3 pt-4 mt-6 border-t">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-600 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
              disabled={isLoading}
            >
              취소
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              disabled={isLoading || !formData.title.trim()}
            >
              {isLoading ? '저장 중...' : '저장'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default AddRecurringModal