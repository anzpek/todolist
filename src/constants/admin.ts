// 관리자 권한 관리
export const ADMIN_EMAILS = [
  'lkd0115lkd@gmail.com'
] as const;

export const isAdmin = (userEmail: string | null | undefined): boolean => {
  if (!userEmail) return false;
  return ADMIN_EMAILS.includes(userEmail as any);
};

export const getAdminPermissions = (userEmail: string | null | undefined) => {
  const isAdminUser = isAdmin(userEmail);
  
  return {
    canManageVacations: isAdminUser,
    canViewVacationData: isAdminUser,
    canEditVacationData: isAdminUser,
    canManageEmployees: isAdminUser,
    canAccessAdminFeatures: isAdminUser
  };
};