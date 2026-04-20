import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { useLanguage } from '../contexts/LanguageContext';
import { X } from 'lucide-react';

const EditBranchModal = ({ show, onClose, onConfirm, branch }) => {
  const { t } = useLanguage();
  
  const [formData, setFormData] = useState({
    text: '',
    city: '',
    branch_code: ''
  });

  useEffect(() => {
    if (branch) {
      setFormData({
        text: branch.text || '',
        city: branch.city || '',
        branch_code: branch.branch_code || ''
      });
    }
  }, [branch]);

  // Close modal on ESC key
  useEffect(() => {
    if (!show) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [show, onClose]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate
    if (!formData.text || !formData.city || !formData.branch_code) {
      toast.error(t('branches.allFieldsRequired'));
      return;
    }

    onConfirm(formData);
  };

  if (!show) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-30 backdrop-blur-sm flex justify-center items-center z-50"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white w-[500px] rounded shadow-lg" onMouseDown={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="bg-[#003b6f] text-white font-semibold px-6 py-3 flex justify-between items-center rounded-t">
          <span>{t('branches.editBranch')}</span>
          <button
            onClick={onClose}
            className="text-yellow-400 hover:text-yellow-300"
            aria-label="Close"
            title="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Divider */}
        <div className="h-[3px] bg-[#ffc107]" />

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('branches.branchName')}
              </label>
              <input
                type="text"
                name="text"
                value={formData.text}
                onChange={handleChange}
                className="w-full px-3 py-2 border rounded text-sm"
                placeholder={t('branches.enterBranchName')}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('branches.city')}
              </label>
              <input
                type="text"
                name="city"
                value={formData.city}
                onChange={handleChange}
                className="w-full px-3 py-2 border rounded text-sm"
                placeholder={t('branches.enterCity')}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('branches.branchCode')}
              </label>
              <input
                type="text"
                name="branch_code"
                value={formData.branch_code}
                onChange={handleChange}
                className="w-full px-3 py-2 border rounded text-sm"
                placeholder={t('branches.enterBranchCode')}
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="bg-gray-300 hover:bg-gray-400 text-gray-700 text-sm font-medium py-1.5 px-5 rounded"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              className="bg-[#ffc107] hover:bg-[#e0a800] text-white text-sm font-medium py-1.5 px-5 rounded"
            >
              {t('common.update')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditBranchModal; 