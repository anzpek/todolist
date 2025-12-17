import React, { useState } from 'react'
import { useTodos } from '../contexts/TodoContext'
import { useTheme } from '../contexts/ThemeContext'
import { useAuth } from '../contexts/AuthContext'
import { useFontSize } from '../contexts/FontSizeContext'
import { useCustomHolidays } from '../contexts/CustomHolidayContext'
import { useVacation } from '../contexts/VacationContext'
import NotificationSettings from './NotificationSettings'
import { useTranslation } from 'react-i18next'
import { firestoreService } from '../services/firestoreService'
import {
  Type, Check, Plus, User, Palette, Calendar, BarChart2, HardDrive, Bell,
  LogOut, RefreshCw, Moon, Sun, Monitor, Download, Upload, AlertCircle,
  ChevronRight, Info, Globe, Settings, Trash2, Layout
} from 'lucide-react'
import { THEMES } from '../constants/themes'
import { Capacitor } from '@capacitor/core'
import TodoListWidget from '../plugins/TodoListWidget'
import { syncWidget } from '../utils/widgetSync'

const SettingsView: React.FC = () => {
  const { t, i18n } = useTranslation()
  const { currentUser: user, logout } = useAuth()
  const { todos, exportData, importData, clearCompleted, stats, syncing, syncWithCloud, getRecurringTodos } = useTodos()
  const { theme, setTheme, currentThemeId, setCurrentThemeId, currentTheme, isDark, transparency, setTransparency } = useTheme()
  const isVisualTheme = !!currentTheme.bg
  const { fontSizeLevel, setFontSizeLevel } = useFontSize()
  const { customHolidays, addCustomHoliday, deleteCustomHoliday } = useCustomHolidays()
  const { vacations, employees } = useVacation()
  const [importError, setImportError] = useState<string | null>(null)
  const [showImportSuccess, setShowImportSuccess] = useState(false)
  const [visualTab, setVisualTab] = useState<'colors' | 'seasonal' | 'city' | 'mode' | 'background' | 'display'>('colors')
  const [showNotificationSettings, setShowNotificationSettings] = useState(false)
  const [newHolidayDate, setNewHolidayDate] = useState('')
  const [newHolidayName, setNewHolidayName] = useState('')
  const [newHolidayIsRecurring, setNewHolidayIsRecurring] = useState(false)
  const [startScreen, setStartScreen] = useState<'last' | 'today' | 'week' | 'month'>('last')
  const [widgetTransparency, setWidgetTransparency] = useState(() => {
    return parseInt(localStorage.getItem('widgetTransparency') || '80');
  });

  React.useEffect(() => {
    if (user) {
      firestoreService.getUserSettings(user.uid).then(settings => {
        if (settings?.startScreen) {
          setStartScreen(settings.startScreen)
        }
      })
    }
  }, [user])

  const handleStartScreenChange = async (value: 'last' | 'today' | 'week' | 'month') => {
    setStartScreen(value)
    if (user) {
      try {
        await firestoreService.updateUserStartScreen(user.uid, value)
      } catch (error) {
        console.error('Failed to update start screen:', error)
      }
    }
  }

  const handleImportFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        const content = e.target?.result as string
        const success = await importData(content)

        if (success) {
          setImportError(null)
          setShowImportSuccess(true)
          setTimeout(() => setShowImportSuccess(false), 3000)
        } else {
          setImportError(t('settings.data.invalidFormat'))
        }
      } catch (error) {
        setImportError(t('settings.data.importError'))
      }
    }
    reader.readAsText(file)
    event.target.value = ''
  }

  const handleExport = () => {
    const data = exportData()
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `todos-backup-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const handleAddHoliday = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newHolidayDate || !newHolidayName) return

    try {
      await addCustomHoliday(newHolidayDate, newHolidayName, newHolidayIsRecurring)
      setNewHolidayDate('')
      setNewHolidayName('')
      setNewHolidayIsRecurring(false)
    } catch (error) {
      console.error('Failed to add holiday:', error)
      alert(t('common.error'))
    }
  }

  const handleDeleteHoliday = async (id: string) => {
    if (confirm(t('settings.holiday.confirmDelete'))) {
      try {
        await deleteCustomHoliday(id)
      } catch (error) {
        console.error('Failed to delete holiday:', error)
        alert(t('common.error'))
      }
    }
  }

  const handleClearCompleted = () => {
    const completedCount = stats?.completed || 0
    if (completedCount === 0) {
      alert(t('settings.data.noCompleted'))
      return
    }

    if (confirm(t('settings.data.confirmClear', { count: completedCount }))) {
      clearCompleted()
    }
  }

  const handleLogout = async () => {
    if (confirm(t('settings.account.confirmLogout'))) {
      try {
        await logout()
      } catch (error) {
        console.error('Logout failed:', error)
      }
    }
  }

  const handleSync = async () => {
    try {
      await syncWithCloud()
    } catch (error) {
      console.error('Sync failed:', error)
    }
  }

  const getStorageSize = () => {
    try {
      const data = localStorage.getItem('todolist-app-todos')
      if (data) {
        const sizeInBytes = new Blob([data]).size
        const sizeInKB = (sizeInBytes / 1024).toFixed(2)
        return `${sizeInKB} KB`
      }
    } catch (error) {
      console.error('Storage size calculation failed:', error)
    }
    return '0 KB'
  }

  return (
    <div className="pb-safe min-h-safe bg-transparent">
      <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8">

        {/* Header */}
        <div className="flex items-center gap-3 mb-8 animate-fade-in-up">
          <div className="p-3 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
            <Settings className="w-8 h-8 text-primary-600 dark:text-primary-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {t('settings.title')}
            </h1>
            <p className="text-gray-500 dark:text-gray-400">
              {t('settings.subtitle')}
            </p>
          </div>
        </div>

        {/* Account Section */}
        <div className="glass-card rounded-3xl p-8 animate-slide-in" style={{ animationDelay: '0.1s' }}>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary-50 dark:bg-primary-900/30 flex items-center justify-center text-primary-600 dark:text-primary-400">
              <User className="w-5 h-5" strokeWidth={2} />
            </div>
            {t('settings.account.title')}
          </h3>
          <div className="space-y-4">
            <div className="flex items-center gap-4 p-4 bg-white/50 dark:bg-gray-700/30 rounded-xl border border-gray-100 dark:border-gray-700/50 backdrop-blur-sm">
              {user?.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.email || 'User'}
                  className="w-12 h-12 rounded-full object-cover shadow-sm border border-gray-200 dark:border-gray-700"
                />
              ) : (
                <div className="w-12 h-12 bg-gradient-to-br from-primary-100 to-primary-200 dark:from-primary-900 dark:to-primary-800 rounded-full flex items-center justify-center text-primary-600 dark:text-primary-300 font-bold text-xl shadow-inner">
                  {user?.email?.[0].toUpperCase()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 dark:text-white truncate">
                  {user?.email}
                </p>
                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                  <span className="w-2 h-2 rounded-full bg-green-500"></span>
                  {t('settings.account.loggedIn')}
                </div>
              </div>
              <button
                onClick={handleSync}
                disabled={syncing}
                className={`p-2.5 rounded-xl border transition-all duration-200 ${syncing
                  ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                  : 'bg-white dark:bg-gray-700 text-primary-600 dark:text-primary-400 border-gray-200 dark:border-gray-600 hover:border-primary-300 hover:shadow-md active:scale-95'
                  }`}
                title={t('settings.account.sync')}
              >
                <RefreshCw className={`w-5 h-5 ${syncing ? 'animate-spin' : ''}`} />
              </button>
            </div>

            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 p-4 rounded-xl border border-red-100 dark:border-red-900/30 text-red-600 dark:text-red-400 font-medium hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-200 group relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-red-100/50 dark:bg-red-900/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
              <LogOut className="w-5 h-5 relative z-10" />
              <span className="relative z-10">{t('settings.account.logout')}</span>
            </button>
          </div>
        </div>

        {/* Start Screen Settings */}
        <div className="glass-card rounded-3xl p-8 animate-slide-in" style={{ animationDelay: '0.15s' }}>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-50 dark:bg-cyan-900/30 flex items-center justify-center text-cyan-600 dark:text-cyan-400">
              <Monitor className="w-5 h-5" strokeWidth={2} />
            </div>
            {t('settings.general.startScreen')}
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { key: 'last', label: t('settings.general.lastView') },
              { key: 'today', label: t('settings.general.today') },
              { key: 'week', label: t('settings.general.week') },
              { key: 'month', label: t('settings.general.month') }
            ].map((option) => (
              <button
                key={option.key}
                onClick={() => handleStartScreenChange(option.key as any)}
                className={`p-4 rounded-xl border-2 transition-all duration-200 text-sm font-medium ${startScreen === option.key
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                  : 'border-transparent bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400'
                  }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>


        {/* Appearance Settings (Refactored) */}
        <div className="glass-card rounded-3xl p-8 animate-slide-in" style={{ animationDelay: '0.2s' }}>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-50 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400">
              <Palette className="w-5 h-5" strokeWidth={2} />
            </div>
            {t('settings.appearance.title')}
          </h3>

          <div className="space-y-6">
            {/* Main Tabs */}
            <div className="flex p-1 bg-gray-100 dark:bg-gray-800 rounded-xl">
              {(['mode', 'background', 'display'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setVisualTab(tab)}
                  className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${visualTab === tab || (tab === 'background' && (visualTab === 'city' || visualTab === 'seasonal')) || (tab === 'display' && visualTab === 'colors')
                    ? 'bg-white dark:bg-gray-700 text-primary-600 dark:text-primary-400 shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                    }`}
                >
                  {t(`settings.tabs.${tab}`) || tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="min-h-[300px]">
              {/* MODE TAB */}
              {(visualTab === 'mode') && (
                <div className="space-y-6 animate-fade-in">
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { key: 'light', icon: Sun, label: t('settings.appearance.light') },
                      { key: 'dark', icon: Moon, label: t('settings.appearance.dark') },
                      { key: 'system', icon: Monitor, label: t('settings.appearance.system') }
                    ].map((option) => (
                      <button
                        key={option.key}
                        onClick={() => setTheme(option.key as any)}
                        className={`flex flex-col items-center justify-center gap-3 p-4 rounded-xl border-2 transition-all duration-200 ${theme === option.key
                          ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                          : 'border-transparent bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800'
                          }`}
                      >
                        <option.icon className={`w-6 h-6 ${theme === option.key ? 'text-primary-500' : 'text-gray-400'}`} />
                        <span className="text-sm font-medium">{option.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* BACKGROUND TAB */}
              {(visualTab === 'background' || visualTab === 'seasonal' || visualTab === 'city') && (
                <div className="space-y-6 animate-fade-in">
                  {/* Secondary Tabs for Background */}
                  <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
                    <button
                      onClick={() => setVisualTab('seasonal')}
                      className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${visualTab === 'seasonal'
                        ? 'bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                        }`}
                    >
                      {t('settings.tabs.seasonal') || 'Seasonal'}
                    </button>
                    <button
                      onClick={() => setVisualTab('city')}
                      className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${visualTab === 'city'
                        ? 'bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                        }`}
                    >
                      {t('settings.tabs.city') || 'City'}
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {/* Render Seasonal Themes */}
                    {(visualTab === 'seasonal' || visualTab === 'background') && THEMES.seasonal.map(themeOption => (
                      <button
                        key={themeOption.id}
                        onClick={() => setCurrentThemeId(themeOption.id)}
                        className={`relative group overflow-hidden rounded-xl aspect-video border-2 transition-all duration-200 ${currentThemeId === themeOption.id ? 'border-primary-500 ring-2 ring-primary-500/30' : 'border-transparent hover:border-gray-200 dark:hover:border-gray-700'
                          }`}
                      >
                        <img
                          src={themeOption.bg}
                          alt={t(themeOption.nameKey)}
                          className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        />
                        <div className={`absolute inset-0 flex items-center justify-center ${currentThemeId === themeOption.id ? 'bg-black/40' : 'bg-black/20 group-hover:bg-black/30'}`}>
                          <span className="text-white font-medium text-sm drop-shadow-md">{t(themeOption.nameKey)}</span>
                          {currentThemeId === themeOption.id && (
                            <div className="absolute top-2 right-2 bg-primary-500 rounded-full p-0.5">
                              <Check className="w-3 h-3 text-white" />
                            </div>
                          )}
                        </div>
                      </button>
                    ))}

                    {/* Render City Themes */}
                    {(visualTab === 'city' || visualTab === 'background') && THEMES.city.map(themeOption => (
                      <button
                        key={themeOption.id}
                        onClick={() => setCurrentThemeId(themeOption.id)}
                        className={`relative group overflow-hidden rounded-xl aspect-video border-2 transition-all duration-200 ${currentThemeId === themeOption.id ? 'border-primary-500 ring-2 ring-primary-500/30' : 'border-transparent hover:border-gray-200 dark:hover:border-gray-700'
                          }`}
                      >
                        <img
                          src={themeOption.bg}
                          alt={t(themeOption.nameKey)}
                          className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        />
                        <div className={`absolute inset-0 flex items-center justify-center ${currentThemeId === themeOption.id ? 'bg-black/40' : 'bg-black/20 group-hover:bg-black/30'}`}>
                          <span className="text-white font-medium text-sm drop-shadow-md">{t(themeOption.nameKey)}</span>
                          {currentThemeId === themeOption.id && (
                            <div className="absolute top-2 right-2 bg-primary-500 rounded-full p-0.5">
                              <Check className="w-3 h-3 text-white" />
                            </div>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>

                  {/* Transparency Control (Only in Background Tab) */}
                  {currentTheme.bg && (
                    <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          {t('settings.appearance.transparency')}
                        </span>
                        <span className="text-sm text-gray-500">{(transparency * 100).toFixed(0)}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={transparency}
                        onChange={(e) => setTransparency(parseFloat(e.target.value))}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 accent-primary-500"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        {t('settings.appearance.transparencyDesc')}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* DISPLAY TAB (Colors Only) */}
              {(visualTab === 'display' || visualTab === 'colors') && (
                <div className="space-y-8 animate-fade-in">
                  <div className="space-y-3">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block">{t('settings.tabs.colors')}</label>
                    <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
                      {THEMES.colors.map(themeOption => (
                        <button
                          key={themeOption.id}
                          onClick={() => setCurrentThemeId(themeOption.id)}
                          className={`group relative flex flex-col items-center gap-2 p-2 rounded-xl border transition-all duration-200 ${currentThemeId === themeOption.id
                            ? 'border-primary-500 bg-primary-50/50 dark:bg-primary-900/20'
                            : 'border-transparent hover:bg-gray-50 dark:hover:bg-gray-800'
                            }`}
                        >
                          <div className={`w-10 h-10 rounded-full shadow-sm flex items-center justify-center ${themeOption.colorClass} text-white`}>
                            {currentThemeId === themeOption.id && <Check className="w-5 h-5" />}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Language Settings */}
        <div className="glass-card rounded-3xl p-8 animate-slide-in" style={{ animationDelay: '0.25s' }}>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <Globe className="w-5 h-5" strokeWidth={2} />
            </div>
            {t('settings.language.title')}
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => {
                i18n.changeLanguage('ko')
                if (user) firestoreService.updateUserLanguage(user.uid, 'ko')
              }}
              className={`p-4 rounded-xl border transition-all duration-200 flex flex-col items-center gap-2 ${i18n.language.startsWith('ko')
                ? (isVisualTheme ? 'bg-primary-500/30 border-primary-400 text-primary-100 font-bold' : 'bg-primary-50 dark:bg-primary-900/20 border-primary-500 text-primary-700 dark:text-primary-300')
                : (isVisualTheme ? 'glass-card backdrop-blur-none border-white/20 hover:bg-white/10' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-700')
                }`}
              style={isVisualTheme && !i18n.language.startsWith('ko') ? { backgroundColor: `rgba(${isDark ? '0, 0, 0' : '255, 255, 255'}, var(--glass-opacity, 0.1))` } : {}}
            >
              <span className="text-2xl">🇰🇷</span>
              <span className="font-medium text-sm">{t('settings.language.korean')}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                i18n.changeLanguage('en')
                if (user) firestoreService.updateUserLanguage(user.uid, 'en')
              }}
              className={`p-4 rounded-xl border transition-all duration-200 flex flex-col items-center gap-2 ${i18n.language.startsWith('en')
                ? (isVisualTheme ? 'bg-primary-500/30 border-primary-400 text-primary-100 font-bold' : 'bg-primary-50 dark:bg-primary-900/20 border-primary-500 text-primary-700 dark:text-primary-300')
                : (isVisualTheme ? 'glass-card backdrop-blur-none border-white/20 hover:bg-white/10' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-700')
                }`}
              style={isVisualTheme && !i18n.language.startsWith('en') ? { backgroundColor: `rgba(${isDark ? '0, 0, 0' : '255, 255, 255'}, var(--glass-opacity, 0.1))` } : {}}
            >
              <span className="text-2xl">🇺🇸</span>
              <span className="font-medium text-sm">{t('settings.language.english')}</span>
            </button>
          </div>
        </div>

        {/* Font Settings */}
        <div className="glass-card rounded-3xl p-8 animate-slide-in" style={{ animationDelay: '0.3s' }}>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-orange-50 dark:bg-orange-900/30 flex items-center justify-center text-orange-600 dark:text-orange-400">
              <Type className="w-5 h-5" strokeWidth={2} />
            </div>
            {t('settings.font.title')}
          </h3>
          <div
            className={`flex items-center gap-4 p-4 rounded-2xl border text-center ${isVisualTheme ? 'glass-card backdrop-blur-none border-white/20' : 'bg-gray-50 dark:bg-gray-800 border-gray-100 dark:border-gray-700'}`}
            style={isVisualTheme ? { backgroundColor: `rgba(${isDark ? '0, 0, 0' : '255, 255, 255'}, var(--glass-opacity, 0.1))` } : {}}
          >
            <button
              onClick={() => setFontSizeLevel(Math.max(1, fontSizeLevel - 1) as any)}
              disabled={fontSizeLevel <= 1}
              className="p-3 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-30 transition-colors"
            >
              <span className="text-xs font-bold text-gray-600 dark:text-gray-300">A</span>
            </button>
            <div className="flex-1 px-4">
              <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary-500 transition-all duration-300"
                  style={{ width: `${((fontSizeLevel - 1) / 6) * 100}%` }}
                />
              </div>
            </div>
            <button
              onClick={() => setFontSizeLevel(Math.min(7, fontSizeLevel + 1) as any)}
              disabled={fontSizeLevel >= 7}
              className="p-3 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-30 transition-colors"
            >
              <span className="text-xl font-bold text-gray-600 dark:text-gray-300">A</span>
            </button>
          </div>
        </div>

        {/* Custom Holidays */}
        <div className="glass-card rounded-3xl p-8 animate-slide-in" style={{ animationDelay: '0.4s' }}>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-red-50 dark:bg-red-900/30 flex items-center justify-center text-red-600 dark:text-red-400">
              <Calendar className="w-5 h-5" strokeWidth={2} />
            </div>
            {t('settings.holiday.title')}
          </h3>
          <form onSubmit={handleAddHoliday} className="space-y-4 mb-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('settings.holiday.name')}</label>
                <input
                  type="text"
                  value={newHolidayName}
                  onChange={(e) => setNewHolidayName(e.target.value)}
                  placeholder={t('settings.holiday.namePlaceholder')}
                  className="glass-input w-full focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('settings.holiday.date')}</label>
                <input
                  type="date"
                  value={newHolidayDate}
                  onChange={(e) => setNewHolidayDate(e.target.value)}
                  className="glass-input w-full focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            </div>
            <div className="flex items-center justify-between gap-4">
              <label className="flex items-center gap-2 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={newHolidayIsRecurring}
                  onChange={(e) => setNewHolidayIsRecurring(e.target.checked)}
                  className=" rounded border-gray-300 text-primary-600 focus:ring-primary-500 transition-colors"
                />
                <span className="text-sm text-gray-600 dark:text-gray-400 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                  {t('settings.holiday.recurring')}
                </span>
                <div className="group relative">
                  <Info className="w-4 h-4 text-gray-400 hover:text-primary-500 cursor-help transition-colors" />
                  <div className="absolute left-1/2 -top-10 -translate-x-1/2 w-48 p-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10 text-center">
                    {t('settings.holiday.recurringTooltip')}
                  </div>
                </div>
              </label>
              <button
                type="submit"
                disabled={!newHolidayDate || !newHolidayName}
                className="btn-primary flex items-center gap-2 px-6 py-2.5 rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-95 transition-all"
              >
                <Plus className="w-4 h-4" />
                {t('common.add')}
              </button>
            </div>
          </form>

          {customHolidays.length > 0 ? (
            <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar pr-2">
              {customHolidays.map((holiday) => (
                <div
                  key={holiday.id}
                  className="flex items-center justify-between p-3 bg-white/50 dark:bg-gray-700/30 rounded-xl border border-gray-100 dark:border-gray-700/50 hover:border-red-200 dark:hover:border-red-800/50 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${holiday.isRecurring ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'}`}>
                      {holiday.isRecurring ? <RefreshCw className="w-4 h-4" /> : <Calendar className="w-4 h-4" />}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{holiday.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {holiday.date} {holiday.isRecurring && `• ${t('settings.holiday.everyYear')}`}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteHoliday(holiday.id)}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                    title={t('common.delete')}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400 bg-gray-50/50 dark:bg-gray-800/50 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
              <Calendar className="w-8 h-8 mx-auto mb-2 opacity-20" />
              <p>{t('settings.holiday.noHolidays')}</p>
            </div>
          )}
        </div>

        {/* Notification Settings */}
        <div className="glass-card rounded-3xl p-8 animate-slide-in" style={{ animationDelay: '0.45s' }}>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-yellow-50 dark:bg-yellow-900/30 flex items-center justify-center text-yellow-600 dark:text-yellow-400">
              <Bell className="w-5 h-5" strokeWidth={2} />
            </div>
            {t('settings.notification.title')}
          </h3>
          <div className="bg-white/50 dark:bg-gray-700/30 rounded-2xl border border-gray-100 dark:border-gray-700/50 overflow-hidden">
            <button
              onClick={() => setShowNotificationSettings(true)}
              className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            >
              <span className="font-medium text-gray-700 dark:text-gray-300">{t('settings.notification.configure')}</span>
              <ChevronRight className="w-5 h-5 text-gray-400 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>

        {/* Statistics */}
        <div className="glass-card rounded-3xl p-8 animate-slide-in" style={{ animationDelay: '0.5s' }}>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <BarChart2 className="w-5 h-5" strokeWidth={2} />
            </div>
            {t('settings.stats.title')}
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-white/50 dark:bg-gray-700/30 rounded-2xl border border-gray-100 dark:border-gray-700/50 text-center">
              <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{stats?.total || 0}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider">{t('settings.stats.total')}</div>
            </div>
            <div className="p-4 bg-white/50 dark:bg-gray-700/30 rounded-2xl border border-gray-100 dark:border-gray-700/50 text-center">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400 mb-1">{stats?.completed || 0}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider">{t('settings.stats.completed')}</div>
            </div>
            <div className="p-4 bg-white/50 dark:bg-gray-700/30 rounded-2xl border border-gray-100 dark:border-gray-700/50 text-center">
              <div className="text-2xl font-bold text-orange-600 dark:text-orange-400 mb-1">{stats?.pending || 0}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider">{t('settings.stats.pending')}</div>
            </div>

            {/* Storage Usage (Moved from Data Management) */}
            <div className="p-4 bg-white/50 dark:bg-gray-700/30 rounded-2xl border border-gray-100 dark:border-gray-700/50 text-center flex flex-col justify-center items-center">
              <div className="text-lg font-bold text-gray-700 dark:text-gray-300 mb-1">{getStorageSize()}</div>
              <div className="text-[10px] text-gray-400 dark:text-gray-500 font-medium uppercase tracking-wider flex items-center gap-1 justify-center">
                <HardDrive className="w-3 h-3" />
                {t('settings.data.storage')}
              </div>
            </div>
          </div>
        </div>

        {/* Widget Settings */}
        <div className="glass-card rounded-3xl p-8 animate-slide-in" style={{ animationDelay: '0.5s' }}>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-50 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400">
              <Layout className="w-5 h-5" strokeWidth={2} />
            </div>
            {t('settings.widget.title', 'Widget Settings')}
          </h3>

          <div className="p-4 bg-white/50 dark:bg-gray-700/30 rounded-2xl border border-gray-100 dark:border-gray-700/50">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t('settings.widget.transparency', 'Background Transparency')}
                </span>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {widgetTransparency}%
                </p>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                // Using a separate widget transparency value or reusing the theme transparency?
                // The prompt implied a specific widget transparency, but for now let's reuse a local state or just save to localStorage directly if not in context.
                // Actually, let's use a new local state in SettingsView initialized from localStorage for now to avoid Context bloat unless requested.
                // Wait, useTheme has 'transparency', but that's for the APP background.
                // I should add a specific widget transparency state.
                value={widgetTransparency}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  setWidgetTransparency(val);
                  localStorage.setItem('widgetTransparency', val.toString());
                }}
                className="w-32 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 accent-purple-600"
              />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              {t('settings.widget.transparencyDesc', 'Adjust the transparency of the widget background on your home screen.')}
            </p>
            {/* Transparency Logic is in TodoContext hidden by useEffect deps. 
                We need to trigger an update.
                For now, let's just use a window dispatch since we don't want to change Context type signature drastically if possible.
                But wait, the user wants "Perfect".
                Let's add a button that simply logs or re-saves locally to trigger? No.
                
                Let's dispatch a custom event that TodoContext listens to. */}
            <button
              onClick={async () => {
                try {
                  const platform = Capacitor.getPlatform();
                  if (platform !== 'android') {
                    alert('위젯은 Android에서만 사용 가능합니다.');
                    return;
                  }

                  // 일반 할일 + 반복 할일을 합쳐서 syncWidget 호출
                  const allTodos = [...todos, ...getRecurringTodos()];

                  // 휴가 데이터에 직원 이름 추가
                  const vacationsWithNames = vacations.map(v => {
                    const employee = employees.find(e => e.id === v.employeeId)
                    return {
                      ...v,
                      employeeName: employee?.name || ''
                    }
                  })

                  await syncWidget({ todos: allTodos, vacations: vacationsWithNames });
                  alert('위젯이 업데이트되었습니다!');
                } catch (error) {
                  console.error('📱 Widget Sync ERROR:', error);
                  alert('위젯 업데이트 실패: ' + (error as any)?.message);
                }
              }}
              className="mt-4 w-full py-2 bg-purple-600 text-white rounded-xl active:scale-95 transition-transform"
            >
              {t('settings.widget.refresh', 'Sync Widget Now')}
            </button>
            <p className="text-xs text-gray-500 text-center mt-2">
              {t('settings.widget.refreshDesc', 'If tasks are not showing, try syncing manually.')}
            </p>
          </div>
        </div>

        {/* Data Management */}
        <div className="glass-card rounded-3xl p-8 animate-slide-in" style={{ animationDelay: '0.6s' }}>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-green-50 dark:bg-green-900/30 flex items-center justify-center text-green-600 dark:text-green-400">
              <HardDrive className="w-5 h-5" strokeWidth={2} />
            </div>
            {t('settings.data.title')}
          </h3>

          <div className="grid grid-cols-1 gap-4">

            {/* Action Buttons */}
            <div className="space-y-3">
              <button
                onClick={handleExport}
                className="w-full flex items-center justify-between p-4 bg-white/50 dark:bg-gray-700/30 rounded-xl border border-gray-100 dark:border-gray-700/50 hover:bg-white dark:hover:bg-gray-700 hover:shadow-md transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">
                    <Download className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-gray-900 dark:text-white text-sm">{t('settings.data.backup')}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{t('settings.data.backupDesc')}</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400 group-hover:translate-x-1 transition-transform" />
              </button>

              <div className="relative">
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportFile}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <div className="w-full flex items-center justify-between p-4 bg-white/50 dark:bg-gray-700/30 rounded-xl border border-gray-100 dark:border-gray-700/50 hover:bg-white dark:hover:bg-gray-700 hover:shadow-md transition-all group">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-50 dark:bg-green-900/30 rounded-lg text-green-600 dark:text-green-400 group-hover:scale-110 transition-transform">
                      <Upload className="w-4 h-4" />
                    </div>
                    <div className="text-left">
                      <p className="font-semibold text-gray-900 dark:text-white text-sm">{t('settings.data.restore')}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{t('settings.data.restoreDesc')}</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </div>
          </div>

          {importError && (
            <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded-xl flex items-center gap-2 text-sm text-red-600 dark:text-red-400 animate-shake">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {importError}
            </div>
          )}

          {showImportSuccess && (
            <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-900/30 rounded-xl flex items-center gap-2 text-sm text-green-600 dark:text-green-400 animate-slide-in">
              <Check className="w-4 h-4 flex-shrink-0" />
              {t('settings.data.restoreSuccess')}
            </div>
          )}

          <button
            onClick={handleClearCompleted}
            className="mt-6 w-full flex items-center justify-center gap-2 p-3 text-red-600 dark:text-red-400 bg-red-50 hover:bg-red-100 dark:bg-red-900/10 dark:hover:bg-red-900/20 rounded-xl transition-colors text-sm font-medium"
          >
            <Trash2 className="w-4 h-4" />
            {t('settings.data.clearCompleted')}
          </button>
        </div>

        {/* Footer Info */}
        <div className="text-center pb-8 pt-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-full">
            <Info className="w-3 h-3 text-gray-400" />
            <p className="text-xs text-gray-500 dark:text-gray-400">
              TodoList App v1.0.0 • © 2024
            </p>
          </div>
        </div>

        {/* Notification Settings Modal */}
        {showNotificationSettings && (
          <NotificationSettings onClose={() => setShowNotificationSettings(false)} />
        )}
      </div>
    </div>
  )
}


export default SettingsView