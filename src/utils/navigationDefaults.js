import { appIdsMatch } from './accessLevel';

const normalizeNavAppId = (id) =>
  String(id || '').trim().toUpperCase().replace(/\s+/g, '');

/** Preferred Master Data submenu order for System Administrator and synced tenants. */
export const MASTER_DATA_CHILD_ORDER = [
  'ASSETTYPES',
  'BRANCHES',
  'DEPARTMENTS',
  'DEPARTMENTSADMIN',
  'DEPARTMENTSASSET',
  'ROLES',
  'USERS',
  'USERROLES',
  'PRODSERV',
  'VENDORS',
];

/** Preferred Scrap submenu order. */
export const SCRAP_CHILD_ORDER = [
  'SCRAPASSETS',
  'SCRAPMAINTENANCEAPPROVAL',
  'SCRAPSALES',
];

/** Preferred Admin Settings submenu order (audit items). */
export const ADMIN_SETTINGS_CHILD_ORDER = ['AUDITLOGS', 'AUDITLOGCONFIG'];

/** Preferred Inspection submenu order. */
export const INSPECTION_CHILD_ORDER = [
  'INSPECTIONAPPROVAL',
  'INSPECTIONVIEW',
  'INSPECTION',
  'INSPECTIONFREQUENCY',
  'INSPECTIONCHECKLISTS',
  'ASSETTYPECHECKLISTMAPPING',
];

const childOrderRank = (appId, order) => {
  const key = normalizeNavAppId(appId);
  const idx = order.indexOf(key);
  return idx >= 0 ? idx : 1000;
};

const sortChildrenByOrder = (children, order) =>
  [...(children || [])].sort((a, b) => {
    const rankDiff =
      childOrderRank(a.app_id, order) - childOrderRank(b.app_id, order);
    if (rankDiff !== 0) return rankDiff;
    return (a.seq ?? 9999) - (b.seq ?? 9999);
  });

const masterDataOrderRank = (appId) => childOrderRank(appId, MASTER_DATA_CHILD_ORDER);

const sortMasterDataChildren = (children) =>
  [...(children || [])].sort((a, b) => {
    const rankDiff =
      masterDataOrderRank(a.app_id) - masterDataOrderRank(b.app_id);
    if (rankDiff !== 0) return rankDiff;
    return (a.seq ?? 9999) - (b.seq ?? 9999);
  });

const flattenNav = (items, result = []) => {
  for (const item of items) {
    result.push(item);
    if (item.children?.length) flattenNav(item.children, result);
  }
  return result;
};

const isMasterDataGroup = (item) =>
  Boolean(
    item?.is_group &&
      (normalizeNavAppId(item.app_id) === 'MASTERDATA' ||
        String(item.label || '').trim().toLowerCase() === 'master data'),
  );

const isScrapGroup = (item) =>
  Boolean(
    item?.is_group &&
      (normalizeNavAppId(item.app_id) === 'SCRAP' ||
        String(item.label || '').trim().toLowerCase() === 'scrap'),
  );

const isAdminSettingsGroup = (item) =>
  Boolean(
    item?.is_group &&
      (normalizeNavAppId(item.app_id) === 'ADMINSETTINGS' ||
        String(item.label || '').trim().toLowerCase() === 'admin settings'),
  );

const isInspectionGroup = (item) =>
  Boolean(
    item?.is_group &&
      (normalizeNavAppId(item.app_id) === 'INSPECTION' ||
        String(item.label || '').trim().toLowerCase() === 'inspection'),
  );

/** USERS app_id must display as "Users", not "User Roles". */
export const normalizeUsersNavLabels = (items) => {
  if (!Array.isArray(items)) return items;
  return items.map((item) => {
    const next = {
      ...item,
      label:
        normalizeNavAppId(item.app_id) === 'USERS' ? 'Users' : item.label,
    };
    if (item.children?.length) {
      next.children = normalizeUsersNavLabels(item.children);
    }
    return next;
  });
};

