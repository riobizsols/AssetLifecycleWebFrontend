import React, { useState } from "react";
import { Maximize, Minimize, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";

const AssetAssignmentList = ({
  title,
  entityType, // 'department' or 'employee'
  entities,
  selectedEntity,
  onEntitySelect,
  onDelete,
  assignmentList,
  fetchAssignments,
  // Department filter props
  showDepartmentFilter = false,
  departments = [],
  selectedDepartment = null,
  onDepartmentSelect = () => {},
  onDepartmentChange = () => {}, // Callback to fetch department's employees
}) => {
  const [isMaximized, setIsMaximized] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const navigate = useNavigate();

  const toggleMaximize = () => setIsMaximized((prev) => !prev);

  const handleDelete = (item) => {
    setItemToDelete(item);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    try {
      await onDelete(itemToDelete);
      fetchAssignments();
      setShowDeleteModal(false);
      toast.success(`Asset unassigned successfully`);
    } catch (err) {
      console.error("Failed to delete assignment", err);
      const errorMessage = err.response?.data?.message || err.response?.data?.error || err.message || "An error occurred";
      toast.error(`Failed to unassign asset: ${errorMessage}`);
    }
  };

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      {/* Selection Section */}
      <div className="bg-white rounded shadow mb-4">
        <div className="bg-[#EDF3F7] px-4 py-2 rounded-t text-[#0E2F4B] font-semibold text-sm">
          {showDepartmentFilter ? 'Select Department and Employee' : 'Department Selection'}
        </div>
        <div className="p-4 flex gap-4 items-end">
          {/* Department Filter Dropdown (Only for Employee view) */}
          {showDepartmentFilter && (
            <div className="w-64">
              <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
              <select
                className="border px-3 py-2 text-sm w-full bg-white text-black focus:outline-none rounded"
                value={selectedDepartment || ""}
                onChange={(e) => {
                  onDepartmentSelect(e.target.value);
                  onDepartmentChange(e.target.value);
                }}
              >
                <option value="">Select Department</option>
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          
          {/* Entity Dropdown */}
          {(!showDepartmentFilter || (showDepartmentFilter && selectedDepartment)) && (
            <div className="w-64">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {entityType === 'department' ? 'Department' : 'Employee'}
              </label>
              <select
                className="border px-3 py-2 text-sm w-full bg-white text-black focus:outline-none rounded"
                value={selectedEntity || ""}
                onChange={(e) => onEntitySelect(e.target.value)}
              >
                <option value="">
                  {`Select ${entityType === 'department' ? 'Department' : 'Employee'}`}
                </option>
                {entities.map((entity) => (
                  <option key={entity.id} value={entity.id}>
                    {entity.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex gap-2">
            <button
              className="bg-[#0E2F4B] text-white px-4 py-2 rounded text-sm disabled:opacity-50"
              onClick={() => {/* Add your Go button functionality here */}}
              disabled={!selectedEntity || (showDepartmentFilter && !selectedDepartment)}
            >
              Go
            </button>
            <button
              className="bg-[#0E2F4B] text-white px-4 py-2 rounded text-sm disabled:opacity-50 flex items-center gap-2"
              onClick={() => navigate('/asset-selection', { 
                state: { 
                  entityId: selectedEntity,
                  entityType: entityType,
                  departmentId: selectedDepartment
                } 
              })}
              disabled={!selectedEntity || (showDepartmentFilter && !selectedDepartment)}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Assign Asset
            </button>
          </div>
        </div>
      </div>
      
      {/* Asset Assignment List Table */}
      <div
        className={`bg-white rounded shadow transition-all duration-300 ${
          isMaximized ? "fixed inset-0 z-50 p-6 m-6 overflow-auto" : ""
        }`}
      >
        <div className="bg-white rounded shadow">
          <div className="bg-[#EDF3F7] px-4 py-2 rounded-t text-[#0E2F4B] font-semibold text-sm flex items-center justify-between">
            {title || 'Current Assets List'}
            <button onClick={toggleMaximize}>
              {isMaximized ? (
                <Minimize className="text-[#0E2F4B]" size={18} />
              ) : (
                <Maximize className="text-[#0E2F4B]" size={18} />
              )}
            </button>
          </div>
          <div className="bg-[#0E2F4B] text-white text-sm overflow-hidden">
            <div className="grid grid-cols-6 px-4 py-2 font-semibold border-b-4 border-yellow-400">
              <div>Asset Type</div>
              <div>Asset ID</div>
              <div>Description</div>
              <div>Assignment Date</div>
              <div>Assigned By</div>
              <div className="text-center">Actions</div>
            </div>

            <div className={`${isMaximized ? "max-h-[60vh] overflow-y-auto" : ""}`}>
              {assignmentList.map((item, i) => (
                <div
                  key={`${item.asset_id}`}
                  className={`grid grid-cols-6 px-4 py-2 items-center border-b ${
                    i % 2 === 0 ? "bg-white" : "bg-gray-100"
                  } text-gray-800`}
                >
                  <div>{item.asset_type}</div>
                  <div>{item.asset_id}</div>
                  <div>{item.description}</div>
                  <div>{item.assignment_date}</div>
                  <div>{item.assigned_by}</div>
                  <div className="flex justify-center">
                    <button onClick={() => handleDelete(item)}>
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
              Do you want to unassign this asset?
            </div>
            <div className="flex justify-end gap-3 px-6 pb-6">
              <button
                className="bg-gray-300 hover:bg-gray-400 text-gray-700 text-sm font-medium py-1.5 px-5 rounded"
                onClick={() => setShowDeleteModal(false)}
              >
                Close
              </button>
              <button
                className="bg-yellow-400 hover:bg-yellow-500 text-white text-sm font-medium py-1.5 px-5 rounded"
                onClick={confirmDelete}
              >
                Unassign
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssetAssignmentList; 