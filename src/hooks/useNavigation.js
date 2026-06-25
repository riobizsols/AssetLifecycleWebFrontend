import { useEffect } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { useNavigationStore } from '../store/useNavigationStore';

export const useNavigation = () => {
    const user = useAuthStore((state) => state.user);
    const navigation = useNavigationStore((state) => state.navigation);
    const loading = useNavigationStore((state) => state.loading);
    const error = useNavigationStore((state) => state.error);
    const fetchNavigation = useNavigationStore((state) => state.fetchNavigation);

    useEffect(() => {
        if (user?.user_id) {
            fetchNavigation(user.user_id);
        }
    }, [user?.user_id, fetchNavigation]);

    const hasAccess = (appId) => {
        if (!navigation || navigation.length === 0) return false;
        
        const searchNavigation = (items) => {
            for (const item of items) {
                if (item.app_id === appId) {
                    return item.access_level === 'A' || item.access_level === 'D';
                }
                if (item.children && item.children.length > 0) {
                    const found = searchNavigation(item.children);
                    if (found) return found;
                }
            }
            return false;
        };
        
        return searchNavigation(navigation);
    };

    const hasEditAccess = (appId) => {
        if (!navigation || navigation.length === 0) return false;
        
        const searchNavigation = (items) => {
            for (const item of items) {
                if (item.app_id === appId) {
                    return item.access_level === 'A';
                }
                if (item.children && item.children.length > 0) {
                    const found = searchNavigation(item.children);
                    if (found) return found;
                }
            }
            return false;
        };
        
        return searchNavigation(navigation);
    };

    const getAccessLevel = (appId) => {
        if (!navigation || navigation.length === 0) return null;
        
        const searchNavigation = (items) => {
            for (const item of items) {
                if (item.app_id === appId) {
                    return item.access_level;
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

    const getNavigationItem = (appId) => {
        if (!navigation || navigation.length === 0) return null;
        
        const searchNavigation = (items) => {
            for (const item of items) {
                if (item.app_id === appId) {
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
