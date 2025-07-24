// AssetFormPage.jsx
import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import API from '../../lib/axios';
import toast from 'react-hot-toast';
import { MdKeyboardArrowDown } from 'react-icons/md';
import { useAuthStore } from '../../store/useAuthStore';
import { useNavigate } from 'react-router-dom';

const initialForm = {
  assetType: '',
  serialNumber: '',
  description: '',
  maintenanceSchedule: '',
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
  parentAsset: '',
  status: 'Active'
};

const statusOptions = [
  { value: 'Active', label: 'Active' },
  { value: 'Inactive', label: 'Inactive' },
  { value: 'Disposed', label: 'Disposed' }
];

const AssetsDetail = ({ userRole }) => {
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [assetTypes, setAssetTypes] = useState([]);
  const [propertiesMap, setPropertiesMap] = useState({});
  const [dynamicProperties, setDynamicProperties] = useState([]);
  const [assetTypePropsMap, setAssetTypePropsMap] = useState({});
  const [maintenanceSchedules, setMaintenanceSchedules] = useState([]);
  const [purchaseByOptions, setPurchaseByOptions] = useState([]);
  const [vendorBrandOptions, setVendorBrandOptions] = useState([]);
  const [vendorModelOptions, setVendorModelOptions] = useState([]);
  const [purchaseSupplyOptions, setPurchaseSupplyOptions] = useState([]);
  const [serviceSupplyOptions, setServiceSupplyOptions] = useState([]);
  const [searchAssetType, setSearchAssetType] = useState("");
  const [parentAssets, setParentAssets] = useState([]);
  const [searchParentAsset, setSearchParentAsset] = useState("");
  // Add new state for selected asset
  const [selectedAssetId, setSelectedAssetId] = useState(null);

  // Refs for all dropdowns
  const dropdownRefs = {
    assetType: useRef(null),
    parentAsset: useRef(null),
    purchaseBy: useRef(null),
    vendorBrand: useRef(null),
    vendorModel: useRef(null),
    purchaseSupply: useRef(null),
    serviceSupply: useRef(null),
    maintenanceSchedule: useRef(null),
    status: useRef(null)
  };

  // State for all dropdown visibility
  const [dropdownStates, setDropdownStates] = useState({
    assetType: false,
    parentAsset: false,
    purchaseBy: false,
    vendorBrand: false,
    vendorModel: false,
    purchaseSupply: false,
    serviceSupply: false,
    maintenanceSchedule: false,
    status: false
  });

  // State for all dropdown searches
  const [searchStates, setSearchStates] = useState({
    assetType: '',
    parentAsset: '',
    purchaseBy: '',
    vendorBrand: '',
    vendorModel: '',
    purchaseSupply: '',
    serviceSupply: '',
    maintenanceSchedule: '',
    status: ''
  });

  useEffect(() => {
    fetchAssetTypes();
    fetchMaintenanceSchedules();
    fetchUsers();
    fetchProdServs();
    fetchVendors();
  }, []);

  // Click outside handler for all dropdowns
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

  // Effect to fetch parent assets when a child asset type is selected
  useEffect(() => {
    if (form.assetType) {
      const selectedType = assetTypes.find(at => at.asset_type_id === form.assetType);
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
      console.log('Fetching asset types from API...');
      // Check if user is authenticated
      const token = useAuthStore.getState().token;
      console.log('Auth token:', token ? 'Present' : 'Missing');

      const res = await API.get('/dept-assets/asset-types');
      console.log('Asset types response:', res.data);
      console.log('Asset types array:', Array.isArray(res.data) ? res.data : []);
      setAssetTypes(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Error fetching asset types:', err);
      console.error('Error details:', err.response?.data);
      setAssetTypes([]);
    }
  };

  const fetchMaintenanceSchedules = async () => {
    try {
      console.log('Fetching maintenance schedules from API...');
      const res = await API.get('/maintenance-schedules');
      console.log('Maintenance schedules response:', res.data);

      if (res.data && Array.isArray(res.data)) {
        // Transform API data to dropdown format
        const schedules = [
          { value: '', label: 'Select' },
          ...res.data.map(schedule => ({
            value: schedule.id || schedule.maint_sched_id,
            label: schedule.text || schedule.name
          }))
        ];
        setMaintenanceSchedules(schedules);
      }
    } catch (err) {
      console.error('Error fetching maintenance schedules:', err);
      console.log('Using dummy maintenance schedules as fallback');
      // Keep using dummy data if API fails
      setMaintenanceSchedules([]);
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
  };

  const handlePropChange = (propName, value) => {
    setForm((prev) => ({ ...prev, properties: { ...prev.properties, [propName]: value } }));
  };

  const handleChoose = async (e) => {
    e.preventDefault();
    if (!form.assetType || !form.serialNumber || !form.purchaseDate || !form.purchaseCost) {
      toast.error('Required fields missing');
      return;
    }

    // Add validation for parent asset if it's a child type
    const selectedType = assetTypes.find(at => at.asset_type_id === form.assetType);
    if (selectedType?.is_child && !form.parentAsset) {
      toast.error('Parent asset is required for this asset type');
      return;
    }

    setIsSubmitting(true);
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
        text: assetTypeText,
        serial_number: form.serialNumber,
        description: form.description,
        branch_id: null,
        vendor_id: form.purchaseSupply || null,
        prod_serve_id: form.serviceSupply || null,
        maintsch_id: null,
        purchased_cost: form.purchaseCost,
        purchased_on: form.purchaseDate,
        purchased_by: form.purchaseBy || null,
        expiry_date: form.expiryDate || null,
        current_status: form.status || 'Active',
        warranty_period: form.warrantyPeriod || null,
        parent_id: form.parentAsset || null,
        group_id: null,
        org_id: user.org_id,
        properties: {}
      };

      // Map prop_id to asset_type_prop_id for backend
      if (form.properties) {
        Object.keys(form.properties).forEach(propId => {
          const assetTypePropId = assetTypePropsMap[propId];
          if (assetTypePropId && form.properties[propId]) {
            assetData.properties[assetTypePropId] = form.properties[propId];
          }
        });
      }

      console.log('Submitting asset data:', assetData);
      const response = await API.post('/assets', assetData);
      toast.success('Asset created successfully');
      setSelectedAssetId(response.data.asset_id);
    } catch (err) {
      console.error('Error creating asset:', err);
      toast.error(err.response?.data?.message || 'Error creating asset');
    }
    setIsSubmitting(false);
  };

  const handleAssign = () => {
    if (!selectedAssetId) {
      toast.error('Please choose an asset first');
      return;
    }
    navigate(`/asset-assignment/${selectedAssetId}`);
  };

  return (
    <div className="max-w-7xl mx-auto mt-8 bg-[#F5F8FA] rounded-xl shadow">
      <div className="bg-[#0E2F4B] text-white py-4 px-8 rounded-t-xl border-b-4 border-[#FFC107] flex justify-center items-center">
        <span className="text-2xl font-semibold text-center w-full">Asset Details</span>
      </div>
      
      <form onSubmit={handleChoose} className="p-8">
        {/* First row - 12 fields in 4 columns */}
        <div className="grid grid-cols-4 gap-6 mb-6">
          {/* Asset Type Dropdown */}
          <div>
            <label className="block text-sm mb-1 font-medium">Asset Type</label>
            <div className="relative">
              <button
                type="button"
                className="border text-black px-3 py-2 text-xs w-full bg-white rounded focus:outline-none flex justify-between items-center h-9"
                onClick={() => toggleDropdown('assetType')}
              >
                <span className="text-xs truncate">
                  {form.assetType
                    ? assetTypes.find((at) => at.asset_type_id === form.assetType)?.text || "Select"
                    : "Select"}
                </span>
                <MdKeyboardArrowDown className="ml-2 w-4 h-4 text-gray-500" />
              </button>
              {dropdownStates.assetType && (
                <div
                  ref={dropdownRefs.assetType}
                  className="absolute left-0 right-0 mt-1 bg-white border rounded shadow-lg max-h-48 overflow-y-auto z-10"
                >
                  <div className="sticky top-0 bg-white px-2 py-2 border-b">
                    <input
                      type="text"
                      className="w-full border px-2 py-1 rounded text-xs"
                      placeholder="Search..."
                      value={searchStates.assetType}
                      onChange={e => updateSearch('assetType', e.target.value)}
                      autoFocus
                    />
                  </div>
                  {assetTypes
                    .filter(at => 
                      at.text.toLowerCase().includes(searchStates.assetType.toLowerCase()) ||
                      at.asset_type_id.toLowerCase().includes(searchStates.assetType.toLowerCase())
                    )
                    .map((at) => (
                      <div
                        key={at.asset_type_id}
                        className={`px-4 py-2 cursor-pointer hover:bg-gray-100 text-xs ${form.assetType === at.asset_type_id ? "bg-gray-200" : ""}`}
                        onClick={() => {
                          handleOptionSelect('assetType', at.asset_type_id, at.text);
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
                </div>
              )}
            </div>
          </div>

          {/* Serial Number */}
          <div>
            <label className="block text-sm mb-1 font-medium">Serial Number</label>
            <input
              name="serialNumber"
              onChange={handleChange}
              value={form.serialNumber}
              className="w-full px-3 py-2 border border-gray-300 rounded bg-white text-sm h-9"
            />
          </div>

          {/* Current Status Dropdown */}
          <div>
            <label className="block text-sm mb-1 font-medium">Current Status</label>
            <div className="relative">
              <button
                type="button"
                className="border text-black px-3 py-2 text-xs w-full bg-white rounded focus:outline-none flex justify-between items-center h-9"
                onClick={() => toggleDropdown('status')}
              >
                <span className="text-xs truncate">
                  {form.status ? statusOptions.find(opt => opt.value === form.status)?.label || "Select" : "Select"}
                </span>
                <MdKeyboardArrowDown className="ml-2 w-4 h-4 text-gray-500" />
              </button>
              {dropdownStates.status && (
                <div
                  ref={dropdownRefs.status}
                  className="absolute left-0 right-0 mt-1 bg-white border rounded shadow-lg max-h-48 overflow-y-auto z-10"
                >
                  {statusOptions.map(opt => (
                    <div
                      key={opt.value}
                      className={`px-4 py-2 cursor-pointer hover:bg-gray-100 text-xs ${form.status === opt.value ? "bg-gray-200" : ""}`}
                      onClick={() => handleOptionSelect('status', opt.value, opt.label)}
                    >
                      {opt.label}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Maintenance Schedule Dropdown */}
          <div>
            <label className="block text-sm mb-1 font-medium">Maintenance Schedule</label>
            <div className="relative">
              <button
                type="button"
                className="border text-black px-3 py-2 text-xs w-full bg-white rounded focus:outline-none flex justify-between items-center h-9"
                onClick={() => toggleDropdown('maintenanceSchedule')}
              >
                <span className="text-xs truncate">
                  {form.maintenanceSchedule
                    ? maintenanceSchedules.find(opt => opt.value === form.maintenanceSchedule)?.label || "Select"
                    : "Select"}
                </span>
                <MdKeyboardArrowDown className="ml-2 w-4 h-4 text-gray-500" />
              </button>
              {dropdownStates.maintenanceSchedule && (
                <div
                  ref={dropdownRefs.maintenanceSchedule}
                  className="absolute left-0 right-0 mt-1 bg-white border rounded shadow-lg max-h-48 overflow-y-auto z-10"
                >
                  {maintenanceSchedules.map(opt => (
                    <div
                      key={opt.value}
                      className={`px-4 py-2 cursor-pointer hover:bg-gray-100 text-xs ${form.maintenanceSchedule === opt.value ? "bg-gray-200" : ""}`}
                      onClick={() => handleOptionSelect('maintenanceSchedule', opt.value, opt.label)}
                    >
                      {opt.label}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Expiry Date */}
          <div>
            <label className="block text-sm mb-1 font-medium">Expiry Date</label>
            <input
              name="expiryDate"
              type="date"
              onChange={handleChange}
              value={form.expiryDate}
              className="w-full px-3 py-2 border border-gray-300 rounded bg-white text-sm h-9"
            />
          </div>

          {/* Warranty Period */}
          <div>
            <label className="block text-sm mb-1 font-medium">Warranty Period</label>
            <input
              name="warrantyPeriod"
              onChange={handleChange}
              value={form.warrantyPeriod}
              className="w-full px-3 py-2 border border-gray-300 rounded bg-white text-sm h-9"
            />
          </div>

          {/* Purchase Date */}
          <div>
            <label className="block text-sm mb-1 font-medium">Purchase Date</label>
            <input
              name="purchaseDate"
              type="date"
              onChange={handleChange}
              value={form.purchaseDate}
              className="w-full px-3 py-2 border border-gray-300 rounded bg-white text-sm h-9"
            />
          </div>

          {/* Purchase Cost */}
          <div>
            <label className="block text-sm mb-1 font-medium">Purchase Cost</label>
            <input
              name="purchaseCost"
              type="number"
              onChange={handleChange}
              value={form.purchaseCost}
              className="w-full px-3 py-2 border border-gray-300 rounded bg-white text-sm h-9"
            />
          </div>

          {/* Vendor ID */}
          <div>
            <label className="block text-sm mb-1 font-medium">Vendor ID</label>
            <input
              name="vendorId"
              onChange={handleChange}
              value={form.vendorId}
              className="w-full px-3 py-2 border border-gray-300 rounded bg-white text-sm h-9"
              readOnly
            />
          </div>

          {/* Purchase By Dropdown */}
          <div>
            <label className="block text-sm mb-1 font-medium">Purchase By</label>
            <div className="relative">
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
                >
                  <div className="sticky top-0 bg-white px-2 py-2 border-b">
                    <input
                      type="text"
                      className="w-full border px-2 py-1 rounded text-xs"
                      placeholder="Search..."
                      value={searchStates.purchaseBy}
                      onChange={e => updateSearch('purchaseBy', e.target.value)}
                      autoFocus
                    />
                  </div>
                  {purchaseByOptions
                    .filter(opt => opt.value && opt.label.toLowerCase().includes(searchStates.purchaseBy.toLowerCase()))
                    .map(opt => (
                      <div
                        key={opt.value}
                        className={`px-4 py-2 cursor-pointer hover:bg-gray-100 text-xs ${form.purchaseBy === opt.value ? "bg-gray-200" : ""}`}
                        onClick={() => handleOptionSelect('purchaseBy', opt.value, opt.label)}
                      >
                        {opt.label}
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>

          {/* Brand Dropdown */}
          <div>
            <label className="block text-sm mb-1 font-medium">Brand</label>
            <div className="relative">
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
                >
                  <div className="sticky top-0 bg-white px-2 py-2 border-b">
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
            <div className="relative">
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
                >
                  <div className="sticky top-0 bg-white px-2 py-2 border-b">
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

        {/* Description - Full width */}
        <div className="mb-6">
          <label className="block text-sm mb-1 font-medium">Description</label>
          <textarea
            name="description"
            onChange={handleChange}
            value={form.description}
            className="w-full px-3 py-2 border border-gray-300 rounded bg-white text-sm"
            rows={3}
          />
        </div>

        {/* Other Details Tab Section */}
        {form.assetType && dynamicProperties.length > 0 && (
          <div className="mb-6">
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex">
                <button
                  type="button"
                  className="border-[#0E2F4B] text-[#0E2F4B] border-b-2 py-2 px-4 text-sm font-medium"
                >
                  Other Details
                </button>
              </nav>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-6">
              {dynamicProperties.map((property) => (
                <div key={property.prop_id}>
                  <label className="block text-sm mb-1 font-medium">{property.property}</label>
                  <select
                    name={`property_${property.prop_id}`}
                    value={form.properties[property.prop_id] || ''}
                    onChange={(e) => handlePropChange(property.prop_id, e.target.value)}
                    className="w-full px-2 py-1 border border-gray-300 rounded bg-white text-sm h-9"
                  >
                    <option value="">Select {property.property}</option>
                    {property.values?.map((value) => (
                      <option key={value.aplv_id} value={value.value}>
                        {value.value}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Buttons */}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate('/assets')}
            className="bg-gray-300 text-gray-700 px-8 py-2 rounded text-base font-medium hover:bg-gray-400 transition"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleChoose}
            className="bg-[#002F5F] text-white px-8 py-2 rounded text-base font-medium hover:bg-[#0E2F4B] transition flex items-center gap-2"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <span className="animate-spin">⌛</span>
                <span>Processing...</span>
              </>
            ) : (
              'Choose'
            )}
          </button>
          <button
            type="button"
            onClick={handleAssign}
            className={`px-8 py-2 rounded text-base font-medium transition flex items-center gap-2 ${
              selectedAssetId 
                ? 'bg-green-600 text-white hover:bg-green-700' 
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
            disabled={!selectedAssetId || isSubmitting}
          >
            Assign
          </button>
        </div>
      </form>
    </div>
  );
};

export default AssetsDetail;
