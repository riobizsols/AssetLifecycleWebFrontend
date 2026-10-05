import { create } from 'zustand';
import API from '../lib/axios';
import { buildCacheKey, invalidateCache, peekCache, setCache } from '../utils/apiCache';
import { ensureDefaultDashboardNav, ensureUsersInMasterData, hideSidebarNavItems, sortAdminSettingsNavOrder, sortInspectionNavOrder, sortMasterDataNavOrder, sortScrapNavOrder } from '../utils/navigationDefaults';

const NAV_CACHE_PREFIX = 'app:navigation:v18';
const NAV_TTL_MS = 10 * 60 * 1000;
const NAV_FAILURE_COOLDOWN_MS = 20000;
const navRetryAfter = new Map();

const navCacheKey = (userId) => buildCacheKey([NAV_CACHE_PREFIX, userId]);

const detectPlatform = () => {
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent,
  );
  return isMobile ? 'M' : 'D';
};

const normalizeNavigation = (navigation) =>
  hideSidebarNavItems(
    sortInspectionNavOrder(
      sortAdminSettingsNavOrder(
        sortScrapNavOrder(
          sortMasterDataNavOrder(
            ensureUsersInMasterData(ensureDefaultDashboardNav(navigation)),
          ),
        ),
      ),
    ),
  );

export const useNavigationStore = create((set, get) => ({
  navigation: [],
  loading: false,
  error: null,
  fetchedForUserId: null,

  fetchNavigation: async (userId, { force = false, background = false } = {}) => {
    if (!userId) {
      set({ navigation: [], loading: false, error: null, fetchedForUserId: null });
      return;
    }

    const cacheKey = navCacheKey(userId);
    const hasLoadedNav =
      get().fetchedForUserId === userId && Array.isArray(get().navigation);
    const isBackgroundRefresh = background && hasLoadedNav;

    if (!force) {
      const cached = peekCache(cacheKey, NAV_TTL_MS);
      if (cached) {
        const navigation = normalizeNavigation(cached);
        set({ navigation, loading: false, error: null, fetchedForUserId: userId });
        return navigation;
      }
      const retryAt = navRetryAfter.get(userId);
      if (retryAt && Date.now() < retryAt) {
        set({ loading: false, fetchedForUserId: userId });
        return get().navigation;
      }
    }

    const alreadyReady =
      get().fetchedForUserId === userId && Array.isArray(get().navigation);
    if (!isBackgroundRefresh) {
      set({
        loading: !alreadyReady,
        error: null,
        navigation: alreadyReady ? get().navigation : [],
        fetchedForUserId: alreadyReady ? userId : null,
      });
    }

    try {
      const platform = detectPlatform();
      const response = await API.get(`/navigation/user/navigation?platform=${platform}`);
      const data = normalizeNavigation(
        response.data.success ? response.data.data : [],
      );
      setCache(cacheKey, data);
      navRetryAfter.delete(userId);
      set({ navigation: data, loading: false, error: null, fetchedForUserId: userId });
      return data;
    } catch (err) {
      console.error('Error fetching navigation:', err);
      navRetryAfter.set(userId, Date.now() + NAV_FAILURE_COOLDOWN_MS);
      // Mark fetched so ProtectedRoute can leave the boot loader (access checks
      // then run against whatever nav we have, instead of spinning forever).
      set({
        loading: false,
        error: err.response?.data?.message || 'Failed to fetch navigation',
        fetchedForUserId: userId,
      });
      return get().navigation;
    }
  },

  resetNavigation: () => {
    invalidateCache(NAV_CACHE_PREFIX);
    navRetryAfter.clear();
    set({ navigation: [], loading: false, error: null, fetchedForUserId: null });
  },
}));
