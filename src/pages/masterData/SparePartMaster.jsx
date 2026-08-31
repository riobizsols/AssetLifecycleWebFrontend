import { showBackendTextToast } from '../../utils/errorTranslation';
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import API from '../../lib/axios';
import { useLanguage } from '../../contexts/LanguageContext';
import { invalidateCache } from '../../utils/apiCache';
import EnhancedDropdown from '../../components/ui/EnhancedDropdown';

const CREATE_NEW = 'CREATE_NEW';
const isTempId = (id) => String(id || '').startsWith('new:');

const CreateNameModal = ({
  title,
  label,
  placeholder,
  value,
  onChange,
  onCancel,
  onCreate,
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
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onCreate}
            disabled={!value.trim()}
            className="px-6 py-2.5 bg-[#0E2F4B] text-white rounded-md hover:bg-[#143d65] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Create
          </button>
        </div>
      </div>
    </div>
  </div>
);

const MultiSelectDropdown = ({
  options = [],
  selectedIds = [],
  onChange,
  placeholder = 'Select list values',
  invalid = false,
  dropUp = false,
}) => {
  const [open, setOpen] = useState(false);
  const selectedIdSet = new Set((selectedIds || []).map(String));
  const selected = options.filter((opt) => selectedIdSet.has(String(opt.aplv_id)));
  const label =
    selected.length === 0
      ? placeholder
      : selected.map((opt) => opt.value).join(', ');

  const toggle = (aplvId) => {
    const id = String(aplvId);
    const next = selectedIdSet.has(id)
      ? selectedIds.filter((item) => String(item) !== id)
      : [...selectedIds, aplvId];
    onChange(next);
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        title={selected.length ? label : undefined}
        className={`w-full px-3 py-2 border rounded text-sm bg-white text-left flex items-center justify-between gap-2 ${
          invalid ? 'border-red-500' : 'border-gray-300'
        }`}
      >
        <span className={`truncate ${selected.length ? 'text-gray-800' : 'text-gray-500'}`}>
          {label}
        </span>
        <svg className="w-4 h-4 text-gray-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div
            className={`absolute z-20 w-full max-h-48 overflow-y-auto bg-white border border-gray-200 rounded-md shadow-lg ${
              dropUp ? 'bottom-full mb-1' : 'mt-1'
            }`}
          >
            {options.length === 0 ? (
              <div className="px-3 py-2 text-sm text-gray-500">No list values</div>
            ) : (
              options.map((opt) => {
                const checked = selectedIdSet.has(String(opt.aplv_id));
                return (
                  <label
                    key={opt.aplv_id}
                    className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-blue-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      className="h-4 w-4"
                      checked={checked}
                      onChange={() => toggle(opt.aplv_id)}
                    />
                    <span>{opt.value}</span>
                  </label>
                );
              })
            )}
          </div>
        </>
      )}
    </div>
  );
};

const emptyForm = {
  spc_id: '',
  brand_id: '',
  brand_name: '',
  model_id: '',
  model_name: '',
  part_number: '',
};

