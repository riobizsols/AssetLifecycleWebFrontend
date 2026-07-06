import { appIdsMatch } from './accessLevel';

const normalizeNavAppId = (id) =>
  String(id || '').trim().toUpperCase().replace(/\s+/g, '');

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
