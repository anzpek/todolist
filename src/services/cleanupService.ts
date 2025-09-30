/**
 * Firebase 데이터 정리 서비스
 * 고아 인스턴스 및 불필요한 데이터 정리
 */

import {
  collection,
  query,
  where,
  getDocs,
  writeBatch,
  doc,
  getDoc
} from 'firebase/firestore'
import { db } from '../config/firebase'

interface CleanupResult {
  orphanedInstances: number
  orphanedTodos: number
  totalCleaned: number
}

export const cleanupService = {
  /**
   * 고아 인스턴스 정리 (삭제된 템플릿의 인스턴스들)
   */
  cleanupOrphanedInstances: async (uid: string): Promise<CleanupResult> => {
    try {
      console.log('🧹 고아 인스턴스 정리 시작')

      // 1. 모든 활성 템플릿 ID 가져오기
      const templatesRef = collection(db, `users/${uid}/recurringTemplates`)
      const templatesSnapshot = await getDocs(templatesRef)
      const activeTemplateIds = new Set<string>()

      templatesSnapshot.forEach(doc => {
        activeTemplateIds.add(doc.id)
      })

      console.log(`활성 템플릿: ${activeTemplateIds.size}개`)

      // 2. 모든 인스턴스 확인
      const instancesRef = collection(db, `users/${uid}/recurringInstances`)
      const instancesSnapshot = await getDocs(instancesRef)
      const orphanedInstances: string[] = []

      instancesSnapshot.forEach(doc => {
        const data = doc.data()
        if (!activeTemplateIds.has(data.templateId)) {
          orphanedInstances.push(doc.id)
          console.log(`고아 인스턴스 발견: ${doc.id} (템플릿: ${data.templateId})`)
        }
      })

      // 3. 고아 할일들 찾기
      const todosRef = collection(db, `users/${uid}/todos`)
      const todosSnapshot = await getDocs(todosRef)
      const orphanedTodos: string[] = []

      todosSnapshot.forEach(doc => {
        const data = doc.data()
        if (data._templateId && !activeTemplateIds.has(data._templateId)) {
          orphanedTodos.push(doc.id)
          console.log(`고아 할일 발견: ${data.title} (템플릿: ${data._templateId})`)
        }
      })

      // 4. 배치로 삭제
      if (orphanedInstances.length > 0 || orphanedTodos.length > 0) {
        const batch = writeBatch(db)

        // 고아 인스턴스 삭제
        orphanedInstances.forEach(instanceId => {
          const instanceRef = doc(db, `users/${uid}/recurringInstances`, instanceId)
          batch.delete(instanceRef)
        })

        // 고아 할일 삭제
        orphanedTodos.forEach(todoId => {
          const todoRef = doc(db, `users/${uid}/todos`, todoId)
          batch.delete(todoRef)
        })

        await batch.commit()
        console.log(`✅ 정리 완료: 인스턴스 ${orphanedInstances.length}개, 할일 ${orphanedTodos.length}개`)
      } else {
        console.log('✅ 정리할 고아 데이터가 없습니다')
      }

      return {
        orphanedInstances: orphanedInstances.length,
        orphanedTodos: orphanedTodos.length,
        totalCleaned: orphanedInstances.length + orphanedTodos.length
      }

    } catch (error) {
      console.error('❌ 고아 인스턴스 정리 실패:', error)
      throw error
    }
  },

  /**
   * 템플릿별 데이터 정합성 확인
   */
  validateTemplateConsistency: async (uid: string) => {
    try {
      console.log('🔍 템플릿 데이터 정합성 확인 시작')

      // 1. 모든 템플릿과 인스턴스 가져오기
      const templatesRef = collection(db, `users/${uid}/recurringTemplates`)
      const templatesSnapshot = await getDocs(templatesRef)

      const instancesRef = collection(db, `users/${uid}/recurringInstances`)
      const instancesSnapshot = await getDocs(instancesRef)

      const todosRef = collection(db, `users/${uid}/todos`)
      const todosSnapshot = await getDocs(todosRef)

      // 2. 템플릿별 통계
      const templateStats = new Map<string, {
        templateTitle: string
        instances: number
        todos: number
        isActive: boolean
      }>()

      // 템플릿 정보 수집
      templatesSnapshot.forEach(doc => {
        const data = doc.data()
        templateStats.set(doc.id, {
          templateTitle: data.title,
          instances: 0,
          todos: 0,
          isActive: data.isActive !== false
        })
      })

      // 인스턴스 개수 세기
      instancesSnapshot.forEach(doc => {
        const data = doc.data()
        const templateId = data.templateId
        if (templateStats.has(templateId)) {
          templateStats.get(templateId)!.instances++
        }
      })

      // 할일 개수 세기
      todosSnapshot.forEach(doc => {
        const data = doc.data()
        const templateId = data._templateId
        if (templateId && templateStats.has(templateId)) {
          templateStats.get(templateId)!.todos++
        }
      })

      // 3. 결과 출력
      console.log('\n📊 템플릿별 데이터 현황:')
      console.log('=' .repeat(60))

      templateStats.forEach((stats, templateId) => {
        console.log(`${stats.templateTitle} (${templateId}):`)
        console.log(`  활성: ${stats.isActive}`)
        console.log(`  인스턴스: ${stats.instances}개`)
        console.log(`  할일: ${stats.todos}개`)

        if (stats.instances > 0 && stats.todos === 0) {
          console.log(`  ⚠️ 문제: 인스턴스만 있고 실제 할일 없음`)
        }
        console.log('')
      })

      return templateStats

    } catch (error) {
      console.error('❌ 데이터 정합성 확인 실패:', error)
      throw error
    }
  },

  /**
   * 전체 인스턴스 재생성 (주의: 기존 완료 상태 초기화)
   */
  regenerateAllInstances: async (uid: string) => {
    try {
      console.log('🔄 전체 인스턴스 재생성 시작')

      // 1. 모든 기존 인스턴스 삭제
      const instancesRef = collection(db, `users/${uid}/recurringInstances`)
      const instancesSnapshot = await getDocs(instancesRef)

      const batch = writeBatch(db)
      instancesSnapshot.forEach(doc => {
        batch.delete(doc.ref)
      })

      await batch.commit()
      console.log(`✅ 기존 인스턴스 ${instancesSnapshot.size}개 삭제 완료`)

      // 2. 활성 템플릿들에 대해 인스턴스 재생성 트리거
      // (실제 재생성은 useEffect에서 감지하여 자동으로 처리됨)
      console.log('💡 페이지를 새로고침하면 활성 템플릿의 인스턴스가 자동 재생성됩니다')

    } catch (error) {
      console.error('❌ 인스턴스 재생성 실패:', error)
      throw error
    }
  },

  /**
   * 스마트 인스턴스 정리: 완료된 인스턴스와 고아 인스턴스만 정리
   */
  smartCleanupInstances: async (uid: string) => {
    try {
      console.log('🧹 스마트 인스턴스 정리 시작')
      console.log('완료된 인스턴스와 고아 인스턴스만 정리합니다...')

      // 1. 현재 활성 템플릿들 가져오기
      const templatesRef = collection(db, `users/${uid}/recurringTemplates`)
      const templatesSnapshot = await getDocs(templatesRef)
      const activeTemplateIds = new Set<string>()

      templatesSnapshot.forEach(doc => {
        const data = doc.data()
        if (data.isActive !== false) { // isActive가 false가 아닌 모든 템플릿
          activeTemplateIds.add(doc.id)
          console.log(`활성 템플릿: ${data.title} (${doc.id})`)
        }
      })

      console.log(`활성 템플릿: ${activeTemplateIds.size}개`)

      // 2. 정리할 인스턴스들 찾기 (완료된 것 + 고아 인스턴스)
      console.log('2️⃣ 정리 대상 인스턴스 검색 중...')
      const instancesRef = collection(db, `users/${uid}/recurringInstances`)
      const instancesSnapshot = await getDocs(instancesRef)

      const instancesToDelete: string[] = []
      const keptInstances: string[] = []

      instancesSnapshot.forEach(doc => {
        const data = doc.data()
        const templateId = data.templateId
        const isCompleted = data.completed === true
        const isOrphan = !activeTemplateIds.has(templateId)

        // 고아 인스턴스만 삭제 (가장 안전함)
        if (isOrphan) {
          instancesToDelete.push(doc.id)
        } else {
          // 활성 템플릿의 인스턴스는 모두 유지 (완료 여부 관계없이)
          keptInstances.push(doc.id)
        }
      })

      console.log(`📊 정리 결과: 삭제 ${instancesToDelete.length}개, 유지 ${keptInstances.length}개`)

      // 3. 배치 삭제 실행
      if (instancesToDelete.length > 0) {
        console.log('3️⃣ 선별된 인스턴스들 삭제 중...')

        const batches = []
        let batch = writeBatch(db)
        let batchCount = 0

        instancesToDelete.forEach(instanceId => {
          const instanceRef = doc(db, `users/${uid}/recurringInstances`, instanceId)
          batch.delete(instanceRef)
          batchCount++

          if (batchCount >= 500) {
            batches.push(batch)
            batch = writeBatch(db)
            batchCount = 0
          }
        })

        if (batchCount > 0) {
          batches.push(batch)
        }

        // 모든 배치 실행
        for (let i = 0; i < batches.length; i++) {
          await batches[i].commit()
          console.log(`배치 ${i + 1}/${batches.length} 삭제 완료`)
        }

        console.log(`✅ 총 ${instancesToDelete.length}개 인스턴스 삭제 완료`)
      } else {
        console.log('삭제할 인스턴스가 없습니다')
      }

      console.log(`✅ 스마트 정리 완료!`)
      console.log(`- 활성 템플릿: ${activeTemplateIds.size}개`)
      console.log(`- 삭제된 인스턴스: ${instancesToDelete.length}개`)
      console.log(`- 유지된 인스턴스: ${keptInstances.length}개`)
      console.log(`- 총 인스턴스: ${instancesSnapshot.size}개`)

      return {
        activeTemplates: activeTemplateIds.size,
        deletedInstances: instancesToDelete.length,
        keptInstances: keptInstances.length,
        totalInstances: instancesSnapshot.size
      }

    } catch (error) {
      console.error('❌ 대량 인스턴스 정리 실패:', error)
      throw error
    }
  }
}