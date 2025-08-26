import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Edit, Trash2, X } from 'lucide-react';

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
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // 스와이프 관련 상태
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchEndX, setTouchEndX] = useState<number | null>(null);
  const calendarRef = useRef<HTMLDivElement>(null);

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

  // 스와이프 이벤트 처리
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEndX(null);
    setTouchStartX(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEndX(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStartX || !touchEndX) return;
    
    const distance = touchStartX - touchEndX;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe) {
      // 왼쪽 스와이프 - 다음 달
      goToNextMonth();
    }
    if (isRightSwipe) {
      // 오른쪽 스와이프 - 이전 달
      goToPreviousMonth();
    }
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
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden w-full max-w-full">
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
      <div className="grid w-full border-b border-gray-200 dark:border-gray-700" style={{ 
        gridTemplateColumns: '0.7fr 1fr 1fr 1fr 1fr 1fr 0.7fr',
        minWidth: '100%',
        maxWidth: '100%'
      }}>
        {['일', '월', '화', '수', '목', '금', '토'].map((day, index) => (
          <div
            key={day}
            className={`p-3 text-sm font-medium text-center ${
              index === 0 || index === 6 
                ? 'text-gray-400 dark:text-gray-500' 
                : 'text-gray-500 dark:text-gray-400'
            }`}
          >
            {day}
          </div>
        ))}
      </div>

      {/* 달력 그리드 */}
      <div 
        ref={calendarRef}
        className="grid w-full"
        style={{ 
          gridTemplateColumns: '0.7fr 1fr 1fr 1fr 1fr 1fr 0.7fr',
          minWidth: '100%',
          maxWidth: '100%'
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {calendarDays.map(date => {
          const dayVacations = getVacationsForDate(date);
          const isCurrentMonth = date.getMonth() === currentDate.getMonth();
          const isToday = date.toDateString() === new Date().toDateString();
          const isWeekend = date.getDay() === 0 || date.getDay() === 6; // 일요일(0) 또는 토요일(6)

          return (
            <div
              key={date.toISOString()}
              className={`min-h-[120px] border-b border-r border-gray-100 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 overflow-hidden ${
                isWeekend ? 'p-1' : 'p-2'
              } ${
                !isCurrentMonth ? 'bg-gray-50 dark:bg-gray-900' : ''
              } ${isToday ? 'bg-blue-50 dark:bg-blue-900/20' : ''} ${
                isWeekend ? 'bg-gray-25 dark:bg-gray-850' : ''
              }`}
              style={{ 
                minWidth: 0,
                maxWidth: '100%',
                width: '100%'
              }}
              onClick={() => {
                if (dayVacations.length > 0) {
                  setSelectedDate(date);
                  setIsModalOpen(true);
                }
              }}
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

              {/* 휴가 목록 (주말은 최대 3개, 평일은 최대 6개까지 표시) */}
              <div className="space-y-1 w-full overflow-hidden">
                {dayVacations.slice(0, isWeekend ? 3 : 6).map(vacation => {
                  const employee = getEmployee(vacation.employeeId);
                  return (
                    <div
                      key={vacation.id}
                      className={`text-xs rounded border cursor-pointer group ${getVacationTypeColor(vacation.type)} ${
                        isWeekend ? 'px-1 py-0.5' : 'px-2 py-1'
                      }`}
                      style={{ 
                        minWidth: 0,
                        maxWidth: '100%',
                        width: '100%',
                        overflow: 'hidden'
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditVacation(vacation);
                      }}
                    >
                      <div 
                        className="flex items-center justify-between"
                        style={{ 
                          minWidth: 0,
                          maxWidth: '100%',
                          width: '100%'
                        }}
                      >
                        <span 
                          className="truncate"
                          style={{ 
                            minWidth: 0,
                            maxWidth: '100%',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {employee?.name} {vacation.type}
                        </span>
                        <div className="hidden group-hover:flex items-center space-x-1 flex-shrink-0">
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
                {dayVacations.length > (isWeekend ? 3 : 6) && (
                  <div 
                    className={`text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 rounded cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600 ${
                      isWeekend ? 'px-1 py-0.5' : 'px-2 py-1'
                    }`}
                    style={{ 
                      minWidth: 0,
                      maxWidth: '100%',
                      width: '100%',
                      overflow: 'hidden'
                    }}
                  >
                    +{dayVacations.length - (isWeekend ? 3 : 6)}개 더
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 날짜별 휴가 상세 모달 */}
      {isModalOpen && selectedDate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setIsModalOpen(false)}>
          <div 
            className="bg-white dark:bg-gray-800 rounded-lg shadow-xl overflow-hidden w-full max-w-md max-h-[80vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 모달 헤더 */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {selectedDate.getFullYear()}년 {selectedDate.getMonth() + 1}월 {selectedDate.getDate()}일 휴가
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>

            {/* 모달 내용 */}
            <div className="p-4 max-h-96 overflow-y-auto">
              <div className="space-y-3">
                {getVacationsForDate(selectedDate).map(vacation => {
                  const employee = getEmployee(vacation.employeeId);
                  return (
                    <div
                      key={vacation.id}
                      className={`p-3 rounded-lg border cursor-pointer hover:shadow-md transition-shadow ${getVacationTypeColor(vacation.type)}`}
                      onClick={() => {
                        setIsModalOpen(false);
                        onEditVacation(vacation);
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-sm">
                            {employee?.name || '알 수 없는 직원'}
                          </div>
                          <div className="text-xs opacity-75">
                            {employee?.team} • {vacation.type}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setIsModalOpen(false);
                              onEditVacation(vacation);
                            }}
                            className="p-1 hover:bg-white/50 rounded"
                            title="수정"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm('정말로 이 휴가를 삭제하시겠습니까?')) {
                                onDeleteVacation(vacation.id);
                                setIsModalOpen(false);
                              }
                            }}
                            className="p-1 hover:bg-white/50 rounded text-red-600"
                            title="삭제"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 모달 푸터 */}
            <div className="flex justify-end p-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VacationCalendar;