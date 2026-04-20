import React, { useState } from "react";

const ReopenModal = ({ show, onClose, onConfirm, report }) => {
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!show) return null;

  const handleConfirm = async () => {
    if (!notes.trim()) {
      alert("Please enter notes for reopening.");
      return;
    }
    setSubmitting(true);
    try {
      // Close the popup immediately for better UX; the parent will navigate / toast.
      onClose();
      // Pass notes and report id (defensive - parent may also have selectedReport)
      await onConfirm(notes, report?.abr_id);
      setNotes("");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    setNotes("");
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 backdrop-blur-sm flex justify-center items-center z-50">
      <div className="bg-white w-[500px] rounded shadow-lg">
        {/* Header */}
        <div className="bg-[#003b6f] text-white font-semibold px-6 py-3 flex justify-between items-center rounded-t">
          <span>Reopen Breakdown</span>
          <button
            onClick={handleCancel}
            className="text-yellow-400 text-xl font-bold"
          >
            ×
          </button>
        </div>

        {/* Divider */}
        <div className="h-[3px] bg-[#ffc107]" />

        {/* Body */}
        <div className="px-6 py-6 text-gray-800 text-sm">
          <p className="mb-4">Are you sure you want to reopen this breakdown? This will restart the maintenance cycle.</p>
          <label className="block mb-2 font-semibold text-red-600">Please enter notes for reopening: *</label>
          <textarea
            className="w-full border p-2 rounded h-24 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="Type the reason here... (Mandatory)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 pb-6">
          <button
            className="bg-gray-300 hover:bg-gray-400 text-gray-700 text-sm font-medium py-1.5 px-5 rounded transition-colors"
            onClick={handleCancel}
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            className="bg-red-600 hover:bg-red-700 text-white text-sm font-medium py-1.5 px-5 rounded shadow-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            onClick={handleConfirm}
            disabled={submitting}
          >
            {submitting ? "Submitting..." : "Submit"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReopenModal;
