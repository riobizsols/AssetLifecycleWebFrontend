// AssetFormPage.jsx
import React, { useState, useEffect, useRef } from 'react';
import API from '../../lib/axios';
import toast from 'react-hot-toast';
import { MdKeyboardArrowRight, MdKeyboardArrowDown } from 'react-icons/md';
import SearchableDropdown from '../ui/SearchableDropdown';
import { useAuthStore } from '../../store/useAuthStore';
import { useNavigate } from 'react-router-dom';
import useAuditLog from '../../hooks/useAuditLog';
import { ASSETS_APP_ID } from '../../constants/assetsAuditEvents';
import { generateUUID } from '../../utils/uuid';
import { useAppData } from '../../contexts/AppDataContext';
import { useLanguage } from '../../contexts/LanguageContext';

const initialForm = {
  assetType: '',
  serialNumber: '',
  serialNumberNotRequired: false, // New field to mark serial number as optional
  description: '',
  expiryDate: '',
  warrantyPeriod: '',
  purchaseDate: '',
  purchaseCost: '',
  properties: {},
  purchaseBy: '',
  vendorBrand: '',
  vendorModel: '',
  purchaseSupply: '',
  serviceSupply: '',
  parentAsset: '', // Add parent asset field
  assetId: '', // Add asset ID field for document uploads
  // Accounting fields that users need to enter
  salvageValue: '',
  usefulLifeYears: '5',
  // New fields
  costCenter: '',
  location: '',
  insurancePolicyNumber: '',
  insurer: '',
  insuredValue: '',
  insuranceStartDate: '',
  insuranceEndDate: '',
  comprehensiveInsurance: '',
};




// Status options will be created dynamically with translations

// Remove all dummy data arrays and fallback logic for vendors, brands, models, users, and maintenance schedules
// Only keep the real API fetch logic for these dropdowns

