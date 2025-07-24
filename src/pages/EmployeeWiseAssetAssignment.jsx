import React, { useEffect, useState } from "react";
import API from "../lib/axios";
import { toast } from "react-hot-toast";
import AssetAssignmentList from "../components/assetAssignment/AssetAssignmentList";

const EmployeeWiseAssetAssignment = () => {
  const [departments, setDepartments] = useState([]);
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [assignmentList, setAssignmentList] = useState([]);

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
      toast.error("Failed to fetch departments");
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
      // Using the correct API endpoint for department users
      const res = await API.get(`/admin/dept-users/${deptId}`);
      const formattedEmployees = res.data.map(emp => ({
        id: emp.user_id,
        name: emp.full_name
      }));
      setEmployees(formattedEmployees);
      setSelectedEmployee(null); // Reset selected employee when department changes
    } catch (err) {
      console.error("Failed to fetch employees", err);
      toast.error("Failed to fetch employees");
      setEmployees([]);
      setSelectedEmployee(null);
    }
  };

  // Fetch employee assignments
  const fetchAssignments = async () => {
    try {
      // If we have a selected employee, fetch only their assignments
      const endpoint = selectedEmployee 
        ? `/employee/assets/${selectedEmployee}`
        : "/employee/assets";
      
      const res = await API.get(endpoint);
      setAssignmentList(res.data);
    } catch (err) {
      console.error("Failed to fetch assignments", err);
      toast.error("Failed to fetch asset list");
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

  return (
    <AssetAssignmentList
      title="Employee Assets List"
      entityType="employee"
      entities={employees}
      selectedEntity={selectedEmployee}
      onEntitySelect={setSelectedEmployee}
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
  );
};

export default EmployeeWiseAssetAssignment; 