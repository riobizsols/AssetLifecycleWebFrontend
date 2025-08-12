import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import API from '../../lib/axios';
import { toast } from 'react-hot-toast';
import { Plus, ArrowLeft, BarChart3, X, AlertTriangle } from 'lucide-react';
import ContentBox from '../ContentBox';
import CustomTable from '../CustomTable';

const CategoryAssets = () => {
  const navigate = useNavigate();
  const { category } = useParams();
  const { user } = useAuthStore();
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [notes, setNotes] = useState('');
  const [assetTypeInfo, setAssetTypeInfo] = useState(null);

  // Fetch assets expiring within 30 days by type from API
  const fetchAssetsByCategory = async () => {
    try {
      console.log('🔍 Fetching assets by category:', category);
      const response = await API.get('/assets/expiring-30-days-by-type');
      console.log('📊 API Response:', response.data);
      
      if (response.data && response.data.asset_types) {
        console.log('🔍 Available categories:', response.data.asset_types.map(t => t.asset_type_name));
        console.log('🔍 Looking for category:', category);
        console.log('🔍 Category lengths:', response.data.asset_types.map(t => ({ name: t.asset_type_name, length: t.asset_type_name.length, hasTrailingSpace: t.asset_type_name.endsWith(' ') })));
        
        // Find the specific asset type that matches the category
        // Use more flexible matching to handle URL encoding and case differences
        const categoryData = response.data.asset_types.find(type => {
          const apiCategory = type.asset_type_name.toLowerCase().trim();
          const urlCategory = decodeURIComponent(category).toLowerCase().trim();
          
          // Try exact match first (after trimming)
          let match = apiCategory === urlCategory;
          console.log(`🔍 Exact match: "${apiCategory}" === "${urlCategory}" = ${match}`);
          
          // If no exact match, try normalized comparison (remove special chars, normalize spaces)
          if (!match) {
            const normalizedApi = apiCategory.replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
            const normalizedUrl = urlCategory.replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
            match = normalizedApi === normalizedUrl;
            console.log(`🔍 Normalized comparison: "${normalizedApi}" === "${normalizedUrl}" = ${match}`);
          }
          
          // If still no match, try partial matching
          if (!match) {
            match = apiCategory.includes(urlCategory) || urlCategory.includes(apiCategory);
            console.log(`🔍 Partial match: "${apiCategory}" includes "${urlCategory}" or vice versa = ${match}`);
          }
          
          return match;
        });
        
        console.log('🔍 Found category data:', categoryData);
        
        if (categoryData) {
          if (categoryData.assets && categoryData.assets.length > 0) {
            console.log('✅ Category assets found:', categoryData.assets);
            setAssetTypeInfo({
              asset_type_name: categoryData.asset_type_name,
              asset_count: categoryData.asset_count
            });
            return categoryData.assets.map(asset => ({
              asset_id: asset.asset_id,
              asset_name: asset.text,
              serial_number: asset.serial_number,
              description: asset.description,
              category: categoryData.asset_type_name,
              expiry_date: asset.expiry_date,
              days_until_expiry: asset.days_until_expiry,
              current_status: asset.current_status,
              action: 'Scrap'
            }));
          } else {
            console.log('⚠️ Category found but no assets array or empty assets array');
            console.log('⚠️ Category data structure:', categoryData);
            
            // Fallback: Try to fetch assets directly for this category
            try {
              console.log('🔄 Attempting fallback fetch for category:', categoryData.asset_type_name);
              const fallbackResponse = await API.get(`/assets/expiry/expiring_soon?days=30&asset_type=${categoryData.asset_type_id}`);
              
              if (fallbackResponse.data && fallbackResponse.data.assets) {
                console.log('✅ Fallback fetch successful:', fallbackResponse.data.assets);
                setAssetTypeInfo({
                  asset_type_name: categoryData.asset_type_name,
                  asset_count: fallbackResponse.data.assets.length
                });
                return fallbackResponse.data.assets.map(asset => ({
                  asset_id: asset.asset_id,
                  asset_name: asset.text,
                  serial_number: asset.serial_number,
                  description: asset.description,
                  category: categoryData.asset_type_name,
                  expiry_date: asset.expiry_date,
                  days_until_expiry: asset.days_until_expiry,
                  current_status: asset.current_status,
                  action: 'Scrap'
                }));
              }
            } catch (fallbackError) {
              console.log('⚠️ Fallback fetch failed:', fallbackError);
            }
            
            setAssetTypeInfo({
              asset_type_name: categoryData.asset_type_name,
              asset_count: categoryData.asset_count
            });
            return [];
          }
        } else {
          console.log('⚠️ No category found matching:', category);
          console.log('⚠️ Available categories:', response.data.asset_types.map(t => t.asset_type_name));
          
          // Try to find by partial name match as a last resort
          const partialMatch = response.data.asset_types.find(type => {
            const apiCategory = type.asset_type_name.toLowerCase().trim();
            const urlCategory = decodeURIComponent(category).toLowerCase().trim();
            return apiCategory.includes(urlCategory) || urlCategory.includes(apiCategory);
          });
          
          if (partialMatch) {
            console.log('✅ Found partial match:', partialMatch);
            if (partialMatch.assets && partialMatch.assets.length > 0) {
              setAssetTypeInfo({
                asset_type_name: partialMatch.asset_type_name,
                asset_count: partialMatch.asset_count
              });
              return partialMatch.assets.map(asset => ({
                asset_id: asset.asset_id,
                asset_name: asset.text,
                serial_number: asset.serial_number,
                description: asset.description,
                category: partialMatch.asset_type_name,
                expiry_date: asset.expiry_date,
                days_until_expiry: asset.days_until_expiry,
                current_status: asset.current_status,
                action: 'Scrap'
              }));
            }
          }
          
          return [];
        }
      }
      console.log('⚠️ API response format unexpected:', response.data);
      return [];
    } catch (error) {
      console.error('❌ Error fetching assets by category:', error);
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
      }
      toast.error('Failed to fetch assets data');
      return [];
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        console.log('🔍 useEffect triggered with category:', category);
        console.log('🔍 Decoded category:', decodeURIComponent(category));
        const data = await fetchAssetsByCategory();
        setAssets(data);
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Failed to fetch data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [category]);

  const columns = [
    { key: 'asset_name', name: 'asset_name', label: 'ASSET NAME', sortable: true, visible: true },
    { key: 'serial_number', name: 'serial_number', label: 'SERIAL NUMBER', sortable: true, visible: true },
    { key: 'category', name: 'category', label: 'CATEGORY', sortable: true, visible: true },
    { key: 'expiry_date', name: 'expiry_date', label: 'EXPIRY DATE', sortable: true, visible: true },
    { key: 'days_until_expiry', name: 'days_until_expiry', label: 'DAYS UNTIL EXPIRY', sortable: true, visible: true },
    { key: 'current_status', name: 'current_status', label: 'STATUS', sortable: true, visible: true },
    { key: 'action', name: 'action', label: 'ACTION', sortable: false, visible: true }
  ];

  const handleScrap = (row) => {
    setSelectedAsset(row);
    setShowModal(true);
  };

  const handleSubmitScrap = () => {
    console.log('Submitting scrap asset:', selectedAsset, 'with notes:', notes);
    toast.success(`Asset ${selectedAsset.asset_name} marked for scrapping${notes ? ` with notes: ${notes}` : ''}`);
    setShowModal(false);
    setSelectedAsset(null);
    setNotes('');
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedAsset(null);
    setNotes('');
  };

  // Custom table component for CategoryAssets with custom styling
  const CustomCategoryAssetsTable = ({ visibleColumns, data, selectedRows, setSelectedRows, showActions }) => {
    const visible = visibleColumns.filter((col) => col.visible);

    const toggleRow = (keyValue) => {
      setSelectedRows((prev) =>
        prev.includes(keyValue)
          ? prev.filter((rowId) => rowId !== keyValue)
          : [...prev, keyValue]
      );
    };

    const formatDate = (dateString) => {
      if (!dateString) return 'N/A';
      return new Date(dateString).toLocaleDateString();
    };

    const getDaysUntilExpiryColor = (days) => {
      if (days <= 7) return 'bg-red-100 text-red-800';
      if (days <= 14) return 'bg-orange-100 text-orange-800';
      return 'bg-yellow-100 text-yellow-800';
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
                    {row[col.key]}
                  </div>
                ) : col.key === 'expiry_date' ? (
                  formatDate(row[col.key])
                ) : col.key === 'days_until_expiry' ? (
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getDaysUntilExpiryColor(row[col.key])}`}>
                    {row[col.key]} days
                  </span>
                ) : col.key === 'current_status' ? (
                  <span className="px-2 py-1 bg-yellow-100 text-amber-800 text-xs font-medium rounded-full">
                    {row[col.key]}
                  </span>
                ) : col.key === 'action' ? (
                  <button
                    onClick={() => handleScrap(row)}
                    className="px-3 py-1 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700 transition-colors flex items-center gap-1"
                  >
                    <AlertTriangle size={12} />
                    Scrap
                  </button>
                ) : (
                  row[col.key]
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
  const filteredData = filterData(assets, filterValues, visibleColumns);
  const sortedData = sortData(filteredData);

  const getCategoryDisplayName = (category) => {
    return category.charAt(0).toUpperCase() + category.slice(1);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          </div>
        </div>
      </div>
    );
  }

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
            <div className="p-2 bg-blue-100 rounded-full">
              <BarChart3 className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{getCategoryDisplayName(category)} Assets</h1>
              <p className="text-sm text-gray-600">
                {assetTypeInfo ? `${assetTypeInfo.asset_count} assets expiring within 30 days` : 'Assets expiring soon'}
              </p>
            </div>
          </div>
        </div>
      </div>
      
      {assets.length === 0 ? (
        <div className="text-center text-gray-500 py-12">
          <AlertTriangle className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Assets Found</h3>
          <p className="text-gray-600">There are no assets in the {getCategoryDisplayName(category)} category expiring within 30 days.</p>
        </div>
      ) : (
        <ContentBox
          filters={columns}
          onFilterChange={handleFilterChange}
          onSort={handleSort}
          sortConfig={sortConfig}
          onDeleteSelected={() => {}}
          data={assets}
          selectedRows={selectedRows}
          setSelectedRows={setSelectedRows}
          onAdd={null}
          showAddButton={false}
          showActions={false}
        >
          {({ visibleColumns, showActions }) => {
            const filteredData = filterData(assets, filterValues, visibleColumns);
            const sortedData = sortData(filteredData);

            return (
              <CustomCategoryAssetsTable
                visibleColumns={visibleColumns}
                data={sortedData}
                selectedRows={selectedRows}
                setSelectedRows={setSelectedRows}
                showActions={showActions}
              />
            );
          }}
        </ContentBox>
      )}

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
                <p className="text-sm text-gray-600 mb-2">Asset: <span className="font-medium text-gray-900">{selectedAsset?.asset_name}</span></p>
                <p className="text-sm text-gray-600">Serial: <span className="font-medium text-gray-900">{selectedAsset?.serial_number}</span></p>
                <p className="text-sm text-gray-600">Category: <span className="font-medium text-gray-900">{selectedAsset?.category}</span></p>
                <p className="text-sm text-gray-600">Expiry: <span className="font-medium text-gray-900">{selectedAsset?.expiry_date ? new Date(selectedAsset.expiry_date).toLocaleDateString() : 'N/A'}</span></p>
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

export default CategoryAssets; 