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
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type { Todo, SubTask } from '../types/todo';
import { debug } from '../utils/debug';
import { handleFirestoreError, withRetry } from '../utils/errorHandling';
import { getHolidayInfoSync, isWeekend, getFirstWorkdayOfMonth, getLastWorkdayOfMonth, checkIsHoliday, type CustomHoliday } from '../utils/holidays';
import type { SimpleRecurringTemplate, RecurrenceException, ConflictException, SimpleRecurringInstance } from '../utils/simpleRecurring';

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
    } catch (error) {
      debug.error('Firestore updateTodo 실패:', error)
      throw error
    }
  },

  deleteTodo: async (id: string, uid: string): Promise<void> => {
    try {
      const todoRef = doc(db, `users/${uid}/todos`, id)
      await deleteDoc(todoRef)
    } catch (error: any) {
      console.error('❌ Firestore deleteTodo 실패:', error)
      throw error
    }
  },

  subscribeTodos: (uid: string, callback: (todos: Todo[]) => void) => {
    try {
      const todosRef = collection(db, `users/${uid}/todos`)
      const q = query(todosRef, orderBy('createdAt', 'desc'))

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const todos = snapshot.docs.map(doc => {
          const data = doc.data()
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
            })) : []
          } as Todo;
        });
        callback(todos);
      }, (error) => {
        console.error('❌ Firestore 구독 오류:', error)
        callback([])
      })

      return unsubscribe
    } catch (error) {
      console.error('❌ Firestore subscribeTodos 초기화 실패:', error)
      callback([])
      return () => { }
    }
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
    const batch = writeBatch(db)
    const templateRef = doc(db, `users/${uid}/recurringTemplates`, id)
    batch.delete(templateRef)

    const instancesRef = collection(db, `users/${uid}/recurringInstances`)
    const q = query(instancesRef, where('templateId', '==', id))
    const snapshot = await getDocs(q)
    snapshot.forEach(doc => batch.delete(doc.ref))

    await batch.commit()
  },

  subscribeProjectTemplates: (uid: string, callback: (templates: any[]) => void) => {
    try {
      debug.log('프로젝트 템플릿 구독 시작', { uid });
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

        debug.log('프로젝트 템플릿 구독 업데이트', { count: templates.length });
        callback(templates);
      }, (error) => {
        debug.error('프로젝트 템플릿 구독 오류:', error);
        callback([]);
      });

      return unsubscribe;
    } catch (error) {
      debug.error('프로젝트 템플릿 구독 초기화 실패:', error);
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
    const q = query(instancesRef, orderBy('date', 'asc'))
    return onSnapshot(q, (snapshot) => {
      const instances = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: safeToDate(doc.data().date) || new Date(),
        createdAt: safeToDate(doc.data().createdAt) || new Date(),
        updatedAt: safeToDate(doc.data().updatedAt) || new Date(),
        completedAt: safeToDate(doc.data().completedAt)
      }))
      callback(instances)
    })
  },

  async _isExceptionDate(date: Date, template: SimpleRecurringTemplate, uid: string, isRecursiveCall: boolean): Promise<boolean> {
    if (isRecursiveCall || !template.exceptions) return false;

    for (const exception of template.exceptions) {
      switch (exception.type) {
        case 'date':
          if ((exception.values as number[]).includes(date.getDate())) return true;
          break;
        case 'weekday':
          if ((exception.values as number[]).includes(date.getDay())) return true;
          break;
        case 'week':
          const weekOfMonth = _calculateWeekOfMonth(date);
          if ((exception.values as number[]).includes(weekOfMonth)) return true;
          if ((exception.values as number[]).includes(-1) && _isLastOccurrenceOfWeekdayInMonth(date)) return true;
          break;
        case 'month':
          if ((exception.values as number[]).includes(date.getMonth() + 1)) return true;
          break;
        case 'conflict':
          const conflictExceptions = exception.values as ConflictException[];
          for (const conflict of conflictExceptions) {
            if (await this._hasConflictingInstance(date, template.id, conflict, uid)) {
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


        debug.log(`Data migration completed successfully from ${oldUid} to ${newUid}`);
      } catch (error) {
        debug.error('Data migration failed:', error);
        throw handleFirestoreError(error, 'migrateUserData');
      }
    });
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
};