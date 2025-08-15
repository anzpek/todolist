import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  signInAnonymously as firebaseSignInAnonymously,
  signOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  type User as FirebaseUser
} from 'firebase/auth'
import { auth, googleProvider } from '../config/firebase'

interface User {
  uid: string
  email: string | null
  displayName: string | null
  isAnonymous?: boolean
}

interface AuthContextType {
  currentUser: User | null
  loading: boolean
  isAnonymous: boolean
  login: () => Promise<void>
  logout: () => Promise<void>
  loginAnonymously: () => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, displayName?: string) => Promise<void>
  signInWithGoogle: () => Promise<any>
  signInAsGuest: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [isAnonymous, setIsAnonymous] = useState(false)

  useEffect(() => {
    if (!auth) {
      console.log('Auth: Firebase disabled, using localStorage only')
      setLoading(false)
      return
    }

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        setCurrentUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          isAnonymous: firebaseUser.isAnonymous
        })
        setIsAnonymous(firebaseUser.isAnonymous)
      } else {
        setCurrentUser(null)
        setIsAnonymous(false)
      }
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const login = async () => {
    console.log('Auth: Use signInWithGoogle or signIn instead')
  }

  const logout = async () => {
    if (auth) {
      await signOut(auth)
    } else {
      setCurrentUser(null)
    }
  }

  const loginAnonymously = async () => {
    if (auth) {
      await firebaseSignInAnonymously(auth)
    } else {
      setCurrentUser({
        uid: 'local-user',
        email: null,
        displayName: 'Local User',
        isAnonymous: true
      })
      setIsAnonymous(true)
    }
  }

  const signIn = async (email: string, password: string) => {
    if (auth) {
      await signInWithEmailAndPassword(auth, email, password)
    } else {
      console.log('Auth: SignIn not available in localStorage mode', { email, password })
    }
  }

  const signUp = async (email: string, password: string, displayName?: string) => {
    if (auth) {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password)
      if (displayName && userCredential.user) {
        await updateProfile(userCredential.user, { displayName })
      }
    } else {
      console.log('Auth: SignUp not available in localStorage mode', { email, password, displayName })
    }
  }

  const signInWithGoogle = async () => {
    if (!auth || !googleProvider) {
      throw new Error('Firebase 인증이 초기화되지 않았습니다.')
    }

    try {
      const result = await signInWithPopup(auth, googleProvider)
      console.log('구글 로그인 성공:', result.user)
      return result.user
    } catch (error: any) {
      console.error('구글 로그인 실패:', error)
      
      // 사용자가 팝업을 닫거나 취소한 경우
      if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request') {
        throw new Error('로그인이 취소되었습니다.')
      }
      
      // 네트워크 오류
      if (error.code === 'auth/network-request-failed') {
        throw new Error('네트워크 연결을 확인해주세요.')
      }
      
      // 기타 오류
      throw new Error('로그인 중 오류가 발생했습니다: ' + error.message)
    }
  }

  const signInAsGuest = async () => {
    await loginAnonymously()
  }

  const value: AuthContextType = {
    currentUser,
    loading,
    isAnonymous,
    login,
    logout,
    loginAnonymously,
    signIn,
    signUp,
    signInWithGoogle,
    signInAsGuest
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}