import { Navigate } from "react-router-dom";
import { useAuthStore } from "../store/useAuthStore";

export default function ProtectedRoute({ children, allowedRoles = [] }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);
  const roles = useAuthStore((state) => state.roles) || [];
  
  // Get user role IDs from tblUserJobRoles
  const userRoleIds = roles.map(role => role.job_role_id);
  
  // Fallback to legacy job_role_id for backward compatibility
  const legacyJobRoleId = user?.job_role_id || useAuthStore((state) => state.job_role_id);
  if (legacyJobRoleId && !userRoleIds.includes(legacyJobRoleId)) {
    userRoleIds.push(legacyJobRoleId);
  }

  if (!isAuthenticated) {
    return <Navigate to="/" />;
  }

  if (allowedRoles.length > 0) {
    // Check if user has any of the allowed roles
    const hasAllowedRole = allowedRoles.some(allowedRole => userRoleIds.includes(allowedRole));
    
    if (!hasAllowedRole) {
      console.log('Access denied. User roles:', userRoleIds, 'Allowed roles:', allowedRoles);
      return <Navigate to="/" />; // Redirect to login page
    }
  }

  return children;
}
