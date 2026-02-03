import React, { useEffect, useState, useRef } from "react";
import API from "../../lib/axios";
import { Maximize, Minimize, Trash2, ChevronDown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import useAuditLog from "../../hooks/useAuditLog";
import { DEPARTMENTS_ASSET_APP_ID } from "../../constants/departmentsAssetAuditEvents";
import { useLanguage } from "../../contexts/LanguageContext";

const DepartmentsAsset = () => {
  const [departments, setDepartments] = useState([]);
  const [assetTypes, setAssetTypes] = useState([]);
  const [deptAssets, setDeptAssets] = useState([]);

  const [selectedDeptId, setSelectedDeptId] = useState("");
  const [selectedAssetTypeId, setSelectedAssetTypeId] = useState("");
  const [searchAssetType, setSearchAssetType] = useState("");
  const [searchDept, setSearchDept] = useState("");

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  const [isMaximized, setIsMaximized] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [_showCreateAssetType, _setShowCreateAssetType] = useState(false);
  const [newAssetTypeName, setNewAssetTypeName] = useState("");
  const dropdownRef = useRef(null);
  const dropdownDeptRef = useRef(null);

  const navigate = useNavigate();

  // Initialize audit logging
  const { recordActionByNameWithFetch } = useAuditLog(DEPARTMENTS_ASSET_APP_ID);
  
  // Language context
  const { t } = useLanguage();

  const toggleMaximize = () => setIsMaximized((prev) => !prev);

  useEffect(() => {
    document.body.style.overflow = isMaximized ? "hidden" : "auto";
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [isMaximized]);

  // Fetch all departments
  const fetchDepartments = async () => {
    try {
      const res = await API.get("/admin/departments");
      setDepartments(res.data);
    } catch (err) {
      console.error("Failed to fetch departments", err);
    }
  };

  // Fetch asset types - only department assignment type
  const fetchAssetTypes = async () => {
    try {
      const res = await API.get("/dept-assets/asset-types?assignment_type=department");
      setAssetTypes(res.data);
    } catch (err) {
      console.error("Failed to fetch asset types", err);
    }
  };

  // Fetch mapped entries
  const fetchDeptAssets = async () => {
    try {
      const res = await API.get("/dept-assets");
      setDeptAssets(res.data);
    } catch (err) {
      console.error("Failed to fetch dept-assets", err);
    }
  };

  // Add mapping
  const handleAdd = async () => {
    setSubmitAttempted(true);
    if (!selectedDeptId || !selectedAssetTypeId) {
      toast.error(t('departments.pleaseSelectBothDepartmentAndAssetType'));
      return;
    }
    
    try {
      const selectedDeptName = departments.find(d => d.dept_id === selectedDeptId)?.text;
      const selectedAssetTypeName = assetTypes.find(at => at.asset_type_id === selectedAssetTypeId)?.text;
      
      const response = await API.post("/dept-assets", {
        dept_id: selectedDeptId,
        asset_type_id: selectedAssetTypeId,
      });
      
      // Log create action
      await recordActionByNameWithFetch('Create', {
        deptId: selectedDeptId,
        deptName: selectedDeptName,
        assetTypeId: selectedAssetTypeId,
        assetTypeName: selectedAssetTypeName,
        mappingId: response.data?.dept_asset_type_id,
        action: 'Department Asset Type Mapping Created'
      });
      
      setSelectedAssetTypeId("");
      setSubmitAttempted(false); // Reset submit attempt flag to remove red border
      fetchDeptAssets();
      toast.success(t('departments.assetMappingAddedSuccessfully', { assetTypeName: selectedAssetTypeName, deptName: selectedDeptName }));
    } catch (err) {
      console.error("Failed to add asset", err);
      const errorMessage = err.response?.data?.message || err.response?.data?.error || err.message || "An error occurred";
      toast.error(`${t('departments.failedToAddAsset')}: ${errorMessage}`);
    }
  };

  // Add new asset type
  const _handleCreateAssetType = async () => {
    if (!newAssetTypeName.trim()) return;
    try {
      await API.post("/asset-types", { text: newAssetTypeName });
      setNewAssetTypeName("");
      _setShowCreateAssetType(false);
      fetchAssetTypes();
    } catch (err) {
      console.error("Failed to create asset type", err);
    }
  };

  // Delete entry
  const handleDelete = async () => {
    try {
      // Find the mapping details before deletion for audit logging
      const mappingToDelete = deptAssets.find(item => item.dept_asset_type_id === deleteId);
      
      await API.delete("/dept-assets", { data: { dept_asset_type_id: deleteId } });
      
      // Log delete action
      await recordActionByNameWithFetch('Delete', {
        mappingId: deleteId,
        deptId: mappingToDelete?.dept_id,
        deptName: mappingToDelete?.dept_name,
        assetTypeId: mappingToDelete?.asset_type_id,
        assetTypeName: mappingToDelete?.asset_name,
        action: 'Department Asset Type Mapping Deleted'
      });
      
      setShowDeleteModal(false);
      fetchDeptAssets();
      toast.success(t('departments.assetMappingRemovedSuccessfully'));
    } catch (err) {
      console.error("Failed to delete", err);
      const errorMessage = err.response?.data?.message || err.response?.data?.error || err.message || "An error occurred";
      toast.error(`${t('departments.failedToRemoveAssetMapping')}: ${errorMessage}`);
    }
  };

  // Helper for invalid field
  const isFieldInvalid = (val) => submitAttempted && !val;

  // Get available asset types for the selected department (exclude already assigned ones)
  const getAvailableAssetTypes = () => {
    if (!selectedDeptId) return assetTypes;
    
    // Get asset type IDs already assigned to this department
    const assignedAssetTypeIds = deptAssets
      .filter(da => da.dept_id === selectedDeptId)
      .map(da => da.asset_type_id);
    
    // Return only unassigned asset types
    return assetTypes.filter(at => !assignedAssetTypeIds.includes(at.asset_type_id));
  };

  useEffect(() => {
    fetchDepartments();
    fetchAssetTypes();
    fetchDeptAssets();
  }, []);

  // Handle click outside to close dropdowns
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        dropdownRef.current.classList.add("hidden");
        setSearchAssetType("");
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
                className={`border text-black px-3 py-2 text-sm w-full bg-white focus:outline-none flex justify-between items-center ${isFieldInvalid(selectedDeptId) ? 'border-red-500' : 'border-gray-300'}`}
                onClick={() => {
                  dropdownDeptRef.current.classList.toggle("hidden");
                }}
                type="button"
              >
                {selectedDeptId
                  ? departments.find((d) => d.dept_id === selectedDeptId)?.text || t('departments.selectDepartment')
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
                      className={`px-4 py-2 cursor-pointer hover:bg-gray-100 text-sm ${selectedDeptId === dept.dept_id ? "bg-gray-200" : ""}`}
                      onClick={() => {
                        setSelectedDeptId(dept.dept_id);
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
      {/* Add asset type Section */}
      <div className="bg-white rounded shadow mb-4">
        <div className="bg-[#EDF3F7] px-4 py-2 rounded-t text-[#0E2F4B] font-semibold text-sm">
          {t('departments.addAsset')}
        </div>
        <div className="p-4 flex gap-4 items-end">
          <div className="flex flex-col w-64">
            <label className="text-sm font-medium mb-1">
              {t('departments.assetType')} <span className="text-red-500">*</span>
            </label>
            {/* Custom Dropdown */}
            <div className="relative w-full">
              <button
                className={`border text-black px-3 py-2 text-sm w-full bg-white focus:outline-none disabled:bg-gray-100 disabled:cursor-not-allowed flex justify-between items-center ${isFieldInvalid(selectedAssetTypeId) ? 'border-red-500' : 'border-gray-300'}`}
                onClick={() => {
                  if (selectedDeptId) dropdownRef.current.classList.toggle("hidden");
                }}
                disabled={!selectedDeptId}
                type="button"
              >
                {selectedAssetTypeId
                  ? getAvailableAssetTypes().find((at) => at.asset_type_id === selectedAssetTypeId)?.text || assetTypes.find((at) => at.asset_type_id === selectedAssetTypeId)?.text || t('departments.selectAssetType')
                  : selectedDeptId
                  ? t('departments.selectAssetType')
                  : t('departments.selectDepartmentFirst')}
                <ChevronDown className="ml-2 w-4 h-4 text-gray-500" />
              </button>
              {/* Dropdown List */}
              <div
                ref={dropdownRef}
                className="absolute left-0 right-0 mt-1 bg-white border rounded shadow-lg max-h-96 overflow-y-auto z-10 hidden"
                style={{ minWidth: "100%" }}
              >
                {/* Sticky Search Input */}
                <div className="sticky top-0 bg-white px-2 py-2 border-b z-20">
                  <input
                    type="text"
                    className="w-full border px-2 py-1 rounded text-sm"
                    placeholder={t('departments.searchAssetTypes')}
                    value={searchAssetType}
                    onChange={e => setSearchAssetType(e.target.value)}
                    autoFocus
                  />
                </div>
                {/* Filtered Asset Types */}
                {getAvailableAssetTypes()
                  .filter(at => at.text.toLowerCase().includes(searchAssetType.toLowerCase()))
                  .map((at) => (
                    <div
                      key={at.asset_type_id}
                      className={`px-4 py-2 cursor-pointer hover:bg-gray-100 text-sm ${selectedAssetTypeId === at.asset_type_id ? "bg-gray-200" : ""}`}
                      onClick={() => {
                        setSelectedAssetTypeId(at.asset_type_id);
                        setSubmitAttempted(false); // Reset validation state when selecting
                        dropdownRef.current.classList.add("hidden");
                        setSearchAssetType("");
                      }}
                    >
                      {at.text}
                    </div>
                  ))}
                {getAvailableAssetTypes().filter(at => at.text.toLowerCase().includes(searchAssetType.toLowerCase())).length === 0 && (
                  <div className="px-4 py-2 text-sm text-gray-500 text-center">
                    {t('departments.noAvailableAssetTypes')}
                  </div>
                )}
                {/* Sticky Create New Option */}
                <div className="sticky bottom-0 bg-white border-t px-4 py-2 cursor-pointer text-blue-600 font-semibold hover:bg-blue-50 text-sm" onClick={() => {
                  dropdownRef.current.classList.add("hidden");
                  navigate("/master-data/asset-types");
                }}>
                  + {t('departments.createNew')}
                </div>
              </div>
            </div>
          </div>
          <button
            className="bg-[#0E2F4B] text-white px-4 py-2 rounded text-sm disabled:opacity-50"
            onClick={handleAdd}
            disabled={!selectedDeptId || !selectedAssetTypeId}
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
            {t('departments.departmentAssetMappings')}
            <button onClick={toggleMaximize}>
              {isMaximized ? (
                <Minimize className="text-[#0E2F4B]" size={18} />
              ) : (
                <Maximize className="text-[#0E2F4B]" size={18} />
              )}
            </button>
          </div>
          <div className="bg-[#0E2F4B] text-white text-sm">
            <div className="grid grid-cols-3 px-4 py-2 font-semibold border-b-4 border-yellow-400">
              <div>{t('common.department')}</div>
              <div>{t('departments.assetType')}</div>
              <div className="text-center">{t('common.actions')}</div>
            </div>

            <div
              className={`${isMaximized ? "max-h-[60vh] overflow-y-auto" : ""}`}
            >
              {deptAssets.map((item, i) => (
                <div
                  key={item.dept_asset_type_id}
                  className={`grid grid-cols-3 px-4 py-2 items-center border-b ${
                    i % 2 === 0 ? "bg-white" : "bg-gray-100"
                  } text-gray-800`}
                >
                  <div>{item.dept_name}</div>
                  <div>{item.asset_name}</div>
                  <div className="flex justify-center">
                    <button
                      onClick={() => {
                        setDeleteId(item.dept_asset_type_id);
                        setShowDeleteModal(true);
                      }}
                    >
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
              {t('departments.doYouWantToDeleteMapping', { id: deleteId })}
            </div>
            <div className="flex justify-end gap-3 px-6 pb-6">
              <button
                className="bg-gray-300 hover:bg-gray-400 text-gray-700 text-sm font-medium py-1.5 px-5 rounded"
                onClick={() => setShowDeleteModal(false)}
              >
                {t('common.cancel')}
              </button>
              <button
                className="bg-yellow-400 hover:bg-yellow-500 text-white text-sm font-medium py-1.5 px-5 rounded"
                onClick={handleDelete}
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

export default DepartmentsAsset;
