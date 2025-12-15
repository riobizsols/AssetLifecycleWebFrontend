import { useState, useContext } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useNavigation } from "../hooks/useNavigation";
import { useLanguage } from "../contexts/LanguageContext";
import { AdminSettingsContext } from "../contexts/AdminSettingsContext";
import {
  Menu,
  Eye,
  Edit,
  Shield,
  Lock,
  ChevronDown,
  ChevronRight,
  LayoutDashboard,
  Package,
  Users,
  Settings,
  FileText,
  Building,
  Wrench,
  CheckSquare,
  BarChart3,
  UserCheck,
  ClipboardList,
  Truck,
  Briefcase,
  Home,
  Database,
  Calendar,
  History,
  DollarSign,
  GitBranch,
  AlertTriangle,
  Gauge,
  Printer,
} from "lucide-react";

const DatabaseSidebar = () => {
  const {
    navigation,
    loading,
    error,
    getAccessLevel,
    getAccessLevelLabel,
    getAccessLevelColor,
  } = useNavigation();
  const location = useLocation();
  const [openDropdown, setOpenDropdown] = useState(null);
  const [collapsed, setCollapsed] = useState(false);
  const { t } = useLanguage();
  // Get admin settings mode from context (may be undefined if not in provider)
  const adminSettingsContext = useContext(AdminSettingsContext);
  const isAdminSettingsMode = adminSettingsContext?.isAdminSettingsMode || false;

  const toggleDropdown = (id) => {
    setOpenDropdown(openDropdown === id ? null : id);
  };

  const toggleSidebar = () => setCollapsed(!collapsed);

  // Translate navigation labels
  const translateLabel = (label) => {
    // Create a mapping from English labels to translation keys
    const labelMap = {
      'Dashboard': t('navigation.dashboard'),
      'Assets': t('navigation.assets'),
      'Asset Types': t('navigation.assetTypes'),
      'Organizations': t('navigation.organizations'),
      'Departments': t('navigation.departments'),
      'Departments Admin': t('navigation.departments') + ' Admin',
      'Departments Asset': t('navigation.departments') + ' Asset',
      'Branches': t('navigation.branches'),
      'Vendors': t('navigation.vendors'),
      'Products/Services': t('navigation.productsServices'),
      'Roles': t('navigation.roles'),
      'Users': t('navigation.users'),
      'User Roles': t('navigation.userRoles'),
      'Column Access Config': t('navigation.columnAccessConfig'),
      'Bulk Upload': t('navigation.bulkUpload'),
      'Asset Assignment': t('navigation.assetAssignment'),
      'Department Assignment': t('navigation.departmentAssignment'),
      'Employee Assignment': t('navigation.employeeAssignment'),
      'Workorder Management': t('navigation.workorderManagement'),
      'Maintenance Approval': t('navigation.maintenanceApproval'),
      'Maintenance Schedule': t('navigation.maintenanceSchedule'),
      'Maintenance Sche...': t('navigation.maintenanceSchedule'),
      'Supervisor Approval': t('navigation.supervisorApproval'),
      'Serial Number Print': t('navigation.serialNumberPrint'),
      'Report Breakdown': t('navigation.reportBreakdown'),
      'Reports': t('navigation.reports'),
      'Admin Settings': t('navigation.adminSettings'),
      'Master Data': t('navigation.masterData'),
      'Scrap Sales': t('navigation.scrapSales'),
      'Scrap Assets': t('navigation.scrapAssets'),
      'Group Asset': t('navigation.groupAsset'),
      'Audit Logs': t('navigation.auditLogs'),
      // Report sub-items
      'Asset Lifecycle Report': t('navigation.assetLifecycleReport'),
      'Asset Lifecycle Re...': t('navigation.assetLifecycleReport'),
      'Asset Report': t('navigation.assetReport'),
      'Maintenance History': t('navigation.maintenanceHistory'),
      'Maintenance Histo...': t('navigation.maintenanceHistory'),
      'Maintenance History of Asset': t('navigation.maintenanceHistoryOfAsset'),
      'Asset Valuation': t('navigation.assetValuation'),
      'Asset Workflow History': t('navigation.assetWorkflowHistory'),
      'Asset Workflow Hi...': t('navigation.assetWorkflowHistory'),
      'Breakdown History': t('navigation.breakdownHistory'),
      'Usage-Based Asset Report': t('navigation.usageBasedAssetReport'),
      'SLA Reports': t('navigation.slaReport'),
      'Usage-Based Asset...': t('navigation.usageBasedAssetReport'),
    };
    
    return labelMap[label] || label; // Return original label if no translation found
  };

  // Get icon based on access level
  const getAccessIcon = (accessLevel) => {
    switch (accessLevel) {
      case "A":
        return <Shield size={12} className="text-green-400" />;
      case "D":
        return <Eye size={12} className="text-yellow-400" />;
      default:
        return <Lock size={12} className="text-red-400" />;
    }
  };

  // Get color class based on access level
  const getAccessColorClass = (accessLevel) => {
    switch (accessLevel) {
      case "A":
        return "border-l-2 border-green-400";
      case "D":
        return "border-l-2 border-yellow-400";
      default:
        return "border-l-2 border-red-400";
    }
  };

  // Map app_id to route paths
  const appIdToPath = {
    DASHBOARD: "/dashboard",
    ASSETS: "/assets", //done
    ADDASSET: "/assets/add", //done
    ASSETASSIGNMENT: "/assign-department-assets",
    VENDORS: "/master-data/vendors", //done
    DEPTASSIGNMENT: "/assign-department-assets",
    EMPASSIGNMENT: "/assign-employee-assets",
    WORKORDERMANAGEMENT: "/workorder-management", // Separate route for maintenance  //done
    INSPECTION: "/inspection-view", // Separate route for inspection
    MAINTENANCEAPPROVAL: "/maintenance-approval",
    SUPERVISORAPPROVAL: "/supervisor-approval", //done
    REPORTBREAKDOWN: "/report-breakdown", // Unique route for reports //done
    // Report routes
    ASSETLIFECYCLEREPORT: "/reports/asset-lifecycle-report",  //done
    ASSETREPORT: "/reports/asset-report",  //done
    MAINTENANCEHISTORY: "/reports/maintenance-history", //done
    ASSETVALUATION: "/reports/asset-valuation",  //done
    ASSETWORKFLOWHISTORY: "/reports/asset-workflow-history", //done
    SERIALNUMBERPRINT: "/serial-number-print", //not required
    BULKSERIALNUMBERPRINT: "/bulk-serial-number-print", // Bulk Serial Number Print route
    BREAKDOWNHISTORY: "/reports/breakdown-history",  //done
    USAGEBASEDASSETREPORT: "/reports/usage-based-asset",  //done
    SLAREPORT: "/reports/sla-report",  //done
    QAAUDITREPORT: "/reports/qa-audit-report",  //done
    ADMINSETTINGS: "/admin-settings-view", // Unique route for admin settings  //done
    MASTERDATA: "/master-data/vendors",  //done
    ORGANIZATIONS: "/master-data/organizations",  //done
    ASSETTYPES: "/master-data/asset-types",  //done
    DEPARTMENTS: "/master-data/departments",  //done
    DEPARTMENTSADMIN: "/master-data/departments-admin",  //not required
    DEPARTMENTSASSET: "/master-data/departments-asset",  //not required
    BRANCHES: "/master-data/branches", //done
    PRODSERV: "/master-data/prod-serv",  //no required
    ROLES: "/master-data/uploads",
    USERS: "/master-data/user-roles",
    USERROLES: "/master-data/job-roles", // Job Roles route
    MAINTENANCESCHEDULE: "/maintenance-schedule-view", // Unique route
    AUDITLOGS: "/audit-logs-view", // Unique route  //done
    AUDITLOGCONFIG: "/audit-log-config", // Audit Log Config route  //done
    COLUMNACCESSCONFIG: "/adminsettings/configuration/data-config", // Column Access Config route
    GROUPASSET: "/group-asset", // Group Asset route
    CREATEGROUPASSET: "/group-asset/create", // Create Group Asset route
    SCRAPSALES: "/scrap-sales", // Scrap Sales route
    SCRAPASSETS: "/scrap-assets", // Scrap Assets route  //done
  };

  // Dynamic icon component
  const getIconComponent = (appId) => {
    const iconMap = {
      DASHBOARD: LayoutDashboard,
      ASSETS: Package,
      ADDASSET: Package,
      ASSETASSIGNMENT: Users,
      DEPTASSIGNMENT: Building,
      EMPASSIGNMENT: UserCheck,
      WORKORDERMANAGEMENT: Wrench,
      INSPECTION: CheckSquare,
      MAINTENANCEAPPROVAL: ClipboardList,
      SUPERVISORAPPROVAL: UserCheck,
      REPORTBREAKDOWN: BarChart3,
      // Report icons
      ASSETLIFECYCLEREPORT: FileText,
      ASSETREPORT: FileText,
      MAINTENANCEHISTORY: Wrench,
      ASSETVALUATION: DollarSign,
      ASSETWORKFLOWHISTORY: GitBranch,
      SERIALNUMBERPRINT: History,
      BREAKDOWNHISTORY: AlertTriangle,
      USAGEBASEDASSETREPORT: Gauge,
      SLAREPORT: FileText,
      QAAUDITREPORT: FileText,
      ADMINSETTINGS: Settings,
      MASTERDATA: Database,
      ORGANIZATIONS: Building,
      ASSETTYPES: Package,
      DEPARTMENTS: Users,
      DEPARTMENTSADMIN: UserCheck,
      DEPARTMENTSASSET: Package,
      BRANCHES: Home,
      VENDORS: Truck,
      PRODSERV: Briefcase,
      ROLES: Shield,
      USERS: Users,
      MAINTENANCESCHEDULE: Calendar,
      AUDITLOGS: History,
      AUDITLOGCONFIG: Settings,
      COLUMNACCESSCONFIG: Settings,
      GROUPASSET: Package,
      SCRAPSALES: Package,
      SCRAPASSETS: Package,
    };

    const IconComponent = iconMap[appId] || Building;
    return () => <IconComponent size={16} />;
  };

  // Get path - in admin settings mode, use simplified paths under /adminsettings/configuration
  const getPath = (appId) => {
    const basePath = appIdToPath[appId];
    if (!basePath) {
      return isAdminSettingsMode ? "/adminsettings/configuration" : "/dashboard";
    }
    
    // If in admin settings mode, use simplified paths
    if (isAdminSettingsMode) {
      // For admin settings itself, return configuration path
      if (appId === "ADMINSETTINGS") {
        return "/adminsettings/configuration";
      }
      
      // For admin settings only items, use simplified paths
      // Add custom path mappings here for admin settings items
      const adminSettingsPathMap = {
        "USERROLES": "/adminsettings/configuration/job-roles",
        "BULKSERIALNUMBERPRINT": "/adminsettings/configuration/bulk-serial-number-print",
        "COLUMNACCESSCONFIG": "/adminsettings/configuration/data-config",
        // Add more mappings here as you add more admin settings menu items
        // Example: "NEW_APP_ID": "/adminsettings/configuration/new-path",
      };
      
      if (adminSettingsPathMap[appId]) {
        return adminSettingsPathMap[appId];
      }
      
      // For all other routes, prefix with /adminsettings/configuration
      // Remove leading slash from basePath to avoid double slashes
      const cleanPath = basePath.startsWith('/') ? basePath.substring(1) : basePath;
      return `/adminsettings/configuration/${cleanPath}`;
    }
    
    // Normal mode - use base path
    return basePath;
  };

  // App IDs that should only be visible in admin settings mode (/adminsettings/configuration routes)
  // Add more app IDs here as needed for future admin settings menu items
  const adminSettingsOnlyAppIds = ["USERROLES", "BULKSERIALNUMBERPRINT", "COLUMNACCESSCONFIG"];

  // Filter navigation items - admin settings only items visible only in admin settings mode
  const shouldShowItem = (item) => {
    const isAdminSettingsOnlyItem = adminSettingsOnlyAppIds.includes(item.app_id);
    
    // Hide admin settings only items when NOT in admin settings mode
    if (!isAdminSettingsMode) {
      if (isAdminSettingsOnlyItem) {
        return false;
      }
      // Check if any child is an admin settings only item and hide the parent if needed
      if (item.children && item.children.length > 0) {
        const hasAdminSettingsChild = item.children.some(child => 
          adminSettingsOnlyAppIds.includes(child.app_id)
        );
        if (hasAdminSettingsChild) {
          // Hide parent groups that only contain admin settings items
          const nonAdminSettingsChildren = item.children.filter(child => 
            !adminSettingsOnlyAppIds.includes(child.app_id)
          );
          // If all children are admin settings items, hide the parent
          if (nonAdminSettingsChildren.length === 0) {
            return false;
          }
        }
      }
      // Show all other items normally
      return true;
    }
    
    // In admin settings mode, only show admin settings only items
    if (isAdminSettingsOnlyItem) {
      return true;
    }
    
    // Check children for admin settings only items
    if (item.children && item.children.length > 0) {
      return item.children.some(child => adminSettingsOnlyAppIds.includes(child.app_id));
    }
    
    return false;
  };

  // Render navigation item
  const renderNavigationItem = (item) => {
    // Filter items when in admin settings mode
    if (!shouldShowItem(item)) {
      return null;
    }

    const path = getPath(item.app_id);
    const accessLevel = getAccessLevel(item.app_id);
    const IconComponent = getIconComponent(item.app_id);

    if (item.is_group) {
      const hasChildren = item.children && item.children.length > 0;
      const isAnyChildActive =
        hasChildren &&
        item.children.some((child) => {
          const childPath = getPath(child.app_id);
          // For COLUMNACCESSCONFIG, check exact match since it shares path with ADMINSETTINGS
          if (child.app_id === "COLUMNACCESSCONFIG") {
            return location.pathname === childPath;
          }
          return location.pathname.startsWith(childPath);
        });

      return (
        <li key={item.id} className="mb-2">
          <div
            onClick={() => toggleDropdown(item.id)}
            className={`group flex items-center justify-between px-3 py-2 cursor-pointer rounded ${
              isAnyChildActive
                ? "bg-[#FFC107] text-white"
                : "hover:bg-[#143d65] text-white"
            }`}
            title={!collapsed ? translateLabel(item.label) : ""} // Tooltip for collapsed state
          >
            <div className="flex items-center gap-2 min-w-0 flex-1">
              {IconComponent && <IconComponent className="flex-shrink-0" />}
              {!collapsed && (
                <span className="truncate text-sm font-medium">
                  {translateLabel(item.label)}
                </span>
              )}
            </div>
            {!collapsed && hasChildren && (
              <span className="flex-shrink-0 ml-2">
                {openDropdown === item.id ? (
                  <ChevronDown size={16} />
                ) : (
                  <ChevronRight size={16} />
                )}
              </span>
            )}
          </div>

          {!collapsed && openDropdown === item.id && hasChildren && (
            <ul className="ml-6 mt-1 space-y-1">
              {item.children.map((child) => {
                const isAdminSettingsOnlyChild = adminSettingsOnlyAppIds.includes(child.app_id);
                
                // Hide admin settings only items when NOT in admin settings mode
                if (!isAdminSettingsMode && isAdminSettingsOnlyChild) {
                  return null;
                }
                
                // In admin settings mode, only show admin settings only children
                if (isAdminSettingsMode && !isAdminSettingsOnlyChild) {
                  return null;
                }

                const childPath = getPath(child.app_id);
                const childAccessLevel = getAccessLevel(child.app_id);
                const ChildIconComponent = getIconComponent(child.app_id);

                // Only show children that have access
                if (!childAccessLevel) return null;

                // For COLUMNACCESSCONFIG, use exact path matching
                const isExactMatch = child.app_id === "COLUMNACCESSCONFIG";
                const customIsActive = isExactMatch 
                  ? location.pathname === childPath
                  : undefined; // Let NavLink handle it normally for others

                // For COLUMNACCESSCONFIG, check exact path match
                const isColumnAccessConfig = child.app_id === "COLUMNACCESSCONFIG";
                const isActiveForColumnAccess = isColumnAccessConfig 
                  ? location.pathname === childPath
                  : undefined;

                return (
                  <li key={child.id} className="mb-1">
                    <NavLink
                      to={childPath || "/dashboard"}
                      end={isColumnAccessConfig} // Use exact match for COLUMNACCESSCONFIG
                      className={({ isActive }) => {
                        // Use exact match check for COLUMNACCESSCONFIG
                        const active = isColumnAccessConfig 
                          ? isActiveForColumnAccess 
                          : isActive;
                        return `group flex items-center gap-2 px-4 py-2 rounded text-sm ${
                          active
                            ? "bg-[#FFC107] text-white"
                            : "hover:bg-[#143d65] text-white"
                        } ${getAccessColorClass(childAccessLevel)}`;
                      }}
                      title={translateLabel(child.label)}
                    >
                      {ChildIconComponent && (
                        <ChildIconComponent className="flex-shrink-0" />
                      )}
                      <span className="truncate flex-1 min-w-0">
                        {translateLabel(child.label)}
                      </span>
                      <span className="flex-shrink-0">
                        {getAccessIcon(childAccessLevel)}
                      </span>
                    </NavLink>
                  </li>
                );
              })}
            </ul>
          )}
        </li>
      );
    } else {
      // Only show items that have access
      if (!accessLevel) return null;

      // For COLUMNACCESSCONFIG, check exact path match
      const isColumnAccessConfig = item.app_id === "COLUMNACCESSCONFIG";
      const isActiveForColumnAccess = isColumnAccessConfig 
        ? location.pathname === path
        : undefined;

      return (
        <li key={item.id} className="mb-2">
          <NavLink
            to={path || "/dashboard"}
            end={isColumnAccessConfig} // Use exact match for COLUMNACCESSCONFIG
            className={({ isActive }) => {
              // Use exact match check for COLUMNACCESSCONFIG
              const active = isColumnAccessConfig 
                ? isActiveForColumnAccess 
                : isActive;
              return `group flex items-center gap-2 px-4 py-2 rounded ${
                active
                  ? "bg-[#FFC107] text-white"
                  : "hover:bg-[#143d65] text-white"
              } ${getAccessColorClass(accessLevel)}`;
            }}
              title={!collapsed ? translateLabel(item.label) : ""}
            >
              {IconComponent && <IconComponent className="flex-shrink-0" />}
              {!collapsed && (
                <span className="truncate flex-1 min-w-0 text-sm font-medium">
                  {translateLabel(item.label)}
                </span>
              )}
            {!collapsed && (
              <span className="flex-shrink-0">
                {getAccessIcon(accessLevel)}
              </span>
            )}
          </NavLink>
        </li>
      );
    }
  };

  if (loading) {
    return (
      <aside className="w-64 h-screen bg-[#0E2F4B] text-white shadow overflow-y-auto">
        <div className="flex justify-center items-center h-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
            <p>{t('common.loading')}</p>
          </div>
        </div>
      </aside>
    );
  }

  if (error) {
    return (
      <aside className="w-64 h-screen bg-[#0E2F4B] text-white shadow overflow-y-auto">
        <div className="flex justify-center items-center h-full">
          <div className="text-center text-red-300">
            <p>{t('common.error')}</p>
            <p className="text-sm">{error}</p>
          </div>
        </div>
      </aside>
    );
  }

  return (
    <aside
      className={`${
        collapsed ? "w-16" : "w-64"
      } h-screen bg-[#0E2F4B] text-white shadow overflow-y-auto transition-all duration-300 relative`}
    >
      {/* Logo & Toggle Button */}
      <div className="flex justify-center items-center mb-6 px-4">
        {!collapsed && (
          <img src="/logo.png" alt="Logo" className="h-10 md:h-[60px] w-auto" />
        )}
        <button className="md:hidden text-white ml-20" onClick={toggleSidebar}>
          <Menu size={20} />
        </button>
      </div>

      {/* Navigation Items */}
      <ul className="px-2 pb-4 overflow-y-auto no-scrollbar">
        {navigation.length === 0 ? (
          <li className="text-center py-4 text-gray-300">
            <div className="text-sm">
              <p>No navigation items found.</p>
              <p className="text-xs mt-1">Please check your database setup.</p>
            </div>
          </li>
        ) : (
          navigation.map((item) => renderNavigationItem(item))
        )}
      </ul>
    </aside>
  );
};

export default DatabaseSidebar;
