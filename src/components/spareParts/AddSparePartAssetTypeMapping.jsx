import { showBackendTextToast } from '../../utils/errorTranslation';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import API from '../../lib/axios';
import { invalidateCache } from '../../utils/apiCache';
import EnhancedDropdown from '../ui/EnhancedDropdown';

const emptyForm = {
  spc_id: '',
  category_brand_id: '',
  category_model_id: '',
  asset_type_id: '',
  asset_brand: '',
  asset_model: '',
};

const mappingListPath = '/master-data/spare-parts-configuration?tab=mapping';

const fieldClass = (invalid) =>
  `w-full px-3 py-2 border text-sm bg-white ${invalid ? 'border-red-500' : 'border-gray-300'}`;

const AddSparePartAssetTypeMapping = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState(emptyForm);
  const [categories, setCategories] = useState([]);
  const [categoryBrands, setCategoryBrands] = useState([]);
  const [categoryModels, setCategoryModels] = useState([]);
  const [assetTypes, setAssetTypes] = useState([]);
  const [assetBrands, setAssetBrands] = useState([]);
  const [assetModels, setAssetModels] = useState([]);
  const [saving, setSaving] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);

  useEffect(() => {
    const loadInitial = async () => {
      try {
        const [catRes, atRes] = await Promise.all([
          API.get('/spare-parts/mapping-options/categories'),
          API.get('/asset-types'),
        ]);
        setCategories(Array.isArray(catRes.data?.data) ? catRes.data.data : []);
        const types = Array.isArray(atRes.data)
          ? atRes.data
          : Array.isArray(atRes.data?.data)
            ? atRes.data.data
            : [];
        setAssetTypes(
          types.filter((at) => at.int_status === 1 || at.int_status === '1' || at.int_status === 'Active')
        );
      } catch (error) {
        console.error('Error loading mapping options:', error);
        showBackendTextToast({
          toast,
          fallbackText: 'Failed to load mapping options',
          type: 'error',
        });
      }
    };
    loadInitial();
  }, []);

  useEffect(() => {
    const loadCategoryBrands = async () => {
      if (!form.spc_id) {
        setCategoryBrands([]);
        return;
      }
      try {
        const res = await API.get('/spare-parts/lot-options/brands', {
          params: { spc_id: form.spc_id },
        });
        setCategoryBrands(Array.isArray(res.data?.data) ? res.data.data : []);
      } catch (error) {
        console.error('Error fetching category brands:', error);
        setCategoryBrands([]);
      }
    };
    loadCategoryBrands();
  }, [form.spc_id]);

  useEffect(() => {
    const loadCategoryModels = async () => {
      if (!form.spc_id || !form.category_brand_id) {
        setCategoryModels([]);
        return;
      }
      try {
        const res = await API.get('/spare-parts/lot-options/models', {
          params: { spc_id: form.spc_id, brand_id: form.category_brand_id },
        });
        setCategoryModels(Array.isArray(res.data?.data) ? res.data.data : []);
      } catch (error) {
        console.error('Error fetching category models:', error);
        setCategoryModels([]);
      }
    };
    loadCategoryModels();
  }, [form.spc_id, form.category_brand_id]);

  useEffect(() => {
    const loadAssetBrands = async () => {
      if (!form.asset_type_id) {
        setAssetBrands([]);
        return;
      }
      try {
        const res = await API.get('/spare-parts/mapping-options/asset-brands', {
          params: { asset_type_id: form.asset_type_id },
        });
        setAssetBrands(Array.isArray(res.data?.data) ? res.data.data : []);
      } catch (error) {
        console.error('Error fetching asset brands:', error);
        setAssetBrands([]);
      }
    };
    loadAssetBrands();
  }, [form.asset_type_id]);

  useEffect(() => {
    const loadAssetModels = async () => {
      if (!form.asset_type_id || !form.asset_brand) {
        setAssetModels([]);
        return;
      }
      try {
        const res = await API.get('/spare-parts/mapping-options/asset-models', {
          params: {
            asset_type_id: form.asset_type_id,
            brand: form.asset_brand,
          },
        });
        setAssetModels(Array.isArray(res.data?.data) ? res.data.data : []);
      } catch (error) {
        console.error('Error fetching asset models:', error);
        setAssetModels([]);
      }
    };
    loadAssetModels();
  }, [form.asset_type_id, form.asset_brand]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => {
      const next = { ...prev, [name]: value };
      if (name === 'spc_id') {
        next.category_brand_id = '';
        next.category_model_id = '';
      } else if (name === 'category_brand_id') {
        next.category_model_id = '';
      } else if (name === 'asset_type_id') {
        next.asset_brand = '';
        next.asset_model = '';
      } else if (name === 'asset_brand') {
        next.asset_model = '';
      }
      return next;
    });
  };

  // Only mark fields invalid if they are required for this screen
  const isInvalid = (val, required = true) =>
    submitAttempted && required && (!val || !String(val).trim());

  const handleSave = async (e) => {
    e.preventDefault();
    setSubmitAttempted(true);

    const required = [[form.spc_id, 'Category is required'], [form.asset_type_id, 'Asset type is required']];
    const missing = required.find(([val]) => !val || !String(val).trim());
    if (missing) {
      showBackendTextToast({
        toast,
        fallbackText: missing[1],
        type: 'error',
      });
      return;
    }

    try {
      setSaving(true);
      await API.post('/spare-parts/category-mappings', {
        spc_id: form.spc_id,
        category_brand_id: form.category_brand_id,
        category_model_id: form.category_model_id,
        asset_type_id: form.asset_type_id,
        asset_brand: form.asset_brand,
        asset_model: form.asset_model,
      });
      invalidateCache('spare-parts:');
      showBackendTextToast({
        toast,
        tmdId: 'TMD_SP_MAP_SAVED',
        fallbackText: 'Asset type mapping saved successfully',
        type: 'success',
      });
      navigate(mappingListPath);
    } catch (error) {
      console.error('Error saving mapping:', error);
      showBackendTextToast({
        toast,
        tmdId: 'TMD_SP_MAP_SAVE_FAILED',
        fallbackText:
          error.response?.data?.error ||
          error.response?.data?.message ||
          'Failed to save asset type mapping',
        type: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-[1000px] mx-auto mt-8 bg-white shadow rounded">
      <div className="text-center text-lg font-semibold bg-[#0E2F4B] text-white py-3 border-b-4 border-[#FFC107] rounded-t">
        Asset Type Mapping
      </div>
      <form onSubmit={handleSave} className="p-6 space-y-8">
        <div>
          <h3 className="text-sm font-semibold text-[#0E2F4B] mb-3">
            Category Mapping
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm mb-1 font-medium">
                Category <span className="text-red-500">*</span>
              </label>
              <select
                name="spc_id"
                value={form.spc_id}
                onChange={handleChange}
                className={fieldClass(isInvalid(form.spc_id, true))}
              >
                <option value="">Select category</option>
                {categories.map((cat) => (
                  <option key={cat.spc_id} value={cat.spc_id}>
                    {cat.text}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm mb-1 font-medium">
                Brand
              </label>
              <select
                name="category_brand_id"
                value={form.category_brand_id}
                onChange={handleChange}
                className={fieldClass(isInvalid(form.category_brand_id, false))}
                disabled={!form.spc_id}
              >
                <option value="">
                  {form.spc_id ? 'Select brand' : 'Select category first'}
                </option>
                {categoryBrands.map((brand) => (
                  <option key={brand.brand_id} value={brand.brand_id}>
                    {brand.brand_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm mb-1 font-medium">
                Model
              </label>
              <select
                name="category_model_id"
                value={form.category_model_id}
                onChange={handleChange}
                className={fieldClass(isInvalid(form.category_model_id, false))}
                disabled={!form.category_brand_id}
              >
                <option value="">
                  {form.category_brand_id ? 'Select model' : 'Select brand first'}
                </option>
                {categoryModels.map((model) => (
                  <option key={model.model_id} value={model.model_id}>
                    {model.model_name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-visible">
          <h3 className="text-sm font-semibold text-[#0E2F4B] mb-3">
            Asset Type Mapping
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 overflow-visible">
            <div className="overflow-visible">
              <label className="block text-sm mb-1 font-medium">
                Asset Type <span className="text-red-500">*</span>
              </label>
              <EnhancedDropdown
                native
                required
                className={isInvalid(form.asset_type_id, true) ? '[&>div]:border-red-500' : ''}
                value={form.asset_type_id}
                placeholder="Select asset type"
                onChange={(value) =>
                  handleChange({ target: { name: 'asset_type_id', value } })
                }
                options={[
                  { value: '', label: 'Select asset type' },
                  ...assetTypes.map((at) => ({
                    value: at.asset_type_id,
                    label: at.text,
                  })),
                ]}
              />
            </div>
            <div>
              <label className="block text-sm mb-1 font-medium">
                Brand
              </label>
              <select
                name="asset_brand"
                value={form.asset_brand}
                onChange={handleChange}
                className={fieldClass(isInvalid(form.asset_brand, false))}
                disabled={!form.asset_type_id}
              >
                <option value="">
                  {form.asset_type_id ? 'Select brand' : 'Select asset type first'}
                </option>
                {assetBrands.map((brand) => (
                  <option key={brand.brand} value={brand.brand}>
                    {brand.brand}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm mb-1 font-medium">
                Model
              </label>
              <select
                name="asset_model"
                value={form.asset_model}
                onChange={handleChange}
                className={fieldClass(isInvalid(form.asset_model, false))}
                disabled={!form.asset_brand}
              >
                <option value="">
                  {form.asset_brand ? 'Select model' : 'Select brand first'}
                </option>
                {assetModels.map((model) => (
                  <option key={model.model} value={model.model}>
                    {model.model}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => navigate(mappingListPath)}
            className="bg-gray-300 px-4 py-2 rounded text-sm"
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="bg-[#002F5F] text-white px-4 py-2 rounded text-sm"
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddSparePartAssetTypeMapping;
