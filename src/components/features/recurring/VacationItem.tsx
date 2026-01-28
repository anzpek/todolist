import React from 'react'
import { User } from 'lucide-react'

interface Employee {
  id: number
  name: string
  team: string
  position: string
  color: string
}

interface Vacation {
  id: string
  employeeId: number
  date: string
  type: string
  createdAt: number
  updatedAt: number
}

interface VacationItemProps {
  vacation: Vacation
  employee?: Employee
  compact?: boolean
}

const VacationItem: React.FC<VacationItemProps> = ({ vacation, employee, compact = false }) => {
  const getTypeColor = (type: string) => {
    switch (type) {
      case '연차':
        return 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800'
      case '오전':
        return 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800'
      case '오후':
        return 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800'
      case '특별':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-300 dark:border-yellow-800'
      case '병가':
        return 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800'
      case '업무':
        return 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600'
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600'
    }
  }

  if (compact) {
    return (
      <div className={`p-2 mb-1.5 rounded border ${getTypeColor(vacation.type)}`}>
        <div className="flex items-center gap-2">
          {employee && (
            <>
              <div
                className="w-4 h-4 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0"
                style={{ backgroundColor: employee.color }}
              >
                {employee.name.charAt(0)}
              </div>
              <span className="text-xs font-medium truncate">{employee.name}</span>
            </>
          )}
          <span className="text-[8px] font-medium px-1 py-0.5 rounded">
            {vacation.type}
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className={`p-3 rounded-lg border ${getTypeColor(vacation.type)}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {employee ? (
            <>
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-semibold"
                style={{ backgroundColor: employee.color }}
              >
                {employee.name.charAt(0)}
              </div>
              <div>
                <div className="font-medium">{employee.name}</div>
                <div className="text-xs opacity-75">{employee.team}</div>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <User className="w-5 h-5" />
              <span className="font-medium">직원 ID: {vacation.employeeId}</span>
            </div>
          )}
        </div>
        <span className="text-sm font-medium px-2 py-1 rounded">
          {vacation.type}
        </span>
      </div>
    </div>
  )
}

export default VacationItem