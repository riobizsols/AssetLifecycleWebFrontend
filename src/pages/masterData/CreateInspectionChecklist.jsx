import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { toast } from "react-hot-toast";
import API from "../../lib/axios";

const CreateInspectionChecklist = ({ isOpen, onClose, onSuccess, responseTypes = [] }) => {
  const [loading, setLoading] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);

  const [form, setForm] = useState({
    inspection_question: "",
    irtd_id: "",
    response_type_name: "",
    expected_value: "",
    min_range: "",
    max_range: "",
    trigger_maintenance: true,
  });

  // Helper to check if response type is Quantitative
  const isQuantitative = (id) => {
    if (!id) return false;
    const type = responseTypes.find(t => t.irtd_id === id);
    return type?.name?.toUpperCase().includes("QN") || id.toUpperCase().includes("QN");
  };

  const handleReset = () => {
    setForm({
      inspection_question: "",
      irtd_id: "",
      response_type_name: "",
      expected_value: "",
      min_range: "",
      max_range: "",
      trigger_maintenance: true,
    });
    setSubmitAttempted(false);
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm({
      ...form,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  const handleResponseTypeChange = (e) => {
    const selectedId = e.target.value;
    const selectedType = responseTypes.find(t => t.irtd_id === selectedId);
    setForm({
      ...form,
      irtd_id: selectedId,
      response_type_name: selectedType?.name || "",
      // Reset fields that depend on response type
      expected_value: "",
      min_range: "",
      max_range: "",
    });
  };

  const isFieldInvalid = (fieldName) => {
    if (!submitAttempted) return false;

    switch (fieldName) {
      case "question":
        return !form.inspection_question.trim();
      case "responseType":
        return !form.irtd_id;
      case "expectedValue":
        return !isQuantitative(form.irtd_id) && !form.expected_value.trim();
      case "minRange":
        return isQuantitative(form.irtd_id) && !form.min_range;
      case "maxRange":
        return isQuantitative(form.irtd_id) && !form.max_range;
      default:
        return false;
    }
  };

  const validateForm = () => {
    const isQuestionValid = !!form.inspection_question.trim();
    const isResponseTypeValid = !!form.irtd_id;
    const isQuantitativeCheck = isQuantitative(form.irtd_id);
    const isExpectedValueValid = isQuantitativeCheck || !!form.expected_value.trim();
    const isMinRangeValid = !isQuantitativeCheck || (form.min_range !== "" && form.min_range !== null);
    const isMaxRangeValid = !isQuantitativeCheck || (form.max_range !== "" && form.max_range !== null);

    if (!isQuestionValid) {
      toast.error("Inspection Question is required");
      return false;
    }
    if (!isResponseTypeValid) {
      toast.error("Response Type is required");
      return false;
    }
    if (!isExpectedValueValid) {
      toast.error("Expected Value is required for Qualitative response types");
      return false;
    }
    if (!isMinRangeValid) {
      toast.error("Min Range is required for Quantitative response types");
      return false;
    }
    if (!isMaxRangeValid) {
      toast.error("Max Range is required for Quantitative response types");
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitAttempted(true);

    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);
      const isQuantitativeCheck = isQuantitative(form.irtd_id);

      await API.post("/inspection-checklists", {
        inspection_question: form.inspection_question.trim(),
        irtd_id: form.irtd_id,
        expected_value: isQuantitativeCheck ? null : form.expected_value.trim(),
        min_range: isQuantitativeCheck ? form.min_range : null,
        max_range: isQuantitativeCheck ? form.max_range : null,
        trigger_maintenance: form.trigger_maintenance,
      });

      toast.success("Inspection Checklist created successfully!");
      handleReset();
      onSuccess();
      handleClose();
    } catch (error) {
      console.error("Error creating inspection checklist:", error);
      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.error ||
        "Failed to create inspection checklist";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const isQT = isQuantitative(form.irtd_id);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 backdrop-blur-sm flex justify-center items-center z-50 p-4">
      <div className="bg-white w-full max-w-lg rounded shadow-lg flex flex-col">
        {/* Header - Simple with no blue background */}
        <div className="px-6 py-3 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-base font-semibold text-gray-900">Create Inspection Checklist</h3>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={loading}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-3 max-h-80 overflow-y-auto">
          {/* Inspection Question and Response Type - Same Row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm mb-1 font-medium text-gray-700">
                Inspection Question
              </label>
              <input
                type="text"
                name="inspection_question"
                value={form.inspection_question}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border text-sm bg-white rounded-md focus:outline-none focus:ring-2 focus:ring-[#003b6f] ${
                  isFieldInvalid("question") ? "border-red-500" : "border-gray-300"
                }`}
                placeholder="Enter inspection question"
              />
            </div>

            <div>
              <label className="block text-sm mb-1 font-medium text-gray-700">
                Response Type
              </label>
              <select
                name="irtd_id"
                value={form.irtd_id}
                onChange={handleResponseTypeChange}
                className={`w-full px-3 py-2 border text-sm bg-white rounded-md focus:outline-none focus:ring-2 focus:ring-[#003b6f] ${
                  isFieldInvalid("responseType") ? "border-red-500" : "border-gray-300"
                }`}
              >
                <option value="">Select response type</option>
                {responseTypes.map((type) => (
                  <option key={type.irtd_id} value={type.irtd_id}>
                    {type.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Expected Value - Show for Qualitative types */}
          {!isQT && form.irtd_id && (
            <div>
              <label className="block text-sm mb-1 font-medium text-gray-700">
                Expected Value
              </label>
              <input
                type="text"
                name="expected_value"
                value={form.expected_value}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border text-sm bg-white rounded-md focus:outline-none focus:ring-2 focus:ring-[#003b6f] ${
                  isFieldInvalid("expectedValue") ? "border-red-500" : "border-gray-300"
                }`}
                placeholder="Enter expected value"
              />
            </div>
          )}

          {/* Min/Max Range - Show for Quantitative types */}
          {isQT && form.irtd_id && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm mb-1 font-medium text-gray-700">
                  Min Range
                </label>
                <input
                  type="number"
                  step="0.01"
                  name="min_range"
                  value={form.min_range}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border text-sm bg-white rounded-md focus:outline-none focus:ring-2 focus:ring-[#003b6f] ${
                    isFieldInvalid("minRange") ? "border-red-500" : "border-gray-300"
                  }`}
                  placeholder="Enter minimum range"
                />
              </div>

              <div>
                <label className="block text-sm mb-1 font-medium text-gray-700">
                  Max Range
                </label>
                <input
                  type="number"
                  step="0.01"
                  name="max_range"
                  value={form.max_range}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border text-sm bg-white rounded-md focus:outline-none focus:ring-2 focus:ring-[#003b6f] ${
                    isFieldInvalid("maxRange") ? "border-red-500" : "border-gray-300"
                  }`}
                  placeholder="Enter maximum range"
                />
              </div>
            </div>
          )}

          {/* Trigger Maintenance - Always visible */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="trigger_maintenance"
              name="trigger_maintenance"
              checked={form.trigger_maintenance}
              onChange={handleInputChange}
              className="w-4 h-4 text-[#003b6f] rounded cursor-pointer accent-[#003b6f] border-gray-300"
            />
            <label htmlFor="trigger_maintenance" className="text-sm font-medium cursor-pointer text-gray-700">
              Trigger Maintenance Automatic
            </label>
          </div>
        </form>

        {/* Footer */}
        <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 transition-all text-sm font-medium"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="px-4 py-2 bg-[#ffc107] hover:bg-[#ffb300] text-gray-900 rounded transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm font-semibold"
            disabled={loading}
          >
            {loading ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateInspectionChecklist;
