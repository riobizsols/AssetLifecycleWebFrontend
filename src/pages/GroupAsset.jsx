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


  // Mock data for demonstration - replace with actual API calls
  const mockGroupAssets = [
    {
      group_id: 'GRP001',
      group_name: 'Laptop Group',
      asset_type_id: 'AT001',
      asset_type_name: 'Laptop',
      asset_type_code: 'AT001',
      asset_count: 3,
      created_by: 'Admin User',
      created_date: '2024-01-15',
      status: 'Active'
    },
    {
      group_id: 'GRP002',
      group_name: 'Monitor Group',
      asset_type_id: 'AT003',
      asset_type_name: 'Monitor',
      asset_type_code: 'AT003',
      asset_count: 2,
      created_by: 'Admin User',
      created_date: '2024-01-20',
      status: 'Active'
    },
    {
      group_id: 'GRP003',
      group_name: 'Printer Group',
      asset_type_id: 'AT004',
      asset_type_name: 'Printer',
      asset_type_code: 'AT004',
      asset_count: 2,
      created_by: 'Admin User',
      created_date: '2024-02-01',
      status: 'Active'
    }
  ];

  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      setGroupAssets(mockGroupAssets);
      setLoading(false);
    }, 1000);
  }, []);

  const columns = [
    { key: 'group_id', name: 'group_id', label: 'Group ID', sortable: true, visible: true },
    { key: 'group_name', name: 'group_name', label: 'Group Name', sortable: true, visible: true },
    { key: 'asset_type_code', name: 'asset_type_code', label: 'Asset Type', sortable: true, visible: true },
    { key: 'asset_count', name: 'asset_count', label: 'Asset Count', sortable: true, visible: true },
    { key: 'created_by', name: 'created_by', label: 'Created By', sortable: true, visible: true },
    { key: 'created_date', name: 'created_date', label: 'Created Date', sortable: true, visible: true },
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

  const handleDelete = (row) => {
    // Implement delete functionality
    console.log('Delete group asset:', row);
    toast.info('Delete functionality to be implemented');
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
      <ContentBox
        filters={filters}
        onFilterChange={handleFilterChange}
        onSort={handleSort}
        sortConfig={sortConfig}
                 onAdd={handleAddGroupAsset}
        onDeleteSelected={handleDelete}
        data={groupAssets}
        selectedRows={selectedRows}
        setSelectedRows={setSelectedRows}
      >
        {({ visibleColumns }) => {
          const filteredData = filterData(groupAssets, filterValues, visibleColumns);
          const sortedData = sortData(filteredData);

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

      
    </div>
  );
};

export default GroupAsset; 