import { showBackendTextToast } from '../utils/errorTranslation';
import React, { useEffect, useState } from "react";
import API from "../lib/axios";
import { toast } from "react-hot-toast";
import AssetAssignmentList from "../components/assetAssignment/AssetAssignmentList";
import { useLanguage } from "../contexts/LanguageContext";

const DepartmentWiseAssetAssignment = () => {
  const { t } = useLanguage();
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
      showBackendTextToast({ toast, tmdId: 'TMD_I18N_DEPARTMENTS_FAILEDTOFETCHDEPARTMENTS_4D03E1C8', fallbackText: t('departments.failedToFetchDepartments'), type: 'error' });
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
      showBackendTextToast({ toast, tmdId: 'TMD_I18N_DEPARTMENTS_FAILEDTOFETCHASSETLIST_2C553FD5', fallbackText: t('departments.failedToFetchAssetList'), type: 'error' });
      setAssignmentList([]);
    } finally {
      setLoading(false);
    }
  };

  // Handle asset unassignment (this is now handled in AssetAssignmentList component)
  const handleUnassign = async () => {
    // This function is no longer used as unassignment is handled in AssetAssignmentList
    // The audit logging is now handled in the confirmDelete function of AssetAssignmentList
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
      title={t('departments.departmentAssetsList')}
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