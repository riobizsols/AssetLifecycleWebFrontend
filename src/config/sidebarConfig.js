import {
    LayoutDashboard,
    Layers,
    FileCog,
    Wrench,
    ClipboardCheck,
    FileText,
    Settings,
    Database,
    Building2,
    Tags,
    Truck,
    ShieldCheck,
    Users,
    CalendarClock,
    ClipboardList,
    GitBranchIcon
} from "lucide-react";

export const sidebarItems = [
    {
        label: "Home",
        path: "/dashboard",
        icon: LayoutDashboard,
        roles: ["super_admin", "admin", "employee"],
    },
    {
        label: "Assets",
        path: "/assets",
        icon: Layers,
        roles: ["super_admin", "admin"],
    },
    {
        label: "Manage Assign Assets",
        icon: FileCog,
        roles: ["super_admin", "employee"],
        children: [
            {
                label: "Dept Asset Assignment",
                path: "/assign-department-assets",
                icon: FileCog,
                roles: ["super_admin"],
            },
            {
                label: "Employee Asset Assignment",
                path: "/assign-employee-assets",
                icon: FileCog,
                roles: ["super_admin", "employee"],
            },
        ]
    },

    {
        label: "Maintenance",
        path: "/maintenance",
        icon: Wrench,
        roles: ["super_admin"],
    },
    {
        label: "Inspection",
        path: "/inspection",
        icon: ClipboardCheck,
        roles: ["super_admin"],
    },
    {
        label: "Maintenance Approval",
        path: "/maintenance-approval",
        icon: FileText,
        roles: ["super_admin"],
    },
    {
        label: "Maintenance Supervisor",
        path: "/supervisor-approval",
        icon: FileText,
        roles: ["super_admin"],
    },
    {
        label: "Reports",
        path: "/reports",
        icon: FileText,
        roles: ["super_admin"],
    },
    {
        label: "Admin Settings",
        path: "/admin-settings",
        icon: Settings,
        roles: ["super_admin"],
    },
    {
        label: "Master Data",
        icon: Database,
        roles: ["super_admin"],
        children: [
            {
                label: "Organizations",
                path: "/master-data/organizations",
                icon: Building2,
                roles: ["super_admin"],
            },
            {
                label: "Asset Type",
                path: "/master-data/asset-types",
                icon: Building2,
                roles: ["super_admin"],
            },
            {
                label: "Manage Departments",
                path: "/master-data/departments",
                icon: Tags,
                roles: ["super_admin"],
            },
            {
                label: "Manage Departments Admin",
                path: "/master-data/departments-admin",
                icon: Tags,
                roles: ["super_admin"],
            },
            {
                label: "Manage Departments Assets Type",
                path: "/master-data/departments-asset",
                icon: Tags,
                roles: ["super_admin"],
            },
            {
                label: "Branches",
                path: "/master-data/branches",
                icon: GitBranchIcon,
                roles: ["super_admin"],
            },
            {
                label: "Vendors",
                path: "/master-data/vendors",
                icon: Truck,
                roles: ["super_admin"],
            },
            {
                label: "Producsts/Services",
                path: "/master-data/prod-serv",
                icon: Truck,
                roles: ["super_admin"],
            },
            {
                label: "Roles",
                path: "/master-data/roles",
                icon: ShieldCheck,
                roles: ["super_admin"],
            },
            {
                label: "Users",
                path: "/master-data/users",
                icon: Users,
                roles: ["super_admin"],
            },
            {
                label: "Asset Maintenance Schedule",
                path: "/master-data/maintenance-schedule",
                icon: CalendarClock,
                roles: ["super_admin"],
            },
            {
                label: "Audit Logs",
                path: "/master-data/audit-logs",
                icon: ClipboardList,
                roles: ["super_admin"],
            },
        ],
    },
];
