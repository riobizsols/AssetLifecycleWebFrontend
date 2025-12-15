import React, { useState } from 'react';
import MaintenanceDetails from '../../components/MaintenanceDetails';
import MaintenanceFrequency from '../../components/MaintenanceFrequency';

const MaintenanceConfiguration = () => {
  const [activeTab, setActiveTab] = useState('maintenanceDetails');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <nav className="flex flex-wrap -mb-px" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('maintenanceDetails')}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'maintenanceDetails'
                  ? 'border-[#0E2F4B] text-[#0E2F4B]'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Maintenance Details
            </button>
            <button
              onClick={() => setActiveTab('maintenanceFrequency')}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'maintenanceFrequency'
                  ? 'border-[#0E2F4B] text-[#0E2F4B]'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Maintenance Frequency
            </button>
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'maintenanceDetails' && (
          <div className="p-6">
            <MaintenanceDetails />
          </div>
        )}
        {activeTab === 'maintenanceFrequency' && <MaintenanceFrequency />}
      </div>
    </div>
  );
};

export default MaintenanceConfiguration;

