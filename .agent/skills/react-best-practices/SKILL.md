---
name: React Best Practices
description: Vercel의 React 및 Next.js 성능 최적화 가이드라인. 57개 규칙, 8개 카테고리, 영향도별 우선순위.
---

# Vercel React Best Practices

Vercel Engineering 팀이 관리하는 React 및 Next.js 애플리케이션 종합 성능 최적화 가이드.
**57개 규칙, 8개 카테고리, 영향도별 우선순위.**

## 적용 시점

다음 상황에서 이 가이드라인을 참조:
- 새 React 컴포넌트 또는 Next.js 페이지 작성
- 데이터 페칭 구현 (클라이언트/서버)
- 성능 이슈 코드 리뷰
- 기존 React/Next.js 코드 리팩토링
- 번들 크기 또는 로딩 시간 최적화

## 규칙 카테고리 (우선순위별)

| 우선순위 | 카테고리 | 영향도 | 접두사 |
|----------|----------|--------|--------|
| 1 | 워터폴 제거 | CRITICAL | `async-` |
| 2 | 번들 크기 최적화 | CRITICAL | `bundle-` |
| 3 | 서버 사이드 성능 | HIGH | `server-` |
| 4 | 클라이언트 데이터 페칭 | MEDIUM-HIGH | `client-` |
| 5 | 리렌더 최적화 | MEDIUM | `rerender-` |
| 6 | 렌더링 성능 | MEDIUM | `rendering-` |
| 7 | JavaScript 성능 | LOW-MEDIUM | `js-` |
| 8 | 고급 패턴 | LOW | `advanced-` |

---

## 🔴 1. 워터폴 제거 (CRITICAL)

### async-defer-await
await이 실제로 사용되는 분기로 이동

```typescript
// ❌ 잘못됨
async function getData() {
  const data = await fetchData() // 항상 대기
  if (condition) {
    return data
  }
  return null
}

// ✅ 올바름
async function getData() {
  if (condition) {
    const data = await fetchData() // 필요할 때만 대기
    return data
  }
  return null
}
```

### async-parallel
독립적인 작업에 Promise.all() 사용

```typescript
// ❌ 잘못됨 (직렬 실행)
const user = await getUser(id)
const posts = await getPosts(id)
const comments = await getComments(id)

// ✅ 올바름 (병렬 실행)
const [user, posts, comments] = await Promise.all([
  getUser(id),
  getPosts(id),
  getComments(id)
])
```

### async-suspense-boundaries
Suspense를 사용해 콘텐츠 스트리밍

```tsx
// ❌ 잘못됨: 전체 페이지가 데이터 대기
export default async function Page() {
  const data = await fetchSlowData()
  return <Component data={data} />
}

// ✅ 올바름: 느린 부분만 스트리밍
import { Suspense } from 'react'

export default function Page() {
  return (
    <Suspense fallback={<Loading />}>
      <SlowComponent />
    </Suspense>
  )
}
```

---

## 🔴 2. 번들 크기 최적화 (CRITICAL)

### bundle-barrel-imports
배럴 파일 피하고 직접 import

```typescript
// ❌ 잘못됨: 배럴 파일 (전체 모듈 로드)
import { Button } from '@/components'

// ✅ 올바름: 직접 import
import { Button } from '@/components/Button'
```

### bundle-dynamic-imports
무거운 컴포넌트에 next/dynamic 사용

```tsx
// ❌ 잘못됨: 항상 로드
import HeavyChart from './HeavyChart'

// ✅ 올바름: 필요할 때 로드
import dynamic from 'next/dynamic'
const HeavyChart = dynamic(() => import('./HeavyChart'), {
  loading: () => <ChartSkeleton />
})
```

### bundle-defer-third-party
분석/로깅은 hydration 후 로드

```tsx
// ❌ 잘못됨: 초기 번들에 포함
import { Analytics } from '@vercel/analytics'

// ✅ 올바름: 지연 로드
import dynamic from 'next/dynamic'
const Analytics = dynamic(
  () => import('@vercel/analytics').then(m => m.Analytics),
  { ssr: false }
)
```

---

## 🟠 3. 서버 사이드 성능 (HIGH)

### server-cache-react
요청별 중복 제거에 React.cache() 사용

```typescript
import { cache } from 'react'

// 같은 요청 내 중복 호출 방지
const getUser = cache(async (id: string) => {
  const res = await fetch(`/api/users/${id}`)
  return res.json()
})
```

### server-serialization
클라이언트 컴포넌트에 전달하는 데이터 최소화

```tsx
// ❌ 잘못됨: 전체 객체 전달
<ClientComponent user={user} />

// ✅ 올바름: 필요한 것만 전달
<ClientComponent 
  userName={user.name} 
  userAvatar={user.avatar} 
/>
```

### server-parallel-fetching
컴포넌트 구조화로 fetch 병렬화

```tsx
// ❌ 잘못됨: 직렬 워터폴
async function Page() {
  const data1 = await fetch1()
  const data2 = await fetch2(data1.id) // 의존성
  return <Component data1={data1} data2={data2} />
}

// ✅ 올바름: 독립적인 fetch 분리
async function Page() {
  return (
    <>
      <Suspense fallback={<Skeleton1 />}>
        <Component1 />
      </Suspense>
      <Suspense fallback={<Skeleton2 />}>
        <Component2 />
      </Suspense>
    </>
  )
}
```

---

## 🟡 4. 클라이언트 데이터 페칭 (MEDIUM-HIGH)

### client-swr-dedup
SWR로 자동 요청 중복 제거

```typescript
import useSWR from 'swr'

// 같은 키로 여러 컴포넌트에서 호출해도 1회만 fetch
function useUser(id: string) {
  return useSWR(`/api/users/${id}`, fetcher)
}
```

