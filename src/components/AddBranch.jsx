import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import API from "../lib/axios";

const AddBranch = () => {
  const navigate = useNavigate();

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
      toast.error("Branch name is required");
      return;
    }
    if (!form.branch_code.trim()) {
      toast.error("Branch code is required");
      return;
    }
    if (!form.city.trim()) {
      toast.error("City is required");
      return;
    }

    try {
      setLoading(true);
      const response = await API.post("/branches", form);

      toast.success("Branch created successfully!");
      navigate("/master-data/branches");
    } catch (error) {
      console.error("Error creating branch:", error);
      const errorMessage = error.response?.data?.message || 
                         error.response?.data?.error || 
                         "Failed to create branch";
      toast.error(errorMessage);
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