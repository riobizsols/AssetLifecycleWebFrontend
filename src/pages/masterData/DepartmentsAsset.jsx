import React, { useEffect, useState, useRef } from "react";
import API from "../../lib/axios";
import { Maximize, Minimize, Trash2, ChevronDown } from "lucide-react";
import { useNavigate } from "react-router-dom";

const DepartmentsAsset = () => {
  const [departments, setDepartments] = useState([]);
  const [assetTypes, setAssetTypes] = useState([]);
  const [deptAssets, setDeptAssets] = useState([]);

  const [selectedDeptId, setSelectedDeptId] = useState("");
  const [selectedAssetTypeId, setSelectedAssetTypeId] = useState("");
  const [searchAssetType, setSearchAssetType] = useState("");

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  const [isMaximized, setIsMaximized] = useState(false);
  const [showCreateAssetType, setShowCreateAssetType] = useState(false);
  const [newAssetTypeName, setNewAssetTypeName] = useState("");
  const dropdownRef = useRef(null);

  const navigate = useNavigate();

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

  // Fetch asset types
  const fetchAssetTypes = async () => {
    try {
      const res = await API.get("/dept-assets/asset-types");
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
    if (!selectedDeptId || !selectedAssetTypeId) return;
    try {
      await API.post("/dept-assets", {
        dept_id: selectedDeptId,
        asset_type_id: selectedAssetTypeId,
      });
      setSelectedAssetTypeId("");
      fetchDeptAssets();
    } catch (err) {
      console.error("Failed to add asset", err);
    }
  };

  // Add new asset type
  const handleCreateAssetType = async () => {
    if (!newAssetTypeName.trim()) return;
    try {
      await API.post("/asset-types", { text: newAssetTypeName });
      setNewAssetTypeName("");
      setShowCreateAssetType(false);
      fetchAssetTypes();
    } catch (err) {
      console.error("Failed to create asset type", err);
    }
  };

  // Delete entry
  const handleDelete = async () => {
    try {
      await API.delete("/dept-assets", { data: { id: deleteId } });
      setShowDeleteModal(false);
      fetchDeptAssets();
    } catch (err) {
      console.error("Failed to delete", err);
    }
  };

  useEffect(() => {
    fetchDepartments();
    fetchAssetTypes();
    fetchDeptAssets();
  }, []);

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      {/* Department Dropdown */}
      <div className="bg-white rounded shadow mb-4">
        <div className="bg-[#EDF3F7] px-4 py-2 rounded-t text-[#0E2F4B] font-semibold text-sm">
          Department Selection
        </div>
        <div className="p-4 flex gap-4 items-center">
          <select
            className="border px-3 py-2 text-sm w-64 bg-white text-black focus:outline-none"
            value={selectedDeptId}
            onChange={(e) => setSelectedDeptId(e.target.value)}
          >
            <option value="">Select Department</option>
            {departments.map((dept) => (
              <option key={dept.dept_id} value={dept.dept_id}>
                {dept.text}
              </option>
            ))}
          </select>
        </div>
      </div>
      {/* Add asset type Section */}
      <div className="bg-white rounded shadow mb-4">
        <div className="bg-[#EDF3F7] px-4 py-2 rounded-t text-[#0E2F4B] font-semibold text-sm">
          Add Asset
        </div>
        <div className="p-4 flex gap-4 items-center">
          {/* Custom Dropdown */}
          <div className="relative w-64">
            <button
              className="border text-black px-3 py-2 text-sm w-full bg-white focus:outline-none disabled:bg-gray-100 disabled:cursor-not-allowed flex justify-between items-center"
              onClick={() => {
                if (selectedDeptId) dropdownRef.current.classList.toggle("hidden");
              }}
              disabled={!selectedDeptId}
              type="button"
            >
              {selectedAssetTypeId
                ? assetTypes.find((at) => at.asset_type_id === selectedAssetTypeId)?.text || "Select Asset Type"
                : selectedDeptId
                ? "Select Asset Type"
                : "Select Department First"}
              <ChevronDown className="ml-2 w-4 h-4 text-gray-500" />
            </button>
            {/* Dropdown List */}
            <div
              ref={dropdownRef}
              className="absolute left-0 right-0 mt-1 bg-white border rounded shadow-lg max-h-48 overflow-y-auto z-10 hidden"
              style={{ minWidth: "100%" }}
            >
              {/* Sticky Search Input */}
              <div className="sticky top-0 bg-white px-2 py-2 border-b z-20">
                <input
                  type="text"
                  className="w-full border px-2 py-1 rounded text-sm"
                  placeholder="Search Asset Types..."
                  value={searchAssetType}
                  onChange={e => setSearchAssetType(e.target.value)}
                  autoFocus
                />
              </div>
              {/* Filtered Asset Types */}
              {assetTypes
                .filter(at => at.text.toLowerCase().includes(searchAssetType.toLowerCase()))
                .map((at) => (
                  <div
                    key={at.asset_type_id}
                    className={`px-4 py-2 cursor-pointer hover:bg-gray-100 text-sm ${selectedAssetTypeId === at.asset_type_id ? "bg-gray-200" : ""}`}
                    onClick={() => {
                      setSelectedAssetTypeId(at.asset_type_id);
                      dropdownRef.current.classList.add("hidden");
                      setSearchAssetType("");
                    }}
                  >
                    {at.text}
                  </div>
                ))}
              {/* Sticky Create New Option */}
              <div className="sticky bottom-0 bg-white border-t px-4 py-2 cursor-pointer text-blue-600 font-semibold hover:bg-blue-50 text-sm" onClick={() => {
                dropdownRef.current.classList.add("hidden");
                navigate("/master-data/asset-types");
              }}>
                + Create New
              </div>
            </div>
          </div>
          <button
            className="bg-[#0E2F4B] text-white px-4 py-2 rounded text-sm disabled:opacity-50"
            onClick={handleAdd}
            disabled={!selectedDeptId || !selectedAssetTypeId}
          >
            Add
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
            Department–Asset Mappings
            <button onClick={toggleMaximize}>
              {isMaximized ? (
                <Minimize className="text-[#0E2F4B]" size={18} />
              ) : (
                <Maximize className="text-[#0E2F4B]" size={18} />
              )}
            </button>
          </div>
          <div className="bg-[#0E2F4B] text-white text-sm">
            <div className="grid grid-cols-4 px-4 py-2 font-semibold border-b-4 border-yellow-400">
              <div>Mapping ID</div>
              <div>Department</div>
              <div>Asset Type</div>
              <div className="text-center">Actions</div>
            </div>

            <div
              className={`${isMaximized ? "max-h-[60vh] overflow-y-auto" : ""}`}
            >
              {deptAssets.map((item, i) => (
                <div
                  key={item.id}
                  className={`grid grid-cols-4 px-4 py-2 items-center border-b ${
                    i % 2 === 0 ? "bg-white" : "bg-gray-100"
                  } text-gray-800`}
                >
                  <div>{item.id}</div>
                  <div>{item.dept_name}</div>
                  <div>{item.asset_name}</div>
                  <div className="flex justify-center">
                    <button
                      onClick={() => {
                        setDeleteId(item.id);
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
              <span>Confirm Delete</span>
              <button
                onClick={() => setShowDeleteModal(false)}
                className="text-yellow-400 text-xl font-bold"
              >
                ×
              </button>
            </div>
            <div className="h-[3px] bg-yellow-400" />
            <div className="px-6 py-6 text-center text-gray-800 text-sm">
              Do you want to delete mapping <strong>{deleteId}</strong>?
            </div>
            <div className="flex justify-end gap-3 px-6 pb-6">
              <button
                className="bg-gray-300 hover:bg-gray-400 text-gray-700 text-sm font-medium py-1.5 px-5 rounded"
                onClick={() => setShowDeleteModal(false)}
              >
                Cancel
              </button>
              <button
                className="bg-yellow-400 hover:bg-yellow-500 text-white text-sm font-medium py-1.5 px-5 rounded"
                onClick={handleDelete}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DepartmentsAsset;
