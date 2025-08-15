# Advanced TodoList App - React 프로젝트

## 프로젝트 개요
React 최신 버전을 사용한 고급 TodoList 애플리케이션 개발

## 주요 기능 요구사항

### 1. UI/UX
- 모던하고 깔끔한 디자인 (이모티콘 사용 금지)
- 반응형 웹 디자인
- 다크/라이트 모드 지원 (추가 기능)

### 2. 사이드바
- 왼쪽 사이드바 (토글 가능)
- 뷰 옵션: 오늘, 주간, 월간
- 어제 못한 일 표시 섹션

### 3. 할일 리스트 유형
- **단일 태스크**: 간단한 할일
- **프로젝트 태스크**: 여러 체크리스트 항목 포함
- 롱텀/숏텀 프로젝트 구분

### 4. 태스크 생성 옵션
- 단일/프로젝트 선택
- 마감일 설정
- 반복 설정:
  - 매주 (특정 요일)
  - 매월 (특정 날짜 또는 말일)
- 공휴일 처리 옵션:
  - 공휴일 하루 전 이동
  - 공휴일 다음날 이동

### 5. 뷰 기능
- 오늘 할일 + 내일 할일 미리보기
- 주간/월간 캘린더 뷰
- 진행률 표시

### 6. 공휴일 연동
- 대한민국 공휴일 API 사용
- API 키: `7BZDblK8NIBj32BvDQ5jWi%2FYyHJJfhDHESiBYljCaocAPUQZc8IG5ltkJvlVR8J1AinP5izo2WA2F68xWyUTKA%3D%3D`

## 기술 스택

### Core
- **React 18+** (최신 버전)
- **TypeScript** (타입 안정성)
- **Vite** (빠른 개발 환경)

### UI Framework
- **Tailwind CSS** (유틸리티 기반 스타일링)
- **shadcn/ui** (모던 컴포넌트 라이브러리)
- **Lucide React** (아이콘)

### 상태 관리
- **Zustand** (경량 상태 관리)
- **React Hook Form** (폼 관리)

### 날짜 처리
- **date-fns** (날짜 유틸리티)

### 데이터 저장
- **LocalStorage** (클라이언트 사이드 저장)

## 데이터 모델

### Task Type
```typescript
interface Task {
  id: string;
  title: string;
  description?: string;
  type: 'single' | 'project';
  status: 'pending' | 'in_progress' | 'completed';
  dueDate?: Date;
  createdDate: Date;
  updatedDate: Date;
  
  // 프로젝트 태스크용
  checklist?: ChecklistItem[];
  
  // 반복 설정
  recurring?: {
    type: 'weekly' | 'monthly';
    interval: number; // 주간: 요일(0-6), 월간: 날짜(1-31) 또는 -1(말일)
    holidayOption?: 'before' | 'after'; // 공휴일 처리
  };
  
  // 태그 및 카테고리
  tags?: string[];
  priority: 'low' | 'medium' | 'high';
  project?: string; // 롱텀/숏텀 프로젝트 구분
}

interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}
```

## 추가 기능 제안

### 1. 통계 및 분석
- 완료율 통계
- 생산성 차트
- 주간/월간 리포트

### 2. 알림 시스템
- 브라우저 알림
- 마감일 리마인더

### 3. 데이터 백업
- JSON 내보내기/가져오기
- 클라우드 동기화 (향후 확장)

### 4. 검색 및 필터
- 태스크 검색
- 태그별 필터링
- 날짜 범위 필터

### 5. 키보드 단축키
- 빠른 태스크 추가
- 네비게이션 단축키

## 개발 단계

1. **프로젝트 설정**: Vite + React + TypeScript 환경 구성
2. **UI 기반**: Tailwind CSS + shadcn/ui 설정
3. **기본 컴포넌트**: 레이아웃, 사이드바, 헤더
4. **태스크 관리**: CRUD 기능 구현
5. **뷰 시스템**: 날짜별 뷰 구현
6. **반복 태스크**: 스케줄링 로직 구현
7. **공휴일 연동**: API 연동 및 처리 로직
8. **고급 기능**: 통계, 알림, 검색 등
9. **최적화**: 성능 튜닝 및 UX 개선

## 명령어 모음

### 개발 환경
```bash
npm run dev          # 개발 서버 실행
npm run build        # 프로덕션 빌드
npm run preview      # 빌드 미리보기
npm run lint         # ESLint 실행
npm run type-check   # TypeScript 타입 체크
```

