import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import API from '../../lib/axios';
import { toast } from 'react-hot-toast';
import { Plus, ArrowLeft, XCircle } from 'lucide-react';
import ContentBox from '../ContentBox';
import CustomTable from '../CustomTable';

const ExpiredAssets = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [scrapAssets, setScrapAssets] = useState([]);
  const [loading, setLoading] = useState(true);

  // Mock data for expired assets
  const mockExpiredAssets = [
    {
      scrap_asset_id: 'SA011',
      asset_id: 'A011',
      asset_name: 'Lenovo ThinkPad',
      asset_type: 'Laptop',
      department: 'Engineering',
      assigned_to: 'Sam Wilson',
      scrap_date: '2024-01-10',
      scrap_reason: 'Hardware Failure',
      estimated_value: 350,
      disposal_method: 'Recycle',
      status: 'Expired',
      days_overdue: 5,
      created_by: 'Admin User',
      created_date: '2024-01-05'
    },
    {
      scrap_asset_id: 'SA012',
      asset_id: 'A012',
      asset_name: 'Canon Printer',
      asset_type: 'Printer',
      department: 'Administration',
      assigned_to: 'Emma Davis',
      scrap_date: '2024-01-15',
      scrap_reason: 'End of Life',
      estimated_value: 200,
      disposal_method: 'Sale',
      status: 'Expired',
      days_overdue: 10,
      created_by: 'Admin User',
      created_date: '2024-01-05'
    },
    {
      scrap_asset_id: 'SA013',
      asset_id: 'A013',
      asset_name: 'Office Desk',
      asset_type: 'Furniture',
      department: 'HR Department',
      assigned_to: 'Chris Lee',
      scrap_date: '2024-01-20',
      scrap_reason: 'Worn Out',
      estimated_value: 100,
      disposal_method: 'Donation',
      status: 'Expired',
      days_overdue: 15,
      created_by: 'Admin User',
      created_date: '2024-01-05'
    },
    {
      scrap_asset_id: 'SA014',
      asset_id: 'A014',
      asset_name: 'iPad Pro',
      asset_type: 'Tablet',
      department: 'Sales',
      assigned_to: 'Maria Garcia',
      scrap_date: '2024-01-25',
      scrap_reason: 'Technology Upgrade',
      estimated_value: 450,
      disposal_method: 'Sale',
      status: 'Expired',
      days_overdue: 20,
      created_by: 'Admin User',
      created_date: '2024-01-05'
    },
    {
      scrap_asset_id: 'SA015',
      asset_id: 'A015',
      asset_name: 'Network Switch',
      asset_type: 'Networking',
      department: 'IT Department',
      assigned_to: 'Kevin Zhang',
      scrap_date: '2024-01-30',
      scrap_reason: 'Performance Issues',
      estimated_value: 300,
      disposal_method: 'Recycle',
      status: 'Expired',
      days_overdue: 25,
      created_by: 'Admin User',
      created_date: '2024-01-05'
    }
  ];

  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      setScrapAssets(mockExpiredAssets);
      setLoading(false);
    }, 1000);
  }, []);

  const columns = [
    { key: 'scrap_asset_id', name: 'scrap_asset_id', label: 'Scrap Asset ID', sortable: true, visible: true },
    { key: 'asset_id', name: 'asset_id', label: 'Asset ID', sortable: true, visible: true },
    { key: 'asset_name', name: 'asset_name', label: 'Asset Name', sortable: true, visible: true },
    { key: 'asset_type', name: 'asset_type', label: 'Asset Type', sortable: true, visible: true },
    { key: 'department', name: 'department', label: 'Department', sortable: true, visible: true },
    { key: 'assigned_to', name: 'assigned_to', label: 'Assigned To', sortable: true, visible: true },
    { key: 'scrap_date', name: 'scrap_date', label: 'Scrap Date', sortable: true, visible: true },
    { key: 'days_overdue', name: 'days_overdue', label: 'Days Overdue', sortable: true, visible: true },
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
      <div className="flex justify-between items-center mb-6 p-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/scrap-assets')}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
            title="Back to Dashboard"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-full">
              <XCircle className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Expired Assets</h1>
              <p className="text-sm text-gray-600">Assets that have passed their expiry date</p>
            </div>
          </div>
        </div>
      </div>
      
      <ContentBox
        filters={columns.map((col) => ({
          label: col.label,
          name: col.name,
          options: col.name === 'status' ? [
            { label: "Nearing Expiry", value: "Nearing Expiry" },
            { label: "Expired", value: "Expired" },
            { label: "Active", value: "Active" }
          ] : [],
          onChange: (value) => handleFilterChange(col.name, value),
        }))}
        onFilterChange={handleFilterChange}
        onSort={handleSort}
        sortConfig={sortConfig}
        onDeleteSelected={handleDelete}
        data={scrapAssets}
        selectedRows={selectedRows}
        setSelectedRows={setSelectedRows}
        onAdd={handleAddScrapAsset}
      >
        {({ visibleColumns, showActions }) => {
          const filteredData = filterData(scrapAssets, filterValues, visibleColumns);
          const sortedData = sortData(filteredData);

          return (
            <CustomTable
              visibleColumns={visibleColumns}
              data={sortedData}
              selectedRows={selectedRows}
              setSelectedRows={setSelectedRows}
              onView={handleView}
              onEdit={handleEdit}
              onDelete={handleDelete}
              rowKey="scrap_asset_id"
              showActions={showActions}
            />
          );
        }}
      </ContentBox>
    </div>
  );
};

export default ExpiredAssets; 