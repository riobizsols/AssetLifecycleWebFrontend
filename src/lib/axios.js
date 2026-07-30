import axios from "axios";
import { useAuthStore } from "../store/useAuthStore";
import { useAcmContextStore } from "../store/useAcmContextStore";
import { API_BASE_URL } from "../config/environment";
import { invalidateOnMutation } from "../utils/apiCache";

const API = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true,
});

console.log('🔍 [Axios] Base URL configured as:', API_BASE_URL);

API.interceptors.request.use((config) => {
    const token = useAuthStore.getState().token;
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }

    const acmCtx = useAcmContextStore.getState();
    if (acmCtx.appliedOrgId) {
        config.headers['X-ACM-Org-Id'] = acmCtx.appliedOrgId;
    } else {
        delete config.headers['X-ACM-Org-Id'];
    }
    if (acmCtx.appliedBranchId) {
        config.headers['X-ACM-Branch-Id'] = acmCtx.appliedBranchId;
    } else {
        delete config.headers['X-ACM-Branch-Id'];
    }
    if (acmCtx.appliedDeptId) {
        config.headers['X-ACM-Dept-Id'] = acmCtx.appliedDeptId;
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

        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

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

            if (window.location.pathname !== '/') {
                window.location.href = '/';
            }
        }

        return Promise.reject(error);
    }
);

export default API;
