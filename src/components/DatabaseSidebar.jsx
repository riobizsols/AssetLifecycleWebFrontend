import { useState, useContext, useMemo, useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useNavigation } from "../hooks/useNavigation";
import {
  buildFlatAccessMap,
  hasViewAccess,
  resolveInheritedAccess,
} from "../utils/accessLevel";
import { useLanguage } from "../contexts/LanguageContext";
import { AdminSettingsContext } from "../contexts/AdminSettingsContext";
import { useScrapApprovalStore } from "../store/useScrapApprovalStore";
import { useMaintenanceSupervisorStore } from "../store/useMaintenanceSupervisorStore";
import { prefetchReportByAppId } from "../utils/reportCache";
import { useWorkOrderStore } from "../store/useWorkOrderStore";
import { useMaintenanceApprovalStore } from "../store/useMaintenanceApprovalStore";
import { useSerialNumberPrintStore } from "../store/useSerialNumberPrintStore";
import { useAuditLogConfigStore } from "../store/useAuditLogConfigStore";
import { useInspectionApprovalStore } from "../store/useInspectionApprovalStore";
import { useInspectionViewStore } from "../store/useInspectionViewStore";
import { useEmployeeReportBreakdownStore } from "../store/useEmployeeReportBreakdownStore";
import { useReportBreakdownStore } from "../store/useReportBreakdownStore";
import { useScrapSalesStore } from "../store/useScrapSalesStore";
import { useAssetTypeStore } from "../store/useAssetTypeStore";
import { useDepartmentsStore } from "../store/useDepartmentsStore";
import { useBranchesStore } from "../store/useBranchesStore";
import { useVendorsStore } from "../store/useVendorsStore";
import { useUserRolesStore } from "../store/useUserRolesStore";
import { useCertificationsStore } from "../store/useCertificationsStore";
import { useTechCertApprovalsStore } from "../store/useTechCertApprovalsStore";
import { useTechnicianCertificatesStore } from "../store/useTechnicianCertificatesStore";
import { useGroupAssetStore } from "../store/useGroupAssetStore";
import { useInspectionFrequencyStore } from "../store/useInspectionFrequencyStore";
import { useInspectionChecklistsStore } from "../store/useInspectionChecklistsStore";
import { useJobMonitorStore } from "../store/useJobMonitorStore";
import { useMaintenanceConfigStore } from "../store/useMaintenanceConfigStore";
import { usePropertiesStore } from "../store/usePropertiesStore";
import { useBreakdownReasonCodesStore } from "../store/useBreakdownReasonCodesStore";
import { useTextMessagesStore } from "../store/useTextMessagesStore";
import { useAuthStore } from "../store/useAuthStore";
import {
  Menu,
  Eye,
  Edit,
  Shield,
  Lock,
  ChevronDown,
  ChevronRight,
  LayoutDashboard,
  Package,
  Users,
  Settings,
  FileText,
  Building,
  Wrench,
  CheckSquare,
  BarChart3,
  UserCheck,
  ClipboardList,
  Truck,
  Briefcase,
  Home,
  Database,
  Calendar,
  History,
  DollarSign,
  GitBranch,
  AlertTriangle,
  Gauge,
  Printer,
  Clock,
  Activity,
} from "lucide-react";

const normalizeNavAppId = (id) =>
  id == null ? "" : String(id).trim().replace(/\s+/g, " ").toUpperCase();

const compactNavAppId = (id) =>
  id == null ? "" : String(id).trim().replace(/\s+/g, "").toUpperCase();

const resolveNavAppId = (appId) => compactNavAppId(appId) || normalizeNavAppId(appId);

const EMPLOYEE_TECH_CERT_APP_IDS = [
  "TECHCERTUPLOAD",
  "TECHNICIANCERTIFICATES",
  "EMPLOYEE TECH CERTIFICATION",
];

const SIDEBAR_MENU_GROUPS = [
  {
    id: "synthetic-approvals",
    app_id: "APPROVALS",
    label: "Approvals",
    children: [
      { app_id: "MAINTENANCEAPPROVAL", label: "Maintenance Approval" },
      { app_id: "INSPECTIONAPPROVAL", label: "Inspection Approval" },
      { app_id: "SCRAPMAINTENANCEAPPROVAL", label: "Scrap Approval" },
      { app_id: "VENDORRENEWALAPPROVAL", label: "Vendor Renewal Approval" },
      { app_id: "HR/MANAGERAPPROVAL", label: "HR/Manager Approval" },
    ],
  },
  {
    id: "synthetic-certificates",
    app_id: "CERTIFICATESGROUP",
    label: "Certificates",
    children: [
      { app_id: "CERTIFICATIONS", label: "Certificates" },
      {
        app_id: "EMPLOYEE TECH CERTIFICATION",
        label: "Employee Tech Certificate",
        aliases: EMPLOYEE_TECH_CERT_APP_IDS.filter(
          (id) => id !== "EMPLOYEE TECH CERTIFICATION"
        ),
      },
    ],
  },
  {
    id: "synthetic-report-breakdown",
    app_id: "REPORTBREAKDOWNGROUP",
    label: "Report Breakdown",
    children: [
      { app_id: "REPORTBREAKDOWN", label: "Report Breakdown" },
      {
        app_id: "EMPLOYEE REPORT BREAKDOWN",
        label: "Employee Report Breakdown",
        aliases: ["EMPLOYEEREPORTBREAKDOWN"],
        inheritAccessFrom: "REPORTBREAKDOWN",
      },
    ],
  },
];

