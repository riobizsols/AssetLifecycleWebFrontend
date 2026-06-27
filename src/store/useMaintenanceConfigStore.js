import { create } from 'zustand';
import API from '../lib/axios';
import {
  fetchWithCache,
  fetchWithRevalidate,
  invalidateCache,
  peekCache,
} from '../utils/apiCache';

const TTL_MS = 3 * 60 * 1000;
const DETAILS_BASE_KEY = 'maintenance-config:details-base';
const FREQ_BUNDLE_KEY = 'maintenance-config:freq-bundle';

const sequencesKey = (assetTypeId) => `maintenance-config:sequences:${assetTypeId}`;
const stepRolesKey = (wfStepsId) => `maintenance-config:step-roles:${wfStepsId}`;

function parseMaintTypes(res) {
  let types = [];
  if (Array.isArray(res.data)) {
    types = res.data;
  } else if (res.data?.data && Array.isArray(res.data.data)) {
    types = res.data.data;
  } else if (res.data?.success && Array.isArray(res.data.data)) {
    types = res.data.data;
  }
  return types.filter((mt) => {
    if (!mt?.maint_type_id) return false;
    const status = mt.int_status;
    if (status === undefined || status === null) return true;
    return status === 1 || status === '1' || status === true || status === 'true';
  });
}

function parseUomOptions(res) {
  let uomData = [];
  if (res.data?.success && Array.isArray(res.data.data)) {
    uomData = res.data.data;
  } else if (Array.isArray(res.data)) {
    uomData = res.data;
  }
  return uomData.map((u) => ({
    id: u.UOM_id || u.uom_id,
    text: u.UOM || u.uom || u.text,
  }));
}

const cachedDetailsBase = peekCache(DETAILS_BASE_KEY, TTL_MS);
const cachedFreqBundle = peekCache(FREQ_BUNDLE_KEY, TTL_MS);

