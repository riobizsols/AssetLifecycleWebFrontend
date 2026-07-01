import { create } from 'zustand';
import API from '../lib/axios';
import {
  buildCacheKey,
  fetchWithCache,
  fetchWithRevalidate,
  invalidateCache,
  peekCache,
} from '../utils/apiCache';

const TTL_MS = 3 * 60 * 1000;
const DEFAULTS_KEY = 'text-messages:default';
const translationsKey = (langCode) =>
  buildCacheKey(['text-messages:translations', String(langCode || '').trim().toLowerCase()]);

const cachedDefaults = peekCache(DEFAULTS_KEY, TTL_MS);

export const useTextMessagesStore = create((set, get) => ({
  defaults: cachedDefaults || [],
  translations: {},
  defaultsLoading: !cachedDefaults,
  translationsLoading: false,
  activeLangCode: 'ch',

  fetchDefaults: async ({ revalidate = false, force = false, onFresh } = {}) => {
    const apply = (rows) => {
      set({ defaults: rows, defaultsLoading: false });
      onFresh?.(rows);
    };

    const fetcher = async () => {
      const res = await API.get('/text-messages/default');
      return Array.isArray(res.data?.data) ? res.data.data : [];
    };

    if (revalidate && !force) {
      const cached = peekCache(DEFAULTS_KEY, TTL_MS);
      if (cached) apply(cached);
      else if (get().defaults.length > 0) set({ defaultsLoading: false });
      const { data } = await fetchWithRevalidate(DEFAULTS_KEY, fetcher, {
        ttlMs: TTL_MS,
        onFresh: apply,
      });
      return data;
    }

    if (!force && !revalidate) {
      const cached = peekCache(DEFAULTS_KEY, TTL_MS);
      if (cached) {
        apply(cached);
        return cached;
      }
    }

    set({ defaultsLoading: true });
    const { data } = await fetchWithCache(DEFAULTS_KEY, fetcher, {
      ttlMs: TTL_MS,
      force: force || revalidate,
    });
    apply(data);
    return data;
  },

  fetchTranslations: async (langCode, { revalidate = false, force = false, onFresh } = {}) => {
    const code = String(langCode || '').trim().toLowerCase();
    if (!code) {
      set({ translations: {}, translationsLoading: false, activeLangCode: code });
      return {};
    }

    const key = translationsKey(code);

    const apply = (trMap) => {
      set({
        translations: trMap,
        translationsLoading: false,
        activeLangCode: code,
      });
      onFresh?.(trMap);
    };

    const fetcher = async () => {
      const res = await API.get(`/text-messages/translations/${code}`);
      const trRows = Array.isArray(res.data?.data) ? res.data.data : [];
      const trMap = {};
      trRows.forEach((row) => {
        if (row?.tmd_id) trMap[row.tmd_id] = row.text ?? '';
      });
      return trMap;
    };

    if (revalidate && !force) {
      const cached = peekCache(key, TTL_MS);
      if (cached) apply(cached);
      else if (get().activeLangCode === code && Object.keys(get().translations).length > 0) {
        set({ translationsLoading: false, activeLangCode: code });
      }
      const { data } = await fetchWithRevalidate(key, fetcher, {
        ttlMs: TTL_MS,
        onFresh: apply,
      });
      return data;
    }

    if (!force && !revalidate) {
      const cached = peekCache(key, TTL_MS);
      if (cached) {
        apply(cached);
        return cached;
      }
    }

    set({ translationsLoading: true, activeLangCode: code });
    const { data } = await fetchWithCache(key, fetcher, {
      ttlMs: TTL_MS,
      force: force || revalidate,
    });
    apply(data);
    return data;
  },

  prefetchTextMessages: (langCode = 'ch') => {
    const { fetchDefaults, fetchTranslations } = get();
    fetchDefaults({ revalidate: true }).catch(() => {});
    fetchTranslations(langCode, { revalidate: true }).catch(() => {});
  },

  invalidateTextMessagesCache: () => {
    invalidateCache('text-messages:');
    set({ defaults: [], translations: {} });
  },
}));
