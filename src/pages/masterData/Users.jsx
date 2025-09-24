import { useEffect, useState } from "react";
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
    { label: "User ID", name: "user_id", visible: true },
    { label: "Full Name", name: "full_name", visible: true },
    { label: "Email", name: "email", visible: true },
    { label: "Mobile Number", name: "phone", visible: true },
    { label: "Department", name: "dept_name", visible: true },
    { label: "Role", name: "job_role_id", visible: true },
    { label: "Is Active", name: "int_status", visible: true },
    { label: "Last Accessed", name: "last_accessed", visible: true },
    { label: "Time Zone", name: "time_zone", visible: false },
    { label: "Date Format", name: "date_format", visible: false },
    { label: "Language", name: "language_code", visible: false },
    { label: "Ext ID", name: "ext_id", visible: false },
    { label: "Organization ID", name: "org_id", visible: false },
    { label: "Password", name: "password", visible: false },
    { label: "Created By", name: "created_by", visible: false },
    { label: "Created On", name: "created_on", visible: false },
    { label: "Changed By", name: "changed_by", visible: false },
    { label: "Changed On", name: "changed_on", visible: false },
    { label: "Reset Token", name: "reset_token", visible: false },
    { label: "Reset Token Expiry", name: "reset_token_expiry", visible: false }
  ]);

  // Fetch departments
  const fetchDepartments = async () => {
    try {
      const res = await API.get("/admin/departments");
      setDepartments(res.data);
    } catch (err) {
      console.error("Failed to fetch departments", err);
      toast.error(t('users.failedToFetchDepartments'));
    }
  };

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await API.get("/users/get-users");
        const formattedData = response.data.map(item => ({
          ...item,
          int_status: item.int_status === 1 ? 'Active' : 'Inactive',
          created_on: item.created_on ? new Date(item.created_on).toLocaleString() : '',
          changed_on: item.changed_on ? new Date(item.changed_on).toLocaleString() : '',
          last_accessed: item.last_accessed ? new Date(item.last_accessed).toLocaleString() : '',
          dept_name: departments.find(d => d.dept_id === item.dept_id)?.text || 'Not Assigned'
        }));
        setData(formattedData);
      } catch (error) {
        console.error("Error fetching users:", error);
        toast.error(t('users.failedToFetchUsers'));
      }
    };
    fetchUsers();
  }, [departments]);

  useEffect(() => {
    fetchDepartments();
  }, []);

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
    const loadingToast = toast.loading("Deleting selected users...");

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
                    role: "Department Administrator",
                    location: "Department Management",
                    action: "1. Go to Department Settings\n2. Remove admin privileges",
                    impact: "Currently managing department operations",
                    severity: "Critical",
                    icon: "🔐"
                  });
                  break;
                case 'tblAssets':
                  dependencies.push({
                    role: "Asset Owner/Custodian",
                    location: "Asset Management",
                    action: "1. Go to Assets\n2. Reassign assets to another user",
                    impact: "Responsible for company assets",
                    severity: "High",
                    icon: "📦"
                  });
                  break;
                case 'tblDeptAssets':
                  dependencies.push({
                    role: "Department Asset Manager",
                    location: "Department Assets",
                    action: "1. Access Department Assets\n2. Transfer management rights",
                    impact: "Managing departmental asset inventory",
                    severity: "High",
                    icon: "📋"
                  });
                  break;
                case 'tblVendors':
                  dependencies.push({
                    role: "Vendor Point of Contact",
                    location: "Vendor Management",
                    action: "1. Open Vendor Details\n2. Update contact information",
                    impact: "Listed as vendor contact person",
                    severity: "Medium",
                    icon: "🤝"
                  });
                  break;
                default:
                  dependencies.push({
                    role: `System Reference in ${table}`,
                    location: "System Settings",
                    action: "Contact system administrator",
                    impact: "Has active system dependencies",
                    severity: "Unknown",
                    icon: "⚠️"
                  });
              }

              toast.dismiss(loadingToast);
              toast.error(
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-red-200 pb-2">
                    <div className="font-semibold text-red-800">
                      Cannot Delete User
                    </div>
                    <div className="text-sm text-red-600">
                      ID: {userId}
                    </div>
                  </div>

                  <div className="font-medium text-red-700">
                    {userName}
                  </div>

                  <div className="text-sm text-red-800">
                    This user has active roles that prevent deletion:
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
                        Impact: {dep.impact}
                      </div>
                      <div className="text-sm">
                        <span className="font-medium text-red-700">Required Steps:</span>
                        <div className="pl-4 text-red-600 whitespace-pre-line">
                          {dep.action}
                        </div>
                      </div>
                      <div className="text-xs text-red-500">
                        Location: {dep.location}
                      </div>
                    </div>
                  ))}

                  <div className="text-xs bg-red-100 p-2 rounded mt-2 text-red-700">
                    ⚠️ Complete these actions before attempting to delete this user again.
                    <br />
                    Note: Deletion will permanently remove all user access and history.
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
            int_status: item.int_status === 1 ? 'Active' : 'Inactive',
            created_on: item.created_on ? new Date(item.created_on).toLocaleString() : '',
            changed_on: item.changed_on ? new Date(item.changed_on).toLocaleString() : '',
            last_accessed: item.last_accessed ? new Date(item.last_accessed).toLocaleString() : '',
            dept_name: departments.find(d => d.dept_id === item.dept_id)?.text || 'Not Assigned'
          }));
          setData(formattedData);
        }

        // Log delete action
        await recordActionByNameWithFetch('Delete', {
          userIds: selectedRows,
          count: selectedRows.length,
          action: `${selectedRows.length} User(s) Deleted`
        });

        // Show success message
        toast.dismiss(loadingToast);
        toast.success(`Successfully deleted ${selectedRows.length} user(s)`, {
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
              Cannot Delete User: {userName}
            </div>
            <div className="text-sm text-red-700">
              This user has active dependencies in: {table}
            </div>
            <div className="bg-white bg-opacity-50 rounded p-2 mt-2">
              <div className="font-medium text-red-700 flex items-center gap-2">
                <span>⚠️ Required Action</span>
              </div>
              <div className="text-sm text-red-600 mt-1">
                Please remove or reassign this user's roles and responsibilities before deleting.
              </div>
            </div>
            <div className="text-xs bg-red-100 p-2 rounded mt-2">
              Note: You must handle all user dependencies before deletion is possible.
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
            errorMessage = "One or more selected users no longer exist. Please refresh the page.";
            break;
          case error.response?.status === 403:
            errorMessage = "You don't have permission to delete these users. Please contact an administrator.";
            duration = 5000;
            break;
          case error.message === 'Network Error':
            errorMessage = "Unable to connect to the server. Please check your internet connection.";
            style.backgroundColor = '#FEF3C7';
            style.color = '#92400E';
            break;
          default:
            errorMessage = error.response?.data?.message || 
                          error.response?.data?.error || 
                          "An unexpected error occurred. Please try again or contact support.";
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
          status: updatedData.int_status === 1 ? 'Active' : 'Inactive',
          action: 'User Updated'
        });

        setData(prev => prev.map(user => 
          user.user_id === userId ? { 
            ...user, 
            ...response.data,
            dept_name: departments.find(d => d.dept_id === response.data.dept_id)?.text || 'Not Assigned'
          } : user
        ));
        toast.success("User updated successfully");
        setShowEditModal(false);
        setEditingUser(null);
      }
    } catch (error) {
      console.error("Error updating user:", error);
      const errorMessage = error.response?.data?.message || error.response?.data?.error || "Failed to update user";
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
          action: 'Users Data Downloaded'
        });
        
        toast('Users exported successfully', { icon: '✅' });
      } else {
        throw new Error('Export failed');
      }
    } catch (error) {
      console.error('Error downloading users:', error);
      toast('Failed to export users', { icon: '❌' });
    }
  };

  const filters = columns.map((col) => ({
    label: col.label,
    name: col.name,
    options: col.name === 'int_status' ? [
      { label: "Active", value: "Active" },
      { label: "Inactive", value: "Inactive" }
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
            action: 'Add User Form Opened'
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
              <span>Edit User</span>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    value={editingUser.full_name}
                    onChange={(e) => setEditingUser({ ...editingUser, full_name: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={editingUser.email}
                    onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    type="text"
                    value={editingUser.phone}
                    onChange={(e) => setEditingUser({ ...editingUser, phone: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                  <select
                    value={editingUser.dept_id || ""}
                    onChange={(e) => setEditingUser({ ...editingUser, dept_id: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                  >
                    <option value="">Select Department</option>
                    {departments.map((dept) => (
                      <option key={dept.dept_id} value={dept.dept_id}>
                        {dept.text}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={editingUser.int_status}
                    onChange={(e) => setEditingUser({ ...editingUser, int_status: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
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
                Cancel
              </button>
              <button
                onClick={() => handleUpdateUser(editingUser.user_id, {
                  full_name: editingUser.full_name,
                  email: editingUser.email,
                  phone: editingUser.phone,
                  dept_id: editingUser.dept_id,
                  int_status: editingUser.int_status === 'Active' ? 1 : 0
                })}
                className="px-4 py-2 bg-[#003366] text-white rounded hover:bg-[#002347]"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Users;
