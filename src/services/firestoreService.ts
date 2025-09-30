// Firebase Firestore 서비스

// 안전한 날짜 변환 함수 (공통)
const safeToDate = (value: any): Date | undefined => {
  if (!value) return undefined
  if (value instanceof Date) return value
  if (typeof value?.toDate === 'function') return value.toDate()
  if (typeof value === 'string') return new Date(value)
  return undefined
}

// 안전한 Timestamp 변환 함수 (Firebase용)
const safeToTimestamp = (value: any): any => {
  if (!value) return null
  if (value instanceof Date) return value
  if (typeof value?.toDate === 'function') return value
  if (typeof value === 'string') return new Date(value)
  return null
}

// undefined 값을 제거하는 함수
const removeUndefinedValues = (obj: any): any => {
  if (obj === null || obj === undefined) return obj
  if (Array.isArray(obj)) {
    return obj.map(removeUndefinedValues)
  }
  // Date 객체는 그대로 반환 (중요!)
  if (obj instanceof Date) {
    return obj
  }
  if (typeof obj === 'object') {
    const cleaned: any = {}
    Object.keys(obj).forEach(key => {
      const value = obj[key]
      if (value !== undefined) {
        cleaned[key] = removeUndefinedValues(value)
      }
    })
    return cleaned
  }
  return obj
}
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  writeBatch,
  arrayUnion,
  setDoc
} from 'firebase/firestore'
import { db } from '../config/firebase'
import type { Todo, SubTask } from '../types/todo'
import { debug } from '../utils/debug'
import { handleFirestoreError, withRetry } from '../utils/errorHandling'

debug.info('FirestoreService: 실제 Firestore 서비스 활성화')

