
const fs = require('fs');
const path = require('path');

const DIR = path.resolve(__dirname, '../src/components/features/recurring/VacationManagement');

// 수정할 파일 목록
const files = [
    'VacationCalendar.tsx',
    'VacationDashboard.tsx',
    'VacationList.tsx',
    'VacationModal.tsx'
];

files.forEach(file => {
    const filePath = path.join(DIR, file);
    if (!fs.existsSync(filePath)) {
        console.log(`Skipping ${file} (not found)`);
        return;
    }

    let content = fs.readFileSync(filePath, 'utf8');

    // ../../ -> ../../../../ 치환 (contexts, services 등)
    // 정확히 import 구문 내의 ../../ 패턴만 치환
    const regex = /(from\s+['"])(\.\.\/\.\.\/)/g;

    const newContent = content.replace(regex, '$1../../../../');

    if (content !== newContent) {
        fs.writeFileSync(filePath, newContent, 'utf8');
        console.log(`Updated ${file}`);
    } else {
        console.log(`No changes needed for ${file}`);
    }
});
