import {
  WrenchScrewdriverIcon,
  DocumentTextIcon,
  ShieldExclamationIcon,
  CubeIcon,
  ArchiveBoxIcon,
  BoltIcon,
} from "@heroicons/react/24/outline";

export const SPARE_WORKFLOWS = ["SPARE_APPROVAL", "SPARE_REQUESTED", "SPARE_ISSUED", "SPARE_CONFIRMED"];
export const STOCK_WORKFLOWS = ["STOCK_OUT_OF_STOCK", "STOCK_NEEDS_PURCHASE"];

export const isSpareAlert = (alert) => SPARE_WORKFLOWS.includes(alert?.workflowType);
export const isStockAlert = (alert) => STOCK_WORKFLOWS.includes(alert?.workflowType);
export const isWarrantyAlert = (alert) => alert?.workflowType === "WARRANTY";
export const isAssetExpiryAlert = (alert) =>
  alert?.workflowType === "ASSETEXPIRY" || alert?.workflowType === "ASSET_EXPIRY";

export const isUnreadStatus = (status) => {
  const normalized = String(status || "").toUpperCase();
  return normalized === "NEW" || normalized === "UNREAD";
};

/** Notification kinds backed by a notify table (support read / discard / snooze). */
export const notifyKind = (alert) => {
  if (!alert?.notifyId) return null;
  if (isWarrantyAlert(alert)) return "warranty";
  if (isAssetExpiryAlert(alert)) return "expiry";
  if (isStockAlert(alert)) return "stock";
  return null;
};

export const canMarkRead = (alert) => !!notifyKind(alert) && isUnreadStatus(alert.notificationStatus);
export const canDiscard = (alert) => !!notifyKind(alert);
export const canSnooze = (alert) => ["warranty", "expiry"].includes(notifyKind(alert));

export const TYPE_META = {
  maintenance: { label: "Maintenance", badge: "bg-blue-50 text-blue-700 ring-blue-600/20", dot: "bg-blue-500" },
  inspection: { label: "Inspection", badge: "bg-green-50 text-green-700 ring-green-600/20", dot: "bg-green-500" },
  vendorRenewal: { label: "Vendor Contract Renewal", badge: "bg-purple-50 text-purple-700 ring-purple-600/20", dot: "bg-purple-500" },
  subscriptionRenewal: { label: "Subscription Renewal", badge: "bg-orange-50 text-orange-700 ring-orange-600/20", dot: "bg-orange-500" },
  warranty: { label: "Warranty Expiry", badge: "bg-amber-50 text-amber-700 ring-amber-600/20", dot: "bg-amber-500" },
  assetExpiry: { label: "Asset Expiry", badge: "bg-rose-50 text-rose-700 ring-rose-600/20", dot: "bg-rose-500" },
  spareApproval: { label: "Spare Part Approval", badge: "bg-violet-50 text-violet-700 ring-violet-600/20", dot: "bg-violet-500" },
  spareIssued: { label: "Spare Part Requested", badge: "bg-emerald-50 text-emerald-700 ring-emerald-600/20", dot: "bg-emerald-500" },
  spareConfirmed: { label: "Spare Part Issued", badge: "bg-sky-50 text-sky-700 ring-sky-600/20", dot: "bg-sky-500" },
  stockAlert: { label: "Stock Alert", badge: "bg-rose-50 text-rose-700 ring-rose-600/20", dot: "bg-rose-500" },
  consumptionMiss: { label: "Consumption Miss", badge: "bg-orange-50 text-orange-700 ring-orange-600/20", dot: "bg-orange-500" },
};

export const CATEGORIES = [
  { id: "maintenance", label: "Maintenance & Inspection", icon: WrenchScrewdriverIcon, accent: "text-blue-600 bg-blue-50", types: ["maintenance", "inspection"] },
  { id: "renewals", label: "Contracts & Renewals", icon: DocumentTextIcon, accent: "text-purple-600 bg-purple-50", types: ["vendorRenewal", "subscriptionRenewal"] },
  { id: "expiry", label: "Warranty & Expiry", icon: ShieldExclamationIcon, accent: "text-amber-600 bg-amber-50", types: ["warranty", "assetExpiry"] },
  { id: "spares", label: "Spare Parts", icon: CubeIcon, accent: "text-violet-600 bg-violet-50", types: ["spareApproval", "spareIssued", "spareConfirmed"] },
  { id: "inventory", label: "Inventory", icon: ArchiveBoxIcon, accent: "text-rose-600 bg-rose-50", types: ["stockAlert"] },
  { id: "utilities", label: "Utilities", icon: BoltIcon, accent: "text-orange-600 bg-orange-50", types: ["consumptionMiss"] },
];

