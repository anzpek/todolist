// Firebase 서비스 레이지 로딩 유틸리티
import { debug } from './debug'

// Firebase 서비스들의 레이지 로딩
export const getFirebaseAuth = async () => {
  debug.time('Firebase Auth 로딩')
  const { auth } = await import('../firebase')
  debug.timeEnd('Firebase Auth 로딩')
  return auth
}

export const getFirebaseFirestore = async () => {
  debug.time('Firebase Firestore 로딩')
  const { db } = await import('../firebase')
  debug.timeEnd('Firebase Firestore 로딩')
  return db
}

export const getFirestoreService = async () => {
  debug.time('Firestore Service 로딩')
  const firestoreService = await import('../services/firestoreService')
  debug.timeEnd('Firestore Service 로딩')
  return firestoreService
}

export const getAuthService = async () => {
  debug.time('Auth Service 로딩')
  const authService = await import('../services/authService')
  debug.timeEnd('Auth Service 로딩')
  return authService
}

// 성능 모니터링을 위한 레이지 로딩 메트릭
export const lazyLoadMetrics = {
  totalLoads: 0,
  loadTimes: new Map<string, number>(),
  
  recordLoad(serviceName: string, startTime: number) {
    const loadTime = Date.now() - startTime
    this.totalLoads++
    this.loadTimes.set(serviceName, loadTime)
    debug.log(`${serviceName} 로딩 완료: ${loadTime}ms`)
  }
}