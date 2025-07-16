import { useState } from "react";
import { useNavigate } from "react-router-dom";
// import API from "../../lib/axios"; 
import API from "../lib/axios"

const AddBranch = () => {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    text: "", // Branch Name
    branch_code: "", // Branch Code
    city: "", // City
  });

  const [loading, setLoading] = useState(false);

  const handleInputChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);

      const response = await API.post("/branches", form);
      console.log("Branch created:", response.data);

      alert("Branch created successfully!");
      navigate("/master-data/branches");
    } catch (error) {
      console.error("Error creating branch:", error);
      alert("Failed to create branch. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-[1000px] mx-auto mt-8 bg-white shadow rounded">
      <div className="text-center text-lg font-semibold bg-[#0E2F4B] text-white py-3 border-b-4 border-[#FFC107] rounded-t">
        Add Branch
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm mb-1 font-medium">
              Branch Name
            </label>
            <input
              name="text"
              value={form.text}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border text-sm bg-white border-gray-300"
              placeholder="Enter Branch Name"
              required
            />
          </div>
          <div>
            <label className="block text-sm mb-1 font-medium">
              Branch Code
            </label>
            <input
              name="branch_code"
              value={form.branch_code}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border text-sm bg-white border-gray-300"
              placeholder="Enter Branch Code"
              required
            />
          </div>
          <div>
            <label className="block text-sm mb-1 font-medium">City</label>
            <input
              name="city"
              value={form.city}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border text-sm bg-white border-gray-300"
              placeholder="Enter City"
              required
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