/** Ensure Users (USERS) appears under Master Data when the role has access. */
export const ensureUsersInMasterData = (items) => {
  if (!Array.isArray(items) || !items.length) return items;

  const flat = flattenNav(items);
  const usersItem = flat.find(
    (item) => normalizeNavAppId(item.app_id) === 'USERS',
  );
  if (!usersItem) return normalizeUsersNavLabels(items);

  const walk = (nodes) =>
    nodes.map((item) => {
      if (isMasterDataGroup(item)) {
        const children = normalizeUsersNavLabels(item.children || []);
        const hasUsers = children.some(
          (child) => normalizeNavAppId(child.app_id) === 'USERS',
        );
        return {
          ...item,
          children: hasUsers
            ? children
            : [
                ...children,
                {
                  ...usersItem,
                  id: usersItem.id || 'ensure-users',
                  app_id: 'USERS',
                  label: 'Users',
                  is_group: false,
                  children: [],
                },
              ],
        };
      }
      if (item.children?.length) {
        return { ...item, children: walk(item.children) };
      }
      return item;
    });

  return walk(items);
};

/** Sort Master Data submenu items into the product-standard order. */
export const sortMasterDataNavOrder = (items) => {
  if (!Array.isArray(items) || !items.length) return items;

  const walk = (nodes) =>
    nodes.map((item) => {
      if (isMasterDataGroup(item)) {
        return {
          ...item,
          children: sortMasterDataChildren(
            normalizeUsersNavLabels(item.children || []),
          ),
        };
      }
      if (item.children?.length) {
        return { ...item, children: walk(item.children) };
      }
      return item;
    });

  return walk(items);
};

/** Sort Scrap submenu: Assets → Approval → Sales. */
export const sortScrapNavOrder = (items) => {
  if (!Array.isArray(items) || !items.length) return items;

  const walk = (nodes) =>
    nodes.map((item) => {
      if (isScrapGroup(item)) {
        return {
          ...item,
          children: sortChildrenByOrder(item.children || [], SCRAP_CHILD_ORDER),
        };
      }
      if (item.children?.length) {
        return { ...item, children: walk(item.children) };
      }
      return item;
    });

  return walk(items);
};

/** Sort Admin Settings audit items: Audit Logs → Audit Log Config. */
export const sortAdminSettingsNavOrder = (items) => {
  if (!Array.isArray(items) || !items.length) return items;

  const walk = (nodes) =>
    nodes.map((item) => {
      if (isAdminSettingsGroup(item)) {
        return {
          ...item,
          children: sortChildrenByOrder(
            item.children || [],
            ADMIN_SETTINGS_CHILD_ORDER,
          ),
        };
      }
      if (item.children?.length) {
        return { ...item, children: walk(item.children) };
      }
      return item;
    });

  return walk(items);
};

/** Sort Inspection submenu: Approval → List → config items. */
export const sortInspectionNavOrder = (items) => {
  if (!Array.isArray(items) || !items.length) return items;

  const walk = (nodes) =>
    nodes.map((item) => {
      if (isInspectionGroup(item)) {
        return {
          ...item,
          children: sortChildrenByOrder(
            item.children || [],
            INSPECTION_CHILD_ORDER,
          ),
        };
      }
      if (item.children?.length) {
        return { ...item, children: walk(item.children) };
      }
      return item;
    });

  return walk(items);
};

const hasDashboardInNav = (items) => {
  for (const item of items) {
    if (appIdsMatch(item.app_id, 'DASHBOARD')) return true;
    if (item.children?.length && hasDashboardInNav(item.children)) return true;
  }
  return false;
};

/** Ensure Dashboard appears in navigation for every user by default. */
export const ensureDefaultDashboardNav = (navigation) => {
  if (!Array.isArray(navigation)) {
    return navigation;
  }
  if (hasDashboardInNav(navigation)) {
    return navigation;
  }

  return [
    {
      id: 'ensure-dashboard',
      app_id: 'DASHBOARD',
      label: 'Dashboard',
      is_group: false,
      seq: 0,
      access_level: 'A',
      children: [],
    },
    ...navigation,
  ];
};
