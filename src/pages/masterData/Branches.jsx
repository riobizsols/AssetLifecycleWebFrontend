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

const Branches = () => {
  const navigate = useNavigate();
  const [data, setData] = useState([]);
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

  const [columns] = useState([
    { label: "Branch ID", name: "branch_id", visible: true },
    { label: "Organization ID", name: "org_id", visible: true },
    { label: "Is Active", name: "int_status", visible: true },
    { label: "Branch Name", name: "text", visible: true },
    { label: "City", name: "city", visible: true },
    { label: "Branch Code", name: "branch_code", visible: true },
    { label: "Created By", name: "created_by", visible: false },
    { label: "Ext ID", name: "ext_id", visible: false },
    { label: "Created On", name: "created_on", visible: false },
    { label: "Changed By", name: "changed_by", visible: false },
    { label: "Changed On", name: "changed_on", visible: false },
  ]);

  useEffect(() => {
    const fetchBranches = async () => {
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
        toast.error("Failed to fetch branches");
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
      
      // Update the data state with the updated branch
      setData(prev => prev.map(branch => 
        branch.branch_id === editingBranch.branch_id 
          ? { ...branch, ...response.data.data }
          : branch
      ));
      
      setShowEditModal(false);
      setEditingBranch(null);
      toast.success("Branch updated successfully");
    } catch (error) {
      console.error("Error updating branch:", error);
      const errorMessage = error.response?.data?.message || error.response?.data?.error || "Failed to update branch";
      toast.error(errorMessage);
    }
  };

  const handleDeleteSelected = async () => {
    try {
      await API.delete("/branches", {
        data: { ids: selectedRows },
      });

      // Update the data state to remove deleted branches
      setData((prev) =>
        prev.filter((branch) => !selectedRows.includes(branch.branch_id))
      );
      setSelectedRows([]);
      toast.success(`${selectedRows.length} branch(es) deleted successfully`);
    } catch (error) {
      console.error("Error deleting branches:", error);
      const errorMessage = error.response?.data?.error || "Failed to delete branches";
      toast.error(errorMessage);
    }
  };

  const handleDownload = () => {
    try {
      const filteredData = filterData(data, filterValues, columns.filter(col => col.visible));
      const sortedData = sortData(filteredData);
      const success = exportToExcel(sortedData, columns, "Branches_List");
      if (success) {
        toast('Branches exported successfully', { icon: '✅' });
      } else {
        throw new Error('Export failed');
      }
    } catch (error) {
      toast('Failed to export branches', { icon: '❌' });
    }
  };

  const filters = columns.map((col) => ({
    label: col.label,
    name: col.name,
    options: col.name === 'int_status' ? [
      { label: "Active", value: "Active" },
      { label: "Inactive", value: "Inactive" }
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
        onAdd={canEdit ? () => navigate("/master-data/add-branch") : null}
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