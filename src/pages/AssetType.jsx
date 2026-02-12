import { useEffect, useState } from "react";
import ContentBox from "../components/ContentBox";
import CustomTable from "../components/CustomTable";
import ChildItemsDropdown from "../components/ChildItemsDropdown";
import { filterData } from "../utils/filterData";
import { exportToExcel } from "../utils/exportToExcel";
import API from "../lib/axios";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import UpdateAssetTypeModal from "../components/UpdateAssetTypeModal";
import { useNavigation } from "../hooks/useNavigation";
import useAuditLog from "../hooks/useAuditLog";
import { ASSET_TYPES_APP_ID } from "../constants/assetTypesAuditEvents";
import { useLanguage } from "../contexts/LanguageContext";

const AssetType = () => {
  const navigate = useNavigate();
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
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
  const { hasEditAccess, getAccessLevel } = useNavigation();
  const canEdit = hasEditAccess('ASSETTYPES');
  const accessLevel = getAccessLevel('ASSETTYPES');
  const isReadOnly = accessLevel === 'D';

  // Initialize audit logging
  const { recordActionByNameWithFetch } = useAuditLog(ASSET_TYPES_APP_ID);
  
  // Language context
  const { t } = useLanguage();
  
  const [updateModalOpen, setUpdateModalOpen] = useState(false);
  const [selectedAssetType, setSelectedAssetType] = useState(null);

  // Create columns with translations
  const columns = [
    { label: t('assetTypes.assetTypeId'), name: "asset_type_id", visible: true },
    { label: t('assetTypes.assetTypeName'), name: "text", visible: true },
    { label: t('assetTypes.status'), name: "int_status", visible: true },
    { label: t('assetTypes.maintenanceSchedule'), name: "maintenance_schedule", visible: true },
    { label: t('assetTypes.assignmentType'), name: "assignment_type", visible: true },
    { label: t('assetTypes.inspectionRequired'), name: "inspection_required", visible: true },
    { label: t('assetTypes.groupRequired'), name: "group_required", visible: true },
    { label: t('assetTypes.type'), name: "type", visible: true },
    { label: t('assetTypes.parentAssetType'), name: "parent_asset_type", visible: true },
    { label: t('assetTypes.createdBy'), name: "created_by", visible: true },
    { label: t('assetTypes.createdOn'), name: "created_on", visible: true },
    { label: t('assetTypes.changedBy'), name: "changed_by", visible: true },
    { label: t('assetTypes.changedOn'), name: "changed_on", visible: true },
    { label: t('common.organizationId'), name: "org_id", visible: false },
    { label: t('assetTypes.externalId'), name: "ext_id", visible: false }
  ];

  const fetchAssetTypes = async () => {
    setIsLoading(true);
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
      toast.error(t('assetTypes.failedToFetchAssetTypes'));
    } finally {
      setIsLoading(false);
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
            errorMessage = error.response.data.error || t('assetTypes.cannotDeleteAssetType');
            errorDetails = error.response.data.details || '';
            errorHint = error.response.data.hint || '';
          } else if (error.response?.status === 404) {
            // Handle case where asset type was not found
            errorMessage = t('assetTypes.assetTypeNotFound');
            errorDetails = t('assetTypes.assetTypeNoLongerExists', { name: assetType.text });
          } else if (error.response?.status === 403) {
            // Handle permission errors
            errorMessage = t('assetTypes.permissionDenied');
            errorDetails = t('assetTypes.noPermissionToDelete');
          } else {
            // Handle unexpected errors
            errorMessage = t('assetTypes.unexpectedError');
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
        // Log delete action for successful deletions
        await recordActionByNameWithFetch('Delete', {
          assetTypeIds: successful.map(s => s.id),
          count: successful.length,
          action: `${successful.length} Asset Type(s) Deleted`
        });

        if (successful.length === 1) {
          toast(
            t('assetTypes.assetTypeDeletedSuccessfully', { name: successful[0].name }),
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
            t('assetTypes.assetTypesDeletedSuccessfully', { count: successful.length }),
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
          let errorMessage = t('assetTypes.failedToDeleteAssetType', { name: failure.name });
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

      setSelectedRows([]); // Clear selection
      fetchAssetTypes(); // Refresh the list
      return true; // Return success for ContentBox
    } catch (error) {
      console.error("Error in delete operation:", error);
      toast.error(t('assetTypes.unexpectedDeleteError'));
      return false; // Return failure for ContentBox
    }
  };

  const handleUpdateModalClose = (wasUpdated) => {
    setUpdateModalOpen(false);
    setSelectedAssetType(null);
    if (wasUpdated) {
      fetchAssetTypes(); // Refresh the list if update was successful
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
        'Asset_Types_List'
      );

      if (success) {
        // Log download action
        await recordActionByNameWithFetch('Download', {
          count: dataToExport.length,
          action: 'Asset Types Data Downloaded'
        });
        
        toast(
          t('assetTypes.assetTypesExportedSuccessfully'),
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
        throw new Error(t('assetTypes.exportFailed'));
      }
    } catch (error) {
      console.error('Error exporting data:', error);
      toast(
        t('assetTypes.failedToExportAssetTypes'),
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
      { label: t('assetTypes.active'), value: 'Active' },
      { label: t('assetTypes.inactive'), value: 'Inactive' }
    ] : col.name === 'maintenance_schedule' || col.name === 'inspection_required' || col.name === 'group_required' ? [
      { label: t('assetTypes.yes'), value: 'Yes' },
      { label: t('assetTypes.no'), value: 'No' }
    ] : col.name === 'assignment_type' ? [
      { label: t('assetTypes.userWise'), value: 'User-wise' },
      { label: t('assetTypes.departmentWise'), value: 'Department-wise' }
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
        onDeleteSelected={canEdit ? handleDeleteConfirm : null}
        onDownload={handleDownload}
        data={data}
        selectedRows={selectedRows}
        setSelectedRows={setSelectedRows}
        showAddButton={canEdit}
        showActions={true}
        isReadOnly={false}
      >
        {({ visibleColumns, showActions }) => {
          const filteredData = filterData(data, filterValues, visibleColumns);
          const sortedData = sortData(filteredData);

          if (isLoading) {
            const visibleCols = visibleColumns.filter((col) => col.visible);
            const colSpan = visibleCols.length + 1; // +1 for actions column
            return (
              <>
                <tr>
                  <td colSpan={colSpan} className="text-center py-16">
                    <div className="flex flex-col items-center justify-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                      <p className="text-gray-600">{t('common.loading')}</p>
                    </div>
                  </td>
                </tr>
                {updateModalOpen && (
                  <UpdateAssetTypeModal
                    isOpen={updateModalOpen}
                    onClose={handleUpdateModalClose}
                    assetData={selectedAssetType}
                    isReadOnly={isReadOnly}
                  />
                )}
              </>
            );
          }

          if (sortedData.length === 0) {
            const visibleCols = visibleColumns.filter((col) => col.visible);
            const colSpan = visibleCols.length + 1; // +1 for actions column
            return (
              <>
                <tr>
                  <td colSpan={colSpan} className="text-center py-16">
                    <div className="flex flex-col items-center justify-center">
                      <p className="text-xl font-semibold text-gray-800">
                        {t('common.noDataFound')}
                      </p>
                    </div>
                  </td>
                </tr>
                {updateModalOpen && (
                  <UpdateAssetTypeModal
                    isOpen={updateModalOpen}
                    onClose={handleUpdateModalClose}
                    assetData={selectedAssetType}
                    isReadOnly={isReadOnly}
                  />
                )}
              </>
            );
          }

          const renderAssetTypeCell = (col, row) => {
            // Asset Type ID column: dropdown for parent types to show child asset types
            if (col.name === "asset_type_id") {
              const childTypes = data.filter(
                (d) =>
                  (d.parent_asset_type_id || d._original?.parent_asset_type_id) === row.asset_type_id
              );
              return (
                <ChildItemsDropdown
                  childItems={childTypes}
                  renderChildItem={(item) => `${item.asset_type_id} - ${item.text || ""}`.trim()}
                  getChildKey={(item) => item.asset_type_id}
                  emptyMessage={t("assetTypes.noChildTypes")}
                >
                  {row.asset_type_id}
                </ChildItemsDropdown>
              );
            }
            // Asset Type Name column: same dropdown for consistency
            if (col.name === "text") {
              const childTypes = data.filter(
                (d) =>
                  (d.parent_asset_type_id || d._original?.parent_asset_type_id) === row.asset_type_id
              );
              if (childTypes.length > 0) {
                return (
                  <ChildItemsDropdown
                    childItems={childTypes}
                    renderChildItem={(item) => item.text || item.asset_type_id}
                    getChildKey={(item) => item.asset_type_id}
                    emptyMessage={t("assetTypes.noChildTypes")}
                  >
                    {row.text}
                  </ChildItemsDropdown>
                );
              }
            }
            return row[col.name];
          };

          return (
            <>
              <CustomTable
                columns={visibleColumns}
                visibleColumns={visibleColumns}
                data={sortedData}
                selectedRows={selectedRows}
                setSelectedRows={setSelectedRows}
                onEdit={handleEdit}
                rowKey="asset_type_id"
                showActions={true}
                isReadOnly={isReadOnly}
                renderCell={renderAssetTypeCell}
              />
              {updateModalOpen && (
                <UpdateAssetTypeModal
                  isOpen={updateModalOpen}
                  onClose={handleUpdateModalClose}
                  assetData={selectedAssetType}
                  isReadOnly={isReadOnly}
                />
              )}
            </>
          );
        }}
      </ContentBox>
    </div>
  );
};

export default AssetType;
