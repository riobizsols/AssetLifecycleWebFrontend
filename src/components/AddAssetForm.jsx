// AssetFormPage.jsx
import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import API from '../lib/axios';
import toast from 'react-hot-toast';
import { MdKeyboardArrowRight, MdKeyboardArrowDown } from 'react-icons/md';

const initialForm = {
  assetType: '',
  serialNumber: '',
  description: '',
  maintenanceSchedule: '',
  expiryDate: '',
  warrantyPeriod: '',
  purchaseDate: '',
  purchaseCost: '',
  currentStatus: '',
  properties: {},
  brand1: '',
  brand2: '',
  brand3: '',
  vendorId: '',
  purchaseBy: '',
  vendorBrand: '',
  vendorModel: '',
  purchaseSupply: '',
  serviceSupply: '',
};

const statusOptions = [
  { value: '', label: 'Select' },
  { value: 'Active', label: 'Active' },
  { value: 'Inactive', label: 'Inactive' },
  { value: 'Disposed', label: 'Disposed' },
];

const maintenanceOptions = [
  { value: '', label: 'Select' },
  { value: 'Monthly', label: 'Monthly' },
  { value: 'Quarterly', label: 'Quarterly' },
  { value: 'Yearly', label: 'Yearly' },
];

const brandOptions = [
  { value: '', label: 'Select' },
  { value: 'Brand A', label: 'Brand A' },
  { value: 'Brand B', label: 'Brand B' },
  { value: 'Brand C', label: 'Brand C' },
];

// Dummy API data for dropdowns
const dummyPurchaseBy = [
  { value: '', label: 'Select' },
  { value: 'Employee', label: 'Employee' },
  { value: 'Department', label: 'Department' },
];
const dummyVendorBrands = [
  { value: '', label: 'Select' },
  { value: 'Brand X', label: 'Brand X' },
  { value: 'Brand Y', label: 'Brand Y' },
];
const dummyVendorModels = [
  { value: '', label: 'Select' },
  { value: 'Model 1', label: 'Model 1' },
  { value: 'Model 2', label: 'Model 2' },
];

