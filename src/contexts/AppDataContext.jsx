  import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import API from '../lib/axios';
import { useAuthStore } from '../store/useAuthStore';

const AppDataContext = createContext();

export const useAppData = () => {
  const context = useContext(AppDataContext);
  if (!context) {
    throw new Error('useAppData must be used within an AppDataProvider');
  }
  return context;
};

export const AppDataProvider = ({ children }) => {
  const { isAuthenticated } = useAuthStore();
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [branches, setBranches] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [assetTypes, setAssetTypes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch users with their branch information
  const fetchUsers = useCallback(async () => {
    if (!isAuthenticated) return;
    
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
  }, [isAuthenticated]);

  // Fetch departments
  const fetchDepartments = useCallback(async () => {
    if (!isAuthenticated) return;
    
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
  }, [isAuthenticated]);

  // Fetch branches
  const fetchBranches = useCallback(async () => {
    if (!isAuthenticated) return;
    
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
  }, [isAuthenticated]);

  // Fetch vendors
  const fetchVendors = useCallback(async () => {
    if (!isAuthenticated) return;
    
    try {
      const response = await API.get('/get-vendors');
      if (response.data && Array.isArray(response.data)) {
        setVendors(response.data.filter(vendor => vendor.int_status === 1));
      }
    } catch (err) {
      console.error('Error fetching vendors:', err);
      setError('Failed to fetch vendors');
    }
  }, [isAuthenticated]);

  // Fetch asset types
  const fetchAssetTypes = useCallback(async () => {
    if (!isAuthenticated) return;
    
    try {
      const response = await API.get('/dept-assets/asset-types');
      if (response.data && Array.isArray(response.data)) {
        setAssetTypes(response.data);
      }
    } catch (err) {
      console.error('Error fetching asset types:', err);
      setError('Failed to fetch asset types');
    }
  }, [isAuthenticated]);

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

  // Load all data - simple approach
  const loadAllData = async () => {
    if (!isAuthenticated) {
      console.log('User not authenticated, skipping data load...');
      return;
    }
    
    if (loading) {
      console.log('Data loading already in progress, skipping...');
      return;
    }
    
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

  // Load data only when user is authenticated
  useEffect(() => {
    if (isAuthenticated) {
      loadAllData();
    } else {
      // Clear data when user is not authenticated
      setUsers([]);
      setDepartments([]);
      setBranches([]);
      setVendors([]);
      setAssetTypes([]);
      setError(null);
    }
  }, [isAuthenticated]); // Only run when authentication status changes

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
