import React, { useEffect, useState } from "react";
import API from "../lib/axios";
import { toast } from "react-hot-toast";
import AssetAssignmentList from "../components/assetAssignment/AssetAssignmentList";

const DepartmentWiseAssetAssignment = () => {
  const [departments, setDepartments] = useState([]);
  const [selectedDept, setSelectedDept] = useState(null);
  const [assignmentList, setAssignmentList] = useState([]);
  const [loading, setLoading] = useState(false);

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

  // Fetch assignments for selected department
  const fetchAssignments = async (deptId) => {
    if (!deptId) {
      setAssignmentList([]);
      return;
    }
    setLoading(true);
    try {
      const res = await API.get(`/asset-assignments/department/${deptId}/assignments`);
      setAssignmentList(res.data.assignedAssets || []);
    } catch (err) {
      console.error("Failed to fetch assignments", err);
      toast.error("Failed to fetch asset list");
      setAssignmentList([]);
    } finally {
      setLoading(false);
    }
  };

  // Handle asset unassignment
  const handleUnassign = async (item) => {
    try {
      await API.delete("/admin/dept-assets", {
        data: {
          dept_id: item.dept_id,
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

  useEffect(() => {
    if (selectedDept) {
      fetchAssignments(selectedDept);
    } else {
      setAssignmentList([]);
    }
  }, [selectedDept]);

  return (
    <AssetAssignmentList
      title="Department Assets List"
      entityType="department"
      entities={departments}
      selectedEntity={selectedDept}
      onEntitySelect={setSelectedDept}
      onDelete={handleUnassign}
      assignmentList={assignmentList}
      fetchAssignments={() => fetchAssignments(selectedDept)}
      loadingDeptAssignments={loading}
    />
  );
};

export default DepartmentWiseAssetAssignment;