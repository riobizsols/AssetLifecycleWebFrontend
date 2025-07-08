import React, { useEffect, useState } from "react";
import API from "../../lib/axios";
import { Trash2 } from "lucide-react";

const DepartmentsAsset = () => {
  const [departments, setDepartments] = useState([]);
  const [assetTypes, setAssetTypes] = useState([]);
  const [deptAssets, setDeptAssets] = useState([]);

  const [selectedDeptId, setSelectedDeptId] = useState("");
  const [selectedAssetTypeId, setSelectedAssetTypeId] = useState("");

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

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
          <select
            className="border text-black px-3 py-2 text-sm w-64 bg-white focus:outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
            value={selectedAssetTypeId}
            onChange={(e) => setSelectedAssetTypeId(e.target.value)}
            disabled={!selectedDeptId}
          >
            <option value="">
              {selectedDeptId ? "Select Asset Type" : "Select Department First"}

            </option>
            {assetTypes.map((at) => (
              <option key={at.asset_type_id} value={at.asset_type_id}>
                {at.text}
              </option>
            ))}
          </select>
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
      <div className="bg-white rounded shadow">
        <div className="bg-[#EDF3F7] px-4 py-2 rounded-t text-[#0E2F4B] font-semibold text-sm">
          Department–Asset Mappings
        </div>
        <div className="bg-[#0E2F4B] text-white text-sm overflow-hidden">
          <div className="grid grid-cols-4 px-4 py-2 font-semibold border-b-4 border-yellow-400">
            <div>Mapping ID</div>
            <div>Department</div>
            <div>Asset Type</div>
            <div className="text-center">Actions</div>
          </div>
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


