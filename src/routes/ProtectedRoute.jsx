import { Navigate } from "react-router-dom";
import { useAuthStore } from "../store/useAuthStore";

export default function ProtectedRoute({ children, allowedRoles = [] }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);
  const job_role_id = user?.job_role_id;

  if (!isAuthenticated) {
    return <Navigate to="/" />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(job_role_id)) {
    console.log('Access denied. User role:', job_role_id, 'Allowed roles:', allowedRoles);
    return <Navigate to="/dashboard" />; // or a 403 page
  }

  return children;
}
