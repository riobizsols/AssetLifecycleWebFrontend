import React, { useState, useEffect } from 'react';
import { Download, Upload, CheckCircle, AlertCircle, FileText, Users, Package } from 'lucide-react';
import API from '../../lib/axios';

// Helper functions for localStorage
const saveToStorage = (key, data) => {
  try {
    localStorage.setItem(`bulkUpload_${key}`, JSON.stringify(data));
  } catch (error) {
    console.warn('Failed to save to localStorage:', error);
  }
};

const loadFromStorage = (key, defaultValue = null) => {
  try {
    const stored = localStorage.getItem(`bulkUpload_${key}`);
    return stored ? JSON.parse(stored) : defaultValue;
  } catch (error) {
    console.warn('Failed to load from localStorage:', error);
    return defaultValue;
  }
};

const clearStorage = () => {
  try {
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('bulkUpload_')) {
        localStorage.removeItem(key);
      }
    });
  } catch (error) {
    console.warn('Failed to clear localStorage:', error);
  }
};

const Roles = () => {
  const [activeTab, setActiveTab] = useState(loadFromStorage('activeTab', 'assets'));
  const [uploadStatus, setUploadStatus] = useState(loadFromStorage('uploadStatus', {}));
  const [trialResults, setTrialResults] = useState(loadFromStorage('trialResults', {}));
  const [isValidating, setIsValidating] = useState(false);
  const [validationProgress, setValidationProgress] = useState(0);
  const [existingRecords, setExistingRecords] = useState({});
  const [file, setFile] = useState(null);

  // Clear trial results on component mount to start fresh
  useEffect(() => {
    setTrialResults({});
  }, []);

  // Save state to localStorage whenever it changes
  useEffect(() => {
    saveToStorage('activeTab', activeTab);
  }, [activeTab]);

  useEffect(() => {
    saveToStorage('uploadStatus', uploadStatus);
  }, [uploadStatus]);

  useEffect(() => {
    saveToStorage('trialResults', trialResults);
  }, [trialResults]);

  // Reset validation state if it gets stuck
  useEffect(() => {
    if (isValidating) {
      const timeout = setTimeout(() => {
        console.warn('Validation timeout - resetting state');
        setIsValidating(false);
        setValidationProgress(0);
      }, 30000); // 30 second timeout

      return () => clearTimeout(timeout);
    }
  }, [isValidating]);

  // Cleanup localStorage on component unmount (optional - you might want to keep state)
  useEffect(() => {
    return () => {
      // Uncomment the line below if you want to clear state on unmount
      // clearStorage();
    };
  }, []);

  const tabs = [
    { id: 'assets', label: 'Assets', icon: Package, color: 'bg-blue-500' },
    { id: 'assetTypes', label: 'Asset Types', icon: FileText, color: 'bg-green-500' },
    { id: 'employees', label: 'Employees', icon: Users, color: 'bg-purple-500' }
  ];

  const handleDownloadSample = (type) => {
    let csvContent = '';
    let filename = '';
    
    switch (type) {
      case 'assets':
        csvContent = generateAssetsCSV();
        filename = 'assets_sample.csv';
        break;
      case 'assetTypes':
        csvContent = generateAssetTypesCSV();
        filename = 'asset_types_sample.csv';
        break;
      case 'employees':
        csvContent = generateEmployeesCSV();
        filename = 'employees_sample.csv';
        break;
      default:
        return;
    }
    
    downloadCSV(csvContent, filename);
  };

  const generateAssetsCSV = () => {
    const headers = [
      'asset_type_id', 'description', 'purchase_vendor_id', 'purchased_cost', 'purchased_on',
      'purchased_by', 'warranty_period', 'expiry_date', 'service_vendor_id',
      'salvage_value', 'useful_life_years'
      // Note: Property fields are dynamic and will be added based on asset type
      // Users can add property columns manually if needed (e.g., prop_ram, prop_storage, etc.)
    ];
    
    const sampleData = [
      [
        'AT001', 'Dell Laptop for Development', 'V001', '1500.00', '2024-01-15',
        'USR001', '2 years', '2026-01-15', 'V001',
        '300.00', '5'
      ],
      [
        'AT002', 'HP Desktop for Office', 'V002', '1200.00', '2024-01-20',
        'USR002', '3 years', '2027-01-20', 'V002',
        '240.00', '4'
      ]
    ];
    
    return [headers, ...sampleData].map(row => 
      row.map(field => `"${field || ''}"`).join(',')
    ).join('\n');
  };

  const generateAssetTypesCSV = () => {
    const headers = [
      'org_id', 'asset_type_id', 'int_status', 'assignment_type', 'inspection_required',
      'group_required', 'created_by', 'created_on', 'changed_by', 'changed_on', 'text',
      'is_child', 'parent_asset_type_id', 'maint_required', 'maint_type_id', 'maint_lead_type',
      'serial_num_format', 'last_gen_seq_no', 'depreciation_type'
    ];
    
    const sampleData = [
      [
        'ORG001', 'AT001', '1', 'user', 'false', 'false', 'USR001',
        '2024-01-01 10:00:00', 'USR001', '2024-01-01 10:00:00', 'Laptops',
        'false', '', 'true', 'MT001', 'internal', 'LAP-#####', '0', 'SL'
      ],
      [
        'ORG001', 'AT002', '1', 'user', 'false', 'false', 'USR001',
        '2024-01-01 10:00:00', 'USR001', '2024-01-01 10:00:00', 'Desktops',
        'false', '', 'true', 'MT001', 'internal', 'DESK-#####', '0', 'SL'
      ]
    ];
    
    return [headers, ...sampleData].map(row => 
      row.map(field => `"${field || ''}"`).join(',')
    ).join('\n');
  };

  const generateEmployeesCSV = () => {
    const headers = [
      'name', 'first_name', 'last_name', 'middle_name', 'full_name', 'email_id', 
      'dept_id', 'phone_number', 'employee_type', 'joining_date', 'language_code'
      // Note: emp_int_id and employee_id will be auto-generated
      // releiving_date will be null by default
      // int_status will be 1 by default
      // created_by, created_on, changed_by, changed_on are auto-populated
      // joining_date accepts DD-MM-YYYY or YYYY-MM-DD format
    ];
    
    const sampleData = [
      [
        'John Doe', 'John', 'Doe', '', 'John Doe', 'john.doe@company.com', 
        'DEPT001', '9876543210', 'Full Time', '01-01-2024', 'en'
      ],
      [
        'Jane Smith', 'Jane', 'Smith', '', 'Jane Smith', 'jane.smith@company.com', 
        'DEPT001', '9876543211', 'Full Time', '15-01-2024', 'en'
      ]
    ];
    
    return [headers, ...sampleData].map(row => 
      row.map(field => `"${field || ''}"`).join(',')
    ).join('\n');
  };

  const downloadCSV = (csvContent, filename) => {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // CSV Validation Functions
  const validateCSVContent = async (type, csvContent) => {
    try {
      setIsValidating(true);
      setValidationProgress(10);
      
      const lines = csvContent.split('\n').filter(line => line.trim());
      if (lines.length < 2) {
        setIsValidating(false);
        return { isValid: false, errors: ['CSV file must have at least a header row and one data row'] };
      }

      // Check file size limits
      if (lines.length > 10000) {
        setIsValidating(false);
        return { isValid: false, errors: ['CSV file cannot exceed 10,000 rows'] };
      }

      setValidationProgress(20);
      const headers = parseCSVLine(lines[0]);
      const dataRows = lines.slice(1).map((line, index) => ({
        rowNumber: index + 2,
        data: parseCSVLine(line)
      }));

      setValidationProgress(30);
      // Fetch reference data for referential integrity validation
      const referenceData = await fetchReferenceData(type);
      setValidationProgress(50);

      // Check for duplicates within the CSV file
      const duplicateErrors = checkForDuplicates(type, headers, dataRows);
      if (duplicateErrors.length > 0) {
        setIsValidating(false);
        return { isValid: false, errors: duplicateErrors };
      }

      setValidationProgress(60);
      // Check for existing records in database
      const existingRecordsErrors = await checkExistingRecords(type, headers, dataRows, referenceData);
      if (existingRecordsErrors.length > 0) {
        setIsValidating(false);
        return { isValid: false, errors: existingRecordsErrors };
      }

      setValidationProgress(70);
      let validationResult;
      switch (type) {
        case 'assets':
          validationResult = await validateAssetsCSV(headers, dataRows, referenceData);
          break;
        case 'assetTypes':
          validationResult = await validateAssetTypesCSV(headers, dataRows, referenceData);
          break;
        case 'employees':
          validationResult = await validateEmployeesCSV(headers, dataRows, referenceData);
          break;
        default:
          setIsValidating(false);
          return { isValid: false, errors: ['Unknown table type'] };
      }

      setValidationProgress(100);
      setIsValidating(false);
      return validationResult;
    } catch (error) {
      console.error('Error in validateCSVContent:', error);
      setIsValidating(false);
      return { 
        isValid: false, 
        errors: [`Validation failed: ${error.message}`] 
      };
    }
  };

  // Fetch reference data for validation
  const fetchReferenceData = async (type) => {
      const referenceData = {
        organizations: [],
        departments: [],
        branches: [],
        vendors: [],
        assetTypes: [],
        employees: [],
        users: [],
        vendorProdServices: []
      };

    try {
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout')), 10000)
      );

      // Fetch all reference data in parallel with timeout
      const [
        orgsRes,
        deptsRes,
        branchesRes,
        vendorsRes,
        assetTypesRes,
        employeesRes,
        usersRes,
        vendorProdServicesRes
      ] = await Promise.allSettled([
        Promise.race([API.get('/organizations'), timeoutPromise]),
        Promise.race([API.get('/admin/departments'), timeoutPromise]),
        Promise.race([API.get('/branches'), timeoutPromise]),
        Promise.race([API.get('/vendors'), timeoutPromise]),
        Promise.race([API.get('/asset-types'), timeoutPromise]),
        Promise.race([API.get('/employees'), timeoutPromise]),
        Promise.race([API.get('/users/get-users'), timeoutPromise]),
        Promise.race([API.get('/vendors/vendor-prod-services'), timeoutPromise])
      ]);

      // Extract data from responses
      if (orgsRes.status === 'fulfilled') {
        referenceData.organizations = orgsRes.value.data?.data || orgsRes.value.data || [];
        console.log('Organizations fetched:', referenceData.organizations.length, 'items');
      } else {
        console.warn('Failed to fetch organizations:', orgsRes.reason?.response?.data?.message || orgsRes.reason?.message);
      }
      if (deptsRes.status === 'fulfilled') {
        referenceData.departments = deptsRes.value.data?.data || deptsRes.value.data || [];
        console.log('Departments fetched:', referenceData.departments.length, 'items');
      } else {
        console.warn('Failed to fetch departments:', deptsRes.reason?.response?.data?.message || deptsRes.reason?.message);
      }
      if (branchesRes.status === 'fulfilled') {
        referenceData.branches = branchesRes.value.data?.data || branchesRes.value.data || [];
        console.log('Branches fetched:', referenceData.branches.length, 'items');
      } else {
        console.warn('Failed to fetch branches:', branchesRes.reason?.response?.data?.message || branchesRes.reason?.message);
      }
      if (vendorsRes.status === 'fulfilled') {
        referenceData.vendors = vendorsRes.value.data?.data || vendorsRes.value.data || [];
        console.log('Vendors fetched:', referenceData.vendors.length, 'items');
      } else {
        console.warn('Failed to fetch vendors:', vendorsRes.reason?.response?.data?.message || vendorsRes.reason?.message);
      }
      if (assetTypesRes.status === 'fulfilled') {
        referenceData.assetTypes = assetTypesRes.value.data?.data || assetTypesRes.value.data || [];
        console.log('Asset Types fetched:', referenceData.assetTypes.length, 'items');
      } else {
        console.warn('Failed to fetch asset types:', assetTypesRes.reason?.response?.data?.message || assetTypesRes.reason?.message);
      }
      if (employeesRes.status === 'fulfilled') {
        referenceData.employees = employeesRes.value.data?.data || employeesRes.value.data || [];
        console.log('Employees fetched:', referenceData.employees.length, 'items');
      } else {
        console.warn('Failed to fetch employees:', employeesRes.reason?.response?.data?.message || employeesRes.reason?.message);
      }
      if (usersRes.status === 'fulfilled') {
        referenceData.users = usersRes.value.data?.data || usersRes.value.data || [];
        console.log('Users fetched:', referenceData.users.length, 'items');
      } else {
        console.warn('Failed to fetch users:', usersRes.reason?.response?.data?.message || usersRes.reason?.message);
      }
          if (vendorProdServicesRes.status === 'fulfilled') {
        referenceData.vendorProdServices = vendorProdServicesRes.value.data?.data || vendorProdServicesRes.value.data || [];
        console.log('Vendor Product Services fetched:', referenceData.vendorProdServices.length, 'items');
      } else {
        console.warn('Failed to fetch vendor product services:', vendorProdServicesRes.reason?.response?.data?.message || vendorProdServicesRes.reason?.message);
      }

      console.log('Reference data fetched:', referenceData);
    } catch (error) {
      console.error('Error fetching reference data:', error);
      // Return empty reference data instead of throwing
    }

    return referenceData;
  };

  const parseCSVLine = (line) => {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current.trim());
    return result.map(field => field.replace(/^"|"$/g, '').trim());
  };

  const validateAssetsCSV = async (headers, dataRows, referenceData) => {
    console.log('🔍 Validating Assets CSV...');
    console.log('Headers:', headers);
    console.log('Data rows count:', dataRows.length);
    console.log('Reference data:', referenceData);
    
    const errors = [];
    const requiredFields = [
      'asset_type_id', 'description', 'purchase_vendor_id', 'purchased_cost', 'purchased_on',
      'purchased_by', 'warranty_period', 'expiry_date', 'service_vendor_id',
      'salvage_value', 'useful_life_years'
    ];

    // Validate headers - check for required fields and allow property fields
    const missingHeaders = requiredFields.filter(field => !headers.includes(field));
    if (missingHeaders.length > 0) {
      errors.push(`Missing required columns: ${missingHeaders.join(', ')}`);
    }
    
    // Check for property fields (fields starting with 'prop_')
    const propertyFields = headers.filter(header => header.startsWith('prop_'));
    console.log('🔍 Found property fields:', propertyFields);

    // Validate each data row
    dataRows.forEach(({ rowNumber, data }) => {
      const rowErrors = [];
      
      // Check if row has correct number of columns (allow for optional property fields)
      if (data.length < requiredFields.length) {
        rowErrors.push(`Row ${rowNumber}: Expected at least ${requiredFields.length} columns, found ${data.length}`);
      } else if (data.length > headers.length) {
        rowErrors.push(`Row ${rowNumber}: Expected at most ${headers.length} columns, found ${data.length}`);
      }

      // Validate required fields
      requiredFields.forEach(field => {
        const fieldIndex = headers.indexOf(field);
        if (fieldIndex !== -1) {
          const value = data[fieldIndex];
          if (!value || value === '' || value.toLowerCase() === 'null') {
            rowErrors.push(`Row ${rowNumber}: ${field} is required`);
          }
        }
      });

      // Validate specific field formats
      const assetTypeIdIndex = headers.indexOf('asset_type_id');
      if (assetTypeIdIndex !== -1 && data[assetTypeIdIndex]) {
        const assetTypeId = data[assetTypeIdIndex];
        if (!/^AT\d{3}$/.test(assetTypeId)) {
          rowErrors.push(`Row ${rowNumber}: asset_type_id must be in format AT001, AT002, etc.`);
        }
      }

      // Description validation
      const descriptionIndex = headers.indexOf('description');
      if (descriptionIndex !== -1 && data[descriptionIndex]) {
        const description = data[descriptionIndex];
        if (description.length < 3) {
          rowErrors.push(`Row ${rowNumber}: description must be at least 3 characters long`);
        }
      }

      const vendorIdIndex = headers.indexOf('purchase_vendor_id');
      if (vendorIdIndex !== -1 && data[vendorIdIndex]) {
        const vendorId = data[vendorIdIndex];
        if (!/^V\d{3}$/.test(vendorId)) {
          rowErrors.push(`Row ${rowNumber}: purchase_vendor_id must be in format V001, V002, etc.`);
        }
      }


      const purchasedCostIndex = headers.indexOf('purchased_cost');
      if (purchasedCostIndex !== -1 && data[purchasedCostIndex]) {
        const cost = parseFloat(data[purchasedCostIndex]);
        if (isNaN(cost) || cost < 0) {
          rowErrors.push(`Row ${rowNumber}: purchased_cost must be a positive number`);
        }
      }

      const purchasedOnIndex = headers.indexOf('purchased_on');
      if (purchasedOnIndex !== -1 && data[purchasedOnIndex]) {
        const date = new Date(data[purchasedOnIndex]);
        if (isNaN(date.getTime())) {
          rowErrors.push(`Row ${rowNumber}: purchased_on must be a valid date (YYYY-MM-DD)`);
        }
      }

      // Salvage value validation
      const salvageValueIndex = headers.indexOf('salvage_value');
      if (salvageValueIndex !== -1 && data[salvageValueIndex]) {
        const salvageValue = parseFloat(data[salvageValueIndex]);
        if (isNaN(salvageValue) || salvageValue < 0) {
          rowErrors.push(`Row ${rowNumber}: salvage_value must be a positive number`);
        }
      }

      // Useful life years validation
      const usefulLifeYearsIndex = headers.indexOf('useful_life_years');
      if (usefulLifeYearsIndex !== -1 && data[usefulLifeYearsIndex]) {
        const usefulLifeYears = parseInt(data[usefulLifeYearsIndex]);
        if (isNaN(usefulLifeYears) || usefulLifeYears < 1 || usefulLifeYears > 50) {
          rowErrors.push(`Row ${rowNumber}: useful_life_years must be a number between 1 and 50`);
        }
      }

      // Validate property fields (optional)
      propertyFields.forEach(propField => {
        const propIndex = headers.indexOf(propField);
        if (propIndex !== -1 && data[propIndex] && data[propIndex].trim() !== '') {
          const propValue = data[propIndex].trim();
          // Basic validation - just check it's not empty if provided
          if (propValue.length < 1) {
            rowErrors.push(`Row ${rowNumber}: ${propField} cannot be empty if provided`);
          }
        }
      });

      if (rowErrors.length > 0) {
        errors.push(...rowErrors);
      }
    });

    // Add referential integrity validation errors
    const referentialErrors = validateReferentialIntegrity('assets', headers, dataRows, referenceData);
    errors.push(...referentialErrors);

    console.log('🔍 Validation completed. Errors found:', errors.length);
    console.log('Validation errors:', errors);
    
    return {
      isValid: errors.length === 0,
      errors: errors,
      totalRows: dataRows.length,
      validRows: dataRows.length - errors.filter(e => e.includes('Row')).length
    };
  };

  const validateAssetTypesCSV = async (headers, dataRows, referenceData) => {
    const errors = [];
    const requiredFields = [
      'org_id', 'asset_type_id', 'int_status', 'assignment_type', 'inspection_required',
      'group_required', 'created_by', 'created_on', 'changed_by', 'changed_on', 'text'
    ];

    // Validate headers
    const missingHeaders = requiredFields.filter(field => !headers.includes(field));
    if (missingHeaders.length > 0) {
      errors.push(`Missing required columns: ${missingHeaders.join(', ')}`);
    }

    // Validate each data row
    dataRows.forEach(({ rowNumber, data }) => {
      const rowErrors = [];
      
      // Check if row has correct number of columns
      if (data.length !== headers.length) {
        rowErrors.push(`Row ${rowNumber}: Expected ${headers.length} columns, found ${data.length}`);
      }

      // Validate required fields
      requiredFields.forEach(field => {
        const fieldIndex = headers.indexOf(field);
        if (fieldIndex !== -1) {
          const value = data[fieldIndex];
          if (!value || value === '' || value.toLowerCase() === 'null') {
            rowErrors.push(`Row ${rowNumber}: ${field} is required`);
          }
        }
      });

      // Validate specific field formats
      const orgIdIndex = headers.indexOf('org_id');
      if (orgIdIndex !== -1 && data[orgIdIndex]) {
        const orgId = data[orgIdIndex];
        if (!/^ORG\d{3}$/.test(orgId)) {
          rowErrors.push(`Row ${rowNumber}: org_id must be in format ORG001, ORG002, etc.`);
        }
      }

      const assetTypeIdIndex = headers.indexOf('asset_type_id');
      if (assetTypeIdIndex !== -1 && data[assetTypeIdIndex]) {
        const assetTypeId = data[assetTypeIdIndex];
        if (!/^AT\d{3}$/.test(assetTypeId)) {
          rowErrors.push(`Row ${rowNumber}: asset_type_id must be in format AT001, AT002, etc.`);
        }
      }

      const intStatusIndex = headers.indexOf('int_status');
      if (intStatusIndex !== -1 && data[intStatusIndex]) {
        const intStatus = data[intStatusIndex];
        if (!['0', '1'].includes(intStatus)) {
          rowErrors.push(`Row ${rowNumber}: int_status must be 0 or 1`);
        }
      }

      const assignmentTypeIndex = headers.indexOf('assignment_type');
      if (assignmentTypeIndex !== -1 && data[assignmentTypeIndex]) {
        const assignmentType = data[assignmentTypeIndex];
        const validTypes = ['user', 'department', 'group'];
        if (!validTypes.includes(assignmentType.toLowerCase())) {
          rowErrors.push(`Row ${rowNumber}: assignment_type must be one of: ${validTypes.join(', ')}`);
        }
      }

      const inspectionRequiredIndex = headers.indexOf('inspection_required');
      if (inspectionRequiredIndex !== -1 && data[inspectionRequiredIndex]) {
        const inspectionRequired = data[inspectionRequiredIndex];
        if (!['true', 'false'].includes(inspectionRequired.toLowerCase())) {
          rowErrors.push(`Row ${rowNumber}: inspection_required must be true or false`);
        }
      }

      const groupRequiredIndex = headers.indexOf('group_required');
      if (groupRequiredIndex !== -1 && data[groupRequiredIndex]) {
        const groupRequired = data[groupRequiredIndex];
        if (!['true', 'false'].includes(groupRequired.toLowerCase())) {
          rowErrors.push(`Row ${rowNumber}: group_required must be true or false`);
        }
      }

      const maintRequiredIndex = headers.indexOf('maint_required');
      if (maintRequiredIndex !== -1 && data[maintRequiredIndex]) {
        const maintRequired = data[maintRequiredIndex];
        if (!['true', 'false'].includes(maintRequired.toLowerCase())) {
          rowErrors.push(`Row ${rowNumber}: maint_required must be true or false`);
        }
      }

      const isChildIndex = headers.indexOf('is_child');
      if (isChildIndex !== -1 && data[isChildIndex]) {
        const isChild = data[isChildIndex];
        if (!['true', 'false'].includes(isChild.toLowerCase())) {
          rowErrors.push(`Row ${rowNumber}: is_child must be true or false`);
        }
      }

      const depreciationTypeIndex = headers.indexOf('depreciation_type');
      if (depreciationTypeIndex !== -1 && data[depreciationTypeIndex]) {
        const depreciationType = data[depreciationTypeIndex];
        const validTypes = ['SL', 'DDB', 'SYD', 'ND'];
        if (!validTypes.includes(depreciationType)) {
          rowErrors.push(`Row ${rowNumber}: depreciation_type must be one of: ${validTypes.join(', ')}`);
        }
      }

      if (rowErrors.length > 0) {
        errors.push(...rowErrors);
      }
    });

    // Add referential integrity validation errors
    const referentialErrors = validateReferentialIntegrity('assetTypes', headers, dataRows, referenceData);
    errors.push(...referentialErrors);

    return {
      isValid: errors.length === 0,
      errors: errors,
      totalRows: dataRows.length,
      validRows: dataRows.length - errors.filter(e => e.includes('Row')).length
    };
  };

  const validateEmployeesCSV = async (headers, dataRows, referenceData) => {
    const errors = [];
    const requiredFields = ['name', 'email_id', 'dept_id', 'first_name', 'last_name', 'full_name', 'phone_number', 'employee_type', 'joining_date', 'language_code'];

    // Validate headers
    const missingHeaders = requiredFields.filter(field => !headers.includes(field));
    if (missingHeaders.length > 0) {
      errors.push(`Missing required columns: ${missingHeaders.join(', ')}`);
    }

    // Validate each data row
    dataRows.forEach(({ rowNumber, data }) => {
      const rowErrors = [];
      
      // Check if row has correct number of columns
      if (data.length !== headers.length) {
        rowErrors.push(`Row ${rowNumber}: Expected ${headers.length} columns, found ${data.length}`);
      }

      // Validate required fields
      requiredFields.forEach(field => {
        const fieldIndex = headers.indexOf(field);
        if (fieldIndex !== -1) {
          const value = data[fieldIndex];
          if (!value || value === '' || value.toLowerCase() === 'null') {
            rowErrors.push(`Row ${rowNumber}: ${field} is required`);
          }
        }
      });

      // Validate email format
      const emailIndex = headers.indexOf('email_id');
      if (emailIndex !== -1 && data[emailIndex]) {
        const email = data[emailIndex];
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          rowErrors.push(`Row ${rowNumber}: email_id must be a valid email address`);
        }
      }

      // Validate phone number format (if provided)
      const phoneIndex = headers.indexOf('phone_number');
      if (phoneIndex !== -1 && data[phoneIndex]) {
        const phone = data[phoneIndex];
        const phoneRegex = /^[\d\s\-\+\(\)]+$/;
        if (!phoneRegex.test(phone)) {
          rowErrors.push(`Row ${rowNumber}: phone_number must contain only digits, spaces, hyphens, plus signs, and parentheses`);
        }
      }

      // Validate int_status (if provided)
      const statusIndex = headers.indexOf('int_status');
      if (statusIndex !== -1 && data[statusIndex]) {
        const status = data[statusIndex];
        if (!['0', '1', 'true', 'false'].includes(status.toLowerCase())) {
          rowErrors.push(`Row ${rowNumber}: int_status must be 0, 1, true, or false`);
        }
      }

      // Validate date formats (if provided)
      const joiningDateIndex = headers.indexOf('joining_date');
      if (joiningDateIndex !== -1 && data[joiningDateIndex]) {
        const joiningDate = data[joiningDateIndex];
        // Accept both DD-MM-YYYY and YYYY-MM-DD formats
        const dateRegexDDMMYYYY = /^\d{2}-\d{2}-\d{4}$/;
        const dateRegexYYYYMMDD = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegexDDMMYYYY.test(joiningDate) && !dateRegexYYYYMMDD.test(joiningDate)) {
          rowErrors.push(`Row ${rowNumber}: joining_date must be in format DD-MM-YYYY or YYYY-MM-DD`);
        }
      }

      const releivingDateIndex = headers.indexOf('releiving_date');
      if (releivingDateIndex !== -1 && data[releivingDateIndex]) {
        const releivingDate = data[releivingDateIndex];
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(releivingDate)) {
          rowErrors.push(`Row ${rowNumber}: releiving_date must be in format YYYY-MM-DD`);
        }
      }

      if (rowErrors.length > 0) {
        errors.push(...rowErrors);
      }
    });

    // Add referential integrity validation errors
    const referentialErrors = validateReferentialIntegrity('employees', headers, dataRows, referenceData);
    errors.push(...referentialErrors);

    return {
      isValid: errors.length === 0,
      errors: errors,
      totalRows: dataRows.length,
      validRows: dataRows.length - errors.filter(e => e.includes('Row')).length
    };
  };

  const showValidationErrors = (type, errors) => {
    const errorMessage = `CSV Validation Failed for ${type}:\n\n${errors.slice(0, 10).join('\n')}${errors.length > 10 ? `\n\n... and ${errors.length - 10} more errors` : ''}`;
    alert(errorMessage);
  };

  // Convert CSV content to array of objects for API
  const convertCSVToObjectArray = (csvContent, type) => {
    const lines = csvContent.split('\n').filter(line => line.trim());
    if (lines.length < 2) return [];

    const headers = parseCSVLine(lines[0]);
    const dataRows = lines.slice(1).map(line => parseCSVLine(line));
    
    // Debug logging for CSV parsing
    console.log('🔍 CSV Parsing Debug:', {
      type,
      totalLines: lines.length,
      headers,
      firstDataRow: dataRows[0],
      csvContent: csvContent.substring(0, 200) + '...'
    });

    return dataRows.map(row => {
      const obj = {};
      
      if (type === 'assets') {
        // For assets, handle properties
        const properties = {};
        
        headers.forEach((header, index) => {
          const value = row[index] || '';
          
          // Check if this is a property field (not a standard asset field)
          if (isPropertyField(header)) {
            // This is a property field, add to properties object
            // We need to map the property name to property ID
            const propId = getPropertyIdByName(header);
            if (propId && value.trim() !== '') {
              properties[propId] = value.trim();
            }
          } else {
            // This is a standard asset field
            obj[header] = value;
          }
        });
        
        // Add properties to the object if any exist
        if (Object.keys(properties).length > 0) {
          obj.properties = properties;
        }
      } else {
        // For employees and asset types, treat all fields as standard fields
        headers.forEach((header, index) => {
          const value = row[index] || '';
          obj[header] = value;
        });
        
        // Debug logging for employees
        if (type === 'employees') {
          console.log('🔍 Employee row data:', { headers, row, obj });
        }
      }
      
      return obj;
    });
  };

  // Check if a field is a property field (not a standard asset field)
  const isPropertyField = (fieldName) => {
    const standardFields = [
      'asset_type_id', 'text', 'serial_number', 'description', 'branch_id',
      'purchase_vendor_id', 'service_vendor_id', 'prod_serv_id', 'maintsch_id',
      'purchased_cost', 'purchased_on', 'purchased_by', 'current_status',
      'warranty_period', 'parent_asset_id', 'group_id', 'org_id', 'expiry_date',
      'current_book_value', 'salvage_value', 'accumulated_depreciation',
      'useful_life_years', 'last_depreciation_calc_date', 'invoice_no',
      'commissioned_date', 'depreciation_start_date', 'project_code',
      'grant_code', 'insurance_policy_no', 'gl_account_code', 'cost_center_code',
      'depreciation_rate', 'vendor_brand', 'vendor_model'
    ];
    
    return !standardFields.includes(fieldName);
  };

  // State for property mappings
  const [propertyMappings, setPropertyMappings] = useState({});

  // Fetch property mappings for asset types
  const fetchPropertyMappings = async (assetTypeId) => {
    if (!assetTypeId) return {};
    
    try {
      const response = await API.get(`/properties/asset-types/${assetTypeId}/properties-with-values`);
      if (response.data && response.data.data) {
        const mappings = {};
        response.data.data.forEach(property => {
          mappings[property.property] = property.asset_type_prop_id;
        });
        return mappings;
      }
    } catch (error) {
      console.error('Error fetching property mappings:', error);
    }
    return {};
  };

  // Get property ID by property name
  const getPropertyIdByName = (propertyName) => {
    return propertyMappings[propertyName] || propertyName;
  };

  // Check for duplicates within CSV file
  const checkForDuplicates = (type, headers, dataRows) => {
    const errors = [];
    const seenRecords = new Set();
    const primaryKeyFields = getPrimaryKeyFields(type);

    dataRows.forEach(({ rowNumber, data }) => {
      const keyValues = primaryKeyFields.map(field => {
        const fieldIndex = headers.indexOf(field);
        return fieldIndex !== -1 ? data[fieldIndex] : '';
      }).join('|');

      if (keyValues && seenRecords.has(keyValues)) {
        errors.push(`Row ${rowNumber}: Duplicate record found (${primaryKeyFields.join(', ')}: ${keyValues.replace('|', ', ')})`);
      } else if (keyValues) {
        seenRecords.add(keyValues);
      }
    });

    return errors;
  };

  // Get primary key fields for each table type
  const getPrimaryKeyFields = (type) => {
    switch (type) {
      case 'assets':
        return ['asset_id'];
      case 'assetTypes':
        return ['asset_type_id'];
      case 'employees':
        return ['employee_id'];
      default:
        return [];
    }
  };

  // Check for existing records in database
  const checkExistingRecords = async (type, headers, dataRows, referenceData) => {
    const errors = [];
    const primaryKeyFields = getPrimaryKeyFields(type);
    
    if (primaryKeyFields.length === 0) return errors;

    const primaryKeyField = primaryKeyFields[0];
    const primaryKeyIndex = headers.indexOf(primaryKeyField);
    
    if (primaryKeyIndex === -1) return errors;

    // Get all primary key values from CSV
    const csvPrimaryKeys = dataRows
      .map(row => row.data[primaryKeyIndex])
      .filter(key => key && key.trim() !== '');

    if (csvPrimaryKeys.length === 0) return errors;

    try {
      // Check which records already exist in database
      const existingKeys = await checkExistingKeysInDatabase(type, primaryKeyField, csvPrimaryKeys);
      
      // Find conflicts
      csvPrimaryKeys.forEach(key => {
        if (existingKeys.includes(key)) {
          const conflictingRow = dataRows.find(row => row.data[primaryKeyIndex] === key);
          if (conflictingRow) {
            errors.push(`Row ${conflictingRow.rowNumber}: ${primaryKeyField} '${key}' already exists in database`);
          }
        }
      });
    } catch (error) {
      console.error('Error checking existing records:', error);
      errors.push('Error checking for existing records in database');
    }

    return errors;
  };

  // Check existing keys in database
  const checkExistingKeysInDatabase = async (type, primaryKeyField, keys) => {
    try {
      switch (type) {
        case 'assets':
          const assetsRes = await API.post('/assets/check-existing', { asset_ids: keys });
          return assetsRes.data?.existing_ids || [];
        case 'assetTypes':
          // TODO: Implement when asset types bulk upload is ready
          return [];
        case 'employees':
          try {
            const employeesRes = await API.post('/employees/check-existing', { employee_ids: keys });
            return employeesRes.data?.existing_ids || [];
          } catch (error) {
            console.error('Error checking existing employees:', error);
            return [];
          }
        default:
          return [];
      }
    } catch (error) {
      console.error(`Error checking existing ${type}:`, error);
      return [];
    }
  };

  // Enhanced data type validation
  const validateDataTypes = (type, headers, dataRows) => {
    const errors = [];

    dataRows.forEach(({ rowNumber, data }) => {
      const rowErrors = [];

      switch (type) {
        case 'assets':
          // Validate numeric fields
          const purchasedCostIndex = headers.indexOf('purchased_cost');
          if (purchasedCostIndex !== -1 && data[purchasedCostIndex]) {
            const cost = parseFloat(data[purchasedCostIndex]);
            if (isNaN(cost) || cost < 0) {
              rowErrors.push('purchased_cost must be a positive number');
            }
          }

          // Validate date fields
          const purchasedOnIndex = headers.indexOf('purchased_on');
          if (purchasedOnIndex !== -1 && data[purchasedOnIndex]) {
            const date = new Date(data[purchasedOnIndex]);
            if (isNaN(date.getTime())) {
              rowErrors.push('purchased_on must be a valid date (YYYY-MM-DD)');
            }
          }

          // Validate boolean fields
          const intStatusIndex = headers.indexOf('int_status');
          if (intStatusIndex !== -1 && data[intStatusIndex]) {
            const intStatus = data[intStatusIndex];
            if (!['0', '1', 'true', 'false'].includes(intStatus.toLowerCase())) {
              rowErrors.push('int_status must be 0, 1, true, or false');
            }
          }
          break;

        case 'assetTypes':
          // Validate boolean fields
          const inspectionRequiredIndex = headers.indexOf('inspection_required');
          if (inspectionRequiredIndex !== -1 && data[inspectionRequiredIndex]) {
            const inspectionRequired = data[inspectionRequiredIndex];
            if (!['true', 'false', '1', '0'].includes(inspectionRequired.toLowerCase())) {
              rowErrors.push('inspection_required must be true, false, 1, or 0');
            }
          }
          break;

        case 'employees':
          // Validate email format
          const emailIndex = headers.indexOf('email_id');
          if (emailIndex !== -1 && data[emailIndex]) {
            const email = data[emailIndex];
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
              rowErrors.push('email_id must be a valid email address');
            }
          }

          // Validate phone number
          const phoneIndex = headers.indexOf('phone_number');
          if (phoneIndex !== -1 && data[phoneIndex]) {
            const phone = data[phoneIndex];
            if (!/^\d{10}$/.test(phone)) {
              rowErrors.push('phone_number must be exactly 10 digits');
            }
          }
          break;
      }

      if (rowErrors.length > 0) {
        errors.push(`Row ${rowNumber}: ${rowErrors.join(', ')}`);
      }
    });

    return errors;
  };

  // Referential Integrity Validation Functions
  const validateReferentialIntegrity = (type, headers, dataRows, referenceData) => {
    console.log('🔍 Validating referential integrity for type:', type);
    console.log('Reference data available:', {
      assetTypes: referenceData.assetTypes?.length || 0,
      vendors: referenceData.vendors?.length || 0,
      users: referenceData.users?.length || 0,
      vendorProdServices: referenceData.vendorProdServices?.length || 0
    });
    
    const errors = [];

    dataRows.forEach(({ rowNumber, data }) => {
      const rowErrors = [];

      switch (type) {
        case 'assets':
          // Validate Assets referential integrity

          const assetTypeIdIndex = headers.indexOf('asset_type_id');
          if (assetTypeIdIndex !== -1 && data[assetTypeIdIndex]) {
            const assetTypeId = data[assetTypeIdIndex];
            if (referenceData.assetTypes.length > 0) {
              const assetTypeExists = referenceData.assetTypes.some(at => at.asset_type_id === assetTypeId);
              if (!assetTypeExists) {
                rowErrors.push(`asset_type_id '${assetTypeId}' does not exist in asset types table`);
              }
            } else {
              console.warn('Cannot validate asset_type_id - asset types data not available');
            }
          }

          // Note: branch_id is auto-populated from user's branch, not user input

          const purchaseVendorIdIndex = headers.indexOf('purchase_vendor_id');
          if (purchaseVendorIdIndex !== -1 && data[purchaseVendorIdIndex]) {
            const vendorId = data[purchaseVendorIdIndex];
            if (referenceData.vendors.length > 0) {
              const vendorExists = referenceData.vendors.some(vendor => vendor.vendor_id === vendorId);
              if (!vendorExists) {
                rowErrors.push(`purchase_vendor_id '${vendorId}' does not exist in vendors table`);
              }
            } else {
              console.warn('Cannot validate purchase_vendor_id - vendors data not available');
            }
          }

          const serviceVendorIdIndex = headers.indexOf('service_vendor_id');
          if (serviceVendorIdIndex !== -1 && data[serviceVendorIdIndex]) {
            const serviceVendorId = data[serviceVendorIdIndex];
            if (referenceData.vendors.length > 0) {
              const serviceVendorExists = referenceData.vendors.some(vendor => vendor.vendor_id === serviceVendorId);
              if (!serviceVendorExists) {
                rowErrors.push(`service_vendor_id '${serviceVendorId}' does not exist in vendors table`);
              }
            } else {
              console.warn('Cannot validate service_vendor_id - vendors data not available');
            }
          }


          const purchasedByIndex = headers.indexOf('purchased_by');
          if (purchasedByIndex !== -1 && data[purchasedByIndex]) {
            const purchasedBy = data[purchasedByIndex];
            const userExists = referenceData.users.some(user => user.user_id === purchasedBy);
            if (!userExists) {
              rowErrors.push(`purchased_by '${purchasedBy}' does not exist in users table`);
            }
          }

          const createdByIndex = headers.indexOf('created_by');
          if (createdByIndex !== -1 && data[createdByIndex]) {
            const createdBy = data[createdByIndex];
            const userExists = referenceData.users.some(user => user.user_id === createdBy);
            if (!userExists) {
              rowErrors.push(`created_by '${createdBy}' does not exist in users table`);
            }
          }

          const changedByIndex = headers.indexOf('changed_by');
          if (changedByIndex !== -1 && data[changedByIndex]) {
            const changedBy = data[changedByIndex];
            const userExists = referenceData.users.some(user => user.user_id === changedBy);
            if (!userExists) {
              rowErrors.push(`changed_by '${changedBy}' does not exist in users table`);
            }
          }
          break;

        case 'assetTypes':
          // Validate Asset Types referential integrity
          const orgIdIndexAT = headers.indexOf('org_id');
          if (orgIdIndexAT !== -1 && data[orgIdIndexAT]) {
            const orgId = data[orgIdIndexAT];
            const orgExists = referenceData.organizations.some(org => org.org_id === orgId);
            if (!orgExists) {
              rowErrors.push(`org_id '${orgId}' does not exist in organizations table`);
            }
          }

          const parentAssetTypeIdIndex = headers.indexOf('parent_asset_type_id');
          if (parentAssetTypeIdIndex !== -1 && data[parentAssetTypeIdIndex] && data[parentAssetTypeIdIndex] !== '') {
            const parentAssetTypeId = data[parentAssetTypeIdIndex];
            const parentAssetTypeExists = referenceData.assetTypes.some(at => at.asset_type_id === parentAssetTypeId);
            if (!parentAssetTypeExists) {
              rowErrors.push(`parent_asset_type_id '${parentAssetTypeId}' does not exist in asset types table`);
            }
          }

          const maintTypeIdIndex = headers.indexOf('maint_type_id');
          if (maintTypeIdIndex !== -1 && data[maintTypeIdIndex] && data[maintTypeIdIndex] !== '') {
            const maintTypeId = data[maintTypeIdIndex];
            // Note: maint_type_id validation would need a maintenance types API endpoint
            // For now, we'll skip this validation
          }

          const createdByIndexAT = headers.indexOf('created_by');
          if (createdByIndexAT !== -1 && data[createdByIndexAT]) {
            const createdBy = data[createdByIndexAT];
            const userExists = referenceData.users.some(user => user.user_id === createdBy);
            if (!userExists) {
              rowErrors.push(`created_by '${createdBy}' does not exist in users table`);
            }
          }

          const changedByIndexAT = headers.indexOf('changed_by');
          if (changedByIndexAT !== -1 && data[changedByIndexAT]) {
            const changedBy = data[changedByIndexAT];
            const userExists = referenceData.users.some(user => user.user_id === changedBy);
            if (!userExists) {
              rowErrors.push(`changed_by '${changedBy}' does not exist in users table`);
            }
          }
          break;

        case 'employees':
          // Validate Employees referential integrity
          const deptIdIndex = headers.indexOf('dept_id');
          if (deptIdIndex !== -1 && data[deptIdIndex]) {
            const deptId = data[deptIdIndex];
            const deptExists = referenceData.departments.some(dept => dept.dept_id === deptId);
            if (!deptExists) {
              rowErrors.push(`dept_id '${deptId}' does not exist in departments table`);
            }
          }

          const createdByIndexEmp = headers.indexOf('created_by');
          if (createdByIndexEmp !== -1 && data[createdByIndexEmp]) {
            const createdBy = data[createdByIndexEmp];
            const userExists = referenceData.users.some(user => user.user_id === createdBy);
            if (!userExists) {
              rowErrors.push(`created_by '${createdBy}' does not exist in users table`);
            }
          }

          const changedByIndexEmp = headers.indexOf('changed_by');
          if (changedByIndexEmp !== -1 && data[changedByIndexEmp]) {
            const changedBy = data[changedByIndexEmp];
            const userExists = referenceData.users.some(user => user.user_id === changedBy);
            if (!userExists) {
              rowErrors.push(`changed_by '${changedBy}' does not exist in users table`);
            }
          }
          break;
      }

      if (rowErrors.length > 0) {
        errors.push(`Row ${rowNumber}: ${rowErrors.join(', ')}`);
      }
    });

    return errors;
  };

  // Validation Summary Component
  const ValidationSummary = ({ uploadStatus, type }) => {
    if (!uploadStatus || !uploadStatus.fileName) return null;

    const isValid = uploadStatus.validationResult?.isValid;
    const validationResult = uploadStatus.validationResult;

    return (
      <div className={`mt-2 p-3 border rounded-lg ${
        isValid ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
      }`}>
        <div className={`flex items-center gap-2 text-sm ${
          isValid ? 'text-green-800' : 'text-red-800'
        }`}>
          {isValid ? (
            <CheckCircle className="w-4 h-4" />
          ) : (
            <AlertCircle className="w-4 h-4" />
          )}
          <span className="font-medium">
            {isValid 
              ? 'File Uploaded & Validated Successfully' 
              : 'File Uploaded with Validation Errors'
            }
          </span>
        </div>
        <div className={`text-xs mt-1 ${
          isValid ? 'text-green-700' : 'text-red-700'
        }`}>
          <div>File: {uploadStatus.fileName}</div>
          <div>Size: {(uploadStatus.fileSize / 1024).toFixed(2)} KB</div>
          <div>Uploaded: {new Date(uploadStatus.uploadTime).toLocaleString()}</div>
          {validationResult && (
            <>
              <div>Total Rows: {validationResult.totalRows}</div>
              <div>Valid Rows: {validationResult.validRows}</div>
              <div>Validation Errors: {validationResult.errors.length}</div>
            </>
          )}
        </div>
        {validationResult && !isValid && (
          <div className="mt-2 text-xs text-red-600">
            <div className="font-medium">Validation Errors:</div>
            <div className="max-h-20 overflow-y-auto">
              {validationResult.errors.slice(0, 5).map((error, index) => (
                <div key={index}>• {error}</div>
              ))}
              {validationResult.errors.length > 5 && (
                <div>... and {validationResult.errors.length - 5} more errors</div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  const handleFileUpload = (type, file) => {
    console.log(`Uploading file for ${type}:`, file);
    
    // Set the file state
    setFile(file);
    
    // Clear previous trial results for this type
    setTrialResults(prev => ({
      ...prev,
      [type]: {}
    }));
    
    // Validate file type
    if (!file.name.toLowerCase().endsWith('.csv')) {
      alert('Please select a CSV file');
      return;
    }
    
    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('File size must be less than 10MB');
      return;
    }
    
    // Parse and validate CSV content
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const csvContent = e.target.result;
        
        // Basic validation first (without API calls)
        const lines = csvContent.split('\n').filter(line => line.trim());
        if (lines.length < 2) {
          alert('CSV file must have at least a header row and one data row');
          return;
        }
        
        if (lines.length > 10000) {
          alert('CSV file cannot exceed 10,000 rows');
          return;
        }
        
        // Set basic upload status first
        setUploadStatus(prev => ({
          ...prev,
          [type]: {
            fileName: file.name,
            fileSize: file.size,
            uploadTime: new Date().toISOString(),
            status: 'uploaded',
            csvContent: csvContent,
            validationResult: {
              isValid: true,
              totalRows: lines.length - 1,
              validRows: lines.length - 1,
              errors: []
            }
          }
        }));
        
        // Try full validation (with API calls) - but don't block the UI
        try {
          const validationResult = await validateCSVContent(type, csvContent);
          setUploadStatus(prev => ({
            ...prev,
            [type]: {
              ...prev[type],
              validationResult: validationResult
            }
          }));
          
          if (!validationResult.isValid) {
            showValidationErrors(type, validationResult.errors);
          }
        } catch (validationError) {
          console.warn('Full validation failed, using basic validation:', validationError);
          // Keep the basic validation result
        }
      } catch (error) {
        alert('Error reading CSV file: ' + error.message);
      }
    };
    reader.readAsText(file);
  };

  const handleTrialUpload = async (type) => {
    console.log(`Running trial upload for ${type}`);
    
    // Check if file is uploaded and validated
    const uploadStatusForType = uploadStatus[type];
    if (!uploadStatusForType || !uploadStatusForType.validationResult) {
      alert('Please upload and validate a CSV file first');
      return;
    }

    // Check if validation passed
    if (!uploadStatusForType.validationResult.isValid) {
      console.error('Validation failed with errors:', uploadStatusForType.validationResult.errors);
      alert(`Please fix validation errors before running trial upload:\n\n${uploadStatusForType.validationResult.errors.slice(0, 5).join('\n')}${uploadStatusForType.validationResult.errors.length > 5 ? '\n... and more errors' : ''}`);
      return;
    }

    // Show loading state
    setIsValidating(true);
    setValidationProgress(50);

    try {
      // For assets, fetch property mappings if needed
      if (type === 'assets') {
        // Get the first asset type from CSV to fetch property mappings
        const lines = uploadStatusForType.csvContent.split('\n').filter(line => line.trim());
        if (lines.length > 1) {
          const headers = parseCSVLine(lines[0]);
          const firstRow = parseCSVLine(lines[1]);
          const assetTypeIndex = headers.indexOf('asset_type_id');
          if (assetTypeIndex !== -1 && firstRow[assetTypeIndex]) {
            const assetTypeId = firstRow[assetTypeIndex];
            const mappings = await fetchPropertyMappings(assetTypeId);
            setPropertyMappings(mappings);
          }
        }
      }

      // Convert CSV data to array of objects for API
      const csvData = convertCSVToObjectArray(uploadStatusForType.csvContent, type);
      
      let response;
      switch (type) {
        case 'assets':
          try {
            response = await API.post('/assets/trial-upload', { csvData });
            if (response.data.success) {
              setTrialResults(prev => ({
                ...prev,
                [type]: {
                  totalRows: response.data.results.totalRows,
                  newRecords: response.data.results.newRecords,
                  updatedRecords: response.data.results.updatedRecords,
                  errors: response.data.results.errors
                }
              }));
              setUploadStatus(prev => ({ 
                ...prev, 
                [type]: { 
                  ...prev[type], 
                  trialCompleted: true 
                } 
              }));
            } else {
              alert('Trial upload failed: ' + (response.data.error || 'Unknown error'));
            }
          } catch (error) {
            console.error('Trial upload error:', error);
            if (error.response?.status === 401) {
              alert('Session expired. Please refresh the page and try again.');
            } else {
              alert('Trial upload failed: ' + (error.response?.data?.error || error.message));
            }
          }
          setIsValidating(false);
          setValidationProgress(0);
          break;
        case 'assetTypes':
          // TODO: Implement when asset types bulk upload is ready
          alert('Asset Types trial upload not yet implemented');
          setIsValidating(false);
          setValidationProgress(0);
          return;
        case 'employees':
          try {
            console.log('🔍 Running employees trial upload with csvData:', csvData);
            const response = await API.post('/employees/trial-upload', { csvData });
            console.log('🔍 Employees trial upload response:', response.data);
            if (response.data.success) {
              setTrialResults(prev => ({
                ...prev,
                [type]: {
                  totalRows: response.data.results.totalRows,
                  newRecords: response.data.results.newRecords,
                  updatedRecords: response.data.results.updatedRecords,
                  errors: response.data.results.errors
                }
              }));
              setUploadStatus(prev => ({ 
                ...prev, 
                [type]: { 
                  ...prev[type], 
                  trialCompleted: true 
                } 
              }));
            } else {
              alert('Trial upload failed: ' + (response.data.error || 'Unknown error'));
            }
          } catch (error) {
            console.error('Trial upload error:', error);
            if (error.response?.status === 401) {
              alert('Session expired. Please refresh the page and try again.');
            } else {
              alert('Trial upload failed: ' + (error.response?.data?.error || error.message));
            }
          }
          setIsValidating(false);
          setValidationProgress(0);
          return;
        default:
          alert('Unknown table type');
          setIsValidating(false);
          setValidationProgress(0);
          return;
      }

      if (response.data.success) {
        setTrialResults(prev => ({
          ...prev,
          [type]: response.data.trialResults
        }));

        const results = response.data.trialResults;
        const message = `Trial Upload Results for ${type}:\n\n` +
          `- New Records: ${results.newRecords}\n` +
          `- Updated Records: ${results.updatedRecords}\n` +
          `- Errors: ${results.errors}\n` +
          `- Total Processed: ${results.totalProcessed}`;
        
        alert(message);
      } else {
        alert('Trial upload failed: ' + response.data.error);
      }
    } catch (error) {
      console.error('Trial upload error:', error);
      
      // Handle authentication errors specifically
      if (error.response?.status === 401) {
        alert('Session expired. Please log in again.');
        // The axios interceptor will handle the logout and redirect
        return;
      }
      
      alert('Trial upload failed: ' + (error.response?.data?.error || error.message));
    } finally {
      setIsValidating(false);
      setValidationProgress(0);
    }
  };

  const handleCommit = async (type) => {
    console.log(`Committing data for ${type}`);
    
    // Check if trial upload was run
    const trialResult = trialResults[type];
    if (!trialResult) {
      alert('Please run trial upload first');
      return;
    }
    
    // Confirm commit
    const confirmed = window.confirm(
      `Are you sure you want to commit the changes for ${type}?\n\n` +
      `This will:\n` +
      `- Insert ${trialResult.newRecords} new records\n` +
      `- Update ${trialResult.updatedRecords} existing records\n` +
      `- Skip ${trialResult.errors} records with errors\n\n` +
      `This action cannot be undone.`
    );
    
    if (confirmed) {
      try {
        // Get CSV data for commit
        const uploadStatusForType = uploadStatus[type];
        const csvData = convertCSVToObjectArray(uploadStatusForType.csvContent, type);
        
        let response;
        switch (type) {
          case 'assets':
            response = await API.post('/assets/commit-bulk-upload', { csvData });
            break;
          case 'assetTypes':
            // TODO: Implement when asset types bulk upload is ready
            alert('Asset Types commit not yet implemented');
            return;
          case 'employees':
            try {
              const response = await API.post('/employees/commit-bulk-upload', { csvData });
              if (response.data.success) {
                const results = response.data.results;
                alert(`Employees bulk upload completed successfully!\n\n` +
                      `Inserted: ${results.inserted} records\n` +
                      `Updated: ${results.updated} records\n` +
                      `Errors: ${results.errors} records`);
                
                // Clear the upload status for this tab
                clearStorage(activeTab);
                setUploadStatus({});
                setTrialResults({});
                setFile(null);
              } else {
                alert('Commit failed: ' + (response.data.error || 'Unknown error'));
              }
            } catch (error) {
              console.error('Commit error:', error);
              if (error.response?.status === 401) {
                alert('Session expired. Please refresh the page and try again.');
              } else {
                alert('Commit failed: ' + (error.response?.data?.error || error.message));
              }
            }
            return;
          default:
            alert('Unknown table type');
            return;
        }

        if (response.data.success) {
          const results = response.data.results;
          alert(`Data committed successfully for ${type}!\n\n` +
            `- Inserted: ${results.inserted} records\n` +
            `- Updated: ${results.updated} records\n` +
            `- Errors: ${results.errors} records\n` +
            `- Total Processed: ${results.totalProcessed} records`);
          
          // Reset trial results after commit
          setTrialResults(prev => ({
            ...prev,
            [type]: null
          }));
          
          // Reset upload status
          setUploadStatus(prev => ({
            ...prev,
            [type]: null
          }));

          // Clear localStorage for this type
          const newUploadStatus = { ...uploadStatus, [type]: null };
          const newTrialResults = { ...trialResults, [type]: null };
          saveToStorage('uploadStatus', newUploadStatus);
          saveToStorage('trialResults', newTrialResults);
        } else {
          alert('Commit failed: ' + response.data.error);
        }
      } catch (error) {
        console.error('Commit error:', error);
        
        // Handle authentication errors specifically
        if (error.response?.status === 401) {
          alert('Session expired. Please log in again.');
          // The axios interceptor will handle the logout and redirect
          return;
        }
        
        alert('Commit failed: ' + (error.response?.data?.error || error.message));
      }
    }
  };

  const renderTabContent = (tabId) => {
    switch (tabId) {
      case 'assets':
        return <AssetsTab 
          onDownloadSample={() => handleDownloadSample('assets')}
          onFileUpload={(file) => handleFileUpload('assets', file)}
          onTrialUpload={() => handleTrialUpload('assets')}
          onCommit={() => handleCommit('assets')}
          uploadStatus={uploadStatus.assets}
          trialResults={trialResults.assets}
        />;
      case 'assetTypes':
        return <AssetTypesTab 
          onDownloadSample={() => handleDownloadSample('assetTypes')}
          onFileUpload={(file) => handleFileUpload('assetTypes', file)}
          onTrialUpload={() => handleTrialUpload('assetTypes')}
          onCommit={() => handleCommit('assetTypes')}
          uploadStatus={uploadStatus.assetTypes}
          trialResults={trialResults.assetTypes}
        />;
      case 'employees':
        return <EmployeesTab 
          onDownloadSample={() => handleDownloadSample('employees')}
          onFileUpload={(file) => handleFileUpload('employees', file)}
          onTrialUpload={() => handleTrialUpload('employees')}
          onCommit={() => handleCommit('employees')}
          uploadStatus={uploadStatus.employees}
          trialResults={trialResults.employees}
        />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Bulk Upload</h1>
          <p className="text-gray-600 mt-1">Upload data in bulk using CSV files for Assets, Asset Types, and Employees</p>
        </div>

        {/* Main Content Card */}
        <div className="bg-white rounded-lg shadow-sm border">
          {/* Tab Navigation */}
          <div className="border-b border-gray-200 px-6">
            <nav className="-mb-px flex space-x-8">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>

        {/* Tab Content */}
        <div className="p-6">
          {/* Loading Overlay */}
          {isValidating && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                  <span className="text-lg font-medium">Processing...</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${validationProgress}%` }}
                  ></div>
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  {validationProgress < 50 ? 'Validating CSV data...' : 'Running trial upload...'}
                </p>
              </div>
            </div>
          )}
          
          {renderTabContent(activeTab)}
        </div>
        </div>
      </div>
    </div>
  );
};

// Assets Tab Component
const AssetsTab = ({ onDownloadSample, onFileUpload, onTrialUpload, onCommit, uploadStatus, trialResults }) => {
  const [selectedFile, setSelectedFile] = useState(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    setSelectedFile(file);
    if (file) {
      onFileUpload(file);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-blue-900 mb-2">Assets Bulk Upload</h3>
        <p className="text-blue-700 text-sm">
          Upload assets in bulk using CSV format. Download the sample file to see the required format.
        </p>
      </div>

      {/* Step 1: Download Sample */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h4 className="text-md font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Download className="w-5 h-5 text-blue-500" />
          Step 1: Download Sample File
        </h4>
        <p className="text-gray-600 text-sm mb-4">
          Download the sample CSV file to understand the required format and mandatory fields.
        </p>
        <button
          onClick={onDownloadSample}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2"
        >
          <Download className="w-4 h-4" />
          Download Sample CSV
        </button>
      </div>

      {/* Step 2: Upload File */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h4 className="text-md font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Upload className="w-5 h-5 text-green-500" />
          Step 2: Upload Your File
        </h4>
        <div className="space-y-4">
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
              id="assets-file-upload"
            />
            <label
              htmlFor="assets-file-upload"
              className="cursor-pointer flex flex-col items-center gap-2"
            >
              <Upload className="w-8 h-8 text-gray-400" />
              <span className="text-sm text-gray-600">
                {selectedFile ? selectedFile.name : 'Click to select CSV file'}
              </span>
            </label>
          </div>
          
          {selectedFile && (
            <div className="flex items-center gap-2 text-sm text-green-600">
              <CheckCircle className="w-4 h-4" />
              File selected: {selectedFile.name}
            </div>
          )}
        </div>
      </div>

      {/* Step 3: Trial Upload */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h4 className="text-md font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-yellow-500" />
          Step 3: Trial Upload
        </h4>
        <p className="text-gray-600 text-sm mb-4">
          Run a trial upload to validate your data and see what will be inserted or updated.
        </p>
        <button
          onClick={onTrialUpload}
          disabled={!selectedFile}
          className="bg-yellow-500 hover:bg-yellow-600 disabled:bg-gray-300 text-white px-4 py-2 rounded-lg flex items-center gap-2"
        >
          <AlertCircle className="w-4 h-4" />
          Run Trial Upload
        </button>

        {/* Trial Results */}
        {trialResults && trialResults.totalRows && trialResults.totalRows > 0 && (
          <div className="mt-4 bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h5 className="font-semibold text-gray-900 mb-2">Trial Results:</h5>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>New Records: {trialResults.newRecords || 0}</span>
              </div>
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-blue-500" />
                <span>Updated Records: {trialResults.updatedRecords || 0}</span>
              </div>
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-500" />
                <span>Errors: {trialResults.errors || 0}</span>
              </div>
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-gray-500" />
                <span>Total Processed: {trialResults.totalRows || 0}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Step 4: Commit */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h4 className="text-md font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-green-500" />
          Step 4: Commit Changes
        </h4>
        <p className="text-gray-600 text-sm mb-4">
          Review the trial results and commit the changes to save them to the database.
        </p>
        <button
          onClick={onCommit}
          disabled={!trialResults || Object.keys(trialResults).length === 0}
          className="bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white px-4 py-2 rounded-lg flex items-center gap-2"
        >
          <CheckCircle className="w-4 h-4" />
          Commit Changes
        </button>
      </div>
    </div>
  );
};

// Asset Types Tab Component
const AssetTypesTab = ({ onDownloadSample, onFileUpload, onTrialUpload, onCommit, uploadStatus, trialResults }) => {
  const [selectedFile, setSelectedFile] = useState(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    setSelectedFile(file);
    if (file) {
      onFileUpload(file);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-green-900 mb-2">Asset Types Bulk Upload</h3>
        <p className="text-green-700 text-sm">
          Upload asset types in bulk using CSV format. Download the sample file to see the required format.
        </p>
      </div>

      {/* Step 1: Download Sample */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h4 className="text-md font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Download className="w-5 h-5 text-green-500" />
          Step 1: Download Sample File
        </h4>
        <p className="text-gray-600 text-sm mb-4">
          Download the sample CSV file to understand the required format and mandatory fields.
        </p>
        <button
          onClick={onDownloadSample}
          className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2"
        >
          <Download className="w-4 h-4" />
          Download Sample CSV
        </button>
      </div>

      {/* Step 2: Upload File */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h4 className="text-md font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Upload className="w-5 h-5 text-green-500" />
          Step 2: Upload Your File
        </h4>
        <div className="space-y-4">
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
              id="assetTypes-file-upload"
            />
            <label
              htmlFor="assetTypes-file-upload"
              className="cursor-pointer flex flex-col items-center gap-2"
            >
              <Upload className="w-8 h-8 text-gray-400" />
              <span className="text-sm text-gray-600">
                {selectedFile ? selectedFile.name : 'Click to select CSV file'}
              </span>
            </label>
          </div>
          
          {selectedFile && (
            <div className="flex items-center gap-2 text-sm text-green-600">
              <CheckCircle className="w-4 h-4" />
              File selected: {selectedFile.name}
            </div>
          )}
        </div>
      </div>

      {/* Step 3: Trial Upload */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h4 className="text-md font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-yellow-500" />
          Step 3: Trial Upload
        </h4>
        <p className="text-gray-600 text-sm mb-4">
          Run a trial upload to validate your data and see what will be inserted or updated.
        </p>
        <button
          onClick={onTrialUpload}
          disabled={!selectedFile}
          className="bg-yellow-500 hover:bg-yellow-600 disabled:bg-gray-300 text-white px-4 py-2 rounded-lg flex items-center gap-2"
        >
          <AlertCircle className="w-4 h-4" />
          Run Trial Upload
        </button>

        {/* Trial Results */}
        {trialResults && trialResults.totalRows && trialResults.totalRows > 0 && (
          <div className="mt-4 bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h5 className="font-semibold text-gray-900 mb-2">Trial Results:</h5>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>New Records: {trialResults.newRecords || 0}</span>
              </div>
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-blue-500" />
                <span>Updated Records: {trialResults.updatedRecords || 0}</span>
              </div>
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-500" />
                <span>Errors: {trialResults.errors || 0}</span>
              </div>
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-gray-500" />
                <span>Total Processed: {trialResults.totalRows || 0}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Step 4: Commit */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h4 className="text-md font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-green-500" />
          Step 4: Commit Changes
        </h4>
        <p className="text-gray-600 text-sm mb-4">
          Review the trial results and commit the changes to save them to the database.
        </p>
        <button
          onClick={onCommit}
          disabled={!trialResults || Object.keys(trialResults).length === 0}
          className="bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white px-4 py-2 rounded-lg flex items-center gap-2"
        >
          <CheckCircle className="w-4 h-4" />
          Commit Changes
        </button>
      </div>
    </div>
  );
};

// Employees Tab Component
const EmployeesTab = ({ onDownloadSample, onFileUpload, onTrialUpload, onCommit, uploadStatus, trialResults }) => {
  const [selectedFile, setSelectedFile] = useState(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    setSelectedFile(file);
    if (file) {
      onFileUpload(file);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-purple-900 mb-2">Employees Bulk Upload</h3>
        <p className="text-purple-700 text-sm">
          Upload employees in bulk using CSV format. Download the sample file to see the required format.
        </p>
      </div>

      {/* Step 1: Download Sample */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h4 className="text-md font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Download className="w-5 h-5 text-purple-500" />
          Step 1: Download Sample File
        </h4>
        <p className="text-gray-600 text-sm mb-4">
          Download the sample CSV file to understand the required format and mandatory fields.
        </p>
        <button
          onClick={onDownloadSample}
          className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg flex items-center gap-2"
        >
          <Download className="w-4 h-4" />
          Download Sample CSV
        </button>
      </div>

      {/* Step 2: Upload File */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h4 className="text-md font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Upload className="w-5 h-5 text-purple-500" />
          Step 2: Upload Your File
        </h4>
        <div className="space-y-4">
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
              id="employees-file-upload"
            />
            <label
              htmlFor="employees-file-upload"
              className="cursor-pointer flex flex-col items-center gap-2"
            >
              <Upload className="w-8 h-8 text-gray-400" />
              <span className="text-sm text-gray-600">
                {selectedFile ? selectedFile.name : 'Click to select CSV file'}
              </span>
            </label>
          </div>
          
          {selectedFile && (
            <div className="flex items-center gap-2 text-sm text-green-600">
              <CheckCircle className="w-4 h-4" />
              File selected: {selectedFile.name}
            </div>
          )}
        </div>
      </div>

      {/* Step 3: Trial Upload */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h4 className="text-md font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-yellow-500" />
          Step 3: Trial Upload
        </h4>
        <p className="text-gray-600 text-sm mb-4">
          Run a trial upload to validate your data and see what will be inserted or updated.
        </p>
        <button
          onClick={onTrialUpload}
          disabled={!selectedFile}
          className="bg-yellow-500 hover:bg-yellow-600 disabled:bg-gray-300 text-white px-4 py-2 rounded-lg flex items-center gap-2"
        >
          <AlertCircle className="w-4 h-4" />
          Run Trial Upload
        </button>

        {/* Trial Results */}
        {trialResults && trialResults.totalRows && trialResults.totalRows > 0 && (
          <div className="mt-4 bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h5 className="font-semibold text-gray-900 mb-2">Trial Results:</h5>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>New Records: {trialResults.newRecords || 0}</span>
              </div>
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-blue-500" />
                <span>Updated Records: {trialResults.updatedRecords || 0}</span>
              </div>
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-500" />
                <span>Errors: {trialResults.errors || 0}</span>
              </div>
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-gray-500" />
                <span>Total Processed: {trialResults.totalRows || 0}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Step 4: Commit */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h4 className="text-md font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-green-500" />
          Step 4: Commit Changes
        </h4>
        <p className="text-gray-600 text-sm mb-4">
          Review the trial results and commit the changes to save them to the database.
        </p>
        <button
          onClick={onCommit}
          disabled={!trialResults || Object.keys(trialResults).length === 0}
          className="bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white px-4 py-2 rounded-lg flex items-center gap-2"
        >
          <CheckCircle className="w-4 h-4" />
          Commit Changes
        </button>
      </div>
    </div>
  );
};

export default Roles; 