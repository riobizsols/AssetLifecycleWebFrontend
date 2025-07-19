import React, { useEffect, useState } from "react";
import { Maximize, Minimize, Pencil, Trash2 } from "lucide-react";
import API from "../../lib/axios";
import { toast } from "react-hot-toast";

const Departments = () => {
  const [departments, setDepartments] = useState([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedDept, setSelectedDept] = useState(null);
  const [editName, setEditName] = useState("");
  const [nextDeptId, setNextDeptId] = useState("");
  const [newDeptName, setNewDeptName] = useState("");
  const [isMaximized, setIsMaximized] = useState(false);

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
    if (!newDeptName.trim()) {
      toast.error("Department name is required");
      return;
    }
    try {
      await API.post("/departments", { text: newDeptName.trim() });
      setNewDeptName("");
      fetchDepartments();
      fetchNextDeptId();
      toast.success(`Department "${newDeptName}" created successfully`);
    } catch (err) {
      console.error("Error creating department:", err);
      const errorMessage = err.response?.data?.message || err.message || "An error occurred";
      toast.error(`Failed to create department: ${errorMessage}`);
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
      setShowDeleteModal(false);
      fetchDepartments();
      fetchNextDeptId();
      toast.success(`Department "${selectedDept.text}" deleted successfully`);
    } catch (err) {
      console.error("Error deleting department:", err);
      
      // Handle specific foreign key constraint errors
      if (err.response?.data?.error === "Cannot delete department") {
        const hint = err.response?.data?.hint || "";
        toast.error(
          `${err.response?.data?.message || "Cannot delete department"}. ${hint}`,
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
        toast.error(`Failed to delete department: ${errorMessage}`);
      }
    }
  };

  const handleEdit = (dept) => {
    setSelectedDept(dept);
    setEditName(dept.text);
    setShowEditModal(true);
  };

  const confirmUpdate = async () => {
    if (!editName.trim()) {
      toast.error("Department name is required");
      return;
    }
    try {
      await API.put("/departments", {
        dept_id: selectedDept.dept_id,
        text: editName.trim(),
      });
      setShowEditModal(false);
      fetchDepartments();
      toast.success(`Department "${editName}" updated successfully`);
    } catch (err) {
      console.error("Error updating department:", err);
      const errorMessage = err.response?.data?.message || err.message || "An error occurred";
      toast.error(`Failed to update department: ${errorMessage}`);
    }
  };

  return (
    <div className="flex">
      <div className="flex-1 p-6 bg-gray-100 relative">
        {/* Add Form */}
        <div className="bg-white rounded shadow mb-6">
          <div className="bg-[#EDF3F7] px-4 py-2 rounded-t text-[#0E2F4B] font-semibold text-sm">
            Add / Modify Departments
          </div>
          <div className="p-4 flex gap-4 items-end">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Department ID</label>
              <input
                className="border px-3 py-2 rounded w-64 text-sm bg-gray-50 text-gray-700 font-medium"
                placeholder="Department ID"
                value={nextDeptId || "Loading..."}
                disabled
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Department Name</label>
              <input
                className="border px-3 py-2 rounded w-64 text-sm"
                placeholder="Department Name"
                value={newDeptName}
                onChange={(e) => setNewDeptName(e.target.value)}
              />
            </div>
            <button
              className="bg-[#0E2F4B] text-white px-4 py-2 rounded text-sm h-10"
              onClick={handleCreate}
            >
              Add
            </button>
          </div>
        </div>

        {/* Department List */}
        <div
          className={`bg-white rounded shadow transition-all duration-300 ${
            isMaximized ? "fixed inset-0 z-50 p-6 m-6 overflow-auto" : ""
          }`}
        >
          <div className="bg-white rounded shadow">
            <div className="bg-[#EDF3F7] px-4 py-2 rounded-t text-[#0E2F4B] font-semibold text-sm flex items-center justify-between">
              Department List
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
                <div>Department Id</div>
                <div>Department Name</div>
                <div className="text-center">Actions</div>
              </div>

              <div
                className={`${
                  isMaximized ? "max-h-[60vh] overflow-y-auto" : ""
                }`}
              >
                {departments.map((dept, i) => (
                  <div
                    key={dept.dept_id}
                    className={`grid grid-cols-3 px-4 py-2 items-center border-b ${
                      i % 2 === 0 ? "bg-white" : "bg-gray-100"
                    } text-gray-800`}
                  >
                    <div>{dept.dept_id}</div>
                    <div>{dept.text}</div>
                    <div className="flex justify-center gap-4">
                      <button onClick={() => handleEdit(dept)}>
                        <Pencil className="text-[#0E2F4B]" size={18} />
                      </button>
                      <button onClick={() => handleDelete(dept)}>
                        <Trash2 className="text-yellow-500" size={18} />
                      </button>
                    </div>
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
                Do you want to delete department{" "}
                <strong>“{selectedDept?.text}”</strong>?
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
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {showEditModal && (
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white w-[500px] rounded shadow-lg">
              <div className="bg-[#003b6f] text-white font-semibold px-6 py-3 flex justify-between items-center rounded-t">
                <span>Update Department</span>
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
                  <label className="text-sm font-medium">Department Id</label>
                  <input
                    value={selectedDept?.dept_id}
                    className="border px-3 py-2 rounded w-full mt-1 bg-gray-100"
                    disabled
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Department Name</label>
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="border px-3 py-2 rounded w-full mt-1"
                  />
                </div>
                <div className="flex justify-end gap-4 mt-6">
                  <button
                    className="bg-gray-300 px-4 py-1 rounded"
                    onClick={() => setShowEditModal(false)}
                  >
                    Close
                  </button>
                  <button
                    className="bg-yellow-400 px-4 py-1 rounded"
                    onClick={confirmUpdate}
                  >
                    Update
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
