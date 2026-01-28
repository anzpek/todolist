# 🚨 Firebase & React useEffect 무한 루프 방지 가이드

> **CRITICAL**: 이 규칙을 반드시 숙지하고 코드 작성 시 준수할 것

---

## ❌ 절대 하면 안 되는 패턴

### 1. useEffect dependency에 업데이트 대상 state 포함

```javascript
// ❌ 절대 금지 - 무한 루프 발생
useEffect(() => {
  const data = await fetchFromFirebase()
  dispatch({ type: 'SET_DATA', payload: data }) // state 변경
}, [state.data]) // 🔥 변경되는 state가 dependency에 있음!
```

**문제**: state 변경 → useEffect 재실행 → 다시 state 변경 → 무한 반복

### 2. Firestore 조회 + dispatch 조합

```javascript
// ❌ 절대 금지
useEffect(() => {
  const items = await firestoreService.getItems(uid) // Firebase 읽기
  dispatch({ type: 'SET_ITEMS', payload: items })
}, [state.items]) // 🔥 items가 바뀔 때마다 다시 읽음!
```

---

## ✅ 올바른 패턴

### 1. 실시간 구독(onSnapshot) 사용

```javascript
// ✅ 올바름 - 초기 구독 1회만 설정
useEffect(() => {
  const unsubscribe = firestoreService.subscribeItems(uid, (items) => {
    dispatch({ type: 'SET_ITEMS', payload: items })
  })
  return () => unsubscribe()
}, [uid]) // currentUser만 dependency
```

### 2. 초기 로드만 필요한 경우

```javascript
// ✅ 올바름 - 빈 dependency 또는 사용자 ID만
useEffect(() => {
  const loadData = async () => {
    const data = await fetchInitialData()
    setData(data)
  }
  loadData()
}, []) // 빈 배열 = 마운트 시 1회만 실행
```

### 3. 조건부 실행으로 무한 루프 방지

```javascript
// ✅ 올바름 - 이미 로드된 경우 스킵
useEffect(() => {
  if (dataLoaded) return // 이미 로드됨
  loadData()
}, [dataLoaded])
```

---

## 🔍 코드 리뷰 체크리스트

코드 작성/수정 시 반드시 확인:

- [ ] useEffect 내에서 Firebase 조회(getDocs, getDoc)가 있는가?
- [ ] 해당 useEffect의 dependency에 조회 결과와 연결된 state가 있는가?
- [ ] dispatch/setState 후 같은 useEffect가 다시 트리거되는가?

**위 3개 중 2개 이상 해당되면 무한 루프 위험!**

---

## 📊 비용 영향

| 상황 | 예상 읽기/일 | 비용 (Blaze) |
|------|-------------|-------------|
| 정상 사용 | 수백~수천 | $0 (무료 한도 내) |
| 무한 루프 1시간 | 수십만 | $0.03~$0.30 |
| 무한 루프 하루 | 수백만 | $3~$30+ |

---

## 🛡️ 안전 장치

1. **Firebase 예산 알림 설정** - $1 초과 시 이메일 알림
2. **개발 중 Network 탭 모니터링** - 반복 요청 감지
3. **console.log로 useEffect 실행 횟수 확인**

```javascript
useEffect(() => {
  console.log('🔄 useEffect 실행됨', new Date().toISOString())
  // ...
}, [deps])
```
