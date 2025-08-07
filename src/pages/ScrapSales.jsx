import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import API from '../lib/axios';
import { toast } from 'react-hot-toast';
import { Plus } from 'lucide-react';
import ContentBox from '../components/ContentBox';
import CustomTable from '../components/CustomTable';


const ScrapSales = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [scrapSales, setScrapSales] = useState([]);
  const [loading, setLoading] = useState(true);


  // Mock data for scrap sales - replace with actual API calls
  const mockScrapSales = [
    {
      scrap_id: 'SCR001',
      group_name: 'Old Electronics',
      asset_id: 'A001',
      asset_name: 'Dell XPS 13',
      asset_type: 'Laptop',
      scrap_date: '2024-01-15',
      scrap_reason: 'End of Life',
      scrap_value: 500,
      buyer_name: 'John Doe',
      buyer_contact: 'john@example.com',
      status: 'Completed',
      created_by: 'Admin User',
      created_date: '2024-01-15'
    },
    {
      scrap_id: 'SCR002',
      group_name: 'Damaged Equipment',
      asset_id: 'A002',
      asset_name: 'HP Pavilion',
      asset_type: 'Laptop',
      scrap_date: '2024-01-20',
      scrap_reason: 'Damaged',
      scrap_value: 300,
      buyer_name: 'Jane Smith',
      buyer_contact: 'jane@example.com',
      status: 'Pending',
      created_by: 'Admin User',
      created_date: '2024-01-20'
    },
    {
      scrap_id: 'SCR003',
      group_name: 'Office Upgrade',
      asset_id: 'A003',
      asset_name: 'Samsung Monitor',
      asset_type: 'Monitor',
      scrap_date: '2024-02-01',
      scrap_reason: 'Upgrade',
      scrap_value: 200,
      buyer_name: 'Mike Johnson',
      buyer_contact: 'mike@example.com',
      status: 'Completed',
      created_by: 'Admin User',
      created_date: '2024-02-01'
    }
  ];

  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      setScrapSales(mockScrapSales);
      setLoading(false);
    }, 1000);
  }, []);

  const columns = [
    { key: 'scrap_id', name: 'scrap_id', label: 'Scrap ID', sortable: true, visible: true },
    { key: 'group_name', name: 'group_name', label: 'Group Name', sortable: true, visible: true },
    { key: 'asset_id', name: 'asset_id', label: 'Asset ID', sortable: true, visible: true },
    { key: 'asset_name', name: 'asset_name', label: 'Asset Name', sortable: true, visible: true },
    { key: 'asset_type', name: 'asset_type', label: 'Asset Type', sortable: true, visible: true },
    { key: 'scrap_date', name: 'scrap_date', label: 'Scrap Date', sortable: true, visible: true },
    { key: 'scrap_reason', name: 'scrap_reason', label: 'Scrap Reason', sortable: true, visible: true },
    { key: 'scrap_value', name: 'scrap_value', label: 'Scrap Value', sortable: true, visible: true },
    { key: 'buyer_name', name: 'buyer_name', label: 'Buyer Name', sortable: true, visible: true },
    { key: 'status', name: 'status', label: 'Status', sortable: true, visible: true },
    { key: 'created_by', name: 'created_by', label: 'Created By', sortable: true, visible: true },
    { key: 'created_date', name: 'created_date', label: 'Created Date', sortable: true, visible: true }
  ];

  const handleAddScrapSale = () => {
    navigate('/scrap-sales/create');
  };

  const handleView = (row) => {
    // Navigate to view page
    navigate(`/scrap-sales/view/${row.scrap_id}`);
  };

  const handleEdit = (row) => {
    // Transform the data to match the expected structure in EditScrapSales
    const transformedData = {
      scrap_id: row.scrap_id,
      group_name: row.group_name,
      selected_assets: [
        {
          asset_id: row.asset_id,
          name: row.asset_name,
          description: `${row.asset_type} - ${row.asset_name}`,
          purchased_on: row.created_date,
          asset_type_id: row.asset_type === 'Laptop' ? 'AT001' : 
                        row.asset_type === 'Desktop' ? 'AT002' : 
                        row.asset_type === 'Monitor' ? 'AT003' : 'AT001',
          asset_type_name: row.asset_type,
          serial_number: `SN${row.asset_id}`,
          scrap_value: row.scrap_value
        }
      ],
      total_scrap_value: row.scrap_value,
      buyer_details: {
        buyer_name: row.buyer_name,
        buyer_email: row.buyer_contact,
        buyer_contact: row.buyer_contact,
        company_name: 'Company Name' // Default value since not in original data
      },
      status: row.status
    };

    // Navigate to edit page with scrap sale data
    navigate(`/scrap-sales/edit/${row.scrap_id}`, { 
      state: { 
        scrapData: transformedData,
        isEdit: true 
      } 
    });
  };

  const handleDelete = (row) => {
    // Implement delete functionality
    console.log('Delete scrap sale:', row);
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
      { label: "Completed", value: "Completed" },
      { label: "Pending", value: "Pending" },
      { label: "Cancelled", value: "Cancelled" }
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
                 onAdd={handleAddScrapSale}
        onDeleteSelected={handleDelete}
        data={scrapSales}
        selectedRows={selectedRows}
        setSelectedRows={setSelectedRows}
      >
        {({ visibleColumns }) => {
          const filteredData = filterData(scrapSales, filterValues, visibleColumns);
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
              rowKey="scrap_id"
            />
          );
        }}
      </ContentBox>

      
    </div>
  );
};

export default ScrapSales; 