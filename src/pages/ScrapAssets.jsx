import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import API from '../lib/axios';
import { toast } from 'react-hot-toast';
import { TrendingUp, AlertTriangle, XCircle, BarChart3, PieChart, Plus } from 'lucide-react';
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
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalAssets: 0,
    nearingExpiry: 0,
    expired: 0
  });

  // Mock data for the dashboard (keeping some for now)
  const mockStats = {
    totalAssets: 0, // Will be replaced with real data
    nearingExpiry: 0, // Will be replaced with real data
    expired: 0 // Will be replaced with real data
  };

  const [chartData, setChartData] = useState({
    expiryDistribution: [
      { name: 'Active', value: 0, color: '#10B981' },
      { name: 'Nearing Expiry', value: 0, color: '#F59E0B' },
      { name: 'Expired', value: 31, color: '#EF4444' }
    ],
    expiringByCategory: [
      { category: 'Computers', count: 2.0 },
      { category: 'Furniture', count: 1.0 },
      { category: 'Vehicles', count: 1.0 },
      { category: 'Machinery', count: 1.0 }
    ]
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
      return 0;
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
          ...chartData,
          expiryDistribution: [
            { name: 'Active', value: Math.max(0, totalAssetsCount - nearingExpiryCount - expiredCount), color: '#10B981' },
            { name: 'Nearing Expiry', value: nearingExpiryCount, color: '#F59E0B' },
            { name: 'Expired', value: expiredCount, color: '#EF4444' }
          ]
        };
        
        console.log('📊 Updated chart data:', updatedChartData);
        setChartData(updatedChartData);
      } catch (error) {
        console.error('❌ Error in fetchData:', error);
        // Fallback to mock data if API fails
        setStats(mockStats);
      } finally {
        setLoading(false);
        console.log('✅ Data fetching completed');
      }
    };

    fetchData();
  }, []);

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
    const total = data.reduce((sum, item) => sum + item.value, 0);
    
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
    const maxValue = Math.max(...data.map(item => item.count));
    
    const handleCategoryClick = (category) => {
      navigate(`/scrap-assets/by-category/${category.toLowerCase()}`);
    };
    
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">{title}</h3>
        <div className="space-y-4">
          {data.map((item, index) => (
            <div 
              key={item.category} 
              className="flex items-center cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors"
              onClick={() => handleCategoryClick(item.category)}
            >
              <div className="w-24 text-sm text-gray-600">{item.category}</div>
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
        <div className="mt-4 text-center">
          <div className="flex items-center justify-center">
            <div className="w-3 h-3 bg-yellow-500 rounded-full mr-2"></div>
            <span className="text-sm text-gray-600">Expiring Soon</span>
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
      

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatCard
          title="Total Assets"
          value={stats.totalAssets}
          color="text-gray-900"
          icon={BarChart3}
          loading={loading}
        />
        <StatCard
          title="Nearing Expiry"
          value={stats.nearingExpiry}
          color="text-orange-500"
          icon={AlertTriangle}
          onClick={() => handleCardClick('nearing')}
          loading={loading}
        />
        <StatCard
          title="Expired"
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
           title="Asset Expiry Distribution" 
         />
         <BarChart 
           data={chartData.expiringByCategory} 
           title="Expiring Assets by Category" 
         />
       </div>

       {/* Add Scrap Asset Button */}
       <div className="mt-8 flex justify-center">
         <button
           onClick={handleAddScrapAsset}
           className="px-6 py-3 bg-[#0E2F4B] text-white rounded-lg hover:bg-[#143d65] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0E2F4B] flex items-center gap-2 transition-all duration-200 hover:scale-105 shadow-lg"
         >
           <Plus size={20} />
           <span className="text-lg font-semibold">Add Scrap Asset</span>
         </button>
       </div>
     </div>
   );
};

export default ScrapAssets; 