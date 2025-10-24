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

const MaintenanceApprovalDetail = () => {
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
    { label: t('maintenanceApproval.assetType'), name: "asset_type_name", visible: true },
    { label: t('maintenanceApproval.assetID'), name: "asset_id", visible: true },
    { label: t('maintenanceApproval.serialNumber'), name: "serial_number", visible: true },
    { label: t('maintenanceApproval.scheduledDate'), name: "scheduled_date", visible: true },
    { label: t('maintenanceApproval.vendor'), name: "vendor", visible: true },
    { label: t('maintenanceApproval.department'), name: "department", visible: true },
    { label: t('maintenanceApproval.maintenanceType'), name: "maintenance_type", visible: true },
    { label: t('maintenanceApproval.status'), name: "status", visible: true },
    { label: t('maintenanceApproval.daysUntilDue'), name: "days_until_due", visible: true },
  ]);

  useEffect(() => {
    fetchMaintenanceApprovals();
  }, []);

  const fetchMaintenanceApprovals = async () => {
    try {
      const res = await API.get("/approval-detail/maintenance-approvals");
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
          scheduled_date: formatDate(item.scheduled_date),
          actual_date: formatDate(item.actual_date),
          maintenance_created_on: formatDate(item.maintenance_created_on),
          maintenance_changed_on: formatDate(item.maintenance_changed_on),
          days_until_due: item.days_until_due ? `${item.days_until_due} ${t('maintenanceApproval.days')}` : '-',
          // Add urgency styling for days until due
          urgency_class: item.days_until_due <= 2 ? 'text-red-600 font-semibold' : 
                        item.days_until_due <= 5 ? 'text-orange-600 font-semibold' : 
                        'text-gray-600'
        };
      });
      setData(formattedData);
    } catch (err) {
      console.error("Failed to fetch maintenance approvals", err);
      toast.error(t('maintenanceApproval.failedToFetchMaintenanceApprovals'));
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
      toast.error(t('maintenanceApproval.pleaseSelectMaintenanceRecords'));
      return false;
    }

    try {
      await API.post("/maintenance-approval/delete", { wfamsh_ids: selectedRows });
      toast.success(t('maintenanceApproval.maintenanceRecordsDeletedSuccessfully', { count: selectedRows.length }));
      setSelectedRows([]);
      fetchMaintenanceApprovals();
      return true;
    } catch (err) {
      console.error("Failed to delete maintenance records", err);
      toast.error(err.response?.data?.message || t('maintenanceApproval.failedToDeleteMaintenanceRecords'));
      return false;
    }
  };

  const handleDelete = async (row) => {
    try {
      await API.delete(`/maintenance-approval/${row.wfamsh_id}`);
      toast.success(t('maintenanceApproval.maintenanceRecordDeletedSuccessfully'));
      fetchMaintenanceApprovals();
    } catch (err) {
      console.error("Failed to delete maintenance record", err);
      toast.error(err.response?.data?.message || t('maintenanceApproval.failedToDeleteMaintenanceRecord'));
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
      fetchMaintenanceApprovals(); // Refresh the list if update was successful
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
        'Maintenance_Approvals_List'
      );

      if (success) {
        toast(
          t('maintenanceApproval.maintenanceApprovalsExportedSuccessfully'),
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
        t('maintenanceApproval.failedToExportMaintenanceApprovals'),
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
      { label: t('maintenanceApproval.initiated'), value: "IN" },
      { label: t('maintenanceApproval.inProgress'), value: "IP" },
      { label: t('maintenanceApproval.completed'), value: "CO" },
      { label: t('maintenanceApproval.cancelled'), value: "CA" }
    ] : [],
    onChange: (value) => handleFilterChange(col.name, value),
  }));

  const handleRowClick = (row) => {
    navigate(`/approval-detail/${row.wfamsh_id}?context=MAINTENANCEAPPROVAL`, {
      state: { context: 'MAINTENANCEAPPROVAL' }
    });
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
                rowKey="wfamsh_id"
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
                            checked={selectedRows.includes(row["wfamsh_id"])}
                            onChange={() => setSelectedRows(prev => prev.includes(row["wfamsh_id"]) ? prev.filter(id => id !== row["wfamsh_id"]) : [...prev, row["wfamsh_id"]])}
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

export default MaintenanceApprovalDetail;
