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

const EmployeeWiseAssetAssignment = () => {
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
  const [selectedDepartment, setSelectedDepartment] = useState(
    () => location.state?.selectedDepartment || null
  );
  const [selectedEmployee, setSelectedEmployee] = useState(
    () => location.state?.selectedEmployee || null
  );
  const [selectedEmployeeIntId, setSelectedEmployeeIntId] = useState(
    () => location.state?.selectedEmployeeIntId || null
  );

  const departments = useAssignmentStore((s) => s.departments);
  const departmentsLoading = useAssignmentStore((s) => s.departmentsLoading);
  const employeesLoading = useAssignmentStore((s) => s.employeesLoading);
  const assignmentsLoading = useAssignmentStore((s) => s.assignmentsLoading);
  const employeesByDeptMap = useAssignmentStore((s) => s.employeesByDept);
  const empAssignmentsMap = useAssignmentStore((s) => s.empAssignments);

  const filteredDepartments = useMemo(() => {
    if (!selectedBranch) return EMPTY_LIST;
    return (departments || []).filter(
      (d) => !d.branch_id || d.branch_id === selectedBranch
    );
  }, [departments, selectedBranch]);

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

  useEffect(() => {
    if (!appliedBranchId) return;
    setSelectedBranch((prev) => (prev === appliedBranchId ? prev : appliedBranchId));
    setSelectedDepartment(null);
    setSelectedEmployee(null);
    setSelectedEmployeeIntId(null);
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
    if (!selectedDepartment) return;
    const stillValid = filteredDepartments.some((d) => d.id === selectedDepartment);
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
    fetchDepartments({ revalidate: true });
    if (selectedDepartment) {
      fetchEmployeesByDept(selectedDepartment, { revalidate: true });
    }
    if (selectedEmployee) {
      fetchEmpAssignments(selectedEmployee, { revalidate: true });
    }
  });

  const handleBranchSelect = (branchId) => {
    setSelectedBranch(branchId || null);
    setSelectedDepartment(null);
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
        branchLocked={Boolean(appliedBranchId) || !canChangeBranch}
        showDepartmentFilter
        departments={filteredDepartments}
        selectedDepartment={selectedDepartment}
        onDepartmentSelect={handleDepartmentSelect}
        onDepartmentChange={handleDepartmentSelect}
        departmentsLoading={departmentsLoading}
      />
    </div>
  );
};

export default EmployeeWiseAssetAssignment;
