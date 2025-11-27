import { Plus } from 'lucide-react'
import { useTheme } from '../contexts/ThemeContext'

interface FloatingActionButtonProps {
  onClick: () => void
}

const FloatingActionButton = ({ onClick }: FloatingActionButtonProps) => {
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <button
      onClick={onClick}
      className="fixed bottom-20 right-4 z-50 group"
      aria-label="할일 추가"
    >
      {/* 글로우 효과 */}
      <div className="absolute inset-0 rounded-full bg-blue-500 blur-lg opacity-40 group-hover:opacity-60 transition-opacity duration-300 animate-pulse" />

      {/* 버튼 본체 */}
      <div className={`
        relative flex items-center justify-center 
        w-14 h-14 rounded-full
        bg-gradient-to-r from-blue-600 to-indigo-600
        text-white shadow-lg shadow-blue-500/40
        transform transition-all duration-300
        group-hover:scale-110 group-active:scale-95
        group-hover:shadow-blue-500/60
      `}>
        <Plus className="w-7 h-7 transition-transform duration-300 group-hover:rotate-90" strokeWidth={2.5} />
      </div>
    </button>
  )
}

export default FloatingActionButton
