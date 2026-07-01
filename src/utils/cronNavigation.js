/**
 * Resolve the cron admin page the user is allowed to open (dashboard widget "view details").
 */
export function getCronDetailPath(hasAccess) {
  if (typeof hasAccess !== 'function') return null;
  if (hasAccess('CRONMANAGEMENT')) return '/cron-management';
  if (hasAccess('JOBMONITOR') || hasAccess('ADMINSETTINGS')) {
    return '/adminsettings/configuration/job-monitor';
  }
  if (hasAccess('ONETIMECRON')) return '/adminsettings/configuration/one-time-cron';
  return null;
}
