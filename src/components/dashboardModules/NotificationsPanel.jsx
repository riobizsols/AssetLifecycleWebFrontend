import { showBackendTextToast } from '../../utils/errorTranslation';
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
import toast from "react-hot-toast";

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
  "Inspection": "bg-green-100 text-green-800",
  "Vendor Contract Renewal": "bg-orange-100 text-orange-800",
  "Warranty Expiry": "bg-amber-100 text-amber-800",
  Urgent: "bg-red-100 text-red-800",
};

const NotificationsPanel = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openActionMenuId, setOpenActionMenuId] = useState(null);
  const [openSnoozeMenuId, setOpenSnoozeMenuId] = useState(null);
  const [snoozeDrafts, setSnoozeDrafts] = useState({});
  const [openingNotifyIds, setOpeningNotifyIds] = useState({});

  const isUnreadWarranty = (status) => {
    const normalized = String(status || "").toUpperCase();
    return normalized === "NEW" || normalized === "UNREAD";
  };

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
      const transformedAlerts = notifications.map(notification => {
        // Determine alert type based on workflowType or maintenanceType
        let alertType = "Regular Maintenance";
        if (notification.workflowType === 'INSPECTION') {
          alertType = "Inspection";
        } else if (notification.workflowType === "WARRANTY") {
          alertType = "Warranty Expiry";
        } else if (notification.maintenanceType) {
          alertType = notification.maintenanceType;
        }
        
        let alertText = "";
        
        if (alertType === 'Inspection') {
           alertText = `${notification.assetTypeName} Inspection`;
        } else if (alertType === "Warranty Expiry") {
           alertText = `${notification.assetId} - ${notification.title || "Warranty Expiry"}`;
        } else if (String(notification.maintenanceType || "").toLowerCase().includes("subscription")) {
           alertText = `${notification.assetTypeName}`;
        } else if (alertType === 'Vendor Contract Renewal') {
           alertText = `${notification.assetTypeName}`; 
        } else if (notification.isGroupMaintenance && notification.groupName) {
           alertText = `${notification.groupName} (${notification.groupAssetCount} assets)`;
        } else {
           alertText = `${notification.assetTypeName} Maintenance`;
        }
        
        return {
        alertType: alertType,
        alertText: alertText,
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
        ,
        notifyId: notification.notifyId,
        notificationStatus: notification.notificationStatus,
        canChangeVendor: !!notification.canChangeVendor
      }});
      
      // Filter to show up to 2 notifications with smart fallback
      const maintenanceAlerts = transformedAlerts.filter(alert => 
        alert.alertType !== 'Inspection' && alert.workflowType !== 'INSPECTION'
      );
      const inspectionAlerts = transformedAlerts.filter(alert => 
        alert.alertType === 'Inspection' || alert.workflowType === 'INSPECTION'
      );
      
      const dashboardAlerts = [];
      
      // Smart selection logic for dashboard display
      if (maintenanceAlerts.length > 0 && inspectionAlerts.length > 0) {
        // Both types available: show 1 of each
        dashboardAlerts.push(maintenanceAlerts[0]);
        dashboardAlerts.push(inspectionAlerts[0]);
      } else if (maintenanceAlerts.length > 0) {
        // Only maintenance available: show up to 2 maintenance
        dashboardAlerts.push(...maintenanceAlerts.slice(0, 2));
      } else if (inspectionAlerts.length > 0) {
        // Only inspection available: show up to 2 inspection  
        dashboardAlerts.push(...inspectionAlerts.slice(0, 2));
      }
      
      console.log("Dashboard alerts selection:");
      console.log(`  - Total available: ${transformedAlerts.length}`);
      console.log(`  - Maintenance available: ${maintenanceAlerts.length}`);  
      console.log(`  - Inspection available: ${inspectionAlerts.length}`);
      console.log(`  - Selected for dashboard: ${dashboardAlerts.length}`, dashboardAlerts);
      
      setAlerts(dashboardAlerts);
      setError(null);
    } catch (err) {
      console.error("Error fetching notifications:", err);
      setError("Failed to load notifications");
      setAlerts(mockAlerts.slice(0, 2)); // Limit mock data to 2 as well
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString();
  };

  const handleAlertClick = (alert) => {
    if (alert.workflowType === "WARRANTY" && alert.notifyId) {
      const currentStatus = String(alert.notificationStatus || "").toUpperCase();
      if (!isUnreadWarranty(currentStatus) || openingNotifyIds[alert.notifyId]) {
        return;
      }

      // Optimistic row update for immediate bold -> normal feedback.
      setAlerts((prev) =>
        prev.map((item) => {
          const sameNotification =
            (item.notifyId && item.notifyId === alert.notifyId) ||
            (!item.notifyId && item.id === alert.id);
          return sameNotification ? { ...item, notificationStatus: "OPEN" } : item;
        })
      );

      setOpeningNotifyIds((prev) => ({ ...prev, [alert.notifyId]: true }));
      API.put(`/notifications/warranty/${alert.notifyId}/open`)
        .catch(() => {
          setAlerts((prev) =>
            prev.map((item) => {
              const sameNotification =
                (item.notifyId && item.notifyId === alert.notifyId) ||
                (!item.notifyId && item.id === alert.id);
              return sameNotification
                ? { ...item, notificationStatus: alert.notificationStatus || "NEW" }
                : item;
            })
          );
        })
        .finally(() => {
          setOpeningNotifyIds((prev) => {
            const next = { ...prev };
            delete next[alert.notifyId];
            return next;
          });
        });
      return;
    }

    console.log("Navigating from alert:", alert);
    if (alert.route) {
      navigate(alert.route);
      return;
    }
    if (alert.workflowType === "SCRAP" && alert.workflowId) {
      navigate(`/scrap-approval-detail/${alert.workflowId}?context=SCRAPMAINTENANCEAPPROVAL`);
      return;
    }
    if (alert.alertType === "Inspection") {
        // If the user is an approver, they likely go to approval detail:
        navigate(`/inspection-approval`); 
        // Or if specific ID: `/inspection-approval/${alert.wfamshId}`
        // But for now, just the list view
        return;
    }
    if (alert.wfamshId) {
      navigate(`/approval-detail/${alert.wfamshId}`);
      return;
    }
    if (alert.assetId) {
      navigate(`/asset-detail/${alert.assetId}`);
    }
  };

  const handleWarrantyAction = async (e, alert, action) => {
    e.stopPropagation();
    try {
      if (action === "discard") {
        await API.put(`/notifications/warranty/${alert.notifyId}/discard`);
        setAlerts((prev) => prev.filter((row) => row.notifyId !== alert.notifyId));
        return;
      }
      if (action === "snooze") {
        const draft = snoozeDrafts[alert.notifyId] || { option: "5", custom: "" };
        const days = draft.option === "custom" ? Number(draft.custom) : Number(draft.option);
        if (!Number.isFinite(days) || days < 0) {
          showBackendTextToast({ toast, tmdId: 'TMD_INVALID_SNOOZE_VALUE_167A15A0', fallbackText: 'Invalid snooze value', type: 'error' });
          return;
        }
        await API.put(`/notifications/warranty/${alert.notifyId}/snooze`, { snooze_days: days });
        setAlerts((prev) => prev.filter((row) => row.notifyId !== alert.notifyId));
        return;
      }
      if (action === "extend") {
        navigate(`/assets?editAssetId=${alert.assetId}&warrantyAction=warranty&notifyId=${alert.notifyId}`);
      }
      if (action === "vendor") {
        navigate(`/assets?editAssetId=${alert.assetId}&warrantyAction=vendor&notifyId=${alert.notifyId}`);
      }
    } catch (error) {
      showBackendTextToast({ toast, tmdId: 'TMD_FAILED_TO_PROCESS_ACTION_4490D849', fallbackText: 'Failed to process action', type: 'error' });
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
          {alerts.map((alert, idx) => (
            <div
              key={alert.id || idx}
              className={`p-4 rounded-lg border flex flex-col gap-2 shadow-sm transition-colors duration-200 cursor-pointer
                ${alert.isUrgent ? "border-red-500 bg-red-50" : "border-gray-200 hover:bg-gray-50"}
              `}
              title={alert.isUrgent ? `Urgent: Only ${alert.daysUntilCutoff} days until cutoff!` : ""}
              onClick={() => handleAlertClick(alert)}
            >
              <div className="flex items-center gap-2 flex-wrap">
                {alert.isUrgent && (
                  <ExclamationTriangleIcon className="w-5 h-5 text-red-500 mr-1" />
                )}
                <span className={`text-xs font-bold px-2 py-1 rounded ${badgeColors[alert.alertType] || "bg-gray-100 text-gray-800"}`}>
                  {alert.alertType}
                </span>
                {alert.isGroupMaintenance && (
                  <span className="text-xs font-semibold px-2 py-1 rounded bg-blue-100 text-blue-800">
                    Group Maintenance
                  </span>
                )}
                <span className={isUnreadWarranty(alert.notificationStatus) ? "font-bold text-gray-900" : "font-normal text-gray-800"}>{alert.alertText}</span>
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
              {alert.workflowType === "WARRANTY" && (
                <div className="pt-1 text-xs" onClick={(e) => e.stopPropagation()}>
                  <div className="relative inline-block">
                    <button
                      onClick={() =>
                        setOpenActionMenuId((prev) =>
                          prev === alert.notifyId ? null : alert.notifyId
                        )
                      }
                      className="px-2 py-1 rounded-full border bg-white hover:bg-gray-50 font-semibold"
                    >
                      Actions
                    </button>
                    {openActionMenuId === alert.notifyId && (
                      <div className="absolute z-20 mt-2 w-52 rounded-lg border bg-white shadow-lg p-2 space-y-1">
                        <button onClick={(e) => handleWarrantyAction(e, alert, "discard")} className="w-full text-left px-2 py-1.5 rounded hover:bg-gray-100">Discard</button>
                        <button
                          onClick={() =>
                            setOpenSnoozeMenuId((prev) =>
                              prev === alert.notifyId ? null : alert.notifyId
                            )
                          }
                          className="w-full text-left px-2 py-1.5 rounded hover:bg-blue-50 text-blue-700"
                        >
                          Remind Again
                        </button>
                        {openSnoozeMenuId === alert.notifyId && (
                          <div className="px-2 py-2 rounded bg-blue-50 border border-blue-100 space-y-2">
                            <select
                              value={(snoozeDrafts[alert.notifyId] || { option: "5" }).option}
                              onChange={(e) =>
                                setSnoozeDrafts((prev) => ({
                                  ...prev,
                                  [alert.notifyId]: {
                                    ...(prev[alert.notifyId] || { custom: "" }),
                                    option: e.target.value,
                                  },
                                }))
                              }
                              className="w-full px-2 py-1 border rounded bg-white"
                            >
                              <option value="5">5 days</option>
                              <option value="10">10 days</option>
                              <option value="20">20 days</option>
                              <option value="custom">Custom</option>
                            </select>
                            {(snoozeDrafts[alert.notifyId] || { option: "5" }).option === "custom" && (
                              <input
                                type="number"
                                min="0"
                                value={(snoozeDrafts[alert.notifyId] || { custom: "" }).custom}
                                onChange={(e) =>
                                  setSnoozeDrafts((prev) => ({
                                    ...prev,
                                    [alert.notifyId]: {
                                      ...(prev[alert.notifyId] || { option: "custom" }),
                                      custom: e.target.value,
                                    },
                                  }))
                                }
                                placeholder="Days"
                                className="w-full px-2 py-1 border rounded"
                              />
                            )}
                            <button
                              onClick={(e) => handleWarrantyAction(e, alert, "snooze")}
                              className="w-full px-2 py-1.5 rounded bg-blue-600 text-white hover:bg-blue-700"
                            >
                              Apply Snooze
                            </button>
                          </div>
                        )}
                        <button onClick={(e) => handleWarrantyAction(e, alert, "extend")} className="w-full text-left px-2 py-1.5 rounded hover:bg-green-50 text-green-700">Extend Warranty</button>
                        {alert.canChangeVendor && (
                          <button onClick={(e) => handleWarrantyAction(e, alert, "vendor")} className="w-full text-left px-2 py-1.5 rounded hover:bg-purple-50 text-purple-700">Change Vendor</button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      {error && (
        <div className="text-xs text-red-500 mt-2">{error}</div>
      )}
    </div>
  );
};

export default NotificationsPanel;
