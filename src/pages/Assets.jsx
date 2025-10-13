import { useEffect, useState } from "react";
import ContentBox from "../components/ContentBox";
import CustomTable from "../components/CustomTable";
import { filterData } from "../utils/filterData";
import { exportToExcel } from "../utils/exportToExcel";
import { useNavigate, useLocation } from "react-router-dom";
import API from "../lib/axios";
import { toast } from "react-hot-toast";
import UpdateAssetModal from "../components/assets/UpdateAssetModal";
import DeleteConfirmModal from "../components/DeleteConfirmModal";
import useAuditLog from "../hooks/useAuditLog";
import { ASSETS_APP_ID } from "../constants/assetsAuditEvents";
import { useLanguage } from "../contexts/LanguageContext";
import { translateErrorMessage } from "../utils/errorTranslation";
import { useNavigation } from "../hooks/useNavigation";

const Assets = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();
  
  // Get navigation permissions
  const { canEdit, canCreate, canDelete, getAccessLevel } = useNavigation();
  
  // Check access levels for ASSETS app_id
  const hasEditAccess = canEdit('ASSETS');
  const hasCreateAccess = canCreate('ASSETS');
  const hasDeleteAccess = canDelete('ASSETS');
  const accessLevel = getAccessLevel('ASSETS');
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
  // Delete modal state removed - delete happens immediately

  // Initialize audit logging
  const { recordActionByNameWithFetch } = useAuditLog(ASSETS_APP_ID);

  // Create columns with translations
  const columns = [
    { label: t('assets.assetId'), name: "asset_id", visible: true },
    { label: t('assets.assetTypeId'), name: "asset_type_id", visible: true },
    { label: t('assets.assetType'), name: "text", visible: true },
    { label: t('assets.serialNumber'), name: "serial_number", visible: true },
    { label: t('assets.assetName'), name: "description", visible: true },
    { label: t('assets.currentStatus'), name: "current_status", visible: true },
    { label: t('assets.purchaseCost'), name: "purchased_cost", visible: true },
    { label: t('assets.purchaseDate'), name: "purchased_on", visible: true },
    { label: t('assets.purchaseBy'), name: "purchased_by", visible: true },
    { label: t('assets.expiryDate'), name: "expiry_date", visible: true },
    { label: t('assets.warrantyPeriod'), name: "warranty_period", visible: true },
    { label: t('assets.branchId'), name: "branch_id", visible: true },
    { label: t('assets.vendorId'), name: "vendor_id", visible: true },
    { label: t('assets.parentId'), name: "parent_asset_id", visible: true },
    { label: t('assets.groupId'), name: "group_id", visible: true },
    { label: t('assets.maintenanceScheduleId'), name: "maintsch_id", visible: false },
    { label: t('assets.productServiceId'), name: "prod_serv_id", visible: false },
    { label: t('assets.extId'), name: "ext_id", visible: false },
  ];

  useEffect(() => {
    fetchAssets();
  }, []);

  // Prevent access to /assets/add for read-only users
  useEffect(() => {
    if (location.pathname === '/assets/add' && !hasCreateAccess) {
      toast.error(t('assets.noPermissionToAddAssets'));
      navigate('/assets');
    }
  }, [location.pathname, hasCreateAccess, navigate, t]);

  const fetchAssets = async () => {
    try {
      const res = await API.get("/assets");
      // Format the data
      const assetsArray = Array.isArray(res.data) ? res.data : res.data.rows || [];
      const formattedData = assetsArray.map(item => {
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
          purchased_on: formatDate(item.purchased_on),
          expiry_date: formatDate(item.expiry_date),
          created_on: formatDate(item.created_on),
          changed_on: formatDate(item.changed_on),
          purchased_cost: item.purchased_cost ? `₹${item.purchased_cost.toLocaleString()}` : ''
        };
      });
      setData(formattedData);
      
    } catch (err) {
      console.error("Failed to fetch assets", err);
      toast.error(t('assets.failedToFetchAssets'));
    }
  };

  const handleFilterChange = async (columnName, value) => {
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

  const handleSort = async (column) => {
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
      toast.error(t('assets.pleaseSelectAssets'));
      return false;
    }
    
    try {
      await API.post("/assets/delete", { asset_ids: selectedRows });
      toast.success(t('assets.assetsDeletedSuccessfully', { count: selectedRows.length }));
      
      // Log bulk delete action
      await recordActionByNameWithFetch('Delete', { 
        count: selectedRows.length,
        assetIds: selectedRows 
      });
      
      setSelectedRows([]);
      fetchAssets();
      return true;
    } catch (err) {
      console.error("Failed to delete assets", err);
      if (err.response?.data?.code === '23503') {
        const assetId = err.response.data.assetId;
        toast.error(
          err.response.data.message || 
          t('assets.assetCannotBeDeleted', { assetId }),
          { duration: 5000 }
        );
      } else {
        const errorMessage = err.response?.data?.message || t('assets.failedToDeleteAssets');
        toast.error(translateErrorMessage(errorMessage));
      }
      return false;
    }
  };

  // Unused confirmBulkDelete function removed

  const handleDelete = async (row) => {
    try {
      await API.delete(`/assets/${row.asset_id}`);
      toast.success(t('assets.assetDeletedSuccessfully'));
      
      // Log delete action
      await recordActionByNameWithFetch('Delete', { assetId: row.asset_id });
      
      fetchAssets();
    } catch (err) {
      console.error("Failed to delete asset", err);
      if (err.response?.data?.code === '23503') {
        toast.error(
          err.response.data.message || 
          t('assets.assetCannotBeDeleted', { assetId: row.asset_id }),
          { duration: 5000 }
        );
      } else {
        const errorMessage = err.response?.data?.message || t('assets.failedToDeleteAsset');
        toast.error(translateErrorMessage(errorMessage));
      }
    }
  };

  const confirmDelete = async () => {
    if (selectedAsset) {
      // Single asset delete
      try {
        await API.delete(`/assets/${selectedAsset.asset_id}`);
        toast.success(t('assets.assetDeletedSuccessfully'));
        
        // Log delete action only when confirmed
        await recordActionByNameWithFetch('Delete', { assetId: selectedAsset.asset_id });
        
        setShowDeleteModal(false);
        setSelectedAsset(null);
        fetchAssets();
      } catch (err) {
        console.error("Failed to delete asset", err);
        if (err.response?.data?.code === '23503') {
          toast.error(
            err.response.data.message || 
            t('assets.assetCannotBeDeleted', { assetId: selectedAsset.asset_id }),
            { duration: 5000 }
          );
        } else {
          const errorMessage = err.response?.data?.message || t('assets.failedToDeleteAsset');
          toast.error(translateErrorMessage(errorMessage));
        }
      }
    } else if (selectedRows.length > 0) {
      // Bulk delete
      await confirmBulkDelete();
    }
  };

  const handleEdit = async (row) => {
    console.log("Edit asset:", row);
    setSelectedAsset(row);
    setUpdateModalOpen(true);
    
    // Note: Edit action logging removed - will log when actual update is saved
  };

  const handleUpdateModalClose = (wasUpdated) => {
    setUpdateModalOpen(false);
    setSelectedAsset(null);
    if (wasUpdated) {
      fetchAssets(); // Refresh the list if update was successful
    }
  };

  const handleDownload = async () => {
    try {
      // Get the filtered and sorted data
      const filteredData = filterData(data, filterValues, columns.filter(col => col.visible));
      const dataToExport = sortData(filteredData);

      // Export to Excel
      const success = exportToExcel(
        dataToExport,
        columns,
        'Assets_List'
      );

      if (success) {
        // Log export action
        await recordActionByNameWithFetch('Download', { count: dataToExport.length });
        
        toast(
          t('assets.assetsExportedSuccessfully'),
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
        t('assets.failedToExportAssets'),
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
    options: col.name === 'current_status' ? [
      { label: t('assets.active'), value: "Active" },
      { label: t('assets.inactive'), value: "Inactive" },
      { label: t('assets.disposed'), value: "Disposed" }
    ] : [],
    onChange: (value) => handleFilterChange(col.name, value),
  }));

  return (
    <div className="p-4">
      <ContentBox
        filters={filters}
        onFilterChange={handleFilterChange}
        onSort={handleSort}
        sortConfig={sortConfig}
        onAdd={hasCreateAccess ? async () => {
          // Log Create event when plus icon is clicked
          await recordActionByNameWithFetch('Create', { 
            action: t('assets.addAssetFormOpened')
          });
          navigate("/assets/add");
        } : undefined}
        onDeleteSelected={hasDeleteAccess ? handleDeleteSelected : undefined}
        onDownload={handleDownload}
        data={data}
        selectedRows={selectedRows}
        setSelectedRows={setSelectedRows}
        showAddButton={hasCreateAccess}
        showDeleteButton={hasDeleteAccess}
        isReadOnly={false}
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
                onDelete={hasDeleteAccess ? handleDelete : undefined}
                rowKey="asset_id"
                showCheckbox={hasEditAccess || hasDeleteAccess}
                showActions={true}
                isReadOnly={accessLevel === 'D'}
              />
              {updateModalOpen && (
                <UpdateAssetModal
                  isOpen={updateModalOpen}
                  onClose={handleUpdateModalClose}
                  assetData={selectedAsset}
                />
              )}
              
              {/* Delete confirmation modal removed - delete happens immediately */}
            </>
          );
        }}
      </ContentBox>
    </div>
  );
};

export default Assets;
