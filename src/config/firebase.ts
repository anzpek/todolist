import { initializeApp, getApps } from 'firebase/app'
import { 
  getAuth, 
  GoogleAuthProvider,
  signInAnonymously
} from 'firebase/auth'
import { 
  getFirestore, 
  enableNetwork,
  disableNetwork,
  deleteField
} from 'firebase/firestore'
import { getStorage } from 'firebase/storage'

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

// Firebase 앱 초기화
let app
const apps = getApps()
if (apps.length === 0) {
  app = initializeApp(firebaseConfig)
} else {
  app = apps[0]
}

// Firebase 서비스들 초기화
export const auth = getAuth(app)
export const db = getFirestore(app)
export const storage = getStorage(app)

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

console.log('Firebase 프로덕션 서비스 초기화 완료')

// 헬퍼 함수들
export const signInAsGuest = async () => {
  try {
    const result = await signInAnonymously(auth)
    return result.user
  } catch (error) {
    console.error('익명 로그인 실패:', error)
    throw error
  }
}

export const enableFirestoreNetwork = () => enableNetwork(db)
export const disableFirestoreNetwork = () => disableNetwork(db)
export { deleteField }

export default app