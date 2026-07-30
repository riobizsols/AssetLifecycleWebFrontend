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

function dedupeDepartments(rows) {
  const seen = new Set();
  return (rows || []).filter((d) => {
    const id = String(d?.id || '');
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

const EmployeeWiseAssetAssignment = () => {
  const { t } = useLanguage();
  const location = useLocation();
  const storeBranchId = useAuthStore((state) => state.branch_id);
  const appliedOrgId = useAcmContextStore((s) => s.appliedOrgId);
  const appliedBranchId = useAcmContextStore((s) => s.appliedBranchId);
  const appliedDeptId = useAcmContextStore((s) => s.appliedDeptId);
  const { canChangeBranch, loading: acmLoading } = useAcmScope();

  const [branches, setBranches] = useState([]);
  const [branchesLoading, setBranchesLoading] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState(
    () => location.state?.selectedBranch || appliedBranchId || storeBranchId || null
  );
  const [selectedDepartment, setSelectedDepartment] = useState(
    () => location.state?.selectedDepartment || appliedDeptId || null
  );
  const [selectedEmployee, setSelectedEmployee] = useState(
    () => location.state?.selectedEmployee || null
  );
  const [selectedEmployeeIntId, setSelectedEmployeeIntId] = useState(
    () => location.state?.selectedEmployeeIntId || null
  );
  const [branchDepartments, setBranchDepartments] = useState([]);
  const [branchDepartmentsLoading, setBranchDepartmentsLoading] = useState(false);

  const departments = useAssignmentStore((s) => s.departments);
  const departmentsLoading = useAssignmentStore((s) => s.departmentsLoading);
  const employeesLoading = useAssignmentStore((s) => s.employeesLoading);
  const assignmentsLoading = useAssignmentStore((s) => s.assignmentsLoading);
  const employeesByDeptMap = useAssignmentStore((s) => s.employeesByDept);
  const empAssignmentsMap = useAssignmentStore((s) => s.empAssignments);

  const filteredDepartments = useMemo(() => {
    const branch = selectedBranch != null ? String(selectedBranch) : '';
    const lockedDept = appliedDeptId ? String(appliedDeptId) : '';

    let list = [];
    if (branchDepartments.length > 0) {
      list = branchDepartments;
    } else if (branch) {
      list = (departments || []).filter((d) => {
        if (lockedDept && String(d.id) === lockedDept) return true;
        if (d.branch_id == null || d.branch_id === '') return false;
        return String(d.branch_id) === branch;
      });
    } else if (lockedDept) {
      list = (departments || []).filter((d) => String(d.id) === lockedDept);
    }

    if (lockedDept) {
      list = list.filter((d) => String(d.id) === lockedDept);
      if (list.length === 0) {
        const fromStore = (departments || []).find((d) => String(d.id) === lockedDept);
        if (fromStore) {
          list = [{ ...fromStore, branch_id: fromStore.branch_id || selectedBranch }];
        } else {
          list = [{ id: appliedDeptId, name: appliedDeptId, branch_id: selectedBranch }];
        }
      }
    }

    return dedupeDepartments(list);
  }, [branchDepartments, departments, selectedBranch, appliedDeptId]);

  const employees = useMemo(
    () => (selectedDepartment ? employeesByDeptMap[selectedDepartment] ?? EMPTY_LIST : EMPTY_LIST),
    [employeesByDeptMap, selectedDepartment],
  );

  const assignmentList = useMemo(
    () => (selectedEmployee ? empAssignmentsMap[selectedEmployee] ?? EMPTY_LIST : EMPTY_LIST),
    [empAssignmentsMap, selectedEmployee],
  );

  const fetchDepartments = useAssignmentStore((s) => s.fetchDepartments);
  const fetchEmployeesByDept = useAssignmentStore((s) => s.fetchEmployeesByDept);
  const fetchEmpAssignments = useAssignmentStore((s) => s.fetchEmpAssignments);

  const loadBranchDepartments = useCallback(async (branchId) => {
    if (!branchId) {
      setBranchDepartments([]);
      return;
    }
    setBranchDepartmentsLoading(true);
    try {
      const params = { branch_id: branchId };
      if (appliedOrgId) params.org_id = appliedOrgId;
      const res = await API.get('/acm/options', { params });
      const rows = Array.isArray(res.data?.departments) ? res.data.departments : [];
      setBranchDepartments(
        dedupeDepartments(
          rows.map((d) => ({
            id: d.dept_id,
            name: d.text,
            branch_id: d.branch_id || branchId,
          }))
        )
      );
    } catch (err) {
      console.error('Failed to fetch branch departments', err);
      setBranchDepartments([]);
    } finally {
      setBranchDepartmentsLoading(false);
    }
  }, [appliedOrgId]);

  const fetchBranches = useCallback(async () => {
    setBranchesLoading(true);
    try {
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
        if (preferred && active.some((b) => String(b.branch_id) === String(preferred))) {
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

  const refreshDepartmentData = useCallback(() => {
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
  }, [fetchDepartments, t]);

  useEffect(() => {
    if (!appliedBranchId) return;
    setSelectedBranch((prev) =>
      String(prev) === String(appliedBranchId) ? prev : appliedBranchId
    );
    if (!appliedDeptId) {
      setSelectedDepartment(null);
      setSelectedEmployee(null);
      setSelectedEmployeeIntId(null);
    }
  }, [appliedBranchId, appliedDeptId]);

  useEffect(() => {
    fetchBranches();
    refreshDepartmentData();
  }, [fetchBranches, refreshDepartmentData]);

  useEffect(() => {
    loadBranchDepartments(selectedBranch);
  }, [selectedBranch, appliedOrgId, appliedBranchId, appliedDeptId, loadBranchDepartments]);

  // Auto-select ACM department (or the only available option)
  useEffect(() => {
    if (!filteredDepartments.length) {
      if (selectedDepartment) {
        setSelectedDepartment(null);
        setSelectedEmployee(null);
        setSelectedEmployeeIntId(null);
      }
      return;
    }

    if (appliedDeptId) {
      const match = filteredDepartments.find(
        (d) => String(d.id) === String(appliedDeptId)
      );
      if (match && String(selectedDepartment) !== String(match.id)) {
        setSelectedDepartment(match.id);
        setSelectedEmployee(null);
        setSelectedEmployeeIntId(null);
      }
      return;
    }

    if (filteredDepartments.length === 1) {
      const onlyId = filteredDepartments[0].id;
      if (String(selectedDepartment) !== String(onlyId)) {
        setSelectedDepartment(onlyId);
        setSelectedEmployee(null);
        setSelectedEmployeeIntId(null);
      }
      return;
    }

    if (
      selectedDepartment &&
      !filteredDepartments.some((d) => String(d.id) === String(selectedDepartment))
    ) {
      setSelectedDepartment(null);
      setSelectedEmployee(null);
      setSelectedEmployeeIntId(null);
    }
  }, [filteredDepartments, appliedDeptId, selectedDepartment]);

  useEffect(() => {
    const onAcmChanged = () => {
      fetchBranches();
      refreshDepartmentData();
      const branch =
        useAcmContextStore.getState().appliedBranchId || selectedBranch;
      loadBranchDepartments(branch);
    };
    window.addEventListener('acm-context-changed', onAcmChanged);
    return () => window.removeEventListener('acm-context-changed', onAcmChanged);
  }, [fetchBranches, refreshDepartmentData, loadBranchDepartments, selectedBranch]);

  useEffect(() => {
    if (!selectedDepartment) return;
    const stillValid = filteredDepartments.some(
      (d) => String(d.id) === String(selectedDepartment)
    );
    if (!stillValid) {
      setSelectedDepartment(null);
      setSelectedEmployee(null);
      setSelectedEmployeeIntId(null);
      return;
    }
    fetchEmployeesByDept(selectedDepartment, { revalidate: true }).catch((err) => {
      console.error("Failed to fetch employees", err);
      showBackendTextToast({
        toast,
        tmdId: 'TMD_I18N_EMPLOYEES_FAILEDTOFETCHEMPLOYEES_4CD36E08',
        fallbackText: t('employees.failedToFetchEmployees'),
        type: 'error',
      });
    });
  }, [selectedDepartment, filteredDepartments, fetchEmployeesByDept, t]);

  useEffect(() => {
    if (!selectedEmployee) return;
    fetchEmpAssignments(selectedEmployee, { revalidate: true }).catch((err) => {
      console.error("Failed to fetch assignments", err);
      showBackendTextToast({
        toast,
        tmdId: 'TMD_I18N_DEPARTMENTS_FAILEDTOFETCHASSETLIST_2C553FD5',
        fallbackText: t('departments.failedToFetchAssetList'),
        type: 'error',
      });
    });
    if (selectedEmployeeIntId) {
      useAssignmentStore.getState().prefetchAssignmentHistory({
        type: 'employee',
        employeeIntId: selectedEmployeeIntId,
      });
    }
  }, [selectedEmployee, selectedEmployeeIntId, fetchEmpAssignments, t]);

  useRevalidateOnFocus(() => {
    fetchBranches();
    refreshDepartmentData();
    loadBranchDepartments(selectedBranch);
    if (selectedDepartment) {
      fetchEmployeesByDept(selectedDepartment, { revalidate: true });
    }
    if (selectedEmployee) {
      fetchEmpAssignments(selectedEmployee, { revalidate: true });
    }
  });

  const handleBranchSelect = (branchId) => {
    setSelectedBranch(branchId || null);
    if (!appliedDeptId) {
      setSelectedDepartment(null);
    }
    setSelectedEmployee(null);
    setSelectedEmployeeIntId(null);
  };

  const handleDepartmentSelect = (deptId) => {
    setSelectedDepartment(deptId);
    setSelectedEmployee(null);
    setSelectedEmployeeIntId(null);
  };

  const handleEmployeeSelect = (employeeId) => {
    setSelectedEmployee(employeeId);
    const employeeFromArray = employees.find((emp) => emp.id === employeeId);
    if (employeeFromArray?.employee_int_id) {
      setSelectedEmployeeIntId(employeeFromArray.employee_int_id);
    } else {
      setSelectedEmployeeIntId(null);
    }
  };

  const refreshAssignments = () => {
    if (selectedEmployee) {
      useAssignmentStore.getState().invalidateAssignmentCache();
      fetchEmpAssignments(selectedEmployee, { revalidate: true });
    }
  };

  const branchLocked = Boolean(appliedBranchId) || !canChangeBranch;
  const departmentLocked = Boolean(appliedDeptId);

  return (
    <div className="bg-white rounded shadow mb-4">
      <AssetAssignmentList
        title={t('employees.employeeAssetsList')}
        entityType="employee"
        entities={employees}
        selectedEntity={selectedEmployee}
        selectedEntityIntId={selectedEmployeeIntId}
        onEntitySelect={handleEmployeeSelect}
        assignmentList={assignmentList}
        fetchAssignments={refreshAssignments}
        assignmentsLoading={assignmentsLoading}
        entitiesLoading={employeesLoading}
        branches={branches}
        selectedBranch={selectedBranch}
        onBranchSelect={handleBranchSelect}
        branchesLoading={branchesLoading || acmLoading}
        branchLocked={branchLocked}
        showDepartmentFilter
        departments={filteredDepartments}
        selectedDepartment={selectedDepartment}
        onDepartmentSelect={handleDepartmentSelect}
        onDepartmentChange={handleDepartmentSelect}
        departmentsLoading={departmentsLoading || branchDepartmentsLoading}
        departmentLocked={departmentLocked}
      />
    </div>
  );
};

export default EmployeeWiseAssetAssignment;
