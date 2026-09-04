import { showBackendTextToast } from '../utils/errorTranslation';
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import API from "../lib/axios";
import { invalidateCache } from "../utils/apiCache";
import { useBranchesStore } from "../store/useBranchesStore";

/** Reject values that are only digits (spaces ignored). */
const isDigitsOnly = (value) => {
  const cleaned = String(value || "").trim().replace(/\s+/g, "");
  return cleaned.length > 0 && /^\d+$/.test(cleaned);
};

const AddBranch = () => {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    org_id: "",
    text: "",
    branch_code: "",
    city: "",
  });

  const [organizations, setOrganizations] = useState([]);
  const [loadingOrgs, setLoadingOrgs] = useState(true);
  const [loading, setLoading] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);

  useEffect(() => {
    const loadOrgs = async () => {
      try {
        setLoadingOrgs(true);
        const res = await API.get("/orgs");
        const rows = Array.isArray(res.data) ? res.data : [];
        setOrganizations(rows.filter((o) => o.int_status === 1 || o.int_status === undefined));
      } catch (error) {
        console.error("Error fetching organizations:", error);
        showBackendTextToast({
          toast,
          tmdId: "TMD_FAILED_TO_LOAD_ORGANIZATIONS",
          fallbackText: "Failed to load organizations",
          type: "error",
        });
      } finally {
        setLoadingOrgs(false);
      }
    };
    loadOrgs();
  }, []);

  const handleInputChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitAttempted(true);

    if (!form.org_id.trim()) {
      showBackendTextToast({
        toast,
        tmdId: "TMD_ORGANIZATION_IS_REQUIRED",
        fallbackText: "Organization is required",
        type: "error",
      });
      return;
    }
    if (!form.text.trim()) {
      showBackendTextToast({ toast, tmdId: 'TMD_BRANCH_NAME_IS_REQUIRED_4349065E', fallbackText: 'Branch name is required', type: 'error' });
      return;
    }
    if (isDigitsOnly(form.text)) {
      showBackendTextToast({
        toast,
        tmdId: 'TMD_BRANCH_NAME_CANNOT_BE_ONLY_NUMBERS_A1B2C3D4',
        fallbackText: 'Branch name cannot be only numbers',
        type: 'error',
      });
      return;
    }
    if (!form.branch_code.trim()) {
      showBackendTextToast({ toast, tmdId: 'TMD_BRANCH_CODE_IS_REQUIRED_74C7C940', fallbackText: 'Branch code is required', type: 'error' });
      return;
    }
    if (!form.city.trim()) {
      showBackendTextToast({ toast, tmdId: 'TMD_CITY_IS_REQUIRED_2EB7EEC0', fallbackText: 'City is required', type: 'error' });
      return;
    }
    if (isDigitsOnly(form.city)) {
      showBackendTextToast({
        toast,
        tmdId: 'TMD_CITY_NAME_CANNOT_BE_ONLY_NUMBERS_B2C3D4E5',
        fallbackText: 'City name cannot be only numbers',
        type: 'error',
      });
      return;
    }

    try {
      setLoading(true);
      await API.post("/branches", form);

      invalidateCache("branches:");
      useBranchesStore.getState().invalidateBranchesCache();

      showBackendTextToast({ toast, tmdId: 'TMD_BRANCH_CREATED_SUCCESSFULLY_62640044', fallbackText: 'Branch created successfully!', type: 'success' });
      navigate("/master-data/branches");
    } catch (error) {
      console.error("Error creating branch:", error);
      const errorMessage = error.response?.data?.message ||
                         error.response?.data?.error ||
                         "Failed to create branch";
      showBackendTextToast({
        toast,
        tmdId: 'TMD_FAILED_TO_CREATE_BRANCH_7FF7841A',
        fallbackText: errorMessage,
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const isFieldInvalid = (val) => {
    if (!submitAttempted) return false;
    const trimmed = String(val || "").trim();
    if (!trimmed) return true;
    return false;
  };

  const isNameOrCityInvalid = (val) => {
    if (!submitAttempted) return false;
    const trimmed = String(val || "").trim();
    return !trimmed || isDigitsOnly(trimmed);
  };

  return (
    <div className="max-w-[1000px] mx-auto mt-8 bg-white shadow rounded">
      <div className="text-center text-lg font-semibold bg-[#0E2F4B] text-white py-3 border-b-4 border-[#FFC107] rounded-t">
        {/* Add Branch */}
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <div>
            <label className="block text-sm mb-1 font-medium">
              Organization <span className="text-red-500">*</span>
            </label>
            <select
              name="org_id"
              value={form.org_id}
              onChange={handleInputChange}
              disabled={loadingOrgs}
              className={`w-full px-3 py-2 border text-sm bg-white ${isFieldInvalid(form.org_id) ? 'border-red-500' : 'border-gray-300'}`}
            >
              <option value="">
                {loadingOrgs ? "Loading organizations..." : "Select Organization"}
              </option>
              {organizations.map((org) => (
                <option key={org.org_id} value={org.org_id}>
                  {org.text || org.org_name || org.org_id}
                  {org.org_code ? ` (${org.org_code})` : ` (${org.org_id})`}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm mb-1 font-medium">
              Branch Name <span className="text-red-500">*</span>
            </label>
            <input
              name="text"
              value={form.text}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border text-sm bg-white ${isNameOrCityInvalid(form.text) ? 'border-red-500' : 'border-gray-300'}`}
              placeholder="Enter Branch Name"
            />
          </div>
          <div>
            <label className="block text-sm mb-1 font-medium">
              Branch Code <span className="text-red-500">*</span>
            </label>
            <input
              name="branch_code"
              value={form.branch_code}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border text-sm bg-white ${isFieldInvalid(form.branch_code) ? 'border-red-500' : 'border-gray-300'}`}
              placeholder="Enter Branch Code"
            />
          </div>
          <div>
            <label className="block text-sm mb-1 font-medium">
              City <span className="text-red-500">*</span>
            </label>
            <input
              name="city"
              value={form.city}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border text-sm bg-white ${isNameOrCityInvalid(form.city) ? 'border-red-500' : 'border-gray-300'}`}
              placeholder="Enter City"
            />
          </div>
        </div>

        <div className="flex justify-end mt-6 gap-2">
          <button
            type="button"
            onClick={() => navigate("/master-data/branches")}
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

export default AddBranch;
