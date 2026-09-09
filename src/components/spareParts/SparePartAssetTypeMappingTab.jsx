import { showBackendTextToast } from '../../utils/errorTranslation';
import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import ContentBox from '../ContentBox';
import CustomTable from '../CustomTable';
import API from '../../lib/axios';
import { exportToExcel } from '../../utils/exportToExcel';
import { filterData } from '../../utils/filterData';
import { applyListFilterChange } from '../../utils/listFilterState';
import { useNavigation } from '../../hooks/useNavigation';
import { sortTableRows, updateSortConfig } from '../../utils/tableSort';

const SparePartAssetTypeMappingTab = () => {
  const navigate = useNavigate();
  const { hasEditAccess } = useNavigation();
  const canEdit = hasEditAccess('SPAREPARTSCONFIG');

  const [data, setData] = useState([]);
  const [selectedRows, setSelectedRows] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterValues, setFilterValues] = useState({
    columnFilters: [],
    fromDate: '',
    toDate: '',
  });
  const [sortConfig, setSortConfig] = useState({ sorts: [] });

  const columns = [
    { label: 'Category', name: 'category_name', visible: true },
    { label: 'Asset Type', name: 'asset_type_name', visible: true },
    { label: 'Status', name: 'int_status', visible: true },
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

  useEffect(() => {
    fetchMappings();
  }, [fetchMappings]);

  const handleFilterChange = (name, value) => {
    setFilterValues((prev) => applyListFilterChange(prev, name, value));
  };

  const handleSort = (column, direction) => {
    setSortConfig((prevConfig) => updateSortConfig(prevConfig, column, direction));
  };

  const sortData = (rows) => sortTableRows(rows, sortConfig.sorts);

  const handleEdit = (row) => {
    if (!row?.asset_type_id) return;
    navigate(
      `/master-data/spare-parts-configuration/mappings/edit/${encodeURIComponent(row.asset_type_id)}`
    );
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
    <div className="p-4">
      <ContentBox
        filters={filters}
        onFilterChange={handleFilterChange}
        onSort={handleSort}
        sortConfig={sortConfig}
        rowKey="spcatm_id"
        onAdd={
          canEdit
            ? () =>
                navigate('/master-data/spare-parts-configuration/mappings/add')
            : undefined
        }
        onDownload={handleDownload}
        data={data}
        selectedRows={selectedRows}
        setSelectedRows={setSelectedRows}
        showAddButton={canEdit}
        showDeleteButton={false}
        showActions={canEdit}
        showFilterButton={false}
      >
        {({ visibleColumns, showActions }) => {
          const filtered = filterData(data, filterValues, visibleColumns);
          const sorted = sortData(filtered);
          const visibleCols = visibleColumns.filter((col) => col.visible);
          const colSpan = visibleCols.length + (showActions ? 1 : 0);

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
                  No asset type mappings found. Click + to create one.
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
              onEdit={canEdit ? handleEdit : undefined}
              showActions={Boolean(showActions)}
            />
          );
        }}
      </ContentBox>
    </div>
  );
};

export default SparePartAssetTypeMappingTab;
