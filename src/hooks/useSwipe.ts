import { useRef } from 'react'
import type { TouchEvent } from 'react'

interface SwipeHandlers {
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
}

interface SwipeOptions {
  minSwipeDistance?: number
  preventDefaultTouchmoveEvent?: boolean
}

export const useSwipe = (
  handlers: SwipeHandlers,
  options: SwipeOptions = {}
) => {
  const {
    minSwipeDistance = 50,
    preventDefaultTouchmoveEvent = false
  } = options

  const touchStartX = useRef<number | null>(null)
  const touchStartY = useRef<number | null>(null)
  const touchEndX = useRef<number | null>(null)
  const touchEndY = useRef<number | null>(null)

  const onTouchStart = (e: TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
  }

  const onTouchMove = (e: TouchEvent) => {
    if (preventDefaultTouchmoveEvent) {
      e.preventDefault()
    }
  }

  const onTouchEnd = (e: TouchEvent) => {
    if (!touchStartX.current || !touchStartY.current) {
      return
    }

    touchEndX.current = e.changedTouches[0].clientX
    touchEndY.current = e.changedTouches[0].clientY

    const distanceX = touchStartX.current - touchEndX.current
    const distanceY = touchStartY.current - touchEndY.current
    const isHorizontalSwipe = Math.abs(distanceX) > Math.abs(distanceY)

    if (isHorizontalSwipe && Math.abs(distanceX) > minSwipeDistance) {
      if (distanceX > 0) {
        // 왼쪽으로 스와이프 (다음으로 이동)
        handlers.onSwipeLeft?.()
      } else {
        // 오른쪽으로 스와이프 (이전으로 이동)
        handlers.onSwipeRight?.()
      }
    }

    // 터치 포인트 리셋
    touchStartX.current = null
    touchStartY.current = null
    touchEndX.current = null
    touchEndY.current = null
  }

  return {
    onTouchStart,
    onTouchMove,
    onTouchEnd
  }
}