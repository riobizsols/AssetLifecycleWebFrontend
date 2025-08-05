import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useNavigation } from "../hooks/useNavigation";
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
  History
} from "lucide-react";

const DatabaseSidebar = () => {
  const { navigation, loading, error, getAccessLevel, getAccessLevelLabel, getAccessLevelColor } = useNavigation();
  const location = useLocation();
  const [openDropdown, setOpenDropdown] = useState(null);
  const [collapsed, setCollapsed] = useState(false);

  const toggleDropdown = (id) => {
    setOpenDropdown(openDropdown === id ? null : id);
  };

  const toggleSidebar = () => setCollapsed(!collapsed);

  // Get icon based on access level
  const getAccessIcon = (accessLevel) => {
    switch (accessLevel) {
      case 'A':
        return <Shield size={12} className="text-green-400" />;
      case 'D':
        return <Eye size={12} className="text-yellow-400" />;
      default:
        return <Lock size={12} className="text-red-400" />;
    }
  };

  // Get color class based on access level
  const getAccessColorClass = (accessLevel) => {
    switch (accessLevel) {
      case 'A':
        return "border-l-2 border-green-400";
      case 'D':
        return "border-l-2 border-yellow-400";
      default:
        return "border-l-2 border-red-400";
    }
  };

  // Map app_id to route paths
  const appIdToPath = {
    'DASHBOARD': '/dashboard',
    'ASSETS': '/assets',
    'ADDASSET': '/assets/add',
    'ASSETASSIGNMENT': '/assign-department-assets',
    'VENDORS': '/master-data/vendors',
    'DEPTASSIGNMENT': '/assign-department-assets',
    'EMPASSIGNMENT': '/assign-employee-assets',
    'MAINTENANCE': '/maintenance-view', // Separate route for maintenance
    'INSPECTION': '/inspection-view', // Separate route for inspection
    'MAINTENANCEAPPROVAL': '/maintenance-approval',
    'SUPERVISORAPPROVAL': '/supervisor-approval',
    'REPORTS': '/reports-view', // Unique route for reports
    'ADMINSETTINGS': '/admin-settings-view', // Unique route for admin settings
    'MASTERDATA': '/master-data/vendors',
    'ORGANIZATIONS': '/master-data/organizations',
    'ASSETTYPES': '/master-data/asset-types',
    'DEPARTMENTS': '/master-data/departments',
    'DEPARTMENTSADMIN': '/master-data/departments-admin',
    'DEPARTMENTSASSET': '/master-data/departments-asset',
    'BRANCHES': '/master-data/branches',
    'PRODSERV': '/master-data/prod-serv',
    'ROLES': '/master-data/users',
    'USERS': '/master-data/users',
    'MAINTENANCESCHEDULE': '/maintenance-schedule-view', // Unique route
    'AUDITLOGS': '/audit-logs-view' // Unique route
  };



  // Dynamic icon component
  const getIconComponent = (appId) => {
    const iconMap = {
      'DASHBOARD': LayoutDashboard,
      'ASSETS': Package,
      'ADDASSET': Package,
      'ASSETASSIGNMENT': Users,
      'DEPTASSIGNMENT': Building,
      'EMPASSIGNMENT': UserCheck,
      'MAINTENANCE': Wrench,
      'INSPECTION': CheckSquare,
      'MAINTENANCEAPPROVAL': ClipboardList,
      'SUPERVISORAPPROVAL': UserCheck,
      'REPORTS': BarChart3,
      'ADMINSETTINGS': Settings,
      'MASTERDATA': Database,
      'ORGANIZATIONS': Building,
      'ASSETTYPES': Package,
      'DEPARTMENTS': Users,
      'DEPARTMENTSADMIN': UserCheck,
      'DEPARTMENTSASSET': Package,
      'BRANCHES': Home,
      'VENDORS': Truck,
      'PRODSERV': Briefcase,
      'ROLES': Shield,
      'USERS': Users,
      'MAINTENANCESCHEDULE': Calendar,
      'AUDITLOGS': History
    };

    const IconComponent = iconMap[appId] || Building;
    return () => <IconComponent size={16} />;
  };

  // Render navigation item
  const renderNavigationItem = (item) => {
    const path = appIdToPath[item.app_id];
    const accessLevel = getAccessLevel(item.app_id);
    const IconComponent = getIconComponent(item.app_id);
    


    if (item.is_group) {
      const hasChildren = item.children && item.children.length > 0;
      const isAnyChildActive = hasChildren && item.children.some(child => 
        location.pathname.startsWith(appIdToPath[child.app_id])
      );

      return (
        <li key={item.id} className="mb-2">
          <div
            onClick={() => toggleDropdown(item.id)}
            className={`flex items-center justify-between px-3 py-2 cursor-pointer rounded ${
              isAnyChildActive
                ? "bg-[#FFC107] text-white"
                : "hover:bg-[#143d65] text-white"
            }`}
          >
            <div className="flex items-center gap-2">
              {IconComponent && <IconComponent />}
              {!collapsed && <span>{item.label}</span>}
            </div>
            {!collapsed && hasChildren && (
              <span>{openDropdown === item.id ? <ChevronDown size={16} /> : <ChevronRight size={16} />}</span>
            )}
          </div>

          {!collapsed && openDropdown === item.id && hasChildren && (
            <ul className="ml-6 mt-1 space-y-1">
              {item.children.map((child) => {
                const childPath = appIdToPath[child.app_id];
                const childAccessLevel = getAccessLevel(child.app_id);
                const ChildIconComponent = getIconComponent(child.app_id);

                // Only show children that have access
                if (!childAccessLevel) return null;

                return (
                  <li key={child.id} className="mb-1">
                                         <NavLink
                       to={childPath || '/dashboard'}
                       className={({ isActive }) =>
                         `flex items-center gap-2 px-4 py-2 rounded text-sm ${
                           isActive
                             ? "bg-[#FFC107] text-white"
                             : "hover:bg-[#143d65] text-white"
                         } ${getAccessColorClass(childAccessLevel)}`
                       }
                     >
                      {ChildIconComponent && <ChildIconComponent />}
                      <span>{child.label}</span>
                      {getAccessIcon(childAccessLevel)}
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

             return (
         <li key={item.id} className="mb-2">
           <NavLink
             to={path || '/dashboard'}
             className={({ isActive }) =>
               `flex items-center gap-2 px-4 py-2 rounded ${
                 isActive
                   ? "bg-[#FFC107] text-white"
                   : "hover:bg-[#143d65] text-white"
               } ${getAccessColorClass(accessLevel)}`
             }
           >
             {IconComponent && <IconComponent />}
             {!collapsed && <span>{item.label}</span>}
             {!collapsed && getAccessIcon(accessLevel)}
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
            <p>Loading navigation...</p>
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
            <p>Error loading navigation</p>
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