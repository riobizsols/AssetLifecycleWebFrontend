import { showBackendTextToast } from '../utils/errorTranslation';
import { useEffect, useMemo, useState } from 'react';
import ContentBox from '../components/ContentBox';
import CustomTable from '../components/CustomTable';
import { filterData } from '../utils/filterData';
import { exportToExcel } from '../utils/exportToExcel';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useLanguage } from '../contexts/LanguageContext';
import { useRevalidateOnFocus } from '../hooks/useRevalidateOnFocus';
import {
  formatSparePartApprovalRows,
  useSparePartApprovalStore,
} from '../store/useSparePartApprovalStore';
import { applyListFilterChange } from '../utils/listFilterState';

const SparePartApproval = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const approvals = useSparePartApprovalStore((s) => s.approvals);
  const listLoading = useSparePartApprovalStore((s) => s.listLoading);
  const fetchApprovals = useSparePartApprovalStore((s) => s.fetchApprovals);

  const [filterValues, setFilterValues] = useState({
    columnFilters: [],
    fromDate: '',
    toDate: '',
  });
  const [sortConfig, setSortConfig] = useState({ sorts: [] });

  const data = useMemo(() => formatSparePartApprovalRows(approvals, t), [approvals, t]);

  const [columns] = useState([
    { label: t('sparePartApproval.assetType'), name: 'asset_type_name', visible: true },
    { label: t('sparePartApproval.serialNumber'), name: 'serial_number', visible: true },
    { label: t('sparePartApproval.maintenanceType'), name: 'maintenance_type_name', visible: true },
    { label: t('sparePartApproval.vendor'), name: 'vendor_name', visible: true },
    { label: t('sparePartApproval.status'), name: 'status_label', visible: true },
  ]);

  useEffect(() => {
    fetchApprovals({ revalidate: true, force: true }).catch(() => {
      showBackendTextToast({
        toast,
        fallbackText: t('sparePartApproval.failedToFetchList'),
        type: 'error',
      });
    });
  }, [fetchApprovals, t]);

  useRevalidateOnFocus(() => fetchApprovals({ revalidate: true }));

  const handleFilterChange = (columnName, value) => {
    setFilterValues((prev) => applyListFilterChange(prev, columnName, value));
  };

  const handleSort = (column) => {
    setSortConfig((prev) => {
      const sorts = [...prev.sorts];
      const existingSort = sorts.find((s) => s.column === column);
      if (existingSort) {
        if (existingSort.direction === 'asc') existingSort.direction = 'desc';
        else sorts.splice(sorts.indexOf(existingSort), 1);
      } else {
        sorts.push({ column, direction: 'asc' });
      }
      return { sorts };
    });
  };

  const sortData = (rows) => {
    if (!sortConfig.sorts.length) return rows;
    return [...rows].sort((a, b) => {
      for (const sort of sortConfig.sorts) {
        const aValue = a[sort.column];
        const bValue = b[sort.column];
        if (aValue < bValue) return sort.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sort.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  };

  const handleDownload = () => {
    const filteredData = filterData(data, filterValues, columns.filter((c) => c.visible));
    exportToExcel(sortData(filteredData), columns, 'Spare_Part_Approval');
  };

  const filters = columns.map((col) => ({
    label: col.label,
    name: col.name,
    options:
      col.name === 'status_label'
        ? [
            { label: t('sparePartApproval.pendingApproval'), value: t('sparePartApproval.pendingApproval') },
            { label: t('sparePartApproval.reserved'), value: t('sparePartApproval.reserved') },
            { label: t('sparePartApproval.issued'), value: t('sparePartApproval.issued') },
          ]
        : [],
    onChange: (value) => handleFilterChange(col.name, value),
  }));

  const handleRowClick = (row) => {
    navigate(`/spare-part-approval-detail/${row.si_id}`);
  };

  const renderStatus = (row) => {
    const status = row.status;
    const label = row.status_label || '-';
    if (status === 'IS') {
      return <span className="text-green-600 font-semibold">{label}</span>;
    }
    if (status === 'IE') {
      return <span className="text-sky-600 font-semibold">{label}</span>;
    }
    if (status === 'RQ') {
      return <span className="text-yellow-600 font-semibold">{label}</span>;
    }
    return <span className="text-gray-600">{label}</span>;
  };

  return (
    <div className="p-4">
      <ContentBox
        filters={filters}
        onFilterChange={handleFilterChange}
        onSort={handleSort}
        sortConfig={sortConfig}
        onDownload={handleDownload}
        data={data}
        showAddButton={false}
        showActions={false}
      >
        {({ visibleColumns }) => {
          const filteredData = filterData(data, filterValues, visibleColumns);
          const sortedData = sortData(filteredData);
          const visibleCols = visibleColumns.filter((c) => c.visible);
          const colSpan = visibleCols.length;

          if (listLoading && data.length === 0) {
            return (
              <tr>
                <td colSpan={colSpan} className="text-center py-16">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
                  <p className="text-gray-600">{t('common.loading')}</p>
                </td>
              </tr>
            );
          }

          if (sortedData.length === 0) {
            return (
              <tr>
                <td colSpan={colSpan} className="text-center py-16">
                  <p className="text-xl font-semibold text-gray-800">{t('common.noDataFound')}</p>
                </td>
              </tr>
            );
          }

          return (
            <CustomTable
              columns={visibleColumns}
              visibleColumns={visibleColumns}
              data={sortedData}
              rowKey="si_id"
              showActions={false}
              rowClassName={(row) =>
                row.is_disabled ? 'opacity-50 cursor-default' : ''
              }
              renderCell={(col, row) =>
                col.name === 'status_label' ? renderStatus(row) : row[col.name]
              }
              onRowClick={(row) => {
                if (!row.is_disabled) handleRowClick(row);
                else handleRowClick(row);
              }}
            />
          );
        }}
      </ContentBox>
    </div>
  );
};

export default SparePartApproval;
