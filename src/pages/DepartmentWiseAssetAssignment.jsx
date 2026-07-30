import React, { useEffect, useMemo, useState, useCallback } from "react";
import { toast } from "react-hot-toast";
import { useLocation } from "react-router-dom";
import AssetAssignmentList from "../components/assetAssignment/AssetAssignmentList";
import { useLanguage } from "../contexts/LanguageContext";
import { useRevalidateOnFocus } from "../hooks/useRevalidateOnFocus";
import { useAssignmentStore } from "../store/useAssignmentStore";
import { useAuthStore } from "../store/useAuthStore";
import { useAcmContextStore } from "../store/useAcmContextStore";
import { useAcmScope } from "../hooks/useAcmScope";
import { showBackendTextToast } from '../utils/errorTranslation';
import API from "../lib/axios";

const EMPTY_LIST = [];

const DepartmentWiseAssetAssignment = () => {
  const { t } = useLanguage();
  const location = useLocation();
  const user = useAuthStore((state) => state.user);
  const storeBranchId = useAuthStore((state) => state.branch_id);
  const appliedBranchId = useAcmContextStore((s) => s.appliedBranchId);
  const { canChangeBranch, loading: acmLoading } = useAcmScope();

  const [branches, setBranches] = useState([]);
  const [branchesLoading, setBranchesLoading] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState(
    () => location.state?.selectedBranch || appliedBranchId || storeBranchId || null
  );
  const [selectedDept, setSelectedDept] = useState(() => location.state?.selectedDept || null);

  const departments = useAssignmentStore((s) => s.departments);
  const departmentsLoading = useAssignmentStore((s) => s.departmentsLoading);
  const assignmentsLoading = useAssignmentStore((s) => s.assignmentsLoading);
  const deptAssignmentsMap = useAssignmentStore((s) => s.deptAssignments);

  const filteredDepartments = useMemo(() => {
    if (!selectedBranch) return EMPTY_LIST;
    return (departments || []).filter(
      (d) => !d.branch_id || d.branch_id === selectedBranch
    );
  }, [departments, selectedBranch]);

  const assignmentList = useMemo(
    () => (selectedDept ? deptAssignmentsMap[selectedDept] ?? EMPTY_LIST : EMPTY_LIST),
    [deptAssignmentsMap, selectedDept],
  );

  const fetchDepartments = useAssignmentStore((s) => s.fetchDepartments);
  const fetchDeptAssignments = useAssignmentStore((s) => s.fetchDeptAssignments);

  const fetchBranches = useCallback(async () => {
    setBranchesLoading(true);
    try {
      // Backend already scopes /branches by tblACM (+ ACM header selection)
      const res = await API.get("/branches");
      const rows = Array.isArray(res.data) ? res.data : [];
      const active = rows.filter((b) => b.int_status === 1 || b.int_status === undefined);
      setBranches(active);

      setSelectedBranch((prev) => {
        const preferred =
          location.state?.selectedBranch ||
          appliedBranchId ||
          prev ||
          storeBranchId ||
          null;
        if (preferred && active.some((b) => b.branch_id === preferred)) {
          return preferred;
        }
        return active[0]?.branch_id || null;
      });
    } catch (err) {
      console.error("Failed to fetch branches", err);
      setBranches([]);
    } finally {
      setBranchesLoading(false);
    }
  }, [storeBranchId, location.state?.selectedBranch, appliedBranchId]);

  // Keep branch in sync when ACM context is saved
  useEffect(() => {
    if (!appliedBranchId) return;
    setSelectedBranch((prev) => (prev === appliedBranchId ? prev : appliedBranchId));
    setSelectedDept(null);
  }, [appliedBranchId]);

  useEffect(() => {
    fetchBranches();
    useAssignmentStore.getState().invalidateAssignmentCache();
    fetchDepartments({ revalidate: true, force: true }).catch((err) => {
      console.error("Failed to fetch departments", err);
      showBackendTextToast({
        toast,
        tmdId: 'TMD_I18N_DEPARTMENTS_FAILEDTOFETCHDEPARTMENTS_4D03E1C8',
        fallbackText: t('departments.failedToFetchDepartments'),
        type: 'error',
      });
    });
  }, [fetchBranches, fetchDepartments, t]);

  useEffect(() => {
    if (!selectedDept) return;
    const stillValid = filteredDepartments.some((d) => d.id === selectedDept);
    if (!stillValid) {
      setSelectedDept(null);
      return;
    }
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
  }, [selectedDept, filteredDepartments, fetchDeptAssignments, t]);

  useRevalidateOnFocus(() => {
    fetchBranches();
    fetchDepartments({ revalidate: true });
    if (selectedDept) {
      fetchDeptAssignments(selectedDept, { revalidate: true });
    }
  });

  const handleBranchSelect = (branchId) => {
    setSelectedBranch(branchId || null);
    setSelectedDept(null);
  };

  const refreshAssignments = () => {
    if (selectedDept) {
      useAssignmentStore.getState().invalidateAssignmentCache();
      fetchDeptAssignments(selectedDept, { revalidate: true });
    }
  };

  // If ACM saved a branch, lock the picker to that branch
  const branchLocked = Boolean(appliedBranchId) || !canChangeBranch;

  return (
    <AssetAssignmentList
      title={t('departments.departmentAssetsList')}
      entityType="department"
      entities={filteredDepartments}
      selectedEntity={selectedDept}
      onEntitySelect={setSelectedDept}
      assignmentList={assignmentList}
      fetchAssignments={refreshAssignments}
      assignmentsLoading={assignmentsLoading}
      entitiesLoading={departmentsLoading}
      branches={branches}
      selectedBranch={selectedBranch}
      onBranchSelect={handleBranchSelect}
      branchesLoading={branchesLoading || acmLoading}
      branchLocked={branchLocked}
    />
  );
};

export default DepartmentWiseAssetAssignment;
