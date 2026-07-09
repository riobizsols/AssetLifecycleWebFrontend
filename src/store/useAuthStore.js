import { create } from "zustand";
import { persist } from "zustand/middleware";
import { clearCache } from "../utils/apiCache";
import { useNavigationStore } from "./useNavigationStore";
import { useAssetsStore } from "./useAssetsStore";

export const useAuthStore = create(
    persist(
        (set) => ({
            isAuthenticated: false,
            user: null,
            token: null,
            requiresPasswordChange: false,

            login: (data) => {
                clearCache();
                useNavigationStore.getState().resetNavigation();
                set({
                    isAuthenticated: true,
                    user: data,
                    token: data.token,
                    job_role_id: data.job_role_id, // Keep for backward compatibility
                    roles: data.roles || [], // New roles array from tblUserJobRoles
                    branch_id: data.branch_id || null,
                    branch_name: data.branch_name || null,
                    branch_code: data.branch_code || null,
                    dept_id: data.dept_id || null,
                    dept_name: data.dept_name || null,
                    requiresPasswordChange: data.requiresPasswordChange || false, // Store password change requirement
                });
            },

            logout: () => {
                clearCache();
                useNavigationStore.getState().resetNavigation();
                useAssetsStore.setState({
                    currentPage: 1,
                    filterValues: { columnFilters: [], fromDate: '', toDate: '' },
                    isFullListMode: false,
                });
                set({
                    isAuthenticated: false,
                    user: null,
                    token: null,
                    job_role_id: null,
                    roles: [],
                    branch_id: null,
                    branch_name: null,
                    branch_code: null,
                    dept_id: null,
                    dept_name: null,
                    requiresPasswordChange: false,
                });
            },

            clearPasswordChangeRequirement: () =>
                set({
                    requiresPasswordChange: false,
                }),
        }),
        {
            name: "auth-storage", // key in localStorage
        }
    )
);
