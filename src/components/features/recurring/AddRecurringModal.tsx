import { X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import RecurringTodoForm from './RecurringTodoForm'

interface AddRecurringModalProps {
  isOpen: boolean
  onClose: () => void
}

const AddRecurringModal = ({ isOpen, onClose }: AddRecurringModalProps) => {
  const { t } = useTranslation()

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm transition-opacity" onClick={onClose} />

      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-2xl bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 transform transition-all">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {t('recurring.addTemplate')}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <RecurringTodoForm
            onCancel={onClose}
            onSuccess={onClose}
          />
        </div>
      </div>
    </div>
  )
}

export default AddRecurringModal