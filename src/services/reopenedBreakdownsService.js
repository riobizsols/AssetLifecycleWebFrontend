import API from "../lib/axios";
import { fetchWithCache } from "../utils/apiCache";

export const reopenedBreakdownsService = {
  async getFilterOptions() {
    const orgId = localStorage.getItem("org_id") || "ORG001";
    const key = `reopenedBreakdowns:filterOptions:${orgId}`;
    const { data } = await fetchWithCache(
      key,
      async () => {
        const response = await API.get(
          `/breakdown-history/reopened-breakdowns/filter-options?orgId=${encodeURIComponent(orgId)}`,
        );
        return response.data;
      },
      { ttlMs: 5 * 60 * 1000 }, // 5 minutes
    );
    return data;
  },
  async getReopenedBreakdowns(filters = {}) {
    const orgId = localStorage.getItem("org_id") || "ORG001";
    const params = new URLSearchParams({ orgId });

    if (filters.assetId) params.set("assetId", filters.assetId);
    if (filters.assetTypeId) params.set("assetTypeId", filters.assetTypeId);
    if (filters.userId) params.set("userId", filters.userId);
    if (filters.deptId) params.set("deptId", filters.deptId);
    if (filters.reopenCountMin !== undefined && filters.reopenCountMin !== null && `${filters.reopenCountMin}`.trim() !== '') {
      params.set("reopenCountMin", String(filters.reopenCountMin));
    }
    if (filters.lastReopenedOnFrom) params.set("lastReopenedOnFrom", filters.lastReopenedOnFrom);
    if (filters.lastReopenedOnTo) params.set("lastReopenedOnTo", filters.lastReopenedOnTo);

    const key = `reopenedBreakdowns:list:${params.toString()}`;
    const { data } = await fetchWithCache(
      key,
      async () => {
        const response = await API.get(
          `/breakdown-history/reopened-breakdowns?${params.toString()}`,
        );
        return response.data;
      },
      { ttlMs: 30 * 1000 }, // 30 seconds
    );
    return data;
  },

  /** Full tblAssetMaintSch_BR_Hist rows for one AMS maintenance schedule */
  async getBrHistForAmsId(amsId) {
    const orgId = localStorage.getItem("org_id") || "ORG001";
    const url = `/breakdown-history/reopened-breakdowns/${encodeURIComponent(amsId)}/history?orgId=${encodeURIComponent(orgId)}`;
    const key = `reopenedBreakdowns:hist:${orgId}:${amsId}`;
    const { data } = await fetchWithCache(
      key,
      async () => {
        const response = await API.get(url);
        return response.data;
      },
      { ttlMs: 60 * 1000 }, // 1 minute
    );
    return data;
  },
};

