import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { toast } from 'react-hot-toast';
import { 
  ArrowRight, 
  ArrowLeft, 
  ChevronRight, 
  ChevronLeft, 
  Save, 
  X,
  Search,
  Filter
} from 'lucide-react';
import API from '../../lib/axios';

const EditGroupAsset = () => {
  const navigate = useNavigate();
  const { groupId } = useParams();
  const location = useLocation();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [selectedAssetType, setSelectedAssetType] = useState('');
  const [availableAssets, setAvailableAssets] = useState([]);
  const [selectedAssets, setSelectedAssets] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTerm, setFilterTerm] = useState('');
  const [isEdit, setIsEdit] = useState(false);
  const [originalGroupData, setOriginalGroupData] = useState(null);

  // Mock data for demonstration - replace with actual API calls
  const mockAssetTypes = [
    { asset_type_id: 'AT001', asset_type_name: 'Laptop', asset_type_code: 'AT001' },
    { asset_type_id: 'AT002', asset_type_name: 'Desktop', asset_type_code: 'AT002' },
    { asset_type_id: 'AT003', asset_type_name: 'Monitor', asset_type_code: 'AT003' },
    { asset_type_id: 'AT004', asset_type_name: 'Printer', asset_type_code: 'AT004' },
    { asset_type_id: 'AT005', asset_type_name: 'Furniture', asset_type_code: 'AT005' },
    { asset_type_id: 'AT006', asset_type_name: 'Vehicle', asset_type_code: 'AT006' }
  ];

  const mockAssets = [
    { asset_id: 'A001', name: 'Dell XPS 13', description: 'Laptop - Dell XPS 13', purchased_on: '2023-01-15', asset_type_id: 'AT001', asset_type_name: 'Laptop' },
    { asset_id: 'A002', name: 'HP Pavilion', description: 'Laptop - HP Pavilion', purchased_on: '2023-02-20', asset_type_id: 'AT001', asset_type_name: 'Laptop' },
    { asset_id: 'A003', name: 'Lenovo ThinkPad', description: 'Laptop - Lenovo ThinkPad', purchased_on: '2023-03-10', asset_type_id: 'AT001', asset_type_name: 'Laptop' },
    { asset_id: 'A004', name: 'Dell OptiPlex', description: 'Desktop - Dell OptiPlex', purchased_on: '2023-04-05', asset_type_id: 'AT002', asset_type_name: 'Desktop' },
    { asset_id: 'A005', name: 'Samsung 24"', description: 'Monitor - Samsung 24 inch', purchased_on: '2023-01-10', asset_type_id: 'AT003', asset_type_name: 'Monitor' },
    { asset_id: 'A006', name: 'LG 27"', description: 'Monitor - LG 27 inch', purchased_on: '2023-01-12', asset_type_id: 'AT003', asset_type_name: 'Monitor' },
    { asset_id: 'A007', name: 'HP LaserJet', description: 'Printer - HP LaserJet', purchased_on: '2023-02-15', asset_type_id: 'AT004', asset_type_name: 'Printer' },
    { asset_id: 'A008', name: 'Canon Printer', description: 'Printer - Canon', purchased_on: '2023-02-18', asset_type_id: 'AT004', asset_type_name: 'Printer' }
  ];

  useEffect(() => {
    // Check if we're in edit mode
    if (location.state?.isEdit && location.state?.groupData) {
      setIsEdit(true);
      const groupData = location.state.groupData;
      setOriginalGroupData(groupData);
      setGroupName(groupData.group_name);
      setSelectedAssetType(groupData.asset_type_id);
      
      // Mock: Load existing assets for this group
      const existingAssets = mockAssets.filter(asset => 
        asset.asset_type_id === groupData.asset_type_id
      );
      setSelectedAssets(existingAssets.slice(0, groupData.asset_count)); // Mock selected assets
      setAvailableAssets(mockAssets.filter(asset => 
        asset.asset_type_id === groupData.asset_type_id && 
        !existingAssets.slice(0, groupData.asset_count).some(selected => selected.asset_id === asset.asset_id)
      ));
    } else {
      // Create mode - initialize with empty state
      setAvailableAssets(mockAssets);
    }
  }, [location.state]);

  const filteredAvailableAssets = availableAssets.filter(asset => {
    const matchesSearch = asset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         asset.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         asset.asset_id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = selectedAssetType === '' || asset.asset_type_id === selectedAssetType;
    return matchesSearch && matchesFilter;
  });

  const filteredSelectedAssets = selectedAssets.filter(asset => {
    return asset.name.toLowerCase().includes(filterTerm.toLowerCase()) ||
           asset.description.toLowerCase().includes(filterTerm.toLowerCase()) ||
           asset.asset_id.toLowerCase().includes(filterTerm.toLowerCase());
  });

  const handleSelectAsset = (asset) => {
    setSelectedAssets(prev => [...prev, asset]);
    setAvailableAssets(prev => prev.filter(a => a.asset_id !== asset.asset_id));
  };

  const handleDeselectAsset = (asset) => {
    setAvailableAssets(prev => [...prev, asset]);
    setSelectedAssets(prev => prev.filter(a => a.asset_id !== asset.asset_id));
  };

  const handleSelectAll = () => {
    setSelectedAssets(prev => [...prev, ...filteredAvailableAssets]);
    setAvailableAssets(prev => prev.filter(asset => 
      !filteredAvailableAssets.some(selected => selected.asset_id === asset.asset_id)
    ));
  };

  const handleDeselectAll = () => {
    setAvailableAssets(prev => [...prev, ...filteredSelectedAssets]);
    setSelectedAssets(prev => prev.filter(asset => 
      !filteredSelectedAssets.some(selected => selected.asset_id === asset.asset_id)
    ));
  };

  const handleSave = async () => {
    if (!groupName.trim()) {
      toast.error('Please enter a group name');
      return;
    }

    if (selectedAssetType === '') {
      toast.error('Please select an asset type');
      return;
    }

    if (selectedAssets.length === 0) {
      toast.error('Please select at least one asset');
      return;
    }

    setLoading(true);
    try {
      const groupData = {
        group_id: isEdit ? groupId : undefined,
        group_name: groupName,
        asset_type_id: selectedAssetType,
        asset_type_name: mockAssetTypes.find(type => type.asset_type_id === selectedAssetType)?.asset_type_name,
        assets: selectedAssets.map(asset => asset.asset_id),
        created_by: user?.username || 'Admin User',
        created_date: new Date().toISOString().split('T')[0]
      };

      console.log('Saving group asset:', groupData);
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast.success(isEdit ? 'Group Asset updated successfully!' : 'Group Asset created successfully!');
      navigate('/group-asset');
    } catch (error) {
      console.error('Error saving group asset:', error);
      toast.error('Failed to save group asset');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate('/group-asset');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Asset Groups</h1>
              <p className="text-sm text-gray-600">
                {isEdit ? 'Edit existing asset group' : 'Create a new asset group'}
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleCancel}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={loading || !groupName.trim() || selectedAssets.length === 0}
                className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <Save size={16} />
                )}
                {isEdit ? 'Update' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Group Name Section */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-gray-700 min-w-[100px]">
              Group Name:
            </label>
            <input
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="Enter group name"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Available Assets */}
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="p-4 border-b">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Assets List</h2>
              
              {/* Asset Type Filter */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Asset Type
                </label>
                <select
                  value={selectedAssetType}
                  onChange={(e) => {
                    setSelectedAssetType(e.target.value);
                    // Clear selected assets when asset type changes
                    setSelectedAssets([]);
                    setAvailableAssets(mockAssets);
                  }}
                  disabled={isEdit} // Disable in edit mode
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  <option value="">Select Asset Type</option>
                  {mockAssetTypes.map(type => (
                    <option key={type.asset_type_id} value={type.asset_type_id}>
                      {type.asset_type_code} - {type.asset_type_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="text"
                  placeholder="Search assets..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div className="overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Asset Id
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Description
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Purchased On
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredAvailableAssets.map((asset) => (
                    <tr 
                      key={asset.asset_id}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => handleSelectAsset(asset)}
                    >
                      <td className="px-4 py-3 text-sm text-gray-900">{asset.asset_id}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{asset.name}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{asset.description}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{asset.purchased_on}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col justify-center items-center gap-4">
            <button
              onClick={handleSelectAsset}
              disabled={filteredAvailableAssets.length === 0}
              className="p-2 text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Add selected asset"
            >
              <ArrowRight size={20} />
            </button>
            <button
              onClick={handleSelectAll}
              disabled={filteredAvailableAssets.length === 0}
              className="p-2 text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Add all assets"
            >
              <ChevronRight size={20} />
            </button>
            <button
              onClick={handleDeselectAsset}
              disabled={filteredSelectedAssets.length === 0}
              className="p-2 text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Remove selected asset"
            >
              <ArrowLeft size={20} />
            </button>
            <button
              onClick={handleDeselectAll}
              disabled={filteredSelectedAssets.length === 0}
              className="p-2 text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Remove all assets"
            >
              <ChevronLeft size={20} />
            </button>
          </div>

          {/* Selected Assets */}
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="p-4 border-b">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Selected Assets</h2>
              
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="text"
                  placeholder="Search selected assets..."
                  value={filterTerm}
                  onChange={(e) => setFilterTerm(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div className="overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Asset Id
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Description
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Purchased On
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredSelectedAssets.map((asset) => (
                    <tr 
                      key={asset.asset_id}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => handleDeselectAsset(asset)}
                    >
                      <td className="px-4 py-3 text-sm text-gray-900">{asset.asset_id}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{asset.name}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{asset.description}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{asset.purchased_on}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="mt-6 bg-white rounded-lg shadow-sm border p-4">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-600">
                Total Assets Selected: <span className="font-semibold text-gray-900">{selectedAssets.length}</span>
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleCancel}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={loading || !groupName.trim() || selectedAssets.length === 0}
                className="px-6 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <Save size={16} />
                )}
                {isEdit ? 'Update' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditGroupAsset; 