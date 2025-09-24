import { useAuthStore } from "../store/useAuthStore";
import { useNavigate, useLocation } from "react-router-dom";
import { LogOut } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useAuditLog } from "../hooks/useAuditLog";
import { AUTH_APP_IDS } from "../constants/authAuditEvents";
import { useLanguage } from "../contexts/LanguageContext";

export default function Header() {
  const { user, logout, roles } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);
  const { t } = useLanguage();
  
  // Audit logging for logout
  const { recordActionByNameWithFetch } = useAuditLog(AUTH_APP_IDS.LOGOUT);

  // Map paths to page titles and subtitles using translations
  const pathTitleMap = {
    "/supervisor-approval": { title: t('maintenance.supervisor'), subtitle: "" },
    "/assets": { title: t('navigation.assets'), subtitle: "" },
    "/assign-department-assets": {
      title: t('departments.assignment'),
      subtitle: "",
    },
    "/assign-employee-assets": { title: t('navigation.employeeAssignment'), subtitle: "" },
    "/workorder-management": { title: t('maintenance.workOrder') + " Management", subtitle: "" },
    "/maintenance-approval": { title: t('maintenance.approval'), subtitle: "" },
    "/report-breakdown": { title: "Report Breakdown", subtitle: "" },
    "/dashboard": { title: t('navigation.dashboard'), subtitle: "" },
    "/assets/add": { title: t('assets.addAsset'), subtitle: "" },
    "/master-data/asset-types/add": { title: t('assetTypes.addAssetType'), subtitle: "" },
    "/master-data/branches/add": { title: t('branches.addBranch'), subtitle: "" },
    "/master-data/vendors/add": { title: t('vendors.addVendor'), subtitle: "" },
    "/master-data/prod-serv": { title: "Product / Service", subtitle: "" },
    "/group-asset": { title: t('navigation.groupAsset'), subtitle: "" },
    "/group-asset/create": {
      title: t('navigation.groupAsset'),
      subtitle: t('groupAsset.create'),
    },
    "/group-asset/edit": {
      title: t('navigation.groupAsset'),
      subtitle: t('groupAsset.edit'),
    },
    "/group-asset/view": {
      title: t('navigation.groupAsset'),
      subtitle: t('groupAsset.view'),
    },
    "/scrap-sales": {
      title: t('scrapSales.title'),
      subtitle: t('scrapSales.subtitle'),
    },
    "/scrap-assets": {
      title: t('scrapAssets.title'),
      subtitle: t('scrapAssets.subtitle'),
    },

    "/scrap-assets/nearing-expiry": {
      title: t('scrapAssets.nearingExpiry'),
      subtitle: t('scrapAssets.nearingExpirySubtitle'),
    },
    "/scrap-assets/expired": {
      title: t('scrapAssets.expired'),
      subtitle: t('scrapAssets.expiredSubtitle'),
    },
    "/scrap-assets/categories": {
      title: t('scrapAssets.categories'),
      subtitle: t('scrapAssets.categoriesSubtitle'),
    },
    "/scrap-assets/by-category": {
      title: t('scrapAssets.byCategory'),
      subtitle: t('scrapAssets.byCategorySubtitle'),
    },
    "/scrap-assets/by-category/:category": {
      title: t('scrapAssets.categoryAssets'),
      subtitle: t('scrapAssets.categoryAssetsSubtitle'),
    },
    "/scrap-assets/create": {
      title: t('scrapAssets.create'),
      subtitle: t('scrapAssets.createSubtitle'),
    },
    "/audit-logs-view": {
      title: t('auditLogs.title'),
      subtitle: t('auditLogs.subtitle'),
    },
    "/audit-logs-view/config": {
      title: t('auditLogs.config'),
      subtitle: t('auditLogs.configSubtitle'),
    },
    "/master-data/roles": {
      title: "Role Management",
    },

    // Add more routes as needed
  };
  const pageInfo = Object.entries(pathTitleMap).find(([path]) =>
    location.pathname.startsWith(path)
  )?.[1] || { title: "", subtitle: "" };

  const handleLogout = async () => {
    // Log audit event for logout
    await recordActionByNameWithFetch('Logging Out', { 
      action: 'User Logged Out Successfully',
      userId: user?.user_id,
      userEmail: user?.email
    });
    
    logout();
    navigate("/");
  };

  const fullName = user?.full_name || "User Name";
  const email = user?.email || "user@example.com";
  
  // Get role information from tblUserJobRoles
  const userRoles = roles || [];
  const roleNames = userRoles.map(role => role.job_role_name).join(", ");
  const jobRole = roleNames || user?.job_role_id || "Role";
  
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
      <div className="flex flex-col">
        <div className="text-2xl font-bold text-[#0E2F4B]">
          {pageInfo.title}
        </div>
        {pageInfo.subtitle && (
          <div className="text-sm text-gray-600">{pageInfo.subtitle}</div>
        )}
      </div>
      
      {/* User Menu */}
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
                  {jobRole.replace(/_/g, " ")}
                </p>
                <p className="text-xs text-gray-400">{email}</p>
                {userRoles.length > 1 && (
                  <p className="text-xs text-blue-600 mt-1">
                    {userRoles.length} roles assigned
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2 px-4 py-3 hover:bg-gray-100 text-gray-700"
            >
              <LogOut size={16} /> {t('auth.logout')}
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
