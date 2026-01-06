import { useState, useCallback, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTodos } from '../contexts/TodoContext';
import { googleTasksService } from '../services/googleTasksService';
import { firestoreService } from '../services/firestoreService';
import { generateId } from '../utils/helpers';
import type { Todo, SubTask } from '../types/todo';

export const useGoogleTasksSync = () => {
    const { getGoogleAccessToken, currentUser, loading: authLoading } = useAuth();
    const { addTodo, updateTodo, deleteTodo, todos, loading: todosLoading } = useTodos();
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const isSyncing = useRef(false); // Mutex to prevent concurrent syncs

    // Use refs to avoid sync function being recreated on every todo change
    const todosRef = useRef(todos);
    todosRef.current = todos;
    const currentUserRef = useRef(currentUser);
    currentUserRef.current = currentUser;

    const syncGoogleTasks = useCallback(async (options?: { silent?: boolean }) => {
        // Firestore 데이터 로딩 중이면 동기화 건너뜀 (중복 방지 핵심)
        if (todosLoading) {
            console.log('⏳ Firestore 데이터를 불러오는 중입니다. 동기화를 대기합니다...');
            return false;
        }

        // Prevent concurrent syncs
        if (isSyncing.current) {
            console.log('🔄 이미 동기화가 진행 중입니다.');
            return false;
        }
        isSyncing.current = true;

        if (!getGoogleAccessToken) {
            if (!options?.silent) setMessage('인증 서비스를 준비 중입니다.');
            isSyncing.current = false;
            return false;
        }

        setLoading(true);
        if (!options?.silent) setMessage(null);

        try {
            const token = await getGoogleAccessToken({ silent: options?.silent });
            if (!token) {
                if (!options?.silent) throw new Error('구글 인증 토큰을 가져오지 못했습니다.');
                isSyncing.current = false;
                setLoading(false);
                return false;
            }

            console.log('📡 구글 태스크 목록 가져오는 중...');
            const listsWithTasks = await googleTasksService.getAllTasks(token);
            let importedCount = 0;
            let updatedCount = 0;
            let deletedCount = 0;

            // 로컬에 이미 존재하는 구글 태스크 ID 맵 생성 (ID -> Todo 객체)
            const existingGoogleTasksMap = new Map();
            const existingSubTaskGoogleIds = new Set<string>();

            todosRef.current.forEach(t => {
                if (t.googleTaskId) {
                    existingGoogleTasksMap.set(t.googleTaskId, t);
                }
                // 서브태스크 ID 수집 (중복 생성 방지용)
                if (t.subTasks && Array.isArray(t.subTasks)) {
                    t.subTasks.forEach(st => {
                        if (st.googleTaskId) {
                            existingSubTaskGoogleIds.add(st.googleTaskId);
                        }
                    });
                }
            });

            // Track IDs imported in this session to prevent duplicates within the same sync run
            const importedInThisSession = new Set<string>();

            // 1. 모든 태스크를 플랫 리스트에서 추출하고, 부모-자식 관계로 분류
            // 'allTasksMap'은 cleanup 단계에서도 사용하기 위해 여기 정의
            const allTasksMap = new Map<string, any>();
            const childTasksMap = new Map<string, any[]>(); // parentTaskId -> childTasks[]
            const topLevelTasks: any[] = [];

            for (const list of listsWithTasks) {
                for (const task of list.tasks) {
                    if (!task.id) continue;
                    // 리스트 정보 포함하여 저장
                    const taskWithContext = { ...task, listId: list.listId, listName: list.listName };

                    allTasksMap.set(task.id, taskWithContext);

                    if (task.parent) {
                        const children = childTasksMap.get(task.parent) || [];
                        children.push(taskWithContext);
                        childTasksMap.set(task.parent, children);
                    } else {
                        topLevelTasks.push(taskWithContext);
                    }
                }
            }

            // 2. Top-level Tasks 처리 (기존 로직 + 하위 작업 포함 생성)
            for (const task of topLevelTasks) {
                const existingTodo = existingGoogleTasksMap.get(task.id);
                const isGoogleCompleted = task.status === 'completed';

                // 하위 작업들 가져오기
                const childTasks = childTasksMap.get(task.id) || [];

                // 2-1. 이미 존재하는 할 일 업데이트
                if (existingTodo) {
                    // 0. 필수 필드 백필
                    if (!existingTodo.googleTaskListId) {
                        console.log(`🔧 Google Task List ID 복구: [${existingTodo.title}] -> ${task.listId}`);
                        await updateTodo(existingTodo.id, { googleTaskListId: task.listId });
                        existingTodo.googleTaskListId = task.listId;
                    }

                    const isDeleted = task.deleted; // Top level deleted

                    // 구글에서 삭제된 경우
                    if (isDeleted) {
                        // 안전장치: 로컬에서 최근 1분 이내에 수정된 항목은 삭제 유예 (API 반영 지연 대비)
                        const lastUpdated = existingTodo.updatedAt ? new Date(existingTodo.updatedAt).getTime() : 0;
                        const now = Date.now();
                        if (now - lastUpdated < 60000) {
                            console.log(`🛡️ 최근 수정된 항목 삭제 방지 (Safety Guard): [${existingTodo.title}]`);
                            continue;
                        }

                        console.log(`🗑️ 구글에서 삭제된 할 일 감지: [${existingTodo.title}]`);
                        await deleteTodo(existingTodo.id);
                        deletedCount++;
                        continue;
                    }

                    // 변경 사항 감지
                    const isTitleChanged = task.title && task.title !== existingTodo.title;
                    const isNotesChanged = task.notes !== undefined && task.notes !== existingTodo.description;
                    const isStatusChanged = existingTodo.completed !== isGoogleCompleted;

                    const googleDue = task.due ? new Date(task.due).toDateString() : null;
                    const appDue = existingTodo.dueDate ? new Date(existingTodo.dueDate).toDateString() : null;
                    const isDueChanged = googleDue !== appDue;

                    // 하위 작업 동기화 (간단 버전: 신규 추가만 처리하고 업데이트는 보수적)
                    let subTasksUpdated = false;
                    const currentSubTasks = existingTodo.subTasks || [];
                    let newSubTasks = [...currentSubTasks];

                    for (const child of childTasks) {
                        if (child.deleted) continue;

                        const existingSub = currentSubTasks.find(st => st.googleTaskId === child.id);
                        if (existingSub) {
                            // 단순 상태/제목 업데이트
                            if (existingSub.title !== child.title || existingSub.completed !== (child.status === 'completed')) {
                                newSubTasks = newSubTasks.map(st => st.id === existingSub.id ? {
                                    ...st,
                                    title: child.title,
                                    completed: child.status === 'completed',
                                    updatedAt: new Date()
                                } : st);
                                subTasksUpdated = true;
                            }
                        } else {
                            // 서브태스크 신규 추가 (중복 방지)
                            if (!importedInThisSession.has(child.id)) {
                                newSubTasks.push({
                                    id: generateId(),
                                    title: child.title,
                                    completed: child.status === 'completed',
                                    priority: 'medium',
                                    createdAt: new Date(),
                                    updatedAt: new Date(),
                                    googleTaskId: child.id
                                });
                                subTasksUpdated = true;
                                importedInThisSession.add(child.id);
                            }
                        }
                    }

                    if (isTitleChanged || isNotesChanged || isStatusChanged || isDueChanged || subTasksUpdated) {
                        console.log(`🔄 구글 태스크 변경 감지: [${task.title}]`);
                        const updates: Partial<Todo> = {};
                        if (isTitleChanged) updates.title = task.title;
                        if (isNotesChanged) updates.description = task.notes || "";
                        if (isStatusChanged) {
                            updates.completed = isGoogleCompleted;
                            updates.completedAt = isGoogleCompleted ? (task.completed ? new Date(task.completed) : new Date()) : null as any;
                        }
                        if (isDueChanged) updates.dueDate = task.due ? new Date(task.due) : undefined;
                        if (subTasksUpdated) updates.subTasks = newSubTasks;

                        if (!existingTodo.googleTaskListId) updates.googleTaskListId = task.listId;

                        await updateTodo(existingTodo.id, updates);
                        updatedCount++;
                    }
                    continue;
                }

                // 2-2. 새로운 할 일 추가
                if (task.deleted || importedInThisSession.has(task.id)) {
                    continue;
                }

                // [중복 방지] 이미 로컬에 SubTask로 존재하는 경우, Google API 지연으로 parent가 누락된 것으로 간주하고 생성 스킵
                if (existingSubTaskGoogleIds.has(task.id)) {
                    console.log(`🛡️ 이미 SubTask로 존재하는 항목의 중복 생성 방지: [${task.title}]`);
                    importedInThisSession.add(task.id);
                    continue;
                }

                // 하위 작업 매핑 (신규 생성 시)
                const finalSubTasks = childTasks.filter(c => !c.deleted).map(child => {
                    importedInThisSession.add(child.id); // 하위 작업도 처리됨 표시
                    return {
                        id: generateId(),
                        title: child.title,
                        completed: child.status === 'completed',
                        priority: 'medium',
                        createdAt: new Date(),
                        updatedAt: new Date(),
                        googleTaskId: child.id
                    };
                });

                importedInThisSession.add(task.id);

                await addTodo({
                    title: task.title || '(No Title)',
                    description: task.notes || "", // "Imported from..." 제거
                    completed: isGoogleCompleted,
                    priority: 'medium',
                    type: finalSubTasks.length > 0 ? 'project' : 'simple',
                    recurrence: 'none',
                    tags: ['Google Tasks'],
                    googleTaskId: task.id,
                    googleTaskListId: task.listId,
                    completedAt: task.completed ? new Date(task.completed) : undefined,
                    dueDate: task.due ? new Date(task.due) : undefined,
                    subTasks: finalSubTasks as any
                });
                importedCount++;
            }

            // 3. Cleanup: 하위 작업으로 이동된 태스크가 여전히 Top-level Todo로 남아있는 경우 정리
            // (이전에 독립적인 Todo로 가져왔으나 이제는 부모의 SubTask가 된 경우)
            const tasksToDelete: string[] = [];
            for (const todo of todosRef.current) {
                if (!todo.googleTaskId) continue;

                const googleTask = allTasksMap.get(todo.googleTaskId);
                // 구글 태스크상에 존재하고, parent가 있는 경우 (즉, 하위 작업임)
                // 현재 로직상 Top-level Todo로 남아있다면 중복이므로 삭제 대상
                if (googleTask && googleTask.parent) {
                    // 안전장치: 최근 수정된 항목은 Cleanup 보류
                    const lastUpdated = todo.updatedAt ? new Date(todo.updatedAt).getTime() : 0;
                    const now = Date.now();
                    if (now - lastUpdated < 60000) {
                        console.log(`🛡️ Cleanup 삭제 방지 (Safety Guard): [${todo.title}]`);
                        continue;
                    }

                    console.log(`🧹 중복 제거: 하위 작업으로 전환된 Todo 삭제 [${todo.title}] (${todo.id})`);
                    tasksToDelete.push(todo.id);
                }
            }

            if (tasksToDelete.length > 0) {
                // 비동기 삭제 처리 (순차적)
                for (const id of tasksToDelete) {
                    await deleteTodo(id);
                    deletedCount++;
                }
            }

            if (!options?.silent) {
                if (importedCount > 0 || updatedCount > 0 || deletedCount > 0) {
                    setMessage(`가져오기 ${importedCount}개, 업데이트 ${updatedCount}개, 삭제 ${deletedCount}개 완료!`);
                } else {
                    setMessage('변경 사항이 없습니다.');
                }
                setTimeout(() => setMessage(null), 3000);
            } else if (importedCount > 0 || updatedCount > 0 || deletedCount > 0) {
                console.log(`✅ Google Tasks 동기화: 가져오기 ${importedCount}, 업데이트 ${updatedCount}, 삭제 ${deletedCount}`);
            }

            // Update user settings to mark Google Tasks as linked
            if (currentUserRef.current) {
                try {
                    await firestoreService.updateGoogleTasksSettings(currentUserRef.current.uid, { linked: true });
                } catch (e) {
                    console.error('Failed to update linked status', e);
                }
            }
            return true;

        } catch (error: any) {
            console.error('Google Tasks Sync failed', error);
            if (!options?.silent) {
                const errorMessage = error.message || 'Unknown error';
                if (errorMessage.includes('popup')) {
                    setMessage('Popup blocked?');
                } else if (errorMessage.includes('network')) {
                    setMessage('Network Error');
                } else {
                    setMessage(`Error: ${errorMessage.substring(0, 15)}...`);
                }
                setTimeout(() => setMessage(null), 5000);
            }
            return false;
        } finally {
            setLoading(false);
            isSyncing.current = false;
        }
    }, [getGoogleAccessToken, addTodo, updateTodo, deleteTodo, todosLoading]); // Add updateTodo, deleteTodo dep

    return {
        syncGoogleTasks,
        loading,
        message,
        msg: message // alias compatibility if needed
    };
};
