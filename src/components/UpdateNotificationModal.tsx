import { useState, useEffect } from 'react'
import { X, Sparkles, Check } from 'lucide-react'
import { useTranslation } from 'react-i18next'

const UPDATE_VERSION_KEY = 'hideUpdateModal_v1_multilang'

const UpdateNotificationModal = () => {
    const { t } = useTranslation()
    const [isOpen, setIsOpen] = useState(false)
    const [dontShowAgain, setDontShowAgain] = useState(false)

    useEffect(() => {
        const hidden = localStorage.getItem(UPDATE_VERSION_KEY)
        if (!hidden) {
            setIsOpen(true)
        }
    }, [])

    const handleClose = () => {
        if (dontShowAgain) {
            localStorage.setItem(UPDATE_VERSION_KEY, 'true')
        }
        setIsOpen(false)
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-gray-100 dark:border-gray-700 animate-in fade-in zoom-in duration-300">

                {/* Header */}
                <div className="relative p-6 bg-gradient-to-br from-indigo-500 to-purple-600">
                    <button
                        onClick={handleClose}
                        className="absolute top-4 right-4 p-1 bg-white/20 hover:bg-white/30 rounded-full text-white transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>

                    <div className="flex items-center gap-3 text-white mb-2">
                        <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                            <Sparkles className="w-6 h-6" />
                        </div>
                        <h2 className="text-xl font-bold">{t('updateNotification.title')}</h2>
                    </div>
                    <p className="text-indigo-100 text-sm">
                        {t('updateNotification.newFeatures')}
                    </p>
                </div>

                {/* Content */}
                <div className="p-6">
                    <div className="space-y-4 mb-6">
                        {(() => {
                            const changes = t('updateNotification.changes', { returnObjects: true });
                            const changesArray = Array.isArray(changes) ? changes : [];
                            return changesArray.map((change, index) => (
                                <div key={index} className="flex items-start gap-3">
                                    <div className="mt-0.5 p-1 bg-green-100 dark:bg-green-900/30 rounded-full">
                                        <Check className="w-3 h-3 text-green-600 dark:text-green-400" />
                                    </div>
                                    <span className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
                                        {change}
                                    </span>
                                </div>
                            ));
                        })()}
                    </div>

                    {/* Footer */}
                    <div className="space-y-4">
                        <label className="flex items-center gap-2 cursor-pointer group">
                            <div className="relative flex items-center">
                                <input
                                    type="checkbox"
                                    checked={dontShowAgain}
                                    onChange={(e) => setDontShowAgain(e.target.checked)}
                                    className="w-4 h-4 border-2 border-gray-300 dark:border-gray-600 rounded text-indigo-600 focus:ring-indigo-500 dark:bg-gray-700 transition-colors"
                                />
                            </div>
                            <span className="text-sm text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors">
                                {t('updateNotification.dontShowAgain')}
                            </span>
                        </label>

                        <button
                            onClick={handleClose}
                            className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl shadow-lg shadow-indigo-200 dark:shadow-none transition-all hover:scale-[1.02] active:scale-[0.98]"
                        >
                            {t('updateNotification.close')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default UpdateNotificationModal
