import { useState, useEffect } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import API from '../lib/axios';

/**
 * Hook to get column access configuration for the current user's job roles
 * @param {string} tableName - The table name (e.g., 'tblAssets')
 * @returns {Object} - { columnAccess: Map<fieldName, accessLevel>, loading: boolean }
 */
const useColumnAccess = (tableName) => {
  const [columnAccess, setColumnAccess] = useState(new Map());
  const [loading, setLoading] = useState(true);
  const roles = useAuthStore((state) => state.roles) || [];
  const legacyJobRoleId = useAuthStore((state) => state.job_role_id);
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    const fetchColumnAccess = async () => {
      if (!tableName) {
        setLoading(false);
        return;
      }

      try {
        // Get all job role IDs for the current user
        const jobRoleIds = roles.map(role => role.job_role_id);
        if (legacyJobRoleId && !jobRoleIds.includes(legacyJobRoleId)) {
          jobRoleIds.push(legacyJobRoleId);
        }

        if (jobRoleIds.length === 0) {
          // No job roles, default to AUTH (full access)
          setColumnAccess(new Map());
          setLoading(false);
          return;
        }

        // Fetch column access for all job roles
        // We'll get the most restrictive access level for each column
        const accessMap = new Map();

        console.log(`[useColumnAccess] Fetching column access for jobRoleIds:`, jobRoleIds, `tableName:`, tableName, `orgId:`, user?.org_id);

        for (const jobRoleId of jobRoleIds) {
          try {
            const response = await API.get('/column-access-config', {
              params: {
                jobRoleId,
                tableName,
              },
            });

            console.log(`[useColumnAccess] Fetched configs for jobRoleId: ${jobRoleId}, tableName: ${tableName}`, response.data);

            if (response.data.success && response.data.data) {
              response.data.data.forEach((config) => {
                const fieldName = config.field_name;
                const accessLevel = config.access_level;

                console.log(`[useColumnAccess] Processing config: ${fieldName} = ${accessLevel}`);

                // If column already has an access level, use the more restrictive one
                // NONE < DISPLAY < AUTH (default)
                if (!accessMap.has(fieldName)) {
                  accessMap.set(fieldName, accessLevel);
                } else {
                  const currentAccess = accessMap.get(fieldName);
                  // NONE is most restrictive
                  if (accessLevel === 'NONE') {
                    accessMap.set(fieldName, 'NONE');
                  } else if (accessLevel === 'DISPLAY' && currentAccess !== 'NONE') {
                    accessMap.set(fieldName, 'DISPLAY');
                  }
                  // AUTH is default, so we don't need to set it
                }
              });
            }
          } catch (error) {
            console.error(`Error fetching column access for job role ${jobRoleId}:`, error);
            // Continue with other job roles
          }
        }

        console.log(`[useColumnAccess] Final access map:`, Array.from(accessMap.entries()));

        setColumnAccess(accessMap);
      } catch (error) {
        console.error('Error fetching column access:', error);
        // On error, default to AUTH (full access)
        setColumnAccess(new Map());
      } finally {
        setLoading(false);
      }
    };

    fetchColumnAccess();
  }, [tableName, roles, legacyJobRoleId]);

  /**
   * Get access level for a specific column
   * @param {string} fieldName - The field/column name
   * @returns {string} - 'AUTH' (default), 'DISPLAY', or 'NONE'
   */
  const getAccessLevel = (fieldName) => {
    return columnAccess.get(fieldName) || 'AUTH';
  };

  /**
   * Check if a column should be visible
   * @param {string} fieldName - The field/column name
   * @returns {boolean} - true if column should be visible
   */
  const isVisible = (fieldName) => {
    // While loading, return false to prevent flash of all columns
    if (loading) {
      return false;
    }
    const accessLevel = getAccessLevel(fieldName);
    const visible = accessLevel !== 'NONE';
    // Only log if it's NONE to reduce console noise
    if (accessLevel === 'NONE') {
      console.log(`[useColumnAccess] isVisible(${fieldName}): accessLevel=${accessLevel}, visible=${visible}`);
    }
    return visible;
  };

  /**
   * Check if a column is read-only
   * @param {string} fieldName - The field/column name
   * @returns {boolean} - true if column is read-only
   */
  const isReadOnly = (fieldName) => {
    return getAccessLevel(fieldName) === 'DISPLAY';
  };

  return {
    columnAccess,
    loading,
    getAccessLevel,
    isVisible,
    isReadOnly,
  };
};

export default useColumnAccess;

