import axios from "axios";
import { useAuthStore } from "../store/useAuthStore";
import { useAcmContextStore, getAppliedAcmHeaders } from "../store/useAcmContextStore";
import { API_BASE_URL } from "../config/environment";
import { invalidateOnMutation } from "../utils/apiCache";

const API = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true,
});

console.log('🔍 [Axios] Base URL configured as:', API_BASE_URL);

const AUTH_OPTIONAL_PATHS = new Set([
    '/',
    '/login',
    '/tenant-setup',
    '/setup',
    '/forgot-password',
    '/reset-password',
    '/delete-account',
]);

const normalizePath = (pathname) => {
    const path = String(pathname || '/').replace(/\/+$/, '') || '/';
    return path;
};

const isPublicAppPath = () => {
    if (typeof window === 'undefined') return false;
    return AUTH_OPTIONAL_PATHS.has(normalizePath(window.location.pathname));
};

const shouldSkipAuthRedirect = (config) => {
    const url = String(config?.url || '');
    return (
        config?.skipAuthRedirect === true ||
        url.includes('/text-messages/') ||
        url.includes('/tenant-setup/') ||
        url.includes('/account-deletion/')
    );
};

API.interceptors.request.use((config) => {
    const token = useAuthStore.getState().token;
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }

    const acmCtx = useAcmContextStore.getState();
    const acmHeaders = getAppliedAcmHeaders(acmCtx);

    if (acmHeaders['X-ACM-Org-Id']) {
        config.headers['X-ACM-Org-Id'] = acmHeaders['X-ACM-Org-Id'];
    } else {
        delete config.headers['X-ACM-Org-Id'];
    }
    if (acmHeaders['X-ACM-Branch-Id']) {
        config.headers['X-ACM-Branch-Id'] = acmHeaders['X-ACM-Branch-Id'];
    } else {
        delete config.headers['X-ACM-Branch-Id'];
    }
    if (acmHeaders['X-ACM-Dept-Id']) {
        config.headers['X-ACM-Dept-Id'] = acmHeaders['X-ACM-Dept-Id'];
    } else {
        delete config.headers['X-ACM-Dept-Id'];
    }

    console.log('🔍 [Axios] Request URL:', config.baseURL + config.url);
    return config;
});

API.interceptors.response.use(
    (response) => {
        invalidateOnMutation({
            method: response?.config?.method,
            url: response?.config?.url,
        });
        return response;
    },
    async (error) => {
        const originalRequest = error.config;
        const requestUrl = String(originalRequest?.url || '');
        const isAuthLoginAttempt =
            requestUrl.includes('/auth/login') ||
            requestUrl.includes('/auth/forgot-password') ||
            requestUrl.includes('/auth/reset-password');

        if (!originalRequest || error.response?.status !== 401) {
            return Promise.reject(error);
        }

        if (isPublicAppPath() || shouldSkipAuthRedirect(originalRequest) || isAuthLoginAttempt) {
            return Promise.reject(error);
        }

        if (!originalRequest._retry) {
            originalRequest._retry = true;

            // Try to refresh token if available
            const authStore = useAuthStore.getState();
            if (authStore.token && authStore.user) {
                try {
                    console.log('🔄 [Axios] Attempting token refresh...');

                    const refreshResponse = await axios.post(`${API_BASE_URL}/auth/refresh`, {
                        token: authStore.token
                    });

                    if (refreshResponse.data.success) {
                        authStore.login({
                            ...authStore.user,
                            token: refreshResponse.data.token
                        });

                        originalRequest.headers.Authorization = `Bearer ${refreshResponse.data.token}`;
                        return API(originalRequest);
                    }
                } catch (refreshError) {
                    console.log('🔄 [Axios] Token refresh failed:', refreshError.message);
                }
            }

            console.log('🔒 [Axios] Authentication failed - logging out');
            authStore.logout();
            try {
                useAcmContextStore.getState().reset();
            } catch (_) {
                /* ignore */
            }
            window.location.href = '/';
        }

        return Promise.reject(error);
    }
);

export default API;
