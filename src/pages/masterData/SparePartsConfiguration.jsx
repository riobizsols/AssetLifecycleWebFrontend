import React, { useState } from 'react';
import SparePartCategoryTab from '../../components/spareParts/SparePartCategoryTab';
import SparePartAssetTypeMappingTab from '../../components/spareParts/SparePartAssetTypeMappingTab';

const SparePartsConfiguration = () => {
  const [activeTab, setActiveTab] = useState('category');

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <nav className="flex flex-wrap -mb-px" aria-label="Tabs">
            <button
              type="button"
              onClick={() => setActiveTab('category')}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'category'
                  ? 'border-[#0E2F4B] text-[#0E2F4B]'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Spare Part Category
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('mapping')}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'mapping'
                  ? 'border-[#0E2F4B] text-[#0E2F4B]'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Asset Type Mapping
            </button>
          </nav>
        </div>
      </div>

      <div>
        {activeTab === 'category' && <SparePartCategoryTab />}
        {activeTab === 'mapping' && <SparePartAssetTypeMappingTab />}
      </div>
    </div>
  );
};

export default SparePartsConfiguration;
