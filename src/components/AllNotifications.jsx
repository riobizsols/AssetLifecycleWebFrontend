import { showBackendTextToast } from '../utils/errorTranslation';
import React, { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeftIcon,
  ArrowPathIcon,
  BellIcon,
  BellSnoozeIcon,
  CalendarIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ClockIcon,
  EllipsisVerticalIcon,
  EnvelopeOpenIcon,
  ExclamationTriangleIcon,
  ListBulletIcon,
  MagnifyingGlassIcon,
  AdjustmentsHorizontalIcon,
  Squares2X2Icon,
  TrashIcon,
  UserIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import API from "../lib/axios";
import { useAuthStore } from "../store/useAuthStore";
import { useLanguage } from "../contexts/LanguageContext";
import toast from "react-hot-toast";
import {
  ALL_TYPES,
  CATEGORIES,
  PRIORITIES,
  SORTS,
  TYPE_META,
  canDiscard,
  canMarkRead,
  canSnooze,
  isAssetExpiryAlert,
  isSpareAlert,
  isStockAlert,
  isWarrantyAlert,
  notifyKind,
  transformNotification,
} from "./notifications/notificationModel";

const PREFS_KEY = "alm:notifications:prefs:v1";
const PAGE_SIZE = 50;
const AUTO_REFRESH_MS = 2 * 60 * 1000;
const SNOOZE_OPTIONS = ["5", "10", "20"];

const DEFAULT_PREFS = {
  selectedTypes: ALL_TYPES,
  priority: "all",
  status: "all",
  sort: "priority",
  view: "grouped",
};

const loadPrefs = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(PREFS_KEY) || "null");
    if (!saved || typeof saved !== "object") return DEFAULT_PREFS;
    return {
      ...DEFAULT_PREFS,
      ...saved,
      selectedTypes: Array.isArray(saved.selectedTypes)
        ? saved.selectedTypes.filter((type) => ALL_TYPES.includes(type))
        : ALL_TYPES,
      sort: SORTS[saved.sort] ? saved.sort : DEFAULT_PREFS.sort,
    };
  } catch {
    return DEFAULT_PREFS;
  }
};

const TriCheckbox = ({ checked, indeterminate, onChange, className = "", ...rest }) => {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = !checked && !!indeterminate;
  }, [checked, indeterminate]);
  return (
    <input
      ref={ref}
      type="checkbox"
      checked={checked}
      onChange={onChange}
      onClick={(e) => e.stopPropagation()}
      className={`h-4 w-4 cursor-pointer rounded border-gray-300 text-blue-600 focus:ring-blue-500 ${className}`}
      {...rest}
    />
  );
};

const SnoozePicker = ({ value, onChange, onApply, applyLabel, t, compact = false }) => (
  <div className={`space-y-2 rounded-md border border-blue-100 bg-blue-50 ${compact ? "p-2" : "p-3"}`}>
    <select
      value={value.option}
      onChange={(e) => onChange({ ...value, option: e.target.value })}
      className="w-full rounded-md border border-gray-300 bg-white px-2 py-1 text-xs"
    >
      {SNOOZE_OPTIONS.map((days) => (
        <option key={days} value={days}>{t("allNotifications.daysOption", { count: Number(days) })}</option>
      ))}
      <option value="custom">{t("allNotifications.custom")}</option>
    </select>
    {value.option === "custom" && (
      <input
        type="number"
        min="0"
        value={value.custom}
        onChange={(e) => onChange({ ...value, custom: e.target.value })}
        placeholder={t("allNotifications.days")}
        className="w-full rounded-md border border-gray-300 px-2 py-1 text-xs"
      />
    )}
    <button
      type="button"
      onClick={onApply}
      className="w-full rounded-md bg-blue-600 px-2 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
    >
      {applyLabel}
    </button>
  </div>
);

const snoozeDays = (draft) => Number(draft.option === "custom" ? draft.custom : draft.option);

