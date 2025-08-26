import { describe, it, expect } from 'vitest'
import { 
  formatDate, 
  formatTime, 
  formatDateTime, 
  isOverdue, 
  getPriorityColor, 
  getPriorityLabel,
  generateId 
} from '../helpers'
import type { Priority } from '../../types/todo'

describe('helpers', () => {
  describe('generateId', () => {
    it('should generate unique IDs', () => {
      const id1 = generateId()
      const id2 = generateId()
      
      expect(id1).not.toBe(id2)
      expect(typeof id1).toBe('string')
      expect(id1.length).toBeGreaterThan(0)
    })
  })

  describe('formatDate', () => {
    it('should format date correctly', () => {
      const date = new Date('2024-01-15')
      const formatted = formatDate(date)
      
      expect(formatted).toBe('2024년 1월 15일')
    })

    it('should handle different date formats', () => {
      const date = new Date('2024-12-31')
      const formatted = formatDate(date)
      
      expect(formatted).toBe('2024년 12월 31일')
    })
  })

  describe('formatTime', () => {
    it('should format time string correctly', () => {
      const time = '14:30'
      const formatted = formatTime(time)
      
      expect(formatted).toBe('오후 2:30')
    })

    it('should format morning time correctly', () => {
      const time = '09:15'
      const formatted = formatTime(time)
      
      expect(formatted).toBe('오전 9:15')
    })

    it('should format midnight correctly', () => {
      const time = '00:00'
      const formatted = formatTime(time)
      
      expect(formatted).toBe('오전 12:00')
    })

    it('should format noon correctly', () => {
      const time = '12:00'
      const formatted = formatTime(time)
      
      expect(formatted).toBe('오후 12:00')
    })
  })

  describe('formatDateTime', () => {
    it('should format date and time together', () => {
      const date = new Date('2024-01-15T14:30:00')
      const formatted = formatDateTime(date)
      
      expect(formatted).toContain('2024년 1월 15일')
      expect(formatted).toContain('오후 2:30')
    })
  })

  describe('isOverdue', () => {
    it('should return true for past dates', () => {
      const pastDate = new Date('2020-01-01')
      
      expect(isOverdue(pastDate)).toBe(true)
    })

    it('should return false for future dates', () => {
      const futureDate = new Date('2030-01-01')
      
      expect(isOverdue(futureDate)).toBe(false)
    })

    it('should handle time parameter', () => {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      
      // 어제 날짜의 특정 시간 - 과거이므로 overdue
      expect(isOverdue(yesterday, '23:59')).toBe(true)
      
      // 오늘 날짜의 미래 시간 - 아직 overdue가 아님
      const today = new Date()
      expect(isOverdue(today, '23:59')).toBe(false)
    })

    it('should return false for today without time', () => {
      const today = new Date()
      
      expect(isOverdue(today)).toBe(false)
    })
  })

  describe('getPriorityColor', () => {
    it('should return correct colors for each priority', () => {
      expect(getPriorityColor('urgent' as Priority)).toContain('red')
      expect(getPriorityColor('high' as Priority)).toContain('orange')
      expect(getPriorityColor('medium' as Priority)).toContain('yellow')
      expect(getPriorityColor('low' as Priority)).toContain('green')
    })

    it('should handle invalid priority', () => {
      expect(getPriorityColor('invalid' as Priority)).toContain('gray')
    })
  })

  describe('getPriorityLabel', () => {
    it('should return correct labels for each priority', () => {
      expect(getPriorityLabel('urgent' as Priority)).toBe('긴급')
      expect(getPriorityLabel('high' as Priority)).toBe('높음')
      expect(getPriorityLabel('medium' as Priority)).toBe('보통')
      expect(getPriorityLabel('low' as Priority)).toBe('낮음')
    })

    it('should handle invalid priority', () => {
      expect(getPriorityLabel('invalid' as Priority)).toBe('보통')
    })
  })
})