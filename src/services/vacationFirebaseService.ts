// 부서휴가관리 Firebase 서비스
import { initializeApp, getApps } from 'firebase/app';
import { getDatabase, ref, set, get, push, remove, onValue, off } from 'firebase/database';

// 부서휴가관리 Firebase 설정
const vacationFirebaseConfig = {
  apiKey: "AIzaSyCaQ6ndqGrR_x6fvTrZxdf5cHTNnRIj2Gg",
  authDomain: "busvacation-e894a.firebaseapp.com",
  databaseURL: "https://busvacation-e894a-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "busvacation-e894a",
  storageBucket: "busvacation-e894a.appspot.com",
  messagingSenderId: "919121046118",
  appId: "1:919121046118:web:033047c3f1bba2164e5ba7"
};

// 부서휴가관리 전용 Firebase 앱 초기화 (기존 TodoList Firebase와 분리)
const getVacationApp = () => {
  const existingApp = getApps().find(app => app.name === 'vacation-management');
  if (existingApp) {
    return existingApp;
  }
  return initializeApp(vacationFirebaseConfig, 'vacation-management');
};

const vacationApp = getVacationApp();
const vacationDb = getDatabase(vacationApp);

class VacationFirebaseService {
  constructor() {
    this.listeners = new Map();
  }

  private listeners: Map<string, any>;

  // Firebase 안전한 경로로 변환
  sanitizeDepartmentCode(departmentCode: string): string {
    try {
      return btoa(encodeURIComponent(departmentCode)).replace(/[/+=]/g, '_');
    } catch (error) {
      return departmentCode
        .replace(/[^a-zA-Z0-9]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '');
    }
  }

  // 부서별 데이터 경로 생성
  getDepartmentPath(departmentCode: string, dataType: string): string {
    const safeDepartmentCode = this.sanitizeDepartmentCode(departmentCode);
    return `departments/${safeDepartmentCode}/${dataType}`;
  }

  // 직원 데이터 관리
  async getEmployees(departmentCode: string) {
    const path = this.getDepartmentPath(departmentCode, 'employees');
    try {
      const snapshot = await get(ref(vacationDb, path));
      return snapshot.exists() ? snapshot.val() : [];
    } catch (error) {
      console.error(`❌ [${departmentCode}] 직원 데이터 읽기 실패:`, error);
      return [];
    }
  }

  async saveEmployees(departmentCode: string, employees: any[]) {
    const path = this.getDepartmentPath(departmentCode, 'employees');
    try {
      await set(ref(vacationDb, path), employees);
      console.log(`✅ [${departmentCode}] 직원 데이터 저장 완료`);
      return { success: true };
    } catch (error) {
      console.error(`❌ [${departmentCode}] 직원 데이터 저장 실패:`, error);
      return { success: false, error };
    }
  }

  // 휴가 데이터 관리
  async getVacations(departmentCode: string) {
    const path = this.getDepartmentPath(departmentCode, 'vacations');
    try {
      const snapshot = await get(ref(vacationDb, path));
      if (snapshot.exists()) {
        const data = snapshot.val();
        // Firebase 객체를 배열로 변환
        return Array.isArray(data) 
          ? data 
          : Object.keys(data || {}).map(key => ({
              ...data[key],
              id: key
            }));
      }
      return [];
    } catch (error) {
      console.error(`❌ [${departmentCode}] 휴가 데이터 읽기 실패:`, error);
      return [];
    }
  }

  async saveVacations(departmentCode: string, vacations: any[]) {
    const path = this.getDepartmentPath(departmentCode, 'vacations');
    try {
      await set(ref(vacationDb, path), vacations);
      console.log(`✅ [${departmentCode}] 휴가 데이터 저장 완료`);
      return { success: true };
    } catch (error) {
      console.error(`❌ [${departmentCode}] 휴가 데이터 저장 실패:`, error);
      return { success: false, error };
    }
  }

