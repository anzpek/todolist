import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import {
    collection,
    doc,
    getDocs,
    query,
    where,
    addDoc,
    deleteDoc,
    setDoc
} from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { useAuth } from '../../../contexts/AuthContext';
import type { Department, Vacation } from '../types';
import { format } from 'date-fns';

// Helper for hash color
const getEmployeeColor = (name: string) => {
    const colors = ['#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#6366F1', '#8B5CF6', '#EC4899'];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
};

interface VacationContextType {
    currentDepartment: Department | null;
    vacations: Vacation[];
    loading: boolean;
    error: string | null;
    login: (deptName: string, password: string) => Promise<boolean>;
    logout: () => void;
    addVacation: (vacation: Omit<Vacation, 'id' | 'createdAt' | 'departmentId'>) => Promise<void>;
    deleteVacation: (vacationId: string) => Promise<void>;

    // Legacy Compatibility
    showVacationsInTodos: boolean;
    toggleVacationDisplay: () => void;
    employees: { id: string; name: string; color: string }[];
    getVacationsForDate: (date: Date) => Vacation[];
}

const VacationContext = createContext<VacationContextType | undefined>(undefined);

export const VacationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { currentUser } = useAuth();
    const [currentDepartment, setCurrentDepartment] = useState<Department | null>(null);
    const [vacations, setVacations] = useState<Vacation[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showVacationsInTodos, setShowVacationsInTodos] = useState(true);

    const toggleVacationDisplay = useCallback(() => {
        setShowVacationsInTodos(prev => !prev);
    }, []);

    const employees = useMemo(() => {
        const names = Array.from(new Set(vacations.map(v => v.employeeName)));
        return names.map((name, index) => ({
            id: `emp_${index}`, // Mock ID since we don't have employee table
            name,
            color: getEmployeeColor(name),
            team: '보상지원부', // Mock
            position: '사원' // Mock
        }));
    }, [vacations]);

    const getVacationsForDate = useCallback((date: Date) => {
        const dateStr = format(date, 'yyyy-MM-dd');
        return vacations.filter(v => v.date === dateStr);
    }, [vacations]);

    // Auto-login Logic
    useEffect(() => {
        const checkAutoLogin = async () => {
            if (currentUser && !currentUser.isAnonymous) {
                try {
                    setLoading(true);
                    await ensureDepartmentExists('보상지원부', '1343');
                    await login('보상지원부', '1343');
                } catch (e) {
                    console.error("Auto-login failed:", e);
                } finally {
                    setLoading(false);
                }
            }
        };

        checkAutoLogin();
    }, [currentUser]);

    // Fetch Vacations when department is set
    useEffect(() => {
        if (!currentDepartment) {
            setVacations([]);
            return;
        }

        const fetchVacations = async () => {
            setLoading(true);
            try {
                const q = query(collection(db, 'departments', currentDepartment.id, 'vacations'));
                const snapshot = await getDocs(q);
                const loadedVacations = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                })) as Vacation[];
                setVacations(loadedVacations);
            } catch (err) {
                console.error("Failed to fetch vacations:", err);
                setError("휴가 데이터를 불러오는데 실패했습니다.");
            } finally {
                setLoading(false);
            }
        };

        fetchVacations();
    }, [currentDepartment]);

    const ensureDepartmentExists = async (name: string, password: string) => {
        const q = query(collection(db, 'departments'), where('name', '==', name));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            const newDept: Department = {
                id: 'dept_bosang', // Fixed ID for simplicity
                code: name,
                name: name,
                password: password,
                color: '#4285f4'
            };
            await setDoc(doc(db, 'departments', 'dept_bosang'), newDept);
        }
    };

    const login = useCallback(async (deptName: string, password: string): Promise<boolean> => {
        setLoading(true);
        setError(null);
        try {
            const q = query(collection(db, 'departments'), where('name', '==', deptName));
            const snapshot = await getDocs(q);

            if (snapshot.empty) {
                throw new Error('존재하지 않는 부서입니다.');
            }

            const deptDoc = snapshot.docs[0];
            const deptData = deptDoc.data() as Department;
            deptData.id = deptDoc.id;

            if (deptData.password !== password) {
                throw new Error('비밀번호가 올바르지 않습니다.');
            }

            setCurrentDepartment(deptData);
            localStorage.setItem('vacation_dept', JSON.stringify(deptData));
            return true;
        } catch (err: any) {
            setError(err.message);
            return false;
        } finally {
            setLoading(false);
        }
    }, []);

    const logout = useCallback(() => {
        setCurrentDepartment(null);
        setVacations([]);
        localStorage.removeItem('vacation_dept');
    }, []);

    const addVacation = useCallback(async (vacationData: Omit<Vacation, 'id' | 'createdAt' | 'departmentId'>) => {
        if (!currentDepartment) return;

        try {
            const newVacation = {
                ...vacationData,
                departmentId: currentDepartment.id,
                createdAt: Date.now()
            };

            const docRef = await addDoc(collection(db, 'departments', currentDepartment.id, 'vacations'), newVacation);

            setVacations(prev => [...prev, { ...newVacation, id: docRef.id } as Vacation]);
        } catch (err) {
            console.error("Failed to add vacation:", err);
            throw err;
        }
    }, [currentDepartment]);

    const deleteVacation = useCallback(async (vacationId: string) => {
        if (!currentDepartment) return;
        try {
            await deleteDoc(doc(db, 'departments', currentDepartment.id, 'vacations', vacationId));
            setVacations(prev => prev.filter(v => v.id !== vacationId));
        } catch (err) {
            console.error("Failed to delete vacation:", err);
            throw err;
        }
    }, [currentDepartment]);

    return (
        <VacationContext.Provider value={{
            currentDepartment,
            vacations,
            loading,
            error,
            login,
            logout,
            addVacation,
            deleteVacation,
            showVacationsInTodos,
            toggleVacationDisplay,
            employees,
            getVacationsForDate
        }}>
            {children}
        </VacationContext.Provider>
    );
};

export const useVacation = () => {
    const context = useContext(VacationContext);
    if (!context) throw new Error('useVacation must be used within VacationProvider');
    return context;
};
