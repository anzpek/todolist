import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { THEMES } from '../constants/themes'
import type { ThemeOption } from '../constants/themes'

type Theme = 'light' | 'dark' | 'system'

interface ThemeContextType {
  theme: Theme
  setTheme: (theme: Theme) => void
  isDark: boolean
  currentThemeId: string
  setCurrentThemeId: (id: string) => void
  currentTheme: ThemeOption
  transparency: number
  setTransparency: (opacity: number) => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export const useTheme = () => {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}

interface ThemeProviderProps {
  children: ReactNode
}

export const ThemeProvider = ({ children }: ThemeProviderProps) => {
  // System/Mode Theme Logic
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('theme')
    return (saved as Theme) || 'system'
  })

  const [isDark, setIsDark] = useState(false)

  // Transparency Logic
  const [transparency, setTransparency] = useState<number>(() => {
    const saved = localStorage.getItem('themeTransparency')
    return saved ? parseFloat(saved) : 0.1 // Default 10%
  })

  // Visual Theme Logic
  const [currentThemeId, setCurrentThemeId] = useState<string>(() => {
    const saved = localStorage.getItem('visualThemeId')
    if (!saved) {
      // Migration from old colorTheme
      const oldColor = localStorage.getItem('colorTheme')
      if (oldColor === 'sunset') return 'orange'
      if (oldColor === 'forest') return 'green'
      if (oldColor === 'berry') return 'pink'
      return 'blue'
    }
    return saved
  })

  // Helper to find theme object
  const getThemeObject = (id: string): ThemeOption => {
    const allThemes = [
      ...THEMES.colors,
      ...THEMES.seasonal,
      ...THEMES.city
    ]
    return allThemes.find(t => t.id === id) || THEMES.colors[0]
  }

  const currentTheme = getThemeObject(currentThemeId)

  // Effect for Light/Dark Mode
  useEffect(() => {
    const root = window.document.documentElement
    const updateTheme = () => {
      root.classList.remove('dark')
      let effectiveTheme: 'light' | 'dark'

      if (theme === 'system') {
        effectiveTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
      } else {
        effectiveTheme = theme
      }

      if (effectiveTheme === 'dark') {
        root.classList.add('dark')
      }
      setIsDark(effectiveTheme === 'dark')
    }

    updateTheme()
    localStorage.setItem('theme', theme)

    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      const handleChange = () => updateTheme()
      mediaQuery.addEventListener('change', handleChange)
      return () => mediaQuery.removeEventListener('change', handleChange)
    }
  }, [theme])

  // Effect for Visual Theme (Color & Background)
  useEffect(() => {
    const root = window.document.documentElement
    const body = document.body

    // 1. Remove all old theme classes
    const allThemeColors = ['blue', 'orange', 'green', 'pink', 'purple', 'red', 'teal', 'sky', 'lime', 'indigo', 'gray']
    root.classList.remove(...allThemeColors.map(c => `theme-${c}`))
    root.classList.remove('theme-sunset', 'theme-forest', 'theme-berry')

    // 2. Apply new theme color class
    if (currentTheme.color !== 'blue') {
      root.classList.add(`theme-${currentTheme.color}`)
    }

    // 3. Apply Background Image and Transparency
    if (currentTheme.bg) {
      body.style.backgroundImage = `url('${currentTheme.bg}')`
      body.style.backgroundSize = 'cover'
      body.style.backgroundPosition = 'center'
      body.style.backgroundAttachment = 'fixed'
      root.classList.add('has-visual-theme')

      // Apply transparency variable
      root.style.setProperty('--glass-opacity', transparency.toString())
    } else {
      body.style.backgroundImage = ''
      body.style.backgroundSize = ''
      body.style.backgroundPosition = ''
      body.style.backgroundAttachment = ''
      root.classList.remove('has-visual-theme')
      root.style.removeProperty('--glass-opacity')
    }

    localStorage.setItem('visualThemeId', currentThemeId)
    localStorage.setItem('themeTransparency', transparency.toString())
  }, [currentThemeId, currentTheme, transparency])

  return (
    <ThemeContext.Provider value={{
      theme,
      setTheme,
      isDark,
      currentThemeId,
      setCurrentThemeId,
      currentTheme,
      transparency,
      setTransparency
    }}>
      {children}
    </ThemeContext.Provider>
  )
}