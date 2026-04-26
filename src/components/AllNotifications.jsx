import { showBackendTextToast } from '../utils/errorTranslation';
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
import toast from "react-hot-toast";

const badgeColors = {
  "Regular Maintenance": "bg-blue-100 text-blue-800",
  "Inspection": "bg-green-100 text-green-800",
  "Warranty Expiry": "bg-amber-100 text-amber-800",
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
    warranty: true,
  });
  const [showFilters, setShowFilters] = useState(false);
  const [snoozeDrafts, setSnoozeDrafts] = useState({});
  const [openActionMenuId, setOpenActionMenuId] = useState(null);
  const [openSnoozeMenuId, setOpenSnoozeMenuId] = useState(null);
  const [openingNotifyIds, setOpeningNotifyIds] = useState({});

  const isUnreadWarranty = (status) => {
    const normalized = String(status || "").toUpperCase();
    return normalized === "NEW" || normalized === "UNREAD";
  };

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

    if (alert.workflowType === "WARRANTY") {
      return "warranty";
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
          : notification.workflowType === "WARRANTY"
          ? "Warranty Expiry"
          : notification.maintenanceType || "Regular Maintenance",
        alertText: notification.isGroupMaintenance && notification.groupName
          ? `${notification.groupName} (${notification.groupAssetCount} assets)`
          : notification.workflowType === 'INSPECTION'
          ? `${notification.assetTypeName} Inspection`
          : notification.workflowType === "WARRANTY"
          ? `${notification.assetId} - ${notification.title || "Warranty Expiry"}`
          : String(notification.maintenanceType || "").toLowerCase().includes("subscription")
          ? `${notification.assetTypeName}`
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
        assetTypeName: notification.assetTypeName,
        notifyId: notification.notifyId,
        notificationStatus: notification.notificationStatus,
        title: notification.title,
        canChangeVendor: !!notification.canChangeVendor,
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
    if (alert.workflowType === "WARRANTY" && alert.notifyId) {
      const currentStatus = String(alert.notificationStatus || "").toUpperCase();
      if (!isUnreadWarranty(currentStatus) || openingNotifyIds[alert.notifyId]) {
        return;
      }

      // Optimistic update: make this row non-bold immediately.
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
          // Revert only this row if API fails.
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
    if (alert.workflowType === "INSPECTION" && alert.wfamshId) {
      navigate(`/inspection-approval-detail/${alert.wfamshId}`);
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

  const handleWarrantyDiscard = async (e, alert) => {
    e.stopPropagation();
    try {
      await API.put(`/notifications/warranty/${alert.notifyId}/discard`);
      setAlerts((prev) => prev.filter((item) => item.notifyId !== alert.notifyId));
      showBackendTextToast({ toast, tmdId: 'TMD_WARRANTY_ALERT_RESOLVED_6D0661C0', fallbackText: 'Warranty alert resolved', type: 'success' });
    } catch (error) {
      showBackendTextToast({ toast, tmdId: 'TMD_FAILED_TO_RESOLVE_ALERT_274B32A6', fallbackText: 'Failed to resolve alert', type: 'error' });
    }
  };

  const handleWarrantySnooze = async (e, alert) => {
    e.stopPropagation();
    const draft = snoozeDrafts[alert.notifyId] || { option: "5", custom: "" };
    const days =
      draft.option === "custom" ? Number(draft.custom) : Number(draft.option);
    if (!Number.isFinite(days) || days < 0) {
      showBackendTextToast({ toast, tmdId: 'TMD_ENTER_A_VALID_NON_NEGATIVE_NUMBER_44D7F409', fallbackText: 'Enter a valid non-negative number', type: 'error' });
      return;
    }
    try {
      await API.put(`/notifications/warranty/${alert.notifyId}/snooze`, {
        snooze_days: days,
      });
      setAlerts((prev) => prev.filter((item) => item.notifyId !== alert.notifyId));
      setSnoozeDrafts((prev) => {
        const next = { ...prev };
        delete next[alert.notifyId];
        return next;
      });
      toast.success(`Snoozed for ${days} day(s)`);
    } catch (error) {
      showBackendTextToast({ toast, tmdId: 'TMD_FAILED_TO_SNOOZE_ALERT_4DC3EA64', fallbackText: 'Failed to snooze alert', type: 'error' });
    }
  };

  const goToWarrantyEdit = (e, alert, mode) => {
    e.stopPropagation();
    const action = mode === "vendor" ? "vendor" : "warranty";
    navigate(`/assets?editAssetId=${alert.assetId}&warrantyAction=${action}&notifyId=${alert.notifyId}`);
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
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="mb-3 inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
          >
            <span aria-hidden="true">←</span>
            <span>Back</span>
          </button>
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

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedFilters.warranty}
                    onChange={() => handleFilterChange('warranty')}
                    className="w-4 h-4 text-amber-600 border-gray-300 rounded focus:ring-amber-500"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Warranty ({getFilterCount('warranty')})
                  </span>
                  <span className="px-2 py-1 text-xs bg-amber-100 text-amber-800 rounded-full">
                    Warranty
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
                <span className={`text-lg ${isUnreadWarranty(alert.notificationStatus) ? "font-bold text-gray-900" : "font-normal text-gray-800"}`}>{alert.alertText}</span>
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
              {alert.workflowType === "WARRANTY" && (
                <div className="pt-2 border-t border-gray-200" onClick={(e) => e.stopPropagation()}>
                  <div className="relative inline-block">
                    <button
                      onClick={() =>
                        setOpenActionMenuId((prev) =>
                          prev === alert.notifyId ? null : alert.notifyId
                        )
                      }
                      className="px-3 py-1.5 text-xs font-semibold rounded-full border bg-white hover:bg-gray-50"
                    >
                      Actions
                    </button>
                    {openActionMenuId === alert.notifyId && (
                      <div className="absolute z-20 mt-2 w-56 rounded-lg border bg-white shadow-lg p-2 space-y-1">
                        <button
                          onClick={(e) => {
                            handleWarrantyDiscard(e, alert);
                            setOpenActionMenuId(null);
                            setOpenSnoozeMenuId(null);
                          }}
                          className="w-full text-left px-3 py-2 text-xs rounded hover:bg-gray-100"
                        >
                          Discard
                        </button>
                        <button
                          onClick={() =>
                            setOpenSnoozeMenuId((prev) =>
                              prev === alert.notifyId ? null : alert.notifyId
                            )
                          }
                          className="w-full text-left px-3 py-2 text-xs rounded hover:bg-blue-50 text-blue-700"
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
                              className="w-full px-2 py-1 text-xs border rounded-md bg-white"
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
                                className="w-full px-2 py-1 text-xs border rounded-md"
                              />
                            )}
                            <button
                              onClick={(e) => {
                                handleWarrantySnooze(e, alert);
                                setOpenActionMenuId(null);
                                setOpenSnoozeMenuId(null);
                              }}
                              className="w-full px-2 py-1.5 text-xs rounded bg-blue-600 text-white hover:bg-blue-700"
                            >
                              Apply Snooze
                            </button>
                          </div>
                        )}
                        <button
                          onClick={(e) => {
                            goToWarrantyEdit(e, alert, "warranty");
                            setOpenActionMenuId(null);
                          }}
                          className="w-full text-left px-3 py-2 text-xs rounded hover:bg-green-50 text-green-700"
                        >
                          Extend Warranty
                        </button>
                        {alert.canChangeVendor && (
                          <button
                            onClick={(e) => {
                              goToWarrantyEdit(e, alert, "vendor");
                              setOpenActionMenuId(null);
                            }}
                            className="w-full text-left px-3 py-2 text-xs rounded hover:bg-purple-50 text-purple-700"
                          >
                            Change Service Vendor
                          </button>
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
