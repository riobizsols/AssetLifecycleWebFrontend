import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Filter,
  ChevronDown,
  Check,
  Plus
} from 'lucide-react';
import API from '../../lib/axios';

const CreateGroupAsset = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [selectedAssetType, setSelectedAssetType] = useState('');
  const [availableAssets, setAvailableAssets] = useState([]);
  const [selectedAssets, setSelectedAssets] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTerm, setFilterTerm] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [dropdownSearchTerm, setDropdownSearchTerm] = useState('');

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
    // Simulate API call to fetch available assets
    setAvailableAssets(mockAssets);
  }, []);

  const filteredAvailableAssets = availableAssets.filter(asset => {
    const matchesSearch = (asset.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                         (asset.description?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                         (asset.asset_id?.toLowerCase() || '').includes(searchTerm.toLowerCase());
    const matchesFilter = selectedAssetType === '' || asset.asset_type_id === selectedAssetType;
    return matchesSearch && matchesFilter;
  });

  const filteredSelectedAssets = selectedAssets.filter(asset => {
    return (asset.name?.toLowerCase() || '').includes(filterTerm.toLowerCase()) ||
           (asset.description?.toLowerCase() || '').includes(filterTerm.toLowerCase()) ||
           (asset.asset_id?.toLowerCase() || '').includes(filterTerm.toLowerCase());
  });

  // Filter asset types for dropdown search
  const filteredAssetTypes = mockAssetTypes.filter(type => 
    type.asset_type_name.toLowerCase().includes(dropdownSearchTerm.toLowerCase()) ||
    type.asset_type_code.toLowerCase().includes(dropdownSearchTerm.toLowerCase())
  );

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

  const handleAssetTypeSelect = (assetType) => {
    setSelectedAssetType(assetType.asset_type_id);
    setSelectedAssets([]);
    setAvailableAssets(mockAssets);
    setIsDropdownOpen(false);
    setDropdownSearchTerm('');
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
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const groupData = {
        group_name: groupName,
        asset_type_id: selectedAssetType,
        asset_type_name: mockAssetTypes.find(type => type.asset_type_id === selectedAssetType)?.asset_type_name,
        selected_assets: selectedAssets,
        created_by: user?.user_id || 'admin'
      };

      console.log('Saving group:', groupData);
      toast.success('Asset group created successfully!');
      navigate('/group-asset');
    } catch (error) {
      console.error('Error creating group:', error);
      toast.error('Failed to create asset group');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate('/group-asset');
  };

  const selectedAssetTypeName = mockAssetTypes.find(type => type.asset_type_id === selectedAssetType);

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Main Content - Flexible height */}
      <div className="flex-1 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 h-full flex flex-col">
          {/* Group Name Section - Fixed height */}
          <div className="bg-white rounded-lg shadow-sm border p-4 sm:p-6 mb-4 sm:mb-6 flex-shrink-0">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
              <label className="text-sm font-medium text-gray-700 min-w-[80px] sm:min-w-[100px]">
                Group Name:
              </label>
              <input
                type="text"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="Enter group name"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base"
              />
            </div>
          </div>

          {/* Main Content Area - Flexible height */}
          <div className="flex-1 flex flex-col lg:flex-row gap-4 sm:gap-6 min-h-0">
            {/* Available Assets - Flexible height */}
            <div className="bg-white rounded-lg shadow-sm border flex flex-col flex-1 lg:flex-[2] min-h-0">
              <div className="p-4 border-b flex-shrink-0">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Assets List</h2>
                
                {/* Asset Type Filter - Searchable Dropdown */}
                <div className="mb-0">
                 
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm text-left bg-white flex items-center justify-between"
                    >
                      <span className={selectedAssetType ? 'text-gray-900' : 'text-gray-500'}>
                        {selectedAssetTypeName ? `${selectedAssetTypeName.asset_type_code} - ${selectedAssetTypeName.asset_type_name}` : 'Select Asset Type'}
                      </span>
                      <ChevronDown size={16} className="text-gray-400" />
                    </button>
                    
                    {isDropdownOpen && (
                      <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-hidden">
                        {/* Search Input */}
                        <div className="p-2 border-b border-gray-200">
                          <div className="relative">
                            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                            <input
                              type="text"
                              placeholder="Search asset types..."
                              value={dropdownSearchTerm}
                              onChange={(e) => setDropdownSearchTerm(e.target.value)}
                              className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                              autoFocus
                            />
                          </div>
                        </div>
                        
                        {/* Dropdown Options */}
                        <div className="max-h-48 overflow-y-auto">
                          {filteredAssetTypes.length > 0 ? (
                            filteredAssetTypes.map((type) => (
                              <button
                                key={type.asset_type_id}
                                onClick={() => handleAssetTypeSelect(type)}
                                className="w-full px-3 py-2 text-left hover:bg-gray-100 focus:bg-gray-100 focus:outline-none flex items-center justify-between"
                              >
                                <span className="text-sm text-gray-900">
                                  {type.asset_type_code} - {type.asset_type_name}
                                </span>
                                {selectedAssetType === type.asset_type_id && (
                                  <Check size={16} className="text-blue-600" />
                                )}
                              </button>
                            ))
                          ) : (
                            <div className="px-3 py-2 text-sm text-gray-500">
                              No asset types found
                            </div>
                          )}
                        </div>
                        
                        {/* Sticky Create New Button */}
                        <div className="border-t border-gray-200 bg-gray-50 sticky bottom-0">
                          <button
                            onClick={() => {
                              setIsDropdownOpen(false);
                              setDropdownSearchTerm('');
                              navigate('/master-data/asset-types/add');
                            }}
                            className="w-full px-3 py-2 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md flex items-center justify-center gap-2 font-medium"
                          >
                            <Plus size={16} />
                            Create New Asset Type
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>


              </div>

              {/* Table Container - Flexible height */}
              <div className="flex-1 overflow-hidden">
                <div className="h-full overflow-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 sticky top-0 z-10">
                      <tr>
                        <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Asset Id
                        </th>
                        <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Name
                        </th>
                        <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Description
                        </th>
                        <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Purchased On
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredAvailableAssets.map((asset, index) => (
                        <tr 
                          key={asset.asset_id}
                          className={`hover:bg-gray-50 cursor-pointer ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                          onClick={() => handleSelectAsset(asset)}
                        >
                          <td className="px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-900">{asset.asset_id}</td>
                          <td className="px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-900">{asset.name}</td>
                          <td className="px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-900">{asset.description}</td>
                          <td className="px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-900">{asset.purchased_on}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Action Buttons - Fixed width on desktop, hidden on mobile */}
            <div className="hidden lg:flex flex-col justify-center items-center gap-2 flex-shrink-0 px-2">
              {/* Transfer buttons in order: right single, right all, left single, left all */}
              <div className="flex flex-col gap-1">
                <button
                  onClick={() => handleSelectAsset(filteredAvailableAssets[0])}
                  disabled={filteredAvailableAssets.length === 0}
                  className="p-2 text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Add one asset"
                >
                  <span className="text-lg font-bold">→</span>
                </button>
                <button
                  onClick={handleSelectAll}
                  disabled={filteredAvailableAssets.length === 0}
                  className="p-2 text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Add all assets"
                >
                  <span className="text-lg font-bold">{'>>'}</span>
                </button>
                <button
                  onClick={() => handleDeselectAsset(filteredSelectedAssets[0])}
                  disabled={filteredSelectedAssets.length === 0}
                  className="p-2 text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Remove one asset"
                >
                  <span className="text-lg font-bold">←</span>
                </button>
                <button
                  onClick={handleDeselectAll}
                  disabled={filteredSelectedAssets.length === 0}
                  className="p-2 text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Remove all assets"
                >
                  <span className="text-lg font-bold">{'<<'}</span>
                </button>
              </div>
            </div>

            {/* Mobile Action Buttons - Visible only on mobile */}
            <div className="lg:hidden flex justify-center gap-4 py-2 bg-gray-50 rounded-lg">
              <button
                onClick={handleSelectAll}
                disabled={filteredAvailableAssets.length === 0}
                className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed bg-white border border-gray-300 rounded"
                title="Add all assets"
              >
                Add All
              </button>
              <button
                onClick={handleDeselectAll}
                disabled={filteredSelectedAssets.length === 0}
                className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed bg-white border border-gray-300 rounded"
                title="Remove all assets"
              >
                Remove All
              </button>
            </div>

            {/* Selected Assets - Flexible height */}
            <div className="bg-white rounded-lg shadow-sm border flex flex-col flex-1 lg:flex-[2] min-h-0">
              <div className="p-4 border-b flex-shrink-0">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Selected Assets</h2>
                
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                  <input
                    type="text"
                    placeholder="Search selected assets..."
                    value={filterTerm}
                    onChange={(e) => setFilterTerm(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  />
                </div>
              </div>

              {/* Table Container - Flexible height */}
              <div className="flex-1 overflow-hidden">
                <div className="h-full overflow-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 sticky top-0 z-10">
                      <tr>
                        <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Asset Id
                        </th>
                        <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Name
                        </th>
                        <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Description
                        </th>
                        <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Purchased On
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredSelectedAssets.map((asset, index) => (
                        <tr 
                          key={asset.asset_id}
                          className={`hover:bg-gray-50 cursor-pointer ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                          onClick={() => handleDeselectAsset(asset)}
                        >
                          <td className="px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-900">{asset.asset_id}</td>
                          <td className="px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-900">{asset.name}</td>
                          <td className="px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-900">{asset.description}</td>
                          <td className="px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-900">{asset.purchased_on}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          {/* Summary - Fixed height */}
          <div className="mt-4 sm:mt-6 bg-white rounded-lg shadow-sm border p-4 flex-shrink-0">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-2 sm:gap-0">
              <div>
                <p className="text-sm text-gray-600">
                  Total Assets Selected: <span className="font-semibold text-gray-900">{selectedAssets.length}</span>
                </p>
              </div>
              <div className="flex gap-2 sm:gap-3">
                <button
                  onClick={handleCancel}
                  className="px-3 sm:px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 text-sm sm:text-base"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={loading || !groupName.trim() || selectedAssets.length === 0}
                  className="px-4 sm:px-6 py-2 bg-[#0E2F4B] text-white rounded-md hover:bg-[#143d65] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0E2F4B] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm sm:text-base"
                >
                  {loading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <Save size={16} />
                  )}
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateGroupAsset; 