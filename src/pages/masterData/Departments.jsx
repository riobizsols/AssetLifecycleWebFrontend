import React, { useEffect, useState } from "react";
import { Maximize, Minimize, Pencil, Trash2 } from "lucide-react";
import API from "../../lib/axios";
import { toast } from "react-hot-toast";
import { useNavigation } from "../../hooks/useNavigation";
import useAuditLog from "../../hooks/useAuditLog";
import { DEPARTMENTS_APP_ID } from "../../constants/departmentsAuditEvents";
import { useLanguage } from "../../contexts/LanguageContext";

const Departments = () => {
  const [departments, setDepartments] = useState([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedDept, setSelectedDept] = useState(null);
  const [editName, setEditName] = useState("");
  const [nextDeptId, setNextDeptId] = useState("");
  const [newDeptName, setNewDeptName] = useState("");
  const [isMaximized, setIsMaximized] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  
  // Access control
  const { hasEditAccess } = useNavigation();
  const canEdit = hasEditAccess('DEPARTMENTS');

  // Initialize audit logging
  const { recordActionByNameWithFetch } = useAuditLog(DEPARTMENTS_APP_ID);
  
  // Language context
  const { t } = useLanguage();

  const toggleMaximize = () => setIsMaximized((prev) => !prev);
  useEffect(() => {
    document.body.style.overflow = isMaximized ? "hidden" : "auto";
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [isMaximized]);

    const fetchDepartments = async () => {
      try {
      const res = await API.get("/departments");
      setDepartments(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Error fetching departments:", err);
      setDepartments([]);
    }
  };

  const fetchNextDeptId = async () => {
    try {
      console.log("Fetching next department ID...");
      const res = await API.get("/ids/next-dept-id");
      console.log("API response:", res.data);
      setNextDeptId(res.data.nextDeptId);
    } catch (err) {
      console.error("Error fetching next department ID:", err);
      console.error("Error details:", err.response?.data);
      // Set a fallback value if API fails
      setNextDeptId("DPT001");
    }
  };

  useEffect(() => {
    fetchDepartments();
    fetchNextDeptId();
  }, []);

  const handleCreate = async () => {
    setSubmitAttempted(true);
    if (!newDeptName.trim()) {
      toast.error(t('departments.departmentNameRequired'));
      return;
    }
    try {
      const response = await API.post("/departments", { text: newDeptName.trim() });
      
      // Log create action
      await recordActionByNameWithFetch('Create', {
        deptId: response.data?.dept_id || nextDeptId,
        deptName: newDeptName.trim(),
        action: 'Department Created'
      });
      
      setNewDeptName("");
      fetchDepartments();
      fetchNextDeptId();
      toast.success(t('departments.departmentCreatedSuccessfully', { name: newDeptName }));
      setSubmitAttempted(false);
    } catch (err) {
      console.error("Error creating department:", err);
      const errorMessage = err.response?.data?.message || err.message || "An error occurred";
      toast.error(`${t('departments.failedToCreateDepartment')}: ${errorMessage}`);
    }
  };

  const handleDelete = (dept) => {
    setSelectedDept(dept);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    try {
      await API.delete("/departments", {
        data: {
          departments: [
            { org_id: selectedDept.org_id, dept_id: selectedDept.dept_id },
          ],
        },
      });
      // Log delete action
      await recordActionByNameWithFetch('Delete', {
        deptId: selectedDept.dept_id,
        deptName: selectedDept.text,
        orgId: selectedDept.org_id,
        action: 'Department Deleted'
      });

      setShowDeleteModal(false);
      fetchDepartments();
      fetchNextDeptId();
      toast.success(t('departments.departmentDeletedSuccessfully', { name: selectedDept.text }));
    } catch (err) {
      console.error("Error deleting department:", err);
      
      // Handle specific foreign key constraint errors
      if (err.response?.data?.error === "Cannot delete department") {
        const hint = err.response?.data?.hint || "";
        toast.error(
          `${err.response?.data?.message || t('departments.cannotDeleteDepartment')}. ${hint}`,
          {
            duration: 6000,
            style: {
              borderRadius: '8px',
              background: '#7F1D1D',
              color: '#fff',
            },
          }
        );
      } else {
        const errorMessage = err.response?.data?.message || err.message || "An error occurred";
        toast.error(`${t('departments.failedToDeleteDepartment')}: ${errorMessage}`);
      }
    }
  };

  const handleEdit = (dept) => {
    setSelectedDept(dept);
    setEditName(dept.text);
    setShowEditModal(true);
    setSubmitAttempted(false);
  };

  const confirmUpdate = async () => {
    setSubmitAttempted(true);
    if (!editName.trim()) {
      toast.error(t('departments.departmentNameRequired'));
      return;
    }
    try {
      await API.put("/departments", {
        dept_id: selectedDept.dept_id,
        text: editName.trim(),
      });
      
      // Log update action
      await recordActionByNameWithFetch('Update', {
        deptId: selectedDept.dept_id,
        deptName: editName.trim(),
        orgId: selectedDept.org_id,
        action: 'Department Updated'
      });
      
      setShowEditModal(false);
      fetchDepartments();
      toast.success(t('departments.departmentUpdatedSuccessfully', { name: editName }));
      setSubmitAttempted(false);
    } catch (err) {
      console.error("Error updating department:", err);
      const errorMessage = err.response?.data?.message || err.message || "An error occurred";
      toast.error(`${t('departments.failedToUpdateDepartment')}: ${errorMessage}`);
    }
  };

  // Helper for invalid field
  const isFieldInvalid = (val) => submitAttempted && !val.trim();

  return (
    <div className="flex">
      <div className="flex-1 p-6 bg-gray-100 relative">
        {/* Add Form - Only show for users with edit access */}
        {canEdit && (
          <div className="bg-white rounded shadow mb-6">
            <div className="bg-[#EDF3F7] px-4 py-2 rounded-t text-[#0E2F4B] font-semibold text-sm">
              {t('departments.addModifyDepartments')}
            </div>
          <div className="p-4 flex gap-4 items-end">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('departments.departmentId')}</label>
              <input
                className="border px-3 py-2 rounded w-64 text-sm bg-gray-50 text-gray-700 font-medium"
                placeholder={t('departments.departmentId')}
                value={nextDeptId || t('departments.loading')}
                disabled
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('departments.departmentName')} <span className="text-red-500">*</span>
              </label>
              <input
                className={`border px-3 py-2 rounded w-64 text-sm ${isFieldInvalid(newDeptName) ? 'border-red-500' : 'border-gray-300'}`}
                placeholder={t('departments.departmentName')}
                value={newDeptName}
                onChange={(e) => setNewDeptName(e.target.value)}
              />
            </div>
            <button
              className="bg-[#0E2F4B] text-white px-4 py-2 rounded text-sm h-10"
              onClick={handleCreate}
            >
              {t('common.add')}
            </button>
          </div>
        </div>
        )}

        {/* Department List */}
        <div
          className={`bg-white rounded shadow transition-all duration-300 ${
            isMaximized ? "fixed inset-0 z-50 p-6 m-6 overflow-auto" : ""
          }`}
        >
          <div className="bg-white rounded shadow">
            <div className="bg-[#EDF3F7] px-4 py-2 rounded-t text-[#0E2F4B] font-semibold text-sm flex items-center justify-between">
              {t('departments.departmentList')}
              <button onClick={toggleMaximize}>
                {isMaximized ? (
                  <Minimize className="text-[#0E2F4B]" size={18} />
                ) : (
                  <Maximize className="text-[#0E2F4B]" size={18} />
                )}
              </button>
            </div>

            <div className="bg-[#0E2F4B] text-white text-sm">
              <div className={`grid px-4 py-2 font-semibold border-b-4 border-yellow-400 ${canEdit ? 'grid-cols-3' : 'grid-cols-2'}`}>
                <div>{t('departments.departmentId')}</div>
                <div>{t('departments.departmentName')}</div>
                {canEdit && <div className="text-center">{t('common.actions')}</div>}
              </div>

              <div
                className={`${
                  isMaximized ? "max-h-[60vh] overflow-y-auto" : ""
                }`}
              >
                {departments.map((dept, i) => (
                  <div
                    key={dept.dept_id}
                    className={`grid px-4 py-2 items-center border-b ${canEdit ? 'grid-cols-3' : 'grid-cols-2'} ${
                      i % 2 === 0 ? "bg-white" : "bg-gray-100"
                    } text-gray-800`}
                  >
                    <div>{dept.dept_id}</div>
                    <div>{dept.text}</div>
                    {canEdit && (
                      <div className="flex justify-center gap-4">
                        <button onClick={() => handleEdit(dept)}>
                          <Pencil className="text-[#0E2F4B]" size={18} />
                        </button>
                        <button onClick={() => handleDelete(dept)}>
                          <Trash2 className="text-yellow-500" size={18} />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Modals (unchanged) */}
        {showDeleteModal && (
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white w-[500px] rounded shadow-lg">
              <div className="bg-[#003b6f] text-white font-semibold px-6 py-3 flex justify-between items-center rounded-t">
                <span>{t('departments.confirmDelete')}</span>
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="text-yellow-400 text-xl font-bold"
                >
                  ×
                </button>
              </div>
              <div className="h-[3px] bg-yellow-400" />
              <div className="px-6 py-6 text-center text-gray-800 text-sm">
                {t('departments.doYouWantToDeleteDepartment')}{" "}
                <strong>"{selectedDept?.text}"</strong>?
              </div>
              <div className="flex justify-end gap-3 px-6 pb-6">
                <button
                  className="bg-gray-300 hover:bg-gray-400 text-gray-700 text-sm font-medium py-1.5 px-5 rounded"
                  onClick={() => setShowDeleteModal(false)}
                >
                  {t('departments.close')}
                </button>
                <button
                  className="bg-yellow-400 hover:bg-yellow-500 text-white text-sm font-medium py-1.5 px-5 rounded"
                  onClick={confirmDelete}
                >
                  {t('common.delete')}
                </button>
              </div>
            </div>
          </div>
        )}

        {showEditModal && (
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white w-[500px] rounded shadow-lg">
              <div className="bg-[#003b6f] text-white font-semibold px-6 py-3 flex justify-between items-center rounded-t">
                <span>{t('departments.updateDepartment')}</span>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="text-yellow-400 text-xl font-bold"
                >
                  ×
                </button>
              </div>
              <div className="h-[3px] bg-yellow-400" />
              <div className="px-6 py-6 space-y-4">
                <div>
                  <label className="text-sm font-medium">{t('departments.departmentId')}</label>
                  <input
                    value={selectedDept?.dept_id}
                    className="border px-3 py-2 rounded w-full mt-1 bg-gray-100"
                    disabled
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1">
                    {t('departments.departmentName')} <span className="text-red-500">*</span>
                  </label>
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className={`border px-3 py-2 rounded w-full mt-1 ${isFieldInvalid(editName) ? 'border-red-500' : 'border-gray-300'}`}
                  />
                </div>
                <div className="flex justify-end gap-4 mt-6">
                  <button
                    className="bg-gray-300 px-4 py-1 rounded"
                    onClick={() => setShowEditModal(false)}
                  >
                    {t('departments.close')}
                  </button>
                  <button
                    className="bg-yellow-400 px-4 py-1 rounded"
                    onClick={confirmUpdate}
                  >
                    {t('common.update')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Departments;
