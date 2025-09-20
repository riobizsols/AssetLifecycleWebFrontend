import { useEffect, useState, useCallback } from "react";
import ContentBox from "../../components/ContentBox";
import CustomTable from "../../components/CustomTable";
import { filterData } from "../../utils/filterData";
import { exportToExcel } from "../../utils/exportToExcel";
import { useNavigate } from "react-router-dom";
import API from "../../lib/axios";
import { toast } from "react-hot-toast";
import DeleteConfirmModal from "../../components/DeleteConfirmModal";
import { useNavigation } from "../../hooks/useNavigation";
import useAuditLog from "../../hooks/useAuditLog";
import { USERS_APP_ID } from "../../constants/usersAuditEvents";
import { useLanguage } from "../../contexts/LanguageContext";

const Users = () => {
  const navigate = useNavigate();
  const [data, setData] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [filterValues, setFilterValues] = useState({
    columnFilters: [],
    fromDate: "",
    toDate: ""
  });
  const [selectedRows, setSelectedRows] = useState([]);
  const [sortConfig, setSortConfig] = useState({
    sorts: []
  });
  
  // Access control
  const { hasEditAccess } = useNavigation();
  const canEdit = hasEditAccess('USERS');

  // Initialize audit logging
  const { recordActionByNameWithFetch } = useAuditLog(USERS_APP_ID);
  
  // Language context
  const { t } = useLanguage();
  
  // State for edit modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  const [columns] = useState([
    { label: t('users.userID'), name: "user_id", visible: true },
    { label: t('users.fullName'), name: "full_name", visible: true },
    { label: t('users.email'), name: "email", visible: true },
    { label: t('users.mobileNumber'), name: "phone", visible: true },
    { label: t('users.department'), name: "dept_name", visible: true },
    { label: t('users.role'), name: "job_role_id", visible: true },
    { label: t('users.isActive'), name: "int_status", visible: true },
    { label: t('users.lastAccessed'), name: "last_accessed", visible: true },
    { label: t('users.timeZone'), name: "time_zone", visible: false },
    { label: t('users.dateFormat'), name: "date_format", visible: false },
    { label: t('users.language'), name: "language_code", visible: false },
    { label: t('users.extID'), name: "ext_id", visible: false },
    { label: t('users.organizationID'), name: "org_id", visible: false },
    { label: t('users.password'), name: "password", visible: false },
    { label: t('users.createdBy'), name: "created_by", visible: false },
    { label: t('users.createdOn'), name: "created_on", visible: false },
    { label: t('users.changedBy'), name: "changed_by", visible: false },
    { label: t('users.changedOn'), name: "changed_on", visible: false },
    { label: t('users.resetToken'), name: "reset_token", visible: false },
    { label: t('users.resetTokenExpiry'), name: "reset_token_expiry", visible: false }
  ]);

  // Fetch departments
  const fetchDepartments = useCallback(async () => {
    try {
      const res = await API.get("/admin/departments");
      setDepartments(res.data);
    } catch (err) {
      console.error("Failed to fetch departments", err);
      toast.error(t('users.failedToFetchDepartments'));
    }
  }, [t]);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await API.get("/users/get-users");
        const formattedData = response.data.map(item => ({
          ...item,
          int_status: item.int_status === 1 ? t('users.active') : t('users.inactive'),
          created_on: item.created_on ? new Date(item.created_on).toLocaleString() : '',
          changed_on: item.changed_on ? new Date(item.changed_on).toLocaleString() : '',
          last_accessed: item.last_accessed ? new Date(item.last_accessed).toLocaleString() : '',
          dept_name: departments.find(d => d.dept_id === item.dept_id)?.text || t('users.notAssigned')
        }));
        setData(formattedData);
      } catch (error) {
        console.error("Error fetching users:", error);
        toast.error(t('users.failedToFetchUsers'));
      }
    };
    fetchUsers();
  }, [departments, t]);

  useEffect(() => {
    fetchDepartments();
  }, [fetchDepartments]);

  const handleSort = (column) => {
    setSortConfig(prevConfig => {
      const { sorts } = prevConfig;
      const existingSort = sorts.find(s => s.column === column);
      
      if (!existingSort) {
        // First click - add ascending sort
        return {
          sorts: [...sorts, { column, direction: 'asc', order: sorts.length + 1 }]
        };
      } else if (existingSort.direction === 'asc') {
        // Second click - change to descending
        return {
          sorts: sorts.map(s => 
            s.column === column 
              ? { ...s, direction: 'desc' }
              : s
          )
        };
      } else {
        // Third click - remove sort
        return {
          sorts: sorts.filter(s => s.column !== column).map((s, idx) => ({
            ...s,
            order: idx + 1
          }))
        };
      }
    });
  };

  const sortData = (data) => {
    if (!sortConfig.sorts.length) return data;

    return [...data].sort((a, b) => {
      for (const { column, direction } of sortConfig.sorts) {
        const aValue = a[column];
        const bValue = b[column];

        if (aValue == null) return 1;
        if (bValue == null) return -1;

        if (!isNaN(aValue) && !isNaN(bValue)) {
          const diff = direction === 'asc' ? aValue - bValue : bValue - aValue;
          if (diff !== 0) return diff;
        } else {
          const diff = direction === 'asc' 
            ? String(aValue).localeCompare(String(bValue))
            : String(bValue).localeCompare(String(aValue));
          if (diff !== 0) return diff;
        }
      }
      return 0;
    });
  };

  const handleFilterChange = (filterType, value) => {
    setFilterValues(prev => {
      if (filterType === 'columnFilters') {
        return {
          ...prev,
          columnFilters: value
        };
      } else if (filterType === 'fromDate' || filterType === 'toDate') {
        return {
          ...prev,
          [filterType]: value
        };
      } else {
        return {
          ...prev,
          [filterType]: value
        };
      }
    });
  };

  const handleDelete = async () => {
    if (selectedRows.length === 0) {
      toast.error(t('users.pleaseSelectUsersToDelete'), {
        duration: 3000,
        style: { backgroundColor: '#FEE2E2', color: '#DC2626' }
      });
      return false;
    }

    // Show loading toast
    const loadingToast = toast.loading(t('users.deletingSelectedUsers'));

    try {
            const response = await API.delete("/users/delete-users", {
        data: { user_ids: selectedRows }
      }).catch(error => {
        console.log('Delete error response:', error.response?.data);
        // Handle foreign key constraint errors
        if (error.response?.data?.code === '23503' || 
            (error.response?.data?.error && error.response?.data?.error.includes('foreign key constraint'))) {
            const detail = error.response.data.detail;
            const table = error.response.data.table;
                          const userId = detail.match(/\((.*?)\)/)?.[1] || 'user';

              // Get user details for better error message
              const user = data.find(u => u.user_id === userId);
              const userName = user ? user.full_name : userId;

              let dependencies = [];

              switch(table) {
                case 'tblDeptAdmins':
                  dependencies.push({
                    role: t('users.departmentAdministrator'),
                    location: t('users.departmentManagement'),
                    action: t('users.goToDepartmentSettings'),
                    impact: t('users.currentlyManagingDepartment'),
                    severity: t('users.critical'),
                    icon: "🔐"
                  });
                  break;
                case 'tblAssets':
                  dependencies.push({
                    role: t('users.assetOwnerCustodian'),
                    location: t('users.assetManagement'),
                    action: t('users.goToAssetsReassign'),
                    impact: t('users.responsibleForAssets'),
                    severity: t('users.high'),
                    icon: "📦"
                  });
                  break;
                case 'tblDeptAssets':
                  dependencies.push({
                    role: t('users.departmentAssetManager'),
                    location: t('users.departmentAssets'),
                    action: t('users.accessDepartmentAssets'),
                    impact: t('users.managingDepartmentalAssets'),
                    severity: t('users.high'),
                    icon: "📋"
                  });
                  break;
                case 'tblVendors':
                  dependencies.push({
                    role: t('users.vendorPointOfContact'),
                    location: t('users.vendorManagement'),
                    action: t('users.openVendorDetails'),
                    impact: t('users.listedAsVendorContact'),
                    severity: t('users.medium'),
                    icon: "🤝"
                  });
                  break;
                default:
                  dependencies.push({
                    role: t('users.systemReferenceIn', { table }),
                    location: t('users.systemSettings'),
                    action: t('users.contactSystemAdmin'),
                    impact: t('users.hasActiveSystemDependencies'),
                    severity: t('users.unknown'),
                    icon: "⚠️"
                  });
              }

              toast.dismiss(loadingToast);
              toast.error(
                  <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-red-200 pb-2">
                    <div className="font-semibold text-red-800">
                      {t('users.cannotDeleteUser')}
                    </div>
                    <div className="text-sm text-red-600">
                      ID: {userId}
                    </div>
                  </div>

                  <div className="font-medium text-red-700">
                    {userName}
                  </div>

                  <div className="text-sm text-red-800">
                    {t('users.thisUserHasActiveRoles')}
                  </div>

                  {dependencies.map((dep, index) => (
                    <div key={index} className="bg-white bg-opacity-50 rounded p-2 space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="font-medium text-red-700">
                          {dep.icon} {dep.role}
                        </div>
                        <div className="text-xs px-2 py-1 rounded bg-red-100 text-red-700">
                          {dep.severity}
                        </div>
                      </div>
                      <div className="text-sm text-red-600">
                        {t('users.impact')} {dep.impact}
                      </div>
                      <div className="text-sm">
                        <span className="font-medium text-red-700">{t('users.requiredSteps')}:</span>
                        <div className="pl-4 text-red-600 whitespace-pre-line">
                          {dep.action}
                        </div>
                      </div>
                      <div className="text-xs text-red-500">
                        {t('users.location')} {dep.location}
                      </div>
                    </div>
                  ))}

                  <div className="text-xs bg-red-100 p-2 rounded mt-2 text-red-700">
                    {t('users.completeTheseActions')}
                    <br />
                    {t('users.deletionWillPermanentlyRemove')}
                  </div>
                </div>,
                {
                  duration: 10000,
                  style: {
                    maxWidth: '500px',
                    backgroundColor: '#FEF2F2',
                    border: '1px solid #DC2626',
                    padding: '16px'
                  }
                }
              );
            return false;
        }
        throw error;
      });

      if (response.data) {
        // Update local state
        setData(prev => prev.filter(user => !selectedRows.includes(user.user_id)));
        setSelectedRows([]);

        // Refresh data from server
        const refreshResponse = await API.get("/users/get-users");
        if (Array.isArray(refreshResponse.data)) {
          const formattedData = refreshResponse.data.map(item => ({
            ...item,
            int_status: item.int_status === 1 ? t('users.active') : t('users.inactive'),
            created_on: item.created_on ? new Date(item.created_on).toLocaleString() : '',
            changed_on: item.changed_on ? new Date(item.changed_on).toLocaleString() : '',
            last_accessed: item.last_accessed ? new Date(item.last_accessed).toLocaleString() : '',
            dept_name: departments.find(d => d.dept_id === item.dept_id)?.text || t('users.notAssigned')
          }));
          setData(formattedData);
        }

        // Log delete action
        await recordActionByNameWithFetch('Delete', {
          userIds: selectedRows,
          count: selectedRows.length,
          action: t('users.usersDeleted', { count: selectedRows.length })
        });

        // Show success message
        toast.dismiss(loadingToast);
        toast.success(t('users.successfullyDeletedUsers', { count: selectedRows.length }), {
          duration: 3000,
          style: {
            backgroundColor: '#DCFCE7',
            color: '#166534'
          }
        });
        return true;
      }

      toast.dismiss(loadingToast);
      return false;

    } catch (error) {
      console.error("Error deleting users:", error);
      toast.dismiss(loadingToast);

      // Check if it's a foreign key constraint error that wasn't caught earlier
      if (error.response?.data?.error?.includes('foreign key constraint') ||
          error.response?.data?.code === '23503') {
        
        // Extract table name from error message
        const tableMatch = error.response?.data?.error?.match(/table "([^"]+)"/) ||
                         error.response?.data?.detail?.match(/table "([^"]+)"/);
        const table = tableMatch ? tableMatch[1] : 'unknown';
        
        // Extract user ID from error message
        const userIdMatch = error.response?.data?.detail?.match(/\((.*?)\)/) ||
                          error.response?.data?.error?.match(/\((.*?)\)/);
        const userId = userIdMatch ? userIdMatch[1] : selectedRows[0];
        
        // Get user details
        const user = data.find(u => u.user_id === userId);
        const userName = user ? user.full_name : userId;

        // Show detailed dependency error
        toast.error(
          <div className="space-y-2">
            <div className="font-semibold text-red-800 border-b border-red-200 pb-2">
              {t('users.cannotDeleteUserDependencies', { userName })}
            </div>
            <div className="text-sm text-red-700">
              {t('users.thisUserHasActiveDependencies', { table })}
            </div>
            <div className="bg-white bg-opacity-50 rounded p-2 mt-2">
              <div className="font-medium text-red-700 flex items-center gap-2">
                <span>{t('users.requiredAction')}</span>
              </div>
              <div className="text-sm text-red-600 mt-1">
                {t('users.removeOrReassignUserRoles')}
              </div>
            </div>
            <div className="text-xs bg-red-100 p-2 rounded mt-2">
              {t('users.handleAllUserDependencies')}
            </div>
          </div>,
          {
            duration: 6000,
            style: {
              backgroundColor: '#FEF2F2',
              border: '1px solid #DC2626',
              padding: '16px',
              maxWidth: '400px'
            }
          }
        );
      } else {
        // Handle other types of errors
        let errorMessage;
        let duration = 4000;
        let style = {
          backgroundColor: '#FEE2E2',
          color: '#DC2626',
          maxWidth: '400px'
        };

        switch(true) {
          case error.response?.status === 404:
            errorMessage = t('users.usersNoLongerExist');
            break;
          case error.response?.status === 403:
            errorMessage = t('users.noPermissionToDeleteUsers');
            duration = 5000;
            break;
          case error.message === 'Network Error':
            errorMessage = t('users.unableToConnectToServer');
            style.backgroundColor = '#FEF3C7';
            style.color = '#92400E';
            break;
          default:
            errorMessage = error.response?.data?.message || 
                          error.response?.data?.error || 
                          t('users.unexpectedErrorOccurred');
        }

        toast.error(errorMessage, { duration, style });
      }
      return false;
    }
  };

  // Handle user update
  const handleUpdateUser = async (userId, updatedData) => {
    try {
      const response = await API.put(`/users/update-users/${userId}`, updatedData);
      
      if (response.data) {
        // Log update action
        await recordActionByNameWithFetch('Update', {
          userId: userId,
          fullName: updatedData.full_name,
          email: updatedData.email,
          phone: updatedData.phone,
          deptId: updatedData.dept_id,
          deptName: departments.find(d => d.dept_id === updatedData.dept_id)?.text,
          status: updatedData.int_status === 1 ? t('users.active') : t('users.inactive'),
          action: t('users.userUpdated')
        });

        setData(prev => prev.map(user => 
          user.user_id === userId ? { 
            ...user, 
            ...response.data,
            dept_name: departments.find(d => d.dept_id === response.data.dept_id)?.text || t('users.notAssigned')
          } : user
        ));
        toast.success(t('users.userUpdatedSuccessfully'));
        setShowEditModal(false);
        setEditingUser(null);
      }
    } catch (error) {
      console.error("Error updating user:", error);
      const errorMessage = error.response?.data?.message || error.response?.data?.error || t('users.failedToUpdateUser');
      toast.error(errorMessage);
    }
  };

  const handleDownload = async () => {
    try {
      const filteredData = filterData(data, filterValues, columns.filter(col => col.visible));
      const sortedData = sortData(filteredData);
      const success = exportToExcel(sortedData, columns, "Users_List");
      if (success) {
        // Log download action
        await recordActionByNameWithFetch('Download', {
          count: sortedData.length,
          action: t('users.usersDataDownloaded')
        });
        
        toast(t('users.usersExportedSuccessfully'), { icon: '✅' });
      } else {
        throw new Error('Export failed');
      }
    } catch (error) {
      console.error('Error downloading users:', error);
      toast(t('users.failedToExportUsers'), { icon: '❌' });
    }
  };

  const filters = columns.map((col) => ({
    label: col.label,
    name: col.name,
    options: col.name === 'int_status' ? [
      { label: t('users.active'), value: t('users.active') },
      { label: t('users.inactive'), value: t('users.inactive') }
    ] : [],
    onChange: (value) => handleFilterChange(col.name, value),
  }));

  return (
    <div className="p-4">
      <ContentBox
        filters={filters}
        onFilterChange={handleFilterChange}
        onSort={handleSort}
        sortConfig={sortConfig}
        onAdd={canEdit ? async () => {
          // Log create action when Add button is clicked
          await recordActionByNameWithFetch('Create', {
            action: t('users.addUserFormOpened')
          });
          navigate("/master-data/add-user");
        } : null}
        onDeleteSelected={canEdit ? handleDelete : null}
        onDownload={handleDownload}
        data={data}
        selectedRows={selectedRows}
        setSelectedRows={setSelectedRows}
        showAddButton={canEdit}
        showActions={canEdit}
      >
        {({ visibleColumns }) => {
          const filteredData = filterData(data, filterValues, visibleColumns);
          const sortedData = sortData(filteredData);

          return (
            <CustomTable
              columns={visibleColumns}
              visibleColumns={visibleColumns}
              data={sortedData}
              selectedRows={selectedRows}
              setSelectedRows={setSelectedRows}
              onEdit={canEdit ? (row) => {
                setEditingUser(row);
                setShowEditModal(true);
              } : null}
              onDelete={canEdit ? (row) => {
                console.log("Delete clicked for row:", row);
                // setUserToDelete(row); // This state was removed
                // setShowDeleteModal(true); // This state was removed
              } : null}
              rowKey="user_id"
              showActions={canEdit}
            />
          );
        }}
      </ContentBox>





      {/* Edit User Modal */}
      {showEditModal && editingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-30 backdrop-blur-sm flex justify-center items-center z-50">
          <div className="bg-white w-[500px] rounded shadow-lg">
            <div className="bg-[#003b6f] text-white font-semibold px-6 py-3 flex justify-between items-center rounded-t">
              <span>{t('users.editUser')}</span>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingUser(null);
                }}
                className="text-yellow-400 text-xl font-bold"
              >
                ×
              </button>
            </div>
            <div className="h-[3px] bg-[#ffc107]" />
            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('users.fullName')}</label>
                  <input
                    type="text"
                    value={editingUser.full_name}
                    onChange={(e) => setEditingUser({ ...editingUser, full_name: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('users.email')}</label>
                  <input
                    type="email"
                    value={editingUser.email}
                    onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('users.phone')}</label>
                  <input
                    type="text"
                    value={editingUser.phone}
                    onChange={(e) => setEditingUser({ ...editingUser, phone: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('users.department')}</label>
                  <select
                    value={editingUser.dept_id || ""}
                    onChange={(e) => setEditingUser({ ...editingUser, dept_id: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                  >
                    <option value="">{t('users.selectDepartment')}</option>
                    {departments.map((dept) => (
                      <option key={dept.dept_id} value={dept.dept_id}>
                        {dept.text}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('users.status')}</label>
                  <select
                    value={editingUser.int_status}
                    onChange={(e) => setEditingUser({ ...editingUser, int_status: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                  >
                    <option value={t('users.active')}>{t('users.active')}</option>
                    <option value={t('users.inactive')}>{t('users.inactive')}</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 px-6 py-4 rounded-b flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingUser(null);
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={() => handleUpdateUser(editingUser.user_id, {
                  full_name: editingUser.full_name,
                  email: editingUser.email,
                  phone: editingUser.phone,
                  dept_id: editingUser.dept_id,
                  int_status: editingUser.int_status === t('users.active') ? 1 : 0
                })}
                className="px-4 py-2 bg-[#003366] text-white rounded hover:bg-[#002347]"
              >
                {t('users.saveChanges')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Users;
