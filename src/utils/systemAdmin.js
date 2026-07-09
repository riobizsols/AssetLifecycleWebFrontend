export const SYSTEM_ADMIN_JOB_ROLE_ID = 'JR001';

export function collectUserJobRoleIds(user, roles = []) {
  const ids = (roles || [])
    .map((role) => role?.job_role_id || role)
    .filter(Boolean);

  if (user?.job_role_id && !ids.includes(user.job_role_id)) {
    ids.push(user.job_role_id);
  }

  return ids;
}

export function userHasSystemAdminRole(user, roles = []) {
  return collectUserJobRoleIds(user, roles).includes(SYSTEM_ADMIN_JOB_ROLE_ID);
}
