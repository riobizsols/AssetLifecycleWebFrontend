import { showBackendTextToast } from '../../utils/errorTranslation';
import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import API from '../../lib/axios';
import { invalidateCache } from '../../utils/apiCache';

const emptyForm = {
  spc_id: '',
  quantity: '',
  unit_price: '',
  invoice_no: '',
  lot_purchase_date: '',
  invoice_item_no: '',
  has_serial_number: false,
};

const SpareParts = () => {
  const [form, setForm] = useState(emptyForm);
  const [categories, setCategories] = useState([]);
  const [serialNumbers, setSerialNumbers] = useState([]);
  const [autoIndividuals, setAutoIndividuals] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);

  const quantityInt = useMemo(() => {
    const n = Number(form.quantity);
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
  }, [form.quantity]);

  useEffect(() => {
    const fetchCategories = async () => {
      setLoadingCategories(true);
      try {
        const res = await API.get('/spare-parts/categories');
        const rows = Array.isArray(res.data?.data)
          ? res.data.data
          : Array.isArray(res.data)
            ? res.data
            : [];
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
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
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

  const validate = () => {
    if (!form.spc_id) {
      showBackendTextToast({
        toast,
        tmdId: 'TMD_SPARE_PART_CATEGORY_REQUIRED',
        fallbackText: 'Category is required',
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
        spc_id: form.spc_id,
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

  return (
    <div className="max-w-[1000px] mx-auto mt-8 bg-white shadow rounded">
      <div className="text-center text-lg font-semibold bg-[#0E2F4B] text-white py-3 border-b-4 border-[#FFC107] rounded-t">
        Spare Parts
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm mb-1 font-medium">
              Category <span className="text-red-500">*</span>
            </label>
            <select
              name="spc_id"
              value={form.spc_id}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border text-sm bg-white ${
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
              className={`w-full px-3 py-2 border text-sm bg-white ${
                isFieldInvalid(form.quantity) ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Enter quantity"
            />
          </div>

          <div>
            <label className="block text-sm mb-1 font-medium">
              Unit Price <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              name="unit_price"
              min="0"
              step="0.01"
              value={form.unit_price}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border text-sm bg-white ${
                isFieldInvalid(form.unit_price)
                  ? 'border-red-500'
                  : 'border-gray-300'
              }`}
              placeholder="Enter unit price"
            />
          </div>

          <div>
            <label className="block text-sm mb-1 font-medium">
              Invoice Number <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="invoice_no"
              value={form.invoice_no}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border text-sm bg-white ${
                isFieldInvalid(form.invoice_no)
                  ? 'border-red-500'
                  : 'border-gray-300'
              }`}
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
              className={`w-full px-3 py-2 border text-sm bg-white ${
                isFieldInvalid(form.lot_purchase_date)
                  ? 'border-red-500'
                  : 'border-gray-300'
              }`}
            />
          </div>

          <div>
            <label className="block text-sm mb-1 font-medium">
              Invoice Item Number <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="invoice_item_no"
              value={form.invoice_item_no}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border text-sm bg-white ${
                isFieldInvalid(form.invoice_item_no)
                  ? 'border-red-500'
                  : 'border-gray-300'
              }`}
              placeholder="Enter invoice item number"
            />
          </div>
        </div>

        <div className="pt-2 space-y-2">
          <div className="flex items-center gap-2">
            <input
              id="has_serial_number"
              type="checkbox"
              name="has_serial_number"
              checked={form.has_serial_number}
              onChange={handleInputChange}
              className="h-4 w-4"
            />
            <label htmlFor="has_serial_number" className="text-sm font-medium">
              Has Serial Number
            </label>
          </div>
          {!form.has_serial_number && (
            <p className="text-xs text-gray-500">
              Leave unchecked to auto-generate unique sequential serial numbers
              for each quantity unit.
            </p>
          )}
        </div>

        {form.has_serial_number && (
          <div className="border border-gray-200 rounded p-4 space-y-3">
            <div className="text-sm font-semibold text-[#0E2F4B]">
              Serial Numbers ({quantityInt || 0})
            </div>
            {quantityInt <= 0 ? (
              <p className="text-sm text-gray-500">
                Enter a quantity to generate serial number fields.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
                      className={`w-full px-3 py-2 border text-sm bg-white ${
                        submitAttempted && !String(value || '').trim()
                          ? 'border-red-500'
                          : 'border-gray-300'
                      }`}
                      placeholder={`Enter serial number ${index + 1}`}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {autoIndividuals.length > 0 && (
          <div className="border border-gray-200 rounded p-4 space-y-2">
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

        <div className="flex justify-end mt-6 gap-2">
          <button
            type="button"
            onClick={() => {
              setForm(emptyForm);
              setSerialNumbers([]);
              setAutoIndividuals([]);
              setSubmitAttempted(false);
            }}
            className="bg-gray-300 px-4 py-2 rounded text-sm"
            disabled={loading}
          >
            Clear
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

export default SpareParts;
