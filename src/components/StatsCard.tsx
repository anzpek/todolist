import { useTodos } from '../contexts/TodoContext'

interface StatsCardProps {
  layout?: 'compact' | 'sidebar'
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

  const stats = [
    {
      title: '전체 완료율',
      value: `${completionRate}%`,
      textColor: 'text-green-600',
      bgColor: 'bg-green-50 dark:bg-green-900/20'
    },
    {
      title: '오늘 진행률',
      value: `${todayCompleted}/${todayTotal}`,
      textColor: 'text-blue-600',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20'
    },
    {
      title: '이번 주',
      value: `${weekRate}%`,
      textColor: 'text-purple-600',
      bgColor: 'bg-purple-50 dark:bg-purple-900/20'
    },
    {
      title: '지연된 할일',
      value: overdueTodos.toString(),
      textColor: 'text-red-600',
      bgColor: 'bg-red-50 dark:bg-red-900/20'
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
    <div className="grid grid-cols-2 gap-2">
      {stats.map((stat, index) => (
        <div key={index} className={`${stat.bgColor} rounded-lg p-2 border border-gray-200 dark:border-gray-700`}>
          <div className="text-center">
            <p className="text-xs font-medium text-gray-600 dark:text-gray-400">{stat.title}</p>
            <p className={`text-lg font-bold ${stat.textColor} dark:text-gray-200`}>{stat.value}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

export default StatsCard