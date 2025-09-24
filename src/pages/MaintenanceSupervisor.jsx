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

const MaintenanceSupervisor = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [data, setData] = useState([]);
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
    { label: t('maintenanceSupervisor.id'), name: "ams_id", visible: true },
    { label: t('maintenanceSupervisor.assetID'), name: "asset_id", visible: true },
    { label: t('maintenanceSupervisor.assetType'), name: "asset_type_name", visible: true },
    { label: t('maintenanceSupervisor.serialNumber'), name: "serial_number", visible: true },
    { label: t('maintenanceSupervisor.description'), name: "asset_description", visible: true },
    { label: t('maintenanceSupervisor.maintenanceType'), name: "maintenance_type_name", visible: true },
    { label: t('maintenanceSupervisor.vendor'), name: "vendor_name", visible: true },
    { label: t('maintenanceSupervisor.scheduleDate'), name: "act_maint_st_date", visible: true },
    { label: t('maintenanceSupervisor.status'), name: "status", visible: true },
    { label: t('maintenanceSupervisor.daysUntilDue'), name: "days_until_due", visible: true },
    { label: t('maintenanceSupervisor.createdOn'), name: "created_on", visible: true },
    { label: t('maintenanceSupervisor.createdBy'), name: "created_by", visible: true },
  ]);

  useEffect(() => {
    fetchMaintenanceSchedules();
  }, []);

  const fetchMaintenanceSchedules = async () => {
    try {
      const res = await API.get("/maintenance-schedules/all");
      const maintenanceArray = Array.isArray(res.data) ? res.data : res.data.data || [];
      const formattedData = maintenanceArray.map(item => {
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
          act_maint_st_date: formatDate(item.act_maint_st_date),
          created_on: formatDate(item.created_on),
          changed_on: formatDate(item.changed_on),
          days_until_due: item.days_until_due > 0 ? `${item.days_until_due} ${t('maintenanceSupervisor.days')}` : 
                         item.days_until_due === 0 ? t('maintenanceSupervisor.dueToday') : t('maintenanceSupervisor.overdue'),
          // Add urgency styling for days until due
          urgency_class: item.days_until_due <= 2 ? 'text-red-600 font-semibold' : 
                        item.days_until_due <= 5 ? 'text-orange-600 font-semibold' : 
                        item.days_until_due === 0 ? 'text-red-800 font-bold' :
                        item.days_until_due < 0 ? 'text-red-700 font-bold' :
                        'text-gray-600'
        };
      });
      setData(formattedData);
    } catch (err) {
      console.error("Failed to fetch maintenance schedules", err);
      toast.error(t('maintenanceSupervisor.failedToFetchMaintenanceSchedules'));
    }
  };

  const handleFilterChange = (columnName, value) => {
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
      toast.error(t('maintenanceSupervisor.pleaseSelectMaintenanceRecords'));
      return false;
    }

    try {
      // Note: This would need a corresponding backend endpoint to delete from tblAssetMaintSch
      toast.error(t('maintenanceSupervisor.deleteNotImplemented'));
      return false;
    } catch (err) {
      console.error("Failed to delete maintenance records", err);
      toast.error(err.response?.data?.message || t('maintenanceSupervisor.failedToDeleteMaintenanceRecords'));
      return false;
    }
  };

  const handleDelete = async (row) => {
    try {
      // Note: This would need a corresponding backend endpoint to delete from tblAssetMaintSch
      toast.error(t('maintenanceSupervisor.deleteNotImplemented'));
    } catch (err) {
      console.error("Failed to delete maintenance record", err);
      toast.error(err.response?.data?.message || t('maintenanceSupervisor.failedToDeleteMaintenanceRecord'));
    }
  };

  const handleEdit = (row) => {
    console.log("Edit maintenance record:", row);
    setSelectedAsset(row);
    setUpdateModalOpen(true);
  };

  const handleUpdateModalClose = (wasUpdated) => {
    setUpdateModalOpen(false);
    setSelectedAsset(null);
    if (wasUpdated) {
      fetchMaintenanceSchedules(); // Refresh the list if update was successful
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
        'Maintenance_Schedules_List'
      );

      if (success) {
        toast(
          t('maintenanceSupervisor.maintenanceSchedulesExportedSuccessfully'),
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
        t('maintenanceSupervisor.failedToExportMaintenanceSchedules'),
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
      { label: t('maintenanceSupervisor.initiated'), value: "IN" },
      { label: t('maintenanceSupervisor.inProgress'), value: "IP" },
      { label: t('maintenanceSupervisor.completed'), value: "CO" },
      { label: t('maintenanceSupervisor.cancelled'), value: "CA" }
    ] : [],
    onChange: (value) => handleFilterChange(col.name, value),
  }));

  const handleRowClick = (row) => {
    navigate(`/supervisor-approval-detail/${row.ams_id}`);
  };

  return (
    <div className="p-4">
      <ContentBox
        filters={filters}
        onFilterChange={handleFilterChange}
        onSort={handleSort}
        sortConfig={sortConfig}
        onAdd={() => navigate("/maintenance-approval/add")}
        onDeleteSelected={handleDeleteSelected}
        onDownload={handleDownload}
        data={data}
        selectedRows={selectedRows}
        setSelectedRows={setSelectedRows}
        showAddButton={false} // Hide Add button for this page
        showActions={false} // Hide Actions column header for this page
      >
        {({ visibleColumns, showActions }) => {
          const filteredData = filterData(data, filterValues, visibleColumns);
          const sortedData = sortData(filteredData);

          return (
            <>
              <CustomTable
                columns={visibleColumns}
                visibleColumns={visibleColumns}
                data={sortedData}
                selectedRows={selectedRows}
                setSelectedRows={setSelectedRows}
                onEdit={handleEdit}
                onDelete={handleDelete}
                rowKey="ams_id"
                showActions={showActions} // Hide action column for this page
                renderCell={(col, row, colIndex) =>
                  col.name === "status"
                    ? <StatusBadge status={row[col.name]} />
                    : col.name === "days_until_due"
                    ? <span className={row.urgency_class}>{row[col.name]}</span>
                    : colIndex === 0
                      ? <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={selectedRows.includes(row["ams_id"])}
                            onChange={() => setSelectedRows(prev => prev.includes(row["ams_id"]) ? prev.filter(id => id !== row["ams_id"]) : [...prev, row["ams_id"]])}
                            className="accent-yellow-400"
                          />
                          {row[col.name]}
                        </div>
                      : row[col.name]
                }
                onRowClick={handleRowClick}
              />
              {updateModalOpen && (
                <UpdateAssetModal
                  isOpen={updateModalOpen}
                  onClose={handleUpdateModalClose}
                  assetData={selectedAsset}
                />
              )}
            </>
          );
        }}
      </ContentBox>
    </div>
  );
};

export default MaintenanceSupervisor;
