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
      toast.error(t('departments.failedToFetchDepartments'));
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
        name: emp.employee_name || emp.name,
        employee_int_id: emp.employee_int_id
      }));
      setEmployees(formattedEmployees);
      setSelectedEmployee(null); // Reset selected employee when department changes
    } catch (err) {
      console.error("Failed to fetch employees", err);
      toast.error(t('employees.failedToFetchEmployees'));
      setEmployees([]);
      setSelectedEmployee(null);
    }
  };

  // Fetch employee assignments
  const fetchAssignments = async () => {
    try {
      if (selectedEmployee) {
        // Use the new endpoint to fetch active asset assignments for the selected employee
        const res = await API.get(`/asset-assignments/employee/${selectedEmployee}/active`);
        setAssignmentList(res.data.data || []);
        console.log('Assignments for selected employee:', res.data.data || []);
      } else {
        setAssignmentList([]);
      }
    } catch (err) {
      console.error("Failed to fetch assignments", err);
      toast.error(t('departments.failedToFetchAssetList'));
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
    try {
      const res = await API.get(`/employees/${employeeId}`);
      console.log('Employee details response:', res.data);
      setSelectedEmployeeIntId(res.data.emp_int_id); // <-- use emp_int_id
    } catch (err) {
      toast.error("Failed to fetch employee details");
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