import { initializeApp, getApps } from 'firebase/app'
import { 
  getAuth, 
  GoogleAuthProvider,
  signInAnonymously,
  connectAuthEmulator
} from 'firebase/auth'
import { 
  getFirestore, 
  enableNetwork,
  disableNetwork,
  deleteField,
  connectFirestoreEmulator
} from 'firebase/firestore'
import { getStorage, connectStorageEmulator } from 'firebase/storage'
import { debug } from '../utils/debug'

// Firebase 실제 프로덕션 설정
const firebaseConfig = {
  apiKey: "AIzaSyD8aBPw-o13mciSdV8gzRJN6TfaAy3OoWg",
  authDomain: "todolist-116f3.firebaseapp.com",
  databaseURL: "https://todolist-116f3-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "todolist-116f3",
  storageBucket: "todolist-116f3.firebasestorage.app",
  messagingSenderId: "470825187407",
  appId: "1:470825187407:web:4bd3f8c621c96890b2d23a",
  measurementId: "G-HS8CDYHDT1"
}

// 보안 검증
const validateFirebaseConfig = () => {
  const requiredFields = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId']
  
  for (const field of requiredFields) {
    if (!firebaseConfig[field as keyof typeof firebaseConfig]) {
      throw new Error(`Firebase configuration missing: ${field}`)
    }
  }
  
  // API 키 유효성 검사 (기본적인)
  if (!firebaseConfig.apiKey.startsWith('AIzaSy')) {
    throw new Error('Invalid Firebase API key format')
  }
  
  debug.log('Firebase configuration validated')
}

// Firebase 앱 초기화 (보안 검증 포함)
let app
try {
  validateFirebaseConfig()
  
  const apps = getApps()
  if (apps.length === 0) {
    app = initializeApp(firebaseConfig)
    debug.log('Firebase app initialized')
  } else {
    app = apps[0]
    debug.log('Using existing Firebase app')
  }
} catch (error) {
  debug.error('Firebase initialization failed:', error)
  throw error
}

// Firebase 서비스들 초기화 (보안 설정 포함)
export const auth = getAuth(app)
export const db = getFirestore(app)
export const storage = getStorage(app)

// 개발 환경에서만 에뮬레이터 연결 (보안상 분리)
if (import.meta.env.DEV && import.meta.env.VITE_USE_FIREBASE_EMULATOR === 'true') {
  try {
    connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })
    connectFirestoreEmulator(db, '127.0.0.1', 8080)
    connectStorageEmulator(storage, '127.0.0.1', 9199)
    debug.log('Connected to Firebase emulators')
  } catch (error) {
    debug.warn('Failed to connect to Firebase emulators:', error)
  }
}

// Google Auth Provider 설정
export const googleProvider = new GoogleAuthProvider()
googleProvider.addScope('email')
googleProvider.addScope('profile')
googleProvider.addScope('https://www.googleapis.com/auth/userinfo.email')
googleProvider.addScope('https://www.googleapis.com/auth/userinfo.profile')

// 커스텀 파라미터 설정 (더 나은 사용자 경험을 위해)
googleProvider.setCustomParameters({
  prompt: 'select_account' // 계정 선택 화면을 항상 표시
})

// Firebase 보안 상태 검증
const validateSecurityStatus = () => {
  // HTTPS 검증 (프로덕션 환경)
  if (!import.meta.env.DEV && window.location.protocol !== 'https:') {
    debug.error('Firebase requires HTTPS in production')
    throw new Error('HTTPS required for Firebase in production')
  }
  
  // 보안 컨텍스트 검증
  if (!window.isSecureContext) {
    debug.warn('Not running in secure context - some Firebase features may be limited')
  }
  
  debug.log('Firebase security status validated')
}

// 보안 검증 실행
try {
  validateSecurityStatus()
  debug.log('Firebase 프로덕션 서비스 초기화 완료')
} catch (error) {
  debug.error('Firebase security validation failed:', error)
}

// 보안 강화된 헬퍼 함수들
export const signInAsGuest = async () => {
  try {
    // 익명 로그인 전 보안 검사
    if (!window.isSecureContext) {
      throw new Error('Anonymous sign-in requires secure context')
    }
    
    const result = await signInAnonymously(auth)
    debug.log('Anonymous sign-in successful')
    return result.user
  } catch (error) {
    debug.error('익명 로그인 실패:', error)
    throw error
  }
}

export const enableFirestoreNetwork = () => enableNetwork(db)
export const disableFirestoreNetwork = () => disableNetwork(db)
export { deleteField }

export default app