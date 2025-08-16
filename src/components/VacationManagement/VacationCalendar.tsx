import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Edit, Trash2 } from 'lucide-react';

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
}

interface Props {
  employees: Employee[];
  vacations: Vacation[];
  onEditVacation: (vacation: Vacation) => void;
  onDeleteVacation: (vacationId: string) => void;
}

const VacationCalendar: React.FC<Props> = ({
  employees,
  vacations,
  onEditVacation,
  onDeleteVacation
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  // 현재 월의 첫째 날과 마지막 날
  const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
  
  // 달력 시작일 (첫째 주의 일요일)
  const startDate = new Date(firstDay);
  startDate.setDate(startDate.getDate() - firstDay.getDay());
  
  // 달력 종료일 (마지막 주의 토요일)
  const endDate = new Date(lastDay);
  endDate.setDate(endDate.getDate() + (6 - lastDay.getDay()));

  // 달력 날짜 배열 생성
  const calendarDays = [];
  const currentCalendarDate = new Date(startDate);
  
  while (currentCalendarDate <= endDate) {
    calendarDays.push(new Date(currentCalendarDate));
    currentCalendarDate.setDate(currentCalendarDate.getDate() + 1);
  }

  // 특정 날짜의 휴가 목록 가져오기
  const getVacationsForDate = (date: Date) => {
    // 로컬 시간대를 고려한 날짜 문자열 생성
    const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    const dateStr = localDate.toISOString().split('T')[0];
    return vacations.filter(v => v.date === dateStr);
  };

  // 직원 정보 가져오기
  const getEmployee = (employeeId: number) => {
    return employees.find(emp => emp.id === employeeId);
  };

  // 이전 달로 이동
  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  // 다음 달로 이동
  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  // 휴가 타입별 색상
  const getVacationTypeColor = (type: string) => {
    switch (type) {
      case '연차': return 'bg-blue-100 text-blue-800 border-blue-200';
      case '오전': return 'bg-green-100 text-green-800 border-green-200';
      case '오후': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case '특별': return 'bg-purple-100 text-purple-800 border-purple-200';
      case '병가': return 'bg-red-100 text-red-800 border-red-200';
      case '업무': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      {/* 달력 헤더 */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={goToPreviousMonth}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          <ChevronLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
        </button>
        
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          {currentDate.getFullYear()}년 {currentDate.getMonth() + 1}월
        </h2>
        
        <button
          onClick={goToNextMonth}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          <ChevronRight className="h-5 w-5 text-gray-600 dark:text-gray-400" />
        </button>
      </div>

      {/* 요일 헤더 */}
      <div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-700">
        {['일', '월', '화', '수', '목', '금', '토'].map(day => (
          <div
            key={day}
            className="p-3 text-sm font-medium text-gray-500 dark:text-gray-400 text-center"
          >
            {day}
          </div>
        ))}
      </div>

      {/* 달력 그리드 */}
      <div className="grid grid-cols-7">
        {calendarDays.map(date => {
          const dayVacations = getVacationsForDate(date);
          const isCurrentMonth = date.getMonth() === currentDate.getMonth();
          const isToday = date.toDateString() === new Date().toDateString();

          return (
            <div
              key={date.toISOString()}
              className={`min-h-[120px] p-2 border-b border-r border-gray-100 dark:border-gray-700 ${
                !isCurrentMonth ? 'bg-gray-50 dark:bg-gray-900' : ''
              } ${isToday ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
            >
              {/* 날짜 */}
              <div className={`text-sm font-medium mb-1 ${
                !isCurrentMonth 
                  ? 'text-gray-400 dark:text-gray-600' 
                  : isToday
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-gray-900 dark:text-gray-100'
              }`}>
                {date.getDate()}
              </div>

              {/* 휴가 목록 */}
              <div className="space-y-1">
                {dayVacations.slice(0, 3).map(vacation => {
                  const employee = getEmployee(vacation.employeeId);
                  return (
                    <div
                      key={vacation.id}
                      className={`text-xs px-2 py-1 rounded border cursor-pointer group ${getVacationTypeColor(vacation.type)}`}
                      onClick={() => onEditVacation(vacation)}
                    >
                      <div className="flex items-center justify-between">
                        <span className="truncate">
                          {employee?.name} {vacation.type}
                        </span>
                        <div className="hidden group-hover:flex items-center space-x-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onEditVacation(vacation);
                            }}
                            className="p-1 hover:bg-white/50 rounded"
                          >
                            <Edit className="h-3 w-3" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteVacation(vacation.id);
                            }}
                            className="p-1 hover:bg-white/50 rounded"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
                
                {/* 더 많은 휴가가 있을 때 */}
                {dayVacations.length > 3 && (
                  <div className="text-xs text-gray-500 dark:text-gray-400 px-2">
                    +{dayVacations.length - 3}개 더
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default VacationCalendar;