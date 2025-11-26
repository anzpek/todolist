
import { SimpleRecurringInstance, SimpleRecurringTemplate } from './src/utils/simpleRecurring';

// Mock Todo interface
interface Todo {
    id: string;
    title: string;
    completed: boolean;
    startDate?: Date;
    dueDate?: Date;
    tags?: string[];
}

// Mock State
const today = new Date();
today.setHours(0, 0, 0, 0);

const yesterday = new Date(today);
yesterday.setDate(yesterday.getDate() - 1);

const tomorrow = new Date(today);
tomorrow.setDate(tomorrow.getDate() + 1);

const recurringTodos: Todo[] = [
    {
        id: 'recurring_yesterday',
        title: 'Yesterday Task (Incomplete)',
        completed: false,
        startDate: yesterday,
    },
    {
        id: 'recurring_today',
        title: 'Today Task',
        completed: false,
        startDate: today,
    },
    {
        id: 'recurring_tomorrow',
        title: 'Tomorrow Task',
        completed: false,
        startDate: tomorrow,
    },
];

const regularTodos: Todo[] = [];

// Mock getFilteredTodos logic
const getFilteredTodos = (filters: any) => {
    const allTodos = [...regularTodos, ...recurringTodos];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return allTodos.filter(todo => {
        // 🚨 미래의 반복 할일 숨김 처리 (사용자 요청)
        if (todo.startDate && !filters.completionDateFilter) {
            const startDate = new Date(todo.startDate);
            startDate.setHours(0, 0, 0, 0);

            if (startDate > today) {
                return false;
            }
        }
        return true;
    });
};

// Mock getTodayTodos logic
const getTodayTodos = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const filteredTodayRecurring = recurringTodos.filter(todo => {
        if (todo.startDate) {
            const startDate = new Date(todo.startDate);
            startDate.setHours(0, 0, 0, 0);

            // 1. 오늘 시작하는 할일
            if (startDate.getTime() === today.getTime()) {
                return true;
            }

            // 2. 과거에 시작했지만 아직 완료하지 않은 할일 (이월)
            if (startDate.getTime() < today.getTime() && !todo.completed) {
                return true;
            }
        }
        return false;
    });

    return filteredTodayRecurring;
};

// Run Tests
console.log('--- Testing getFilteredTodos (General View) ---');
const filtered = getFilteredTodos({});
console.log('Visible Todos:', filtered.map(t => t.title));
const hasTomorrow = filtered.some(t => t.id === 'recurring_tomorrow');
if (!hasTomorrow) {
    console.log('✅ PASS: Tomorrow task is hidden.');
} else {
    console.error('❌ FAIL: Tomorrow task is visible.');
}

console.log('\n--- Testing getTodayTodos (Today View) ---');
const todayList = getTodayTodos();
console.log('Today Todos:', todayList.map(t => t.title));

const hasYesterday = todayList.some(t => t.id === 'recurring_yesterday');
const hasToday = todayList.some(t => t.id === 'recurring_today');
const hasTomorrowInToday = todayList.some(t => t.id === 'recurring_tomorrow');

if (hasYesterday) console.log('✅ PASS: Yesterday incomplete task is carried over.');
else console.error('❌ FAIL: Yesterday incomplete task is missing.');

if (hasToday) console.log('✅ PASS: Today task is visible.');
else console.error('❌ FAIL: Today task is missing.');

if (!hasTomorrowInToday) console.log('✅ PASS: Tomorrow task is NOT in Today list.');
else console.error('❌ FAIL: Tomorrow task is in Today list.');
