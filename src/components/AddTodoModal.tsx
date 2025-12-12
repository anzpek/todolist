import { useState, useEffect } from 'react'
import { X, Check } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import StandardTodoForm from './StandardTodoForm'
import RecurringTodoForm from './RecurringTodoForm'
import ProjectTemplateManager from './ProjectTemplateManager'
import type { ProjectTemplate } from '../types/todo'

interface AddTodoModalProps {
  isOpen: boolean
  onClose: () => void
  initialDate?: Date
  initialTab?: TabType
}

type TabType = 'todo' | 'recurring' | 'template'

const AddTodoModal = ({ isOpen, onClose, initialDate, initialTab = 'todo' }: AddTodoModalProps) => {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState<TabType>(initialTab)
  const [selectedTemplate, setSelectedTemplate] = useState<ProjectTemplate | null>(null)

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab)
      setSelectedTemplate(null)
    }
  }, [isOpen, initialTab])

  const handleTemplateSelect = (template: ProjectTemplate) => {
    setSelectedTemplate(template)
    setActiveTab('todo')
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-2xl bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 shrink-0">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {activeTab === 'todo' && t('modal.addTodo.title')}
              {activeTab === 'recurring' && (t('recurring.title') || 'Add Recurring Task')}
              {activeTab === 'template' && (t('projectTemplate.title') || 'Manage Templates')}
            </h2>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-200 dark:border-gray-700 shrink-0">
            <button
              onClick={() => setActiveTab('todo')}
              className={`flex-1 py-3 text-sm font-medium transition-colors border-b-2 ${activeTab === 'todo'
                ? 'border-primary-600 text-primary-600 dark:border-primary-400 dark:text-primary-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                }`}
            >
              {t('modal.addTodo.simpleTask')} / {t('modal.addTodo.project')}
            </button>
            <button
              onClick={() => setActiveTab('recurring')}
              className={`flex-1 py-3 text-sm font-medium transition-colors border-b-2 ${activeTab === 'recurring'
                ? 'border-primary-600 text-primary-600 dark:border-primary-400 dark:text-primary-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                }`}
            >
              {t('recurring.title') || 'Repeating Task'}
            </button>
            <button
              onClick={() => setActiveTab('template')}
              className={`flex-1 py-3 text-sm font-medium transition-colors border-b-2 ${activeTab === 'template'
                ? 'border-primary-600 text-primary-600 dark:border-primary-400 dark:text-primary-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                }`}
            >
              {t('projectTemplate.manage') || 'Templates'}
            </button>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto min-h-0 flex-1">
            {activeTab === 'todo' && (
              <StandardTodoForm
                onCancel={onClose}
                onSuccess={onClose}
                initialDate={initialDate}
                preselectedTemplate={selectedTemplate}
              />
            )}

            {activeTab === 'recurring' && (
              <RecurringTodoForm
                onCancel={onClose}
                onSuccess={onClose}
              />
            )}

            {activeTab === 'template' && (
              <ProjectTemplateManager
                isOpen={true}
                onClose={() => setActiveTab('todo')}
                onSelectTemplate={handleTemplateSelect}
                mode="embedded"
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default AddTodoModal