import { useState, useEffect } from 'react'
import { X, Calendar, Clock, Repeat, Flag, FolderPlus, FileText, Wand2, Minus, Plus } from 'lucide-react'
import { useTodos } from '../contexts/TodoContext'
import ProjectTemplateManager from './ProjectTemplateManager'
import { NaturalLanguageParser } from '../utils/naturalLanguageParser'
import type { Priority, RecurrenceType, TaskType, ProjectTemplate, WeeklyRecurrenceType, MonthlyRecurrenceType, HolidayHandling } from '../types/todo'
import type { RecurrenceException, ConflictException } from '../utils/simpleRecurring'
import { getWeekLabel, generateId } from '../utils/helpers'

interface AddTodoModalProps {
  isOpen: boolean
  onClose: () => void
}

const AddTodoModal = ({ isOpen, onClose }: AddTodoModalProps) => {
  const { addTodo, addRecurringTemplate, recurringTemplates } = useTodos()
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium' as Priority,
    type: 'simple' as TaskType,
    startDate: new Date().toISOString().split('T')[0], // 기본값으로 오늘 날짜 설정
    startTime: '',
    dueDate: '', // 기본값으로 빈칸 설정
    dueTime: '',
    recurrence: 'none' as RecurrenceType,
    // 기본 반복 설정 (호환성)
    recurrenceDay: 1, // 1=월요일, 7=일요일  
    recurrenceDate: 1, // 1-31, -1=말일
    holidayHandling: 'before' as HolidayHandling,
    // 고급 반복 설정
    weeklyRecurrenceType: 'every_week' as WeeklyRecurrenceType,
    monthlyRecurrenceType: 'by_date' as MonthlyRecurrenceType,
    weekOfMonth: 1, // 1=첫째주, 2=둘째주, 3=셋째주, 4=넷째주, -1=마지막주
    recurringEndDate: '', // 반복 종료일
    project: 'shortterm' as 'longterm' | 'shortterm',
    tags: [] as string[],
    // 예외 설정
    exceptions: [] as RecurrenceException[],
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isTemplateManagerOpen, setIsTemplateManagerOpen] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<ProjectTemplate | null>(null)
  const [naturalLanguageInput, setNaturalLanguageInput] = useState('')
  const [isNaturalLanguageMode, setIsNaturalLanguageMode] = useState(false)
  const [parsedPreview, setParsedPreview] = useState<any>(null)

  // 초기 폼 데이터 생성 함수
  const getInitialFormData = () => ({
    title: '',
    description: '',
    priority: 'medium' as Priority,
    type: 'simple' as TaskType,
    startDate: new Date().toISOString().split('T')[0], // 항상 오늘 날짜로 설정
    startTime: '',
    dueDate: '', // 항상 빈칸으로 설정
    dueTime: '',
    recurrence: 'none' as RecurrenceType,
    recurrenceDay: 1,
    recurrenceDate: 1,
    holidayHandling: 'before' as HolidayHandling,
    weeklyRecurrenceType: 'every_week' as WeeklyRecurrenceType,
    monthlyRecurrenceType: 'by_date' as MonthlyRecurrenceType,
    weekOfMonth: 1,
    recurringEndDate: '',
    project: 'shortterm' as 'longterm' | 'shortterm',
    tags: [] as string[],
    exceptions: [] as RecurrenceException[],
  })

  // 폼 초기화 함수
  const resetForm = () => {
    setFormData(getInitialFormData())
    setErrors({})
    setSelectedTemplate(null)
    setNaturalLanguageInput('')
    setIsNaturalLanguageMode(false)
    setParsedPreview(null)
  }

  // 모달이 열릴 때마다 폼 초기화
  useEffect(() => {
    if (isOpen) {
      resetForm()
    }
  }, [isOpen])

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    
    if (!formData.title.trim()) {
      newErrors.title = '할일 제목을 입력해주세요'
    }
    
    // 시작일과 마감일 비교
    if (formData.startDate && formData.dueDate) {
      const startDateTime = new Date(`${formData.startDate}T${formData.startTime || '00:00'}`)
      const dueDateTime = new Date(`${formData.dueDate}T${formData.dueTime || '23:59'}`)
      
      if (startDateTime >= dueDateTime) {
        newErrors.startDate = '시작일은 마감일보다 이전이어야 합니다'
      }
    }
    
    if (formData.dueDate && formData.dueTime) {
      const dueDateTime = new Date(`${formData.dueDate}T${formData.dueTime}`)
      if (dueDateTime < new Date()) {
        newErrors.dueDate = '마감일은 현재 시간보다 이후여야 합니다'
      }
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleTemplateSelect = (template: ProjectTemplate) => {
    setFormData({
      ...formData,
      title: template.name,
      description: template.description || '',
      type: 'project',
      priority: template.defaultPriority,
      project: template.category
    })
    setSelectedTemplate(template)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return

    // Firestore는 undefined 값을 허용하지 않으므로 모든 필드를 명시적으로 설정
    const todoData: any = {
      title: formData.title.trim(),
      description: formData.description.trim() || '',
      completed: false,
      priority: formData.priority,
      type: formData.type,
      tags: formData.tags || [],
      recurrence: formData.recurrence || 'none'
    }

    // 시작일 처리 - 기본값이 있으므로 항상 설정
    try {
      const startDateValue = formData.startDate || new Date().toISOString().split('T')[0]
      todoData.startDate = new Date(startDateValue)
      console.log('시작일 설정됨:', todoData.startDate, '(원본:', formData.startDate, ')')
    } catch (error) {
      console.error('시작일 파싱 오류:', error)
      throw new Error('시작일 형식이 올바르지 않습니다')
    }
    if (formData.startTime) {
      todoData.startTime = formData.startTime
      console.log('시작 시간 설정됨:', todoData.startTime)
    }
    // 마감일과 마감시간을 결합해서 완전한 DateTime 객체 생성
    if (formData.dueDate) {
      try {
        const dateStr = formData.dueDate
        const timeStr = formData.dueTime || '23:59' // 마감시간 없으면 입력한 날짜의 23:59로 설정
        const combinedDateTimeStr = `${dateStr}T${timeStr}:00`
        
        todoData.dueDate = new Date(combinedDateTimeStr)
        console.log(`마감일 설정: ${dateStr} ${timeStr} →`, todoData.dueDate)
        
        // dueTime은 별도 저장하지 않고 dueDate에 포함
        if (formData.dueTime) {
          console.log('마감시간이 dueDate에 포함됨:', formData.dueTime)
        }
      } catch (error) {
        console.error('마감일 파싱 오류:', error)
        throw new Error(`마감일 형식이 올바르지 않습니다: ${formData.dueDate} ${formData.dueTime || ''}`)
      }
    }
    if (formData.recurrence && formData.recurrence !== 'none') {
      todoData.recurrence = formData.recurrence
      if (formData.recurrence === 'weekly') {
        todoData.recurrenceDay = formData.recurrenceDay
      } else if (formData.recurrence === 'monthly') {
        todoData.recurrenceDate = formData.recurrenceDate
      }
      todoData.holidayHandling = formData.holidayHandling
    }
    if (formData.type === 'project') {
      todoData.project = formData.project
      
      // 템플릿이 선택된 경우 템플릿의 하위 작업들을 추가
      if (selectedTemplate && selectedTemplate.subTasks.length > 0) {
        todoData.subTasks = selectedTemplate.subTasks.map(subTask => {
          const subTaskData: any = {
            id: generateId(),
            title: subTask.title,
            description: subTask.description || '',
            completed: false,
            priority: subTask.priority,
            createdAt: new Date(),
            updatedAt: new Date()
          }
          
          // dueDate가 있는 경우에만 추가 (undefined 방지)
          if (subTask.dueDate) {
            subTaskData.dueDate = new Date(subTask.dueDate)
          }
          
          return subTaskData
        })
      } else {
        todoData.subTasks = []
      }
    }
    if (selectedTemplate?.id) {
      todoData.templateId = selectedTemplate.id
    }

    // 반복 할일인지 확인하여 처리
    if (formData.recurrence !== 'none') {
      // 간소화된 반복 템플릿 생성
      const recurringTemplate: any = {
        title: todoData.title,
        description: todoData.description,
        priority: todoData.priority,
        type: todoData.type,
        recurrenceType: formData.recurrence as 'weekly' | 'monthly',
        isActive: true,
        tags: todoData.tags || [],
        exceptions: formData.exceptions,
        holidayHandling: formData.holidayHandling
      }
      
      // 주간 반복 설정
      if (formData.recurrence === 'weekly') {
        recurringTemplate.weekday = formData.recurrenceDay === 7 ? 0 : formData.recurrenceDay
      }
      
      // 월간 반복 설정
      if (formData.recurrence === 'monthly') {
        // 날짜별 반복 vs 요일별 반복 구분
        if (formData.monthlyRecurrenceType === 'by_date') {
          recurringTemplate.monthlyPattern = 'date'
          recurringTemplate.monthlyDate = formData.recurrenceDate
        } else if (formData.monthlyRecurrenceType === 'by_weekday') {
          recurringTemplate.monthlyPattern = 'weekday'
          recurringTemplate.monthlyWeek = formData.weekOfMonth === 1 ? 'first' :
                                         formData.weekOfMonth === 2 ? 'second' :
                                         formData.weekOfMonth === 3 ? 'third' :
                                         formData.weekOfMonth === 4 ? 'fourth' : 'last'
          recurringTemplate.monthlyWeekday = formData.recurrenceDay === 7 ? 0 : formData.recurrenceDay
        }
      }
      
      console.log('Creating recurring template:', recurringTemplate)
      
      try {
        // 반복 템플릿 추가 (자동으로 인스턴스 생성됨)
        await addRecurringTemplate(recurringTemplate)
        console.log('반복 템플릿 추가 성공')
      } catch (error) {
        console.error('반복 템플릿 추가 실패:', error)
        throw error
      }
    } else {
      // completedAt 필드 추가 (Firestore에서는 undefined 지원하지 않으므로 제거)
      // todoData.completedAt = undefined
      
      console.log('=== 할일 추가 시도 ===')
      console.log('formData.startDate:', formData.startDate)
      console.log('일반 할일 추가 시도:', todoData)
      console.log('템플릿 사용 여부:', !!selectedTemplate)
      if (selectedTemplate) {
        console.log('사용된 템플릿:', selectedTemplate.name)
        console.log('템플릿 하위 작업 수:', selectedTemplate.subTasks.length)
        console.log('todoData 하위 작업 수:', todoData.subTasks?.length || 0)
      }
      
      try {
        // 일반 할일 추가 직전 최종 데이터 확인
        console.log('🔥 addTodo 호출 직전 최종 todoData:', JSON.stringify(todoData, null, 2))
        console.log('🔥 todoData.startDate 타입:', typeof todoData.startDate)
        console.log('🔥 todoData.startDate 값:', todoData.startDate)
        
        // 일반 할일 추가
        await addTodo(todoData)
        console.log('일반 할일 추가 성공')
      } catch (error) {
        console.error('일반 할일 추가 실패:', error)
        throw error
      }
    }
    
    // 템플릿에서 하위 작업 추가는 이미 todoData에 포함되어 있음 (147-165번째 줄에서 처리)
    console.log('템플릿 처리 완료:', selectedTemplate ? `템플릿: ${selectedTemplate.name}` : '템플릿 없음')
    
    // 폼 초기화 및 모달 닫기
    resetForm()
    onClose()
  }

  const handleChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const handleNaturalLanguageChange = (value: string) => {
    setNaturalLanguageInput(value)
    
    if (value.trim()) {
      const parsed = NaturalLanguageParser.parse(value)
      setParsedPreview(parsed)
      
      // 파싱 결과를 폼 데이터에 자동 적용
      setFormData(prev => ({
        ...prev,
        title: parsed.title,
        startDate: parsed.startDate ? parsed.startDate.toISOString().split('T')[0] : '',
        startTime: parsed.startTime || '',
        dueDate: parsed.dueDate ? parsed.dueDate.toISOString().split('T')[0] : '',
        dueTime: parsed.dueTime || '', // 시간이 명시되지 않으면 빈 문자열
        priority: parsed.priority || prev.priority,
        recurrence: parsed.recurrence || 'none',
        recurrenceDay: parsed.recurrenceDay || prev.recurrenceDay,
        tags: parsed.tags || [],
      }))
    } else {
      setParsedPreview(null)
    }
  }

  const applyParsedData = () => {
    if (parsedPreview) {
      setFormData(prev => ({
        ...prev,
        title: parsedPreview.title,
        startDate: parsedPreview.startDate ? parsedPreview.startDate.toISOString().split('T')[0] : '',
        startTime: parsedPreview.startTime || '',
        dueDate: parsedPreview.dueDate ? parsedPreview.dueDate.toISOString().split('T')[0] : '',
        dueTime: parsedPreview.dueTime || '',
        priority: parsedPreview.priority || prev.priority,
        recurrence: parsedPreview.recurrence || 'none',
        recurrenceDay: parsedPreview.recurrenceDay || prev.recurrenceDay,
      }))
      setIsNaturalLanguageMode(false)
    }
  }

  const toggleInputMode = () => {
    setIsNaturalLanguageMode(!isNaturalLanguageMode)
    if (isNaturalLanguageMode && naturalLanguageInput) {
      applyParsedData()
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

  const updateExceptionValues = (index: number, values: number[] | string[] | ConflictException[]) => {
    setFormData(prev => ({
      ...prev,
      exceptions: prev.exceptions.map((exception, i) => 
        i === index ? { ...exception, values } : exception
      )
    }))
  }

  // 충돌 예외 추가
  const addConflictException = (exceptionIndex: number) => {
    const currentException = formData.exceptions[exceptionIndex]
    const currentExceptions = (currentException.values as ConflictException[]) || []
    const newException: ConflictException = {
      targetTemplateTitle: '',
      scope: 'same_week'
    }
    updateExceptionValues(exceptionIndex, [...currentExceptions, newException])
  }
  
  // 충돌 예외 제거
  const removeConflictException = (exceptionIndex: number, conflictIndex: number) => {
    const currentException = formData.exceptions[exceptionIndex]
    const currentExceptions = (currentException.values as ConflictException[]) || []
    updateExceptionValues(exceptionIndex, currentExceptions.filter((_, i) => i !== conflictIndex))
  }
  
  // 충돌 예외 업데이트
  const updateConflictException = (exceptionIndex: number, conflictIndex: number, field: keyof ConflictException, value: any) => {
    const currentException = formData.exceptions[exceptionIndex]
    const currentExceptions = (currentException.values as ConflictException[]) || []
    const updatedExceptions = currentExceptions.map((conflictException, i) => 
      i === conflictIndex ? { ...conflictException, [field]: value } : conflictException
    )
    updateExceptionValues(exceptionIndex, updatedExceptions)
  }

  if (!isOpen) return null

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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="add-todo-modal">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            새 할일 추가
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-6">
            {/* 자연어 입력 모드 토글 */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">할일 추가</h3>
              <button
                type="button"
                onClick={toggleInputMode}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isNaturalLanguageMode 
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300' 
                    : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                }`}
              >
                <Wand2 className="w-4 h-4" />
                {isNaturalLanguageMode ? '자연어 모드' : '상세 입력 모드'}
              </button>
            </div>

            {/* 자연어 입력 */}
            {isNaturalLanguageMode ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <Wand2 className="w-4 h-4 inline mr-1" />
                  자연어로 할일 입력
                </label>
                <textarea
                  value={naturalLanguageInput}
                  onChange={(e) => handleNaturalLanguageChange(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  placeholder="예: 회의 준비 내일 오후 2시 긴급&#10;보고서 작성 금요일까지 #업무&#10;운동하기 매일 오전 7시"
                />
                
                {/* 파싱 미리보기 */}
                {parsedPreview && (
                  <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
                    <h4 className="text-sm font-medium text-blue-900 dark:text-blue-200 mb-2">파싱 결과:</h4>
                    <div className="space-y-1 text-sm">
                      <div><strong>제목:</strong> {parsedPreview.title}</div>
                      {parsedPreview.startDate && (
                        <div><strong>시작일:</strong> {parsedPreview.startDate.toLocaleDateString('ko-KR')}</div>
                      )}
                      {parsedPreview.startTime && (
                        <div><strong>시작시간:</strong> {parsedPreview.startTime}</div>
                      )}
                      {parsedPreview.dueDate && (
                        <div><strong>마감일:</strong> {parsedPreview.dueDate.toLocaleDateString('ko-KR')}</div>
                      )}
                      {parsedPreview.dueTime && (
                        <div><strong>마감시간:</strong> {parsedPreview.dueTime}</div>
                      )}
                      {parsedPreview.priority && (
                        <div><strong>우선순위:</strong> {parsedPreview.priority}</div>
                      )}
                      {parsedPreview.recurrence && parsedPreview.recurrence !== 'none' && (
                        <div><strong>반복:</strong> {parsedPreview.recurrence}
                          {parsedPreview.recurrenceDay && parsedPreview.recurrence === 'weekly' && (
                            <span> - {['일', '월', '화', '수', '목', '금', '토', '일'][parsedPreview.recurrenceDay]}요일</span>
                          )}
                        </div>
                      )}
                      {parsedPreview.tags && parsedPreview.tags.length > 0 && (
                        <div><strong>태그:</strong> {parsedPreview.tags.join(', ')}</div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={applyParsedData}
                      className="mt-2 text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400"
                    >
                      상세 설정으로 전환 →
                    </button>
                  </div>
                )}

                {/* 예시 */}
                <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  <strong>예시:</strong> {NaturalLanguageParser.getExamples().slice(0, 2).join(' • ')}
                </div>
              </div>
            ) : (
              /* 기존 상세 입력 폼 */
              <>
                {/* 제목 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    할일 제목 *
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => handleChange('title', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                    placeholder="할일을 입력하세요"
                  />
                  {errors.title && <p className="mt-1 text-sm text-red-600">{errors.title}</p>}
                </div>
              </>
            )}

            {!isNaturalLanguageMode && (
              <>
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
                    placeholder="할일에 대한 설명을 입력하세요"
                  />
                </div>
              </>
            )}

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

            {/* 프로젝트 타입 선택 */}
            {formData.type === 'project' && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    프로젝트 구분
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsTemplateManagerOpen(true)}
                    className="flex items-center gap-1 px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700"
                  >
                    <FileText className="w-4 h-4" />
                    템플릿 사용
                  </button>
                </div>
                
                {selectedTemplate && (
                  <div className="mb-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-blue-900 dark:text-blue-200">
                          템플릿: {selectedTemplate.name}
                        </p>
                        <p className="text-xs text-blue-600 dark:text-blue-300">
                          {selectedTemplate.subTasks.length}개의 하위 작업 포함
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedTemplate(null)}
                        className="text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-800 rounded p-1"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
                
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

            {/* 시작일과 시간 */}
            <div className="grid grid-cols-2 gap-2 sm:gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  시작일
                </label>
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => handleChange('startDate', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
                {errors.startDate && <p className="mt-1 text-sm text-red-600">{errors.startDate}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <Clock className="w-4 h-4 inline mr-1" />
                  시작시간
                </label>
                <input
                  type="time"
                  value={formData.startTime}
                  onChange={(e) => handleChange('startTime', e.target.value)}
                  disabled={!formData.startDate}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
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
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="by_date"
                        checked={formData.monthlyRecurrenceType === 'by_date'}
                        onChange={(e) => handleChange('monthlyRecurrenceType', e.target.value)}
                        className="mr-2"
                      />
                      날짜별 (매월 같은 날짜)
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="by_weekday"
                        checked={formData.monthlyRecurrenceType === 'by_weekday'}
                        onChange={(e) => handleChange('monthlyRecurrenceType', e.target.value)}
                        className="mr-2"
                      />
                      요일별 (매월 n번째 주 특정 요일)
                    </label>
                  </div>
                </div>

                {/* 날짜별 반복 설정 */}
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
                      {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                        <option key={day} value={day}>{day}일</option>
                      ))}
                      <option value={-1}>말일</option>
                    </select>
                  </div>
                )}

                {/* 요일별 반복 설정 */}
                {formData.monthlyRecurrenceType === 'by_weekday' && (
                  <div className="grid grid-cols-2 gap-2 sm:gap-4">
                    {/* 주차 선택 */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        주차
                      </label>
                      <select
                        value={formData.weekOfMonth}
                        onChange={(e) => handleChange('weekOfMonth', parseInt(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                      >
                        <option value={1}>첫째 주</option>
                        <option value={2}>둘째 주</option>
                        <option value={3}>셋째 주</option>
                        <option value={4}>넷째 주</option>
                        <option value={-1}>마지막 주</option>
                      </select>
                    </div>
                    
                    {/* 요일 선택 */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        요일
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

            {/* 예외 설정 */}
            {formData.recurrence !== 'none' && (
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
                        <option value="conflict">다른 템플릿과 중복</option>
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
                            className="text-sm"
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
                                    {recurringTemplates.map(template => (
                                      <option key={template.id} value={template.title}>
                                        {template.title}
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
                          
                          {/* 충돌 예외 추가 버튼 */}
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
            )}

            {/* 공휴일 처리 */}
            {formData.recurrence !== 'none' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  공휴일 처리
                </label>
                <div className="flex space-x-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="before"
                      checked={formData.holidayHandling === 'before'}
                      onChange={(e) => handleChange('holidayHandling', e.target.value)}
                      className="mr-2"
                    />
                    전날로 이동
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="after"
                      checked={formData.holidayHandling === 'after'}
                      onChange={(e) => handleChange('holidayHandling', e.target.value)}
                      className="mr-2"
                    />
                    다음날로 이동
                  </label>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end space-x-3 mt-8">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
            >
              취소
            </button>
            <button
              type="submit"
              className="btn-primary"
            >
              추가하기
            </button>
          </div>
        </form>
      </div>
      
      <ProjectTemplateManager
        isOpen={isTemplateManagerOpen}
        onClose={() => setIsTemplateManagerOpen(false)}
        onSelectTemplate={handleTemplateSelect}
      />
    </div>
  )
}

export default AddTodoModal