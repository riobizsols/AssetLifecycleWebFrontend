/**
 * Breadcrumb labels for /adminsettings/configuration and common "from" paths.
 * Prefixes are matched longest-first.
 */

export function shouldShowAdminSettingsBreadcrumb(location, adminFrom) {
  if (!adminFrom?.pathname) return false;
  const norm = (loc) => `${loc.pathname}${loc.search || ""}`;
  const cur = { pathname: location.pathname, search: location.search || "" };
  if (norm(adminFrom) === norm(cur)) return false;
  return cur.pathname.startsWith("/adminsettings/configuration");
}

/**
 * @param {string} pathname
 * @param {(key: string) => string} t
 */
export function getAdminSettingsBreadcrumbLabel(pathname, t) {
  if (!pathname) return "";
  const p = pathname.replace(/\/$/, "") || "/";
  const rules = [
    [
      "/adminsettings/configuration/job-roles/create-navigation",
      () => t("adminSettingsBreadcrumb.createNavigation"),
    ],
    [
      "/adminsettings/configuration/job-roles/update-navigation",
      () => t("adminSettingsBreadcrumb.updateNavigation"),
    ],
    ["/adminsettings/configuration/one-time-cron", () => t("navigation.oneTimeCron")],
    ["/adminsettings/configuration/data-config", () => t("columnAccessConfig.breadcrumbCurrent")],
    [
      "/adminsettings/configuration/bulk-serial-number-print",
      () => t("columnAccessConfig.breadcrumbBulkSerialPrint"),
    ],
    [
      "/adminsettings/configuration/maintenance-config",
      () => t("columnAccessConfig.breadcrumbMaintenanceConfig"),
    ],
    ["/adminsettings/configuration/job-roles", () => t("columnAccessConfig.breadcrumbJobRoles")],
    ["/adminsettings/configuration/properties", () => t("masterDataTitles.properties")],
    [
      "/adminsettings/configuration/breakdown-reason-codes",
      () => t("masterDataTitles.breakdownReasonCodes"),
    ],
    ["/adminsettings/configuration", () => t("columnAccessConfig.breadcrumbConfigurationHub")],
    ["/master-data/job-roles", () => t("columnAccessConfig.breadcrumbJobRoles")],
    ["/admin-settings-view", () => t("navigation.adminSettings")],
    ["/serial-number-print", () => t("navigation.serialNumberPrint")],
    ["/bulk-serial-number-print", () => t("columnAccessConfig.breadcrumbBulkSerialPrint")],
    ["/dashboard", () => t("navigation.dashboard")],
    ["/assets", () => t("navigation.assets")],
  ];
  for (const [prefix, labelFn] of rules) {
    if (p === prefix || p.startsWith(`${prefix}/`)) return labelFn();
  }
  return "";
}
