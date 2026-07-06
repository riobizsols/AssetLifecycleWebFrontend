import { useEffect } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { useNavigationStore } from '../store/useNavigationStore';
import {
    appIdsMatch,
    hasEditAccess as hasEditAccessLevel,
    hasViewAccess,
    resolveInheritedAccess,
} from '../utils/accessLevel';
import { userHasSystemAdminRole } from '../utils/systemAdmin';

export const useNavigation = () => {
    const user = useAuthStore((state) => state.user);
    const roles = useAuthStore((state) => state.roles) || [];
    const navigation = useNavigationStore((state) => state.navigation);
    const loading = useNavigationStore((state) => state.loading);
    const error = useNavigationStore((state) => state.error);
    const fetchedForUserId = useNavigationStore((state) => state.fetchedForUserId);
    const fetchNavigation = useNavigationStore((state) => state.fetchNavigation);

    const navReady =
        Boolean(user?.user_id) &&
        fetchedForUserId === user.user_id &&
        !loading;

    useEffect(() => {
        if (user?.user_id) {
            fetchNavigation(user.user_id);
        }
    }, [user?.user_id, fetchNavigation]);

    const isAdminSettingsNavItem = (item) => {
        if (appIdsMatch(item.app_id, 'ADMINSETTINGS')) return true;
        return (
            item.is_group &&
            String(item.label || '').trim().toLowerCase() === 'admin settings'
        );
    };

    const findAccessLevelByAppId = (items, id) => {
        for (const item of items) {
            if (appIdsMatch(item.app_id, id)) {
                return item.access_level;
            }
            if (appIdsMatch(id, 'ADMINSETTINGS') && isAdminSettingsNavItem(item)) {
                return item.access_level;
            }
            if (item.children?.length) {
                const found = findAccessLevelByAppId(item.children, id);
                if (found) return found;
            }
        }
        return null;
    };

    const resolveAccessLevelFromNav = (targetAppId) => {
        if (!navigation || navigation.length === 0) return null;

        const inherited = resolveInheritedAccess(
            (appId) => findAccessLevelByAppId(navigation, appId),
            targetAppId
        );
        if (hasViewAccess(inherited)) return inherited;

        return findAccessLevelByAppId(navigation, targetAppId);
    };

    const isSystemAdmin = userHasSystemAdminRole(user, roles);

    const hasAccess = (appId) => {
        if (isSystemAdmin) return true;
        if (appIdsMatch(appId, 'DASHBOARD')) return true;
        return hasViewAccess(resolveAccessLevelFromNav(appId));
    };

    const hasEditAccess = (appId) => {
        if (isSystemAdmin) return true;
        return hasEditAccessLevel(resolveAccessLevelFromNav(appId));
    };

    const getAccessLevel = (appId) => {
        if (isSystemAdmin) return 'A';
        return resolveAccessLevelFromNav(appId);
    };

    const getNavigationItem = (appId) => {
        if (!navigation || navigation.length === 0) return null;

        const searchNavigation = (items) => {
            for (const item of items) {
                if (appIdsMatch(item.app_id, appId)) {
                    return item;
                }
                if (item.children && item.children.length > 0) {
                    const found = searchNavigation(item.children);
                    if (found) return found;
                }
            }
            return null;
        };

        return searchNavigation(navigation);
    };

    const canView = (appId) => hasAccess(appId);
    const canEdit = (appId) => hasEditAccess(appId);
    const canCreate = (appId) => hasEditAccess(appId);
    const canDelete = (appId) => hasEditAccess(appId);

    const getAccessLevelLabel = (accessLevel) => {
        switch (accessLevel) {
            case 'A':
                return 'Full Access';
            case 'D':
            case 'V':
                return 'Read Only';
            default:
                return 'No Access';
        }
    };

    const getAccessLevelColor = (accessLevel) => {
        switch (accessLevel) {
            case 'A':
                return 'text-green-600';
            case 'D':
            case 'V':
                return 'text-yellow-600';
            default:
                return 'text-red-600';
        }
    };

    const refreshNavigation = () => {
        if (user?.user_id) {
            fetchNavigation(user.user_id, { force: true });
        }
    };

    return {
        navigation,
        loading,
        error,
        navReady,
        hasAccess,
        hasEditAccess,
        canView,
        canEdit,
        canCreate,
        canDelete,
        getAccessLevel,
        getNavigationItem,
        getAccessLevelLabel,
        getAccessLevelColor,
        refreshNavigation,
    };
};
