import { useState, useEffect, useRef } from 'react'
import { Calendar, Clock, Tag, Flag, Plus, Briefcase, Layers, ChevronDown, ChevronUp, Trash2, FileText, FolderPlus, X } from 'lucide-react'
import { format, addDays } from 'date-fns'
import { useTodos } from '../contexts/TodoContext'
import { useAuth } from '../contexts/AuthContext'
import { firestoreService } from '../services/firestoreService'
import ProjectTemplateManager from './ProjectTemplateManager'
import type { Priority, RecurrenceType, TaskType, ProjectTemplate } from '../types/todo'
import { useTranslation } from 'react-i18next'

interface StandardTodoFormProps {
    onCancel: () => void
    onSuccess: () => void
    initialDate?: Date
    preselectedTemplate?: ProjectTemplate | null
}

const StandardTodoForm = ({ onCancel, onSuccess, initialDate, preselectedTemplate }: StandardTodoFormProps) => {
    const { t } = useTranslation()
    const { addTodo, allTags } = useTodos()
    const { currentUser } = useAuth()
    const [text, setText] = useState('')
    const [showTagInput, setShowTagInput] = useState(false)
    const [newTag, setNewTag] = useState('')
    const [isNaturalLanguageMode, setIsNaturalLanguageMode] = useState(true)

    // 템플릿 관련 상태
    const [templates, setTemplates] = useState<ProjectTemplate[]>([])
    const [selectedTemplateId, setSelectedTemplateId] = useState<string>('')
    const [isTemplateManagerOpen, setIsTemplateManagerOpen] = useState(false)

    const initialFormState = {
        startDate: format(initialDate || new Date(), 'yyyy-MM-dd'),
        startTime: '',
        dueDate: '',
        dueTime: '',
        priority: 'medium' as Priority,
        tags: [] as string[],

        showStartTime: false,
        showDueDate: false,
        type: 'simple' as TaskType,
        projectCategory: 'shortterm' as 'longterm' | 'shortterm',
        subTasks: [] as { id: string, title: string }[],
        description: ''
    }

    const [formData, setFormData] = useState(initialFormState)
    const [errors, setErrors] = useState<Record<string, string>>({})
    const [newSubTaskTitle, setNewSubTaskTitle] = useState('')
    const inputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        if (inputRef.current) {
            inputRef.current.focus()
        }
        setFormData(prev => ({
            ...prev,
            startDate: format(initialDate || new Date(), 'yyyy-MM-dd')
        }))
    }, [initialDate])

    // 프로젝트 템플릿 로드
    useEffect(() => {
        if (!currentUser?.uid) return

        const unsubscribe = firestoreService.subscribeProjectTemplates(
            currentUser.uid,
            (loadedTemplates) => {
                setTemplates(loadedTemplates)
            }
        )

        return () => unsubscribe()
    }, [currentUser?.uid])

    // Handle preselected template from prop
    useEffect(() => {
        if (preselectedTemplate) {
            handleTemplateSelect(preselectedTemplate)
        }
    }, [preselectedTemplate])

    const handleTemplateSelect = (templateId: string | ProjectTemplate) => {
        let template: ProjectTemplate | undefined

        if (typeof templateId === 'string') {
            if (!templateId) {
                setSelectedTemplateId('')
                return
            }
            template = templates.find(t => t.id === templateId)
        } else {
            template = templateId
        }

        if (template) {
            setSelectedTemplateId(template.id)
            setText(template.name)
            setFormData(prev => ({
                ...prev,
                type: 'project',
                projectCategory: template!.category,
                priority: template!.defaultPriority,
                tags: [...prev.tags, ...(template!.tags || [])],
                subTasks: template!.subTasks.map(st => ({
                    id: crypto.randomUUID(),
                    title: st.title
                })),
                description: template!.description || ''
            }))
        }
    }

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

    const handleAddSubTask = () => {
        if (!newSubTaskTitle.trim()) return
        const newSubTask = {
            id: crypto.randomUUID(),
            title: newSubTaskTitle.trim()
        }
        handleChange('subTasks', [...formData.subTasks, newSubTask])
        setNewSubTaskTitle('')
    }

    const removeSubTask = (id: string) => {
        handleChange('subTasks', formData.subTasks.filter(st => st.id !== id))
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
        if (input.includes('!긴급')) priority = 'urgent'
        else if (input.includes('!높음')) priority = 'high'
        else if (input.includes('!낮음')) priority = 'low'

        // 태그 파싱 (#태그)
        const tagMatch = input.match(/#(\S+)/g)
        if (tagMatch) {
            tags = tagMatch.map(t => t.slice(1))
        }

        return {
            startDate: format(date, 'yyyy-MM-dd'),
            startTime: time,
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
            title: text,
            completed: false,
            recurrence: 'none' as RecurrenceType,
            ...formData,
            startDate: new Date(`${formData.startDate}T${formData.startTime || '00:00'}`),
            dueDate: formData.showDueDate && formData.dueDate ? new Date(`${formData.dueDate}T${formData.dueTime || '23:59'}`) : undefined,
            project: formData.type === 'project' ? formData.projectCategory : undefined,
            subTasks: formData.type === 'project' ? formData.subTasks.map(st => ({
                ...st,
                completed: false,
                priority: 'medium' as Priority,
                createdAt: new Date(),
                updatedAt: new Date()
            })) : undefined
        }

        addTodo(todoData)
        onSuccess()
        setText('')
        setFormData(initialFormState)
    }

    return (
        <>
            <form onSubmit={handleSubmit} className="space-y-6">
                {/* 제목 */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        <FileText className="w-4 h-4 inline mr-1" />
                        {t('modal.addTodo.taskTitle')} *
                    </label>
                    <div className="relative">
                        <input
                            ref={inputRef}
                            type="text"
                            value={text}
                            onChange={(e) => {
                                setText(e.target.value)
                                if (isNaturalLanguageMode && formData.type === 'simple') {
                                    const parsed = parseNaturalLanguage(e.target.value)
                                    setFormData(prev => ({ ...prev, ...parsed }))
                                }
                            }}
                            placeholder={isNaturalLanguageMode && formData.type === 'simple' ? t('modal.addTodo.naturalLanguageHint') : t('modal.addTodo.placeholder')}
                            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white ${errors.text ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                                }`}
                        />
                        {formData.type === 'simple' && (
                            <button
                                type="button"
                                onClick={() => setIsNaturalLanguageMode(!isNaturalLanguageMode)}
                                className={`absolute right-2 top-1/2 -translate-y-1/2 text-xs px-2 py-1 rounded-md transition-colors ${isNaturalLanguageMode
                                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                                    : 'bg-gray-100 text-gray-500 dark:bg-gray-600 dark:text-gray-400'
                                    }`}
                            >
                                {isNaturalLanguageMode ? '✨ ON' : 'OFF'}
                            </button>
                        )}
                    </div>
                    {errors.text && (
                        <p className="mt-1 text-sm text-red-600">{errors.text}</p>
                    )}
                </div>

                {/* 설명 */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        {t('modal.addTodo.description')}
                    </label>
                    <textarea
                        value={formData.description}
                        onChange={(e) => handleChange('description', e.target.value)}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white resize-none"
                        placeholder={t('modal.addTodo.descPlaceholder')}
                    />
                </div>

                {/* 유형과 우선순위 */}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            <FolderPlus className="w-4 h-4 inline mr-1" />
                            {t('modal.addTodo.type')}
                        </label>
                        <select
                            value={formData.type}
                            onChange={(e) => handleChange('type', e.target.value as TaskType)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                        >
                            <option value="simple">{t('modal.addTodo.simpleTask')}</option>
                            <option value="project">{t('modal.addTodo.project')}</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            <Flag className="w-4 h-4 inline mr-1" />
                            {t('modal.addTodo.priority')}
                        </label>
                        <select
                            value={formData.priority}
                            onChange={(e) => handleChange('priority', e.target.value as Priority)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                        >
                            <option value="low">{t('modal.addTodo.low')}</option>
                            <option value="medium">{t('modal.addTodo.medium')}</option>
                            <option value="high">{t('modal.addTodo.high')}</option>
                            <option value="urgent">{t('modal.addTodo.urgent')}</option>
                        </select>
                    </div>
                </div>

                {/* 프로젝트 설정 (프로젝트 타입일 때만) */}
                {formData.type === 'project' && (
                    <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-700/30 rounded-xl border border-gray-200 dark:border-gray-700 animate-fadeIn">
                        <div className="flex items-center justify-between">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                {t('modal.addTodo.projectCategory')}
                            </label>
                            <button
                                type="button"
                                onClick={() => setIsTemplateManagerOpen(true)}
                                className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 font-medium flex items-center gap-1"
                            >
                                <Briefcase className="w-3 h-3" />
                                {t('modal.addTodo.manageTemplates')}
                            </button>
                        </div>

                        {/* 템플릿 선택 */}
                        {templates.length > 0 && (
                            <select
                                value={selectedTemplateId}
                                onChange={(e) => handleTemplateSelect(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 dark:text-white"
                            >
                                <option value="">{t('modal.addTodo.noTemplate')}</option>
                                {templates.map(template => (
                                    <option key={template.id} value={template.id}>
                                        {template.name} ({template.subTasks.length}개 하위작업)
                                    </option>
                                ))}
                            </select>
                        )}

                        <div className="flex space-x-4">
                            <label className="flex items-center">
                                <input
                                    type="radio"
                                    value="shortterm"
                                    checked={formData.projectCategory === 'shortterm'}
                                    onChange={(e) => handleChange('projectCategory', e.target.value)}
                                    className="mr-2"
                                />
                                <span className="text-sm text-gray-700 dark:text-gray-300">{t('modal.addTodo.shortTerm')}</span>
                            </label>
                            <label className="flex items-center">
                                <input
                                    type="radio"
                                    value="longterm"
                                    checked={formData.projectCategory === 'longterm'}
                                    onChange={(e) => handleChange('projectCategory', e.target.value)}
                                    className="mr-2"
                                />
                                <span className="text-sm text-gray-700 dark:text-gray-300">{t('modal.addTodo.longTerm')}</span>
                            </label>
                        </div>

                        {/* 하위 작업 관리 */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                <Layers className="w-4 h-4 inline mr-1" />
                                {t('modal.addTodo.subtasks')} ({formData.subTasks.length})
                            </label>
                            <div className="space-y-2 mb-2">
                                {formData.subTasks.map((st, index) => (
                                    <div key={st.id} className="flex items-center gap-2 bg-white dark:bg-gray-800 p-2 rounded-lg border border-gray-200 dark:border-gray-700">
                                        <span className="text-xs text-gray-500 font-mono">{index + 1}</span>
                                        <span className="flex-1 text-sm text-gray-700 dark:text-gray-300">{st.title}</span>
                                        <button
                                            type="button"
                                            onClick={() => removeSubTask(st.id)}
                                            className="text-red-400 hover:text-red-600"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={newSubTaskTitle}
                                    onChange={(e) => setNewSubTaskTitle(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddSubTask())}
                                    placeholder={t('modal.addTodo.addSubtaskPlaceholder')}
                                    className="flex-1 px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                />
                                <button
                                    type="button"
                                    onClick={handleAddSubTask}
                                    className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                >
                                    {t('common.add')}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* 시작 날짜 및 시간 */}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            <Calendar className="w-4 h-4 inline mr-1" />
                            {t('modal.addTodo.startDate')}
                        </label>
                        <input
                            type="date"
                            value={formData.startDate}
                            onChange={(e) => handleChange('startDate', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            <Clock className="w-4 h-4 inline mr-1" />
                            {t('modal.addTodo.startTime')}
                        </label>
                        <input
                            type="time"
                            value={formData.startTime}
                            onChange={(e) => handleChange('startTime', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                        />
                    </div>
                </div>

                {/* 마감 날짜 및 시간 */}
                <div className="border-t border-gray-100 dark:border-gray-700 pt-4">
                    <button
                        type="button"
                        onClick={() => handleChange('showDueDate', !formData.showDueDate)}
                        className="flex items-center text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors mb-2"
                    >
                        {formData.showDueDate ? <ChevronUp className="w-4 h-4 mr-1" /> : <ChevronDown className="w-4 h-4 mr-1" />}
                        {formData.showDueDate ? t('modal.addTodo.hideDueDate') : t('modal.addTodo.showDueDate')}
                    </button>

                    {formData.showDueDate && (
                        <div className="grid grid-cols-2 gap-4 animate-fadeIn">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    {t('modal.addTodo.dueDate')}
                                </label>
                                <input
                                    type="date"
                                    value={formData.dueDate}
                                    onChange={(e) => handleChange('dueDate', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    {t('modal.addTodo.dueTime')}
                                </label>
                                <input
                                    type="time"
                                    value={formData.dueTime}
                                    onChange={(e) => handleChange('dueTime', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* 태그 */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        <Tag className="w-4 h-4 inline mr-1" />
                        {t('modal.addTodo.tags')}
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
                            {t('modal.addTodo.addTag')}
                        </button>
                    </div>
                    {showTagInput && (
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={newTag}
                                onChange={(e) => setNewTag(e.target.value)}
                                placeholder={t('modal.addTodo.newTagPlaceholder')}
                                className="flex-1 px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                            />
                            <button
                                type="button"
                                onClick={handleAddTag}
                                className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                            >
                                {t('common.add')}
                            </button>
                        </div>
                    )}
                </div>

                {/* 하단 버튼 */}
                <div className="flex justify-end space-x-3 mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    >
                        {t('common.cancel')}
                    </button>
                    <button
                        type="submit"
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        {t('modal.addTodo.submit')}
                    </button>
                </div>
            </form>

            <ProjectTemplateManager
                isOpen={isTemplateManagerOpen}
                onClose={() => setIsTemplateManagerOpen(false)}
                onSelectTemplate={handleTemplateSelect}
            />
        </>
    )
}

export default StandardTodoForm
