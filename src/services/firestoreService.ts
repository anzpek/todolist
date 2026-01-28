// Firebase Firestore 서비스
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
  setDoc,
  where,
  limit,
  deleteField,
  arrayRemove,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type { Todo, SubTask } from '../types/todo';
import { debug } from '../utils/debug';
import { handleFirestoreError, withRetry } from '../utils/errorHandling';
import { getHolidayInfoSync, isWeekend, getFirstWorkdayOfMonth, getLastWorkdayOfMonth, checkIsHoliday, type CustomHoliday } from '../utils/holidays';
import type { SimpleRecurringTemplate, RecurrenceException, ConflictException, SimpleRecurringInstance } from '../utils/simpleRecurring';
import type { SharedUser, TaskVisibility, SharePermission } from '../types/todo';

// #region Helper Functions
const safeToDate = (value: any): Date | undefined => {
  if (!value) return undefined;
  if (value instanceof Date) return value;
  if (typeof value?.toDate === 'function') return value.toDate();
  if (typeof value === 'string') return new Date(value);
  return undefined;
};

const removeUndefinedValues = (obj: any): any => {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) {
    return obj.map(removeUndefinedValues);
  }
  if (obj instanceof Date) {
    return obj;
  }
  if (typeof obj === 'object') {
    const cleaned: any = {};
    Object.keys(obj).forEach(key => {
      const value = obj[key];
      if (value !== undefined) {
        cleaned[key] = removeUndefinedValues(value);
      }
    });
    return cleaned;
  }
  return obj;
};

const _checkDateConflict = (date1: Date, date2: Date, scope: 'same_date' | 'same_week' | 'same_month'): boolean => {
  switch (scope) {
    case 'same_date':
      return date1.toDateString() === date2.toDateString();
    case 'same_week':
      const startOfWeek1 = new Date(date1);
      startOfWeek1.setDate(date1.getDate() - date1.getDay());
      const startOfWeek2 = new Date(date2);
      startOfWeek2.setDate(date2.getDate() - date2.getDay());
      return startOfWeek1.toDateString() === startOfWeek2.toDateString();
    case 'same_month':
      return date1.getFullYear() === date2.getFullYear() && date1.getMonth() === date2.getMonth();
    default:
      return false;
  }
};

const _calculateWeekOfMonth = (date: Date): number => {
  const firstDayOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
  const firstDayOfWeek = firstDayOfMonth.getDay();
  const weekOfMonth = Math.ceil((date.getDate() + firstDayOfWeek) / 7);
  return weekOfMonth;
};

const _isLastOccurrenceOfWeekdayInMonth = (date: Date): boolean => {
  const year = date.getFullYear();
  const month = date.getMonth();
  const weekday = date.getDay();
  const lastDayOfMonth = new Date(year, month + 1, 0);
  for (let day = lastDayOfMonth.getDate(); day >= 1; day--) {
    const testDate = new Date(year, month, day);
    if (testDate.getDay() === weekday) {
      return date.getDate() === day;
    }
  }
  return false;
};

const _findNthWeekdayOfMonth = (year: number, month: number, weekPosition: 'first' | 'second' | 'third' | 'fourth' | 'last', weekday: number): Date | null => {
  const jsMonth = month - 1;
  if (weekPosition === 'last') {
    const lastDayOfMonth = new Date(year, jsMonth + 1, 0);
    for (let day = lastDayOfMonth.getDate(); day >= 1; day--) {
      const date = new Date(year, jsMonth, day);
      if (date.getDay() === weekday) return date;
    }
  } else {
    const weekNumbers = { 'first': 1, 'second': 2, 'third': 3, 'fourth': 4 };
    const targetWeek = weekNumbers[weekPosition];
    let weekCount = 0;
    const lastDayOfMonth = new Date(year, jsMonth + 1, 0).getDate();
    for (let day = 1; day <= lastDayOfMonth; day++) {
      const date = new Date(year, jsMonth, day);
      if (date.getDay() === weekday) {
        weekCount++;
        if (weekCount === targetWeek) return date;
      }
    }
  }
  return null;
};

const _adjustForHolidays = (date: Date, holidayHandling: 'before' | 'after' | 'show' = 'show', customHolidays: CustomHoliday[] = []): Date => {
  let adjustedDate = new Date(date);
  if (holidayHandling === 'show') return adjustedDate;

  const isHoliday = checkIsHoliday(adjustedDate, customHolidays);
  const isWeekendDay = isWeekend(adjustedDate);

  if (!isHoliday && !isWeekendDay) return adjustedDate;

  let attempts = 0;
  while (attempts < 15) {
    if (holidayHandling === 'before') {
      adjustedDate.setDate(adjustedDate.getDate() - 1);
    } else {
      adjustedDate.setDate(adjustedDate.getDate() + 1);
    }
    const currentIsHoliday = checkIsHoliday(adjustedDate, customHolidays);
    const currentIsWeekend = isWeekend(adjustedDate);
    if (!currentIsHoliday && !currentIsWeekend) break;
    attempts++;
  }
  return adjustedDate;
};
// #endregion

debug.info('FirestoreService: 실제 Firestore 서비스 활성화');

