import { useTodos } from '../contexts/TodoContext'
import { useTheme } from '../contexts/ThemeContext'
import { Folder, Calendar, Clock, CheckSquare, Layers, Zap, Archive } from 'lucide-react'
import { useTranslation } from 'react-i18next'

interface ProjectAnalysisProps {
  layout?: 'compact' | 'full'
}

const ProjectAnalysis = ({ layout = 'full' }: ProjectAnalysisProps) => {
  const { todos } = useTodos()
  const { t } = useTranslation()
  const { currentTheme, isDark } = useTheme()
  const isVisualTheme = !!currentTheme.bg

  const cardClass = isVisualTheme
    ? 'glass-card backdrop-blur-none transition-[background-color] duration-200'
    : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700'

  const cardStyle = isVisualTheme
    ? { backgroundColor: `rgba(${isDark ? '0, 0, 0' : '255, 255, 255'}, var(--glass - opacity, 0.1))` }
    : {}

  const projectTodos = todos.filter(todo => todo.type === 'project')
  const longtermProjects = projectTodos.filter(todo => todo.project === 'longterm').length
  const shorttermProjects = projectTodos.filter(todo => todo.project === 'shortterm').length
  const singleTasks = todos.length - projectTodos.length
  const total = todos.length

  // Donut Chart Component
  const DonutChart = ({ size = 100 }: { size?: number }) => {
    if (total === 0) return null

    const radius = size / 2 - 10
    const circumference = 2 * Math.PI * radius

    // Calculate segments
    const longtermPercent = (longtermProjects / total) * 100
    const shorttermPercent = (shorttermProjects / total) * 100
    const singlePercent = (singleTasks / total) * 100

    const longtermOffset = 0
    const shorttermOffset = circumference - (longtermPercent / 100) * circumference
    const singleOffset = shorttermOffset - (shorttermPercent / 100) * circumference

    return (
      <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
        <svg className="transform -rotate-90 w-full h-full">
          {/* Background */}
          <circle
            className="text-gray-100 dark:text-gray-700"
            strokeWidth="8"
            stroke="currentColor"
            fill="transparent"
            r={radius}
            cx={size / 2}
            cy={size / 2}
          />

          {/* Longterm (Purple) */}
          {longtermProjects > 0 && (
            <circle
              className="text-purple-500 transition-all duration-1000 ease-out"
              strokeWidth="8"
              strokeDasharray={circumference}
              strokeDashoffset={circumference - (longtermPercent / 100) * circumference}
              strokeLinecap="round"
              stroke="currentColor"
              fill="transparent"
              r={radius}
              cx={size / 2}
              cy={size / 2}
            />
          )}

          {/* Shortterm (Green) */}
          {shorttermProjects > 0 && (
            <circle
              className="text-green-500 transition-all duration-1000 ease-out"
              strokeWidth="8"
              strokeDasharray={circumference}
              strokeDashoffset={circumference - (shorttermPercent / 100) * circumference}
              strokeLinecap="round"
              stroke="currentColor"
              fill="transparent"
              r={radius}
              cx={size / 2}
              cy={size / 2}
              style={{ transform: `rotate(${(longtermPercent / 100) * 360}deg)`, transformOrigin: 'center' }}
            />
          )}

          {/* Single (Orange) */}
          {singleTasks > 0 && (
            <circle
              className="text-orange-500 transition-all duration-1000 ease-out"
              strokeWidth="8"
              strokeDasharray={circumference}
              strokeDashoffset={circumference - (singlePercent / 100) * circumference}
              strokeLinecap="round"
              stroke="currentColor"
              fill="transparent"
              r={radius}
              cx={size / 2}
              cy={size / 2}
              style={{ transform: `rotate(${((longtermPercent + shorttermPercent) / 100) * 360}deg)`, transformOrigin: 'center' }}
            />
          )}
        </svg>
        <div className="absolute flex flex-col items-center">
          <span className="text-xl lg:text-3xl font-bold text-gray-800 dark:text-white">{total}</span>
          <span className="text-[10px] lg:text-xs text-gray-500">{t('analysis.total')}</span>
        </div>
      </div>
    )
  }

  const stats = [
    {
      label: t('analysis.totalProjects'),
      value: projectTodos.length,
      icon: <Folder className="w-5 h-5" />,
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
      borderColor: 'border-blue-100 dark:border-blue-800'
    },
    {
      label: t('analysis.longTermLabel'),
      value: longtermProjects,
      icon: <Archive className="w-5 h-5" />,
      color: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-50 dark:bg-purple-900/20',
      borderColor: 'border-purple-100 dark:border-purple-800'
    },
    {
      label: t('analysis.shortTermLabel'),
      value: shorttermProjects,
      icon: <Zap className="w-5 h-5" />,
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-50 dark:bg-green-900/20',
      borderColor: 'border-green-100 dark:border-green-800'
    },
    {
      label: t('analysis.singleTasks'),
      value: singleTasks,
      icon: <CheckSquare className="w-5 h-5" />,
      color: 'text-orange-600 dark:text-orange-400',
      bgColor: 'bg-orange-50 dark:bg-orange-900/20',
      borderColor: 'border-orange-100 dark:border-orange-800'
    }
  ]

  if (layout === 'compact') {
    return (
      <div className="flex gap-2">
        <div className="text-center min-w-[28px]">
          <p className="text-blue-600 text-xs font-bold leading-none">{projectTodos.length}</p>
          <p className="text-[9px] text-gray-500 dark:text-gray-400 leading-none mt-0.5">{t('analysis.project')}</p>
        </div>
        <div className="text-center min-w-[28px]">
          <p className="text-orange-600 text-xs font-bold leading-none">{singleTasks}</p>
          <p className="text-[9px] text-gray-500 dark:text-gray-400 leading-none mt-0.5">{t('analysis.single')}</p>
        </div>
        <div className="text-center min-w-[28px]">
          <p className="text-purple-600 text-xs font-bold leading-none">{longtermProjects}</p>
          <p className="text-[9px] text-gray-500 dark:text-gray-400 leading-none mt-0.5">{t('analysis.longTermLabel')}</p>
        </div>
        <div className="text-center min-w-[28px]">
          <p className="text-green-600 text-xs font-bold leading-none">{shorttermProjects}</p>
          <p className="text-[9px] text-gray-500 dark:text-gray-400 leading-none mt-0.5">{t('analysis.shortTermLabel')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`${cardClass} rounded - 2xl p - 6 lg: p - 8 shadow - sm border border - gray - 100 dark: border - gray - 700`} style={cardStyle}>
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
            <Layers className="w-6 h-6 text-gray-600 dark:text-gray-300" />
          </div>
          <h3 className="text-lg lg:text-xl font-bold text-gray-900 dark:text-white">{t('analysis.title')}</h3>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row items-center gap-10 lg:gap-16">
        {/* Chart Section */}
        <div className="flex-shrink-0 relative">
          <DonutChart size={180} />
          <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 text-sm font-medium text-gray-500 whitespace-nowrap">
            {t('analysis.distribution')}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="flex-1 w-full grid grid-cols-2 gap-4 lg:gap-6">
          {stats.map((stat, index) => (
            <div
              key={index}
              className={`${stat.bgColor} ${stat.borderColor} rounded - xl p - 4 lg: p - 5 border transition - all duration - 300 hover: shadow - md hover: -translate - y - 1`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className={`p - 2.5 rounded - xl bg - white dark: bg - gray - 800 ${stat.color} shadow - sm`}>
                  {stat.icon}
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">{stat.label}</p>
                <p className={`text - 2xl lg: text - 3xl font - bold ${stat.color} `}>{stat.value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default ProjectAnalysis