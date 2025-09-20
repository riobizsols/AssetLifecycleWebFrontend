import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  Download, 
  Calendar, 
  User, 
  Activity, 
  Database,
  ChevronDown,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  XCircle,
  Eye,
  Trash2,
  Edit,
  Plus,
  Settings
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import API from '../lib/axios';
import ContentBox from '../components/ContentBox';
import CustomTable from '../components/CustomTable';
import SearchableDropdown from '../components/ui/SearchableDropdown';
import { useLanguage } from '../contexts/LanguageContext';

const AuditLogsView = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  
  // State management
  const [auditLogs, setAuditLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  // Filter states
  const [filters, setFilters] = useState({
    users: [],
    startDate: '',
    endDate: '',
    application: '',
    event: '',
    maxRows: 100
  });

  // Dropdown options
  const [users, setUsers] = useState([]);
  const [applications, setApplications] = useState([]);
  const [events, setEvents] = useState([]);

  // Table columns
  const columns = [
    { name: 'timestamp', label: t('auditLogs.timestamp'), visible: true },
    { name: 'user_id', label: t('auditLogs.userID'), visible: true },
    { name: 'user_name', label: t('auditLogs.userName'), visible: true },
    { name: 'application', label: t('auditLogs.application'), visible: true },
    { name: 'event', label: t('auditLogs.event'), visible: true },
    { name: 'description', label: t('auditLogs.description'), visible: true },
    { name: 'entity_type', label: t('auditLogs.entityType'), visible: false },
    { name: 'entity_id', label: t('auditLogs.entityID'), visible: false },
    { name: 'ip_address', label: t('auditLogs.ipAddress'), visible: false },
    { name: 'user_agent', label: t('auditLogs.userAgent'), visible: false }
  ];

  // Format timestamp to human-readable format
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'N/A';
    try {
      const date = new Date(timestamp);
      const now = new Date();
      const diffTime = now - date;
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
      const diffMinutes = Math.floor(diffTime / (1000 * 60));

      // Format the date
      const formattedDate = date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });

      // Add relative time
      let relativeTime = '';
      if (diffMinutes < 1) {
        relativeTime = t('auditLogs.justNow');
      } else if (diffMinutes < 60) {
        relativeTime = t('auditLogs.minutesAgo', { minutes: diffMinutes });
      } else if (diffHours < 24) {
        relativeTime = t('auditLogs.hoursAgo', { hours: diffHours });
      } else if (diffDays === 1) {
        relativeTime = t('auditLogs.yesterday');
      } else if (diffDays < 7) {
        relativeTime = t('auditLogs.daysAgo', { days: diffDays });
      } else {
        relativeTime = t('auditLogs.weeksAgo', { weeks: Math.floor(diffDays / 7) });
      }

      return {
        formatted: formattedDate,
        relative: relativeTime
      };
    } catch (error) {
      console.error('Error formatting timestamp:', error);
      return { formatted: timestamp, relative: t('auditLogs.unknown') };
    }
  };

  // Generate user initials and random background color
  const getUserInitials = (userName) => {
    if (!userName) return 'U';
    const names = userName.split(' ');
    if (names.length >= 2) {
      return (names[0][0] + names[names.length - 1][0]).toUpperCase();
    }
    return userName.substring(0, 2).toUpperCase();
  };

  const getRandomBgColor = (userName) => {
    const colors = [
      'bg-blue-500',
      'bg-green-500', 
      'bg-purple-500',
      'bg-pink-500',
      'bg-indigo-500',
      'bg-yellow-500',
      'bg-red-500',
      'bg-teal-500',
      'bg-orange-500',
      'bg-cyan-500'
    ];
    // Use userName as seed for consistent colors
    const hash = userName.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    return colors[Math.abs(hash) % colors.length];
  };

  // Fetch users on component mount
  useEffect(() => {
    fetchUsers();
    fetchApplications();
    fetchEvents();
    fetchAuditLogs();
  }, []);

  // Fetch audit logs when filters change
  useEffect(() => {
    fetchAuditLogs(1, filters.maxRows);
  }, [filters]);

  const fetchUsers = async () => {
    try {
      const response = await API.get('/users/get-users');
      console.log('Users API response:', response.data);
      
      if (response.data && response.data.success && response.data.data) {
        setUsers(response.data.data.map(user => ({
          id: user.user_id,
          text: `${user.full_name || user.email} (${user.user_id})`,
          name: user.full_name || user.email
        })));
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchApplications = async () => {
    try {
      const response = await API.get('/app-events/apps');
      if (response.data && response.data.success) {
        setApplications(response.data.data.apps.map(app => ({
          id: app.app_id,
          text: app.app_name,
          name: app.app_name
        })));
      }
    } catch (error) {
      console.error('Error fetching applications:', error);
    }
  };

  const fetchEvents = async () => {
    try {
      const response = await API.get('/app-events/events');
      if (response.data && response.data.success) {
        setEvents(response.data.data.events.map(event => ({
          id: event.event_id,
          text: event.text,
          name: event.text
        })));
      }
    } catch (error) {
      console.error('Error fetching events:', error);
    }
  };

  const fetchAuditLogs = async (page = 1, limit = filters.maxRows) => {
    setIsLoading(true);
    try {
      // Build query parameters
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString()
      });

      // Add filters to query parameters
      if (filters.users.length > 0) {
        params.append('user_id', filters.users[0]); // API expects single user_id
      }
      if (filters.startDate) {
        params.append('start_date', filters.startDate);
      }
      if (filters.endDate) {
        params.append('end_date', filters.endDate);
      }
      if (filters.application) {
        params.append('app_id', filters.application);
      }
      if (filters.event) {
        params.append('event_id', filters.event);
      }

      const response = await API.get(`/audit-logs?${params.toString()}`);
      
      if (response.data && response.data.success) {
        const { audit_logs, pagination } = response.data.data;
        
        // Transform API data to match component structure
        const transformedLogs = audit_logs.map(log => ({
          id: log.al_id,
          timestamp: log.created_on,
          user_id: log.user_id,
          user_name: log.user_name || log.user_email || log.user_id, // Use full name, email, or user_id as fallback
          application: log.app_name || log.app_id, // Use app name or app_id as fallback
          event: log.event_name || log.event_id, // Use event name or event_id as fallback
          entity_type: 'audit_log', // Default since not in API
          entity_id: log.al_id,
          description: log.text,
          ip_address: 'N/A', // Not available in API
          user_agent: 'N/A' // Not available in API
        }));

        setAuditLogs(transformedLogs);
        setTotalRecords(pagination.total_count);
        setTotalPages(pagination.total_pages);
        setCurrentPage(pagination.current_page);
        
        // Debug logging
        console.log('Pagination data:', {
          total_count: pagination.total_count,
          total_pages: pagination.total_pages,
          current_page: pagination.current_page,
          per_page: pagination.per_page
        });
      } else {
        throw new Error('Invalid response format');
      }
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      toast.error(t('auditLogs.failedToFetchAuditLogs'));
      setAuditLogs([]);
      setTotalRecords(0);
      setTotalPages(1);
    } finally {
      setIsLoading(false);
    }
  };

  const generateMockAuditLogs = () => {
    const mockLogs = [];
    const users = ['john.doe', 'jane.smith', 'admin', 'manager1', 'user1'];
    const applications = ['asset-management', 'maintenance', 'reports', 'user-management', 'system'];
    const events = ['create', 'view', 'update', 'delete', 'login', 'logout', 'export'];
    const entityTypes = ['asset', 'maintenance', 'user', 'report', 'document'];
    
    for (let i = 0; i < 500; i++) {
      const randomDate = new Date();
      randomDate.setDate(randomDate.getDate() - Math.floor(Math.random() * 30));
      
      mockLogs.push({
        id: i + 1,
        timestamp: randomDate.toISOString(),
        user_id: users[Math.floor(Math.random() * users.length)],
        user_name: users[Math.floor(Math.random() * users.length)],
        application: applications[Math.floor(Math.random() * applications.length)],
        event: events[Math.floor(Math.random() * events.length)],
        entity_type: entityTypes[Math.floor(Math.random() * entityTypes.length)],
        entity_id: Math.floor(Math.random() * 1000),
        description: `User performed ${events[Math.floor(Math.random() * events.length)]} action on ${entityTypes[Math.floor(Math.random() * entityTypes.length)]}`,
        ip_address: `192.168.1.${Math.floor(Math.random() * 255)}`,
        user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      });
    }
    
    return mockLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  };

  // Server-side filtering is handled in fetchAuditLogs

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
    fetchAuditLogs(page, filters.maxRows);
  };

  const handleExport = () => {
    const csvContent = generateCSV(auditLogs);
    downloadCSV(csvContent, 'audit_logs.csv');
    toast.success(t('auditLogs.auditLogsExportedSuccessfully'));
  };

  const generateCSV = (data) => {
    const headers = columns.map(col => col.label).join(',');
    const rows = data.map(log => 
      columns.map(col => `"${log[col.name] || ''}"`).join(',')
    );
    return [headers, ...rows].join('\n');
  };

  const downloadCSV = (content, filename) => {
    const blob = new Blob([content], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getEventIcon = (event) => {
    switch (event) {
      case 'create': return <Plus className="w-4 h-4 text-green-600" />;
      case 'view': return <Eye className="w-4 h-4 text-blue-600" />;
      case 'update': return <Edit className="w-4 h-4 text-yellow-600" />;
      case 'delete': return <Trash2 className="w-4 h-4 text-red-600" />;
      case 'login': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'logout': return <XCircle className="w-4 h-4 text-red-600" />;
      default: return <Activity className="w-4 h-4 text-gray-600" />;
    }
  };

  const getEventBadgeColor = (event) => {
    switch (event) {
      case 'create': return 'bg-green-100 text-green-800';
      case 'view': return 'bg-blue-100 text-blue-800';
      case 'update': return 'bg-yellow-100 text-yellow-800';
      case 'delete': return 'bg-red-100 text-red-800';
      case 'login': return 'bg-green-100 text-green-800';
      case 'logout': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Since we're using server-side pagination, we don't need client-side pagination
  const paginatedLogs = auditLogs;

  const resetFilters = () => {
    setFilters({
      users: [],
      startDate: '',
      endDate: '',
      application: '',
      event: '',
      maxRows: 100
    });
  };

  // Custom render function for user name column
  const renderUserName = (col, row) => {
    if (col.name === 'user_name') {
      return (
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 ${getRandomBgColor(row.user_name)} rounded-full flex items-center justify-center text-white text-sm font-medium`}>
            {getUserInitials(row.user_name)}
          </div>
          <span className="text-sm">{row.user_name}</span>
        </div>
      );
    }
    return row[col.name];
  };

  // Custom render function for event column
  const renderEvent = (col, row) => {
    if (col.name === 'event') {
      return (
        <div className="flex items-center gap-2">
          {getEventIcon(row.event)}
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getEventBadgeColor(row.event)}`}>
            {row.event}
          </span>
        </div>
      );
    }
    return row[col.name];
  };

  // Custom render function for application column
  const renderApplication = (col, row) => {
    if (col.name === 'application') {
      return (
        <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs">
          {row.application}
        </span>
      );
    }
    return row[col.name];
  };

  // Custom render function for timestamp column
  const renderTimestamp = (col, row) => {
    if (col.name === 'timestamp') {
      const timeInfo = formatTimestamp(row.timestamp);
      return (
        <div className="flex flex-col">
          <span className="text-sm font-medium text-gray-900">{timeInfo.formatted}</span>
          <span className="text-xs text-gray-500">{timeInfo.relative}</span>
        </div>
      );
    }
    return row[col.name];
  };

  // Custom render function for description column
  const renderDescription = (col, row) => {
    if (col.name === 'description') {
      return (
        <span className="text-sm text-gray-900 max-w-xs truncate" title={row.description}>
          {row.description}
        </span>
      );
    }
    return row[col.name];
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-end">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/audit-logs-view/config')}
              className="flex items-center gap-2 px-4 py-2 bg-[#0E2F4B] text-white rounded-lg hover:bg-[#143d65] transition-colors"
            >
              <Settings className="w-4 h-4 text-[#FFC107]" />
              {t('auditLogs.config')}
            </button>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Filter className="w-4 h-4" />
              {t('auditLogs.filters')}
              <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {/* Users Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <User className="w-4 h-4 inline mr-1" />
                {t('auditLogs.users')}
              </label>
              <SearchableDropdown
                options={users}
                value={filters.users.length > 0 ? filters.users[0] : ''}
                onChange={(value) => handleFilterChange('users', value ? [value] : [])}
                placeholder={t('auditLogs.selectUser')}
                searchPlaceholder={t('auditLogs.searchUsers')}
                displayKey="text"
                valueKey="id"
                className="w-full"
              />
            </div>

            {/* Start Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="w-4 h-4 inline mr-1" />
                {t('auditLogs.startDate')} *
              </label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            {/* End Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="w-4 h-4 inline mr-1" />
                {t('auditLogs.endDate')} *
              </label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            {/* Application */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Database className="w-4 h-4 inline mr-1" />
                {t('auditLogs.application')}
              </label>
              <SearchableDropdown
                options={[{ id: '', text: t('auditLogs.allApplications') }, ...applications]}
                value={filters.application}
                onChange={(value) => handleFilterChange('application', value)}
                placeholder={t('auditLogs.selectApplication')}
                searchPlaceholder={t('auditLogs.searchApplications')}
                displayKey="text"
                valueKey="id"
                className="w-full"
              />
            </div>

            {/* Event */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Activity className="w-4 h-4 inline mr-1" />
                {t('auditLogs.event')}
              </label>
              <SearchableDropdown
                options={[{ id: '', text: t('auditLogs.allEvents') }, ...events]}
                value={filters.event}
                onChange={(value) => handleFilterChange('event', value)}
                placeholder={t('auditLogs.selectEvent')}
                searchPlaceholder={t('auditLogs.searchEvents')}
                displayKey="text"
                valueKey="id"
                className="w-full"
              />
            </div>
          </div>

          {/* Max Rows and Reset */}
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-center gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('auditLogs.maxRows')} *
                </label>
                <select
                  value={filters.maxRows}
                  onChange={(e) => handleFilterChange('maxRows', parseInt(e.target.value))}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                  <option value={250}>250</option>
                  <option value={500}>500</option>
                  <option value={1000}>1000</option>
                </select>
              </div>
              <div className="text-sm text-gray-500 mt-6">
                {t('auditLogs.showing')} {auditLogs.length} {t('auditLogs.of')} {totalRecords} {t('auditLogs.results')}
              </div>
            </div>
            <button
              onClick={resetFilters}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              {t('auditLogs.resetFilters')}
            </button>
          </div>
        </div>
      )}

      {/* Results Summary */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="text-sm">
              <span className="text-gray-600">{t('auditLogs.totalRecords')}</span>
              <span className="font-semibold ml-1">{totalRecords.toLocaleString()}</span>
            </div>
            <div className="text-sm">
              <span className="text-gray-600">{t('auditLogs.filtered')}</span>
              <span className="font-semibold ml-1">{auditLogs.length.toLocaleString()}</span>
            </div>
            <div className="text-sm">
              <span className="text-gray-600">{t('auditLogs.page')}</span>
              <span className="font-semibold ml-1">{currentPage} {t('auditLogs.of')} {totalPages}</span>
            </div>
          </div>
          {isLoading && (
            <div className="flex items-center gap-2 text-blue-600">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span className="text-sm">{t('auditLogs.loading')}</span>
            </div>
          )}
        </div>
      </div>

      {/* ContentBox with CustomTable */}
      <ContentBox
        filters={columns}
        data={paginatedLogs}
        selectedRows={[]}
        setSelectedRows={() => {}}
        onDownload={handleExport}
        onRefresh={fetchAuditLogs}
        showAddButton={false}
        showActions={false}
      >
        {({ visibleColumns, showActions }) => (
          <CustomTable
            visibleColumns={visibleColumns}
            data={paginatedLogs}
            selectedRows={[]}
            setSelectedRows={() => {}}
            showActions={false}
            renderCell={(col, row) => {
              if (col.name === 'user_name') return renderUserName(col, row);
              if (col.name === 'event') return renderEvent(col, row);
              if (col.name === 'application') return renderApplication(col, row);
              if (col.name === 'timestamp') return renderTimestamp(col, row);
              if (col.name === 'description') return renderDescription(col, row);
              return row[col.name];
            }}
          />
        )}
      </ContentBox>

      {/* Pagination */}
      {totalRecords > 0 && (
        <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6 mt-4 rounded-lg shadow-sm border">
          <div className="flex-1 flex justify-between sm:hidden">
            <button
              onClick={() => handlePageChange(Math.max(currentPage - 1, 1))}
              disabled={currentPage === 1 || totalPages <= 1}
              className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t('auditLogs.previous')}
            </button>
            <button
              onClick={() => handlePageChange(Math.min(currentPage + 1, totalPages))}
              disabled={currentPage === totalPages || totalPages <= 1}
              className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t('auditLogs.next')}
            </button>
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                {t('auditLogs.showing')}{' '}
                <span className="font-medium">{(currentPage - 1) * filters.maxRows + 1}</span>
                {' '}{t('auditLogs.to')}{' '}
                <span className="font-medium">
                  {Math.min(currentPage * filters.maxRows, totalRecords)}
                </span>
                {' '}{t('auditLogs.of')}{' '}
                <span className="font-medium">{totalRecords}</span>
                {' '}{t('auditLogs.results')}
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                <button
                  onClick={() => handlePageChange(Math.max(currentPage - 1, 1))}
                  disabled={currentPage === 1 || totalPages <= 1}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t('auditLogs.previous')}
                </button>
                
                {/* Page numbers */}
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const pageNum = i + 1;
                  return (
                    <button
                      key={pageNum}
                      onClick={() => handlePageChange(pageNum)}
                      className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                        currentPage === pageNum
                          ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                          : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                
                <button
                  onClick={() => handlePageChange(Math.min(currentPage + 1, totalPages))}
                  disabled={currentPage === totalPages || totalPages <= 1}
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t('auditLogs.next')}
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && auditLogs.length === 0 && (
        <div className="text-center py-12">
          <AlertCircle className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">{t('auditLogs.noAuditLogsFound')}</h3>
          <p className="mt-1 text-sm text-gray-500">
            {t('auditLogs.tryAdjustingFilters')}
          </p>
        </div>
      )}

    </div>
  );
};

export default AuditLogsView; 
