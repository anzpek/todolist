import { useTheme } from '../../contexts/ThemeContext'

const ThemeToggle = () => {
  const { theme, setTheme } = useTheme()

  const themes = [
    { value: 'light', label: 'Light' },
    { value: 'dark', label: 'Dark' },
    { value: 'system', label: 'System' },
  ] as const

  return (
    <div className="grid grid-cols-3 gap-1">
      {themes.map(({ value, label }) => (
        <button
          key={value}
          onClick={() => setTheme(value)}
          className={`px-2 py-2 text-xs rounded-lg transition-colors ${
            theme === value
              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300'
              : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
          title={`${label} 모드`}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

export default ThemeToggle