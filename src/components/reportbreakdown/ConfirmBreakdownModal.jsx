import React from "react";

const ConfirmBreakdownModal = ({ show, onClose, onConfirm, report }) => {
  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 backdrop-blur-sm flex justify-center items-center z-50">
      <div className="bg-white w-[500px] rounded shadow-lg overflow-hidden">
        {/* Header */}
        <div className="bg-[#003b6f] text-white font-semibold px-6 py-3 flex justify-between items-center transition-all">
          <span className="text-lg">Confirm Breakdown</span>
          <button
            onClick={onClose}
            className="text-white hover:text-yellow-400 text-2xl font-bold transition-colors"
          >
            ×
          </button>
        </div>

        {/* Divider */}
        <div className="h-[3px] bg-[#ffc107]" />

        {/* Body */}
        <div className="px-8 py-10 text-center">
          <div className="flex justify-center mb-6">
            <div className="bg-blue-100 p-4 rounded-full">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <h3 className="text-xl font-bold text-gray-800 mb-2">Confirm Resolution?</h3>
          <p className="text-gray-600">
            Are you sure you want to mark breakdown <span className="font-semibold text-blue-600">{report?.abr_id}</span> as resolved? 
            This will confirm the maintenance process is complete.
          </p>
        </div>

        {/* Footer */}
        <div className="flex justify-center gap-4 px-6 pb-8">
          <button
            className="min-w-[120px] bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2 px-6 rounded-md transition-colors border border-gray-300"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="min-w-[120px] bg-[#003b6f] hover:bg-[#002b52] text-white font-semibold py-2 px-6 rounded-md shadow-md transition-colors"
            onClick={() => onConfirm(report?.abr_id)}
          >
            Yes, Confirm
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmBreakdownModal;
