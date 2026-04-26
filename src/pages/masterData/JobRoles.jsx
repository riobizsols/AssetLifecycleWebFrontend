import { showBackendTextToast } from '../../utils/errorTranslation';
import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import ContentBox from "../../components/ContentBox";
import CustomTable from "../../components/CustomTable";
import { filterData } from "../../utils/filterData";
import API from "../../lib/axios";
import { toast } from "react-hot-toast";
import { FaSave, FaTimes } from "react-icons/fa";
import { useNavigation } from "../../hooks/useNavigation";
import { useAuthStore } from "../../store/useAuthStore";
import { useAdminSettings } from "../../contexts/AdminSettingsContext";

const JobRoles = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Check if we're in admin settings mode - handle case where context might not be available
  let isAdminSettingsMode = false;
  try {
    const adminSettings = useAdminSettings();
    isAdminSettingsMode = adminSettings?.isAdminSettingsMode || false;
  } catch (error) {
    // Context not available, check URL path instead
    isAdminSettingsMode = location.pathname.startsWith('/adminsettings');
  }
  
  // Tab state - check if coming back from create screen
  const [activeTab, setActiveTab] = useState(location.state?.activeTab || "roles");
  
  // Job Roles Tab Data
  const [rolesData, setRolesData] = useState([]);
  const [isLoadingRoles, setIsLoadingRoles] = useState(false);
  const [selectedRoleRows, setSelectedRoleRows] = useState([]);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [roleFormData, setRoleFormData] = useState({
    job_role_id: "",
    text: "",
    job_function: "",
    org_id: "",
    int_status: 1,
    notif_warranty: false,
    notif_scrap: false
  });
  
  const { user } = useAuthStore();
  const [roleFilterValues, setRoleFilterValues] = useState({
    columnFilters: [],
    fromDate: "",
    toDate: ""
  });
  
  // Job Role Navigation Tab Data
  const [navData, setNavData] = useState([]);
  const [isLoadingNav, setIsLoadingNav] = useState(false);
  const [selectedNavRows, setSelectedNavRows] = useState([]);
  const [navFilterValues, setNavFilterValues] = useState({
    columnFilters: [],
    fromDate: "",
    toDate: ""
  });
  
  // Access control
  const { hasEditAccess } = useNavigation();
  const canEdit = hasEditAccess('USERROLES');

  const rolesColumns = [
    { label: "Job Role ID", name: "job_role_id", visible: true },
    { label: "Role Name", name: "text", visible: true },
    { label: "Job Function", name: "job_function", visible: true },
    { label: "Status", name: "int_status", visible: true },
  ];

  const navColumns = [
    { label: "Nav ID", name: "job_role_nav_id", visible: true },
    { label: "Job Role", name: "job_role_name", visible: true },
    { label: "App ID", name: "app_id", visible: true },
    { label: "Label", name: "label", visible: true },
    { label: "Parent ID", name: "parent_id", visible: true },
    { label: "Sequence", name: "sequence", visible: true },
    { label: "Access Level", name: "access_level", visible: true },
    { label: "Screen Type", name: "mob_desk", visible: true },
    // { label: "Is Group", name: "is_group", visible: true },
  ];

  // Create filters from columns
  const roleFilters = rolesColumns.map((col) => ({
    label: col.label,
    name: col.name,
    options: [],
    onChange: (value) => handleRoleFilterChange(col.name, value),
  }));

  const navFilters = navColumns.map((col) => ({
    label: col.label,
    name: col.name,
    options: [],
    onChange: (value) => handleNavFilterChange(col.name, value),
  }));

  // ============ FETCH FUNCTIONS ============
  
  const fetchJobRoles = async () => {
    setIsLoadingRoles(true);
    try {
      const response = await API.get("/job-roles");
      console.log("Job Roles Response:", response.data);
      setRolesData(response.data.roles || []);
    } catch (error) {
      console.error("Error fetching job roles:", error);
      showBackendTextToast({ toast, tmdId: 'TMD_FAILED_TO_FETCH_JOB_ROLES_20AF53B2', fallbackText: 'Failed to fetch job roles', type: 'error' });
    } finally {
      setIsLoadingRoles(false);
    }
  };

  const fetchJobRoleNavigation = async () => {
    setIsLoadingNav(true);
    try {
      const response = await API.get("/job-role-navigation");
      console.log("Navigation Response:", response.data);
      // Transform data for display
      const navigationData = (response.data.navigation || []).map(item => ({
        ...item,
        mob_desk: item.mob_desk === 'D' ? 'Desktop' : item.mob_desk === 'M' ? 'Mobile' : item.mob_desk,
        is_group: item.is_group ? 'Yes' : 'No'
      }));
      setNavData(navigationData);
    } catch (error) {
      console.error("Error fetching job role navigation:", error);
      showBackendTextToast({ toast, tmdId: 'TMD_FAILED_TO_FETCH_NAVIGATION_DATA_59C9E74E', fallbackText: 'Failed to fetch navigation data', type: 'error' });
    } finally {
      setIsLoadingNav(false);
    }
  };

  useEffect(() => {
    fetchJobRoles();
  }, []);

  useEffect(() => {
    if (activeTab === "navigation") {
      fetchJobRoleNavigation();
    }
  }, [activeTab]);

  // ============ JOB ROLES TAB HANDLERS ============
  
  const handleAddNewRole = () => {
    setEditingRole(null);
    setRoleFormData({
      job_role_id: "",
      text: "",
      job_function: "",
      org_id: user?.org_id || "",
      int_status: 1,
      notif_warranty: false,
      notif_scrap: false
    });
    setShowRoleModal(true);
  };

  const handleEditRole = (role) => {
    setEditingRole(role);
    setRoleFormData({
      job_role_id: role.job_role_id,
      text: role.text,
      job_function: role.job_function || "",
      org_id: role.org_id || user?.org_id || "",
      int_status: role.int_status !== undefined ? role.int_status : 1,
      notif_warranty: !!role.notif_warranty,
      notif_scrap: !!role.notif_scrap
    });
    setShowRoleModal(true);
  };

  const handleRoleFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setRoleFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSaveRole = async () => {
    try {
      // Validation - job_role_id not required for new entries (auto-generated)
      if (!roleFormData.text) {
        showBackendTextToast({ toast, tmdId: 'TMD_ROLE_NAME_IS_REQUIRED_20A9EA2A', fallbackText: 'Role Name is required', type: 'error' });
        return;
      }

      if (editingRole) {
        // For edit, job_role_id is required
        if (!roleFormData.job_role_id) {
          showBackendTextToast({ toast, tmdId: 'TMD_JOB_ROLE_ID_IS_REQUIRED_FOR_UPDATES_7FAC57EA', fallbackText: 'Job Role ID is required for updates', type: 'error' });
          return;
        }
        await API.put(`/job-roles/${roleFormData.job_role_id}`, {
          text: roleFormData.text,
          job_function: roleFormData.job_function,
          int_status: roleFormData.int_status ? 1 : 0,
          notif_warranty: !!roleFormData.notif_warranty,
          notif_scrap: !!roleFormData.notif_scrap
        });
        showBackendTextToast({ toast, tmdId: 'TMD_JOB_ROLE_UPDATED_SUCCESSFULLY_5BF7F393', fallbackText: 'Job role updated successfully', type: 'success' });
      } else {
        // For create, don't send job_role_id (backend will generate)
        await API.post("/job-roles", {
          text: roleFormData.text,
          job_function: roleFormData.job_function,
          notif_warranty: !!roleFormData.notif_warranty,
          notif_scrap: !!roleFormData.notif_scrap
        });
        showBackendTextToast({ toast, tmdId: 'TMD_JOB_ROLE_CREATED_SUCCESSFULLY_727D8686', fallbackText: 'Job role created successfully', type: 'success' });
      }

      setShowRoleModal(false);
      fetchJobRoles();
    } catch (error) {
      console.error("Error saving job role:", error);
      toast.error(error.response?.data?.message || "Failed to save job role");
    }
  };

  const handleRoleFilterChange = (filterType, value) => {
    setRoleFilterValues(prev => ({
      ...prev,
      [filterType]: value
    }));
  };

  // ============ NAVIGATION TAB HANDLERS ============
  
  const handleAddNewNav = () => {
    // Navigate to create route - use appropriate route based on admin settings mode
    const navState = {
      activeTab: activeTab,
      adminFrom: { pathname: location.pathname, search: location.search },
      parentAdminFrom: location.state?.adminFrom,
    };
    if (isAdminSettingsMode) {
      navigate("/adminsettings/configuration/job-roles/create-navigation", {
        state: navState,
      });
    } else {
      navigate("/master-data/job-roles/create-navigation", {
        state: { activeTab: activeTab },
      });
    }
  };

  const handleEditNav = (nav) => {
    // Navigate to update route with navId - use appropriate route based on admin settings mode
    const navState = {
      activeTab: activeTab,
      navigation: nav,
      adminFrom: { pathname: location.pathname, search: location.search },
      parentAdminFrom: location.state?.adminFrom,
    };
    if (isAdminSettingsMode) {
      navigate(
        `/adminsettings/configuration/job-roles/update-navigation/${nav.job_role_nav_id}`,
        { state: navState },
      );
    } else {
      navigate(
        `/master-data/job-roles/update-navigation/${nav.job_role_nav_id}`,
        { state: { activeTab: activeTab, navigation: nav } },
      );
    }
  };

  const handleNavFilterChange = (filterType, value) => {
    setNavFilterValues(prev => ({
      ...prev,
      [filterType]: value
    }));
  };

  // ============ RENDER ============

  return (
    <div className="p-4">
      {/* Tabs */}
      <div className="mb-6 bg-white rounded-lg shadow-sm">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab("roles")}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === "roles"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Job Roles
            </button>
            <button
              onClick={() => setActiveTab("navigation")}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === "navigation"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Role Navigation
            </button>
          </nav>
        </div>
      </div>

      {/* Tab 1: Job Roles */}
      {activeTab === "roles" && (
        <ContentBox
          filters={roleFilters}
          onFilterChange={handleRoleFilterChange}
          onDeleteSelected={null}
          data={rolesData}
          selectedRows={selectedRoleRows}
          setSelectedRows={setSelectedRoleRows}
          showAddButton={canEdit}
          onAdd={handleAddNewRole}
          addButtonTitle="Add New Role"
          showActions={canEdit}
        >
          {({ visibleColumns }) => {
            const filteredData = filterData(rolesData, roleFilterValues, visibleColumns);
            const colSpan = visibleColumns.filter(col => col.visible).length + (canEdit ? 1 : 0);

            if (isLoadingRoles) {
              return (
                <tr>
                  <td colSpan={colSpan} className="text-center py-16">
                    <div className="flex flex-col items-center justify-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                      <p className="text-gray-600">Loading...</p>
                    </div>
                  </td>
                </tr>
              );
            }

            if (filteredData.length === 0) {
              return (
                <tr>
                  <td colSpan={colSpan} className="text-center py-16">
                    <div className="flex flex-col items-center justify-center">
                      <p className="text-xl font-semibold text-gray-800">No job roles found</p>
                    </div>
                  </td>
                </tr>
              );
            }

            return (
              <CustomTable
                columns={visibleColumns}
                visibleColumns={visibleColumns}
                data={filteredData}
                selectedRows={selectedRoleRows}
                setSelectedRows={setSelectedRoleRows}
                onEdit={canEdit ? handleEditRole : null}
                rowKey="job_role_id"
                showActions={canEdit}
              />
            );
          }}
        </ContentBox>
      )}

      {/* Tab 2: Job Role Navigation */}
      {activeTab === "navigation" && (
        <ContentBox
          filters={navFilters}
          onFilterChange={handleNavFilterChange}
          onDeleteSelected={null}
          data={navData}
          selectedRows={selectedNavRows}
          setSelectedRows={setSelectedNavRows}
          showAddButton={canEdit}
          onAdd={handleAddNewNav}
          addButtonTitle="Add New Navigation"
          showActions={canEdit}
        >
          {({ visibleColumns }) => {
            const filteredData = filterData(navData, navFilterValues, visibleColumns);
            const colSpan = visibleColumns.filter(col => col.visible).length + (canEdit ? 1 : 0);

            if (isLoadingNav) {
              return (
                <tr>
                  <td colSpan={colSpan} className="text-center py-16">
                    <div className="flex flex-col items-center justify-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                      <p className="text-gray-600">Loading...</p>
                    </div>
                  </td>
                </tr>
              );
            }

            if (filteredData.length === 0) {
              return (
                <tr>
                  <td colSpan={colSpan} className="text-center py-16">
                    <div className="flex flex-col items-center justify-center">
                      <p className="text-xl font-semibold text-gray-800">No navigation entries found</p>
                    </div>
                  </td>
                </tr>
              );
            }

            return (
              <CustomTable
                columns={visibleColumns}
                visibleColumns={visibleColumns}
                data={filteredData}
                selectedRows={selectedNavRows}
                setSelectedRows={setSelectedNavRows}
                onEdit={canEdit ? handleEditNav : null}
                rowKey="job_role_nav_id"
                showActions={canEdit}
              />
            );
          }}
        </ContentBox>
      )}

      {/* Job Role Modal */}
      {showRoleModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl">
            {/* Modal Header */}
            <div className="bg-[#0E2F4B] text-white px-6 py-4 flex justify-between items-center rounded-t-lg">
              <h2 className="text-xl font-bold">
                {editingRole ? "Edit Job Role" : "Create New Job Role"}
              </h2>
              <button
                onClick={() => setShowRoleModal(false)}
                className="text-white hover:text-gray-200 transition-colors"
              >
                <FaTimes size={24} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              <div className="space-y-4">
                {/* Job Role ID - Only show when editing */}
                {editingRole && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Job Role ID
                    </label>
                    <input
                      type="text"
                      name="job_role_id"
                      value={roleFormData.job_role_id}
                      disabled={true}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 cursor-not-allowed"
                    />
                    <p className="text-xs text-gray-500 mt-1">Auto-generated identifier (cannot be changed)</p>
                  </div>
                )}

                {/* Organization ID - Only show when editing */}
                {editingRole && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Organization ID
                    </label>
                    <input
                      type="text"
                      name="org_id"
                      value={roleFormData.org_id}
                      disabled={true}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 cursor-not-allowed"
                    />
                    <p className="text-xs text-gray-500 mt-1">Organization identifier (cannot be changed)</p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Role Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="text"
                    value={roleFormData.text}
                    onChange={handleRoleFormChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., System Administrator"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Job Function
                  </label>
                  <input
                    type="text"
                    name="job_function"
                    value={roleFormData.job_function}
                    onChange={handleRoleFormChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., dept_admin"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notifications
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        name="notif_warranty"
                        checked={!!roleFormData.notif_warranty}
                        onChange={handleRoleFormChange}
                        className="mr-3 h-5 w-5 text-[#0E2F4B] focus:ring-[#0E2F4B] border-gray-300 rounded"
                      />
                      <span className="text-sm font-medium text-gray-700">
                        Send Warranty Alert
                      </span>
                    </label>
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        name="notif_scrap"
                        checked={!!roleFormData.notif_scrap}
                        onChange={handleRoleFormChange}
                        className="mr-3 h-5 w-5 text-[#0E2F4B] focus:ring-[#0E2F4B] border-gray-300 rounded"
                      />
                      <span className="text-sm font-medium text-gray-700">
                        Send Scrap Alert
                      </span>
                    </label>
                  </div>
                </div>

                {/* Status Toggle - Only show when editing */}
                {editingRole && (
                  <div>
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        name="int_status"
                        checked={roleFormData.int_status === 1}
                        onChange={(e) => {
                          setRoleFormData(prev => ({
                            ...prev,
                            int_status: e.target.checked ? 1 : 0
                          }));
                        }}
                        className="mr-3 h-5 w-5 text-[#0E2F4B] focus:ring-[#0E2F4B] border-gray-300 rounded"
                      />
                      <span className="text-sm font-medium text-gray-700">
                        Active Status
                      </span>
                    </label>
                    <p className="text-xs text-gray-500 mt-1 ml-8">
                      {roleFormData.int_status === 1 ? "Role is active" : "Role is inactive"}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3 rounded-b-lg">
              <button
                onClick={() => setShowRoleModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveRole}
                className="flex items-center gap-2 px-4 py-2 bg-[#0E2F4B] text-white rounded-md hover:bg-[#1a3f5f] transition-colors"
              >
                <FaSave /> Save
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default JobRoles;