### client-passive-event-listeners
스크롤에 passive 리스너 사용

```typescript
// ❌ 잘못됨
element.addEventListener('scroll', handler)

// ✅ 올바름
element.addEventListener('scroll', handler, { passive: true })
```

---

## 🟡 5. 리렌더 최적화 (MEDIUM)

### rerender-defer-reads
콜백에서만 사용되는 상태 구독 피하기

```tsx
// ❌ 잘못됨: 불필요한 리렌더
function Component() {
  const [count, setCount] = useState(0)
  const onClick = () => console.log(count)
  return <button onClick={onClick}>Click</button>
}

// ✅ 올바름: ref 사용
function Component() {
  const countRef = useRef(0)
  const onClick = () => console.log(countRef.current)
  return <button onClick={onClick}>Click</button>
}
```

### rerender-dependencies
Effect에 원시값 의존성 사용

```tsx
// ❌ 잘못됨: 객체는 매번 새로운 참조
useEffect(() => {
  doSomething(user)
}, [user]) // user 객체가 변경될 때마다 실행

// ✅ 올바름: 원시값 사용
useEffect(() => {
  doSomething(userId)
}, [userId]) // userId가 변경될 때만 실행
```

### rerender-functional-setstate
안정적인 콜백을 위해 함수형 setState 사용

```tsx
// ❌ 잘못됨: count 의존성 필요
const increment = useCallback(() => {
  setCount(count + 1)
}, [count])

// ✅ 올바름: 의존성 불필요
const increment = useCallback(() => {
  setCount(prev => prev + 1)
}, [])
```

### rerender-lazy-state-init ⚠️ CRITICAL for Firebase
비용이 많이 드는 초기값에 함수 전달

```tsx
// ❌ 잘못됨: 매 렌더마다 실행
const [state] = useState(expensiveComputation())

// ✅ 올바름: 최초 1회만 실행
const [state] = useState(() => expensiveComputation())
```

---

## 🟡 6. 렌더링 성능 (MEDIUM)

### rendering-hoist-jsx
정적 JSX를 컴포넌트 외부로 추출

```tsx
// ❌ 잘못됨: 매 렌더마다 재생성
function Component() {
  return (
    <div>
      <Header />
      <StaticContent />
    </div>
  )
}

// ✅ 올바름: 모듈 레벨에서 정의
const staticContent = <StaticContent />

function Component() {
  return (
    <div>
      <Header />
      {staticContent}
    </div>
  )
}
```

### rendering-conditional-render
조건부 렌더링에 삼항 연산자 사용 (&&가 아닌)

```tsx
// ❌ 잘못됨: 0이 렌더될 수 있음
{count && <Component />}

// ✅ 올바름: 명시적 조건
{count > 0 ? <Component /> : null}
```

---

## 🟢 7. JavaScript 성능 (LOW-MEDIUM)

### js-index-maps
반복 조회에 Map 사용

```typescript
// ❌ 잘못됨: O(n) 조회
const user = users.find(u => u.id === id)

// ✅ 올바름: O(1) 조회
const userMap = new Map(users.map(u => [u.id, u]))
const user = userMap.get(id)
```

### js-combine-iterations
여러 filter/map을 하나의 루프로

```typescript
// ❌ 잘못됨: 3번 순회
const result = items
  .filter(x => x.active)
  .map(x => x.value)
  .filter(x => x > 0)

// ✅ 올바름: 1번 순회
const result = items.reduce((acc, x) => {
  if (x.active && x.value > 0) {
    acc.push(x.value)
  }
  return acc
}, [])
```

### js-early-exit
함수에서 일찍 반환

```typescript
// ❌ 잘못됨: 중첩된 조건
function process(data) {
  if (data) {
    if (data.valid) {
      // 처리
    }
  }
}

// ✅ 올바름: 일찍 반환
function process(data) {
  if (!data) return
  if (!data.valid) return
  // 처리
}
```

---

## 🔵 8. 고급 패턴 (LOW)

### advanced-event-handler-refs
이벤트 핸들러를 ref에 저장

```tsx
const handlerRef = useRef(handler)
handlerRef.current = handler

useEffect(() => {
  const listener = (e) => handlerRef.current(e)
  window.addEventListener('resize', listener)
  return () => window.removeEventListener('resize', listener)
}, []) // 의존성 불필요
```

### advanced-init-once
앱 로드 시 1회만 초기화

```typescript
let initialized = false

function initApp() {
  if (initialized) return
  initialized = true
  // 초기화 로직
}
```

---

## ⚠️ 이 프로젝트에 특히 중요한 규칙

### useEffect 무한 루프 방지 (CRITICAL)

```tsx
// ❌ 절대 금지: 무한 루프 발생
useEffect(() => {
  const data = await fetchFromFirebase()
  dispatch({ type: 'SET_DATA', payload: data })
}, [state.data]) // 변경되는 state가 dependency!

// ✅ 올바름: 초기 로드만
useEffect(() => {
  const data = await fetchFromFirebase()
  dispatch({ type: 'SET_DATA', payload: data })
}, []) // 빈 배열 또는 user ID만
```

### Firebase 실시간 구독 패턴

```tsx
// ✅ 올바름: 구독 1회만 설정
useEffect(() => {
  const unsubscribe = onSnapshot(query, (snapshot) => {
    const data = snapshot.docs.map(doc => doc.data())
    dispatch({ type: 'SET_DATA', payload: data })
  })
  return () => unsubscribe()
}, [currentUser?.uid]) // user 변경 시에만 재구독
```

---

## 참조

- [Vercel Agent Skills](https://github.com/vercel-labs/agent-skills)
- [React 공식 문서](https://react.dev)
- [Next.js 공식 문서](https://nextjs.org/docs)
