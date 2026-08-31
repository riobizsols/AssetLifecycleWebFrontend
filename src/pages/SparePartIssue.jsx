import { showBackendTextToast } from '../utils/errorTranslation';
import { useEffect, useMemo, useState } from 'react';
import ContentBox from '../components/ContentBox';
import CustomTable from '../components/CustomTable';
import { filterData } from '../utils/filterData';
import { exportToExcel } from '../utils/exportToExcel';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import API from '../lib/axios';
import { useLanguage } from '../contexts/LanguageContext';
import { useRevalidateOnFocus } from '../hooks/useRevalidateOnFocus';
import {
  formatSparePartListRows,
  useSparePartListStore,
} from '../store/useSparePartListStore';
import { applyListFilterChange } from '../utils/listFilterState';

const SparePartIssue = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const items = useSparePartListStore((s) => s.items);
  const listLoading = useSparePartListStore((s) => s.listLoading);
  const fetchList = useSparePartListStore((s) => s.fetchList);

  const [filterValues, setFilterValues] = useState({
    columnFilters: [],
    fromDate: '',
    toDate: '',
  });
  const [sortConfig, setSortConfig] = useState({ sorts: [] });
  const [issuingIds, setIssuingIds] = useState({});

  const data = useMemo(
    () => formatSparePartListRows(items, t).filter((row) => row.status === 'IS'),
    [items, t],
  );

  const [columns] = useState([
    { label: t('sparePartList.assetType'), name: 'asset_type_name', visible: true },
    { label: t('sparePartList.serialNumber'), name: 'serial_number', visible: true },
    { label: t('sparePartList.description'), name: 'asset_description', visible: true },
    { label: t('sparePartList.maintenanceType'), name: 'maintenance_type_name', visible: true },
    { label: t('sparePartList.vendor'), name: 'vendor_name', visible: true },
    { label: t('sparePartList.status'), name: 'status', visible: true },
    { label: t('sparePartIssue.action'), name: 'action', visible: true },
  ]);

  useEffect(() => {
    fetchList({ revalidate: true }).catch(() => {
      showBackendTextToast({
        toast,
        fallbackText: t('sparePartList.failedToFetchList'),
        type: 'error',
      });
    });
  }, [fetchList, t]);

  useRevalidateOnFocus(() => fetchList({ revalidate: true }));

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
    exportToExcel(sortData(filteredData), columns, 'Spare_Part_Issue');
  };

  const filters = columns.map((col) => ({
    label: col.label,
    name: col.name,
    options:
      col.name === 'status'
        ? [{ label: t('sparePartList.issued'), value: 'IS' }]
        : [],
    onChange: (value) => handleFilterChange(col.name, value),
  }));

  const handleRowClick = (row) => {
    useSparePartListStore.getState().fetchDetail(row.ams_id, { revalidate: true });
    navigate(`/spare-part-list-detail/${row.ams_id}`);
  };

  const handleIssue = async (row) => {
    if (!row?.ams_id || issuingIds[row.ams_id]) return;
    setIssuingIds((prev) => ({ ...prev, [row.ams_id]: true }));
    try {
      await API.post(`/spare-parts/maintenance-list/${row.ams_id}/issue`);
      toast.success(t('sparePartIssue.issuedSuccessfully'));
      useSparePartListStore.getState().invalidateListCache();
      await fetchList({ revalidate: true });
    } catch (err) {
      toast.error(err.response?.data?.error || t('sparePartIssue.issueFailed'));
    } finally {
      setIssuingIds((prev) => {
        const next = { ...prev };
        delete next[row.ams_id];
        return next;
      });
    }
  };

  const renderStatus = () => (
    <span className="text-green-600 font-semibold">{t('sparePartList.issued')}</span>
  );

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
              rowKey="ams_id"
              showActions={false}
              renderCell={(col, row) => {
                if (col.name === 'status') return renderStatus();
                if (col.name === 'action') {
                  return (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleIssue(row);
                      }}
                      disabled={Boolean(issuingIds[row.ams_id])}
                      className="px-3 py-1 bg-[#0E2F4B] text-white text-xs font-medium rounded hover:bg-[#14395c] transition disabled:opacity-50"
                    >
                      {issuingIds[row.ams_id]
                        ? t('common.saving')
                        : t('sparePartIssue.issueAction')}
                    </button>
                  );
                }
                return row[col.name];
              }}
              onRowClick={handleRowClick}
            />
          );
        }}
      </ContentBox>
    </div>
  );
};

export default SparePartIssue;
