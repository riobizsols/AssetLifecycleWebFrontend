import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import API from '../../lib/axios';
import { toast } from 'react-hot-toast';
import { Plus, ArrowLeft, Save, X } from 'lucide-react';
import ContentBox from '../ContentBox';

const CreateScrapAsset = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [availableAssets, setAvailableAssets] = useState([]);
  const [selectedAssets, setSelectedAssets] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [assetTypeFilter, setAssetTypeFilter] = useState('');

  // Mock data for available assets
  const mockAvailableAssets = [
    {
      asset_id: 'A001',
      asset_name: 'Dell Latitude 5520',
      asset_type: 'Laptop',
      category: 'Computers',
      department: 'IT Department',
      assigned_to: 'John Doe',
      purchase_date: '2022-01-15',
      warranty_expiry: '2025-01-15',
      current_value: 1200,
      status: 'Active'
    },
    {
      asset_id: 'A002',
      asset_name: 'HP EliteBook 840',
      asset_type: 'Laptop',
      category: 'Computers',
      department: 'Engineering',
      assigned_to: 'Jane Smith',
      purchase_date: '2022-03-20',
      warranty_expiry: '2025-03-20',
      current_value: 1100,
      status: 'Active'
    },
    {
      asset_id: 'A003',
      asset_name: 'Office Desk',
      asset_type: 'Furniture',
      category: 'Furniture',
      department: 'HR Department',
      assigned_to: 'Mike Johnson',
      purchase_date: '2021-06-10',
      warranty_expiry: '2024-06-10',
      current_value: 300,
      status: 'Active'
    },
    {
      asset_id: 'A004',
      asset_name: 'Conference Chair',
      asset_type: 'Furniture',
      category: 'Furniture',
      department: 'Sales',
      assigned_to: 'Lisa Chen',
      purchase_date: '2021-08-15',
      warranty_expiry: '2024-08-15',
      current_value: 200,
      status: 'Active'
    },
    {
      asset_id: 'A005',
      asset_name: 'Company Van',
      asset_type: 'Vehicle',
      category: 'Vehicles',
      department: 'Logistics',
      assigned_to: 'Tom Brown',
      purchase_date: '2020-12-01',
      warranty_expiry: '2023-12-01',
      current_value: 25000,
      status: 'Active'
    }
  ];

  useEffect(() => {
    // Simulate API call to get available assets
    setTimeout(() => {
      setAvailableAssets(mockAvailableAssets);
    }, 1000);
  }, []);

  const [formData, setFormData] = useState({
    scrap_reason: '',
    estimated_value: '',
    disposal_method: 'Sale',
    scrap_date: new Date().toISOString().split('T')[0],
    buyer_name: '',
    buyer_email: '',
    buyer_phone: '',
    buyer_company: ''
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSelectAsset = (asset) => {
    if (!selectedAssets.find(item => item.asset_id === asset.asset_id)) {
      setSelectedAssets(prev => [...prev, asset]);
    }
  };

  const handleDeselectAsset = (asset) => {
    setSelectedAssets(prev => prev.filter(item => item.asset_id !== asset.asset_id));
  };

  const handleSelectAll = () => {
    const filteredAssets = availableAssets.filter(asset => 
      asset.asset_name.toLowerCase().includes(searchTerm.toLowerCase()) &&
      (assetTypeFilter === '' || asset.asset_type === assetTypeFilter)
    );
    setSelectedAssets(filteredAssets);
  };

  const handleDeselectAll = () => {
    setSelectedAssets([]);
  };

  const filteredAvailableAssets = availableAssets.filter(asset => 
    asset.asset_name.toLowerCase().includes(searchTerm.toLowerCase()) &&
    (assetTypeFilter === '' || asset.asset_type === assetTypeFilter) &&
    !selectedAssets.find(selected => selected.asset_id === asset.asset_id)
  );

  const filteredSelectedAssets = selectedAssets.filter(asset => 
    asset.asset_name.toLowerCase().includes(searchTerm.toLowerCase()) &&
    (assetTypeFilter === '' || asset.asset_type === assetTypeFilter)
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (selectedAssets.length === 0) {
      toast.error('Please select at least one asset to scrap');
      return;
    }

    if (!formData.scrap_reason.trim()) {
      toast.error('Please provide a scrap reason');
      return;
    }

    setLoading(true);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast.success('Scrap assets created successfully!');
      navigate('/scrap-assets');
    } catch (error) {
      toast.error('Failed to create scrap assets');
      console.error('Error creating scrap assets:', error);
    } finally {
      setLoading(false);
    }
  };

  const assetTypes = [...new Set(availableAssets.map(asset => asset.asset_type))];

  return (
    <div className="min-h-screen bg-gray-50">
      <ContentBox>
        <div className="flex justify-between items-center mb-6">
       
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Asset Selection Section */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Select Assets to Scrap</h3>
            
            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Search Assets</label>
                <input
                  type="text"
                  placeholder="Search by asset name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Asset Type</label>
                <select
                  value={assetTypeFilter}
                  onChange={(e) => setAssetTypeFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Types</option>
                  {assetTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Asset Selection Tables */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Available Assets */}
              <div>
                <h4 className="text-md font-medium text-gray-700 mb-3">Available Assets</h4>
                <div className="border border-gray-200 rounded-lg max-h-64 overflow-y-auto">
                  <table className="min-w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Asset</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Value</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredAvailableAssets.map((asset) => (
                        <tr key={asset.asset_id} className="hover:bg-gray-50">
                          <td className="px-3 py-2">
                            <div>
                              <div className="text-sm font-medium text-gray-900">{asset.asset_name}</div>
                              <div className="text-xs text-gray-500">{asset.asset_id}</div>
                            </div>
                          </td>
                          <td className="px-3 py-2 text-sm text-gray-900">{asset.asset_type}</td>
                          <td className="px-3 py-2 text-sm text-gray-900">${asset.current_value}</td>
                          <td className="px-3 py-2">
                            <button
                              type="button"
                              onClick={() => handleSelectAsset(asset)}
                              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                            >
                              Add
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Transfer Controls */}
              <div className="hidden lg:flex flex-col justify-center items-center gap-2">
                <div className="flex flex-col gap-1">
                  <button
                    type="button"
                    onClick={() => handleSelectAsset(filteredAvailableAssets[0])}
                    disabled={filteredAvailableAssets.length === 0}
                    className="p-2 text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Add one asset"
                  >
                    <span className="text-lg font-bold">→</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    disabled={filteredAvailableAssets.length === 0}
                    className="p-2 text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Add all assets"
                  >
                    <span className="text-lg font-bold">{'>>'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeselectAsset(filteredSelectedAssets[0])}
                    disabled={filteredSelectedAssets.length === 0}
                    className="p-2 text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Remove one asset"
                  >
                    <span className="text-lg font-bold">←</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleDeselectAll}
                    disabled={filteredSelectedAssets.length === 0}
                    className="p-2 text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Remove all assets"
                  >
                    <span className="text-lg font-bold">{'<<'}</span>
                  </button>
                </div>
              </div>

              {/* Selected Assets */}
              <div>
                <h4 className="text-md font-medium text-gray-700 mb-3">Selected Assets ({selectedAssets.length})</h4>
                <div className="border border-gray-200 rounded-lg max-h-64 overflow-y-auto">
                  <table className="min-w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Asset</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Value</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredSelectedAssets.map((asset) => (
                        <tr key={asset.asset_id} className="hover:bg-gray-50">
                          <td className="px-3 py-2">
                            <div>
                              <div className="text-sm font-medium text-gray-900">{asset.asset_name}</div>
                              <div className="text-xs text-gray-500">{asset.asset_id}</div>
                            </div>
                          </td>
                          <td className="px-3 py-2 text-sm text-gray-900">{asset.asset_type}</td>
                          <td className="px-3 py-2 text-sm text-gray-900">${asset.current_value}</td>
                          <td className="px-3 py-2">
                            <button
                              type="button"
                              onClick={() => handleDeselectAsset(asset)}
                              className="text-red-600 hover:text-red-800 text-sm font-medium"
                            >
                              Remove
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          {/* Scrap Details Section */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Scrap Details</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Scrap Reason *</label>
                <textarea
                  name="scrap_reason"
                  value={formData.scrap_reason}
                  onChange={handleInputChange}
                  rows={3}
                  placeholder="Enter the reason for scrapping these assets..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Estimated Value</label>
                <input
                  type="number"
                  name="estimated_value"
                  value={formData.estimated_value}
                  onChange={handleInputChange}
                  placeholder="Enter estimated scrap value..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Disposal Method</label>
                <select
                  name="disposal_method"
                  value={formData.disposal_method}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Sale">Sale</option>
                  <option value="Recycle">Recycle</option>
                  <option value="Donation">Donation</option>
                  <option value="Destruction">Destruction</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Scrap Date</label>
                <input
                  type="date"
                  name="scrap_date"
                  value={formData.scrap_date}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Buyer Details Section */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Buyer Details (Optional)</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Buyer Name</label>
                <input
                  type="text"
                  name="buyer_name"
                  value={formData.buyer_name}
                  onChange={handleInputChange}
                  placeholder="Enter buyer name..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Buyer Email</label>
                <input
                  type="email"
                  name="buyer_email"
                  value={formData.buyer_email}
                  onChange={handleInputChange}
                  placeholder="Enter buyer email..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Buyer Phone</label>
                <input
                  type="tel"
                  name="buyer_phone"
                  value={formData.buyer_phone}
                  onChange={handleInputChange}
                  placeholder="Enter buyer phone..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Buyer Company</label>
                <input
                  type="text"
                  name="buyer_company"
                  value={formData.buyer_company}
                  onChange={handleInputChange}
                  placeholder="Enter buyer company..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-4">
            <button
              type="button"
              onClick={() => navigate('/scrap-assets')}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 flex items-center gap-2"
            >
              <X size={16} />
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || selectedAssets.length === 0}
              className="px-6 py-2 bg-[#0E2F4B] text-white rounded-md hover:bg-[#143d65] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0E2F4B] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Save size={16} />
              {loading ? 'Creating...' : 'Create Scrap Assets'}
            </button>
          </div>
        </form>
      </ContentBox>
    </div>
  );
};

export default CreateScrapAsset; 