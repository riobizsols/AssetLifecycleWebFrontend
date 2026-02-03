import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ExclamationTriangleIcon,
  CalendarIcon,
  UserIcon,
  ClockIcon,
  BellIcon,
} from "@heroicons/react/24/outline";
import API from "../lib/axios";
import { useAuthStore } from "../store/useAuthStore";
import { useLanguage } from "../contexts/LanguageContext";

const badgeColors = {
  "Regular Maintenance": "bg-blue-100 text-blue-800",
  Urgent: "bg-red-100 text-red-800",
};

const AllNotifications = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { t } = useLanguage();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Debug: Log user data
  useEffect(() => {
    console.log("Auth store user data:", user);
  }, [user]);

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
      console.log("Notifications received:", notifications);
      // Transform API data to match the existing UI structure
      const transformedAlerts = notifications.map(notification => ({
        alertType: notification.maintenanceType || "Regular Maintenance",
        alertText: notification.isGroupMaintenance && notification.groupName
          ? `${notification.groupName} (${notification.groupAssetCount} assets)`
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

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="animate-pulse h-20 bg-gray-100 rounded-xl shadow-sm border border-gray-200" />
            ))}
          </div>
        ) : alerts.length === 0 ? (
          <div className="flex flex-col items-center text-gray-400 py-12 bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="p-4 bg-blue-100 rounded-full mb-4">
              <BellIcon className="w-16 h-16 text-blue-400" />
            </div>
            <h3 className="text-lg font-semibold mb-2 text-gray-600">No Notifications</h3>
            <span className="text-sm text-gray-500">You don't have any maintenance notifications at the moment.</span>
          </div>
        ) : (
          <div className="space-y-4">
            {alerts.map((alert, idx) => (
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
