import React from "react";
import { CheckCircle, X } from "lucide-react";
import { useLanguage } from "../contexts/LanguageContext";

export default function ChecklistModal({ assetType, open, onClose, checklist = [] }) {
  const { t } = useLanguage();
  if (!open) return null;

  // Function to translate common checklist items
  const translateChecklistItem = (itemText) => {
    const translations = {
      'Battery health check': t('maintenanceApproval.batteryHealthCheck'),
      'OS & software installed': t('maintenanceApproval.osAndSoftwareInstalled'),
      'Physical damage inspection': t('maintenanceApproval.physicalDamageInspection'),
    };
    return translations[itemText] || itemText;
  };

  console.log('ChecklistModal received checklist:', checklist);
  console.log('Checklist type:', typeof checklist);
  console.log('Checklist length:', checklist?.length);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg relative max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <CheckCircle className="text-[#0E2F4B] w-6 h-6 flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <h3 className="text-lg font-bold text-gray-900 leading-tight">
                {t('maintenanceApproval.assetMaintenanceChecklist')}
              </h3>
              <div className="text-xs text-gray-500 mt-1">
                {t('maintenanceApproval.assetType')}: <span className="font-semibold text-gray-700">{assetType}</span>
              </div>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-gray-700 flex-shrink-0 ml-2 transition-colors"
            aria-label="Close"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Checklist */}
        <div className="px-6 py-4 overflow-y-auto flex-1">
          {checklist && checklist.length > 0 ? (
            <ul className="space-y-2">
              {checklist.map((checklistItem, idx) => {
                console.log('Rendering checklist item:', checklistItem);
                // Handle different possible data structures
                const itemText = checklistItem.item || 
                               checklistItem.description || 
                               checklistItem.task || 
                               checklistItem.text || 
                               checklistItem.name ||
                               (typeof checklistItem === 'string' ? checklistItem : JSON.stringify(checklistItem));
                
                return (
                  <li key={checklistItem.id || checklistItem.checklist_id || idx} className="flex items-start gap-2 text-gray-800">
                    <span className="text-[#0E2F4B] mt-1 flex-shrink-0">•</span>
                    <span className="flex-1 leading-relaxed">{translateChecklistItem(itemText)}</span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-400 italic">{t('maintenanceApproval.noChecklistItemsFound')}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t flex justify-end flex-shrink-0">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 font-medium transition-colors"
          >
            {t('maintenanceApproval.close')}
          </button>
        </div>
      </div>
    </div>
  );
} 