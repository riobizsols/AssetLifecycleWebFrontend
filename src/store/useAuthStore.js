import { create } from "zustand";
import { persist } from "zustand/middleware";

export const useAuthStore = create(
    persist(
        (set) => ({
            isAuthenticated: false,
            user: null,
            token: null,

            login: (data) =>
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
                }),

            logout: () =>
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
                }),
        }),
        {
            name: "auth-storage", // key in localStorage
        }
    )
);