export const ALL_TYPES = CATEGORIES.flatMap((c) => c.types);

export const categoryOfType = (type) => CATEGORIES.find((c) => c.types.includes(type)) || CATEGORIES[0];

export const getNotificationType = (alert) => {
  if (alert.workflowType === "INSPECTION" || alert.alertType === "Inspection") return "inspection";
  if (isWarrantyAlert(alert)) return "warranty";
  if (isAssetExpiryAlert(alert)) return "assetExpiry";
  if (["SPARE_APPROVAL", "SPARE_REQUESTED"].includes(alert.workflowType)) return "spareApproval";
  if (alert.workflowType === "SPARE_ISSUED") return "spareIssued";
  if (alert.workflowType === "SPARE_CONFIRMED") return "spareConfirmed";
  if (alert.workflowType === "CONSUMPTION_MISS") return "consumptionMiss";
  if (isStockAlert(alert)) return "stockAlert";

  const typeText = String(alert.alertType || "").toLowerCase();
  const bodyText = String(alert.alertText || "").toLowerCase();
  if (typeText.includes("subscription") || bodyText.includes("subscription")) return "subscriptionRenewal";
  if (typeText.includes("renewal") || bodyText.includes("renewal") || bodyText.includes("contract")) return "vendorRenewal";
  return "maintenance";
};

export const PRIORITIES = {
  overdue: { label: "Overdue", pill: "bg-red-100 text-red-700", rank: 0 },
  urgent: { label: "Due soon", pill: "bg-amber-100 text-amber-800", rank: 1 },
  upcoming: { label: "Upcoming", pill: "bg-gray-100 text-gray-700", rank: 2 },
  none: { label: "No deadline", pill: "bg-slate-100 text-slate-600", rank: 3 },
};

export const getPriority = (alert) => {
  if (isSpareAlert(alert) || isStockAlert(alert)) return "none";
  const days = alert.daysUntilCutoff;
  if (days === undefined || days === null || Number.isNaN(Number(days))) return "none";
  if (Number(days) <= 0) return "overdue";
  if (Number(days) <= 2) return "urgent";
  return "upcoming";
};

const workflowAlertType = (n, t) => {
  if (n.workflowType === "INSPECTION") return "Inspection";
  if (n.workflowType === "WARRANTY") {
    return n.isOverdue || n.title === "Warranty Expired"
      ? t("allNotifications.alertTypeWarrantyExpired")
      : t("allNotifications.alertTypeWarrantyExpiry");
  }
  if (isAssetExpiryAlert(n)) return "Asset Expiry";
  if (["SPARE_APPROVAL", "SPARE_REQUESTED"].includes(n.workflowType)) return "Spare Part Approval";
  if (n.workflowType === "SPARE_ISSUED") return "Spare Part Issued";
  if (n.workflowType === "SPARE_CONFIRMED") return "Spare Part Confirmed";
  if (n.workflowType === "CONSUMPTION_MISS") return "Consumption Miss Alert";
  if (n.workflowType === "STOCK_OUT_OF_STOCK") return "Out of stock";
  if (n.workflowType === "STOCK_NEEDS_PURCHASE") return "Needs purchase";
  return n.maintenanceType || "Regular Maintenance";
};