function flattenNavItems(items, result = []) {
  if (!items?.length) return result;
  for (const item of items) {
    result.push(item);
    if (item.children?.length) {
      flattenNavItems(item.children, result);
    }
  }
  return result;
}

function removeAppIdsFromTree(items, appIdSet) {
  if (!items?.length) return [];
  return items
    .filter((item) => !appIdSet.has(normalizeNavAppId(item.app_id)))
    .map((item) => ({
      ...item,
      children: item.children?.length
        ? removeAppIdsFromTree(item.children, appIdSet)
        : item.children,
    }));
}

function resolveChildAccess(accessMap, childDef) {
  const candidateAppIds = [childDef.app_id, ...(childDef.aliases || [])];

  for (const appId of candidateAppIds) {
    const level = resolveInheritedAccess(
      (id) => accessMap.get(id),
      appId
    );
    if (hasViewAccess(level)) return level;
  }

  if (childDef.inheritAccessFrom) {
    const inherited = resolveInheritedAccess(
      (id) => accessMap.get(id),
      childDef.inheritAccessFrom
    );
    if (hasViewAccess(inherited)) return inherited;
  }

  return null;
}

function findNavMatch(flatItems, appIds, usedIds) {
  for (const appId of appIds) {
    const match = flatItems.find(
      (item) =>
        normalizeNavAppId(item.app_id) === normalizeNavAppId(appId) &&
        !usedIds.has(item.id)
    );
    if (match) return match;
  }
  return null;
}

function collectGroupChildren(flatItems, groupDef, accessMap, options = {}) {
  const { forceAllChildren = false, fallbackAccessLevel = null } = options;
  const children = [];
  const usedIds = new Set();
  const employeeTechCertIds = new Set(
    EMPLOYEE_TECH_CERT_APP_IDS.map((id) => normalizeNavAppId(id))
  );

  for (const childDef of groupDef.children) {
    const candidateAppIds = [childDef.app_id, ...(childDef.aliases || [])];

    if (employeeTechCertIds.has(normalizeNavAppId(childDef.app_id))) {
      if (
        children.some((child) =>
          employeeTechCertIds.has(normalizeNavAppId(child.app_id))
        )
      ) {
        continue;
      }
    }

    const match = findNavMatch(flatItems, candidateAppIds, usedIds);
    const accessLevel =
      resolveChildAccess(accessMap, childDef) ||
      match?.access_level ||
      (forceAllChildren ? fallbackAccessLevel : null);

    if (!hasViewAccess(accessLevel)) continue;

    if (match) usedIds.add(match.id);

    children.push({
      ...(match || {}),
      id:
        match?.id ||
        `synthetic-child-${normalizeNavAppId(childDef.app_id)}`,
      app_id: childDef.app_id,
      label: childDef.label || match?.label,
      access_level: accessLevel,
      is_group: false,
      children: undefined,
      seq: match?.seq,
    });
  }

  return children;
}

function getGroupedAppIds() {
  const groupedAppIds = new Set();
  SIDEBAR_MENU_GROUPS.forEach((group) => {
    group.children.forEach((child) => {
      groupedAppIds.add(normalizeNavAppId(child.app_id));
      (child.aliases || []).forEach((alias) =>
        groupedAppIds.add(normalizeNavAppId(alias))
      );
    });
  });
  return groupedAppIds;
}

/** Groups Approvals, Certificates, and Report Breakdown into dropdown menus. */
function reorganizeSidebarGroups(items) {
  if (!items?.length) return items;

  const flatItems = flattenNavItems(items);
  const accessMap = buildFlatAccessMap(flatItems);
  const groupedAppIds = getGroupedAppIds();

  const syntheticGroups = SIDEBAR_MENU_GROUPS.map((groupDef) => {
    const isReportBreakdownGroup = groupDef.id === "synthetic-report-breakdown";
    const reportBreakdownAccess =
      resolveInheritedAccess((id) => accessMap.get(id), "REPORTBREAKDOWN") ||
      resolveInheritedAccess((id) => accessMap.get(id), "REOPENEDBREAKDOWNS");

    const children = collectGroupChildren(flatItems, groupDef, accessMap, {
      forceAllChildren: isReportBreakdownGroup && hasViewAccess(reportBreakdownAccess),
      fallbackAccessLevel: reportBreakdownAccess,
    });

    if (!children.length) return null;

    const minSeq = Math.min(...children.map((child) => child.seq ?? 9999));

    return {
      id: groupDef.id,
      app_id: groupDef.app_id,
      label: groupDef.label,
      is_group: true,
      seq: minSeq,
      access_level: children.some((child) => child.access_level === "A")
        ? "A"
        : children[0].access_level,
      children,
    };
  }).filter(Boolean);

  if (!syntheticGroups.length) return items;

  const remainingItems = removeAppIdsFromTree(items, groupedAppIds);
  return [...remainingItems, ...syntheticGroups].sort(
    (a, b) => (a.seq ?? 9999) - (b.seq ?? 9999)
  );
}

/** Injects synthetic "One Time Cron" nav row under Master Data (admin settings mode). */
function injectOneTimeCronUnderMasterData(items) {
  if (!items?.length) return items;
  return items.map((item) => {
    const children = item.children?.length
      ? injectOneTimeCronUnderMasterData(item.children)
      : item.children;
    if (item.app_id === "MASTERDATA" && item.is_group) {
      const ch = children || [];
      if (ch.some((c) => c.app_id === "ONETIMECRON")) {
        return { ...item, children: ch };
      }
      return {
        ...item,
        children: [
          ...ch,
          {
            id: "synthetic-onetime-cron",
            app_id: "ONETIMECRON",
            label: "One Time Cron",
            access_level: "A",
            is_group: false,
          },
        ],
      };
    }
    if (children !== item.children) {
      return { ...item, children };
    }
    return item;
  });
}

