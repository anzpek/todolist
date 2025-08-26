import { createContext, useContext } from 'react'
import type { ReactNode } from 'react'

interface KeyboardContextType {
  openAddTodoModal: () => void
  focusSearch: () => void
  toggleSidebar: () => void
  switchToTodayView: () => void
  switchToWeekView: () => void
  switchToMonthView: () => void
}

const KeyboardContext = createContext<KeyboardContextType | undefined>(undefined)

interface KeyboardProviderProps {
  children: ReactNode
  onOpenAddTodo: () => void
  onFocusSearch: () => void
  onToggleSidebar: () => void
  onSwitchToTodayView: () => void
  onSwitchToWeekView: () => void
  onSwitchToMonthView: () => void
}

export const KeyboardProvider = ({
  children,
  onOpenAddTodo,
  onFocusSearch,
  onToggleSidebar,
  onSwitchToTodayView,
  onSwitchToWeekView,
  onSwitchToMonthView,
}: KeyboardProviderProps) => {
  const value: KeyboardContextType = {
    openAddTodoModal: onOpenAddTodo,
    focusSearch: onFocusSearch,
    toggleSidebar: onToggleSidebar,
    switchToTodayView: onSwitchToTodayView,
    switchToWeekView: onSwitchToWeekView,
    switchToMonthView: onSwitchToMonthView,
  }

  return (
    <KeyboardContext.Provider value={value}>
      {children}
    </KeyboardContext.Provider>
  )
}

export const useKeyboard = (): KeyboardContextType => {
  const context = useContext(KeyboardContext)
  if (context === undefined) {
    throw new Error('useKeyboard must be used within a KeyboardProvider')
  }
  return context
}