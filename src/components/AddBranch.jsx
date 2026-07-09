import { showBackendTextToast } from '../utils/errorTranslation';
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import API from "../lib/axios";
import { invalidateCache, peekCache, setCache } from "../utils/apiCache";
import { formatBranchRows } from "../store/useBranchesStore";

const AddBranch = () => {
  const navigate = useNavigate();
  const BRANCH_LIST_KEY = "branches:list";
  const BRANCH_LIST_TTL_MS = 3 * 60 * 1000;

  const [form, setForm] = useState({
    text: "", // Branch Name
    branch_code: "", // Branch Code
    city: "", // City
  });

  const [loading, setLoading] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);

  const handleInputChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitAttempted(true);

    // Validate form fields
    if (!form.text.trim()) {
      showBackendTextToast({ toast, tmdId: 'TMD_BRANCH_NAME_IS_REQUIRED_4349065E', fallbackText: 'Branch name is required', type: 'error' });
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

    try {
      setLoading(true);
      const response = await API.post("/branches", form);

      // Instant UX: add created row into list cache so Branches screen shows it immediately.
      const cached = peekCache(BRANCH_LIST_KEY, BRANCH_LIST_TTL_MS);
      const createdRaw =
        response?.data?.data && !Array.isArray(response.data.data)
          ? response.data.data
          : response?.data && !Array.isArray(response.data)
            ? response.data
            : null;

      if (createdRaw && cached && Array.isArray(cached)) {
        const [formattedCreated] = formatBranchRows([createdRaw]);
        if (formattedCreated?.branch_id) {
          const withoutDuplicate = cached.filter(
            (row) => row.branch_id !== formattedCreated.branch_id,
          );
          setCache(BRANCH_LIST_KEY, [...withoutDuplicate, formattedCreated]);
        } else {
          // Fallback when API shape is unexpected.
          invalidateCache("branches:");
        }
      } else {
        // Fallback path keeps data correctness.
        invalidateCache("branches:");
      }

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

  // Helper for invalid field
  const isFieldInvalid = (val) => submitAttempted && !val.trim();

  return (
    <div className="max-w-[1000px] mx-auto mt-8 bg-white shadow rounded">
      <div className="text-center text-lg font-semibold bg-[#0E2F4B] text-white py-3 border-b-4 border-[#FFC107] rounded-t">
        {/* Add Branch */}
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm mb-1 font-medium">
              Branch Name <span className="text-red-500">*</span>
            </label>
            <input
              name="text"
              value={form.text}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border text-sm bg-white ${isFieldInvalid(form.text) ? 'border-red-500' : 'border-gray-300'}`}
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
              className={`w-full px-3 py-2 border text-sm bg-white ${isFieldInvalid(form.city) ? 'border-red-500' : 'border-gray-300'}`}
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