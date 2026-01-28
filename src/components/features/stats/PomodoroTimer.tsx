import { useState, useEffect, useRef } from 'react'
import { Play, Pause, RotateCcw, Coffee, Target, Settings, Volume2, VolumeX, X, BarChart3 } from 'lucide-react'
import { savePomodoroSession } from '../../../utils/pomodoroStats'
import PomodoroStats from './PomodoroStats'
import { format } from 'date-fns'

interface PomodoroSettings {
  workTime: number // 분
  shortBreak: number // 분
  longBreak: number // 분
  longBreakInterval: number // 몇 번째 포모도로마다 긴 휴식
  autoStartBreaks: boolean
  autoStartPomodoros: boolean
  soundEnabled: boolean
}

type PomodoroPhase = 'work' | 'shortBreak' | 'longBreak'

const DEFAULT_SETTINGS: PomodoroSettings = {
  workTime: 25,
  shortBreak: 5,
  longBreak: 15,
  longBreakInterval: 4,
  autoStartBreaks: false,
  autoStartPomodoros: false,
  soundEnabled: true,
}

interface PomodoroTimerProps {
  isOpen: boolean
  onClose: () => void
  todoTitle?: string
  todoId?: string
}

const PomodoroTimer = ({ isOpen, onClose, todoTitle, todoId }: PomodoroTimerProps) => {
  const [settings, setSettings] = useState<PomodoroSettings>(DEFAULT_SETTINGS)
  const [isRunning, setIsRunning] = useState(false)
  const [currentPhase, setCurrentPhase] = useState<PomodoroPhase>('work')
  const [timeLeft, setTimeLeft] = useState(settings.workTime * 60) // 초 단위
  const [completedPomodoros, setCompletedPomodoros] = useState(0)
  const [showSettings, setShowSettings] = useState(false)
  const [showStats, setShowStats] = useState(false)
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null)
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // 초기화
  useEffect(() => {
    const savedSettings = localStorage.getItem('pomodoroSettings')
    if (savedSettings) {
      const parsed = JSON.parse(savedSettings)
      setSettings(parsed)
      setTimeLeft(parsed.workTime * 60)
    }

    // 알림음 생성 (간단한 beep 음)
    audioRef.current = new Audio()
    audioRef.current.src = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmoxBSuBzvLZiTYIG2m68OScTwwOUarm7bhqIgU6k9n1vVMvAC6Ew/PfkjUIF2O39uahUxMKRqnh8Mh+Kggp'
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [])

  // 타이머 로직
  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            handlePhaseComplete()
            return 0
          }
          return prev - 1
        })
      }, 1000)
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [isRunning, timeLeft])

  // 페이즈 완료 처리
  const handlePhaseComplete = () => {
    setIsRunning(false)
    
    // 세션 데이터 저장
    if (sessionStartTime) {
      const endTime = new Date()
      const startTime = sessionStartTime
      const duration = Math.floor((endTime.getTime() - startTime.getTime()) / 1000)
      
      try {
        savePomodoroSession({
          todoId: todoId || undefined,
          todoTitle: todoTitle || undefined,
          startTime,
          endTime,
          duration,
          phase: currentPhase,
          completed: true, // 타이머가 끝까지 실행된 경우
          date: format(startTime, 'yyyy-MM-dd')
        })
      } catch (error) {
        console.error('포모도로 세션 저장 실패:', error)
      }
    }
    
    if (settings.soundEnabled && audioRef.current) {
      audioRef.current.play().catch(() => {
        // 소리 재생 실패 시 무시
      })
    }

    // 브라우저 알림
    if ('Notification' in window && Notification.permission === 'granted') {
      const messages = {
        work: '휴식 시간입니다! 잠시 쉬어가세요.',
        shortBreak: '짧은 휴식이 끝났습니다. 다시 집중해보세요!',
        longBreak: '긴 휴식이 끝났습니다. 새로운 마음으로 시작해보세요!'
      }
      
      new Notification('포모도로 타이머', {
        body: messages[currentPhase],
        icon: '/favicon.ico'
      })
    }

    if (currentPhase === 'work') {
      setCompletedPomodoros(prev => prev + 1)
      const nextCompleted = completedPomodoros + 1
      
      if (nextCompleted % settings.longBreakInterval === 0) {
        setCurrentPhase('longBreak')
        setTimeLeft(settings.longBreak * 60)
      } else {
        setCurrentPhase('shortBreak')
        setTimeLeft(settings.shortBreak * 60)
      }
      
      if (settings.autoStartBreaks) {
        setIsRunning(true)
        setSessionStartTime(new Date())
      } else {
        setSessionStartTime(null)
      }
    } else {
      setCurrentPhase('work')
      setTimeLeft(settings.workTime * 60)
      
      if (settings.autoStartPomodoros) {
        setIsRunning(true)
        setSessionStartTime(new Date())
      } else {
        setSessionStartTime(null)
      }
    }
  }

  const toggleTimer = () => {
    if (!isRunning) {
      // 타이머 시작
      setIsRunning(true)
      setSessionStartTime(new Date())
    } else {
      // 타이머 정지 - 미완료 세션으로 저장
      setIsRunning(false)
      if (sessionStartTime) {
        const endTime = new Date()
        const startTime = sessionStartTime
        const duration = Math.floor((endTime.getTime() - startTime.getTime()) / 1000)
        
        try {
          savePomodoroSession({
            todoId: todoId || undefined,
            todoTitle: todoTitle || undefined,
            startTime,
            endTime,
            duration,
            phase: currentPhase,
            completed: false, // 중간에 멈춘 경우
            date: format(startTime, 'yyyy-MM-dd')
          })
        } catch (error) {
          console.error('포모도로 세션 저장 실패:', error)
        }
        setSessionStartTime(null)
      }
    }
  }

  const resetTimer = () => {
    // 진행 중인 세션이 있으면 미완료로 저장
    if (isRunning && sessionStartTime) {
      const endTime = new Date()
      const startTime = sessionStartTime
      const duration = Math.floor((endTime.getTime() - startTime.getTime()) / 1000)
      
      try {
        savePomodoroSession({
          todoId: todoId || undefined,
          todoTitle: todoTitle || undefined,
          startTime,
          endTime,
          duration,
          phase: currentPhase,
          completed: false, // 리셋으로 인한 미완료
          date: format(startTime, 'yyyy-MM-dd')
        })
      } catch (error) {
        console.error('포모도로 세션 저장 실패:', error)
      }
    }
    
    setIsRunning(false)
    setCurrentPhase('work')
    setTimeLeft(settings.workTime * 60)
    setCompletedPomodoros(0)
    setSessionStartTime(null)
  }

  const skipPhase = () => {
    handlePhaseComplete()
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const getPhaseInfo = () => {
    switch (currentPhase) {
      case 'work':
        return { name: '집중 시간', color: 'text-red-600', bgColor: 'bg-red-50', icon: Target }
      case 'shortBreak':
        return { name: '짧은 휴식', color: 'text-green-600', bgColor: 'bg-green-50', icon: Coffee }
      case 'longBreak':
        return { name: '긴 휴식', color: 'text-blue-600', bgColor: 'bg-blue-50', icon: Coffee }
    }
  }

  const updateSettings = (newSettings: Partial<PomodoroSettings>) => {
    const updated = { ...settings, ...newSettings }
    setSettings(updated)
    localStorage.setItem('pomodoroSettings', JSON.stringify(updated))
    
    // 현재 페이즈에 맞춰 시간 재설정
    if (!isRunning) {
      if (currentPhase === 'work') {
        setTimeLeft(updated.workTime * 60)
      } else if (currentPhase === 'shortBreak') {
        setTimeLeft(updated.shortBreak * 60)
      } else {
        setTimeLeft(updated.longBreak * 60)
      }
    }
  }

  if (!isOpen) return null

  const phaseInfo = getPhaseInfo()
  const PhaseIcon = phaseInfo.icon
  const progress = currentPhase === 'work' 
    ? ((settings.workTime * 60 - timeLeft) / (settings.workTime * 60)) * 100
    : currentPhase === 'shortBreak'
    ? ((settings.shortBreak * 60 - timeLeft) / (settings.shortBreak * 60)) * 100
    : ((settings.longBreak * 60 - timeLeft) / (settings.longBreak * 60)) * 100

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            포모도로 타이머
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowStats(true)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              title="통계 보기"
            >
              <BarChart3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              title="설정"
            >
              <Settings className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6">
          {todoTitle && (
            <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400">현재 작업</p>
              <p className="font-medium text-gray-900 dark:text-white">{todoTitle}</p>
            </div>
          )}

          {/* 설정 패널 */}
          {showSettings && (
            <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg space-y-4">
              <h3 className="font-medium text-gray-900 dark:text-white">설정</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">집중 시간 (분)</label>
                  <input
                    type="number"
                    value={settings.workTime}
                    onChange={(e) => updateSettings({ workTime: parseInt(e.target.value) || 25 })}
                    className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-600 dark:text-white"
                    min="1"
                    max="60"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">짧은 휴식 (분)</label>
                  <input
                    type="number"
                    value={settings.shortBreak}
                    onChange={(e) => updateSettings({ shortBreak: parseInt(e.target.value) || 5 })}
                    className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-600 dark:text-white"
                    min="1"
                    max="30"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">긴 휴식 (분)</label>
                  <input
                    type="number"
                    value={settings.longBreak}
                    onChange={(e) => updateSettings({ longBreak: parseInt(e.target.value) || 15 })}
                    className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-600 dark:text-white"
                    min="1"
                    max="60"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">긴 휴식 주기</label>
                  <input
                    type="number"
                    value={settings.longBreakInterval}
                    onChange={(e) => updateSettings({ longBreakInterval: parseInt(e.target.value) || 4 })}
                    className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-600 dark:text-white"
                    min="2"
                    max="10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={settings.autoStartBreaks}
                    onChange={(e) => updateSettings({ autoStartBreaks: e.target.checked })}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">휴식 자동 시작</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={settings.autoStartPomodoros}
                    onChange={(e) => updateSettings({ autoStartPomodoros: e.target.checked })}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">집중 시간 자동 시작</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={settings.soundEnabled}
                    onChange={(e) => updateSettings({ soundEnabled: e.target.checked })}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300 flex items-center gap-1">
                    {settings.soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                    알림음
                  </span>
                </label>
              </div>
            </div>
          )}

          {/* 타이머 메인 */}
          <div className="text-center">
            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${phaseInfo.bgColor} ${phaseInfo.color} mb-4`}>
              <PhaseIcon className="w-4 h-4" />
              {phaseInfo.name}
            </div>

            {/* 원형 진행바 */}
            <div className="relative w-48 h-48 mx-auto mb-6">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  stroke="currentColor"
                  strokeWidth="2"
                  fill="none"
                  className="text-gray-200 dark:text-gray-700"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  stroke="currentColor"
                  strokeWidth="2"
                  fill="none"
                  strokeDasharray={`${2 * Math.PI * 45}`}
                  strokeDashoffset={`${2 * Math.PI * 45 * (1 - progress / 100)}`}
                  className={`${phaseInfo.color} transition-all duration-1000 ease-linear`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-3xl font-mono font-bold text-gray-900 dark:text-white">
                    {formatTime(timeLeft)}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {completedPomodoros}개 완료
                  </div>
                </div>
              </div>
            </div>

            {/* 컨트롤 버튼 */}
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={resetTimer}
                className="p-3 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-full transition-colors"
                title="리셋"
              >
                <RotateCcw className="w-5 h-5" />
              </button>
              
              <button
                onClick={toggleTimer}
                className={`p-4 rounded-full transition-colors ${
                  isRunning 
                    ? 'bg-red-500 hover:bg-red-600 text-white' 
                    : 'bg-green-500 hover:bg-green-600 text-white'
                }`}
              >
                {isRunning ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
              </button>

              <button
                onClick={skipPhase}
                className="p-3 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-full transition-colors"
                title="건너뛰기"
              >
                <Coffee className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 통계 모달 */}
      <PomodoroStats 
        isOpen={showStats}
        onClose={() => setShowStats(false)}
      />
    </div>
  )
}

export default PomodoroTimer