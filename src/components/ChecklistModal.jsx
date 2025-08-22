import React from "react";
import { CheckCircle, X } from "lucide-react";

export default function ChecklistModal({ assetType, open, onClose, checklist = [] }) {
  if (!open) return null;

  console.log('ChecklistModal received checklist:', checklist);
  console.log('Checklist type:', typeof checklist);
  console.log('Checklist length:', checklist?.length);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg relative">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div className="flex items-center gap-3">
            <CheckCircle className="text-[#0E2F4B] w-7 h-7" />
            <div>
              <h3 className="text-xl font-bold">Asset Maintenance Checklist</h3>
              <div className="text-xs text-gray-500">
                Asset Type: <span className="font-semibold">{assetType}</span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Checklist */}
        <div className="px-6 pb-6 pt-2 max-h-80 overflow-y-auto">
          <ul className="list-disc pl-6">
            {checklist && checklist.length > 0 ? (
              checklist.map((checklistItem, idx) => {
                console.log('Rendering checklist item:', checklistItem);
                // Handle different possible data structures
                const itemText = checklistItem.item || 
                               checklistItem.description || 
                               checklistItem.task || 
                               checklistItem.text || 
                               checklistItem.name ||
                               (typeof checklistItem === 'string' ? checklistItem : JSON.stringify(checklistItem));
                
                return (
                  <li key={checklistItem.id || checklistItem.checklist_id || idx} className="mb-1 text-gray-800">
                    {itemText}
                  </li>
                );
              })
            ) : (
              <li className="text-gray-400 italic">No checklist items found.</li>
            )}
          </ul>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
} 