  // 단일 휴가 추가
  async addVacation(departmentCode: string, vacation: any) {
    const path = this.getDepartmentPath(departmentCode, 'vacations');
    try {
      const vacationsRef = ref(vacationDb, path);
      const newVacationRef = push(vacationsRef);
      const vacationWithId = {
        ...vacation,
        id: newVacationRef.key,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      
      await set(newVacationRef, vacationWithId);
      console.log(`✅ [${departmentCode}] 휴가 추가 완료:`, vacationWithId.id);
      return { success: true, vacation: vacationWithId };
    } catch (error) {
      console.error(`❌ [${departmentCode}] 휴가 추가 실패:`, error);
      return { success: false, error };
    }
  }

  // 휴가 수정
  async updateVacation(departmentCode: string, vacationId: string, updates: any) {
    const path = `${this.getDepartmentPath(departmentCode, 'vacations')}/${vacationId}`;
    try {
      const updateData = {
        ...updates,
        updatedAt: Date.now()
      };
      await set(ref(vacationDb, path), updateData);
      console.log(`✅ [${departmentCode}] 휴가 수정 완료:`, vacationId);
      return { success: true };
    } catch (error) {
      console.error(`❌ [${departmentCode}] 휴가 수정 실패:`, error);
      return { success: false, error };
    }
  }

  // 휴가 삭제
  async deleteVacation(departmentCode: string, vacationId: string) {
    const path = `${this.getDepartmentPath(departmentCode, 'vacations')}/${vacationId}`;
    try {
      await remove(ref(vacationDb, path));
      console.log(`✅ [${departmentCode}] 휴가 삭제 완료:`, vacationId);
      return { success: true };
    } catch (error) {
      console.error(`❌ [${departmentCode}] 휴가 삭제 실패:`, error);
      return { success: false, error };
    }
  }

  // 실시간 리스너 등록
  subscribeToVacations(departmentCode: string, callback: (vacations: any[]) => void) {
    const path = this.getDepartmentPath(departmentCode, 'vacations');
    const vacationsRef = ref(vacationDb, path);
    
    const unsubscribe = onValue(vacationsRef, (snapshot) => {
      const vacations = snapshot.exists() ? snapshot.val() : [];
      // Firebase 객체를 배열로 변환
      const vacationsArray = Array.isArray(vacations) 
        ? vacations 
        : Object.keys(vacations || {}).map(key => ({
            ...vacations[key],
            id: key
          }));
      callback(vacationsArray);
    });

    const listenerId = `vacations_${departmentCode}`;
    this.listeners.set(listenerId, { ref: vacationsRef, unsubscribe });
    
    return () => {
      unsubscribe();
      this.listeners.delete(listenerId);
    };
  }

  subscribeToEmployees(departmentCode: string, callback: (employees: any[]) => void) {
    const path = this.getDepartmentPath(departmentCode, 'employees');
    const employeesRef = ref(vacationDb, path);
    
    const unsubscribe = onValue(employeesRef, (snapshot) => {
      const employees = snapshot.exists() ? snapshot.val() : [];
      callback(employees);
    });

    const listenerId = `employees_${departmentCode}`;
    this.listeners.set(listenerId, { ref: employeesRef, unsubscribe });
    
    return () => {
      unsubscribe();
      this.listeners.delete(listenerId);
    };
  }

  // 연결 테스트
  async testConnection(): Promise<boolean> {
    try {
      const testRef = ref(vacationDb, 'connection_test');
      await set(testRef, { timestamp: Date.now(), test: true });
      
      const snapshot = await get(testRef);
      const isConnected = snapshot.exists() && snapshot.val().test === true;
      
      if (isConnected) {
        await remove(testRef);
      }
      
      console.log(`🔥 부서휴가관리 Firebase 연결 테스트 ${isConnected ? '성공' : '실패'}`);
      return isConnected;
    } catch (error) {
      console.error('부서휴가관리 Firebase 연결 테스트 실패:', error);
      return false;
    }
  }

  // 모든 리스너 정리
  cleanup() {
    console.log('🧹 부서휴가관리 Firebase 리스너 정리 중...');
    this.listeners.forEach(({ unsubscribe }, listenerId) => {
      unsubscribe();
      console.log(`✅ 리스너 정리됨: ${listenerId}`);
    });
    this.listeners.clear();
  }
}

// 싱글톤 인스턴스
const vacationFirebaseService = new VacationFirebaseService();
export default vacationFirebaseService;