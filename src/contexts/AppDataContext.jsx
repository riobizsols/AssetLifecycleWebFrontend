  import React, { createContext, useContext, useState, useEffect } from 'react';
import API from '../lib/axios';

const AppDataContext = createContext();

export const useAppData = () => {
  const context = useContext(AppDataContext);
  if (!context) {
    throw new Error('useAppData must be used within an AppDataProvider');
  }
  return context;
};

export const AppDataProvider = ({ children }) => {
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [branches, setBranches] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [assetTypes, setAssetTypes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch users with their branch information
  const fetchUsers = async () => {
    try {
      const response = await API.get('/users/get-users');
      if (response.data && response.data.success && response.data.data) {
        setUsers(response.data.data);
      } else if (response.data && Array.isArray(response.data)) {
        setUsers(response.data);
      }
    } catch (err) {
      console.error('Error fetching users:', err);
      setError('Failed to fetch users');
    }
  };

  // Fetch departments
  const fetchDepartments = async () => {
    try {
      const response = await API.get('/departments');
      if (response.data && response.data.success && response.data.data) {
        setDepartments(response.data.data);
      } else if (response.data && Array.isArray(response.data)) {
        setDepartments(response.data);
      }
    } catch (err) {
      console.error('Error fetching departments:', err);
      setError('Failed to fetch departments');
    }
  };

  // Fetch branches
  const fetchBranches = async () => {
    try {
      const response = await API.get('/branches');
      if (response.data && response.data.success && response.data.data) {
        setBranches(response.data.data);
      } else if (response.data && Array.isArray(response.data)) {
        setBranches(response.data);
      }
    } catch (err) {
      console.error('Error fetching branches:', err);
      setError('Failed to fetch branches');
    }
  };

  // Fetch vendors
  const fetchVendors = async () => {
    try {
      const response = await API.get('/get-vendors');
      if (response.data && Array.isArray(response.data)) {
        setVendors(response.data.filter(vendor => vendor.int_status === 1));
      }
    } catch (err) {
      console.error('Error fetching vendors:', err);
      setError('Failed to fetch vendors');
    }
  };

  // Fetch asset types
  const fetchAssetTypes = async () => {
    try {
      const response = await API.get('/dept-assets/asset-types');
      if (response.data && Array.isArray(response.data)) {
        setAssetTypes(response.data);
      }
    } catch (err) {
      console.error('Error fetching asset types:', err);
      setError('Failed to fetch asset types');
    }
  };

  // Get user's branch ID
  const getUserBranchId = (userId) => {
    const user = users.find(u => u.user_id === userId);
    if (!user || !user.dept_id) return null;

    const department = departments.find(d => d.dept_id === user.dept_id);
    if (!department || !department.branch_code) return null;

    const branch = branches.find(b => b.branch_code === department.branch_code);
    return branch ? branch.branch_id : null;
  };

  // Get user's branch name
  const getUserBranchName = (userId) => {
    const user = users.find(u => u.user_id === userId);
    if (!user || !user.dept_id) return null;

    const department = departments.find(d => d.dept_id === user.dept_id);
    if (!department || !department.branch_code) return null;

    const branch = branches.find(b => b.branch_code === department.branch_code);
    return branch ? branch.text : null;
  };

  // Get user's department name
  const getUserDepartmentName = (userId) => {
    const user = users.find(u => u.user_id === userId);
    if (!user || !user.dept_id) return null;

    const department = departments.find(d => d.dept_id === user.dept_id);
    return department ? department.text : null;
  };

  // Load all data
  const loadAllData = async () => {
    setLoading(true);
    setError(null);
    try {
      await Promise.all([
        fetchUsers(),
        fetchDepartments(),
        fetchBranches(),
        fetchVendors(),
        fetchAssetTypes()
      ]);
    } catch (err) {
      console.error('Error loading app data:', err);
      setError('Failed to load application data');
    } finally {
      setLoading(false);
    }
  };

  // Load data on mount
  useEffect(() => {
    loadAllData();
  }, []);

  const value = {
    // Data
    users,
    departments,
    branches,
    vendors,
    assetTypes,
    loading,
    error,
    
    // Actions
    loadAllData,
    fetchUsers,
    fetchDepartments,
    fetchBranches,
    fetchVendors,
    fetchAssetTypes,
    
    // Helper functions
    getUserBranchId,
    getUserBranchName,
    getUserDepartmentName,
  };

  return (
    <AppDataContext.Provider value={value}>
      {children}
    </AppDataContext.Provider>
  );
};
