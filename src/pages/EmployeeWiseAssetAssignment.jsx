import React, { useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import { useLocation } from "react-router-dom";
import AssetAssignmentList from "../components/assetAssignment/AssetAssignmentList";
import { useLanguage } from "../contexts/LanguageContext";
import { useRevalidateOnFocus } from "../hooks/useRevalidateOnFocus";
import { useAssignmentStore } from "../store/useAssignmentStore";
import { showBackendTextToast } from '../utils/errorTranslation';

const EMPTY_LIST = [];

const EmployeeWiseAssetAssignment = () => {
  const { t } = useLanguage();
  const location = useLocation();
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
    if (!selectedDepartment) return;
    fetchEmployeesByDept(selectedDepartment, { revalidate: true }).catch((err) => {
      console.error("Failed to fetch employees", err);
      showBackendTextToast({
        toast,
        tmdId: 'TMD_I18N_EMPLOYEES_FAILEDTOFETCHEMPLOYEES_4CD36E08',
        fallbackText: t('employees.failedToFetchEmployees'),
        type: 'error',
      });
    });
  }, [selectedDepartment, fetchEmployeesByDept, t]);

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
    fetchDepartments({ revalidate: true });
    if (selectedDepartment) {
      fetchEmployeesByDept(selectedDepartment, { revalidate: true });
    }
    if (selectedEmployee) {
      fetchEmpAssignments(selectedEmployee, { revalidate: true });
    }
  });

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
        showDepartmentFilter
        departments={departments}
        selectedDepartment={selectedDepartment}
        onDepartmentSelect={handleDepartmentSelect}
        onDepartmentChange={handleDepartmentSelect}
        departmentsLoading={departmentsLoading}
      />
    </div>
  );
};

export default EmployeeWiseAssetAssignment;
