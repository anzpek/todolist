import React, { useState } from 'react';
import { useVacation } from './contexts/VacationContext';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addDays, getDay, format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Plus, User } from 'lucide-react';

// Color map for employees (simple hash fallback)
const getEmployeeColor = (name: string) => {
    const colors = ['#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#6366F1', '#8B5CF6', '#EC4899'];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
};

export const VacationDashboard: React.FC = () => {
    const { currentDepartment, logout, vacations, addVacation, deleteVacation, loadMonthVacations } = useVacation();
    const [selectedDate, setSelectedDate] = useState(new Date());

    // Fetch data when month changes
    React.useEffect(() => {
        if (currentDepartment) {
            loadMonthVacations(selectedDate.getFullYear(), selectedDate.getMonth() + 1);
        }
    }, [currentDepartment, selectedDate, loadMonthVacations]);

    const handlePrevMonth = () => {
        setSelectedDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
    };

    const handleNextMonth = () => {
        setSelectedDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
    };

    const daysInMonth = eachDayOfInterval({
        start: startOfWeek(startOfMonth(selectedDate)),
        end: endOfWeek(endOfMonth(selectedDate))
    });

    const getVacationsForDay = (date: Date) => {
        const dateStr = format(date, 'yyyy-MM-dd');
        return vacations.filter(v => v.date === dateStr);
    };

    return (
        <div className="h-full flex flex-col bg-white dark:bg-gray-900">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
                <div className="flex items-center gap-4">
                    <h2 className="text-xl font-bold text-gray-800 dark:text-white">
                        {format(selectedDate, 'yyyy년 M월', { locale: ko })}
                    </h2>
                    <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                        <button onClick={handlePrevMonth} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md">
                            <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                        </button>
                        <button onClick={handleNextMonth} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md">
                            <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                        </button>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                        {currentDepartment?.name}
                    </span>
                    <button
                        onClick={logout}
                        className="text-sm text-red-500 hover:text-red-600 px-3 py-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    >
                        로그아웃
                    </button>
                </div>
            </div>

            {/* Calendar Area */}
            <div className="flex-1 p-4 overflow-auto">
                <div className="grid grid-cols-7 gap-px bg-gray-200 dark:bg-gray-700 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                    {['일', '월', '화', '수', '목', '금', '토'].map((day, i) => (
                        <div key={day} className={`
                            bg-gray-50 dark:bg-gray-800 p-2 text-center text-sm font-medium
                            ${i === 0 ? 'text-red-500' : i === 6 ? 'text-blue-500' : 'text-gray-700 dark:text-gray-300'}
                        `}>
                            {day}
                        </div>
                    ))}

                    {daysInMonth.map((date, idx) => {
                        const dayVacations = getVacationsForDay(date);
                        const isCurrentMonth = isSameMonth(date, selectedDate);
                        const isToday = isSameDay(date, new Date());

                        return (
                            <div
                                key={date.toISOString()}
                                className={`
                                    min-h-[100px] p-1 bg-white dark:bg-gray-800 
                                    ${!isCurrentMonth ? 'bg-gray-50/50 dark:bg-gray-900/50 text-gray-400' : ''}
                                    ${isToday ? 'ring-1 ring-blue-500 inset-0' : ''}
                                    flex flex-col gap-1
                                `}
                            >
                                <span className={`
                                    text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full mb-1
                                    ${isToday ? 'bg-blue-600 text-white' : ''}
                                    ${getDay(date) === 0 ? 'text-red-500' : getDay(date) === 6 ? 'text-blue-500' : ''}
                                `}>
                                    {format(date, 'd')}
                                </span>

                                {dayVacations.map(vacation => (
                                    <div
                                        key={vacation.id}
                                        className="text-xs px-2 py-1 rounded text-white flex justify-between items-center group relative cursor-pointer"
                                        style={{ backgroundColor: getEmployeeColor(vacation.employeeName) }}
                                        onClick={() => {
                                            if (confirm(`${vacation.employeeName}님의 휴가를 삭제하시겠습니까?`)) {
                                                deleteVacation(vacation.id);
                                            }
                                        }}
                                        title={`${vacation.employeeName} (${vacation.type})`}
                                    >
                                        <span className="truncate">{vacation.employeeName}</span>
                                        <span className="opacity-0 group-hover:opacity-100 ml-1">×</span>
                                    </div>
                                ))}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Floating Action Button */}
            <button
                className="fixed bottom-6 right-6 w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg flex items-center justify-center transition-transform hover:scale-105 active:scale-95"
                onClick={() => {
                    // Open Add Modal
                    const name = prompt("직원 이름");
                    if (name) {
                        addVacation({
                            employeeName: name,
                            type: "연차",
                            date: format(selectedDate, 'yyyy-MM-dd'),
                            notes: ""
                        })
                    }
                }}
            >
                <Plus className="w-8 h-8" />
            </button>
        </div>
    );
};
