import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../lib/axios';
import toast from 'react-hot-toast';
import { MdArrowBack, MdPersonAdd } from 'react-icons/md';
import { useAuthStore } from '../store/useAuthStore';
import useAuditLog from '../hooks/useAuditLog';
import { USERS_APP_ID } from '../constants/usersAuditEvents';
import ContentBox from './ContentBox';
import CustomTable from './CustomTable';
import SearchableDropdown from './ui/SearchableDropdown';

const AssignRoles = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { recordActionByNameWithFetch } = useAuditLog(USERS_APP_ID);
  
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sortConfig, setSortConfig] = useState({ sorts: [] });
  const [selectedRows, setSelectedRows] = useState([]);
  const [filters, setFilters] = useState([]);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [selectedRoles, setSelectedRoles] = useState([]);
  const [availableRoles, setAvailableRoles] = useState([]);
  const [currentEmployeeRoles, setCurrentEmployeeRoles] = useState([]);
  const [rolesLoading, setRolesLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const columns = [
    { label: "Employee ID", name: "employee_id", visible: true },
    { label: "Name", name: "name", visible: true },
    { label: "Full Name", name: "full_name", visible: true },
    { label: "Email", name: "email_id", visible: true },
    { label: "Department", name: "dept_id", visible: true },
    { label: "Phone", name: "phone_number", visible: true },
    { label: "Status", name: "int_status", visible: true },
    { label: "Current Role", name: "job_role_name", visible: true }
  ];

  // Initialize filters when component mounts
  useEffect(() => {
    setFilters(columns);
  }, []);

  // Fetch employees with their current job roles
  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const response = await API.get('/employees/with-roles');
      const employeesData = response.data || [];
      setEmployees(employeesData);
    } catch (error) {
      console.error('Error fetching employees:', error);
      toast.error('Failed to fetch employees');
    } finally {
      setLoading(false);
    }
  };

  // Fetch available roles
  const fetchRoles = async () => {
    setRolesLoading(true);
    try {
      console.log('Fetching roles for AssignRoles modal...');
      const response = await API.get('/job-roles');
      const rolesData = response.data.roles || [];
      console.log('Roles fetched:', rolesData);
      setAvailableRoles(rolesData);
    } catch (error) {
      console.error('Error fetching roles:', error);
      toast.error('Failed to fetch roles');
    } finally {
      setRolesLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
    fetchRoles();
  }, []);

  // Ensure roles are loaded when modal opens
  useEffect(() => {
    if (showAssignModal && availableRoles.length === 0) {
      fetchRoles();
    }
  }, [showAssignModal]);

  const handleSort = (column) => {
    setSortConfig(prevConfig => {
      const { sorts } = prevConfig;
      const existingSort = sorts.find(s => s.column === column);
      
      let newSorts;
      if (existingSort) {
        if (existingSort.direction === 'asc') {
          newSorts = sorts.map(s => 
            s.column === column ? { ...s, direction: 'desc' } : s
          );
        } else {
          newSorts = sorts.filter(s => s.column !== column);
        }
      } else {
        newSorts = [...sorts, { column, direction: 'asc' }];
      }
      
      return { sorts: newSorts };
    });
  };

  const getSortedData = () => {
    if (!sortConfig.sorts.length) return employees;
    
    return [...employees].sort((a, b) => {
      for (const sort of sortConfig.sorts) {
        const aVal = a[sort.column];
        const bVal = b[sort.column];
        
        if (aVal < bVal) return sort.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sort.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  };

  const getFilteredData = () => {
    let filtered = getSortedData();
    
    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(employee => {
        const searchLower = searchTerm.toLowerCase();
        return (
          (employee.employee_id && employee.employee_id.toLowerCase().includes(searchLower)) ||
          (employee.name && employee.name.toLowerCase().includes(searchLower)) ||
          (employee.full_name && employee.full_name.toLowerCase().includes(searchLower)) ||
          (employee.email_id && employee.email_id.toLowerCase().includes(searchLower)) ||
          (employee.dept_id && employee.dept_id.toLowerCase().includes(searchLower)) ||
          (employee.phone_number && employee.phone_number.toLowerCase().includes(searchLower)) ||
          (employee.job_role_name && employee.job_role_name.toLowerCase().includes(searchLower))
        );
      });
    }
    
    return filtered;
  };

  // ContentBox handlers
  const handleFilterChange = (filterType, value) => {
    // Handle different filter types
    if (filterType === 'search') {
      setSearchTerm(value);
    } else if (filterType === 'columnFilters') {
      // Apply column-based filtering
      // This would be implemented based on your specific filtering needs
    }
  };

  const handleRefresh = () => {
    fetchEmployees();
  };

  // CustomTable handlers
  const handleAssignRole = async (employee) => {
    // Set the selected employee and open the modal
    setSelectedEmployee(employee.employee_id);
    setSelectedRoles([]); // Will be selected in the modal
    setShowAssignModal(true);
    setCurrentEmployeeRoles([]);
    
    // Fetch all roles for this employee
    await fetchEmployeeRoles(employee.emp_int_id);
    
    // Ensure roles are loaded when modal opens
    if (availableRoles.length === 0) {
      fetchRoles();
    }
  };

  // Fetch all roles for a specific employee
  const fetchEmployeeRoles = async (emp_int_id) => {
    try {
      const response = await API.get(`/users/employee-roles/${emp_int_id}`);
      const roles = response.data || [];
      setCurrentEmployeeRoles(roles);
    } catch (error) {
      console.error('Error fetching employee roles:', error);
      setCurrentEmployeeRoles([]);
    }
  };


  const handleRoleSelection = (roleId) => {
    const role = availableRoles.find(r => r.job_role_id === roleId);
    if (role) {
      setSelectedRoles(prev => {
        const exists = prev.some(r => r.job_role_id === roleId);
        if (exists) {
          return prev.filter(r => r.job_role_id !== roleId);
        } else {
          return [...prev, role];
        }
      });
    }
  };

  const handleRoleAssignment = async () => {
    if (!selectedEmployee || selectedRoles.length === 0) {
      toast.error('Please select an employee and at least one role');
      return;
    }

    try {
      // Get the emp_int_id for the selected employee
      const selectedEmp = employees.find(emp => emp.employee_id === selectedEmployee);
      if (!selectedEmp || !selectedEmp.emp_int_id) {
        toast.error('Employee internal ID not found');
        return;
      }

      // Get role IDs for API call
      const roleIds = selectedRoles.map(role => role.job_role_id);

      // Assign multiple roles
      const response = await API.post(`/employees/${selectedEmp.emp_int_id}/assign-role`, {
        job_role_ids: roleIds
      });

      // Log the assignment
      await recordActionByNameWithFetch('Assign Roles', {
        employeeId: selectedEmployee,
        roleIds: roleIds,
        roleNames: selectedRoles.map(r => r.text),
        assignedCount: response.data.assignedRoles?.length || 0,
        skippedCount: response.data.skippedRoles?.length || 0,
        action: 'Multiple Roles Assigned'
      });

      if (response.data.skippedRoles?.length > 0) {
        toast.success(`Successfully assigned ${response.data.assignedRoles.length} role(s). ${response.data.skippedRoles.length} role(s) were already assigned.`);
      } else {
        toast.success(`Successfully assigned ${response.data.assignedRoles.length} role(s)`);
      }
      
      // Refresh employees list
      await fetchEmployees();
      
      // Update current employee roles
      await fetchEmployeeRoles(selectedEmp.emp_int_id);

      setShowAssignModal(false);
      setSelectedEmployee('');
      setSelectedRoles([]);
      setCurrentEmployeeRoles([]);
    } catch (error) {
      console.error('Error assigning roles:', error);
      toast.error('Failed to assign roles');
    }
  };

  const filteredData = getFilteredData();

  return (
    <div className="p-3">

      {/* Main Content Box with Table - Hide plus and delete icons */}
      <ContentBox
        filters={filters}
        onFilterChange={handleFilterChange}
        onSort={handleSort}
        sortConfig={sortConfig}
        selectedRows={selectedRows}
        setSelectedRows={setSelectedRows}
        onRefresh={handleRefresh}
        showAddButton={false}  // Hide plus icon
        showDeleteButton={false}  // Hide delete icon
        showHeaderCheckbox={false}  // Hide header checkbox
        showActions={true}
        showFilterButton={true}
        customHeaderActions={
          <button
            onClick={async () => {
              // Log create action when Create button is clicked
              await recordActionByNameWithFetch('Create', {
                action: 'Create Employee Screen Opened'
              });
              navigate("/master-data/create-user");
            }}
            className="flex items-center justify-center text-[#FFC107] border border-gray-300 rounded px-3 py-1 hover:bg-gray-100 bg-[#0E2F4B] text-sm"
          >
            Create
          </button>
        }
      >
        {({ visibleColumns, showActions }) => (
          <CustomTable
            visibleColumns={visibleColumns}
            data={filteredData}
            selectedRows={selectedRows}
            setSelectedRows={setSelectedRows}
            onEdit={handleAssignRole}
            onAdd={handleAssignRole}
            onRowAction={handleAssignRole}
            rowKey="emp_int_id"
            showActions={showActions}
            showCheckbox={false}  // Hide checkboxes for this screen
            showAddButton={false}  // Hide add button, use only action button
            actionLabel="Assign Role"
            renderCell={(col, row) => {
              if (col.name === 'int_status') {
                return (
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    row.int_status === 'Active' || row.int_status === 1
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {row.int_status === 1 ? 'Active' : row.int_status}
                  </span>
                );
              }
              if (col.name === 'job_role_name') {
                return row.job_role_name ? (
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                    {row.job_role_name}
                  </span>
                ) : (
                  <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">
                    No Role
                  </span>
                );
              }
              if (col.name === 'dept_id') {
                return row.dept_id || '-';
              }
              return row[col.name] || '-';
            }}
          />
        )}
      </ContentBox>

      {/* Assign Role Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black bg-opacity-30 backdrop-blur-sm flex justify-center items-start z-50 overflow-y-auto py-8">
          <div className="bg-white w-[600px] rounded-lg shadow-lg my-auto max-h-[90vh] overflow-y-auto">
            <div className="bg-[#003366] text-white font-semibold px-6 py-3 flex justify-between items-center rounded-t-lg">
              <h3>Assign Role</h3>
              <button
                onClick={() => setShowAssignModal(false)}
                className="text-white hover:text-gray-200"
              >
                ×
              </button>
            </div>
            <div className="p-6 max-h-[calc(90vh-120px)] overflow-y-auto">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Selected Employee
                </label>
                <div className="p-3 bg-gray-50 rounded-lg border">
                  {(() => {
                    const employee = employees.find(emp => emp.employee_id === selectedEmployee);
                    return employee ? (
                      <div>
                        <div className="font-medium text-gray-900">
                          {employee.employee_name || employee.name} ({employee.employee_id})
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                          {currentEmployeeRoles.length > 0 ? (
                            <div>
                              <div className="text-orange-600 font-medium mb-1">Current Roles:</div>
                              <div className="space-y-1">
                                {currentEmployeeRoles.map((role, index) => (
                                  <div key={index} className="text-orange-600 text-xs">
                                    • {role.job_role_name} (ID: {role.job_role_id})
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <span className="text-gray-500">No Roles Assigned</span>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="text-gray-500">Employee not found</div>
                    );
                  })()}
                </div>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Roles to Assign (Select Multiple)
                </label>
                {rolesLoading ? (
                  <div className="p-3 bg-gray-50 rounded-lg text-center text-gray-600">
                    Loading roles...
                  </div>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto border rounded-lg p-3">
                    {availableRoles.map(role => {
                      const isSelected = selectedRoles.some(r => r.job_role_id === role.job_role_id);
                      return (
                        <div
                          key={role.job_role_id}
                          className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                            isSelected 
                              ? 'bg-blue-50 border-blue-300' 
                              : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                          }`}
                          onClick={() => handleRoleSelection(role.job_role_id)}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium text-gray-800">{role.text}</div>
                            </div>
                            <div className="flex items-center">
                              {isSelected && (
                                <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                                  <span className="text-white text-xs">✓</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {selectedRoles.length > 0 && (
                <div className="mb-6">
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <div className="font-medium text-blue-800 mb-2">
                      Selected Roles ({selectedRoles.length})
                    </div>
                    <div className="space-y-1">
                      {selectedRoles.map((role, index) => (
                        <div key={index} className="text-sm text-blue-700">
                          • {role.text}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowAssignModal(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRoleAssignment}
                  className="px-4 py-2 rounded-lg bg-[#003366] hover:bg-[#002347] text-white"
                >
                  Assign {selectedRoles.length > 0 ? `${selectedRoles.length} Role${selectedRoles.length > 1 ? 's' : ''}` : 'Roles'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssignRoles;