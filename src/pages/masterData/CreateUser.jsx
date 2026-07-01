import { showBackendTextToast } from '../../utils/errorTranslation';
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import API from "../../lib/axios";
import { useAuthStore } from "../../store/useAuthStore";
import useAuditLog from "../../hooks/useAuditLog";
import { USERS_APP_ID } from "../../constants/usersAuditEvents";
import { useLanguage } from "../../contexts/LanguageContext";

const CreateUser = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { t } = useLanguage();
  const { recordActionByNameWithFetch } = useAuditLog(USERS_APP_ID);
  const u = (key, options) => t(`users.${key}`, options);

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

  const fetchDepartments = async () => {
    try {
      const res = await API.get("/admin/departments");
      setDepartments(res.data || []);
    } catch (err) {
      console.error("Failed to fetch departments", err);
      showBackendTextToast({ toast, tmdId: 'TMD_FAILED_TO_FETCH_DEPARTMENTS_2E6F5879', fallbackText: u('failedToFetchDepartments'), type: 'error' });
    }
  };

  const fetchBranches = async () => {
    try {
      const response = await API.get("/branches");
      setBranches(response.data || []);
    } catch (err) {
      console.error("Failed to fetch branches", err);
      showBackendTextToast({ toast, tmdId: 'TMD_FAILED_TO_FETCH_BRANCHES_52C277B8', fallbackText: t('branches.failedToFetchBranches'), type: 'error' });
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

    if (!form.first_name.trim()) {
      showBackendTextToast({ toast, tmdId: 'TMD_FIRST_NAME_IS_REQUIRED_184F2B50', fallbackText: u('firstNameRequired'), type: 'error' });
      return;
    }
    if (!form.email.trim()) {
      showBackendTextToast({ toast, tmdId: 'TMD_EMAIL_IS_REQUIRED_4E64DB31', fallbackText: u('emailRequired'), type: 'error' });
      return;
    }
    if (!form.phone.trim()) {
      showBackendTextToast({ toast, tmdId: 'TMD_PHONE_NUMBER_IS_REQUIRED_08E22B90', fallbackText: u('phoneRequired'), type: 'error' });
      return;
    }
    if (!form.dept_id) {
      showBackendTextToast({ toast, tmdId: 'TMD_DEPARTMENT_IS_REQUIRED_1C5EA1D9', fallbackText: u('departmentRequired'), type: 'error' });
      return;
    }
    if (!form.branch_id) {
      showBackendTextToast({ toast, tmdId: 'TMD_BRANCH_IS_REQUIRED_21EC5877', fallbackText: u('branchRequired'), type: 'error' });
      return;
    }
    if (!form.employee_type) {
      toast.error("Employment type is required");
      return;
    }
    if (!form.joining_date) {
      toast.error("Joining date is required");
      return;
    }

    try {
      setLoading(true);

      const nameParts = [];
      if (form.first_name.trim()) nameParts.push(form.first_name.trim());
      if (form.middle_name.trim()) nameParts.push(form.middle_name.trim());
      if (form.last_name.trim()) nameParts.push(form.last_name.trim());
      const fullName = nameParts.join(' ').trim();

      const employeeData = {
        first_name: form.first_name.trim(),
        middle_name: form.middle_name.trim() || null,
        last_name: form.last_name.trim() || null,
        name: form.first_name.trim(),
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

      await API.post("/employees", employeeData);

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

      showBackendTextToast({ toast, tmdId: 'TMD_EMPLOYEE_CREATED_SUCCESSFULLY_090057B0', fallbackText: u('employeeCreatedSuccessfully'), type: 'success' });
      navigate("/master-data/user-roles");
    } catch (error) {
      console.error("Error creating user:", error);
      const errorMessage = error.response?.data?.message ||
                         error.response?.data?.error ||
                         u('failedToCreateEmployee');
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const isFieldInvalid = (val) => submitAttempted && !val;

  return (
    <div className="max-w-[1000px] mx-auto mt-8 bg-white shadow rounded">
      <div className="text-center text-lg font-semibold bg-[#0E2F4B] text-white py-3 border-b-4 border-[#FFC107] rounded-t">
        {u("createEmployee")}
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm mb-1 font-medium">
              {u("firstName")} <span className="text-red-500">*</span>
            </label>
            <input
              name="first_name"
              type="text"
              value={form.first_name}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border text-sm bg-white ${
                isFieldInvalid(form.first_name) ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder={u("enterFirstName")}
            />
          </div>

          <div>
            <label className="block text-sm mb-1 font-medium">
              {u("middleName")}
            </label>
            <input
              name="middle_name"
              type="text"
              value={form.middle_name}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border text-sm bg-white border-gray-300"
              placeholder={u("enterMiddleName")}
            />
          </div>

          <div>
            <label className="block text-sm mb-1 font-medium">
              {u("lastName")}
            </label>
            <input
              name="last_name"
              type="text"
              value={form.last_name}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border text-sm bg-white border-gray-300"
              placeholder={u("enterLastName")}
            />
          </div>

          <div>
            <label className="block text-sm mb-1 font-medium">
              {u("email")} <span className="text-red-500">*</span>
            </label>
            <input
              name="email"
              type="email"
              value={form.email}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border text-sm bg-white ${
                isFieldInvalid(form.email) ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder={u("enterEmail")}
            />
          </div>

          <div>
            <label className="block text-sm mb-1 font-medium">
              {u("phoneNumber")} <span className="text-red-500">*</span>
            </label>
            <input
              name="phone"
              type="tel"
              value={form.phone}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border text-sm bg-white ${
                isFieldInvalid(form.phone) ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder={u("enterPhoneNumber")}
            />
          </div>

          <div>
            <label className="block text-sm mb-1 font-medium">
              {u("languageCode")} <span className="text-red-500">*</span>
            </label>
            <select
              name="language_code"
              value={form.language_code}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border text-sm bg-white border-gray-300"
            >
              <option value="en">{u("englishEn")}</option>
              <option value="de">{u("germanDe")}</option>
            </select>
          </div>

          <div>
            <label className="block text-sm mb-1 font-medium">
              {u("department")} <span className="text-red-500">*</span>
            </label>
            <select
              name="dept_id"
              value={form.dept_id}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border text-sm bg-white ${
                isFieldInvalid(form.dept_id) ? 'border-red-500' : 'border-gray-300'
              }`}
            >
              <option value="">{u("selectDepartment")}</option>
              {departments.map((dept) => (
                <option key={dept.dept_id} value={dept.dept_id}>
                  {dept.text}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm mb-1 font-medium">
              {u("branch")} <span className="text-red-500">*</span>
            </label>
            <select
              name="branch_id"
              value={form.branch_id}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border text-sm bg-white ${
                isFieldInvalid(form.branch_id) ? 'border-red-500' : 'border-gray-300'
              }`}
            >
              <option value="">{u("selectBranch")}</option>
              {branches.map((branch) => (
                <option key={branch.branch_id} value={branch.branch_id}>
                  {branch.text || branch.branch_name || branch.branch_id}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm mb-1 font-medium">
              {u("employmentType")} <span className="text-red-500">*</span>
            </label>
            <select
              name="employee_type"
              value={form.employee_type}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border text-sm bg-white ${
                isFieldInvalid(form.employee_type) ? 'border-red-500' : 'border-gray-300'
              }`}
            >
              <option value="">{u("selectEmploymentType")}</option>
              <option value="Full-time">{u("employmentFullTime")}</option>
              <option value="Part-time">{u("employmentPartTime")}</option>
              <option value="Contract">{u("employmentContract")}</option>
              <option value="Temporary">{u("employmentTemporary")}</option>
              <option value="Intern">{u("employmentIntern")}</option>
              <option value="Consultant">{u("employmentConsultant")}</option>
            </select>
          </div>

          <div>
            <label className="block text-sm mb-1 font-medium">
              {u("joiningDate")} <span className="text-red-500">*</span>
            </label>
            <input
              name="joining_date"
              type="date"
              value={form.joining_date}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border text-sm bg-white ${
                isFieldInvalid(form.joining_date) ? 'border-red-500' : 'border-gray-300'
              }`}
            />
          </div>

          <div>
            <label className="block text-sm mb-1 font-medium">
              {u("status")} <span className="text-red-500">*</span>
            </label>
            <select
              name="int_status"
              value={form.int_status}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border text-sm bg-white border-gray-300"
            >
              <option value="Active">{t("common.active")}</option>
              <option value="Inactive">{t("common.inactive")}</option>
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
            {t("common.cancel")}
          </button>
          <button
            type="submit"
            className="bg-[#002F5F] text-white px-4 py-2 rounded text-sm"
            disabled={loading}
          >
            {loading ? u("saving") : t("common.save")}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateUser;
