import React, { useState, useEffect } from 'react';
import { 
  RefreshCw,
  Search,
  AlertCircle,
  ArrowLeft,
  Edit,
  Save,
  X
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import API from '../lib/axios';
import { useNavigate } from 'react-router-dom';
import { useNavigation } from '../hooks/useNavigation';

const AuditLogConfig = () => {
  const navigate = useNavigate();
  
  // Access control
  const { getAccessLevel } = useNavigation();
  const accessLevel = getAccessLevel('AUDITLOGCONFIG');
  const isReadOnly = accessLevel === 'D';
  const [configs, setConfigs] = useState([]);
  const [filteredConfigs, setFilteredConfigs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterApp, setFilterApp] = useState('');
  const [eventNames, setEventNames] = useState({});
  const [appNames, setAppNames] = useState({});
  const [editingEmail, setEditingEmail] = useState(null);
  const [emailValue, setEmailValue] = useState('');


  // Fetch audit log configurations
  const fetchConfigs = async () => {
    setIsLoading(true);
    try {
      // Fetch configs, event names, and app names in parallel
      const [configsResponse, eventNamesResponse, appNamesResponse] = await Promise.all([
        API.get('/audit-log-configs'),
        API.get('/app-events/events'),
        API.get('/app-events/apps')
      ]);
      
      if (configsResponse.data && configsResponse.data.success) {
        setConfigs(configsResponse.data.data);
        setFilteredConfigs(configsResponse.data.data);
      }
      
      if (eventNamesResponse.data && eventNamesResponse.data.success && eventNamesResponse.data.data.events) {
        const eventNameMap = {};
        eventNamesResponse.data.data.events.forEach(event => {
          eventNameMap[event.event_id] = event.text;
        });
        console.log('📊 Event names fetched from tblEvents:', eventNameMap);
        setEventNames(eventNameMap);
      }
      
      if (appNamesResponse.data && appNamesResponse.data.success && appNamesResponse.data.data.apps) {
        const appNameMap = {};
        appNamesResponse.data.data.apps.forEach(app => {
          appNameMap[app.app_id] = app.app_name;
        });
        console.log('📊 App names fetched from tblApps:', appNameMap);
        setAppNames(appNameMap);
      }
    } catch (error) {
      console.error('Error fetching audit log configs:', error);
      toast.error('Failed to load audit log configurations');
    } finally {
      setIsLoading(false);
    }
  };


  useEffect(() => {
    fetchConfigs();
  }, []);

  // Apply filters
  useEffect(() => {
    let filtered = [...configs];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(config => 
        config.app_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        config.event_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        config.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // App filter
    if (filterApp) {
      filtered = filtered.filter(config => config.app_id === filterApp);
    }

    setFilteredConfigs(filtered);
  }, [configs, searchTerm, filterApp]);

  // Toggle reporting required
  const toggleReportingRequired = async (alcId, currentValue) => {
    setIsSaving(true);
    try {
      const response = await API.put(`/audit-log-configs/${alcId}`, {
        reporting_required: !currentValue
      });
      
      if (response.data && response.data.success) {
        setConfigs(prev => prev.map(config => 
          config.alc_id === alcId 
            ? { ...config, reporting_required: !currentValue }
            : config
        ));
        toast.success('Reporting requirement updated successfully');
      }
    } catch (error) {
      console.error('Error updating reporting requirement:', error);
      toast.error('Failed to update reporting requirement');
    } finally {
      setIsSaving(false);
    }
  };

  // Toggle enabled status
  const toggleEnabled = async (alcId, currentValue) => {
    setIsSaving(true);
    try {
      const response = await API.put(`/audit-log-configs/${alcId}`, {
        enabled: !currentValue
      });
      
      if (response.data && response.data.success) {
        setConfigs(prev => prev.map(config => 
          config.alc_id === alcId 
            ? { ...config, enabled: !currentValue }
            : config
        ));
        toast.success('Status updated successfully');
      }
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    } finally {
      setIsSaving(false);
    }
  };

  // Start editing email
  const startEditingEmail = (alcId, currentEmail) => {
    setEditingEmail(alcId);
    setEmailValue(currentEmail || '');
  };

  // Cancel editing email
  const cancelEditingEmail = () => {
    setEditingEmail(null);
    setEmailValue('');
  };

  // Save email
  const saveEmail = async (alcId) => {
    if (!emailValue.trim()) {
      toast.error('Email cannot be empty');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailValue.trim())) {
      toast.error('Please enter a valid email address');
      return;
    }

    setIsSaving(true);
    try {
      const response = await API.put(`/audit-log-configs/${alcId}`, {
        reporting_email: emailValue.trim()
      });
      
      if (response.data && response.data.success) {
        setConfigs(prev => prev.map(config => 
          config.alc_id === alcId 
            ? { ...config, reporting_email: emailValue.trim() }
            : config
        ));
        setEditingEmail(null);
        setEmailValue('');
        toast.success('Email updated successfully');
      }
    } catch (error) {
      console.error('Error updating email:', error);
      toast.error('Failed to update email');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle keyboard events for email editing
  const handleEmailKeyDown = (e, alcId) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveEmail(alcId);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancelEditingEmail();
    }
  };

  // Get unique apps for filter
  const uniqueApps = [...new Set(configs.map(config => config.app_id))].sort();

  // Get app display name
  const getAppDisplayName = (appId) => {
    const appName = appNames[appId] || appId;
    if (!appNames[appId]) {
      console.warn(`App name not found for ID: ${appId}`);
    }
    return appName;
  };

  // Get event display name
  const getEventDisplayName = (eventId) => {
    const eventName = eventNames[eventId] || eventId;
    if (!eventNames[eventId]) {
      console.warn(`Event name not found for ID: ${eventId}`);
    }
    return eventName;
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
     

      {/* Simple Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#FFC107] w-4 h-4" />
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FFC107] focus:border-[#FFC107]"
            />
          </div>
          <select
            value={filterApp}
            onChange={(e) => setFilterApp(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FFC107] focus:border-[#FFC107]"
          >
            <option value="">All Apps</option>
            {uniqueApps.map(app => (
              <option key={app} value={app}>
                {getAppDisplayName(app)}
              </option>
            ))}
          </select>
          <button
            onClick={fetchConfigs}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-[#0E2F4B] text-white rounded-lg hover:bg-[#143d65] transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 text-[#FFC107] ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
            <span className="ml-2 text-gray-600">Loading...</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">App & Event</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reporting Required</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredConfigs.map((config) => (
                  <tr key={config.alc_id} className="hover:bg-gray-50">
                    <td className="px-4 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {getAppDisplayName(config.app_id)} - {getEventDisplayName(config.event_id)}
                        </div>
                        <div className="text-sm text-gray-500">
                          {config.description}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        {!isReadOnly ? (
                          <button
                            onClick={() => toggleEnabled(config.alc_id, config.enabled)}
                            disabled={isSaving}
                            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 ${
                              config.enabled ? 'bg-green-600' : 'bg-gray-200'
                            }`}
                          >
                            <span
                              className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                                config.enabled ? 'translate-x-5' : 'translate-x-1'
                              }`}
                            />
                          </button>
                        ) : null}
                        <span className="text-sm text-gray-600">
                          {config.enabled ? 'Enabled' : 'Disabled'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        {!isReadOnly ? (
                          <button
                            onClick={() => toggleReportingRequired(config.alc_id, config.reporting_required)}
                            disabled={isSaving}
                            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 ${
                              config.reporting_required ? 'bg-blue-600' : 'bg-gray-200'
                            }`}
                          >
                            <span
                              className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                                config.reporting_required ? 'translate-x-5' : 'translate-x-1'
                              }`}
                            />
                          </button>
                        ) : null}
                        <span className="text-sm text-gray-600">
                          {config.reporting_required ? 'Required' : 'Not Required'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      {!isReadOnly && editingEmail === config.alc_id ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="email"
                            value={emailValue}
                            onChange={(e) => setEmailValue(e.target.value)}
                            onKeyDown={(e) => handleEmailKeyDown(e, config.alc_id)}
                            className="px-3 py-1 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-[#FFC107] focus:border-[#FFC107] min-w-[200px]"
                            placeholder="Enter email address"
                            autoFocus
                          />
                          <button
                            onClick={() => saveEmail(config.alc_id)}
                            disabled={isSaving}
                            className="p-1 text-green-600 hover:text-green-800 disabled:opacity-50"
                            title="Save email"
                          >
                            {isSaving ? (
                              <RefreshCw className="w-4 h-4 animate-spin" />
                            ) : (
                              <Save className="w-4 h-4" />
                            )}
                          </button>
                          <button
                            onClick={cancelEditingEmail}
                            disabled={isSaving}
                            className="p-1 text-red-600 hover:text-red-800 disabled:opacity-50"
                            title="Cancel editing"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-900">
                            {config.reporting_email || 'No email set'}
                          </span>
                          {!isReadOnly && (
                            <button
                              onClick={() => startEditingEmail(config.alc_id, config.reporting_email)}
                              disabled={isSaving}
                              className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50"
                              title="Edit email"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && filteredConfigs.length === 0 && (
          <div className="text-center py-12">
            <AlertCircle className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No configurations found</h3>
            <p className="mt-1 text-sm text-gray-500">Try adjusting your search criteria</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuditLogConfig;
