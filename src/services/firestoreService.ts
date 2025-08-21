// Firebase Firestore 서비스

// 안전한 날짜 변환 함수 (공통)
const safeToDate = (value: any): Date | undefined => {
  if (!value) return undefined
  if (value instanceof Date) return value
  if (typeof value?.toDate === 'function') return value.toDate()
  if (typeof value === 'string') return new Date(value)
  return undefined
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

console.log('FirestoreService: 실제 Firestore 서비스 활성화')

// 실제 Firestore 서비스
export const firestoreService = {
  // 할일 관련
  getTodos: async (uid: string): Promise<Todo[]> => {
    try {
      // 실제 Firestore 구조에 맞게 경로 수정: users/{uid}/todos
      const todosRef = collection(db, `users/${uid}/todos`)
      const q = query(todosRef, orderBy('createdAt', 'desc'))
      const snapshot = await getDocs(q)
      
      return snapshot.docs.map(doc => {
        const data = doc.data()
        
        
        return {
          id: doc.id,
          ...data,
          createdAt: safeToDate(data.createdAt) || new Date(),
          updatedAt: safeToDate(data.updatedAt) || new Date(),
          dueDate: safeToDate(data.dueDate),
          startDate: safeToDate(data.startDate),
          completedAt: safeToDate(data.completedAt)
        }
      }) as Todo[]
    } catch (error) {
      console.error('Firestore getTodos 실패:', error)
      throw error
    }
  },

  addTodo: async (todo: Todo, uid: string): Promise<string> => {
    try {
      const todosRef = collection(db, `users/${uid}/todos`)
      
      // undefined 값 제거
      const cleanedTodo = removeUndefinedValues(todo)
      
      const todoData = {
        ...cleanedTodo,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }
      
      console.log('Firestore에 저장할 데이터:', JSON.stringify(todoData, null, 2))
      console.log('🔥 Firestore 저장 데이터의 startDate:', todoData.startDate)
      console.log('🔥 Firestore 저장 데이터의 startDate 타입:', typeof todoData.startDate)
      
      const docRef = await addDoc(todosRef, todoData)
      console.log('Firestore addTodo 성공:', docRef.id)
      return docRef.id
    } catch (error) {
      console.error('Firestore addTodo 실패:', error)
      throw error
    }
  },

  updateTodo: async (id: string, updates: Partial<Todo>, uid: string): Promise<void> => {
    try {
      const todoRef = doc(db, `users/${uid}/todos`, id)
      
      // 문서 존재 여부 확인
      const docSnap = await getDoc(todoRef)
      
      if (!docSnap.exists()) {
        console.warn(`할일 문서 ${id}가 존재하지 않습니다. 업데이트를 건너뜁니다.`)
        return
      }
      
      const updateData = {
        ...updates,
        updatedAt: serverTimestamp()
      }
      
      await updateDoc(todoRef, updateData)
      console.log('Firestore updateTodo 성공:', id)
    } catch (error) {
      console.error('Firestore updateTodo 실패:', error)
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
        console.warn(`⚠️ 삭제하려는 문서가 존재하지 않음: ${id}`)
        console.log('🔍 전체 컬렉션에서 검색 시도...')
        
        // 전체 컬렉션에서 해당 ID를 가진 문서 찾기
        const allTodosRef = collection(db, `users/${uid}/todos`)
        const allSnapshot = await getDocs(allTodosRef)
        console.log(`📊 사용자의 전체 할일 개수: ${allSnapshot.docs.length}`)
        
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
              completedAt: safeToDate(data.completedAt)
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
      const todoRef = doc(db, `users/${uid}/todos`, todoId)
      const todoSnapshot = await getDoc(todoRef)
      
      if (!todoSnapshot.exists()) {
        throw new Error('할일을 찾을 수 없습니다.')
      }
      
      const todoData = todoSnapshot.data()
      const currentSubTasks = todoData.subTasks || []
      
      const updatedSubTasks = currentSubTasks.map((subTask: SubTask) =>
        subTask.id === subTaskId
          ? { ...subTask, ...updates, updatedAt: new Date() }
          : subTask
      )
      
      await updateDoc(todoRef, {
        subTasks: updatedSubTasks,
        updatedAt: serverTimestamp()
      })
      
      console.log('Firestore updateSubTask 성공:', subTaskId)
    } catch (error) {
      console.error('Firestore updateSubTask 실패:', error)
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
    try {
      const templateRef = doc(db, `users/${uid}/recurringTemplates`, id)
      await deleteDoc(templateRef)
      console.log('Firestore deleteRecurringTemplate 성공:', id)
    } catch (error) {
      console.error('Firestore deleteRecurringTemplate 실패:', error)
      throw error
    }
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
      
      const snapshot = await getDocs(q)
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
      
      const unsubscribe = onSnapshot(q, (snapshot) => {
        console.log('🔔 Firestore 반복 인스턴스 구독 업데이트 수신')
        
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
  }
}