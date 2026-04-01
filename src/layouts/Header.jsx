import { useAuthStore } from "../store/useAuthStore";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { LogOut } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useAuditLog } from "../hooks/useAuditLog";
import { AUTH_APP_IDS } from "../constants/authAuditEvents";
import { useLanguage } from "../contexts/LanguageContext";
import RouteDataLoading from "../components/loading/RouteDataLoading";

export default function Header() {
  const { user, logout, roles } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const dropdownRef = useRef(null);
  const { t } = useLanguage();
  
  // Audit logging for logout
  const { recordActionByNameWithFetch } = useAuditLog(AUTH_APP_IDS.LOGOUT);

  // Map paths to page titles and subtitles using translations
  const pathTitleMap = {
    "/maintenance-list": { title: t('maintenance.maintenanceList'), subtitle: "" },
    "/maintenance-list/create": { title: t('maintenanceSupervisor.createManualMaintenance'), subtitle: "" },
    "/inspection-view": { title: t('inspectionView.title'), subtitle: "" },
    "/inspection-view/create": { title: t('inspectionView.createManualInspection'), subtitle: "" },
    "/assets": { title: t('navigation.assets'), subtitle: "" },
    "/assign-department-assets": {
      title: t('departments.assignment'),
      subtitle: "",
    },
    "/assign-employee-assets": { title: t('navigation.employeeAssignment'), subtitle: "" },
    "/workorder-management": { title: t('maintenance.workOrder') + " Management", subtitle: "" },
    "/maintenance-approval": { title: t('maintenance.approval'), subtitle: "" },
    "/report-breakdown": { title: t('navigation.reportBreakdown'), subtitle: "" },
    "/employee-report-breakdown": { title: t('navigation.employeeReportBreakdown'), subtitle: "" },
    "/dashboard": { title: t('navigation.dashboard'), subtitle: "" },
    "/technician-certificates": { title: t('technicianCertificates.title'), subtitle: "" },
    "/tech-cert-approvals": { title: t('technicianCertificates.approvalsTitle'), subtitle: "" },
    "/assets/add": { title: t('assets.addAsset'), subtitle: "" },
    "/master-data/asset-types/add": { title: t('assetTypes.addAssetType'), subtitle: "" },
    "/master-data/branches/add": { title: t('branches.addBranch'), subtitle: "" },
    "/master-data/vendors/add": { title: t('vendors.addVendor'), subtitle: "" },
    "/master-data/prod-serv": { title: t('masterDataTitles.prodServ'), subtitle: "" },
    "/master-data/inspection-checklists": { title: t('masterDataTitles.inspectionChecklists'), subtitle: "" },
    "/master-data/inspection-frequency": { title: t('masterDataTitles.inspectionFrequency'), subtitle: "" },
    "/master-data/uploads": { title: t('bulkUpload.title'), subtitle: "" },
    "/master-data/asset-type-checklist-mapping/create": { title: "", subtitle: "" },
    "/master-data/asset-type-checklist-mapping": { title: t('navigation.assetTypeChecklistMapping'), subtitle: "" },
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
    "/scrap-sales/create": {
      title: t('scrapSales.createScrapSale'),
      subtitle: "",
    },
    "/scrap-assets": {
      title: t('scrapAssets.title'),
      subtitle: "",
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
    "/certifications": { title: t('navigation.certifications'), subtitle: "" },
    "/vendor-renewal-approval": { title: t('vendorRenewalApproval.title'), subtitle: "" },
    "/master-data/roles": {
      title: t('masterDataTitles.roleManagement'),
    },
    "/adminsettings/configuration/properties": {
      title: t('masterDataTitles.properties'),
    },
    "/adminsettings/configuration/breakdown-reason-codes": {
      title: t('masterDataTitles.breakdownReasonCodes'),
    },
    "/reports/usage-based-asset": {
      title: t('navigation.usageBasedAssetReport'),
      subtitle: "",
    },
    "/reports/sla-report": {
      title: t('navigation.slaReport'),
      subtitle: "",
    },
    "/reports/qa-audit-report": {
      title: t('navigation.qaAuditReport'),
      subtitle: "",
    },
    "/reports/reopened-breakdowns": {
      title: t("reports.reopenedBreakdowns.title"),
      subtitle: "",
    },

    // Add more routes as needed
  };

  const reopenedHistoryMatch = location.pathname.match(
    /^\/reports\/reopened-breakdowns\/([^/]+)\/history$/,
  );

  const pageInfo = reopenedHistoryMatch
    ? { title: "", subtitle: "" }
    : Object.entries(pathTitleMap).find(([path]) =>
        location.pathname.startsWith(path),
      )?.[1] || { title: "", subtitle: "" };

  const handleLogout = async () => {
    try {
      setLoggingOut(true);
      setOpen(false);
      // Log audit event for logout
      const audit = recordActionByNameWithFetch("Logging Out", {
        action: "User Logged Out Successfully",
        userId: user?.user_id,
        userEmail: user?.email,
        org_id: user?.org_id,
      }).catch(() => {});

      // Don't block logout UX on audit logging.
      await Promise.race([audit, new Promise((r) => setTimeout(r, 300))]);
    } finally {
      logout();
      navigate("/");
      setLoggingOut(false);
    }
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
    <>
      {loggingOut && (
        <RouteDataLoading
          variant="fullscreen"
          message={t("auth.loggingOut") || "Logging out…"}
        />
      )}
      <header className="flex items-center justify-between gap-4 bg-white px-6 py-3 shadow-sm relative">
      {/* Breadcrumb or page title (left) — profile menu stays on the right */}
      {reopenedHistoryMatch ? (
        <nav
          className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs sm:text-sm font-semibold text-[#0E2F4B] min-w-0"
          aria-label="Breadcrumb"
        >
          <Link
            to="/reports/reopened-breakdowns"
            className="hover:underline text-[#0E2F4B]/80 hover:text-[#0E2F4B] shrink-0"
          >
            {t("reports.reopenedBreakdowns.title")}
          </Link>
          <span className="text-[#0E2F4B]/40 font-normal" aria-hidden>
            /
          </span>
          <span className="truncate min-w-0">
            {t("reports.reopenedBreakdownsHistory.title")}
          </span>
        </nav>
      ) : (
        <div className="flex flex-col min-w-0 flex-1">
          {pageInfo.title && (
            <div className="text-base sm:text-lg font-bold text-[#0E2F4B] truncate">
              {pageInfo.title}
            </div>
          )}
          {pageInfo.subtitle && (
            <div className="text-xs text-gray-600">{pageInfo.subtitle}</div>
          )}
        </div>
      )}
      
      {/* User Menu */}
      <div className="relative shrink-0" ref={dropdownRef}>
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
              disabled={loggingOut}
              className="w-full flex items-center gap-2 px-4 py-3 hover:bg-gray-100 text-gray-700"
            >
              <LogOut size={16} /> {t('auth.logout')}
            </button>
          </div>
        )}
      </div>
      </header>
    </>
  );
}
