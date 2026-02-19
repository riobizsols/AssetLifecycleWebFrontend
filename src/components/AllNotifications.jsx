import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ExclamationTriangleIcon,
  CalendarIcon,
  UserIcon,
  ClockIcon,
  BellIcon,
  FunnelIcon,
} from "@heroicons/react/24/outline";
import API from "../lib/axios";
import { useAuthStore } from "../store/useAuthStore";
import { useLanguage } from "../contexts/LanguageContext";

const badgeColors = {
  "Regular Maintenance": "bg-blue-100 text-blue-800",
  "Inspection": "bg-green-100 text-green-800",
  "Urgent": "bg-red-100 text-red-800",
};

const AllNotifications = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { t } = useLanguage();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Filter state
  const [selectedFilters, setSelectedFilters] = useState({
    inspection: true,
    maintenance: true,
    vendorRenewal: true,
    subscriptionRenewal: true,
  });
  const [showFilters, setShowFilters] = useState(false);

  // Debug: Log user data
  useEffect(() => {
    console.log("Auth store user data:", user);
  }, [user]);

  // Filter utility functions
  const getNotificationType = (alert) => {
    // Check for inspection notifications
    if (alert.workflowType === 'INSPECTION' || alert.alertType === 'Inspection') {
      return 'inspection';
    }
    
    // Check for subscription renewal notifications
    if (alert.alertType?.toLowerCase().includes('subscription') || 
        alert.alertText?.toLowerCase().includes('subscription')) {
      return 'subscriptionRenewal';
    }
    
    // Check for vendor renewal notifications
    if (alert.alertType?.toLowerCase().includes('renewal') || 
        alert.alertText?.toLowerCase().includes('renewal') ||
        alert.alertText?.toLowerCase().includes('contract')) {
      return 'vendorRenewal';
    }
    
    // All other notifications are maintenance
    return 'maintenance';
  };

  const filterNotifications = (notifications) => {
    return notifications.filter(alert => {
      const type = getNotificationType(alert);
      return selectedFilters[type];
    });
  };

  const handleFilterChange = (filterType) => {
    setSelectedFilters(prev => ({
      ...prev,
      [filterType]: !prev[filterType]
    }));
  };

  const getFilteredAlerts = () => {
    return filterNotifications(alerts);
  };

  const getFilterCount = (filterType) => {
    return alerts.filter(alert => getNotificationType(alert) === filterType).length;
  };

  const fetchNotifications = async () => {
    if (!user || !user.emp_int_id) {
      console.log("No user or emp_int_id found:", user);
      setAlerts([]);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const url = `/notifications/user/${user.emp_int_id}`;
      console.log("Fetching notifications from:", url);
      console.log("Current user:", user);
      const response = await API.get(url);
      const notifications = response.data.data || [];
      console.log("API response:", response.data);
      console.log("Notifications received:", notifications.length, "items");
      // Transform API data to match the existing UI structure
      const transformedAlerts = notifications.map(notification => ({
        alertType: notification.workflowType === 'INSPECTION' 
          ? "Inspection" 
          : notification.maintenanceType || "Regular Maintenance",
        alertText: notification.isGroupMaintenance && notification.groupName
          ? `${notification.groupName} (${notification.groupAssetCount} assets)`
          : notification.workflowType === 'INSPECTION'
          ? `${notification.assetTypeName} Inspection`
          : `${notification.assetTypeName} Maintenance`,
        dueOn: formatDate(notification.dueDate),
        actionBy: notification.userName || "Unassigned",
        cutoffDate: formatDate(notification.cutoffDate),
        isUrgent: notification.daysUntilCutoff <= 2, // Show urgent only when 2 days or less until cutoff
        wfamshId: notification.wfamshId, // For navigation
        route: notification.route,
        workflowType: notification.workflowType,
        workflowId: notification.workflowId,
        id: notification.id,
        daysUntilCutoff: notification.daysUntilCutoff,
        assetId: notification.assetId, // Add assetId to the transformed alert
        // Group asset maintenance information
        isGroupMaintenance: notification.isGroupMaintenance || false,
        groupId: notification.groupId,
        groupName: notification.groupName,
        groupAssetCount: notification.groupAssetCount,
        assetTypeName: notification.assetTypeName
      }));
      console.log("Transformed alerts:", transformedAlerts);
      setAlerts(transformedAlerts);
      setError(null);
    } catch (err) {
      console.error("Error fetching notifications:", err);
      setError("Failed to load notifications");
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString();
  };

  const handleAlertClick = (alert) => {
    console.log("Navigating from alert:", alert);
    if (alert.route) {
      navigate(alert.route);
      return;
    }
    if (alert.workflowType === "SCRAP" && alert.workflowId) {
      navigate(`/scrap-approval-detail/${alert.workflowId}?context=SCRAPMAINTENANCEAPPROVAL`);
      return;
    }
    if (alert.workflowType === "INSPECTION" && alert.wfamshId) {
      navigate(`/inspection-approval-detail/${alert.wfamshId}`);
      return;
    }
    if (alert.wfamshId) {
      navigate(`/approval-detail/${alert.wfamshId}`);
      return;
    }
    if (alert.assetId) {
      navigate(`/approval-detail/${alert.assetId}`);
    }
  };

  // Fetch notifications when user changes
  useEffect(() => {
    fetchNotifications();
    // eslint-disable-next-line
  }, [user && user.emp_int_id]);

  return (
    <div className="min-h-screen bg-white">
      
      <div className="relative p-6">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-100 rounded-lg">
              <BellIcon className="w-8 h-8 text-blue-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">All Notifications</h1>
          </div>
          <p className="text-gray-600">
            View and manage all your maintenance notifications
          </p>
        </div>

        {/* Filter Section */}
        <div className="mb-6">
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <FunnelIcon className="w-5 h-5 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Filters</span>
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                {Object.values(selectedFilters).filter(Boolean).length}
              </span>
            </button>
            
            {alerts.length > 0 && (
              <div className="text-sm text-gray-500">
                Showing {getFilteredAlerts().length} of {alerts.length} notifications
              </div>
            )}
          </div>

          {showFilters && (
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 mb-4">
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedFilters.inspection}
                    onChange={() => handleFilterChange('inspection')}
                    className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Inspection ({getFilterCount('inspection')})
                  </span>
                  <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                    Inspections
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedFilters.maintenance}
                    onChange={() => handleFilterChange('maintenance')}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Maintenance ({getFilterCount('maintenance')})
                  </span>
                  <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                    Maintenance
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedFilters.vendorRenewal}
                    onChange={() => handleFilterChange('vendorRenewal')}
                    className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Vendor Renewal ({getFilterCount('vendorRenewal')})
                  </span>
                  <span className="px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded-full">
                    Contracts
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedFilters.subscriptionRenewal}
                    onChange={() => handleFilterChange('subscriptionRenewal')}
                    className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Subscription Renewal ({getFilterCount('subscriptionRenewal')})
                  </span>
                  <span className="px-2 py-1 text-xs bg-orange-100 text-orange-800 rounded-full">
                    Subscriptions
                  </span>
                </label>
              </div>
            </div>
          )}
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="animate-pulse h-20 bg-gray-100 rounded-xl shadow-sm border border-gray-200" />
            ))}
          </div>
        ) : getFilteredAlerts().length === 0 ? (
          <div className="flex flex-col items-center text-gray-400 py-12 bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="p-4 bg-blue-100 rounded-full mb-4">
              <BellIcon className="w-16 h-16 text-blue-400" />
            </div>
            <h3 className="text-lg font-semibold mb-2 text-gray-600">
              {alerts.length === 0 ? "No Notifications" : "No Matching Notifications"}
            </h3>
            <span className="text-sm text-gray-500">
              {alerts.length === 0 
                ? "You don't have any maintenance notifications at the moment."
                : "No notifications match your current filter selection. Try adjusting the filters above."
              }
            </span>
          </div>
        ) : (
          <div className="space-y-4">
            {getFilteredAlerts().map((alert, idx) => (
              <div
                key={alert.id || idx}
                className={`p-6 rounded-xl border flex flex-col gap-3 shadow-lg transition-all duration-300 cursor-pointer
                  ${alert.isUrgent 
                    ? "border-red-300 bg-gradient-to-r from-red-50 to-pink-50 hover:shadow-red-200/50 hover:shadow-xl" 
                    : "border-gray-200 bg-white hover:bg-gray-50 hover:shadow-xl"
                  }
                `}
                title={alert.isUrgent ? `Urgent: Only ${alert.daysUntilCutoff} days until cutoff!` : ""}
                onClick={() => handleAlertClick(alert)}
              >
              <div className="flex items-center gap-3 flex-wrap">
                {alert.isUrgent && (
                  <ExclamationTriangleIcon className="w-6 h-6 text-red-500" />
                )}
                <span className={`text-sm font-bold px-3 py-1 rounded-full ${badgeColors[alert.alertType] || "bg-gray-100 text-gray-800"}`}>
                  {alert.alertType}
                </span>
                {alert.isGroupMaintenance && (
                  <span className="text-sm font-semibold px-3 py-1 rounded-full bg-blue-100 text-blue-800">
                    Group Maintenance
                  </span>
                )}
                <span className="font-semibold text-gray-800 text-lg">{alert.alertText}</span>
                {alert.daysUntilCutoff !== undefined && (
                  <span className={`text-sm px-3 py-1 rounded-full ml-auto ${
                    alert.isUrgent 
                      ? "bg-red-100 text-red-700 font-semibold" 
                      : "bg-gray-100 text-gray-600"
                  }`}>
                    {alert.daysUntilCutoff <= 0 
                      ? "OVERDUE" 
                      : `${alert.daysUntilCutoff} day${alert.daysUntilCutoff !== 1 ? 's' : ''} left`
                    }
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-6 text-sm text-gray-600 items-center">
                <span className="flex items-center gap-2">
                  <CalendarIcon className="w-5 h-5" />
                  <span>Due On: <b className="text-gray-800">{alert.dueOn}</b></span>
                </span>
                <span className="flex items-center gap-2">
                  <UserIcon className="w-5 h-5" />
                  <span>Action By: <b className="text-gray-800">{alert.actionBy}</b></span>
                </span>
                <span className="flex items-center gap-2">
                  <ClockIcon className={`w-5 h-5 ${alert.isUrgent ? "text-red-500" : ""}`} />
                  <span>Cut-off Date: <b className={alert.isUrgent ? "text-red-600" : "text-gray-800"}>{alert.cutoffDate}</b></span>
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
      
        {error && (
          <div className="text-center py-8 bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="text-red-500 mb-2">⚠️ Error</div>
            <div className="text-sm text-gray-600">{error}</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AllNotifications;
