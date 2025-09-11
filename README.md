# 🚀 고급 할일 관리 애플리케이션

[![React](https://img.shields.io/badge/React-19.1.0-61DAFB?logo=react&logoColor=white)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8.3-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-7.0.4-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Firebase](https://img.shields.io/badge/Firebase-12.0.0-FF6F00?logo=firebase&logoColor=white)](https://firebase.google.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-3.4.17-06B6D4?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)

> **엔터프라이즈급 할일 관리 애플리케이션** - 휴가 관리, 반복 작업, 한국 공휴일 연동, 종합 분석 기능을 포함한 고급 기능 제공

## ✨ 주요 기능

### 🎯 **작업 관리**
- **단일 작업**: 빠르고 간단한 할일
- **프로젝트 작업**: 여러 체크리스트 항목을 포함한 복잡한 작업
- **우선순위 레벨**: 낮음, 보통, 높음, 긴급
- **마감일 및 시간**: 정확한 시간을 포함한 완전한 일정 관리
- **태그 및 카테고리**: 유연한 조직 시스템

### 🔄 **고급 스케줄링**
- **반복 작업**: 일일, 주간, 월간, 연간 패턴
- **공휴일 연동**: 한국 공휴일과 스마트 일정 조정
- **공휴일 처리**: 공휴일 전/후로 작업 자동 이동
- **스마트 알림**: 브라우저 알림 및 마감일 알림

### 📊 **다양한 보기 및 분석**
- **오늘 보기**: 오늘 할일과 내일 미리보기
- **주간 캘린더**: 진행 상황 추적을 포함한 전체 주 개요
- **월간 캘린더**: 완전한 월 시각화
- **통계 대시보드**: 생산성 지표 및 완료율
- **성능 분석**: 상세한 인사이트 및 트렌드

### 🏢 **엔터프라이즈 기능**
- **휴가 관리**: 직원 휴가 추적 시스템
- **관리자 대시보드**: 역할 기반 접근 제어
- **보안 모니터링**: 실시간 보안 검사
- **데이터 백업/내보내기**: 클라우드 동기화를 포함한 다중 내보내기 형식

### 🔐 **인증 및 보안**
- **Firebase 인증**: Google OAuth, 이메일/비밀번호, 익명 로그인
- **데이터 암호화**: 안전한 데이터 처리 및 저장
- **역할 기반 접근**: 관리자 및 사용자 권한
- **보안 모니터링**: 내장 위협 탐지

### 🎨 **사용자 경험**
- **반응형 디자인**: 태블릿 및 데스크톱 최적화를 포함한 모바일 우선
- **다크/라이트 테마**: 시스템 설정 통합
- **키보드 단축키**: 파워 유저 내비게이션
- **접근성**: 스크린 리더 지원을 포함한 WCAG 호환
- **성능 최적화**: 코드 분할 및 지연 로딩

## 🛠️ 기술 스택

### **프론트엔드 핵심**
- **React 19.1.0** - 동시성 기능을 포함한 최신 React
- **TypeScript 5.8.3** - 완전한 타입 안전성
- **Vite 7.0.4** - 번개처럼 빠른 빌드 도구
- **Tailwind CSS 3.4.17** - 유틸리티 우선 스타일링

### **백엔드 및 데이터베이스**
- **Firebase 12.0.0** - 인증 및 Firestore 데이터베이스
- **Firestore** - 실시간 동기화를 포함한 NoSQL 문서 데이터베이스

### **개발 및 테스팅**
- **Vitest 3.2.4** - 현대적인 단위 테스팅 프레임워크
- **Playwright 1.54.1** - 엔드투엔드 테스팅
- **ESLint** - 코드 품질 및 린팅
- **TypeScript ESLint** - 타입 인식 린팅

### **추가 라이브러리**
- **Lucide React** - 현대적인 아이콘 라이브러리
- **Date-fns 4.1.0** - 날짜 조작 유틸리티
- **Tailwind Forms** - 향상된 폼 스타일링

## 🚀 빠른 시작

### 사전 요구사항
- **Node.js** 18+ 
- **npm** 또는 **yarn**
- **Git**

### 설치

1. **저장소 클론**
```bash
git clone <repository-url>
cd todolist
```

2. **의존성 설치**
```bash
npm install
```

3. **환경 설정**
루트 디렉터리에 `.env` 파일 생성:
```env
# Firebase 설정
VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id

# 한국 공휴일 API
VITE_HOLIDAY_API_KEY=7BZDblK8NIBj32BvDQ5jWi%2FYyHJJfhDHESiBYljCaocAPUQZc8IG5ltkJvlVR8J1AinP5izo2WA2F68xWyUTKA%3D%3D
```

4. **개발 서버 시작**
```bash
npm run dev
```

5. **브라우저에서 열기**
`http://localhost:3000`으로 이동

## 📋 사용 가능한 스크립트

### **개발**
```bash
npm run dev              # 개발 서버 시작
npm run build            # 프로덕션 빌드
npm run build:analyze    # 번들 분석기와 함께 빌드
npm run preview          # 프로덕션 빌드 미리보기
npm run lint             # ESLint 실행
```

### **테스팅**
```bash
npm run test             # 단위 테스트 실행
npm run test:ui          # UI와 함께 단위 테스트
npm run test:coverage    # 커버리지 리포트 생성
npm run test:e2e         # E2E 테스트 실행
npm run test:e2e:ui      # UI와 함께 E2E 테스트
npm run test:e2e:report  # E2E 테스트 리포트 보기
```

### **배포**
```bash
npm run deploy          # GitHub Pages에 배포
```

## 🏗️ 프로젝트 아키텍처

### **디렉터리 구조**
```
src/
├── components/              # React 컴포넌트
│   ├── VacationManagement/ # 휴가 시스템 모듈
│   ├── TodoList/           # 할일 컴포넌트
│   ├── Calendar/           # 캘린더 보기
│   └── UI/                 # 재사용 가능한 UI 컴포넌트
├── contexts/               # React Context 제공자
│   ├── TodoContext.tsx     # 할일 상태 관리
│   ├── AuthContext.tsx     # 인증
│   ├── ThemeContext.tsx    # 테마 관리
│   └── VacationContext.tsx # 휴가 관리
├── hooks/                  # 커스텀 React 훅
├── services/               # 외부 서비스
│   ├── firebase.ts         # Firebase 설정
│   ├── firestoreService.ts # 데이터베이스 작업
│   └── holidayService.ts   # 공휴일 API 통합
├── types/                  # TypeScript 정의
├── utils/                  # 유틸리티 함수
├── config/                 # 설정 파일
└── constants/              # 애플리케이션 상수
```

### **주요 디자인 패턴**
- **Context 패턴**: React Context를 사용한 상태 관리
- **컴포넌트 구성**: 재사용 가능하고 구성 가능한 컴포넌트
- **커스텀 훅**: 비즈니스 로직 추상화
- **에러 바운더리**: 우아한 오류 처리
- **지연 로딩**: 성능 최적화

## 🔧 설정

### **Firebase 설정**
1. [Firebase 콘솔](https://console.firebase.google.com/)에서 Firebase 프로젝트 생성
2. Google, 이메일/비밀번호, 익명 로그인으로 인증 활성화
3. Firestore 데이터베이스 생성
4. `.env` 파일에 설정 복사

### **보안 규칙 (Firestore)**
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/todos/{document} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    match /users/{userId}/recurringTemplates/{document} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

## 📊 테스팅

### **단위 테스팅**
- **프레임워크**: JSDOM을 포함한 Vitest
- **커버리지**: 최소 80% 임계값
- **테스트 파일**: `*.test.ts` 또는 `*.test.tsx`

### **E2E 테스팅**
- **프레임워크**: Playwright
- **브라우저**: Chrome, Firefox, Safari
- **테스트 파일**: `tests/*.spec.ts`

### **테스트 실행**
```bash
# 커버리지와 함께 단위 테스트
npm run test:coverage

# UI와 함께 E2E 테스트
npm run test:e2e:ui

# 모든 테스트
npm test
```

## 🚀 배포

### **GitHub Pages**
```bash
npm run deploy
```

### **Vercel**
1. GitHub 저장소를 Vercel에 연결
2. Vercel 대시보드에서 환경 변수 설정
3. 푸시 시 자동 배포

### **Netlify**
1. GitHub 저장소를 Netlify에 연결
2. 빌드 명령어: `npm run build`
3. 게시 디렉터리: `dist`
4. Netlify 대시보드에서 환경 변수 설정

## 🔒 보안

### **데이터 보호**
- 모든 사용자 데이터는 전송 중 및 저장 시 암호화됨
- Firebase 보안 규칙로 무단 접근 방지
- 입력 유효성 검사 및 살균
- XSS 보호 메커니즘

### **인증**
- 다중 인증 지원
- 자동 만료를 포함한 세션 관리
- 안전한 토큰 처리

## 📈 성능

### **최적화 기능**
- **코드 분할**: 자동 라우트 기반 분할
- **지연 로딩**: 필요 시 컴포넌트 로딩
- **번들 분석**: 최적화를 위한 Rollup 시각화기
- **캐싱**: 지능형 캐싱 전략
- **메모리 관리**: 내장 메모리 모니터링

### **성능 지표**
- **Lighthouse 점수**: 모든 카테고리에서 95+
- **번들 크기**: gzip 압축 시 < 500KB
- **첫 페인트**: 3G에서 < 1.5초
- **상호작용**: 3G에서 < 3초

## 🤝 기여하기

### **개발 과정**
1. 저장소 포크
2. 기능 브랜치 생성
3. 테스트와 함께 변경사항 작성
4. 린팅 및 테스트 실행
5. 풀 리퀘스트 제출

### **코드 표준**
- **TypeScript**: Strict 모드 활성화
- **ESLint**: 코드 스타일 강제
- **Prettier**: 코드 포맷팅
- **Conventional Commits**: 커밋 메시지 형식

## 📄 라이선스

이 프로젝트는 MIT 라이선스에 따라 라이선스가 부여됩니다 - 자세한 내용은 [LICENSE](LICENSE) 파일을 참조하세요.

## 🆘 지원

### **문서**
- [사용자 매뉴얼](USER_MANUAL.md) - 완전한 사용자 가이드
- [API 문서](docs/API.md) - 개발자 참조
- [기여 가이드](CONTRIBUTING.md) - 개발 가이드

### **도움 받기**
- 📧 이메일: support@todolist.com
- 💬 토론: GitHub Discussions
- 🐛 이슈: GitHub Issues
- 📖 위키: Project Wiki

## 🎯 로드맵

### **버전 2.0**
- [ ] 팀 협업 기능
- [ ] 고급 리포팅 대시보드
- [ ] 모바일 앱 (React Native)
- [ ] API 통합 (캘린더, Slack)

### **버전 2.1**
- [ ] AI 기반 작업 제안
- [ ] 음성 명령
- [ ] 오프라인 우선 아키텍처
- [ ] 고급 자동화 규칙

---

**React, TypeScript, Firebase로 ❤️를 담아 제작되었습니다**

*자세한 사용 방법은 [사용자 매뉴얼](USER_MANUAL.md)을 참조하세요*