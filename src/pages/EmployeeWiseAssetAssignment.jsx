import { showBackendTextToast } from '../utils/errorTranslation';
import React, { useEffect, useState } from "react";
import API from "../lib/axios";
import { toast } from "react-hot-toast";
import AssetAssignmentList from "../components/assetAssignment/AssetAssignmentList";
import AssetAssignmentHistory from "../components/assetAssignment/AssetAssignmentHistory";
import { useLanguage } from "../contexts/LanguageContext";

const EmployeeWiseAssetAssignment = () => {
  const { t } = useLanguage();
  const [departments, setDepartments] = useState([]);
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [selectedEmployeeIntId, setSelectedEmployeeIntId] = useState(null);
  const [assignmentList, setAssignmentList] = useState([]);
  const [showHistory, setShowHistory] = useState(false);

  // Fetch departments
  const fetchDepartments = async () => {
    try {
      const res = await API.get("/admin/departments");
      const formattedDepts = res.data.map(dept => ({
        id: dept.dept_id,
        name: dept.text
      }));
      setDepartments(formattedDepts);
    } catch (err) {
      console.error("Failed to fetch departments", err);
      showBackendTextToast({ toast, tmdId: 'TMD_I18N_DEPARTMENTS_FAILEDTOFETCHDEPARTMENTS_4D03E1C8', fallbackText: t('departments.failedToFetchDepartments'), type: 'error' });
    }
  };

  // Fetch employees by department
  const fetchEmployeesByDepartment = async (deptId) => {
    if (!deptId) {
      setEmployees([]);
      setSelectedEmployee(null);
      return;
    }

    try {
      // Use the correct endpoint to fetch employees by department
      const res = await API.get(`/employees/department/${deptId}`);
      const formattedEmployees = res.data.map(emp => ({
        id: emp.employee_id,
        name: emp.employee_name || emp.name || emp.full_name,
        employee_int_id: emp.emp_int_id || emp.employee_int_id // Support both field names
      }));
      setEmployees(formattedEmployees);
      setSelectedEmployee(null); // Reset selected employee when department changes
    } catch (err) {
      console.error("Failed to fetch employees", err);
      showBackendTextToast({ toast, tmdId: 'TMD_I18N_EMPLOYEES_FAILEDTOFETCHEMPLOYEES_4CD36E08', fallbackText: t('employees.failedToFetchEmployees'), type: 'error' });
      setEmployees([]);
      setSelectedEmployee(null);
    }
  };

  // Fetch employee assignments — then enrich each row with GET /assets/:id like AssetAssignmentHistory
  // so the Asset Name column matches the history popup (same source as tblAssets via getAssetWithDetails).
  const fetchAssignments = async () => {
    try {
      if (selectedEmployee) {
        const res = await API.get(`/asset-assignments/employee/${selectedEmployee}/active`);
        let rows = res.data.data || [];

        const uniqueAssetIds = [...new Set(rows.map((item) => item.asset_id).filter(Boolean))];
        const assetMap = {};
        for (const asset_id of uniqueAssetIds) {
          try {
            const assetRes = await API.get(`/assets/${asset_id}`, {
              params: { context: 'EMPASSIGNMENT' },
            });
            assetMap[asset_id] = assetRes.data;
          } catch {
            assetMap[asset_id] = null;
          }
        }

        rows = rows.map((row) => {
          const data = assetMap[row.asset_id];
          if (!data) return row;
          return {
            ...row,
            description: data.description ?? row.description,
            asset_text: data.text ?? row.asset_text,
          };
        });

        setAssignmentList(rows);
      } else {
        setAssignmentList([]);
      }
    } catch (err) {
      console.error("Failed to fetch assignments", err);
      showBackendTextToast({ toast, tmdId: 'TMD_I18N_DEPARTMENTS_FAILEDTOFETCHASSETLIST_2C553FD5', fallbackText: t('departments.failedToFetchAssetList'), type: 'error' });
    }
  };
                  
  // Handle asset unassignment
  const handleUnassign = async (item) => {
    try {
      await API.delete("/employee/assets", {
        data: {
          user_id: item.user_id,
          asset_id: item.asset_id,
        },
      });
    } catch (err) {
      throw err;
    }
  };

  // Handle employee selection and fetch employee_int_id
  const handleEmployeeSelect = async (employeeId) => {
    setSelectedEmployee(employeeId);
    
    // First, try to get emp_int_id from the employees array (already fetched)
    const employeeFromArray = employees.find(emp => emp.id === employeeId);
    if (employeeFromArray && employeeFromArray.employee_int_id) {
      console.log('Using emp_int_id from employees array:', employeeFromArray.employee_int_id);
      setSelectedEmployeeIntId(employeeFromArray.employee_int_id);
      return; // Exit early if we found it in the array
    }
    
    // Fallback: fetch from API if not found in array
    try {
      const res = await API.get(`/employees/${employeeId}`);
      console.log('Employee details response:', res.data);
      const empIntId = res.data.emp_int_id || res.data.employee_int_id;
      if (empIntId) {
        setSelectedEmployeeIntId(empIntId);
      } else {
        console.error('emp_int_id not found in API response:', res.data);
        showBackendTextToast({ toast, tmdId: 'TMD_EMPLOYEE_INTERNAL_ID_NOT_FOUND_PLEASE_TRY_SELECTING__5C9BB4D1', fallbackText: 'Employee internal ID not found. Please try selecting the employee again.', type: 'error' });
        setSelectedEmployeeIntId(null);
      }
    } catch (err) {
      console.error("Failed to fetch employee details:", err);
      showBackendTextToast({ toast, tmdId: 'TMD_FAILED_TO_FETCH_EMPLOYEE_DETAILS_6F4B5B48', fallbackText: 'Failed to fetch employee details', type: 'error' });
      setSelectedEmployeeIntId(null);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  // Fetch assignments when selected employee changes
  useEffect(() => {
    if (selectedEmployee) {
      fetchAssignments();
    } else {
      setAssignmentList([]);
    }
  }, [selectedEmployee]);

  // Find the selected employee object
  const selectedEmployeeObj = employees.find(emp => emp.id === selectedEmployee);

  return (
      <div className="bg-white rounded shadow mb-4">
        <AssetAssignmentList
          title={t('employees.employeeAssetsList')}
          entityType="employee"
          entities={employees}
          selectedEntity={selectedEmployee}
          selectedEntityIntId={selectedEmployeeIntId}
          onEntitySelect={handleEmployeeSelect}
          onDelete={handleUnassign}
          assignmentList={assignmentList}
          fetchAssignments={fetchAssignments}
          // Department filter props
          showDepartmentFilter={true}
          departments={departments}
          selectedDepartment={selectedDepartment}
          onDepartmentSelect={setSelectedDepartment}
          onDepartmentChange={fetchEmployeesByDepartment}
        />
        {showHistory && (
          <AssetAssignmentHistory
            onClose={() => setShowHistory(false)}
          />
        )}
      </div>
  );
};

export default EmployeeWiseAssetAssignment; 