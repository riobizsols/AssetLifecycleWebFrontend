import { create } from 'zustand';
import API from '../lib/axios';
import {
  buildCacheKey,
  fetchWithCache,
  fetchWithRevalidate,
  peekCache,
} from '../utils/apiCache';

const DASHBOARD_TTL_MS = 3 * 60 * 1000;
const KEYS = {
  summary: 'dashboard:summary',
  department: 'dashboard:department',
  top5: 'dashboard:top5',
};

const DEPT_COLORS = [
  '#3b82f6', '#06b6d4', '#fbbf24', '#10b981', '#f59e0b',
  '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#6366f1',
];

const TOP5_COLORS = [
  'bg-blue-500', 'bg-blue-400', 'bg-blue-300', 'bg-blue-200', 'bg-blue-100',
];

function mapDepartmentChart(rows) {
  return (rows || [])
    .map((dept, index) => ({
      name: dept.name,
      value: dept.value,
      color: DEPT_COLORS[index % DEPT_COLORS.length],
    }))
    .filter((item) => item.value > 0);
}

function mapTop5Chart(rows) {
  return (rows || []).map((type, index) => ({
    name: type.name,
    count: type.count,
    color: TOP5_COLORS[index % TOP5_COLORS.length],
  }));
}

function selectDashboardAlerts(transformedAlerts) {
  const maintenanceAlerts = transformedAlerts.filter(
    (alert) => alert.alertType !== 'Inspection' && alert.workflowType !== 'INSPECTION',
  );
  const inspectionAlerts = transformedAlerts.filter(
    (alert) => alert.alertType === 'Inspection' || alert.workflowType === 'INSPECTION',
  );

  if (maintenanceAlerts.length > 0 && inspectionAlerts.length > 0) {
    return [maintenanceAlerts[0], inspectionAlerts[0]];
  }
  if (maintenanceAlerts.length > 0) {
    return maintenanceAlerts.slice(0, 2);
  }
  if (inspectionAlerts.length > 0) {
    return inspectionAlerts.slice(0, 2);
  }
  return [];
}

function formatNotificationDate(dateString) {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString();
}

function transformNotifications(notifications) {
  const transformed = (notifications || []).map((notification) => {
    let alertType = 'Regular Maintenance';
    if (notification.workflowType === 'INSPECTION') {
      alertType = 'Inspection';
    } else if (notification.workflowType === 'WARRANTY') {
      alertType = 'Warranty Expiry';
    } else if (notification.maintenanceType) {
      alertType = notification.maintenanceType;
    }

    let alertText = '';
    if (alertType === 'Inspection') {
      alertText = `${notification.assetTypeName} Inspection`;
    } else if (alertType === 'Warranty Expiry') {
      alertText = `${notification.assetId} - ${notification.title || 'Warranty Expiry'}`;
    } else if (String(notification.maintenanceType || '').toLowerCase().includes('subscription')) {
      alertText = `${notification.assetTypeName}`;
    } else if (alertType === 'Vendor Contract Renewal') {
      alertText = `${notification.assetTypeName}`;
    } else if (notification.isGroupMaintenance && notification.groupName) {
      alertText = `${notification.groupName} (${notification.groupAssetCount} assets)`;
    } else {
      alertText = `${notification.assetTypeName} Maintenance`;
    }

    return {
      alertType,
      alertText,
      dueOn: formatNotificationDate(notification.dueDate),
      actionBy: notification.userName || 'Unassigned',
      cutoffDate: formatNotificationDate(notification.cutoffDate),
      isUrgent: notification.daysUntilCutoff <= 2,
      wfamshId: notification.wfamshId,
      route: notification.route,
      workflowType: notification.workflowType,
      workflowId: notification.workflowId,
      id: notification.id,
      daysUntilCutoff: notification.daysUntilCutoff,
      assetId: notification.assetId,
      isGroupMaintenance: notification.isGroupMaintenance || false,
      groupId: notification.groupId,
      groupName: notification.groupName,
      groupAssetCount: notification.groupAssetCount,
      assetTypeName: notification.assetTypeName,
      notifyId: notification.notifyId,
      notificationStatus: notification.notificationStatus,
      canChangeVendor: !!notification.canChangeVendor,
    };
  });

  return selectDashboardAlerts(transformed);
}

const emptyMetrics = {
  totalAssets: 0,
  assignedAssets: 0,
  underMaintenance: 0,
  decommissioned: 0,
  summary: null,
};

const cachedSummary = peekCache(KEYS.summary, DASHBOARD_TTL_MS);

