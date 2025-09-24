import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import API from '../lib/axios';
import { toast } from 'react-hot-toast';
import { TrendingUp, AlertTriangle, XCircle, BarChart3, PieChart, Plus } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts";

const ScrapAssets = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalAssets: 0,
    nearingExpiry: 0,
    expired: 0
  });

  const [chartData, setChartData] = useState({
    expiryDistribution: [
      { name: t('scrapAssets.active'), value: 0, color: '#10B981' },
      { name: t('scrapAssets.nearingExpiry'), value: 0, color: '#F59E0B' },
      { name: t('scrapAssets.expired'), value: 0, color: '#EF4444' }
    ],
    expiringByCategory: []
  });

  // Fetch total assets count from API
  const fetchTotalAssetsCount = async () => {
    try {
      console.log('🔍 Fetching total assets count...');
      const response = await API.get('/assets/count');
      console.log('📊 API Response:', response.data);
      
      if (response.data && response.data.success) {
        console.log('✅ Total assets count:', response.data.count);
        return response.data.count;
      }
      console.log('⚠️ API response format unexpected:', response.data);
      return 0;
    } catch (error) {
      console.error('❌ Error fetching total assets count:', error);
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
      }
      toast.error(t('scrapAssets.failedToFetchTotalAssetsCount'));
      return 0;
    }
  };

  // Fetch nearing expiry count from API
  const fetchNearingExpiryCount = async () => {
    try {
      console.log('🔍 Fetching nearing expiry count...');
      const response = await API.get('/assets/expiry/expiring_soon?days=30');
      console.log('📊 Nearing Expiry API Response:', response.data);
      
      if (response.data && response.data.count !== undefined) {
        console.log('✅ Nearing expiry count:', response.data.count);
        return response.data.count;
      }
      console.log('⚠️ Nearing expiry API response format unexpected:', response.data);
      return 0;
    } catch (error) {
      console.error('❌ Error fetching nearing expiry count:', error);
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
      }
      toast.error(t('scrapAssets.failedToFetchNearingExpiryCount'));
      return 0;
    }
  };

  // Fetch expired assets count from API
  const fetchExpiredCount = async () => {
    try {
      console.log('🔍 Fetching expired assets count...');
      const response = await API.get('/assets/expiry/expired');
      console.log('📊 Expired Assets API Response:', response.data);
      
      if (response.data && response.data.count !== undefined) {
        console.log('✅ Expired assets count:', response.data.count);
        return response.data.count;
      }
      console.log('⚠️ Expired assets API response format unexpected:', response.data);
      return 0;
    } catch (error) {
      console.error('❌ Error fetching expired assets count:', error);
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
      }
      toast.error(t('scrapAssets.failedToFetchExpiredAssetsCount'));
      return 0;
    }
  };

  // Fetch assets expiring within 30 days by type from API
  const fetchExpiringByCategory = async () => {
    try {
      console.log('🔍 Fetching assets expiring by category...');
      const response = await API.get('/assets/expiring-30-days-by-type');
      console.log('📊 Expiring by Category API Response:', response.data);
      
      if (response.data && response.data.asset_types) {
        console.log('✅ Expiring by category data:', response.data.asset_types);
        return response.data.asset_types.map(type => ({
          category: type.asset_type_name,
          count: parseInt(type.asset_count),
          asset_type_id: type.asset_type_id
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
      toast.error(t('scrapAssets.failedToFetchExpiringAssetsData'));
      return [];
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log('🚀 Starting to fetch data...');
        setLoading(true);
        
        // Fetch real total assets count
        const totalAssetsCount = await fetchTotalAssetsCount();
        console.log('📈 Fetched total assets count:', totalAssetsCount);
        
        // Fetch real nearing expiry count
        const nearingExpiryCount = await fetchNearingExpiryCount();
        console.log('📈 Fetched nearing expiry count:', nearingExpiryCount);
        
        // Fetch real expired assets count
        const expiredCount = await fetchExpiredCount();
        console.log('📈 Fetched expired assets count:', expiredCount);
        
        // Fetch real expiring by category data
        const expiringByCategoryData = await fetchExpiringByCategory();
        console.log('📈 Fetched expiring by category data:', expiringByCategoryData);
        
        // Update stats with real data
        const updatedStats = {
          totalAssets: totalAssetsCount,
          nearingExpiry: nearingExpiryCount,
          expired: expiredCount
        };
        
        console.log('📊 Updated stats:', updatedStats);
        setStats(updatedStats);

        // Update chart data with real counts
        const updatedChartData = {
          expiryDistribution: [
            { name: t('scrapAssets.active'), value: Math.max(0, totalAssetsCount - nearingExpiryCount - expiredCount), color: '#10B981' },
            { name: t('scrapAssets.nearingExpiry'), value: nearingExpiryCount, color: '#F59E0B' },
            { name: t('scrapAssets.expired'), value: expiredCount, color: '#EF4444' }
          ],
          expiringByCategory: expiringByCategoryData
        };
        
        console.log('📊 Updated chart data:', updatedChartData);
        setChartData(updatedChartData);
      } catch (error) {
        console.error('❌ Error in fetchData:', error);
        // Fallback to empty data if API fails
        setStats({ totalAssets: 0, nearingExpiry: 0, expired: 0 });
        setChartData({
          expiryDistribution: [
            { name: t('scrapAssets.active'), value: 0, color: '#10B981' },
            { name: t('scrapAssets.nearingExpiry'), value: 0, color: '#F59E0B' },
            { name: t('scrapAssets.expired'), value: 0, color: '#EF4444' }
          ],
          expiringByCategory: []
        });
      } finally {
        setLoading(false);
        console.log('✅ Data fetching completed');
      }
    };

    fetchData();
  }, [t]);

  const handleCardClick = (type) => {
    switch (type) {
      case 'nearing':
        navigate('/scrap-assets/nearing-expiry');
        break;
      case 'expired':
        navigate('/scrap-assets/expired');
        break;
      default:
        break;
    }
  };

  const handleAddScrapAsset = () => {
    navigate('/scrap-assets/create');
  };

  const StatCard = ({ title, value, color, icon: Icon, onClick, loading }) => (
    <div 
      className={`bg-white rounded-lg shadow-md p-6 ${onClick ? 'cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-105' : ''} ${loading ? 'animate-pulse' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className={`text-3xl font-bold ${color}`}>
            {loading ? '...' : value.toLocaleString()}
          </p>
        </div>
        <div className={`p-3 rounded-full ${color.replace('text-', 'bg-').replace('-500', '-100')}`}>
          <Icon className={`w-6 h-6 ${color}`} />
        </div>
      </div>
    </div>
  );

  const DonutChart = ({ data, title }) => {
    if (loading) {
      return (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">{title}</h3>
          <div className="animate-pulse">
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      );
    }
    
    const total = data.reduce((sum, item) => sum + item.value, 0);
    
    if (total === 0) {
      return (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">{title}</h3>
          <div className="text-center text-gray-500 py-8">
            <BarChart3 className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <p>{t('scrapAssets.noAssetDataAvailable')}</p>
          </div>
        </div>
      );
    }
    
    const renderCustomLabel = ({
      cx,
      cy,
      midAngle,
      innerRadius,
      outerRadius,
      percent,
    }) => {
      const RADIAN = Math.PI / 180;
      const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
      const x = cx + radius * Math.cos(-midAngle * RADIAN);
      const y = cy + radius * Math.sin(-midAngle * RADIAN);
      return (
        <text
          x={x}
          y={y}
          fill="white"
          textAnchor={x > cx ? "start" : "end"}
          dominantBaseline="central"
          className="text-sm font-medium"
        >
          {`${(percent * 100).toFixed(0)}%`}
        </text>
      );
    };

    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">{title}</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <RechartsPieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={renderCustomLabel}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </RechartsPieChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  };

  const BarChart = ({ data, title }) => {
    if (loading) {
      return (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">{title}</h3>
          <div className="animate-pulse">
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center">
                  <div className="w-24 h-4 bg-gray-200 rounded"></div>
                  <div className="flex-1 ml-4">
                    <div className="h-6 bg-gray-200 rounded"></div>
                  </div>
                  <div className="w-12 h-4 bg-gray-200 rounded"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }
    
    if (!data || data.length === 0) {
      return (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">{title}</h3>
          <div className="text-center text-gray-500 py-8">
            <AlertTriangle className="w-12 h-12 mx-auto text-gray-300 mb-3" />
            <p>{t('scrapAssets.noAssetsExpiringWithin30Days')}</p>
            <p className="text-sm text-gray-400 mt-1">{t('scrapAssets.allAssetsAreUpToDate')}</p>
          </div>
        </div>
      );
    }
    
    // Show only first 3 categories on dashboard
    const displayData = data.slice(0, 3);
    const maxValue = Math.max(...displayData.map(item => item.count));
    
    const handleCategoryClick = (category) => {
      console.log('🔍 Clicking on category:', category);
      // Use the exact category name from the API response to avoid mismatches
      const encodedCategory = encodeURIComponent(category.trim());
      console.log('🔍 Encoded category:', encodedCategory);
      navigate(`/scrap-assets/by-category/${encodedCategory}`);
    };
    
    const handleViewAll = () => {
      navigate('/scrap-assets/categories');
    };
    
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
          {data.length > 3 && (
            <button
              onClick={handleViewAll}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors"
            >
{t('scrapAssets.viewAll')} ({data.length})
            </button>
          )}
        </div>
        <div className="space-y-4">
          {displayData.map((item, index) => (
            <div 
              key={item.category} 
              className="flex items-center cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors"
              onClick={() => handleCategoryClick(item.category)}
            >
              <div className="w-24 text-sm text-gray-600 truncate">{item.category}</div>
              <div className="flex-1 ml-4">
                <div className="relative bg-gray-200 rounded-full h-6">
                  <div
                    className="bg-yellow-500 h-6 rounded-full transition-all duration-500"
                    style={{ width: `${(item.count / maxValue) * 100}%` }}
                  ></div>
                </div>
              </div>
              <div className="w-12 text-right text-sm font-medium text-gray-800">
                {item.count}
              </div>
            </div>
          ))}
        </div>
        {data.length > 3 && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <button
              onClick={handleViewAll}
              className="w-full py-2 text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors hover:bg-blue-50 rounded"
            >
+{data.length - 3} {t('scrapAssets.moreCategories')}
            </button>
          </div>
        )}
        {data.length === 3 && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <button
              onClick={handleViewAll}
              className="w-full py-2 text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors hover:bg-blue-50 rounded"
            >
{t('scrapAssets.viewAllCategories')}
            </button>
          </div>
        )}
        <div className="mt-4 text-center">
          <div className="flex items-center justify-center">
            <div className="w-3 h-3 bg-yellow-500 rounded-full mr-2"></div>
            <span className="text-sm text-gray-600">{t('scrapAssets.expiringSoon')}</span>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-lg shadow-md p-6">
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/3"></div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow-md p-6 h-80"></div>
            <div className="bg-white rounded-lg shadow-md p-6 h-80"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">{t('scrapAssets.title')}</h1>
        <p className="mt-2 text-lg text-gray-600">{t('scrapAssets.subtitle')}</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatCard
          title={t('scrapAssets.totalAssets')}
          value={stats.totalAssets}
          color="text-gray-900"
          icon={BarChart3}
          loading={loading}
        />
        <StatCard
          title={t('scrapAssets.nearingExpiry')}
          value={stats.nearingExpiry}
          color="text-orange-500"
          icon={AlertTriangle}
          onClick={() => handleCardClick('nearing')}
          loading={loading}
        />
        <StatCard
          title={t('scrapAssets.expired')}
          value={stats.expired}
          color="text-red-500"
          icon={XCircle}
          onClick={() => handleCardClick('expired')}
          loading={loading}
        />
      </div>

             {/* Charts */}
       <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
         <DonutChart 
           data={chartData.expiryDistribution} 
           title={t('scrapAssets.assetExpiryDistribution')} 
         />
         <BarChart 
           data={chartData.expiringByCategory} 
           title={t('scrapAssets.expiringAssetsByCategory')} 
         />
       </div>

       {/* Add Scrap Asset Button */}
       <div className="mt-8 flex justify-center">
         <button
           onClick={handleAddScrapAsset}
           className="px-6 py-3 bg-[#0E2F4B] text-white rounded-lg hover:bg-[#143d65] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0E2F4B] flex items-center gap-2 transition-all duration-200 hover:scale-105 shadow-lg"
         >
           <Plus size={20} />
           <span className="text-lg font-semibold">{t('scrapAssets.addScrapAsset')}</span>
         </button>
       </div>
     </div>
   );
};

export default ScrapAssets; 