const AllNotifications = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { t } = useLanguage();
  const tx = useCallback((key, defaultValue, options = {}) => t(key, { defaultValue, ...options }), [t]);

  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const [prefs, setPrefs] = useState(loadPrefs);
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [selectedKeys, setSelectedKeys] = useState(() => new Set());
  const [collapsedGroups, setCollapsedGroups] = useState(() => new Set());
  const [expandedFacets, setExpandedFacets] = useState(() => new Set(CATEGORIES.map((c) => c.id)));
  const [limits, setLimits] = useState({});
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  const [openMenuKey, setOpenMenuKey] = useState(null);
  const [rowSnoozeKey, setRowSnoozeKey] = useState(null);
  const [rowSnoozeDraft, setRowSnoozeDraft] = useState({ option: "5", custom: "" });
  const [bulkSnoozeOpen, setBulkSnoozeOpen] = useState(false);
  const [bulkSnoozeDraft, setBulkSnoozeDraft] = useState({ option: "5", custom: "" });
  const [bulkBusy, setBulkBusy] = useState(false);
  const [pendingNotifyIds, setPendingNotifyIds] = useState({});

  const searchRef = useRef(null);
  const selectedTypeSet = useMemo(() => new Set(prefs.selectedTypes), [prefs.selectedTypes]);

  const updatePrefs = (patch) => setPrefs((prev) => ({ ...prev, ...patch }));

  useEffect(() => {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  }, [prefs]);

  const fetchNotifications = useCallback(async ({ silent = false } = {}) => {
    if (!user?.emp_int_id) {
      setAlerts([]);
      setLoading(false);
      return;
    }
    if (silent) setRefreshing(true);
    else setLoading(true);
    try {
      const response = await API.get(`/notifications/user/${user.emp_int_id}`);
      const notifications = response.data?.data || [];
      setAlerts(notifications.map((n, idx) => transformNotification(n, t, idx)));
      setError(null);
      setLastUpdated(new Date());
    } catch (err) {
      console.error("Error fetching notifications:", err);
      setError(t("allNotifications.failedToLoadNotifications"));
      if (!silent) setAlerts([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.emp_int_id, t]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") fetchNotifications({ silent: true });
    }, AUTO_REFRESH_MS);
    return () => clearInterval(timer);
  }, [fetchNotifications]);

  useEffect(() => {
    const onKeyDown = (e) => {
      const tag = String(e.target?.tagName || "").toLowerCase();
      const typing = ["input", "textarea", "select"].includes(tag) || e.target?.isContentEditable;
      if (e.key === "/" && !typing) {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (e.key === "Escape") {
        setOpenMenuKey(null);
        setRowSnoozeKey(null);
        setBulkSnoozeOpen(false);
      }
    };
    const onMouseDown = (e) => {
      if (!e.target.closest?.("[data-menu-root]")) {
        setOpenMenuKey(null);
        setRowSnoozeKey(null);
        setBulkSnoozeOpen(false);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("mousedown", onMouseDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("mousedown", onMouseDown);
    };
  }, []);

  // ---- Filtering ----
  const query = deferredSearch.trim().toLowerCase();
  const terms = useMemo(() => query.split(/\s+/).filter(Boolean), [query]);

  const matchesNonTypeFilters = useCallback((alert) => {
    if (prefs.priority !== "all" && alert.priority !== prefs.priority) return false;
    if (prefs.status === "unread" && !alert.isUnread) return false;
    if (prefs.status === "read" && alert.isUnread) return false;
    return terms.every((term) => alert.searchText.includes(term));
  }, [prefs.priority, prefs.status, terms]);

  const facetPool = useMemo(() => alerts.filter(matchesNonTypeFilters), [alerts, matchesNonTypeFilters]);

  const typeCounts = useMemo(() => {
    const counts = {};
    facetPool.forEach((alert) => {
      counts[alert.type] = (counts[alert.type] || 0) + 1;
    });
    return counts;
  }, [facetPool]);

  const filtered = useMemo(() => {
    const compare = SORTS[prefs.sort]?.compare || SORTS.priority.compare;
    return facetPool.filter((alert) => selectedTypeSet.has(alert.type)).sort(compare);
  }, [facetPool, selectedTypeSet, prefs.sort]);

  const filteredKeys = useMemo(() => new Set(filtered.map((a) => a.key)), [filtered]);

  useEffect(() => {
    setSelectedKeys((prev) => {
      if (prev.size === 0) return prev;
      const next = new Set([...prev].filter((key) => filteredKeys.has(key)));
      return next.size === prev.size ? prev : next;
    });
  }, [filteredKeys]);

  const groups = useMemo(
    () =>
      CATEGORIES.map((category) => ({
        category,
        items: filtered.filter((alert) => alert.categoryId === category.id),
      })).filter((group) => group.items.length > 0),
    [filtered],
  );

  const stats = useMemo(() => ({
    total: alerts.length,
    overdue: alerts.filter((a) => a.priority === "overdue").length,
    urgent: alerts.filter((a) => a.priority === "urgent").length,
    unread: alerts.filter((a) => a.isUnread).length,
  }), [alerts]);

  const selectedAlerts = useMemo(
    () => filtered.filter((alert) => selectedKeys.has(alert.key)),
    [filtered, selectedKeys],
  );
  const bulkEligible = useMemo(() => ({
    read: selectedAlerts.filter(canMarkRead),
    discard: selectedAlerts.filter(canDiscard),
    snooze: selectedAlerts.filter(canSnooze),
  }), [selectedAlerts]);

  const activeFilterCount =
    (prefs.selectedTypes.length !== ALL_TYPES.length ? 1 : 0) +
    (prefs.priority !== "all" ? 1 : 0) +
    (prefs.status !== "all" ? 1 : 0) +
    (query ? 1 : 0);

  // ---- Type filter (categories) ----
  const setTypes = (types) => updatePrefs({ selectedTypes: ALL_TYPES.filter((type) => types.has(type)) });

  const toggleType = (type) => {
    const next = new Set(selectedTypeSet);
    if (next.has(type)) next.delete(type);
    else next.add(type);
    setTypes(next);
  };

  const toggleCategory = (category) => {
    const next = new Set(selectedTypeSet);
    const allOn = category.types.every((type) => next.has(type));
    category.types.forEach((type) => (allOn ? next.delete(type) : next.add(type)));
    setTypes(next);
  };

  const onlyCategory = (category) => setTypes(new Set(category.types));

  const resetFilters = () => {
    setSearch("");
    updatePrefs({ selectedTypes: ALL_TYPES, priority: "all", status: "all" });
  };

  // ---- Selection ----
  const toggleSelected = (key) =>
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const selectAll = () => setSelectedKeys(new Set(filtered.map((a) => a.key)));
  const unselectAll = () => setSelectedKeys(new Set());

  const toggleGroupSelection = (items) =>
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      const allOn = items.every((a) => next.has(a.key));
      items.forEach((a) => (allOn ? next.delete(a.key) : next.add(a.key)));
      return next;
    });

  // ---- Actions ----
  const removeAlerts = (keys) => {
    const keySet = new Set(keys);
    setAlerts((prev) => prev.filter((a) => !keySet.has(a.key)));
    setSelectedKeys((prev) => new Set([...prev].filter((k) => !keySet.has(k))));
  };

  const markAlertsRead = (keys) => {
    const keySet = new Set(keys);
    setAlerts((prev) =>
      prev.map((a) => (keySet.has(a.key) ? { ...a, notificationStatus: "OPEN", isUnread: false } : a)),
    );
  };

  const markRead = async (alert) => {
    const kind = notifyKind(alert);
    if (!kind || !alert.isUnread || pendingNotifyIds[alert.key]) return;
    markAlertsRead([alert.key]);
    setPendingNotifyIds((prev) => ({ ...prev, [alert.key]: true }));
    try {
      await API.put(`/notifications/${kind}/${alert.notifyId}/open`);
    } catch {
      setAlerts((prev) =>
        prev.map((a) => (a.key === alert.key ? { ...a, notificationStatus: alert.notificationStatus, isUnread: true } : a)),
      );
    } finally {
      setPendingNotifyIds((prev) => {
        const next = { ...prev };
        delete next[alert.key];
        return next;
      });
    }
  };

  const navigateFor = (alert) => {
    if (alert.route) return navigate(alert.route);
    if (isStockAlert(alert)) return navigate("/reports/purchase-requirement");
    if (alert.workflowType === "SCRAP" && alert.workflowId) {
      return navigate(`/scrap-approval-detail/${alert.workflowId}?context=SCRAPMAINTENANCEAPPROVAL`);
    }
    if (alert.workflowType === "INSPECTION" && alert.wfamshId) {
      return navigate(`/inspection-approval-detail/${alert.wfamshId}`);
    }
    if (alert.wfamshId) return navigate(`/approval-detail/${alert.wfamshId}`);
    if (alert.assetId) return navigate(`/asset-detail/${alert.assetId}`);
    return undefined;
  };

  const handleRowClick = (alert) => {
    if (isWarrantyAlert(alert) || isAssetExpiryAlert(alert)) {
      markRead(alert);
      return;
    }
    if (isStockAlert(alert)) markRead(alert);
    navigateFor(alert);
  };

  const discardOne = async (alert) => {
    const kind = notifyKind(alert);
    if (!kind) return;
    try {
      await API.put(`/notifications/${kind}/${alert.notifyId}/discard`);
      removeAlerts([alert.key]);
      showBackendTextToast({ toast, tmdId: 'TMD_WARRANTY_ALERT_RESOLVED_6D0661C0', fallbackText: 'Warranty alert resolved', type: 'success' });
    } catch {
      showBackendTextToast({ toast, tmdId: 'TMD_FAILED_TO_RESOLVE_ALERT_274B32A6', fallbackText: 'Failed to resolve alert', type: 'error' });
    }
  };

  const snoozeOne = async (alert, draft) => {
    const kind = notifyKind(alert);
    const days = snoozeDays(draft);
    if (!Number.isFinite(days) || days < 0) {
      showBackendTextToast({ toast, tmdId: 'TMD_ENTER_A_VALID_NON_NEGATIVE_NUMBER_44D7F409', fallbackText: 'Enter a valid non-negative number', type: 'error' });
      return;
    }
    try {
      await API.put(`/notifications/${kind}/${alert.notifyId}/snooze`, { snooze_days: days });
      removeAlerts([alert.key]);
      toast.success(t("allNotifications.snoozedForDays", { days }));
    } catch {
      showBackendTextToast({ toast, tmdId: 'TMD_FAILED_TO_SNOOZE_ALERT_4DC3EA64', fallbackText: 'Failed to snooze alert', type: 'error' });
    }
  };

  const goToAssetEdit = (alert, mode) =>
    navigate(`/assets?editAssetId=${alert.assetId}&warrantyAction=${mode}&notifyId=${alert.notifyId}`);

  const scrapOne = async (alert) => {
    const confirmed = window.confirm(
      `Initiate scrap approval for asset ${alert.assetId}?\n\nThis will start the scrap approval workflow and resolve this notification.`,
    );
    if (!confirmed) return;
    try {
      const res = await API.put(`/notifications/warranty/${alert.notifyId}/scrap`);
      removeAlerts([alert.key]);
      showBackendTextToast({ toast, tmdId: 'TMD_SCRAP_APPROVAL_INITIATED_WARRANTY_ALL', fallbackText: 'Scrap approval initiated successfully', type: 'success' });
      if (res.data?.data?.wfscrap_h_id) {
        navigate(`/scrap-approval-detail/${res.data.data.wfscrap_h_id}?context=SCRAPMAINTENANCEAPPROVAL`);
      } else {
        navigate('/scrap-approval');
      }
    } catch (err) {
      showBackendTextToast({
        toast,
        tmdId: 'TMD_FAILED_TO_INITIATE_SCRAP_WARRANTY',
        fallbackText: err?.response?.data?.message || 'Failed to initiate scrap approval',
        type: 'error',
      });
    }
  };

  const runBulk = async (items, request, { onSuccess, verb }) => {
    if (items.length === 0) return;
    setBulkBusy(true);
    try {
      const results = await Promise.allSettled(items.map(request));
      const succeeded = items.filter((_, i) => results[i].status === "fulfilled");
      const failed = items.length - succeeded.length;
      const skipped = selectedAlerts.length - items.length;
      if (succeeded.length) onSuccess(succeeded.map((a) => a.key));
      const parts = [`${succeeded.length} ${verb}`];
      if (failed) parts.push(`${failed} failed`);
      if (skipped) parts.push(`${skipped} skipped (not supported)`);
      (failed ? toast.error : toast.success)(parts.join(" · "));
    } finally {
      setBulkBusy(false);
    }
  };

  const bulkMarkRead = () =>
    runBulk(bulkEligible.read, (a) => API.put(`/notifications/${notifyKind(a)}/${a.notifyId}/open`), {
      onSuccess: markAlertsRead,
      verb: "marked as read",
    });

  const bulkDiscard = () => {
    const items = bulkEligible.discard;
    if (!items.length) return;
    if (!window.confirm(`Discard ${items.length} notification${items.length === 1 ? "" : "s"}? This cannot be undone.`)) return;
    runBulk(items, (a) => API.put(`/notifications/${notifyKind(a)}/${a.notifyId}/discard`), {
      onSuccess: removeAlerts,
      verb: "discarded",
    });
  };

  const bulkSnooze = () => {
    const days = snoozeDays(bulkSnoozeDraft);
    if (!Number.isFinite(days) || days < 0) {
      showBackendTextToast({ toast, tmdId: 'TMD_ENTER_A_VALID_NON_NEGATIVE_NUMBER_44D7F409', fallbackText: 'Enter a valid non-negative number', type: 'error' });
      return;
    }
    setBulkSnoozeOpen(false);
    runBulk(
      bulkEligible.snooze,
      (a) => API.put(`/notifications/${notifyKind(a)}/${a.notifyId}/snooze`, { snooze_days: days }),
      { onSuccess: removeAlerts, verb: `snoozed for ${days} day${days === 1 ? "" : "s"}` },
    );
  };

  // ---- Rendering helpers ----
  const formatDate = (value) => {
    if (!value) return t("allNotifications.notAvailable");
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? t("allNotifications.notAvailable") : date.toLocaleDateString();
  };

  const priorityLabel = (alert) => {
    if (alert.priority === "overdue") return t("allNotifications.overdue");
    if (alert.priority === "urgent" || alert.priority === "upcoming") {
      return t("allNotifications.daysLeft", { count: alert.daysUntilCutoff });
    }
    if (isSpareAlert(alert)) return alert.statusLabel || TYPE_META[alert.type]?.label;
    if (isStockAlert(alert)) return alert.alertType;
    return PRIORITIES.none.label;
  };

  const typeLabel = (alert) => {
    if (isWarrantyAlert(alert)) return alert.alertType;
    return tx(`allNotifications.type_${alert.type}`, TYPE_META[alert.type]?.label || alert.alertType);
  };

  const renderRowMenu = (alert) => {
    const kind = notifyKind(alert);
    const hasNotifyActions = kind === "warranty" || kind === "expiry";
    const menuOpen = openMenuKey === alert.key;
    const itemCls = "flex w-full items-center gap-2 rounded px-3 py-2 text-left text-xs hover:bg-gray-100";

    return (
      <div className="relative" data-menu-root onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          aria-label={t("allNotifications.actions")}
          onClick={() => {
            setOpenMenuKey(menuOpen ? null : alert.key);
            setRowSnoozeKey(null);
          }}
          className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
        >
          <EllipsisVerticalIcon className="h-5 w-5" />
        </button>
        {menuOpen && (
          <div className="absolute right-0 z-30 mt-1 w-60 space-y-0.5 rounded-lg border border-gray-200 bg-white p-1.5 shadow-xl">
            {!hasNotifyActions && (
              <button type="button" className={itemCls} onClick={() => { setOpenMenuKey(null); handleRowClick(alert); }}>
                <ChevronRightIcon className="h-4 w-4" /> {tx("allNotifications.open", "Open")}
              </button>
            )}
            {canMarkRead(alert) && (
              <button type="button" className={itemCls} onClick={() => { setOpenMenuKey(null); markRead(alert); }}>
                <EnvelopeOpenIcon className="h-4 w-4" /> {tx("allNotifications.markAsRead", "Mark as read")}
              </button>
            )}
            {hasNotifyActions && (
              <>
                <button
                  type="button"
                  className={`${itemCls} text-green-700 hover:bg-green-50`}
                  onClick={() => { setOpenMenuKey(null); goToAssetEdit(alert, kind === "expiry" ? "expiry" : "warranty"); }}
                >
                  <CalendarIcon className="h-4 w-4" /> {tx("allNotifications.extendExpiry", "Extend Expiry")}
                </button>
                <button
                  type="button"
                  className={`${itemCls} text-blue-700 hover:bg-blue-50`}
                  onClick={() => {
                    setRowSnoozeKey(rowSnoozeKey === alert.key ? null : alert.key);
                    setRowSnoozeDraft({ option: "5", custom: "" });
                  }}
                >
                  <BellSnoozeIcon className="h-4 w-4" /> {t("allNotifications.remindAgain")}
                </button>
                {rowSnoozeKey === alert.key && (
                  <SnoozePicker
                    compact
                    t={t}
                    value={rowSnoozeDraft}
                    onChange={setRowSnoozeDraft}
                    applyLabel={t("allNotifications.applySnooze")}
                    onApply={() => {
                      setOpenMenuKey(null);
                      setRowSnoozeKey(null);
                      snoozeOne(alert, rowSnoozeDraft);
                    }}
                  />
                )}
                {kind === "warranty" && alert.canChangeVendor && (
                  <button
                    type="button"
                    className={`${itemCls} text-purple-700 hover:bg-purple-50`}
                    onClick={() => { setOpenMenuKey(null); goToAssetEdit(alert, "vendor"); }}
                  >
                    <UserIcon className="h-4 w-4" /> {t("allNotifications.changeServiceVendor")}
                  </button>
                )}
                {kind === "warranty" && (
                  <button
                    type="button"
                    className={`${itemCls} font-medium text-red-600 hover:bg-red-50`}
                    onClick={() => { setOpenMenuKey(null); scrapOne(alert); }}
                  >
                    <ExclamationTriangleIcon className="h-4 w-4" /> {tx("allNotifications.scrap", "Scrap")}
                  </button>
                )}
              </>
            )}
            {canDiscard(alert) && (
              <button
                type="button"
                className={`${itemCls} text-gray-700`}
                onClick={() => { setOpenMenuKey(null); discardOne(alert); }}
              >
                <TrashIcon className="h-4 w-4" /> {t("allNotifications.discard")}
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderRow = (alert) => {
    const meta = TYPE_META[alert.type] || TYPE_META.maintenance;
    const priority = PRIORITIES[alert.priority];
    const selected = selectedKeys.has(alert.key);
    const showCutoff = !isSpareAlert(alert) && !isStockAlert(alert);

    return (
      <div
        key={alert.key}
        role="button"
        tabIndex={0}
        onClick={() => handleRowClick(alert)}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleRowClick(alert);
          if (e.key === " ") {
            e.preventDefault();
            toggleSelected(alert.key);
          }
        }}
        className={`group relative flex cursor-pointer items-start gap-3 border-b border-gray-100 px-4 py-3 last:border-b-0 focus:outline-none focus-visible:bg-blue-50
          ${selected ? "bg-blue-50/70" : alert.priority === "overdue" ? "bg-red-50/40 hover:bg-red-50" : "hover:bg-gray-50"}`}
        title={alert.priority === "urgent" ? t("allNotifications.urgentTooltip", { days: alert.daysUntilCutoff }) : undefined}
      >
        {alert.isUnread && <span className="absolute inset-y-0 left-0 w-1 bg-blue-500" aria-hidden="true" />}
        <div className="pt-0.5">
          <TriCheckbox
            checked={selected}
            onChange={() => toggleSelected(alert.key)}
            aria-label={tx("allNotifications.selectNotification", "Select notification")}
          />
        </div>
        <span className={`mt-1.5 h-2.5 w-2.5 flex-shrink-0 rounded-full ${meta.dot}`} aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${meta.badge}`}>
              {typeLabel(alert)}
            </span>
            {alert.isGroupMaintenance && (
              <span className="inline-flex items-center rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700 ring-1 ring-inset ring-indigo-600/20">
                {t("allNotifications.groupMaintenance")}
              </span>
            )}
            <span className={`truncate text-sm ${alert.isUnread ? "font-semibold text-gray-900" : "text-gray-800"}`}>
              {alert.alertText}
            </span>
            {alert.isUnread && (
              <span className="rounded-full bg-blue-600 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                {tx("allNotifications.new", "New")}
              </span>
            )}
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-gray-500">
            {alert.assetId && !String(alert.alertText || "").includes(alert.assetId) && (
              <span>{tx("allNotifications.asset", "Asset")}: <b className="font-medium text-gray-700">{alert.assetId}</b></span>
            )}
            <span className="flex items-center gap-1">
              <CalendarIcon className="h-4 w-4" />
              {t("allNotifications.dueOn")}: <b className="font-medium text-gray-700">{formatDate(alert.dueDateRaw)}</b>
            </span>
            <span className="flex items-center gap-1">
              <UserIcon className="h-4 w-4" />
              {t("allNotifications.actionBy")}: <b className="font-medium text-gray-700">{alert.actionBy}</b>
            </span>
            {showCutoff && (
              <span className="flex items-center gap-1">
                <ClockIcon className={`h-4 w-4 ${alert.priority === "overdue" || alert.priority === "urgent" ? "text-red-500" : ""}`} />
                {t("allNotifications.cutoffDate")}:{" "}
                <b className={`font-medium ${alert.priority === "overdue" || alert.priority === "urgent" ? "text-red-600" : "text-gray-700"}`}>
                  {formatDate(alert.cutoffDateRaw)}
                </b>
              </span>
            )}
            {isSpareAlert(alert) && (
              <span>{tx("sparePartApproval.category", "Category")}: <b className="font-medium text-gray-700">{alert.categoryName || "-"}</b></span>
            )}
          </div>
        </div>
        <div className="flex flex-shrink-0 items-center gap-1">
          <span className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${priority.pill}`}>
            {priorityLabel(alert)}
          </span>
          {renderRowMenu(alert)}
        </div>
      </div>
    );
  };

  const renderRows = (items, limitKey) => {
    const limit = limits[limitKey] || PAGE_SIZE;
    const remaining = items.length - limit;
    return (
      <>
        {items.slice(0, limit).map(renderRow)}
        {remaining > 0 && (
          <button
            type="button"
            onClick={() => setLimits((prev) => ({ ...prev, [limitKey]: limit + PAGE_SIZE }))}
            className="w-full border-t border-gray-100 py-2.5 text-xs font-medium text-blue-600 hover:bg-blue-50"
          >
            {tx("allNotifications.showMore", "Show {{count}} more", { count: Math.min(PAGE_SIZE, remaining) })}
            <span className="text-gray-400"> ({remaining} {tx("allNotifications.remaining", "remaining")})</span>
          </button>
        )}
      </>
    );
  };

  const allVisibleSelected = filtered.length > 0 && selectedAlerts.length === filtered.length;

  const kpis = [
    { id: "total", label: tx("allNotifications.kpiTotal", "Total"), value: stats.total, cls: "text-gray-900", active: prefs.priority === "all" && prefs.status === "all", onClick: () => updatePrefs({ priority: "all", status: "all" }) },
    { id: "overdue", label: tx("allNotifications.kpiOverdue", "Overdue"), value: stats.overdue, cls: "text-red-600", active: prefs.priority === "overdue", onClick: () => updatePrefs({ priority: prefs.priority === "overdue" ? "all" : "overdue" }) },
    { id: "urgent", label: tx("allNotifications.kpiDueSoon", "Due in 2 days"), value: stats.urgent, cls: "text-amber-600", active: prefs.priority === "urgent", onClick: () => updatePrefs({ priority: prefs.priority === "urgent" ? "all" : "urgent" }) },
    { id: "unread", label: tx("allNotifications.kpiUnread", "Unread"), value: stats.unread, cls: "text-blue-600", active: prefs.status === "unread", onClick: () => updatePrefs({ status: prefs.status === "unread" ? "all" : "unread" }) },
  ];

  const sidebar = (
    <aside className="rounded-xl border border-gray-200 bg-white">
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
        <h2 className="text-sm font-semibold text-gray-900">{tx("allNotifications.categories", "Categories")}</h2>
        <div className="flex items-center gap-2 text-xs font-medium">
          <button type="button" onClick={() => setTypes(new Set(ALL_TYPES))} className="text-blue-600 hover:underline">
            {tx("allNotifications.selectAll", "Select all")}
          </button>
          <span className="text-gray-300">|</span>
          <button type="button" onClick={() => setTypes(new Set())} className="text-gray-600 hover:underline">
            {tx("allNotifications.unselectAll", "Unselect all")}
          </button>
        </div>
      </div>
      <ul className="divide-y divide-gray-100">
        {CATEGORIES.map((category) => {
          const Icon = category.icon;
          const onCount = category.types.filter((type) => selectedTypeSet.has(type)).length;
          const count = category.types.reduce((sum, type) => sum + (typeCounts[type] || 0), 0);
          const expanded = expandedFacets.has(category.id);
          return (
            <li key={category.id} className="px-3 py-2">
              <div className="group/cat flex items-center gap-2">
                <TriCheckbox
                  checked={onCount === category.types.length}
                  indeterminate={onCount > 0}
                  onChange={() => toggleCategory(category)}
                  aria-label={category.label}
                />
                <button
                  type="button"
                  onClick={() =>
                    setExpandedFacets((prev) => {
                      const next = new Set(prev);
                      if (next.has(category.id)) next.delete(category.id);
                      else next.add(category.id);
                      return next;
                    })
                  }
                  className="flex min-w-0 flex-1 items-center gap-2 text-left"
                >
                  <span className={`rounded-md p-1 ${category.accent}`}><Icon className="h-4 w-4" /></span>
                  <span className="truncate text-sm font-medium text-gray-800">
                    {tx(`allNotifications.category_${category.id}`, category.label)}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => onlyCategory(category)}
                  className="hidden text-[11px] font-medium text-blue-600 hover:underline group-hover/cat:inline"
                >
                  {tx("allNotifications.only", "Only")}
                </button>
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">{count}</span>
                {category.types.length > 1 && (
                  <ChevronDownIcon className={`h-4 w-4 text-gray-400 transition-transform ${expanded ? "" : "-rotate-90"}`} />
                )}
              </div>
              {expanded && category.types.length > 1 && (
                <ul className="mt-1.5 space-y-1 pl-6">
                  {category.types.map((type) => (
                    <li key={type}>
                      <label className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 text-sm text-gray-700 hover:bg-gray-50">
                        <TriCheckbox checked={selectedTypeSet.has(type)} onChange={() => toggleType(type)} />
                        <span className={`h-2 w-2 rounded-full ${TYPE_META[type].dot}`} />
                        <span className="flex-1 truncate">{tx(`allNotifications.type_${type}`, TYPE_META[type].label)}</span>
                        <span className="text-xs text-gray-500">{typeCounts[type] || 0}</span>
                      </label>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </aside>
  );

  const selectCls = "rounded-lg border border-gray-300 bg-white py-2 pl-3 pr-8 text-sm text-gray-700 focus:border-blue-500 focus:ring-blue-500";

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-[1600px] p-4 sm:p-6">
        {/* Header */}
        <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
          <div>
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="mb-3 inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-sm font-medium text-gray-600 hover:bg-gray-200"
            >
              <ArrowLeftIcon className="h-4 w-4" /> {t("allNotifications.back")}
            </button>
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-100 p-2"><BellIcon className="h-7 w-7 text-blue-600" /></div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{t("allNotifications.title")}</h1>
                <p className="text-sm text-gray-500">{t("allNotifications.subtitle")}</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {lastUpdated && (
              <span className="text-xs text-gray-500">
                {tx("allNotifications.updatedAt", "Updated {{time}}", { time: lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) })}
              </span>
            )}
            <button
              type="button"
              onClick={() => fetchNotifications({ silent: true })}
              disabled={refreshing || loading}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
            >
              <ArrowPathIcon className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              {tx("allNotifications.refresh", "Refresh")}
            </button>
          </div>
        </div>

        {/* KPIs */}
        <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {kpis.map((kpi) => (
            <button
              key={kpi.id}
              type="button"
              onClick={kpi.onClick}
              className={`rounded-xl border bg-white px-4 py-3 text-left transition hover:shadow-md ${kpi.active ? "border-blue-500 ring-2 ring-blue-100" : "border-gray-200"}`}
            >
              <div className="text-xs font-medium uppercase tracking-wide text-gray-500">{kpi.label}</div>
              <div className={`mt-1 text-2xl font-bold ${kpi.cls}`}>{loading ? "–" : kpi.value}</div>
            </button>
          ))}
        </div>

        <div className="grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
          <div className={`${showMobileFilters ? "block" : "hidden"} lg:block`}>
            <div className="lg:sticky lg:top-4">{sidebar}</div>
          </div>

          <section className="min-w-0">
            {/* Toolbar */}
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <div className="relative min-w-[220px] flex-1">
                <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  ref={searchRef}
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={tx("allNotifications.searchPlaceholder", "Search by asset, type, person, group…  (press / )")}
                  className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-9 text-sm focus:border-blue-500 focus:ring-blue-500"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-gray-400 hover:text-gray-700"
                    aria-label={tx("allNotifications.clearSearch", "Clear search")}
                  >
                    <XMarkIcon className="h-4 w-4" />
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => setShowMobileFilters((v) => !v)}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 lg:hidden"
              >
                <AdjustmentsHorizontalIcon className="h-4 w-4" /> {tx("allNotifications.categories", "Categories")}
              </button>
              <select value={prefs.priority} onChange={(e) => updatePrefs({ priority: e.target.value })} className={selectCls} aria-label="Priority">
                <option value="all">{tx("allNotifications.allPriorities", "All priorities")}</option>
                {Object.entries(PRIORITIES).map(([id, p]) => (
                  <option key={id} value={id}>{tx(`allNotifications.priority_${id}`, p.label)}</option>
                ))}
              </select>
              <select value={prefs.status} onChange={(e) => updatePrefs({ status: e.target.value })} className={selectCls} aria-label="Status">
                <option value="all">{tx("allNotifications.allStatuses", "Read & unread")}</option>
                <option value="unread">{tx("allNotifications.unreadOnly", "Unread only")}</option>
                <option value="read">{tx("allNotifications.readOnly", "Read only")}</option>
              </select>
              <select value={prefs.sort} onChange={(e) => updatePrefs({ sort: e.target.value })} className={selectCls} aria-label="Sort">
                {Object.entries(SORTS).map(([id, s]) => (
                  <option key={id} value={id}>{tx("allNotifications.sortBy", "Sort: {{label}}", { label: s.label })}</option>
                ))}
              </select>
              <div className="inline-flex overflow-hidden rounded-lg border border-gray-300 bg-white">
                {[
                  { id: "grouped", icon: Squares2X2Icon, label: tx("allNotifications.groupedView", "Grouped") },
                  { id: "list", icon: ListBulletIcon, label: tx("allNotifications.listView", "List") },
                ].map((option) => {
                  const Icon = option.icon;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => updatePrefs({ view: option.id })}
                      title={option.label}
                      className={`inline-flex items-center gap-1.5 px-3 py-2 text-sm ${prefs.view === option.id ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-50"}`}
                    >
                      <Icon className="h-4 w-4" /> <span className="hidden sm:inline">{option.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Selection / bulk bar */}
            <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5">
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <TriCheckbox
                  checked={allVisibleSelected}
                  indeterminate={selectedAlerts.length > 0}
                  onChange={() => (allVisibleSelected ? unselectAll() : selectAll())}
                  disabled={filtered.length === 0}
                  aria-label={tx("allNotifications.selectAllVisible", "Select all visible")}
                />
                {selectedAlerts.length > 0
                  ? tx("allNotifications.selectedCount", "{{count}} selected", { count: selectedAlerts.length })
                  : t("allNotifications.showingCount", { shown: filtered.length, total: alerts.length })}
              </label>
              <div className="flex items-center gap-2 text-xs font-medium">
                <button type="button" onClick={selectAll} disabled={filtered.length === 0} className="text-blue-600 hover:underline disabled:text-gray-300 disabled:no-underline">
                  {tx("allNotifications.selectAllCount", "Select all ({{count}})", { count: filtered.length })}
                </button>
                <span className="text-gray-300">|</span>
                <button type="button" onClick={unselectAll} disabled={selectedAlerts.length === 0} className="text-gray-600 hover:underline disabled:text-gray-300 disabled:no-underline">
                  {tx("allNotifications.unselectAll", "Unselect all")}
                </button>
              </div>

              {selectedAlerts.length > 0 && (
                <div className="ml-auto flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={bulkMarkRead}
                    disabled={bulkBusy || bulkEligible.read.length === 0}
                    title={bulkEligible.read.length === 0 ? tx("allNotifications.noneEligibleRead", "No unread warranty, expiry or stock alerts selected") : undefined}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <EnvelopeOpenIcon className="h-4 w-4" />
                    {tx("allNotifications.markAsRead", "Mark as read")} ({bulkEligible.read.length})
                  </button>
                  <div className="relative" data-menu-root>
                    <button
                      type="button"
                      onClick={() => setBulkSnoozeOpen((v) => !v)}
                      disabled={bulkBusy || bulkEligible.snooze.length === 0}
                      title={bulkEligible.snooze.length === 0 ? tx("allNotifications.noneEligibleSnooze", "Only warranty and asset-expiry alerts can be snoozed") : undefined}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <BellSnoozeIcon className="h-4 w-4" />
                      {tx("allNotifications.snooze", "Snooze")} ({bulkEligible.snooze.length})
                    </button>
                    {bulkSnoozeOpen && (
                      <div className="absolute right-0 z-30 mt-1 w-56 rounded-lg border border-gray-200 bg-white p-2 shadow-xl">
                        <SnoozePicker
                          t={t}
                          value={bulkSnoozeDraft}
                          onChange={setBulkSnoozeDraft}
                          onApply={bulkSnooze}
                          applyLabel={tx("allNotifications.snoozeSelected", "Snooze {{count}}", { count: bulkEligible.snooze.length })}
                        />
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={bulkDiscard}
                    disabled={bulkBusy || bulkEligible.discard.length === 0}
                    title={bulkEligible.discard.length === 0 ? tx("allNotifications.noneEligibleDiscard", "Workflow tasks can't be discarded — complete them instead") : undefined}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <TrashIcon className="h-4 w-4" />
                    {t("allNotifications.discard")} ({bulkEligible.discard.length})
                  </button>
                </div>
              )}
            </div>

            {/* Active filter chips */}
            {activeFilterCount > 0 && (
              <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
                {query && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-blue-700">
                    “{deferredSearch.trim()}”
                    <button type="button" onClick={() => setSearch("")} aria-label="Remove"><XMarkIcon className="h-3.5 w-3.5" /></button>
                  </span>
                )}
                {prefs.priority !== "all" && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-blue-700">
                    {tx(`allNotifications.priority_${prefs.priority}`, PRIORITIES[prefs.priority]?.label)}
                    <button type="button" onClick={() => updatePrefs({ priority: "all" })} aria-label="Remove"><XMarkIcon className="h-3.5 w-3.5" /></button>
                  </span>
                )}
                {prefs.status !== "all" && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-blue-700">
                    {prefs.status === "unread" ? tx("allNotifications.unreadOnly", "Unread only") : tx("allNotifications.readOnly", "Read only")}
                    <button type="button" onClick={() => updatePrefs({ status: "all" })} aria-label="Remove"><XMarkIcon className="h-3.5 w-3.5" /></button>
                  </span>
                )}
                {prefs.selectedTypes.length !== ALL_TYPES.length && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-blue-700">
                    {tx("allNotifications.typesSelected", "{{count}} of {{total}} types", { count: prefs.selectedTypes.length, total: ALL_TYPES.length })}
                    <button type="button" onClick={() => setTypes(new Set(ALL_TYPES))} aria-label="Remove"><XMarkIcon className="h-3.5 w-3.5" /></button>
                  </span>
                )}
                <button type="button" onClick={resetFilters} className="font-medium text-gray-600 hover:text-gray-900 hover:underline">
                  {tx("allNotifications.resetFilters", "Reset all filters")}
                </button>
              </div>
            )}

            {error && !loading && (
              <div className="mb-3 flex items-center justify-between rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                <span>⚠️ {error}</span>
                <button type="button" onClick={() => fetchNotifications()} className="font-medium underline">
                  {tx("allNotifications.retry", "Retry")}
                </button>
              </div>
            )}

            {/* Results */}
            {loading ? (
              <div className="space-y-2 rounded-xl border border-gray-200 bg-white p-4">
                {[1, 2, 3, 4, 5].map((i) => <div key={i} className="h-14 animate-pulse rounded-lg bg-gray-100" />)}
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center rounded-xl border border-gray-200 bg-white py-14 text-center">
                <div className="mb-4 rounded-full bg-blue-50 p-4"><BellIcon className="h-12 w-12 text-blue-400" /></div>
                <h3 className="mb-1 text-lg font-semibold text-gray-700">
                  {alerts.length === 0 ? t("allNotifications.noNotifications") : t("allNotifications.noMatchingNotifications")}
                </h3>
                <p className="text-sm text-gray-500">
                  {alerts.length === 0 ? t("allNotifications.noNotificationsDescription") : t("allNotifications.noMatchingDescription")}
                </p>
                {alerts.length > 0 && (
                  <button type="button" onClick={resetFilters} className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
                    {tx("allNotifications.resetFilters", "Reset all filters")}
                  </button>
                )}
              </div>
            ) : prefs.view === "list" ? (
              <div className="rounded-xl border border-gray-200 bg-white">{renderRows(filtered, "list")}</div>
            ) : (
              <div className="space-y-4">
                {groups.map(({ category, items }) => {
                  const Icon = category.icon;
                  const collapsed = collapsedGroups.has(category.id);
                  const groupSelected = items.filter((a) => selectedKeys.has(a.key)).length;
                  const overdue = items.filter((a) => a.priority === "overdue").length;
                  const unread = items.filter((a) => a.isUnread).length;
                  return (
                    <div key={category.id} className="rounded-xl border border-gray-200 bg-white">
                      <div
                        className={`flex cursor-pointer items-center gap-3 px-4 py-3 ${collapsed ? "" : "border-b border-gray-100"}`}
                        onClick={() =>
                          setCollapsedGroups((prev) => {
                            const next = new Set(prev);
                            if (next.has(category.id)) next.delete(category.id);
                            else next.add(category.id);
                            return next;
                          })
                        }
                      >
                        <TriCheckbox
                          checked={groupSelected === items.length}
                          indeterminate={groupSelected > 0}
                          onChange={() => toggleGroupSelection(items)}
                          aria-label={tx("allNotifications.selectGroup", "Select all in {{group}}", { group: category.label })}
                        />
                        <span className={`rounded-md p-1.5 ${category.accent}`}><Icon className="h-4 w-4" /></span>
                        <h3 className="text-sm font-semibold text-gray-900">
                          {tx(`allNotifications.category_${category.id}`, category.label)}
                        </h3>
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">{items.length}</span>
                        {overdue > 0 && (
                          <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                            {overdue} {tx("allNotifications.priority_overdue", "Overdue").toLowerCase()}
                          </span>
                        )}
                        {unread > 0 && (
                          <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                            {unread} {tx("allNotifications.unread", "unread")}
                          </span>
                        )}
                        <ChevronDownIcon className={`ml-auto h-5 w-5 text-gray-400 transition-transform ${collapsed ? "-rotate-90" : ""}`} />
                      </div>
                      {!collapsed && renderRows(items, category.id)}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};

export default AllNotifications;
