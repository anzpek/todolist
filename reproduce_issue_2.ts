
import { simpleRecurringSystem, type SimpleRecurringTemplate } from './src/utils/simpleRecurring';
import { type CustomHoliday, checkIsHoliday } from './src/utils/holidays';

// Mock console.log
const originalLog = console.log;
console.log = (...args) => { };

function runTest() {
    originalLog('🧪 Recursive Holiday Shifting Reproduction');

    // 1. Define Custom Holiday: Dec 24 (Recurring)
    const customHolidays: CustomHoliday[] = [
        {
            id: 'holiday_founding',
            date: '2025-12-24', // Stored as string YYYY-MM-DD
            name: 'Founding Day',
            isRecurring: true,
            createdAt: new Date() as any
        }
    ];

    // 2. Define Template: Weekly on Thursday
    // Dec 25, 2025 is Thursday (Christmas).
    const template: SimpleRecurringTemplate = {
        id: 'template_weekly_report',
        title: 'Weekly Report',
        priority: 'medium',
        type: 'simple',
        recurrenceType: 'weekly',
        weekday: 4, // Thursday
        holidayHandling: 'before',
        isActive: true,
        createdAt: new Date('2025-12-01'),
        updatedAt: new Date('2025-12-01')
    };

    originalLog('\n📋 Scenario: Weekly task on Dec 25, 2025 (Christmas)');
    originalLog('   Dec 25: Standard Holiday (Christmas)');
    originalLog('   Dec 24: Custom Recurring Holiday (Founding Day)');
    originalLog('   Expected: Shift to Dec 23 (Tuesday)');

    // Verify checkIsHoliday for Dec 24
    const dec24 = new Date(2025, 11, 24);
    const isDec24Holiday = checkIsHoliday(dec24, customHolidays);
    originalLog(`   checkIsHoliday(Dec 24): ${isDec24Holiday} (Should be true)`);

    // 3. Generate Instances
    const instances = simpleRecurringSystem.generateInstances(template, customHolidays);
    originalLog(`   Generated ${instances.length} instances.`);
    instances.forEach(i => originalLog(`   - ${i.date.toISOString().split('T')[0]}`));

    // 4. Find instance around Dec 25
    const targetInstance = instances.find(i => {
        const d = i.date;
        return d.getFullYear() === 2025 && d.getMonth() === 11 && (d.getDate() >= 23 && d.getDate() <= 25);
    });

    if (targetInstance) {
        const dateStr = targetInstance.date.toISOString().split('T')[0];
        originalLog(`   Result: Task scheduled on ${dateStr}`);

        if (dateStr === '2025-12-23') {
            originalLog('   ✅ SUCCESS: Shifted to Dec 23');
        } else if (dateStr === '2025-12-24') {
            originalLog('   ❌ FAILURE: Stuck on Dec 24 (Custom Holiday)');
        } else if (dateStr === '2025-12-25') {
            originalLog('   ❌ FAILURE: Stuck on Dec 25 (Standard Holiday)');
        } else {
            originalLog(`   ⚠️ UNEXPECTED: ${dateStr}`);
        }
    } else {
        originalLog('   ❌ FAILURE: No instance found');
    }
}

runTest();
