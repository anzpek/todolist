import React, { useState } from 'react'
import { useTodos } from '../contexts/TodoContext'
import { useTheme } from '../contexts/ThemeContext'
import { useAuth } from '../contexts/AuthContext'
import NotificationSettings from './NotificationSettings'

const SettingsView: React.FC = () => {
  const { user, logout } = useAuth()
  const { exportData, importData, clearCompleted, stats, syncing, syncWithCloud } = useTodos()
  const { theme, setTheme } = useTheme()
  const [importError, setImportError] = useState<string | null>(null)
  const [showImportSuccess, setShowImportSuccess] = useState(false)
  const [showNotificationSettings, setShowNotificationSettings] = useState(false)

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
          setImportError('잘못된 파일 형식입니다.')
        }
      } catch (error) {
        setImportError('파일을 읽을 수 없습니다.')
      }
    }
    reader.readAsText(file)
    
    // 파일 입력 초기화
    event.target.value = ''
  }

  const handleClearCompleted = () => {
    const completedCount = stats.completed
    if (completedCount === 0) {
      alert('완료된 할일이 없습니다.')
      return
    }
    
    if (confirm(`완료된 할일 ${completedCount}개를 삭제하시겠습니까?`)) {
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
    if (confirm('로그아웃하시겠습니까?')) {
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
    <div className="space-y-6">
      {/* 헤더 */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">설정</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          앱 설정 및 데이터 관리
        </p>
      </div>

      {/* 계정 정보 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">계정</h3>
        <div className="space-y-3">
          <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center">
              {user?.photoURL ? (
                <img src={user.photoURL} alt="프로필" className="w-8 h-8 rounded-full" />
              ) : (
                <span className="text-primary-600 dark:text-primary-400">
                  {user?.isAnonymous ? '👤' : user?.email?.charAt(0).toUpperCase() || 'U'}
                </span>
              )}
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium text-gray-900 dark:text-white">
                {user?.isAnonymous ? '게스트 사용자' : user?.displayName || '사용자'}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">
                {user?.isAnonymous ? '로컬 저장' : user?.email || '클라우드 동기화'}
              </div>
            </div>
          </div>
          
          {/* 동기화 버튼 */}
          {!user?.isAnonymous && (
            <button
              onClick={handleSync}
              disabled={syncing}
              className="w-full flex items-center justify-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors disabled:opacity-50"
            >
              {syncing ? (
                <div className="w-4 h-4 border-2 border-blue-400 border-t-blue-600 rounded-full animate-spin" />
              ) : (
                <span className="text-lg">🔄</span>
              )}
              <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                {syncing ? '동기화 중...' : '클라우드와 동기화'}
              </span>
            </button>
          )}
          
          {/* 로그아웃 버튼 */}
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
          >
            <span className="text-lg">🚪</span>
            <span className="text-sm font-medium text-red-800 dark:text-red-200">로그아웃</span>
          </button>
        </div>
      </div>

      {/* 테마 설정 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">테마</h3>
        <div className="space-y-2">
          {[
            { key: 'light', label: '라이트 모드', icon: '☀️' },
            { key: 'dark', label: '다크 모드', icon: '🌙' },
            { key: 'system', label: '시스템 설정', icon: '💻' }
          ].map((option) => (
            <button
              key={option.key}
              onClick={() => setTheme(option.key as 'light' | 'dark' | 'system')}
              className={`w-full flex items-center justify-between p-3 rounded-lg border transition-colors ${
                theme === option.key
                  ? 'bg-primary-50 border-primary-200 dark:bg-primary-900/20 dark:border-primary-700'
                  : 'bg-gray-50 border-gray-200 dark:bg-gray-700 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-lg">{option.icon}</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {option.label}
                </span>
              </div>
              {theme === option.key && (
                <span className="text-primary-600 dark:text-primary-400 text-sm">✓</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* 데이터 통계 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">데이터 통계</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-primary-600 dark:text-primary-400">
              {stats.total}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">총 할일</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {stats.completed}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">완료</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
              {stats.pending}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">진행중</div>
          </div>
          <div className="text-center">
            <div className="text-sm font-bold text-gray-600 dark:text-gray-400">
              {getStorageSize()}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">저장공간</div>
          </div>
        </div>
      </div>

      {/* 데이터 관리 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">데이터 관리</h3>
        
        <div className="space-y-3">
          {/* 데이터 내보내기 */}
          <button
            onClick={handleExport}
            className="w-full flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="text-lg">📥</span>
              <div className="text-left">
                <div className="text-sm font-medium text-blue-800 dark:text-blue-200">
                  데이터 내보내기
                </div>
                <div className="text-xs text-blue-600 dark:text-blue-400">
                  할일 데이터를 JSON 파일로 저장
                </div>
              </div>
            </div>
          </button>

          {/* 데이터 가져오기 */}
          <div className="relative">
            <input
              type="file"
              accept=".json"
              onChange={handleImportFile}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <div className="w-full flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors">
              <div className="flex items-center gap-3">
                <span className="text-lg">📤</span>
                <div className="text-left">
                  <div className="text-sm font-medium text-green-800 dark:text-green-200">
                    데이터 가져오기
                  </div>
                  <div className="text-xs text-green-600 dark:text-green-400">
                    JSON 파일에서 할일 데이터 복원
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 완료된 할일 삭제 */}
          <button
            onClick={handleClearCompleted}
            className="w-full flex items-center justify-between p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700 rounded-lg hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="text-lg">🗑️</span>
              <div className="text-left">
                <div className="text-sm font-medium text-orange-800 dark:text-orange-200">
                  완료된 할일 삭제
                </div>
                <div className="text-xs text-orange-600 dark:text-orange-400">
                  완료된 할일 {stats.completed}개를 모두 삭제
                </div>
              </div>
            </div>
          </button>
        </div>

        {/* 알림 메시지 */}
        {importError && (
          <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg">
            <div className="text-sm text-red-800 dark:text-red-200">
              ❌ {importError}
            </div>
          </div>
        )}

        {showImportSuccess && (
          <div className="mt-3 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg">
            <div className="text-sm text-green-800 dark:text-green-200">
              ✅ 데이터를 성공적으로 가져왔습니다.
            </div>
          </div>
        )}
      </div>

      {/* 앱 정보 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">앱 정보</h3>
        <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
          <div className="flex justify-between">
            <span>버전</span>
            <span>1.0.0</span>
          </div>
          <div className="flex justify-between">
            <span>빌드</span>
            <span>React 19</span>
          </div>
          <div className="flex justify-between">
            <span>PWA</span>
            <span className="text-green-600 dark:text-green-400">지원됨</span>
          </div>
          <div className="flex justify-between">
            <span>오프라인 모드</span>
            <span className="text-green-600 dark:text-green-400">지원됨</span>
          </div>
        </div>
      </div>

      {/* 알림 설정 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">알림</h3>
        
        <button
          onClick={() => setShowNotificationSettings(true)}
          className="w-full flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
        >
          <div className="flex items-center gap-3">
            <span className="text-lg">🔔</span>
            <div className="text-left">
              <div className="text-sm font-medium text-blue-800 dark:text-blue-200">
                알림 설정
              </div>
              <div className="text-xs text-blue-600 dark:text-blue-400">
                마감 알림, 완료 축하 등 설정
              </div>
            </div>
          </div>
          <span className="text-blue-600 dark:text-blue-400">→</span>
        </button>
      </div>

      {/* 하단 여백 */}
      <div className="h-8" />
      
      {/* 알림 설정 모달 */}
      {showNotificationSettings && (
        <NotificationSettings onClose={() => setShowNotificationSettings(false)} />
      )}
    </div>
  )
}

export default SettingsView