export const firestoreService = {
  // ... (기존의 다른 함수들은 여기에 그대로 위치)
  getTodos: async (uid: string): Promise<Todo[]> => {
    return withRetry(async () => {
      try {
        if (!uid) {
          throw new Error('User ID is required')
        }

        // 1. 개인 할 일 가져오기
        const todosRef = collection(db, `users/${uid}/todos`)
        const q = query(todosRef, orderBy('createdAt', 'desc'))
        const snapshot = await getDocs(q)

        const privateTodos = snapshot.docs.map(doc => {
          const data = doc.data()
          // 🔥 IMPORTANT: id: doc.id must come AFTER ...data to ensure Firestore ID takes precedence
          return {
            ...data,
            id: doc.id,
            createdAt: safeToDate(data.createdAt) || new Date(),
            updatedAt: safeToDate(data.updatedAt) || new Date(),
            dueDate: safeToDate(data.dueDate),
            startDate: safeToDate(data.startDate),
            completedAt: safeToDate(data.completedAt),
            subTasks: data.subTasks ? data.subTasks.map((subTask: any) => ({
              ...subTask,
              createdAt: safeToDate(subTask.createdAt) || new Date(),
              updatedAt: safeToDate(subTask.updatedAt) || new Date(),
              completedAt: subTask.completedAt ? safeToDate(subTask.completedAt) : null
            })) : [],
            myPermission: 'admin' // 내 개인 할 일은 관리자 권한
          }
        }) as Todo[]

        // 2. 공유된 할 일 가져오기 (두 개의 별도 쿼리로 분리)
        const sharedTodosRef = collection(db, 'shared_todos')

        // 쿼리 1: 내가 소유한 공유 할일
        const mySharedQuery = query(
          sharedTodosRef,
          where('ownerId', '==', uid)
        );

        // 쿼리 2: 나와 공유된 할일
        const sharedWithMeQuery = query(
          sharedTodosRef,
          where('sharedWithUids', 'array-contains', uid)
        );

        const [mySharedSnapshot, sharedWithMeSnapshot] = await Promise.all([
          getDocs(mySharedQuery),
          getDocs(sharedWithMeQuery)
        ]);

        const mapSharedDoc = (doc: any): Todo => {
          const data = doc.data();
          let myPermission: SharePermission = 'read';
          if (data.ownerId === uid) {
            myPermission = 'admin';
          } else if (data.sharedWith) {
            const me = data.sharedWith.find((u: SharedUser) => u.uid === uid);
            if (me) myPermission = me.permission;
          }
          // 🔥 IMPORTANT: id: doc.id must come AFTER ...data to ensure Firestore ID takes precedence
          return {
            ...data,
            id: doc.id,
            createdAt: safeToDate(data.createdAt) || new Date(),
            updatedAt: safeToDate(data.updatedAt) || new Date(),
            dueDate: safeToDate(data.dueDate),
            startDate: safeToDate(data.startDate),
            completedAt: safeToDate(data.completedAt),
            subTasks: data.subTasks ? data.subTasks.map((subTask: any) => ({
              ...subTask,
              createdAt: safeToDate(subTask.createdAt) || new Date(),
              updatedAt: safeToDate(subTask.updatedAt) || new Date(),
              completedAt: subTask.completedAt ? safeToDate(subTask.completedAt) : null
            })) : [],
            myPermission
          } as Todo;
        };

        // 중복 제거 및 병합
        const allSharedDocs = [...mySharedSnapshot.docs, ...sharedWithMeSnapshot.docs];
        const uniqueMap = new Map<string, Todo>();
        allSharedDocs.forEach(doc => {
          if (!uniqueMap.has(doc.id)) {
            uniqueMap.set(doc.id, mapSharedDoc(doc));
          }
        });
        const sharedTodos = Array.from(uniqueMap.values());

        debug.log('Firestore getTodos 성공:', { private: privateTodos.length, shared: sharedTodos.length, uid })

        // 두 목록 병합 (정렬은 클라이언트에서 다시 하거나 여기서 createdAt 기준 병합 정렬)
        // 간단히 병합 후 createdAt 역순 정렬
        const allTodos = [...privateTodos, ...sharedTodos].sort((a, b) => {
          const dateA = a.createdAt instanceof Date ? a.createdAt.getTime() : 0;
          const dateB = b.createdAt instanceof Date ? b.createdAt.getTime() : 0;
          return dateB - dateA;
        });

        return allTodos;
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

        const isShared = todo.visibility?.isShared || false;
        // 공유 할 일이면 shared_todos, 아니면 개인 todos에 저장
        const collectionPath = isShared ? 'shared_todos' : `users/${uid}/todos`;
        const todosRef = collection(db, collectionPath);

        console.log('📤 addTodo called:', {
          isShared,
          collectionPath,
          sharedWith: todo.sharedWith,
          sharedWithUids: todo.sharedWith?.map(u => u.uid) || [],
          sharedWithCount: todo.sharedWith?.length || 0,
          sharedGroupId: (todo as any).sharedGroupId,
          ownerId: uid
        });

        const cleanedTodo = removeUndefinedValues(todo)

        const sharedWithUids = todo.sharedWith ? todo.sharedWith.map(u => u.uid) : [];

        // editorUids 생성 (보안 규칙용: 편집 권한 있는 사용자)
        const editorUids = todo.sharedWith
          ? todo.sharedWith.filter(u => u.permission === 'edit' || u.permission === 'admin').map(u => u.uid)
          : [];

        // adminUids 생성 (보안 규칙용: 삭제 권한 있는 사용자)
        let adminUids = todo.sharedWith
          ? todo.sharedWith.filter(u => u.permission === 'admin').map(u => u.uid)
          : [];

        // 🔧 공유 그룹의 admin 멤버들도 adminUids에 포함 (삭제 권한 부여)
        const sharedGroupId = (todo as any).sharedGroupId;
        const sharedGroupOwnerId = (todo as any).sharedGroupOwnerId;
        if (isShared && sharedGroupId && sharedGroupOwnerId) {
          try {
            const groupRef = doc(db, `users/${sharedGroupOwnerId}/sharing_groups`, sharedGroupId);
            const groupSnap = await getDoc(groupRef);
            if (groupSnap.exists()) {
              const groupData = groupSnap.data();
              const groupAdminUids = (groupData.members || [])
                .filter((m: SharedUser) => m.permission === 'admin')
                .map((m: SharedUser) => m.uid);
              // 중복 없이 병합
              adminUids = [...new Set([...adminUids, ...groupAdminUids])];
              console.log('📋 공유 그룹 admin 포함:', groupAdminUids);
            }
          } catch (e) {
            console.warn('⚠️ 공유 그룹 admin 조회 실패:', e);
          }
        }

        // 소유자도 항상 admin으로 포함
        if (!adminUids.includes(uid)) {
          adminUids.push(uid);
        }

        const todoData = {
          ...cleanedTodo,
          ownerId: uid, // 소유자 설정
          sharedWithUids, // 공유된 사용자 UID 목록
          editorUids,     // 편집 가능 사용자 UID 목록
          adminUids,      // 관리(삭제) 권한 UID 목록
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        }

        const docRef = await addDoc(todosRef, todoData)
        debug.log(`Firestore addTodo 성공 (${isShared ? 'Shared' : 'Private'}):`, docRef.id)
        return docRef.id
      } catch (error) {
        debug.error('Firestore addTodo 실패:', error)
        throw handleFirestoreError(error, 'addTodo')
      }
    })
  },

  updateTodo: async (id: string, updates: Partial<Todo>, uid: string): Promise<void> => {
    let isPrivate = false;
    let isShared = false;
    try {
      // 1. 먼저 어느 컬렉션에 있는지 확인
      const privateRef = doc(db, `users/${uid}/todos`, id);
      const sharedRef = doc(db, 'shared_todos', id);      // 1. 개인 할일 확인
      debug.log(`Trying to read private todo: ${id} at ${privateRef.path}`);
      const privateSnap = await getDoc(privateRef);

      let sharedSnap: any; // 스코프 문제 해결을 위해 상위 선언

      if (privateSnap.exists()) {
        isPrivate = true;
        // 개인 할일로 확인되면 공유 할일 체크는 생략 (최적화 및 권한 오류 방지)
      } else {
        // 2. 공유 할일 확인 (개인 할일에 없을 때만)
        try {
          debug.log(`Trying to read shared todo: ${id} at ${sharedRef.path}`);
          sharedSnap = await getDoc(sharedRef);
          isShared = sharedSnap.exists();
        } catch (err: any) {
          // 공유 할일이 존재하지 않는데 읽으려 하면 권한 오류가 발생할 수 있음 (규칙상 resource.data 접근 시)
          if (err.code === 'permission-denied') {
            debug.warn(`Shared todo permission denied (treated as not found): ${id}`);
            isShared = false;
          } else {
            throw err;
          }
        }
      }

      if (!isPrivate && !isShared) {
        debug.warn(`할일 문서 ${id}가 존재하지 않거나 권한이 없습니다. 업데이트를 건너뜁니다.`);
        return;
      }

      const targetRef = isPrivate ? privateRef : sharedRef;
      const currentData = isPrivate ? privateSnap.data() : sharedSnap.data();

      // 2. 가시성 변경(Private <-> Shared) 체크
      // updates.visibility가 있고, 기존 상태와 다르다면 이동 필요
      const newVisibility = updates.visibility;
      const destinationIsShared = newVisibility?.isShared;

      // 이동이 필요한 경우:
      // A. 현재 Private인데 -> Shared로 변경됨
      // B. 현재 Shared인데 -> Shared가 아님(Private)으로 변경됨
      const needsMigration = (isPrivate && destinationIsShared === true) ||
        (isShared && destinationIsShared === false && newVisibility !== undefined);

      if (needsMigration) {
        const sourceRef = targetRef;
        const destRef = isPrivate ? doc(db, 'shared_todos', id) : doc(db, `users/${uid}/todos`, id); // ID 유지하면서 이동

        const sharedWithUids = updates.sharedWith ? updates.sharedWith.map(u => u.uid) : (currentData.sharedWith ? currentData.sharedWith.map((u: SharedUser) => u.uid) : []);

        const editorUids = updates.sharedWith
          ? updates.sharedWith.filter(u => u.permission === 'edit' || u.permission === 'admin').map(u => u.uid)
          : (currentData.sharedWith ? currentData.sharedWith.filter((u: SharedUser) => u.permission === 'edit' || u.permission === 'admin').map((u: SharedUser) => u.uid) : []);

        const newData = {
          ...currentData,
          ...updates,
          ownerId: currentData.ownerId || uid, // 기존 ownerId 유지하거나 없으면 현재 사용자
          sharedWithUids,
          editorUids,
          adminUids: updates.sharedWith
            ? updates.sharedWith.filter(u => u.permission === 'admin').map(u => u.uid)
            : (currentData.sharedWith ? currentData.sharedWith.filter((u: SharedUser) => u.permission === 'admin').map((u: SharedUser) => u.uid) : []),
          updatedAt: serverTimestamp()
        };

        const batch = writeBatch(db);
        batch.set(destRef, newData); // 새 위치에 생성
        batch.delete(sourceRef);     // 기존 위치 삭제
        await batch.commit();
        debug.log(`Todo migrated: ${isPrivate ? 'Private -> Shared' : 'Shared -> Private'}`);
      } else {
        // 컬렉션 변경 없음, 단순 업데이트
        const u = { ...updates };
        if (updates.sharedWith) {
          // sharedWith가 업데이트되면 sharedWithUids와 editorUids 갱신
          u['sharedWithUids'] = updates.sharedWith.map(user => user.uid);
          u['editorUids'] = updates.sharedWith.filter(user => user.permission === 'edit' || user.permission === 'admin').map(user => user.uid);
          u['adminUids'] = updates.sharedWith.filter(user => user.permission === 'admin').map(user => user.uid);
        }

        // 공유 할일인 경우 lastModifiedBy 추가
        const cleanedUpdates = removeUndefinedValues(u);
        const updateData: any = {
          ...cleanedUpdates,
          updatedAt: serverTimestamp()
        };
        if (isShared) {
          updateData.lastModifiedBy = uid;
        }

        await updateDoc(targetRef, updateData);
        debug.log(`Firestore updateTodo 성공 (${id})`);
      }

    } catch (error) {
      debug.error('Firestore updateTodo 실패:', {
        error,
        context: JSON.stringify({
          id,
          uid,
          targetPath: isPrivate ? `users/${uid}/todos/${id}` : `shared_todos/${id}`,
          isPrivate,
          isShared
        })
      });
      throw error
    }
  },

  deleteTodo: async (id: string, uid: string): Promise<void> => {
    try {
      console.log('🗑️ deleteTodo 시작:', { id, uid });

      // 어디 있는지 확인 후 삭제
      const privateRef = doc(db, `users/${uid}/todos`, id);
      const sharedRef = doc(db, 'shared_todos', id);

      let deletionCount = 0;

      // 1. 개인 할일 삭제 시도
      const privateSnap = await getDoc(privateRef);
      if (privateSnap.exists()) {
        await deleteDoc(privateRef);
        console.log('✅ 개인 할일 삭제 완료:', id);
        deletionCount++;
      }

      // 2. 공유 할일 삭제/나가기 시도
      const sharedSnap = await getDoc(sharedRef);
      if (sharedSnap.exists()) {
        const data = sharedSnap.data() as any;

        // 소유자 또는 관리자 확인
        let isAdmin = (data.adminUids || []).includes(uid);

        // 🔧 기존 할일에 adminUids가 없을 수 있으므로 그룹에서 직접 확인
        if (!isAdmin && data.sharedGroupId && data.sharedGroupOwnerId) {
          try {
            const groupRef = doc(db, `users/${data.sharedGroupOwnerId}/sharing_groups`, data.sharedGroupId);
            const groupSnap = await getDoc(groupRef);
            if (groupSnap.exists()) {
              const groupData = groupSnap.data();
              const groupAdmins = (groupData.members || []).filter((m: any) => m.permission === 'admin');
              isAdmin = groupAdmins.some((m: any) => m.uid === uid);

              // 관리자가 맞다면 adminUids 업데이트 (다음 삭제를 위해)
              if (isAdmin) {
                const updatedAdminUids = [...new Set([...(data.adminUids || []), uid])];
                await updateDoc(sharedRef, { adminUids: updatedAdminUids });
                console.log('📋 adminUids 업데이트됨:', updatedAdminUids);
              }
            }
          } catch (e) {
            console.warn('⚠️ 그룹 admin 확인 실패 (계속 진행):', e);
          }
        }

        if (data.ownerId === uid || isAdmin) {
          // 🔧 내 할일 + 공유할일 둘 다 체크된 경우 처리
          // 삭제하는 사람이 소유자가 아니고, 할일이 isPersonal:true인 경우
          // → 완전 삭제하지 않고 공유만 해제 (소유자에게는 계속 보임)
          const hasPersonalFlag = data.visibility?.isPersonal === true;
          const deletingByNonOwner = data.ownerId !== uid;

          if (hasPersonalFlag && deletingByNonOwner) {
            // 공유만 해제하고 소유자 전용으로 변경
            // (다른 유저의 컬렉션에 쓸 수 없으므로 shared_todos에서 업데이트)
            await updateDoc(sharedRef, {
              'visibility.isShared': false,
              sharedWith: [],
              sharedWithUids: [],
              editorUids: [],
              adminUids: [data.ownerId], // 소유자만 관리자로
              updatedAt: serverTimestamp()
            });

            console.log('✅ 공유 해제됨 - 소유자 전용으로 변경:', id);
          } else {
            // 소유자가 직접 삭제하거나 isPersonal이 false인 경우 → 완전 삭제
            await deleteDoc(sharedRef);
            console.log('✅ 공유 할일 영구 삭제 완료 (소유자/관리자):', id);
          }
        } else {
          // 비소유자라면 공유 목록에서 나가기 (자신을 제거)
          const newSharedWithUids = (data.sharedWithUids || []).filter((u: string) => u !== uid);
          const newSharedWith = (data.sharedWith || []).filter((u: any) => u.uid !== uid);
          const newEditorUids = (data.editorUids || []).filter((u: string) => u !== uid);
          const newAdminUids = (data.adminUids || []).filter((u: string) => u !== uid);

          // 만약 나 혼자만 남은 상태에서 나가는 거라면, 문서를 아예 삭제할지 고민
          // 하지만 소유자가 따로 있으므로 update만 함.

          await updateDoc(sharedRef, {
            sharedWithUids: newSharedWithUids,
            sharedWith: newSharedWith,
            editorUids: newEditorUids,
            adminUids: newAdminUids,
            updatedAt: serverTimestamp()
          });
          console.log('✅ 공유 할일 나가기 완료 (비소유자):', id);
        }
        deletionCount++;
      }

      // 3. 만약 아무곳에서도 발견되지 않았지만 호출되었다면?
      // 로컬 only 데이터였거나 이미 삭제된 것.
      if (deletionCount === 0) {
        console.warn('⚠️ 삭제할 할일을 Firestore에서 찾지 못함 (이미 삭제됨?):', id);
      }

    } catch (error: any) {
      console.error('❌ Firestore deleteTodo 실패:', error)
      throw error
    }
  },

  subscribeTodos: (uid: string, callback: (todos: Todo[]) => void) => {
    try {
      let privateTodos: Todo[] = [];
      let sharedTodos: Todo[] = [];
      let unsubscribeShared: () => void = () => { };

      const notifyUpdate = () => {
        // 간단히 병합 후 createdAt 역순 정렬
        const allTodos = [...privateTodos, ...sharedTodos].sort((a, b) => {
          const dateA = a.createdAt instanceof Date ? a.createdAt.getTime() : 0;
          const dateB = b.createdAt instanceof Date ? b.createdAt.getTime() : 0;
          return dateB - dateA;
        });
        callback(allTodos);
      };

      // 1. 개인 할 일 구독 최적화
      // 조건: (완료되지 않음) OR (완료되었지만 최근 30일 이내)
      const todosRef = collection(db, `users/${uid}/todos`);

      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      // 쿼리 1: 완료되지 않은 할 일 (Active)
      const qActive = query(todosRef, where('completed', '==', false));

      // 쿼리 2: 최근 완료된 할 일 (Recent History - 최근 7일)
      // "오늘"과 "어제" 뷰를 커버하기 위한 최소한의 데이터만 실시간 구독
      const qRecent = query(
        todosRef,
        where('completed', '==', true),
        where('completedAt', '>=', sevenDaysAgo)
      );

      let activeTodos: Todo[] = [];
      let recentTodos: Todo[] = [];

      const mergePrivateTodos = () => {
        const merged = [...activeTodos, ...recentTodos];
        const unique = new Map();
        merged.forEach(t => unique.set(t.id, t));
        privateTodos = Array.from(unique.values());
        notifyUpdate();
      };

      const mapDocToTodo = (doc: any): Todo => {
        const data = doc.data();
        // 🔥 IMPORTANT: id: doc.id must come AFTER ...data to ensure Firestore ID takes precedence
        return {
          ...data,
          id: doc.id,
          createdAt: safeToDate(data.createdAt) || new Date(),
          updatedAt: safeToDate(data.updatedAt) || new Date(),
          dueDate: safeToDate(data.dueDate),
          startDate: safeToDate(data.startDate),
          completedAt: safeToDate(data.completedAt),
          subTasks: data.subTasks ? data.subTasks.map((subTask: any) => ({
            ...subTask,
            createdAt: safeToDate(subTask.createdAt) || new Date(),
            updatedAt: safeToDate(subTask.updatedAt) || new Date(),
            completedAt: subTask.completedAt ? safeToDate(subTask.completedAt) : null
          })) : [],
          myPermission: 'admin'
        } as Todo;
      };

      const unsubActive = onSnapshot(qActive, (snapshot) => {
        activeTodos = snapshot.docs.map(mapDocToTodo);
        mergePrivateTodos();
      }, (error) => console.error('❌ Active Todos 구독 오류:', error));

      const unsubRecent = onSnapshot(qRecent, (snapshot) => {
        recentTodos = snapshot.docs.map(mapDocToTodo);
        mergePrivateTodos();
      }, (error) => console.error('❌ Recent Todos 구독 오류:', error));

      const unsubscribePrivate = () => {
        unsubActive();
        unsubRecent();
      };

      // 2. 공유된 할 일 구독 (공유는 양이 적으므로 일단 전체 유지하거나 추후 최적화)
      let mySharedTodos: Todo[] = [];
      let sharedWithMeTodos: Todo[] = [];
      let unsubscribeMyShared: () => void = () => { };
      let unsubscribeSharedWithMe: () => void = () => { };

      const mergeSharedTodos = () => {
        const allShared = [...mySharedTodos, ...sharedWithMeTodos];
        const uniqueMap = new Map<string, Todo>();
        allShared.forEach(todo => uniqueMap.set(todo.id, todo));
        sharedTodos = Array.from(uniqueMap.values());
        notifyUpdate();
      };

      const mapSharedTodoDoc = (doc: any): Todo => {
        const data = doc.data();
        let myPermission: SharePermission = 'read';
        if (data.ownerId === uid) {
          myPermission = 'admin';
        } else if (data.sharedWith) {
          const me = data.sharedWith.find((u: SharedUser) => u.uid === uid);
          if (me) myPermission = me.permission;
        }
        // 🔥 IMPORTANT: id: doc.id must come AFTER ...data to ensure Firestore ID takes precedence
        return {
          ...data,
          id: doc.id,
          createdAt: safeToDate(data.createdAt) || new Date(),
          updatedAt: safeToDate(data.updatedAt) || new Date(),
          dueDate: safeToDate(data.dueDate),
          startDate: safeToDate(data.startDate),
          completedAt: safeToDate(data.completedAt),
          subTasks: data.subTasks ? data.subTasks.map((subTask: any) => ({
            ...subTask,
            createdAt: safeToDate(subTask.createdAt) || new Date(),
            updatedAt: safeToDate(subTask.updatedAt) || new Date(),
            completedAt: subTask.completedAt ? safeToDate(subTask.completedAt) : null
          })) : [],
          myPermission
        } as Todo;
      };

      try {
        const sharedTodosRef = collection(db, 'shared_todos');

        const qMyShared = query(
          sharedTodosRef,
          where('ownerId', '==', uid)
        );

        unsubscribeMyShared = onSnapshot(qMyShared, (snapshot) => {

          mySharedTodos = snapshot.docs.map(mapSharedTodoDoc);
          mergeSharedTodos();
        }, (error) => {
          console.error('❌ 내 공유 할일 구독 오류:', error);
        });

        const qSharedWithMe = query(
          sharedTodosRef,
          where('sharedWithUids', 'array-contains', uid)
        );

        unsubscribeSharedWithMe = onSnapshot(qSharedWithMe, (snapshot) => {

          sharedWithMeTodos = snapshot.docs.map(mapSharedTodoDoc);
          mergeSharedTodos();
        }, (error) => {
          console.error('❌ 공유받은 할일 구독 오류:', error);
        });

        unsubscribeShared = () => {
          unsubscribeMyShared();
          unsubscribeSharedWithMe();
        };
      } catch (err) {
        console.error('❌ 공유 할일 쿼리 생성 실패:', err);
      }

      return () => {
        unsubscribePrivate();
        unsubscribeShared();
      }
    } catch (error) {
      console.error('❌ Firestore subscribeTodos 초기화 실패:', error)
      callback([])
      return () => { }
    }
  },

  // 특정 기간의 완료된 할 일 일회성 조회 (캐싱을 위해 사용)
  getCompletedTodos: async (uid: string, startDate: Date, endDate: Date): Promise<Todo[]> => {
    try {
      const todosRef = collection(db, `users/${uid}/todos`);

      // 날짜 경계 설정 (혹시 모를 시간차 문제 방지)
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);

      const q = query(
        todosRef,
        where('completed', '==', true),
        where('completedAt', '>=', start),
        where('completedAt', '<=', end)
      );

      const snapshot = await getDocs(q);

      return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          id: doc.id,
          createdAt: safeToDate(data.createdAt) || new Date(),
          updatedAt: safeToDate(data.updatedAt) || new Date(),
          dueDate: safeToDate(data.dueDate),
          startDate: safeToDate(data.startDate),
          completedAt: safeToDate(data.completedAt),
          subTasks: data.subTasks ? data.subTasks.map((subTask: any) => ({
            ...subTask,
            createdAt: safeToDate(subTask.createdAt) || new Date(),
            updatedAt: safeToDate(subTask.updatedAt) || new Date(),
            completedAt: subTask.completedAt ? safeToDate(subTask.completedAt) : null
          })) : [],
          myPermission: 'admin'
        } as Todo;
      });
    } catch (error) {
      console.error('❌ getCompletedTodos 실패:', error);
      return [];
    }
  },

  // 연도별 완료된 할 일 조회
  getCompletedTodosByYear: async (uid: string, year: number): Promise<Todo[]> => {
    return withRetry(async () => {
      try {
        const todosRef = collection(db, `users/${uid}/todos`);

        // 해당 연도의 시작과 끝
        const startOfYear = new Date(year, 0, 1, 0, 0, 0, 0);
        const endOfYear = new Date(year, 11, 31, 23, 59, 59, 999);

        const instancesRef = collection(db, `users/${uid}/recurringInstances`);

        // 1. 일반 할일 쿼리
        const qTodos = query(
          todosRef,
          where('completed', '==', true),
          where('completedAt', '>=', startOfYear),
          where('completedAt', '<=', endOfYear)
        );

        // 2. 반복 할일 인스턴스 쿼리
        const qInstances = query(
          instancesRef,
          where('completed', '==', true),
          where('completedAt', '>=', startOfYear),
          where('completedAt', '<=', endOfYear)
        );

        const [todosSnapshot, instancesSnapshot] = await Promise.all([
          getDocs(qTodos),
          getDocs(qInstances)
        ]);

        const todos = todosSnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            ...data,
            id: doc.id,
            createdAt: safeToDate(data.createdAt) || new Date(),
            updatedAt: safeToDate(data.updatedAt) || new Date(),
            dueDate: safeToDate(data.dueDate),
            startDate: safeToDate(data.startDate),
            completedAt: safeToDate(data.completedAt),
            subTasks: data.subTasks ? data.subTasks.map((subTask: any) => ({
              ...subTask,
              createdAt: safeToDate(subTask.createdAt) || new Date(),
              updatedAt: safeToDate(subTask.updatedAt) || new Date(),
              completedAt: subTask.completedAt ? safeToDate(subTask.completedAt) : null
            })) : [],
            myPermission: 'admin'
          } as Todo;
        });

        const instances = instancesSnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            ...data,
            id: doc.id,
            title: data.title || '반복 할일',
            completed: true,
            completedAt: safeToDate(data.completedAt),
            _isRecurringInstance: true,
            _templateId: data.templateId,
            createdAt: safeToDate(data.createdAt) || new Date(),
            updatedAt: safeToDate(data.updatedAt) || new Date(),
            priority: 'medium',
            type: 'simple',
            recurrence: 'none',
          } as unknown as Todo;
        });

        const allCompleted = [...todos, ...instances].sort((a, b) => {
          return (b.completedAt?.getTime() || 0) - (a.completedAt?.getTime() || 0);
        });

        debug.log(`Firestore getCompletedTodosByYear(${year}) 성공: ${allCompleted.length}개 (일반: ${todos.length}, 반복: ${instances.length})`);
        return allCompleted;

      } catch (error) {
        debug.error(`Firestore getCompletedTodosByYear(${year}) 실패:`, error);
        throw handleFirestoreError(error, 'getCompletedTodosByYear');
      }
    });
  },

  // 서브태스크 관련
  addSubTask: async (subTask: SubTask, uid: string, todoId: string): Promise<void> => {
    const todoRef = doc(db, `users/${uid}/todos`, todoId)
    await updateDoc(todoRef, {
      subTasks: arrayUnion(subTask),
      updatedAt: serverTimestamp()
    })
  },

  updateSubTask: async (subTaskId: string, updates: Partial<SubTask>, uid: string, todoId: string): Promise<void> => {
    const todoRef = doc(db, `users/${uid}/todos`, todoId)
    const todoSnapshot = await getDoc(todoRef)
    if (!todoSnapshot.exists()) throw new Error('할일을 찾을 수 없습니다.')

    const todoData = todoSnapshot.data()
    const currentSubTasks = todoData.subTasks || []

    const updatedSubTasks = currentSubTasks.map((subTask: SubTask) =>
      subTask.id === subTaskId ? { ...subTask, ...updates, updatedAt: new Date() } : subTask
    )

    await updateDoc(todoRef, {
      subTasks: updatedSubTasks,
      updatedAt: serverTimestamp()
    })
  },

  deleteSubTask: async (subTaskId: string, uid: string, todoId: string): Promise<void> => {
    const todoRef = doc(db, `users/${uid}/todos`, todoId)
    const todoSnapshot = await getDoc(todoRef)
    if (!todoSnapshot.exists()) throw new Error('할일을 찾을 수 없습니다.')

    const todoData = todoSnapshot.data()
    const currentSubTasks = todoData.subTasks || []

    const filteredSubTasks = currentSubTasks.filter((subTask: SubTask) => subTask.id !== subTaskId)

    await updateDoc(todoRef, {
      subTasks: filteredSubTasks,
      updatedAt: serverTimestamp()
    })
  },

  // 반복 템플릿 관련
  getRecurringTemplates: async (uid: string): Promise<any[]> => {
    const templatesRef = collection(db, `users/${uid}/recurringTemplates`)
    const q = query(templatesRef, orderBy('createdAt', 'desc'))
    const snapshot = await getDocs(q)
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate() || new Date()
    }))
  },

  addRecurringTemplate: async (template: any, uid: string): Promise<string> => {
    const templatesRef = collection(db, `users/${uid}/recurringTemplates`)
    const cleanTemplate = removeUndefinedValues(template)
    const templateData = {
      ...cleanTemplate,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }
    const docRef = await addDoc(templatesRef, templateData)
    return docRef.id
  },

  updateRecurringTemplate: async (id: string, updates: any, uid: string): Promise<void> => {
    const templateRef = doc(db, `users/${uid}/recurringTemplates`, id)
    const cleanUpdates = removeUndefinedValues(updates)
    await updateDoc(templateRef, { ...cleanUpdates, updatedAt: serverTimestamp() })
  },

  deleteRecurringTemplate: async (id: string, uid: string): Promise<void> => {
    console.log('🔥 firestoreService.deleteRecurringTemplate 시작:', { id, uid })

    // 1. 템플릿 삭제
    const templateRef = doc(db, `users/${uid}/recurringTemplates`, id)
    await deleteDoc(templateRef) // 템플릿 먼저 즉시 삭제
    console.log('🔥 템플릿 문서 삭제 완료')

    // 2. 관련 인스턴스 조회
    const instancesRef = collection(db, `users/${uid}/recurringInstances`)
    const q = query(instancesRef, where('templateId', '==', id))
    const snapshot = await getDocs(q)
    console.log('🔥 삭제할 인스턴스 수:', snapshot.docs.length)

    // 3. 500개 제한을 피하기 위한 배치 분할 처리 (안전을 위해 400개씩)
    const BATCH_SIZE = 400
    const chunks = []

    for (let i = 0; i < snapshot.docs.length; i += BATCH_SIZE) {
      chunks.push(snapshot.docs.slice(i, i + BATCH_SIZE))
    }

    console.log(`🔥 총 ${chunks.length}개의 배치로 나누어 삭제 시작`)

    let deletedCount = 0
    for (const [index, chunk] of chunks.entries()) {
      const batch = writeBatch(db)
      chunk.forEach(doc => batch.delete(doc.ref))
      await batch.commit()
      deletedCount += chunk.length
      console.log(`🔥 배치 ${index + 1}/${chunks.length} 완료 (${deletedCount}/${snapshot.docs.length})`)
    }

    console.log('🔥✅ 모든 인스턴스 삭제 완료!')
  },

  subscribeProjectTemplates: (uid: string, callback: (templates: any[]) => void) => {
    try {
      const templatesRef = collection(db, `users/${uid}/projectTemplates`);
      const q = query(templatesRef, orderBy('createdAt', 'desc'));

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const templates = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            createdAt: safeToDate(data.createdAt) || new Date(),
            updatedAt: safeToDate(data.updatedAt) || new Date()
          };
        });

        callback(templates);
      }, (error) => {
        console.error('프로젝트 템플릿 구독 오류:', error);
        callback([]);
      });

      return unsubscribe;
    } catch (error) {
      console.error('프로젝트 템플릿 구독 초기화 실패:', error);
      callback([]);
      return () => { };
    }
  },

  addProjectTemplate: async (template: any, uid: string): Promise<string> => {
    const templatesRef = collection(db, `users/${uid}/projectTemplates`);
    const cleanTemplate = removeUndefinedValues(template);
    const templateData = {
      ...cleanTemplate,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    const docRef = await addDoc(templatesRef, templateData);
    return docRef.id;
  },

  updateProjectTemplate: async (id: string, updates: any, uid: string): Promise<void> => {
    const templateRef = doc(db, `users/${uid}/projectTemplates`, id);
    const cleanUpdates = removeUndefinedValues(updates);
    await updateDoc(templateRef, { ...cleanUpdates, updatedAt: serverTimestamp() });
  },

  deleteProjectTemplate: async (id: string, uid: string): Promise<void> => {
    const templateRef = doc(db, `users/${uid}/projectTemplates`, id);
    await deleteDoc(templateRef);
  },

  subscribeRecurringTemplates: (uid: string, callback: (templates: any[]) => void) => {
    const templatesRef = collection(db, `users/${uid}/recurringTemplates`)
    const q = query(templatesRef, orderBy('createdAt', 'desc'))
    return onSnapshot(q, (snapshot) => {
      const templates = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: safeToDate(doc.data().createdAt) || new Date(),
        updatedAt: safeToDate(doc.data().updatedAt) || new Date()
      }))
      callback(templates)
    })
  },

  // 반복 인스턴스 관련
  getRecurringInstances: async (uid: string): Promise<any[]> => {
    const instancesRef = collection(db, `users/${uid}/recurringInstances`)
    const q = query(instancesRef, orderBy('date', 'asc'))
    const snapshot = await getDocs(q)
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      date: safeToDate(doc.data().date) || new Date(),
      createdAt: safeToDate(doc.data().createdAt) || new Date(),
      updatedAt: safeToDate(doc.data().updatedAt) || new Date(),
      completedAt: safeToDate(doc.data().completedAt)
    }))
  },

  addRecurringInstance: async (instance: any, uid: string): Promise<string> => {
    const instancesRef = collection(db, `users/${uid}/recurringInstances`)
    const cleanInstance = removeUndefinedValues(instance)
    const docRef = await addDoc(instancesRef, { ...cleanInstance, createdAt: serverTimestamp(), updatedAt: serverTimestamp() })
    return docRef.id
  },

  updateRecurringInstance: async (id: string, updates: any, uid: string): Promise<void> => {
    const instanceRef = doc(db, `users/${uid}/recurringInstances`, id)
    const cleanUpdates = removeUndefinedValues(updates)
    await updateDoc(instanceRef, { ...cleanUpdates, updatedAt: serverTimestamp() })
  },

  deleteRecurringInstance: async (id: string, uid: string): Promise<void> => {
    const instanceRef = doc(db, `users/${uid}/recurringInstances`, id)
    await deleteDoc(instanceRef)
  },

  subscribeRecurringInstances: (uid: string, callback: (instances: any[]) => void) => {
    const instancesRef = collection(db, `users/${uid}/recurringInstances`)

    // 최적화: 완료되지 않은 것과 최근 30일 이내 완료된 것만 구독
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // 1. 미완료 (Active) - 날짜순 정렬
    const qActive = query(instancesRef, where('completed', '==', false), orderBy('date', 'asc'));

    // 2. 최근 완료 (Recent History) - 날짜순 정렬
    const qRecent = query(
      instancesRef,
      where('completed', '==', true),
      where('date', '>=', thirtyDaysAgo),
      orderBy('date', 'asc')
    );

    let activeInstances: any[] = [];
    let recentInstances: any[] = [];

    const notifyUpdate = () => {
      const merged = [...activeInstances, ...recentInstances];
      // 통합 날짜순 정렬
      merged.sort((a, b) => {
        const dateA = a.date instanceof Date ? a.date.getTime() : 0;
        const dateB = b.date instanceof Date ? b.date.getTime() : 0;
        return dateA - dateB;
      });
      callback(merged);
    };

    const mapDoc = (doc: any) => ({
      id: doc.id,
      ...doc.data(),
      date: safeToDate(doc.data().date) || new Date(),
      createdAt: safeToDate(doc.data().createdAt) || new Date(),
      updatedAt: safeToDate(doc.data().updatedAt) || new Date(),
      completedAt: safeToDate(doc.data().completedAt)
    });

    // Active 구독
    const unsubActive = onSnapshot(qActive, (snapshot) => {
      activeInstances = snapshot.docs.map(mapDoc);
      notifyUpdate();
    }, (error) => console.error('❌ 반복 인스턴스(Active) 구독 오류:', error));

    // Recent 구독
    const unsubRecent = onSnapshot(qRecent, (snapshot) => {
      recentInstances = snapshot.docs.map(mapDoc);
      notifyUpdate();
    }, (error) => console.error('❌ 반복 인스턴스(Recent) 구독 오류:', error));

    return () => {
      unsubActive();
      unsubRecent();
    };
  },

  async _isExceptionDate(date: Date, template: SimpleRecurringTemplate, uid: string, isRecursiveCall: boolean): Promise<boolean> {
    if (isRecursiveCall || !template.exceptions) {
      return false;
    }

    for (const exception of template.exceptions) {
      switch (exception.type) {
        case 'date':
          if ((exception.values as number[]).includes(date.getDate())) {
            return true;
          }
          break;
        case 'weekday':
          if ((exception.values as number[]).includes(date.getDay())) {
            return true;
          }
          break;
        case 'week':
          const weekOfMonth = _calculateWeekOfMonth(date);
          if ((exception.values as number[]).includes(weekOfMonth)) {
            return true;
          }
          if ((exception.values as number[]).includes(-1) && _isLastOccurrenceOfWeekdayInMonth(date)) {
            return true;
          }
          break;
        case 'month':
          if ((exception.values as number[]).includes(date.getMonth() + 1)) {
            return true;
          }
          break;
        case 'conflict':
          const conflictExceptions = exception.values as ConflictException[];
          for (const conflict of conflictExceptions) {
            const hasConflict = await this._hasConflictingInstance(date, template.id, conflict, uid);
            if (hasConflict) {
              console.log(`[Conflict] ${date.toDateString()} on ${template.title} conflicts with ${conflict.targetTemplateTitle}`);
              return true;
            }
          }
          break;
      }
    }
    return false;
  },

  async _hasConflictingInstance(date: Date, currentTemplateId: string, conflictException: ConflictException, uid: string): Promise<boolean> {
    const templatesRef = collection(db, `users/${uid}/recurringTemplates`);
    const q = query(templatesRef, where("title", "==", conflictException.targetTemplateTitle));
    const querySnapshot = await getDocs(q);

    const targetTemplateDoc = querySnapshot.docs.find(doc => doc.id !== currentTemplateId);
    if (!targetTemplateDoc) return false;

    const targetTemplate = { id: targetTemplateDoc.id, ...targetTemplateDoc.data() } as SimpleRecurringTemplate;
    const targetInstances = await this.generateInstancesForTemplate(targetTemplate, uid, true, []);

    for (const instance of targetInstances) {
      if (_checkDateConflict(date, instance.date, conflictException.scope)) {
        debug.log(`[Conflict] ${date.toDateString()} on ${currentTemplateId} conflicts with ${targetTemplate.title}`);
        return true;
      }
    }
    return false;
  },

  async generateInstancesForTemplate(template: SimpleRecurringTemplate, uid: string, isRecursiveCall = false, customHolidays: CustomHoliday[] = []): Promise<SimpleRecurringInstance[]> {
    if (!template.isActive) return [];

    const instances: SimpleRecurringInstance[] = [];
    const createdDates = new Set<string>();
    const now = new Date();
    const endDate = new Date(now);
    endDate.setFullYear(now.getFullYear() + 1); // 1년 후까지 생성
    let currentDate = new Date(now.getFullYear(), now.getMonth(), 1);

    while (currentDate <= endDate) {
      let potentialDate: Date | null = null;

      if (template.recurrenceType === 'daily') {
        potentialDate = new Date(currentDate);
      } else if (template.recurrenceType === 'weekly') {
        if (currentDate.getDay() === template.weekday) {
          potentialDate = new Date(currentDate);
        }
      } else if (template.recurrenceType === 'monthly') {
        let dateInMonth: Date | null = null;
        if (template.monthlyPattern === 'weekday' && template.monthlyWeek && template.monthlyWeekday !== undefined) {
          dateInMonth = _findNthWeekdayOfMonth(currentDate.getFullYear(), currentDate.getMonth() + 1, template.monthlyWeek, template.monthlyWeekday);
        } else {
          const day = template.monthlyDate;
          if (day === -1) {
            dateInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
          } else if (day === -2) {
            dateInMonth = getFirstWorkdayOfMonth(currentDate.getFullYear(), currentDate.getMonth() + 1);
          } else if (day === -3) {
            dateInMonth = getLastWorkdayOfMonth(currentDate.getFullYear(), currentDate.getMonth() + 1);
          } else if (day && day > 0) {
            const tempDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
            if (tempDate.getMonth() === currentDate.getMonth()) {
              dateInMonth = tempDate;
            }
          }
        }
        if (dateInMonth && dateInMonth.getFullYear() === currentDate.getFullYear() && dateInMonth.getMonth() === currentDate.getMonth()) {
          potentialDate = dateInMonth;
        }
      }

      if (potentialDate && potentialDate >= new Date(new Date().setHours(0, 0, 0, 0))) {
        let finalDate = _adjustForHolidays(potentialDate, template.holidayHandling, customHolidays);
        const isException = await this._isExceptionDate(finalDate, template, uid, isRecursiveCall);

        if (!isException) {
          const dateStr = `${finalDate.getFullYear()}-${(finalDate.getMonth() + 1).toString().padStart(2, '0')}-${finalDate.getDate().toString().padStart(2, '0')}`;
          if (!createdDates.has(dateStr)) {
            instances.push({
              id: `${template.id}_${dateStr}`,
              templateId: template.id,
              date: finalDate,
              completed: false,
              createdAt: new Date(),
              updatedAt: new Date(),
            });
            createdDates.add(dateStr);
          }
        }
      }

      if (template.recurrenceType === 'monthly') {
        currentDate.setMonth(currentDate.getMonth() + 1);
        currentDate.setDate(1);
      } else {
        currentDate.setDate(currentDate.getDate() + 1);
      }
    }
    return instances;
  },

  // Helper to copy a collection from one UID to another
  async _copyCollection(oldUid: string, newUid: string, collectionName: string): Promise<void> {
    const oldCollectionRef = collection(db, `users/${oldUid}/${collectionName}`);
    const newCollectionRef = collection(db, `users/${newUid}/${collectionName}`);
    const snapshot = await getDocs(oldCollectionRef);
    const batch = writeBatch(db);

    snapshot.forEach(docSnapshot => {
      const docData = docSnapshot.data();
      // Use setDoc with the original ID to preserve it
      batch.set(doc(newCollectionRef, docSnapshot.id), {
        ...docData,
        // Ensure server timestamps are updated for the new user
        createdAt: docData.createdAt || serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    });
    await batch.commit();
    debug.log(`Collection '${collectionName}' migrated from ${oldUid} to ${newUid}`);
  },

  // Helper to delete a collection
  async _deleteCollection(uid: string, collectionName: string): Promise<void> {
    const collectionRef = collection(db, `users/${uid}/${collectionName}`);
    const snapshot = await getDocs(collectionRef);
    const batch = writeBatch(db);
    snapshot.forEach(docSnapshot => {
      batch.delete(docSnapshot.ref);
    });
    await batch.commit();
    debug.log(`Collection '${collectionName}' deleted for ${uid}`);
  },

  // Admin function to migrate user data
  migrateUserData: async (oldUid: string, newUid: string): Promise<void> => {
    return withRetry(async () => {
      try {
        if (!oldUid || !newUid) {
          throw new Error('Old UID and New UID are required for migration.');
        }
        if (oldUid === newUid) {
          throw new Error('Cannot migrate data to the same UID.');
        }

        debug.log(`Starting data migration from old UID: ${oldUid} to new UID: ${newUid}`);

        // 1. Copy todos
        await firestoreService._copyCollection(oldUid, newUid, 'todos');
        // 2. Copy recurringTemplates
        await firestoreService._copyCollection(oldUid, newUid, 'recurringTemplates');
        // 3. Copy recurringInstances
        await firestoreService._copyCollection(oldUid, newUid, 'recurringInstances');
        // 4. Copy projectTemplates (if any)
        await firestoreService._copyCollection(oldUid, newUid, 'projectTemplates');

        // 5. Delete old data (optional, but good for cleanup)
        debug.log(`Deleting old data for UID: ${oldUid}`);
        await firestoreService._deleteCollection(oldUid, 'todos');
        await firestoreService._deleteCollection(oldUid, 'recurringTemplates');
        await firestoreService._deleteCollection(oldUid, 'recurringInstances');
        await firestoreService._deleteCollection(oldUid, 'projectTemplates');


        debug.log(`User data migrated from ${oldUid} to ${newUid}`);
      } catch (error) {
        debug.error('Migration failed:', error);
        throw handleFirestoreError(error, 'migrateUserData');
      }
    });
  },

  // ===== 공유 초대 로직 =====

  // 1. 초대 발송
  sendSharingInvitation: async (fromUser: SharedUser, toEmail: string, groupId: string, groupName: string, permission: SharePermission, shareName?: string): Promise<string> => {
    return withRetry(async () => {
      try {
        debug.log('sendSharingInvitation: Sending invitation', { fromUser: fromUser.email, toEmail, groupId, groupName });

        const invitationsRef = collection(db, 'sharing_requests')

        // 이미 대기중인 동일한 초대가 있는지 확인
        const q = query(
          invitationsRef,
          where('fromUid', '==', fromUser.uid),
          where('toEmail', '==', toEmail),
          where('groupId', '==', groupId),
          where('status', '==', 'pending')
        );
        const snapshot = await getDocs(q);

        if (!snapshot.empty) {
          debug.log('sendSharingInvitation: Already invited');
          throw new Error('Already invited this user to this group.');
        }

        const requestData = {
          fromUid: fromUser.uid,
          fromEmail: fromUser.email,
          toEmail: toEmail,
          groupId: groupId,
          groupName: groupName,
          // 하위 호환성을 위해 todoId, todoTitle도 유지
          todoId: groupId,
          todoTitle: groupName,
          shareName: shareName || '',
          permission: permission,
          status: 'pending',
          createdAt: serverTimestamp()
        };

        debug.log('sendSharingInvitation: Creating request with data', requestData);
        const docRef = await addDoc(invitationsRef, requestData);
        debug.log('sendSharingInvitation: Invitation sent successfully:', docRef.id);
        return docRef.id;
      } catch (error) {
        debug.error('sendSharingInvitation: Failed to send invitation:', error);
        throw handleFirestoreError(error, 'sendSharingInvitation');
      }
    });
  },

  // 2. 받은 초대 실시간 구독
  subscribeToIncomingInvitations: (userEmail: string, callback: (requests: any[]) => void) => {
    try {
      debug.log('subscribeToIncomingInvitations: Subscribing for email:', userEmail);

      const invitationsRef = collection(db, 'sharing_requests');
      const q = query(
        invitationsRef,
        where('toEmail', '==', userEmail),
        where('status', '==', 'pending'),
        orderBy('createdAt', 'desc')
      );

      return onSnapshot(q, (snapshot) => {
        const requests = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: safeToDate(doc.data().createdAt) || new Date()
        }));
        debug.log('subscribeToIncomingInvitations: Received requests: ' + requests.length);
        callback(requests);
      }, (error) => {
        debug.error('subscribeToIncomingInvitations: Subscription error:', error);
        callback([]);
      });
    } catch (error) {
      debug.error('subscribeToIncomingInvitations: Failed to subscribe:', error);
      callback([]);
      return () => { };
    }
  },

  // 2.1 보낸 초대 실시간 구독 (내가 보낸 요청들 상태 확인용)
  subscribeToSentInvitations: (uid: string, callback: (requests: any[]) => void) => {
    try {
      const invitationsRef = collection(db, 'sharing_requests');
      const q = query(
        invitationsRef,
        where('fromUid', '==', uid),
        orderBy('createdAt', 'desc')
      );

      return onSnapshot(q, (snapshot) => {
        const requests = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: safeToDate(doc.data().createdAt) || new Date()
        }));
        callback(requests);
      }, (error) => {
        debug.error('Sent invitation subscription error:', error);
        callback([]);
      });
    } catch (error) {
      debug.error('Failed to subscribe sent invitations:', error);
      callback([]);
      return () => { };
    }
  },

  // 3. 초대 응답 (수락/거절)
  respondToInvitation: async (requestId: string, response: 'accepted' | 'rejected', currentUser: SharedUser): Promise<void> => {
    try {
      console.log('📩 respondToInvitation called:', { requestId, response, currentUser: currentUser.email });

      const requestRef = doc(db, 'sharing_requests', requestId);
      const requestSnap = await getDoc(requestRef);

      if (!requestSnap.exists()) {
        console.error('❌ Invitation not found:', requestId);
        throw new Error('Invitation not found');
      }

      const requestData = requestSnap.data();
      console.log('📄 Request data:', requestData);

      if (requestData.toEmail.toLowerCase() !== currentUser.email.toLowerCase()) {
        console.error('❌ Not authorized:', requestData.toEmail, '!==', currentUser.email);
        throw new Error('Not authorized to respond to this invitation');
      }

      // 상태 업데이트
      await updateDoc(requestRef, {
        status: response,
        respondedAt: serverTimestamp()
      });
      console.log('✅ Request status updated to:', response);

      // 수락인 경우, 그룹에 멤버 추가 + 내 계정에도 참조 그룹 저장
      if (response === 'accepted') {
        const groupId = requestData.groupId || requestData.todoId; // 하위 호환성
        const groupOwnerId = requestData.fromUid;

        console.log('👥 Adding user to group:', { groupId, groupOwnerId });

        // 1. 그룹 소유자의 sharing_groups에서 해당 그룹 찾기
        const groupRef = doc(db, `users/${groupOwnerId}/sharing_groups`, groupId);
        const groupSnap = await getDoc(groupRef);

        if (groupSnap.exists()) {
          const groupData = groupSnap.data();
          const currentMembers = groupData.members || [];

          // 이미 멤버가 아닌 경우에만 추가
          if (!currentMembers.some((m: SharedUser) => m.uid === currentUser.uid)) {
            const newMember: SharedUser = {
              uid: currentUser.uid,
              email: currentUser.email,
              displayName: currentUser.displayName || '',
              permission: requestData.permission || 'edit'
            };

            await updateDoc(groupRef, {
              members: [...currentMembers, newMember],
              updatedAt: serverTimestamp()
            });
            console.log('✅ Member added to owner group:', currentUser.email);
          } else {
            console.log('ℹ️ User already in group');
          }

          // 2. 내 계정에도 참조 그룹 저장 (내 공유 설정에서 보이도록)
          const myGroupRef = doc(db, `users/${currentUser.uid}/sharing_groups`, `ref_${groupId}`);
          await setDoc(myGroupRef, {
            name: groupData.name,
            isReference: true, // 내가 만든 그룹이 아닌 참조 그룹임을 표시
            originalGroupId: groupId,
            originalOwnerId: groupOwnerId,
            originalOwnerEmail: requestData.fromEmail,
            members: [...currentMembers, {
              uid: currentUser.uid,
              email: currentUser.email,
              displayName: currentUser.displayName || '',
              permission: requestData.permission || 'edit'
            }],
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
          console.log('✅ Reference group created in my account');
        } else {
          console.error('❌ Group not found:', groupId);
        }
      }

    } catch (error) {
      console.error('❌ Failed to respond invitation:', error);
      throw error;
    }
  },

  regenerateRecurringInstances: async (templateId: string, uid: string): Promise<void> => {
    return withRetry(async () => {
      try {
        if (!uid || !templateId) throw new Error('User ID and template ID are required');
        debug.log('지능형 반복 인스턴스 재생성 시작', { templateId, uid });

        const instancesRef = collection(db, `users/${uid}/recurringInstances`);
        const templateRef = doc(db, `users/${uid}/recurringTemplates`, templateId);

        // 1. 기존 인스턴스 상태 보존
        const existingQuery = query(instancesRef, where('templateId', '==', templateId));
        const existingSnapshot = await getDocs(existingQuery);
        const existingInstancesMap = new Map<string, any>();
        existingSnapshot.forEach(doc => {
          existingInstancesMap.set(doc.id, doc.data());
        });
        debug.log('기존 인스턴스 상태 보존 완료', { count: existingInstancesMap.size });

        // 2. 템플릿 정보로 새 인스턴스 생성
        const templateDoc = await getDoc(templateRef);
        if (!templateDoc.exists()) throw new Error(`Template ${templateId} not found`);
        const template = { id: templateDoc.id, ...templateDoc.data() } as SimpleRecurringTemplate;

        // 2.5 커스텀 공휴일 가져오기
        const customHolidaysRef = collection(db, `users/${uid}/custom_holidays`);
        const customHolidaysSnapshot = await getDocs(customHolidaysRef);
        const customHolidays = customHolidaysSnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            date: data.date,
            name: data.name,
            isRecurring: data.isRecurring,
            createdAt: data.createdAt
          } as CustomHoliday;
        });

        const newGeneratedInstances = await firestoreService.generateInstancesForTemplate(template, uid, false, customHolidays);
        debug.log('새 인스턴스 생성 완료', { count: newGeneratedInstances.length });

        const batch = writeBatch(db);
        const newInstanceIds = new Set<string>();

        // 3. 새 인스턴스 추가 또는 기존 인스턴스 업데이트
        newGeneratedInstances.forEach((newInstance) => {
          const instanceRef = doc(instancesRef, newInstance.id);
          const existingInstance = existingInstancesMap.get(newInstance.id);

          if (existingInstance) {
            // 기존 인스턴스가 있으면 업데이트 (완료 상태 보존)
            newInstanceIds.add(newInstance.id);
            batch.update(instanceRef, {
              ...newInstance,
              completed: existingInstance.completed || false,
              completedAt: existingInstance.completedAt || null,
              skipped: existingInstance.skipped || false,
              skippedReason: existingInstance.skippedReason || null,
              updatedAt: serverTimestamp(),
            });
          } else {
            // 새로운 인스턴스인 경우
            newInstanceIds.add(newInstance.id);
            batch.set(instanceRef, {
              ...newInstance,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
          }
        });

        // 4. 더 이상 유효하지 않은 기존 인스턴스 삭제 (단, 미완료 인스턴스는 절대 삭제하지 않음)
        existingInstancesMap.forEach((data, id) => {
          if (!newInstanceIds.has(id)) {
            // 🔥 수정: 미완료여도 미래의 인스턴스라면 삭제 (템플릿 변경 반영)
            const instanceDate = safeToDate(data.date);
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            if (data.completed || (instanceDate && instanceDate >= today)) {
              batch.delete(doc(instancesRef, id));
              debug.log('유효하지 않은 인스턴스 삭제 (완료됨 또는 미래)', { id });
            } else {
              debug.log('유효하지 않지만 과거의 미완료된 인스턴스 보존', { id });
            }
          }
        });

        await batch.commit();
        debug.log('지능형 반복 인스턴스 재생성 성공', { templateId });

      } catch (error) {
        debug.error('지능형 반복 인스턴스 재생성 실패:', error);
        throw handleFirestoreError(error, 'regenerateRecurringInstances');
      }
    });
  },

  // User Settings
  getUserSettings: async (uid: string): Promise<any> => {
    return withRetry(async () => {
      try {
        const userRef = doc(db, 'users', uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          return userSnap.data();
        }
        return null;
      } catch (error) {
        debug.error('Firestore getUserSettings 실패:', error);
        throw error;
      }
    });
  },

  updateUserLanguage: async (uid: string, language: string): Promise<void> => {
    return withRetry(async () => {
      try {
        const userRef = doc(db, 'users', uid);
        await setDoc(userRef, { language, updatedAt: serverTimestamp() }, { merge: true });
        debug.log(`User ${uid} language updated to ${language}`);
      } catch (error) {
        debug.error('Firestore updateUserLanguage 실패:', error);
        throw error;
      }
    });
  },

  updateGoogleTasksSettings: async (uid: string, settings: { linked?: boolean; autoSync?: boolean }): Promise<void> => {
    return withRetry(async () => {
      try {
        const userRef = doc(db, 'users', uid);
        const updateData: any = { updatedAt: serverTimestamp() };
        if (settings.linked !== undefined) updateData.googleTasksLinked = settings.linked;
        if (settings.autoSync !== undefined) updateData.autoSyncGoogleTasks = settings.autoSync;

        await setDoc(userRef, updateData, { merge: true });
        debug.log(`User ${uid} Google Tasks settings updated:`, settings);
      } catch (error) {
        debug.error('Firestore updateGoogleTasksSettings 실패:', error);
        throw error;
      }
    });
  },

  // User Management
  checkAndCreateUser: async (user: { uid: string, email: string | null, displayName: string | null }): Promise<void> => {
    if (!user.uid) return;
    const userRef = doc(db, 'users', user.uid);
    try {
      await setDoc(userRef, {
        email: user.email,
        displayName: user.displayName,
        lastLoginAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (e) {
      debug.error('Failed to update user profile', e);
    }
  },

  findUserByEmail: async (email: string): Promise<SharedUser | null> => {
    try {
      if (!email) return null;
      debug.log('findUserByEmail: Searching for email:', email);
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', email), limit(1));
      const snapshot = await getDocs(q);

      debug.log('findUserByEmail: Found docs:', snapshot.size);
      if (snapshot.empty) {
        debug.log('findUserByEmail: No user found with email:', email);
        return null;
      }

      const userData = snapshot.docs[0].data();
      debug.log('findUserByEmail: User found:', userData);
      return {
        uid: snapshot.docs[0].id,
        email: userData.email,
        displayName: userData.displayName || '',
        permission: 'read' // 기본값 (실제 사용 시 재설정됨)
      };
    } catch (e) {
      debug.error('Failed to find user by email', e);
      return null;
    }
  },

  updateUserStartScreen: async (uid: string, startScreen: 'last' | 'today' | 'week' | 'month'): Promise<void> => {
    return withRetry(async () => {
      try {
        const userRef = doc(db, 'users', uid);
        await setDoc(userRef, { startScreen, updatedAt: serverTimestamp() }, { merge: true });
        debug.log(`User ${uid} startScreen updated to ${startScreen}`);
      } catch (error) {
        debug.error('Firestore updateUserStartScreen 실패:', error);
        throw error;
      }
    });
  },

  // ===== 공유 그룹 관리 =====
  subscribeSharingGroups: (uid: string, callback: (groups: any[]) => void) => {
    try {
      const groupsRef = collection(db, `users/${uid}/sharing_groups`);
      const q = query(groupsRef, orderBy('createdAt', 'desc'));

      return onSnapshot(q, (snapshot) => {
        const groups = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: safeToDate(doc.data().createdAt) || new Date()
        }));
        callback(groups);
      }, (error) => {
        debug.error('Sharing groups subscription error:', error);
        callback([]);
      });
    } catch (error) {
      debug.error('Failed to subscribe sharing groups:', error);
      callback([]);
      return () => { };
    }
  },

  createSharingGroup: async (uid: string, group: { name: string; members: SharedUser[] }): Promise<string> => {
    try {
      const groupsRef = collection(db, `users/${uid}/sharing_groups`);
      const docRef = await addDoc(groupsRef, {
        name: group.name,
        members: group.members,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      debug.log('Sharing group created:', docRef.id);
      return docRef.id;
    } catch (error) {
      debug.error('Failed to create sharing group:', error);
      throw error;
    }
  },

  updateSharingGroup: async (uid: string, groupId: string, updates: Partial<{ name: string; members: SharedUser[] }>): Promise<void> => {
    try {
      console.log('🔄 updateSharingGroup 시작:', { uid, groupId, updates });

      // 1. 현재 그룹 정보 가져오기 (기존 멤버 목록 확인용)
      const groupRef = doc(db, `users/${uid}/sharing_groups`, groupId);
      const groupSnap = await getDoc(groupRef);
      const existingMembers = groupSnap.exists() ? groupSnap.data().members || [] : [];
      console.log('📋 기존 멤버:', existingMembers.map((m: any) => ({ uid: m.uid, permission: m.permission })));

      // 2. 소유자의 그룹 문서 업데이트
      await updateDoc(groupRef, {
        ...updates,
        updatedAt: serverTimestamp()
      });
      console.log('✅ 소유자 그룹 업데이트 완료:', groupId);

      // 🔧 그룹 권한 변경 시 관련 shared_todos도 업데이트
      if (updates.members) {
        console.log('📝 업데이트할 멤버:', updates.members.map(m => ({ uid: m.uid, permission: m.permission })));
        const todosRef = collection(db, 'shared_todos');
        const q = query(
          todosRef,
          where('sharedGroupId', '==', groupId),
          where('ownerId', '==', uid)
        );
        const todoSnapshot = await getDocs(q);

        if (todoSnapshot.docs.length > 0) {
          // 권한별 UID 배열 생성
          const editorUids = updates.members
            .filter(m => m.permission === 'edit' || m.permission === 'admin')
            .map(m => m.uid);
          const adminUids = updates.members
            .filter(m => m.permission === 'admin')
            .map(m => m.uid);
          const sharedWithUids = updates.members.map(m => m.uid);

          // sharedWith 배열 업데이트
          const sharedWith = updates.members.map(m => ({
            uid: m.uid,
            email: m.email,
            displayName: m.displayName,
            permission: m.permission
          }));

          const batch = writeBatch(db);
          todoSnapshot.docs.forEach(todoDoc => {
            batch.update(todoDoc.ref, {
              sharedWith,
              sharedWithUids,
              editorUids,
              adminUids,
              updatedAt: serverTimestamp()
            });
          });

          await batch.commit();
          console.log(`✅ ${todoSnapshot.docs.length}개의 공유 할일 권한 동기화됨`);
        }

        // 🔧 3. 각 멤버의 참조 그룹 문서도 업데이트 (멤버 목록 동기화)
        const allMembers = [...new Set([...existingMembers.map((m: any) => m.uid), ...updates.members.map(m => m.uid)])];
        const memberUpdatePromises = allMembers
          .filter(memberUid => memberUid !== uid) // 소유자 제외
          .map(async (memberUid) => {
            try {
              // 🔧 멤버의 참조 그룹은 `ref_{groupId}` 형태로 저장됨
              // getDoc은 READ 권한이 필요하므로 바로 updateDoc 시도
              const memberGroupRef = doc(db, `users/${memberUid}/sharing_groups`, `ref_${groupId}`);
              await updateDoc(memberGroupRef, {
                ...updates,
                updatedAt: serverTimestamp()
              });
              console.log(`✅ 멤버 ${memberUid}의 그룹 참조 업데이트됨 (ref_${groupId})`);
            } catch (e: any) {
              // 문서가 없거나 권한 오류 (초대 수락 전일 수 있음)
              if (e.code === 'not-found') {
                console.log(`ℹ️ 멤버 ${memberUid}의 그룹 참조가 없음 (초대 수락 전)`);
              } else {
                console.warn(`⚠️ 멤버 ${memberUid}의 그룹 참조 업데이트 실패:`, e.message);
              }
            }
          });

        await Promise.allSettled(memberUpdatePromises);
      }
    } catch (error) {
      debug.error('Failed to update sharing group:', error);
      throw error;
    }
  },

  deleteSharingGroup: async (uid: string, groupId: string): Promise<void> => {
    try {
      console.log('🗑️ Deleting sharing group:', groupId);

      // 1. 그룹 정보 가져오기 (멤버 목록 확인용)
      const groupRef = doc(db, `users/${uid}/sharing_groups`, groupId);
      const groupSnap = await getDoc(groupRef);

      if (!groupSnap.exists()) {
        console.warn('❌ Group not found for deletion:', groupId);
        return;
      }

      const groupData = groupSnap.data();
      const members = groupData.members || [];

      // 2. 다른 멤버들의 참조 그룹 삭제 (권한이 허용되면)
      // client-side에서 다른 유저의 컬렉션을 삭제하려면 보안 규칙이 허용해야 함
      // 실패하더라도 내 그룹은 삭제 진행
      const memberCleanups = members
        .filter((m: SharedUser) => m.uid !== uid)
        .map(async (member: SharedUser) => {
          try {
            const refDocPath = `users/${member.uid}/sharing_groups/ref_${groupId}`;
            await deleteDoc(doc(db, refDocPath));
            console.log('✅ Deleted reference for member:', member.email);
          } catch (err) {
            console.warn(`⚠️ Failed to delete reference for ${member.email} (likely permission issue):`, err);
          }
        });

      await Promise.allSettled(memberCleanups);

      // 3. 연관된 공유 할일들 처리 (공유 해제) - 권한 오류 허용
      // shared_todos에서 해당 groupId를 가진 모든 할일 검색
      try {
        const todosRef = collection(db, 'shared_todos');
        // 자신이 소유자인 할일만 업데이트 가능 (보안 규칙)
        const q = query(
          todosRef,
          where('sharedGroupId', '==', groupId),
          where('ownerId', '==', uid)  // 자신이 소유한 할일만
        );
        const todoSnapshot = await getDocs(q);

        if (todoSnapshot.docs.length > 0) {
          const batch = writeBatch(db);

          todoSnapshot.docs.forEach((todoDoc) => {
            batch.update(todoDoc.ref, {
              sharedGroupId: deleteField(),
              sharedGroupName: deleteField(),
              sharedWith: [],
              sharedWithUids: [],
              editorUids: [],
              adminUids: [],
              'visibility.isShared': false,
              updatedAt: serverTimestamp()
            });
          });

          await batch.commit();
          console.log(`✅ Unshared ${todoSnapshot.docs.length} todos associated with group.`);
        }
      } catch (todoError) {
        // 할일 업데이트 실패해도 그룹 삭제는 계속 진행
        console.warn('⚠️ Failed to unshare some todos (continuing with group deletion):', todoError);
      }

      // 4. 내 그룹 문서 삭제
      try {
        await deleteDoc(groupRef);
        console.log('✅ Sharing group deleted:', groupId);
      } catch (deleteError: any) {
        // 그룹 삭제 자체가 실패한 경우
        debug.error('Failed to delete group document:', deleteError);
        throw deleteError;
      }

    } catch (error) {
      debug.error('Failed to delete sharing group:', error);
      throw error;
    }
  },

  // 3. 수락된 초대 처리 (Sender가 실행)
  processAcceptedInvitation: async (request: any): Promise<void> => {
    const { id, groupId, fromUid, toEmail, permission } = request;
    console.log('🔄 Processing accepted invitation:', id);

    try {
      // 1. 초대받은 사용자 정보 찾기 (이메일 기반)
      const targetUser = await firestoreService.findUserByEmail(toEmail);
      if (!targetUser) {
        console.warn('❌ 초대를 수락한 사용자를 찾을 수 없음:', toEmail);
        return;
      }
      const targetUserWithPerm = { ...targetUser, permission };

      // 2. 그룹 멤버 추가 (이미 존재하는지 확인)
      const groupRef = doc(db, `users/${fromUid}/sharing_groups`, groupId);
      const groupSnap = await getDoc(groupRef);

      if (groupSnap.exists()) {
        const groupData = groupSnap.data();
        const existingMembers = groupData.members || [];

        if (!existingMembers.some((m: any) => m.uid === targetUser.uid)) {
          const updatedMembers = [...existingMembers, targetUserWithPerm];
          await updateDoc(groupRef, {
            members: updatedMembers,
            updatedAt: serverTimestamp()
          });
          console.log('✅ 그룹 멤버 추가 완료:', groupId, targetUser.uid);
        }
      } else {
        console.warn('⚠️ 그룹을 찾을 수 없음 (삭제되었을 수 있음):', groupId);
        await deleteDoc(doc(db, 'sharing_requests', id));
        return;
      }

      // 3. 해당 그룹의 모든 공유 할일 업데이트 (새 멤버 추가)
      const todosRef = collection(db, 'shared_todos');
      const q = query(todosRef, where('sharedGroupId', '==', groupId));
      const snapshot = await getDocs(q);

      const batch = writeBatch(db);
      let updateCount = 0;

      snapshot.docs.forEach(todoDoc => {
        const data = todoDoc.data();
        const currentSharedWith = data.sharedWith || [];

        if (!currentSharedWith.some((u: any) => u.uid === targetUser.uid)) {
          const newSharedWith = [...currentSharedWith, targetUserWithPerm];
          const newSharedWithUids = [...(data.sharedWithUids || []), targetUser.uid];

          const updates: any = {
            sharedWith: newSharedWith,
            sharedWithUids: newSharedWithUids,
            updatedAt: serverTimestamp()
          };

          if (permission === 'edit' || permission === 'admin') {
            updates.editorUids = [...(data.editorUids || []), targetUser.uid];
          }
          if (permission === 'admin') {
            updates.adminUids = [...(data.adminUids || []), targetUser.uid];
          }

          batch.update(todoDoc.ref, updates);
          updateCount++;
        }
      });

      if (updateCount > 0) {
        await batch.commit();
        console.log(`✅ ${updateCount}개의 공유 할일에 새 멤버 추가 완료`);
      }

      // 4. 요청 삭제 (처리 완료)
      await deleteDoc(doc(db, 'sharing_requests', id));
      console.log('✅ 초대 요청 처리 완료 및 삭제:', id);

    } catch (error) {
      console.error('❌ processAcceptedInvitation 실패:', error);
      throw error;
    }
  },

  leaveSharingGroup: async (uid: string, groupId: string): Promise<void> => {
    try {
      console.log('🚪 leaveSharingGroup 시작:', { uid, groupId });

      // 1. 해당 그룹과 연동된, 내가 포함된 모든 공유 할일 찾기
      const todosRef = collection(db, 'shared_todos');
      const q = query(
        todosRef,
        where('sharedGroupId', '==', groupId),
        where('sharedWithUids', 'array-contains', uid)
      );
      const snapshot = await getDocs(q);

      const batch = writeBatch(db);
      let updateCount = 0;

      snapshot.docs.forEach(doc => {
        const data = doc.data();
        const newSharedWith = (data.sharedWith || []).filter((u: any) => u.uid !== uid);
        const newSharedWithUids = (data.sharedWithUids || []).filter((u: string) => u !== uid);
        const newEditorUids = (data.editorUids || []).filter((u: string) => u !== uid);
        const newAdminUids = (data.adminUids || []).filter((u: string) => u !== uid);

        batch.update(doc.ref, {
          sharedWith: newSharedWith,
          sharedWithUids: newSharedWithUids,
          editorUids: newEditorUids,
          adminUids: newAdminUids,
          updatedAt: serverTimestamp()
        });
        updateCount++;
      });

      if (updateCount > 0) {
        await batch.commit();
        console.log(`✅ ${updateCount}개의 공유 할일에서 나가기 처리됨.`);
      }

      // 2. 내 그룹 목록에서 그룹 삭제
      const groupRef = doc(db, `users/${uid}/sharing_groups`, groupId);
      await deleteDoc(groupRef);
      console.log('✅ 공유 그룹 목록에서 삭제 완료:', groupId);

    } catch (error) {
      console.error('❌ leaveSharingGroup 실패:', error);
      throw error;
    }
  },

  // ===== 공유 알림 관련 함수 =====

  // 권한 변경 알림 발송
  sendPermissionChangeNotification: async (
    fromUser: { uid: string; email: string },
    targetUid: string,
    groupId: string,
    groupName: string,
    previousPermission: SharePermission,
    newPermission: SharePermission
  ): Promise<string> => {
    try {
      const notificationsRef = collection(db, 'sharing_notifications');
      const notificationData = {
        type: 'permission_change',
        targetUid,
        fromUid: fromUser.uid,
        fromEmail: fromUser.email,
        groupId,
        groupName,
        previousPermission,
        newPermission,
        createdAt: serverTimestamp(),
        read: false
      };
      const docRef = await addDoc(notificationsRef, notificationData);
      console.log('✅ 권한 변경 알림 발송:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('❌ 권한 변경 알림 발송 실패:', error);
      throw error;
    }
  },

  // 공유 알림 구독
  subscribeToSharingNotifications: (uid: string, callback: (notifications: any[]) => void) => {
    const notificationsRef = collection(db, 'sharing_notifications');
    const q = query(
      notificationsRef,
      where('targetUid', '==', uid),
      orderBy('createdAt', 'desc'),
      limit(50)
    );
    return onSnapshot(q, (snapshot) => {
      const notifications = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: safeToDate(doc.data().createdAt) || new Date()
      }));
      callback(notifications);
    });
  },

  // 알림 읽음 처리
  markNotificationAsRead: async (notificationId: string): Promise<void> => {
    try {
      const notificationRef = doc(db, 'sharing_notifications', notificationId);
      await updateDoc(notificationRef, { read: true });
      console.log('✅ 알림 읽음 처리:', notificationId);
    } catch (error) {
      console.error('❌ 알림 읽음 처리 실패:', error);
      throw error;
    }
  },

  // 휴가 관리 접근 권한 관리
  getVacationAccessList: async (): Promise<string[]> => {
    try {
      const docRef = doc(db, 'settings', 'vacation_access');
      const snapshot = await getDoc(docRef);
      if (snapshot.exists()) {
        const data = snapshot.data();
        return data.allowedEmails || [];
      }
      return [];
    } catch (error) {
      console.error('Error fetching vacation access list:', error);
      return [];
    }
  },

  addVacationAccessEmail: async (email: string): Promise<void> => {
    try {
      const docRef = doc(db, 'settings', 'vacation_access');
      await setDoc(docRef, {
        allowedEmails: arrayUnion(email)
      }, { merge: true });
    } catch (error) {
      console.error('Error adding vacation access email:', error);
      throw error;
    }
  },

  removeVacationAccessEmail: async (email: string): Promise<void> => {
    try {
      const docRef = doc(db, 'settings', 'vacation_access');
      await updateDoc(docRef, {
        allowedEmails: arrayRemove(email)
      });
    } catch (error) {
      console.error('Error removing vacation access email:', error);
      throw error;
    }
  },

  // 중복 인스턴스 일괄 정리
  cleanupDuplicateInstances: async (uid: string): Promise<number> => {
    console.log('🧹 중복 인스턴스 정리 시작...')
    const instancesRef = collection(db, `users/${uid}/recurringInstances`)
    const snapshot = await getDocs(instancesRef)

    // 그룹화: templateId_date -> [doc1, doc2, ...]
    const groups = new Map<string, any[]>()
    snapshot.docs.forEach(doc => {
      const data = doc.data()
      if (!data.date || !data.templateId) return

      // 날짜를 YYYY-MM-DD 문자열로 변환 (Timestamp 처리)
      const dateVal = data.date?.toDate ? data.date.toDate() : new Date(data.date)
      const dateStr = `${dateVal.getFullYear()}-${dateVal.getMonth()}-${dateVal.getDate()}`
      const key = `${data.templateId}_${dateStr}`

      if (!groups.has(key)) groups.set(key, [])
      groups.get(key)!.push(doc)
    })

    const deleteTargets: any[] = []
    let duplicateGroupCount = 0

    // 각 그룹별로 중복 확인
    groups.forEach((docs, key) => {
      if (docs.length > 1) {
        duplicateGroupCount++
        // 생성일(createdAt) 기준 정렬 (최신순)
        docs.sort((a, b) => {
          const timeA = a.data().createdAt?.toMillis ? a.data().createdAt.toMillis() : 0
          const timeB = b.data().createdAt?.toMillis ? b.data().createdAt.toMillis() : 0
          return timeB - timeA // 내림차순 (최신이 먼저)
        })

        // 첫 번째(최신)만 남기고 나머지 삭제 대상에 추가
        for (let i = 1; i < docs.length; i++) {
          deleteTargets.push(docs[i])
        }
      }
    })

    console.log(`🧹 중복 정리 분석 결과:`)
    console.log(`- 전체 인스턴스: ${snapshot.size}개`)
    console.log(`- 중복된 날짜 그룹: ${duplicateGroupCount}개`)
    console.log(`- 삭제 대상(중복본): ${deleteTargets.length}개`)

    if (deleteTargets.length === 0) return 0

    // 배치 삭제 실행 (안정성을 위해 100개씩)
    const BATCH_SIZE = 100
    const chunks = []
    for (let i = 0; i < deleteTargets.length; i += BATCH_SIZE) {
      chunks.push(deleteTargets.slice(i, i + BATCH_SIZE))
    }

    let deletedCount = 0
    for (const chunk of chunks) {
      const batch = writeBatch(db)
      chunk.forEach(doc => batch.delete(doc.ref))
      await batch.commit()
      deletedCount += chunk.length
      console.log(`🧹 삭제 진행 중: ${deletedCount}/${deleteTargets.length}`)
    }

    console.log('🧹✨ 중복 인스턴스 정리 완료!')
    return deletedCount
  },

  subscribeToVacationAccessList: (callback: (emails: string[]) => void) => {
    const docRef = doc(db, 'settings', 'vacation_access');
    return onSnapshot(docRef, (snapshot) => {
      if (snapshot.exists()) {
        callback(snapshot.data().allowedEmails || []);
      } else {
        callback([]);
      }
    });
  },

  // 알림 삭제
  deleteNotification: async (notificationId: string): Promise<void> => {
    try {
      const notificationRef = doc(db, 'sharing_notifications', notificationId);
      await deleteDoc(notificationRef);
      console.log('✅ 알림 삭제:', notificationId);
    } catch (error) {
      console.error('❌ 알림 삭제 실패:', error);
      throw error;
    }
  },
};