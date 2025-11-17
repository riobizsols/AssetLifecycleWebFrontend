import { useEffect, useState } from "react";
import ContentBox from "../../components/ContentBox";
import CustomTable from "../../components/CustomTable";
import EditBranchModal from "../../components/EditBranchModal";
import { filterData } from "../../utils/filterData";
import { exportToExcel } from "../../utils/exportToExcel";
import { useNavigate } from "react-router-dom";
import API from "../../lib/axios";
import { toast } from "react-hot-toast";
import { useNavigation } from "../../hooks/useNavigation";
import useAuditLog from "../../hooks/useAuditLog";
import { BRANCHES_APP_ID } from "../../constants/branchesAuditEvents";
import { useLanguage } from "../../contexts/LanguageContext";

const Branches = () => {
  const navigate = useNavigate();
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filterValues, setFilterValues] = useState({
    columnFilters: [],
    fromDate: "",
    toDate: ""
  });
  const [selectedRows, setSelectedRows] = useState([]);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingBranch, setEditingBranch] = useState(null);
  const [sortConfig, setSortConfig] = useState({
    sorts: []
  });
  
  // Access control
  const { hasEditAccess } = useNavigation();
  const canEdit = hasEditAccess('BRANCHES');

  // Initialize audit logging
  const { recordActionByNameWithFetch } = useAuditLog(BRANCHES_APP_ID);
  
  // Language context
  const { t } = useLanguage();

  // Create columns with translations
  const columns = [
    { label: t('branches.branchId'), name: "branch_id", visible: true },
    { label: t('branches.organizationId'), name: "org_id", visible: true },
    { label: t('branches.isActive'), name: "int_status", visible: true },
    { label: t('branches.branchName'), name: "text", visible: true },
    { label: t('branches.city'), name: "city", visible: true },
    { label: t('branches.branchCode'), name: "branch_code", visible: true },
    { label: t('branches.createdBy'), name: "created_by", visible: false },
    { label: t('branches.extId'), name: "ext_id", visible: false },
    { label: t('branches.createdOn'), name: "created_on", visible: false },
    { label: t('branches.changedBy'), name: "changed_by", visible: false },
    { label: t('branches.changedOn'), name: "changed_on", visible: false },
  ];

  useEffect(() => {
    const fetchBranches = async () => {
      setIsLoading(true);
      try {
        const response = await API.get("/branches");
        const formattedData = response.data.map(item => ({
          ...item,
          int_status: item.int_status === 1 ? 'Active' : 'Inactive',
          created_on: item.created_on ? new Date(item.created_on).toLocaleString() : '',
          changed_on: item.changed_on ? new Date(item.changed_on).toLocaleString() : ''
        }));
        setData(formattedData);
      } catch (error) {
        console.error("Error fetching branches:", error);
        toast.error(t('branches.failedToFetchBranches'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchBranches();
  }, []);

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

        if (aValue == null) return 1;
        if (bValue == null) return -1;

        if (!isNaN(aValue) && !isNaN(bValue)) {
          const diff = direction === 'asc' ? aValue - bValue : bValue - aValue;
          if (diff !== 0) return diff;
        } else {
          const diff = direction === 'asc' 
            ? String(aValue).localeCompare(String(bValue))
            : String(bValue).localeCompare(String(aValue));
          if (diff !== 0) return diff;
        }
      }
      return 0;
    });
  };

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

  const handleEdit = (branch) => {
    setEditingBranch(branch);
    setShowEditModal(true);
  };

  const handleUpdateBranch = async (formData) => {
    try {
      const response = await API.put(`/branches/${editingBranch.branch_id}`, formData);
      
      // Log update action
      await recordActionByNameWithFetch('Update', {
        branchId: editingBranch.branch_id,
        branchName: formData.text || editingBranch.text,
        branchCode: formData.branch_code || editingBranch.branch_code,
        city: formData.city || editingBranch.city,
        orgId: formData.org_id || editingBranch.org_id,
        action: 'Branch Updated'
      });
      
      // Update the data state with the updated branch
      setData(prev => prev.map(branch => 
        branch.branch_id === editingBranch.branch_id 
          ? { ...branch, ...response.data.data }
          : branch
      ));
      
      setShowEditModal(false);
      setEditingBranch(null);
      toast.success(t('branches.branchUpdatedSuccessfully'));
    } catch (error) {
      console.error("Error updating branch:", error);
      const errorMessage = error.response?.data?.message || error.response?.data?.error || t('branches.failedToUpdateBranch');
      toast.error(errorMessage);
    }
  };

  const handleDeleteSelected = async () => {
    try {
      await API.delete("/branches", {
        data: { ids: selectedRows },
      });

      // Log delete action
      await recordActionByNameWithFetch('Delete', {
        branchIds: selectedRows,
        count: selectedRows.length,
        action: `${selectedRows.length} Branch(es) Deleted`
      });

      // Update the data state to remove deleted branches
      setData((prev) =>
        prev.filter((branch) => !selectedRows.includes(branch.branch_id))
      );
      setSelectedRows([]);
      toast.success(t('branches.branchesDeletedSuccessfully', { count: selectedRows.length }));
    } catch (error) {
      console.error("Error deleting branches:", error);
      const errorMessage = error.response?.data?.error || t('branches.failedToDeleteBranches');
      toast.error(errorMessage);
    }
  };

  const handleDownload = async () => {
    try {
      const filteredData = filterData(data, filterValues, columns.filter(col => col.visible));
      const sortedData = sortData(filteredData);
      const success = exportToExcel(sortedData, columns, "Branches_List");
      if (success) {
        // Log download action
        await recordActionByNameWithFetch('Download', {
          count: sortedData.length,
          action: 'Branches Data Downloaded'
        });
        
        toast(t('branches.branchesExportedSuccessfully'), { icon: '✅' });
      } else {
        throw new Error(t('branches.exportFailed'));
      }
    } catch (error) {
      console.error('Error downloading branches:', error);
      toast(t('branches.failedToExportBranches'), { icon: '❌' });
    }
  };

  const filters = columns.map((col) => ({
    label: col.label,
    name: col.name,
    options: col.name === 'int_status' ? [
      { label: t('branches.active'), value: "Active" },
      { label: t('branches.inactive'), value: "Inactive" }
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
        onAdd={canEdit ? async () => {
          // Log create action when Add button is clicked
          await recordActionByNameWithFetch('Create', {
            action: 'Add Branch Form Opened'
          });
          navigate("/master-data/branches/add");
        } : null}
        onDeleteSelected={canEdit ? handleDeleteSelected : null}
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

          if (isLoading) {
            const visibleCols = visibleColumns.filter((col) => col.visible);
            const colSpan = visibleCols.length + (canEdit ? 1 : 0);
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
                <EditBranchModal
                  show={showEditModal}
                  onClose={() => {
                    setShowEditModal(false);
                    setEditingBranch(null);
                  }}
                  onConfirm={handleUpdateBranch}
                  branch={editingBranch}
                />
              </>
            );
          }

          if (sortedData.length === 0) {
            const visibleCols = visibleColumns.filter((col) => col.visible);
            const colSpan = visibleCols.length + (canEdit ? 1 : 0);
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
                <EditBranchModal
                  show={showEditModal}
                  onClose={() => {
                    setShowEditModal(false);
                    setEditingBranch(null);
                  }}
                  onConfirm={handleUpdateBranch}
                  branch={editingBranch}
                />
              </>
            );
          }

          return (
            <>
              <CustomTable
                columns={visibleColumns}
                visibleColumns={visibleColumns}
                data={sortedData}
                selectedRows={selectedRows}
                setSelectedRows={setSelectedRows}
                onEdit={canEdit ? handleEdit : null}
                rowKey="branch_id"
                showActions={canEdit}
              />
              <EditBranchModal
                show={showEditModal}
                onClose={() => {
                  setShowEditModal(false);
                  setEditingBranch(null);
                }}
                onConfirm={handleUpdateBranch}
                branch={editingBranch}
              />
            </>
          );
        }}
      </ContentBox>
    </div>
  );
};

export default Branches;