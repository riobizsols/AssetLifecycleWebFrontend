// AssetFormPage.jsx
import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import API from '../lib/axios';
import toast from 'react-hot-toast';
import { MdKeyboardArrowRight, MdKeyboardArrowDown } from 'react-icons/md';
import { useAuthStore } from '../store/useAuthStore';
import { useNavigate } from 'react-router-dom';

const initialForm = {
  assetType: '',
  serialNumber: '',
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
  vendorId: '',
  parentAsset: '', // Add parent asset field
};

const statusOptions = [
  { value: '', label: 'Select' },
  { value: 'Active', label: 'Active' },
  { value: 'Inactive', label: 'Inactive' },
  { value: 'Disposed', label: 'Disposed' },
];

// Remove all dummy data arrays and fallback logic for vendors, brands, models, users, and maintenance schedules
// Only keep the real API fetch logic for these dropdowns

const AddAssetForm = ({ userRole }) => {
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Add validation state
  const [touched, setTouched] = useState({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [assetTypes, setAssetTypes] = useState([]);
  const [propertiesMap, setPropertiesMap] = useState({});
  const [dynamicProperties, setDynamicProperties] = useState([]);
  const [assetTypePropsMap, setAssetTypePropsMap] = useState({});
  const [collapsedSections, setCollapsedSections] = useState({
    asset: false, // Asset Details expanded by default
    purchase: true,
    vendor: true,
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

  useEffect(() => {
    console.log('Component mounted, fetching asset types...');
    fetchAssetTypes();
    fetchUsers();
    fetchProdServs();
    fetchVendors();
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

  // Update effect to handle boolean values
  useEffect(() => {
    if (form.assetType) {
      const selectedType = assetTypes.find(at => at.asset_type_id === form.assetType);
      console.log('Selected Asset Type:', selectedType);
      console.log('Is Child:', selectedType?.is_child);
      // Convert string 'false' to boolean false
      const isChild = selectedType?.is_child === true || selectedType?.is_child === 'true';
      if (isChild) {
        fetchParentAssets(form.assetType);
      } else {
        setParentAssets([]);
        setForm(prev => ({ ...prev, parentAsset: '' }));
      }
    }
  }, [form.assetType]);

  // Add function to fetch parent assets
  const fetchParentAssets = async (assetTypeId) => {
    try {
      const res = await API.get(`/assets/potential-parents/${assetTypeId}`);
      console.log('Parent assets response:', res.data);
      setParentAssets(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Error fetching parent assets:', err);
      toast.error('Failed to fetch parent assets');
      setParentAssets([]);
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
    setForm(prev => ({ ...prev, [name]: value }));
    if (name === 'purchaseSupply') {
      setForm(prev => ({ ...prev, vendorId: value }));
    }
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

      if (res.data && Array.isArray(res.data)) {
        // Transform API data to dropdown format
        const users = [
          { value: '', label: 'Select' },
          ...res.data.map(user => ({
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

        // Extract unique models
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
    const { name, value } = e.target;
    setForm((prev) => {
      // If purchaseSupply is changed, also update vendorId
      if (name === 'purchaseSupply') {
        return { ...prev, [name]: value, vendorId: value };
      }
      // If serviceSupply is changed, just update it
      if (name === 'serviceSupply') {
        return { ...prev, [name]: value };
      }
      return { ...prev, [name]: value };
    });
    setTouched((prev) => ({ ...prev, [name]: true }));
  };

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



  const generateSerialNumber = async () => {
    if (!form.assetType) {
      toast.error('Please select an asset type first');
      return;
    }

    try {
      setIsGeneratingSerial(true);
      
      // Use the preview endpoint to get the next serial number without incrementing
      const response = await API.get(`/serial-numbers/next/${form.assetType}`, {
        params: {
          orgId: useAuthStore.getState().user.org_id
        }
      });

      if (response.data.success) {
        const serialNumber = response.data.data.nextSerialNumber;
        setForm(prev => ({ ...prev, serialNumber }));
        toast.success(`Serial number generated: ${serialNumber}`);
      } else {
        toast.error(response.data.message || 'Failed to generate serial number');
      }
    } catch (error) {
      console.error('Error generating serial number:', error);
      const errorMessage = error.response?.data?.message || 'Failed to generate serial number';
      toast.error(errorMessage);
    } finally {
      setIsGeneratingSerial(false);
    }
  };

  const isFieldInvalid = (field) => {
    if (!submitAttempted) return false;
    if (field === 'parentAsset') {
      const selectedType = assetTypes.find(at => at.asset_type_id === form.assetType);
      const isChild = selectedType?.is_child === true || selectedType?.is_child === 'true';
      return isChild && !form.parentAsset;
    }
    return !form[field];
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('🚀 Starting asset submission...');
    setSubmitAttempted(true);
    // Validate required fields
    if (!form.assetType || !form.serialNumber || !form.purchaseDate || !form.purchaseCost) {
      toast.error('Required fields missing');
      return;
    }
    const selectedType = assetTypes.find(at => at.asset_type_id === form.assetType);
    const isChild = selectedType?.is_child === true || selectedType?.is_child === 'true';
    if (isChild && !form.parentAsset) {
      toast.error('Parent asset is required for this asset type');
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

      // Generate UUID for ext_id
      const ext_id = crypto.randomUUID();

      // Get asset type text for the 'text' field
      const selectedAssetType = assetTypes.find(at => at.asset_type_id === form.assetType);
      const assetTypeText = selectedAssetType ? selectedAssetType.text : '';

      // Prepare the asset data according to backend requirements
      const assetData = {
        asset_type_id: form.assetType,
        ext_id: ext_id,
        asset_id: '', // Will be auto-generated by backend
        text: assetTypeText, // Asset type name like "Laptop", "Router", etc.
        serial_number: form.serialNumber,
        description: form.description,
        branch_id: null, // null as specified
        purchase_vendor_id: form.purchaseSupply || null, // Use Purchase Vendor dropdown value
        service_vendor_id: form.serviceSupply || null, // Set from Service Vendor dropdown
        prod_serv_id: form.serviceSupply || null, // Set from Service Vendor dropdown
        maintsch_id: null, // Always set to null
        purchased_cost: form.purchaseCost,
        purchased_on: form.purchaseDate,
        purchased_by: form.purchaseBy || null,
        expiry_date: form.expiryDate || null,
        current_status: 'Active', // Default status
        warranty_period: form.warrantyPeriod || null,
        parent_asset_id: form.parentAsset || null, // Add parentAsset field
        org_id: user.org_id, // From user's auth store
        properties: form.properties || {}
      };

      console.log('📦 Submitting asset data:', assetData);
      const response = await API.post('/assets/add', assetData);
      console.log('✅ Asset created successfully:', response.data);
      toast.success('Asset created successfully');
      navigate('/assets');
    } catch (err) {
      console.error('❌ Error creating asset:', err);
      const errorMessage = err.response?.data?.error || 'Failed to create asset';
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
      console.log('🏁 Asset submission completed');
    }
  };

  const toggleSection = (section) => {
    setCollapsedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  // UI
  return (
    <div className="max-w-6xl mx-auto mt-8 bg-[#F5F8FA] rounded-xl shadow">
      {/* Header */}
      <div className="bg-[#0E2F4B] text-white py-4 px-8 rounded-t-xl border-b-4 border-[#FFC107] flex justify-center items-center">
        {/* <span className="text-2xl font-semibold text-center w-full">Add Asset</span> */}
      </div>
      <form onSubmit={handleSubmit} className="px-8 pt-8 pb-4">
        {/* Asset Details */}
        <div className="mb-6">
          <button type="button" onClick={() => toggleSection('asset')} className="flex items-center gap-2 text-lg font-semibold mb-2 focus:outline-none">
            <span>Asset Details</span>
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
                  Asset Type <span className="text-red-500">*</span>
                </label>
                <div className="relative w-full">
                  <button
                    type="button"
                    className={`border px-3 py-2 text-xs w-full bg-white rounded focus:outline-none flex justify-between items-center h-9 ${isFieldInvalid('assetType') ? 'border-red-500' : 'border-gray-300'}`}
                    onClick={() => setAssetTypeDropdownOpen((open) => !open)}
                  >
                    <span className="text-xs truncate">
                      {form.assetType
                        ? assetTypes.find((at) => at.asset_type_id === form.assetType)?.text || "Select"
                        : "Select"}
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
                          placeholder="Search by name or ID..."
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
                                {at.is_child ? ' (Child)' : ' (Parent)'}
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
              </div>

              {/* Show message if asset type can have children */}
              {form.assetType && (() => {
                const selectedType = assetTypes.find(at => at.asset_type_id === form.assetType);
                const isChild = selectedType?.is_child === true || selectedType?.is_child === 'true';
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
                const isChild = selectedType?.is_child === true || selectedType?.is_child === 'true';
                return isChild;
              })() && (
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Parent Asset <span className="text-red-500">*</span>
                  </label>
                  <div className="relative w-full">
                    <button
                      type="button"
                      className={`border px-3 py-2 text-xs w-full bg-white rounded focus:outline-none flex justify-between items-center h-9 ${isFieldInvalid('parentAsset') ? 'border-red-500' : 'border-gray-300'}`}
                      onClick={() => setParentAssetDropdownOpen((open) => !open)}
                    >
                      <span className="text-xs truncate">
                        {form.parentAsset
                          ? (() => {
                              const parent = parentAssets.find((pa) => pa.asset_id === form.parentAsset);
                              if (parent) {
                                return `${parent.asset_name} (${parent.asset_type_name}) - ${parent.serial_number || 'No SN'}`;
                              }
                              return "Select Parent Asset";
                            })()
                          : "Select Parent Asset"}
                      </span>
                      <MdKeyboardArrowDown className="ml-2 w-4 h-4 text-gray-500" />
                    </button>
                    {parentAssetDropdownOpen && (
                      <div
                        ref={parentAssetDropdownRef}
                        className="absolute left-0 right-0 mt-1 bg-white border rounded shadow-lg max-h-48 overflow-y-auto z-10"
                        style={{ minWidth: "100%" }}
                      >
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
                </div>
              )}

              <div>
                <label className="block text-sm mb-1 font-medium">
                  Serial Number <span className="text-red-500">*</span>
                </label>
                              <div className="flex items-center">
                <input name="serialNumber" placeholder="" onChange={handleChange} value={form.serialNumber} className={`w-full px-3 py-2 rounded bg-white text-sm h-9 border ${isFieldInvalid('serialNumber') ? 'border-red-500' : 'border-gray-300'}`} />
                <button
                  type="button"
                  onClick={() => {
                    setIsGeneratingSerial(true);
                    generateSerialNumber();
                  }}
                  className="ml-2 px-3 bg-[#0E2F4B] text-white rounded text-sm h-9 transition"
                  disabled={isGeneratingSerial || !form.assetType}
                >
                  {isGeneratingSerial ? 'Generating...' : 'Generate'}
                </button>
              </div>
              </div>
              <div className="col-span-4">
                <label className="block text-sm mb-1 font-medium">Description</label>
                <textarea name="description" placeholder="" onChange={handleChange} value={form.description} className="w-full px-3 py-2 border border-gray-300 rounded bg-white text-sm" rows={3}></textarea>
              </div>
            </div>
          )}
        </div>
        {/* Purchase Details */}
        <div className="mb-6">
          <button type="button" onClick={() => toggleSection('purchase')} className="flex items-center gap-2 text-lg font-semibold mb-2 focus:outline-none">
            <span>Purchase Details</span>
            {collapsedSections.purchase ? (
              <MdKeyboardArrowRight size={24} />
            ) : (
              <MdKeyboardArrowDown size={24} />
            )}
          </button>
          {!collapsedSections.purchase && (
            <div className="grid grid-cols-4 gap-6 mb-4">
              <div>
                <label className="block text-sm mb-1 font-medium">Expiry Date</label>
                <input name="expiryDate" type="date" onChange={handleChange} value={form.expiryDate} className="w-full px-3 py-2 border border-gray-300 rounded bg-white text-sm h-9" />
              </div>
              <div>
                <label className="block text-sm mb-1 font-medium">Warrenty Period</label>
                <input name="warrantyPeriod" placeholder="" onChange={handleChange} value={form.warrantyPeriod} className="w-full px-3 py-2 border border-gray-300 rounded bg-white text-sm h-9" />
              </div>
              <div>
                <label className="block text-sm mb-1 font-medium">
                  Purchase Date <span className="text-red-500">*</span>
                </label>
                <input name="purchaseDate" type="date" onChange={handleChange} value={form.purchaseDate} className={`w-full px-3 py-2 rounded bg-white text-sm h-9 border ${isFieldInvalid('purchaseDate') ? 'border-red-500' : 'border-gray-300'}`} />
              </div>
              <div>
                <label className="block text-sm mb-1 font-medium">
                  Purchase Cost <span className="text-red-500">*</span>
                </label>
                <input name="purchaseCost" type="number" onChange={handleChange} value={form.purchaseCost} className={`w-full px-3 py-2 rounded bg-white text-sm h-9 border ${isFieldInvalid('purchaseCost') ? 'border-red-500' : 'border-gray-300'}`} />
              </div>
            </div>
          )}
        </div>
        {/* Vendor Details */}
        <div className="mb-6">
          <button type="button" onClick={() => toggleSection('vendor')} className="flex items-center gap-2 text-lg font-semibold mb-2 focus:outline-none">
            <span>Vendor Details</span>
            {collapsedSections.vendor ? (
              <MdKeyboardArrowRight size={24} />
            ) : (
              <MdKeyboardArrowDown size={24} />
            )}
          </button>
          {!collapsedSections.vendor && (
            <div className="grid grid-cols-6 gap-6 mb-4">
                {/* Product Vendor Dropdown */}
                <div>
                <label className="block text-sm mb-1 font-medium">Product Vendor</label>
                <div className="relative w-full">
                  <button
                    type="button"
                    className="border text-black px-3 py-2 text-xs w-full bg-white rounded focus:outline-none flex justify-between items-center h-9"
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
              </div>

              {/* Service Vendor Dropdown */}
              <div>
                <label className="block text-sm mb-1 font-medium">Service Vendor</label>
                <div className="relative w-full">
                  <button
                    type="button"
                    className="border text-black px-3 py-2 text-xs w-full bg-white rounded focus:outline-none flex justify-between items-center h-9"
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
              </div>
              <div>
                <label className="block text-sm mb-1 font-medium">Vendor Id</label>
                <input
                  name="vendorId"
                  placeholder="Enter Vendor ID"
                  onChange={handleChange}
                  value={form.vendorId}
                  className="w-full px-3 py-2 border border-gray-300 rounded bg-white text-sm h-9"
                  readOnly
                />
              </div>

              {/* Purchase By Dropdown */}
              <div>
                <label className="block text-sm mb-1 font-medium">Purchase By</label>
                <div className="relative w-full">
                  <button
                    type="button"
                    className="border text-black px-3 py-2 text-xs w-full bg-white rounded focus:outline-none flex justify-between items-center h-9"
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
              </div>

              {/* Brand Dropdown */}
              <div>
                <label className="block text-sm mb-1 font-medium">Brand</label>
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
                            onClick={() => handleOptionSelect('vendorBrand', opt.value, opt.label)}
                          >
                            {opt.label}
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Model Dropdown */}
              <div>
                <label className="block text-sm mb-1 font-medium">Model</label>
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
                    </div>
                  )}
                </div>
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
                {dynamicProperties.map((property) => (
                  <div key={property.prop_id}>
                    <label className="block text-sm mb-1 font-medium">{property.property}</label>
                    <select
                      name={`property_${property.prop_id}`}
                      value={form.properties[property.prop_id] || ''}
                      onChange={(e) => handlePropChange(property.prop_id, e.target.value)}
                      className="w-full px-2 py-1 border border-gray-300 rounded bg-white text-sm h-9 scrollable-dropdown"
                    >
                      <option value="">Select {property.property}</option>
                      {property.values && property.values.length > 0 ? (
                        property.values.map((value) => (
                          <option key={value.aplv_id} value={value.value}>
                            {value.value}
                          </option>
                        ))
                      ) : (
                        <option value="">No values available</option>
                      )}
                    </select>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-gray-500 text-sm py-4">
                No specific properties configured for this asset type. You can add properties in the database.
              </div>
            )}
          </div>
        )}
        {/* Buttons */}
        <div className="flex justify-end gap-3 pb-4">
          <button
            type="button"
            onClick={() => navigate('/assets')}
            className="bg-gray-300 text-gray-700 px-8 py-2 rounded text-base font-medium hover:bg-gray-400 transition"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="bg-[#002F5F] text-white px-8 py-2 rounded text-base font-medium hover:bg-[#0E2F4B] transition"
            disabled={isSubmitting}
          >
            Save
          </button>
        </div>
      </form>
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
