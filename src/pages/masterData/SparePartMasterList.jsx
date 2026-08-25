import { showBackendTextToast } from '../../utils/errorTranslation';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import ContentBox from '../../components/ContentBox';
import CustomTable from '../../components/CustomTable';
import API from '../../lib/axios';
import { exportToExcel } from '../../utils/exportToExcel';
import { filterData } from '../../utils/filterData';
import { applyListFilterChange } from '../../utils/listFilterState';
import { useNavigation } from '../../hooks/useNavigation';

const formatDate = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString();
};

const SparePartMasterList = () => {
  const navigate = useNavigate();
  const { hasEditAccess } = useNavigation();
  const canEdit = hasEditAccess('SPAREPARTMASTER');

  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRows, setSelectedRows] = useState([]);
  const [filterValues, setFilterValues] = useState({
    columnFilters: [],
    fromDate: '',
    toDate: '',
  });
  const [sortConfig, setSortConfig] = useState({ sorts: [] });

  const columns = [
    { label: 'Part Number', name: 'part_number', visible: true },
    { label: 'Category', name: 'category_name', visible: true },
    { label: 'Brand', name: 'brand_name', visible: true },
    { label: 'Model', name: 'model_name', visible: true },
    { label: 'Status', name: 'int_status', visible: true },
    { label: 'Created On', name: 'created_on', visible: true },
  ];

  const fetchMasters = async () => {
    setIsLoading(true);
    try {
      const res = await API.get('/spare-parts/master');
      const rows = Array.isArray(res.data?.data) ? res.data.data : [];
      setData(
        rows.map((row) => ({
          ...row,
          int_status:
            row.int_status === 1 || row.int_status === '1' ? 'Active' : 'Inactive',
          created_on: formatDate(row.created_on),
        }))
      );
    } catch (error) {
      console.error('Error fetching spare parts:', error);
      showBackendTextToast({
        toast,
        fallbackText:
          error.response?.data?.error || 'Failed to fetch spare parts',
        type: 'error',
      });
      setData([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMasters();
  }, []);

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
    const selectedData = data.filter(
      (row) => selectedSet.has(row.sppns_id) || selectedSet.has(row.part_number)
    );
    const success = exportToExcel(selectedData, columns, 'SpareParts');
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
    <div className="p-4">
      <ContentBox
        filters={filters}
        onFilterChange={handleFilterChange}
        onSort={handleSort}
        sortConfig={sortConfig}
        rowKey="sppns_id"
        onAdd={
          canEdit ? () => navigate('/master-data/spare-part/add') : undefined
        }
        onDownload={handleDownload}
        data={data}
        selectedRows={selectedRows}
        setSelectedRows={setSelectedRows}
        showAddButton={canEdit}
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
                  No spare parts found. Click + to create one.
                </td>
              </tr>
            );
          }

          return (
            <CustomTable
              columns={visibleColumns}
              visibleColumns={visibleColumns}
              data={sorted}
              rowKey="sppns_id"
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

export default SparePartMasterList;
