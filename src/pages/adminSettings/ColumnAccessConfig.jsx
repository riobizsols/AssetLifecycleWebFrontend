import React, { useState, useEffect } from 'react';
import API from '../../lib/axios';
import { toast } from 'react-hot-toast';
import { Save, RefreshCw, Search, CheckCircle2, XCircle, Eye, EyeOff } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

const ColumnAccessConfig = () => {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [jobRoles, setJobRoles] = useState([]);
  const [selectedJobRole, setSelectedJobRole] = useState('');
  const [selectedTable, setSelectedTable] = useState('');
  const [columns, setColumns] = useState([]);
  const [configs, setConfigs] = useState({}); // Map of field_name -> access_level
  const [searchTerm, setSearchTerm] = useState('');

  // Available tables - only Assets table for now
  const availableTables = [
    { value: 'tblAssets', label: 'Assets (tblAssets)' },
  ];

  // Fetch columns dynamically from database
  const fetchTableColumns = async (tableName) => {
    if (!tableName) return;
    
    setLoading(true);
    try {
      const response = await API.get(`/column-access-config/table-columns/${tableName}`);
      
      if (response.data.success && response.data.data) {
        setColumns(response.data.data);
      } else {
        setColumns([]);
        toast.error('Failed to fetch table columns');
      }
    } catch (error) {
      console.error('Error fetching table columns:', error);
      toast.error('Failed to fetch table columns');
      setColumns([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch job roles
  useEffect(() => {
    const fetchJobRoles = async () => {
      try {
        const response = await API.get('/job-roles');
        setJobRoles(response.data.roles || []);
      } catch (error) {
        console.error('Error fetching job roles:', error);
        toast.error('Failed to fetch job roles');
      }
    };
    fetchJobRoles();
  }, []);

  // Load columns and configurations when table is selected
  useEffect(() => {
    if (selectedTable) {
      fetchTableColumns(selectedTable);
    } else {
      setColumns([]);
      setConfigs({});
    }
  }, [selectedTable]);

  // Load existing configurations when job role and table are selected
  useEffect(() => {
    if (selectedJobRole && selectedTable) {
      loadConfigurations();
    } else {
      setConfigs({});
    }
  }, [selectedJobRole, selectedTable]);

  const loadConfigurations = async () => {
    if (!selectedJobRole || !selectedTable) return;

    setLoading(true);
    try {
      // Get existing configurations
      const response = await API.get('/column-access-config', {
        params: {
          jobRoleId: selectedJobRole,
          tableName: selectedTable,
        },
      });

      const existingConfigs = {};
      if (response.data.success && response.data.data) {
        response.data.data.forEach((config) => {
          existingConfigs[config.field_name] = config.access_level;
        });
      }
      setConfigs(existingConfigs);
    } catch (error) {
      console.error('Error loading configurations:', error);
      toast.error('Failed to load configurations');
    } finally {
      setLoading(false);
    }
  };

  const handleAccessLevelChange = async (fieldName, accessLevel) => {
    if (!selectedJobRole || !selectedTable) {
      toast.error('Please select a job role and table first');
      return;
    }

    // Update local state immediately for better UX
    const previousAccess = configs[fieldName] || 'AUTH';
    setConfigs((prev) => ({
      ...prev,
      [fieldName]: accessLevel,
    }));

    try {
      // If setting to AUTH, remove the config if it exists (AUTH is default, no need to store)
      if (accessLevel === 'AUTH') {
        // Check if config exists and delete it
        const response = await API.get('/column-access-config', {
          params: {
            jobRoleId: selectedJobRole,
            tableName: selectedTable,
          },
        });

        if (response.data.success && response.data.data) {
          const existingConfig = response.data.data.find(
            (c) => c.field_name === fieldName
          );
          
          if (existingConfig) {
            await API.delete(`/column-access-config/${existingConfig.column_access_id}`);
            toast.success(`Access level updated to AUTH (full access) for ${fieldName}`);
          } else {
            toast.success(`Access level is AUTH (full access) for ${fieldName}`);
          }
        }
      } else {
        // Save DISPLAY or NONE
        const configData = {
          jobRoleId: selectedJobRole,
          tableName: selectedTable,
          fieldName,
          accessLevel,
        };

        const response = await API.post('/column-access-config', configData);
        
        if (response.data.success) {
          toast.success(`Access level updated to ${accessLevel} for ${fieldName}`);
        } else {
          // Revert on error
          setConfigs((prev) => ({
            ...prev,
            [fieldName]: previousAccess,
          }));
          toast.error('Failed to update access level');
        }
      }
    } catch (error) {
      console.error('Error updating access level:', error);
      // Revert on error
      setConfigs((prev) => ({
        ...prev,
        [fieldName]: previousAccess,
      }));
      toast.error(error.response?.data?.message || 'Failed to update access level');
    }
  };

  const handleSave = async () => {
    if (!selectedJobRole || !selectedTable) {
      toast.error('Please select a job role and table');
      return;
    }

    setSaving(true);
    try {
      // Prepare configs array
      const configsArray = Object.entries(configs)
        .filter(([_, accessLevel]) => accessLevel && accessLevel !== 'AUTH') // Don't save AUTH
        .map(([fieldName, accessLevel]) => ({
          jobRoleId: selectedJobRole,
          tableName: selectedTable,
          fieldName,
          accessLevel,
        }));

      if (configsArray.length === 0) {
        toast.error('No configurations to save');
        setSaving(false);
        return;
      }

      // Bulk upsert
      const response = await API.post('/column-access-config/bulk', {
        configs: configsArray,
      });

      if (response.data.success) {
        toast.success(`Successfully updated ${configsArray.length} column access configuration(s)`);
        await loadConfigurations();
      } else {
        throw new Error(response.data.message || 'Failed to save');
      }
    } catch (error) {
      console.error('Error saving configurations:', error);
      toast.error(error.response?.data?.message || 'Failed to save configurations');
    } finally {
      setSaving(false);
    }
  };

  const filteredColumns = columns.filter((col) =>
    col.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
    col.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{t('columnAccessConfig.pageTitle')}</h1>
          <p className="text-gray-600">
            Configure column-level access for different job roles. AUTH access provides full access and doesn't need to be configured.
          </p>
        </div>

        {/* Selection Section */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Job Role *
              </label>
              <select
                value={selectedJobRole}
                onChange={(e) => setSelectedJobRole(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0E2F4B]"
              >
                <option value="">Select Job Role</option>
                {jobRoles.map((role) => (
                  <option key={role.job_role_id} value={role.job_role_id}>
                    {role.job_role_name || role.text || role.job_role_id}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Table *
              </label>
              <select
                value={selectedTable}
                onChange={(e) => setSelectedTable(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0E2F4B]"
              >
                <option value="">Select Table</option>
                {availableTables.map((table) => (
                  <option key={table.value} value={table.value}>
                    {table.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={loadConfigurations}
              disabled={loading || !selectedJobRole || !selectedTable}
              className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !selectedJobRole || !selectedTable}
              className="flex items-center gap-2 px-4 py-2 bg-[#0E2F4B] text-white rounded-md hover:bg-[#1a3f5f] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className={`w-4 h-4 ${saving ? 'animate-spin' : ''}`} />
              {saving ? 'Saving...' : 'Save Configurations'}
            </button>
          </div>
        </div>

        {/* Columns Configuration */}
        {selectedJobRole && selectedTable && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search columns..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0E2F4B]"
                />
              </div>
            </div>

            {loading ? (
              <div className="text-center py-8">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto text-gray-400" />
                <p className="mt-2 text-gray-600">
                  {selectedTable ? `Loading columns for ${selectedTable}...` : 'Loading...'}
                </p>
              </div>
            ) : filteredColumns.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No columns found for this table.
              </div>
            ) : (
              <div className="space-y-3">
                {filteredColumns.map((column) => {
                  const currentAccess = configs[column.name] || 'AUTH';
                  return (
                    <div
                      key={column.name}
                      className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{column.label}</div>
                        <div className="text-sm text-gray-500">{column.name}</div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleAccessLevelChange(column.name, 'AUTH')}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                              currentAccess === 'AUTH'
                                ? 'bg-green-100 text-green-800 border-2 border-green-500'
                                : 'bg-gray-100 text-gray-700 border-2 border-transparent hover:bg-gray-200'
                            }`}
                          >
                            <CheckCircle2 className="w-4 h-4 inline mr-1" />
                            AUTH
                          </button>
                          <button
                            onClick={() => handleAccessLevelChange(column.name, 'DISPLAY')}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                              currentAccess === 'DISPLAY'
                                ? 'bg-blue-100 text-blue-800 border-2 border-blue-500'
                                : 'bg-gray-100 text-gray-700 border-2 border-transparent hover:bg-gray-200'
                            }`}
                          >
                            <Eye className="w-4 h-4 inline mr-1" />
                            DISPLAY
                          </button>
                          <button
                            onClick={() => handleAccessLevelChange(column.name, 'NONE')}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                              currentAccess === 'NONE'
                                ? 'bg-red-100 text-red-800 border-2 border-red-500'
                                : 'bg-gray-100 text-gray-700 border-2 border-transparent hover:bg-gray-200'
                            }`}
                          >
                            <EyeOff className="w-4 h-4 inline mr-1" />
                            NONE
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Info Box */}
        {selectedJobRole && selectedTable && (
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-2">Access Level Information:</h3>
            <ul className="space-y-1 text-sm text-blue-800">
              <li>
                <strong>AUTH:</strong> Full access (read, write, update, delete). No configuration needed.
              </li>
              <li>
                <strong>DISPLAY:</strong> Read-only access. Users can view but cannot modify.
              </li>
              <li>
                <strong>NONE:</strong> No access. Column will be hidden from users.
              </li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default ColumnAccessConfig;

