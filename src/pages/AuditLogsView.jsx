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
import API from '../lib/axios';
import ContentBox from '../components/ContentBox';
import CustomTable from '../components/CustomTable';

const AuditLogsView = () => {
  // State management
  const [auditLogs, setAuditLogs] = useState([]);
  const [filteredLogs, setFilteredLogs] = useState([]);
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
  const [applications, setApplications] = useState([
    { id: 'asset-management', name: 'Asset Management' },
    { id: 'maintenance', name: 'Maintenance' },
    { id: 'reports', name: 'Reports' },
    { id: 'user-management', name: 'User Management' },
    { id: 'system', name: 'System' }
  ]);
  const [events, setEvents] = useState([
    { id: 'create', name: 'Create' },
    { id: 'view', name: 'View' },
    { id: 'update', name: 'Update' },
    { id: 'delete', name: 'Delete' },
    { id: 'login', name: 'Login' },
    { id: 'logout', name: 'Logout' },
    { id: 'export', name: 'Export' },
    { id: 'import', name: 'Import' }
  ]);

  // Table columns
  const columns = [
    { name: 'timestamp', label: 'Timestamp', visible: true },
    { name: 'user_id', label: 'User ID', visible: true },
    { name: 'user_name', label: 'User Name', visible: true },
    { name: 'application', label: 'Application', visible: true },
    { name: 'event', label: 'Event', visible: true },
    { name: 'entity_type', label: 'Entity Type', visible: true },
    { name: 'entity_id', label: 'Entity ID', visible: true },
    { name: 'description', label: 'Description', visible: true },
    { name: 'ip_address', label: 'IP Address', visible: true },
    { name: 'user_agent', label: 'User Agent', visible: false }
  ];

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
    fetchAuditLogs();
  }, []);

  // Apply filters when they change
  useEffect(() => {
    applyFilters();
  }, [filters, auditLogs]);

  const fetchUsers = async () => {
    try {
      const response = await API.get('/users');
      if (response.data && response.data.success) {
        setUsers(response.data.data.map(user => ({
          id: user.user_id,
          name: user.username || user.email
        })));
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchAuditLogs = async () => {
    setIsLoading(true);
    try {
      // Mock data for demonstration - replace with actual API call
      const mockData = generateMockAuditLogs();
      setAuditLogs(mockData);
      setTotalRecords(mockData.length);
      setTotalPages(Math.ceil(mockData.length / filters.maxRows));
      
      // Simulate API delay for better UX
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      toast.error('Failed to fetch audit logs');
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

  const applyFilters = () => {
    let filtered = [...auditLogs];

    // Filter by users
    if (filters.users.length > 0) {
      filtered = filtered.filter(log => 
        filters.users.includes(log.user_id) || filters.users.includes(log.user_name)
      );
    }

    // Filter by date range
    if (filters.startDate) {
      filtered = filtered.filter(log => 
        new Date(log.timestamp) >= new Date(filters.startDate)
      );
    }
    if (filters.endDate) {
      filtered = filtered.filter(log => 
        new Date(log.timestamp) <= new Date(filters.endDate + 'T23:59:59')
      );
    }

    // Filter by application
    if (filters.application) {
      filtered = filtered.filter(log => log.application === filters.application);
    }

    // Filter by event
    if (filters.event) {
      filtered = filtered.filter(log => log.event === filters.event);
    }

    setFilteredLogs(filtered);
    setTotalPages(Math.ceil(filtered.length / filters.maxRows));
    setCurrentPage(1);
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleExport = () => {
    const csvContent = generateCSV(filteredLogs);
    downloadCSV(csvContent, 'audit_logs.csv');
    toast.success('Audit logs exported successfully');
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

  const paginatedLogs = useMemo(() => {
    const startIndex = (currentPage - 1) * filters.maxRows;
    const endIndex = startIndex + filters.maxRows;
    return filteredLogs.slice(startIndex, endIndex);
  }, [filteredLogs, currentPage, filters.maxRows]);

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
      return new Date(row.timestamp).toLocaleString();
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Audit Logs</h1>
            <p className="text-gray-600 mt-1">Track and monitor all user activities across the system</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Filter className="w-4 h-4" />
              Filters
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
                Users
              </label>
              <select
                multiple
                value={filters.users}
                onChange={(e) => {
                  const selectedUsers = Array.from(e.target.selectedOptions, option => option.value);
                  handleFilterChange('users', selectedUsers);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                size="3"
              >
                {users.map(user => (
                  <option key={user.id} value={user.id}>
                    {user.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Start Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="w-4 h-4 inline mr-1" />
                Start Date *
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
                End Date *
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
                Application
              </label>
              <select
                value={filters.application}
                onChange={(e) => handleFilterChange('application', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Applications</option>
                {applications.map(app => (
                  <option key={app.id} value={app.id}>
                    {app.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Event */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Activity className="w-4 h-4 inline mr-1" />
                Event
              </label>
              <select
                value={filters.event}
                onChange={(e) => handleFilterChange('event', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Events</option>
                {events.map(event => (
                  <option key={event.id} value={event.id}>
                    {event.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Max Rows and Reset */}
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-center gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Max Rows *
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
                Showing {filteredLogs.length} of {totalRecords} records
              </div>
            </div>
            <button
              onClick={resetFilters}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Reset Filters
            </button>
          </div>
        </div>
      )}

      {/* Results Summary */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="text-sm">
              <span className="text-gray-600">Total Records:</span>
              <span className="font-semibold ml-1">{totalRecords.toLocaleString()}</span>
            </div>
            <div className="text-sm">
              <span className="text-gray-600">Filtered:</span>
              <span className="font-semibold ml-1">{filteredLogs.length.toLocaleString()}</span>
            </div>
            <div className="text-sm">
              <span className="text-gray-600">Page:</span>
              <span className="font-semibold ml-1">{currentPage} of {totalPages}</span>
            </div>
          </div>
          {isLoading && (
            <div className="flex items-center gap-2 text-blue-600">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span className="text-sm">Loading...</span>
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
      {totalPages > 1 && (
        <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6 mt-4 rounded-lg shadow-sm border">
          <div className="flex-1 flex justify-between sm:hidden">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Showing{' '}
                <span className="font-medium">{(currentPage - 1) * filters.maxRows + 1}</span>
                {' '}to{' '}
                <span className="font-medium">
                  {Math.min(currentPage * filters.maxRows, filteredLogs.length)}
                </span>
                {' '}of{' '}
                <span className="font-medium">{filteredLogs.length}</span>
                {' '}results
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                
                {/* Page numbers */}
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const pageNum = i + 1;
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
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
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && filteredLogs.length === 0 && (
        <div className="text-center py-12">
          <AlertCircle className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No audit logs found</h3>
          <p className="mt-1 text-sm text-gray-500">
            Try adjusting your filters or date range to see more results.
          </p>
        </div>
      )}
    </div>
  );
};

export default AuditLogsView; 
