import React, { useState, useEffect } from 'react';
import { X, Calendar, User, Tag } from 'lucide-react';

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
  vacation?: Vacation | null;
  onSave: (vacationData: Omit<Vacation, 'id'> & { id?: string }) => void;
  onCancel: () => void;
}

const VacationModal: React.FC<Props> = ({
  employees,
  vacation,
  onSave,
  onCancel
}) => {
  const [formData, setFormData] = useState({
    employeeId: '',
    date: '',
    type: '연차'
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // 휴가 타입 옵션
  const vacationTypes = ['연차', '오전', '오후', '특별', '병가', '업무'];

  // 편집 모드일 때 기존 데이터 로드
  useEffect(() => {
    if (vacation) {
      setFormData({
        employeeId: vacation.employeeId.toString(),
        date: vacation.date,
        type: vacation.type
      });
    } else {
      // 새로 추가할 때는 초기값으로 리셋
      const today = new Date();
      const localDate = new Date(today.getTime() - today.getTimezoneOffset() * 60000);
      setFormData({
        employeeId: '',
        date: localDate.toISOString().split('T')[0], // 로컬 시간대 기준 오늘 날짜
        type: '연차'
      });
    }
    setErrors({});
  }, [vacation]);

  // 입력값 변경 처리
  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // 해당 필드의 에러 제거
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  // 유효성 검사
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.employeeId) {
      newErrors.employeeId = '직원을 선택해주세요.';
    }

    if (!formData.date) {
      newErrors.date = '날짜를 선택해주세요.';
    }

    if (!formData.type) {
      newErrors.type = '휴가 타입을 선택해주세요.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // 저장 처리
  const handleSave = () => {
    if (!validateForm()) return;

    const vacationData = {
      employeeId: parseInt(formData.employeeId),
      date: formData.date,
      type: formData.type
    };

    onSave(vacationData);
  };

  // 키보드 이벤트 처리
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      handleSave();
    } else if (e.key === 'Escape') {
      onCancel();
    }
  };

  // 선택된 직원 정보
  const selectedEmployee = employees.find(emp => emp.id === parseInt(formData.employeeId));

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4">
        {/* 헤더 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {vacation ? '휴가 수정' : '휴가 추가'}
          </h2>
          <button
            onClick={onCancel}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* 폼 */}
        <div className="p-6 space-y-4" onKeyDown={handleKeyDown}>
          {/* 직원 선택 */}
          <div>
            <label className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <User className="h-4 w-4 mr-2" />
              직원
            </label>
            <select
              value={formData.employeeId}
              onChange={(e) => handleChange('employeeId', e.target.value)}
              className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${
                errors.employeeId 
                  ? 'border-red-300 dark:border-red-600' 
                  : 'border-gray-300 dark:border-gray-600'
              }`}
            >
              <option value="">직원을 선택해주세요</option>
              {employees.map(employee => (
                <option key={employee.id} value={employee.id}>
                  {employee.name} ({employee.team})
                </option>
              ))}
            </select>
            {errors.employeeId && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.employeeId}</p>
            )}
            
            {/* 선택된 직원 미리보기 */}
            {selectedEmployee && (
              <div className="mt-2 flex items-center space-x-2 p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-semibold"
                  style={{ backgroundColor: selectedEmployee.color }}
                >
                  {selectedEmployee.name.charAt(0)}
                </div>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {selectedEmployee.name} · {selectedEmployee.team} · {selectedEmployee.position}
                </span>
              </div>
            )}
          </div>

          {/* 날짜 선택 */}
          <div>
            <label className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <Calendar className="h-4 w-4 mr-2" />
              날짜
            </label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => handleChange('date', e.target.value)}
              className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${
                errors.date 
                  ? 'border-red-300 dark:border-red-600' 
                  : 'border-gray-300 dark:border-gray-600'
              }`}
            />
            {errors.date && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.date}</p>
            )}
          </div>

          {/* 휴가 타입 선택 */}
          <div>
            <label className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <Tag className="h-4 w-4 mr-2" />
              휴가 타입
            </label>
            <select
              value={formData.type}
              onChange={(e) => handleChange('type', e.target.value)}
              className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${
                errors.type 
                  ? 'border-red-300 dark:border-red-600' 
                  : 'border-gray-300 dark:border-gray-600'
              }`}
            >
              {vacationTypes.map(type => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
            {errors.type && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.type}</p>
            )}
          </div>
        </div>

        {/* 버튼 */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            취소
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            {vacation ? '수정' : '추가'}
          </button>
        </div>

        {/* 키보드 단축키 안내 */}
        <div className="px-6 pb-4">
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
            Ctrl + Enter: 저장 | Esc: 취소
          </p>
        </div>
      </div>
    </div>
  );
};

export default VacationModal;