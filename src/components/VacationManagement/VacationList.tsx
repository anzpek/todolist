import React, { useState } from 'react';
import { Edit, Trash2, Search, Filter } from 'lucide-react';

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
  createdAt?: number;
  updatedAt?: number;
}

interface Props {
  employees: Employee[];
  vacations: Vacation[];
  onEditVacation: (vacation: Vacation) => void;
  onDeleteVacation: (vacationId: string) => void;
}

const VacationList: React.FC<Props> = ({
  employees,
  vacations,
  onEditVacation,
  onDeleteVacation
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'type'>('date');

  // 직원 정보 가져오기
  const getEmployee = (employeeId: number) => {
    return employees.find(emp => emp.id === employeeId);
  };

  // 필터링 및 정렬된 휴가 목록
  const filteredAndSortedVacations = vacations
    .filter(vacation => {
      const employee = getEmployee(vacation.employeeId);
      const matchesSearch = employee?.name.toLowerCase().includes(searchTerm.toLowerCase()) || false;
      const matchesType = filterType === 'all' || vacation.type === filterType;
      
      return matchesSearch && matchesType;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'date':
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        case 'name':
          const empA = getEmployee(a.employeeId);
          const empB = getEmployee(b.employeeId);
          return (empA?.name || '').localeCompare(empB?.name || '');
        case 'type':
          return a.type.localeCompare(b.type);
        default:
          return 0;
      }
    });

  // 휴가 타입 목록
  const vacationTypes = ['all', ...Array.from(new Set(vacations.map(v => v.type)))];

  // 휴가 타입별 색상
  const getVacationTypeColor = (type: string) => {
    switch (type) {
      case '연차': return 'bg-blue-100 text-blue-800';
      case '오전': return 'bg-green-100 text-green-800';
      case '오후': return 'bg-yellow-100 text-yellow-800';
      case '특별': return 'bg-purple-100 text-purple-800';
      case '병가': return 'bg-red-100 text-red-800';
      case '업무': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // 날짜 포맷팅
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'short'
    });
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      {/* 검색 및 필터 */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0 sm:space-x-4">
          {/* 검색 */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="직원 이름으로 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>

          {/* 필터 및 정렬 */}
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-gray-400" />
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
              >
                {vacationTypes.map(type => (
                  <option key={type} value={type}>
                    {type === 'all' ? '모든 타입' : type}
                  </option>
                ))}
              </select>
            </div>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'date' | 'name' | 'type')}
              className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
            >
              <option value="date">날짜순</option>
              <option value="name">이름순</option>
              <option value="type">타입순</option>
            </select>
          </div>
        </div>
      </div>

      {/* 휴가 목록 */}
      <div className="divide-y divide-gray-200 dark:divide-gray-700">
        {filteredAndSortedVacations.length === 0 ? (
          <div className="p-8 text-center">
            <div className="text-gray-400 dark:text-gray-600 text-lg mb-2">📅</div>
            <p className="text-gray-500 dark:text-gray-400">
              {searchTerm || filterType !== 'all' 
                ? '검색 조건에 맞는 휴가가 없습니다.'
                : '등록된 휴가가 없습니다.'
              }
            </p>
          </div>
        ) : (
          filteredAndSortedVacations.map(vacation => {
            const employee = getEmployee(vacation.employeeId);
            
            return (
              <div
                key={vacation.id}
                className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    {/* 직원 정보 */}
                    <div className="flex items-center space-x-3">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-semibold"
                        style={{ backgroundColor: employee?.color || '#6B7280' }}
                      >
                        {employee?.name?.charAt(0) || '?'}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900 dark:text-gray-100">
                          {employee?.name || '알 수 없음'}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {employee?.team} · {employee?.position}
                        </div>
                      </div>
                    </div>

                    {/* 휴가 정보 */}
                    <div className="flex items-center space-x-4">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${getVacationTypeColor(vacation.type)}`}
                      >
                        {vacation.type}
                      </span>
                      <div className="text-sm text-gray-900 dark:text-gray-100">
                        {formatDate(vacation.date)}
                      </div>
                    </div>
                  </div>

                  {/* 액션 버튼 */}
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => onEditVacation(vacation)}
                      className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                      title="수정"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => onDeleteVacation(vacation.id)}
                      className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      title="삭제"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 결과 요약 */}
      {filteredAndSortedVacations.length > 0 && (
        <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            총 {filteredAndSortedVacations.length}개의 휴가
            {searchTerm && ` (검색: "${searchTerm}")`}
            {filterType !== 'all' && ` (필터: ${filterType})`}
          </p>
        </div>
      )}
    </div>
  );
};

export default VacationList;