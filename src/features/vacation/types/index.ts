export interface Department {
    id: string; // Firestore Doc ID
    code: string; // Department Name used for login (e.g., "보상지원부")
    name: string; // Display Name
    password: string; // Password for manual login
    color: string; // Theme color
}

export interface Vacation {
    id: string;
    departmentId: string;
    employeeName: string; // Name of the employee
    type: string; // "연차", "반차", "공가", "병가" etc.
    date: string; // YYYY-MM-DD
    createdAt: number;
    notes?: string;
    employeeId?: string; // Compatibility
    updatedAt?: number; // Compatibility
}
