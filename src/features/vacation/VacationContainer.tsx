import React from 'react';
import { useVacation } from './contexts/VacationContext';
import { DepartmentLogin } from './components/DepartmentLogin';
import { VacationDashboard } from './VacationDashboard';

export const VacationContainer: React.FC = () => {
    const { currentDepartment, loading } = useVacation();

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (!currentDepartment) {
        return <DepartmentLogin />;
    }

    return <VacationDashboard />;
};