const DatabaseSidebar = () => {
  const {
    navigation,
    loading,
    error,
    getAccessLevel,
    getAccessLevelLabel,
    getAccessLevelColor,
  } = useNavigation();
  const location = useLocation();
  const [openDropdown, setOpenDropdown] = useState(null);
  const [collapsed, setCollapsed] = useState(false);
  const { t } = useLanguage();
  // Get admin settings mode from context (may be undefined if not in provider)
  const adminSettingsContext = useContext(AdminSettingsContext);
  const isAdminSettingsMode = adminSettingsContext?.isAdminSettingsMode || false;

  const navigationForRender = useMemo(() => {
    if (isAdminSettingsMode) {
      return injectOneTimeCronUnderMasterData(navigation);
    }
    return reorganizeSidebarGroups(navigation);
  }, [navigation, isAdminSettingsMode]);

  const toggleDropdown = (id) => {
    setOpenDropdown(openDropdown === id ? null : id);
  };

  const toggleSidebar = () => setCollapsed(!collapsed);

  /**
   * Passed to NavLink so admin screens can show a header breadcrumb.
   * parentAdminFrom preserves the chain (e.g. Configuration) when drilling hub → A → B
   * so the breadcrumb link from B → A restores A’s own “from” state.
   */
  const navLinkState = {
    adminFrom: { pathname: location.pathname, search: location.search },
    parentAdminFrom: location.state?.adminFrom,
    grandparentAdminFrom: location.state?.parentAdminFrom,
  };

  // Translate navigation labels
  const translateLabel = (label) => {
    // Create a mapping from English labels to translation keys
    const labelMap = {
      'Dashboard': t('navigation.dashboard'),
      'Assets': t('navigation.assets'),
      'Asset Types': t('navigation.assetTypes'),
      'Organizations': t('navigation.organizations'),
      'Departments': t('navigation.departments'),
      'Departments Admin': t('navigation.departmentsAdmin'),
      'Departments Asset': t('navigation.departmentsAsset'),
      'Departments Asset...': t('navigation.departmentsAsset'),
      'Departments Ass...': t('navigation.departmentsAsset'),
      'Departments Asset type': t('navigation.departmentsAsset'),
      'Departments Asset typ...': t('navigation.departmentsAsset'),
      'Department Asset': t('navigation.departmentsAsset'),
      'Department Asset type': t('navigation.departmentsAsset'),
      'Manage Departments Assets Type': t('navigation.departmentsAsset'),
      'Branches': t('navigation.branches'),
      'Vendors': t('navigation.vendors'),
      'Products/Services': t('navigation.productsServices'),
      'Roles': t('navigation.roles'),
      'Users': t('navigation.users'),
      'User Roles': t('navigation.userRoles'),
      'Column Access Config': t('navigation.columnAccessConfig'),
      'One Time Cron': t('navigation.oneTimeCron'),
      'Job Monitor': 'Job Monitor',
      'Bulk Upload': t('navigation.bulkUpload'),
      'Asset Assignment': t('navigation.assetAssignment'),
      'Cost Center Transfer': t('navigation.costCenterTransfer'),
      'Department Assignment': t('navigation.departmentAssignment'),
      'Employee Assignment': t('navigation.employeeAssignment'),
      'Workorder Management': t('navigation.workorderManagement'),
      'Maintenance Approval': t('navigation.maintenanceApproval'),
      'Maintenance List': t('maintenance.maintenanceList'),
      'Maintenance Schedule': t('navigation.maintenanceSchedule'),
      'Maintenance Sche...': t('navigation.maintenanceSchedule'),
      'Supervisor Approval': t('navigation.supervisorApproval'),
      'Serial Number Print': t('navigation.serialNumberPrint'),
      'Report Breakdown': t('navigation.reportBreakdown'),
      'Reports': t('navigation.reports'),
      'Admin Settings': t('navigation.adminSettings'),
      'Master Data': t('navigation.masterData'),
      'Asset Type - Inspection CheckList mapping': t('navigation.assetTypeChecklistMapping'),
      'Inspection CheckList mapping': t('navigation.assetTypeChecklistMapping'),
      'Inspection Frequency': t('masterDataTitles.inspectionFrequency'),
      'Inspection Checklists': t('masterDataTitles.inspectionChecklists'),
      'Inspection Checklist': t('masterDataTitles.inspectionChecklists'),
      'Inspection Checkli...': t('masterDataTitles.inspectionChecklists'),
      'Scrap Sales': t('navigation.scrapSales'),
      'Scrap Assets': t('navigation.scrapAssets'),
      'Group Asset': t('navigation.groupAsset'),
      'Audit Logs': t('navigation.auditLogs'),
      'Certifications': t('navigation.certifications'),
      'Technician Certificates': t('navigation.employeeTechCertificate'),
      'Employee Tech Certification': t('navigation.employeeTechCertificate'),
      'Technician Certificate Approvals': t('navigation.hrManagerApproval'),
      'HR/Manager Approval': t('navigation.hrManagerApproval'),
      'Scrap Approval': t('navigation.scrapApproval'),
      'Inspection': t('navigation.inspection'),
      'Inspection Approval': t('navigation.inspectionApproval'),
      'Inspection Approvals': t('navigation.inspectionApproval'),
      'Inspection List': t('navigation.inspectionList'),
      'Reopened Breakdowns': t('navigation.reopenedBreakdowns'),
      'Employee Report Breakdown': t('navigation.employeeReportBreakdown'),
      'Vendor Renewal Approval': t('navigation.vendorRenewalApproval'),
      'Approvals': t('navigation.approvalsGroup'),
      'Certificates': t('navigation.certificatesGroup'),
      'Employee Tech Certificate': t('navigation.employeeTechCertificate'),
      // Report sub-items
      'Asset Lifecycle Report': t('navigation.assetLifecycleReport'),
      'Asset Lifecycle Re...': t('navigation.assetLifecycleReport'),
      'Asset Report': t('navigation.assetReport'),
      'Maintenance History': t('navigation.maintenanceHistory'),
      'Maintenance Histo...': t('navigation.maintenanceHistory'),
      'Maintenance History of Asset': t('navigation.maintenanceHistoryOfAsset'),
      'Asset Valuation': t('navigation.assetValuation'),
      'Asset Workflow History': t('navigation.assetWorkflowHistory'),
      'Asset Workflow Hi...': t('navigation.assetWorkflowHistory'),
      'Breakdown History': t('navigation.breakdownHistory'),
      'Usage-Based Asset Report': t('navigation.usageBasedAssetReport'),
      'SLA Reports': t('navigation.slaReport'),
      'Usage-Based Asset...': t('navigation.usageBasedAssetReport'),
    };

    if (labelMap[label]) return labelMap[label];

    const normalized = String(label || '').trim();
    if (/^departments?\s+asset/i.test(normalized)) {
      return t('navigation.departmentsAsset');
    }
    if (/^inspection\s+checklist/i.test(normalized)) {
      return t('masterDataTitles.inspectionChecklists');
    }
    if (/^inspection\s+frequency/i.test(normalized)) {
      return t('masterDataTitles.inspectionFrequency');
    }

    return label;
  };

  // Get icon based on access level
  const getAccessIcon = (accessLevel) => {
    switch (accessLevel) {
      case "A":
        return <Shield size={12} className="text-green-400" />;
      case "D":
      case "V":
        return <Eye size={12} className="text-yellow-400" />;
      default:
        return <Lock size={12} className="text-red-400" />;
    }
  };

  // Get color class based on access level
  const getAccessColorClass = (accessLevel) => {
    switch (accessLevel) {
      case "A":
        return "border-l-2 border-green-400";
      case "D":
      case "V":
        return "border-l-2 border-yellow-400";
      default:
        return "border-l-2 border-red-400";
    }
  };

  // Map app_id to route paths
  const appIdToPath = {
    DASHBOARD: "/dashboard",
    ASSETS: "/assets", //done
    ADDASSET: "/assets/add", //done
    ASSETASSIGNMENT: "/assign-department-assets",
    COSTCENTERTRANSFER: "/cost-center-transfer",
    VENDORS: "/master-data/vendors", //done
    INSPECTIONCHECKLISTS: "/master-data/inspection-checklists",
    INSPECTIONFREQUENCY: "/master-data/inspection-frequency",
    ASSETTYPECHECKLISTMAPPING: "/master-data/asset-type-checklist-mapping",
    DEPTASSIGNMENT: "/assign-department-assets",
    EMPASSIGNMENT: "/assign-employee-assets",
    WORKORDERMANAGEMENT: "/workorder-management", // Separate route for maintenance  //done
    INSPECTION: "/inspection-view", // Legacy inspection ID
    INSPECTIONVIEW: "/inspection-view", // New Inspection Execution ID
    INSPECTIONAPPROVAL: "/inspection-approval", // New Inspection Approval ID
    MAINTENANCEAPPROVAL: "/maintenance-approval",
    VENDORRENEWALAPPROVAL: "/vendor-renewal-approval",
    APPROVALS: null,
    CERTIFICATESGROUP: null,
    REPORTBREAKDOWNGROUP: null,
    SCRAPMAINTENANCEAPPROVAL: "/scrap-approval",
    SUPERVISORAPPROVAL: "/maintenance-list", //done
    REPORTBREAKDOWN: "/report-breakdown", // Unique route for reports //done
    "EMPLOYEE REPORT BREAKDOWN": "/employee-report-breakdown", // Employee Report Breakdown route //done
    // Report routes
    ASSETLIFECYCLEREPORT: "/reports/asset-lifecycle-report",  //done
    ASSETREPORT: "/reports/asset-report",  //done
    MAINTENANCEHISTORY: "/reports/maintenance-history", //done
    ASSETVALUATION: "/reports/asset-valuation",  //done
    ASSETWORKFLOWHISTORY: "/reports/asset-workflow-history", //done
    SERIALNUMBERPRINT: "/serial-number-print", //not required
    BULKSERIALNUMBERPRINT: "/bulk-serial-number-print", // Bulk Serial Number Print route
    BREAKDOWNHISTORY: "/reports/breakdown-history",  //done
    BREAKDOWNREOPENDETAILS: "/reports/breakdown-reopen-details",
      REOPENEDBREAKDOWNS: "/reports/reopened-breakdowns",
    USAGEBASEDASSETREPORT: "/reports/usage-based-asset",  //done
    SLAREPORT: "/reports/sla-report",  //done
    QAAUDITREPORT: "/reports/qa-audit-report",  //done
    ADMINSETTINGS: "/admin-settings-view", // Unique route for admin settings  //done
    MASTERDATA: "/master-data/vendors",  //done
    ORGANIZATIONS: "/master-data/organizations",  //done
    ASSETTYPES: "/master-data/asset-types",  //done
    DEPARTMENTS: "/master-data/departments",  //done
    DEPARTMENTSADMIN: "/master-data/departments-admin",  //not required
    DEPARTMENTSASSET: "/master-data/departments-asset",  //not required
    BRANCHES: "/master-data/branches", //done
    PRODSERV: "/master-data/prod-serv",  //no required
    ROLES: "/master-data/uploads",
    USERS: "/master-data/user-roles",
    USERROLES: "/master-data/job-roles", // Job Roles route
    MAINTENANCESCHEDULE: "/maintenance-schedule-view", // Unique route
    AUDITLOGS: "/audit-logs-view", // Unique route  //done
    AUDITLOGCONFIG: "/audit-log-config", // Audit Log Config route  //done
    COLUMNACCESSCONFIG: "/adminsettings/configuration/data-config", // Column Access Config route
    MAINTENANCECONFIG: "/adminsettings/configuration/maintenance-config", // Maintenance Configuration route
    CERTIFICATIONS: "/certifications", // Certifications route
    TECHCERTUPLOAD: "/technician-certificates",
    TECHNICIANCERTIFICATES: "/technician-certificates",
    PROPERTIES: "/adminsettings/configuration/properties", // Properties route
    BREAKDOWNREASONCODES: "/adminsettings/configuration/breakdown-reason-codes", // Breakdown Reason Codes route
    ONETIMECRON: "/adminsettings/configuration/one-time-cron",
    TEXTMESSAGES: "/adminsettings/configuration/text-messages",
    JOBMONITOR: "/adminsettings/configuration/job-monitor",
    GROUPASSET: "/group-asset", // Group Asset route
    CREATEGROUPASSET: "/group-asset/create", // Create Group Asset route
    SCRAPSALES: "/scrap-sales", // Scrap Sales route
    SCRAPASSETS: "/scrap-assets", // Scrap Assets route  //done
    "EMPLOYEE TECH CERTIFICATION": "/technician-certificates",
    "HR/MANAGERAPPROVAL": "/tech-cert-approvals",
  };

  const prefetchRouteData = (appId) => {
    if (appId === "SCRAPMAINTENANCEAPPROVAL") {
      useScrapApprovalStore.getState().prefetchApprovals();
    }
    if (appId === "SUPERVISORAPPROVAL") {
      useMaintenanceSupervisorStore.getState().prefetchSchedules();
    }
    if (appId === "WORKORDERMANAGEMENT") {
      useWorkOrderStore.getState().prefetchWorkOrders();
    }
    if (appId === "MAINTENANCEAPPROVAL") {
      useMaintenanceApprovalStore.getState().prefetchApprovals();
    }
    if (appId === "SERIALNUMBERPRINT") {
      useSerialNumberPrintStore.getState().prefetchSerialNumberPrint('New');
    }
    if (appId === "AUDITLOGCONFIG") {
      useAuditLogConfigStore.getState().prefetchAuditLogConfig();
    }
    if (appId === "INSPECTIONVIEW" || appId === "INSPECTION") {
      useInspectionViewStore.getState().prefetchSchedules();
    }
    if (appId === "INSPECTIONAPPROVAL") {
      useInspectionApprovalStore.getState().prefetchApprovals();
    }
    if (appId === "EMPLOYEE REPORT BREAKDOWN") {
      const user = useAuthStore.getState().user;
      useEmployeeReportBreakdownStore.getState().prefetchBreakdowns(user);
    }
    if (appId === "REPORTBREAKDOWN") {
      useReportBreakdownStore.getState().prefetchReports();
    }
    if (appId === "SCRAPSALES") {
      useScrapSalesStore.getState().prefetchScrapSales();
    }
    if (appId === "ASSETTYPES") {
      useAssetTypeStore.getState().prefetchAssetTypes();
    }
    if (appId === "DEPARTMENTS") {
      useDepartmentsStore.getState().prefetchDepartments();
    }
    if (appId === "BRANCHES") {
      useBranchesStore.getState().prefetchBranches();
    }
    if (appId === "VENDORS") {
      useVendorsStore.getState().prefetchVendors();
    }
    if (appId === "USERS") {
      useUserRolesStore.getState().prefetchUserRoles();
    }
    if (appId === "CERTIFICATIONS") {
      useCertificationsStore.getState().prefetchCertifications();
    }
    if (appId === "HR/MANAGERAPPROVAL") {
      useTechCertApprovalsStore.getState().prefetchTechCertApprovals();
    }
    if (appId === "TECHCERTUPLOAD" || appId === "TECHNICIANCERTIFICATES" || appId === "EMPLOYEE TECH CERTIFICATION") {
      useTechnicianCertificatesStore.getState().prefetchTechnicianCertificates();
    }
    if (appId === "GROUPASSET" || appId === "CREATEGROUPASSET") {
      useGroupAssetStore.getState().prefetchGroupAssets();
    }
    if (appId === "SCRAPASSETS") {
      useScrapAssetsStore.getState().prefetchScrapAssets();
    }
    if (appId === "INSPECTIONFREQUENCY") {
      useInspectionFrequencyStore.getState().prefetchInspectionFrequencies();
    }
    if (appId === "INSPECTIONCHECKLISTS") {
      useInspectionChecklistsStore.getState().prefetchInspectionChecklists();
    }
    if (appId === "JOBMONITOR") {
      useJobMonitorStore.getState().prefetchJobs();
    }
    if (appId === "MAINTENANCECONFIG") {
      useMaintenanceConfigStore.getState().prefetchMaintenanceConfig();
    }
    if (appId === "PROPERTIES") {
      usePropertiesStore.getState().prefetchProperties();
    }
    if (appId === "BREAKDOWNREASONCODES") {
      useBreakdownReasonCodesStore.getState().prefetchBreakdownReasonCodes();
    }
    if (appId === "TEXTMESSAGES") {
      useTextMessagesStore.getState().prefetchTextMessages();
    }
    prefetchReportByAppId(appId);
  };

  // Dynamic icon component
  const getIconComponent = (appId) => {
    const iconMap = {
      DASHBOARD: LayoutDashboard,
      ASSETS: Package,
      ADDASSET: Package,
      ASSETASSIGNMENT: Users,
      COSTCENTERTRANSFER: GitBranch,
      DEPTASSIGNMENT: Building,
      EMPASSIGNMENT: UserCheck,
      WORKORDERMANAGEMENT: Wrench,
      INSPECTION: CheckSquare,
      INSPECTIONVIEW: CheckSquare, // Execution
      INSPECTIONAPPROVAL: ClipboardList, // Approval
      MAINTENANCEAPPROVAL: ClipboardList,
      VENDORRENEWALAPPROVAL: ClipboardList,
      SCRAPMAINTENANCEAPPROVAL: ClipboardList,
      APPROVALS: ClipboardList,
      CERTIFICATESGROUP: FileText,
      REPORTBREAKDOWNGROUP: BarChart3,
      SUPERVISORAPPROVAL: UserCheck,
      REPORTBREAKDOWN: BarChart3,
      "EMPLOYEE REPORT BREAKDOWN": BarChart3,
      REOPENEDBREAKDOWNS: BarChart3,
      // Report icons
      ASSETLIFECYCLEREPORT: FileText,
      ASSETREPORT: FileText,
      MAINTENANCEHISTORY: Wrench,
      ASSETVALUATION: DollarSign,
      ASSETWORKFLOWHISTORY: GitBranch,
      SERIALNUMBERPRINT: History,
      BREAKDOWNHISTORY: AlertTriangle,
      USAGEBASEDASSETREPORT: Gauge,
      SLAREPORT: FileText,
      QAAUDITREPORT: FileText,
      ADMINSETTINGS: Settings,
      MASTERDATA: Database,
      ORGANIZATIONS: Building,
      ASSETTYPES: Package,
      DEPARTMENTS: Users,
      DEPARTMENTSADMIN: UserCheck,
      DEPARTMENTSASSET: Package,
      BRANCHES: Home,
      VENDORS: Truck,
      INSPECTIONCHECKLISTS: ClipboardList,
      PRODSERV: Briefcase,
      ROLES: Shield,
      USERS: Users,
      MAINTENANCESCHEDULE: Calendar,
      AUDITLOGS: History,
      AUDITLOGCONFIG: Settings,
      COLUMNACCESSCONFIG: Settings,
      ONETIMECRON: Clock,
      JOBMONITOR: Activity,
      CERTIFICATIONS: FileText,
      TECHCERTUPLOAD: FileText,
      TECHNICIANCERTIFICATES: FileText,
      GROUPASSET: Package,
      SCRAPSALES: Package,
      SCRAPASSETS: Package,
      "EMPLOYEE TECH CERTIFICATION": FileText,
      "HR/MANAGERAPPROVAL": FileText,
    };

    const IconComponent =
      iconMap[appId] || iconMap[resolveNavAppId(appId)] || Building;
    return () => <IconComponent size={16} />;
  };

  const resolveEffectiveAccess = (appId, fallbackLevel) => {
    const key = resolveNavAppId(appId);
    if (key === "ONETIMECRON") {
      return (
        getAccessLevel("ONETIMECRON") ||
        getAccessLevel("ADMINSETTINGS") ||
        getAccessLevel("MASTERDATA") ||
        fallbackLevel
      );
    }
    if (key === "JOBMONITOR") {
      return (
        getAccessLevel("JOBMONITOR") ||
        getAccessLevel("ADMINSETTINGS") ||
        fallbackLevel
      );
    }
    return fallbackLevel;
  };

  // Get path - in admin settings mode, use simplified paths under /adminsettings/configuration
  const getPath = (appId) => {
    const navKey = resolveNavAppId(appId);
    const basePath = appIdToPath[appId] || appIdToPath[navKey];
    if (!basePath) {
      return isAdminSettingsMode ? "/adminsettings/configuration" : "/dashboard";
    }
    
    // If in admin settings mode, use simplified paths
    if (isAdminSettingsMode) {
      // For admin settings itself, return configuration path
      if (appId === "ADMINSETTINGS") {
        return "/adminsettings/configuration";
      }
      
      // For admin settings only items, use simplified paths
      // Add custom path mappings here for admin settings items
      const adminSettingsPathMap = {
        "USERROLES": "/adminsettings/configuration/job-roles",
        "BULKSERIALNUMBERPRINT": "/adminsettings/configuration/bulk-serial-number-print",
        "COLUMNACCESSCONFIG": "/adminsettings/configuration/data-config",
        "MAINTENANCECONFIG": "/adminsettings/configuration/maintenance-config",
        "PROPERTIES": "/adminsettings/configuration/properties",
        "BREAKDOWNREASONCODES": "/adminsettings/configuration/breakdown-reason-codes",
        "ONETIMECRON": "/adminsettings/configuration/one-time-cron",
        "JOBMONITOR": "/adminsettings/configuration/job-monitor",
        // Add more mappings here as you add more admin settings menu items
        // Example: "NEW_APP_ID": "/adminsettings/configuration/new-path",
      };
      
      if (adminSettingsPathMap[appId] || adminSettingsPathMap[navKey]) {
        return adminSettingsPathMap[appId] || adminSettingsPathMap[navKey];
      }
      
      // For all other routes, prefix with /adminsettings/configuration
      // Remove leading slash from basePath to avoid double slashes
      const cleanPath = basePath.startsWith('/') ? basePath.substring(1) : basePath;
      return `/adminsettings/configuration/${cleanPath}`;
    }
    
    // Normal mode - use base path
    return basePath;
  };

  useEffect(() => {
    if (isAdminSettingsMode || collapsed) return;

    const activeGroup = navigationForRender.find((item) => {
      if (!item.is_group || !item.children?.length) return false;
      return item.children.some((child) => {
        const childPath = getPath(child.app_id);
        return childPath && location.pathname.startsWith(childPath);
      });
    });

    if (activeGroup) {
      setOpenDropdown(activeGroup.id);
    }
  }, [location.pathname, navigationForRender, isAdminSettingsMode, collapsed]);

  // App IDs that should only be visible in admin settings mode (/adminsettings/configuration routes)
  // Add more app IDs here as needed for future admin settings menu items
  const adminSettingsOnlyAppIds = [
    "USERROLES", 
    "BULKSERIALNUMBERPRINT", 
    "COLUMNACCESSCONFIG",
    "MAINTENANCECONFIG",
    "PROPERTIES",
    "BREAKDOWNREASONCODES",
    "ONETIMECRON",
    "JOBMONITOR",
  ];
  const adminSettingsRoutes = [
    "COLUMNACCESSCONFIG",
    "MAINTENANCECONFIG",
    "PROPERTIES",
    "BREAKDOWNREASONCODES",
    "USERROLES",
    "ONETIMECRON",
    "JOBMONITOR",
  ];
  const isAdminSettingsOnlyAppId = (appId) =>
    adminSettingsOnlyAppIds.some(
      (id) => resolveNavAppId(id) === resolveNavAppId(appId)
    );
  const isAdminSettingsRouteAppId = (appId) =>
    adminSettingsRoutes.some(
      (id) => resolveNavAppId(id) === resolveNavAppId(appId)
    );
  // Filter navigation items - admin settings only items visible only in admin settings mode
  const shouldShowItem = (item) => {
    const isAdminSettingsOnlyItem = isAdminSettingsOnlyAppId(item.app_id);
    
    // Hide admin settings only items when NOT in admin settings mode
    if (!isAdminSettingsMode) {
      if (isAdminSettingsOnlyItem) {
        return false;
      }
      // Check if any child is an admin settings only item and hide the parent if needed
      if (item.children && item.children.length > 0) {
        const hasAdminSettingsChild = item.children.some(child => 
          isAdminSettingsOnlyAppId(child.app_id)
        );
        if (hasAdminSettingsChild) {
          // Hide parent groups that only contain admin settings items
          const nonAdminSettingsChildren = item.children.filter(child => 
            !isAdminSettingsOnlyAppId(child.app_id)
          );
          // If all children are admin settings items, hide the parent
          if (nonAdminSettingsChildren.length === 0) {
            return false;
          }
        }
      }
      // Show all other items normally
      return true;
    }
    
    // In admin settings mode, only show admin settings only items
    if (isAdminSettingsOnlyItem) {
      return true;
    }
    
    // Check children for admin settings only items
    if (item.children && item.children.length > 0) {
      return item.children.some(child => isAdminSettingsOnlyAppId(child.app_id));
    }
    
    return false;
  };

  // Render navigation item
  const renderNavigationItem = (item) => {
    // Filter items when in admin settings mode
    if (!shouldShowItem(item)) {
      return null;
    }

    const path = getPath(item.app_id);
    const accessLevel = getAccessLevel(item.app_id);
    const IconComponent = getIconComponent(item.app_id);

    if (item.is_group && item.children?.length > 0) {
      const hasChildren = true;
      const isAnyChildActive =
        hasChildren &&
        item.children.some((child) => {
          const childPath = getPath(child.app_id);
          // For COLUMNACCESSCONFIG, check exact match since it shares path with ADMINSETTINGS
          if (child.app_id === "COLUMNACCESSCONFIG") {
            return location.pathname === childPath;
          }
          return location.pathname.startsWith(childPath);
        });

      return (
        <li key={item.id} className="mb-2">
          <div
            onClick={() => toggleDropdown(item.id)}
            className={`group flex items-center justify-between px-3 py-2 cursor-pointer rounded ${
              isAnyChildActive
                ? "bg-[#FFC107] text-white"
                : "hover:bg-[#143d65] text-white"
            }`}
            title={!collapsed ? translateLabel(item.label) : ""} // Tooltip for collapsed state
          >
            <div className="flex items-center gap-2 min-w-0 flex-1">
              {IconComponent && <IconComponent className="flex-shrink-0" />}
              {!collapsed && (
                <span className="truncate text-sm font-medium">
                  {translateLabel(item.label)}
                </span>
              )}
            </div>
            {!collapsed && hasChildren && (
              <span className="flex-shrink-0 ml-2">
                {openDropdown === item.id ? (
                  <ChevronDown size={16} />
                ) : (
                  <ChevronRight size={16} />
                )}
              </span>
            )}
          </div>

          {!collapsed && openDropdown === item.id && hasChildren && (
            <ul className="ml-6 mt-1 space-y-1">
              {item.children.map((child) => {
                const isAdminSettingsOnlyChild = isAdminSettingsOnlyAppId(child.app_id);

                // Hide admin settings only items when NOT in admin settings mode
                if (!isAdminSettingsMode && isAdminSettingsOnlyChild) {
                  return null;
                }

                // In admin settings mode, only show admin settings only children
                if (isAdminSettingsMode && !isAdminSettingsOnlyChild) {
                  return null;
                }

                const childPath = getPath(child.app_id);
                const childAccessLevel = resolveEffectiveAccess(
                  child.app_id,
                  child.access_level || getAccessLevel(child.app_id)
                );
                const ChildIconComponent = getIconComponent(child.app_id);

                // Only show children that have access
                if (!hasViewAccess(childAccessLevel)) return null;

                const requiresExactMatch = isAdminSettingsRouteAppId(child.app_id);
                const isActiveForAdminRoute = requiresExactMatch 
                  ? location.pathname === childPath
                  : undefined;

                return (
                  <li key={child.id} className="mb-1">
                    <NavLink
                      to={childPath || "/dashboard"}
                      state={navLinkState}
                      end={requiresExactMatch} // Use exact match for admin settings routes
                      onMouseEnter={() => prefetchRouteData(child.app_id)}
                      className={({ isActive }) => {
                        // Use exact match check for admin settings routes
                        const active = requiresExactMatch 
                          ? isActiveForAdminRoute 
                          : isActive;
                        return `group flex items-center gap-2 px-4 py-2 rounded text-sm ${
                          active
                            ? "bg-[#FFC107] text-white"
                            : "hover:bg-[#143d65] text-white"
                        } ${getAccessColorClass(childAccessLevel)}`;
                      }}
                      title={translateLabel(child.label)}
                    >
                      {ChildIconComponent && (
                        <ChildIconComponent className="flex-shrink-0" />
                      )}
                      <span className="truncate flex-1 min-w-0">
                        {translateLabel(child.label)}
                      </span>
                      <span className="flex-shrink-0">
                        {getAccessIcon(childAccessLevel)}
                      </span>
                    </NavLink>
                  </li>
                );
              })}
            </ul>
          )}
        </li>
      );
    } else {
      const effectiveAccess = resolveEffectiveAccess(
        item.app_id,
        accessLevel || item.access_level
      );
      if (!hasViewAccess(effectiveAccess)) return null;

      const requiresExactMatch = isAdminSettingsRouteAppId(item.app_id);
      const isActiveForAdminRoute = requiresExactMatch 
        ? location.pathname === path
        : undefined;

      return (
        <li key={item.id} className="mb-2">
          <NavLink
            to={path || "/dashboard"}
            state={navLinkState}
            end={requiresExactMatch} // Use exact match for admin settings routes
            onMouseEnter={() => prefetchRouteData(item.app_id)}
            className={({ isActive }) => {
              // Use exact match check for admin settings routes
              const active = requiresExactMatch 
                ? isActiveForAdminRoute 
                : isActive;
              return `group flex items-center gap-2 px-4 py-2 rounded ${
                active
                  ? "bg-[#FFC107] text-white"
                  : "hover:bg-[#143d65] text-white"
              } ${getAccessColorClass(effectiveAccess)}`;
            }}
              title={!collapsed ? translateLabel(item.label) : ""}
            >
              {IconComponent && <IconComponent className="flex-shrink-0" />}
              {!collapsed && (
                <span className="truncate flex-1 min-w-0 text-sm font-medium">
                  {translateLabel(item.label)}
                </span>
              )}
            {!collapsed && (
              <span className="flex-shrink-0">
                {getAccessIcon(effectiveAccess)}
              </span>
            )}
          </NavLink>
        </li>
      );
    }
  };

  if (loading) {
    return (
      <aside className="w-64 h-screen bg-[#0E2F4B] text-white shadow overflow-y-auto">
        <div className="flex justify-center items-center h-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
            <p>{t('common.loading')}</p>
          </div>
        </div>
      </aside>
    );
  }

  if (error) {
    return (
      <aside className="w-64 h-screen bg-[#0E2F4B] text-white shadow overflow-y-auto">
        <div className="flex justify-center items-center h-full">
          <div className="text-center text-red-300">
            <p>{t('common.error')}</p>
            <p className="text-sm">{error}</p>
          </div>
        </div>
      </aside>
    );
  }

  return (
    <aside
      className={`${
        collapsed ? "w-16" : "w-64"
      } h-screen bg-[#0E2F4B] text-white shadow overflow-y-auto transition-all duration-300 relative`}
    >
      {/* Logo & Toggle Button */}
      <div className="flex justify-center items-center mb-6 px-4">
        {!collapsed && (
          <img src="/logo.png" alt="Logo" className="h-10 md:h-[60px] w-auto" />
        )}
        <button className="md:hidden text-white ml-20" onClick={toggleSidebar}>
          <Menu size={20} />
        </button>
      </div>

      {/* Navigation Items */}
      <ul className="px-2 pb-4 overflow-y-auto no-scrollbar">
        {isAdminSettingsMode && (
          <li className="mb-2">
            <NavLink
              to="/adminsettings/configuration"
              state={navLinkState}
              end
              className={({ isActive }) =>
                `group flex items-center gap-2 px-4 py-2 rounded ${
                  isActive
                    ? "bg-[#FFC107] text-white"
                    : "hover:bg-[#143d65] text-white"
                }`
              }
              title={!collapsed ? "Admin Dashboard" : ""}
            >
              <Settings size={16} className="flex-shrink-0" />
              {!collapsed && (
                <span className="truncate flex-1 min-w-0 text-sm font-medium">
                  Admin Dashboard
                </span>
              )}
            </NavLink>
          </li>
        )}
        {navigationForRender.length === 0 ? (
          <li className="text-center py-4 text-gray-300">
            <div className="text-sm">
              <p>No navigation items found.</p>
              <p className="text-xs mt-1">Please check your database setup.</p>
            </div>
          </li>
        ) : (
          <>
            {navigationForRender.map((item) => renderNavigationItem(item))}
          </>
        )}
      </ul>
    </aside>
  );
};

export default DatabaseSidebar;
