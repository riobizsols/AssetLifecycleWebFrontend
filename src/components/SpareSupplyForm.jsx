import { showBackendTextToast } from '../utils/errorTranslation';
import { useEffect, useState } from 'react';
import { Maximize, Minimize, Trash2 } from 'lucide-react';
import API from '../lib/axios';
import { toast } from 'react-hot-toast';
import { useLanguage } from '../contexts/LanguageContext';

const STORAGE_KEY = 'spareSupplies';

const SpareSupplyForm = ({
  vendorId,
  orgId,
  vendorSaved = false,
  onSaveTrigger,
  onTabSaved,
}) => {
  const { t } = useLanguage();
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({ spc_id: '', brand: '', model: '' });
  const [maximized, setMaximized] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const res = await API.get('/spare-parts/categories');
        setCategories(Array.isArray(res.data?.data) ? res.data.data : []);
      } catch (error) {
        console.error('Error fetching spare categories:', error);
        setCategories([]);
      }
    };
    loadCategories();
  }, []);

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (stored) setItems(JSON.parse(stored));
    } catch {
      setItems([]);
    }
  }, []);

  useEffect(() => {
    if (onSaveTrigger === 'Spare Supply') {
      handleDone();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onSaveTrigger]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (submitAttempted) setSubmitAttempted(false);
  };

  const isFieldInvalid = (val) => submitAttempted && !String(val || '').trim();

  const handleAdd = () => {
    if (!form.spc_id || !form.brand.trim() || !form.model.trim()) {
      setSubmitAttempted(true);
      return;
    }

    const selected = categories.find((c) => String(c.spc_id) === String(form.spc_id));
    if (!selected) {
      showBackendTextToast({
        toast,
        tmdId: 'TMD_SP_VENDOR_INVALID_CATEGORY',
        fallbackText: 'Invalid category selected',
        type: 'error',
      });
      return;
    }

    const next = [
      ...items,
      {
        spc_id: selected.spc_id,
        categoryText: selected.text,
        brand: form.brand.trim(),
        model: form.model.trim(),
      },
    ];
    setItems(next);
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setForm({ spc_id: '', brand: '', model: '' });
    setSubmitAttempted(false);
    showBackendTextToast({
      toast,
      tmdId: 'TMD_SP_VENDOR_ITEM_ADDED',
      fallbackText: 'Spare supply item added to list',
      type: 'success',
    });
  };

  const handleDelete = (idx) => {
    const next = items.filter((_, i) => i !== idx);
    setItems(next);
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const handleDone = async () => {
    try {
      if (!vendorSaved) {
        showBackendTextToast({
          toast,
          tmdId: 'TMD_I18N_VENDORS_PLEASESAVEVENDORFIRST_4D3BFE9E',
          fallbackText:
            t('vendors.pleaseSaveVendorFirst') ||
            'Please save vendor details first before saving spare supply.',
          type: 'error',
        });
        return;
      }

      if (!vendorId || !orgId) {
        showBackendTextToast({
          toast,
          tmdId: 'TMD_I18N_VENDORS_VENDORMUSTBECREATEDFIRST_66C0316E',
          fallbackText:
            t('vendors.vendorMustBeCreatedFirst') || 'Vendor must be created first.',
          type: 'error',
        });
        return;
      }

      let fromStorage = [];
      try {
        fromStorage = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || '[]');
      } catch {
        fromStorage = [];
      }

      if (!Array.isArray(fromStorage) || fromStorage.length === 0) {
        showBackendTextToast({
          toast,
          tmdId: 'TMD_SP_VENDOR_NO_ITEMS',
          fallbackText: 'Add at least one spare supply item before saving',
          type: 'error',
        });
        return;
      }

      setIsSaving(true);
      await API.post('/spare-parts/vendor-mappings', {
        vendor_id: vendorId,
        items: fromStorage.map((row) => ({
          spc_id: row.spc_id,
          brand: row.brand,
          model: row.model,
        })),
      });

      setItems([]);
      sessionStorage.removeItem(STORAGE_KEY);
      if (onTabSaved) onTabSaved('Spare Supply');
      showBackendTextToast({
        toast,
        tmdId: 'TMD_SP_VENDOR_SAVED',
        fallbackText: 'Spare supply saved successfully',
        type: 'success',
      });
    } catch (error) {
      console.error('Error saving spare supply:', error);
      showBackendTextToast({
        toast,
        tmdId: 'TMD_SP_VENDOR_SAVE_FAILED',
        fallbackText:
          error.response?.data?.error ||
          error.response?.data?.message ||
          'Failed to save spare supply',
        type: 'error',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const tableCard = (
    <div className="bg-[#F5F8FA] rounded shadow border relative">
      <div className="px-4 py-2 font-semibold text-[#0E2F4B] text-base border-b border-[#FFC107] flex items-center justify-between">
        <span>{t('vendors.spareSupplyList', { defaultValue: 'Spare Supply List' })}</span>
        <button
          type="button"
          onClick={() => setMaximized((m) => !m)}
          className="ml-2 text-[#0E2F4B] hover:text-[#FFC107] focus:outline-none"
          title={maximized ? 'Minimize' : 'Maximize'}
        >
          {maximized ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
        </button>
      </div>
      <div
        className={`overflow-x-auto overflow-y-auto ${maximized ? 'h-full' : 'max-h-[260px]'}`}
      >
        <table className="min-w-full">
          <thead>
            <tr className="bg-[#0E2F4B] text-white sticky top-0 z-10">
              <th className="px-6 py-3 text-left text-sm font-medium">
                {t('vendors.category', { defaultValue: 'Category' })}
              </th>
              <th className="px-6 py-3 text-left text-sm font-medium">{t('vendors.brand')}</th>
              <th className="px-6 py-3 text-left text-sm font-medium">{t('vendors.model')}</th>
              <th className="px-6 py-3 text-center text-sm font-medium w-20" />
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {items.map((row, idx) => (
              <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className="px-6 py-2 text-sm text-gray-900">
                  {row.categoryText || row.spc_id}
                </td>
                <td className="px-6 py-2 text-sm text-gray-900">{row.brand}</td>
                <td className="px-6 py-2 text-sm text-gray-900">{row.model}</td>
                <td className="px-6 py-2 text-center">
                  <button
                    type="button"
                    onClick={() => handleDelete(idx)}
                    className="text-yellow-500 hover:text-red-600 transition-colors"
                    title="Delete"
                    disabled={isSaving}
                  >
                    <Trash2 className="h-4 w-4 inline" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="pb-6">
      <div className="flex items-end gap-4 mb-8 flex-wrap">
        <div>
          <label className="block text-sm text-gray-700 mb-2">
            {t('vendors.category', { defaultValue: 'Category' })}{' '}
            <span className="text-red-500">*</span>
          </label>
          <select
            name="spc_id"
            value={form.spc_id}
            onChange={handleChange}
            className={`w-48 px-3 py-2 border text-sm bg-white rounded ${
              isFieldInvalid(form.spc_id) ? 'border-red-500' : 'border-gray-300'
            }`}
          >
            <option value="">
              {t('vendors.selectCategory', { defaultValue: 'Select category' })}
            </option>
            {categories.map((cat) => (
              <option key={cat.spc_id} value={cat.spc_id}>
                {cat.text}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm text-gray-700 mb-2">
            {t('vendors.brand')} <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="brand"
            value={form.brand}
            onChange={handleChange}
            className={`w-48 px-3 py-2 border text-sm bg-white rounded ${
              isFieldInvalid(form.brand) ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder={t('vendors.enterBrand', { defaultValue: 'Enter brand' })}
          />
        </div>

        <div>
          <label className="block text-sm text-gray-700 mb-2">
            {t('vendors.model')} <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="model"
            value={form.model}
            onChange={handleChange}
            className={`w-48 px-3 py-2 border text-sm bg-white rounded ${
              isFieldInvalid(form.model) ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder={t('vendors.enterModel', { defaultValue: 'Enter model' })}
          />
        </div>

        <button
          type="button"
          onClick={handleAdd}
          className="bg-[#0E2F4B] text-white px-6 py-1 rounded hover:bg-[#1e40af] transition-colors"
          disabled={isSaving}
        >
          {t('vendors.add')}
        </button>
      </div>

      {maximized ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
          <div className="w-full h-full flex items-center justify-center">
            <div className="bg-white w-11/12 h-5/6 rounded shadow-lg overflow-auto p-4 relative">
              {tableCard}
            </div>
          </div>
        </div>
      ) : (
        tableCard
      )}
    </div>
  );
};

export default SpareSupplyForm;
