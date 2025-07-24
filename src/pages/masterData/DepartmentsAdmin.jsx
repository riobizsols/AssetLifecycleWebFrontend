import React, { useEffect, useState } from "react";
import API from "../../lib/axios";
import { Maximize, Minimize, Trash2, ChevronDown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";

const DepartmentsAdmin = () => {
  const [departments, setDepartments] = useState([]);
  const [selectedDept, setSelectedDept] = useState(null);
  const [adminList, setAdminList] = useState([]);
  const [usersToAdd, setUsersToAdd] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);

   const [isMaximized, setIsMaximized] = useState(false);
   const [submitAttempted, setSubmitAttempted] = useState(false);
  
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
      toast.error("Failed to fetch departments");
    }
  };

  // Fetch all admins
  const fetchAllAdmins = async () => {
    try {
      const res = await API.get("/admin/dept-admins");
      setAdminList(res.data);
    } catch (err) {
      console.error("Failed to fetch all admins", err);
      toast.error("Failed to fetch admin list");
    }
  };

  // Fetch all users to add as admin (no department condition)
  const fetchUsersToAdd = async () => {
    try {
      console.log("Fetching all users...");
      const res = await API.get("/users/get-users");
      console.log("Users fetched:", res.data);
      setUsersToAdd(res.data);
    } catch (err) {
      console.error("Failed to fetch users to add", err);
      toast.error("Failed to fetch users list");
    }
  };

  const handleAddAdmin = async () => {
    setSubmitAttempted(true);
    if (!selectedUser || !selectedDept) {
      toast.error("Please select both department and user");
      return;
    }
    
    try {
      const selectedUserName = usersToAdd.find(u => u.user_id === selectedUser)?.full_name;
      const selectedDeptName = departments.find(d => d.dept_id === selectedDept)?.text;
      
      await API.post("/admin/dept-admins", {
        dept_id: selectedDept,
        user_id: selectedUser,
      });
      
      fetchAllAdmins();
      setSelectedUser(null);
      toast.success(`"${selectedUserName}" added as admin for "${selectedDeptName}" department`);
    } catch (err) {
      console.error("Failed to add admin", err);
      const errorMessage = err.response?.data?.message || err.response?.data?.error || err.message || "An error occurred";
      toast.error(`Failed to add admin: ${errorMessage}`);
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
      toast.success(`"${userToDelete.full_name}" removed as admin from "${userToDelete.dept_name}" department`);
    } catch (err) {
      console.error("Failed to delete admin", err);
      const errorMessage = err.response?.data?.message || err.response?.data?.error || err.message || "An error occurred";
      toast.error(`Failed to remove admin: ${errorMessage}`);
    }
  };

  useEffect(() => {
    fetchDepartments();
    fetchAllAdmins();
    fetchUsersToAdd(); // Fetch all users on component mount
  }, []);

  // Helper for invalid field
  const isFieldInvalid = (val) => submitAttempted && !val;

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      {/* Department Dropdown */}
      <div className="bg-white rounded shadow mb-4">
        <div className="bg-[#EDF3F7] px-4 py-2 rounded-t text-[#0E2F4B] font-semibold text-sm">
          Department Selection
        </div>
        <div className="p-4 flex gap-4 items-center">
          <div className="flex flex-col">
            <label className="text-sm font-medium mb-1">
              Department <span className="text-red-500">*</span>
            </label>
            <select
              className={`border px-3 py-2 text-sm w-64 bg-white text-black focus:outline-none ${isFieldInvalid(selectedDept) ? 'border-red-500' : 'border-gray-300'}`}
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
      </div>
      {/* Add Admin Section */}
      <div className="bg-white rounded shadow mb-4">
        <div className="bg-[#EDF3F7] px-4 py-2 rounded-t text-[#0E2F4B] font-semibold text-sm">
          Add Admin
        </div>
        <div className="p-4 flex gap-4 items-center">
          {/* Custom Searchable Dropdown for Users */}
          <div className="flex flex-col w-64">
            <label className="text-sm font-medium mb-1">
              User <span className="text-red-500">*</span>
            </label>
            <div className="relative w-full">
              <button
                className={`border text-black px-3 py-2 text-sm w-full bg-white focus:outline-none flex justify-between items-center ${isFieldInvalid(selectedUser) ? 'border-red-500' : 'border-gray-300'}`}
                onClick={() => {
                  dropdownUserRef.current.classList.toggle("hidden");
                }}
                type="button"
              >
                {selectedUser
                  ? usersToAdd.find((u) => u.user_id === selectedUser)?.full_name || "Select User"
                  : "Select User"}
                <ChevronDown className="ml-2 w-4 h-4 text-gray-500" />
              </button>
              {/* Dropdown List */}
              <div
                ref={dropdownUserRef}
                className="absolute left-0 right-0 mt-1 bg-white border rounded shadow-lg max-h-64 overflow-y-auto z-10 hidden"
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
                  .filter(u => 
                    u.full_name.toLowerCase().includes(searchUser.toLowerCase()) ||
                    u.user_id.toLowerCase().includes(searchUser.toLowerCase())
                  )
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
                      <div className="font-medium">{user.full_name}</div>
                      <div className="text-xs text-gray-500">ID: {user.user_id}</div>
                    </div>
                  ))}
                {/* Sticky Create New User Option */}
                <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-4 py-2">
                  <button
                    className="w-full text-left text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-2"
                    onClick={() => {
                      dropdownUserRef.current.classList.add("hidden");
                      setSearchUser("");
                      navigate("/master-data/users");
                    }}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Create New User
                  </button>
                </div>
              </div>
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
