/** View access: full (A), read-only (D), or legacy view (V) from DB migrations. */
export const hasViewAccess = (accessLevel) =>
  accessLevel === "A" || accessLevel === "D" || accessLevel === "V";

export const hasEditAccess = (accessLevel) => accessLevel === "A";

export const normalizeAppId = (appId) =>
  appId == null ? "" : String(appId).trim().replace(/\s+/g, " ").toUpperCase();

export const appIdsMatch = (left, right) =>
  normalizeAppId(left) === normalizeAppId(right);

/**
 * Child app IDs inherit view access from parent nav apps when not assigned directly.
 * Chain example: EMPLOYEE REPORT BREAKDOWN → REPORTBREAKDOWN
 */
export const ACCESS_INHERITANCE = {
  "EMPLOYEE REPORT BREAKDOWN": "REPORTBREAKDOWN",
  EMPLOYEEREPORTBREAKDOWN: "REPORTBREAKDOWN",
  REOPENEDBREAKDOWNS: "BREAKDOWNHISTORY",
  USERROLES: "ADMINSETTINGS",
  BULKSERIALNUMBERPRINT: "ADMINSETTINGS",
  COLUMNACCESSCONFIG: "ADMINSETTINGS",
  MAINTENANCECONFIG: "ADMINSETTINGS",
  PROPERTIES: "ADMINSETTINGS",
  BREAKDOWNREASONCODES: "ADMINSETTINGS",
  ONETIMECRON: "ADMINSETTINGS",
  JOBMONITOR: "ADMINSETTINGS",
  AUDITLOGCONFIG: "ADMINSETTINGS",
  TEXTMESSAGES: "ADMINSETTINGS",
};

const accessRank = (level) => {
  if (level === "A") return 3;
  if (level === "D") return 2;
  if (level === "V") return 1;
  return 0;
};

/** Walk inheritance chain and return the first valid access level found. */
export function resolveInheritedAccess(lookup, appId) {
  const visited = new Set();
  let current = normalizeAppId(appId);

  while (current && !visited.has(current)) {
    visited.add(current);
    const level = lookup(current);
    if (hasViewAccess(level)) return level;

    const parent = ACCESS_INHERITANCE[current];
    if (!parent) break;
    current = normalizeAppId(parent);
  }

  return null;
}

/** Build a map of app_id → best access_level from flattened nav rows. */
export function buildFlatAccessMap(flatItems) {
  const map = new Map();

  for (const item of flatItems) {
    const key = normalizeAppId(item.app_id);
    const existing = map.get(key);
    if (!existing || accessRank(item.access_level) > accessRank(existing)) {
      map.set(key, item.access_level);
    }
  }

  return map;
}
