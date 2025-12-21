import { createPortal } from 'react-dom'
import { X, Users } from 'lucide-react'
import type { SharedUser } from '../types/todo'
import { useTranslation } from 'react-i18next'
import ShareSettingsPanel from './ShareSettingsPanel'

interface ShareSettingsModalProps {
    isOpen: boolean
    onClose: () => void
    todoId?: string
    todoTitle?: string
    currentUserId?: string
    initialSharedWith: SharedUser[]
    onUpdate?: (sharedWith: SharedUser[]) => void
    isOwner?: boolean
}

const ShareSettingsModal = ({
    isOpen,
    onClose,
    todoId,
    todoTitle = 'Task',
    currentUserId,
    initialSharedWith,
    onUpdate,
    isOwner = false
}: ShareSettingsModalProps) => {
    const { t } = useTranslation()

    if (!isOpen) return null

    return createPortal(
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[10000] flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-700">
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                        <Users className="w-5 h-5 text-blue-500" />
                        {t('sharing.settingsTitle') || 'Sharing Settings'}
                    </h3>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                <div className="p-4">
                    <ShareSettingsPanel
                        todoId={todoId}
                        todoTitle={todoTitle}
                        currentUserId={currentUserId}
                        initialSharedWith={initialSharedWith}
                        onUpdate={onUpdate}
                        isOwner={isOwner}
                        onClose={onClose}
                    />
                </div>
            </div>
        </div>,
        document.body
    )
}

export default ShareSettingsModal
