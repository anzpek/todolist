import { useState } from 'react'
import { X, Plus, Minus, Flag, Repeat, Calendar, Trash2 } from 'lucide-react'
import { useTodos } from '../contexts/TodoContext'
import type { SimpleRecurringTemplate, RecurrenceException, ConflictException } from '../utils/simpleRecurring'
import { getWeekLabel } from '../utils/helpers'
import { useTranslation } from 'react-i18next'

interface RecurringTodoFormProps {
    onCancel: () => void
    onSuccess: () => void
}

const RecurringTodoForm = ({ onCancel, onSuccess }: RecurringTodoFormProps) => {
    const { addRecurringTemplate, recurringTemplates } = useTodos()
    const { t } = useTranslation()
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
        holidayHandling: 'show' as 'before' | 'after' | 'show'
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
        { value: 0, label: t('days.sunday') },
        { value: 1, label: t('days.monday') },
        { value: 2, label: t('days.tuesday') },
        { value: 3, label: t('days.wednesday') },
        { value: 4, label: t('days.thursday') },
        { value: 5, label: t('days.friday') },
        { value: 6, label: t('days.saturday') }
    ]

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!formData.title.trim()) return

        setIsLoading(true)

        try {
            const templateData: Omit<SimpleRecurringTemplate, 'id' | 'createdAt' | 'updatedAt'> = {
                title: formData.title.trim(),
                description: formData.description.trim() || undefined,
                priority: formData.priority,
                type: formData.type,
                recurrenceType: formData.recurrenceType,
                isActive: true,
                tags: formData.tags,
                exceptions: formData.exceptions,
                holidayHandling: formData.holidayHandling
            }

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

            await addRecurringTemplate(templateData)
            onSuccess()

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
                holidayHandling: 'show' as 'before' | 'after' | 'show'
            })
        } catch (error) {
            console.error('반복 템플릿 추가 실패:', error)
            alert(t('common.error'))
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <form
            onSubmit={handleSubmit}
            className="space-y-6"
        >
            <div className="space-y-6">
                {/* 제목 */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        {t('recurring.form.title')}
                    </label>
                    <input
                        type="text"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        placeholder={t('modal.addTodo.placeholder')}
                        className="w-full text-lg px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border-0 rounded-xl focus:ring-2 focus:ring-blue-500 placeholder-gray-400 dark:text-white"
                        required
                    />
                </div>

                {/* 설명 */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        {t('recurring.form.description')}
                    </label>
                    <textarea
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder={t('modal.addTodo.descPlaceholder')}
                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border-0 rounded-xl focus:ring-2 focus:ring-blue-500 placeholder-gray-400 dark:text-white resize-none"
                        rows={2}
                    />
                </div>

                {/* 우선순위 선택 (4단계) */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        <Flag className="w-4 h-4 inline mr-1" />
                        {t('recurring.form.priority')}
                    </label>
                    <div className="flex gap-2">
                        {[
                            { value: 'urgent', label: t('modal.addTodo.urgent'), color: 'text-red-700 bg-red-100 dark:bg-red-900/40 border-red-200 dark:border-red-800' },
                            { value: 'high', label: t('modal.addTodo.high'), color: 'text-orange-700 bg-orange-100 dark:bg-orange-900/40 border-orange-200 dark:border-orange-800' },
                            { value: 'medium', label: t('modal.addTodo.medium'), color: 'text-yellow-700 bg-yellow-100 dark:bg-yellow-900/40 border-yellow-200 dark:border-yellow-800' },
                            { value: 'low', label: t('modal.addTodo.low'), color: 'text-green-700 bg-green-100 dark:bg-green-900/40 border-green-200 dark:border-green-800' }
                        ].map(priority => (
                            <label
                                key={priority.value}
                                className={`flex-1 flex items-center justify-center p-2 rounded-lg cursor-pointer transition-all border ${formData.priority === priority.value
                                    ? `ring-2 ring-offset-1 ring-blue-500 ${priority.color} font-bold`
                                    : 'bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-400 border-transparent hover:bg-gray-100 dark:hover:bg-gray-700'
                                    }`}
                            >
                                <input
                                    type="radio"
                                    name="priority"
                                    value={priority.value}
                                    checked={formData.priority === priority.value}
                                    onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                                    className="sr-only"
                                />
                                <span className="text-sm">{priority.label}</span>
                            </label>
                        ))}
                    </div>
                </div>

                {/* 반복 주기 */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        <Repeat className="w-4 h-4 inline mr-1" />
                        {t('recurring.form.recurrenceType')}
                    </label>
                    <select
                        value={formData.recurrenceType}
                        onChange={(e) => setFormData({ ...formData, recurrenceType: e.target.value as any })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                    >
                        <option value="daily">{t('recurring.form.daily')}</option>
                        <option value="weekly">{t('recurring.form.weekly')}</option>
                        <option value="monthly">{t('recurring.form.monthly')}</option>
                    </select>
                </div>

                {/* 주간 반복 설정 */}
                {formData.recurrenceType === 'weekly' && (
                    <div className="animate-fadeIn">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            {t('recurring.form.selectWeekday')}
                        </label>
                        <div className="flex gap-2 overflow-x-auto pb-2">
                            {weekdays.map(day => (
                                <button
                                    key={day.value}
                                    type="button"
                                    onClick={() => setFormData({ ...formData, weekday: day.value })}
                                    className={`flex-1 min-w-[60px] py-2 rounded-lg text-sm font-medium transition-colors ${formData.weekday === day.value
                                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 ring-2 ring-blue-500'
                                        : 'bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                                        }`}
                                >
                                    {day.label}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* 월간 반복 설정 */}
                {formData.recurrenceType === 'monthly' && (
                    <div className="space-y-4 animate-fadeIn">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                {t('recurring.form.monthlyPattern')}
                            </label>
                            <div className="flex gap-4">
                                <label className="flex items-center p-3 rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors flex-1">
                                    <input
                                        type="radio"
                                        checked={formData.monthlyPattern === 'date'}
                                        onChange={() => setFormData({ ...formData, monthlyPattern: 'date' })}
                                        className="mr-3 w-4 h-4 text-blue-600"
                                    />
                                    <span className="text-sm text-gray-700 dark:text-gray-300">{t('recurring.form.byDate')}</span>
                                </label>
                                <label className="flex items-center p-3 rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors flex-1">
                                    <input
                                        type="radio"
                                        checked={formData.monthlyPattern === 'weekday'}
                                        onChange={() => setFormData({ ...formData, monthlyPattern: 'weekday' })}
                                        className="mr-3 w-4 h-4 text-blue-600"
                                    />
                                    <span className="text-sm text-gray-700 dark:text-gray-300">{t('recurring.form.byWeekday')}</span>
                                </label>
                            </div>
                        </div>

                        {formData.monthlyPattern === 'date' && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    {t('recurring.form.selectDate')}
                                </label>
                                <select
                                    value={formData.monthlyDate}
                                    onChange={(e) => setFormData({ ...formData, monthlyDate: parseInt(e.target.value) })}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                                >
                                    {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                                        <option key={day} value={day}>{day}{t('calendar.daySuffix', { defaultValue: '' })}</option>
                                    ))}
                                    <option value={-1}>{t('recurring.form.lastDay')}</option>
                                    <option value={-2}>{t('recurring.form.firstWorkDay')}</option>
                                    <option value={-3}>{t('recurring.form.lastWorkDay')}</option>
                                </select>
                            </div>
                        )}

                        {formData.monthlyPattern === 'weekday' && (
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        {t('recurring.form.week')}
                                    </label>
                                    <select
                                        value={formData.monthlyWeek}
                                        onChange={(e) => setFormData({ ...formData, monthlyWeek: e.target.value as any })}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                                    >
                                        <option value="first">{t('recurring.firstWeek')}</option>
                                        <option value="second">{t('recurring.secondWeek')}</option>
                                        <option value="third">{t('recurring.thirdWeek')}</option>
                                        <option value="fourth">{t('recurring.fourthWeek')}</option>
                                        <option value="last">{t('recurring.lastWeek')}</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        {t('recurring.form.weekday')}
                                    </label>
                                    <select
                                        value={formData.monthlyWeekday}
                                        onChange={(e) => setFormData({ ...formData, monthlyWeekday: parseInt(e.target.value) })}
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

                {/* 공휴일 처리 */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        {t('recurring.form.holidayHandling')}
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                        {[
                            { value: 'before', label: t('recurring.form.moveBefore') },
                            { value: 'after', label: t('recurring.form.moveAfter') },
                            { value: 'show', label: t('recurring.form.show') }
                        ].map(option => (
                            <label
                                key={option.value}
                                className={`flex items-center justify-center p-2 rounded-lg cursor-pointer border transition-all ${formData.holidayHandling === option.value
                                    ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/30 dark:border-blue-800 dark:text-blue-300'
                                    : 'bg-white border-gray-200 text-gray-600 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
                                    }`}
                            >
                                <input
                                    type="radio"
                                    name="holidayHandling"
                                    value={option.value}
                                    checked={formData.holidayHandling === option.value}
                                    onChange={(e) => setFormData({ ...formData, holidayHandling: e.target.value as any })}
                                    className="sr-only"
                                />
                                <span className="text-sm">{option.label}</span>
                            </label>
                        ))}
                    </div>
                </div>

                {/* 예외 설정 */}
                <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            <Minus className="w-4 h-4 inline mr-1" />
                            {t('recurring.form.exceptionSettings')}
                        </label>
                        <button
                            type="button"
                            onClick={addException}
                            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-300 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                        >
                            <Plus className="w-3 h-3" />
                            {t('recurring.form.addException')}
                        </button>
                    </div>

                    {formData.exceptions.map((exception, index) => (
                        <div key={index} className="p-4 bg-gray-50 dark:bg-gray-700/30 rounded-xl space-y-3 border border-gray-100 dark:border-gray-700">
                            <div className="flex items-center justify-between">
                                <select
                                    value={exception.type}
                                    onChange={(e) => updateException(index, 'type', e.target.value)}
                                    className="flex-1 px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white mr-2"
                                >
                                    <option value="date">{t('recurring.form.byDateOption')}</option>
                                    <option value="weekday">{t('recurring.form.byWeekdayOption')}</option>
                                    <option value="week">{t('recurring.form.byWeekOption')}</option>
                                    <option value="month">{t('recurring.form.byMonthOption')}</option>
                                    <option value="conflict">{t('recurring.form.conflictOption')}</option>
                                </select>
                                <button
                                    type="button"
                                    onClick={() => removeException(index)}
                                    className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>

                            {/* 예외 값 선택 UI (기존 로직 유지, 스타일만 개선) */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2">
                                {exception.type === 'date' && Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                                    <label key={day} className="flex items-center space-x-2 p-1 hover:bg-white dark:hover:bg-gray-600 rounded cursor-pointer">
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
                                            className="rounded text-blue-600 focus:ring-blue-500"
                                        />
                                        <span className="text-xs text-gray-600 dark:text-gray-300">{day}{t('calendar.daySuffix', { defaultValue: '' })}</span>
                                    </label>
                                ))}

                                {exception.type === 'weekday' && weekdays.map(day => (
                                    <label key={day.value} className="flex items-center space-x-2 p-1 hover:bg-white dark:hover:bg-gray-600 rounded cursor-pointer">
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
                                            className="rounded text-blue-600 focus:ring-blue-500"
                                        />
                                        <span className="text-xs text-gray-600 dark:text-gray-300">{day.label}</span>
                                    </label>
                                ))}

                                {exception.type === 'week' && [1, 2, 3, 4, -1].map(week => (
                                    <label key={week} className="flex items-center space-x-2 p-1 hover:bg-white dark:hover:bg-gray-600 rounded cursor-pointer">
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
                                            className="rounded text-blue-600 focus:ring-blue-500"
                                        />
                                        <span className="text-xs text-gray-600 dark:text-gray-300">{getWeekLabel(week)}</span>
                                    </label>
                                ))}

                                {exception.type === 'month' && Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                                    <label key={month} className="flex items-center space-x-2 p-1 hover:bg-white dark:hover:bg-gray-600 rounded cursor-pointer">
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
                                            className="rounded text-blue-600 focus:ring-blue-500"
                                        />
                                        <span className="text-xs text-gray-600 dark:text-gray-300">{month}{t('common.monthSuffix', { defaultValue: '월' })}</span>
                                    </label>
                                ))}
                            </div>

                            {/* 충돌 예외 처리 (기존 로직 유지) */}
                            {exception.type === 'conflict' && (
                                <div className="space-y-3">
                                    {((exception.values as ConflictException[]) || []).map((conflictException, conflictIndex) => (
                                        <div key={conflictIndex} className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
                                            <div className="flex items-center justify-between mb-3">
                                                <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                                                    {t('recurring.form.conflictRule')} {conflictIndex + 1}
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
                                                <div>
                                                    <label className="block text-xs font-medium text-blue-800 dark:text-blue-200 mb-1">
                                                        {t('recurring.form.targetTemplate')}
                                                    </label>
                                                    <select
                                                        value={conflictException.targetTemplateTitle}
                                                        onChange={(e) => updateConflictException(index, conflictIndex, 'targetTemplateTitle', e.target.value)}
                                                        className="w-full px-2 py-1 text-sm border border-blue-300 dark:border-blue-600 rounded focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 dark:text-white"
                                                    >
                                                        <option value="">{t('recurring.form.selectTemplate')}</option>
                                                        {recurringTemplates.map(t => (
                                                            <option key={t.id} value={t.title}>
                                                                {t.title}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>

                                                <div>
                                                    <label className="block text-xs font-medium text-blue-800 dark:text-blue-200 mb-1">
                                                        {t('recurring.form.conflictCondition')}
                                                    </label>
                                                    <select
                                                        value={conflictException.scope}
                                                        onChange={(e) => updateConflictException(index, conflictIndex, 'scope', e.target.value)}
                                                        className="w-full px-2 py-1 text-sm border border-blue-300 dark:border-blue-600 rounded focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 dark:text-white"
                                                    >
                                                        <option value="same_date">{t('recurring.form.sameDate')}</option>
                                                        <option value="same_week">{t('recurring.form.sameWeek')}</option>
                                                        <option value="same_month">{t('recurring.form.sameMonth')}</option>
                                                    </select>
                                                </div>
                                            </div>
                                        </div>
                                    ))}

                                    <button
                                        type="button"
                                        onClick={() => addConflictException(index)}
                                        className="w-full py-2 px-3 text-sm border-2 border-dashed border-blue-300 dark:border-blue-600 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30 flex items-center justify-center gap-2"
                                    >
                                        <Plus className="w-4 h-4" />
                                        {t('recurring.form.addConflictRule')}
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* 하단 버튼 */}
            <div className="flex justify-end gap-3 pt-6 border-t border-gray-200 dark:border-gray-700">
                <button
                    type="button"
                    onClick={onCancel}
                    className="px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
                    disabled={isLoading}
                >
                    {t('common.cancel')}
                </button>
                <button
                    type="submit"
                    className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:shadow-lg hover:shadow-blue-500/30 transition-all duration-300 transform hover:-translate-y-0.5 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={isLoading || !formData.title.trim()}
                >
                    <Plus className="w-4 h-4" />
                    {isLoading ? t('recurring.form.saving') : t('recurring.addTemplate')}
                </button>
            </div>
        </form>
    )
}

export default RecurringTodoForm
