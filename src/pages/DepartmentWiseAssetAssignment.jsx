import React, { useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import { useLocation } from "react-router-dom";
import AssetAssignmentList from "../components/assetAssignment/AssetAssignmentList";
import { useLanguage } from "../contexts/LanguageContext";
import { useRevalidateOnFocus } from "../hooks/useRevalidateOnFocus";
import { useAssignmentStore } from "../store/useAssignmentStore";
import { showBackendTextToast } from '../utils/errorTranslation';

const EMPTY_LIST = [];

const DepartmentWiseAssetAssignment = () => {
  const { t } = useLanguage();
  const location = useLocation();
  const [selectedDept, setSelectedDept] = useState(() => location.state?.selectedDept || null);

  const departments = useAssignmentStore((s) => s.departments);
  const departmentsLoading = useAssignmentStore((s) => s.departmentsLoading);
  const assignmentsLoading = useAssignmentStore((s) => s.assignmentsLoading);
  const deptAssignmentsMap = useAssignmentStore((s) => s.deptAssignments);

  const assignmentList = useMemo(
    () => (selectedDept ? deptAssignmentsMap[selectedDept] ?? EMPTY_LIST : EMPTY_LIST),
    [deptAssignmentsMap, selectedDept],
  );

  const fetchDepartments = useAssignmentStore((s) => s.fetchDepartments);
  const fetchDeptAssignments = useAssignmentStore((s) => s.fetchDeptAssignments);

  useEffect(() => {
    fetchDepartments({ revalidate: true }).catch((err) => {
      console.error("Failed to fetch departments", err);
      showBackendTextToast({
        toast,
        tmdId: 'TMD_I18N_DEPARTMENTS_FAILEDTOFETCHDEPARTMENTS_4D03E1C8',
        fallbackText: t('departments.failedToFetchDepartments'),
        type: 'error',
      });
    });
  }, [fetchDepartments, t]);

  useEffect(() => {
    if (!selectedDept) return;
    fetchDeptAssignments(selectedDept, { revalidate: true }).catch((err) => {
      console.error("Failed to fetch assignments", err);
      showBackendTextToast({
        toast,
        tmdId: 'TMD_I18N_DEPARTMENTS_FAILEDTOFETCHASSETLIST_2C553FD5',
        fallbackText: t('departments.failedToFetchAssetList'),
        type: 'error',
      });
    });
    useAssignmentStore.getState().prefetchAssignmentHistory({
      type: 'department',
      deptId: selectedDept,
    });
  }, [selectedDept, fetchDeptAssignments, t]);

  useRevalidateOnFocus(() => {
    fetchDepartments({ revalidate: true });
    if (selectedDept) {
      fetchDeptAssignments(selectedDept, { revalidate: true });
    }
  });

  const refreshAssignments = () => {
    if (selectedDept) {
      useAssignmentStore.getState().invalidateAssignmentCache();
      fetchDeptAssignments(selectedDept, { revalidate: true });
    }
  };

  return (
    <AssetAssignmentList
      title={t('departments.departmentAssetsList')}
      entityType="department"
      entities={departments}
      selectedEntity={selectedDept}
      onEntitySelect={setSelectedDept}
      assignmentList={assignmentList}
      fetchAssignments={refreshAssignments}
      assignmentsLoading={assignmentsLoading}
      entitiesLoading={departmentsLoading}
    />
  );
};

export default DepartmentWiseAssetAssignment;
