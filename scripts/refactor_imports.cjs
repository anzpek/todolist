
const fs = require('fs');
const path = require('path');

const SRC_DIR = path.resolve(__dirname, '../src');
const COMPONENTS_DIR = path.join(SRC_DIR, 'components');

// 1. 모든 컴포넌트 파일의 현재 위치 맵핑 생성 (FileName -> AbsolutePath)
// 주의: 파일명이 중복되면 덮어씌워지지만, 현재 프로젝트는 컴포넌트 명 중복이 거의 없음.
const componentMap = new Map();

function scanDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            scanDir(fullPath);
        } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
            componentMap.set(file.replace(/\.tsx?$/, ''), fullPath); // 확장자 제외 이름 키
            componentMap.set(file, fullPath); // 확장자 포함 이름 키
        }
    }
}

scanDir(COMPONENTS_DIR);
console.log(`Found ${componentMap.size} components/files in components dir.`);

// 2. 소스 파일 순회하며 import 수정
function processFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let changed = false;

    // Import 구문 정규식 (require는 안 쓴다고 가정)
    // import ... from '...' 또는 import '...'
    // 동적 import() 도 고려해야 하나 일단 정적 import 위주

    const importRegex = /(import\s+.*?from\s+['"])(.*?)(['"])|(import\s+['"])(.*?)(['"])/g;

    const newContent = content.replace(importRegex, (match, p1, p2, p3, p4, p5, p6) => {
        const prefix = p1 || p4;
        const oldPath = p2 || p5;
        const suffix = p3 || p6;

        if (!oldPath.startsWith('.')) return match; // 절대 경로나 라이브러리는 패스

        // 2-1. 대상 파일명 추출
        const targetBasename = path.basename(oldPath);

        // 2-2. 대상이 컴포넌트인지 확인 (Map에 있는지)
        const targetFullPath = componentMap.get(targetBasename);

        if (targetFullPath) {
            // Case B: 컴포넌트 간 참조 (위치 재계산)
            // 현재 파일(filePath)에서 대상 파일(targetFullPath)로 가는 상대 경로 계산
            let newRelativePath = path.relative(path.dirname(filePath), targetFullPath).replace(/\\/g, '/');
            if (!newRelativePath.startsWith('.')) newRelativePath = './' + newRelativePath;

            // 확장자 제거 (원래 경로에 확장자가 없었다면)
            if (!oldPath.endsWith('.tsx') && !oldPath.endsWith('.ts')) {
                newRelativePath = newRelativePath.replace(/\.tsx?$/, '');
            }

            if (oldPath !== newRelativePath) {
                console.log(`[UPDATE] In ${path.basename(filePath)}: ${oldPath} -> ${newRelativePath}`);
                return `${prefix}${newRelativePath}${suffix}`;
            }
            return match;
        } else {
            // Case A: 외부 모듈 참조 (utils, hooks 등)
            // 원래 위치 추정 로직이 필요함. 
            // 가정: components 하위 파일들은 원래 'src/components/' 직속이었다.
            // 예외: VacationManagement 등. 
            // 하지만 더 간단한 방법:
            // "파일명이 Map에 없다면, components 외부 파일(utils 등)이다."
            // 이 경우, 현재 파일의 depth 증가분을 반영해야 함.

            // 현재 파일이 components 외부에 있다면(App.tsx 등) 수정 불필요 (경로가 안 바뀌었으므로)
            if (!filePath.startsWith(COMPONENTS_DIR)) return match;

            // 현재 파일이 components 내부에 있을 때만 depth 보정
            // 원래 components 폴더 바로 아래 있었다고 가정하면 depth는 1 (../utils)
            // 지금 깊이는?
            const relFromComponents = path.relative(COMPONENTS_DIR, filePath);
            const depth = relFromComponents.split(path.sep).length - 1; // 하위 폴더 깊이

            // 원래 경로가 ../ 로 시작한다면 (상위 참조), depth 만큼 ../ 를 더 추가해야 함.
            // 원래: ../utils
            // 이동후(depth 1): ../../utils
            // 이동후(depth 2): ../../../utils

            // 하지만 이미 한번 수정된 거라면? (스크립트 재실행 시) -> 멱등성 문제.
            // 따라서 "원래 경로가 유효하지 않을 때만" 수정해야 함.
            // resolve 해보고 파일이 없으면 수정?

            const resolvedOld = path.resolve(path.dirname(filePath), oldPath); // 현재 위치 기준 resolve (잘못된 경로)
            if (fs.existsSync(resolvedOld + '.ts') || fs.existsSync(resolvedOld + '.tsx') || fs.existsSync(resolvedOld)) {
                return match; // 이미 유효 하면 건드리지 않음
            }

            // 수정 시도: ../ -> ../../
            // 단순히 depth 차이만큼 ../ 추가가 아니라, 
            // "원래 components 루트에 있었다"고 가정하고 계산.
            // 원래 위치: src/components/FILE.tsx
            // 원래 경로(oldPath)가 가리키던 절대 경로:
            const assumedOriginalDir = COMPONENTS_DIR;
            const originalAbsolutePath = path.resolve(assumedOriginalDir, oldPath);

            // 파일이 존재하는지 확인 (utils/foo.ts 등)
            // 확장자 몇 개 시도
            let targetExists = fs.existsSync(originalAbsolutePath) ||
                fs.existsSync(originalAbsolutePath + '.ts') ||
                fs.existsSync(originalAbsolutePath + '.tsx');

            if (targetExists) {
                // 존재한다면, 이 경로가 맞음. 현재 위치에서 저 절대 경로로 가는 상대 경로 계산.
                let newRel = path.relative(path.dirname(filePath), originalAbsolutePath).replace(/\\/g, '/');
                if (!newRel.startsWith('.')) newRel = './' + newRel;
                // 확장자 처리 등...
                // 원래 import에 확장자 없으면 제거
                if (!oldPath.endsWith('.ts') && !oldPath.endsWith('.tsx')) {
                    newRel = newRel.replace(/\.tsx?$/, '');
                }

                console.log(`[FIX DEPTH] In ${path.basename(filePath)}: ${oldPath} -> ${newRel}`);
                return `${prefix}${newRel}${suffix}`;
            }

            return match;
        }
    });

    if (content !== newContent) {
        fs.writeFileSync(filePath, newContent, 'utf8');
    }
}

// 3. src 전체 순회
function walk(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            walk(fullPath);
        } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
            processFile(fullPath);
        }
    }
}

walk(SRC_DIR);
console.log('Done!');
