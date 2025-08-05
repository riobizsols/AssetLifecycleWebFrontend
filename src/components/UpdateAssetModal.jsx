import React, { useState, useEffect, useRef } from 'react';
import API from '../lib/axios';
import toast from 'react-hot-toast';
import { MdKeyboardArrowDown } from 'react-icons/md';
import { useAuthStore } from '../store/useAuthStore';

const UpdateAssetModal = ({ isOpen, onClose, assetData }) => {
  const [form, setForm] = useState({
    assetType: '',
    serialNumber: '',
    description: '',
    expiryDate: '',
    warrantyPeriod: '',
    purchaseDate: '',
    purchaseCost: '',
    purchaseBy: '',
    vendorBrand: '',
    vendorModel: '',
    purchaseSupply: '',
    serviceSupply: '',
    vendorId: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [assetTypes, setAssetTypes] = useState([]);
  const [purchaseByOptions, setPurchaseByOptions] = useState([]);
  const [vendorBrandOptions, setVendorBrandOptions] = useState([]);
  const [vendorModelOptions, setVendorModelOptions] = useState([]);
  const [purchaseSupplyOptions, setPurchaseSupplyOptions] = useState([]);
  const [serviceSupplyOptions, setServiceSupplyOptions] = useState([]);
  const [searchAssetType, setSearchAssetType] = useState("");
  const assetTypeDropdownRef = useRef(null);
  const [assetTypeDropdownOpen, setAssetTypeDropdownOpen] = useState(false);

  // Load asset data when modal opens
  useEffect(() => {
    if (assetData) {
      // Format dates to YYYY-MM-DD for input type="date"
      const formatDate = (dateString) => {
        if (!dateString) return '';
        try {
          const date = new Date(dateString);
          if (isNaN(date.getTime())) return ''; // Invalid date
          return date.toISOString().split('T')[0];
        } catch (err) {
          console.error('Error formatting date:', err);
          return '';
        }
      };

      setForm({
        assetType: assetData.asset_type_id || '',
        serialNumber: assetData.serial_number || '',
        description: assetData.description || '',
        expiryDate: formatDate(assetData.expiry_date),
        warrantyPeriod: assetData.warranty_period || '',
        purchaseDate: formatDate(assetData.purchased_on),
        purchaseCost: assetData.purchased_cost || '',
        purchaseBy: assetData.purchased_by || '',
        vendorBrand: '',
        vendorModel: '',
        purchaseSupply: assetData.vendor_id || '',
        serviceSupply: assetData.prod_serv_id || '',
        vendorId: assetData.vendor_id || ''
      });
    }
  }, [assetData]);

  useEffect(() => {
    fetchAssetTypes();
    fetchUsers();
    fetchProdServs();
    fetchVendors();
  }, []);

  const fetchAssetTypes = async () => {
    try {
      const res = await API.get('/dept-assets/asset-types');
      setAssetTypes(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Error fetching asset types:', err);
      setAssetTypes([]);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await API.get('/users/get-users');
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
      setPurchaseByOptions([]);
    }
  };

  const fetchProdServs = async () => {
    try {
      const res = await API.get('/prodserv');
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
      setPurchaseSupplyOptions([]);
      setServiceSupplyOptions([]);
    }
  };

  const fetchVendors = async () => {
    try {
      const res = await API.get('/get-vendors');
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
      setPurchaseSupplyOptions([]);
      setServiceSupplyOptions([]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.assetType || !form.serialNumber || !form.purchaseDate || !form.purchaseCost) {
      toast.error('Required fields missing');
      return;
    }

    setIsSubmitting(true);
    try {
      // Prepare the asset data according to backend requirements
      const updateData = {
        asset_type_id: form.assetType,
        serial_number: form.serialNumber,
        description: form.description,
        vendor_id: form.purchaseSupply || null,
        prod_serv_id: form.serviceSupply || null,
        maintsch_id: null,
        purchased_cost: form.purchaseCost,
        purchased_on: form.purchaseDate,
        purchased_by: form.purchaseBy || null,
        expiry_date: form.expiryDate || null,
        current_status: 'Active',
        warranty_period: form.warrantyPeriod || null
      };

      // Use the asset_id from the passed assetData prop
      await API.put(`/assets/${assetData.asset_id}`, updateData);
      toast.success('Asset updated successfully');
      onClose(true);
    } catch (err) {
      console.error('Error updating asset:', err);
      const errorMessage = err.response?.data?.error || 'Failed to update asset';
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-lg w-[90%] max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="bg-[#0E2F4B] text-white py-4 px-6 rounded-t-xl border-b-4 border-[#FFC107] text-center">
          <h1 className="text-2xl font-semibold">Update Asset</h1>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid grid-cols-3 gap-6 mb-6">
            {/* Asset Type Dropdown */}
            <div>
              <label className="block text-sm font-medium mb-1">Asset Type</label>
              <div className="relative w-full">
                <button
                  type="button"
                  className="border text-black px-3 py-2 text-xs w-full bg-white rounded focus:outline-none flex justify-between items-center h-9"
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
                        at.text?.toLowerCase().includes(searchAssetType.toLowerCase()) ||
                        at.asset_type_id?.toLowerCase().includes(searchAssetType.toLowerCase())
                      )
                      .map((at) => (
                        <div
                          key={at.asset_type_id}
                          className={`px-4 py-2 cursor-pointer hover:bg-gray-100 text-xs ${form.assetType === at.asset_type_id ? "bg-gray-200" : ""}`}
                          onClick={() => {
                            setForm((prev) => ({ ...prev, assetType: at.asset_type_id }));
                            setAssetTypeDropdownOpen(false);
                            setSearchAssetType("");
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
              <label className="block text-sm font-medium mb-1">Serial Number</label>
              <input
                type="text"
                value={form.serialNumber}
                onChange={(e) => setForm(prev => ({ ...prev, serialNumber: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter serial number"
                required
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <input
                type="text"
                value={form.description}
                onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter description"
              />
            </div>

            {/* Purchase Cost */}
            <div>
              <label className="block text-sm font-medium mb-1">Purchase Cost</label>
              <input
                type="number"
                value={form.purchaseCost}
                onChange={(e) => setForm(prev => ({ ...prev, purchaseCost: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter purchase cost"
                required
              />
            </div>

            {/* Purchase Date */}
            <div>
              <label className="block text-sm font-medium mb-1">Purchase Date</label>
              <input
                type="date"
                value={form.purchaseDate}
                onChange={(e) => setForm(prev => ({ ...prev, purchaseDate: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            {/* Expiry Date */}
            <div>
              <label className="block text-sm font-medium mb-1">Expiry Date</label>
              <input
                type="date"
                value={form.expiryDate}
                onChange={(e) => setForm(prev => ({ ...prev, expiryDate: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Warranty Period */}
            <div>
              <label className="block text-sm font-medium mb-1">Warranty Period</label>
              <input
                type="text"
                value={form.warrantyPeriod}
                onChange={(e) => setForm(prev => ({ ...prev, warrantyPeriod: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter warranty period"
              />
            </div>

            {/* Purchase By */}
            <div>
              <label className="block text-sm font-medium mb-1">Purchase By</label>
              <select
                value={form.purchaseBy}
                onChange={(e) => setForm(prev => ({ ...prev, purchaseBy: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select User</option>
                {purchaseByOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Purchase Supply */}
            <div>
              <label className="block text-sm font-medium mb-1">Purchase Supply</label>
              <select
                value={form.purchaseSupply}
                onChange={(e) => setForm(prev => ({ ...prev, purchaseSupply: e.target.value, vendorId: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Vendor</option>
                {purchaseSupplyOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Service Supply */}
            <div>
              <label className="block text-sm font-medium mb-1">Service Supply</label>
              <select
                value={form.serviceSupply}
                onChange={(e) => setForm(prev => ({ ...prev, serviceSupply: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Service</option>
                {serviceSupplyOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={() => onClose(false)}
              className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-[#0E2F4B] text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UpdateAssetModal; 