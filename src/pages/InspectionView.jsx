import { showBackendTextToast } from '../utils/errorTranslation';
import { useEffect, useState, useMemo, useCallback } from "react";
import ContentBox from "../components/ContentBox";
import CustomTable from "../components/CustomTable";
import { filterData } from "../utils/filterData";
import { exportToExcel } from "../utils/exportToExcel";
import { useNavigate } from "react-router-dom";
import API from "../lib/axios";
import { toast } from "react-hot-toast";
import UpdateAssetModal from "../components/assets/UpdateAssetModal";
import StatusBadge from "../components/StatusBadge";
import { useLanguage } from "../contexts/LanguageContext";
import { translateMasterDataLabel } from "../utils/masterDataLabel";
import { applyListFilterChange } from "../utils/listFilterState";
import { useRevalidateOnFocus } from "../hooks/useRevalidateOnFocus";
import { useInspectionViewStore } from "../store/useInspectionViewStore";

const InspectionView = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const schedules = useInspectionViewStore((s) => s.schedules);
  const listLoading = useInspectionViewStore((s) => s.listLoading);
  const fetchSchedules = useInspectionViewStore((s) => s.fetchSchedules);
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
  const columns = useMemo(() => ([
    { label: t('inspectionView.id'), name: "ais_id", visible: true },
    { label: t('inspectionView.assetCode'), name: "asset_code", visible: true },
    { label: t('inspectionView.assetType'), name: "asset_type_name", visible: true },
    { label: t('inspectionView.serialNumber'), name: "serial_number", visible: true },
    { label: t('inspectionView.startDate'), name: "act_insp_st_date", visible: true },
    { label: t('inspectionView.endDate'), name: "act_insp_end_date", visible: true },
    { label: t('inspectionView.vendor'), name: "vendor_name", visible: true },
    { label: t('inspectionView.status'), name: "status", visible: true },
    { label: t('inspectionView.outcome'), name: "insp_outcome", visible: true },
    { label: t('inspectionView.createdOn'), name: "created_on", visible: true },
    { label: t('inspectionView.createdBy'), name: "created_by", visible: true },
  ]), [t]);

  const mapStatusLabel = useCallback((code) => {
    if (code === 'IN') return t('inspectionView.initiated');
    if (code === 'IP') return t('inspectionView.inProgress');
    if (code === 'CO') return t('inspectionView.completed');
    if (code === 'CA') return t('inspectionView.cancelled');
    return code || t('inspectionView.unknown');
  }, [t]);

  const mapOutcomeLabel = useCallback((code) => {
    if (code === 'PA') return t('inspectionView.passed');
    if (code === 'FA') return t('inspectionView.failed');
    if (code === 'PR') return t('inspectionView.partial');
    if (code === 'PE' || !code) return t('inspectionView.pending');
    return code || t('inspectionView.pending');
  }, [t]);

  const fetchInspectionSchedules = useCallback(async () => {
    try {
      await fetchSchedules({ revalidate: true });
    } catch (err) {
      console.error("Failed to fetch inspection schedules", err);
      showBackendTextToast({ toast, tmdId: 'TMD_I18N_INSPECTIONVIEW_FAILEDTOFETCHINSPECTIONSCHEDULES_1030DBFF', fallbackText: t('inspectionView.failedToFetchInspectionSchedules'), type: 'error' });
    }
  }, [fetchSchedules, t]);

  const data = useMemo(() => {
    const formatDate = (dateString) => {
      if (!dateString) return '';
      try {
        const date = new Date(dateString);
        if (Number.isNaN(date.getTime())) return '';
        return date.toLocaleDateString();
      } catch {
        return '';
      }
    };

    return (schedules || []).map((item) => ({
      ...item,
      asset_type_name: translateMasterDataLabel(item.asset_type_name, t),
      raw_act_insp_st_date: item.act_insp_st_date,
      raw_act_insp_end_date: item.act_insp_end_date,
      raw_created_on: item.created_on,
      act_insp_st_date: formatDate(item.act_insp_st_date),
      act_insp_end_date: formatDate(item.act_insp_end_date),
      created_on: formatDate(item.created_on),
      status_code: item.status,
      status: mapStatusLabel(item.status),
      insp_outcome_code: item.insp_outcome,
      insp_outcome: mapOutcomeLabel(item.insp_outcome),
    }));
  }, [schedules, mapOutcomeLabel, mapStatusLabel, t]);

  const isLoading = listLoading && data.length === 0;

  useEffect(() => {
    fetchInspectionSchedules();
  }, [fetchInspectionSchedules]);

  useRevalidateOnFocus(() => {
    fetchSchedules({ revalidate: true });
  });

  const handleFilterChange = (columnName, value) => {
    setFilterValues((prev) => applyListFilterChange(prev, columnName, value));
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
      showBackendTextToast({ toast, tmdId: 'TMD_I18N_INSPECTIONVIEW_PLEASESELECTINSPECTIONRECORDS_303143D1', fallbackText: t('inspectionView.pleaseSelectInspectionRecords'), type: 'error' });
      return false;
    }

    try {
      // Note: This would need a corresponding backend endpoint to delete from tblAAT_Insp_Sch
      showBackendTextToast({ toast, tmdId: 'TMD_I18N_INSPECTIONVIEW_DELETENOTIMPLEMENTED_22BABC0D', fallbackText: t('inspectionView.deleteNotImplemented'), type: 'error' });
      return false;
    } catch (err) {
      console.error("Failed to delete inspection records", err);
      showBackendTextToast({ toast, tmdId: 'TMD_I18N_INSPECTIONVIEW_FAILEDTODELETEINSPECTIONRECORDS_F2A3C8D1', fallbackText: err.response?.data?.message || t('inspectionView.failedToDeleteInspectionRecords'), type: 'error' });
      return false;
    }
  };

  const handleDelete = async (row) => {
    try {
      // Note: This would need a corresponding backend endpoint to delete from tblAAT_Insp_Sch
      showBackendTextToast({ toast, tmdId: 'TMD_I18N_INSPECTIONVIEW_DELETENOTIMPLEMENTED_22BABC0D', fallbackText: t('inspectionView.deleteNotImplemented'), type: 'error' });
    } catch (err) {
      console.error("Failed to delete inspection record", err);
      showBackendTextToast({ toast, tmdId: 'TMD_I18N_INSPECTIONVIEW_FAILEDTODELETEINSPECTIONRECORD_63BEFA8C', fallbackText: err.response?.data?.message || t('inspectionView.failedToDeleteInspectionRecord'), type: 'error' });
    }
  };

  const handleEdit = (row) => {
    console.log("Edit inspection record:", row);
    setSelectedAsset(row);
    setUpdateModalOpen(true);
  };

  const handleUpdateModalClose = (wasUpdated) => {
    setUpdateModalOpen(false);
    setSelectedAsset(null);
    if (wasUpdated) {
      fetchInspectionSchedules(); // Refresh the list if update was successful
    }
  };

  const handleDownload = () => {
    try {
      // Get the filtered and sorted data
      const filteredData = filterData(data, filterValues, columns.filter(col => col.visible));
      const dataToExport = sortData(filteredData);

      // Export to Excel
      const success = exportToExcel(
        dataToExport,
        columns,
        'Inspection_Schedules_List'
      );

      if (success) {
        showBackendTextToast({
          toast,
          tmdId: 'TMD_I18N_INSPECTIONVIEW_INSPECTIONSCHEDULESEXPORTEDSUCCESSF_6F44B0D2',
          fallbackText: t('inspectionView.inspectionSchedulesExportedSuccessfully'),
          type: 'success',
          toastOptions: {
            icon: '✅',
            style: { borderRadius: '8px', background: '#064E3B', color: '#fff' },
          },
        });
      } else {
        throw new Error('Export failed');
      }
    } catch (error) {
      console.error('Error exporting data:', error);
      showBackendTextToast({
        toast,
        tmdId: 'TMD_I18N_INSPECTIONVIEW_FAILEDTOEXPORTINSPECTIONSCHEDULES_80AA2F1A',
        fallbackText: t('inspectionView.failedToExportInspectionSchedules'),
        type: 'error',
        toastOptions: {
          icon: '❌',
          style: { borderRadius: '8px', background: '#7F1D1D', color: '#fff' },
        },
      });
    }
  };

  const sortData = (data) => {
    if (!sortConfig.sorts.length) return data;

    return [...data].sort((a, b) => {
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
      { label: t('inspectionView.initiated'), value: t('inspectionView.initiated') },
      { label: t('inspectionView.inProgress'), value: t('inspectionView.inProgress') },
      { label: t('inspectionView.completed'), value: t('inspectionView.completed') },
      { label: t('inspectionView.cancelled'), value: t('inspectionView.cancelled') }
    ] : col.name === 'insp_outcome' ? [
      { label: t('inspectionView.passed'), value: t('inspectionView.passed') },
      { label: t('inspectionView.failed'), value: t('inspectionView.failed') },
      { label: t('inspectionView.partial'), value: t('inspectionView.partial') },
      { label: t('inspectionView.pending'), value: t('inspectionView.pending') }
    ] : [],
    onChange: (value) => handleFilterChange(col.name, value),
  }));

  const handleRowClick = (row) => {
    navigate(`/inspection-view/${row.ais_id}`);
  };

  return (
    <div className="p-4">
      <ContentBox
        filters={filters}
        dateFilterField="raw_act_insp_st_date"
        onFilterChange={handleFilterChange}
        onSort={handleSort}
        sortConfig={sortConfig}
        onDeleteSelected={handleDeleteSelected}
        onDownload={handleDownload}
        data={data}
        selectedRows={selectedRows}
        setSelectedRows={setSelectedRows}
        showAddButton={true}
        onAdd={() => navigate('/inspection-view/create')}
        showActions={false} // Hide Actions column header for this page
      >
        {({ visibleColumns, showActions }) => {
          const filteredData = filterData(data, filterValues, visibleColumns);
          const sortedData = sortData(filteredData);

          if (isLoading) {
            const visibleCols = visibleColumns.filter((col) => col.visible);
            const colSpan = visibleCols.length + (showActions ? 1 : 0);
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
            const visibleCols = visibleColumns.filter((col) => col.visible);
            const colSpan = visibleCols.length + (showActions ? 1 : 0);
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
              rowKey="ais_id"
              showActions={showActions} // Hide action column for this page
              renderCell={(col, row, colIndex) =>
                col.name === "status"
                  ? <StatusBadge status={row.status_code || row[col.name]} />
                  : col.name === "insp_outcome"
                  ? <span className={
                      row.insp_outcome_code === 'PA' ? 'text-green-600 font-semibold' :
                      row.insp_outcome_code === 'FA' ? 'text-red-600 font-semibold' :
                      row.insp_outcome_code === 'PR' ? 'text-orange-600 font-semibold' :
                      'text-gray-600'
                    }>{row[col.name]}</span>
                  : colIndex === 0
                    ? <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={selectedRows.includes(row["ais_id"])}
                          onChange={() => setSelectedRows(prev => prev.includes(row["ais_id"]) ? prev.filter(id => id !== row["ais_id"]) : [...prev, row["ais_id"]])}
                          className="accent-yellow-400"
                        />
                        {row[col.name]}
                      </div>
                    : row[col.name]
              }
              onRowClick={handleRowClick}
            />
          );
        }}
      </ContentBox>
      
      {/* Modals rendered outside ContentBox so they're always available */}
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

export default InspectionView;
