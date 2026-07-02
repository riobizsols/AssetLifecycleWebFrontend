import { create } from 'zustand';
import API from '../lib/axios';
import { buildCacheKey, peekCache, setCache, invalidateCache } from '../utils/apiCache';

const NAV_CACHE_KEY = 'app:navigation:v4';
const NAV_TTL_MS = 10 * 60 * 1000;

const detectPlatform = () => {
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent,
  );
  return isMobile ? 'M' : 'D';
};

export const useNavigationStore = create((set, get) => ({
  navigation: peekCache(NAV_CACHE_KEY, NAV_TTL_MS) || [],
  loading: !peekCache(NAV_CACHE_KEY, NAV_TTL_MS),
  error: null,
  fetchedForUserId: null,

  fetchNavigation: async (userId, { force = false } = {}) => {
    if (!userId) {
      set({ navigation: [], loading: false, error: null });
      return;
    }

    const { fetchedForUserId, loading } = get();
    if (!force) {
      const cached = peekCache(NAV_CACHE_KEY, NAV_TTL_MS);
      if (cached && fetchedForUserId === userId) {
        set({ navigation: cached, loading: false, error: null });
        return cached;
      }
    }

    if (!loading || force) {
      set({ loading: true, error: null });
    }

    try {
      const platform = detectPlatform();
      const response = await API.get(`/navigation/user/navigation?platform=${platform}`);
      const data = response.data.success ? response.data.data : [];
      setCache(NAV_CACHE_KEY, data);
      set({ navigation: data, loading: false, error: null, fetchedForUserId: userId });
      return data;
    } catch (err) {
      console.error('Error fetching navigation:', err);
      set({
        loading: false,
        error: err.response?.data?.message || 'Failed to fetch navigation',
      });
      return get().navigation;
    }
  },

  resetNavigation: () => {
    invalidateCache('app:navigation');
    set({ navigation: [], loading: false, error: null, fetchedForUserId: null });
  },
}));
