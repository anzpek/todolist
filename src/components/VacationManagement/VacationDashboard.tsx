import React, { useState, useEffect } from 'react';
import { Plus, Filter, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { isAdmin } from '../../constants/admin';
import vacationFirebaseService from '../../services/vacationFirebaseService';
import VacationCalendar from './VacationCalendar';
import VacationModal from './VacationModal';

interface Employee {
  id: number;
  name: string;
  team: string;
  position: string;
  color: string;
}

interface Vacation {
  id: string;
  employeeId: number;
  date: string;
  type: string;
  createdAt: number;
  updatedAt: number;
}


const VacationDashboard: React.FC = () => {
  const { currentUser } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [vacations, setVacations] = useState<Vacation[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedVacation, setSelectedVacation] = useState<Vacation | null>(null);
  
  // 체크박스 필터 상태
  const [filters, setFilters] = useState({
    selectedEmployees: [] as number[], // 선택된 직원 ID 배열
    vacationTypes: {
      연차: true,
      오전: true,
      오후: true,
      특별: true,
      병가: true
    },
    dateRange: 'all' as 'all' | 'thisMonth' | 'lastMonth' | 'thisYear' | 'custom',
    startDate: '',
    endDate: ''
  });
  const [showFilters, setShowFilters] = useState(false);

  // 관리자 권한 확인
  if (!isAdmin(currentUser?.email)) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-6xl mb-4">🔒</div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
            접근 권한이 없습니다
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            관리자만 휴가 관리 기능을 사용할 수 있습니다.
          </p>
        </div>
      </div>
    );
  }

  // 데이터 로드
  const loadData = async () => {
    setLoading(true);
    try {
      const [employeesData, vacationsData] = await Promise.all([
        vacationFirebaseService.getEmployees('보상지원부'),
        vacationFirebaseService.getVacations('보상지원부')
      ]);

      setEmployees(employeesData);
      setVacations(vacationsData);
    } catch (error) {
      console.error('데이터 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  // 필터링된 휴가 데이터 계산
  const getFilteredVacations = (vacationsData: Vacation[]) => {
    return vacationsData.filter(vacation => {
      // 직원 필터 - 선택된 직원이 있으면 해당 직원만, 없으면 모든 직원
      if (filters.selectedEmployees.length > 0 && !filters.selectedEmployees.includes(vacation.employeeId)) {
        return false;
      }
      
      // 휴가 유형 필터 - 체크된 유형만 표시
      if (!filters.vacationTypes[vacation.type as keyof typeof filters.vacationTypes]) {
        return false;
      }
      
      // 날짜 범위 필터
      const vacationDate = new Date(vacation.date);
      const now = new Date();
      
      if (filters.dateRange !== 'all') {
        switch (filters.dateRange) {
          case 'thisMonth':
            if (vacationDate.getMonth() !== now.getMonth() || vacationDate.getFullYear() !== now.getFullYear()) {
              return false;
            }
            break;
          case 'lastMonth':
            const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1);
            if (vacationDate.getMonth() !== lastMonth.getMonth() || vacationDate.getFullYear() !== lastMonth.getFullYear()) {
              return false;
            }
            break;
          case 'thisYear':
            if (vacationDate.getFullYear() !== now.getFullYear()) {
              return false;
            }
            break;
          case 'custom':
            if (filters.startDate && vacationDate < new Date(filters.startDate)) {
              return false;
            }
            if (filters.endDate && vacationDate > new Date(filters.endDate)) {
              return false;
            }
            break;
        }
      }
      
      return true;
    });
  };

  // 필터 초기화
  const resetFilters = () => {
    setFilters({
      selectedEmployees: [],
      vacationTypes: {
        연차: true,
        오전: true,
        오후: true,
        특별: true,
        병가: true
      },
      dateRange: 'all',
      startDate: '',
      endDate: ''
    });
  };

  // 직원 선택/해제
  const toggleEmployee = (employeeId: number) => {
    setFilters(prev => ({
      ...prev,
      selectedEmployees: prev.selectedEmployees.includes(employeeId)
        ? prev.selectedEmployees.filter(id => id !== employeeId)
        : [...prev.selectedEmployees, employeeId]
    }));
  };

  // 모든 직원 선택/해제
  const toggleAllEmployees = () => {
    setFilters(prev => ({
      ...prev,
      selectedEmployees: prev.selectedEmployees.length === employees.length 
        ? [] 
        : employees.map(emp => emp.id)
    }));
  };

  // 휴가 유형 토글
  const toggleVacationType = (type: keyof typeof filters.vacationTypes) => {
    setFilters(prev => ({
      ...prev,
      vacationTypes: {
        ...prev.vacationTypes,
        [type]: !prev.vacationTypes[type]
      }
    }));
  };

  // 휴가 추가
  const handleAddVacation = () => {
    setSelectedVacation(null);
    setIsModalOpen(true);
  };

  // 휴가 수정
  const handleEditVacation = (vacation: Vacation) => {
    setSelectedVacation(vacation);
    setIsModalOpen(true);
  };

  // 휴가 삭제
  const handleDeleteVacation = async (vacationId: string) => {
    if (!confirm('정말로 이 휴가를 삭제하시겠습니까?')) return;

    try {
      await vacationFirebaseService.deleteVacation('보상지원부', vacationId);
      await loadData(); // 데이터 새로고침
    } catch (error) {
      console.error('휴가 삭제 실패:', error);
      alert('휴가 삭제 중 오류가 발생했습니다.');
    }
  };

  // 모달 저장
  const handleModalSave = async (vacationData: any) => {
    try {
      if (selectedVacation) {
        // 수정
        await vacationFirebaseService.updateVacation('보상지원부', selectedVacation.id, vacationData);
      } else {
        // 추가
        await vacationFirebaseService.addVacation('보상지원부', vacationData);
      }
      
      setIsModalOpen(false);
      await loadData(); // 데이터 새로고침
    } catch (error) {
      console.error('휴가 저장 실패:', error);
      alert('휴가 저장 중 오류가 발생했습니다.');
    }
  };

  // 컴포넌트 마운트 시 데이터 로드
  useEffect(() => {
    loadData();
  }, []);


  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600 dark:text-gray-400">데이터 로드 중...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            휴가 관리
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            보상지원부 휴가 현황을 관리합니다
          </p>
        </div>
        <button
          onClick={handleAddVacation}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4 mr-2" />
          휴가 추가
        </button>
      </div>


      {/* 필터 섹션 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">필터</h3>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
            >
              {showFilters ? '숨기기' : '표시'}
            </button>
          </div>
          {(filters.selectedEmployees.length > 0 || !Object.values(filters.vacationTypes).every(v => v)) && (
            <button
              onClick={resetFilters}
              className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <X className="h-4 w-4" />
              초기화
            </button>
          )}
        </div>

        {showFilters && (
          <div className="flex flex-wrap gap-4">
            {/* 직원 필터 */}
            <div className="flex-1 min-w-[300px]">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  직원 필터
                </label>
                <button
                  onClick={toggleAllEmployees}
                  className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  {filters.selectedEmployees.length === employees.length ? '전체 해제' : '전체 선택'}
                </button>
              </div>
              <div className="flex flex-wrap gap-2 p-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700">
                {employees.map(employee => (
                  <label key={employee.id} className="flex items-center space-x-1.5 cursor-pointer hover:bg-white dark:hover:bg-gray-600 p-1.5 rounded text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600">
                    <input
                      type="checkbox"
                      checked={filters.selectedEmployees.includes(employee.id)}
                      onChange={() => toggleEmployee(employee.id)}
                      className="w-3 h-3 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                    />
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: employee.color }}
                    />
                    <span className="text-gray-900 dark:text-gray-100">{employee.name}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* 휴가 유형 필터 */}
            <div className="flex-shrink-0">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                휴가 유형
              </label>
              <div className="flex flex-wrap gap-2 p-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700">
                {Object.entries(filters.vacationTypes).map(([type, checked]) => (
                  <label key={type} className="flex items-center space-x-1.5 cursor-pointer hover:bg-white dark:hover:bg-gray-600 p-1.5 rounded text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleVacationType(type as keyof typeof filters.vacationTypes)}
                      className="w-3 h-3 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                    />
                    <span className="text-gray-900 dark:text-gray-100">{type}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 캘린더 뷰 */}
      <VacationCalendar
        employees={employees}
        vacations={getFilteredVacations(vacations)}
        onEditVacation={handleEditVacation}
        onDeleteVacation={handleDeleteVacation}
      />

      {/* 휴가 추가/수정 모달 */}
      {isModalOpen && (
        <VacationModal
          employees={employees}
          vacation={selectedVacation}
          onSave={handleModalSave}
          onCancel={() => setIsModalOpen(false)}
        />
      )}
    </div>
  );
};

export default VacationDashboard;