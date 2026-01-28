import { useState, useEffect } from 'react'
import { BarChart3, TrendingUp, Clock, Target, Flame, Calendar, Download, Upload, Trash2 } from 'lucide-react'
import { getPomodoroStats, formatDuration, exportPomodoroData, importPomodoroData, clearPomodoroData } from '../../../utils/pomodoroStats'
import type { PomodoroStats } from '../../../utils/pomodoroStats'

interface PomodoroStatsProps {
  isOpen: boolean
  onClose: () => void
}

const PomodoroStatsComponent = ({ isOpen, onClose }: PomodoroStatsProps) => {
  const [stats, setStats] = useState<PomodoroStats | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'daily' | 'weekly' | 'monthly'>('overview')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isOpen) {
      loadStats()
    }
  }, [isOpen])

  const loadStats = async () => {
    setLoading(true)
    try {
      const pomodoroStats = getPomodoroStats()
      setStats(pomodoroStats)
    } catch {
      // 통계 로드 실패 시 무시
    } finally {
      setLoading(false)
    }
  }

  const handleExport = () => {
    try {
      const data = exportPomodoroData()
      const blob = new Blob([data], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `pomodoro-stats-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch {
      alert('데이터 내보내기에 실패했습니다.')
    }
  }

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string
        const success = importPomodoroData(content)
        if (success) {
          alert('데이터를 성공적으로 가져왔습니다.')
          loadStats()
        } else {
          alert('잘못된 데이터 형식입니다.')
        }
      } catch {
        alert('데이터 가져오기에 실패했습니다.')
      }
    }
    reader.readAsText(file)
    event.target.value = '' // 같은 파일 다시 선택 가능하도록
  }

  const handleClearData = () => {
    if (confirm('모든 포모도로 데이터를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
      clearPomodoroData()
      alert('데이터가 삭제되었습니다.')
      loadStats()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* 헤더 */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            포모도로 통계
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExport}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              title="데이터 내보내기"
            >
              <Download className="w-4 h-4" />
            </button>
            <label className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg cursor-pointer" title="데이터 가져오기">
              <Upload className="w-4 h-4" />
              <input
                type="file"
                accept=".json"
                onChange={handleImport}
                className="hidden"
              />
            </label>
            <button
              onClick={handleClearData}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-red-500"
              title="데이터 초기화"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            >
              ✕
            </button>
          </div>
        </div>

        {/* 탭 네비게이션 */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex space-x-8 px-4">
            {[
              { id: 'overview', label: '개요', icon: Target },
              { id: 'daily', label: '일별', icon: Calendar },
              { id: 'weekly', label: '주별', icon: TrendingUp },
              { id: 'monthly', label: '월별', icon: BarChart3 }
            ].map(tab => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as 'overview' | 'daily' | 'weekly' | 'monthly')}
                  className={`py-3 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-1">
                    <Icon className="w-4 h-4" />
                    {tab.label}
                  </div>
                </button>
              )
            })}
          </nav>
        </div>

        {/* 내용 */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="text-gray-500 dark:text-gray-400">통계를 로드하는 중...</div>
            </div>
          ) : !stats ? (
            <div className="flex items-center justify-center h-32">
              <div className="text-gray-500 dark:text-gray-400">통계 데이터가 없습니다.</div>
            </div>
          ) : (
            <>
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  {/* 전체 개요 카드들 */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-4 rounded-lg text-white">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-blue-100">총 세션</p>
                          <p className="text-2xl font-bold">{stats.totalSessions}</p>
                        </div>
                        <Target className="w-8 h-8 text-blue-200" />
                      </div>
                    </div>

                    <div className="bg-gradient-to-r from-green-500 to-green-600 p-4 rounded-lg text-white">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-green-100">완료 세션</p>
                          <p className="text-2xl font-bold">{stats.completedSessions}</p>
                        </div>
                        <Clock className="w-8 h-8 text-green-200" />
                      </div>
                    </div>

                    <div className="bg-gradient-to-r from-purple-500 to-purple-600 p-4 rounded-lg text-white">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-purple-100">총 집중 시간</p>
                          <p className="text-2xl font-bold">{formatDuration(stats.totalFocusTime)}</p>
                        </div>
                        <TrendingUp className="w-8 h-8 text-purple-200" />
                      </div>
                    </div>

                    <div className="bg-gradient-to-r from-orange-500 to-orange-600 p-4 rounded-lg text-white">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-orange-100">현재 연속</p>
                          <p className="text-2xl font-bold">{stats.currentStreak}일</p>
                        </div>
                        <Flame className="w-8 h-8 text-orange-200" />
                      </div>
                    </div>
                  </div>

                  {/* 추가 메트릭스 */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                      <h3 className="font-medium text-gray-900 dark:text-white mb-3">성과 지표</h3>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">완료율</span>
                          <span className="font-medium text-gray-900 dark:text-white">{stats.completionRate.toFixed(1)}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">최장 연속</span>
                          <span className="font-medium text-gray-900 dark:text-white">{stats.longestStreak}일</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">일평균 세션</span>
                          <span className="font-medium text-gray-900 dark:text-white">{stats.averageSessionsPerDay.toFixed(1)}개</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                      <h3 className="font-medium text-gray-900 dark:text-white mb-3">오늘 현황</h3>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">완료 세션</span>
                          <span className="font-medium text-gray-900 dark:text-white">{stats.todayStats.completedSessions}개</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">집중 시간</span>
                          <span className="font-medium text-gray-900 dark:text-white">{formatDuration(stats.todayStats.focusTime)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">완료율</span>
                          <span className="font-medium text-gray-900 dark:text-white">{stats.todayStats.completionRate.toFixed(1)}%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'daily' && (
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">오늘 상세 통계</h3>
                  <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.todayStats.sessions}</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">시작한 세션</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.todayStats.completedSessions}</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">완료한 세션</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{formatDuration(stats.todayStats.focusTime)}</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">집중 시간</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{stats.todayStats.completionRate.toFixed(1)}%</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">완료율</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'weekly' && (
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">이번 주 통계</h3>
                  <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.weekStats.totalSessions}</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">총 세션</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.weekStats.completedSessions}</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">완료 세션</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{formatDuration(stats.weekStats.totalFocusTime)}</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">집중 시간</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{stats.weekStats.completionRate.toFixed(1)}%</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">완료율</div>
                      </div>
                    </div>

                    {/* 일별 분석 */}
                    <h4 className="font-medium text-gray-900 dark:text-white mb-3">일별 분석</h4>
                    <div className="grid grid-cols-7 gap-2">
                      {['일', '월', '화', '수', '목', '금', '토'].map((day, index) => (
                        <div key={day} className="text-center">
                          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">{day}</div>
                          <div className={`h-16 rounded flex flex-col items-center justify-center text-xs ${
                            stats.weekStats.dailyBreakdown[index]?.completedSessions > 0
                              ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                              : 'bg-gray-100 dark:bg-gray-600 text-gray-500 dark:text-gray-400'
                          }`}>
                            <div className="font-bold">{stats.weekStats.dailyBreakdown[index]?.completedSessions || 0}</div>
                            <div>세션</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'monthly' && (
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">이번 달 통계</h3>
                  <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.monthStats.totalSessions}</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">총 세션</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.monthStats.completedSessions}</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">완료 세션</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{formatDuration(stats.monthStats.totalFocusTime)}</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">집중 시간</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{stats.monthStats.completionRate.toFixed(1)}%</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">완료율</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default PomodoroStatsComponent