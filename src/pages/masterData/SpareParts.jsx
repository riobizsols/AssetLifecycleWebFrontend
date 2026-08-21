import { showBackendTextToast } from '../../utils/errorTranslation';
import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import API from '../../lib/axios';
import { invalidateCache } from '../../utils/apiCache';

const emptyForm = {
  vendor_id: '',
  spc_id: '',
  brand_id: '',
  model_id: '',
  part_number: '',
  quantity: '',
  unit_price: '',
  invoice_no: '',
  lot_purchase_date: '',
  invoice_item_no: '',
  has_serial_number: false,
};

const SpareParts = () => {
  const [form, setForm] = useState(emptyForm);
  const [vendors, setVendors] = useState([]);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [models, setModels] = useState([]);
  const [serialNumbers, setSerialNumbers] = useState([]);
  const [autoIndividuals, setAutoIndividuals] = useState([]);
  const [loadingVendors, setLoadingVendors] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [loadingBrands, setLoadingBrands] = useState(false);
  const [loadingModels, setLoadingModels] = useState(false);
  const [loadingPartNumber, setLoadingPartNumber] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);

  const quantityInt = useMemo(() => {
    const n = Number(form.quantity);
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
  }, [form.quantity]);

  const selectionComplete =
    form.vendor_id && form.spc_id && form.brand_id && form.model_id;

  useEffect(() => {
    const fetchVendors = async () => {
      setLoadingVendors(true);
      try {
        const res = await API.get('/get-vendors');
        const rows = Array.isArray(res.data?.data)
          ? res.data.data
          : Array.isArray(res.data)
            ? res.data
            : [];
        setVendors(rows.filter((v) => v.int_status === 1 || v.int_status === 'Active'));
      } catch (error) {
        console.error('Error fetching vendors:', error);
        showBackendTextToast({
          toast,
          tmdId: 'TMD_FAILED_TO_FETCH_VENDORS',
          fallbackText: 'Failed to fetch vendors',
          type: 'error',
        });
        setVendors([]);
      } finally {
        setLoadingVendors(false);
      }
    };

    fetchVendors();
  }, []);

  useEffect(() => {
    const fetchCategories = async () => {
      setLoadingCategories(true);
      try {
        const res = await API.get('/spare-parts/categories', {
          params: { orgWide: true },
        });
        const rows = Array.isArray(res.data?.data) ? res.data.data : [];
        setCategories(rows);
      } catch (error) {
        console.error('Error fetching spare part categories:', error);
        showBackendTextToast({
          toast,
          tmdId: 'TMD_FAILED_TO_FETCH_SPARE_PART_CATEGORIES',
          fallbackText: 'Failed to fetch spare part categories',
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
    const fetchBrands = async () => {
      setLoadingBrands(true);
      try {
        const params = form.spc_id ? { spc_id: form.spc_id } : {};
        const res = await API.get('/spare-parts/lot-options/brands', { params });
        const rows = Array.isArray(res.data?.data)
          ? res.data.data
          : Array.isArray(res.data)
            ? res.data
            : [];
        setBrands(
          rows
            .map((row) => ({
              brand_id: row.brand_id || row.spbId || row.spbid,
              brand_name: row.brand_name || row.brandName || row.brandname,
            }))
            .filter((row) => row.brand_id)
        );
      } catch (error) {
        console.error('Error fetching spare part brands:', error);
        showBackendTextToast({
          toast,
          tmdId: 'TMD_FAILED_TO_FETCH_SPARE_PART_BRANDS',
          fallbackText: 'Failed to fetch spare part brands',
          type: 'error',
        });
        setBrands([]);
      } finally {
        setLoadingBrands(false);
      }
    };

    fetchBrands();
  }, [form.spc_id]);

  useEffect(() => {
    if (!form.brand_id) {
      setModels([]);
      return;
    }

    const fetchModels = async () => {
      setLoadingModels(true);
      try {
        const params = { brand_id: form.brand_id };
        if (form.spc_id) params.spc_id = form.spc_id;
        const res = await API.get('/spare-parts/lot-options/models', { params });
        const rows = Array.isArray(res.data?.data)
          ? res.data.data
          : Array.isArray(res.data)
            ? res.data
            : [];
        setModels(
          rows
            .map((row) => ({
              model_id: row.model_id || row.spbmId || row.spbmid,
              model_name: row.model_name || row.modelName || row.modelname,
            }))
            .filter((row) => row.model_id)
        );
      } catch (error) {
        console.error('Error fetching spare part models:', error);
        showBackendTextToast({
          toast,
          tmdId: 'TMD_FAILED_TO_FETCH_SPARE_PART_MODELS',
          fallbackText: 'Failed to fetch spare part models',
          type: 'error',
        });
        setModels([]);
      } finally {
        setLoadingModels(false);
      }
    };

    fetchModels();
  }, [form.spc_id, form.brand_id]);

  useEffect(() => {
    if (!selectionComplete) {
      setForm((prev) => (prev.part_number ? { ...prev, part_number: '' } : prev));
      return;
    }

    const fetchPartNumber = async () => {
      setLoadingPartNumber(true);
      try {
        const res = await API.get('/spare-parts/lot-options/part-number', {
          params: {
            vendor_id: form.vendor_id,
            spc_id: form.spc_id,
            brand_id: form.brand_id,
            model_id: form.model_id,
          },
        });
        const partNumber = res.data?.data?.part_number || '';
        setForm((prev) => ({ ...prev, part_number: partNumber }));
      } catch (error) {
        console.error('Error fetching part number:', error);
        setForm((prev) => ({ ...prev, part_number: '' }));
        if (error.response?.status === 404) {
          showBackendTextToast({
            toast,
            tmdId: 'TMD_SPARE_PART_NUMBER_NOT_FOUND',
            fallbackText:
              error.response?.data?.error ||
              'No part number found for the selected vendor, category, brand, and model',
            type: 'error',
          });
        } else if (error.response?.status === 409) {
          showBackendTextToast({
            toast,
            tmdId: 'TMD_SPARE_PART_NUMBER_AMBIGUOUS',
            fallbackText:
              error.response?.data?.error ||
              'Multiple part numbers match this selection',
            type: 'error',
          });
        } else {
          showBackendTextToast({
            toast,
            tmdId: 'TMD_FAILED_TO_FETCH_SPARE_PART_NUMBER',
            fallbackText: 'Failed to fetch part number',
            type: 'error',
          });
        }
      } finally {
        setLoadingPartNumber(false);
      }
    };

    fetchPartNumber();
  }, [
    form.vendor_id,
    form.spc_id,
    form.brand_id,
    form.model_id,
    selectionComplete,
  ]);

  useEffect(() => {
    if (!form.has_serial_number) {
      setSerialNumbers([]);
      return;
    }

    setSerialNumbers((prev) =>
      Array.from({ length: quantityInt }, (_, i) => prev[i] || '')
    );
  }, [form.has_serial_number, quantityInt]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => {
      const next = {
        ...prev,
        [name]: type === 'checkbox' ? checked : value,
      };

      if (name === 'vendor_id') {
        next.spc_id = '';
        next.brand_id = '';
        next.model_id = '';
        next.part_number = '';
      } else if (name === 'spc_id') {
        next.brand_id = '';
        next.model_id = '';
        next.part_number = '';
      } else if (name === 'brand_id') {
        next.model_id = '';
        next.part_number = '';
      } else if (name === 'model_id') {
        next.part_number = '';
      }

      return next;
    });

    if (name !== 'has_serial_number') {
      setAutoIndividuals([]);
    }
  };

  const handleSerialChange = (index, value) => {
    setSerialNumbers((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const isFieldInvalid = (val) =>
    submitAttempted && (!val || !String(val).trim());

  const getVendorLabel = (vendor) =>
    vendor.vendor_name || vendor.company_name || vendor.vendor_id;

  const validate = () => {
    if (!form.vendor_id) {
      showBackendTextToast({
        toast,
        tmdId: 'TMD_SPARE_PART_VENDOR_REQUIRED',
        fallbackText: 'Vendor is required',
        type: 'error',
      });
      return false;
    }
    if (!form.spc_id) {
      showBackendTextToast({
        toast,
        tmdId: 'TMD_SPARE_PART_CATEGORY_REQUIRED',
        fallbackText: 'Category is required',
        type: 'error',
      });
      return false;
    }
    if (!form.brand_id) {
      showBackendTextToast({
        toast,
        tmdId: 'TMD_SPARE_PART_BRAND_REQUIRED',
        fallbackText: 'Brand is required',
        type: 'error',
      });
      return false;
    }
    if (!form.model_id) {
      showBackendTextToast({
        toast,
        tmdId: 'TMD_SPARE_PART_MODEL_REQUIRED',
        fallbackText: 'Model is required',
        type: 'error',
      });
      return false;
    }
    if (!form.quantity || Number(form.quantity) <= 0) {
      showBackendTextToast({
        toast,
        tmdId: 'TMD_SPARE_PART_QUANTITY_REQUIRED',
        fallbackText: 'Enter a valid quantity',
        type: 'error',
      });
      return false;
    }
    if (Number(form.quantity) !== quantityInt) {
      showBackendTextToast({
        toast,
        tmdId: 'TMD_SPARE_PART_QTY_WHOLE_NUMBER',
        fallbackText:
          'Quantity must be a whole number so each unit can have a serial number',
        type: 'error',
      });
      return false;
    }
    if (
      form.unit_price === '' ||
      Number(form.unit_price) < 0 ||
      Number.isNaN(Number(form.unit_price))
    ) {
      showBackendTextToast({
        toast,
        tmdId: 'TMD_SPARE_PART_UNIT_PRICE_REQUIRED',
        fallbackText: 'Enter a valid unit price',
        type: 'error',
      });
      return false;
    }
    if (!form.invoice_no.trim()) {
      showBackendTextToast({
        toast,
        tmdId: 'TMD_SPARE_PART_INVOICE_REQUIRED',
        fallbackText: 'Invoice number is required',
        type: 'error',
      });
      return false;
    }
    if (!form.lot_purchase_date) {
      showBackendTextToast({
        toast,
        tmdId: 'TMD_SPARE_PART_PURCHASE_DATE_REQUIRED',
        fallbackText: 'Purchase date is required',
        type: 'error',
      });
      return false;
    }
    if (!form.invoice_item_no.trim()) {
      showBackendTextToast({
        toast,
        tmdId: 'TMD_SPARE_PART_INVOICE_ITEM_REQUIRED',
        fallbackText: 'Invoice item number is required',
        type: 'error',
      });
      return false;
    }

    if (form.has_serial_number) {
      if (
        serialNumbers.length !== quantityInt ||
        serialNumbers.some((s) => !String(s || '').trim())
      ) {
        showBackendTextToast({
          toast,
          tmdId: 'TMD_SPARE_PART_SERIALS_REQUIRED',
          fallbackText: 'Enter a serial number for each quantity unit',
          type: 'error',
        });
        return false;
      }
      const unique = new Set(
        serialNumbers.map((s) => String(s).trim().toLowerCase())
      );
      if (unique.size !== serialNumbers.length) {
        showBackendTextToast({
          toast,
          tmdId: 'TMD_SPARE_PART_SERIALS_UNIQUE',
          fallbackText: 'Serial numbers must be unique',
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
      setLoading(true);
      const payload = {
        vendor_id: form.vendor_id,
        spc_id: form.spc_id,
        brand_id: form.brand_id,
        model_id: form.model_id,
        part_number: form.part_number.trim() || null,
        quantity: Number(form.quantity),
        unit_price: Number(form.unit_price),
        invoice_no: form.invoice_no.trim(),
        lot_purchase_date: form.lot_purchase_date,
        invoice_item_no: form.invoice_item_no.trim(),
        has_serial_number: form.has_serial_number,
        serial_numbers: form.has_serial_number
          ? serialNumbers.map((s) => String(s).trim())
          : [],
      };

      const res = await API.post('/spare-parts/lots', payload);
      invalidateCache('spare-parts:');

      showBackendTextToast({
        toast,
        tmdId: 'TMD_SPARE_PART_SAVED',
        fallbackText: 'Spare part lot saved successfully',
        type: 'success',
      });

      const saved = res.data?.data;
      const wasManualSerials = form.has_serial_number;
      if (saved?.lot?.spld_id) {
        try {
          const indRes = await API.get(
            `/spare-parts/lots/${saved.lot.spld_id}/individuals`
          );
          setAutoIndividuals(
            Array.isArray(indRes.data?.data)
              ? indRes.data.data
              : saved.individuals || []
          );
        } catch {
          setAutoIndividuals(saved.individuals || []);
        }
      } else {
        setAutoIndividuals(saved?.individuals || []);
      }

      if (!wasManualSerials && (saved?.individuals?.length || 0) > 0) {
        showBackendTextToast({
          toast,
          tmdId: 'TMD_SPARE_PART_SERIALS_AUTO_GENERATED',
          fallbackText: `${saved.individuals.length} serial number(s) auto-generated and saved`,
          type: 'success',
        });
      }

      setForm(emptyForm);
      setSerialNumbers([]);
      setBrands([]);
      setModels([]);
      setSubmitAttempted(false);
    } catch (error) {
      console.error('Error saving spare part lot:', error);
      const errorMessage =
        error.response?.data?.error ||
        error.response?.data?.message ||
        'Failed to save spare part lot';
      showBackendTextToast({
        toast,
        tmdId: 'TMD_SPARE_PART_SAVE_FAILED',
        fallbackText: errorMessage,
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setForm(emptyForm);
    setSerialNumbers([]);
    setAutoIndividuals([]);
    setBrands([]);
    setModels([]);
    setSubmitAttempted(false);
  };

  const fieldClass = (invalid) =>
    `w-full px-3 py-2 border rounded text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${
      invalid ? 'border-red-500' : 'border-gray-300'
    }`;

  return (
    <div className="max-w-6xl mx-auto bg-white rounded-xl shadow overflow-hidden flex flex-col min-h-[calc(100vh-140px)]">
      <div className="bg-[#0E2F4B] text-white py-4 px-6 rounded-t-xl border-b-4 border-[#FFC107] text-center">
        <h1 className="text-xl font-semibold">Spare Part Lot</h1>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <section>
            <h2 className="text-sm font-semibold text-[#0E2F4B] mb-3">
              Part Selection
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm mb-1 font-medium">
                  Vendor <span className="text-red-500">*</span>
                </label>
                <select
                  name="vendor_id"
                  value={form.vendor_id}
                  onChange={handleInputChange}
                  className={fieldClass(isFieldInvalid(form.vendor_id))}
                  disabled={loadingVendors}
                >
                  <option value="">
                    {loadingVendors ? 'Loading vendors...' : 'Select vendor'}
                  </option>
                  {vendors.map((vendor) => (
                    <option key={vendor.vendor_id} value={vendor.vendor_id}>
                      {getVendorLabel(vendor)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm mb-1 font-medium">
                  Category <span className="text-red-500">*</span>
                </label>
                <select
                  name="spc_id"
                  value={form.spc_id}
                  onChange={handleInputChange}
                  className={fieldClass(isFieldInvalid(form.spc_id))}
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
                <label className="block text-sm mb-1 font-medium">
                  Brand <span className="text-red-500">*</span>
                </label>
                <select
                  name="brand_id"
                  value={form.brand_id}
                  onChange={handleInputChange}
                  className={fieldClass(isFieldInvalid(form.brand_id))}
                  disabled={loadingBrands}
                >
                  <option value="">
                    {loadingBrands ? 'Loading brands...' : 'Select brand'}
                  </option>
                  {brands.map((brand) => (
                    <option key={brand.brand_id} value={brand.brand_id}>
                      {brand.brand_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm mb-1 font-medium">
                  Model <span className="text-red-500">*</span>
                </label>
                <select
                  name="model_id"
                  value={form.model_id}
                  onChange={handleInputChange}
                  className={fieldClass(isFieldInvalid(form.model_id))}
                  disabled={loadingModels || !form.brand_id}
                >
                  <option value="">
                    {!form.brand_id
                      ? 'Select brand first'
                      : loadingModels
                        ? 'Loading models...'
                        : 'Select model'}
                  </option>
                  {models.map((model) => (
                    <option key={model.model_id} value={model.model_id}>
                      {model.model_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-sm font-semibold text-[#0E2F4B] mb-3">
              Lot Details
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="lg:col-span-2">
                <label className="block text-sm mb-1 font-medium">
                  Part Number
                </label>
                <input
                  type="text"
                  name="part_number"
                  value={
                    loadingPartNumber && selectionComplete
                      ? 'Loading...'
                      : form.part_number
                  }
                  readOnly
                  className="w-full px-3 py-2 border rounded text-sm bg-gray-50 border-gray-300"
                  placeholder={
                    selectionComplete
                      ? 'Part number will appear here'
                      : 'Auto-filled after vendor, category, brand, and model'
                  }
                />
              </div>

              <div>
                <label className="block text-sm mb-1 font-medium">
                  Quantity <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  name="quantity"
                  min="1"
                  step="1"
                  value={form.quantity}
                  onChange={handleInputChange}
                  className={fieldClass(isFieldInvalid(form.quantity))}
                  placeholder="Enter quantity"
                />
              </div>

              <div>
                <label className="block text-sm mb-1 font-medium">
                  Unit Price <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="unit_price"
                  inputMode="decimal"
                  value={form.unit_price}
                  onChange={handleInputChange}
                  className={fieldClass(isFieldInvalid(form.unit_price))}
                  placeholder="Enter unit price"
                />
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-sm font-semibold text-[#0E2F4B] mb-3">
              Invoice Details
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm mb-1 font-medium">
                  Invoice Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="invoice_no"
                  value={form.invoice_no}
                  onChange={handleInputChange}
                  className={fieldClass(isFieldInvalid(form.invoice_no))}
                  placeholder="Enter invoice number"
                />
              </div>

              <div>
                <label className="block text-sm mb-1 font-medium">
                  Purchase Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  name="lot_purchase_date"
                  value={form.lot_purchase_date}
                  onChange={handleInputChange}
                  className={fieldClass(isFieldInvalid(form.lot_purchase_date))}
                />
              </div>

              <div className="lg:col-span-2">
                <label className="block text-sm mb-1 font-medium">
                  Invoice Item Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="invoice_item_no"
                  value={form.invoice_item_no}
                  onChange={handleInputChange}
                  className={fieldClass(isFieldInvalid(form.invoice_item_no))}
                  placeholder="Enter invoice item number"
                />
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <div className="flex items-start gap-3">
              <input
                id="has_serial_number"
                type="checkbox"
                name="has_serial_number"
                checked={form.has_serial_number}
                onChange={handleInputChange}
                className="h-4 w-4 mt-0.5"
              />
              <div>
                <label htmlFor="has_serial_number" className="text-sm font-medium">
                  Has Serial Number
                </label>
                {!form.has_serial_number && (
                  <p className="text-xs text-gray-500 mt-1">
                    Leave unchecked to auto-generate unique sequential serial
                    numbers for each quantity unit.
                  </p>
                )}
              </div>
            </div>
          </section>

          {form.has_serial_number && (
            <div className="border border-gray-200 rounded-lg p-4 space-y-3">
              <div className="text-sm font-semibold text-[#0E2F4B]">
                Serial Numbers ({quantityInt || 0})
              </div>
              {quantityInt <= 0 ? (
                <p className="text-sm text-gray-500">
                  Enter a quantity to generate serial number fields.
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                  {serialNumbers.map((value, index) => (
                    <div key={`serial-${index}`}>
                      <label className="block text-sm mb-1 font-medium">
                        Serial Number {index + 1}{' '}
                        <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={value}
                        onChange={(e) => handleSerialChange(index, e.target.value)}
                        className={fieldClass(
                          submitAttempted && !String(value || '').trim()
                        )}
                        placeholder={`Enter serial ${index + 1}`}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {autoIndividuals.length > 0 && (
            <div className="border border-gray-200 rounded-lg p-4 space-y-2">
              <div className="text-sm font-semibold text-[#0E2F4B]">
                Saved Individual Units
              </div>
              <p className="text-xs text-gray-500">
                Each quantity unit was stored with a serial number in the database.
              </p>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm border">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left border">Unit ID</th>
                      <th className="px-3 py-2 text-left border">Lot ID</th>
                      <th className="px-3 py-2 text-left border">Serial Number</th>
                    </tr>
                  </thead>
                  <tbody>
                    {autoIndividuals.map((row) => (
                      <tr key={row.spid_id}>
                        <td className="px-3 py-2 border">{row.spid_id}</td>
                        <td className="px-3 py-2 border">{row.spld_id}</td>
                        <td className="px-3 py-2 border font-mono">
                          {row.serial_number || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <div className="shrink-0 border-t border-gray-200 bg-white">
          <div className="px-6 py-3 flex justify-end gap-3">
            <button
              type="button"
              onClick={handleClear}
              className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 text-sm"
              disabled={loading}
            >
              Clear
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-[#0E2F4B] text-white rounded-md hover:bg-blue-700 text-sm"
              disabled={loading}
            >
              {loading ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default SpareParts;
