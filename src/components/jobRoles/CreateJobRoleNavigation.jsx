import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import API from "../../lib/axios";
import { toast } from "react-hot-toast";
import { FaSave, FaSearch, FaPlus, FaTrash } from "react-icons/fa";
import { useAuthStore } from "../../store/useAuthStore";
import SearchableDropdown from "../ui/SearchableDropdown";
import { useAdminSettings } from "../../contexts/AdminSettingsContext";

const CreateJobRoleNavigation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { navId } = useParams();
  const editingNav = location.state?.navigation || null;
  const { user } = useAuthStore();

  // Check if we're in admin settings mode - handle case where context might not- be available
  let isAdminSettingsMode = false;
  try {
    const adminSettings = useAdminSettings();
    isAdminSettingsMode = adminSettings?.isAdminSettingsMode || false;
  } catch (error) {
    // Context not available, check URL path instead
    isAdminSettingsMode = location.pathname.startsWith("/adminsettings");
  }

  // Helper function to get the correct back route
  const getBackRoute = () => {
    return isAdminSettingsMode
      ? "/adminsettings/configuration/job-roles"
      : "/master-data/job-roles";
  };

  // Check if we're in edit mode or create mode
  const isEditMode = !!(editingNav || navId);
  const isCreateMode = !isEditMode;

  // For edit mode - single entry
  const [formData, setFormData] = useState({
    job_role_nav_id: editingNav?.job_role_nav_id || "",
    job_role_id: editingNav?.job_role_id || "",
    parent_id: editingNav?.parent_id || "",
    app_id: editingNav?.app_id || "",
    label: editingNav?.label || "",
    sequence: editingNav?.sequence || 1,
    access_level: editingNav?.access_level || "D",
    is_group: editingNav?.is_group || false,
    mob_desk: editingNav?.mob_desk || "D",
    org_id: editingNav?.org_id || user?.org_id || "",
    int_status:
      editingNav?.int_status !== undefined ? editingNav.int_status : 1,
  });

  // For create mode - multiple rows
  const [selectedJobRole, setSelectedJobRole] = useState("");
  const [navigationRows, setNavigationRows] = useState([
    {
      app_id: "",
      parent_id: "",
      label: "",
      sequence: 1,
      access_level: "D",
      mob_desk: "D",
      is_group: false,
    },
  ]);

  const [availableRoles, setAvailableRoles] = useState([]);
  const [availableAppIds, setAvailableAppIds] = useState([]);
  const [availableParentIds, setAvailableParentIds] = useState([]);

  // Searchable dropdown states - for create mode (Job Role selector)
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);
  const [roleSearch, setRoleSearch] = useState("");
  const roleDropdownRef = useRef(null);

  useEffect(() => {
    fetchAvailableRoles();
    fetchAvailableAppIds();
    fetchAvailableParentIds();
  }, []);

  useEffect(() => {
    // If navId is in URL, fetch the navigation data
    if (navId && !editingNav) {
      fetchNavigationById(navId);
    }
  }, [navId, editingNav]);

  const fetchNavigationById = async (navId) => {
    try {
      const response = await API.get("/job-role-navigation");
      const navigation = response.data.navigation || [];
      const nav = navigation.find((n) => n.job_role_nav_id === navId);

      if (nav) {
        setFormData({
          job_role_nav_id: nav.job_role_nav_id,
          job_role_id: nav.job_role_id,
          parent_id: nav.parent_id || "",
          app_id: nav.app_id,
          label: nav.label || "",
          sequence: nav.sequence || 1,
          access_level: nav.access_level || "D",
          is_group: nav.is_group || false,
          mob_desk:
            nav.mob_desk === "Desktop"
              ? "D"
              : nav.mob_desk === "Mobile"
                ? "M"
                : nav.mob_desk || "D",
          org_id: nav.org_id || user?.org_id || "",
          int_status: nav.int_status !== undefined ? nav.int_status : 1,
        });
      }
    } catch (error) {
      console.error("Error fetching navigation:", error);
      toast.error("Failed to load navigation data");
    }
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        roleDropdownRef.current &&
        !roleDropdownRef.current.contains(event.target)
      ) {
        setRoleDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchAvailableRoles = async () => {
    try {
      const response = await API.get("/job-roles");
      setAvailableRoles(response.data.roles || []);
    } catch (error) {
      console.error("Error fetching roles:", error);
      toast.error("Failed to fetch job roles");
    }
  };

  const fetchAvailableAppIds = async () => {
    try {
      const response = await API.get("/job-roles/available-app-ids");
      setAvailableAppIds(response.data.appIds || []);
    } catch (error) {
      console.error("Error fetching app IDs:", error);
      toast.error("Failed to fetch app IDs");
    }
  };

  const fetchAvailableParentIds = async () => {
    try {
      const response = await API.get("/job-role-navigation");
      setAvailableParentIds(response.data.navigation || []);
    } catch (error) {
      console.error("Error fetching parent IDs:", error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  // ============ CREATE MODE - MULTI-ROW HANDLERS ============

  const handleAddRow = () => {
    setNavigationRows((prev) => [
      ...prev,
      {
        app_id: "",
        parent_id: "",
        label: "",
        sequence: prev.length + 1,
        access_level: "D",
        mob_desk: "D",
        is_group: false,
      },
    ]);
  };

  const handleRemoveRow = (index) => {
    if (navigationRows.length > 1) {
      setNavigationRows((prev) => prev.filter((_, i) => i !== index));
    } else {
      toast.error("At least one row is required");
    }
  };

  const handleRowChange = (index, field, value) => {
    setNavigationRows((prev) =>
      prev.map((row, i) => (i === index ? { ...row, [field]: value } : row)),
    );
  };

  const handleSaveMultiple = async () => {
    try {
      if (!selectedJobRole) {
        toast.error("Please select a Job Role");
        return;
      }

      // Validate all rows
      const invalidRows = navigationRows.filter((row) => !row.app_id);
      if (invalidRows.length > 0) {
        toast.error("All rows must have an App ID selected");
        return;
      }

      // Prepare entries for bulk creation
      const entries = navigationRows.map((row) => ({
        job_role_id: selectedJobRole,
        app_id: row.app_id,
        parent_id: row.parent_id || null,
        label: row.label || "",
        sequence: row.sequence || 1,
        access_level: row.access_level || "D",
        mob_desk: row.mob_desk || "D",
        is_group: row.is_group || false,
      }));

      // Bulk create all navigation entries in a single transaction
      const response = await API.post("/job-role-navigation/bulk", { entries });

      toast.success(
        response.data.message ||
          `Successfully created ${entries.length} navigation ${entries.length === 1 ? "entry" : "entries"}`,
      );
      navigate(getBackRoute(), { state: { activeTab: "navigation" } });
    } catch (error) {
      console.error("Error creating navigation entries:", error);
      toast.error(
        error.response?.data?.message || "Failed to create navigation entries",
      );
    }
  };

  // ============ EDIT MODE - SINGLE ENTRY HANDLER ============

  const handleSave = async () => {
    try {
      if (!formData.job_role_id || !formData.app_id) {
        toast.error("Job Role and App ID are required");
        return;
      }

      const navIdToUpdate = navId || formData.job_role_nav_id;
      if (!navIdToUpdate) {
        toast.error("Navigation ID is required for updates");
        return;
      }

      await API.put(`/job-role-navigation/${navIdToUpdate}`, {
        ...formData,
        int_status: formData.int_status ? 1 : 0,
      });
      toast.success("Navigation updated successfully");
      navigate(getBackRoute(), { state: { activeTab: "navigation" } });
    } catch (error) {
      console.error("Error saving navigation:", error);
      toast.error(error.response?.data?.message || "Failed to save navigation");
    }
  };

  // Filter function for Job Role dropdown in create mode
  const filteredRoles = availableRoles.filter(
    (role) =>
      role.job_role_id.toLowerCase().includes(roleSearch.toLowerCase()) ||
      role.text.toLowerCase().includes(roleSearch.toLowerCase()),
  );

  // ============ RENDER ============

  // Edit Mode - Single Entry Form
  if (isEditMode) {
    return (
      <div className="p-6 w-full">
        {/* Header */}
        <div className="mb-6 bg-white rounded-lg shadow-sm p-6 w-full">
          <h1 className="text-2xl font-bold text-gray-900">
            Update Role Navigation
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Configure navigation access for job roles
          </p>
        </div>

        {/* Form */}
        <div className="bg-white rounded-lg shadow-md p-6 w-full">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Navigation ID */}
            {(editingNav || navId) && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Navigation ID
                </label>
                <input
                  type="text"
                  name="job_role_nav_id"
                  value={formData.job_role_nav_id}
                  disabled={true}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 cursor-not-allowed"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Auto-generated identifier (cannot be changed)
                </p>
              </div>
            )}

            {/* Job Role - Searchable Dropdown */}
            <div ref={roleDropdownRef}>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Job Role <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div
                  onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md cursor-pointer bg-white flex items-center justify-between"
                >
                  <span
                    className={
                      formData.job_role_id ? "text-gray-900" : "text-gray-400"
                    }
                  >
                    {formData.job_role_id
                      ? `${availableRoles.find((r) => r.job_role_id === formData.job_role_id)?.text || ""} (${formData.job_role_id})`
                      : "Select Job Role"}
                  </span>
                  <FaSearch className="text-gray-400" />
                </div>
                {roleDropdownOpen && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-hidden">
                    <div className="p-2 border-b">
                      <input
                        type="text"
                        placeholder="Search job role..."
                        value={roleSearch}
                        onChange={(e) => setRoleSearch(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0E2F4B]"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                    <div className="max-h-48 overflow-y-auto">
                      {filteredRoles.length > 0 ? (
                        filteredRoles.map((role) => (
                          <div
                            key={role.job_role_id}
                            onClick={() => {
                              setFormData((prev) => ({
                                ...prev,
                                job_role_id: role.job_role_id,
                              }));
                              setRoleDropdownOpen(false);
                              setRoleSearch("");
                            }}
                            className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
                          >
                            <div className="font-medium">{role.text}</div>
                          </div>
                        ))
                      ) : (
                        <div className="px-3 py-2 text-gray-500">
                          No roles found
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Select the job role for this navigation item
              </p>
            </div>

            {/* App ID - Searchable Dropdown */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                App ID <span className="text-red-500">*</span>
              </label>
              <SearchableDropdown
                options={availableAppIds.map((app) => ({
                  id: app.app_id,
                  text: `${app.app_id} - ${app.label}`,
                }))}
                value={formData.app_id}
                onChange={(value) =>
                  setFormData((prev) => ({ ...prev, app_id: value }))
                }
                placeholder="Select App ID"
                searchPlaceholder="Search app ID..."
                valueKey="id"
                displayKey="text"
              />
              <p className="text-xs text-gray-500 mt-1">
                Select the app ID/screen for navigation
              </p>
            </div>

            {/* Parent Navigation - Searchable Dropdown */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Parent Navigation (Optional)
              </label>
              <SearchableDropdown
                options={[
                  { id: "", text: "None (Top Level Menu)" },
                  ...availableParentIds.map((parent) => ({
                    id: parent.job_role_nav_id,
                    text: `${parent.label || parent.app_id} (${parent.job_role_nav_id})`,
                  })),
                ]}
                value={formData.parent_id || ""}
                onChange={(value) =>
                  setFormData((prev) => ({ ...prev, parent_id: value || "" }))
                }
                placeholder="None (Top Level Menu)"
                searchPlaceholder="Search parent navigation..."
                valueKey="id"
                displayKey="text"
              />
              <p className="text-xs text-gray-500 mt-1">
                Select parent menu if this is a submenu item
              </p>
            </div>

            {/* Display Label */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Display Label
              </label>
              <input
                type="text"
                name="label"
                value={formData.label}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0E2F4B]"
                placeholder="e.g., Dashboard"
              />
              <p className="text-xs text-gray-500 mt-1">
                Custom label to display in menu (optional)
              </p>
            </div>

            {/* Display Order */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Display Order <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="sequence"
                value={formData.sequence}
                onChange={handleInputChange}
                min="1"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0E2F4B]"
              />
              <p className="text-xs text-gray-500 mt-1">
                Order in which this item appears in menu
              </p>
            </div>

            {/* Access Level */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Access Level <span className="text-red-500">*</span>
              </label>
              <select
                name="access_level"
                value={formData.access_level}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0E2F4B]"
              >
                <option value="D">Display Only (View Access)</option>
                <option value="A">Full Access (Edit/Manage)</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                D = View only, A = Full edit access
              </p>
            </div>

            {/* Screen Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Screen Type <span className="text-red-500">*</span>
              </label>
              <select
                name="mob_desk"
                value={formData.mob_desk}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0E2F4B]"
              >
                <option value="D">Desktop Only</option>
                <option value="M">Mobile Only</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Which screen type can access this item
              </p>
            </div>

            {/* Organization ID */}
            {(editingNav || navId) && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Organization ID
                </label>
                <input
                  type="text"
                  name="org_id"
                  value={formData.org_id}
                  disabled={true}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 cursor-not-allowed"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Organization identifier (cannot be changed)
                </p>
              </div>
            )}

            {/* Is Group */}
            <div className="md:col-span-2">
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  name="is_group"
                  checked={formData.is_group}
                  onChange={handleInputChange}
                  className="mr-3 h-5 w-5 text-[#0E2F4B] focus:ring-[#0E2F4B] border-gray-300 rounded"
                />
                <span className="text-sm font-medium text-gray-700">
                  Is Parent Menu Group
                </span>
              </label>
              <p className="text-xs text-gray-500 mt-1 ml-8">
                Check this if this item is a parent menu that contains submenu
                items
              </p>
            </div>

            {/* Status Toggle */}
            {(editingNav || navId) && (
              <div className="md:col-span-2">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    name="int_status"
                    checked={formData.int_status === 1}
                    onChange={(e) => {
                      setFormData((prev) => ({
                        ...prev,
                        int_status: e.target.checked ? 1 : 0,
                      }));
                    }}
                    className="mr-3 h-5 w-5 text-[#0E2F4B] focus:ring-[#0E2F4B] border-gray-300 rounded"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Active Status
                  </span>
                </label>
                <p className="text-xs text-gray-500 mt-1 ml-8">
                  {formData.int_status === 1
                    ? "Navigation entry is active"
                    : "Navigation entry is inactive"}
                </p>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 mt-8 pt-6 border-t">
            <button
              onClick={() =>
                navigate("/master-data/job-roles", {
                  state: { activeTab: "navigation" },
                })
              }
              className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-6 py-2 bg-[#0E2F4B] text-white rounded-md hover:bg-[#1a3f5f] transition-colors"
            >
              <FaSave /> Update Navigation
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Create Mode - Multi-Row Form
  return (
    <div className="p-6 w-full">
      {/* Header */}
      <div className="mb-6 bg-white rounded-lg shadow-sm p-6 w-full">
        <h1 className="text-2xl font-bold text-gray-900">
          Create Role Navigation
        </h1>
        <p className="text-sm text-gray-600 mt-1">
          Configure multiple navigation entries for a job role at once
        </p>
      </div>

      {/* Job Role Selector */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6 w-full">
        <div ref={roleDropdownRef} className="max-w-md">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Job Role <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <div
              onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md cursor-pointer bg-white flex items-center justify-between"
            >
              <span
                className={selectedJobRole ? "text-gray-900" : "text-gray-400"}
              >
                {selectedJobRole
                  ? `${availableRoles.find((r) => r.job_role_id === selectedJobRole)?.text || ""} (${selectedJobRole})`
                  : "Select Job Role"}
              </span>
              <FaSearch className="text-gray-400" />
            </div>
            {roleDropdownOpen && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-hidden">
                <div className="p-2 border-b">
                  <input
                    type="text"
                    placeholder="Search job role..."
                    value={roleSearch}
                    onChange={(e) => setRoleSearch(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0E2F4B]"
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
                <div className="max-h-48 overflow-y-auto">
                  {filteredRoles.length > 0 ? (
                    filteredRoles.map((role) => (
                      <div
                        key={role.job_role_id}
                        onClick={() => {
                          setSelectedJobRole(role.job_role_id);
                          setRoleDropdownOpen(false);
                          setRoleSearch("");
                        }}
                        className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
                      >
                        <div className="font-medium">{role.text}</div>
                      </div>
                    ))
                  ) : (
                    <div className="px-3 py-2 text-gray-500">
                      No roles found
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Select the job role for all navigation entries
          </p>
        </div>
      </div>

      {/* Navigation Rows Table */}
      <div className="bg-white rounded-lg shadow-md p-6 w-full">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Navigation Entries
          </h2>
          <button
            onClick={handleAddRow}
            className="flex items-center gap-2 px-4 py-2 bg-[#0E2F4B] text-white rounded-md hover:bg-[#1a3f5f] transition-colors"
          >
            <FaPlus /> Add Row
          </button>
        </div>

        <div className="overflow-x-auto w-full">
          <table className="w-full border-collapse min-w-full">
            <thead>
              <tr className="bg-gray-50 border-b-2 border-gray-200">
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                  App ID *
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                  Parent Navigation
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                  Display Label
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                  Display Order
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                  Access Level
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                  Screen Type
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                  Is Group
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {navigationRows.map((row, index) => {
                // Format App ID options for SearchableDropdown
                const appIdOptions = availableAppIds.map((app) => ({
                  id: app.app_id,
                  text: `${app.app_id} - ${app.label}`,
                }));

                // Format Parent Navigation options for SearchableDropdown (include "None" option)
                const parentNavOptions = [
                  { id: "", text: "None (Top Level Menu)" },
                  ...availableParentIds.map((parent) => ({
                    id: parent.job_role_nav_id,
                    text: `${parent.label || parent.app_id} (${parent.job_role_nav_id})`,
                  })),
                ];

                return (
                  <tr
                    key={index}
                    className="border-b border-gray-200 hover:bg-gray-50"
                  >
                    <td className="px-4 py-3 min-w-[250px]">
                      <SearchableDropdown
                        options={appIdOptions}
                        value={row.app_id}
                        onChange={(value) =>
                          handleRowChange(index, "app_id", value)
                        }
                        placeholder="Select App ID"
                        searchPlaceholder="Search app ID..."
                        valueKey="id"
                        displayKey="text"
                        className="text-sm w-full"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <SearchableDropdown
                        options={parentNavOptions}
                        value={row.parent_id || ""}
                        onChange={(value) =>
                          handleRowChange(index, "parent_id", value || "")
                        }
                        placeholder="None (Top Level Menu)"
                        searchPlaceholder="Search parent navigation..."
                        valueKey="id"
                        displayKey="text"
                        className="text-sm"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        value={row.label}
                        onChange={(e) =>
                          handleRowChange(index, "label", e.target.value)
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0E2F4B] text-sm"
                        placeholder="Optional label"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        value={row.sequence}
                        onChange={(e) =>
                          handleRowChange(
                            index,
                            "sequence",
                            parseInt(e.target.value) || 1,
                          )
                        }
                        min="1"
                        className="w-full max-w-[80px] px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0E2F4B] text-sm"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={row.access_level}
                        onChange={(e) =>
                          handleRowChange(index, "access_level", e.target.value)
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0E2F4B] text-sm"
                      >
                        <option value="D">Display Only</option>
                        <option value="A">Full Access</option>
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={row.mob_desk}
                        onChange={(e) =>
                          handleRowChange(index, "mob_desk", e.target.value)
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0E2F4B] text-sm"
                      >
                        <option value="D">Desktop</option>
                        <option value="M">Mobile</option>
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={row.is_group}
                        onChange={(e) =>
                          handleRowChange(index, "is_group", e.target.checked)
                        }
                        className="h-5 w-5 text-[#0E2F4B] focus:ring-[#0E2F4B] border-gray-300 rounded"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleRemoveRow(index)}
                        className="text-red-600 hover:text-red-800 transition-colors"
                        disabled={navigationRows.length === 1}
                      >
                        <FaTrash />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 mt-6 pt-6 border-t">
          <button
            onClick={() =>
              navigate("/master-data/job-roles", {
                state: { activeTab: "navigation" },
              })
            }
            className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSaveMultiple}
            className="flex items-center gap-2 px-6 py-2 bg-[#0E2F4B] text-white rounded-md hover:bg-[#1a3f5f] transition-colors"
          >
            <FaSave /> Create All Navigation Entries
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateJobRoleNavigation;