export const useMaintenanceConfigStore = create((set, get) => ({
  workflowSteps: cachedDetailsBase?.workflowSteps || [],
  assetTypes: cachedDetailsBase?.assetTypes || [],
  jobRoles: cachedDetailsBase?.jobRoles || [],
  detailsLoading: !cachedDetailsBase,

  maintenanceTypes: cachedFreqBundle?.maintenanceTypes || [],
  uomOptions: cachedFreqBundle?.uomOptions || [],
  frequencies: cachedFreqBundle?.frequencies || [],
  frequenciesLoading: !cachedFreqBundle,

  sequencesByAssetType: {},
  sequencesLoading: false,
  jobRolesByStep: {},
  stepRolesLoading: false,

  fetchDetailsBase: async ({ revalidate = false, force = false } = {}) => {
    const apply = (bundle) => {
      set({
        workflowSteps: bundle.workflowSteps,
        assetTypes: bundle.assetTypes,
        jobRoles: bundle.jobRoles,
        detailsLoading: false,
      });
    };

    const fetcher = async () => {
      const [stepsRes, assetTypesRes, jobRolesRes] = await Promise.all([
        API.get('/maintenance-details/workflow-steps'),
        API.get('/asset-types'),
        API.get('/job-roles'),
      ]);
      return {
        workflowSteps: stepsRes.data?.data || [],
        assetTypes: assetTypesRes.data || [],
        jobRoles: jobRolesRes.data?.roles || [],
      };
    };

    if (revalidate && !force) {
      const cached = peekCache(DETAILS_BASE_KEY, TTL_MS);
      if (cached) apply(cached);
      else if (get().workflowSteps.length > 0) set({ detailsLoading: false });
      const { data } = await fetchWithRevalidate(DETAILS_BASE_KEY, fetcher, {
        ttlMs: TTL_MS,
        onFresh: apply,
      });
      return data;
    }

    if (!force && !revalidate) {
      const cached = peekCache(DETAILS_BASE_KEY, TTL_MS);
      if (cached) {
        apply(cached);
        return cached;
      }
    }

    set({ detailsLoading: true });
    const { data } = await fetchWithCache(DETAILS_BASE_KEY, fetcher, {
      ttlMs: TTL_MS,
      force: force || revalidate,
    });
    apply(data);
    return data;
  },

  fetchSequences: async (assetTypeId, { revalidate = false, force = false } = {}) => {
    if (!assetTypeId) return [];
    const key = sequencesKey(assetTypeId);

    const apply = (rows) => {
      set((state) => ({
        sequencesByAssetType: { ...state.sequencesByAssetType, [assetTypeId]: rows },
        sequencesLoading: false,
      }));
    };

    const fetcher = async () => {
      const res = await API.get(`/maintenance-details/workflow-sequences/${assetTypeId}`);
      return res.data?.data || [];
    };

    const cached = peekCache(key, TTL_MS);
    if (cached && !force) {
      apply(cached);
      if (!revalidate) return cached;
    }

    if (revalidate && !force) {
      set({ sequencesLoading: !cached && !get().sequencesByAssetType[assetTypeId]?.length });
      const { data } = await fetchWithRevalidate(key, fetcher, {
        ttlMs: TTL_MS,
        onFresh: apply,
      });
      return data;
    }

    set({ sequencesLoading: !cached });
    const { data } = await fetchWithCache(key, fetcher, {
      ttlMs: TTL_MS,
      force: force || revalidate,
    });
    apply(data);
    return data;
  },

  fetchJobRolesForStep: async (wfStepsId, { revalidate = false, force = false } = {}) => {
    if (!wfStepsId) return [];
    const key = stepRolesKey(wfStepsId);

    const apply = (rows) => {
      set((state) => ({
        jobRolesByStep: { ...state.jobRolesByStep, [wfStepsId]: rows },
        stepRolesLoading: false,
      }));
    };

    const fetcher = async () => {
      const res = await API.get(`/maintenance-details/workflow-job-roles/${wfStepsId}`);
      return res.data?.data || [];
    };

    const cached = peekCache(key, TTL_MS);
    if (cached && !force) {
      apply(cached);
      if (!revalidate) return cached;
    }

    if (revalidate && !force) {
      set({ stepRolesLoading: !cached && !get().jobRolesByStep[wfStepsId]?.length });
      const { data } = await fetchWithRevalidate(key, fetcher, {
        ttlMs: TTL_MS,
        onFresh: apply,
      });
      return data;
    }

    set({ stepRolesLoading: !cached });
    const { data } = await fetchWithCache(key, fetcher, {
      ttlMs: TTL_MS,
      force: force || revalidate,
    });
    apply(data);
    return data;
  },

  fetchFrequencyBundle: async ({ revalidate = false, force = false } = {}) => {
    const apply = (bundle) => {
      set({
        maintenanceTypes: bundle.maintenanceTypes,
        uomOptions: bundle.uomOptions,
        frequencies: bundle.frequencies,
        frequenciesLoading: false,
      });
    };

    const fetcher = async () => {
      const [typesRes, uomRes, freqRes] = await Promise.all([
        API.get('/maint-types'),
        API.get('/uom'),
        API.get('/maintenance-frequencies'),
      ]);
      return {
        maintenanceTypes: parseMaintTypes(typesRes),
        uomOptions: parseUomOptions(uomRes),
        frequencies: freqRes.data?.success ? freqRes.data.data || [] : [],
      };
    };

    if (revalidate && !force) {
      const cached = peekCache(FREQ_BUNDLE_KEY, TTL_MS);
      if (cached) apply(cached);
      else if (get().frequencies.length > 0) set({ frequenciesLoading: false });
      const { data } = await fetchWithRevalidate(FREQ_BUNDLE_KEY, fetcher, {
        ttlMs: TTL_MS,
        onFresh: apply,
      });
      return data;
    }

    if (!force && !revalidate) {
      const cached = peekCache(FREQ_BUNDLE_KEY, TTL_MS);
      if (cached) {
        apply(cached);
        return cached;
      }
    }

    set({ frequenciesLoading: true });
    const { data } = await fetchWithCache(FREQ_BUNDLE_KEY, fetcher, {
      ttlMs: TTL_MS,
      force: force || revalidate,
    });
    apply(data);
    return data;
  },

  prefetchMaintenanceConfig: () => {
    const { fetchDetailsBase, fetchFrequencyBundle } = get();
    fetchDetailsBase({ revalidate: true }).catch(() => {});
    fetchFrequencyBundle({ revalidate: true }).catch(() => {});
  },

  invalidateMaintenanceConfigCache: () => {
    invalidateCache('maintenance-config:');
    set({
      workflowSteps: [],
      assetTypes: [],
      jobRoles: [],
      maintenanceTypes: [],
      uomOptions: [],
      frequencies: [],
      sequencesByAssetType: {},
      jobRolesByStep: {},
    });
  },
}));