// 실제 Firestore 서비스
export const firestoreService = {
  // 할일 관련
  getTodos: async (uid: string): Promise<Todo[]> => {
    return withRetry(async () => {
      try {
        if (!uid) {
          throw new Error('User ID is required')
        }
        
        const todosRef = collection(db, `users/${uid}/todos`)
        const q = query(todosRef, orderBy('createdAt', 'desc'))
        const snapshot = await getDocs(q)
        
        const todos = snapshot.docs.map(doc => {
          const data = doc.data()
          
          return {
            id: doc.id,
            ...data,
            createdAt: safeToDate(data.createdAt) || new Date(),
            updatedAt: safeToDate(data.updatedAt) || new Date(),
            dueDate: safeToDate(data.dueDate),
            startDate: safeToDate(data.startDate),
            completedAt: safeToDate(data.completedAt),
            // 서브태스크 배열의 날짜 필드 안전 처리
            subTasks: data.subTasks ? data.subTasks.map((subTask: any) => ({
              ...subTask,
              createdAt: safeToDate(subTask.createdAt) || new Date(),
              updatedAt: safeToDate(subTask.updatedAt) || new Date(),
              completedAt: subTask.completedAt ? safeToDate(subTask.completedAt) : null
            })) : []
          }
        }) as Todo[]
        
        debug.log('Firestore getTodos 성공:', { count: todos.length, uid })
        return todos
      } catch (error) {
        debug.error('Firestore getTodos 실패:', error)
        throw handleFirestoreError(error, 'getTodos')
      }
    })
  },

  addTodo: async (todo: Todo, uid: string): Promise<string> => {
    return withRetry(async () => {
      try {
        if (!uid || !todo.title?.trim()) {
          throw new Error('User ID and todo title are required')
        }
        
        const todosRef = collection(db, `users/${uid}/todos`)
        const cleanedTodo = removeUndefinedValues(todo)
        
        const todoData = {
          ...cleanedTodo,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        }
        
        debug.log('Firestore에 저장할 데이터:', todoData)
        
        const docRef = await addDoc(todosRef, todoData)
        debug.log('Firestore addTodo 성공:', docRef.id)
        return docRef.id
      } catch (error) {
        debug.error('Firestore addTodo 실패:', error)
        throw handleFirestoreError(error, 'addTodo')
      }
    })
  },

  updateTodo: async (id: string, updates: Partial<Todo>, uid: string): Promise<void> => {
    try {
      const todoRef = doc(db, `users/${uid}/todos`, id)
      
      // 문서 존재 여부 확인
      const docSnap = await getDoc(todoRef)
      
      if (!docSnap.exists()) {
        debug.warn(`할일 문서 ${id}가 존재하지 않습니다. 업데이트를 건너뜁니다.`)
        return
      }
      
      const updateData = {
        ...updates,
        updatedAt: serverTimestamp()
      }
      
      await updateDoc(todoRef, updateData)
      debug.log('Firestore updateTodo 성공:', id)
    } catch (error) {
      debug.error('Firestore updateTodo 실패:', error)
      throw error
    }
  },

  deleteTodo: async (id: string, uid: string): Promise<void> => {
    try {
      console.log('🗑️ Firestore deleteTodo 시작:', { id, uid })
      console.log('📍 삭제 경로:', `users/${uid}/todos/${id}`)
      
      // 1. 먼저 문서 존재 여부 확인 (올바른 경로 사용)
      const todoRef = doc(db, `users/${uid}/todos`, id)
      console.log('🔍 문서 참조 생성 완료:', todoRef.path)
      
      const docSnap = await getDoc(todoRef)
      console.log('📖 문서 존재 여부 확인:', docSnap.exists())
      
      if (!docSnap.exists()) {
        debug.warn(`삭제하려는 문서가 존재하지 않음: ${id}`)
        debug.log('전체 컬렉션에서 검색 시도...')
        
        // 전체 컬렉션에서 해당 ID를 가진 문서 찾기
        const allTodosRef = collection(db, `users/${uid}/todos`)
        const allSnapshot = await getDocs(allTodosRef)
        debug.log(`사용자의 전체 할일 개수: ${allSnapshot.docs.length}`)
        
        const foundDoc = allSnapshot.docs.find(doc => doc.id === id)
        if (foundDoc) {
          console.log('🎯 다른 경로에서 문서 발견:', foundDoc.ref.path)
          
          // 다른 경로에서 발견된 경우 해당 문서 삭제 시도
          console.log('🔧 다른 경로의 문서 삭제 시도...')
          await deleteDoc(foundDoc.ref)
          console.log('✅ 다른 경로 문서 삭제 성공')
          return
        } else {
          console.log('❌ 어떤 경로에서도 문서를 찾을 수 없음')
          
          // 모든 문서 ID 출력 (디버깅)
          console.log('📋 실제 Firestore 문서 ID들:', allSnapshot.docs.map(doc => ({
            id: doc.id,
            title: doc.data().title
          })))
        }
        
        throw new Error(`할일 문서 ${id}를 찾을 수 없습니다.`)
      }
      
      const docData = docSnap.data()
      console.log('📄 삭제 대상 문서 확인됨:', { 
        title: docData.title, 
        createdAt: docData.createdAt,
        path: docSnap.ref.path
      })
      
      // 2. 문서 삭제 실행
      console.log('🗑️ deleteDoc 실행 중...')
      await deleteDoc(todoRef)
      console.log('✅ deleteDoc 함수 실행 완료')
      
      // 3. 삭제 후 확인 (디버깅용)
      console.log('🔄 삭제 확인 중...')
      const verifySnap = await getDoc(todoRef)
      if (verifySnap.exists()) {
        console.error('❌ 삭제 후에도 문서가 여전히 존재함:', id)
        console.log('🚨 데이터:', verifySnap.data())
        throw new Error('문서 삭제에 실패했습니다.')
      } else {
        console.log('✅ 삭제 확인 완료: 문서가 성공적으로 삭제됨')
      }
      
    } catch (error: any) {
      console.error('❌ Firestore deleteTodo 실패:', error)
      console.log('📝 오류 세부정보:', {
        errorCode: error.code,
        errorMessage: error.message,
        stack: error.stack
      })
      throw error
    }
  },

  subscribeTodos: (uid: string, callback: (todos: Todo[]) => void) => {
    try {
      console.log('🔥 Firestore subscribeTodos 시작 - UID:', uid)
      const todosRef = collection(db, `users/${uid}/todos`)
      const q = query(todosRef, orderBy('createdAt', 'desc'))
      
      const unsubscribe = onSnapshot(q, (snapshot) => {
        console.log('📡 Firestore snapshot 수신 - 문서 개수:', snapshot.docs.length)
        
        // 변경 사항 상세 로깅 (삭제 감지)
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            console.log('➕ Firestore 문서 추가:', change.doc.id, change.doc.data().title)
          }
          if (change.type === 'modified') {
            console.log('✏️ Firestore 문서 수정:', change.doc.id, change.doc.data().title)
          }
          if (change.type === 'removed') {
            console.log('🗑️ Firestore 문서 삭제 감지:', change.doc.id)
          }
        })
        
        // 특정 할일 ID 추적
        const targetId = 'me8an5259ysxiop5c'
        const targetDoc = snapshot.docs.find(doc => doc.id === targetId)
        if (targetDoc) {
          console.log(`🔍 추적 대상 할일 발견 - ID: ${targetId}`, {
            title: targetDoc.data().title,
            createdAt: targetDoc.data().createdAt,
            path: `users/${uid}/todos/${targetId}`,
            fullData: targetDoc.data()
          })
        } else {
          console.log(`🔍 추적 대상 할일 없음 - ID: ${targetId}`)
        }
        
        const todos = snapshot.docs.map(doc => {
          try {
            const data = doc.data()
            console.log(`📄 문서 처리 중 - Firestore ID: ${doc.id}, title: "${data.title}", created: ${data.createdAt}`)
            console.log(`🔥 원본 data.startDate:`, data.startDate, '(타입:', typeof data.startDate, ')')
            
            // 실제 Firestore 문서 ID 사용 (중요!)
            const processedStartDate = safeToDate(data.startDate)
            console.log(`🔥 safeToDate 처리 후 startDate:`, processedStartDate, '(타입:', typeof processedStartDate, ')')
            
            const processedTodo = {
              ...data,
              id: doc.id, // Firestore 문서 ID를 마지막에 설정하여 덮어쓰기 방지
              createdAt: safeToDate(data.createdAt) || new Date(),
              updatedAt: safeToDate(data.updatedAt) || new Date(),
              dueDate: safeToDate(data.dueDate),
              startDate: processedStartDate,
              completedAt: safeToDate(data.completedAt),
              // 서브태스크 배열의 날짜 필드 안전 처리
              subTasks: data.subTasks ? data.subTasks.map((subTask: any) => ({
                ...subTask,
                createdAt: safeToDate(subTask.createdAt) || new Date(),
                updatedAt: safeToDate(subTask.updatedAt) || new Date(),
                completedAt: subTask.completedAt ? safeToDate(subTask.completedAt) : null
              })) : []
            }
            
            // ID 일치 확인 (중요한 디버깅 정보)
            if (processedTodo.id !== doc.id) {
              console.error(`🚨 ID 불일치 감지! Firestore: ${doc.id} vs Processed: ${processedTodo.id}`)
            } else {
              console.log(`✅ ID 일치 확인 - ${processedTodo.id}, title: "${processedTodo.title}"`)
            }
            
            return processedTodo
          } catch (error) {
            console.error(`❌ 문서 처리 실패 - ID: ${doc.id}`, error)
            return null
          }
        }).filter(todo => todo !== null) as Todo[]
        
        console.log('📊 Firestore subscribeTodos 최종 결과:', todos.length, '개')
        
        // ID 목록도 로깅 (삭제 확인용)
        const todoIds = todos.map(t => t.id)
        console.log('📋 현재 할일 ID 목록:', todoIds)
        
        callback(todos)
      }, (error) => {
        console.error('❌ Firestore 구독 오류:', error)
        callback([]) // 오류 시 빈 배열 전달
      })
      
      return unsubscribe
    } catch (error) {
      console.error('❌ Firestore subscribeTodos 초기화 실패:', error)
      callback([])
      return () => {}
    }
  },

  // 서브태스크 관련 (할일 문서 내부 배열 업데이트)
  addSubTask: async (subTask: SubTask, uid: string, todoId: string): Promise<void> => {
    try {
      const todoRef = doc(db, `users/${uid}/todos`, todoId)
      
      // Firestore의 arrayUnion을 사용하여 효율적으로 추가
      await updateDoc(todoRef, {
        subTasks: arrayUnion(subTask),
        updatedAt: serverTimestamp()
      })
      
      console.log('Firestore addSubTask 성공:', subTask.id)
    } catch (error) {
      console.error('Firestore addSubTask 실패:', error)
      throw error
    }
  },

  updateSubTask: async (subTaskId: string, updates: Partial<SubTask>, uid: string, todoId: string): Promise<void> => {
    try {
      console.log('🔄 Firestore updateSubTask 시작:', { subTaskId, updates, uid, todoId })
      
      const todoRef = doc(db, `users/${uid}/todos`, todoId)
      const todoSnapshot = await getDoc(todoRef)
      
      if (!todoSnapshot.exists()) {
        throw new Error('할일을 찾을 수 없습니다.')
      }
      
      const todoData = todoSnapshot.data()
      const currentSubTasks = todoData.subTasks || []
      
      // deleteField() 처리를 위한 안전한 업데이트 로직
      const updatedSubTasks = currentSubTasks.map((subTask: SubTask) => {
        if (subTask.id === subTaskId) {
          const updatedSubTask = { ...subTask, updatedAt: new Date() }
          
          // updates의 각 필드를 처리
          Object.keys(updates).forEach(key => {
            const value = updates[key as keyof SubTask]
            
            // deleteField()인 경우 해당 필드를 제거하거나 null로 설정
            if (value && typeof value === 'object' && value.constructor.name === 'FieldValue') {
              // completedAt 필드는 null로 설정 (완전 제거 대신)
              if (key === 'completedAt') {
                updatedSubTask[key as keyof SubTask] = null as any
              }
              // 다른 deleteField() 필드는 undefined로 설정하여 제거
              else {
                delete updatedSubTask[key as keyof SubTask]
              }
            } else {
              // 일반 값 설정 - Date 객체 특별 처리
              if (key === 'completedAt' && value instanceof Date) {
                console.log('📅 completedAt Date 객체 설정:', value)
                updatedSubTask[key as keyof SubTask] = value as any
              } else {
                updatedSubTask[key as keyof SubTask] = value as any
              }
            }
          })
          
          console.log('🔧 서브태스크 업데이트 결과:', updatedSubTask)
          return updatedSubTask
        }
        return subTask
      })
      
      console.log('📝 전체 서브태스크 배열 업데이트:', updatedSubTasks)
      
      await updateDoc(todoRef, {
        subTasks: updatedSubTasks,
        updatedAt: serverTimestamp()
      })
      
      console.log('✅ Firestore updateSubTask 성공:', subTaskId)
    } catch (error) {
      console.error('❌ Firestore updateSubTask 실패:', error)
      throw error
    }
  },

  deleteSubTask: async (subTaskId: string, uid: string, todoId: string): Promise<void> => {
    try {
      const todoRef = doc(db, `users/${uid}/todos`, todoId)
      const todoSnapshot = await getDoc(todoRef)
      
      if (!todoSnapshot.exists()) {
        throw new Error('할일을 찾을 수 없습니다.')
      }
      
      const todoData = todoSnapshot.data()
      const currentSubTasks = todoData.subTasks || []
      
      const filteredSubTasks = currentSubTasks.filter((subTask: SubTask) => subTask.id !== subTaskId)
      
      await updateDoc(todoRef, {
        subTasks: filteredSubTasks,
        updatedAt: serverTimestamp()
      })
      
      console.log('Firestore deleteSubTask 성공:', subTaskId)
    } catch (error) {
      console.error('Firestore deleteSubTask 실패:', error)
      throw error
    }
  },

  // localStorage에서 Firestore로 마이그레이션
  migrateLocalStorageToFirestore: async (todos: Todo[], uid: string): Promise<void> => {
    try {
      const batch = writeBatch(db)
      const todosRef = collection(db, `users/${uid}/todos`)
      
      todos.forEach(todo => {
        const docRef = doc(todosRef)
        batch.set(docRef, {
          ...todo,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        })
      })
      
      await batch.commit()
      console.log('Firestore 마이그레이션 성공:', todos.length, '개')
    } catch (error) {
      console.error('Firestore 마이그레이션 실패:', error)
      throw error
    }
  },

  // 반복 템플릿 관련 함수들
  getRecurringTemplates: async (uid: string): Promise<any[]> => {
    try {
      const templatesRef = collection(db, `users/${uid}/recurringTemplates`)
      const q = query(templatesRef, orderBy('createdAt', 'desc'))
      const snapshot = await getDocs(q)
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date()
      }))
    } catch (error) {
      console.error('Firestore getRecurringTemplates 실패:', error)
      throw error
    }
  },

  addRecurringTemplate: async (template: any, uid: string): Promise<string> => {
    try {
      const templatesRef = collection(db, `users/${uid}/recurringTemplates`)
      
      // undefined 값들을 제거하고 안전한 데이터로 변환
      const cleanTemplate = Object.fromEntries(
        Object.entries(template).filter(([_, value]) => value !== undefined)
      )
      
      // 필수 필드들에 기본값 설정
      const templateData = {
        title: '',
        description: '',
        type: 'single',
        priority: 'medium',
        tags: [],
        ...cleanTemplate,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }
      
      console.log('🔥 저장할 템플릿 데이터:', templateData)
      
      const docRef = await addDoc(templatesRef, templateData)
      console.log('Firestore addRecurringTemplate 성공:', docRef.id)
      return docRef.id
    } catch (error) {
      console.error('Firestore addRecurringTemplate 실패:', error)
      throw error
    }
  },

  updateRecurringTemplate: async (id: string, updates: any, uid: string): Promise<void> => {
    try {
      const templateRef = doc(db, `users/${uid}/recurringTemplates`, id)
      
      // undefined 값들을 제거하고 안전한 데이터로 변환
      const cleanUpdates = Object.fromEntries(
        Object.entries(updates).filter(([_, value]) => value !== undefined)
      )
      
      const updateData = {
        ...cleanUpdates,
        updatedAt: serverTimestamp()
      }
      
      console.log('🔥 업데이트할 템플릿 데이터:', updateData)
      
      await updateDoc(templateRef, updateData)
      console.log('Firestore updateRecurringTemplate 성공:', id)
    } catch (error) {
      console.error('Firestore updateRecurringTemplate 실패:', error)
      throw error
    }
  },

  deleteRecurringTemplate: async (id: string, uid: string): Promise<void> => {
    return withRetry(async () => {
      try {
        console.log('🗑️ 반복 템플릿 삭제 시작:', id)

        // 1. 관련된 모든 인스턴스 찾기
        console.log('1️⃣ 관련 인스턴스 검색 중...')
        const instancesRef = collection(db, `users/${uid}/recurringInstances`)
        const instancesQuery = query(instancesRef, where('templateId', '==', id))
        const instancesSnapshot = await getDocs(instancesQuery)

        console.log(`발견된 인스턴스: ${instancesSnapshot.size}개`)

        // 2. 관련된 할일들 찾기 (todos 컬렉션에서)
        console.log('2️⃣ 관련 할일 검색 중...')
        const todosRef = collection(db, `users/${uid}/todos`)
        const todosQuery = query(todosRef, where('_templateId', '==', id))
        const todosSnapshot = await getDocs(todosQuery)

        console.log(`발견된 할일: ${todosSnapshot.size}개`)

        // 3. 배치로 모든 관련 데이터 삭제
        console.log('3️⃣ 배치 삭제 실행 중...')
        const batch = writeBatch(db)

        // 템플릿 삭제
        const templateRef = doc(db, `users/${uid}/recurringTemplates`, id)
        batch.delete(templateRef)

        // 관련 인스턴스들 삭제
        instancesSnapshot.forEach(doc => {
          console.log(`  - 인스턴스 삭제: ${doc.id}`)
          batch.delete(doc.ref)
        })

        // 관련 할일들 삭제
        todosSnapshot.forEach(doc => {
          console.log(`  - 할일 삭제: ${doc.data().title}`)
          batch.delete(doc.ref)
        })

        // 배치 실행
        await batch.commit()

        console.log('✅ 반복 템플릿 및 관련 데이터 삭제 완료:', {
          templateId: id,
          deletedInstances: instancesSnapshot.size,
          deletedTodos: todosSnapshot.size
        })

      } catch (error) {
        console.error('❌ 반복 템플릿 삭제 실패:', error)
        throw handleFirestoreError(error, 'deleteRecurringTemplate')
      }
    })
  },

  subscribeRecurringTemplates: (uid: string, callback: (templates: any[]) => void) => {
    try {
      const templatesRef = collection(db, `users/${uid}/recurringTemplates`)
      const q = query(templatesRef, orderBy('createdAt', 'desc'))
      
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const templates = snapshot.docs.map(doc => {
          const data = doc.data()
          
          
          return {
            id: doc.id,
            ...data,
            createdAt: safeToDate(data.createdAt) || new Date(),
            updatedAt: safeToDate(data.updatedAt) || new Date()
          }
        })
        
        console.log('Firestore subscribeRecurringTemplates 업데이트:', templates.length, '개')
        callback(templates)
      })
      
      return unsubscribe
    } catch (error) {
      console.error('Firestore subscribeRecurringTemplates 실패:', error)
      callback([])
      return () => {}
    }
  },

  // 반복 인스턴스 관련 함수들 추가
  getRecurringInstances: async (uid: string): Promise<any[]> => {
    try {
      console.log(`🔍 getRecurringInstances 시작 - 사용자 ID: ${uid}`)
      console.log(`⏰ 조회 시작 시각: ${new Date().toISOString()}`)
      
      const instancesRef = collection(db, `users/${uid}/recurringInstances`)
      const q = query(instancesRef, orderBy('date', 'asc'))
      
      console.log(`📍 Firestore 쿼리 경로: users/${uid}/recurringInstances`)
      
      // 캐시 우회를 위해 source를 'server'로 강제 설정
      console.log(`🚨 캐시 우회 모드로 서버에서 직접 조회`)
      const snapshot = await getDocs(q, { source: 'server' })
      console.log(`📄 조회된 문서 수: ${snapshot.docs.length}`)
      
      const instances = snapshot.docs.map(doc => {
        const data = doc.data()
        const instance = {
          id: doc.id,
          ...data,
          date: safeToDate(data.date) || new Date(),
          createdAt: safeToDate(data.createdAt) || new Date(),
          updatedAt: safeToDate(data.updatedAt) || new Date(),
          completedAt: safeToDate(data.completedAt)
        }
        
        // 주간업무보고 특별 로깅
        if (doc.id.includes('PUH4xT3lVY5aK2vuQyUe_2025-08-21')) {
          console.log(`🔍 주간업무보고 조회 결과:`, {
            id: instance.id,
            completed: instance.completed,
            completedAt: instance.completedAt,
            updatedAt: instance.updatedAt,
            rawData: data
          })
        }
        
        return instance
      })
      
      console.log(`✅ getRecurringInstances 완료 - ${instances.length}개 인스턴스 반환`)
      console.log(`⏰ 조회 완료 시각: ${new Date().toISOString()}`)
      
      return instances
    } catch (error) {
      console.error('Firestore getRecurringInstances 실패:', error)
      throw error
    }
  },

  addRecurringInstance: async (instance: any, uid: string): Promise<string> => {
    try {
      const instancesRef = collection(db, `users/${uid}/recurringInstances`)
      
      const cleanInstance = removeUndefinedValues(instance)
      
      // ID가 제공된 경우 해당 ID로 문서 생성, 아니면 자동 생성
      if (cleanInstance.id) {
        const instanceDocRef = doc(db, `users/${uid}/recurringInstances`, cleanInstance.id)
        
        const instanceData = {
          ...cleanInstance,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        }
        
        // setDoc을 사용하여 특정 ID로 문서 생성
        await setDoc(instanceDocRef, instanceData)
        console.log('Firestore addRecurringInstance 성공 (특정 ID):', cleanInstance.id)
        return cleanInstance.id
      } else {
        // ID가 없는 경우 자동 생성
        const instanceData = {
          ...cleanInstance,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        }
        
        const docRef = await addDoc(instancesRef, instanceData)
        console.log('Firestore addRecurringInstance 성공 (자동 ID):', docRef.id)
        return docRef.id
      }
    } catch (error) {
      console.error('Firestore addRecurringInstance 실패:', error)
      throw error
    }
  },

  updateRecurringInstance: async (id: string, updates: any, uid: string): Promise<void> => {
    try {
      console.log(`🔄 Firestore updateRecurringInstance 시작 - ID: ${id}`)
      console.log(`📋 원본 업데이트 데이터:`, updates)
      console.log(`⏰ Firestore 업데이트 시작 시각: ${new Date().toISOString()}`)
      console.log(`🔗 사용자 ID: ${uid}`)
      console.log(`📍 Firestore 경로: users/${uid}/recurringInstances/${id}`)
      
      const instanceRef = doc(db, `users/${uid}/recurringInstances`, id)
      console.log(`📄 DocumentReference 생성 완료`)
      
      let docSnap
      try {
        console.log(`🔍 문서 존재 여부 확인 중...`)
        docSnap = await getDoc(instanceRef)
        console.log(`📄 문서 존재 여부: ${docSnap.exists()}`)
        
        if (docSnap.exists()) {
          console.log(`📋 기존 문서 데이터:`, docSnap.data())
        } else {
          console.log(`📋 문서가 존재하지 않음 - 새로 생성 예정`)
        }
      } catch (getDocError) {
        console.error(`❌ getDoc 실행 중 오류:`, getDocError)
        throw new Error(`getDoc 실패: ${getDocError.message}`)
      }
      
      const cleanUpdates = removeUndefinedValues(updates)
      console.log(`📋 정리된 업데이트 데이터:`, cleanUpdates)
      
      if (!docSnap.exists()) {
        console.log('📝 반복 인스턴스 문서가 존재하지 않음. 새로 생성:', id)
        
        // 문서가 없으면 새로 생성 (setDoc 사용)
        const newInstanceData = {
          id: id,
          ...cleanUpdates,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        }
        
        console.log(`📋 새 문서 생성 데이터:`, newInstanceData)
        await setDoc(instanceRef, newInstanceData)
        console.log('✅ 새 반복 인스턴스 문서 생성 완료:', id)
      } else {
        // 문서가 있으면 업데이트
        const updateData = {
          ...cleanUpdates,
          updatedAt: serverTimestamp()
        }
        
        console.log('🔧 Firestore updateDoc 실행 중...', {
          id: id,
          updateData: updateData,
          hasDeleteField: Object.values(updateData).some(v => v && typeof v === 'object' && v.constructor.name === 'FieldValue')
        })
        
        // 주간업무보고 특별 로깅
        if (id.includes('weekly_work_report')) {
          console.log(`🔍 주간업무보고 Firestore 업데이트 직전: completed=${updateData.completed}`)
        }
        
        try {
          console.log(`🔧 updateDoc 실행 시작...`)
          await updateDoc(instanceRef, updateData)
          console.log('✅ 기존 반복 인스턴스 문서 업데이트 완료:', id)
          console.log(`⏰ Firestore 업데이트 완료 시각: ${new Date().toISOString()}`)
        } catch (updateDocError) {
          console.error(`❌ updateDoc 실행 중 오류:`, updateDocError)
          console.error(`❌ 업데이트 시도한 데이터:`, updateData)
          console.error(`❌ 문서 경로:`, `users/${uid}/recurringInstances/${id}`)
          throw new Error(`updateDoc 실패: ${updateDocError.message}`)
        }
      }
    } catch (error) {
      console.error('❌ Firestore updateRecurringInstance 실패:', error)
      throw error
    }
  },

  deleteRecurringInstance: async (id: string, uid: string): Promise<void> => {
    try {
      const instanceRef = doc(db, `users/${uid}/recurringInstances`, id)
      await deleteDoc(instanceRef)
      console.log('Firestore deleteRecurringInstance 성공:', id)
    } catch (error) {
      console.error('Firestore deleteRecurringInstance 실패:', error)
      throw error
    }
  },

  subscribeRecurringInstances: (uid: string, callback: (instances: any[]) => void) => {
    try {
      const instancesRef = collection(db, `users/${uid}/recurringInstances`)
      const q = query(instancesRef, orderBy('date', 'asc'))
      
      const unsubscribe = onSnapshot(q, {
        includeMetadataChanges: false
      }, (snapshot) => {
        console.log('🔔 Firestore 반복 인스턴스 구독 업데이트 수신')
        console.log('📡 구독 소스:', snapshot.metadata.fromCache ? 'CACHE' : 'SERVER')
        
        // 변경 사항 상세 로깅
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            console.log('➕ 반복 인스턴스 추가:', change.doc.id, change.doc.data())
          }
          if (change.type === 'modified') {
            console.log('✏️ 반복 인스턴스 수정:', change.doc.id, change.doc.data())
          }
          if (change.type === 'removed') {
            console.log('🗑️ 반복 인스턴스 삭제:', change.doc.id)
          }
        })
        
        const instances = snapshot.docs.map(doc => {
          const data = doc.data()
          
          const processedInstance = {
            id: doc.id,
            ...data,
            date: safeToDate(data.date) || new Date(),
            createdAt: safeToDate(data.createdAt) || new Date(),
            updatedAt: safeToDate(data.updatedAt) || new Date(),
            completedAt: safeToDate(data.completedAt)
          }
          
          console.log('📄 반복 인스턴스 처리:', {
            id: processedInstance.id,
            completed: processedInstance.completed,
            completedAt: processedInstance.completedAt,
            updatedAt: processedInstance.updatedAt
          })
          
          return processedInstance
        })
        
        console.log('📊 Firestore subscribeRecurringInstances 최종 결과:', instances.length, '개')
        callback(instances)
      })
      
      return unsubscribe
    } catch (error) {
      console.error('Firestore subscribeRecurringInstances 실패:', error)
      callback([])
      return () => {}
    }
  },

  // 프로젝트 템플릿 관련 함수들
  getProjectTemplates: async (uid: string): Promise<any[]> => {
    try {
      debug.log('프로젝트 템플릿 조회 시작', { uid })
      const templatesRef = collection(db, `users/${uid}/projectTemplates`)
      const q = query(templatesRef, orderBy('createdAt', 'desc'))
      const snapshot = await getDocs(q)
      
      const templates = snapshot.docs.map(doc => {
        const data = doc.data()
        return {
          id: doc.id,
          ...data,
          createdAt: safeToDate(data.createdAt) || new Date(),
          updatedAt: safeToDate(data.updatedAt) || new Date()
        }
      })
      
      debug.log('프로젝트 템플릿 조회 성공', { count: templates.length })
      return templates
    } catch (error) {
      debug.error('프로젝트 템플릿 조회 실패:', error)
      throw handleFirestoreError(error, 'getProjectTemplates')
    }
  },

  addProjectTemplate: async (template: any, uid: string): Promise<string> => {
    try {
      debug.log('프로젝트 템플릿 추가 시작', { uid, template })
      const templatesRef = collection(db, `users/${uid}/projectTemplates`)
      
      const cleanTemplate = removeUndefinedValues(template)
      const templateData = {
        name: '',
        description: '',
        category: 'general',
        subtasks: [],
        ...cleanTemplate,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }
      
      const docRef = await addDoc(templatesRef, templateData)
      debug.log('프로젝트 템플릿 추가 성공', { id: docRef.id })
      return docRef.id
    } catch (error) {
      debug.error('프로젝트 템플릿 추가 실패:', error)
      throw handleFirestoreError(error, 'addProjectTemplate')
    }
  },

  updateProjectTemplate: async (id: string, updates: any, uid: string): Promise<void> => {
    try {
      debug.log('프로젝트 템플릿 수정 시작', { id, uid })
      const templateRef = doc(db, `users/${uid}/projectTemplates`, id)
      
      const cleanUpdates = removeUndefinedValues(updates)
      const updateData = {
        ...cleanUpdates,
        updatedAt: serverTimestamp()
      }
      
      await updateDoc(templateRef, updateData)
      debug.log('프로젝트 템플릿 수정 성공', { id })
    } catch (error) {
      debug.error('프로젝트 템플릿 수정 실패:', error)
      throw handleFirestoreError(error, 'updateProjectTemplate')
    }
  },

  deleteProjectTemplate: async (id: string, uid: string): Promise<void> => {
    try {
      debug.log('프로젝트 템플릿 삭제 시작', { id, uid })
      const templateRef = doc(db, `users/${uid}/projectTemplates`, id)
      await deleteDoc(templateRef)
      debug.log('프로젝트 템플릿 삭제 성공', { id })
    } catch (error) {
      debug.error('프로젝트 템플릿 삭제 실패:', error)
      throw handleFirestoreError(error, 'deleteProjectTemplate')
    }
  },

  subscribeProjectTemplates: (uid: string, callback: (templates: any[]) => void) => {
    try {
      debug.log('프로젝트 템플릿 구독 시작', { uid })
      const templatesRef = collection(db, `users/${uid}/projectTemplates`)
      const q = query(templatesRef, orderBy('createdAt', 'desc'))
      
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const templates = snapshot.docs.map(doc => {
          const data = doc.data()
          return {
            id: doc.id,
            ...data,
            createdAt: safeToDate(data.createdAt) || new Date(),
            updatedAt: safeToDate(data.updatedAt) || new Date()
          }
        })
        
        debug.log('프로젝트 템플릿 구독 업데이트', { count: templates.length })
        callback(templates)
      }, (error) => {
        debug.error('프로젝트 템플릿 구독 오류:', error)
        callback([])
      })
      
      return unsubscribe
    } catch (error) {
      debug.error('프로젝트 템플릿 구독 초기화 실패:', error)
      callback([])
      return () => {}
    }
  },

  // 반복 템플릿 기반 인스턴스 재생성 (Firebase 전용)
  regenerateRecurringInstances: async (templateId: string, uid: string): Promise<void> => {
    return withRetry(async () => {
      try {
        if (!uid || !templateId) {
          throw new Error('User ID and template ID are required')
        }
        
        debug.log('반복 인스턴스 재생성 시작', { templateId, uid })
        
        const batch = writeBatch(db)
        
        // 1. 기존 템플릿 기반 인스턴스들 삭제
        const instancesRef = collection(db, `users/${uid}/recurringInstances`)
        const existingQuery = query(instancesRef)
        const existingSnapshot = await getDocs(existingQuery)
        
        let deletedCount = 0
        existingSnapshot.docs.forEach(doc => {
          const data = doc.data()
          if (data.templateId === templateId) {
            batch.delete(doc.ref)
            deletedCount++
          }
        })
        
        debug.log('기존 인스턴스 삭제 예정', { count: deletedCount })
        
        // 2. 템플릿 정보 조회
        const templateRef = doc(db, `users/${uid}/recurringTemplates`, templateId)
        const templateDoc = await getDoc(templateRef)
        
        if (!templateDoc.exists()) {
          throw new Error(`Template ${templateId} not found`)
        }
        
        const template = { id: templateDoc.id, ...templateDoc.data() } as any
        debug.log('템플릿 조회 완료', { template: template.title })
        
        // 3. 새로운 인스턴스들 생성
        const newInstances = await firestoreService.generateInstancesForTemplate(template, uid)
        
        // 중복 방지를 위한 유니크 ID 생성
        const uniqueInstances = new Map()
        newInstances.forEach(instance => {
          const dateKey = instance.date.toISOString().split('T')[0] // YYYY-MM-DD 형식
          const uniqueId = `${templateId}_${dateKey}`
          
          if (!uniqueInstances.has(uniqueId)) {
            uniqueInstances.set(uniqueId, {
              ...instance,
              id: uniqueId
            })
          } else {
            debug.log('중복 인스턴스 제거:', { uniqueId, date: dateKey })
          }
        })
        
        uniqueInstances.forEach((instance, uniqueId) => {
          const instanceRef = doc(instancesRef, uniqueId)
          batch.set(instanceRef, {
            ...instance,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          })
        })
        
        debug.log('새 인스턴스 생성 예정', { 
          originalCount: newInstances.length,
          uniqueCount: uniqueInstances.size 
        })
        
        // 4. 일괄 처리 실행
        await batch.commit()
        
        debug.log('반복 인스턴스 재생성 성공', {
          templateId,
          deleted: deletedCount,
          created: newInstances.length
        })
      } catch (error) {
        debug.error('반복 인스턴스 재생성 실패:', error)
        throw handleFirestoreError(error, 'regenerateRecurringInstances')
      }
    })
  },

  // 반복 템플릿 기반 실제 할일 재생성 (Firebase 전용) - 실제 todos 컬렉션 처리
  regenerateTemplateTodos: async (templateId: string, uid: string): Promise<void> => {
    return withRetry(async () => {
      try {
        if (!uid || !templateId) {
          throw new Error('User ID and template ID are required')
        }
        
        debug.log('반복 템플릿 할일 재생성 시작', { templateId, uid })
        
        const batch = writeBatch(db)
        
        // 1. 기존 템플릿 기반 할일들 삭제 (_templateId 기준)
        const todosRef = collection(db, `users/${uid}/todos`)
        const existingQuery = query(todosRef)
        const existingSnapshot = await getDocs(existingQuery)
        
        let deletedCount = 0
        existingSnapshot.docs.forEach(doc => {
          const data = doc.data()
          if (data._templateId === templateId) {
            batch.delete(doc.ref)
            deletedCount++
          }
        })
        
        debug.log('기존 템플릿 기반 할일 삭제 예정', { count: deletedCount })
        
        // 2. 템플릿 정보 조회
        const templateRef = doc(db, `users/${uid}/recurringTemplates`, templateId)
        const templateDoc = await getDoc(templateRef)
        
        if (!templateDoc.exists()) {
          throw new Error(`Template ${templateId} not found`)
        }
        
        const template = { id: templateDoc.id, ...templateDoc.data() } as any
        debug.log('템플릿 조회 완료', { template: template.title })
        
        // 3. 새로운 할일들 생성
        const newInstances = await firestoreService.generateInstancesForTemplate(template, uid)
        
        // 4. 인스턴스를 실제 할일로 변환하여 생성
        newInstances.forEach(instance => {
          const todoRef = doc(todosRef)
          const todoData = {
            id: todoRef.id,
            title: template.title,
            description: template.description || '',
            type: 'single' as const,
            status: 'pending' as const,
            dueDate: safeToTimestamp(instance.date),
            createdDate: serverTimestamp(),
            updatedDate: serverTimestamp(),
            priority: template.priority || 'medium',
            tags: template.tags || [],
            _templateId: templateId, // 템플릿 연결
            _instanceId: instance.id // 인스턴스 연결
          }
          
          batch.set(todoRef, todoData)
        })
        
        debug.log('새 할일 생성 예정', { count: newInstances.length })
        
        // 5. 일괄 처리 실행
        await batch.commit()
        
        debug.log('반복 템플릿 할일 재생성 성공', {
          templateId,
          deleted: deletedCount,
          created: newInstances.length
        })
      } catch (error) {
        debug.error('반복 템플릿 할일 재생성 실패:', error)
        throw handleFirestoreError(error, 'regenerateTemplateTodos')
      }
    })
  },

  // 템플릿에 대한 인스턴스 생성 로직 (내부 함수)
  generateInstancesForTemplate: async (template: any, uid: string): Promise<any[]> => {
    try {
      debug.log('템플릿 인스턴스 생성 시작', { 
        templateId: template.id, 
        title: template.title,
        recurrenceType: template.recurrenceType,
        monthlyDate: template.monthlyDate 
      })
      
      const instances: any[] = []
      const now = new Date()
      const startDate = new Date(now.getFullYear(), now.getMonth(), 1) // 이번 달 1일
      const endDate = new Date(now.getFullYear() + 1, now.getMonth() + 1, 0) // 1년 후 같은 달 마지막날까지
      
      debug.log('날짜 범위', { 
        startDate: startDate.toISOString(), 
        endDate: endDate.toISOString() 
      })
      
      // 공휴일 API 데이터 가져오기 (간단한 구현)
      const holidays = await firestoreService.fetchHolidays(now.getFullYear())
      
      const current = new Date(startDate)
      let monthCount = 0
      
      while (current <= endDate && monthCount < 15) { // 안전 장치
        debug.log(`${monthCount + 1}번째 달 처리 중:`, { 
          year: current.getFullYear(), 
          month: current.getMonth() + 1
        })
        
        let targetDate = new Date(current)
        
        // 월간 반복 처리
        if (template.recurrenceType === 'monthly') {
          const monthlyDate = template.monthlyDate
          
          if (monthlyDate === -1) {
            // 말일
            targetDate = new Date(current.getFullYear(), current.getMonth() + 1, 0)
            debug.log('말일 계산:', targetDate.toISOString())
          } else if (monthlyDate === -2) {
            // 첫번째 근무일
            debug.log('🔍 첫번째 근무일 요청:', { year: current.getFullYear(), jsMonth: current.getMonth(), displayMonth: current.getMonth() + 1 })
            targetDate = firestoreService.getFirstWorkingDay(current.getFullYear(), current.getMonth(), holidays)
            debug.log('🎯 첫번째 근무일 결과:', { date: targetDate.toISOString(), displayDate: targetDate.toDateString() })
          } else if (monthlyDate === -3) {
            // 마지막 근무일
            debug.log('🔍 마지막 근무일 요청:', { year: current.getFullYear(), jsMonth: current.getMonth(), displayMonth: current.getMonth() + 1 })
            targetDate = firestoreService.getLastWorkingDay(current.getFullYear(), current.getMonth(), holidays)
            debug.log('🎯 마지막 근무일 결과:', { date: targetDate.toISOString(), displayDate: targetDate.toDateString() })
          } else if (monthlyDate && monthlyDate >= 1 && monthlyDate <= 31) {
            // 특정 날짜
            debug.log('🔍 특정 날짜 요청:', {
              year: current.getFullYear(),
              jsMonth: current.getMonth(),
              displayMonth: current.getMonth() + 1,
              requestedDay: monthlyDate,
              currentDate: current.toISOString()
            })
            targetDate = new Date(current.getFullYear(), current.getMonth(), monthlyDate)
            debug.log('🎯 특정 날짜 생성 결과:', {
              targetDate: targetDate.toISOString(),
              displayDate: targetDate.toDateString(),
              actualDay: targetDate.getDate(),
              actualMonth: targetDate.getMonth() + 1
            })
          }
          
          // 공휴일 처리
          debug.log('🔍 공휴일 처리 확인:', {
            holidayHandling: template.holidayHandling,
            targetDate: targetDate.toISOString(),
            isWeekend: targetDate.getDay() === 0 || targetDate.getDay() === 6,
            dayOfWeek: targetDate.getDay(),
            holidaysCount: holidays.length
          })

          if (template.holidayHandling === 'before') {
            const originalDate = new Date(targetDate)
            debug.log('🚨 공휴일 처리 (before) 호출 전:', {
              original: originalDate.toISOString(),
              originalDisplayDate: originalDate.toDateString(),
              originalDay: originalDate.getDate()
            })
            targetDate = firestoreService.getWorkingDayBefore(targetDate, holidays)
            debug.log('🚨 공휴일 처리 (before) 호출 후:', {
              adjusted: targetDate.toISOString(),
              adjustedDisplayDate: targetDate.toDateString(),
              adjustedDay: targetDate.getDate(),
              daysDifference: originalDate.getDate() - targetDate.getDate()
            })
          } else if (template.holidayHandling === 'after') {
            const originalDate = new Date(targetDate)
            debug.log('🚨 공휴일 처리 (after) 호출 전:', {
              original: originalDate.toISOString(),
              originalDisplayDate: originalDate.toDateString(),
              originalDay: originalDate.getDate()
            })
            targetDate = firestoreService.getWorkingDayAfter(targetDate, holidays)
            debug.log('🚨 공휴일 처리 (after) 호출 후:', {
              adjusted: targetDate.toISOString(),
              adjustedDisplayDate: targetDate.toDateString(),
              adjustedDay: targetDate.getDate(),
              daysDifference: targetDate.getDate() - originalDate.getDate()
            })
          } else {
            debug.log('✅ 공휴일 처리 없음 - 날짜 그대로 사용')
          }
          // 'show' 옵션은 날짜 그대로 사용
          
          // 인스턴스 생성
          const instance = {
            templateId: template.id,
            date: targetDate,
            completed: false,
            completedAt: null
          }
          
          instances.push(instance)
          debug.log(`인스턴스 생성:`, { 
            date: targetDate.toISOString(),
            month: targetDate.getMonth() + 1,
            day: targetDate.getDate()
          })
        } else {
          debug.log('월간 반복이 아닌 템플릿:', template.recurrenceType)
        }
        
        // 다음 달로 이동
        current.setMonth(current.getMonth() + 1)
        monthCount++
      }
      
      debug.log('템플릿 인스턴스 생성 완료', { 
        count: instances.length,
        months: monthCount 
      })
      return instances
    } catch (error) {
      debug.error('템플릿 인스턴스 생성 실패:', error)
      return []
    }
  },

  // 공휴일 데이터 가져오기 (간단한 구현)
  fetchHolidays: async (year: number): Promise<Date[]> => {
    try {
      // 실제 구현에서는 공휴일 API를 호출
      // 여기서는 간단한 예시만 제공
      return []
    } catch (error) {
      debug.error('공휴일 조회 실패:', error)
      return []
    }
  },

  // 마지막 근무일 계산
  getLastWorkingDay: (year: number, month: number, holidays: Date[]): Date => {
    // 새로운 Date 객체를 생성하여 원본을 보호
    const lastDay = new Date(year, month + 1, 0) // 해당 월의 마지막 날
    const workingDay = new Date(lastDay) // 복사본 생성
    
    debug.log(`🗓️ 마지막 근무일 계산 시작:`, { 
      year, 
      month: month + 1, 
      originalLastDay: lastDay.toISOString(),
      dayOfWeek: lastDay.getDay(),
      holidaysCount: holidays.length
    })
    
    let adjustmentCount = 0
    // 토요일(6) 또는 일요일(0)이면 이전 근무일로 이동
    while (workingDay.getDay() === 0 || workingDay.getDay() === 6 || 
           holidays.some(h => h.getTime() === workingDay.getTime())) {
      
      const reason = workingDay.getDay() === 0 ? '일요일' : 
                     workingDay.getDay() === 6 ? '토요일' : '공휴일'
      debug.log(`날짜 조정: ${workingDay.toISOString()} (${reason})`)
      
      workingDay.setDate(workingDay.getDate() - 1)
      adjustmentCount++
      
      if (adjustmentCount > 7) { // 안전 장치
        debug.error('마지막 근무일 계산 무한루프 방지')
        break
      }
    }
    
    debug.log(`🗓️ 마지막 근무일 계산 완료:`, { 
      originalLastDay: lastDay.toISOString(),
      finalWorkingDay: workingDay.toISOString(),
      adjustments: adjustmentCount,
      finalDayOfWeek: workingDay.getDay()
    })
    
    return workingDay
  },

  // 첫번째 근무일 계산
  getFirstWorkingDay: (year: number, month: number, holidays: Date[]): Date => {
    const firstDay = new Date(year, month, 1) // 해당 월의 첫날
    const workingDay = new Date(firstDay) // 복사본 생성하여 원본 보호

    debug.log(`🗓️ 첫번째 근무일 계산 시작:`, {
      year,
      month: month + 1,
      originalFirstDay: firstDay.toISOString(),
      dayOfWeek: firstDay.getDay(),
      holidaysCount: holidays.length
    })

    let adjustmentCount = 0
    const maxAdjustments = 10

    // 토요일(6) 또는 일요일(0)이면 다음 근무일로 이동
    while ((workingDay.getDay() === 0 || workingDay.getDay() === 6 ||
           holidays.some(h => h.getTime() === workingDay.getTime())) &&
           adjustmentCount < maxAdjustments) {
      debug.log(`  ${workingDay.toISOString()} - 비근무일 (주말=${workingDay.getDay() === 0 || workingDay.getDay() === 6}, 공휴일=${holidays.some(h => h.getTime() === workingDay.getTime())})`)
      workingDay.setDate(workingDay.getDate() + 1)
      adjustmentCount++
    }

    debug.log(`🎯 첫번째 근무일 계산 완료:`, {
      year,
      month: month + 1,
      originalFirstDay: firstDay.toISOString(),
      finalWorkingDay: workingDay.toISOString(),
      adjustments: adjustmentCount,
      finalDayOfWeek: workingDay.getDay()
    })

    return workingDay
  },

  // 특정 날짜 이전 근무일 찾기
  getWorkingDayBefore: (date: Date, holidays: Date[]): Date => {
    const result = new Date(date)

    debug.log('🔍 getWorkingDayBefore 시작:', {
      inputDate: date.toISOString(),
      inputDisplayDate: date.toDateString(),
      inputDay: date.getDate(),
      inputDayOfWeek: date.getDay(),
      isWeekend: date.getDay() === 0 || date.getDay() === 6,
      isHoliday: holidays.some(h => h.getTime() === date.getTime())
    })

    // 🔥 핵심 수정: 이미 평일이고 공휴일이 아니면 그대로 반환
    if (result.getDay() !== 0 && result.getDay() !== 6 &&
        !holidays.some(h => h.getTime() === result.getTime())) {
      debug.log('✅ 이미 근무일이므로 그대로 반환:', result.toDateString())
      return result
    }

    // 주말이거나 공휴일인 경우만 이전 근무일 찾기
    let adjustmentCount = 0
    const maxAdjustments = 10

    while ((result.getDay() === 0 || result.getDay() === 6 ||
           holidays.some(h => h.getTime() === result.getTime())) &&
           adjustmentCount < maxAdjustments) {
      debug.log(`  ${result.toDateString()} - 비근무일, 하루 전으로`)
      result.setDate(result.getDate() - 1)
      adjustmentCount++
    }

    debug.log('🎯 getWorkingDayBefore 완료:', {
      finalDate: result.toISOString(),
      finalDisplayDate: result.toDateString(),
      finalDay: result.getDate(),
      adjustments: adjustmentCount
    })

    return result
  },

  // 특정 날짜 이후 근무일 찾기
  getWorkingDayAfter: (date: Date, holidays: Date[]): Date => {
    const result = new Date(date)

    debug.log('🔍 getWorkingDayAfter 시작:', {
      inputDate: date.toISOString(),
      inputDisplayDate: date.toDateString(),
      inputDay: date.getDate(),
      inputDayOfWeek: date.getDay(),
      isWeekend: date.getDay() === 0 || date.getDay() === 6,
      isHoliday: holidays.some(h => h.getTime() === date.getTime())
    })

    // 🔥 핵심 수정: 이미 평일이고 공휴일이 아니면 그대로 반환
    if (result.getDay() !== 0 && result.getDay() !== 6 &&
        !holidays.some(h => h.getTime() === result.getTime())) {
      debug.log('✅ 이미 근무일이므로 그대로 반환:', result.toDateString())
      return result
    }

    // 주말이거나 공휴일인 경우만 다음 근무일 찾기
    let adjustmentCount = 0
    const maxAdjustments = 10

    while ((result.getDay() === 0 || result.getDay() === 6 ||
           holidays.some(h => h.getTime() === result.getTime())) &&
           adjustmentCount < maxAdjustments) {
      debug.log(`  ${result.toDateString()} - 비근무일, 하루 뒤로`)
      result.setDate(result.getDate() + 1)
      adjustmentCount++
    }

    debug.log('🎯 getWorkingDayAfter 완료:', {
      finalDate: result.toISOString(),
      finalDisplayDate: result.toDateString(),
      finalDay: result.getDate(),
      adjustments: adjustmentCount
    })

    return result
  }
}