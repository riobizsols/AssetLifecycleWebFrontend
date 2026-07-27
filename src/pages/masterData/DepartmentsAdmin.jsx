import { showBackendTextToast } from '../../utils/errorTranslation';
import React, { useEffect, useState } from "react";
import API from "../../lib/axios";
import { Maximize, Minimize, Trash2, ChevronDown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import useAuditLog from "../../hooks/useAuditLog";
import { DEPARTMENTS_ADMIN_APP_ID } from "../../constants/departmentsAdminAuditEvents";
import { useLanguage } from "../../contexts/LanguageContext";

const DepartmentsAdmin = () => {
  const [departments, setDepartments] = useState([]);
  const [selectedDept, setSelectedDept] = useState(null);
  const [adminList, setAdminList] = useState([]);
  const [usersToAdd, setUsersToAdd] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);

   const [isMaximized, setIsMaximized] = useState(false);
   const [submitAttempted, setSubmitAttempted] = useState(false);
  
    const toggleMaximize = () => setIsMaximized((prev) => !prev);

  const [searchUser, setSearchUser] = useState("");
  const [searchDept, setSearchDept] = useState("");
  const dropdownUserRef = React.useRef(null);
  const dropdownDeptRef = React.useRef(null);
  const navigate = useNavigate();

  // Initialize audit logging
  const { recordActionByNameWithFetch } = useAuditLog(DEPARTMENTS_ADMIN_APP_ID);
  
  // Language context
  const { t } = useLanguage();

  // Fetch departments
  const fetchDepartments = async () => {
    try {
      const res = await API.get("/admin/departments");
      setDepartments(res.data);
    } catch (err) {
      console.error("Failed to fetch departments", err);
      showBackendTextToast({ toast, tmdId: 'TMD_I18N_DEPARTMENTS_FAILEDTOFETCHDEPARTMENTS_4D03E1C8', fallbackText: 'Failed to fetch departments', type: 'error' });
    }
  };

  // Fetch all admins
  const fetchAllAdmins = async () => {
    try {
      const res = await API.get("/admin/dept-admins");
      setAdminList(res.data);
    } catch (err) {
      console.error("Failed to fetch all admins", err);
      showBackendTextToast({ toast, tmdId: 'TMD_I18N_DEPARTMENTS_FAILEDTOFETCHADMINLIST_20C2EF4C', fallbackText: 'Failed to fetch admin list', type: 'error' });
    }
  };

  // Fetch all users to add as admin (no department condition)
  const fetchUsersToAdd = async () => {
    try {
      console.log("Fetching all users...");
      const res = await API.get("/users/get-users");
      console.log("Users fetched:", res.data);
      // Handle the new API response format with success/data structure
      const usersData = res.data?.data || res.data || [];
      setUsersToAdd(usersData);
    } catch (err) {
      console.error("Failed to fetch users to add", err);
      showBackendTextToast({ toast, tmdId: 'TMD_I18N_DEPARTMENTS_FAILEDTOFETCHUSERSLIST_0CC86913', fallbackText: 'Failed to fetch users list', type: 'error' });
    }
  };

  const handleAddAdmin = async () => {
    setSubmitAttempted(true);
    if (selectedUsers.length === 0 || !selectedDept) {
      showBackendTextToast({ toast, tmdId: 'TMD_I18N_DEPARTMENTS_PLEASESELECTBOTHDEPARTMENTANDUSER_2DFB9B80', fallbackText: 'Please select both department and user', type: 'error' });
      return;
    }
    
    try {
      const selectedDeptName = departments.find(d => d.dept_id === selectedDept)?.text;
      const addedNames = [];
      const skippedNames = [];
      let lastError = null;

      for (const userId of selectedUsers) {
        const selectedUserName = usersToAdd.find(u => u.user_id === userId)?.full_name;
        try {
          await API.post("/admin/dept-admins", {
            dept_id: selectedDept,
            user_id: userId,
          });

          // Log create action
          await recordActionByNameWithFetch('Create', {
            userId: userId,
            userName: selectedUserName,
            deptId: selectedDept,
            deptName: selectedDeptName,
            action: 'Department Admin Created'
          });
          if (selectedUserName) addedNames.push(selectedUserName);
        } catch (err) {
          const errorMessage = err.response?.data?.message || err.response?.data?.error || err.message || "";
          if (String(errorMessage).toLowerCase().includes("already an admin")) {
            if (selectedUserName) skippedNames.push(selectedUserName);
            continue;
          }
          lastError = err;
          break;
        }
      }
      
      fetchAllAdmins();
      setSelectedUsers([]);

      if (addedNames.length > 0) {
        showBackendTextToast({ toast, tmdId: 'TMD_I18N_DEPARTMENTS_ADMINADDEDSUCCESSFULLY_3FB28B41', fallbackText: 'Admin {{userName}} added successfully to {{deptName}}', type: 'success', values: { userName: addedNames.join(', '), deptName: selectedDeptName } });
      }
      if (skippedNames.length > 0 && addedNames.length === 0 && !lastError) {
        showBackendTextToast({
          toast,
          tmdId: 'TMD_FAILED_TO_ADD_DEPARTMENT_ADMIN_A84D5E0E',
          fallbackText: `${t('departments.failedToAddAdmin')}: This user is already an admin for this department`,
          type: 'error',
        });
      }
      if (lastError) {
        const errorMessage = lastError.response?.data?.message || lastError.response?.data?.error || lastError.message || "An error occurred";
        showBackendTextToast({
          toast,
          tmdId: 'TMD_FAILED_TO_ADD_DEPARTMENT_ADMIN_A84D5E0E',
          fallbackText: `${t('departments.failedToAddAdmin')}: ${errorMessage}`,
          type: 'error',
        });
      }
    } catch (err) {
      console.error("Failed to add admin", err);
      const errorMessage = err.response?.data?.message || err.response?.data?.error || err.message || "An error occurred";
      showBackendTextToast({
        toast,
        tmdId: 'TMD_FAILED_TO_ADD_DEPARTMENT_ADMIN_A84D5E0E',
        fallbackText: `${t('departments.failedToAddAdmin')}: ${errorMessage}`,
        type: 'error',
      });
    }
  };

  const handleDelete = (admin) => {
    setUserToDelete(admin);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    try {
      await API.delete("/admin/dept-admins", {
        data: {
          dept_id: userToDelete.dept_id,
          user_id: userToDelete.user_id,
        },
      });
      // Log delete action
      await recordActionByNameWithFetch('Delete', {
        userId: userToDelete.user_id,
        userName: userToDelete.full_name,
        deptId: userToDelete.dept_id,
        deptName: userToDelete.dept_name,
        action: 'Department Admin Removed'
      });

      fetchAllAdmins();
      setShowDeleteModal(false);
      showBackendTextToast({ toast, tmdId: 'TMD_I18N_DEPARTMENTS_ADMINREMOVEDSUCCESSFULLY_59E37C21', fallbackText: 'Admin {{userName}} removed successfully from {{deptName}}', type: 'success', values: { userName: userToDelete.full_name, deptName: userToDelete.dept_name } });
    } catch (err) {
      console.error("Failed to delete admin", err);
      const errorMessage = err.response?.data?.message || err.response?.data?.error || err.message || "An error occurred";
      showBackendTextToast({
        toast,
        tmdId: 'TMD_FAILED_TO_REMOVE_DEPARTMENT_ADMIN_9156E962',
        fallbackText: `${t('departments.failedToRemoveAdmin')}: ${errorMessage}`,
        type: 'error',
      });
    }
  };

  useEffect(() => {
    fetchDepartments();
    fetchAllAdmins();
    fetchUsersToAdd(); // Fetch all users on component mount
  }, []);

  // Helper for invalid field
  const isFieldInvalid = (val) => submitAttempted && (!val || (Array.isArray(val) && val.length === 0));

  const getSelectedUsersLabel = () => {
    if (selectedUsers.length === 0) return t('departments.selectUser');
    const names = selectedUsers
      .map((id) => usersToAdd.find((u) => u.user_id === id)?.full_name)
      .filter(Boolean);
    return names.length > 0 ? names.join(", ") : t('departments.selectUser');
  };

  const toggleUserSelection = (userId) => {
    setSelectedUsers((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  // Handle click outside to close dropdowns
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownUserRef.current && !dropdownUserRef.current.contains(event.target)) {
        dropdownUserRef.current.classList.add("hidden");
        setSearchUser("");
      }
      if (dropdownDeptRef.current && !dropdownDeptRef.current.contains(event.target)) {
        dropdownDeptRef.current.classList.add("hidden");
        setSearchDept("");
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      {/* Department Dropdown */}
      <div className="bg-white rounded shadow mb-4">
        <div className="bg-[#EDF3F7] px-4 py-2 rounded-t text-[#0E2F4B] font-semibold text-sm">
          {t('departments.departmentSelection')}
        </div>
        <div className="p-4 flex gap-4 items-center">
          <div className="flex flex-col w-64">
            <label className="text-sm font-medium mb-1">
              {t('common.department')} <span className="text-red-500">*</span>
            </label>
            <div className="relative w-full">
              <button
                className={`border text-black px-3 py-2 text-sm w-full bg-white focus:outline-none flex justify-between items-center ${isFieldInvalid(selectedDept) ? 'border-red-500' : 'border-gray-300'}`}
                onClick={() => {
                  dropdownDeptRef.current.classList.toggle("hidden");
                }}
                type="button"
              >
                {selectedDept
                  ? departments.find((d) => d.dept_id === selectedDept)?.text || t('departments.selectDepartment')
                  : t('departments.selectDepartment')}
                <ChevronDown className="ml-2 w-4 h-4 text-gray-500" />
              </button>
              {/* Dropdown List */}
              <div
                ref={dropdownDeptRef}
                className="absolute left-0 right-0 mt-1 bg-white border rounded shadow-lg max-h-64 overflow-y-auto z-10 hidden"
                style={{ minWidth: "100%" }}
              >
                {/* Sticky Search Input */}
                <div className="sticky top-0 bg-white px-2 py-2 border-b z-20">
                  <input
                    type="text"
                    className="w-full border px-2 py-1 rounded text-sm"
                    placeholder={t('departments.searchDepartments')}
                    value={searchDept}
                    onChange={e => setSearchDept(e.target.value)}
                    autoFocus
                  />
                </div>
                {/* Filtered Departments */}
                {departments
                  .filter(d => 
                    d.text.toLowerCase().includes(searchDept.toLowerCase()) ||
                    d.dept_id.toLowerCase().includes(searchDept.toLowerCase())
                  )
                  .map((dept) => (
                    <div
                      key={dept.dept_id}
                      className={`px-4 py-2 cursor-pointer hover:bg-gray-100 text-sm ${selectedDept === dept.dept_id ? "bg-gray-200" : ""}`}
                      onClick={() => {
                        setSelectedDept(dept.dept_id);
                        dropdownDeptRef.current.classList.add("hidden");
                        setSearchDept("");
                      }}
                    >
                      <div className="font-medium">{dept.text}</div>
                      <div className="text-xs text-gray-500">ID: {dept.dept_id}</div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Add Admin Section */}
      <div className="bg-white rounded shadow mb-4">
        <div className="bg-[#EDF3F7] px-4 py-2 rounded-t text-[#0E2F4B] font-semibold text-sm">
          {t('departments.addAdmin')}
        </div>
        <div className="p-4 flex gap-4 items-end">
          {/* Custom Searchable Dropdown for Users */}
          <div className="flex flex-col w-64">
            <label className="text-sm font-medium mb-1">
              {t('departments.user')} <span className="text-red-500">*</span>
            </label>
            <div className="relative w-full">
              <button
                className={`border text-black px-3 py-2 text-sm w-full bg-white focus:outline-none flex justify-between items-center ${isFieldInvalid(selectedUsers) ? 'border-red-500' : 'border-gray-300'}`}
                onClick={() => {
                  dropdownUserRef.current.classList.toggle("hidden");
                }}
                type="button"
              >
                <span className="truncate text-left flex-1">{getSelectedUsersLabel()}</span>
                <ChevronDown className="ml-2 w-4 h-4 text-gray-500 flex-shrink-0" />
              </button>
              {/* Dropdown List */}
              <div
                ref={dropdownUserRef}
                className="absolute left-0 right-0 mt-1 bg-white border rounded shadow-lg max-h-64 overflow-y-auto z-10 hidden"
                style={{ minWidth: "100%" }}
              >
                {/* Sticky Search Input */}
                <div className="sticky top-0 bg-white px-2 py-2 border-b z-20">
                  <input
                    type="text"
                    className="w-full border px-2 py-1 rounded text-sm"
                    placeholder={t('departments.searchUsers')}
                    value={searchUser}
                    onChange={e => setSearchUser(e.target.value)}
                    autoFocus
                  />
                </div>
                {/* Filtered Users */}
                {usersToAdd
                  .filter(u => 
                    u.full_name.toLowerCase().includes(searchUser.toLowerCase()) ||
                    u.user_id.toLowerCase().includes(searchUser.toLowerCase())
                  )
                  .map((user) => (
                    <div
                      key={user.user_id}
                      className={`px-4 py-2 cursor-pointer hover:bg-gray-100 text-sm flex items-start gap-2 ${selectedUsers.includes(user.user_id) ? "bg-gray-200" : ""}`}
                      onClick={() => toggleUserSelection(user.user_id)}
                    >
                      <input
                        type="checkbox"
                        className="mt-1 flex-shrink-0"
                        checked={selectedUsers.includes(user.user_id)}
                        onChange={() => toggleUserSelection(user.user_id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div>
                        <div className="font-medium">{user.full_name}</div>
                        <div className="text-xs text-gray-500">ID: {user.user_id}</div>
                      </div>
                    </div>
                  ))}
                {/* Sticky Create New User Option */}
                <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-4 py-2">
                  <button
                    className="w-full text-left text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-2"
                    onClick={() => {
                      dropdownUserRef.current.classList.add("hidden");
                      setSearchUser("");
                      navigate("/master-data/users");
                    }}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    {t('departments.createNewUser')}
                  </button>
                </div>
              </div>
            </div>
          </div>
          <button
            className="bg-[#0E2F4B] text-white px-4 py-2 rounded text-sm disabled:opacity-50"
            onClick={handleAddAdmin}
            disabled={selectedUsers.length === 0 || !selectedDept}
          >
            {t('common.add')}
          </button>
        </div>
      </div>
      {/* Admin List Table */}
      <div
        className={`bg-white rounded shadow transition-all duration-300 ${
          isMaximized ? "fixed inset-0 z-50 p-6 m-6 overflow-auto" : ""
        }`}
      >
        <div className="bg-white rounded shadow">
          <div className="bg-[#EDF3F7] px-4 py-2 rounded-t text-[#0E2F4B] font-semibold text-sm flex items-center justify-between">
            {t('departments.adminList')}
            <button onClick={toggleMaximize}>
              {isMaximized ? (
                <Minimize className="text-[#0E2F4B]" size={18} />
              ) : (
                <Maximize className="text-[#0E2F4B]" size={18} />
              )}
            </button>
          </div>
          <div className="bg-[#0E2F4B] text-white text-sm overflow-hidden">
            <div className="grid grid-cols-3 px-4 py-2 font-semibold border-b-4 border-yellow-400">
              <div>{t('departments.adminName')}</div>
              <div>{t('departments.departmentName')}</div>
              <div className="text-center">{t('common.actions')}</div>
            </div>

            <div
              className={`${isMaximized ? "max-h-[60vh] overflow-y-auto" : ""}`}
            >
              {adminList.map((admin, i) => (
                <div
                  key={`${admin.dept_id}-${admin.user_id}`}
                  className={`grid grid-cols-3 px-4 py-2 items-center border-b ${
                    i % 2 === 0 ? "bg-white" : "bg-gray-100"
                  } text-gray-800`}
                >
                  <div>{admin.full_name}</div>
                  <div>{admin.dept_name}</div>
                  <div className="flex justify-center">
                    <button onClick={() => handleDelete(admin)}>
                      <Trash2 className="text-yellow-500" size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      {/* Delete Modal */}
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
              {t('departments.doYouWantToRemoveFromAdminList', { name: userToDelete?.full_name || userToDelete?.name })}
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
    </div>
  );
};

export default DepartmentsAdmin;
