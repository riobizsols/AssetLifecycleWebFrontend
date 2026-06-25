import { showBackendTextToast } from '../utils/errorTranslation';
import { useEffect, useMemo, useState } from "react";
import ContentBox from "../components/ContentBox";
import CustomTable from "../components/CustomTable";
import { filterData } from "../utils/filterData";
import { exportToExcel } from "../utils/exportToExcel";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import UpdateAssetModal from "../components/assets/UpdateAssetModal";
import StatusBadge from "../components/StatusBadge";
import { useLanguage } from "../contexts/LanguageContext";
import { useRevalidateOnFocus } from "../hooks/useRevalidateOnFocus";
import {
  formatMaintenanceScheduleRows,
  useMaintenanceSupervisorStore,
} from "../store/useMaintenanceSupervisorStore";

const MaintenanceSupervisor = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [filterValues, setFilterValues] = useState({
    columnFilters: [],
    fromDate: "",
    toDate: ""
  });
  const [selectedRows, setSelectedRows] = useState([]);
  const [sortConfig, setSortConfig] = useState({
    sorts: []
  });
  const [updateModalOpen, setUpdateModalOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const schedules = useMaintenanceSupervisorStore((s) => s.schedules);
  const listLoading = useMaintenanceSupervisorStore((s) => s.listLoading);
  const fetchSchedules = useMaintenanceSupervisorStore((s) => s.fetchSchedules);

  const data = useMemo(
    () => formatMaintenanceScheduleRows(schedules, t),
    [schedules, t],
  );

  const [columns] = useState([
    { label: t('maintenanceSupervisor.id'), name: "ams_id", visible: true },
    { label: t('maintenanceSupervisor.assetID'), name: "asset_id", visible: true },
    { label: t('maintenanceSupervisor.assetType'), name: "asset_type_name", visible: true },
    { label: t('maintenanceSupervisor.serialNumber'), name: "serial_number", visible: true },
    { label: t('maintenanceSupervisor.description'), name: "asset_description", visible: true },
    { label: t('maintenanceSupervisor.maintenanceType'), name: "maintenance_type_name", visible: true },
    { label: t('maintenanceSupervisor.vendor'), name: "vendor_name", visible: true },
    { label: t('maintenanceSupervisor.scheduledDate'), name: "act_maint_st_date", visible: true },
    { label: t('maintenanceSupervisor.status'), name: "status", visible: true },
    { label: t('maintenanceSupervisor.actualHours'), name: "hours_spent", visible: true },
    { label: t('maintenanceSupervisor.variance'), name: "variance", visible: true },
    { label: t('maintenanceSupervisor.daysUntilDue'), name: "days_until_due", visible: true },
    { label: t('maintenanceSupervisor.createdOn'), name: "created_on", visible: true },
    { label: t('maintenanceSupervisor.createdBy'), name: "created_by", visible: true },
  ]);

  useEffect(() => {
    fetchSchedules({ revalidate: true }).catch((err) => {
      console.error("Failed to fetch maintenance schedules", err);
      showBackendTextToast({
        toast,
        tmdId: 'TMD_I18N_MAINTENANCESUPERVISOR_FAILEDTOFETCHMAINTENANCES_78A95FA4',
        fallbackText: t('maintenanceSupervisor.failedToFetchMaintenanceSchedules'),
        type: 'error',
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchSchedules]);

  useRevalidateOnFocus(() => {
    fetchSchedules({ revalidate: true });
  });

  const handleFilterChange = (columnName, value) => {
    if (columnName === "columnFilters") {
      setFilterValues((prev) => ({
        ...prev,
        columnFilters: value,
      }));
    }
    else if (columnName === "fromDate" || columnName === "toDate") {
      setFilterValues((prev) => ({
        ...prev,
        [columnName]: value,
      }));
    }
    else {
      setFilterValues((prev) => ({
        ...prev,
        columnFilters: prev.columnFilters.filter((f) => f.column !== columnName),
        ...(value && {
          columnFilters: [
            ...prev.columnFilters.filter((f) => f.column !== columnName),
            { column: columnName, value },
          ],
        }),
      }));
    }
  };

  const handleSort = (column) => {
    setSortConfig((prev) => {
      const sorts = [...prev.sorts];
      const existingSort = sorts.find((s) => s.column === column);

      if (existingSort) {
        if (existingSort.direction === "asc") {
          existingSort.direction = "desc";
        } else {
          sorts.splice(sorts.indexOf(existingSort), 1);
        }
      } else {
        sorts.push({ column, direction: "asc" });
      }

      return { sorts };
    });
  };

  const handleDeleteSelected = async () => {
    if (selectedRows.length === 0) {
      showBackendTextToast({ toast, tmdId: 'TMD_I18N_MAINTENANCESUPERVISOR_PLEASESELECTMAINTENANCERE_692876DC', fallbackText: t('maintenanceSupervisor.pleaseSelectMaintenanceRecords'), type: 'error' });
      return false;
    }

    try {
      showBackendTextToast({ toast, tmdId: 'TMD_I18N_MAINTENANCESUPERVISOR_DELETENOTIMPLEMENTED_05C8C6C9', fallbackText: t('maintenanceSupervisor.deleteNotImplemented'), type: 'error' });
      return false;
    } catch (err) {
      console.error("Failed to delete maintenance records", err);
      showBackendTextToast({
        toast,
        tmdId: 'TMD_I18N_MAINTENANCESUPERVISOR_FAILEDTODELETEMAINTENANCEREC_6CE8EF86',
        fallbackText: err.response?.data?.message || t('maintenanceSupervisor.failedToDeleteMaintenanceRecords'),
        type: 'error',
      });
      return false;
    }
  };

  const handleDelete = async (row) => {
    try {
      showBackendTextToast({ toast, tmdId: 'TMD_I18N_MAINTENANCESUPERVISOR_DELETENOTIMPLEMENTED_05C8C6C9', fallbackText: t('maintenanceSupervisor.deleteNotImplemented'), type: 'error' });
    } catch (err) {
      console.error("Failed to delete maintenance record", err);
      showBackendTextToast({
        toast,
        tmdId: 'TMD_I18N_MAINTENANCESUPERVISOR_FAILEDTODELETEMAINTENANCEREC_5CF333CA',
        fallbackText: err.response?.data?.message || t('maintenanceSupervisor.failedToDeleteMaintenanceRecord'),
        type: 'error',
      });
    }
  };

  const handleEdit = (row) => {
    setSelectedAsset(row);
    setUpdateModalOpen(true);
  };

  const handleUpdateModalClose = (wasUpdated) => {
    setUpdateModalOpen(false);
    setSelectedAsset(null);
    if (wasUpdated) {
      useMaintenanceSupervisorStore.getState().invalidateMaintenanceCache();
      fetchSchedules({ revalidate: true });
    }
  };

  const handleDownload = () => {
    try {
      const filteredData = filterData(data, filterValues, columns.filter(col => col.visible));
      const dataToExport = sortData(filteredData);

      const success = exportToExcel(
        dataToExport,
        columns,
        'Maintenance_Schedules_List'
      );

      if (success) {
        showBackendTextToast({
          toast,
          tmdId: 'TMD_I18N_MAINTENANCESUPERVISOR_MAINTENANCESCHEDULESEXPORT_7B3A2A1B',
          fallbackText: t('maintenanceSupervisor.maintenanceSchedulesExportedSuccessfully'),
          type: 'success',
        });
      } else {
        throw new Error('Export failed');
      }
    } catch (error) {
      console.error('Error exporting data:', error);
      showBackendTextToast({
        toast,
        tmdId: 'TMD_I18N_MAINTENANCESUPERVISOR_FAILEDTOEXPORTMAINTENANCESCH_7B11F0DE',
        fallbackText: t('maintenanceSupervisor.failedToExportMaintenanceSchedules'),
        type: 'error',
      });
    }
  };

  const sortData = (dataToSort) => {
    if (!sortConfig.sorts.length) return dataToSort;

    return [...dataToSort].sort((a, b) => {
      for (const sort of sortConfig.sorts) {
        const aValue = a[sort.column];
        const bValue = b[sort.column];

        if (aValue < bValue) return sort.direction === "asc" ? -1 : 1;
        if (aValue > bValue) return sort.direction === "asc" ? 1 : -1;
      }
      return 0;
    });
  };

  const filters = columns.map((col) => ({
    label: col.label,
    name: col.name,
    options: col.name === 'status' ? [
      { label: t('maintenanceSupervisor.initiated'), value: "IN" },
      { label: t('maintenanceSupervisor.inProgress'), value: "IP" },
      { label: t('maintenanceSupervisor.completed'), value: "CO" },
      { label: t('maintenanceSupervisor.cancelled'), value: "CA" }
    ] : [],
    onChange: (value) => handleFilterChange(col.name, value),
  }));

  const handleRowClick = (row) => {
    useMaintenanceSupervisorStore
      .getState()
      .fetchScheduleDetail(row.ams_id, { revalidate: true });
    navigate(`/maintenance-list-detail/${row.ams_id}`);
  };

  return (
    <div className="p-4">
      <ContentBox
        filters={filters}
        onFilterChange={handleFilterChange}
        onSort={handleSort}
        sortConfig={sortConfig}
        onDeleteSelected={handleDeleteSelected}
        onDownload={handleDownload}
        data={data}
        selectedRows={selectedRows}
        setSelectedRows={setSelectedRows}
        showAddButton={true}
        onAdd={() => navigate('/maintenance-list/create')}
        showActions={false}
      >
        {({ visibleColumns, showActions }) => {
          const filteredData = filterData(data, filterValues, visibleColumns);
          const sortedData = sortData(filteredData);

          const visibleCols = visibleColumns.filter((col) => col.visible);
          const colSpan = visibleCols.length + (showActions ? 1 : 0);

          if (listLoading && data.length === 0) {
            return (
              <tr>
                <td colSpan={colSpan} className="text-center py-16">
                  <div className="flex flex-col items-center justify-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">{t('common.loading')}</p>
                  </div>
                </td>
              </tr>
            );
          }

          if (sortedData.length === 0) {
            return (
              <tr>
                <td colSpan={colSpan} className="text-center py-16">
                  <div className="flex flex-col items-center justify-center">
                    <p className="text-xl font-semibold text-gray-800">
                      {t('common.noDataFound')}
                    </p>
                  </div>
                </td>
              </tr>
            );
          }

          return (
            <CustomTable
              columns={visibleColumns}
              visibleColumns={visibleColumns}
              data={sortedData}
              selectedRows={selectedRows}
              setSelectedRows={setSelectedRows}
              onEdit={handleEdit}
              onDelete={handleDelete}
              rowKey="ams_id"
              showActions={showActions}
              renderCell={(col, row, colIndex) => {
                if (col.name === "status") return <StatusBadge status={row[col.name]} />;
                if (col.name === "days_until_due") return <span className={row.urgency_class}>{row[col.name]}</span>;
                if (col.name === "variance") {
                  const val = parseFloat(row.variance || 0);
                  if (val > 0) return <span className="text-red-600 font-bold">+{row.variance}h</span>;
                  if (val < 0) return <span className="text-green-600 font-medium">{row.variance}h</span>;
                  return <span className="text-gray-400 font-medium">0.00h</span>;
                }
                if (col.name === 'hours_spent' || col.name === 'hours_required') {
                  return <span className="font-medium text-gray-700">{row[col.name] || '0'}h</span>;
                }

                if (colIndex === 0) {
                  return (
                    <div className="flex items-center gap-2">
                       <input
                          type="checkbox"
                          checked={selectedRows.includes(row["ams_id"])}
                          onChange={() => setSelectedRows(prev => prev.includes(row["ams_id"]) ? prev.filter(itemId => itemId !== row["ams_id"]) : [...prev, row["ams_id"]])}
                          onClick={(e) => e.stopPropagation()}
                          className="accent-yellow-400"
                        />
                        {row[col.name]}
                    </div>
                  );
                }
                return row[col.name];
              }}
              onRowClick={handleRowClick}
            />
          );
        }}
      </ContentBox>

      {updateModalOpen && (
        <UpdateAssetModal
          isOpen={updateModalOpen}
          onClose={handleUpdateModalClose}
          assetData={selectedAsset}
        />
      )}
    </div>
  );
};

export default MaintenanceSupervisor;
