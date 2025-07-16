import React, { useEffect, useState } from "react";
import API from "../../lib/axios";
import { Maximize, Minimize, Trash2, ChevronDown } from "lucide-react";
import { useNavigate } from "react-router-dom";

const DepartmentsAdmin = () => {
  const [departments, setDepartments] = useState([]);
  const [selectedDept, setSelectedDept] = useState(null);
  const [adminList, setAdminList] = useState([]);
  const [usersToAdd, setUsersToAdd] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);

   const [isMaximized, setIsMaximized] = useState(false);
  
    const toggleMaximize = () => setIsMaximized((prev) => !prev);

  const [searchUser, setSearchUser] = useState("");
  const dropdownUserRef = React.useRef(null);
  const navigate = useNavigate();

  // Fetch departments
  const fetchDepartments = async () => {
    try {
      const res = await API.get("/admin/departments");
      setDepartments(res.data);
    } catch (err) {
      console.error("Failed to fetch departments", err);
    }
  };

  // Fetch all admins
  const fetchAllAdmins = async () => {
    try {
      const res = await API.get("/admin/dept-admins"); // NOTE: update backend to support this
      setAdminList(res.data);
    } catch (err) {
      console.error("Failed to fetch all admins", err);
    }
  };

  // Fetch users to add as admin (only when department is selected)
  const fetchUsersToAdd = async (dept_id) => {
    if (!dept_id) return;
    try {
      const res = await API.get(`/admin/dept-users/${dept_id}`);
      setUsersToAdd(res.data);
    } catch (err) {
      console.error("Failed to fetch users to add", err);
    }
  };

  const handleAddAdmin = async () => {
    if (!selectedUser || !selectedDept) return;
    try {
      await API.post("/admin/dept-admins", {
        dept_id: selectedDept,
        user_id: selectedUser,
      });
      fetchAllAdmins();
      setSelectedUser(null);
    } catch (err) {
      console.error("Failed to add admin", err);
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
      fetchAllAdmins();
      setShowDeleteModal(false);
    } catch (err) {
      console.error("Failed to delete admin", err);
    }
  };

  useEffect(() => {
    fetchDepartments();
    fetchAllAdmins();
  }, []);

  useEffect(() => {
    if (selectedDept) {
      fetchUsersToAdd(selectedDept);
    }
  }, [selectedDept]);

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
            value={selectedDept || ""}
            onChange={(e) => setSelectedDept(e.target.value)}
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
      {/* Add Admin Section */}
      <div className="bg-white rounded shadow mb-4">
        <div className="bg-[#EDF3F7] px-4 py-2 rounded-t text-[#0E2F4B] font-semibold text-sm">
          Add Admin
        </div>
        <div className="p-4 flex gap-4 items-center">
          {/* Custom Searchable Dropdown for Users */}
          <div className="relative w-64">
            <button
              className="border text-black px-3 py-2 text-sm w-full bg-white focus:outline-none disabled:bg-gray-100 disabled:cursor-not-allowed flex justify-between items-center"
              onClick={() => {
                if (selectedDept) dropdownUserRef.current.classList.toggle("hidden");
              }}
              disabled={!selectedDept}
              type="button"
            >
              {selectedUser
                ? usersToAdd.find((u) => u.user_id === selectedUser)?.full_name || "Select User"
                : selectedDept
                ? "Select User"
                : "Select Department First"}
              <ChevronDown className="ml-2 w-4 h-4 text-gray-500" />
            </button>
            {/* Dropdown List */}
            <div
              ref={dropdownUserRef}
              className="absolute left-0 right-0 mt-1 bg-white border rounded shadow-lg max-h-48 overflow-y-auto z-10 hidden"
              style={{ minWidth: "100%" }}
            >
              {/* Sticky Search Input */}
              <div className="sticky top-0 bg-white px-2 py-2 border-b z-20">
                <input
                  type="text"
                  className="w-full border px-2 py-1 rounded text-sm"
                  placeholder="Search Users..."
                  value={searchUser}
                  onChange={e => setSearchUser(e.target.value)}
                  autoFocus
                />
              </div>
              {/* Filtered Users */}
              {usersToAdd
                .filter(u => u.full_name.toLowerCase().includes(searchUser.toLowerCase()))
                .map((user) => (
                  <div
                    key={user.user_id}
                    className={`px-4 py-2 cursor-pointer hover:bg-gray-100 text-sm ${selectedUser === user.user_id ? "bg-gray-200" : ""}`}
                    onClick={() => {
                      setSelectedUser(user.user_id);
                      dropdownUserRef.current.classList.add("hidden");
                      setSearchUser("");
                    }}
                  >
                    {user.full_name}
                  </div>
                ))}
            </div>
          </div>
          <button
            className="bg-[#0E2F4B] text-white px-4 py-2 rounded text-sm disabled:opacity-50"
            onClick={handleAddAdmin}
            disabled={!selectedUser || !selectedDept}
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
            Admin List
            <button onClick={toggleMaximize}>
              {isMaximized ? (
                <Minimize className="text-[#0E2F4B]" size={18} />
              ) : (
                <Maximize className="text-[#0E2F4B]" size={18} />
              )}
            </button>
          </div>
          <div className="bg-[#0E2F4B] text-white text-sm overflow-hidden">
            <div className="grid grid-cols-4 px-4 py-2 font-semibold border-b-4 border-yellow-400">
              <div>User ID</div>
              <div>Admin Name</div>
              <div>Department Name</div>
              <div className="text-center">Actions</div>
            </div>

            <div
              className={`${isMaximized ? "max-h-[60vh] overflow-y-auto" : ""}`}
            >
              {adminList.map((admin, i) => (
                <div
                  key={`${admin.dept_id}-${admin.user_id}`}
                  className={`grid grid-cols-4 px-4 py-2 items-center border-b ${
                    i % 2 === 0 ? "bg-white" : "bg-gray-100"
                  } text-gray-800`}
                >
                  <div>{admin.user_id}</div>
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
              Do you want to remove <strong>{userToDelete?.name}</strong> from
              admin list?
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
    </div>
  );
};

export default DepartmentsAdmin;
