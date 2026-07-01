const ROLE_ID_TO_KEY = {
  JR001: "systemAdministrator",
};

const ROLE_NAME_TO_KEY = {
  "System Administrator": "systemAdministrator",
  "IT Support Specialist": "itSupportSpecialist",
  "IT Asset Supervisor": "itAssetSupervisor",
  "Asset Supervisor": "assetSupervisor",
  "Maintenance Supervisor": "maintenanceSupervisor",
  "HR Manager": "hrManager",
  "Department Manager": "departmentManager",
  "Asset Manager": "assetManager",
  "Chief Officer": "chiefOfficer",
  "IT Manager": "itManager",
  "No Role": "noRole",
  Role: "role",
};

/**
 * Translate a job role display name using i18n keys under jobRoleNames.*
 */
export const translateJobRoleName = (t, jobRoleName, jobRoleId) => {
  const key =
    (jobRoleId && ROLE_ID_TO_KEY[jobRoleId]) ||
    (jobRoleName && ROLE_NAME_TO_KEY[jobRoleName]);

  if (key) {
    return t(`jobRoleNames.${key}`, { defaultValue: jobRoleName });
  }

  if (jobRoleName) return jobRoleName;
  if (jobRoleId) return jobRoleId;
  return t("jobRoleNames.role");
};

export const getAppLocale = (language) =>
  String(language || "").toLowerCase().startsWith("de") ? "de-DE" : undefined;
