
import { simpleRecurringSystem, SimpleRecurringTemplate, SimpleRecurringInstance } from './src/utils/simpleRecurring';

// Mock data
const template: SimpleRecurringTemplate = {
    id: 'test_template',
    title: 'Test Recurring Task',
    priority: 'medium',
    type: 'simple',
    recurrenceType: 'daily',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
};

const instance: SimpleRecurringInstance = {
    id: 'test_instance',
    templateId: 'test_template',
    date: new Date('2023-12-25'), // Target date
    completed: false,
    createdAt: new Date('2023-12-01'), // Creation date
    updatedAt: new Date('2023-12-01')
};

console.log('--- Current Behavior ---');
const todo = simpleRecurringSystem.convertToTodo(instance, template);
console.log('Todo ID:', todo.id);
console.log('Todo Title:', todo.title);
console.log('Todo DueDate:', todo.dueDate);
console.log('Todo StartDate:', todo.startDate);
console.log('Todo CreatedAt:', todo.createdAt);

if (todo.startDate && todo.startDate.getTime() === instance.date.getTime() && !todo.dueDate) {
    console.log('Result: StartDate is set to instance date. DueDate is undefined.');
} else {
    console.log('Result: Unexpected behavior.');
    console.log('Expected: StartDate set, DueDate undefined');
    console.log('Actual: StartDate:', todo.startDate, 'DueDate:', todo.dueDate);
}
