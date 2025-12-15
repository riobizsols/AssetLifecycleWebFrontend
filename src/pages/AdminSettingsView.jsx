import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useNavigation } from '../hooks/useNavigation';
import { useLanguage } from '../contexts/LanguageContext';
import { 
  Settings, 
  Users, 
  Shield, 
  Printer, 
  ArrowRight, 
  Lock, 
  CheckCircle,
  KeyRound,
  Database,
  FileText,
  Cog,
  Sparkles,
  Wrench,
  Tag,
  AlertTriangle
} from 'lucide-react';

const AdminSettingsView = () => {
  const navigate = useNavigate();
  const { navigation, hasAccess, getAccessLevel, loading } = useNavigation();
  const { t } = useLanguage();

  // Get admin settings items from navigation
  const getAdminSettingsItems = () => {
    if (!navigation || navigation.length === 0) return [];

    // Find Admin Settings in navigation
    const findAdminSettings = (items) => {
      for (const item of items) {
        if (item.app_id === 'ADMINSETTINGS' && item.children) {
          return item.children.filter(child => {
            // Only show items the user has access to
            return hasAccess(child.app_id);
          });
        }
        if (item.children && item.children.length > 0) {
          const found = findAdminSettings(item.children);
          if (found) return found;
        }
      }
      return [];
    };

    return findAdminSettings(navigation);
  };

  const adminSettingsItems = getAdminSettingsItems();

  // Default items to show even if navigation is empty (for better UX)
  const defaultItems = [
    {
      app_id: 'USERROLES',
      label: 'Job Roles',
      description: 'Configure job roles and navigation permissions for different user roles',
      icon: Users,
      route: '/adminsettings/configuration/job-roles',
      color: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-50',
      iconColor: 'text-blue-600',
      borderColor: 'border-blue-200',
    },
    {
      app_id: 'COLUMNACCESSCONFIG',
      label: 'Column Access Config',
      description: 'Manage column-level access control for different job roles in data tables',
      icon: Shield,
      route: '/adminsettings/configuration/data-config',
      color: 'from-purple-500 to-purple-600',
      bgColor: 'bg-purple-50',
      iconColor: 'text-purple-600',
      borderColor: 'border-purple-200',
    },
    {
      app_id: 'BULKSERIALNUMBERPRINT',
      label: 'Bulk Serial Number Print',
      description: 'Configure and manage bulk printing of serial number labels',
      icon: Printer,
      route: '/adminsettings/configuration/bulk-serial-number-print',
      color: 'from-green-500 to-green-600',
      bgColor: 'bg-green-50',
      iconColor: 'text-green-600',
      borderColor: 'border-green-200',
    },
    {
      app_id: 'MAINTENANCECONFIG',
      label: 'Maintenance Configuration',
      description: 'Configure maintenance details and frequency settings',
      icon: Wrench,
      route: '/adminsettings/configuration/maintenance-config',
      color: 'from-orange-500 to-orange-600',
      bgColor: 'bg-orange-50',
      iconColor: 'text-orange-600',
      borderColor: 'border-orange-200',
    },
    {
      app_id: 'PROPERTIES',
      label: 'Properties',
      description: 'Manage asset properties and list values',
      icon: Tag,
      route: '/adminsettings/configuration/properties',
      color: 'from-indigo-500 to-indigo-600',
      bgColor: 'bg-indigo-50',
      iconColor: 'text-indigo-600',
      borderColor: 'border-indigo-200',
    },
    {
      app_id: 'BREAKDOWNREASONCODES',
      label: 'Breakdown Reason Codes',
      description: 'Configure breakdown reason codes for asset types',
      icon: AlertTriangle,
      route: '/adminsettings/configuration/breakdown-reason-codes',
      color: 'from-red-500 to-red-600',
      bgColor: 'bg-red-50',
      iconColor: 'text-red-600',
      borderColor: 'border-red-200',
    },
  ];

  // Use navigation items if available, otherwise use defaults (filtered by access)
  const itemsToShow = adminSettingsItems.length > 0 
    ? adminSettingsItems.map(item => {
        const defaultItem = defaultItems.find(d => d.app_id === item.app_id);
        return {
          ...item,
          ...defaultItem,
          label: item.label || item.app_name || defaultItem?.label || item.app_id,
        };
      })
    : defaultItems.filter(item => hasAccess(item.app_id));

  // Map app IDs to routes and icons
  const getItemRoute = (appId) => {
    const routeMap = {
      'USERROLES': '/adminsettings/configuration/job-roles',
      'COLUMNACCESSCONFIG': '/adminsettings/configuration/data-config',
      'BULKSERIALNUMBERPRINT': '/adminsettings/configuration/bulk-serial-number-print',
      'MAINTENANCECONFIG': '/adminsettings/configuration/maintenance-config',
      'PROPERTIES': '/adminsettings/configuration/properties',
      'BREAKDOWNREASONCODES': '/adminsettings/configuration/breakdown-reason-codes',
    };
    return routeMap[appId] || '#';
  };

  const getItemIcon = (appId) => {
    const iconMap = {
      'USERROLES': Users,
      'COLUMNACCESSCONFIG': Shield,
      'BULKSERIALNUMBERPRINT': Printer,
      'MAINTENANCECONFIG': Wrench,
      'PROPERTIES': Tag,
      'BREAKDOWNREASONCODES': AlertTriangle,
    };
    return iconMap[appId] || Settings;
  };

  const getItemColors = (appId) => {
    const colorMap = {
      'USERROLES': {
        gradient: 'from-blue-500 to-blue-600',
        bg: 'bg-blue-50',
        icon: 'text-blue-600',
        border: 'border-blue-200',
        hover: 'hover:from-blue-600 hover:to-blue-700',
      },
      'COLUMNACCESSCONFIG': {
        gradient: 'from-purple-500 to-purple-600',
        bg: 'bg-purple-50',
        icon: 'text-purple-600',
        border: 'border-purple-200',
        hover: 'hover:from-purple-600 hover:to-purple-700',
      },
      'BULKSERIALNUMBERPRINT': {
        gradient: 'from-green-500 to-green-600',
        bg: 'bg-green-50',
        icon: 'text-green-600',
        border: 'border-green-200',
        hover: 'hover:from-green-600 hover:to-green-700',
      },
      'MAINTENANCECONFIG': {
        gradient: 'from-orange-500 to-orange-600',
        bg: 'bg-orange-50',
        icon: 'text-orange-600',
        border: 'border-orange-200',
        hover: 'hover:from-orange-600 hover:to-orange-700',
      },
      'PROPERTIES': {
        gradient: 'from-indigo-500 to-indigo-600',
        bg: 'bg-indigo-50',
        icon: 'text-indigo-600',
        border: 'border-indigo-200',
        hover: 'hover:from-indigo-600 hover:to-indigo-700',
      },
      'BREAKDOWNREASONCODES': {
        gradient: 'from-red-500 to-red-600',
        bg: 'bg-red-50',
        icon: 'text-red-600',
        border: 'border-red-200',
        hover: 'hover:from-red-600 hover:to-red-700',
      },
    };
    return colorMap[appId] || {
      gradient: 'from-gray-500 to-gray-600',
      bg: 'bg-gray-50',
      icon: 'text-gray-600',
      border: 'border-gray-200',
      hover: 'hover:from-gray-600 hover:to-gray-700',
    };
  };

  const handleItemClick = (appId) => {
    const route = getItemRoute(appId);
    if (route !== '#') {
      navigate(route);
    }
  };

  if (loading) {
  return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading admin settings...</p>
      </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50">
      {/* Hero Header Section */}
      <div className="relative bg-gradient-to-br from-[#0E2F4B] via-[#143d65] to-[#1a4d7a] text-white overflow-hidden">
        {/* Decorative Background Elements */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-96 h-96 bg-blue-400 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-400 rounded-full blur-3xl"></div>
        </div>
        
        <div className="relative max-w-7xl mx-auto px-6 py-16">
          <div className="flex flex-col md:flex-row items-center gap-8">
            {/* Large Icon/Logo */}
            <div className="relative">
              <div className="absolute inset-0 bg-white/20 rounded-3xl blur-xl"></div>
              <div className="relative p-6 bg-gradient-to-br from-white/30 to-white/10 rounded-3xl backdrop-blur-md border border-white/20 shadow-2xl">
                <Cog className="w-16 h-16 animate-spin-slow" style={{ animation: 'spin 20s linear infinite' }} />
              </div>
              <div className="absolute -top-2 -right-2">
                <Sparkles className="w-8 h-8 text-yellow-300 animate-pulse" />
              </div>
            </div>
            
            {/* Title Section */}
            <div className="flex-1 text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-3 mb-4">
                <KeyRound className="w-8 h-8 text-blue-300" />
                <h1 className="text-5xl md:text-6xl font-extrabold bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">
                  {t('navigation.adminSettings')}
                </h1>
              </div>
              <p className="text-xl text-blue-100 font-light">
                Centralized control center for system configuration
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        {itemsToShow.length === 0 ? (
          <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl p-16 text-center border border-gray-200/50">
            <div className="max-w-lg mx-auto">
              <div className="relative mb-8">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-40 h-40 bg-gradient-to-br from-blue-200/50 to-purple-200/50 rounded-full blur-3xl"></div>
                </div>
                <div className="relative">
                  <div className="w-32 h-32 bg-gradient-to-br from-blue-500 via-purple-500 to-indigo-500 rounded-3xl mx-auto flex items-center justify-center shadow-2xl transform rotate-3 hover:rotate-6 transition-transform">
                    <Lock className="w-16 h-16 text-white" />
                  </div>
                </div>
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Access Restricted</h2>
              <p className="text-gray-600 text-lg mb-8">
                Administrative privileges required to access configuration settings
              </p>
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200 rounded-2xl p-6 shadow-inner">
                <p className="text-blue-900 font-medium">
                  <strong className="flex items-center justify-center gap-2 mb-2">
                    <Database className="w-5 h-5" />
                    Contact System Administrator
                  </strong>
                  <span className="text-sm text-blue-700 block">
                    Request access permissions to manage system settings
                  </span>
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className={`grid gap-4 ${
            itemsToShow.length <= 3 
              ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' 
              : itemsToShow.length <= 6
              ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
              : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5'
          }`}>
            {itemsToShow.map((item) => {
              const Icon = getItemIcon(item.app_id);
              const route = getItemRoute(item.app_id);
              const accessLevel = getAccessLevel(item.app_id);
              const isReadOnly = accessLevel === 'D';
              const colors = getItemColors(item.app_id);
              const canAccess = route !== '#' && hasAccess(item.app_id);

              return (
                <div
                  key={item.app_id}
                  onClick={() => canAccess && handleItemClick(item.app_id)}
                  className={`group relative bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border-2 ${colors.border} overflow-hidden transition-all duration-300 ${
                    canAccess 
                      ? 'cursor-pointer hover:shadow-xl hover:-translate-y-1 hover:scale-[1.02] hover:border-opacity-100' 
                      : 'opacity-60 cursor-not-allowed'
                  }`}
                >
                  {/* Animated Gradient Accent Bar */}
                  <div className={`h-1 bg-gradient-to-r ${colors.gradient} ${canAccess ? `group-hover:${colors.hover}` : ''} transition-all duration-300 relative overflow-hidden`}>
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"></div>
                  </div>
                  
                  <div className="p-4">
                    {/* Icon Section with Enhanced Design */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="relative">
                        {/* Glow Effect */}
                        <div className={`absolute inset-0 ${colors.bg} rounded-xl blur-lg opacity-40 group-hover:opacity-60 transition-opacity`}></div>
                        {/* Icon Container */}
                        <div className={`relative p-2.5 ${colors.bg} rounded-xl group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-md`}>
                          <Icon className={`w-6 h-6 ${colors.icon}`} />
                        </div>
                        {/* Decorative Corner */}
                        <div className={`absolute -top-0.5 -right-0.5 w-4 h-4 bg-gradient-to-br ${colors.gradient} rounded-bl-xl rounded-tr-xl opacity-0 group-hover:opacity-100 transition-opacity`}></div>
                      </div>
                      
                      {/* Access Badge */}
                      {isReadOnly && (
                        <span className="flex items-center gap-1 text-[10px] font-semibold bg-gradient-to-r from-amber-100 to-orange-100 text-amber-900 px-2 py-1 rounded-full border border-amber-300">
                          <Lock className="w-2.5 h-2.5" />
                          View
                        </span>
                      )}
                      {!isReadOnly && canAccess && (
                        <span className="flex items-center gap-1 text-[10px] font-semibold bg-gradient-to-r from-green-100 to-emerald-100 text-green-900 px-2 py-1 rounded-full border border-green-300">
                          <CheckCircle className="w-2.5 h-2.5" />
                          Full
                        </span>
                      )}
                    </div>

                    {/* Title */}
                    <h3 className="text-base font-bold text-gray-900 mb-1.5 group-hover:text-gray-700 transition-colors line-clamp-1">
                      {item.label || item.app_name || item.app_id}
                    </h3>

                    {/* Description */}
                    <p className="text-xs text-gray-600 mb-3 leading-relaxed line-clamp-2 min-h-[2.5rem]">
                      {item.description || `Configure ${item.label || item.app_name || item.app_id.toLowerCase()}`}
                    </p>

                    {/* Action Indicator */}
                    {canAccess && (
                      <div className="flex items-center justify-between pt-2.5 border-t border-gray-200">
                        <span className="text-xs font-medium text-gray-700 group-hover:text-gray-900 transition-colors">
                          Open
                        </span>
                        <div className={`p-1.5 ${colors.bg} rounded-md group-hover:scale-110 transition-transform`}>
                          <ArrowRight className={`w-3.5 h-3.5 ${colors.icon} group-hover:translate-x-0.5 transition-transform`} />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Hover Effect Overlay with Gradient */}
                  {canAccess && (
                    <div className={`absolute inset-0 bg-gradient-to-br from-transparent via-${colors.bg.replace('bg-', '')}/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-2xl`}></div>
                  )}

                  {/* Shine Effect on Hover */}
                  {canAccess && (
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000"></div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add custom animation for shimmer effect */}
      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .animate-shimmer {
          animation: shimmer 2s infinite;
        }
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 20s linear infinite;
        }
      `}</style>
    </div>
  );
};

export default AdminSettingsView; 