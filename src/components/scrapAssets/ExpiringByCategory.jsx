import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import API from '../../lib/axios';
import { toast } from 'react-hot-toast';
import { Plus, ArrowLeft, BarChart3 } from 'lucide-react';
import ContentBox from '../ContentBox';
import CustomTable from '../CustomTable';

const ExpiringByCategory = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [scrapAssets, setScrapAssets] = useState([]);
  const [loading, setLoading] = useState(true);

  // Mock data for assets expiring by category
  const mockExpiringByCategoryAssets = [
    {
      scrap_asset_id: 'SA016',
      asset_id: 'A016',
      asset_name: 'Dell Latitude',
      asset_type: 'Laptop',
      category: 'Computers',
      department: 'IT Department',
      assigned_to: 'Alex Johnson',
      scrap_date: '2024-03-15',
      scrap_reason: 'Performance Issues',
      estimated_value: 600,
      disposal_method: 'Sale',
      status: 'Expiring Soon',
      days_remaining: 10,
      created_by: 'Admin User',
      created_date: '2024-02-28'
    },
    {
      scrap_asset_id: 'SA017',
      asset_id: 'A017',
      asset_name: 'HP EliteBook',
      asset_type: 'Laptop',
      category: 'Computers',
      department: 'Engineering',
      assigned_to: 'Sarah Wilson',
      scrap_date: '2024-03-20',
      scrap_reason: 'Hardware Failure',
      estimated_value: 450,
      disposal_method: 'Recycle',
      status: 'Expiring Soon',
      days_remaining: 15,
      created_by: 'Admin User',
      created_date: '2024-02-28'
    },
    {
      scrap_asset_id: 'SA018',
      asset_id: 'A018',
      asset_name: 'Office Desk',
      asset_type: 'Furniture',
      category: 'Furniture',
      department: 'HR Department',
      assigned_to: 'Mike Davis',
      scrap_date: '2024-03-25',
      scrap_reason: 'Worn Out',
      estimated_value: 200,
      disposal_method: 'Donation',
      status: 'Expiring Soon',
      days_remaining: 20,
      created_by: 'Admin User',
      created_date: '2024-02-28'
    },
    {
      scrap_asset_id: 'SA019',
      asset_id: 'A019',
      asset_name: 'Conference Chair',
      asset_type: 'Furniture',
      category: 'Furniture',
      department: 'Sales',
      assigned_to: 'Lisa Chen',
      scrap_date: '2024-03-30',
      scrap_reason: 'Damaged',
      estimated_value: 150,
      disposal_method: 'Recycle',
      status: 'Expiring Soon',
      days_remaining: 25,
      created_by: 'Admin User',
      created_date: '2024-02-28'
    },
    {
      scrap_asset_id: 'SA020',
      asset_id: 'A020',
      asset_name: 'Company Van',
      asset_type: 'Vehicle',
      category: 'Vehicles',
      department: 'Logistics',
      assigned_to: 'Tom Brown',
      scrap_date: '2024-04-05',
      scrap_reason: 'High Mileage',
      estimated_value: 3000,
      disposal_method: 'Sale',
      status: 'Expiring Soon',
      days_remaining: 30,
      created_by: 'Admin User',
      created_date: '2024-02-28'
    },
    {
      scrap_asset_id: 'SA021',
      asset_id: 'A021',
      asset_name: 'Industrial Drill',
      asset_type: 'Machinery',
      category: 'Machinery',
      department: 'Operations',
      assigned_to: 'David Miller',
      scrap_date: '2024-04-10',
      scrap_reason: 'End of Life',
      estimated_value: 800,
      disposal_method: 'Sale',
      status: 'Expiring Soon',
      days_remaining: 35,
      created_by: 'Admin User',
      created_date: '2024-02-28'
    }
  ];

  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      setScrapAssets(mockExpiringByCategoryAssets);
      setLoading(false);
    }, 1000);
  }, []);

  const columns = [
    { key: 'scrap_asset_id', name: 'scrap_asset_id', label: 'Scrap Asset ID', sortable: true, visible: true },
    { key: 'asset_id', name: 'asset_id', label: 'Asset ID', sortable: true, visible: true },
    { key: 'asset_name', name: 'asset_name', label: 'Asset Name', sortable: true, visible: true },
    { key: 'category', name: 'category', label: 'Category', sortable: true, visible: true },
    { key: 'asset_type', name: 'asset_type', label: 'Asset Type', sortable: true, visible: true },
    { key: 'department', name: 'department', label: 'Department', sortable: true, visible: true },
    { key: 'assigned_to', name: 'assigned_to', label: 'Assigned To', sortable: true, visible: true },
    { key: 'scrap_date', name: 'scrap_date', label: 'Scrap Date', sortable: true, visible: true },
    { key: 'days_remaining', name: 'days_remaining', label: 'Days Remaining', sortable: true, visible: true },
    { key: 'scrap_reason', name: 'scrap_reason', label: 'Scrap Reason', sortable: true, visible: true },
    { key: 'estimated_value', name: 'estimated_value', label: 'Estimated Value', sortable: true, visible: true },
    { key: 'disposal_method', name: 'disposal_method', label: 'Disposal Method', sortable: true, visible: true },
    { key: 'status', name: 'status', label: 'Status', sortable: true, visible: true },
    { key: 'created_by', name: 'created_by', label: 'Created By', sortable: true, visible: true },
    { key: 'created_date', name: 'created_date', label: 'Created Date', sortable: true, visible: true }
  ];

  const handleAddScrapAsset = () => {
    navigate('/scrap-assets/create');
  };

  const handleView = (row) => {
    navigate(`/scrap-assets/view/${row.scrap_asset_id}`);
  };

  const handleEdit = (row) => {
    navigate(`/scrap-assets/edit/${row.scrap_asset_id}`, {
      state: {
        scrapAssetData: row,
        isEdit: true
      }
    });
  };

  const handleDelete = (row) => {
    console.log('Delete scrap asset:', row);
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

      if (aValue < bValue) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  };

  const filterData = (data, filters, visibleColumns) => {
    return data.filter(item => {
      return visibleColumns.every(column => {
        const filterValue = filters[column.key];
        if (!filterValue) return true;

        const itemValue = String(item[column.key] || '').toLowerCase();
        return itemValue.includes(filterValue.toLowerCase());
      });
    });
  };

  const handleFilterChange = (filterType, value) => {
    setFilterValues(prev => ({
      ...prev,
      [filterType]: value
    }));
  };

  const visibleColumns = columns.filter(col => col.visible);
  const filteredData = filterData(scrapAssets, filterValues, visibleColumns);
  const sortedData = sortData(filteredData);

  return (
    <div className="min-h-screen bg-gray-50">
      <ContentBox>
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/scrap-assets')}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
              title="Back to Dashboard"
            >
              <ArrowLeft size={20} />
            </button>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-full">
                <BarChart3 className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Expiring Assets by Category</h1>
                <p className="text-sm text-gray-600">Assets expiring soon grouped by category</p>
              </div>
            </div>
          </div>
          <button
            onClick={handleAddScrapAsset}
            className="px-4 py-2 bg-[#0E2F4B] text-white rounded-md hover:bg-[#143d65] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0E2F4B] flex items-center gap-2"
          >
            <Plus size={16} />
            Add Scrap Asset
          </button>
        </div>

        <CustomTable
          data={sortedData}
          columns={columns}
          loading={loading}
          onView={handleView}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onSort={handleSort}
          sortConfig={sortConfig}
          onFilterChange={handleFilterChange}
          filterValues={filterValues}
          selectedRows={selectedRows}
          setSelectedRows={setSelectedRows}
          title="Expiring Assets by Category"
        />
      </ContentBox>
    </div>
  );
};

export default ExpiringByCategory; 