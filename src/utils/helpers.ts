export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9)
}

export function isToday(date: Date): boolean {
  const today = new Date()
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  )
}

export function isThisWeek(date: Date): boolean {
  const today = new Date()
  const startOfWeek = new Date(today)
  startOfWeek.setDate(today.getDate() - today.getDay())
  startOfWeek.setHours(0, 0, 0, 0)
  
  const endOfWeek = new Date(startOfWeek)
  endOfWeek.setDate(startOfWeek.getDate() + 7)
  
  return date >= startOfWeek && date < endOfWeek
}

export function isThisMonth(date: Date): boolean {
  const today = new Date()
  return (
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  )
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export function formatTime(time: string): string {
  const [hours, minutes] = time.split(':')
  const hour = parseInt(hours)
  const ampm = hour >= 12 ? '오후' : '오전'
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
  return `${ampm} ${displayHour}:${minutes}`
}

export function formatDateTime(date: Date): string {
  return date.toLocaleString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  })
}

export function isOverdue(date: Date, time?: string): boolean {
  const now = new Date()
  const dueDateTime = new Date(date)
  
  if (time) {
    const [hours, minutes] = time.split(':')
    dueDateTime.setHours(parseInt(hours), parseInt(minutes))
  } else {
    dueDateTime.setHours(23, 59, 59, 999)
  }
  
  return dueDateTime < now
}

export function getPriorityColor(priority: 'low' | 'medium' | 'high' | 'urgent'): string {
  switch (priority) {
    case 'low':
      return 'text-green-600 bg-green-50 border-green-200'
    case 'medium':
      return 'text-yellow-600 bg-yellow-50 border-yellow-200'
    case 'high':
      return 'text-orange-600 bg-orange-50 border-orange-200'
    case 'urgent':
      return 'text-red-600 bg-red-50 border-red-200'
    default:
      return 'text-gray-600 bg-gray-50 border-gray-200'
  }
}

export function getPriorityLabel(priority: 'low' | 'medium' | 'high' | 'urgent'): string {
  switch (priority) {
    case 'low':
      return '낮음'
    case 'medium':
      return '보통'
    case 'high':
      return '높음'
    case 'urgent':
      return '긴급'
    default:
      return '보통'
  }
}

export function getWeekLabel(week: number): string {
  switch (week) {
    case 1:
      return '첫째주'
    case 2:
      return '둘째주'
    case 3:
      return '셋째주'
    case 4:
      return '넷째주'
    case 5:
      return '마지막주'
    case -1:
      return '마지막주'
    default:
      return `${week}주차`
  }
}