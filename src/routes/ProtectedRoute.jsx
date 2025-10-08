import { Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "../store/useAuthStore";
import { useNavigation } from "../hooks/useNavigation";

export default function ProtectedRoute({ children, allowedRoles = [], requiredAppId = null }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);
  const roles = useAuthStore((state) => state.roles) || [];
  const location = useLocation();
  const { hasAccess } = useNavigation();
  
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
      return <Navigate to="/dashboard" />; // Redirect to dashboard instead of login
    }
  }

  // Check navigation permissions if requiredAppId is provided
  if (requiredAppId && !hasAccess(requiredAppId)) {
    console.log('Access denied. User does not have access to app:', requiredAppId);
    return <Navigate to="/dashboard" />; // Redirect to dashboard
  }

  return children;
}
