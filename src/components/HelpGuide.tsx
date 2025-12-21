import React from 'react'
import { motion } from 'framer-motion'
import { Book, CheckSquare, Calendar, Repeat, Search, Settings, Shield, Zap, Users, Bell } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useTheme } from '../contexts/ThemeContext' // Added

const HelpGuide = () => {
    const { t } = useTranslation()
    const { currentTheme, isDark } = useTheme() // Added
    const isVisualTheme = !!currentTheme.bg // Added

    const sections = [
        {
            id: 'basics',
            title: t('guide.basics.title'),
            icon: CheckSquare,
            items: [
                { title: t('guide.basics.add'), desc: t('guide.basics.addDesc') },
                { title: t('guide.basics.complete'), desc: t('guide.basics.completeDesc') },
                { title: t('guide.basics.edit'), desc: t('guide.basics.editDesc') }
            ]
        },
        {
            id: 'calendar',
            title: t('guide.calendar.title'),
            icon: Calendar,
            items: [
                { title: t('guide.calendar.views'), desc: t('guide.calendar.viewsDesc') },
                { title: t('guide.calendar.nav'), desc: t('guide.calendar.navDesc') }
            ]
        },
        {
            id: 'advanced',
            title: t('guide.advanced.title'),
            icon: Zap,
            items: [
                { title: t('guide.advanced.recurring'), desc: t('guide.advanced.recurringDesc') },
                { title: t('guide.advanced.subtasks'), desc: t('guide.advanced.subtasksDesc') },
                { title: t('guide.advanced.tags'), desc: t('guide.advanced.tagsDesc') }
            ]
        },
        {
            id: 'sharing',
            title: t('guide.sharing.title'),
            icon: Users,
            items: [
                { title: t('guide.sharing.createDetail'), desc: t('guide.sharing.createDetailDesc') },
                { title: t('guide.sharing.permissionDetail'), desc: t('guide.sharing.permissionDetailDesc') },
                { title: t('guide.sharing.filterDetail'), desc: t('guide.sharing.filterDetailDesc') }
            ]
        },
        {
            id: 'notifications',
            title: t('guide.notifications.title'),
            icon: Bell,
            items: [
                { title: t('guide.notifications.centerDetail'), desc: t('guide.notifications.centerDetailDesc') }
            ]
        },
        {
            id: 'account',
            title: t('guide.account.title'),
            icon: Shield,
            items: [
                { title: t('guide.account.login'), desc: t('guide.account.loginDesc') },
                { title: t('guide.account.backup'), desc: t('guide.account.backupDesc') }
            ]
        }
    ]

    return (
        <div className="max-w-4xl mx-auto pb-20">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                    <Book className="w-8 h-8 text-indigo-600" />
                    {t('guide.title')}
                </h1>
                <p className="mt-2 text-gray-600 dark:text-gray-400">
                    {t('guide.subtitle')}
                </p>
            </div>

            <div className="grid gap-6">
                {sections.map((section, idx) => (
                    <motion.div
                        key={section.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className={`${isVisualTheme ? 'glass-card backdrop-blur-none transition-[background-color] duration-200' : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700'} rounded-2xl p-6 shadow-sm border`}
                        style={isVisualTheme ? { backgroundColor: `rgba(${isDark ? '0, 0, 0' : '255, 255, 255'}, var(--glass-opacity, 0.1))` } : {}}
                    >
                        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100 dark:border-gray-700">
                            <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
                                <section.icon className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                            </div>
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                                {section.title}
                            </h2>
                        </div>

                        <div className="grid md:grid-cols-2 gap-6">
                            {section.items.map((item, itemIdx) => (
                                <div key={itemIdx} className="space-y-2">
                                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                                        {item.title}
                                    </h3>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed pl-3.5 border-l-2 border-gray-100 dark:border-gray-700">
                                        {item.desc}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                ))}
            </div>

            <div className="mt-12 p-6 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl text-white shadow-xl">
                <h3 className="text-xl font-bold mb-2">{t('guide.more.title')}</h3>
                <p className="text-indigo-100 mb-6">
                    {t('guide.more.contact')}
                </p>
                <button className="px-6 py-2 bg-white text-indigo-600 font-bold rounded-lg hover:bg-indigo-50 transition-colors">
                    {t('guide.more.button')}
                </button>
            </div>
        </div>
    )
}

export default HelpGuide
