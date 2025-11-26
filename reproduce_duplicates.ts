
import { SimpleRecurringTemplate, SimpleRecurringInstance, simpleRecurringSystem } from './src/utils/simpleRecurring';

// Mock Data
const template: SimpleRecurringTemplate = {
    id: 'template_weekly_report',
    title: 'Weekly Report',
    type: 'weekly',
    frequency: 1,
    weekDays: [1], // Monday
    startDate: new Date('2025-11-01'), // Started in the past
    createdAt: new Date(),
    updatedAt: new Date(),
};

// Mock State
let instances: SimpleRecurringInstance[] = [];

// Simulate Generation
console.log('--- Initial Generation ---');
instances = simpleRecurringSystem.generateInstances(template);
console.log(`Generated ${instances.length} instances.`);

// Check for duplicates in a specific week
const checkDuplicates = (targetDate: Date) => {
    const startOfWeek = new Date(targetDate);
    startOfWeek.setDate(targetDate.getDate() - targetDate.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    const weekInstances = instances.filter(i => {
        const date = new Date(i.date);
        return date >= startOfWeek && date <= endOfWeek;
    });

    console.log(`Week of ${startOfWeek.toDateString()}: Found ${weekInstances.length} instances.`);
    weekInstances.forEach(i => console.log(` - ${i.date.toDateString()} (${i.id})`));
};

const today = new Date();
checkDuplicates(today);

// Simulate Re-generation (e.g., page reload or update)
console.log('\n--- Re-generation (Simulating duplication bug) ---');
// In a buggy implementation, this might append instead of replace/merge
const newInstances = simpleRecurringSystem.generateInstances(template);

// Merge logic check (naive merge vs smart merge)
// If we just push...
// instances.push(...newInstances); // This would be the bug

// Let's see if the system generates the SAME IDs
const firstInstance = instances[0];
const newFirstInstance = newInstances[0];

console.log(`First Run ID: ${firstInstance.id}`);
console.log(`Second Run ID: ${newFirstInstance.id}`);

if (firstInstance.id === newFirstInstance.id) {
    console.log('✅ IDs are deterministic (Good).');
} else {
    console.log('❌ IDs are different (Bad - causes duplicates).');
}

// Check TodoContext logic simulation
// In TodoContext, we often do: state.recurringInstances = action.payload
// But if we have multiple templates, we might be accumulating?

console.log('\n--- Checking TodoContext Logic Simulation ---');
// If generateRecurringInstances is called multiple times...
// It usually replaces the whole list or merges.

// Let's check if simpleRecurringSystem generates duplicates internally
const longTermTemplate: SimpleRecurringTemplate = {
    ...template,
    endDate: new Date('2026-01-01')
};
const longTermInstances = simpleRecurringSystem.generateInstances(longTermTemplate);
console.log(`Long term (until 2026) generated ${longTermInstances.length} instances.`);

// Check Dec 2025 count
const dec2025Instances = longTermInstances.filter(i => {
    const d = new Date(i.date);
    return d.getFullYear() === 2025 && d.getMonth() === 11; // Dec
});
console.log(`Dec 2025 Instances: ${dec2025Instances.length}`);
dec2025Instances.forEach(i => console.log(` - ${i.date.toDateString()}`));

if (dec2025Instances.length > 5) {
    console.log("⚠️ Suspiciously high number of instances for one month.");
}
