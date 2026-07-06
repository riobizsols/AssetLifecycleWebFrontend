const normalizeAppId = (appId) =>
  String(appId || "")
    .trim()
    .replace(/\s+/g, " ")
    .toUpperCase();

/** Approval screens can appear under Approvals and their functional group. */
const APPROVAL_APP_IDS = new Set(
  [
    "MAINTENANCEAPPROVAL",
    "SUPERVISORAPPROVAL",
    "SUPERVISORAPPROVAL_M",
    "SCRAPMAINTENANCEAPPROVAL",
    "INSPECTIONAPPROVAL",
    "VENDORRENEWALAPPROVAL",
    "HR/MANAGERAPPROVAL",
  ].map(normalizeAppId),
);

/** App IDs grouped by application type (from JR001 nav + product areas). */
const APPLICATION_TYPE_APP_IDS = {
  MAINTENANCE: [
    "SUPERVISORAPPROVAL",
    "SUPERVISORAPPROVAL_M",
    "MAINTENANCESCHEDULE",
    "MAINTENANCEAPPROVAL",
    "MAINTENANCECONFIG",
    "MAINTENANCEHISTORY",
    "MAINTENANCECRON",
    "HR/MANAGERAPPROVAL",
  ],
  INSPECTION: [
    "INSPECTIONVIEW",
    "INSPECTIONFREQUENCY",
    "INSPECTIONCHECKLISTS",
    "INSPECTIONAPPROVAL",
    "ASSETTYPECHECKLISTMAPPING",
  ],
  ASSETS: ["ASSETS", "GROUPASSET", "DASHBOARD"],
  ASSET_ASSIGNMENT: [
    "DEPTASSIGNMENT",
    "EMPASSIGNMENT",
    "DEPTASSIGNMENT_M",
    "EMPASSIGNMENT_M",
    "ASSETASSIGNMENT_M",
  ],
  REPORTS: [
    "ASSETLIFECYCLEREPORT",
    "ALCREPORT",
    "ASSETREPORT",
    "AREPORT",
    "ASSETVALUATION",
    "AVREPORT",
    "ASSETWORKFLOWHISTORY",
    "AWFHREPORT",
    "BREAKDOWNHISTORY",
    "BHREPORT",
    "MAINTENANCEHISTORY",
    "MHREPORT",
    "QAAUDITREPORT",
    "SLAREPORT",
    "USAGEBASEDASSET",
  ],
  SCRAP: ["SCRAPSALES", "SCRAPASSETS", "SCRAPMAINTENANCEAPPROVAL"],
  ADMIN_SETTINGS: [
    "AUDITLOGS",
    "AUDITLOGCONFIG",
    "COLUMNACCESSCONFIG",
    "MAINTENANCECONFIG",
    "BULKSERIALNUMBERPRINT",
    "USERROLES",
    "JOBMONITOR",
    "ONETIMECRON",
    "PROPERTIES",
    "BREAKDOWNREASONCODES",
    "TEXTMESSAGES",
  ],
  MASTER_DATA: [
    "ORGANIZATIONS",
    "ASSETTYPES",
    "DEPARTMENTS",
    "DEPARTMENTSADMIN",
    "DEPARTMENTSASSET",
    "BRANCHES",
    "VENDORS",
    "PRODSERV",
    "USERS",
    "ROLES",
    "BULKUPLOAD",
    "COSTCENTERTRANSFER",
    "DATABASESELECTION",
  ],
  CERTIFICATIONS: [
    "CERTIFICATIONS",
    "EMPLOYEE TECH CERTIFICATION",
    "TECHCERTUPLOAD",
  ],
  BREAKDOWNS: [
    "REPORTBREAKDOWN",
    "REPORTBREAKDOWN_M",
    "EMPLOYEE REPORT BREAKDOWN",
    "REOPENEDBREAKDOWNS",
  ],
  WORKORDER: ["WORKORDERMANAGEMENT"],
  SERIAL_PRINT: ["SERIALNUMBERPRINT", "SNOPRINT"],
};

export const APPLICATION_TYPE_OPTIONS = [
  { id: "MAINTENANCE", label: "Maintenance" },
  { id: "INSPECTION", label: "Inspection" },
  { id: "APPROVALS", label: "Approvals" },
  { id: "ASSETS", label: "Assets" },
  { id: "ASSET_ASSIGNMENT", label: "Asset Assignment" },
  { id: "REPORTS", label: "Reports" },
  { id: "SCRAP", label: "Scrap" },
  { id: "ADMIN_SETTINGS", label: "Admin Settings" },
  { id: "MASTER_DATA", label: "Master Data" },
  { id: "CERTIFICATIONS", label: "Certifications" },
  { id: "BREAKDOWNS", label: "Breakdowns" },
  { id: "WORKORDER", label: "Work Order Management" },
  { id: "SERIAL_PRINT", label: "Serial Number Print" },
  { id: "ALL", label: "All" },
];

const typeLookup = new Map();
Object.entries(APPLICATION_TYPE_APP_IDS).forEach(([typeId, appIds]) => {
  appIds.forEach((appId) => {
    const key = normalizeAppId(appId);
    if (!typeLookup.has(key)) typeLookup.set(key, new Set());
    typeLookup.get(key).add(typeId);
  });
});

APPROVAL_APP_IDS.forEach((appId) => {
  if (!typeLookup.has(appId)) typeLookup.set(appId, new Set());
  typeLookup.get(appId).add("APPROVALS");
});

export const getApplicationTypesForApp = (appId) => {
  const types = typeLookup.get(normalizeAppId(appId));
  return types ? [...types] : [];
};

export const filterAppsByApplicationType = (apps, typeId) => {
  if (!typeId || typeId === "ALL") {
    return [...apps].sort((a, b) =>
      String(a.label || a.text || "").localeCompare(
        String(b.label || b.text || ""),
      ),
    );
  }

  return apps
    .filter((app) => getApplicationTypesForApp(app.app_id).includes(typeId))
    .sort((a, b) =>
      String(a.label || a.text || "").localeCompare(
        String(b.label || b.text || ""),
      ),
    );
};

export const getAppDisplayLabel = (app) =>
  String(app?.label || app?.text || app?.app_id || "").trim();
