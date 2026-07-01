import { showBackendTextToast } from '../../utils/errorTranslation';
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ExclamationTriangleIcon,
  CalendarIcon,
  UserIcon,
  ClockIcon,
} from "@heroicons/react/24/outline";
import API from "../../lib/axios";
import toast from "react-hot-toast";
import { useDashboardStore } from "../../store/useDashboardStore";

const badgeColors = {
  "Regular Maintenance": "bg-blue-100 text-blue-800",
  "Inspection": "bg-green-100 text-green-800",
  "Vendor Contract Renewal": "bg-orange-100 text-orange-800",
  "Warranty Expiry": "bg-amber-100 text-amber-800",
  Urgent: "bg-red-100 text-red-800",
};

const NotificationsPanel = () => {
  const navigate = useNavigate();
  const alerts = useDashboardStore((s) => s.notifications);
  const loading = useDashboardStore((s) => s.notificationsLoading);
  const setNotifications = useDashboardStore((s) => s.setNotifications);
  const patchAlerts = (updater) => {
    const current = useDashboardStore.getState().notifications;
    setNotifications(typeof updater === 'function' ? updater(current) : updater);
  };
  const [error, setError] = useState(null);
  const [openActionMenuId, setOpenActionMenuId] = useState(null);
  const [openSnoozeMenuId, setOpenSnoozeMenuId] = useState(null);
  const [snoozeDrafts, setSnoozeDrafts] = useState({});
  const [openingNotifyIds, setOpeningNotifyIds] = useState({});

  const isUnreadWarranty = (status) => {
    const normalized = String(status || "").toUpperCase();
    return normalized === "NEW" || normalized === "UNREAD";
  };

  const handleAlertClick = (alert) => {
    if (alert.workflowType === "WARRANTY" && alert.notifyId) {
      const currentStatus = String(alert.notificationStatus || "").toUpperCase();
      if (!isUnreadWarranty(currentStatus) || openingNotifyIds[alert.notifyId]) {
        return;
      }

      // Optimistic row update for immediate bold -> normal feedback.
      patchAlerts((prev) =>
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
          patchAlerts((prev) =>
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
        patchAlerts((prev) => prev.filter((row) => row.notifyId !== alert.notifyId));
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
        patchAlerts((prev) => prev.filter((row) => row.notifyId !== alert.notifyId));
        return;
      }
      if (action === "extend") {
        navigate(`/assets?editAssetId=${alert.assetId}&warrantyAction=warranty&notifyId=${alert.notifyId}`);
        return;
      }
      if (action === "vendor") {
        navigate(`/assets?editAssetId=${alert.assetId}&warrantyAction=vendor&notifyId=${alert.notifyId}`);
        return;
      }
      if (action === "scrap") {
        const confirmed = window.confirm(
          `Initiate scrap approval for asset ${alert.assetId}? This will start the scrap approval workflow.`
        );
        if (!confirmed) return;
        const res = await API.put(`/notifications/warranty/${alert.notifyId}/scrap`);
        setAlerts((prev) => prev.filter((row) => row.notifyId !== alert.notifyId));
        showBackendTextToast({ toast, tmdId: 'TMD_SCRAP_APPROVAL_INITIATED_WARRANTY', fallbackText: 'Scrap approval initiated successfully', type: 'success' });
        // Navigate to scrap approval list
        if (res.data?.data?.wfscrap_h_id) {
          navigate(`/scrap-approval-detail/${res.data.data.wfscrap_h_id}?context=SCRAPMAINTENANCEAPPROVAL`);
        } else {
          navigate('/scrap-approval');
        }
        return;
      }
    } catch (error) {
      showBackendTextToast({ toast, tmdId: 'TMD_FAILED_TO_PROCESS_ACTION_4490D849', fallbackText: 'Failed to process action', type: 'error' });
    }
  };

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
                        {/* 1. Discard */}
                        <button onClick={(e) => handleWarrantyAction(e, alert, "discard")} className="w-full text-left px-2 py-1.5 rounded hover:bg-gray-100 text-gray-700">Discard</button>
                        {/* 2. Extend Expiry */}
                        <button onClick={(e) => handleWarrantyAction(e, alert, "extend")} className="w-full text-left px-2 py-1.5 rounded hover:bg-green-50 text-green-700">Extend Expiry</button>
                        {/* 3. Remind Again */}
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
                        {/* 4. Scrap */}
                        <button onClick={(e) => handleWarrantyAction(e, alert, "scrap")} className="w-full text-left px-2 py-1.5 rounded hover:bg-red-50 text-red-600 font-medium">Scrap</button>
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
