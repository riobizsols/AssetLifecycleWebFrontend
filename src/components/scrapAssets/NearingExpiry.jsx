import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import API from '../../lib/axios';
import { toast } from 'react-hot-toast';
import { ArrowLeft, AlertTriangle, Trash2, X } from 'lucide-react';
import ContentBox from '../ContentBox';
import CustomTable from '../CustomTable';
import { useNavigation } from '../../hooks/useNavigation';

const NearingExpiry = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { getAccessLevel, loading: navLoading } = useNavigation();
  const accessLevel = getAccessLevel('SCRAPASSETS');
  const isReadOnly = accessLevel === 'D';
  
  const [scrapAssets, setScrapAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [notes, setNotes] = useState('');

  // Fetch assets nearing expiry from API
  const fetchNearingExpiryAssets = async () => {
    try {
      console.log('🔍 Fetching assets nearing expiry...');
      setLoading(true);
      const response = await API.get('/assets/expiry/expiring_soon?days=30', {
        params: { context: 'SCRAPASSETS' }
      });
      console.log('📊 API Response:', response.data);
      
      if (response.data && response.data.assets) {
        console.log('✅ Assets nearing expiry:', response.data.assets);
        setScrapAssets(response.data.assets);
      } else {
        console.log('⚠️ No assets found or unexpected response format');
        setScrapAssets([]);
      }
    } catch (error) {
      console.error('❌ Error fetching assets nearing expiry:', error);
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
      }
      toast.error('Failed to fetch assets nearing expiry');
      setScrapAssets([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNearingExpiryAssets();
  }, []);

  const columns = [
    { key: 'text', name: 'text', label: 'ASSET NAME', sortable: true, visible: true },
    { key: 'serial_number', name: 'serial_number', label: 'SERIAL NUMBER', sortable: true, visible: true },
    { key: 'asset_type_id', name: 'asset_type_id', label: 'ASSET TYPE', sortable: true, visible: true },
    { key: 'description', name: 'description', label: 'DESCRIPTION', sortable: true, visible: true },
    { key: 'expiry_date', name: 'expiry_date', label: 'EXPIRY DATE', sortable: true, visible: true },
    { key: 'days_until_expiry', name: 'days_until_expiry', label: 'DAYS UNTIL EXPIRY', sortable: true, visible: true },
    ...(!navLoading && !isReadOnly ? [{ key: 'action', name: 'action', label: 'ACTION', sortable: false, visible: true }] : [])
  ];

  const handleScrap = (row) => {
    setSelectedAsset(row);
    setShowModal(true);
  };

  const handleSubmitScrap = async () => {
    try {
      console.log('Submitting scrap asset:', selectedAsset, 'with notes:', notes);
      
      // Debug: Log user object to see what's available
      console.log('🔍 Full user object:', user);
      console.log('🔍 User keys:', Object.keys(user));
      console.log('🔍 User emp_int_id:', user?.emp_int_id);
      
      // Validate that user has emp_int_id
      if (!user?.emp_int_id) {
        toast.error('User employee ID not found. Please contact administrator.');
        return;
      }
      
      // Prepare scrap asset data
      const scrapData = {
        asset_id: selectedAsset.asset_id,
        scrapped_date: new Date().toISOString().split('T')[0], // Current date in YYYY-MM-DD format
        scrapped_by: user.emp_int_id.toString(), // Use emp_int_id from user
        location: selectedAsset.location || null,
        notes: notes || null,
        org_id: user?.org_id || 1 // Default org_id if not available
      };

      console.log('📤 Sending scrap data to API:', scrapData);

      // Call the scrap asset API
      const response = await API.post('/scrap-assets', scrapData, {
        params: { context: 'SCRAPASSETS' }
      });
      
      if (response.data.success) {
        toast.success(`Asset ${selectedAsset.text} successfully marked for scrapping!`);
        
        // Remove the asset from the list since it's now scrapped
        setScrapAssets(prev => prev.filter(asset => asset.asset_id !== selectedAsset.asset_id));
        
        // Close modal and reset state
        setShowModal(false);
        setSelectedAsset(null);
        setNotes('');
      } else {
        toast.error('Failed to mark asset for scrapping');
      }
    } catch (error) {
      console.error('❌ Error submitting scrap asset:', error);
      
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
        
        if (error.response.status === 400) {
          toast.error(`Validation error: ${error.response.data.error}`);
        } else if (error.response.status === 401) {
          toast.error('Unauthorized. Please log in again.');
        } else if (error.response.status === 500) {
          toast.error('Server error. Please try again later.');
        } else {
          toast.error(`Error: ${error.response.data.error || 'Failed to mark asset for scrapping'}`);
        }
      } else {
        toast.error('Network error. Please check your connection.');
      }
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedAsset(null);
    setNotes('');
  };

  // Custom table component for NearingExpiry with custom styling
  const CustomNearingExpiryTable = ({ visibleColumns, data, selectedRows, setSelectedRows, showActions }) => {
    const visible = visibleColumns.filter((col) => col.visible);

    const toggleRow = (keyValue) => {
      setSelectedRows((prev) =>
        prev.includes(keyValue)
          ? prev.filter((rowId) => rowId !== keyValue)
          : [...prev, keyValue]
      );
    };

    // Helper function to format date
    const formatDate = (dateString) => {
      if (!dateString) return 'N/A';
      try {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        });
      } catch (error) {
        return 'Invalid Date';
      }
    };

    // Helper function to format days until expiry
    const formatDaysUntilExpiry = (daysObject) => {
      if (!daysObject || typeof daysObject !== 'object') return 'N/A';
      const days = daysObject.days;
      if (days === undefined || days === null) return 'N/A';
      return `${days} day${days !== 1 ? 's' : ''}`;
    };

    return (
      <>
        {data.map((row, rowIndex) => (
          <tr
            key={row.asset_id || rowIndex}
            className="border-t hover:bg-gray-100"
          >
            {visible.map((col, colIndex) => (
              <td key={colIndex} className="border text-xs px-4 py-2">
                {colIndex === 0 ? (
                  <div className="flex items-center gap-2">
                    {showActions && (
                      <input
                        type="checkbox"
                        checked={selectedRows.includes(row.asset_id)}
                        onChange={() => toggleRow(row.asset_id)}
                        className="accent-yellow-400"
                      />
                    )}
                    {col.key === 'expiry_date' ? (
                      formatDate(row[col.key])
                    ) : col.key === 'days_until_expiry' ? (
                      <span className="px-2 py-1 bg-yellow-100 text-amber-800 text-xs font-medium rounded-full">
                        {formatDaysUntilExpiry(row[col.key])}
                      </span>
                    ) : col.key === 'action' ? (
                      <button
                        onClick={() => handleScrap(row)}
                        className="px-3 py-1 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700 transition-colors"
                      >
                        Scrap
                      </button>
                    ) : (
                      row[col.key] || 'N/A'
                    )}
                  </div>
                ) : col.key === 'expiry_date' ? (
                  formatDate(row[col.key])
                ) : col.key === 'days_until_expiry' ? (
                  <span className="px-2 py-1 bg-yellow-100 text-amber-800 text-xs font-medium rounded-full">
                    {formatDaysUntilExpiry(row[col.key])}
                  </span>
                ) : col.key === 'action' ? (
                  <button
                    onClick={() => handleScrap(row)}
                    className="px-3 py-1 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700 transition-colors"
                  >
                    Scrap
                  </button>
                ) : (
                  row[col.key] || 'N/A'
                )}
              </td>
            ))}
          </tr>
        ))}
      </>
    );
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
      // Handle column-specific filters
      if (filters.columnFilters && filters.columnFilters.length > 0) {
        const columnFilterMatch = filters.columnFilters.every(filter => {
          if (!filter.column || !filter.value) return true;
          
          let itemValue = item[filter.column];
          
          // Handle object values (like days_until_expiry: {days: 5})
          if (itemValue && typeof itemValue === 'object' && itemValue.days !== undefined) {
            itemValue = `${itemValue.days} days`;
          }
          // Handle other object values by converting to string
          else if (itemValue && typeof itemValue === 'object') {
            itemValue = JSON.stringify(itemValue);
          }
          // Handle null/undefined values
          else if (itemValue === null || itemValue === undefined) {
            itemValue = 'N/A';
          }
          
          const itemValueStr = String(itemValue).toLowerCase();
          const filterValueStr = filter.value.toLowerCase();
          
          return itemValueStr.includes(filterValueStr);
        });
        
        if (!columnFilterMatch) return false;
      }
      
      // Handle date range filters
      if (filters.fromDate && filters.fromDate !== '') {
        const itemDate = new Date(item.expiry_date);
        const fromDate = new Date(filters.fromDate);
        if (itemDate < fromDate) return false;
      }
      
      if (filters.toDate && filters.toDate !== '') {
        const itemDate = new Date(item.expiry_date);
        const toDate = new Date(filters.toDate);
        if (itemDate > toDate) return false;
      }
      
      return true;
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
            <div className="p-2 bg-orange-100 rounded-full">
              <AlertTriangle className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Assets Nearing Expiry</h1>
              <p className="text-sm text-gray-600">Assets that will expire within the next 30 days</p>
            </div>
          </div>
        </div>
      </div>
      
      <ContentBox
        filters={columns}
        onFilterChange={handleFilterChange}
        onSort={handleSort}
        sortConfig={sortConfig}
        onDeleteSelected={() => {}}
        data={scrapAssets}
        selectedRows={selectedRows}
        setSelectedRows={setSelectedRows}
        onAdd={null}
        showAddButton={false}
        showActions={false}
      >
                {({ visibleColumns, showActions }) => {
          const filteredData = filterData(scrapAssets, filterValues, visibleColumns);
          const sortedData = sortData(filteredData);

                      return (
              <CustomNearingExpiryTable
                visibleColumns={visibleColumns}
                data={sortedData}
                selectedRows={selectedRows}
                setSelectedRows={setSelectedRows}
                showActions={showActions}
              />
            );
        }}
      </ContentBox>

      {/* Scrap Asset Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-semibold text-gray-900">Create Scrap Asset</h3>
              <button
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6">
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">Asset: <span className="font-medium text-gray-900">{selectedAsset?.text}</span></p>
                <p className="text-sm text-gray-600">Serial: <span className="font-medium text-gray-900">{selectedAsset?.serial_number}</span></p>
                <p className="text-sm text-gray-600">Asset Type: <span className="font-medium text-gray-900">{selectedAsset?.asset_type_id}</span></p>
              </div>
              
              <div className="mb-6">
                <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Enter any additional notes about this scrap asset..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                  rows="3"
                />
              </div>
              
              <div className="flex justify-end gap-3">
                <button
                  onClick={handleCloseModal}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitScrap}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-blue-600 rounded-md hover:bg-blue-700 transition-colors"
                >
                  Submit
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NearingExpiry; 