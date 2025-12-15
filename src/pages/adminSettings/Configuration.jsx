import React from 'react';
import { Settings, Sliders, Shield, Lock, Database, Users, Cog } from 'lucide-react';

const Configuration = () => {
  const features = [
    {
      icon: Shield,
      title: 'Role-Based Access',
      description: 'Manage user permissions and access levels based on job roles',
      color: 'bg-blue-50 text-blue-600 border-blue-200'
    },
    {
      icon: Database,
      title: 'System Configuration',
      description: 'Configure system settings and master data management',
      color: 'bg-green-50 text-green-600 border-green-200'
    },
    {
      icon: Users,
      title: 'User Management',
      description: 'Manage user accounts, roles, and organizational structure',
      color: 'bg-purple-50 text-purple-600 border-purple-200'
    },
    {
      icon: Lock,
      title: 'Security Settings',
      description: 'Configure security policies and access controls',
      color: 'bg-red-50 text-red-600 border-red-200'
    }
  ];

  return (
    <div className="min-h-screen p-6 bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
      {/* Header Section */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <div className="p-4 bg-gradient-to-br from-[#0E2F4B] to-[#1a3f5f] rounded-xl shadow-lg">
            <Settings className="w-10 h-10 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Configuration Center</h1>
            <p className="text-gray-600 mt-1">Manage system settings and configurations</p>
          </div>
        </div>
      </div>

      {/* Main Content Card */}
      <div className="bg-white rounded-lg shadow-md p-8 mb-6 border border-gray-200">
        <div className="flex items-start gap-6">
          <div className="p-4 bg-[#0E2F4B] bg-opacity-10 rounded-lg">
            <Cog className="w-12 h-12 text-[#0E2F4B]" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Admin Settings Mode</h2>
                  <p className="text-gray-700 leading-relaxed mb-4">
                    Welcome to the Configuration Center. This is a specialized admin interface that provides
                    access to configuration and management features based on your assigned job role permissions.
                  </p>
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {features.map((feature, index) => {
          const IconComponent = feature.icon;
          return (
            <div
              key={index}
              className={`bg-white rounded-lg shadow-md p-6 border-2 ${feature.color} hover:shadow-lg transition-shadow duration-200`}
            >
              <div className="flex items-start gap-4">
                <div className="p-3 bg-white rounded-lg shadow-sm">
                  <IconComponent className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                  <p className="text-sm text-gray-600">{feature.description}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Access Section */}
      <div className="bg-gradient-to-r from-[#0E2F4B] to-[#1a3f5f] rounded-lg shadow-lg p-6 text-white">
        <div className="flex items-center gap-4 mb-4">
          <Sliders className="w-8 h-8" />
          <h2 className="text-xl font-semibold">Quick Access</h2>
        </div>
        <p className="text-blue-100 mb-4">
          Use the sidebar navigation to access specific configuration modules. Each module is 
          tailored to your role's permissions and provides focused management capabilities.
        </p>
        <div className="flex items-center gap-2 text-sm text-blue-200">
          <Lock className="w-4 h-4" />
          <span>Access is restricted based on your job role assignments</span>
        </div>
      </div>
    </div>
  );
};

export default Configuration;

