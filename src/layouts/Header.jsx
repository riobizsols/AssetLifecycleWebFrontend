import { useAuthStore } from "../store/useAuthStore";
import { useNavigate, useLocation } from "react-router-dom";
import { LogOut } from "lucide-react";
import { useState, useRef, useEffect } from "react";

export default function Header() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Map paths to page titles
  const pathTitleMap = {
    "/supervisor-approval": "Maintenance Supervisor",
    "/approval-detail": "Maintenance Approval",
    "/dashboard": "Dashboard",
    "/assets/add": "Add Asset",
    "/master-data/asset-types/add" : "Add Asset Type",
    "/master-data/branches/add" : "Add Branch",
    "/master-data/vendors/add" : "Add Vendor",
    "/master-data/prod-serv" : "Product / Service"
    // Add more routes as needed
  };
  const pageTitle =
    Object.entries(pathTitleMap).find(([path]) =>
      location.pathname.startsWith(path)
    )?.[1] || "";

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const fullName = user?.full_name || "User Name";
  const email = user?.email || "user@example.com";
  const jobRole = user?.job_role_id || "Role";
  const profileImage = user?.profile_img;
  const initials = fullName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  // Close dropdown when clicked outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="flex items-center justify-between bg-white px-6 py-3 shadow-sm relative">
      {/* Page Title */}
      <div className="text-2xl font-bold text-[#0E2F4B]">
        {pageTitle}
      </div>
      <div className="relative" ref={dropdownRef}>
        {/* Avatar Button */}
        <button
          onClick={() => setOpen((prev) => !prev)}
          className="h-8 w-8 rounded-full flex items-center justify-center text-white text-xs font-bold bg-cyan-600 hover:ring-2 hover:ring-gray-400 transition"
        >
          {profileImage ? (
            <img
              src={profileImage}
              alt="Profile"
              className="h-8 w-8 rounded-full object-cover border border-gray-300"
            />
          ) : (
            initials
          )}
        </button>

        {/* Dropdown */}
        {open && (
          <div className="absolute right-0 mt-2 w-64 bg-white rounded shadow-lg z-50 text-sm border border-gray-100">
            <div className="flex items-center gap-3 p-4 border-b">
              <div className="h-10 w-10 rounded-full flex items-center justify-center text-white font-semibold bg-cyan-600">
                {initials}
              </div>
              <div>
                <p className="font-semibold text-[#0E2F4B]">{fullName}</p>
                <p className="text-xs text-gray-500 capitalize">
                  {jobRole.replace("_", " ")}
                </p>
                <p className="text-xs text-gray-400">{email}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2 px-4 py-3 hover:bg-gray-100 text-gray-700"
            >
              <LogOut size={16} /> Logout
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
