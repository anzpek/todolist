import React from 'react'
import { useTranslation } from 'react-i18next'
import { useTodos } from '../contexts/TodoContext'

interface SharingFilterSelectProps {
    value: 'all' | 'private' | 'shared' | 'my_shared' | string
    onChange: (value: 'all' | 'private' | 'shared' | 'my_shared' | string) => void
    disabled?: boolean
    className?: string
}

const SharingFilterSelect = ({ value, onChange, disabled, className }: SharingFilterSelectProps) => {
    const { t } = useTranslation()
    const { sharingGroups } = useTodos()

    return (
        <select
            value={value || 'all'}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            className={className || "w-full px-3 py-2 bg-white/50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 text-sm transition-colors"}
        >
            <option value="all">{t('search.all')}</option>
            <option value="private">🔒 {t('sharing.private') || 'Private'}</option>
            <option value="shared">👥 {t('sharing.shared') || 'Shared'}</option>
            <option value="my_shared">📤 {t('sharing.myShared') || 'Shared By Me'}</option>

            {sharingGroups && sharingGroups.length > 0 && (
                <optgroup label={t('sharing.groups', 'Sharing Groups')}>
                    {sharingGroups.map(group => (
                        <option key={group.id} value={group.id}>
                            {group.name}
                        </option>
                    ))}
                </optgroup>
            )}
        </select>
    )
}

export default SharingFilterSelect
