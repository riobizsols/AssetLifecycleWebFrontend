import { FaSave, FaTimes } from "react-icons/fa";

const OpcModal = ({ title, onClose, onSave, saving = false, children }) => (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
    <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
      <div className="bg-[#0E2F4B] text-white px-6 py-4 flex justify-between items-center rounded-t-lg shrink-0">
        <h2 className="text-xl font-bold">{title}</h2>
        <button type="button" onClick={onClose} className="text-white hover:text-gray-200 transition-colors">
          <FaTimes size={24} />
        </button>
      </div>
      <div className="p-6 space-y-4 overflow-y-auto flex-1">{children}</div>
      <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3 rounded-b-lg shrink-0">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100 transition-colors"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-[#0E2F4B] text-white rounded-md hover:bg-[#1a3f5f] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <FaSave /> {saving ? "Saving..." : "Save"}
        </button>
      </div>
    </div>
  </div>
);

export const Field = ({ label, required = false, hint, children }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-2">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    {children}
    {hint && <p className="text-xs text-gray-500 mt-1">{hint}</p>}
  </div>
);

export const inputClass =
  "w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100";

export default OpcModal;
