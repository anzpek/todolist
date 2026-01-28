import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Calendar, Plus, Settings, Pause, Play, Trash2, Edit, Minus, X, Flag, Repeat, AlertCircle, Check, Briefcase, ChevronDown, ChevronUp } from 'lucide-react'
import { useTodos } from '../../../contexts/TodoContext'
import { useTheme } from '../../../contexts/ThemeContext' // Added
import type { SimpleRecurringTemplate, ConflictException } from '../../../utils/simpleRecurring'
import AddTodoModal from '../todo-modals/AddTodoModal'
import { getWeekLabel } from '../../../utils/helpers'
import { useTranslation } from 'react-i18next'

const RecurringManagement = () => {
  const { recurringTemplates, recurringInstances, updateRecurringTemplate, deleteRecurringTemplate, cleanupDuplicateTemplates, cleanupAllDuplicateInstances } = useTodos()
  const { t } = useTranslation()
  const { currentTheme, isDark } = useTheme() // Added
  const isVisualTheme = !!currentTheme.bg // Added
  const [activeTab, setActiveTab] = useState<'templates' | 'exceptions' | 'holidays'>('templates')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<SimpleRecurringTemplate | null>(null)

  // 전역 예외 설정 상태
  const [globalExceptions, setGlobalExceptions] = useState({
    excludeWeeks: [] as number[], // 1=첫째주, 2=둘째주, 3=셋째주, 4=넷째주, 5=마지막주
    excludeDates: [] as string[], // YYYY-MM-DD 형식
  })

  // 예외 설정 localStorage 로드
  useEffect(() => {
    try {
      const saved = localStorage.getItem('globalRecurringExceptions')
      if (saved) {
        setGlobalExceptions(JSON.parse(saved))
      }
    } catch (error) {
      console.error('예외 설정 로드 실패:', error)
    }
  }, [])

  // 예외 설정 저장
  const saveGlobalExceptions = (exceptions: typeof globalExceptions) => {
    try {
      localStorage.setItem('globalRecurringExceptions', JSON.stringify(exceptions))
      setGlobalExceptions(exceptions)
    } catch (error) {
      console.error('예외 설정 저장 실패:', error)
    }
  }

  // 주 예외 토글
  const toggleWeekException = (week: number) => {
    const newExceptions = { ...globalExceptions }
    const index = newExceptions.excludeWeeks.indexOf(week)

    if (index === -1) {
      newExceptions.excludeWeeks.push(week)
    } else {
      newExceptions.excludeWeeks.splice(index, 1)
    }

    saveGlobalExceptions(newExceptions)
  }

  // 중복 정리 핸들러
  const handleCleanup = async () => {
    if (window.confirm('모든 중복 인스턴스를 정리하시겠습니까? (이 작업은 취소할 수 없습니다)\n\n데이터가 많을 경우 시간이 걸릴 수 있습니다.')) {
      try {
        const count = await cleanupAllDuplicateInstances()
        if (count === 0) {
          alert('중복된 인스턴스가 발견되지 않았습니다. 이미 깨끗한 상태입니다! ✨')
        } else {
          alert(`${count}개의 중복 인스턴스가 정리되었습니다. 앱이 훨씬 가벼워졌을 것입니다! 🚀`)
        }
      } catch (e: any) {
        console.error('정리 실패 상세:', e)
        alert(`정리 실패: ${e.message || '알 수 없는 오류'}\n\n콘솔 로그를 확인해주세요.`)
      }
    }
  }

  // 활성 템플릿과 비활성 템플릿 분리
  const activeTemplates = recurringTemplates.filter(t => t.isActive)
  const inactiveTemplates = recurringTemplates.filter(t => !t.isActive)

  // 템플릿 토글 (활성/비활성)
  const handleToggleTemplate = async (templateId: string) => {
    const template = recurringTemplates.find(t => t.id === templateId)
    if (template) {
      await updateRecurringTemplate(templateId, { isActive: !template.isActive })
    }
  }

  // 템플릿 삭제
  const handleDeleteTemplate = async (templateId: string) => {
    if (confirm('이 반복 템플릿을 삭제하시겠습니까?')) {
      await deleteRecurringTemplate(templateId)
    }
  }

  // 템플릿 수정
  const handleEditTemplate = (template: SimpleRecurringTemplate) => {
    setEditingTemplate(template)
    setShowEditModal(true)
  }

  const renderRecurrenceDescription = (template: SimpleRecurringTemplate) => {
    if (template.recurrenceType === 'weekly') {
      const weekdays = ['일', '월', '화', '수', '목', '금', '토']
      return `매주 ${weekdays[template.weekday || 0]}요일`
    } else if (template.recurrenceType === 'monthly') {
      if (template.monthlyPattern === 'weekday' && template.monthlyWeek && template.monthlyWeekday !== undefined) {
        const weekdays = ['일', '월', '화', '수', '목', '금', '토']
        const weeks = {
          'first': '첫 번째',
          'second': '두 번째',
          'third': '세 번째',
          'fourth': '네 번째',
          'last': '마지막'
        }
        return `매월 ${(weeks as any)[template.monthlyWeek]} 주 ${weekdays[template.monthlyWeekday]}요일`
      } else if (template.monthlyDate === -1) {
        return '매월 말일'
      } else if (template.monthlyDate === -2) {
        return '매월 첫 번째 근무일'
      } else if (template.monthlyDate === -3) {
        return '매월 마지막 근무일'
      } else {
        return `매월 ${template.monthlyDate}일`
      }
    }
    return '매일'
  }

  return (
    <div
      className={`space-y-6 transition-all duration-300 ${isVisualTheme
        ? 'rounded-2xl border border-white/20 shadow-lg backdrop-blur-md'
        : 'glass-card'
        }`}
      style={isVisualTheme ? { backgroundColor: `rgba(${isDark ? '0, 0, 0' : '255, 255, 255'}, 0.2)` } : {}}
    >
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t('recurring.title')}</h2>
        <div className="flex gap-2">
          <button
            onClick={handleCleanup}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-600 to-pink-600 text-white rounded-xl hover:shadow-lg hover:shadow-red-500/30 transition-all duration-300 transform hover:-translate-y-0.5 font-medium"
            title="중복된 반복 할일 정리"
          >
            <Trash2 className="w-4 h-4" />
            <span className="hidden sm:inline">중복 정리</span>
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:shadow-lg hover:shadow-blue-500/30 transition-all duration-300 transform hover:-translate-y-0.5 font-medium"
          >
            <Plus className="w-4 h-4" />
            {t('recurring.addTemplate')}
          </button>
        </div>
      </div>

      {/* 탭 네비게이션 */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex justify-between">
          <button
            onClick={() => setActiveTab('templates')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'templates'
              ? 'border-blue-500 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
              }`}
          >
            {t('recurring.templates')}
          </button>
          <div className="flex space-x-4">
            <button
              onClick={() => setActiveTab('exceptions')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'exceptions'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
                }`}
            >
              {t('recurring.exceptions')}
            </button>
            <button
              onClick={() => setActiveTab('holidays')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'holidays'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
                }`}
            >
              {t('recurring.holidays')}
            </button>
          </div>
        </nav>
      </div>

      {/* 반복 템플릿 탭 */}
      {activeTab === 'templates' && (
        <div className="space-y-6">
          {/* 활성 템플릿 */}
          {activeTemplates.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Play className="w-5 h-5 text-green-600" />
                {t('recurring.activeTemplates')} ({activeTemplates.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {activeTemplates.map(template => (
                  <div key={template.id}
                    className={`p-3 border-green-200 dark:border-green-800 transition-all ${isVisualTheme
                      ? 'rounded-xl backdrop-blur-sm hover:bg-green-50/30'
                      : 'card bg-green-50 dark:bg-green-900/10'
                      }`}
                    style={isVisualTheme ? { backgroundColor: `rgba(${isDark ? '0, 0, 0' : '255, 255, 255'}, 0.2)` } : {}}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-gray-900 dark:text-white mb-1 truncate">
                          {template.title}
                        </h4>
                        <p className="text-xs text-gray-600 dark:text-gray-300 whitespace-nowrap overflow-hidden text-ellipsis">
                          {renderRecurrenceDescription(template)}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <span className={`px-2 py-1 rounded text-xs ${template.priority === 'urgent' ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300' :
                          template.priority === 'high' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300' :
                            template.priority === 'medium' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300' :
                              'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300'
                          }`}>
                          {template.priority === 'urgent' ? t('modal.addTodo.urgent') :
                            template.priority === 'high' ? t('modal.addTodo.high') :
                              template.priority === 'medium' ? t('modal.addTodo.medium') : t('modal.addTodo.low')}
                        </span>
                        <button
                          onClick={() => handleEditTemplate(template)}
                          className="p-1 hover:bg-blue-100 dark:hover:bg-blue-800 rounded"
                          title={t('recurring.edit') || "Edit"}
                        >
                          <Edit className="w-4 h-4 text-blue-600" />
                        </button>
                        <button
                          onClick={() => handleToggleTemplate(template.id)}
                          className="p-1 hover:bg-green-100 dark:hover:bg-green-800 rounded"
                          title={t('recurring.pause') || "Pause"}
                        >
                          <Pause className="w-4 h-4 text-green-600" />
                        </button>
                        <button
                          onClick={() => handleDeleteTemplate(template.id)}
                          className="p-1 hover:bg-red-100 dark:hover:bg-red-800 rounded"
                          title={t('recurring.delete') || "Delete"}
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 비활성 템플릿 */}
          {inactiveTemplates.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Pause className="w-5 h-5 text-gray-500" />
                {t('recurring.inactiveTemplates')} ({inactiveTemplates.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {inactiveTemplates.map(template => (
                  <div key={template.id}
                    className={`p-3 opacity-75 border-gray-200 dark:border-gray-700 transition-all ${isVisualTheme
                      ? 'rounded-xl backdrop-blur-sm hover:bg-white/20'
                      : 'card bg-gray-50 dark:bg-gray-800'
                      }`}
                    style={isVisualTheme ? { backgroundColor: `rgba(${isDark ? '0, 0, 0' : '255, 255, 255'}, 0.1)` } : {}}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-gray-600 dark:text-gray-300 mb-1 truncate">
                          {template.title}
                        </h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap overflow-hidden text-ellipsis">
                          {renderRecurrenceDescription(template)}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={() => handleToggleTemplate(template.id)}
                          className="p-1 hover:bg-green-100 dark:hover:bg-green-800 rounded"
                          title={t('recurring.resume') || "Resume"}
                        >
                          <Play className="w-4 h-4 text-green-600" />
                        </button>
                        <button
                          onClick={() => handleDeleteTemplate(template.id)}
                          className="p-1 hover:bg-red-100 dark:hover:bg-red-800 rounded"
                          title={t('recurring.delete') || "Delete"}
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 빈 상태 */}
          {recurringTemplates.length === 0 && (
            <div className="text-center py-12">
              <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                {t('recurring.empty')}
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                {t('recurring.emptyHint')}
              </p>
              <button
                onClick={() => setShowAddModal(true)}
                className="btn-primary"
              >
                {t('recurring.addFirst')}
              </button>
            </div>
          )}
        </div>
      )}

      {/* 예외 처리 탭 */}
      {activeTab === 'exceptions' && (
        <div className="space-y-6">
          <div
            className={`p-4 transition-all ${isVisualTheme
              ? 'rounded-xl backdrop-blur-sm border border-white/20'
              : 'card'
              }`}
            style={isVisualTheme ? { backgroundColor: `rgba(${isDark ? '0, 0, 0' : '255, 255, 255'}, 0.2)` } : {}}
          >
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {t('recurring.exceptionTitle')}
            </h3>

            {/* 월별 주 설정 */}
            <div className="space-y-4">
              <div>
                <h4 className="text-md font-medium text-gray-800 dark:text-gray-200 mb-3">
                  {t('recurring.monthlySettings')}
                </h4>
                <div className="flex gap-1 justify-between overflow-hidden">
                  <div className="text-center px-1 py-1 bg-blue-50 dark:bg-blue-900/30 rounded flex-1 min-w-0">
                    <div className="font-medium text-blue-700 dark:text-blue-300 whitespace-nowrap overflow-hidden text-ellipsis" style={{ fontSize: 'clamp(8px, 2.5vw, 12px)' }}>{t('recurring.firstWeek')}</div>
                  </div>
                  <div className="text-center px-1 py-1 bg-green-50 dark:bg-green-900/30 rounded flex-1 min-w-0">
                    <div className="font-medium text-green-700 dark:text-green-300 whitespace-nowrap overflow-hidden text-ellipsis" style={{ fontSize: 'clamp(8px, 2.5vw, 12px)' }}>{t('recurring.secondWeek')}</div>
                  </div>
                  <div className="text-center px-1 py-1 bg-yellow-50 dark:bg-yellow-900/30 rounded flex-1 min-w-0">
                    <div className="font-medium text-yellow-700 dark:text-yellow-300 whitespace-nowrap overflow-hidden text-ellipsis" style={{ fontSize: 'clamp(8px, 2.5vw, 12px)' }}>{t('recurring.thirdWeek')}</div>
                  </div>
                  <div className="text-center px-1 py-1 bg-purple-50 dark:bg-purple-900/30 rounded flex-1 min-w-0">
                    <div className="font-medium text-purple-700 dark:text-purple-300 whitespace-nowrap overflow-hidden text-ellipsis" style={{ fontSize: 'clamp(8px, 2.5vw, 12px)' }}>{t('recurring.fourthWeek')}</div>
                  </div>
                  <div className="text-center px-1 py-1 bg-red-50 dark:bg-red-900/30 rounded flex-1 min-w-0">
                    <div className="font-medium text-red-700 dark:text-red-300 whitespace-nowrap overflow-hidden text-ellipsis" style={{ fontSize: 'clamp(8px, 2.5vw, 12px)' }}>{t('recurring.lastWeek')}</div>
                  </div>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-3">
                  {t('recurring.weekHint')}
                </p>
              </div>

              <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                <h4 className="text-md font-medium text-gray-800 dark:text-gray-200 mb-3">
                  {t('recurring.excludeSettings')}
                </h4>
                <div className="space-y-3">
                  {/* 주 선택 체크박스들 */}
                  <div className="flex gap-1 justify-between overflow-hidden">
                    <label className="flex flex-col items-center space-y-1 px-1 py-1 bg-blue-50 dark:bg-blue-900/30 rounded cursor-pointer flex-1 min-w-0">
                      <span className="text-blue-700 dark:text-blue-300 whitespace-nowrap overflow-hidden text-ellipsis font-medium" style={{ fontSize: 'clamp(8px, 2.5vw, 12px)' }}>{t('recurring.firstWeek')}</span>
                      <input
                        type="checkbox"
                        className="rounded w-3 h-3"
                        checked={globalExceptions.excludeWeeks.includes(1)}
                        onChange={() => toggleWeekException(1)}
                      />
                    </label>
                    <label className="flex flex-col items-center space-y-1 px-1 py-1 bg-green-50 dark:bg-green-900/30 rounded cursor-pointer flex-1 min-w-0">
                      <span className="text-green-700 dark:text-green-300 whitespace-nowrap overflow-hidden text-ellipsis font-medium" style={{ fontSize: 'clamp(8px, 2.5vw, 12px)' }}>{t('recurring.secondWeek')}</span>
                      <input
                        type="checkbox"
                        className="rounded w-3 h-3"
                        checked={globalExceptions.excludeWeeks.includes(2)}
                        onChange={() => toggleWeekException(2)}
                      />
                    </label>
                    <label className="flex flex-col items-center space-y-1 px-1 py-1 bg-yellow-50 dark:bg-yellow-900/30 rounded cursor-pointer flex-1 min-w-0">
                      <span className="text-yellow-700 dark:text-yellow-300 whitespace-nowrap overflow-hidden text-ellipsis font-medium" style={{ fontSize: 'clamp(8px, 2.5vw, 12px)' }}>{t('recurring.thirdWeek')}</span>
                      <input
                        type="checkbox"
                        className="rounded w-3 h-3"
                        checked={globalExceptions.excludeWeeks.includes(3)}
                        onChange={() => toggleWeekException(3)}
                      />
                    </label>
                    <label className="flex flex-col items-center space-y-1 px-1 py-1 bg-purple-50 dark:bg-purple-900/30 rounded cursor-pointer flex-1 min-w-0">
                      <span className="text-purple-700 dark:text-purple-300 whitespace-nowrap overflow-hidden text-ellipsis font-medium" style={{ fontSize: 'clamp(8px, 2.5vw, 12px)' }}>{t('recurring.fourthWeek')}</span>
                      <input
                        type="checkbox"
                        className="rounded w-3 h-3"
                        checked={globalExceptions.excludeWeeks.includes(4)}
                        onChange={() => toggleWeekException(4)}
                      />
                    </label>
                    <label className="flex flex-col items-center space-y-1 px-1 py-1 bg-red-50 dark:bg-red-900/30 rounded cursor-pointer flex-1 min-w-0">
                      <span className="text-red-700 dark:text-red-300 whitespace-nowrap overflow-hidden text-ellipsis font-medium" style={{ fontSize: 'clamp(8px, 2.5vw, 12px)' }}>{t('recurring.lastWeek')}</span>
                      <input
                        type="checkbox"
                        className="rounded w-3 h-3"
                        checked={globalExceptions.excludeWeeks.includes(5)}
                        onChange={() => toggleWeekException(5)}
                      />
                    </label>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {t('recurring.excludeHint')}
                  </p>

                  {/* 현재 제외 설정 표시 */}
                  {globalExceptions.excludeWeeks.length > 0 && (
                    <div className="mt-3 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                      <p className="text-sm text-orange-700 dark:text-orange-300 font-medium">
                        {t('recurring.currentExcluded')}: {globalExceptions.excludeWeeks.map(week => getWeekLabel(week)).join(', ')}
                      </p>
                      <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                        {t('recurring.excludedHint')}
                      </p>
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-md font-medium text-gray-800 dark:text-gray-200">
                      {t('recurring.exceptionDateTitle')}
                    </h4>
                    <button className="btn-secondary px-2 py-1 whitespace-nowrap" style={{ fontSize: 'clamp(10px, 2vw, 14px)' }}>
                      {t('recurring.addExceptionDate')}
                    </button>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-800 p-2 rounded-lg">
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      {t('recurring.exceptionDateHint')}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 휴가 관리 탭 */}
      {activeTab === 'holidays' && (
        <div className="text-center py-12">
          <Settings className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            {t('recurring.holidayTitle')}
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            {t('recurring.holidayDesc')}
          </p>
          <div
            className={`p-6 max-w-md mx-auto transition-all ${isVisualTheme
              ? 'rounded-xl backdrop-blur-sm border border-white/20'
              : 'card'
              }`}
            style={isVisualTheme ? { backgroundColor: `rgba(${isDark ? '0, 0, 0' : '255, 255, 255'}, 0.2)` } : {}}
          >
            <h4 className="font-medium mb-3">{t('recurring.plannedFeatures')}</h4>
            <ul className="text-sm text-gray-600 dark:text-gray-300 text-left space-y-2">
              <li>• {t('recurring.plannedFeatureList.vacation', { defaultValue: 'Vacation Scheduling' })}</li>
              <li>• {t('recurring.plannedFeatureList.autoAdjust', { defaultValue: 'Auto-adjust Recurring Tasks' })}</li>
              <li>• {t('recurring.plannedFeatureList.notification', { defaultValue: 'Vacation Alerts' })}</li>
              <li>• {t('recurring.plannedFeatureList.holidaySync', { defaultValue: 'Holiday Sync' })}</li>
            </ul>
          </div>
        </div>
      )}

      {/* 통계 정보 */}
      <div
        className={`p-4 transition-all ${isVisualTheme
          ? 'rounded-xl backdrop-blur-sm border border-white/20'
          : 'card'
          }`}
        style={isVisualTheme ? { backgroundColor: `rgba(${isDark ? '0, 0, 0' : '255, 255, 255'}, 0.2)` } : {}}
      >
        <div className="flex items-center justify-between">
          <div className="text-center">
            <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-1">{t('recurring.totalTemplates')}</h4>
            <p className="text-xl font-bold text-blue-600 dark:text-blue-400">
              {recurringTemplates.length}
            </p>
          </div>
          <div className="text-center">
            <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-1">{t('recurring.active')}</h4>
            <p className="text-xl font-bold text-green-600 dark:text-green-400">
              {activeTemplates.length}
            </p>
          </div>
          <div className="text-center">
            <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-1">{t('recurring.todayInstances')}</h4>
            <p className="text-xl font-bold text-purple-600 dark:text-purple-400">
              {recurringInstances.filter(i => {
                const today = new Date().toDateString()
                return new Date(i.date).toDateString() === today
              }).length}
            </p>
          </div>
        </div>
      </div>

      {/* 추가 모달 */}
      <AddTodoModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        initialTab="recurring"
      />

      {/* 수정 모달 */}
      {showEditModal && editingTemplate && (
        <EditRecurringModal
          template={editingTemplate}
          onClose={() => {
            setShowEditModal(false)
            setEditingTemplate(null)
          }}
          onSave={async (updatedData) => {
            await updateRecurringTemplate(editingTemplate.id, updatedData)
            setShowEditModal(false)
            setEditingTemplate(null)
          }}
        />
      )}
    </div>
  )
}

// 수정 모달 컴포넌트
interface EditRecurringModalProps {
  template: SimpleRecurringTemplate
  onClose: () => void
  onSave: (data: Partial<SimpleRecurringTemplate>) => Promise<void>
}

const EditRecurringModal = ({ template, onClose, onSave }: EditRecurringModalProps) => {
  const { recurringTemplates } = useTodos()
  const { t } = useTranslation()
  const { currentTheme } = useTheme()
  const isVisualTheme = !!currentTheme.bg

  const [formData, setFormData] = useState({
    title: template.title,
    description: template.description || '',
    priority: template.priority,
    type: template.type,
    recurrenceType: template.recurrenceType,
    weekday: template.weekday || 0,
    monthlyDate: template.monthlyDate || 1,
    monthlyPattern: template.monthlyPattern || 'date',
    monthlyWeek: template.monthlyWeek || 'first',
    monthlyWeekday: template.monthlyWeekday || 3,
    tags: template.tags || [],
    exceptions: template.exceptions || [],
    holidayHandling: template.holidayHandling || 'show'
  })

  // ... (omitted hook logic for brevity if unchanged, but I must be careful not to delete logic)
  // Actually, I should replacing the TOP of the component to add hook.
  // And then replace the render part separately.

  const [isLoading, setIsLoading] = useState(false)

  // 템플릿이 변경될 때마다 formData 업데이트
  useEffect(() => {
    setFormData({
      title: template.title,
      description: template.description || '',
      priority: template.priority,
      type: template.type,
      recurrenceType: template.recurrenceType,
      weekday: template.weekday || 0,
      monthlyDate: template.monthlyDate || 1,
      monthlyPattern: template.monthlyPattern || 'date',
      monthlyWeek: template.monthlyWeek || 'first',
      monthlyWeekday: template.monthlyWeekday || 3,
      tags: template.tags || [],
      exceptions: template.exceptions || [],
      holidayHandling: template.holidayHandling || 'show'
    })
  }, [template])

  // ... (omitted helper functions)
  // I will skip helper functions and jump to handleSubmit

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

  const updateException = (index: number, field: keyof any, value: any) => {
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
    setIsLoading(true)

    try {
      const updateData: Partial<SimpleRecurringTemplate> = {
        title: formData.title.trim(),
        description: formData.description.trim() || undefined,
        priority: formData.priority,
        type: formData.type,
        recurrenceType: formData.recurrenceType,
        tags: formData.tags,
        exceptions: formData.exceptions,
        holidayHandling: formData.holidayHandling,
        updatedAt: new Date()
      }

      // 반복 설정에 따라 필요한 필드 추가
      if (formData.recurrenceType === 'weekly') {
        updateData.weekday = formData.weekday
      } else if (formData.recurrenceType === 'monthly') {
        if (formData.monthlyPattern === 'weekday') {
          updateData.monthlyPattern = 'weekday'
          updateData.monthlyWeek = formData.monthlyWeek
          updateData.monthlyWeekday = formData.monthlyWeekday
        } else {
          updateData.monthlyPattern = 'date'
          updateData.monthlyDate = formData.monthlyDate
        }
      }

      await onSave(updateData)
      onClose() // 저장 성공 시 모달 닫기
    } catch (error) {
      console.error('템플릿 수정 실패:', error)
      alert(t('recurring.updateError'))
    } finally {
      setIsLoading(false)
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[9999] overflow-y-auto">
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm transition-opacity" onClick={onClose} />

      <div className="flex min-h-full items-center justify-center p-4">
        <form
          onSubmit={handleSubmit}
          className={`relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl p-6 transform transition-all ${isVisualTheme
            ? 'glass-card backdrop-blur-xl border border-white/20'
            : 'bg-white dark:bg-gray-800'
            }`}
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {t('recurring.editModalTitle')}
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
            {/* 제목 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('recurring.form.title')}
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
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

                  {/* 예외 값 선택 UI */}
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

                  {/* 충돌 예외 처리 */}
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
              onClick={onClose}
              className="px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
              disabled={isLoading}
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:shadow-lg hover:shadow-blue-500/30 transition-all duration-300 transform hover:-translate-y-0.5 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isLoading}
            >
              <Check className="w-4 h-4" />
              {isLoading ? t('recurring.form.saving') : t('recurring.form.save')}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  )
}

export default RecurringManagement