const workflowAlertText = (n, t) => {
  if (n.isGroupMaintenance && n.groupName) {
    return t("allNotifications.groupNameWithAssets", { groupName: n.groupName, count: n.groupAssetCount });
  }
  if (n.workflowType === "INSPECTION") return t("allNotifications.assetTypeInspection", { assetType: n.assetTypeName });
  if (n.workflowType === "WARRANTY") return `${n.assetId} - ${n.title || t("allNotifications.alertTypeWarrantyExpiry")}`;
  if (isAssetExpiryAlert(n)) return `${n.assetId} - ${n.title || "Asset Expiry"}`;
  if (isSpareAlert(n)) return `${n.assetTypeName || "-"}`;
  if (n.workflowType === "CONSUMPTION_MISS") {
    return n.body || `${n.assetId} — ${n.categoryName || n.utilitySh || "Utility"} reading missed`;
  }
  if (isStockAlert(n)) return n.body || `${n.assetTypeName || n.categoryName || "-"}`;
  if (String(n.maintenanceType || "").toLowerCase().includes("subscription")) return `${n.assetTypeName}`;
  return t("allNotifications.assetTypeMaintenance", { assetType: n.assetTypeName });
};

export const transformNotification = (n, t, index) => {
  const alert = {
    key: n.notifyId ? `${n.workflowType}:${n.notifyId}` : `${n.workflowType || "WF"}:${n.id ?? n.wfamshId ?? index}:${index}`,
    alertType: workflowAlertType(n, t),
    alertText: workflowAlertText(n, t),
    dueDateRaw: n.dueDate || null,
    cutoffDateRaw: n.cutoffDate || null,
    actionBy: n.workflowType === "CONSUMPTION_MISS"
      ? t("allNotifications.actionByYou")
      : n.userName || t("allNotifications.unassigned"),
    wfamshId: n.wfamshId,
    route: n.route,
    workflowType: n.workflowType,
    workflowId: n.workflowId,
    id: n.id,
    daysUntilCutoff: n.daysUntilCutoff,
    assetId: n.assetId,
    isGroupMaintenance: !!n.isGroupMaintenance,
    groupId: n.groupId,
    groupName: n.groupName,
    groupAssetCount: n.groupAssetCount,
    assetTypeName: n.assetTypeName,
    categoryName: n.categoryName,
    maintenanceId: n.maintenanceId,
    quantityIssued: n.quantityIssued,
    statusLabel: n.statusLabel,
    notifyId: n.notifyId,
    notificationStatus: n.notificationStatus,
    title: n.title,
    isOverdue: !!n.isOverdue,
    canChangeVendor: !!n.canChangeVendor,
    body: n.body,
    spcId: n.spcId,
  };
  alert.type = getNotificationType(alert);
  alert.categoryId = categoryOfType(alert.type).id;
  alert.priority = getPriority(alert);
  alert.isUnread = isUnreadStatus(alert.notificationStatus);
  alert.searchText = [
    alert.alertText,
    alert.alertType,
    TYPE_META[alert.type]?.label,
    alert.assetId,
    alert.assetTypeName,
    alert.categoryName,
    alert.groupName,
    alert.actionBy,
    alert.body,
    alert.title,
    alert.maintenanceId,
    alert.statusLabel,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return alert;
};

const time = (value) => {
  if (!value) return Number.POSITIVE_INFINITY;
  const ms = new Date(value).getTime();
  return Number.isNaN(ms) ? Number.POSITIVE_INFINITY : ms;
};

export const SORTS = {
  priority: {
    label: "Priority",
    compare: (a, b) =>
      PRIORITIES[a.priority].rank - PRIORITIES[b.priority].rank ||
      time(a.cutoffDateRaw || a.dueDateRaw) - time(b.cutoffDateRaw || b.dueDateRaw),
  },
  dueAsc: { label: "Due date (soonest)", compare: (a, b) => time(a.dueDateRaw) - time(b.dueDateRaw) },
  dueDesc: {
    label: "Due date (latest)",
    compare: (a, b) => {
      const ta = time(a.dueDateRaw);
      const tb = time(b.dueDateRaw);
      if (ta === tb) return 0;
      if (ta === Number.POSITIVE_INFINITY) return 1;
      if (tb === Number.POSITIVE_INFINITY) return -1;
      return tb - ta;
    },
  },
  cutoffAsc: { label: "Cut-off date (soonest)", compare: (a, b) => time(a.cutoffDateRaw) - time(b.cutoffDateRaw) },
  type: {
    label: "Type (A–Z)",
    compare: (a, b) => String(TYPE_META[a.type]?.label).localeCompare(String(TYPE_META[b.type]?.label)),
  },
};
