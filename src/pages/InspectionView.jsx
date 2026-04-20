import { useEffect, useState } from "react";
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

const InspectionView = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
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
  const [columns] = useState([
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
  ]);

  useEffect(() => {
    fetchInspectionSchedules();
  }, []);

  const fetchInspectionSchedules = async () => {
    setIsLoading(true);
    try {
      // Pass context so logs go to INSPECTION CSV
      const res = await API.get("/inspection/list", {
        params: { context: 'INSPECTIONVIEW' }
      });
      const inspectionArray = Array.isArray(res.data) ? res.data : res.data.data || [];
      const formattedData = inspectionArray.map(item => {
        const formatDate = (dateString) => {
          if (!dateString) return '';
          try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return ''; // Invalid date
            return date.toLocaleDateString();
          } catch (err) {
            console.error('Error formatting date:', err);
            return '';
          }
        };

        return {
          ...item,
          act_insp_st_date: formatDate(item.act_insp_st_date),
          act_insp_end_date: formatDate(item.act_insp_end_date),
          created_on: formatDate(item.created_on),
          // Map status codes to readable names
          status: item.status === 'IN' ? 'Initiated' :
                  item.status === 'IP' ? 'In Progress' :
                  item.status === 'CO' ? 'Completed' :
                  item.status === 'CA' ? 'Cancelled' :
                  item.status || 'Unknown',
          // Format outcome
          insp_outcome: item.insp_outcome === 'PA' ? 'Passed' :
                       item.insp_outcome === 'FA' ? 'Failed' :
                       item.insp_outcome === 'PR' ? 'Partial' :
                       item.insp_outcome || 'Pending'
        };
      });
      setData(formattedData);
    } catch (err) {
      console.error("Failed to fetch inspection schedules", err);
      toast.error(t('inspectionView.failedToFetchInspectionSchedules'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilterChange = (columnName, value) => {
    // Handle columnFilters array from ContentBox
    if (columnName === "columnFilters") {
      setFilterValues((prev) => ({
        ...prev,
        columnFilters: value,
      }));
    }
    // Handle date filters
    else if (columnName === "fromDate" || columnName === "toDate") {
      setFilterValues((prev) => ({
        ...prev,
        [columnName]: value,
      }));
    }
    // Handle individual column filters (legacy support)
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
      toast.error(t('inspectionView.pleaseSelectInspectionRecords'));
      return false;
    }

    try {
      // Note: This would need a corresponding backend endpoint to delete from tblAAT_Insp_Sch
      toast.error(t('inspectionView.deleteNotImplemented'));
      return false;
    } catch (err) {
      console.error("Failed to delete inspection records", err);
      toast.error(err.response?.data?.message || t('inspectionView.failedToDeleteInspectionRecords'));
      return false;
    }
  };

  const handleDelete = async (row) => {
    try {
      // Note: This would need a corresponding backend endpoint to delete from tblAAT_Insp_Sch
      toast.error(t('inspectionView.deleteNotImplemented'));
    } catch (err) {
      console.error("Failed to delete inspection record", err);
      toast.error(err.response?.data?.message || t('inspectionView.failedToDeleteInspectionRecord'));
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
        toast(
          t('inspectionView.inspectionSchedulesExportedSuccessfully'),
          {
            icon: '✅',
            style: {
              borderRadius: '8px',
              background: '#064E3B',
              color: '#fff',
            },
          }
        );
      } else {
        throw new Error('Export failed');
      }
    } catch (error) {
      console.error('Error exporting data:', error);
      toast(
        t('inspectionView.failedToExportInspectionSchedules'),
        {
          icon: '❌',
          style: {
            borderRadius: '8px',
            background: '#7F1D1D',
            color: '#fff',
          },
        }
      );
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
      { label: t('inspectionView.initiated'), value: "Initiated" },
      { label: t('inspectionView.inProgress'), value: "In Progress" },
      { label: t('inspectionView.completed'), value: "Completed" },
      { label: t('inspectionView.cancelled'), value: "Cancelled" }
    ] : col.name === 'insp_outcome' ? [
      { label: t('inspectionView.passed'), value: "Passed" },
      { label: t('inspectionView.failed'), value: "Failed" },
      { label: t('inspectionView.partial'), value: "Partial" },
      { label: t('inspectionView.pending'), value: "Pending" }
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
                  ? <StatusBadge status={row[col.name]} />
                  : col.name === "insp_outcome"
                  ? <span className={
                      row[col.name] === 'Passed' ? 'text-green-600 font-semibold' :
                      row[col.name] === 'Failed' ? 'text-red-600 font-semibold' :
                      row[col.name] === 'Partial' ? 'text-orange-600 font-semibold' :
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
