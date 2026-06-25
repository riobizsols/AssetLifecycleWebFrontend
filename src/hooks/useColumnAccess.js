import { useState, useEffect } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import API from '../lib/axios';
import { buildCacheKey, fetchWithCache, peekCache } from '../utils/apiCache';

const COLUMN_ACCESS_TTL_MS = 10 * 60 * 1000;

const useColumnAccess = (tableName) => {
  const roles = useAuthStore((state) => state.roles) || [];
  const legacyJobRoleId = useAuthStore((state) => state.job_role_id);
  const user = useAuthStore((state) => state.user);

  const jobRoleIds = [...roles.map((role) => role.job_role_id)];
  if (legacyJobRoleId && !jobRoleIds.includes(legacyJobRoleId)) {
    jobRoleIds.push(legacyJobRoleId);
  }

  const cacheKey = buildCacheKey([
    'column-access',
    tableName,
    user?.org_id,
    jobRoleIds.sort().join(','),
  ]);

  const cachedMap = peekCache(cacheKey, COLUMN_ACCESS_TTL_MS);
  const [columnAccess, setColumnAccess] = useState(() => {
    if (!cachedMap) return new Map();
    return new Map(Object.entries(cachedMap));
  });
  const [loading, setLoading] = useState(!cachedMap);

  useEffect(() => {
    const fetchColumnAccess = async () => {
      if (!tableName) {
        setLoading(false);
        return;
      }

      if (jobRoleIds.length === 0) {
        setColumnAccess(new Map());
        setLoading(false);
        return;
      }

      const cached = peekCache(cacheKey, COLUMN_ACCESS_TTL_MS);
      if (cached) {
        setColumnAccess(new Map(Object.entries(cached)));
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        const accessMap = new Map();

        for (const jobRoleId of jobRoleIds) {
          try {
            const response = await API.get('/column-access-config', {
              params: { jobRoleId, tableName },
            });

            if (response.data.success && response.data.data) {
              response.data.data.forEach((config) => {
                const fieldName = config.field_name;
                const accessLevel = config.access_level;

                if (!accessMap.has(fieldName)) {
                  accessMap.set(fieldName, accessLevel);
                } else {
                  const currentAccess = accessMap.get(fieldName);
                  if (accessLevel === 'NONE') {
                    accessMap.set(fieldName, 'NONE');
                  } else if (accessLevel === 'DISPLAY' && currentAccess !== 'NONE') {
                    accessMap.set(fieldName, 'DISPLAY');
                  }
                }
              });
            }
          } catch (error) {
            console.error(`Error fetching column access for job role ${jobRoleId}:`, error);
          }
        }

        const serializable = Object.fromEntries(accessMap.entries());
        await fetchWithCache(
          cacheKey,
          async () => serializable,
          { ttlMs: COLUMN_ACCESS_TTL_MS },
        );

        setColumnAccess(accessMap);
      } catch (error) {
        console.error('Error fetching column access:', error);
        setColumnAccess(new Map());
      } finally {
        setLoading(false);
      }
    };

    fetchColumnAccess();
  }, [tableName, cacheKey, jobRoleIds.join(',')]);

  const getAccessLevel = (fieldName) => columnAccess.get(fieldName) || 'AUTH';

  const isVisible = (fieldName) => {
    if (loading) return false;
    return getAccessLevel(fieldName) !== 'NONE';
  };

  const isReadOnly = (fieldName) => getAccessLevel(fieldName) === 'DISPLAY';

  return {
    columnAccess,
    loading,
    getAccessLevel,
    isVisible,
    isReadOnly,
  };
};

export default useColumnAccess;
