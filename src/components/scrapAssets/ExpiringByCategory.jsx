import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import API from '../../lib/axios';
import { toast } from 'react-hot-toast';
import { Plus, ArrowLeft, BarChart3, AlertTriangle } from 'lucide-react';
import ContentBox from '../ContentBox';
import CustomTable from '../CustomTable';

const ExpiringByCategory = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [assetTypes, setAssetTypes] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch assets expiring within 30 days by type from API
  const fetchExpiringByCategory = async () => {
    try {
      console.log('🔍 Fetching assets expiring by category...');
      const response = await API.get('/assets/expiring-30-days-by-type');
      console.log('📊 Expiring by Category API Response:', response.data);
      
      if (response.data && response.data.asset_types) {
        console.log('✅ Expiring by category data:', response.data.asset_types);
        return response.data.asset_types.map(type => ({
          asset_type_id: type.asset_type_id,
          asset_type_name: type.asset_type_name,
          asset_count: parseInt(type.asset_count),
          total_assets: type.assets ? type.assets.length : 0,
          earliest_expiry: type.assets && type.assets.length > 0 ? 
            type.assets[0].expiry_date : null,
          latest_expiry: type.assets && type.assets.length > 0 ? 
            type.assets[type.assets.length - 1].expiry_date : null
        }));
      }
      console.log('⚠️ Expiring by category API response format unexpected:', response.data);
      return [];
    } catch (error) {
      console.error('❌ Error fetching expiring by category:', error);
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
      }
      toast.error('Failed to fetch expiring assets data');
      return [];
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const data = await fetchExpiringByCategory();
        setAssetTypes(data);
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Failed to fetch data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const columns = [
    { key: 'asset_type_name', name: 'asset_type_name', label: 'Asset Type', sortable: true, visible: true },
    { key: 'asset_count', name: 'asset_count', label: 'Assets Expiring', sortable: true, visible: true },
    { key: 'earliest_expiry', name: 'earliest_expiry', label: 'Earliest Expiry', sortable: true, visible: true },
    { key: 'latest_expiry', name: 'latest_expiry', label: 'Latest Expiry', sortable: true, visible: true },
    { key: 'action', name: 'action', label: 'Action', sortable: false, visible: true }
  ];

  const handleViewAssets = (assetType) => {
    navigate(`/scrap-assets/by-category/${assetType.asset_type_name.toLowerCase()}`);
  };

  const handleBackToCategories = () => {
    navigate('/scrap-assets/categories');
  };

  const handleAddScrapAsset = () => {
    navigate('/scrap-assets/create');
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
  const filteredData = filterData(assetTypes, filterValues, visibleColumns);
  const sortedData = sortData(filteredData);

  // Custom table component for ExpiringByCategory with custom styling
  const CustomExpiringByCategoryTable = ({ visibleColumns, data, selectedRows, setSelectedRows }) => {
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

    return (
      <>
        {data.map((row, rowIndex) => (
          <tr
            key={row.asset_type_id || rowIndex}
            className="border-t hover:bg-gray-100"
          >
            {visible.map((col, colIndex) => (
              <td key={colIndex} className="border text-xs px-4 py-2">
                {colIndex === 0 ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectedRows.includes(row.asset_type_id)}
                      onChange={() => toggleRow(row.asset_type_id)}
                      className="accent-yellow-400"
                    />
                    {row[col.key]}
                  </div>
                ) : col.key === 'asset_count' ? (
                  <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs font-medium rounded-full">
                    {row[col.key]}
                  </span>
                ) : col.key === 'earliest_expiry' || col.key === 'latest_expiry' ? (
                  formatDate(row[col.key])
                ) : col.key === 'action' ? (
                  <button
                    onClick={() => handleViewAssets(row)}
                    className="px-3 py-1 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700 transition-colors flex items-center gap-1"
                  >
                    <AlertTriangle size={12} />
                    View Assets
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
                <h1 className="text-2xl font-bold text-gray-900">Categories Overview</h1>
                <p className="text-sm text-gray-600">Navigate to view all asset types with expiring assets</p>
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

        {assetTypes.length === 0 ? (
          <div className="text-center text-gray-500 py-12">
            <AlertTriangle className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Assets Expiring Soon</h3>
            <p className="text-gray-600">There are no assets expiring within the next 30 days.</p>
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="max-w-md mx-auto">
              <BarChart3 className="w-16 h-16 mx-auto text-blue-500 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Categories Overview</h3>
              <p className="text-gray-600 mb-6">
                View all asset types with expiring assets and their details
              </p>
              <button
                onClick={handleBackToCategories}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200"
              >
                View All Categories
              </button>
            </div>
          </div>
        )}
      </ContentBox>
    </div>
  );
};

export default ExpiringByCategory; 