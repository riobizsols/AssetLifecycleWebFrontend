import { create } from 'zustand';
import API from '../lib/axios';
import { buildCacheKey, invalidateCache, peekCache, setCache } from '../utils/apiCache';

const NAV_CACHE_PREFIX = 'app:navigation:v4';
const NAV_TTL_MS = 10 * 60 * 1000;

const navCacheKey = (userId) => buildCacheKey([NAV_CACHE_PREFIX, userId]);

const detectPlatform = () => {
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent,
  );
  return isMobile ? 'M' : 'D';
};

export const useNavigationStore = create((set, get) => ({
  navigation: [],
  loading: false,
  error: null,
  fetchedForUserId: null,

  fetchNavigation: async (userId, { force = false } = {}) => {
    if (!userId) {
      set({ navigation: [], loading: false, error: null, fetchedForUserId: null });
      return;
    }

    const cacheKey = navCacheKey(userId);
    if (!force) {
      const cached = peekCache(cacheKey, NAV_TTL_MS);
      if (cached) {
        set({ navigation: cached, loading: false, error: null, fetchedForUserId: userId });
        return cached;
      }
    }

    set({
      loading: true,
      error: null,
      navigation: get().fetchedForUserId === userId ? get().navigation : [],
      fetchedForUserId: null,
    });

    try {
      const platform = detectPlatform();
      const response = await API.get(`/navigation/user/navigation?platform=${platform}`);
      const data = response.data.success ? response.data.data : [];
      setCache(cacheKey, data);
      set({ navigation: data, loading: false, error: null, fetchedForUserId: userId });
      return data;
    } catch (err) {
      console.error('Error fetching navigation:', err);
      set({
        loading: false,
        error: err.response?.data?.message || 'Failed to fetch navigation',
        fetchedForUserId: null,
      });
      return get().navigation;
    }
  },

  resetNavigation: () => {
    invalidateCache(NAV_CACHE_PREFIX);
    set({ navigation: [], loading: false, error: null, fetchedForUserId: null });
  },
}));