const SparePartMaster = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const listPath = '/master-data/spare-part';
  const [form, setForm] = useState(emptyForm);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [models, setModels] = useState([]);
  const [properties, setProperties] = useState([]);
  const [selectedProperties, setSelectedProperties] = useState([]);
  const [propertyValues, setPropertyValues] = useState({});
  const [selectedListValues, setSelectedListValues] = useState({});
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [loadingBrands, setLoadingBrands] = useState(false);
  const [loadingModels, setLoadingModels] = useState(false);
  const [loadingProperties, setLoadingProperties] = useState(true);
  const [loadingValues, setLoadingValues] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [showBrandModal, setShowBrandModal] = useState(false);
  const [showModelModal, setShowModelModal] = useState(false);
  const [newBrandName, setNewBrandName] = useState('');
  const [newModelName, setNewModelName] = useState('');

  useEffect(() => {
    const fetchCategories = async () => {
      setLoadingCategories(true);
      try {
        const res = await API.get('/spare-parts/categories', {
          params: { orgWide: true },
        });
        setCategories(Array.isArray(res.data?.data) ? res.data.data : []);
      } catch (error) {
        console.error('Error fetching categories:', error);
        showBackendTextToast({
          toast,
          fallbackText: 'Failed to fetch categories',
          type: 'error',
        });
        setCategories([]);
      } finally {
        setLoadingCategories(false);
      }
    };
    fetchCategories();
  }, []);

  useEffect(() => {
    const fetchProperties = async () => {
      setLoadingProperties(true);
      try {
        const res = await API.get('/properties/with-values');
        const rows = Array.isArray(res.data?.data) ? res.data.data : [];
        setProperties(
          rows.map((prop) => {
            let listValues = prop.list_values || prop.values || [];
            if (typeof listValues === 'string') {
              try {
                listValues = JSON.parse(listValues);
              } catch {
                listValues = [];
              }
            }
            return {
              id: prop.prop_id,
              text: prop.property,
              list_values: Array.isArray(listValues) ? listValues : [],
            };
          })
        );
      } catch (error) {
        console.error('Error fetching properties:', error);
        showBackendTextToast({
          toast,
          fallbackText: 'Failed to load properties',
          type: 'error',
        });
        setProperties([]);
      } finally {
        setLoadingProperties(false);
      }
    };
    fetchProperties();
  }, []);

  useEffect(() => {
    if (!form.spc_id) {
      setBrands([]);
      setLoadingBrands(false);
      return undefined;
    }

    let cancelled = false;
    const fetchBrands = async () => {
      setLoadingBrands(true);
      try {
        const res = await API.get('/spare-parts/lot-options/brands', {
          params: { spc_id: form.spc_id },
        });
        const rows = (Array.isArray(res.data?.data) ? res.data.data : [])
          .map((row) => ({
            brand_id: row.brand_id || row.spbId || row.spbid,
            brand_name: row.brand_name || row.brandName || row.brandname,
          }))
          .filter((row) => row.brand_id);
        if (cancelled) return;
        setBrands(rows);
      } catch (error) {
        console.error('Error fetching brands:', error);
        if (!cancelled) {
          showBackendTextToast({
            toast,
            fallbackText: 'Failed to fetch brands',
            type: 'error',
          });
          setBrands([]);
        }
      } finally {
        if (!cancelled) setLoadingBrands(false);
      }
    };
    fetchBrands();
    return () => {
      cancelled = true;
    };
  }, [form.spc_id]);

  useEffect(() => {
    if (!form.spc_id || !form.brand_id || isTempId(form.brand_id)) {
      setModels([]);
      setLoadingModels(false);
      return undefined;
    }

    let cancelled = false;
    const fetchModels = async () => {
      setLoadingModels(true);
      try {
        const res = await API.get('/spare-parts/lot-options/models', {
          params: { spc_id: form.spc_id, brand_id: form.brand_id },
        });
        const rows = (Array.isArray(res.data?.data) ? res.data.data : [])
          .map((row) => ({
            model_id: row.model_id || row.spbmId || row.spbmid,
            model_name: row.model_name || row.modelName || row.modelname,
          }))
          .filter((row) => row.model_id);
        if (cancelled) return;
        setModels(rows);
      } catch (error) {
        console.error('Error fetching models:', error);
        if (!cancelled) {
          showBackendTextToast({
            toast,
            fallbackText: 'Failed to fetch models',
            type: 'error',
          });
          setModels([]);
        }
      } finally {
        if (!cancelled) setLoadingModels(false);
      }
    };
    fetchModels();
    return () => {
      cancelled = true;
    };
  }, [form.spc_id, form.brand_id]);

  useEffect(() => {
    const loadValuesForSelected = async () => {
      if (!selectedProperties.length) {
        setPropertyValues({});
        setSelectedListValues({});
        return;
      }

      setLoadingValues(true);
      try {
        const entries = await Promise.all(
          selectedProperties.map(async (propId) => {
            const fromCatalog = properties.find((p) => p.id === propId)?.list_values;
            if (Array.isArray(fromCatalog) && fromCatalog.length) {
              return [propId, fromCatalog];
            }
            try {
              const res = await API.get(`/spare-parts/property-values/${propId}`);
              const rows = Array.isArray(res.data?.data) ? res.data.data : [];
              return [propId, rows];
            } catch {
              const res = await API.get(`/properties/${propId}/values`);
              const rows = Array.isArray(res.data?.data) ? res.data.data : [];
              return [propId, rows];
            }
          })
        );
        const nextValues = Object.fromEntries(entries);
        setPropertyValues(nextValues);
        setSelectedListValues((prev) => {
          const next = {};
          selectedProperties.forEach((propId) => {
            if (Array.isArray(prev[propId])) next[propId] = prev[propId];
            else if (prev[propId]) next[propId] = [prev[propId]];
            else next[propId] = [];
          });
          return next;
        });
      } catch (error) {
        console.error('Error fetching property values:', error);
        showBackendTextToast({
          toast,
          fallbackText: 'Failed to load property list values',
          type: 'error',
        });
      } finally {
        setLoadingValues(false);
      }
    };

    loadValuesForSelected();
  }, [selectedProperties, properties]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => {
      const next = { ...prev, [name]: value };
      if (name === 'spc_id') {
        next.brand_id = '';
        next.brand_name = '';
        next.model_id = '';
        next.model_name = '';
      }
      return next;
    });
    if (submitAttempted) setSubmitAttempted(false);
  };

  const handleBrandChange = (value) => {
    if (value === CREATE_NEW) {
      setShowBrandModal(true);
      return;
    }
    setForm((prev) => ({
      ...prev,
      brand_id: value,
      brand_name: '',
      model_id: '',
      model_name: '',
    }));
    if (submitAttempted) setSubmitAttempted(false);
  };

  const handleModelChange = (value) => {
    if (value === CREATE_NEW) {
      if (!form.brand_id) {
        showBackendTextToast({
          toast,
          fallbackText: 'Select a brand first',
          type: 'error',
        });
        return;
      }
      setShowModelModal(true);
      return;
    }
    setForm((prev) => ({
      ...prev,
      model_id: value,
      model_name: '',
    }));
    if (submitAttempted) setSubmitAttempted(false);
  };

  const handleCreateBrand = () => {
    const name = newBrandName.trim();
    if (!name) {
      showBackendTextToast({
        toast,
        fallbackText: 'Please enter a brand name',
        type: 'error',
      });
      return;
    }
    const exists = brands.some(
      (b) => String(b.brand_name || b.text || '').trim().toLowerCase() === name.toLowerCase()
    );
    if (exists) {
      showBackendTextToast({
        toast,
        fallbackText: 'A brand with this name already exists',
        type: 'error',
      });
      return;
    }
    const tempId = `new:${name}`;
    setBrands((prev) =>
      prev.some((b) => b.brand_id === tempId)
        ? prev
        : [...prev, { brand_id: tempId, brand_name: name }]
    );
    setForm((prev) => ({
      ...prev,
      brand_id: tempId,
      brand_name: name,
      model_id: '',
      model_name: '',
    }));
    setNewBrandName('');
    setShowBrandModal(false);
  };

  const handleCreateModel = () => {
    const name = newModelName.trim();
    if (!name) {
      showBackendTextToast({
        toast,
        fallbackText: 'Please enter a model name',
        type: 'error',
      });
      return;
    }
    if (!form.brand_id) {
      showBackendTextToast({
        toast,
        fallbackText: 'Select a brand first',
        type: 'error',
      });
      return;
    }
    const exists = models.some(
      (m) => String(m.model_name || m.text || '').trim().toLowerCase() === name.toLowerCase()
    );
    if (exists) {
      showBackendTextToast({
        toast,
        fallbackText: 'A model with this name already exists for the selected brand',
        type: 'error',
      });
      return;
    }
    const tempId = `new:${name}`;
    setModels((prev) =>
      prev.some((m) => m.model_id === tempId)
        ? prev
        : [...prev, { model_id: tempId, model_name: name }]
    );
    setForm((prev) => ({
      ...prev,
      model_id: tempId,
      model_name: name,
    }));
    setNewModelName('');
    setShowModelModal(false);
  };

  const isFieldInvalid = (val) =>
    submitAttempted && (!val || !String(val).trim());

  const isBrandValid = useMemo(() => {
    if (isTempId(form.brand_id)) return Boolean(form.brand_name.trim());
    return Boolean(form.brand_id);
  }, [form.brand_id, form.brand_name]);

  const isModelValid = useMemo(() => {
    if (isTempId(form.brand_id) || isTempId(form.model_id)) {
      return Boolean(form.model_name.trim());
    }
    return Boolean(form.model_id);
  }, [form.brand_id, form.model_id, form.model_name]);

  const validate = () => {
    if (!form.spc_id) {
      showBackendTextToast({ toast, fallbackText: 'Category is required', type: 'error' });
      return false;
    }
    if (!isBrandValid) {
      showBackendTextToast({ toast, fallbackText: 'Brand is required', type: 'error' });
      return false;
    }
    if (!isModelValid) {
      showBackendTextToast({ toast, fallbackText: 'Model is required', type: 'error' });
      return false;
    }

    if (isTempId(form.brand_id)) {
      const brandName = form.brand_name.trim().toLowerCase();
      const brandExists = brands.some(
        (b) =>
          !isTempId(b.brand_id) &&
          String(b.brand_name || b.text || '').trim().toLowerCase() === brandName
      );
      if (brandExists) {
        showBackendTextToast({
          toast,
          fallbackText: 'A brand with this name already exists',
          type: 'error',
        });
        return false;
      }
    }

    if (
      (isTempId(form.brand_id) || isTempId(form.model_id)) &&
      form.model_name.trim()
    ) {
      const modelName = form.model_name.trim().toLowerCase();
      const modelExists = models.some(
        (m) => String(m.model_name || m.text || '').trim().toLowerCase() === modelName
      );
      if (modelExists) {
        showBackendTextToast({
          toast,
          fallbackText: 'A model with this name already exists for the selected brand',
          type: 'error',
        });
        return false;
      }
    }

    if (!form.part_number.trim()) {
      showBackendTextToast({ toast, fallbackText: 'Part number is required', type: 'error' });
      return false;
    }
    if (!selectedProperties.length) {
      showBackendTextToast({
        toast,
        fallbackText: 'Select at least one property',
        type: 'error',
      });
      return false;
    }

    for (const propId of selectedProperties) {
      const values = propertyValues[propId] || [];
      const selected = Array.isArray(selectedListValues[propId])
        ? selectedListValues[propId]
        : [];
      if (values.length && selected.length === 0) {
        const prop = properties.find((p) => p.id === propId);
        showBackendTextToast({
          toast,
          fallbackText: `Select at least one list value for ${prop?.text || 'property'}`,
          type: 'error',
        });
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitAttempted(true);
    if (!validate()) return;

    try {
      setIsSubmitting(true);
      const payload = {
        spc_id: form.spc_id,
        brand_id: isTempId(form.brand_id) ? null : form.brand_id,
        brand_name: isTempId(form.brand_id) ? form.brand_name.trim() : null,
        model_id:
          isTempId(form.brand_id) || isTempId(form.model_id) ? null : form.model_id,
        model_name:
          isTempId(form.brand_id) || isTempId(form.model_id)
            ? form.model_name.trim()
            : null,
        part_number: form.part_number.trim(),
        properties: selectedProperties.map((propId) => ({
          prop_id: propId,
          aplv_ids: Array.isArray(selectedListValues[propId])
            ? selectedListValues[propId]
            : [],
        })),
      };

      await API.post('/spare-parts/master', payload);
      invalidateCache('spare-parts:');
      showBackendTextToast({
        toast,
        fallbackText: 'Spare part saved successfully',
        type: 'success',
      });
      navigate(listPath);
    } catch (error) {
      console.error('Error saving spare part:', error);
      showBackendTextToast({
        toast,
        fallbackText:
          error.response?.data?.error ||
          error.response?.data?.message ||
          'Failed to save spare part',
        type: 'error',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClear = () => {
    navigate(listPath);
  };

  const brandOptions = [
    ...brands.map((brand) => ({
      value: brand.brand_id,
      label: brand.brand_name,
    })),
    ...(form.spc_id
      ? [
          {
            value: CREATE_NEW,
            label: '+ Create New',
            description: 'Create a new brand',
            isCreateNew: true,
          },
        ]
      : []),
  ];

  const modelOptions = [
    ...models.map((model) => ({
      value: model.model_id,
      label: model.model_name,
    })),
    ...(form.brand_id
      ? [
          {
            value: CREATE_NEW,
            label: '+ Create New',
            description: 'Create a new model',
            isCreateNew: true,
          },
        ]
      : []),
  ];

  return (
    <div className="max-w-6xl mx-auto bg-white rounded-xl shadow overflow-hidden flex flex-col max-h-[calc(100vh-140px)] min-h-[560px]">
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
        />
      )}
      <div className="bg-[#0E2F4B] text-white py-4 px-6 rounded-t-xl border-b-4 border-[#FFC107] text-center shrink-0">
        <h1 className="text-xl font-semibold">Spare Part</h1>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
        <div className="flex-1 overflow-y-auto overscroll-contain p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Category <span className="text-red-500">*</span>
              </label>
              <select
                name="spc_id"
                value={form.spc_id}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded text-sm bg-white ${
                  isFieldInvalid(form.spc_id) ? 'border-red-500' : 'border-gray-300'
                }`}
                disabled={loadingCategories}
              >
                <option value="">
                  {loadingCategories ? 'Loading categories...' : 'Select category'}
                </option>
                {categories.map((cat) => (
                  <option key={cat.spc_id} value={cat.spc_id}>
                    {cat.text}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Brand <span className="text-red-500">*</span>
              </label>
              <div className={submitAttempted && !isBrandValid ? 'ring-1 ring-red-500' : ''}>
                <EnhancedDropdown
                  options={brandOptions}
                  value={form.brand_id}
                  onChange={handleBrandChange}
                  placeholder={
                    !form.spc_id
                      ? 'Select category first'
                      : loadingBrands
                        ? 'Loading brands...'
                        : 'Select brand'
                  }
                  disabled={loadingBrands || !form.spc_id}
                  required
                  compact
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Model <span className="text-red-500">*</span>
              </label>
              <div className={submitAttempted && !isModelValid ? 'ring-1 ring-red-500' : ''}>
                <EnhancedDropdown
                  options={modelOptions}
                  value={form.model_id}
                  onChange={handleModelChange}
                  placeholder={
                    !form.spc_id
                      ? 'Select category first'
                      : !form.brand_id
                        ? 'Select brand first'
                        : loadingModels
                          ? 'Loading models...'
                          : 'Select model'
                  }
                  disabled={loadingModels || !form.spc_id || !form.brand_id}
                  required
                  compact
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Part Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="part_number"
                value={form.part_number}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded text-sm bg-white ${
                  isFieldInvalid(form.part_number) ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter part number"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-3">
              {t('assetTypes.properties', { defaultValue: 'Properties' })}
            </label>
            {loadingProperties ? (
              <div className="text-sm text-gray-500">
                {t('assetTypes.loadingProperties', { defaultValue: 'Loading properties...' })}
              </div>
            ) : properties.length === 0 ? (
              <div className="text-sm text-gray-500">
                No properties configured yet. Add them under Settings, then refresh.
              </div>
            ) : (
              <div className="space-y-4">
                {selectedProperties.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-gray-700">
                      {t('assetTypes.selectedProperties', { defaultValue: 'Selected Properties' })}{' '}
                      ({selectedProperties.length})
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {selectedProperties.map((propId) => {
                        const prop = properties.find((p) => p.id === propId);
                        return (
                          <div
                            key={propId}
                            className="flex items-center gap-2 px-3 py-2 bg-blue-100 text-blue-800 rounded-lg border border-blue-200 cursor-pointer hover:bg-blue-200 transition-colors"
                            onClick={() => {
                              setSelectedProperties((prev) =>
                                prev.filter((id) => id !== propId)
                              );
                              setSelectedListValues((prev) => {
                                const next = { ...prev };
                                delete next[propId];
                                return next;
                              });
                            }}
                          >
                            <span className="text-sm font-medium">{prop?.text}</span>
                            <button
                              type="button"
                              className="text-blue-600 hover:text-blue-800 ml-1"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedProperties((prev) =>
                                  prev.filter((id) => id !== propId)
                                );
                                setSelectedListValues((prev) => {
                                  const next = { ...prev };
                                  delete next[propId];
                                  return next;
                                });
                              }}
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <div className="text-sm font-medium text-gray-700">
                    {t('assetTypes.availableProperties', { defaultValue: 'Available Properties' })}{' '}
                    ({properties.filter((prop) => !selectedProperties.includes(prop.id)).length})
                  </div>
                  <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-3 bg-gray-50">
                    {properties
                      .filter((prop) => !selectedProperties.includes(prop.id))
                      .map((prop) => (
                        <div
                          key={prop.id}
                          className="flex items-center justify-between p-2 bg-white border border-gray-200 rounded-md cursor-pointer hover:bg-blue-50 hover:border-blue-300 transition-colors"
                          onClick={() => {
                            setSelectedProperties((prev) => [...prev, prop.id]);
                          }}
                        >
                          <span className="text-sm text-gray-700">{prop.text}</span>
                          <div className="w-5 h-5 border border-gray-300 rounded flex items-center justify-center">
                            <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {selectedProperties.length > 0 && (
            <div className="space-y-3">
              <div className="text-sm font-medium text-gray-700">
                Property List Values
              </div>
              {loadingValues ? (
                <div className="text-sm text-gray-500">Loading list values...</div>
              ) : (
                <div className="border border-gray-200 rounded-lg">
                  <table className="min-w-full text-sm">
                    <thead className="bg-[#0E2F4B] text-white">
                      <tr>
                        <th className="px-4 py-2 text-left font-medium rounded-tl-lg">Property</th>
                        <th className="px-4 py-2 text-left font-medium rounded-tr-lg">List Value</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {selectedProperties.map((propId, index) => {
                        const prop = properties.find((p) => p.id === propId);
                        const values = (propertyValues[propId] || []).filter(
                          (val) => val?.aplv_id
                        );
                        return (
                          <tr key={propId}>
                            <td className="px-4 py-3 align-middle font-medium text-gray-800 w-1/3">
                              {prop?.text}
                            </td>
                            <td className="px-4 py-2 overflow-visible">
                              {values.length > 0 ? (
                                <MultiSelectDropdown
                                  options={values}
                                  selectedIds={
                                    Array.isArray(selectedListValues[propId])
                                      ? selectedListValues[propId]
                                      : []
                                  }
                                  onChange={(ids) =>
                                    setSelectedListValues((prev) => ({
                                      ...prev,
                                      [propId]: ids,
                                    }))
                                  }
                                  placeholder="Select list values"
                                  dropUp={index >= selectedProperties.length - 2}
                                  invalid={
                                    submitAttempted &&
                                    !(
                                      Array.isArray(selectedListValues[propId]) &&
                                      selectedListValues[propId].length
                                    )
                                  }
                                />
                              ) : (
                                <span className="text-sm text-gray-500">
                                  No predefined list values for this property
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="shrink-0 border-t border-gray-200 bg-white">
          <div className="px-4 py-3 flex justify-end gap-3">
            <button
              type="button"
              onClick={handleClear}
              className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50"
              disabled={isSubmitting}
            >
              {t('common.cancel', { defaultValue: 'Cancel' })}
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-[#0E2F4B] text-white rounded-md hover:bg-blue-700"
              disabled={isSubmitting}
            >
              {isSubmitting
                ? t('assetTypes.saving', { defaultValue: 'Saving...' })
                : t('common.save', { defaultValue: 'Save' })}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default SparePartMaster;
