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

const SparePartLotList = () => {
  const navigate = useNavigate();
  const { canCreate } = useNavigation();
  const hasCreateAccess = canCreate('SPAREPARTS');

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
    { label: 'Lot ID', name: 'spld_id', visible: true },
    { label: 'Category', name: 'category_name', visible: true },
    { label: 'Quantity', name: 'quantity', visible: true },
    { label: 'Unit Price', name: 'unit_price', visible: true },
    { label: 'Invoice Number', name: 'invoice_no', visible: true },
    { label: 'Purchase Date', name: 'lot_purchase_date', visible: true },
    { label: 'Invoice Item Number', name: 'invoice_item_no', visible: true },
    { label: 'Created On', name: 'created_on', visible: true },
  ];

  const fetchLots = async () => {
    setIsLoading(true);
    try {
      const res = await API.get('/spare-parts/lots');
      const rows = Array.isArray(res.data?.data) ? res.data.data : [];
      setData(
        rows.map((row) => ({
          ...row,
          quantity: row.quantity != null ? Number(row.quantity) : row.quantity,
          unit_price: row.unit_price != null ? Number(row.unit_price) : row.unit_price,
          lot_purchase_date: formatDate(row.lot_purchase_date),
          created_on: formatDate(row.created_on),
        }))
      );
    } catch (error) {
      console.error('Error fetching spare part lots:', error);
      showBackendTextToast({
        toast,
        fallbackText: error.response?.data?.error || 'Failed to fetch spare part lots',
        type: 'error',
      });
      setData([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLots();
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
    const visibleCols = columns.filter((c) => c.visible);
    const filtered = filterData(data, filterValues, visibleCols);
    exportToExcel(sortData(filtered), visibleCols, 'Spare_Part_Lots');
  };

  const filters = columns.map((col) => ({
    ...col,
    value:
      filterValues.columnFilters?.find((f) => f.name === col.name)?.value || '',
    options: [],
    onChange: (value) => handleFilterChange(col.name, value),
  }));

  return (
    <div className="p-4">
      <ContentBox
        filters={filters}
        onFilterChange={handleFilterChange}
        onSort={handleSort}
        sortConfig={sortConfig}
        rowKey="spld_id"
        onAdd={
          hasCreateAccess ? () => navigate('/master-data/spare-parts/add') : undefined
        }
        onDownload={handleDownload}
        data={data}
        selectedRows={selectedRows}
        setSelectedRows={setSelectedRows}
        showAddButton={hasCreateAccess}
        showDeleteButton={false}
        showActions={false}
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
                <td colSpan={colSpan} className="text-center py-16">
                  <p className="text-xl font-semibold text-gray-800">No data found</p>
                </td>
              </tr>
            );
          }

          return (
            <CustomTable
              columns={visibleColumns}
              visibleColumns={visibleColumns}
              data={sorted}
              rowKey="spld_id"
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

export default SparePartLotList;
