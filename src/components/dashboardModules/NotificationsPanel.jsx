import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ExclamationTriangleIcon,
  CalendarIcon,
  UserIcon,
  ClockIcon,
} from "@heroicons/react/24/outline";
import API from "../../lib/axios";
import { useAuthStore } from "../../store/useAuthStore";

const mockAlerts = [
  {
    alertType: "Regular Maintenance",
    alertText: "Laptop Maintenance",
    dueOn: "2024-07-25",
    actionBy: "John Doe",
    cutoffDate: "2024-07-30",
    isUrgent: false,
  },
  {
    alertType: "Regular Maintenance",
    alertText: "Printer Maintenance",
    dueOn: "2024-07-22",
    actionBy: "Jane Smith",
    cutoffDate: "2024-07-24",
    isUrgent: true,
  },
];

const badgeColors = {
  "Regular Maintenance": "bg-blue-100 text-blue-800",
  Urgent: "bg-red-100 text-red-800",
};

const NotificationsPanel = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
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
        alertText: `${notification.assetTypeName} Maintenance`,
        dueOn: formatDate(notification.dueDate),
        actionBy: notification.userName || "Unassigned",
        cutoffDate: formatDate(notification.cutoffDate),
        isUrgent: notification.daysUntilCutoff <= 2, // Show urgent only when 2 days or less until cutoff
        wfamshId: notification.wfamshId, // For navigation
        id: notification.id,
        daysUntilCutoff: notification.daysUntilCutoff,
        assetId: notification.assetId // Add assetId to the transformed alert
      }));
      console.log("Transformed alerts:", transformedAlerts);
      setAlerts(transformedAlerts);
      setError(null);
    } catch (err) {
      console.error("Error fetching notifications:", err);
      setError("Failed to load notifications");
      setAlerts(mockAlerts);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString();
  };

  const handleAlertClick = (alert) => {
    // Navigate to approval detail page with wfamshId (specific workflow)
    console.log("Navigating to approval detail for wfamshId:", alert.wfamshId);
    console.log("Alert data:", alert);
    if (alert.wfamshId) {
      navigate(`/approval-detail/${alert.wfamshId}`);
    } else {
      console.warn("No wfamshId found in alert, falling back to assetId:", alert.assetId);
      navigate(`/approval-detail/${alert.assetId}`);
    }
  };

  // Fetch notifications when user changes
  useEffect(() => {
    fetchNotifications();
    // eslint-disable-next-line
  }, [user && user.emp_int_id]);

  return (
    <div>
      {/* Notification List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="animate-pulse h-16 bg-gray-100 rounded-lg" />
          ))}
        </div>
      ) : alerts.length === 0 ? (
        <div className="flex flex-col items-center text-gray-400 py-8">
          <ExclamationTriangleIcon className="w-8 h-8 mb-2" />
          <span className="text-sm">No upcoming maintenance alerts.</span>
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.slice(0, 2).map((alert, idx) => (
            <div
              key={alert.id || idx}
              className={`p-4 rounded-lg border flex flex-col gap-2 shadow-sm transition-colors duration-200 cursor-pointer
                ${alert.isUrgent ? "border-red-500 bg-red-50" : "border-gray-200 hover:bg-gray-50"}
              `}
              title={alert.isUrgent ? `Urgent: Only ${alert.daysUntilCutoff} days until cutoff!` : ""}
              onClick={() => handleAlertClick(alert)}
            >
              <div className="flex items-center gap-2">
                {alert.isUrgent && (
                  <ExclamationTriangleIcon className="w-5 h-5 text-red-500 mr-1" />
                )}
                <span className={`text-xs font-bold px-2 py-1 rounded ${badgeColors[alert.alertType] || "bg-gray-100 text-gray-800"}`}>
                  {alert.alertType}
                </span>
                <span className="font-semibold text-gray-800">{alert.alertText}</span>
                {alert.daysUntilCutoff !== undefined && (
                  <span className={`text-xs px-2 py-1 rounded ml-auto ${
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
              <div className="flex flex-wrap gap-4 text-xs text-gray-600 items-center">
                <span className="flex items-center gap-1">
                  <CalendarIcon className="w-4 h-4" />
                  Due On: <b>{alert.dueOn}</b>
                </span>
                <span className="flex items-center gap-1">
                  <UserIcon className="w-4 h-4" />
                  Action By: <b>{alert.actionBy}</b>
                </span>
                <span className="flex items-center gap-1">
                  <ClockIcon className={`w-4 h-4 ${alert.isUrgent ? "text-red-500" : ""}`} />
                  Cut-off Date: {" "}
                  <b className={alert.isUrgent ? "text-red-600" : ""}>{alert.cutoffDate}</b>
                </span>
              </div>
            </div>
          ))}
          {alerts.length > 2 && (
            <div className="text-center pt-2">
              <span className="text-sm text-gray-500">
                +{alerts.length - 2} more notifications
              </span>
            </div>
          )}
        </div>
      )}
      {error && (
        <div className="text-xs text-red-500 mt-2">{error}</div>
      )}
    </div>
  );
};

export default NotificationsPanel;
