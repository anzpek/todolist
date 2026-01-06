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
  type User as FirebaseUser,
  GoogleAuthProvider,
  signInWithCredential
} from 'firebase/auth'
import { Capacitor } from '@capacitor/core'
import { FirebaseAuthentication } from '@capacitor-firebase/authentication'
import { auth, googleProvider } from '../config/firebase'
import { firestoreService } from '../services/firestoreService'

interface User {
  uid: string
  email: string | null
  displayName: string | null
  photoURL: string | null
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
  getGoogleAccessToken: (options?: { silent?: boolean }) => Promise<string | null>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [googleAccessToken, setGoogleAccessToken] = useState<string | null>(null)
  const [tokenExpiration, setTokenExpiration] = useState<number | null>(null) // 토큰 만료 시간 (timestamp)
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
          photoURL: firebaseUser.photoURL,
          isAnonymous: firebaseUser.isAnonymous
        })

        // Firestore에 사용자 정보 미러링 (검색용)
        if (!firebaseUser.isAnonymous && firebaseUser.email) {
          firestoreService.checkAndCreateUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName
          }).catch(err => console.error('User profile sync failed:', err));
        }

        setIsAnonymous(firebaseUser.isAnonymous)
      } else {
        setCurrentUser(null)
        setIsAnonymous(false)
        setGoogleAccessToken(null)
        setTokenExpiration(null)
        sessionStorage.removeItem('google_access_token')
        sessionStorage.removeItem('google_token_expiration')
      }
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  // AuthContext 간단 노출
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).authContext = { signInWithGoogle }
    }
  }, [])

  const login = async () => {
    console.log('Auth: Use signInWithGoogle or signIn instead')
  }

  const logout = async () => {
    if (auth) {
      await signOut(auth)
      // GoogleAuth 로그아웃도 함께 처리 (선택사항, 하지만 권장)
      if (Capacitor.isNativePlatform()) {
        try {
          await FirebaseAuthentication.signOut()
        } catch (e) {
          console.log('GoogleAuth signOut failed (maybe not signed in)', e)
        }
      }
      setGoogleAccessToken(null)
      setTokenExpiration(null)
      sessionStorage.removeItem('google_access_token')
      sessionStorage.removeItem('google_token_expiration')
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
        photoURL: null,
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
    if (!auth) {
      throw new Error('Firebase 인증이 초기화되지 않았습니다.')
    }

    try {
      if (Capacitor.isNativePlatform()) {
        // Native Google Login via @capacitor-firebase/authentication
        console.log('Starting Native Google Sign-In (Capacitor Firebase)...')

        const result = await FirebaseAuthentication.signInWithGoogle()
        console.log('FirebaseAuthentication Result:', result)

        const credential = GoogleAuthProvider.credential(result.credential?.idToken)
        const userCredential = await signInWithCredential(auth, credential)
        console.log('Mobile Google Sign-In Success:', userCredential.user)
        return userCredential.user
      } else {
        // Web Google Login
        if (!googleProvider) throw new Error('Google Provider missing')
        const result = await signInWithPopup(auth, googleProvider)
        console.log('구글 로그인 성공:', result.user)
        // 로그인 성공 시 토큰 여기서도 세팅 가능하지만 getGoogleAccessToken에서도 처리함
        // credential에서 바로 액세스 토큰을 가져올 수 있음
        const credential = GoogleAuthProvider.credentialFromResult(result);
        const token = credential?.accessToken;
        if (token) {
          setGoogleAccessToken(token);
          // 만료 시간도 저장 (대략 1시간으로 가정하거나, credential에 있다면 사용)
          // 보통 구글 액세스 토큰은 1시간(3600초) 유효
          const expiresIn = 3500 * 1000; // 58분 정도 여유 있게
          const expirationTime = Date.now() + expiresIn;
          setTokenExpiration(expirationTime);
          sessionStorage.setItem('google_access_token', token);
          sessionStorage.setItem('google_token_expiration', expirationTime.toString());
        }
        return result.user
      }
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

      // 기타 오류 (GoogleAuth 에러 포함)
      throw new Error('로그인 중 오류가 발생했습니다: ' + (error.message || JSON.stringify(error)))
    }
  }

  const signInAsGuest = async () => {
    await loginAnonymously()
  }

  const getGoogleAccessToken = async (options?: { silent?: boolean }): Promise<string | null> => {
    if (!auth) throw new Error('Firebase Auth not initialized');

    // 1. 메모리상 유효 토큰 확인
    const now = Date.now();
    if (googleAccessToken && tokenExpiration && now < tokenExpiration) {
      return googleAccessToken;
    }

    // 2. 세션 스토리지 확인 (새로고침 직후 등)
    const cachedToken = sessionStorage.getItem('google_access_token');
    const cachedExpiration = sessionStorage.getItem('google_token_expiration');

    if (cachedToken && cachedExpiration) {
      const expTime = parseInt(cachedExpiration, 10);
      if (now < expTime) {
        // 아직 유효함 -> 메모리 복구
        setGoogleAccessToken(cachedToken);
        setTokenExpiration(expTime);
        return cachedToken;
      } else {
        console.log('⚠️ Cached token expired. Clearing...');
        sessionStorage.removeItem('google_access_token');
        sessionStorage.removeItem('google_token_expiration');
      }
    }

    // If silent mode is requested and no valid token exists, return null immediately without popup
    if (options?.silent) {
      return null;
    }

    try {
      if (Capacitor.isNativePlatform()) {
        // Native platform handling (simplified for now)
        // ideally we might need to resign-in or ask for scopes upfront
        console.warn('Native Google Token not fully implemented for incremental auth');

        // Attempt to get token if already signed in or via plugin
        const result = await FirebaseAuthentication.getIdToken();
        // For Google API we need Access Token. @capacitor-firebase/authentication returns idToken.
        // We might need to look into specific scopes during initial sign in for native.
        // For now, returning idToken as a placeholder, but this might not be the correct "access token" for Google APIs.
        if (result.token) {
          // Native platforms might not have a direct "access token" for Google APIs
          // without requesting specific scopes during initial sign-in.
          // Storing idToken for consistency, but it's not the same as an access token.
          setGoogleAccessToken(result.token);
          // Native token expiry is different, usually managed by plugin
          // sessionStorage.setItem('google_access_token', result.token); 
        }
        return result.token;
      } else {
        // Web handling
        const provider = new GoogleAuthProvider();
        // Use full tasks scope for read/write access (to sync completion status back)
        provider.addScope('https://www.googleapis.com/auth/tasks');
        provider.setCustomParameters({ prompt: 'consent' });

        // Request re-auth or new auth with scopes
        // We use signInWithPopup which handles linking or updating credentials
        // If user is already signed in, this will prompt for consent for new scopes
        const result = await signInWithPopup(auth, provider);
        const credential = GoogleAuthProvider.credentialFromResult(result);
        const token = credential?.accessToken || null;

        if (token) {
          const expiresIn = 3500 * 1000; // 58 minutes safety
          const expirationTime = Date.now() + expiresIn;

          setGoogleAccessToken(token);
          setTokenExpiration(expirationTime);

          sessionStorage.setItem('google_access_token', token);
          sessionStorage.setItem('google_token_expiration', expirationTime.toString());
        }

        console.log('🔑 Google Auth Result:', {
          user: result.user.email,
          providerId: result.providerId,
          credentialScopes: (credential as any)?.scope, // Sometimes scope is here
          accessToken: token ? 'Present (Hidden)' : 'Missing'
        });

        return token;
      }
    } catch (error) {
      console.error('Error getting Google Access Token:', error);
      throw error;
    }
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
    signInAsGuest,
    getGoogleAccessToken
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