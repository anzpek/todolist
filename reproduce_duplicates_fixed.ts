
import { firestoreService } from './src/services/firestoreService';
import { db } from './src/config/firebase';
import { collection, getDocs } from 'firebase/firestore';

// Mocking Firebase for local script execution is hard without credentials.
// Instead, I will assume I can run this in the browser context or I need to use the existing `TodoContext` state if possible.
// But I can't access `TodoContext` state from a script easily.

// However, the user provided `reproduce_duplicates.ts` which failed because of imports.
// I should try to fix `reproduce_duplicates.ts` to use `simpleRecurringSystem` correctly, 
// AND add a check for the "Duplicate Templates" hypothesis by simulating it.

// Actually, I can use `TodoContext.tsx`'s `validateDataConsistency` function!
// It is exposed on `window`.
// But I can't call window functions from here.

// I will create a script that simulates the "Duplicate Template" scenario to see if it produces the "3-4 tasks" symptom.
// And I will assume the user might have duplicates.

// But wait, I can use `read_resource` or `read_url_content`? No.
// I can use `run_command` to run a script.

// Let's try to fix `reproduce_duplicates.ts` first to verify `simpleRecurringSystem` is behaving correctly.
// The previous error was `TypeError: Cannot read properties of undefined (reading 'id')`.
// This was because `instances` was empty.
// I fixed the `weekday` issue in my head. I need to apply it to the file.

import { simpleRecurringSystem, SimpleRecurringTemplate } from './src/utils/simpleRecurring';

const template: SimpleRecurringTemplate = {
    id: 'template_weekly_report',
    title: 'Weekly Report',
    type: 'simple', // Fixed type
    priority: 'medium', // Added priority
    recurrenceType: 'weekly', // Added recurrenceType
    weekday: 1, // Fixed: weekday instead of weekDays
    startDate: new Date('2025-11-01'),
    createdAt: new Date(),
    updatedAt: new Date(),
    isActive: true // Added isActive
};

console.log('--- Generating Instances ---');
const instances = simpleRecurringSystem.generateInstances(template);
console.log(`Generated ${instances.length} instances.`);

// Check for duplicates in a week
const weekMap = new Map<string, number>();
instances.forEach(i => {
    const d = new Date(i.date);
    // Get week number or just start of week
    const startOfWeek = new Date(d);
    startOfWeek.setDate(d.getDate() - d.getDay());
    const key = startOfWeek.toDateString();
    weekMap.set(key, (weekMap.get(key) || 0) + 1);
});

console.log('--- Instances per Week ---');
let hasDuplicates = false;
weekMap.forEach((count, week) => {
    console.log(`${week}: ${count}`);
    if (count > 1) hasDuplicates = true;
});

if (hasDuplicates) {
    console.log('❌ BUG: Found multiple instances in a single week for one template!');
} else {
    console.log('✅ OK: One instance per week.');
}

// Simulate Multiple Templates (The "User Error" Hypothesis)
console.log('\n--- Simulating Multiple Templates ---');
const templates = [
    { ...template, id: 't1' },
    { ...template, id: 't2' },
    { ...template, id: 't3' }
];

let allInstances: any[] = [];
templates.forEach(t => {
    allInstances.push(...simpleRecurringSystem.generateInstances(t));
});

// Check duplicates again
const weekMap2 = new Map<string, number>();
allInstances.forEach(i => {
    const d = new Date(i.date);
    const startOfWeek = new Date(d);
    startOfWeek.setDate(d.getDate() - d.getDay());
    const key = startOfWeek.toDateString();
    weekMap2.set(key, (weekMap2.get(key) || 0) + 1);
});

console.log('--- Instances per Week (3 Templates) ---');
weekMap2.forEach((count, week) => {
    console.log(`${week}: ${count}`);
});
// This should show 3 per week.
