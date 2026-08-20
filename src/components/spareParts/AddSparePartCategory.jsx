import { showBackendTextToast } from '../../utils/errorTranslation';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import API from '../../lib/axios';
import { invalidateCache } from '../../utils/apiCache';

const emptyForm = {
  text: '',
  uom: '',
  minimum_stock: '',
  re_order_level: '',
};

const AddSparePartCategory = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState(emptyForm);
  const [uomOptions, setUomOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [uomLoading, setUomLoading] = useState(true);

  React.useEffect(() => {
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
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
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

  return (
    <div className="max-w-[1000px] mx-auto mt-8 bg-white shadow rounded">
      <div className="text-center text-lg font-semibold bg-[#0E2F4B] text-white py-3 border-b-4 border-[#FFC107] rounded-t">
        Add Spare Part Category
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm mb-1 font-medium">
              Category <span className="text-red-500">*</span>
            </label>
            <input
              name="text"
              value={form.text}
              onChange={handleChange}
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
              Minimum Stock
            </label>
            <input
              type="text"
              name="minimum_stock"
              inputMode="numeric"
              value={form.minimum_stock}
              onChange={handleChange}
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
