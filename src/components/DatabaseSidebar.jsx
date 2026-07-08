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
  ensureDefaultDashboardNav,
  ensureUsersInMasterData,
  sortMasterDataNavOrder,
  sortScrapNavOrder,
  sortAdminSettingsNavOrder,
  sortInspectionNavOrder,
} from "../utils/navigationDefaults";
import {
  Menu,
  Edit,
  Shield,
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

const isAdminSettingsHub = (appId, label) =>
  resolveNavAppId(appId) === "ADMINSETTINGS" ||
  String(label || "").trim().toLowerCase() === "admin settings";

const EMPLOYEE_TECH_CERT_APP_IDS = [
  "TECHCERTUPLOAD",
  "TECHNICIANCERTIFICATES",
  "EMPLOYEE TECH CERTIFICATION",
];

const SYNTHETIC_APPROVAL_APP_IDS = new Set(
  [
    "MAINTENANCEAPPROVAL",
    "INSPECTIONAPPROVAL",
    "SCRAPMAINTENANCEAPPROVAL",
    "VENDORRENEWALAPPROVAL",
    "HR/MANAGERAPPROVAL",
  ].map((id) => normalizeNavAppId(id)),
);

function hasGroupedApprovalItems(items) {
  const walk = (nodes) => {
    for (const node of nodes || []) {
      if (!node.children?.length) continue;
      const hasApprovalChild = node.children.some(
        (child) =>
          child.app_id &&
          SYNTHETIC_APPROVAL_APP_IDS.has(normalizeNavAppId(child.app_id)),
      );
      if (hasApprovalChild) return true;
      if (walk(node.children)) return true;
    }
    return false;
  };
  return walk(items);
}

const DEFAULT_NAV_GROUP_MEMBERS = {
  Maintenance: [
    "SUPERVISORAPPROVAL",
    "MAINTENANCESCHEDULE",
    "MAINTENANCEAPPROVAL",
  ],
  Scrap: ["SCRAPASSETS", "SCRAPMAINTENANCEAPPROVAL", "SCRAPSALES"],
  Inspection: [
    "INSPECTIONAPPROVAL",
    "INSPECTIONVIEW",
    "INSPECTIONFREQUENCY",
    "INSPECTIONCHECKLISTS",
    "ASSETTYPECHECKLISTMAPPING",
  ],
  "Admin Settings": ["AUDITLOGS", "AUDITLOGCONFIG"],
  "Asset Assignment": ["DEPTASSIGNMENT", "EMPASSIGNMENT"],
  "Master Data": [
    "ASSETTYPES",
    "BRANCHES",
    "DEPARTMENTS",
    "DEPARTMENTSADMIN",
    "DEPARTMENTSASSET",
    "ROLES",
    "USERS",
    "USERROLES",
    "PRODSERV",
    "VENDORS",
    "MAINTENANCESCHEDULE",
    "INSPECTIONCHECKLISTS",
    "INSPECTIONFREQUENCY",
    "ASSETTYPECHECKLISTMAPPING",
  ],
  Reports: [
    "ASSETLIFECYCLEREPORT",
    "ASSETREPORT",
    "MAINTENANCEHISTORY",
    "ASSETVALUATION",
    "ASSETWORKFLOWHISTORY",
    "BREAKDOWNHISTORY",
    "USAGEBASEDASSETREPORT",
    "REOPENEDBREAKDOWNS",
    "SLAREPORT",
  ],
};

const isNavGroup = (item) =>
  Boolean(
    item?.is_group === true ||
    item?.is_group === 1 ||
    item?.is_group === "Yes" ||
    item?.children?.length,
  );

const getNavItemKey = (item) =>
  item?.combineKey || item?.id || `${item?.app_id || "group"}-${item?.label || ""}`;

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

const normalizeGroupLabel = (label) =>
  String(label || "").trim().toLowerCase();

const CANONICAL_GROUP_LABELS = {
  maintainance: "maintenance",
};

function canonicalGroupLabel(label) {
  const normalized = normalizeGroupLabel(label);
  return CANONICAL_GROUP_LABELS[normalized] || normalized;
}

function findNavGroupByLabel(items, groupLabel) {
  const canonical = canonicalGroupLabel(groupLabel);
  return items.find(
    (item) => isNavGroup(item) && canonicalGroupLabel(item.label) === canonical,
  );
}

function isSyntheticNavGroup(item) {
  const id = String(item?.id || "");
  return (
    id.startsWith("ensure-") ||
    id.startsWith("repair-") ||
    id.startsWith("synthetic-")
  );
}

function isJobRoleConfiguredGroup(item) {
  return (
    isNavGroup(item) &&
    !isAdminSettingsHub(item.app_id, item.label) &&
    !isSyntheticNavGroup(item)
  );
}

function isNavMemberGrouped(items, member, groupLabel) {
  const canonical = canonicalGroupLabel(groupLabel);
  return items.some(
    (parent) =>
      isNavGroup(parent) &&
      canonicalGroupLabel(parent.label) === canonical &&
      (parent.children || []).some(
        (child) =>
          normalizeNavAppId(child.app_id) === normalizeNavAppId(member.app_id),
      ),
  );
}

/** True when app_id is already nested under any sidebar group (any label). */
function isNavMemberUnderAnyGroup(items, member) {
  const memberKey = normalizeNavAppId(member.app_id);
  const walk = (nodes) => {
    for (const item of nodes || []) {
      if (!isNavGroup(item)) continue;
      if (
        (item.children || []).some(
          (child) => normalizeNavAppId(child.app_id) === memberKey,
        )
      ) {
        return true;
      }
      if (walk(item.children)) return true;
    }
    return false;
  };
  return walk(items);
}

function getDbMenuGroupLabels(items) {
  const labels = new Set();
  const walk = (nodes) => {
    for (const item of nodes || []) {
      if (isNavGroup(item)) {
        labels.add(normalizeGroupLabel(item.label));
      }
      if (item.children?.length) walk(item.children);
    }
  };
  walk(items);
  return labels;
}

function getGroupedAppIdsForDefs(groupDefs) {
  const groupedAppIds = new Set();
  groupDefs.forEach((group) => {
    group.children.forEach((child) => {
      groupedAppIds.add(normalizeNavAppId(child.app_id));
      (child.aliases || []).forEach((alias) =>
        groupedAppIds.add(normalizeNavAppId(alias))
      );
    });
  });
  return groupedAppIds;
}

function pruneEmptyGroups(items) {
  if (!items?.length) return items;
  return items
    .map((item) => ({
      ...item,
      children: item.children?.length
        ? pruneEmptyGroups(item.children)
        : item.children,
    }))
    .filter((item) => !isNavGroup(item) || item.children?.length);
}

function dedupeTopLevelNavItems(items) {
  if (!items?.length) return items;

  const merged = [];
  const indexByKey = new Map();

  for (const item of items) {
    const key = isNavGroup(item)
      ? `group:${canonicalGroupLabel(item.label)}`
      : `app:${normalizeNavAppId(item.app_id) || item.id}`;

    if (!indexByKey.has(key)) {
      indexByKey.set(key, merged.length);
      merged.push(item);
      continue;
    }

    const existingIndex = indexByKey.get(key);
    const existing = merged[existingIndex];
    if (!isNavGroup(item) || !isNavGroup(existing) || !item.children?.length) {
      continue;
    }

    const childKeys = new Set(
      (existing.children || []).map(
        (child) => normalizeNavAppId(child.app_id) || String(child.id || ""),
      ),
    );
    const extraChildren = item.children.filter((child) => {
      const childKey = normalizeNavAppId(child.app_id) || String(child.id || "");
      return childKey && !childKeys.has(childKey);
    });

    if (extraChildren.length) {
      merged[existingIndex] = {
        ...existing,
        label: isSyntheticNavGroup(existing) ? item.label : existing.label,
        children: [...(existing.children || []), ...extraChildren],
      };
    }
  }

  return merged;
}

function rebuildNavigationTree(items) {
  const flat = flattenNavItems(items);
  const byId = new Map();

  flat.forEach((item) => {
    byId.set(item.id, { ...item, children: [] });
  });

  const roots = [];
  const seenRoots = new Set();

  flat.forEach((item) => {
    const node = byId.get(item.id);
    const parentKey = item.parent_id;

    if (parentKey) {
      const parent =
        byId.get(parentKey) ||
        [...byId.values()].find(
          (candidate) => candidate.combineKey === parentKey,
        );
      if (parent) {
        parent.children.push(node);
        return;
      }
    }

    if (!seenRoots.has(node.id)) {
      seenRoots.add(node.id);
      roots.push(node);
    }
  });

  return roots.sort((a, b) => (a.seq ?? 9999) - (b.seq ?? 9999));
}

function stripOrphanedTopLevelDuplicates(items) {
  const nestedChildKeys = new Set();

  const collectChildKeys = (nodes) => {
    for (const node of nodes || []) {
      if (!node.children?.length) continue;
      for (const child of node.children) {
        const key = normalizeNavAppId(child.app_id) || String(child.id || "");
        if (key) nestedChildKeys.add(key);
        collectChildKeys([child]);
      }
    }
  };

  collectChildKeys(items);

  return items.filter((item) => {
    if (isNavGroup(item)) return true;
    const key = normalizeNavAppId(item.app_id) || String(item.id || "");
    return !nestedChildKeys.has(key);
  });
}

function normalizeNavigationTree(items) {
  if (!items?.length) return items;

  const hasNestedGroups = items.some((item) => item.children?.length > 0);
  const hasParentRefs = items.some((item) => item.parent_id);

  let tree = items;

  if (!hasNestedGroups && hasParentRefs) {
    tree = rebuildNavigationTree(items);
  }

  tree = stripOrphanedTopLevelDuplicates(tree);

  return pruneEmptyGroups(tree);
}

const TOP_LEVEL_APPROVAL_APP_IDS = new Set([
  "VENDORRENEWALAPPROVAL",
  "HR/MANAGERAPPROVAL",
]);

function flattenApprovalsGroup(items) {
  const approvalsGroup = items.find(
    (item) =>
      isNavGroup(item) && normalizeGroupLabel(item.label) === "approvals",
  );
  if (!approvalsGroup) return items;

  const topLevelChildren = [];
  const nestedChildren = [];

  for (const child of approvalsGroup.children || []) {
    const appKey = normalizeNavAppId(child.app_id);
    if (TOP_LEVEL_APPROVAL_APP_IDS.has(appKey)) {
      topLevelChildren.push({ ...child, is_group: false, children: undefined });
    } else {
      nestedChildren.push({ ...child, is_group: false, children: undefined });
    }
  }

  let next = items.filter(
    (item) =>
      !(isNavGroup(item) && normalizeGroupLabel(item.label) === "approvals"),
  );

  for (const child of topLevelChildren) {
    const appKey = normalizeNavAppId(child.app_id);
    if (
      !next.some(
        (item) => normalizeNavAppId(item.app_id) === appKey,
      )
    ) {
      next.push(child);
    }
  }

  if (nestedChildren.length) {
    next = repairOrphanedNavGroups([...next, ...nestedChildren]);
  }

  return next;
}

/** Move Reopened Breakdowns from Report Breakdown into the Reports menu group. */
function moveReopenedBreakdownsToReports(items) {
  if (!items?.length) return items;

  const reopenKey = normalizeNavAppId("REOPENEDBREAKDOWNS");
  let reopenedItem = null;

  const stripReopened = (nodes) =>
    (nodes || [])
      .map((item) => {
        if (isNavGroup(item)) {
          const children = stripReopened(item.children);
          const removed = (children || []).find(
            (child) => normalizeNavAppId(child.app_id) === reopenKey,
          );
          if (removed) {
            reopenedItem = reopenedItem || removed;
          }
          return {
            ...item,
            children: (children || []).filter(
              (child) => normalizeNavAppId(child.app_id) !== reopenKey,
            ),
          };
        }

        if (normalizeNavAppId(item.app_id) === reopenKey) {
          reopenedItem = reopenedItem || item;
          return null;
        }

        return item;
      })
      .filter(Boolean);

  let result = stripReopened(items);
  if (!reopenedItem) return result;

  const reportsGroup = findNavGroupByLabel(result, "Reports");
  if (!reportsGroup) {
    return [...result, { ...reopenedItem, is_group: false, children: undefined }];
  }

  const alreadyInReports = (reportsGroup.children || []).some(
    (child) => normalizeNavAppId(child.app_id) === reopenKey,
  );
  if (alreadyInReports) return result;

  result = result.map((item) => {
    if (!isNavGroup(item) || canonicalGroupLabel(item.label) !== "reports") {
      return item;
    }
    return {
      ...item,
      children: [
        ...(item.children || []),
        { ...reopenedItem, is_group: false, children: undefined },
      ],
    };
  });

  return result;
}

function ensureDomainNavGroups(items) {
  const flat = flattenNavItems(items);
  let result = [...items];

  for (const [groupLabel, appIds] of Object.entries(DEFAULT_NAV_GROUP_MEMBERS)) {
    const groupKey = canonicalGroupLabel(groupLabel);
    const memberKeys = appIds.map(normalizeNavAppId);

    let group = findNavGroupByLabel(result, groupLabel);

    const looseMembers = flat.filter(
      (item) =>
        !isNavGroup(item) &&
        item.app_id &&
        memberKeys.includes(normalizeNavAppId(item.app_id)) &&
        !isNavMemberGrouped(result, item, groupLabel) &&
        !isNavMemberUnderAnyGroup(result, item),
    );

    if (!looseMembers.length) continue;

    if (!group) {
      group = {
        id: `ensure-${groupKey}`,
        label: groupLabel,
        is_group: true,
        seq: Math.min(...looseMembers.map((m) => m.seq ?? 9999)),
        access_level: looseMembers[0].access_level,
        children: [],
      };
      result.push(group);
    } else {
      group = {
        ...group,
        children: [...(group.children || [])],
      };
      result = result.map((item) =>
        isNavGroup(item) &&
        canonicalGroupLabel(item.label) === groupKey
          ? group
          : item,
      );
    }

    for (const member of looseMembers) {
      const appKey = normalizeNavAppId(member.app_id);
      if (
        !group.children.some(
          (child) => normalizeNavAppId(child.app_id) === appKey,
        )
      ) {
        group.children.push({
          ...member,
          is_group: false,
          children: undefined,
        });
      }
    }

    group.children.sort((a, b) => {
      const rankA = memberKeys.indexOf(normalizeNavAppId(a.app_id));
      const rankB = memberKeys.indexOf(normalizeNavAppId(b.app_id));
      const safeA = rankA >= 0 ? rankA : 1000;
      const safeB = rankB >= 0 ? rankB : 1000;
      if (safeA !== safeB) return safeA - safeB;
      return (a.seq ?? 9999) - (b.seq ?? 9999);
    });

    result = result.filter(
      (item) =>
        isNavGroup(item) ||
        !memberKeys.includes(normalizeNavAppId(item.app_id)),
    );
  }

  return result;
}

const SIDEBAR_LABEL_ORDER = [
  "dashboard",
  "assets",
  "asset assignment",
  "maintenance",
  "inspection",
  "reports",
  "scrap",
  "admin settings",
  "master data",
  "workorder management",
  "serial number print",
  "vendor renewal approval",
  "hr/manager approval",
  "certificates",
  "report breakdown",
  "asset groups",
  "group asset",
];

function sortSidebarNav(items) {
  const rank = (item) => {
    const label = normalizeGroupLabel(item.label);
    const idx = SIDEBAR_LABEL_ORDER.indexOf(label);
    if (idx >= 0) return idx;
    return 1000 + (item.seq ?? 9999);
  };
  return [...items].sort((a, b) => rank(a) - rank(b));
}

function finalizeSidebarNavigation(items) {
  if (!items?.length) return items;

  let tree = normalizeNavigationTree(items);
  tree = ensureDefaultDashboardNav(tree);
  tree = ensureUsersInMasterData(tree);
  tree = reorganizeSidebarGroups(tree);
  tree = repairOrphanedNavGroups(tree);
  tree = flattenApprovalsGroup(tree);
  tree = moveReopenedBreakdownsToReports(tree);
  tree = ensureDomainNavGroups(tree);
  tree = sortMasterDataNavOrder(tree);
  tree = sortScrapNavOrder(tree);
  tree = sortAdminSettingsNavOrder(tree);
  tree = sortInspectionNavOrder(tree);
  tree = stripOrphanedTopLevelDuplicates(tree);
  tree = pruneEmptyGroups(tree);
  return dedupeTopLevelNavItems(sortSidebarNav(tree));
}

function repairOrphanedNavGroups(items) {
  if (!items?.length) return items;

  const repairedGroups = new Map();

  for (const item of items) {
    if (!isNavGroup(item)) continue;
    repairedGroups.set(canonicalGroupLabel(item.label), {
      ...item,
      children: [...(item.children || [])],
    });
  }

  const absorbed = new Set();

  for (const item of items) {
    if (isNavGroup(item)) continue;

    const appKey = normalizeNavAppId(item.app_id);
    if (!appKey) continue;

    for (const [groupLabel, appIds] of Object.entries(DEFAULT_NAV_GROUP_MEMBERS)) {
      if (!appIds.map(normalizeNavAppId).includes(appKey)) continue;

      const groupKey = canonicalGroupLabel(groupLabel);
      if (!repairedGroups.has(groupKey)) {
        repairedGroups.set(groupKey, {
          id: `repair-${groupKey}`,
          label: groupLabel,
          is_group: true,
          seq: item.seq ?? 9999,
          access_level: item.access_level,
          children: [],
        });
      }

      const group = repairedGroups.get(groupKey);
      if (
        !group.children.some(
          (child) => normalizeNavAppId(child.app_id) === appKey,
        )
      ) {
        group.children.push(item);
      }
      absorbed.add(appKey);
      break;
    }
  }

  const result = [];
  const addedGroups = new Set();

  for (const item of items) {
    if (isNavGroup(item)) {
      const groupKey = canonicalGroupLabel(item.label);
      if (addedGroups.has(groupKey)) continue;
      const repaired = repairedGroups.get(groupKey);
      if (repaired?.children?.length) {
        result.push(repaired);
        addedGroups.add(groupKey);
      }
      continue;
    }

    if (!absorbed.has(normalizeNavAppId(item.app_id))) {
      result.push(item);
    }
  }

  for (const [groupKey, group] of repairedGroups) {
    if (!addedGroups.has(groupKey) && group.children?.length) {
      result.push(group);
    }
  }

  return result.sort((a, b) => (a.seq ?? 9999) - (b.seq ?? 9999));
}

/** Groups Approvals, Certificates, and Report Breakdown into dropdown menus. */
function reorganizeSidebarGroups(items) {
  if (!items?.length) return items;

  const flatItems = flattenNavItems(items);
  const accessMap = buildFlatAccessMap(flatItems);
  const dbGroupLabels = getDbMenuGroupLabels(items);
  const syntheticGroupDefs = SIDEBAR_MENU_GROUPS.filter((groupDef) => {
    if (groupDef.id === "synthetic-approvals") return false;

    const label = normalizeGroupLabel(groupDef.label);
    if (dbGroupLabels.has(label)) return false;
    if (label === "approvals" && dbGroupLabels.has("approval")) return false;
    if (groupDef.id === "synthetic-approvals" && hasGroupedApprovalItems(items)) {
      return false;
    }
    if (
      groupDef.id === "synthetic-approvals" &&
      (dbGroupLabels.has("maintenance") ||
        dbGroupLabels.has("inspection") ||
        dbGroupLabels.has("scrap"))
    ) {
      return false;
    }
    return true;
  });

  if (!syntheticGroupDefs.length) {
    return pruneEmptyGroups(items);
  }

  const syntheticGroups = syntheticGroupDefs
    .map((groupDef) => {
      const isReportBreakdownGroup = groupDef.id === "synthetic-report-breakdown";
      const reportBreakdownAccess = resolveInheritedAccess(
        (id) => accessMap.get(id),
        "REPORTBREAKDOWN",
      );

      const children = collectGroupChildren(flatItems, groupDef, accessMap, {
        forceAllChildren:
          isReportBreakdownGroup && hasViewAccess(reportBreakdownAccess),
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
    })
    .filter(Boolean);

  if (!syntheticGroups.length) {
    return pruneEmptyGroups(items);
  }

  const groupedAppIds = getGroupedAppIdsForDefs(
    syntheticGroupDefs.filter((groupDef) =>
      syntheticGroups.some((group) => group.id === groupDef.id),
    ),
  );
  const remainingItems = pruneEmptyGroups(
    removeAppIdsFromTree(items, groupedAppIds),
  );
  return [...remainingItems, ...syntheticGroups].sort(
    (a, b) => (a.seq ?? 9999) - (b.seq ?? 9999),
  );
}

/** Injects synthetic "One Time Cron" nav row under Master Data (admin settings mode). */
function injectOneTimeCronUnderMasterData(items) {
  if (!items?.length) return items;
  return items.map((item) => {
    const children = item.children?.length
      ? injectOneTimeCronUnderMasterData(item.children)
      : item.children;
    if (
      item.is_group &&
      (item.app_id === "MASTERDATA" || item.label === "Master Data")
    ) {
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
      return dedupeTopLevelNavItems(
        injectOneTimeCronUnderMasterData(finalizeSidebarNavigation(navigation)),
      );
    }
    return finalizeSidebarNavigation(navigation);
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
  const translateLabel = (label, appId = null) => {
    if (normalizeNavAppId(appId) === "USERS") {
      return t("navigation.users");
    }
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
  const getIconComponent = (appId, label) => {
    const resolvedAppId = resolveAppIdForPath(appId, label);
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
      REPORTS: Building,
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
      iconMap[resolvedAppId] ||
      iconMap[appId] ||
      iconMap[resolveNavAppId(resolvedAppId)] ||
      iconMap[resolveNavAppId(appId)] ||
      Building;
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

  const LABEL_TO_APP_ID = {
    "job monitor": "JOBMONITOR",
    "admin settings": "ADMINSETTINGS",
    maintenance: "WORKORDERMANAGEMENT",
    inspection: "INSPECTION",
    scrap: "SCRAPASSETS",
    reports: "REPORTS",
    certificates: "CERTIFICATESGROUP",
    approval: "APPROVALS",
    approvals: "APPROVALS",
    "report breakdown": "REPORTBREAKDOWNGROUP",
    "master data": "MASTERDATA",
    "asset assignment": "ASSETASSIGNMENT",
  };

  const resolveAppIdForPath = (appId, label) => {
    const key = resolveNavAppId(appId);
    if (key) return appId;
    const fromLabel = LABEL_TO_APP_ID[String(label || "").trim().toLowerCase()];
    return fromLabel || appId;
  };

  // Get path - in admin settings mode, use simplified paths under /adminsettings/configuration
  const getPath = (appId, label) => {
    if (isAdminSettingsHub(appId, label)) {
      return isAdminSettingsMode
        ? "/adminsettings/configuration"
        : "/admin-settings-view";
    }

    const pathAppId = resolveAppIdForPath(appId, label);
    const navKey = resolveNavAppId(pathAppId);
    const basePath = appIdToPath[pathAppId] || appIdToPath[navKey];
    if (!basePath) {
      return isAdminSettingsMode ? "/adminsettings/configuration" : null;
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
      if (!isNavGroup(item) || !item.children?.length) return false;
      return item.children.some((child) => {
        const childPath = getPath(child.app_id, child.label);
        return childPath && location.pathname.startsWith(childPath);
      });
    });

    if (activeGroup) {
      setOpenDropdown(getNavItemKey(activeGroup));
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
  const isAdminSettingsOnlyAppId = (appId, label) =>
    adminSettingsOnlyAppIds.some(
      (id) => resolveNavAppId(id) === resolveNavAppId(appId)
    ) ||
    String(label || "").trim().toLowerCase() === "job monitor";
  const isAdminSettingsRouteAppId = (appId, label) =>
    adminSettingsRoutes.some(
      (id) => resolveNavAppId(id) === resolveNavAppId(appId)
    ) ||
    String(label || "").trim().toLowerCase() === "job monitor";
  // Filter navigation items - admin settings only items visible only in admin settings mode
  const shouldShowItem = (item) => {
    const isAdminSettingsOnlyItem = isAdminSettingsOnlyAppId(item.app_id, item.label);

    // Admin Settings dropdown (with audit children) or legacy hub link.
    if (!isAdminSettingsMode && isAdminSettingsHub(item.app_id, item.label)) {
      return hasViewAccess(
        resolveEffectiveAccess("ADMINSETTINGS", item.access_level)
      );
    }
    
    // Hide admin settings only items when NOT in admin settings mode
    if (!isAdminSettingsMode) {
      if (isAdminSettingsOnlyItem) {
        return false;
      }
      // Check if any child is an admin settings only item and hide the parent if needed
      if (item.children && item.children.length > 0) {
        const hasAdminSettingsChild = item.children.some(child => 
          isAdminSettingsOnlyAppId(child.app_id, child.label)
        );
        if (hasAdminSettingsChild) {
          // Hide parent groups that only contain admin settings items
          const nonAdminSettingsChildren = item.children.filter(child => 
            !isAdminSettingsOnlyAppId(child.app_id, child.label)
          );
          // If all children are admin settings items, hide the parent
          if (nonAdminSettingsChildren.length === 0 && !isJobRoleConfiguredGroup(item)) {
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
      return item.children.some(child => isAdminSettingsOnlyAppId(child.app_id, child.label));
    }
    
    return false;
  };

  // Render navigation item
  const renderNavigationItem = (item) => {
    // Filter items when in admin settings mode
    if (!shouldShowItem(item)) {
      return null;
    }

    const path = getPath(item.app_id, item.label);

    // Empty group headers should not render as links (avoids false /dashboard highlight)
    if (isNavGroup(item) && !item.children?.length && !isAdminSettingsHub(item.app_id, item.label)) {
      return null;
    }

    const isDropdownGroup = isNavGroup(item) && item.children?.length > 0;

    if (isDropdownGroup) {
      const accessLevel = resolveEffectiveAccess(
        isAdminSettingsHub(item.app_id, item.label) ? "ADMINSETTINGS" : item.app_id,
        item.access_level || getAccessLevel(item.app_id)
      );
      const IconComponent = getIconComponent(
        isAdminSettingsHub(item.app_id, item.label) ? "ADMINSETTINGS" : item.app_id,
        item.label
      );
      const hasChildren = true;
      const isAnyChildActive =
        hasChildren &&
        item.children.some((child) => {
          const childPath = getPath(child.app_id, child.label);
          if (child.app_id === "COLUMNACCESSCONFIG") {
            return location.pathname === childPath;
          }
          return childPath && location.pathname.startsWith(childPath);
        });

      return (
        <li key={getNavItemKey(item)} className="mb-2">
          <div
            onClick={() => toggleDropdown(getNavItemKey(item))}
            className={`group flex items-center justify-between px-3 py-2 cursor-pointer rounded ${
              isAnyChildActive
                ? "bg-[#FFC107] text-white"
                : "hover:bg-[#143d65] text-white"
            }`}
            title={!collapsed ? translateLabel(item.label, item.app_id) : ""}
          >
            <div className="flex items-center gap-2 min-w-0 flex-1">
              {IconComponent && <IconComponent className="flex-shrink-0" />}
              {!collapsed && (
                <span className="truncate text-sm font-medium">
                  {translateLabel(item.label, item.app_id)}
                </span>
              )}
            </div>
            {!collapsed && hasChildren && (
              <span className="flex-shrink-0 ml-2">
                {openDropdown === getNavItemKey(item) ? (
                  <ChevronDown size={16} />
                ) : (
                  <ChevronRight size={16} />
                )}
              </span>
            )}
          </div>

          {!collapsed && openDropdown === getNavItemKey(item) && hasChildren && (
            <ul className="ml-6 mt-1 space-y-1">
              {item.children.map((child) => {
                const isAdminSettingsOnlyChild = isAdminSettingsOnlyAppId(child.app_id, child.label);
                const allowConfiguredAdminChild =
                  !isAdminSettingsMode &&
                  isAdminSettingsOnlyChild &&
                  isJobRoleConfiguredGroup(item);

                if (!isAdminSettingsMode && isAdminSettingsOnlyChild && !allowConfiguredAdminChild) {
                  return null;
                }

                if (isAdminSettingsMode && !isAdminSettingsOnlyChild) {
                  return null;
                }

                const childPath = getPath(child.app_id, child.label);
                if (!childPath) return null;
                const childAccessLevel = resolveEffectiveAccess(
                  child.app_id,
                  child.access_level || getAccessLevel(child.app_id)
                );
                const ChildIconComponent = getIconComponent(child.app_id, child.label);

                if (!hasViewAccess(childAccessLevel)) return null;

                const requiresExactMatch = isAdminSettingsRouteAppId(child.app_id, child.label);
                const isActiveForAdminRoute = requiresExactMatch
                  ? location.pathname === childPath
                  : undefined;

                return (
                  <li key={child.id} className="mb-1">
                    <NavLink
                      to={childPath}
                      state={navLinkState}
                      end={requiresExactMatch}
                      onMouseEnter={() => prefetchRouteData(child.app_id)}
                      className={({ isActive }) => {
                        const active = requiresExactMatch
                          ? isActiveForAdminRoute
                          : isActive;
                        return `group flex items-center gap-2 px-4 py-2 rounded text-sm ${
                          active
                            ? "bg-[#FFC107] text-white"
                            : "hover:bg-[#143d65] text-white"
                        }`;
                      }}
                      title={translateLabel(child.label, child.app_id)}
                    >
                      {ChildIconComponent && (
                        <ChildIconComponent className="flex-shrink-0" />
                      )}
                      <span className="truncate flex-1 min-w-0">
                        {translateLabel(child.label, child.app_id)}
                      </span>
                    </NavLink>
                  </li>
                );
              })}
            </ul>
          )}
        </li>
      );
    }

    if (!path) {
      return null;
    }

    // Legacy hub: only link when Admin Settings is not a dropdown group.
    if (
      isAdminSettingsHub(item.app_id, item.label) &&
      item.is_group &&
      item.children?.length > 0
    ) {
      return null;
    }

    const accessLevel = resolveEffectiveAccess(
      isAdminSettingsHub(item.app_id, item.label) ? "ADMINSETTINGS" : item.app_id,
      item.access_level || getAccessLevel(item.app_id)
    );
    const IconComponent = getIconComponent(
      isAdminSettingsHub(item.app_id, item.label) ? "ADMINSETTINGS" : item.app_id,
      item.label
    );

    const effectiveAccess = resolveEffectiveAccess(
      item.app_id,
      accessLevel || item.access_level
    );
    if (!hasViewAccess(effectiveAccess)) return null;

    const requiresExactMatch = isAdminSettingsRouteAppId(item.app_id, item.label);
    const isActiveForAdminRoute = requiresExactMatch
      ? location.pathname === path
      : undefined;

    return (
      <li key={getNavItemKey(item)} className="mb-2">
        <NavLink
          to={path}
          state={navLinkState}
          end={requiresExactMatch || resolveNavAppId(item.app_id) === "DASHBOARD"}
          onMouseEnter={() => prefetchRouteData(item.app_id)}
          className={({ isActive }) => {
            const active = requiresExactMatch
              ? isActiveForAdminRoute
              : isActive;
            return `group flex items-center gap-2 px-3 py-2 rounded ${
              active
                ? "bg-[#FFC107] text-white"
                : "hover:bg-[#143d65] text-white"
            }`;
          }}
          title={!collapsed ? translateLabel(item.label, item.app_id) : ""}
        >
          {IconComponent && <IconComponent className="flex-shrink-0" />}
          {!collapsed && (
            <span className="truncate flex-1 min-w-0 text-sm font-medium">
              {translateLabel(item.label, item.app_id)}
            </span>
          )}
        </NavLink>
      </li>
    );
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
              <p className="text-xs mt-1">
                Try logging out and back in. If menus are still missing, run the setup wizard at /setup.
              </p>
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
