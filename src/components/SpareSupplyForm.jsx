import { showBackendTextToast } from '../utils/errorTranslation';
import { useEffect, useState } from 'react';
import { Maximize, Minimize, Trash2 } from 'lucide-react';
import API from '../lib/axios';
import { toast } from 'react-hot-toast';
import { useLanguage } from '../contexts/LanguageContext';

const STORAGE_KEY = 'spareSupplies';

const mapBrand = (brand) => ({
  spb_id: brand.spb_id || brand.spbId || brand.brand_id,
  text: brand.text || brand.brandName || brand.brand_name || brand.name,
});

const mapModel = (model) => ({
  spm_id: model.spm_id || model.spbmId || model.model_id,
  spb_id: model.spb_id || model.spbId,
  text: model.text || model.modelName || model.model_name || model.name,
});

const SpareSupplyForm = ({
  vendorId,
  orgId,
  vendorSaved = false,
  onSaveTrigger,
  onTabSaved,
  loadExisting = false,
  isReadOnly = false,
  showInlineSave = true,
}) => {
  const { t } = useLanguage();
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [models, setModels] = useState([]);
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({ spc_id: '', spb_id: '', spm_id: '' });
  const [maximized, setMaximized] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [loadingBrands, setLoadingBrands] = useState(false);
  const [loadingModels, setLoadingModels] = useState(false);

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const res = await API.get('/spare-parts/categories');
        setCategories(Array.isArray(res.data?.data) ? res.data.data : []);
      } catch (error) {
        console.error('Error fetching spare categories:', error);
        setCategories([]);
        showBackendTextToast({
          toast,
          tmdId: 'TMD_FAILED_TO_FETCH_SPARE_PART_CATEGORIES',
          fallbackText: 'Failed to fetch spare part categories',
          type: 'error',
        });
      }
    };
    loadCategories();
  }, []);

  useEffect(() => {
    const loadBrands = async () => {
      if (!form.spc_id) {
        setBrands([]);
        setLoadingBrands(false);
        return;
      }
      setLoadingBrands(true);
      try {
        const res = await API.get('/spare-parts/brands', {
          params: { spc_id: form.spc_id },
        });
        setBrands(
          (Array.isArray(res.data?.data) ? res.data.data : [])
            .map(mapBrand)
            .filter((row) => row.spb_id && row.text)
        );
      } catch (error) {
        console.error('Error fetching spare part brands:', error);
        setBrands([]);
        showBackendTextToast({
          toast,
          tmdId: 'TMD_SP_BRANDS_FETCH_FAILED',
          fallbackText: 'Failed to fetch brands',
          type: 'error',
        });
      } finally {
        setLoadingBrands(false);
      }
    };
    loadBrands();
  }, [form.spc_id]);

  useEffect(() => {
    const loadModels = async () => {
      if (!form.spc_id || !form.spb_id) {
        setModels([]);
        setLoadingModels(false);
        return;
      }
      setLoadingModels(true);
      try {
        const res = await API.get('/spare-parts/models', {
          params: { spc_id: form.spc_id, spb_id: form.spb_id },
        });
        setModels(
          (Array.isArray(res.data?.data) ? res.data.data : [])
            .map(mapModel)
            .filter((row) => row.spm_id && row.text)
        );
      } catch (error) {
        console.error('Error fetching spare part models:', error);
        setModels([]);
        showBackendTextToast({
          toast,
          tmdId: 'TMD_SP_MODELS_FETCH_FAILED',
          fallbackText: 'Failed to fetch models',
          type: 'error',
        });
      } finally {
        setLoadingModels(false);
      }
    };
    loadModels();
  }, [form.spc_id, form.spb_id]);

  useEffect(() => {
    if (loadExisting) return;
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (stored) setItems(JSON.parse(stored));
    } catch {
      setItems([]);
    }
  }, [loadExisting]);

  useEffect(() => {
    if (!loadExisting || !vendorId) return undefined;
    let cancelled = false;
    const loadMappings = async () => {
      try {
        const res = await API.get('/spare-parts/vendor-mappings', {
          params: { vendor_id: vendorId },
        });
        const rows = Array.isArray(res.data?.data) ? res.data.data : [];
        if (cancelled) return;
        setItems(
          rows.map((row) => ({
            vspm_id: row.vspm_id,
            spc_id: row.spc_id,
            categoryText: row.category_text || row.categoryText || row.spc_id,
            brand: row.brand || '',
            model: row.model || '',
          }))
        );
      } catch (error) {
        console.error('Error loading spare supply mappings:', error);
        if (!cancelled) setItems([]);
      }
    };
    loadMappings();
    return () => {
      cancelled = true;
    };
  }, [loadExisting, vendorId]);

  useEffect(() => {
    if (onSaveTrigger === 'Spare Supply') {
      handleDone();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onSaveTrigger]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => {
      if (name === 'spc_id') {
        return { spc_id: value, spb_id: '', spm_id: '' };
      }
      if (name === 'spb_id') {
        return { ...prev, spb_id: value, spm_id: '' };
      }
      return { ...prev, [name]: value };
    });
    if (submitAttempted) setSubmitAttempted(false);
  };

  const isFieldInvalid = (val) => submitAttempted && !String(val || '').trim();

  const handleAdd = () => {
    if (!form.spc_id || !form.spb_id || !form.spm_id) {
      setSubmitAttempted(true);
      return;
    }

    const selected = categories.find(
      (c) => String(c.spc_id) === String(form.spc_id)
    );
    const selectedBrand = brands.find(
      (b) => String(b.spb_id) === String(form.spb_id)
    );
    const selectedModel = models.find(
      (m) => String(m.spm_id) === String(form.spm_id)
    );
    if (!selected || !selectedBrand || !selectedModel) {
      showBackendTextToast({
        toast,
        tmdId: 'TMD_SP_VENDOR_INVALID_CATEGORY',
        fallbackText: 'Select a valid category, brand, and model',
        type: 'error',
      });
      return;
    }

    const duplicate = items.some((row) => {
      if (String(row.spc_id) !== String(selected.spc_id)) return false;
      const sameIds =
        row.spb_id &&
        row.spm_id &&
        String(row.spb_id) === String(selectedBrand.spb_id) &&
        String(row.spm_id) === String(selectedModel.spm_id);
      const sameText =
        String(row.brand || '').toLowerCase() === String(selectedBrand.text || '').toLowerCase() &&
        String(row.model || '').toLowerCase() === String(selectedModel.text || '').toLowerCase();
      return sameIds || sameText;
    });
    if (duplicate) {
      showBackendTextToast({
        toast,
        tmdId: 'TMD_SP_VENDOR_ITEM_EXISTS',
        fallbackText: 'This category, brand, and model is already in the list',
        type: 'error',
      });
      return;
    }

    const next = [
      ...items,
      {
        spc_id: selected.spc_id,
        categoryText: selected.text,
        spb_id: selectedBrand.spb_id,
        spm_id: selectedModel.spm_id,
        brand: selectedBrand.text,
        model: selectedModel.text,
      },
    ];
    setItems(next);
    if (!loadExisting) {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    }
    setForm({ spc_id: '', spb_id: '', spm_id: '' });
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
    if (!loadExisting) {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    }
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

      const fromStorage = loadExisting
        ? items
        : (() => {
            try {
              return JSON.parse(sessionStorage.getItem(STORAGE_KEY) || '[]');
            } catch {
              return [];
            }
          })();

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

      if (!loadExisting) {
        setItems([]);
        sessionStorage.removeItem(STORAGE_KEY);
      }
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
              {!isReadOnly && <th className="px-6 py-3 text-center text-sm font-medium w-20" />}
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
                {!isReadOnly && (
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
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="pb-6">
      {!isReadOnly && (
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
          <select
            name="spb_id"
            value={form.spb_id}
            onChange={handleChange}
            disabled={!form.spc_id || loadingBrands}
            className={`w-48 px-3 py-2 border text-sm bg-white rounded disabled:bg-gray-100 disabled:text-gray-500 ${
              isFieldInvalid(form.spb_id) ? 'border-red-500' : 'border-gray-300'
            }`}
          >
            <option value="">
              {!form.spc_id
                ? t('vendors.selectCategoryFirst', {
                    defaultValue: 'Select category first',
                  })
                : loadingBrands
                  ? t('common.loading', { defaultValue: 'Loading...' })
                  : brands.length
                    ? t('vendors.selectBrand', { defaultValue: 'Select brand' })
                    : t('vendors.noBrands', { defaultValue: 'No brands found' })}
            </option>
            {brands.map((brand) => (
              <option key={brand.spb_id} value={brand.spb_id}>
                {brand.text}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm text-gray-700 mb-2">
            {t('vendors.model')} <span className="text-red-500">*</span>
          </label>
          <select
            name="spm_id"
            value={form.spm_id}
            onChange={handleChange}
            disabled={!form.spb_id || loadingModels}
            className={`w-48 px-3 py-2 border text-sm bg-white rounded disabled:bg-gray-100 disabled:text-gray-500 ${
              isFieldInvalid(form.spm_id) ? 'border-red-500' : 'border-gray-300'
            }`}
          >
            <option value="">
              {!form.spb_id
                ? t('vendors.selectBrandFirst', {
                    defaultValue: 'Select brand first',
                  })
                : loadingModels
                  ? t('common.loading', { defaultValue: 'Loading...' })
                  : models.length
                    ? t('vendors.selectModel', { defaultValue: 'Select model' })
                    : t('vendors.noModels', { defaultValue: 'No models found' })}
            </option>
            {models.map((model) => (
              <option key={model.spm_id} value={model.spm_id}>
                {model.text}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={handleAdd}
          className="bg-[#0E2F4B] text-white px-6 py-1 rounded hover:bg-[#1e40af] transition-colors"
          disabled={isSaving || loadingBrands || loadingModels}
        >
          {t('vendors.add')}
        </button>
      </div>
      )}

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
      {loadExisting && !isReadOnly && showInlineSave && (
        <div className="flex justify-end mt-4">
          <button
            type="button"
            onClick={handleDone}
            className="bg-[#0E2F4B] text-white px-6 py-2 rounded hover:bg-[#1e40af] transition-colors text-sm"
            disabled={isSaving}
          >
            {isSaving ? t('common.saving', { defaultValue: 'Saving...' }) : t('common.save', { defaultValue: 'Save' })}
          </button>
        </div>
      )}
    </div>
  );
};

export default SpareSupplyForm;
