import { debug } from '../utils/debug';

const GOOGLE_TASKS_API_BASE = 'https://www.googleapis.com/tasks/v1';

export interface GoogleTask {
    id: string;
    title: string;
    updated: string;
    selfLink: string;
    parent?: string;
    position?: string;
    notes?: string;
    status: 'needsAction' | 'completed';
    due?: string;
    completed?: string;
    deleted?: boolean;
    hidden?: boolean;
}

export interface GoogleTaskList {
    id: string;
    title: string;
    updated: string;
    selfLink: string;
}

export const googleTasksService = {
    /**
     * Fetch all task lists from Google Tasks
     */
    async getTaskLists(accessToken: string): Promise<GoogleTaskList[]> {
        try {
            const response = await fetch(`${GOOGLE_TASKS_API_BASE}/users/@me/lists`, {
                method: 'GET',
                referrerPolicy: 'no-referrer', // [Mobile Fix] Origin 헤더 문제 방지
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                let errorDetails = '';
                try {
                    const errorData = await response.json();
                    errorDetails = JSON.stringify(errorData);
                    console.error('Google Tasks API Error Details:', errorData);

                    // 403 error detection for re-auth trigger
                    if (response.status === 403) {
                        const message = errorData.error?.message || '';
                        const reason = errorData.error?.errors?.[0]?.reason || '';

                        // Check specifically for insufficient permissions/scopes
                        if (reason === 'insufficientPermissions' || message.includes('insufficient authentication scopes')) {
                            throw new Error('INSUFFICIENT_SCOPE'); // Special keyword for client handling
                        }
                    }
                } catch (e: any) {
                    if (e.message === 'INSUFFICIENT_SCOPE') throw e; // Re-throw our special error
                    errorDetails = 'Could not parse error response';
                }
                throw new Error(`Failed to fetch task lists: ${response.status} ${response.statusText} - ${errorDetails}`);
            }

            const data = await response.json();
            return data.items || [];
        } catch (error: any) {
            debug.error('Error fetching Google Task lists:', error);
            throw error;
        }
    },

    /**
     * Fetch tasks from a specific list
     */
    async getTasksFromList(accessToken: string, taskListId: string): Promise<GoogleTask[]> {
        try {
            // 최근 30일 이내에 업데이트된 항목만 가져오기 (성능 및 동기화 무결성)
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            const updatedMin = thirtyDaysAgo.toISOString();

            // showHidden=true to get completed tasks as well for status sync
            const response = await fetch(`${GOOGLE_TASKS_API_BASE}/lists/${taskListId}/tasks?showHidden=true&showDeleted=true&updatedMin=${updatedMin}`, {
                method: 'GET',
                referrerPolicy: 'no-referrer', // [Mobile Fix]
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch tasks from list ${taskListId}: ${response.statusText}`);
            }

            const data = await response.json();
            return data.items || [];
        } catch (error) {
            debug.error('Error fetching Google Tasks:', error);
            throw error;
        }
    },

    /**
     * Helper to fetch all tasks from all lists
     */
    async getAllTasks(accessToken: string): Promise<{ listName: string, listId: string, tasks: GoogleTask[] }[]> {
        const lists = await this.getTaskLists(accessToken);
        const result = [];

        for (const list of lists) {
            const tasks = await this.getTasksFromList(accessToken, list.id);
            if (tasks.length > 0) {
                result.push({
                    listName: list.title,
                    listId: list.id,
                    tasks: tasks
                });
            }
        }

        return result;
    },

    /**
     * Update a task's full details in Google Tasks
     */
    async updateTask(
        accessToken: string,
        taskListId: string,
        taskId: string,
        updates: {
            title?: string;
            notes?: string;
            status?: 'completed' | 'needsAction';
            due?: string;
            completed?: string | null;
            deleted?: boolean;
        }
    ): Promise<GoogleTask | null> {
        try {
            // 구글 태스크 API는 due 날짜에 시간 정보가 포함되면 오류가 발생할 수 있으므로 YYYY-MM-DDTHH:mm:ssZ 형식을 준수해야 함
            // 특히 시간 부분이 00:00:00.000Z여야 함 (날짜만 지원하는 경우)
            const body = { ...updates };
            if (body.due && body.due.includes('.')) {
                body.due = body.due.split('.')[0] + 'Z';
            }

            const response = await fetch(
                `${GOOGLE_TASKS_API_BASE}/lists/${taskListId}/tasks/${taskId}`,
                {
                    method: 'PATCH',
                    referrerPolicy: 'no-referrer', // [Mobile Fix]
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(body)
                }
            );

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error('Failed to update Google Task:', response.status, errorData);
                return null;
            }

            return await response.json();
        } catch (error: any) {
            debug.error('Error updating Google Task:', error);
            if (window.location.protocol.includes('http') === false || window.location.hostname === 'localhost') {
                // alert(`Update Sync Error: ${error.message}`); // 너무 조잡할 수 있어 일단 주석, 필요시 해제
            }
            return null;
        }
    },

    /**
     * Update a task's status in Google Tasks
     * @param accessToken Google OAuth access token
     * @param taskListId The ID of the task list containing the task
     * @param taskId The ID of the task to update
     * @param completed Whether the task is completed
     */
    async updateTaskStatus(
        accessToken: string,
        taskListId: string,
        taskId: string,
        completed: boolean
    ): Promise<GoogleTask | null> {
        return this.updateTask(accessToken, taskListId, taskId, {
            status: completed ? 'completed' : 'needsAction',
            completed: completed ? new Date().toISOString() : null
        });
    },

    /**
     * Delete a task from Google Tasks
     */
    async deleteTask(
        accessToken: string,
        taskListId: string,
        taskId: string
    ): Promise<boolean> {
        try {
            const response = await fetch(
                `${GOOGLE_TASKS_API_BASE}/lists/${taskListId}/tasks/${taskId}`,
                {
                    method: 'DELETE',
                    referrerPolicy: 'no-referrer', // [Mobile Fix]
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (!response.ok) {
                console.error('Failed to delete Google Task:', response.status);
                return false;
            }

            return true;
        } catch (error) {
            debug.error('Error deleting Google Task:', error);
            return false;
        }
    },

    /**
     * Insert a new task into Google Tasks
     */
    async insertTask(
        accessToken: string,
        taskListId: string,
        task: {
            title: string;
            notes?: string;
            status?: 'completed' | 'needsAction';
            due?: string;
            parent?: string;
        }
    ): Promise<GoogleTask | null> {
        try {
            const body = { ...task };
            // Parent is read-only on insert, so we remove it from body to avoid confusion, 
            // though keeping it doesn't hurt (it's ignored).
            // We will handle parenting via moveTask in the caller.
            if (body.due && body.due.includes('.')) {
                body.due = body.due.split('.')[0] + 'Z';
            }

            const response = await fetch(
                `${GOOGLE_TASKS_API_BASE}/lists/${taskListId}/tasks`,
                {
                    method: 'POST',
                    referrerPolicy: 'no-referrer', // [Mobile Fix]
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(body)
                }
            );

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error('Failed to insert Google Task:', response.status, errorData);
                return null;
            }

            return await response.json();
        } catch (error) {
            debug.error('Error inserting Google Task:', error);
            return null;
        }
    },

    /**
     * Move a task to a new position (e.g. under a parent)
     */
    async moveTask(
        accessToken: string,
        taskListId: string,
        taskId: string,
        parent?: string,
        previous?: string
    ): Promise<GoogleTask | null> {
        try {
            // Construct query parameters
            const params = new URLSearchParams();
            if (parent) params.append('parent', parent);
            if (previous) params.append('previous', previous);

            const response = await fetch(
                `${GOOGLE_TASKS_API_BASE}/lists/${taskListId}/tasks/${taskId}/move?${params.toString()}`,
                {
                    method: 'POST', // move uses POST
                    referrerPolicy: 'no-referrer', // [Mobile Fix]
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error('Failed to move Google Task:', response.status, errorData);
                return null;
            }

            return await response.json();
        } catch (error) {
            debug.error('Error moving Google Task:', error);
            return null;
        }
    }
};
