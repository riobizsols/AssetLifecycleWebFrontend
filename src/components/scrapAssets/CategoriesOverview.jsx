import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import API from '../../lib/axios';
import { toast } from 'react-hot-toast';
import { ArrowLeft, BarChart3, AlertTriangle, Clock, Calendar } from 'lucide-react';
import ContentBox from '../ContentBox';

const CategoriesOverview = () => {
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

  const handleCategoryClick = (assetType) => {
    navigate(`/scrap-assets/by-category/${assetType.asset_type_name.toLowerCase()}`);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  const calculateDaysUntilExpiry = (dateString) => {
    if (!dateString) return null;
    const today = new Date();
    const expiryDate = new Date(dateString);
    const diffTime = expiryDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getDaysUntilExpiryColor = (days) => {
    if (days <= 7) return 'bg-red-100 text-red-800';
    if (days <= 14) return 'bg-orange-100 text-orange-800';
    return 'bg-yellow-100 text-yellow-800';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="bg-white rounded-lg shadow-md p-6">
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/3"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="flex items-center gap-4 mb-6">
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
            <h1 className="text-2xl font-bold text-gray-900">All Expiring Categories</h1>
            <p className="text-sm text-gray-600">Click on any category to view detailed assets</p>
          </div>
        </div>
      </div>

      {assetTypes.length === 0 ? (
        <div className="text-center text-gray-500 py-12">
          <AlertTriangle className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Assets Expiring Soon</h3>
          <p className="text-gray-600">There are no assets expiring within the next 30 days.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {assetTypes.map((assetType) => {
            const earliestDays = calculateDaysUntilExpiry(assetType.earliest_expiry);
            const latestDays = calculateDaysUntilExpiry(assetType.latest_expiry);
            
            return (
              <div
                key={assetType.asset_type_id}
                className="bg-white rounded-lg shadow-md p-6 cursor-pointer hover:shadow-lg transition-all duration-200 border-l-4 border-yellow-400"
                onClick={() => handleCategoryClick(assetType)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {assetType.asset_type_name}
                      </h3>
                      <span className="px-3 py-1 bg-orange-100 text-orange-800 text-sm font-medium rounded-full">
                        {assetType.asset_count} assets
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-gray-400" />
                        <span>Earliest: {formatDate(assetType.earliest_expiry)}</span>
                        {earliestDays !== null && (
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getDaysUntilExpiryColor(earliestDays)}`}>
                            {earliestDays} days
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span>Latest: {formatDate(assetType.latest_expiry)}</span>
                        {latestDays !== null && (
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getDaysUntilExpiryColor(latestDays)}`}>
                            {latestDays} days
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-yellow-500" />
                        <span>Total: {assetType.total_assets} assets</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 text-gray-400">
                    <span className="text-sm">Click to view</span>
                    <ArrowLeft className="w-4 h-4 rotate-180" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CategoriesOverview;
