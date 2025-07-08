import { useAuthStore } from "../store/useAuthStore";
import { useNavigate } from "react-router-dom";

export default function Header() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/");
  };


  const fullName = user?.full_name || "User Name";
  const jobRole = user?.job_role_id || "Role";
  const profileImage = user?.profile_img || "/default-avatar.jpg"; 

  return (
    <header className="flex items-center justify-between bg-white px-6 py-3 shadow-sm">
      {/* Search Input */}
      <button
        className="mt-4 px-4 py-2 bg-red-500 text-white rounded"
        onClick={handleLogout}
      >
        Logout
      </button>

      {/* User Info */}
      <div className="flex items-center gap-3">
        <div className="text-right">
          <p className="text-sm font-semibold text-[#0E2F4B]">{fullName}</p>
          <p className="text-xs text-gray-500 capitalize">
            {jobRole.replace("_", " ")}
          </p>
        </div>
        <img
          src={profileImage}
          alt="Profile"
          className="h-10 w-10 rounded-full object-cover border border-gray-300"
        />
      </div>
    </header>
  );
}
