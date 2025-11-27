import { useTodos } from '../contexts/TodoContext'
import { CheckCircle, Clock, Calendar, AlertTriangle, PieChart, TrendingUp, Activity, Target } from 'lucide-react'

interface StatsCardProps {
  layout?: 'compact' | 'sidebar' | 'full'
}

const StatsCard = ({ layout = 'sidebar' }: StatsCardProps) => {
  const { todos, getTodayTodos, getWeekTodos, getOverdueTodos } = useTodos()

  const totalTodos = todos.length
  const completedTodos = todos.filter(todo => todo.completed).length
  const completionRate = totalTodos > 0 ? Math.round((completedTodos / totalTodos) * 100) : 0

  const todayTodos = getTodayTodos()
  const todayCompleted = todayTodos.filter(todo => todo.completed).length
  const todayTotal = todayTodos.length

  const weekTodos = getWeekTodos()
  const weekCompleted = weekTodos.filter(todo => todo.completed).length
  const weekTotal = weekTodos.length
  const weekRate = weekTotal > 0 ? Math.round((weekCompleted / weekTotal) * 100) : 0

  const overdueTodos = getOverdueTodos().length

  // Circular Progress Component
  const CircularProgress = ({ value, color, size = 60 }: { value: number, color: string, size?: number }) => {
    const radius = size / 2 - 4
    const circumference = 2 * Math.PI * radius
    const offset = circumference - (value / 100) * circumference

    return (
      <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
        <svg className="transform -rotate-90 w-full h-full">
          <circle
            className="text-gray-200 dark:text-gray-700"
            strokeWidth="4"
            stroke="currentColor"
            fill="transparent"
            r={radius}
            cx={size / 2}
            cy={size / 2}
          />
          <circle
            className={color}
            strokeWidth="4"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            stroke="currentColor"
            fill="transparent"
            r={radius}
            cx={size / 2}
            cy={size / 2}
          />
        </svg>
        <span className="absolute text-xs font-bold text-gray-700 dark:text-gray-200">{value}%</span>
      </div>
    )
  }

  const stats = [
    {
      title: '전체 완료율',
      value: `${completionRate}%`,
      icon: <PieChart className="w-5 h-5" />,
      textColor: 'text-green-600',
      bgColor: 'bg-green-50 dark:bg-green-900/20',
      borderColor: 'border-green-100 dark:border-green-800',
      chart: <CircularProgress value={completionRate} color="text-green-500" />
    },
    {
      title: '오늘 진행률',
      value: `${todayCompleted}/${todayTotal}`,
      icon: <Target className="w-5 h-5" />,
      textColor: 'text-blue-600',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
      borderColor: 'border-blue-100 dark:border-blue-800',
      chart: (
        <div className="w-full h-2 bg-blue-100 dark:bg-blue-900/30 rounded-full overflow-hidden mt-2">
          <div
            className="h-full bg-blue-500 rounded-full transition-all duration-500"
            style={{ width: `${todayTotal > 0 ? (todayCompleted / todayTotal) * 100 : 0}%` }}
          />
        </div>
      )
    },
    {
      title: '주간 달성',
      value: `${weekRate}%`,
      icon: <TrendingUp className="w-5 h-5" />,
      textColor: 'text-purple-600',
      bgColor: 'bg-purple-50 dark:bg-purple-900/20',
      borderColor: 'border-purple-100 dark:border-purple-800',
      chart: <CircularProgress value={weekRate} color="text-purple-500" />
    },
    {
      title: '지연된 할일',
      value: overdueTodos.toString(),
      icon: <AlertTriangle className="w-5 h-5" />,
      textColor: 'text-red-600',
      bgColor: 'bg-red-50 dark:bg-red-900/20',
      borderColor: 'border-red-100 dark:border-red-800',
      chart: (
        <div className="flex items-center justify-center h-[60px]">
          <span className="text-3xl font-bold text-red-500">{overdueTodos}</span>
        </div>
      )
    }
  ]

  if (layout === 'compact') {
    return (
      <div className="flex gap-2">
        <div className="text-center min-w-[28px]">
          <p className="text-green-600 text-xs font-bold leading-none">{completionRate}%</p>
          <p className="text-[9px] text-gray-500 dark:text-gray-400 leading-none mt-0.5">완료율</p>
        </div>
        <div className="text-center min-w-[28px]">
          <p className="text-blue-600 text-xs font-bold leading-none">{todayCompleted}/{todayTotal}</p>
          <p className="text-[9px] text-gray-500 dark:text-gray-400 leading-none mt-0.5">오늘</p>
        </div>
        <div className="text-center min-w-[28px]">
          <p className="text-purple-600 text-xs font-bold leading-none">{weekRate}%</p>
          <p className="text-[9px] text-gray-500 dark:text-gray-400 leading-none mt-0.5">주간</p>
        </div>
        <div className="text-center min-w-[28px]">
          <p className="text-red-600 text-xs font-bold leading-none">{overdueTodos}</p>
          <p className="text-[9px] text-gray-500 dark:text-gray-400 leading-none mt-0.5">지연</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`grid ${layout === 'full' ? 'grid-cols-2 lg:grid-cols-4' : 'grid-cols-2'} gap-4 lg:gap-6`}>
      {stats.map((stat, index) => (
        <div
          key={index}
          className={`${stat.bgColor} ${stat.borderColor} rounded-xl p-4 lg:p-6 border transition-all duration-300 hover:shadow-md hover:-translate-y-1 flex flex-col justify-between min-h-[140px]`}
        >
          <div className="flex items-center justify-between mb-4">
            <div className={`p-2.5 rounded-xl bg-white dark:bg-gray-800 ${stat.textColor} shadow-sm`}>
              {stat.icon}
            </div>
            <p className="text-sm lg:text-base font-semibold text-gray-600 dark:text-gray-400">{stat.title}</p>
          </div>

          <div className="flex items-end justify-between mt-2">
            <div className="flex flex-col">
              <span className={`text-2xl lg:text-3xl font-bold ${stat.textColor} dark:text-gray-200 tracking-tight`}>{stat.value}</span>
            </div>
            <div className="flex items-center justify-center scale-110 lg:scale-125 origin-bottom-right">
              {stat.chart}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export default StatsCard