import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import API from '../lib/axios';
import { toast } from 'react-hot-toast';
import { Plus } from 'lucide-react';
import ContentBox from '../components/ContentBox';
import CustomTable from '../components/CustomTable';

const GroupAsset = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [groupAssets, setGroupAssets] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch asset groups from API
  const fetchAssetGroups = async () => {
    try {
      setLoading(true);
      const response = await API.get('/asset-groups');
      
      if (response.data && Array.isArray(response.data)) {
        // Transform the backend data to match table structure
        const transformedData = response.data.map(group => ({
          group_id: group.assetgroup_h_id,
          group_name: group.text,
          org_id: group.org_id,
          asset_count: group.asset_count,
          created_by: group.created_by,
          created_date: new Date(group.created_on).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          }),
          changed_by: group.changed_by,
          changed_date: new Date(group.changed_on).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          }),
          status: 'Active' // Default status since backend doesn't provide this
        }));
        
        setGroupAssets(transformedData);
      } else {
        setGroupAssets([]);
        toast.error('Failed to fetch asset groups');
      }
    } catch (error) {
      console.error('Error fetching asset groups:', error);
      toast.error('Failed to fetch asset groups');
      setGroupAssets([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssetGroups();
  }, []);

  const columns = [
    { key: 'group_id', name: 'group_id', label: 'Group ID', sortable: true, visible: true },
    { key: 'group_name', name: 'group_name', label: 'Group Name', sortable: true, visible: true },
    { key: 'org_id', name: 'org_id', label: 'Organization', sortable: true, visible: true },
    { key: 'asset_count', name: 'asset_count', label: 'Asset Count', sortable: true, visible: true },
    { key: 'created_by', name: 'created_by', label: 'Created By', sortable: true, visible: true },
    { key: 'created_date', name: 'created_date', label: 'Created Date', sortable: true, visible: true },
    { key: 'changed_by', name: 'changed_by', label: 'Modified By', sortable: true, visible: true },
    { key: 'changed_date', name: 'changed_date', label: 'Modified Date', sortable: true, visible: true },
    { key: 'status', name: 'status', label: 'Status', sortable: true, visible: true }
  ];

  const handleAddGroupAsset = () => {
    navigate('/group-asset/create');
  };

  const handleView = (row) => {
    // Navigate to view page
    navigate(`/group-asset/view/${row.group_id}`);
  };

  const handleEdit = (row) => {
    // Navigate to edit page with group data
    navigate(`/group-asset/edit/${row.group_id}`, { 
      state: { 
        groupData: row,
        isEdit: true 
      } 
    });
  };

  const handleDelete = async (row) => {
    try {
      await API.delete(`/asset-groups/${row.group_id}`);
      toast.success('Asset group deleted successfully');
      // Refresh the data
      fetchAssetGroups();
    } catch (error) {
      console.error('Error deleting asset group:', error);
      toast.error('Failed to delete asset group');
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedRows.length === 0) {
      toast.error('Please select asset groups to delete');
      return;
    }

    try {
      // Delete each selected asset group
      const deletePromises = selectedRows.map(rowId => 
        API.delete(`/asset-groups/${rowId}`)
      );
      
      await Promise.all(deletePromises);
      toast.success(`${selectedRows.length} asset group(s) deleted successfully`);
      
      // Clear selection and refresh data
      setSelectedRows([]);
      fetchAssetGroups();
    } catch (error) {
      console.error('Error deleting selected asset groups:', error);
      toast.error('Failed to delete some asset groups');
    }
  };


  const [selectedRows, setSelectedRows] = useState([]);
  const [filterValues, setFilterValues] = useState({});
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  const handleSort = (column) => {
    setSortConfig(prev => ({
      key: column,
      direction: prev.key === column && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const sortData = (data) => {
    if (!sortConfig.key) return data;
    
    return [...data].sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];
      
      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  };

  const filterData = (data, filters, visibleColumns) => {
    return data.filter(item => {
      return Object.keys(filters).every(key => {
        const filterValue = filters[key];
        if (!filterValue || filterValue === '') return true;
        
        const itemValue = item[key];
        if (itemValue === null || itemValue === undefined) return false;
        
        return itemValue.toString().toLowerCase().includes(filterValue.toString().toLowerCase());
      });
    });
  };

  const handleFilterChange = (filterType, value) => {
    setFilterValues(prev => ({
      ...prev,
      [filterType]: value
    }));
  };

  const filters = columns.map((col) => ({
    label: col.label,
    name: col.name,
    options: col.name === 'status' ? [
      { label: "Active", value: "Active" },
      { label: "Inactive", value: "Inactive" }
    ] : [],
    onChange: (value) => handleFilterChange(col.name, value),
  }));

  return (
    <div className="p-4">
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading asset groups...</p>
          </div>
        </div>
      ) : (
        <ContentBox
          filters={filters}
          onFilterChange={handleFilterChange}
          onSort={handleSort}
          sortConfig={sortConfig}
          onAdd={handleAddGroupAsset}
          onDeleteSelected={handleDeleteSelected}
          data={groupAssets}
          selectedRows={selectedRows}
          setSelectedRows={setSelectedRows}
          subtitle={`${groupAssets.length} asset group(s) found`}
        >
          {({ visibleColumns }) => {
            const filteredData = filterData(groupAssets, filterValues, visibleColumns);
            const sortedData = sortData(filteredData);

            if (filteredData.length === 0 && Object.keys(filterValues).some(key => filterValues[key])) {
              return (
                <div className="text-center py-8">
                  <p className="text-gray-500">No asset groups match the current filters.</p>
                  <button
                    onClick={() => setFilterValues({})}
                    className="mt-2 text-blue-600 hover:text-blue-800 underline"
                  >
                    Clear all filters
                  </button>
                </div>
              );
            }

            if (sortedData.length === 0) {
              return (
                <div className="text-center py-8">
                  <p className="text-gray-500">No asset groups found.</p>
                  <button
                    onClick={handleAddGroupAsset}
                    className="mt-2 text-blue-600 hover:text-blue-800 underline"
                  >
                    Create your first asset group
                  </button>
                </div>
              );
            }

            return (
              <CustomTable
                columns={visibleColumns}
                visibleColumns={visibleColumns}
                data={sortedData}
                selectedRows={selectedRows}
                setSelectedRows={setSelectedRows}
                onView={handleView}
                onEdit={handleEdit}
                onDelete={handleDelete}
                rowKey="group_id"
              />
            );
          }}
        </ContentBox>
      )}
    </div>
  );
};

export default GroupAsset; 