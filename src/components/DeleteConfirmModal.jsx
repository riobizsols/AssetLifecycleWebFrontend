const DeleteConfirmModal = ({ show, onClose, onConfirm, message = "Do you want to delete this item?" }) => {
  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 backdrop-blur-sm flex justify-center items-center z-50">
      <div className="bg-white w-[500px] rounded shadow-lg">
        {/* Header */}
        <div className="bg-[#003b6f] text-white font-semibold px-6 py-3 flex justify-between items-center rounded-t">
          <span>Confirm Delete</span>
          <button
            onClick={onClose}
            className="text-yellow-400 text-xl font-bold"
          >
            ×
          </button>
        </div>

        {/* Divider */}
        <div className="h-[3px] bg-[#ffc107]" />

        {/* Body */}
        <div className="px-6 py-6 text-center text-gray-800 text-sm">
          {message}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 pb-6">
          <button
            className="bg-gray-300 hover:bg-gray-400 text-gray-700 text-sm font-medium py-1.5 px-5 rounded"
            onClick={onClose}
          >
            Close
          </button>
          <button
            className="bg-[#ffc107] hover:bg-[#e0a800] text-white text-sm font-medium py-1.5 px-5 rounded"
            onClick={onConfirm}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteConfirmModal;