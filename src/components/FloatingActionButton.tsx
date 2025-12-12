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
      className="fixed bottom-24 right-4 z-50 group md:bottom-8"
      aria-label="할일 추가"
    >
      {/* 글로우 효과 */}
      <div className="absolute inset-0 rounded-full bg-primary-500 blur-lg opacity-40 group-hover:opacity-60 transition-opacity duration-300 animate-pulse" />

      {/* 버튼 본체 */}
      <div className={`
        relative flex items-center justify-center 
        w-14 h-14 rounded-full
        bg-gradient-to-r from-primary-600 to-primary-500
        text-white shadow-lg shadow-primary-500/40
        transform transition-all duration-300
        group-hover:scale-110 group-active:scale-95
        group-hover:shadow-primary-500/60
      `}>
        <Plus className="w-7 h-7 transition-transform duration-300 group-hover:rotate-90" strokeWidth={2.5} />
      </div>
    </button>
  )
}

export default FloatingActionButton
