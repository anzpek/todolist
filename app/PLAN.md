# 📱 모바일 앱 개발 계획 (Mobile App Implementation Plan)

이 문서는 기존 웹 애플리케이션(`https://anzpek.github.io/todolist/`)을 모바일 앱으로 변환하고, 알림 기능을 연동하기 위한 계획을 기술합니다.

## 1. 개요 및 가능성 확인

### 1.1 가능성 여부: **"가능합니다 (Possible)"**
- 기존 웹사이트를 모바일 앱(Android/iOS) 내의 **WebView**에 띄우는 방식으로 개발이 가능합니다.
- 이 방식을 **"하이브리드 앱 (Hybrid App)"** 또는 **"웹뷰 래퍼 (WebView Wrapper)"**라고 합니다.

### 1.2 핵심 요구사항 분석
1.  **URL 접속 방식**: `https://anzpek.github.io/todolist/`를 로딩.
2.  **알림(Notification)**: 웹에서 발생하는 알림을 앱에서도 수신.
3.  **효율성**: 기존 코드를 건드리지 않고 `app` 폴더 내에서만 작업.

---

## 2. 기술적 접근 방식 (Technical Strategy)

가장 효율적이고 확장성 있는 도구인 **Capacitor**를 사용하는 것을 추천합니다.

### 2.1 Capacitor 선정 이유
- **Web-First**: 웹 개발자가 가장 쉽게 접근할 수 있습니다.
- **Native Bridge**: 웹 코드(JavaScript)와 네이티브 기능(알림, 카메라 등)을 쉽게 연결해줍니다.
- **유연성**: 단순 URL 로딩 방식과, 추후 소스 임베딩 방식 모두 지원합니다.

### 2.2 알림(Notification) 구현 전략
웹사이트가 이미 Firebase(FCM)를 사용 중이라면, 두 가지 접근법이 있습니다.

| 방식 | 설명 | 장점 | 단점 |
| :--- | :--- | :--- | :--- |
| **A. PWA 방식 (웹 표준)** | 웹 브라우저의 알림 API 사용 | 구현이 매우 간단 | iOS의 경우 홈 화면에 "설치"해야만 알림 동작 가능성이 높음 (버전 의존적) |
| **B. 네이티브 플러그인 (추천)** | Capacitor `PushNotifications` 플러그인 사용 | **가장 확실하고 안정적인 알림 수신** | 외부 URL 로딩 시 네이티브 코드와 통신(Bridge) 설정이 다소 까다로움 |

**💡 결론**:
일단 **방식 A(웹 표준 알림)**가 작동하는지 확인하고, 더 강력한 알림이 필요하면 **방식 B**로 고도화하는 단계를 제안합니다. 다만, "URL 접속 방식"에서는 보안 정책상 네이티브 플러그인 연동에 제약이 있을 수 있어, 장기적으로는 **"Local Build(소스를 앱에 포함)"** 방식을 권장합니다. (현재는 URL 접속 방식으로 진행)

---

## 3. 단계별 실행 계획 (Roadmap)

`app` 폴더 내부에서 독립적으로 진행됩니다.

### ✅ 1단계: 프로젝트 초기화 (Setup)
1.  `app` 폴더 내에 새로운 Capacitor 프로젝트 생성
2.  Android/iOS 플랫폼 추가 (Windows 환경이므로 Android 우선 타겟팅)
3.  기본 설정(`capacitor.config.ts`)에서 `server.url`을 기존 웹사이트로 지정

### ✅ 2단계: 안드로이드 스튜디오 연동 (Implementation)
1.  앱의 권한 설정 (`AndroidManifest.xml`) - 인터넷, 알림 권한 등
2.  알림 처리를 위한 기본 코드 작성

### ✅ 3단계: 테스트 및 검증 (Verification)
1.  에뮬레이터 또는 실제 기기에서 앱 실행
2.  웹사이트 로딩 속도 및 UI 최적화 확인
3.  알림 수신 테스트

---

## 4. 폴더 구조 예상 (app 폴더)

```
todolist/
├── app/
│   ├── capacitor.config.ts  (설정 파일)
│   ├── package.json         (앱 종속성)
│   ├── android/             (안드로이드 네이티브 프로젝트)
│   └── www/                 (빈 껍데기, URL 로딩 시엔 비워둠)
├── src/                     (기존 소스 - 건드리지 않음)
└── ...
```

## 5. 시작하기 위한 명령어 (참고용)

다음 단계에서 실행할 명령어들입니다:

```bash
# 1. app 폴더로 이동
cd app

# 2. Capacitor 프로젝트 생성 (npm 사용)
npm init -y
npm install @capacitor/core @capacitor/cli @capacitor/android

# 3. 초기화
npx cap init TodoApp com.example.todoapp

# 4. 설정 변경 (capacitor.config.ts에서 url 설정)

# 5. 안드로이드 플랫폼 추가
npx cap add android

# 6. IDE 열기 (안드로이드 스튜디오 필요)
npx cap open android
```