## 참고사항
- 모든 컴포넌트는 재사용 가능하게 설계
- 접근성(a11y) 고려하여 개발
- 모바일 우선 반응형 디자인
- 사용자 경험 최우선으로 설계

---

# 개발 워크플로우

## 표준 개발 프로세스
모든 개발 작업은 다음 순서를 반드시 준수합니다:

1. **분석 (Analysis)** 📊
   - 현재 상태 파악
   - 요구사항 분석
   - 문제점 및 개선점 식별

2. **개발 (Development)** 🔧
   - 코드 구현
   - 기능 개발
   - 버그 수정

3. **테스트 (Testing)** ✅
   - 기능 테스트
   - E2E 테스트 실행
   - 회귀 테스트 확인

4. **정리 (Cleanup)** 🧹
   - 불필요한 파일 삭제
   - 임시 파일 정리
   - 코드 최적화

## E2E 테스트 설정

### 기본 설정
- **테스트 서버 URL**: `http://localhost:4000/`
- **테스트 도구**: Playwright
- **포트 설정**: 개발 서버는 4000번 포트에서 실행

### 테스트 명령어
```bash
# 개발 서버 실행 (포트 4000)
npm run dev -- --port 4000

# E2E 테스트 실행
npx playwright test

# 특정 테스트 파일 실행
npx playwright test e2e/todolist.spec.ts
```

## 파일 관리 정책

### 생성 가이드라인
- 절대적으로 필요한 경우에만 새 파일 생성
- 기존 파일 수정을 우선적으로 고려
- 문서 파일(*.md)은 명시적 요청 시에만 생성

### 정리 프로세스
- 개발 완료 후 임시 파일 즉시 삭제
- 테스트 파일은 필요한 경우에만 유지
- 중복 코드 제거 및 통합

---

# Firebase 설정 정보

## 구글 로그인 설정 (2025-08-10)

### Firebase 프로젝트 정보
- **프로젝트 ID**: todolist-116f3
- **인증 도메인**: todolist-116f3.firebaseapp.com
- **데이터베이스 URL**: https://todolist-116f3-default-rtdb.asia-southeast1.firebasedatabase.app
- **스토리지 버킷**: todolist-116f3.firebasestorage.app

### Firebase 구성
```javascript
const firebaseConfig = {
  apiKey: "AIzaSyD8aBPw-o13mciSdV8gzRJN6TfaAy3OoWg",
  authDomain: "todolist-116f3.firebaseapp.com",
  databaseURL: "https://todolist-116f3-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "todolist-116f3",
  storageBucket: "todolist-116f3.firebasestorage.app",
  messagingSenderId: "470825187407",
  appId: "1:470825187407:web:4bd3f8c621c96890b2d23a",
  measurementId: "G-HS8CDYHDT1"
};
```

### 활성화된 인증 방법
- ✅ Google 로그인 (OAuth)
- ✅ 익명 로그인
- ✅ 이메일/비밀번호 (선택사항)

### 승인된 도메인
- localhost (개발용)
- todolist-116f3.firebaseapp.com (프로덕션용)

### 보안 규칙
```javascript
// Firestore 보안 규칙
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // 사용자별 데이터 접근 제어
    match /users/{userId}/todos/{document} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    match /users/{userId}/recurringTemplates/{document} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

---

# 최근 해결된 문제 (2025-08-14)

## 할일 삭제 문제 해결 ✅

### 문제 상황
- 구글 로그인 후 할일 삭제 시 UI에서는 사라지지만 새로고침하면 다시 나타남
- React 중복 키 오류 발생
- Firestore 실시간 구독에서 삭제 이벤트를 제대로 처리하지 못함

### 해결 방안
1. **Firestore 경로 통일**: 모든 todos 관련 함수를 `users/{uid}/todos` 경로로 통일
2. **실시간 구독 비활성화**: 문제가 있는 실시간 구독을 수동 로딩 방식으로 변경
3. **강화된 삭제 로직**: 삭제 후 즉시 수동 새로고침으로 데이터 동기화

### 수정된 파일
- `src/services/firestoreService.ts`: 모든 경로를 `users/{uid}/todos`로 통일
- `src/contexts/TodoContext.tsx`: 실시간 구독 비활성화, 수동 새로고침 시스템 구현

---

# important-instruction-reminders
Do what has been asked; nothing more, nothing less.
NEVER create files unless they're absolutely necessary for achieving your goal.
ALWAYS prefer editing an existing file to creating a new one.
NEVER proactively create documentation files (*.md) or README files. Only create documentation files if explicitly requested by the User.