const AddAssetForm = ({ userRole }) => {
  const [form, setForm] = useState(initialForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [assetTypes, setAssetTypes] = useState([]);
  const [propertiesMap, setPropertiesMap] = useState({});
  const [collapsedSections, setCollapsedSections] = useState({
    asset: true,
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

  useEffect(() => {
    fetchAssetTypes();
    // Simulate API fetch for vendor dropdowns
    setPurchaseByOptions(dummyPurchaseBy);
    setVendorBrandOptions(dummyVendorBrands);
    setVendorModelOptions(dummyVendorModels);
    // Fetch purchase supply and service supply from API (placeholder endpoints)
    axios.get('/api/purchase-suppliers').then(res => {
      setPurchaseSupplyOptions(Array.isArray(res.data) ? res.data : []);
    }).catch(() => setPurchaseSupplyOptions([]));
    axios.get('/api/service-suppliers').then(res => {
      setServiceSupplyOptions(Array.isArray(res.data) ? res.data : []);
    }).catch(() => setServiceSupplyOptions([]));
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

  const fetchAssetTypes = async () => {
    try {
      const res = await API.get('/dept-assets/asset-types');
      setAssetTypes(Array.isArray(res.data) ? res.data : []);
      // If you need to fetch properties for each asset type, you can do so here as before
    } catch (err) {
      setAssetTypes([]);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handlePropChange = (propName, value) => {
    setForm((prev) => ({ ...prev, properties: { ...prev.properties, [propName]: value } }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.assetType || !form.serialNumber || !form.purchaseDate || !form.purchaseCost) {
      toast.error('Required fields missing');
      return;
    }
    setIsSubmitting(true);
    try {
      await axios.post('/api/assets', form);
      toast.success('Asset created');
      setForm(initialForm);
    } catch (err) {
      toast.error('Error creating asset');
    }
    setIsSubmitting(false);
  };

  const toggleSection = (section) => {
    setCollapsedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  // UI
  return (
    <div className="max-w-6xl mx-auto mt-8 bg-[#F5F8FA] rounded-xl shadow">
      {/* Header */}
      <div className="bg-[#0E2F4B] text-white py-4 px-8 rounded-t-xl border-b-4 border-[#FFC107] flex justify-center items-center">
        <span className="text-2xl font-semibold text-center w-full">Add Asset</span>
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
              <div>
                <label className="block text-sm mb-1 font-medium">Asset Type</label>
                <div className="relative w-full">
                  <button
                    type="button"
                    className="border text-black px-2 py-1 text-sm w-full bg-white rounded focus:outline-none flex justify-between items-center h-9"
                    onClick={() => setAssetTypeDropdownOpen((open) => !open)}
                  >
                    {form.assetType
                      ? assetTypes.find((at) => at.asset_type_id === form.assetType)?.text || "Select"
                      : "Select"}
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
                          className="w-full border px-2 py-1 rounded text-sm"
                          placeholder="Search Asset Types..."
                          value={searchAssetType}
                          onChange={e => setSearchAssetType(e.target.value)}
                          autoFocus
                        />
                      </div>
                      {assetTypes
                        .filter(at => at.text.toLowerCase().includes(searchAssetType.toLowerCase()))
                        .map((at) => (
                          <div
                            key={at.asset_type_id}
                            className={`px-4 py-2 cursor-pointer hover:bg-gray-100 text-sm ${form.assetType === at.asset_type_id ? "bg-gray-200" : ""}`}
                            onClick={() => {
                              setForm((prev) => ({ ...prev, assetType: at.asset_type_id }));
                              setAssetTypeDropdownOpen(false);
                              setSearchAssetType("");
                            }}
                          >
                            {at.text}
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm mb-1 font-medium">Serial Number</label>
                <input name="serialNumber" placeholder="" onChange={handleChange} value={form.serialNumber} className="w-full px-3 py-2 border border-gray-300 rounded bg-white text-sm h-9" />
              </div>
              <div>
                <label className="block text-sm mb-1 font-medium">Current Status</label>
                <select name="currentStatus" onChange={handleChange} value={form.currentStatus} className="w-full px-2 py-1 border border-gray-300 rounded bg-white text-sm h-9 scrollable-dropdown">
                  {statusOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm mb-1 font-medium">Maintenance Schedule</label>
                <select name="maintenanceSchedule" onChange={handleChange} value={form.maintenanceSchedule} className="w-full px-2 py-1 border border-gray-300 rounded bg-white text-sm h-9 scrollable-dropdown">
                  {maintenanceOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
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
                <label className="block text-sm mb-1 font-medium">Purchase Date</label>
                <input name="purchaseDate" type="date" onChange={handleChange} value={form.purchaseDate} className="w-full px-3 py-2 border border-gray-300 rounded bg-white text-sm h-9" />
              </div>
              <div>
                <label className="block text-sm mb-1 font-medium">Purchase Cost</label>
                <input name="purchaseCost" type="number" onChange={handleChange} value={form.purchaseCost} className="w-full px-3 py-2 border border-gray-300 rounded bg-white text-sm h-9" />
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
              <div>
                <label className="block text-sm mb-1 font-medium">Vendor ID</label>
                <input name="vendorId" placeholder="" onChange={handleChange} value={form.vendorId} className="w-full px-3 py-2 border border-gray-300 rounded bg-white text-sm h-9" />
              </div>
              <div>
                <label className="block text-sm mb-1 font-medium">Purchase By</label>
                <select name="purchaseBy" value={form.purchaseBy} onChange={handleChange} className="w-full px-2 py-1 border border-gray-300 rounded bg-white text-sm h-9 scrollable-dropdown">
                  {purchaseByOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm mb-1 font-medium">Brand</label>
                <select name="vendorBrand" value={form.vendorBrand} onChange={handleChange} className="w-full px-2 py-1 border border-gray-300 rounded bg-white text-sm h-9 scrollable-dropdown">
                  {vendorBrandOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm mb-1 font-medium">Model</label>
                <select name="vendorModel" value={form.vendorModel} onChange={handleChange} className="w-full px-2 py-1 border border-gray-300 rounded bg-white text-sm h-9 scrollable-dropdown">
                  {vendorModelOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm mb-1 font-medium">Purchase Supply</label>
                <select name="purchaseSupply" value={form.purchaseSupply} onChange={handleChange} className="w-full px-2 py-1 border border-gray-300 rounded bg-white text-sm h-9 scrollable-dropdown">
                  {purchaseSupplyOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm mb-1 font-medium">Service Supply</label>
                <select name="serviceSupply" value={form.serviceSupply} onChange={handleChange} className="w-full px-2 py-1 border border-gray-300 rounded bg-white text-sm h-9 scrollable-dropdown">
                  {serviceSupplyOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>
        {/* Other Details */}
        {form.assetType && (
          <div className="mb-6">
            <div className="border-b flex gap-8 mb-4">
              <button type="button" className="text-base font-semibold border-b-2 border-[#0E2F4B] text-[#0E2F4B] px-4 py-2 bg-transparent">Other Details</button>
            </div>
            <div className="grid grid-cols-3 gap-6">
              <div>
                <label className="block text-sm mb-1 font-medium">Brand</label>
                <select name="brand1" value={form.brand1} onChange={handleChange} className="w-full px-2 py-1 border border-gray-300 rounded bg-white text-sm h-9 scrollable-dropdown">
                  {brandOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm mb-1 font-medium">Brand</label>
                <select name="brand2" value={form.brand2} onChange={handleChange} className="w-full px-2 py-1 border border-gray-300 rounded bg-white text-sm h-9 scrollable-dropdown">
                  {brandOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm mb-1 font-medium">Brand</label>
                <select name="brand3" value={form.brand3} onChange={handleChange} className="w-full px-2 py-1 border border-gray-300 rounded bg-white text-sm h-9 scrollable-dropdown">
                  {brandOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}
        {/* Buttons */}
        <div className="flex justify-end gap-3 pb-4">
          <button
            type="button"
            onClick={() => setForm(initialForm)}
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