export const useDashboardStore = create((set, get) => ({
  metrics: cachedSummary?.metrics || emptyMetrics,
  departmentChart: mapDepartmentChart(peekCache(KEYS.department, DASHBOARD_TTL_MS)) || [],
  top5AssetTypes: mapTop5Chart(peekCache(KEYS.top5, DASHBOARD_TTL_MS)) || [],
  notifications: [],
  metricsLoading: !cachedSummary,
  departmentLoading: !peekCache(KEYS.department, DASHBOARD_TTL_MS),
  top5Loading: !peekCache(KEYS.top5, DASHBOARD_TTL_MS),
  notificationsLoading: true,

  fetchMetrics: async ({ revalidate = false, onFresh } = {}) => {
    const apply = (payload) => {
      set({ metrics: payload, metricsLoading: false });
      onFresh?.(payload);
    };

    const fetcher = async () => {
      const response = await API.get('/assets/dashboard-summary');
      const summary = response.data?.success ? response.data.summary : null;
      return {
        totalAssets: summary?.total_assets || 0,
        assignedAssets: summary?.assigned || 0,
        underMaintenance: summary?.under_maintenance || 0,
        decommissioned: summary?.decommissioned || 0,
        summary,
      };
    };

    if (revalidate) {
      const cached = peekCache(KEYS.summary, DASHBOARD_TTL_MS);
      if (cached) apply(cached);
      const { data } = await fetchWithRevalidate(KEYS.summary, fetcher, {
        ttlMs: DASHBOARD_TTL_MS,
        onFresh: apply,
      });
      return data;
    }

    const { data } = await fetchWithCache(KEYS.summary, fetcher, {
      ttlMs: DASHBOARD_TTL_MS,
    });
    apply(data);
    return data;
  },

  fetchDepartmentChart: async ({ revalidate = false, onFresh } = {}) => {
    const apply = (rows) => {
      const chart = mapDepartmentChart(rows);
      set({ departmentChart: chart, departmentLoading: false });
      onFresh?.(chart);
    };

    const fetcher = async () => {
      const response = await API.get('/assets/department-distribution');
      return response.data?.success ? response.data.data : [];
    };

    if (revalidate) {
      const cached = peekCache(KEYS.department, DASHBOARD_TTL_MS);
      if (cached) apply(cached);
      const { data } = await fetchWithRevalidate(KEYS.department, fetcher, {
        ttlMs: DASHBOARD_TTL_MS,
        onFresh: (rows) => apply(rows),
      });
      return mapDepartmentChart(data);
    }

    const { data } = await fetchWithCache(KEYS.department, fetcher, {
      ttlMs: DASHBOARD_TTL_MS,
    });
    apply(data);
    return mapDepartmentChart(data);
  },

  fetchTop5AssetTypes: async ({ revalidate = false, onFresh } = {}) => {
    const apply = (rows) => {
      const chart = mapTop5Chart(rows);
      set({ top5AssetTypes: chart, top5Loading: false });
      onFresh?.(chart);
    };

    const fetcher = async () => {
      const response = await API.get('/assets/top-5-asset-types');
      return response.data?.success ? response.data.data : [];
    };

    if (revalidate) {
      const cached = peekCache(KEYS.top5, DASHBOARD_TTL_MS);
      if (cached) apply(cached);
      const { data } = await fetchWithRevalidate(KEYS.top5, fetcher, {
        ttlMs: DASHBOARD_TTL_MS,
        onFresh: (rows) => apply(rows),
      });
      return mapTop5Chart(data);
    }

    const { data } = await fetchWithCache(KEYS.top5, fetcher, {
      ttlMs: DASHBOARD_TTL_MS,
    });
    apply(data);
    return mapTop5Chart(data);
  },

  fetchNotifications: async (empIntId, { revalidate = false, onFresh } = {}) => {
    if (!empIntId) {
      set({ notifications: [], notificationsLoading: false });
      return [];
    }

    const cacheKey = buildCacheKey(['dashboard', 'notifications', empIntId]);
    const apply = (alerts) => {
      set({ notifications: alerts, notificationsLoading: false });
      onFresh?.(alerts);
    };

    const fetcher = async () => {
      const response = await API.get(`/notifications/user/${empIntId}`);
      return transformNotifications(response.data?.data || []);
    };

    if (revalidate) {
      const cached = peekCache(cacheKey, DASHBOARD_TTL_MS);
      if (cached) apply(cached);
      const { data } = await fetchWithRevalidate(cacheKey, fetcher, {
        ttlMs: DASHBOARD_TTL_MS,
        onFresh: apply,
      });
      return data;
    }

    const { data } = await fetchWithCache(cacheKey, fetcher, {
      ttlMs: DASHBOARD_TTL_MS,
    });
    apply(data);
    return data;
  },

  loadDashboard: async (empIntId) => {
    await Promise.all([
      get().fetchMetrics({ revalidate: true }),
      get().fetchDepartmentChart({ revalidate: true }),
      get().fetchTop5AssetTypes({ revalidate: true }),
      get().fetchNotifications(empIntId, { revalidate: true }),
    ]);
  },

  setNotifications: (notifications) => set({ notifications }),
}));