const AddAssetForm = ({ userRole }) => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { t } = useLanguage();
  const { 
    users, 
    vendors, 
    assetTypes, 
    loading: appDataLoading,
    getUserBranchId,
    getUserBranchName,
    getUserDepartmentName 
  } = useAppData();
  
  const [form, setForm] = useState(initialForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('Configuration');
  
  // Create status options with translations
  const statusOptions = [
    { value: '', label: t('assets.select') },
    { value: 'Active', label: t('assets.active') },
    { value: 'Inactive', label: t('assets.inactive') },
    { value: 'Disposed', label: t('assets.disposed') },
  ];
  const [attachments, setAttachments] = useState([]); // {id, type, file, docTypeName, previewUrl}
  const [isUploading, setIsUploading] = useState(false);
  // Add validation state
  const [touched, setTouched] = useState({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [validationErrors, setValidationErrors] = useState({
    assetType: false,
    serialNumber: false,
    purchaseDate: false,
    purchaseCost: false,
    parentAsset: false,
    purchaseBy: false,
    expiryDate: false,
    dateMismatch: false,
    expiryDateBeforePurchase: false,
    vendorRequired: false
  });

  // Initialize audit logging
  const { recordActionByNameWithFetch } = useAuditLog(ASSETS_APP_ID);
  const [propertiesMap, setPropertiesMap] = useState({});
  const [dynamicProperties, setDynamicProperties] = useState([]);
  const [assetTypePropsMap, setAssetTypePropsMap] = useState({});
  const [collapsedSections, setCollapsedSections] = useState({
    asset: false, // Asset Details expanded by default
    purchase: true,
    vendor: true,
    accounting: true, // Add new state for accounting details
    insurance: true,
    other: true,
  });
  const [purchaseByOptions, setPurchaseByOptions] = useState([]);
  const [vendorBrandOptions, setVendorBrandOptions] = useState([]);
  const [vendorModelOptions, setVendorModelOptions] = useState([]);
  const [purchaseSupplyOptions, setPurchaseSupplyOptions] = useState([]);
  const [serviceSupplyOptions, setServiceSupplyOptions] = useState([]);
  const [searchAssetType, setSearchAssetType] = useState("");
  const assetTypeDropdownRef = useRef(null);
  const [assetTypeDropdownOpen, setAssetTypeDropdownOpen] = useState(false);
  const [canHaveChildren, setCanHaveChildren] = useState(false);
  const [availableParentAssets, setAvailableParentAssets] = useState([]);
  const [parentDropdownOpen, setParentDropdownOpen] = useState(false);
  const parentDropdownRef = useRef(null);
  const [parentAssets, setParentAssets] = useState([]);
  const [parentAssetDropdownOpen, setParentAssetDropdownOpen] = useState(false);
  const [searchParentAsset, setSearchParentAsset] = useState("");
  const parentAssetDropdownRef = useRef(null);
  const [documentTypes, setDocumentTypes] = useState([]);

  // Add state for search and dropdown visibility
  const [searchStates, setSearchStates] = useState({
    purchaseBy: '',
    vendorBrand: '',
    vendorModel: '',
    purchaseSupply: '',
    serviceSupply: ''
  });
  const [dropdownStates, setDropdownStates] = useState({
    purchaseBy: false,
    vendorBrand: false,
    vendorModel: false,
    purchaseSupply: false,
    serviceSupply: false
  });
  const dropdownRefs = {
    purchaseBy: useRef(null),
    vendorBrand: useRef(null),
    vendorModel: useRef(null),
    purchaseSupply: useRef(null),
    serviceSupply: useRef(null)
  };

  // Add state for serial number generation
  const [isGeneratingSerial, setIsGeneratingSerial] = useState(false);
  
  // Add state for fetched prod_serv_id
  const [fetchedProdServId, setFetchedProdServId] = useState(null);
  
  // Add state to store all prodServ data for filtering
  const [allProdServData, setAllProdServData] = useState([]);

  // Add useEffect to log form state changes
  useEffect(() => {
    console.log('🔍 Form state changed:', form);
  }, [form]);

  // Add useEffect to filter models when brand changes
  useEffect(() => {
    if (allProdServData.length > 0) {
      filterModelsByBrand(form.vendorBrand);
      
      // Clear model selection if it's not valid for the selected brand
      if (form.vendorBrand && form.vendorModel) {
        const validModels = allProdServData
          .filter(item => item.brand === form.vendorBrand)
          .map(item => item.model)
          .filter(Boolean);
        
        if (!validModels.includes(form.vendorModel)) {
          console.log('🔄 Clearing invalid model selection:', form.vendorModel);
          setForm(prev => ({ ...prev, vendorModel: '' }));
        }
      }
    }
  }, [form.vendorBrand, allProdServData]);

  // Add useEffect to fetch prod_serv_id when brand and model are selected
  useEffect(() => {
    if (form.vendorBrand && form.vendorModel) {
      console.log('🔄 Brand and model selected, fetching prod_serv_id...');
      fetchProdServId(form.vendorBrand, form.vendorModel);
    } else {
      setFetchedProdServId(null);
    }
  }, [form.vendorBrand, form.vendorModel]);

  // Add useEffect to log initial form state
  useEffect(() => {
    console.log('🔍 Initial form state:', initialForm);
    console.log('🔍 Current form state:', form);
  }, []);

  useEffect(() => {
    console.log('Component mounted, fetching asset types...');
    fetchAssetTypes();
    fetchUsers();
    fetchProdServs();
    fetchVendors();
    fetchDocumentTypes();
    
    // Check if returning from product service screen
    const savedFormData = sessionStorage.getItem('assetFormData');
    if (savedFormData) {
      try {
        const parsedData = JSON.parse(savedFormData);
        if (parsedData.navigationSource === 'assets-add') {
          // Restore form data
          setForm(prev => ({
            ...prev,
            ...parsedData,
            navigationSource: undefined, // Remove navigation metadata
            createType: undefined
          }));
          
          // Clear the stored data
          sessionStorage.removeItem('assetFormData');
          
          console.log('Form data restored from product service screen');
        }
      } catch (error) {
        console.error('Error parsing saved form data:', error);
        sessionStorage.removeItem('assetFormData');
      }
    }
  }, []);

  useEffect(() => {
    function handleClickOutside(event) {
      if (
        assetTypeDropdownRef.current &&
        !assetTypeDropdownRef.current.contains(event.target) &&
        event.target.type !== "button"
      ) {
        setAssetTypeDropdownOpen(false);
      }
    }
    if (assetTypeDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [assetTypeDropdownOpen]);

  // Add click outside handler for all dropdowns
  useEffect(() => {
    function handleClickOutside(event) {
      Object.entries(dropdownRefs).forEach(([key, ref]) => {
        if (ref.current && !ref.current.contains(event.target) && event.target.type !== "button") {
          setDropdownStates(prev => ({ ...prev, [key]: false }));
        }
      });
    }

    const isAnyDropdownOpen = Object.values(dropdownStates).some(state => state);
    if (isAnyDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [dropdownStates]);

  // Add click outside handler for parent asset dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      console.log('🖱️ Click outside handler triggered');
      console.log('🖱️ Target:', event.target);
      console.log('🖱️ Parent dropdown ref:', parentAssetDropdownRef.current);
      if (
        parentAssetDropdownRef.current &&
        !parentAssetDropdownRef.current.contains(event.target) &&
        event.target.type !== "button"
      ) {
        console.log('🖱️ Closing parent asset dropdown');
        setParentAssetDropdownOpen(false);
      }
    }
    if (parentAssetDropdownOpen) {
      console.log('🖱️ Adding click outside listener');
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      if (parentAssetDropdownOpen) {
        console.log('🖱️ Removing click outside listener');
        document.removeEventListener("mousedown", handleClickOutside);
      }
    };
  }, [parentAssetDropdownOpen]);

  // Update effect to handle boolean values
  useEffect(() => {
    if (form.assetType) {
      const selectedType = assetTypes.find(at => at.asset_type_id === form.assetType);
      console.log('🎯 Selected Asset Type:', selectedType);
      console.log('🔍 Is Child:', selectedType?.is_child);
      console.log('🔍 Parent Asset Type ID:', selectedType?.parent_asset_type_id);
      console.log('🔍 Asset Types available:', assetTypes.length);
      
      // Convert string 'false' to boolean false and check if it has a parent asset type
      const isChild = (selectedType?.is_child === true || selectedType?.is_child === 'true') && !!selectedType?.parent_asset_type_id;
      console.log('✅ Final isChild determination:', isChild);
      
      if (isChild) {
        console.log('🚀 Fetching parent assets for child asset type');
        fetchParentAssets(form.assetType);
      } else {
        console.log('❌ Not a child asset type or missing parent_asset_type_id');
        setParentAssets([]);
        setForm(prev => ({ ...prev, parentAsset: '' }));
      }
    } else {
      console.log('❌ No asset type selected');
    }
  }, [form.assetType]);

  // Add function to fetch parent assets
  const fetchParentAssets = async (assetTypeId) => {
    try {
      console.log('🔍 Fetching parent assets for asset type ID:', assetTypeId);
      const res = await API.get(`/assets/potential-parents/${assetTypeId}`);
      console.log('📦 Parent assets response:', res.data);
      console.log('📊 Response data type:', typeof res.data);
      console.log('📊 Response data length:', Array.isArray(res.data) ? res.data.length : 'Not an array');
      const arr = Array.isArray(res.data) ? res.data : [];
      setParentAssets(arr);

      // Auto-select a parent asset when child asset type is chosen.
      // If there are multiple possible parents, default to the first one (user can change it).
      setForm((prev) => {
        const current = prev.parentAsset;
        const stillValid = current && arr.some((p) => p.asset_id === current);
        if (stillValid) return prev;
        if (arr.length > 0) return { ...prev, parentAsset: arr[0].asset_id };
        return { ...prev, parentAsset: '' };
      });
    } catch (err) {
      console.error('❌ Error fetching parent assets:', err);
      console.error('❌ Error response:', err.response?.data);
      toast.error('Failed to fetch parent assets');
      setParentAssets([]);
      setForm((prev) => ({ ...prev, parentAsset: '' }));
    }
  };

  // Helper function to toggle dropdown
  const toggleDropdown = (name) => {
    setDropdownStates(prev => ({
      ...prev,
      [name]: !prev[name]
    }));
  };

  // Helper function to update search
  const updateSearch = (name, value) => {
    setSearchStates(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Helper function to handle option selection
  const handleOptionSelect = (name, value, label) => {
    setForm(prev => {
      const newForm = { ...prev, [name]: value };
      
      // Real-time validation for vendor requirement
      if (name === 'purchaseSupply' || name === 'serviceSupply') {
        if (newForm.purchaseSupply || newForm.serviceSupply) {
          setValidationErrors(prevErrors => ({
            ...prevErrors,
            vendorRequired: false
          }));
        }
      }
      
      return newForm;
    });
    setDropdownStates(prev => ({ ...prev, [name]: false }));
    updateSearch(name, '');
  };

  const fetchAssetTypes = async () => {
    try {
      console.log('Fetching asset types...');
      const res = await API.get('/dept-assets/asset-types');
      console.log('Asset types raw response:', res.data);
      setAssetTypes(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Error fetching asset types:', err);
      setAssetTypes([]);
    }
  };

  const fetchUsers = async () => {
    try {
      console.log('Fetching users from API...');
      const res = await API.get('/users/get-users');
      console.log('Users response:', res.data);

      // Handle the new API response format with success/data structure
      const usersData = res.data?.data || res.data || [];
      if (Array.isArray(usersData)) {
        // Transform API data to dropdown format
        const users = [
          { value: '', label: 'Select' },
          ...usersData.map(user => ({
            value: user.user_id,
            label: user.full_name
          }))
        ];
        setPurchaseByOptions(users);
      }
    } catch (err) {
      console.error('Error fetching users:', err);
      console.log('Using dummy users as fallback');
      // Keep using dummy data if API fails
      setPurchaseByOptions([]);
    }
  };

  const fetchProdServs = async () => {
    try {
      console.log('Fetching product/services from API...');
      const res = await API.get('/prodserv');
      console.log('Product/services response:', res.data);

      if (res.data && Array.isArray(res.data)) {
        // Extract unique brands
        const uniqueBrands = [...new Set(res.data.map(item => item.brand).filter(Boolean))];
        const brandOptions = [
          { value: '', label: 'Select' },
          ...uniqueBrands.map(brand => ({
            value: brand,
            label: brand
          }))
        ];
        setVendorBrandOptions(brandOptions);

        // Store all prodServ data for filtering
        setAllProdServData(res.data);
        
        // Initially show all models (will be filtered when brand is selected)
        const uniqueModels = [...new Set(res.data.map(item => item.model).filter(Boolean))];
        const modelOptions = [
          { value: '', label: 'Select' },
          ...uniqueModels.map(model => ({
            value: model,
            label: model
          }))
        ];
        setVendorModelOptions(modelOptions);
      }
    } catch (err) {
      console.error('Error fetching product/services:', err);
      console.log('Using dummy brands and models as fallback');
      // Keep using dummy data if API fails
      setVendorBrandOptions([]);
      setVendorModelOptions([]);
    }
  };

  const fetchVendors = async () => {
    try {
      console.log('Fetching vendors from API...');
      const res = await API.get('/get-vendors');
      console.log('Vendors response:', res.data);

      if (res.data && Array.isArray(res.data)) {
        // Transform API data to dropdown format - only show active vendors
        const vendors = [
          { value: '', label: 'Select' },
          ...res.data
            .filter(vendor => vendor.int_status === 1) // Only active vendors
            .map(vendor => ({
              value: vendor.vendor_id,
              label: vendor.vendor_name || vendor.company_name || `Vendor ${vendor.vendor_id}`
            }))
        ];
        setPurchaseSupplyOptions(vendors);
        setServiceSupplyOptions(vendors);
      }
    } catch (err) {
      console.error('Error fetching vendors:', err);
      console.log('Using dummy vendors as fallback');
      // Keep using dummy data if API fails
      setPurchaseSupplyOptions([]);
      setServiceSupplyOptions([]);
    }
  };

  const fetchDocumentTypes = async () => {
    try {
      console.log('Fetching document types for assets...');
      const res = await API.get('/doc-type-objects/object-type/asset');
      console.log('Document types response:', res.data);

      if (res.data && res.data.success && Array.isArray(res.data.data)) {
        // Transform API data to dropdown format
        const docTypes = res.data.data.map(docType => ({
          id: docType.dto_id,  // Use dto_id instead of doc_type
          text: docType.doc_type_text,
          doc_type: docType.doc_type  // Keep doc_type for reference
        }));
        setDocumentTypes(docTypes);
        console.log('Document types loaded:', docTypes);
      } else {
        console.log('No document types found, using fallback');
        setDocumentTypes([]);
      }
    } catch (err) {
      console.error('Error fetching document types:', err);
      toast.error('Failed to load document types');
      setDocumentTypes([]);
    }
  };

  // Function to filter models based on selected brand
  const filterModelsByBrand = (selectedBrand) => {
    if (!selectedBrand || !allProdServData.length) {
      // If no brand selected or no data, show all models
      const uniqueModels = [...new Set(allProdServData.map(item => item.model).filter(Boolean))];
      const modelOptions = [
        { value: '', label: 'Select' },
        ...uniqueModels.map(model => ({
          value: model,
          label: model
        }))
      ];
      setVendorModelOptions(modelOptions);
      return;
    }

    // Filter models for the selected brand
    const brandModels = allProdServData
      .filter(item => item.brand === selectedBrand)
      .map(item => item.model)
      .filter(Boolean);
    
    const uniqueModels = [...new Set(brandModels)];
    const modelOptions = [
      { value: '', label: 'Select' },
      ...uniqueModels.map(model => ({
        value: model,
        label: model
      }))
    ];
    
    console.log('🔍 Filtered models for brand:', selectedBrand, 'models:', uniqueModels);
    setVendorModelOptions(modelOptions);
  };

  // Function to fetch prod_serv_id based on brand and model
  const fetchProdServId = async (brand, model) => {
    if (!brand || !model) {
      setFetchedProdServId(null);
      return;
    }

    try {
      console.log('🔍 Fetching prod_serv_id for brand:', brand, 'model:', model);
      const res = await API.get('/find-by-brand-model', {
        params: {
          brand: brand,
          model: model
        }
      });
      
      console.log('📦 ProdServ response:', res.data);
      
      if (res.data && res.data.success && res.data.data) {
        const prodServId = res.data.data.prod_serv_id;
        setFetchedProdServId(prodServId);
        console.log('✅ Found prod_serv_id:', prodServId);
      } else {
        setFetchedProdServId(null);
        console.log('❌ No matching prod_serv_id found for brand:', brand, 'model:', model);
      }
    } catch (err) {
      console.error('❌ Error fetching prod_serv_id:', err);
      setFetchedProdServId(null);
      toast.error('Failed to fetch product service ID');
    }
  };

  const fetchDynamicProperties = async (assetTypeId) => {
    if (!assetTypeId) {
      setDynamicProperties([]);
      setAssetTypePropsMap({});
      return;
    }

    try {
      console.log(`Fetching properties for asset type: ${assetTypeId}`);
      const res = await API.get(`/properties/asset-types/${assetTypeId}/properties-with-values`);
      console.log('Properties response:', res.data);

      if (res.data && res.data.data) {
        setDynamicProperties(res.data.data);

        // Create mapping from prop_id to asset_type_prop_id
        const propsMap = {};
        res.data.data.forEach(property => {
          propsMap[property.prop_id] = property.asset_type_prop_id;
        });
        setAssetTypePropsMap(propsMap);
      } else {
        setDynamicProperties([]);
        setAssetTypePropsMap({});
      }
    } catch (err) {
      console.error('Error fetching dynamic properties:', err);
      setDynamicProperties([]);
      setAssetTypePropsMap({});
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    console.log('🔍 handleChange called:', { name, value });
    setForm((prev) => {
      const newForm = { ...prev, [name]: type === 'checkbox' ? checked : value };
      // If serviceSupply is changed, just update it
      if (name === 'serviceSupply') {
        newForm[name] = value;
      }
      console.log('🔍 Form updated:', newForm);
      
      // Real-time validation for date mismatch and expiry before purchase
      if ((name === 'expiryDate' || name === 'purchaseDate') && newForm.expiryDate && newForm.purchaseDate) {
        const expiryDateObj = new Date(newForm.expiryDate);
        const purchaseDateObj = new Date(newForm.purchaseDate);
        
        if (newForm.expiryDate === newForm.purchaseDate) {
          setValidationErrors(prev => ({
            ...prev,
            dateMismatch: true,
            expiryDateBeforePurchase: false,
            expiryDate: true,
            purchaseDate: true
          }));
        } else if (expiryDateObj < purchaseDateObj) {
          setValidationErrors(prev => ({
            ...prev,
            dateMismatch: false,
            expiryDateBeforePurchase: true,
            expiryDate: true,
            purchaseDate: false
          }));
        } else {
          setValidationErrors(prev => ({
            ...prev,
            dateMismatch: false,
            expiryDateBeforePurchase: false,
            expiryDate: prev.expiryDate && name !== 'expiryDate' ? prev.expiryDate : false,
            purchaseDate: prev.purchaseDate && name !== 'purchaseDate' ? prev.purchaseDate : false
          }));
        }
      }
      
      // Real-time validation for vendor requirement
      if (name === 'purchaseSupply' || name === 'serviceSupply') {
        if (newForm.purchaseSupply || newForm.serviceSupply) {
          setValidationErrors(prev => ({
            ...prev,
            vendorRequired: false
          }));
        }
      }
      
      return newForm;
    });
    setTouched((prev) => ({ ...prev, [name]: true }));
    
    // Clear validation error when user starts typing (for non-date fields)
    if (validationErrors[name] && name !== 'expiryDate' && name !== 'purchaseDate') {
      setValidationErrors(prev => ({
        ...prev,
        [name]: false
      }));
    }
  };

  // Attachments tab helpers - document types are now fetched from API

  const addAttachmentRow = () => {
    setAttachments(prev => ([...prev, { 
      id: generateUUID(), 
      type: '', 
      file: null, 
      docTypeName: '', 
      previewUrl: '',
      dropdownOpen: false,
      searchQuery: ''
    }]));
  };

  const updateAttachment = (id, patch) => {
    setAttachments(prev => prev.map(a => a.id === id ? { ...a, ...patch } : a));
  };

  const removeAttachment = (id) => {
    setAttachments(prev => prev.filter(a => a.id !== id));
  };

  const onSelectFile = (id, file) => {
    const previewUrl = file ? URL.createObjectURL(file) : '';
    updateAttachment(id, { file, previewUrl });
  };

  // Click outside handler for document type dropdowns
  useEffect(() => {
    function handleClickOutside(event) {
      setAttachments(prev => prev.map(att => 
        att.dropdownOpen && !event.target.closest(`#doc-type-${att.id}`) 
          ? { ...att, dropdownOpen: false }
          : att
      ));
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);


  const handlePropChange = (propName, value) => {
    setForm(prev => ({
      ...prev,
      properties: {
        ...prev.properties,
        [propName]: value
      }
    }));
    setTouched((prev) => ({ ...prev, [propName]: true }));
  };

  // Add new property value to the backend
  const addPropertyValue = async (propId, value) => {
    try {
      const response = await API.post('/properties/property-values', {
        propId,
        value
      });
      
      if (response.data.success) {
        // Refresh the dynamic properties to include the new value
        await fetchDynamicProperties(form.assetType);
        return response.data.data;
      }
    } catch (error) {
      console.error('Error adding property value:', error);
      toast.error('Failed to add property value');
      throw error;
    }
  };

  // Handle custom property value input
  const handleCustomPropValue = async (property, value) => {
    if (!value.trim()) return;
    
    try {
      // Add the new value to the backend
      const newValue = await addPropertyValue(property.prop_id, value);
      
      // Update the form with the new value
      setForm(prev => ({
        ...prev,
        properties: {
          ...prev.properties,
          [property.prop_id]: value
        }
      }));
      
      // Log property value addition
      await recordActionByNameWithFetch('Create', { 
        propertyName: property.property,
        value: value,
        propId: property.prop_id
      });
      
      toast.success(`Added "${value}" to ${property.property}`);
    } catch (error) {
      console.error('Error adding custom property value:', error);
    }
  };



  const generateSerialNumber = async () => {
    if (!form.assetType) {
      toast.error(t('assets.pleaseSelectAssetTypeFirst'));
      return;
    }

    try {
      setIsGeneratingSerial(true);
      
      // Use the preview endpoint to get the next serial number (no DB increment)
      const response = await API.get(`/serial-numbers/next/${form.assetType}`, {
        params: {
          orgId: useAuthStore.getState().user.org_id
        }
      });

      if (response.data.success) {
        const serialNumber = response.data.data.serialNumber;
        setForm(prev => ({ ...prev, serialNumber }));
        toast.success(t('assets.serialNumberPreview', { serialNumber }));
        console.log(`👀 Preview serial number: ${serialNumber} (Will be saved when asset is created)`);
        
        // Note: Serial number generation logging removed as requested
      } else {
        toast.error(response.data.message || t('assets.failedToGenerateSerialNumber'));
      }
    } catch (error) {
      console.error('Error generating serial number:', error);
      const errorMessage = error.response?.data?.message || t('assets.failedToGenerateSerialNumber');
      toast.error(errorMessage);
    } finally {
      setIsGeneratingSerial(false);
    }
  };

  const isFieldInvalid = (field) => {
    if (!submitAttempted) return false;
    if (field === 'parentAsset') {
      const selectedType = assetTypes.find(at => at.asset_type_id === form.assetType);
      const isChild = (selectedType?.is_child === true || selectedType?.is_child === 'true') && !!selectedType?.parent_asset_type_id;
      return isChild && !form.parentAsset;
    }
    return !form[field];
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('🚀 Starting unified asset submission...');
    setSubmitAttempted(true);
    
    // Comprehensive validation
    const errors = {};
    let hasErrors = false;
    
    // Required fields validation
    if (!form.assetType || form.assetType.trim() === '') {
      errors.assetType = true;
      hasErrors = true;
    }
    
    // Serial number is only required if not marked as "not required"
    if (!form.serialNumberNotRequired && (!form.serialNumber || form.serialNumber.trim() === '')) {
      errors.serialNumber = true;
      hasErrors = true;
    }
    
    if (!form.purchaseDate || form.purchaseDate.trim() === '') {
      errors.purchaseDate = true;
      hasErrors = true;
    }
    
    if (!form.purchaseCost || form.purchaseCost.trim() === '') {
      errors.purchaseCost = true;
      hasErrors = true;
    }
    
    if (!form.purchaseBy || form.purchaseBy.trim() === '') {
      errors.purchaseBy = true;
      hasErrors = true;
    }
    
    if (!form.expiryDate || form.expiryDate.trim() === '') {
      errors.expiryDate = true;
      hasErrors = true;
    }
    
    // Validate that expiry date and purchase date are not the same
    if (form.expiryDate && form.purchaseDate && form.expiryDate === form.purchaseDate) {
      errors.dateMismatch = true;
      errors.expiryDate = true;
      errors.purchaseDate = true;
      hasErrors = true;
    }
    
    // Validate that expiry date is not before purchase date
    if (form.expiryDate && form.purchaseDate && form.expiryDate !== form.purchaseDate) {
      const expiryDateObj = new Date(form.expiryDate);
      const purchaseDateObj = new Date(form.purchaseDate);
      if (expiryDateObj < purchaseDateObj) {
        errors.expiryDateBeforePurchase = true;
        errors.expiryDate = true;
        hasErrors = true;
      }
    }
    
    // Validate that at least one vendor (product or service) is selected
    if (!form.purchaseSupply && !form.serviceSupply) {
      errors.vendorRequired = true;
      hasErrors = true;
    }
    
    // Parent asset validation for child asset types
    const selectedType = assetTypes.find(at => at.asset_type_id === form.assetType);
    const isChild = (selectedType?.is_child === true || selectedType?.is_child === 'true') && !!selectedType?.parent_asset_type_id;
    if (isChild && (!form.parentAsset || form.parentAsset.trim() === '')) {
      errors.parentAsset = true;
      hasErrors = true;
    }
    
    // Set validation errors
    setValidationErrors(errors);
    
    if (hasErrors) {
      if (errors.dateMismatch) {
        toast.error(t('assets.expiryDateCannotBeSameAsPurchaseDate') || 'Expiry date cannot be the same as purchase date');
      } else if (errors.expiryDateBeforePurchase) {
        toast.error(t('assets.expiryDateCannotBeBeforePurchaseDate') || 'Expiry date cannot be before purchase date');
      } else if (errors.vendorRequired) {
        toast.error(t('assets.atLeastOneVendorRequired') || 'At least one vendor (Product or Service) is required');
      } else {
        toast.error(t('assets.pleaseFillAllRequiredFields'));
      }
      return;
    }

    if (isSubmitting) {
      console.log('⚠️ Already submitting, preventing duplicate request');
      return;
    }

    setIsSubmitting(true);
    console.log('📤 Submitting asset data...');
    try {
      // Get user info from auth store
      const user = useAuthStore.getState().user;

      // Get asset type text for the 'text' field
      const selectedAssetType = assetTypes.find(at => at.asset_type_id === form.assetType);
      const assetTypeText = selectedAssetType ? selectedAssetType.text : '';

      // Prepare the asset data according to backend requirements
      const assetData = {
        asset_type_id: form.assetType,
        asset_id: '', // Will be auto-generated by backend
        text: assetTypeText, // Asset type name like "Laptop", "Router", etc.
        serial_number: form.serialNumberNotRequired ? null : (form.serialNumber || null), // Send null if marked as not required or empty
        description: form.description,
        branch_id: getUserBranchId(user?.user_id), // Auto-populate user's branch
        purchase_vendor_id: form.purchaseSupply || null, // Use Purchase Vendor dropdown value
        service_vendor_id: form.serviceSupply || null, // Set from Service Vendor dropdown
        prod_serv_id: fetchedProdServId || null, // Use fetched prod_serv_id from brand/model selection
        maintsch_id: null, // Always set to null
        purchased_cost: form.purchaseCost,
        purchased_on: form.purchaseDate,
        purchased_by: form.purchaseBy || null,
        expiry_date: form.expiryDate || null,
        current_status: 'Active', // Default status
        warranty_period: form.warrantyPeriod || null,
        parent_asset_id: form.parentAsset || null, // Add parentAsset field
        org_id: user.org_id, // From user's auth store
        properties: form.properties || {},
        // Depreciation fields with user-entered values and calculated defaults
        salvage_value: parseFloat(form.salvageValue) || 0, // User enters this
        useful_life_years: parseInt(form.usefulLifeYears) || 5, // User enters this
        // depreciation_rate: calculated automatically in backend using Straight Line formula
        current_book_value: parseFloat(form.purchaseCost) || 0, // Same as purchase cost initially
        accumulated_depreciation: 0, // Default to 0
        last_depreciation_calc_date: null, // Default to null
        depreciation_start_date: form.purchaseDate || new Date(), // Automatically set to purchase date
        // Additional fields (frontend only unless backend supports them)
        cost_center: form.costCenter || null,
        location: form.location || null,
        insurance_policy_number: form.insurancePolicyNumber || null,
        insurer: form.insurer || null,
        insured_value: form.insuredValue ? parseFloat(form.insuredValue) : null,
        insurance_start_date: form.insuranceStartDate || null,
        insurance_end_date: form.insuranceEndDate || null,
        comprehensive_insurance: form.comprehensiveInsurance || null
      };

      // Debug: Log depreciation values being sent
      console.log('🔍 Depreciation Debug - Form values:');
      console.log('  salvageValue:', form.salvageValue);
      console.log('  usefulLifeYears:', form.usefulLifeYears);
      console.log('  purchaseCost:', form.purchaseCost);
      console.log('  purchaseDate:', form.purchaseDate);
      console.log('🔍 Depreciation Debug - Processed values:');
      console.log('  salvage_value:', assetData.salvage_value);
      console.log('  useful_life_years:', assetData.useful_life_years);
      console.log('  current_book_value:', assetData.current_book_value);
      console.log('  depreciation_start_date:', assetData.depreciation_start_date);

      console.log('📦 Submitting asset data:', assetData);
      console.log('🔍 Fetched prod_serv_id:', fetchedProdServId);
      console.log('🔍 Brand:', form.vendorBrand, 'Model:', form.vendorModel);
      const response = await API.post('/assets/add', assetData);
      console.log('✅ Asset created successfully:', response.data);
      
      // Store the created asset ID for document uploads
      const createdAssetId = response.data?.asset?.asset_id || response.data?.asset_id || response.data?.data?.asset_id;
      console.log('🔍 Created Asset ID:', createdAssetId);
      console.log('🔍 Response structure:', {
        'response.data': response.data,
        'response.data.asset': response.data?.asset,
        'response.data.asset.asset_id': response.data?.asset?.asset_id,
        'response.data.asset_id': response.data?.asset_id,
        'response.data.data': response.data?.data,
        'response.data.data.asset_id': response.data?.data?.asset_id
      });
      
      if (createdAssetId) {
        setForm(prev => ({ ...prev, assetId: createdAssetId }));
        console.log('✅ Asset ID stored in form state:', createdAssetId);
        
        // Log asset save action
        await recordActionByNameWithFetch('Save', { 
          assetId: createdAssetId,
          serialNumber: form.serialNumber,
          assetTypeId: form.assetType,
          action: 'Asset Saved Successfully'
        });
        
        // Add serial number to print queue
        try {
          console.log('🖨️ Adding serial number to print queue:', form.serialNumber);
          const printQueueResponse = await API.post('/asset-serial-print/', {
            serial_no: form.serialNumber,
            status: 'New',
            reason: null
          });
          console.log('✅ Serial number added to print queue:', printQueueResponse.data);
        } catch (printError) {
          console.error('❌ Error adding to print queue:', printError);
        }
        
        // Now handle attachments if any
        if (attachments.length > 0) {
          console.log('📎 Processing attachments...');
          let successCount = 0;
          let failCount = 0;

          // Validate all attachments
          for (const a of attachments) {
            if (!a.type || !a.file) {
              toast.error('Select document type and choose a file for all rows');
              return;
            }
            // Check if the selected document type requires a custom name (like OT - Others)
            const selectedDocType = documentTypes.find(dt => dt.id === a.type);
            if (selectedDocType && (selectedDocType.text.toLowerCase().includes('other') || selectedDocType.doc_type === 'OT') && !a.docTypeName?.trim()) {
              toast.error(`Enter custom name for ${selectedDocType.text} documents`);
              return;
            }
          }

          setIsUploading(true);
          try {
            for (const a of attachments) {
              try {
                const fd = new FormData();
                fd.append('file', a.file);
                fd.append('dto_id', a.type);  // Send dto_id instead of doc_type
                if (a.type && a.docTypeName?.trim()) {
                  fd.append('doc_type_name', a.docTypeName);
                }
                
                // Get org_id from auth store
                const user = useAuthStore.getState().user;
                if (user?.org_id) {
                  fd.append('org_id', user.org_id);
                }
                
                // Upload to the asset documents API
                await API.post(`/assets/${createdAssetId}/docs/upload`, fd, {
                  headers: { 'Content-Type': 'multipart/form-data' }
                });
                successCount++;
              } catch (uploadErr) {
                console.error(`❌ Failed to upload ${a.file.name}:`, uploadErr);
                failCount++;
              }
            }

            // Show upload results
            if (successCount > 0 && failCount === 0) {
              toast.success(`Asset and ${successCount} document(s) saved successfully!`);
            } else if (successCount > 0 && failCount > 0) {
              toast.success(`Asset saved and ${successCount} document(s) uploaded successfully. ${failCount} document(s) failed to upload.`);
            } else {
              toast.success('Asset saved successfully, but document uploads failed.');
            }
          } catch (err) {
            console.error('❌ Error uploading documents:', err);
            toast.success('Asset saved successfully, but document uploads failed.');
          } finally {
            setIsUploading(false);
          }
        } else {
          toast.success('Asset created successfully!');
        }
        
        // Navigate to assets list after successful save
        navigate('/assets');
      } else {
        console.error('No asset ID returned from server:', response.data);
        toast.error('Asset created but no ID returned. Please refresh and try again.');
      }
    } catch (err) {
      console.error('❌ Error creating asset:', err);
      const errorMessage = err.response?.data?.error || 'Failed to create asset';
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
      console.log('🏁 Unified asset submission completed');
    }
  };

  const toggleSection = (section) => {
    setCollapsedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  // Handle create brand/model navigation
  const handleCreateBrandModel = (type) => {
    // Store current form data in sessionStorage to preserve it
    const formData = {
      ...form,
      navigationSource: 'assets-add',
      createType: type // 'brand' or 'model'
    };
    sessionStorage.setItem('assetFormData', JSON.stringify(formData));
    
    // Navigate to product service screen
    navigate('/master-data/prod-serv');
  };

  // UI
  return (
    <div className="max-w-6xl mx-auto mt-8 bg-[#F5F8FA] rounded-xl shadow">
      {/* Header */}
      <div className="bg-[#0E2F4B] text-white py-4 px-8 rounded-t-xl border-b-4 border-[#FFC107] flex justify-center items-center">
        {/* <span className="text-2xl font-semibold text-center w-full">Add Asset</span> */}
      </div>
      {/* Tabs */}
      <div className="px-8 pt-6">
        <div className="flex border-b border-gray-200 mb-6 gap-6">
          {['Configuration', 'Attachments'].map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 -mb-px font-semibold text-base border-b-2 ${activeTab === tab ? 'border-[#0E2F4B] text-[#0E2F4B]' : 'border-transparent text-gray-500'}`}
            >
              {tab === 'Configuration' ? t('assets.configuration') : t('assets.attachments')}
            </button>
          ))}
        </div>
      </div>
      {activeTab === 'Configuration' && (
      <form onSubmit={handleSubmit} className="px-8 pt-8 pb-4">
        {/* Asset Details */}
        <div className="mb-6">
          <button type="button" onClick={() => toggleSection('asset')} className="flex items-center gap-2 text-lg font-semibold mb-2 focus:outline-none">
            <span>{t('assets.assetDetails')}</span>
            {collapsedSections.asset ? (
              <MdKeyboardArrowRight size={24} />
            ) : (
              <MdKeyboardArrowDown size={24} />
            )}
          </button>
          {!collapsedSections.asset && (
            <div className="grid grid-cols-4 gap-6 mb-4">
              {/* Asset Type Dropdown */}
              <div>
                <label className="block text-sm mb-1 font-medium">
                  {t('assets.assetType')} <span className="text-red-500">*</span>
                </label>
                <div className="relative w-full">
                  <button
                    type="button"
                    className={`border px-3 py-2 text-xs w-full bg-white rounded focus:outline-none flex justify-between items-center h-9 ${validationErrors.assetType ? 'border-red-500' : 'border-gray-300'}`}
                    onClick={() => setAssetTypeDropdownOpen((open) => !open)}
                  >
                    <span className="text-xs truncate">
                      {form.assetType
                        ? assetTypes.find((at) => at.asset_type_id === form.assetType)?.text || t('assets.select')
                        : t('assets.select')}
                    </span>
                    <MdKeyboardArrowDown className="ml-2 w-4 h-4 text-gray-500" />
                  </button>
                  {assetTypeDropdownOpen && (
                    <div
                      ref={assetTypeDropdownRef}
                      className="absolute left-0 right-0 mt-1 bg-white border rounded shadow-lg max-h-48 overflow-y-auto z-10"
                      style={{ minWidth: "100%" }}
                    >
                      <div className="sticky top-0 bg-white px-2 py-2 border-b z-20">
                      <input
                        type="text"
                        className="w-full border px-2 py-1 rounded text-xs"
                        placeholder={t('assets.searchByNameOrId')}
                        value={searchAssetType}
                          onChange={e => setSearchAssetType(e.target.value)}
                          autoFocus
                        />
                      </div>
                      {assetTypes
                        .filter(at => 
                          at.text.toLowerCase().includes(searchAssetType.toLowerCase()) ||
                          at.asset_type_id.toLowerCase().includes(searchAssetType.toLowerCase())
                        )
                        .map((at) => (
                          <div
                            key={at.asset_type_id}
                            className={`px-4 py-2 cursor-pointer hover:bg-gray-100 text-xs ${form.assetType === at.asset_type_id ? "bg-gray-200" : ""}`}
                            onClick={() => {
                              console.log('Selected asset type:', at);
                              console.log('Selected group_required:', at.group_required);
                              setForm((prev) => ({ ...prev, assetType: at.asset_type_id }));
                              setAssetTypeDropdownOpen(false);
                              setSearchAssetType("");
                              // Fetch dynamic properties for the selected asset type
                              fetchDynamicProperties(at.asset_type_id);
                            }}
                          >
                            <div className="flex justify-between items-center">
                              <span>{at.text}</span>
                              <span className="text-gray-500">
                              {at.asset_type_id} 
                              {at.is_child ? ` (${t('assets.child')})` : ` (${t('assets.parent')})`}
                              </span>
                            </div>
                          </div>
                        ))}
                        <div 
                          className="sticky bottom-0 bg-white border-t px-4 py-2 cursor-pointer text-blue-600 font-semibold hover:bg-blue-50 text-xs"
                          onClick={() => {
                            setAssetTypeDropdownOpen(false);
                            navigate("/master-data/asset-types");
                          }}
                        >
                          + Create New Asset Type
                        </div>
                    </div>
                  )}
                </div>
                {validationErrors.assetType && (
                  <p className="mt-1 text-sm text-red-600">{t('assets.assetTypeIsRequired')}</p>
                )}
              </div>

              {/* Show message if asset type can have children */}
              {form.assetType && (() => {
                const selectedType = assetTypes.find(at => at.asset_type_id === form.assetType);
                const isChild = (selectedType?.is_child === true || selectedType?.is_child === 'true') && !!selectedType?.parent_asset_type_id;
                return isChild;
              })() && (
                <div className="col-span-4">
                  <div className="bg-blue-50 border border-blue-200 rounded p-3">
                    <p className="text-sm text-blue-800">
                      Please select a parent asset for this child asset type.
                    </p>
                  </div>
                </div>
              )}

              {/* Parent Asset Dropdown - Show only when child asset type is selected */}
              {form.assetType && (() => {
                const selectedType = assetTypes.find(at => at.asset_type_id === form.assetType);
                const isChild = (selectedType?.is_child === true || selectedType?.is_child === 'true') && !!selectedType?.parent_asset_type_id;
                console.log('🎭 UI Render - Asset Type:', form.assetType);
                console.log('🎭 UI Render - Selected Type:', selectedType);
                console.log('🎭 UI Render - Is Child:', isChild);
                console.log('🎭 UI Render - Parent Assets Count:', parentAssets.length);
                console.log('🎭 UI Render - Parent Assets Data:', parentAssets);
                return isChild;
              })() && (
                <div>
                  <label className="block text-sm font-medium mb-1">
                    {t('assets.parentAsset')} <span className="text-red-500">*</span>
                  </label>
                  <div className="relative w-full">
                    <button
                      type="button"
                      className={`border px-3 py-2 text-xs w-full bg-white rounded focus:outline-none flex justify-between items-center h-9 ${validationErrors.parentAsset ? 'border-red-500' : 'border-gray-300'}`}
                      onClick={() => {
                        console.log('🖱️ Parent Asset Dropdown Clicked');
                        console.log('🖱️ Current dropdown state:', parentAssetDropdownOpen);
                        setParentAssetDropdownOpen((open) => {
                          const newState = !open;
                          console.log('🖱️ New dropdown state:', newState);
                          return newState;
                        });
                      }}
                    >
                      <span className="text-xs truncate">
                        {form.parentAsset
                          ? (() => {
                              const parent = parentAssets.find((pa) => pa.asset_id === form.parentAsset);
                              if (parent) {
                                return `${parent.asset_name} (${parent.asset_type_name}) - ${parent.serial_number || 'No SN'}`;
                              }
                              return t('assets.selectParentAsset');
                            })()
                          : t('assets.selectParentAsset')}
                      </span>
                      <MdKeyboardArrowDown className="ml-2 w-4 h-4 text-gray-500" />
                    </button>
                    {parentAssetDropdownOpen && (
                      <div
                        ref={parentAssetDropdownRef}
                        className="absolute left-0 right-0 mt-1 bg-white border rounded shadow-lg max-h-48 overflow-y-auto z-10"
                        style={{ minWidth: "100%" }}
                      >
                        {console.log('🎭 Rendering dropdown content - parentAssetDropdownOpen:', parentAssetDropdownOpen)}
                        {console.log('🎭 Rendering dropdown content - parentAssets:', parentAssets)}
                        <div className="sticky top-0 bg-white px-2 py-2 border-b z-20">
                          <input
                            type="text"
                            className="w-full border px-2 py-1 rounded text-xs"
                            placeholder="Search parent asset..."
                            value={searchParentAsset}
                            onChange={e => setSearchParentAsset(e.target.value)}
                            autoFocus
                          />
                        </div>
                        {parentAssets
                          .filter(pa => 
                            pa.asset_name?.toLowerCase().includes(searchParentAsset.toLowerCase()) ||
                            pa.serial_number?.toLowerCase().includes(searchParentAsset.toLowerCase()) ||
                            pa.asset_type_name?.toLowerCase().includes(searchParentAsset.toLowerCase())
                          )
                          .map((pa) => (
                            <div
                              key={pa.asset_id}
                              className={`px-4 py-2 cursor-pointer hover:bg-gray-100 text-xs ${form.parentAsset === pa.asset_id ? "bg-gray-200" : ""}`}
                              onClick={() => {
                                setForm((prev) => ({ ...prev, parentAsset: pa.asset_id }));
                                setParentAssetDropdownOpen(false);
                                setSearchParentAsset("");
                              }}
                            >
                              <div className="flex flex-col">
                                <span className="font-medium">{pa.asset_name}</span>
                                <span className="text-gray-500 text-xs">
                                  {pa.asset_type_name} - {pa.serial_number || 'No SN'}
                                </span>
                              </div>
                            </div>
                          ))}
                        {parentAssets.length === 0 && (
                          <div className="px-4 py-2 text-xs text-gray-500">
                            No parent assets available
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  {validationErrors.parentAsset && (
                    <p className="mt-1 text-sm text-red-600">{t('assets.parentAssetIsRequired')}</p>
                  )}
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium">
                    {t('assets.serialNumber')} 
                    {!form.serialNumberNotRequired && <span className="text-red-500">*</span>}
                  </label>
                  <label className="flex items-center text-sm text-gray-600 cursor-pointer">
                    <input
                      type="checkbox"
                      name="serialNumberNotRequired"
                      checked={form.serialNumberNotRequired}
                      onChange={(e) => {
                        setForm(prev => ({ 
                          ...prev, 
                          serialNumberNotRequired: e.target.checked,
                          serialNumber: e.target.checked ? '' : prev.serialNumber // Clear serial number if marked as not required
                        }));
                        // Clear validation error when checkbox is checked
                        if (e.target.checked) {
                          setValidationErrors(prev => ({ ...prev, serialNumber: false }));
                        }
                      }}
                      className="mr-2 h-4 w-4 text-[#0E2F4B] focus:ring-[#0E2F4B] border-gray-300 rounded"
                    />
                    <span>Not Required</span>
                  </label>
                </div>
                <div className="flex items-center">
                  <input 
                    name="serialNumber" 
                    placeholder={form.serialNumberNotRequired ? "Optional - Leave blank if not required" : ""} 
                    onChange={handleChange} 
                    value={form.serialNumber} 
                    disabled={form.serialNumberNotRequired}
                    className={`w-full px-3 py-2 rounded bg-white text-sm h-9 border ${validationErrors.serialNumber ? 'border-red-500' : 'border-gray-300'} ${form.serialNumberNotRequired ? 'bg-gray-100 cursor-not-allowed' : ''}`} 
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setIsGeneratingSerial(true);
                      generateSerialNumber();
                    }}
                    className="ml-2 px-3 bg-[#0E2F4B] text-white rounded text-sm h-9 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={isGeneratingSerial || !form.assetType || form.serialNumberNotRequired}
                  >
                    {isGeneratingSerial ? t('common.loading') : t('assets.generate')}
                  </button>
                </div>
                {validationErrors.serialNumber && (
                  <p className="mt-1 text-sm text-red-600">{t('assets.serialNumberIsRequired')}</p>
                )}
              </div>
              <div className="col-span-4">
                <label className="block text-sm mb-1 font-medium">{t('assets.assetName')}</label>
                <textarea 
                  name="description" 
                  placeholder="" 
                  onChange={handleChange} 
                  value={form.description} 
                  className="w-full px-3 py-2 border border-gray-300 rounded bg-white text-sm" 
                  rows={3}
                ></textarea>
              </div>
              {/* Location */}
              <div>
                <label className="block text-sm mb-1 font-medium">Location</label>
                <input name="location" type="text" onChange={handleChange} value={form.location} className="w-full px-3 py-2 border border-gray-300 rounded bg-white text-sm h-9" />
              </div>
            </div>
          )}
        </div>
        {/* Purchase Details Section */}
        <div className="mb-6">
          <button type="button" onClick={() => toggleSection('purchase')} className="flex items-center gap-2 text-lg font-semibold mb-2 focus:outline-none">
            <span>{t('assets.purchaseDetails')}</span>
            {collapsedSections.purchase ? (
              <MdKeyboardArrowRight size={24} />
            ) : (
              <MdKeyboardArrowDown size={24} />
            )}
          </button>
          {!collapsedSections.purchase && (
            <>
              <div className="grid grid-cols-4 gap-6 mb-4">
                <div>
                  <label className="block text-sm mb-1 font-medium">{t('assets.expiryDate')} <span className="text-red-500">*</span></label>
                  <input 
                    name="expiryDate" 
                    type="date" 
                    onChange={handleChange} 
                    value={form.expiryDate} 
                    className={`w-full px-3 py-2 border rounded bg-white text-sm h-9 ${validationErrors.expiryDate ? 'border-red-500' : 'border-gray-300'}`} 
                  />
                  {validationErrors.expiryDate && (
                    <p className="mt-1 text-sm text-red-600">
                      {validationErrors.dateMismatch 
                        ? (t('assets.expiryDateCannotBeSameAsPurchaseDate') || 'Expiry date cannot be the same as purchase date')
                        : validationErrors.expiryDateBeforePurchase
                        ? (t('assets.expiryDateCannotBeBeforePurchaseDate') || 'Expiry date cannot be before purchase date')
                        : (t('assets.expiryDateIsRequired') || 'Expiry date is required')}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm mb-1 font-medium">{t('assets.warrantyPeriod')}</label>
                  <input 
                    name="warrantyPeriod" 
                    type="text" 
                    placeholder="e.g., 2 years" 
                    onChange={handleChange} 
                    value={form.warrantyPeriod} 
                    className="w-full px-3 py-2 border border-gray-300 rounded bg-white text-sm h-9" 
                  />
                </div>
                <div>
                  <label className="block text-sm mb-1 font-medium">{t('assets.purchaseDate')} <span className="text-red-500">*</span></label>
                  <input 
                    name="purchaseDate" 
                    type="date" 
                    onChange={handleChange} 
                    value={form.purchaseDate} 
                    className={`w-full px-3 py-2 border rounded bg-white text-sm h-9 ${validationErrors.purchaseDate ? 'border-red-500' : 'border-gray-300'}`} 
                  />
                  {validationErrors.purchaseDate && (
                    <p className="mt-1 text-sm text-red-600">
                      {validationErrors.dateMismatch 
                        ? (t('assets.purchaseDateCannotBeSameAsExpiryDate') || 'Purchase date cannot be the same as expiry date')
                        : (t('assets.purchaseDateIsRequired') || 'Purchase date is required')}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm mb-1 font-medium">{t('assets.purchaseCost')} <span className="text-red-500">*</span></label>
                  <input 
                    name="purchaseCost" 
                    type="number" 
                    step="0.01" 
                    placeholder="0.00" 
                    onChange={handleChange} 
                    value={form.purchaseCost} 
                    className={`w-full px-3 py-2 border rounded bg-white text-sm h-9 ${validationErrors.purchaseCost ? 'border-red-500' : 'border-gray-300'}`} 
                  />
                  {validationErrors.purchaseCost && (
                    <p className="mt-1 text-sm text-red-600">{t('assets.purchaseCostIsRequired')}</p>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-4 gap-6 mb-4">
                <div>
                  <label className="block text-sm mb-1 font-medium">{t('assets.purchaseBy')} <span className="text-red-500">*</span></label>
                  <div className="relative w-full">
                    <button
                      type="button"
                      className={`border text-black px-3 py-2 text-xs w-full bg-white rounded focus:outline-none flex justify-between items-center h-9 ${validationErrors.purchaseBy ? 'border-red-500' : 'border-gray-300'}`}
                      onClick={() => toggleDropdown('purchaseBy')}
                    >
                      <span className="text-xs truncate">
                        {form.purchaseBy
                          ? purchaseByOptions.find(opt => opt.value === form.purchaseBy)?.label || "Select"
                          : "Select"}
                      </span>
                      <MdKeyboardArrowDown className="ml-2 w-4 h-4 text-gray-500" />
                    </button>
                    {dropdownStates.purchaseBy && (
                      <div
                        ref={dropdownRefs.purchaseBy}
                        className="absolute left-0 right-0 mt-1 bg-white border rounded shadow-lg max-h-48 overflow-y-auto z-10"
                        style={{ minWidth: "100%" }}
                      >
                        <div className="sticky top-0 bg-white px-2 py-2 border-b z-20">
                          <input
                            type="text"
                            className="w-full border px-2 py-1 rounded text-xs"
                            placeholder="Search by name or ID..."
                            value={searchStates.purchaseBy}
                            onChange={e => updateSearch('purchaseBy', e.target.value)}
                            autoFocus
                          />
                        </div>
                        {purchaseByOptions
                          .filter(opt => opt.value && (
                            opt.label.toLowerCase().includes(searchStates.purchaseBy.toLowerCase()) ||
                            opt.value.toLowerCase().includes(searchStates.purchaseBy.toLowerCase())
                          ))
                          .map(opt => (
                            <div
                              key={opt.value}
                              className={`px-4 py-2 cursor-pointer hover:bg-gray-100 text-xs ${form.purchaseBy === opt.value ? "bg-gray-200" : ""}`}
                              onClick={() => handleOptionSelect('purchaseBy', opt.value, opt.label)}
                            >
                              <div className="flex justify-between items-center">
                                <span>{opt.label}</span>
                                <span className="text-gray-500">{opt.value}</span>
                              </div>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                  {validationErrors.purchaseBy && (
                    <p className="mt-1 text-sm text-red-600">{t('assets.purchaseByIsRequired')}</p>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Vendor Details */}
        <div className="mb-6">
          <button type="button" onClick={() => toggleSection('vendor')} className="flex items-center gap-2 text-lg font-semibold mb-2 focus:outline-none">
            <span>{t('assets.vendorDetails')}</span>
            {collapsedSections.vendor ? (
              <MdKeyboardArrowRight size={24} />
            ) : (
              <MdKeyboardArrowDown size={24} />
            )}
          </button>
          {!collapsedSections.vendor && (
            <div className="grid grid-cols-5 gap-6 mb-4">
                {/* Product Vendor Dropdown */}
                <div>
                <label className="block text-sm mb-1 font-medium">{t('assets.productVendor')} <span className="text-red-500">*</span></label>
                <div className="relative w-full">
                  <button
                    type="button"
                    className={`border text-black px-3 py-2 text-xs w-full bg-white rounded focus:outline-none flex justify-between items-center h-9 ${validationErrors.vendorRequired ? 'border-red-500' : ''}`}
                    onClick={() => toggleDropdown('purchaseSupply')}
                  >
                    <span className="text-xs truncate">
                      {form.purchaseSupply
                        ? purchaseSupplyOptions.find(opt => opt.value === form.purchaseSupply)?.label || "Select"
                        : "Select"}
                    </span>
                    <MdKeyboardArrowDown className="ml-2 w-4 h-4 text-gray-500" />
                  </button>
                  {dropdownStates.purchaseSupply && (
                    <div
                      ref={dropdownRefs.purchaseSupply}
                      className="absolute left-0 right-0 mt-1 bg-white border rounded shadow-lg max-h-48 overflow-y-auto z-10"
                      style={{ minWidth: "100%" }}
                    >
                      <div className="sticky top-0 bg-white px-2 py-2 border-b z-20">
                        <input
                          type="text"
                          className="w-full border px-2 py-1 rounded text-xs"
                          placeholder="Search..."
                          value={searchStates.purchaseSupply}
                          onChange={e => updateSearch('purchaseSupply', e.target.value)}
                          autoFocus
                        />
                      </div>
                      {purchaseSupplyOptions
                        .filter(opt => opt.value && opt.label.toLowerCase().includes(searchStates.purchaseSupply.toLowerCase()))
                        .map(opt => (
                          <div
                            key={opt.value}
                            className={`px-4 py-2 cursor-pointer hover:bg-gray-100 text-xs ${form.purchaseSupply === opt.value ? "bg-gray-200" : ""}`}
                            onClick={() => handleOptionSelect('purchaseSupply', opt.value, opt.label)}
                          >
                            {opt.label}
                          </div>
                        ))}
                        <div 
                          className="sticky bottom-0 bg-white border-t px-4 py-2 cursor-pointer text-blue-600 font-semibold hover:bg-blue-50 text-xs"
                          onClick={() => {
                            setDropdownStates(prev => ({ ...prev, purchaseSupply: false }));
                            navigate("/master-data/vendors");
                          }}
                        >
                          + Create New
                        </div>
                    </div>
                  )}
                </div>
                {validationErrors.vendorRequired && !form.purchaseSupply && (
                  <p className="mt-1 text-sm text-red-600">
                    {t('assets.atLeastOneVendorRequired') || 'At least one vendor (Product or Service) is required'}
                  </p>
                )}
              </div>

              {/* Service Vendor Dropdown */}
              <div>
                <label className="block text-sm mb-1 font-medium">{t('assets.serviceVendor')} <span className="text-red-500">*</span></label>
                <div className="relative w-full">
                  <button
                    type="button"
                    className={`border text-black px-3 py-2 text-xs w-full bg-white rounded focus:outline-none flex justify-between items-center h-9 ${validationErrors.vendorRequired ? 'border-red-500' : ''}`}
                    onClick={() => toggleDropdown('serviceSupply')}
                  >
                    <span className="text-xs truncate">
                      {form.serviceSupply
                        ? serviceSupplyOptions.find(opt => opt.value === form.serviceSupply)?.label || "Select"
                        : "Select"}
                    </span>
                    <MdKeyboardArrowDown className="ml-2 w-4 h-4 text-gray-500" />
                  </button>
                  {dropdownStates.serviceSupply && (
                    <div
                      ref={dropdownRefs.serviceSupply}
                      className="absolute left-0 right-0 mt-1 bg-white border rounded shadow-lg max-h-48 overflow-y-auto z-10"
                      style={{ minWidth: "100%" }}
                    >
                      <div className="sticky top-0 bg-white px-2 py-2 border-b z-20">
                        <input
                          type="text"
                          className="w-full border px-2 py-1 rounded text-xs"
                          placeholder="Search..."
                          value={searchStates.serviceSupply}
                          onChange={e => updateSearch('serviceSupply', e.target.value)}
                          autoFocus
                        />
                      </div>
                      {serviceSupplyOptions
                        .filter(opt => opt.value && opt.label.toLowerCase().includes(searchStates.serviceSupply.toLowerCase()))
                        .map(opt => (
                          <div
                            key={opt.value}
                            className={`px-4 py-2 cursor-pointer hover:bg-gray-100 text-xs ${form.serviceSupply === opt.value ? "bg-gray-200" : ""}`}
                            onClick={() => handleOptionSelect('serviceSupply', opt.value, opt.label)}
                          >
                            {opt.label}
                          </div>
                        ))}
                        <div 
                          className="sticky bottom-0 bg-white border-t px-4 py-2 cursor-pointer text-blue-600 font-semibold hover:bg-blue-50 text-xs"
                          onClick={() => {
                            setDropdownStates(prev => ({ ...prev, serviceSupply: false }));
                            navigate("/master-data/vendors");
                          }}
                        >
                          + Create New Vendor
                        </div>
                    </div>
                  )}
                </div>
                {validationErrors.vendorRequired && !form.serviceSupply && (
                  <p className="mt-1 text-sm text-red-600">
                    {t('assets.atLeastOneVendorRequired') || 'At least one vendor (Product or Service) is required'}
                  </p>
                )}
              </div>


              {/* Brand Dropdown */}
              <div>
                <label className="block text-sm mb-1 font-medium">{t('assets.brand')}</label>
                <div className="relative w-full">
                  <button
                    type="button"
                    className="border text-black px-3 py-2 text-xs w-full bg-white rounded focus:outline-none flex justify-between items-center h-9"
                    onClick={() => toggleDropdown('vendorBrand')}
                  >
                    <span className="text-xs truncate">
                      {form.vendorBrand
                        ? vendorBrandOptions.find(opt => opt.value === form.vendorBrand)?.label || "Select"
                        : "Select"}
                    </span>
                    <MdKeyboardArrowDown className="ml-2 w-4 h-4 text-gray-500" />
                  </button>
                  {dropdownStates.vendorBrand && (
                    <div
                      ref={dropdownRefs.vendorBrand}
                      className="absolute left-0 right-0 mt-1 bg-white border rounded shadow-lg max-h-48 overflow-y-auto z-10"
                      style={{ minWidth: "100%" }}
                    >
                      <div className="sticky top-0 bg-white px-2 py-2 border-b z-20">
                        <input
                          type="text"
                          className="w-full border px-2 py-1 rounded text-xs"
                          placeholder="Search..."
                          value={searchStates.vendorBrand}
                          onChange={e => updateSearch('vendorBrand', e.target.value)}
                          autoFocus
                        />
                      </div>
                      {vendorBrandOptions
                        .filter(opt => opt.value && opt.label.toLowerCase().includes(searchStates.vendorBrand.toLowerCase()))
                        .map(opt => (
                          <div
                            key={opt.value}
                            className={`px-4 py-2 cursor-pointer hover:bg-gray-100 text-xs ${form.vendorBrand === opt.value ? "bg-gray-200" : ""}`}
                            onClick={() => {
                              handleOptionSelect('vendorBrand', opt.value, opt.label);
                              // Clear model selection when brand changes
                              setForm(prev => ({ ...prev, vendorModel: '' }));
                            }}
                          >
                            {opt.label}
                          </div>
                        ))}
                      <div 
                        className="sticky bottom-0 bg-white border-t px-4 py-2 cursor-pointer text-blue-600 font-semibold hover:bg-blue-50 text-xs"
                        onClick={() => handleCreateBrandModel('brand')}
                      >
                        + Create New Brand
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Model Dropdown */}
              <div>
                <label className="block text-sm mb-1 font-medium">{t('assets.model')}</label>
                <div className="relative w-full">
                  <button
                    type="button"
                    className="border text-black px-3 py-2 text-xs w-full bg-white rounded focus:outline-none flex justify-between items-center h-9"
                    onClick={() => toggleDropdown('vendorModel')}
                  >
                    <span className="text-xs truncate">
                      {form.vendorModel
                        ? vendorModelOptions.find(opt => opt.value === form.vendorModel)?.label || "Select"
                        : "Select"}
                    </span>
                    <MdKeyboardArrowDown className="ml-2 w-4 h-4 text-gray-500" />
                  </button>
                  {dropdownStates.vendorModel && (
                    <div
                      ref={dropdownRefs.vendorModel}
                      className="absolute left-0 right-0 mt-1 bg-white border rounded shadow-lg max-h-48 overflow-y-auto z-10"
                      style={{ minWidth: "100%" }}
                    >
                      <div className="sticky top-0 bg-white px-2 py-2 border-b z-20">
                        <input
                          type="text"
                          className="w-full border px-2 py-1 rounded text-xs"
                          placeholder="Search..."
                          value={searchStates.vendorModel}
                          onChange={e => updateSearch('vendorModel', e.target.value)}
                          autoFocus
                        />
                      </div>
                      {vendorModelOptions
                        .filter(opt => opt.value && opt.label.toLowerCase().includes(searchStates.vendorModel.toLowerCase()))
                        .map(opt => (
                          <div
                            key={opt.value}
                            className={`px-4 py-2 cursor-pointer hover:bg-gray-100 text-xs ${form.vendorModel === opt.value ? "bg-gray-200" : ""}`}
                            onClick={() => handleOptionSelect('vendorModel', opt.value, opt.label)}
                          >
                            {opt.label}
                          </div>
                        ))}
                      <div 
                        className="sticky bottom-0 bg-white border-t px-4 py-2 cursor-pointer text-blue-600 font-semibold hover:bg-blue-50 text-xs"
                        onClick={() => handleCreateBrandModel('model')}
                      >
                        + Create New Model
                      </div>
                    </div>
                  )}
                </div>
              </div>

            
            </div>
          )}
        </div>

        {/* Accounting Details Section */}
        <div className="mb-6">
          <button type="button" onClick={() => toggleSection('accounting')} className="flex items-center gap-2 text-lg font-semibold mb-2 focus:outline-none">
            <span>{t('assets.accountingDetails')}</span>
            {collapsedSections.accounting ? (
              <MdKeyboardArrowRight size={24} />
            ) : (
              <MdKeyboardArrowDown size={24} />
            )}
          </button>
          {!collapsedSections.accounting && (
            <div className="grid grid-cols-4 gap-6 mb-4">
              <div>
                <label className="block text-sm mb-1 font-medium">Cost Center</label>
                <input 
                  name="costCenter" 
                  type="text" 
                  onChange={handleChange} 
                  value={form.costCenter || ''} 
                  className="w-full px-3 py-2 border border-gray-300 rounded bg-white text-sm h-9" 
                />
              </div>
              <div>
                <label className="block text-sm mb-1 font-medium">{t('assets.salvageValue')}</label>
                <input 
                  name="salvageValue" 
                  type="number" 
                  step="0.01" 
                  placeholder="0.00" 
                  onChange={handleChange} 
                  value={form.salvageValue || ''} 
                  className="w-full px-3 py-2 border border-gray-300 rounded bg-white text-sm h-9" 
                />
              </div>
              <div>
                <label className="block text-sm mb-1 font-medium">{t('assets.usefulLifeYears')}</label>
                <input 
                  name="usefulLifeYears" 
                  type="number" 
                  min="1" 
                  placeholder="5" 
                  onChange={handleChange} 
                  value={form.usefulLifeYears || '5'} 
                  className="w-full px-3 py-2 border border-gray-300 rounded bg-white text-sm h-9" 
                />
              </div>
            </div>
          )}
        </div>

        {/* Insurance Details Section */}
        <div className="mb-6">
          <button type="button" onClick={() => toggleSection('insurance')} className="flex items-center gap-2 text-lg font-semibold mb-2 focus:outline-none">
            <span>Insurance Details</span>
            {collapsedSections.insurance ? (
              <MdKeyboardArrowRight size={24} />
            ) : (
              <MdKeyboardArrowDown size={24} />
            )}
          </button>
          {!collapsedSections.insurance && (
            <div className="grid grid-cols-4 gap-6 mb-4">
              <div>
                <label className="block text-sm mb-1 font-medium">Policy Number</label>
                <input name="insurancePolicyNumber" type="text" onChange={handleChange} value={form.insurancePolicyNumber} className="w-full px-3 py-2 border border-gray-300 rounded bg-white text-sm h-9" />
              </div>
              <div>
                <label className="block text-sm mb-1 font-medium">Insurer</label>
                <input name="insurer" type="text" onChange={handleChange} value={form.insurer} className="w-full px-3 py-2 border border-gray-300 rounded bg-white text-sm h-9" />
              </div>
              <div>
                <label className="block text-sm mb-1 font-medium">Insured Value</label>
                <input name="insuredValue" type="number" step="0.01" onChange={handleChange} value={form.insuredValue} className="w-full px-3 py-2 border border-gray-300 rounded bg-white text-sm h-9" />
              </div>
              <div>
                <label className="block text-sm mb-1 font-medium">Insurance Start Date</label>
                <input name="insuranceStartDate" type="date" onChange={handleChange} value={form.insuranceStartDate} className="w-full px-3 py-2 border border-gray-300 rounded bg-white text-sm h-9" />
              </div>
              <div>
                <label className="block text-sm mb-1 font-medium">Insurance End Date</label>
                <input name="insuranceEndDate" type="date" onChange={handleChange} value={form.insuranceEndDate} className="w-full px-3 py-2 border border-gray-300 rounded bg-white text-sm h-9" />
              </div>
              <div>
                <label className="block text-sm mb-1 font-medium">Comprehensive Insurance</label>
                <input name="comprehensiveInsurance" type="text" autoComplete="off" onChange={handleChange} value={form.comprehensiveInsurance} className="w-full px-3 py-2 border border-gray-300 rounded bg-white text-sm h-9" />
              </div>
            </div>
          )}
        </div>

        {/* Asset Properties */}
        {form.assetType && (
          <div className="mb-6">
            <div className="border-b flex gap-8 mb-4">
              <button type="button" className="text-base font-semibold border-b-2 border-[#0E2F4B] text-[#0E2F4B] px-4 py-2 bg-transparent">
                Asset Properties
              </button>
            </div>
            {dynamicProperties.length > 0 ? (
              <div className="grid grid-cols-3 gap-6">
                {dynamicProperties.map((property) => {
                  const hasValues = property.values && property.values.length > 0;
                  const hasValidValues = hasValues && property.values.some(v => v.value && v.value.trim() !== '');
                  
                  return (
                    <div key={property.prop_id}>
                      <label className="block text-sm mb-1 font-medium">{property.property}</label>
                      {hasValidValues ? (
                        // Show dropdown if there are valid values
                        <select
                          name={`property_${property.prop_id}`}
                          value={form.properties[property.prop_id] || ''}
                          onChange={(e) => handlePropChange(property.prop_id, e.target.value)}
                          className="w-full px-2 py-1 border border-gray-300 rounded bg-white text-sm h-9 scrollable-dropdown"
                        >
                          <option value="">Select {property.property}</option>
                          {property.values.map((value) => (
                            <option key={value.aplv_id} value={value.value}>
                              {value.value}
                            </option>
                          ))}
                        </select>
                      ) : (
                        // Show input field if no valid values exist
                        <div className="space-y-2">
                          <input
                            type="text"
                            name={`property_${property.prop_id}`}
                            value={form.properties[property.prop_id] || ''}
                            onChange={(e) => handlePropChange(property.prop_id, e.target.value)}
                            placeholder={`Enter ${property.property}`}
                            className="w-full px-2 py-1 border border-gray-300 rounded bg-white text-sm h-9"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const value = form.properties[property.prop_id];
                              if (value && value.trim()) {
                                handleCustomPropValue(property, value.trim());
                              }
                            }}
                            className="text-xs text-blue-600 hover:text-blue-800 underline"
                            disabled={!form.properties[property.prop_id] || !form.properties[property.prop_id].trim()}
                          >
                            Add to dropdown options
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-gray-500 text-sm py-4">
                No specific properties configured for this asset type. You can add properties in the database.
              </div>
            )}
          </div>
        )}
      </form>
      )}
      {activeTab === 'Attachments' && (
        <div className="px-8 pt-8 pb-4">
          {/* Header row: Add File button */}
          <div className="mb-4 flex items-end gap-3">
            <div></div>
          </div>
          <div className="mb-4 flex items-center justify-between">
            <div className="text-lg font-semibold">{t('assets.attachments')}</div>
            <button 
              type="button" 
              onClick={addAttachmentRow} 
              className="h-[38px] px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 inline-flex items-center"
            >
              <svg className="w-4 h-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              {t('assets.addFile')}
            </button>
          </div>
          <div className="text-sm text-gray-600 mb-3">
            {t('assets.documentTypesLoaded')}
            {form.assetId && (
              <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium">
                Asset ID: {form.assetId}
              </span>
            )}
          </div>
          {attachments.length === 0 ? (
            <div className="text-sm text-gray-500">No files added.</div>
          ) : (
            <div className="space-y-3">
              {attachments.map(att => (
                <div key={att.id} className="bg-white border border-gray-200 rounded p-3 space-y-3">
                  {/* First row: Document Type and Custom Name */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium mb-1">{t('assets.documentType')}</label>
                      <SearchableDropdown
                        options={documentTypes}
                        value={att.type}
                        onChange={(value) => updateAttachment(att.id, { type: value })}
                        placeholder={t('assets.selectType')}
                        searchPlaceholder="Search types..."
                        className="w-full"
                        displayKey="text"
                        valueKey="id"
                      />
                    </div>
                    {(() => {
                      const selectedDocType = documentTypes.find(dt => dt.id === att.type);
                      const needsCustomName = selectedDocType && (selectedDocType.text.toLowerCase().includes('other') || selectedDocType.doc_type === 'OT');
                      return needsCustomName && (
                        <div>
                          <label className="block text-xs font-medium mb-1">Custom Name</label>
                          <input
                            type="text"
                            className="w-full border rounded px-2 py-2 text-sm bg-white h-[38px]"
                            value={att.docTypeName}
                            onChange={(e) => updateAttachment(att.id, { docTypeName: e.target.value })}
                            placeholder={`Enter custom name for ${selectedDocType?.text}`}
                          />
                        </div>
                      );
                    })()}
                  </div>
                  
                  {/* Second row: File input and buttons */}
                  <div>
                    <label className="block text-xs font-medium mb-1">{t('assets.file')}</label>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <div className="relative flex-1">
                        <input
                          type="file"
                          id={`file-${att.id}`}
                          onChange={(e) => onSelectFile(att.id, e.target.files?.[0] || null)}
                          className="hidden"
                        />
                        <label
                          htmlFor={`file-${att.id}`}
                          className="flex items-center h-[38px] px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer w-full"
                        >
                          <svg className="flex-shrink-0 w-5 h-5 mr-2 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                          </svg>
                          <span className="truncate">
                            {att.file ? att.file.name : t('assets.chooseFile')}
                          </span>
                        </label>
                      </div>

                      <div className="flex gap-2">
                        {att.previewUrl && (
                          <a 
                            href={att.previewUrl} 
                            target="_blank" 
                            rel="noreferrer" 
                            className="h-[38px] inline-flex items-center px-3 bg-[#0E2F4B] text-white rounded-md shadow-sm text-sm font-medium hover:bg-[#1a4971] transition-colors whitespace-nowrap"
                          >
                            <svg className="w-4 h-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            {t('common.preview')}
                          </a>
                        )}
                        <button 
                          type="button" 
                          onClick={() => removeAttachment(att.id)} 
                          className="h-[38px] inline-flex items-center px-3 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors whitespace-nowrap"
                        >
                          <svg className="w-4 h-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          {t('assets.remove')}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      
      {/* Unified Save and Cancel Buttons */}
      <div className="px-8 py-4 border-t border-gray-200 bg-gray-50">
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate('/assets')}
            className="bg-gray-300 text-gray-700 px-8 py-2 rounded text-base font-medium hover:bg-gray-400 transition"
            disabled={isSubmitting || isUploading}
          >
            {t('common.cancel')}
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="bg-[#002F5F] text-white px-8 py-2 rounded text-base font-medium hover:bg-[#0E2F4B] transition disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isSubmitting || isUploading}
          >
            {isSubmitting || isUploading ? (
              <span className="flex items-center">
                <svg className="animate-spin h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {isSubmitting ? 'Saving...' : 'Uploading...'}
              </span>
            ) : (
              t('common.save')
            )}
          </button>
        </div>
      </div>
      <style>{`
        .scrollable-dropdown {
          max-height: 180px;
          overflow-y: auto;
        }
      `}</style>
    </div>
  );
};

export default AddAssetForm;
