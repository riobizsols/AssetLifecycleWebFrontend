import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/useAuthStore";

export default function AdminSettingsRedirect() {
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  useEffect(() => {
    if (isAuthenticated) {
      // If already authenticated, go to admin settings landing page
      navigate("/adminsettings/configuration", { replace: true });
    } else {
      // If not authenticated, set flag and redirect to login
      sessionStorage.setItem('redirectToAdminSettings', 'true');
      navigate("/login", { 
        replace: true,
        state: { fromAdminSettings: true }
      });
    }
  }, [isAuthenticated, navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Redirecting...</p>
      </div>
    </div>
  );
}

