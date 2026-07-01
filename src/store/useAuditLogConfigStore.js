import { create } from 'zustand';
import API from '../lib/axios';
import {
  fetchWithCache,
  fetchWithRevalidate,
  invalidateCache,
  peekCache,
} from '../utils/apiCache';

const AUDIT_LOG_CONFIG_TTL_MS = 5 * 60 * 1000;
const BUNDLE_KEY = 'audit-log-config:bundle';

function parseBundle(responses) {
  const [configsResponse, eventNamesResponse, appNamesResponse] = responses;

  const eventNames = {};
  if (eventNamesResponse.data?.success && eventNamesResponse.data.data?.events) {
    eventNamesResponse.data.data.events.forEach((event) => {
      eventNames[event.event_id] = event.text;
    });
  }

  const appNames = {};
  if (appNamesResponse.data?.success && appNamesResponse.data.data?.apps) {
    appNamesResponse.data.data.apps.forEach((app) => {
      appNames[app.app_id] = app.app_name;
    });
  }

  return {
    configs: configsResponse.data?.success ? configsResponse.data.data || [] : [],
    eventNames,
    appNames,
  };
}

const cachedBundle = peekCache(BUNDLE_KEY, AUDIT_LOG_CONFIG_TTL_MS);

export const useAuditLogConfigStore = create((set, get) => ({
  configs: cachedBundle?.configs || [],
  eventNames: cachedBundle?.eventNames || {},
  appNames: cachedBundle?.appNames || {},
  listLoading: !cachedBundle,

  fetchConfigs: async ({ revalidate = false, force = false, onFresh } = {}) => {
    const apply = (bundle) => {
      set({
        configs: bundle.configs,
        eventNames: bundle.eventNames,
        appNames: bundle.appNames,
        listLoading: false,
      });
      onFresh?.(bundle);
    };

    const fetcher = async () => {
      const responses = await Promise.all([
        API.get('/audit-log-configs'),
        API.get('/app-events/events'),
        API.get('/app-events/apps'),
      ]);
      return parseBundle(responses);
    };

    if (revalidate && !force) {
      const cached = peekCache(BUNDLE_KEY, AUDIT_LOG_CONFIG_TTL_MS);
      if (cached) {
        apply(cached);
      } else if (get().configs.length > 0) {
        set({ listLoading: false });
      }
      const { data } = await fetchWithRevalidate(BUNDLE_KEY, fetcher, {
        ttlMs: AUDIT_LOG_CONFIG_TTL_MS,
        onFresh: apply,
      });
      return data;
    }

    if (!force && !revalidate) {
      const cached = peekCache(BUNDLE_KEY, AUDIT_LOG_CONFIG_TTL_MS);
      if (cached) {
        apply(cached);
        return cached;
      }
    }

    set({ listLoading: true });
    const { data } = await fetchWithCache(BUNDLE_KEY, fetcher, {
      ttlMs: AUDIT_LOG_CONFIG_TTL_MS,
      force: force || revalidate,
    });
    apply(data);
    return data;
  },

  patchConfig: (alcId, updates) => {
    set((state) => ({
      configs: state.configs.map((config) =>
        config.alc_id === alcId ? { ...config, ...updates } : config,
      ),
    }));
  },

  prefetchAuditLogConfig: () => {
    get().fetchConfigs({ revalidate: true }).catch(() => {});
  },

  invalidateAuditLogConfigCache: () => {
    invalidateCache('audit-log-config:');
    set({ configs: [], eventNames: {}, appNames: {} });
  },
}));
