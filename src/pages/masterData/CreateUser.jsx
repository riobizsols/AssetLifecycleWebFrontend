import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import API from "../../lib/axios";
import { useAuthStore } from "../../store/useAuthStore";
import useAuditLog from "../../hooks/useAuditLog";
import { USERS_APP_ID } from "../../constants/usersAuditEvents";

const CreateUser = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { recordActionByNameWithFetch } = useAuditLog(USERS_APP_ID);

  const [form, setForm] = useState({
    first_name: "",
    middle_name: "",
    last_name: "",
    email: "",
    phone: "",
    language_code: "en",
    dept_id: "",
    branch_id: "",
    employee_type: "",
    joining_date: "",
    int_status: "Active",
  });

  const [loading, setLoading] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [branches, setBranches] = useState([]);

  // Fetch departments
  const fetchDepartments = async () => {
    try {
      const res = await API.get("/admin/departments");
      setDepartments(res.data || []);
    } catch (err) {
      console.error("Failed to fetch departments", err);
      toast.error("Failed to fetch departments");
    }
  };

  // Fetch branches
  const fetchBranches = async () => {
    try {
      const response = await API.get("/branches");
      setBranches(response.data || []);
    } catch (err) {
      console.error("Failed to fetch branches", err);
      toast.error("Failed to fetch branches");
    }
  };

  useEffect(() => {
    fetchDepartments();
    fetchBranches();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitAttempted(true);

    // Validate form fields
    if (!form.first_name.trim()) {
      toast.error("First name is required");
      return;
    }
    
    
    if (!form.email.trim()) {
      toast.error("Email is required");
      return;
    }
    if (!form.phone.trim()) {
      toast.error("Phone number is required");
      return;
    }
    if (!form.dept_id) {
      toast.error("Department is required");
      return;
    }
    if (!form.branch_id) {
      toast.error("Branch is required");
      return;
    }

    try {
      setLoading(true);
      
      // Construct full_name from first_name + middle_name + last_name
      const nameParts = [];
      if (form.first_name.trim()) nameParts.push(form.first_name.trim());
      if (form.middle_name.trim()) nameParts.push(form.middle_name.trim());
      if (form.last_name.trim()) nameParts.push(form.last_name.trim());
      const fullName = nameParts.join(' ').trim();
      
      // Prepare employee data for backend
      const employeeData = {
        first_name: form.first_name.trim(),
        middle_name: form.middle_name.trim() || null,
        last_name: form.last_name.trim() || null,
        name: form.first_name.trim(), // Use first_name as name field
        full_name: fullName,
        email_id: form.email.trim(),
        phone_number: form.phone.trim(),
        language_code: form.language_code,
        dept_id: form.dept_id,
        branch_id: form.branch_id,
        employee_type: form.employee_type || null,
        joining_date: form.joining_date || null,
        int_status: form.int_status === "Active" ? 1 : 0,
      };

      // Call the employees API endpoint
      const response = await API.post("/employees", employeeData);

      // Log the action
      await recordActionByNameWithFetch('Create', {
        firstName: form.first_name,
        middleName: form.middle_name,
        lastName: form.last_name,
        fullName: fullName,
        email: form.email,
        phone: form.phone,
        languageCode: form.language_code,
        deptId: form.dept_id,
        branchId: form.branch_id,
        employeeType: form.employee_type,
        joiningDate: form.joining_date,
        action: 'Employee Created'
      });

      toast.success("Employee created successfully!");
      navigate("/master-data/user-roles");
    } catch (error) {
      console.error("Error creating user:", error);
      const errorMessage = error.response?.data?.message || 
                         error.response?.data?.error || 
                         "Failed to create user";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Helper for invalid field
  const isFieldInvalid = (val) => submitAttempted && !val;

  return (
    <div className="max-w-[1000px] mx-auto mt-8 bg-white shadow rounded">
      <div className="text-center text-lg font-semibold bg-[#0E2F4B] text-white py-3 border-b-4 border-[#FFC107] rounded-t">
        Create Employee
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm mb-1 font-medium">
              First Name <span className="text-red-500">*</span>
            </label>
            <input
              name="first_name"
              type="text"
              value={form.first_name}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border text-sm bg-white ${
                isFieldInvalid(form.first_name) ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Enter First Name"
            />
          </div>

          <div>
            <label className="block text-sm mb-1 font-medium">
              Middle Name
            </label>
            <input
              name="middle_name"
              type="text"
              value={form.middle_name}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border text-sm bg-white border-gray-300"
              placeholder="Enter Middle Name"
            />
          </div>

          <div>
            <label className="block text-sm mb-1 font-medium">
              Last Name
            </label>
            <input
              name="last_name"
              type="text"
              value={form.last_name}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border text-sm bg-white border-gray-300"
              placeholder="Enter Last Name"
            />
          </div>

          <div>
            <label className="block text-sm mb-1 font-medium">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              name="email"
              type="email"
              value={form.email}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border text-sm bg-white ${
                isFieldInvalid(form.email) ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Enter Email"
            />
          </div>

          <div>
            <label className="block text-sm mb-1 font-medium">
              Phone Number <span className="text-red-500">*</span>
            </label>
            <input
              name="phone"
              type="tel"
              value={form.phone}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border text-sm bg-white ${
                isFieldInvalid(form.phone) ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Enter Phone Number"
            />
          </div>

          <div>
            <label className="block text-sm mb-1 font-medium">
              Language Code <span className="text-red-500">*</span>
            </label>
            <select
              name="language_code"
              value={form.language_code}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border text-sm bg-white border-gray-300"
            >
              <option value="en">English (en)</option>
              <option value="de">German (de)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm mb-1 font-medium">
              Department <span className="text-red-500">*</span>
            </label>
            <select
              name="dept_id"
              value={form.dept_id}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border text-sm bg-white ${
                isFieldInvalid(form.dept_id) ? 'border-red-500' : 'border-gray-300'
              }`}
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
            <label className="block text-sm mb-1 font-medium">
              Branch <span className="text-red-500">*</span>
            </label>
            <select
              name="branch_id"
              value={form.branch_id}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border text-sm bg-white ${
                isFieldInvalid(form.branch_id) ? 'border-red-500' : 'border-gray-300'
              }`}
            >
              <option value="">Select Branch</option>
              {branches.map((branch) => (
                <option key={branch.branch_id} value={branch.branch_id}>
                  {branch.text || branch.branch_name || branch.branch_id}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm mb-1 font-medium">
              Employment Type
            </label>
            <select
              name="employee_type"
              value={form.employee_type}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border text-sm bg-white border-gray-300"
            >
              <option value="">Select Employment Type</option>
              <option value="Full-time">Full-time</option>
              <option value="Part-time">Part-time</option>
              <option value="Contract">Contract</option>
              <option value="Temporary">Temporary</option>
              <option value="Intern">Intern</option>
              <option value="Consultant">Consultant</option>
            </select>
          </div>

          <div>
            <label className="block text-sm mb-1 font-medium">
              Joining Date
            </label>
            <input
              name="joining_date"
              type="date"
              value={form.joining_date}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border text-sm bg-white border-gray-300"
            />
          </div>

          <div>
            <label className="block text-sm mb-1 font-medium">
              Status <span className="text-red-500">*</span>
            </label>
            <select
              name="int_status"
              value={form.int_status}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border text-sm bg-white border-gray-300"
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end mt-6 gap-2">
          <button
            type="button"
            onClick={() => navigate("/master-data/user-roles")}
            className="bg-gray-300 px-4 py-2 rounded text-sm"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="bg-[#002F5F] text-white px-4 py-2 rounded text-sm"
            disabled={loading}
          >
            {loading ? "Saving..." : "Save"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateUser;

