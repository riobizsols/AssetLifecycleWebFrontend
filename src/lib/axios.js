import axios from "axios";
import { useAuthStore } from "../store/useAuthStore";
import { API_BASE_URL } from "../config/environment";

const API = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true, // optional if you're using cookies
});

console.log('🔍 [Axios] Base URL configured as:', API_BASE_URL);

const AUTH_OPTIONAL_PATHS = new Set([
    '/',
    '/login',
    '/tenant-setup',
    '/setup',
    '/forgot-password',
    '/reset-password',
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
        url.includes('/tenant-setup/')
    );
};

API.interceptors.request.use((config) => {
    const token = useAuthStore.getState().token;
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    console.log('🔍 [Axios] Request URL:', config.baseURL + config.url);
    return config;
});

// Response interceptor to handle unauthorized responses
API.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        if (!originalRequest || error.response?.status !== 401) {
            return Promise.reject(error);
        }

        // Never disrupt public onboarding/auth pages (tenant setup, login, etc.)
        if (isPublicAppPath() || shouldSkipAuthRedirect(originalRequest)) {
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
            window.location.href = '/';
        }

        return Promise.reject(error);
    }
);

export default API;
