import React, { useState } from 'react'
import { useTodos } from '../contexts/TodoContext'
import { useTheme } from '../contexts/ThemeContext'
import { useAuth } from '../contexts/AuthContext'
import { useFontSize } from '../contexts/FontSizeContext'
import { useCustomHolidays } from '../contexts/CustomHolidayContext'
import NotificationSettings from './NotificationSettings'
import { useTranslation } from 'react-i18next'
import { firestoreService } from '../services/firestoreService'
import {
  Trash2, Plus, User, Palette, Type, Calendar, BarChart2, HardDrive, Bell,
  LogOut, RefreshCw, Moon, Sun, Monitor, Download, Upload, Check, AlertCircle,
  ChevronRight, Info, Globe
} from 'lucide-react'

const SettingsView: React.FC = () => {
  const { t, i18n } = useTranslation()
  const { currentUser: user, logout } = useAuth()
  const { exportData, importData, clearCompleted, stats, syncing, syncWithCloud } = useTodos()
  const { theme, setTheme } = useTheme()
  const { fontSizeLevel, setFontSizeLevel } = useFontSize()
  const { customHolidays, addCustomHoliday, deleteCustomHoliday } = useCustomHolidays()
  const [importError, setImportError] = useState<string | null>(null)
  const [showImportSuccess, setShowImportSuccess] = useState(false)
  const [showNotificationSettings, setShowNotificationSettings] = useState(false)
  const [newHolidayDate, setNewHolidayDate] = useState('')
  const [newHolidayName, setNewHolidayName] = useState('')
  const [newHolidayIsRecurring, setNewHolidayIsRecurring] = useState(false)

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

    // 파일 입력 초기화
    event.target.value = ''
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

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-10">
      {/* 헤더 */}
      <div className="animate-fade-in">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 tracking-tight">{t('settings.title')}</h2>
        <p className="text-gray-500 dark:text-gray-400 font-medium">
          {t('settings.subtitle')}
        </p>
      </div>

      {/* 계정 정보 */}
      <div className="glass-card rounded-3xl p-8 animate-slide-in" style={{ animationDelay: '0.1s' }}>
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
            <User className="w-5 h-5" strokeWidth={2} />
          </div>
          {t('settings.account.title')}
        </h3>
        <div className="space-y-4">
          <div className="flex items-center gap-4 p-4 bg-white/50 dark:bg-gray-700/30 rounded-xl border border-gray-100 dark:border-gray-700/50 backdrop-blur-sm">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900 dark:to-blue-800 rounded-full flex items-center justify-center shadow-inner">
              {user?.photoURL ? (
                <img src={user.photoURL} alt="프로필" className="w-10 h-10 rounded-full object-cover" />
              ) : (
                <span className="text-xl font-bold text-blue-600 dark:text-blue-300">
                  {user?.isAnonymous ? 'G' : user?.email?.charAt(0).toUpperCase() || 'U'}
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-base font-bold text-gray-900 dark:text-white truncate">
                {user?.isAnonymous ? t('settings.account.guest') : user?.displayName || 'User'}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400 truncate">
                {user?.isAnonymous ? t('settings.account.guestDesc') : user?.email}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {!user?.isAnonymous && (
              <button
                onClick={handleSync}
                disabled={syncing}
                className="flex items-center justify-center gap-2.5 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-2xl hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-all active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 group"
              >
                {syncing ? (
                  <RefreshCw className="w-5 h-5 text-blue-600 animate-spin" />
                ) : (
                  <RefreshCw className="w-5 h-5 text-blue-600 dark:text-blue-400 group-hover:rotate-180 transition-transform duration-500" />
                )}
                <span className="font-semibold text-blue-700 dark:text-blue-300">
                  {syncing ? t('settings.account.syncing') : t('settings.account.sync')}
                </span>
              </button>
            )}

            <button
              onClick={handleLogout}
              className="flex items-center justify-center gap-2.5 p-4 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded-2xl hover:bg-red-100 dark:hover:bg-red-900/30 transition-all active:scale-[0.98] group"
            >
              <LogOut className="w-5 h-5 text-red-600 dark:text-red-400 group-hover:-translate-x-1 transition-transform" />
              <span className="font-semibold text-red-700 dark:text-red-300">{t('settings.account.logout')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 언어 설정 */}
      <div className="glass-card rounded-3xl p-8 animate-slide-in" style={{ animationDelay: '0.15s' }}>
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
            <Globe className="w-5 h-5" strokeWidth={2} />
          </div>
          {t('settings.language.title')}
        </h3>
        <div className="grid grid-cols-2 gap-4">
          {[
            { key: 'ko', label: t('settings.language.korean'), flag: '🇰🇷' },
            { key: 'en', label: t('settings.language.english'), flag: '🇺🇸' }
          ].map((option) => {
            const isActive = i18n.language === option.key
            return (
              <button
                key={option.key}
                onClick={async () => {
                  i18n.changeLanguage(option.key)
                  if (!user?.isAnonymous && user?.uid) {
                    try {
                      await firestoreService.updateUserLanguage(user.uid, option.key)
                    } catch (error) {
                      console.error('Failed to sync language setting:', error)
                    }
                  }
                }}
                className={`flex items-center justify-center gap-3 p-5 rounded-2xl border transition-all duration-300 ${isActive
                  ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-700 shadow-md scale-[1.02]'
                  : 'bg-white/50 dark:bg-gray-700/30 border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 hover:border-gray-200'
                  }`}
              >
                <span className="text-2xl">{option.flag}</span>
                <span className={`text-sm font-semibold ${isActive ? 'text-blue-700 dark:text-blue-300' : 'text-gray-600 dark:text-gray-400'
                  }`}>
                  {option.label}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* 테마 설정 */}
      <div className="glass-card rounded-3xl p-8 animate-slide-in" style={{ animationDelay: '0.2s' }}>
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-purple-50 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400">
            <Palette className="w-5 h-5" strokeWidth={2} />
          </div>
          {t('settings.theme.title')}
        </h3>
        <div className="grid grid-cols-3 gap-4">
          {[
            { key: 'light', label: t('settings.theme.light'), icon: Sun },
            { key: 'dark', label: t('settings.theme.dark'), icon: Moon },
            { key: 'system', label: t('settings.theme.system'), icon: Monitor }
          ].map((option) => {
            const Icon = option.icon
            const isActive = theme === option.key
            return (
              <button
                key={option.key}
                onClick={() => setTheme(option.key as 'light' | 'dark' | 'system')}
                className={`flex flex-col items-center justify-center gap-3 p-5 rounded-2xl border transition-all duration-300 ${isActive
                  ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-700 shadow-md scale-[1.02]'
                  : 'bg-white/50 dark:bg-gray-700/30 border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 hover:border-gray-200'
                  }`}
              >
                <Icon className={`w-6 h-6 ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'}`} />
                <span className={`text-sm font-semibold ${isActive ? 'text-blue-700 dark:text-blue-300' : 'text-gray-600 dark:text-gray-400'
                  }`}>
                  {option.label}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* 글자 크기 설정 */}
      <div className="glass-card rounded-3xl p-8 animate-slide-in" style={{ animationDelay: '0.3s' }}>
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
            <Type className="w-5 h-5" strokeWidth={2} />
          </div>
          {t('settings.fontSize.title')}
        </h3>
        <div className="space-y-6">
          <div className="flex items-center justify-between bg-white/50 dark:bg-gray-700/30 p-6 rounded-xl border border-gray-100 dark:border-gray-700/50">
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">{t('settings.fontSize.small')}</span>
            <div className="flex gap-3 items-center flex-wrap justify-center">
              {[1, 2, 3, 4, 5, 6, 7].map((level) => (
                <button
                  key={level}
                  onClick={() => setFontSizeLevel(level as 1 | 2 | 3 | 4 | 5 | 6 | 7)}
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${fontSizeLevel === level
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30 scale-110'
                    : 'bg-white dark:bg-gray-600 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-500'
                    }`}
                  aria-label={`글자 크기 ${level} 단계`}
                >
                  <span style={{ fontSize: `${0.5 + level * 0.1}rem`, fontWeight: 600 }}>A</span>
                </button>
              ))}
            </div>
            <span className="text-lg font-bold text-gray-900 dark:text-white">{t('settings.fontSize.large')}</span>
          </div>

          {/* 미리보기 */}
          <div className="p-5 border border-gray-200/60 dark:border-gray-700/60 rounded-xl bg-gray-50/50 dark:bg-gray-800/50 backdrop-blur-sm">
            <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 mb-2 uppercase tracking-wider">Preview</p>
            <p className="text-base text-gray-800 dark:text-gray-200 leading-relaxed font-medium">
              {t('settings.fontSize.preview')}
            </p>
          </div>
        </div>
      </div>

      {/* 공휴일 설정 */}
      <div className="glass-card rounded-3xl p-8 animate-slide-in" style={{ animationDelay: '0.4s' }}>
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-red-50 dark:bg-red-900/30 flex items-center justify-center text-red-600 dark:text-red-400">
            <Calendar className="w-5 h-5" strokeWidth={2} />
          </div>
          {t('settings.holiday.title')}
        </h3>

        {/* 공휴일 추가 폼 */}
        <form onSubmit={handleAddHoliday} className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="flex-1 flex gap-3">
            <input
              type="text"
              onFocus={(e) => (e.target.type = 'date')}
              onBlur={(e) => {
                if (!e.target.value) e.target.type = 'text';
              }}
              value={newHolidayDate}
              placeholder={t('settings.holiday.datePlaceholder')}
              onChange={(e) => setNewHolidayDate(e.target.value)}
              className="px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white/80 dark:bg-gray-800/80 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder-gray-500"
              required
            />
            <input
              type="text"
              value={newHolidayName}
              onChange={(e) => setNewHolidayName(e.target.value)}
              placeholder={t('settings.holiday.addPlaceholder')}
              className="flex-1 px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white/80 dark:bg-gray-800/80 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              required
            />
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center h-full px-3 bg-white/50 dark:bg-gray-700/30 rounded-xl border border-gray-200 dark:border-gray-700">
              <input
                type="checkbox"
                id="recurringHoliday"
                checked={newHolidayIsRecurring}
                onChange={(e) => setNewHolidayIsRecurring(e.target.checked)}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800"
              />
              <label htmlFor="recurringHoliday" className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap cursor-pointer select-none">
                {t('settings.holiday.recurring')}
              </label>
            </div>
            <button
              type="submit"
              className="px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 active:scale-95 transition-all shadow-md shadow-blue-500/20 flex items-center justify-center min-w-[3rem]"
              title={t('common.add')}
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
        </form>

        {/* 공휴일 목록 */}
        <div className="space-y-2 max-h-64 overflow-y-auto pr-1 custom-scrollbar">
          {customHolidays.length === 0 ? (
            <div className="text-center py-8 bg-gray-50/50 dark:bg-gray-800/30 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t('settings.holiday.noHolidays')}
              </p>
            </div>
          ) : (
            customHolidays.map((holiday) => (
              <div key={holiday.id} className="group flex items-center justify-between p-3 bg-white/60 dark:bg-gray-800/40 rounded-xl border border-gray-100 dark:border-gray-700/50 hover:border-blue-200 dark:hover:border-blue-800 transition-all hover:shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-red-50 dark:bg-red-900/20 flex items-center justify-center text-red-600 dark:text-red-400 font-bold text-sm border border-red-100 dark:border-red-800/30">
                    {holiday.date.split('-')[2]}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900 dark:text-white">
                        {holiday.name}
                      </span>
                      {holiday.isRecurring && (
                        <span className="text-[10px] px-2 py-0.5 bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 rounded-full font-semibold border border-blue-200 dark:border-blue-800/50">
                          {t('settings.holiday.yearly')}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {holiday.date}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handleDeleteHoliday(holiday.id)}
                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                  title={t('common.delete')}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 데이터 통계 */}
      <div className="glass-card rounded-3xl p-8 animate-slide-in" style={{ animationDelay: '0.5s' }}>
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-green-50 dark:bg-green-900/30 flex items-center justify-center text-green-600 dark:text-green-400">
            <BarChart2 className="w-5 h-5" strokeWidth={2} />
          </div>
          {t('settings.stats.title')}
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: t('settings.stats.total'), value: stats?.total || 0, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/20' },
            { label: t('settings.stats.completed'), value: stats?.completed || 0, color: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-900/20' },
            { label: t('settings.stats.pending'), value: stats?.pending || 0, color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-900/20' },
            { label: t('settings.stats.storage'), value: getStorageSize(), color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-900/20' }
          ].map((item, idx) => (
            <div key={idx} className={`flex flex-col items-center justify-center p-4 rounded-xl ${item.bg} border border-transparent hover:border-current transition-all duration-300`}>
              <div className={`text-2xl font-bold ${item.color} mb-1`}>
                {item.value}
              </div>
              <div className="text-xs font-medium text-gray-600 dark:text-gray-400">{item.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* 데이터 관리 */}
      <div className="glass-card rounded-3xl p-8 animate-slide-in" style={{ animationDelay: '0.6s' }}>
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-orange-50 dark:bg-orange-900/30 flex items-center justify-center text-orange-600 dark:text-orange-400">
            <HardDrive className="w-5 h-5" strokeWidth={2} />
          </div>
          {t('settings.data.title')}
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <button
            onClick={handleExport}
            className="flex flex-col items-center justify-center gap-3 p-6 bg-white/50 dark:bg-gray-700/30 border border-gray-200 dark:border-gray-700 rounded-2xl hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-200 dark:hover:border-blue-800 transition-all group"
          >
            <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform duration-300">
              <Download className="w-6 h-6" />
            </div>
            <div className="text-center">
              <div className="text-base font-bold text-gray-900 dark:text-white group-hover:text-blue-700 dark:group-hover:text-blue-300">{t('settings.data.export')}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t('settings.data.exportDesc')}</div>
            </div>
          </button>

          <div className="relative group">
            <input
              type="file"
              accept=".json"
              onChange={handleImportFile}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            />
            <div className="flex flex-col items-center justify-center gap-3 p-6 bg-white/50 dark:bg-gray-700/30 border border-gray-200 dark:border-gray-700 rounded-2xl group-hover:bg-green-50 dark:group-hover:bg-green-900/20 group-hover:border-green-200 dark:group-hover:border-green-800 transition-all h-full">
              <div className="w-12 h-12 rounded-full bg-green-50 dark:bg-green-900/30 flex items-center justify-center text-green-600 dark:text-green-400 group-hover:scale-110 transition-transform duration-300">
                <Upload className="w-6 h-6" />
              </div>
              <div className="text-center">
                <div className="text-base font-bold text-gray-900 dark:text-white group-hover:text-green-700 dark:group-hover:text-green-300">{t('settings.data.import')}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t('settings.data.importDesc')}</div>
              </div>
            </div>
          </div>

          <button
            onClick={handleClearCompleted}
            className="flex flex-col items-center justify-center gap-3 p-6 bg-white/50 dark:bg-gray-700/30 border border-gray-200 dark:border-gray-700 rounded-2xl hover:bg-orange-50 dark:hover:bg-orange-900/20 hover:border-orange-200 dark:hover:border-orange-800 transition-all group"
          >
            <div className="w-12 h-12 rounded-full bg-orange-50 dark:bg-orange-900/30 flex items-center justify-center text-orange-600 dark:text-orange-400 group-hover:scale-110 transition-transform duration-300">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center">
              <div className="text-base font-bold text-gray-900 dark:text-white group-hover:text-orange-700 dark:group-hover:text-orange-300">{t('settings.data.clear')}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t('settings.data.clearDesc')}</div>
            </div>
          </button>
        </div>

        {/* 알림 메시지 */}
        {(importError || showImportSuccess) && (
          <div className={`mt-6 p-4 rounded-2xl border flex items-center gap-4 animate-fade-in ${importError
            ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200'
            : 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200'
            }`}>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${importError ? 'bg-red-100 dark:bg-red-900/40' : 'bg-green-100 dark:bg-green-900/40'}`}>
              {importError ? <AlertCircle className="w-5 h-5" /> : <Check className="w-5 h-5" />}
            </div>
            <span className="font-medium">{importError || t('settings.data.importSuccess')}</span>
          </div>
        )}
      </div>

      {/* 알림 설정 */}
      <div className="glass-card rounded-3xl p-8 animate-slide-in" style={{ animationDelay: '0.7s' }}>
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-yellow-50 dark:bg-yellow-900/30 flex items-center justify-center text-yellow-600 dark:text-yellow-400">
            <Bell className="w-5 h-5" strokeWidth={2} />
          </div>
          {t('settings.notifications.title')}
        </h3>

        <button
          onClick={() => setShowNotificationSettings(true)}
          className="w-full flex items-center justify-between p-5 bg-white/50 dark:bg-gray-700/30 border border-gray-200 dark:border-gray-700 rounded-2xl hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-200 dark:hover:border-blue-800 transition-all group"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-yellow-50 dark:bg-yellow-900/20 flex items-center justify-center text-yellow-600 dark:text-yellow-400 group-hover:scale-110 transition-transform">
              <Bell className="w-6 h-6" />
            </div>
            <div className="text-left">
              <div className="text-base font-bold text-gray-900 dark:text-white group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors">
                {t('settings.notifications.setup')}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                {t('settings.notifications.desc')}
              </div>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
        </button>
      </div>

      {/* 앱 정보 */}
      <div className="text-center py-6 animate-fade-in" style={{ animationDelay: '0.8s' }}>
        <p className="text-sm font-medium text-gray-400 dark:text-gray-500">
          ToDo List App v1.0.0
        </p>
        <p className="text-xs text-gray-300 dark:text-gray-600 mt-1">
          {t('settings.appInfo')}
        </p>
      </div>

      {/* 알림 설정 모달 */}
      {showNotificationSettings && (
        <NotificationSettings onClose={() => setShowNotificationSettings(false)} />
      )}
    </div>
  )
}

export default SettingsView