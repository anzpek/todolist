// Google Tasks 동기화 중복 방지를 위한 레지스트리
// 로컬에서 생성되어 구글로 Push된 태스크 ID를 임시 저장하여
// Auto-Sync가 이를 새로운 태스크로 착각하고 중복 Import하는 것을 방지함

export const syncRegistry = {
    // 최근 생성된 Google Task ID 집합
    _recentIds: new Set<string>(),

    // ID 등록 (유효기간 1분)
    register: (googleTaskId: string) => {
        syncRegistry._recentIds.add(googleTaskId)
        // 1분 후 자동 삭제 (메모리 정리)
        setTimeout(() => {
            syncRegistry._recentIds.delete(googleTaskId)
        }, 60000)
    },

    // ID 확인 (등록되어 있으면 true)
    has: (googleTaskId: string) => {
        return syncRegistry._recentIds.has(googleTaskId)
    }
}
