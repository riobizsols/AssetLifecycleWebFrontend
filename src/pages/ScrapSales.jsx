import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { toast } from 'react-hot-toast';
import { Plus, Search, Filter, Download, Eye, Edit, Trash2 } from 'lucide-react';
import ContentBox from '../components/ContentBox';
import CustomTable from '../components/CustomTable';
import API from '../lib/axios';

const ScrapSales = () => {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [scrapSales, setScrapSales] = useState([]);
  const [selectedRows, setSelectedRows] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTerm, setFilterTerm] = useState('');

  // Mock data for demonstration - replace with actual API calls
  const mockScrapSales = [
    {
      scrap_id: 'SS001',
      asset_id: 'A001',
      asset_name: 'Dell XPS 13',
      scrap_date: '2024-01-15',
      scrap_reason: 'End of Life',
      scrap_value: 500,
      buyer_name: 'Tech Recyclers Inc.',
      buyer_contact: '+1-555-0123',
      status: 'COMPLETED',
      created_by: 'admin',
      created_on: '2024-01-10'
    },
    {
      scrap_id: 'SS002',
      asset_id: 'A002',
      asset_name: 'HP Pavilion',
      scrap_date: '2024-01-20',
      scrap_reason: 'Damaged Beyond Repair',
      scrap_value: 300,
      buyer_name: 'Green Electronics',
      buyer_contact: '+1-555-0456',
      status: 'PENDING',
      created_by: 'admin',
      created_on: '2024-01-15'
    },
    {
      scrap_id: 'SS003',
      asset_id: 'A003',
      asset_name: 'Lenovo ThinkPad',
      scrap_date: '2024-01-25',
      scrap_reason: 'Obsolete Technology',
      scrap_value: 400,
      buyer_name: 'Eco Disposal Co.',
      buyer_contact: '+1-555-0789',
      status: 'IN_PROGRESS',
      created_by: 'admin',
      created_on: '2024-01-20'
    }
  ];

  useEffect(() => {
    // Simulate API call to fetch scrap sales data
    setScrapSales(mockScrapSales);
  }, []);

  const columns = [
    { name: 'scrap_id', label: 'Scrap ID', visible: true },
    { name: 'asset_id', label: 'Asset ID', visible: true },
    { name: 'asset_name', label: 'Asset Name', visible: true },
    { name: 'scrap_date', label: 'Scrap Date', visible: true },
    { name: 'scrap_reason', label: 'Reason', visible: true },
    { name: 'scrap_value', label: 'Value ($)', visible: true },
    { name: 'buyer_name', label: 'Buyer', visible: true },
    { name: 'buyer_contact', label: 'Contact', visible: true },
    { name: 'status', label: 'Status', visible: true },
    { name: 'created_by', label: 'Created By', visible: true },
    { name: 'created_on', label: 'Created On', visible: true }
  ];

  const visibleColumns = columns.filter(col => col.visible);

  const filteredData = scrapSales.filter(item => {
    const searchLower = searchTerm.toLowerCase();
    return (
      item.scrap_id?.toLowerCase().includes(searchLower) ||
      item.asset_id?.toLowerCase().includes(searchLower) ||
      item.asset_name?.toLowerCase().includes(searchLower) ||
      item.buyer_name?.toLowerCase().includes(searchLower) ||
      item.scrap_reason?.toLowerCase().includes(searchLower) ||
      item.status?.toLowerCase().includes(searchLower)
    );
  });

  const handleAddScrapSale = () => {
    toast.info('Add Scrap Sale functionality will be implemented');
  };

  const handleEdit = (row) => {
    toast.info(`Edit scrap sale ${row.scrap_id} functionality will be implemented`);
  };

  const handleDelete = (row) => {
    toast.info(`Delete scrap sale ${row.scrap_id} functionality will be implemented`);
  };

  const handleView = (row) => {
    toast.info(`View scrap sale ${row.scrap_id} functionality will be implemented`);
  };

  const handleExport = () => {
    toast.info('Export functionality will be implemented');
  };

  return (
    <div className="p-6">
      <ContentBox
        title="Scrap Sales"
        subtitle="Manage asset scrap sales and disposal records"
        showAddButton={true}
        onAdd={handleAddScrapSale}
        render={() => (
          <CustomTable
            columns={visibleColumns}
            visibleColumns={visibleColumns}
            data={filteredData}
            selectedRows={selectedRows}
            setSelectedRows={setSelectedRows}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onView={handleView}
            rowKey="scrap_id"
          />
        )}
      />
    </div>
  );
};

export default ScrapSales; 