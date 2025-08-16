import React, { useState, useEffect } from 'react';
import { Calendar, Users, BarChart3, Clock, Plus, RefreshCw } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { isAdmin } from '../../constants/admin';
import vacationFirebaseService from '../../services/vacationFirebaseService';
import VacationCalendar from './VacationCalendar';
import VacationList from './VacationList';
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

interface VacationStats {
  totalVacations: number;
  totalEmployees: number;
  vacationsByType: Record<string, number>;
  monthlyTrend: Record<string, number>;
}

const VacationDashboard: React.FC = () => {
  const { currentUser } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [vacations, setVacations] = useState<Vacation[]>([]);
  const [stats, setStats] = useState<VacationStats>({
    totalVacations: 0,
    totalEmployees: 0,
    vacationsByType: {},
    monthlyTrend: {}
  });
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedVacation, setSelectedVacation] = useState<Vacation | null>(null);
  const [view, setView] = useState<'calendar' | 'list'>('calendar');

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
      
      // 통계 계산
      calculateStats(employeesData, vacationsData);
    } catch (error) {
      console.error('데이터 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  // 통계 계산
  const calculateStats = (employeesData: Employee[], vacationsData: Vacation[]) => {
    const vacationsByType: Record<string, number> = {};
    const monthlyTrend: Record<string, number> = {};

    vacationsData.forEach(vacation => {
      // 타입별 통계
      vacationsByType[vacation.type] = (vacationsByType[vacation.type] || 0) + 1;
      
      // 월별 트렌드
      const month = vacation.date.substring(0, 7); // YYYY-MM
      monthlyTrend[month] = (monthlyTrend[month] || 0) + 1;
    });

    setStats({
      totalVacations: vacationsData.length,
      totalEmployees: employeesData.length,
      vacationsByType,
      monthlyTrend
    });
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
        <div className="flex space-x-2">
          <button
            onClick={loadData}
            className="flex items-center px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            새로고침
          </button>
          <button
            onClick={handleAddVacation}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4 mr-2" />
            휴가 추가
          </button>
        </div>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <Calendar className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">총 휴가</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                {stats.totalVacations}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
              <Users className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">총 직원</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                {stats.totalEmployees}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
              <BarChart3 className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">연차</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                {stats.vacationsByType['연차'] || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-lg">
              <Clock className="h-6 w-6 text-orange-600 dark:text-orange-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">반차</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                {(stats.vacationsByType['오전'] || 0) + (stats.vacationsByType['오후'] || 0)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 뷰 전환 버튼 */}
      <div className="flex space-x-2">
        <button
          onClick={() => setView('calendar')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            view === 'calendar'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
        >
          캘린더 뷰
        </button>
        <button
          onClick={() => setView('list')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            view === 'list'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
        >
          목록 뷰
        </button>
      </div>

      {/* 뷰 컨텐츠 */}
      {view === 'calendar' ? (
        <VacationCalendar
          employees={employees}
          vacations={vacations}
          onEditVacation={handleEditVacation}
          onDeleteVacation={handleDeleteVacation}
        />
      ) : (
        <VacationList
          employees={employees}
          vacations={vacations}
          onEditVacation={handleEditVacation}
          onDeleteVacation={handleDeleteVacation}
        />
      )}

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