
import { simpleRecurringSystem, type SimpleRecurringTemplate } from './src/utils/simpleRecurring';
import { type CustomHoliday } from './src/utils/holidays';

// Mock console.log to reduce noise
const originalLog = console.log;
console.log = (...args) => { };

function runTest() {
    originalLog('🧪 Custom Holiday Verification Script');

    // 1. Define a custom holiday: Dec 24, 2024 (Tuesday)
    const customHolidays: CustomHoliday[] = [
        {
            id: 'holiday_1',
            date: '2024-12-24',
            name: 'My Special Holiday',
            isRecurring: false,
            createdAt: new Date() as any
        }
    ];

    // 2. Define a recurring template: Weekly on Tuesday
    // Dec 24, 2024 is a Tuesday.
    const template: SimpleRecurringTemplate = {
        id: 'template_1',
        title: 'Weekly Meeting',
        priority: 'medium',
        type: 'simple',
        recurrenceType: 'weekly',
        weekday: 2, // Tuesday
        holidayHandling: 'before', // Shift to previous working day
        isActive: true,
        createdAt: new Date('2024-12-01'),
        updatedAt: new Date('2024-12-01')
    };

    originalLog('\n📋 Test Case 1: Weekly task on custom holiday (Shift Before)');
    originalLog(`   Holiday: ${customHolidays[0].date} (${customHolidays[0].name})`);
    originalLog(`   Template: Weekly on Tuesday, Holiday Handling: Before`);

    // 3. Generate instances
    const instances = simpleRecurringSystem.generateInstances(template, customHolidays);

    // 4. Find the instance around Dec 24
    const targetInstance = instances.find(i => {
        const d = i.date;
        return d.getFullYear() === 2024 && d.getMonth() === 11 && (d.getDate() >= 23 && d.getDate() <= 25);
    });

    if (targetInstance) {
        const dateStr = targetInstance.date.toISOString().split('T')[0];
        originalLog(`   Found instance at: ${dateStr}`);

        if (dateStr === '2024-12-23') {
            originalLog('   ✅ SUCCESS: Task shifted to Dec 23 (Monday)');
        } else if (dateStr === '2024-12-24') {
            originalLog('   ❌ FAILURE: Task stayed on Dec 24 (Holiday)');
        } else {
            originalLog(`   ⚠️ UNEXPECTED: Task at ${dateStr}`);
        }
    } else {
        originalLog('   ❌ FAILURE: No instance found around Dec 24');
    }

    // Test Case 2: Recurring Holiday
    originalLog('\n📋 Test Case 2: Recurring Holiday (Annual)');
    const recurringHolidays: CustomHoliday[] = [
        {
            id: 'holiday_2',
            date: '2024-12-24', // Base date
            name: 'Annual Party',
            isRecurring: true,
            createdAt: new Date() as any
        }
    ];

    // Check for next year (2025)
    // Dec 24, 2025 is Wednesday.
    const template2: SimpleRecurringTemplate = {
        ...template,
        id: 'template_2',
        weekday: 3, // Wednesday
        createdAt: new Date('2025-01-01')
    };

    originalLog(`   Holiday: Dec 24 (Recurring)`);
    originalLog(`   Template: Weekly on Wednesday (matches Dec 24, 2025)`);

    const instances2 = simpleRecurringSystem.generateInstances(template2, recurringHolidays);

    const targetInstance2 = instances2.find(i => {
        const d = i.date;
        return d.getFullYear() === 2025 && d.getMonth() === 11 && (d.getDate() >= 23 && d.getDate() <= 25);
    });

    if (targetInstance2) {
        const dateStr = targetInstance2.date.toISOString().split('T')[0];
        originalLog(`   Found instance at: ${dateStr}`);

        if (dateStr === '2025-12-23') {
            originalLog('   ✅ SUCCESS: Task shifted to Dec 23 (Tuesday)');
        } else if (dateStr === '2025-12-24') {
            originalLog('   ❌ FAILURE: Task stayed on Dec 24 (Holiday)');
        } else {
            originalLog(`   ⚠️ UNEXPECTED: Task at ${dateStr}`);
        }
    } else {
        originalLog('   ❌ FAILURE: No instance found around Dec 24, 2025');
    }
}

runTest();
