import { useState, useEffect } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import API from '../lib/axios';

export const useNavigation = () => {
    const [navigation, setNavigation] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const { user } = useAuthStore();

    // Detect platform (Desktop or Mobile)
    const detectPlatform = () => {
        // Check if it's a mobile device
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        return isMobile ? 'M' : 'D'; // 'D' for Desktop, 'M' for Mobile
    };

    // Fetch user's navigation data
    const fetchNavigation = async () => {
        try {
            setLoading(true);
            setError(null);
            
            const platform = detectPlatform();
            const response = await API.get(`/navigation/user/navigation?platform=${platform}`);
            
            if (response.data.success) {
                setNavigation(response.data.data);
            } else {
                setError('Failed to fetch navigation data');
            }
        } catch (err) {
            console.error('Error fetching navigation:', err);
            setError(err.response?.data?.message || 'Failed to fetch navigation');
        } finally {
            setLoading(false);
        }
    };

    // Check if user has access to a specific app
    const hasAccess = (appId) => {
        if (!navigation || navigation.length === 0) return false;
        
        // Recursive function to search through navigation structure
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

    // Check if user has edit access to a specific app
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

    // Get access level for a specific app
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

    // Get navigation item by app ID
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

    // Check if user can view (any access level)
    const canView = (appId) => hasAccess(appId);

    // Check if user can edit (access level A)
    const canEdit = (appId) => hasEditAccess(appId);

    // Check if user can create (access level A)
    const canCreate = (appId) => hasEditAccess(appId);

    // Check if user can delete (access level A)
    const canDelete = (appId) => hasEditAccess(appId);

    // Get access level label
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

    // Get access level color
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

    // Refresh navigation data
    const refreshNavigation = () => {
        fetchNavigation();
    };

    useEffect(() => {
        if (user) {
            fetchNavigation();
        }
    }, [user]);

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
        refreshNavigation
    };
}; 