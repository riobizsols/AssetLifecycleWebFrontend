import { showBackendTextToast } from '../../utils/errorTranslation';
import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import ContentBox from '../ContentBox';
import CustomTable from '../CustomTable';
import API from '../../lib/axios';
import { exportToExcel } from '../../utils/exportToExcel';
import { filterData } from '../../utils/filterData';
import { applyListFilterChange } from '../../utils/listFilterState';
import { useNavigation } from '../../hooks/useNavigation';
import { invalidateCache } from '../../utils/apiCache';

const emptyForm = {
  spc_id: '',
  asset_type_id: '',
  brand: '',
  model: '',
};

const SparePartAssetTypeMappingTab = () => {
  const { hasEditAccess } = useNavigation();
  const canEdit = hasEditAccess('SPAREPARTSCONFIG');

  const [form, setForm] = useState(emptyForm);
  const [categories, setCategories] = useState([]);
  const [assetTypes, setAssetTypes] = useState([]);
  const [data, setData] = useState([]);
  const [selectedRows, setSelectedRows] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [filterValues, setFilterValues] = useState({
    columnFilters: [],
    fromDate: '',
    toDate: '',
  });
  const [sortConfig, setSortConfig] = useState({ sorts: [] });

  const columns = [
    { label: 'Category', name: 'category_name', visible: true },
    { label: 'Asset Type', name: 'asset_type_name', visible: true },
    { label: 'Brand', name: 'brand', visible: true },
    { label: 'Model', name: 'model', visible: true },
    {
      label: 'Status',
      name: 'int_status',
      visible: true,
    },
  ];

  const fetchMappings = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await API.get('/spare-parts/category-mappings');
      const rows = Array.isArray(res.data?.data) ? res.data.data : [];
      setData(
        rows.map((row) => ({
          ...row,
          int_status:
            row.int_status === 1 || row.int_status === '1' ? 'Active' : 'Inactive',
        }))
      );
    } catch (error) {
      console.error('Error fetching mappings:', error);
      showBackendTextToast({
        toast,
        tmdId: 'TMD_SP_MAPPINGS_FETCH_FAILED',
        fallbackText: 'Failed to fetch asset type mappings',
        type: 'error',
      });
      setData([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchCategories = useCallback(async () => {
    try {
      const res = await API.get('/spare-parts/categories');
      setCategories(Array.isArray(res.data?.data) ? res.data.data : []);
    } catch (error) {
      console.error('Error fetching categories:', error);
      setCategories([]);
    }
  }, []);

  const fetchAssetTypes = useCallback(async () => {
    try {
      const res = await API.get('/asset-types');
      let types = [];
      if (res.data?.success && Array.isArray(res.data.data)) {
        types = res.data.data;
      } else if (Array.isArray(res.data)) {
        types = res.data;
      }
      setAssetTypes(
        types.filter((at) => at.int_status === 1 || at.int_status === '1')
      );
    } catch (error) {
      console.error('Error fetching asset types:', error);
      setAssetTypes([]);
    }
  }, []);

  useEffect(() => {
    fetchMappings();
    fetchCategories();
    fetchAssetTypes();
  }, [fetchMappings, fetchCategories, fetchAssetTypes]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const isInvalid = (val) => submitAttempted && (!val || !String(val).trim());

  const handleSave = async (e) => {
    e.preventDefault();
    setSubmitAttempted(true);

    if (!form.spc_id) {
      showBackendTextToast({
        toast,
        tmdId: 'TMD_SP_MAP_CATEGORY_REQUIRED',
        fallbackText: 'Category is required',
        type: 'error',
      });
      return;
    }
    if (!form.asset_type_id) {
      showBackendTextToast({
        toast,
        tmdId: 'TMD_SP_MAP_ASSET_TYPE_REQUIRED',
        fallbackText: 'Asset type is required',
        type: 'error',
      });
      return;
    }

    try {
      setSaving(true);
      await API.post('/spare-parts/category-mappings', {
        spc_id: form.spc_id,
        asset_type_id: form.asset_type_id,
        brand: form.brand || null,
        model: form.model || null,
      });
      invalidateCache('spare-parts:');
      showBackendTextToast({
        toast,
        tmdId: 'TMD_SP_MAP_SAVED',
        fallbackText: 'Asset type mapping saved successfully',
        type: 'success',
      });
      setForm(emptyForm);
      setSubmitAttempted(false);
      await fetchMappings();
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

  const handleFilterChange = (name, value) => {
    setFilterValues((prev) => applyListFilterChange(prev, name, value));
  };

  const handleSort = (column) => {
    setSortConfig((prevConfig) => {
      const { sorts } = prevConfig;
      const existingSort = sorts.find((s) => s.column === column);
      if (!existingSort) {
        return {
          sorts: [...sorts, { column, direction: 'asc', order: sorts.length + 1 }],
        };
      }
      if (existingSort.direction === 'asc') {
        return {
          sorts: sorts.map((s) =>
            s.column === column ? { ...s, direction: 'desc' } : s
          ),
        };
      }
      return {
        sorts: sorts
          .filter((s) => s.column !== column)
          .map((s, idx) => ({ ...s, order: idx + 1 })),
      };
    });
  };

  const sortData = (rows) => {
    const { sorts } = sortConfig;
    if (!sorts.length) return rows;
    return [...rows].sort((a, b) => {
      for (const sort of [...sorts].sort((x, y) => x.order - y.order)) {
        const aVal = a[sort.column] ?? '';
        const bVal = b[sort.column] ?? '';
        if (aVal < bVal) return sort.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sort.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  };

  const handleDownload = () => {
    if (!selectedRows.length) {
      showBackendTextToast({
        toast,
        tmdId: 'TMD_PLEASE_SELECT_ROWS_TO_DOWNLOAD',
        fallbackText: 'Please select rows to download',
        type: 'error',
      });
      return;
    }
    const selectedSet = new Set(selectedRows);
    const selectedData = data.filter((row) => selectedSet.has(row.spcatm_id));
    const success = exportToExcel(selectedData, columns, 'SparePartAssetTypeMappings');
    if (success) {
      showBackendTextToast({
        toast,
        tmdId: 'TMD_EXPORT_SUCCESS',
        fallbackText: 'Download completed',
        type: 'success',
      });
    }
  };

  const filters = columns.map((col) => ({
    ...col,
    value:
      filterValues.columnFilters?.find((f) => f.name === col.name)?.value || '',
    options:
      col.name === 'int_status'
        ? [
            { label: 'Active', value: 'Active' },
            { label: 'Inactive', value: 'Inactive' },
          ]
        : [],
    onChange: (value) => handleFilterChange(col.name, value),
  }));

  return (
    <div className="p-4 space-y-6">
      {canEdit && (
        <div className="max-w-[1000px] mx-auto bg-white shadow rounded">
          <div className="text-center text-lg font-semibold bg-[#0E2F4B] text-white py-3 border-b-4 border-[#FFC107] rounded-t">
            Asset Type Mapping
          </div>
          <form onSubmit={handleSave} className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm mb-1 font-medium">
                  Category <span className="text-red-500">*</span>
                </label>
                <select
                  name="spc_id"
                  value={form.spc_id}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border text-sm bg-white ${
                    isInvalid(form.spc_id) ? 'border-red-500' : 'border-gray-300'
                  }`}
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
                  Asset Type <span className="text-red-500">*</span>
                </label>
                <select
                  name="asset_type_id"
                  value={form.asset_type_id}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border text-sm bg-white ${
                    isInvalid(form.asset_type_id) ? 'border-red-500' : 'border-gray-300'
                  }`}
                >
                  <option value="">Select asset type</option>
                  {assetTypes.map((at) => (
                    <option key={at.asset_type_id} value={at.asset_type_id}>
                      {at.text}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm mb-1 font-medium">Brand</label>
                <input
                  type="text"
                  name="brand"
                  value={form.brand}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border text-sm bg-white border-gray-300"
                  placeholder="Enter brand"
                />
              </div>

              <div>
                <label className="block text-sm mb-1 font-medium">Model</label>
                <input
                  type="text"
                  name="model"
                  value={form.model}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border text-sm bg-white border-gray-300"
                  placeholder="Enter model"
                />
              </div>
            </div>

            <div className="flex justify-end">
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
      )}

      <ContentBox
        filters={filters}
        onFilterChange={handleFilterChange}
        onSort={handleSort}
        sortConfig={sortConfig}
        rowKey="spcatm_id"
        onDownload={handleDownload}
        data={data}
        selectedRows={selectedRows}
        setSelectedRows={setSelectedRows}
        showAddButton={false}
        showDeleteButton={false}
        showActions={false}
        showFilterButton={false}
      >
        {({ visibleColumns }) => {
          const filtered = filterData(data, filterValues, visibleColumns);
          const sorted = sortData(filtered);
          const visibleCols = visibleColumns.filter((col) => col.visible);
          const colSpan = visibleCols.length;

          if (isLoading) {
            return (
              <tr>
                <td colSpan={colSpan} className="text-center py-16">
                  <div className="flex flex-col items-center justify-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
                    <p className="text-gray-600">Loading...</p>
                  </div>
                </td>
              </tr>
            );
          }

          if (!sorted.length) {
            return (
              <tr>
                <td colSpan={colSpan} className="text-center py-16 text-gray-500">
                  No asset type mappings found.
                </td>
              </tr>
            );
          }

          return (
            <CustomTable
              columns={visibleColumns}
              visibleColumns={visibleColumns}
              data={sorted}
              rowKey="spcatm_id"
              selectedRows={selectedRows}
              setSelectedRows={setSelectedRows}
              showActions={false}
            />
          );
        }}
      </ContentBox>
    </div>
  );
};

export default SparePartAssetTypeMappingTab;
