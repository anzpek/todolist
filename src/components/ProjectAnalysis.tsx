import { useTodos } from '../contexts/TodoContext'

interface ProjectAnalysisProps {
  layout?: 'compact' | 'full'
}

const ProjectAnalysis = ({ layout = 'full' }: ProjectAnalysisProps) => {
  const { todos } = useTodos()
  
  const projectTodos = todos.filter(todo => todo.type === 'project')
  const longtermProjects = projectTodos.filter(todo => todo.project === 'longterm').length
  const shorttermProjects = projectTodos.filter(todo => todo.project === 'shortterm').length

  const stats = [
    {
      label: '총 프로젝트',
      value: projectTodos.length,
      color: 'text-blue-600 dark:text-blue-400'
    },
    {
      label: '롱텀 프로젝트',
      value: longtermProjects,
      color: 'text-purple-600 dark:text-purple-400'
    },
    {
      label: '숏텀 프로젝트',
      value: shorttermProjects,
      color: 'text-green-600 dark:text-green-400'
    },
    {
      label: '단일 태스크',
      value: todos.length - projectTodos.length,
      color: 'text-orange-600 dark:text-orange-400'
    }
  ]

  if (layout === 'compact') {
    return (
      <div className="flex gap-2">
        <div className="text-center min-w-[28px]">
          <p className="text-blue-600 text-xs font-bold leading-none">{projectTodos.length}</p>
          <p className="text-[9px] text-gray-500 dark:text-gray-400 leading-none mt-0.5">프로젝트</p>
        </div>
        <div className="text-center min-w-[28px]">
          <p className="text-orange-600 text-xs font-bold leading-none">{todos.length - projectTodos.length}</p>
          <p className="text-[9px] text-gray-500 dark:text-gray-400 leading-none mt-0.5">단일</p>
        </div>
        <div className="text-center min-w-[28px]">
          <p className="text-purple-600 text-xs font-bold leading-none">{longtermProjects}</p>
          <p className="text-[9px] text-gray-500 dark:text-gray-400 leading-none mt-0.5">롱텀</p>
        </div>
        <div className="text-center min-w-[28px]">
          <p className="text-green-600 text-xs font-bold leading-none">{shorttermProjects}</p>
          <p className="text-[9px] text-gray-500 dark:text-gray-400 leading-none mt-0.5">숏텀</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-2 border border-gray-200 dark:border-gray-700">
      <div className="mb-2">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">프로젝트 분석</h3>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {stats.map((stat, index) => (
          <div key={index} className="text-center">
            <p className={`text-sm font-bold ${stat.color}`}>{stat.value}</p>
            <p className="text-xs text-gray-600 dark:text-gray-400">{stat.label}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

export default ProjectAnalysis