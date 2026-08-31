import { showBackendTextToast } from '../../utils/errorTranslation';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import API from '../../lib/axios';
import { invalidateCache } from '../../utils/apiCache';
import EnhancedDropdown from '../ui/EnhancedDropdown';

const CREATE_NEW = 'CREATE_NEW';

const emptyForm = {
  text: '',
  spb_id: '',
  spm_id: '',
  uom: '',
  minimum_stock: '',
  re_order_level: '',
};

const CreateNameModal = ({
  title,
  label,
  placeholder,
  value,
  onChange,
  onCancel,
  onCreate,
  saving,
}) => (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
      <div className="bg-[#0E2F4B] text-white py-4 px-6 rounded-t-lg border-b-4 border-[#FFC107]">
        <h2 className="text-xl font-semibold">{title}</h2>
      </div>
      <div className="p-6">
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {label} <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0E2F4B] focus:border-transparent"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                onCreate();
              }
            }}
          />
        </div>
        <div className="flex gap-3 justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onCreate}
            disabled={saving || !value.trim()}
            className="px-6 py-2.5 bg-[#0E2F4B] text-white rounded-md hover:bg-[#143d65] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Creating...' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  </div>
);

const AddSparePartCategory = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState(emptyForm);
  const [uomOptions, setUomOptions] = useState([]);
  const [brands, setBrands] = useState([]);
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [uomLoading, setUomLoading] = useState(true);
  const [brandsLoading, setBrandsLoading] = useState(true);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [showBrandModal, setShowBrandModal] = useState(false);
  const [showModelModal, setShowModelModal] = useState(false);
  const [newBrandName, setNewBrandName] = useState('');
  const [newModelName, setNewModelName] = useState('');
  const [savingBrand, setSavingBrand] = useState(false);
  const [savingModel, setSavingModel] = useState(false);

  const fetchBrands = async () => {
    setBrandsLoading(true);
    try {
      const res = await API.get('/spare-parts/brands');
      const rows = Array.isArray(res.data?.data) ? res.data.data : [];
      setBrands(
        rows
          .map((brand) => ({
            spb_id: brand.spb_id || brand.spbId || brand.brand_id,
            text: brand.text || brand.brandName || brand.brand_name || brand.name,
          }))
          .filter((brand) => brand.spb_id && brand.text)
      );
    } catch (error) {
      console.error('Error fetching brands:', error);
      showBackendTextToast({
        toast,
        tmdId: 'TMD_SP_BRANDS_FETCH_FAILED',
        fallbackText: 'Failed to fetch brands',
        type: 'error',
      });
      setBrands([]);
    } finally {
      setBrandsLoading(false);
    }
  };

  const fetchModels = async (spbId) => {
    if (!spbId) {
      setModels([]);
      return;
    }
    setModelsLoading(true);
    try {
      const res = await API.get('/spare-parts/models', {
        params: { spb_id: spbId },
      });
      const rows = Array.isArray(res.data?.data) ? res.data.data : [];
      setModels(
        rows
          .map((model) => ({
            spm_id: model.spm_id || model.spbmId || model.model_id,
            spb_id: model.spb_id || model.spbId,
            text: model.text || model.modelName || model.model_name || model.name,
          }))
          .filter((model) => model.spm_id && model.text)
      );
    } catch (error) {
      console.error('Error fetching models:', error);
      showBackendTextToast({
        toast,
        tmdId: 'TMD_SP_MODELS_FETCH_FAILED',
        fallbackText: 'Failed to fetch models',
        type: 'error',
      });
      setModels([]);
    } finally {
      setModelsLoading(false);
    }
  };

  useEffect(() => {
    const loadUom = async () => {
      setUomLoading(true);
      try {
        const res = await API.get('/uom');
        let rows = [];
        if (res.data?.success && Array.isArray(res.data.data)) {
          rows = res.data.data;
        } else if (Array.isArray(res.data)) {
          rows = res.data;
        }
        setUomOptions(
          rows.map((u) => ({
            id: u.UOM_id || u.uom_id,
            text: u.UOM || u.uom || u.text,
          }))
        );
      } catch (error) {
        console.error('Error fetching UOM:', error);
        showBackendTextToast({
          toast,
          tmdId: 'TMD_FAILED_TO_FETCH_UOM',
          fallbackText: 'Failed to fetch UOM values',
          type: 'error',
        });
        setUomOptions([]);
      } finally {
        setUomLoading(false);
      }
    };
    loadUom();
    fetchBrands();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleBrandChange = (value) => {
    if (value === CREATE_NEW) {
      setShowBrandModal(true);
      return;
    }
    setForm((prev) => ({ ...prev, spb_id: value, spm_id: '' }));
    fetchModels(value);
  };

  const handleModelChange = (value) => {
    if (value === CREATE_NEW) {
      if (!form.spb_id) {
        showBackendTextToast({
          toast,
          tmdId: 'TMD_SP_SELECT_BRAND_FIRST',
          fallbackText: 'Select a brand first',
          type: 'error',
        });
        return;
      }
      setShowModelModal(true);
      return;
    }
    setForm((prev) => ({ ...prev, spm_id: value }));
  };

  const handleCreateBrand = async () => {
    if (!newBrandName.trim()) {
      showBackendTextToast({
        toast,
        tmdId: 'TMD_SP_BRAND_REQUIRED',
        fallbackText: 'Please enter a brand name',
        type: 'error',
      });
      return;
    }
    const normalized = newBrandName.trim().toLowerCase();
    const brandExists = brands.some(
      (b) => String(b.text || '').trim().toLowerCase() === normalized
    );
    if (brandExists) {
      showBackendTextToast({
        toast,
        tmdId: 'TMD_SP_BRAND_EXISTS',
        fallbackText: 'A brand with this name already exists',
        type: 'error',
      });
      return;
    }
    setSavingBrand(true);
    try {
      const res = await API.post('/spare-parts/brands', {
        text: newBrandName.trim(),
      });
      const created = res.data?.data;
      showBackendTextToast({
        toast,
        tmdId: 'TMD_SP_BRAND_CREATED',
        fallbackText: 'Brand created successfully',
        type: 'success',
      });
      setNewBrandName('');
      setShowBrandModal(false);
      await fetchBrands();
      if (created?.spb_id) {
        setForm((prev) => ({ ...prev, spb_id: created.spb_id, spm_id: '' }));
        fetchModels(created.spb_id);
      }
    } catch (error) {
      console.error('Error creating brand:', error);
      showBackendTextToast({
        toast,
        tmdId: 'TMD_SP_BRAND_CREATE_FAILED',
        fallbackText:
          error.response?.data?.error ||
          error.response?.data?.message ||
          'Failed to create brand',
        type: 'error',
      });
    } finally {
      setSavingBrand(false);
    }
  };

  const handleCreateModel = async () => {
    if (!newModelName.trim()) {
      showBackendTextToast({
        toast,
        tmdId: 'TMD_SP_MODEL_REQUIRED',
        fallbackText: 'Please enter a model name',
        type: 'error',
      });
      return;
    }
    if (!form.spb_id) {
      showBackendTextToast({
        toast,
        tmdId: 'TMD_SP_SELECT_BRAND_FIRST',
        fallbackText: 'Select a brand first',
        type: 'error',
      });
      return;
    }
    const normalized = newModelName.trim().toLowerCase();
    const modelExists = models.some(
      (m) => String(m.text || '').trim().toLowerCase() === normalized
    );
    if (modelExists) {
      showBackendTextToast({
        toast,
        tmdId: 'TMD_SP_MODEL_EXISTS',
        fallbackText: 'A model with this name already exists for the selected brand',
        type: 'error',
      });
      return;
    }
    setSavingModel(true);
    try {
      const res = await API.post('/spare-parts/models', {
        text: newModelName.trim(),
        spb_id: form.spb_id,
      });
      const created = res.data?.data;
      showBackendTextToast({
        toast,
        tmdId: 'TMD_SP_MODEL_CREATED',
        fallbackText: 'Model created successfully',
        type: 'success',
      });
      setNewModelName('');
      setShowModelModal(false);
      await fetchModels(form.spb_id);
      if (created?.spm_id) {
        setForm((prev) => ({ ...prev, spm_id: created.spm_id }));
      }
    } catch (error) {
      console.error('Error creating model:', error);
      showBackendTextToast({
        toast,
        tmdId: 'TMD_SP_MODEL_CREATE_FAILED',
        fallbackText:
          error.response?.data?.error ||
          error.response?.data?.message ||
          'Failed to create model',
        type: 'error',
      });
    } finally {
      setSavingModel(false);
    }
  };

  const isInvalid = (val) => submitAttempted && (!val || !String(val).trim());

  const validate = () => {
    if (!form.text.trim()) {
      showBackendTextToast({
        toast,
        tmdId: 'TMD_SP_CATEGORY_REQUIRED',
        fallbackText: 'Category is required',
        type: 'error',
      });
      return false;
    }
    if (!form.spb_id) {
      showBackendTextToast({
        toast,
        tmdId: 'TMD_SP_BRAND_REQUIRED',
        fallbackText: 'Brand is required',
        type: 'error',
      });
      return false;
    }
    if (!form.spm_id) {
      showBackendTextToast({
        toast,
        tmdId: 'TMD_SP_MODEL_REQUIRED',
        fallbackText: 'Model is required',
        type: 'error',
      });
      return false;
    }
    if (!form.uom.trim()) {
      showBackendTextToast({
        toast,
        tmdId: 'TMD_SP_UOM_REQUIRED',
        fallbackText: 'UOM is required',
        type: 'error',
      });
      return false;
    }
    if (
      form.minimum_stock !== '' &&
      (Number(form.minimum_stock) < 0 || Number.isNaN(Number(form.minimum_stock)))
    ) {
      showBackendTextToast({
        toast,
        tmdId: 'TMD_SP_MIN_STOCK_INVALID',
        fallbackText: 'Enter a valid minimum stock',
        type: 'error',
      });
      return false;
    }
    if (
      form.re_order_level !== '' &&
      (Number(form.re_order_level) < 0 || Number.isNaN(Number(form.re_order_level)))
    ) {
      showBackendTextToast({
        toast,
        tmdId: 'TMD_SP_REORDER_INVALID',
        fallbackText: 'Enter a valid reorder level',
        type: 'error',
      });
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitAttempted(true);
    if (!validate()) return;

    try {
      setLoading(true);
      await API.post('/spare-parts/categories', {
        text: form.text.trim(),
        spb_id: form.spb_id,
        spm_id: form.spm_id,
        uom: form.uom.trim(),
        minimum_stock: form.minimum_stock === '' ? null : Number(form.minimum_stock),
        re_order_level: form.re_order_level === '' ? null : Number(form.re_order_level),
      });
      invalidateCache('spare-parts:');
      showBackendTextToast({
        toast,
        tmdId: 'TMD_SP_CATEGORY_CREATED',
        fallbackText: 'Spare part category created successfully',
        type: 'success',
      });
      navigate('/master-data/spare-parts-configuration');
    } catch (error) {
      console.error('Error creating spare part category:', error);
      showBackendTextToast({
        toast,
        tmdId: 'TMD_SP_CATEGORY_CREATE_FAILED',
        fallbackText:
          error.response?.data?.error ||
          error.response?.data?.message ||
          'Failed to create spare part category',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const brandOptions = [
    ...brands.map((brand) => ({
      value: brand.spb_id,
      label: brand.text,
    })),
    {
      value: CREATE_NEW,
      label: '+ Create New',
      description: 'Create a new brand',
      isCreateNew: true,
    },
  ];

  const modelOptions = [
    ...models.map((model) => ({
      value: model.spm_id,
      label: model.text,
    })),
    {
      value: CREATE_NEW,
      label: '+ Create New',
      description: 'Create a new model',
      isCreateNew: true,
    },
  ];

  return (
    <div className="max-w-[1000px] mx-auto mt-8 bg-white shadow rounded">
      {showBrandModal && (
        <CreateNameModal
          title="Create New Brand"
          label="Brand"
          placeholder="Enter brand name"
          value={newBrandName}
          onChange={setNewBrandName}
          onCancel={() => {
            setShowBrandModal(false);
            setNewBrandName('');
          }}
          onCreate={handleCreateBrand}
          saving={savingBrand}
        />
      )}
      {showModelModal && (
        <CreateNameModal
          title="Create New Model"
          label="Model"
          placeholder="Enter model name"
          value={newModelName}
          onChange={setNewModelName}
          onCancel={() => {
            setShowModelModal(false);
            setNewModelName('');
          }}
          onCreate={handleCreateModel}
          saving={savingModel}
        />
      )}

      <div className="text-center text-lg font-semibold bg-[#0E2F4B] text-white py-3 border-b-4 border-[#FFC107] rounded-t">
        Add Spare Part Category
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6" autoComplete="off">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm mb-1 font-medium" htmlFor="spc_category_name">
              Category <span className="text-red-500">*</span>
            </label>
            <input
              id="spc_category_name"
              name="spc_category_name"
              type="text"
              value={form.text}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, text: e.target.value }))
              }
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              data-form-type="other"
              data-lpignore="true"
              className={`w-full px-3 py-2 border text-sm bg-white ${
                isInvalid(form.text) ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Enter category name"
            />
          </div>

          <div>
            <label className="block text-sm mb-1 font-medium">
              UOM <span className="text-red-500">*</span>
            </label>
            <select
              name="uom"
              value={form.uom}
              onChange={handleChange}
              className={`w-full px-3 py-2 border text-sm bg-white ${
                isInvalid(form.uom) ? 'border-red-500' : 'border-gray-300'
              }`}
              disabled={uomLoading}
            >
              <option value="">{uomLoading ? 'Loading...' : 'Select UOM'}</option>
              {uomOptions.map((u) => (
                <option key={u.id || u.text} value={u.text}>
                  {u.text}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm mb-1 font-medium">
              Brand <span className="text-red-500">*</span>
            </label>
            <div className={isInvalid(form.spb_id) ? 'ring-1 ring-red-500 rounded-lg' : ''}>
              <EnhancedDropdown
                options={brandOptions}
                value={form.spb_id}
                onChange={handleBrandChange}
                placeholder={brandsLoading ? 'Loading brands...' : 'Select brand'}
                disabled={brandsLoading}
                required
                compact
              />
            </div>
          </div>

          <div>
            <label className="block text-sm mb-1 font-medium">
              Model <span className="text-red-500">*</span>
            </label>
            <div className={isInvalid(form.spm_id) ? 'ring-1 ring-red-500 rounded-lg' : ''}>
              <EnhancedDropdown
                options={modelOptions}
                value={form.spm_id}
                onChange={handleModelChange}
                placeholder={
                  !form.spb_id
                    ? 'Select brand first'
                    : modelsLoading
                      ? 'Loading models...'
                      : 'Select model'
                }
                disabled={!form.spb_id || modelsLoading}
                required
                compact
              />
            </div>
          </div>

          <div>
            <label className="block text-sm mb-1 font-medium">
              Minimum Stock
            </label>
            <input
              type="text"
              name="minimum_stock"
              inputMode="numeric"
              value={form.minimum_stock}
              onChange={handleChange}
              autoComplete="off"
              className="w-full px-3 py-2 border text-sm bg-white border-gray-300"
              placeholder="Enter minimum stock"
            />
          </div>

          <div>
            <label className="block text-sm mb-1 font-medium">
              Reorder Level
            </label>
            <input
              type="text"
              name="re_order_level"
              inputMode="numeric"
              value={form.re_order_level}
              onChange={handleChange}
              autoComplete="off"
              className="w-full px-3 py-2 border text-sm bg-white border-gray-300"
              placeholder="Enter reorder level"
            />
          </div>
        </div>

        <div className="flex justify-end mt-6 gap-2">
          <button
            type="button"
            onClick={() => navigate('/master-data/spare-parts-configuration')}
            className="bg-gray-300 px-4 py-2 rounded text-sm"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="bg-[#002F5F] text-white px-4 py-2 rounded text-sm"
            disabled={loading}
          >
            {loading ? 'Saving...' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddSparePartCategory;
