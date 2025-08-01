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
        roles: ["JR001"],
    },
    {
        label: "Assets",
        path: "/assets",
        icon: Layers,
        roles: ["JR001"],
    },
    {
        label: "Manage Assign Assets",
        icon: FileCog,
        roles: ["JR001"],
        children: [
            {
                label: "Dept Asset Assignment",
                path: "/assign-department-assets",
                icon: FileCog,
                roles: ["JR001"],
            },
            {
                label: "Employee Asset Assignment",
                path: "/assign-employee-assets",
                icon: FileCog,
                roles: ["JR001"],
            },
        ]
    },

    {
        label: "Maintenance",
        path: "/maintenance",
        icon: Wrench,
        roles: ["JR001"],
    },
    {
        label: "Inspection",
        path: "/inspection",
        icon: ClipboardCheck,
        roles: ["JR001"],
    },
    {
        label: "Maintenance Approval",
        path: "/maintenance-approval",
        icon: FileText,
        roles: ["JR001"],
    },
    {
        label: "Maintenance Supervisor",
        path: "/supervisor-approval",
        icon: FileText,
        roles: ["JR001"],
    },
    {
        label: "Reports",
        path: "/reports",
        icon: FileText,
        roles: ["JR001"],
    },
    {
        label: "Admin Settings",
        path: "/admin-settings",
        icon: Settings,
        roles: ["JR001"],
    },
    {
        label: "Master Data",
        icon: Database,
        roles: ["JR001"],
        children: [
            {
                label: "Organizations",
                path: "/master-data/organizations",
                icon: Building2,
                roles: ["JR001"],
            },
            {
                label: "Asset Type",
                path: "/master-data/asset-types",
                icon: Building2,
                roles: ["JR001"],
            },
            {
                label: "Manage Departments",
                path: "/master-data/departments",
                icon: Tags,
                roles: ["JR001"],
            },
            {
                label: "Manage Departments Admin",
                path: "/master-data/departments-admin",
                icon: Tags,
                roles: ["JR001"],
            },
            {
                label: "Manage Departments Assets Type",
                path: "/master-data/departments-asset",
                icon: Tags,
                roles: ["JR001"],
            },
            {
                label: "Branches",
                path: "/master-data/branches",
                icon: GitBranchIcon,
                roles: ["JR001"],
            },
            {
                label: "Vendors",
                path: "/master-data/vendors",
                icon: Truck,
                roles: ["JR001"],
            },
            {
                label: "Producsts/Services",
                path: "/master-data/prod-serv",
                icon: Truck,
                roles: ["JR001"],
            },
            {
                label: "Roles",
                path: "/master-data/roles",
                icon: ShieldCheck,
                roles: ["JR001"],
            },
            {
                label: "Users",
                path: "/master-data/users",
                icon: Users,
                roles: ["JR001"],
            },
            {
                label: "Asset Maintenance Schedule",
                path: "/master-data/maintenance-schedule",
                icon: CalendarClock,
                roles: ["JR001"],
            },
            {
                label: "Audit Logs",
                path: "/master-data/audit-logs",
                icon: ClipboardList,
                roles: ["JR001"],
            },
        ],
    },
];
