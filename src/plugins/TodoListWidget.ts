import { registerPlugin } from '@capacitor/core';

export interface TodoListWidgetPlugin {
    updateWidget(options: { data: string; date?: string; transparency?: number }): Promise<void>;
}

const TodoListWidget = registerPlugin<TodoListWidgetPlugin>('TodoListWidget');

export default TodoListWidget;
