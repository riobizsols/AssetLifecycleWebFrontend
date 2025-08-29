import { useEffect, useState } from "react";
import ContentBox from "../components/ContentBox";
import CustomTable from "../components/CustomTable";
import { filterData } from "../utils/filterData";
import { exportToExcel } from "../utils/exportToExcel";
import API from "../lib/axios";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import UpdateAssetTypeModal from "../components/UpdateAssetTypeModal";
import DeleteConfirmModal from "../components/DeleteConfirmModal";
import { useNavigation } from "../hooks/useNavigation";

const AssetType = () => {
  const navigate = useNavigate();
  const [data, setData] = useState([]);
  const [filterValues, setFilterValues] = useState({
    columnFilters: [],
    fromDate: '',
    toDate: ''
  });
  const [selectedRows, setSelectedRows] = useState([]);
  const [sortConfig, setSortConfig] = useState({
    sorts: []
  });
  
  // Access control
  const { hasEditAccess } = useNavigation();
  const canEdit = hasEditAccess('ASSETTYPES');
  
  const [updateModalOpen, setUpdateModalOpen] = useState(false);
  const [selectedAssetType, setSelectedAssetType] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const [columns] = useState([
    { label: "Asset Type ID", name: "asset_type_id", visible: true },
    { label: "Asset Type Name", name: "text", visible: true },
    { label: "Status", name: "int_status", visible: true },
    { label: "Maintenance Schedule", name: "maintenance_schedule", visible: true },
    { label: "Assignment Type", name: "assignment_type", visible: true },
    { label: "Inspection Required", name: "inspection_required", visible: true },
    { label: "Group Required", name: "group_required", visible: true },
    { label: "Type", name: "type", visible: true },
    { label: "Parent Asset Type", name: "parent_asset_type", visible: true },
    { label: "Created By", name: "created_by", visible: true },
    { label: "Created On", name: "created_on", visible: true },
    { label: "Changed By", name: "changed_by", visible: true },
    { label: "Changed On", name: "changed_on", visible: true },
    { label: "Organization ID", name: "org_id", visible: false },
    { label: "External ID", name: "ext_id", visible: false }
  ]);

  const fetchAssetTypes = async () => {
    try {
      const res = await API.get("/asset-types");
      
      // Create a map of asset types for parent lookup
      const assetTypeMap = res.data.reduce((map, type) => {
        map[type.asset_type_id] = type.text;
        return map;
      }, {});

      // Store original data for edit modal
      const formattedData = res.data.map(item => {
        const displayData = {
          ...item,
          int_status: item.int_status === 1 ? 'Active' : 'Inactive',
          assignment_type: item.assignment_type === 'user' ? 'User-wise' : 'Department-wise',
          group_required: item.group_required ? 'Yes' : 'No',
          inspection_required: item.inspection_required ? 'Yes' : 'No',
          maintenance_schedule: Number(item.maintenance_schedule) === 1 ? 'Yes' : 'No',
          created_on: item.created_on ? new Date(item.created_on).toLocaleString() : '',
          changed_on: item.changed_on ? new Date(item.changed_on).toLocaleString() : '',
          type: item.is_child ? 'Child' : 'Parent',
          parent_asset_type: item.parent_asset_type_id ? assetTypeMap[item.parent_asset_type_id] : '-',
          // Store original data for edit modal
          _original: { ...item }
        };
        return displayData;
      });
      setData(formattedData);
    } catch (err) {
      console.error("Failed to fetch asset types:", err);
      toast.error("Failed to fetch asset types");
    }
  };

  useEffect(() => {
    fetchAssetTypes();
  }, []);

  const handleFilterChange = (filterType, value) => {
    setFilterValues(prev => {
      if (filterType === 'columnFilters') {
        return {
          ...prev,
          columnFilters: value
        };
      } else if (filterType === 'fromDate' || filterType === 'toDate') {
        return {
          ...prev,
          [filterType]: value
        };
      } else {
        return {
          ...prev,
          [filterType]: value
        };
      }
    });
  };

  const handleSort = (column) => {
    setSortConfig(prevConfig => {
      const { sorts } = prevConfig;
      const existingSort = sorts.find(s => s.column === column);
      
      if (!existingSort) {
        // First click - add ascending sort
        return {
          sorts: [...sorts, { column, direction: 'asc', order: sorts.length + 1 }]
        };
      } else if (existingSort.direction === 'asc') {
        // Second click - change to descending
        return {
          sorts: sorts.map(s => 
            s.column === column 
              ? { ...s, direction: 'desc' }
              : s
          )
        };
      } else {
        // Third click - remove sort
        return {
          sorts: sorts.filter(s => s.column !== column).map((s, idx) => ({
            ...s,
            order: idx + 1
          }))
        };
      }
    });
  };

  const sortData = (data) => {
    if (!sortConfig.sorts.length) return data;

    return [...data].sort((a, b) => {
      for (const { column, direction } of sortConfig.sorts) {
        const aValue = a[column];
        const bValue = b[column];

        if (aValue < bValue) return direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  };

  const handleEdit = (row) => {
    // Use original data for edit modal
    setSelectedAssetType(row._original || row);
    setUpdateModalOpen(true);
  };

  const handleDeleteClick = () => {
    if (selectedRows.length === 0) {
      toast.error('Please select asset types to delete');
      return;
    }
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    try {
      // Get the full asset type data for each selected ID
      const selectedAssetTypes = data.filter(item => selectedRows.includes(item.asset_type_id));
      
      // Sequential deletion to handle errors better
      const results = [];
      for (const assetType of selectedAssetTypes) {
        try {
          await API.delete(`/asset-types/${assetType.asset_type_id}`);
          results.push({ success: true, id: assetType.asset_type_id, name: assetType.text });
        } catch (error) {
          // Handle specific error cases
          let errorMessage = '';
          let errorDetails = '';
          let errorHint = '';

          if (error.response?.status === 400) {
            // Handle case where asset type is in use
            errorMessage = error.response.data.error || 'Cannot delete this asset type';
            errorDetails = error.response.data.details || '';
            errorHint = error.response.data.hint || '';
          } else if (error.response?.status === 404) {
            // Handle case where asset type was not found
            errorMessage = 'Asset type not found';
            errorDetails = `The asset type "${assetType.text}" no longer exists. The list will be refreshed.`;
          } else if (error.response?.status === 403) {
            // Handle permission errors
            errorMessage = 'Permission denied';
            errorDetails = 'You do not have permission to delete this asset type.';
          } else {
            // Handle unexpected errors
            errorMessage = 'An unexpected error occurred';
            errorDetails = error.response?.data?.error || error.message;
          }

          results.push({ 
            success: false, 
            id: assetType.asset_type_id, 
            name: assetType.text,
            error: errorMessage,
            details: errorDetails,
            hint: errorHint
          });
        }
      }

      // Check results and show appropriate notifications
      const successful = results.filter(r => r.success);
      const failed = results.filter(r => !r.success);

      if (successful.length > 0) {
        if (successful.length === 1) {
          toast(
            `Successfully deleted asset type "${successful[0].name}"`,
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
          toast(
            `Successfully deleted ${successful.length} asset types`,
            {
              icon: '✅',
              style: {
                borderRadius: '8px',
                background: '#064E3B',
                color: '#fff',
              },
            }
          );
        }
      }

      if (failed.length > 0) {
        failed.forEach(failure => {
          let errorMessage = `Failed to delete "${failure.name}"`;
          if (failure.error) errorMessage += `\n${failure.error}`;
          if (failure.details) errorMessage += `\n${failure.details}`;
          if (failure.hint) errorMessage += `\n\nHint: ${failure.hint}`;

          toast(
            errorMessage,
            {
              icon: '❌',
              style: {
                borderRadius: '8px',
                background: '#7F1D1D',
                color: '#fff',
              },
              duration: 5000,
            }
          );
        });
      }

      setShowDeleteModal(false);
      setSelectedRows([]); // Clear selection
      fetchAssetTypes(); // Refresh the list
    } catch (error) {
      console.error("Error in delete operation:", error);
      toast.error("An unexpected error occurred while deleting asset types. Please try again.");
      setShowDeleteModal(false);
    }
  };

  const handleUpdateModalClose = (wasUpdated) => {
    setUpdateModalOpen(false);
    setSelectedAssetType(null);
    if (wasUpdated) {
      fetchAssetTypes(); // Refresh the list if update was successful
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
        'Asset_Types_List'
      );

      if (success) {
        toast(
          'Asset types exported successfully',
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
        'Failed to export asset types',
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

  const filters = columns.map((col) => ({
    label: col.label,
    name: col.name,
    options: col.name === 'int_status' ? [
      { label: "Active", value: "Active" },
      { label: "Inactive", value: "Inactive" }
    ] : col.name === 'maintenance_schedule' || col.name === 'inspection_required' || col.name === 'group_required' ? [
      { label: "Yes", value: "Yes" },
      { label: "No", value: "No" }
    ] : col.name === 'assignment_type' ? [
      { label: "User-wise", value: "User-wise" },
      { label: "Department-wise", value: "Department-wise" }
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
        onAdd={canEdit ? () => navigate('/master-data/asset-types/add') : null}
        onDeleteSelected={canEdit ? handleDeleteClick : null}
        onDownload={handleDownload}
        data={data}
        selectedRows={selectedRows}
        setSelectedRows={setSelectedRows}
        showAddButton={canEdit}
        showActions={canEdit}
      >
        {({ visibleColumns }) => {
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
                onEdit={canEdit ? handleEdit : null}
                rowKey="asset_type_id"
                showActions={canEdit}
              />
              {updateModalOpen && (
                <UpdateAssetTypeModal
                  isOpen={updateModalOpen}
                  onClose={handleUpdateModalClose}
                  assetData={selectedAssetType}
                />
              )}
              <DeleteConfirmModal
                show={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                onConfirm={handleDeleteConfirm}
                message={
                  selectedRows.length === 1
                    ? `Do you want to delete the selected asset type?`
                    : `Do you want to delete ${selectedRows.length} selected asset types?`
                }
              />
            </>
          );
        }}
      </ContentBox>
    </div>
  );
};

export default AssetType;
