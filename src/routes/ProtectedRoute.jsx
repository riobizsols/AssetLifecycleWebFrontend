import { Navigate } from "react-router-dom";
import { useAuthStore } from "../store/useAuthStore";

export default function ProtectedRoute({ children, allowedRoles = [] }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const job_role_id = useAuthStore((state) => state.job_role_id);

  if (!isAuthenticated) {
    return <Navigate to="/" />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(job_role_id)) {
    return <Navigate to="/dashboard" />; // or a 403 page
  }

  return children;
}
