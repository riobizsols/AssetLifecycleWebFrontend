import React, { useState, useEffect, useRef } from 'react';
import { Trash2, Eye, ChevronDown, Maximize, Minimize } from 'lucide-react';
import API from '../../lib/axios';
import DeleteConfirmModal from '../../components/DeleteConfirmModal';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import useAuditLog from '../../hooks/useAuditLog';
import { PRODSERV_APP_ID } from '../../constants/prodServAuditEvents';

// Debug log to confirm component loaded
console.log('DeleteConfirmModal imported:', DeleteConfirmModal);

// Add this style block for smaller placeholder text
const placeholderStyle = `
  ::placeholder {
    font-size: 0.75rem; /* text-xs */
  }
`;

const tabStyles = {
  base: 'px-6 py-2 cursor-pointer text-xs font-semibold border-b-2',
  active: 'border-[#003366] text-[#003366] bg-white',
  inactive: 'border-transparent text-gray-500 bg-transparent',
};

const _tableHeader = 'bg-[#003366] text-white text-left text-sm font-semibold';
const _tableRow = 'text-sm text-gray-800';
const _tableAltRow = 'bg-gray-100';
const _borderBottom = 'border-b-2 border-[#FFC107]';

export default function ProdServ() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('product');

  // Initialize audit logging
  const { recordActionByNameWithFetch } = useAuditLog(PRODSERV_APP_ID);
  const [productForm, setProductForm] = useState({ assetType: '', brand: '', model: '', description: '' });
  const [serviceForm, setServiceForm] = useState({ assetType: '', description: '' });
  const [products, setProducts] = useState([]);
  const [services, setServices] = useState([]);
  const [productFilter, setProductFilter] = useState('');
  const [serviceFilter, setServiceFilter] = useState('');
  const [productSubmitAttempted, setProductSubmitAttempted] = useState(false);
  const [serviceSubmitAttempted, setServiceSubmitAttempted] = useState(false);

  // Asset types for dropdown
  const [assetTypes, setAssetTypes] = useState([]);
  const [_brands, _setBrands] = useState([]);
  const [_models, _setModels] = useState([]);
  const [_searchAssetType, _setSearchAssetType] = useState('');
  const _dropdownRef = useRef(null);
  // Add separate search and dropdown state for each dropdown
  const [searchAssetTypeProduct, setSearchAssetTypeProduct] = useState('');
  const [searchAssetTypeProductFilter, setSearchAssetTypeProductFilter] = useState('');
  const [searchAssetTypeService, setSearchAssetTypeService] = useState('');
  const [searchAssetTypeServiceFilter, setSearchAssetTypeServiceFilter] = useState('');
  const [showDropdownProduct, setShowDropdownProduct] = useState(false);
  const [showDropdownProductFilter, setShowDropdownProductFilter] = useState(false);
  const [showDropdownService, setShowDropdownService] = useState(false);
  const [showDropdownServiceFilter, setShowDropdownServiceFilter] = useState(false);

  // Add maximize state for each table
  const [isProductTableMaximized, setIsProductTableMaximized] = useState(false);
  const [isServiceTableMaximized, setIsServiceTableMaximized] = useState(false);
  
  // Delete confirmation modal states
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [_isDeleting, _setIsDeleting] = useState(false);

  useEffect(() => {
    const fetchAssetTypes = async () => {
      try {
        const res = await API.get('/dept-assets/asset-types');
        setAssetTypes(res.data);
      } catch {
        setAssetTypes([]);
      }
    };
    fetchAssetTypes();
  }, []);

  // Fetch products and services from /prodserv and filter by ps_type
  useEffect(() => {
    const fetchProdServ = async () => {
      try {
        const res = await API.get('/prodserv');
        const all = Array.isArray(res.data) ? res.data : [];
        setProducts(all.filter(p => p.ps_type === 'product'));
        setServices(all.filter(p => p.ps_type === 'service'));
      } catch {
        setProducts([]);
        setServices([]);
      }
    };
    fetchProdServ();
  }, []);

  // Remove brands/models state and related useEffects

  // Add product using /prodserv
  const handleProductAdd = async () => {
    setProductSubmitAttempted(true);
    if (!productForm.assetType || !productForm.brand || !productForm.model) return;
    try {
      const response = await API.post('/prodserv', {
        assetType: productForm.assetType,
        brand: productForm.brand,
        model: productForm.model,
        description: null,
        ps_type: 'product'
      });
      
      // Log create action for product
      await recordActionByNameWithFetch('Create', {
        prodServId: response.data?.prod_serv_id,
        assetTypeId: productForm.assetType,
        assetTypeName: assetTypes.find(at => at.asset_type_id === productForm.assetType)?.text,
        brand: productForm.brand,
        model: productForm.model,
        psType: 'product',
        action: 'Product Created'
      });
      
      setProductForm({ assetType: '', brand: '', model: '', description: '' });
      setProductSubmitAttempted(false);
      // Refresh products
      const res = await API.get('/prodserv');
      const all = Array.isArray(res.data) ? res.data : [];
      setProducts(all.filter(p => p.ps_type === 'product'));
    } catch {
      // Optionally handle error
    }
  };

  // Add service using /prodserv
  const handleServiceAdd = async () => {
    setServiceSubmitAttempted(true);
    if (!serviceForm.assetType || !serviceForm.description) return;
    try {
      const response = await API.post('/prodserv', {
        assetType: serviceForm.assetType,
        description: serviceForm.description,
        ps_type: 'service'
      });
      
      // Log create action for service
      await recordActionByNameWithFetch('Create', {
        prodServId: response.data?.prod_serv_id,
        assetTypeId: serviceForm.assetType,
        assetTypeName: assetTypes.find(at => at.asset_type_id === serviceForm.assetType)?.text,
        description: serviceForm.description,
        psType: 'service',
        action: 'Service Created'
      });
      
      setServiceForm({ assetType: '', description: '' });
      setServiceSubmitAttempted(false);
      // Refresh services
      const res = await API.get('/prodserv');
      const all = Array.isArray(res.data) ? res.data : [];
      setServices(all.filter(p => p.ps_type === 'service'));
    } catch {
      // Optionally handle error
    }
  };

  // Open delete confirmation modal
  const openDeleteModal = (item, type) => {
    setItemToDelete({ ...item, type });
    setShowDeleteModal(true);
  };

  // State for dependency modal
  const [showDependencyModal, setShowDependencyModal] = useState(false);
  const [dependencies, setDependencies] = useState(null);
  const [_deleteOption, _setDeleteOption] = useState('');

  // Check if item has vendor associations
  const checkVendorAssociations = async (itemId) => {
    try {
      const response = await API.get(`/vendor-prod-services/check/${itemId}`);
      return response.data;
    } catch (_err) {
      console.error('Error checking vendor associations:', _err);
      return { hasAssociations: true, vendors: [] };
    }
  };

  // Handle delete confirmation
  const handleDeleteConfirm = async () => {
    if (!itemToDelete) return;
    
    _setIsDeleting(true);
    try {
      const itemId = itemToDelete.prod_serv_id || itemToDelete.id;
      
      if (!itemId) {
        throw new Error('No valid ID found for deletion');
      }

      // Check for vendor associations first
      const associations = await checkVendorAssociations(itemId);
      
      if (associations.hasAssociations) {
        // Show dependency modal instead of error
        setDependencies(associations);
        setShowDependencyModal(true);
        setShowDeleteModal(false);
        return;
      }

      // Proceed with deletion if no associations
      await API.delete(`/prodserv/${itemId}`);
      
      // Log delete action
      await recordActionByNameWithFetch('Delete', {
        prodServId: itemId,
        assetTypeId: itemToDelete.assetType || itemToDelete.asset_type_id,
        assetTypeName: assetTypes.find(at => at.asset_type_id === (itemToDelete.assetType || itemToDelete.asset_type_id))?.text,
        brand: itemToDelete.brand,
        model: itemToDelete.model,
        description: itemToDelete.description,
        psType: itemToDelete.type,
        action: `${itemToDelete.type === 'product' ? 'Product' : 'Service'} Deleted`
      });
      
      // Update local state based on type
      if (itemToDelete.type === 'product') {
        setProducts(prev => prev.filter(p => (p.prod_serv_id || p.id) !== itemId));
        toast.success('Product deleted successfully');
      } else {
        setServices(prev => prev.filter(s => (s.prod_serv_id || s.id) !== itemId));
        toast.success('Service deleted successfully');
      }

      // Refresh the data after deletion
      const refreshResponse = await API.get('/prodserv');
      const all = Array.isArray(refreshResponse.data) ? refreshResponse.data : [];
      setProducts(all.filter(p => p.ps_type === 'product'));
      setServices(all.filter(p => p.ps_type === 'service'));

    } catch (err) {
      console.error('Error deleting item:', err);
      let errorMessage = 'Failed to delete item';
      
      // Handle specific error cases
      if (err.response?.data?.code === '23503') {
        // Foreign key constraint error
        errorMessage = `This ${itemToDelete.type} cannot be deleted because it is being used by other records.`;
      } else if (err.response?.status === 404) {
        errorMessage = `${itemToDelete.type === 'product' ? 'Product' : 'Service'} not found.`;
      } else if (err.response?.status === 403) {
        errorMessage = 'You do not have permission to delete this item.';
      } else {
        errorMessage = err.response?.data?.message || err.response?.data?.error || errorMessage;
      }
      
      toast.error(errorMessage, { duration: 4000 });
    } finally {
      _setIsDeleting(false);
      setShowDeleteModal(false);
      setItemToDelete(null);
    }
  };

  // Handle delete modal close
  const handleDeleteCancel = () => {
    setShowDeleteModal(false);
    setItemToDelete(null);
  };

  // Helper for invalid field
  const isProductFieldInvalid = (val) => productSubmitAttempted && !val;
  const isServiceFieldInvalid = (val) => serviceSubmitAttempted && !val;

  return (
    <>
      <style>{placeholderStyle}</style>
      <div className='p-3'>
        <div className="max-w-7xl mx-auto bg-white rounded shadow-lg">
          <div className="bg-[#0E2F4B] text-white text-base font-semibold py-3 px-6 rounded-t flex items-center justify-center border-b-4 border-[#FFC107]">
            {/* Product / Service */}
          </div>
          <div className="px-6 pt-6">
            {/* Tabs */}
            <div className="flex border-b mb-6">
              <div
                className={`${tabStyles.base} ${tab === 'product' ? tabStyles.active : tabStyles.inactive}`}
                onClick={() => setTab('product')}
              >
                Product Details
              </div>
              <div
                className={`${tabStyles.base} ${tab === 'service' ? tabStyles.active : tabStyles.inactive}`}
                onClick={() => setTab('service')}
              >
                Service Details
              </div>
            </div>

            {/* Tab Content */}
            {tab === 'product' ? (
              <>
                {/* Product Form */}
                <div className="flex flex-wrap items-end gap-4 mb-6">
                  <div className="flex flex-col">
                    <label className="text-xs mb-1">
                      Asset Type <span className="text-red-500">*</span>
                    </label>
                    {/* Product Form Asset Type Dropdown */}
                    <div className="relative w-64">
                      <button
                        className={`border text-black px-3 py-2 text-xs w-full bg-white focus:outline-none flex justify-between items-center ${isProductFieldInvalid(productForm.assetType) ? 'border-red-500' : 'border-gray-300'}`}
                        type="button"
                        onClick={() => setShowDropdownProduct((prev) => !prev)}
                      >
                        {productForm.assetType
                          ? assetTypes.find((at) => at.asset_type_id === productForm.assetType)?.text || 'Select Asset Type'
                          : 'Select Asset Type'}
                        <ChevronDown className="ml-2 w-4 h-4 text-gray-500" />
                      </button>
                      {showDropdownProduct && (
                        <div
                          className="absolute left-0 right-0 mt-1 bg-white border rounded shadow-lg max-h-48 overflow-y-auto z-10"
                          style={{ minWidth: '100%' }}
                        >
                          <div className="sticky top-0 bg-white px-2 py-2 border-b z-20">
                            <input
                              type="text"
                              className="w-full border px-2 py-1 rounded text-xs"
                              placeholder="Search Asset Types..."
                              value={searchAssetTypeProduct}
                              onChange={e => setSearchAssetTypeProduct(e.target.value)}
                              autoFocus
                            />
                          </div>
                          {assetTypes
                            .filter(at => at.text.toLowerCase().includes(searchAssetTypeProduct.toLowerCase()))
                            .map((at) => (
                              <div
                                key={at.asset_type_id}
                                className={`px-4 py-2 cursor-pointer hover:bg-gray-100 text-xs ${productForm.assetType === at.asset_type_id ? 'bg-gray-200' : ''}`}
                                onClick={() => {
                                  setProductForm(f => ({ ...f, assetType: at.asset_type_id }));
                                  setShowDropdownProduct(false);
                                  setSearchAssetTypeProduct('');
                                }}
                              >
                                {at.text}
                              </div>
                            ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col min-w-[140px]">
                    <label className="text-xs mb-1">
                      Brand <span className="text-red-500">*</span>
                    </label>
                    {/* Product Form Brand Dropdown */}
                    <input 
                      className={`border rounded px-2 py-1 w-full ${isProductFieldInvalid(productForm.brand) ? 'border-red-500' : 'border-gray-300'}`}
                      value={productForm.brand} 
                      onChange={e => setProductForm(f => ({ ...f, brand: e.target.value }))} 
                      placeholder="Enter Brand" 
                    />
                  </div>
                  <div className="flex flex-col min-w-[140px]">
                    <label className="text-xs mb-1">
                      Model <span className="text-red-500">*</span>
                    </label>
                    {/* Product Form Model Dropdown */}
                    <input 
                      className={`border rounded px-2 py-1 w-full ${isProductFieldInvalid(productForm.model) ? 'border-red-500' : 'border-gray-300'}`}
                      value={productForm.model} 
                      onChange={e => setProductForm(f => ({ ...f, model: e.target.value }))} 
                      placeholder="Enter Model" 
                    />
                  </div>
                  <button
                    className="bg-[#003366] text-white px-6 rounded h-[34px] flex items-center justify-center min-w-[80px]"
                    onClick={handleProductAdd}
                    type="button"
                  >
                    Add
                  </button>
                </div>
                {/* Product List */}
                <div
                  className={`bg-white rounded shadow mb-8 transition-all duration-300 ${isProductTableMaximized ? 'fixed inset-0 z-50 p-6 m-6 overflow-auto' : ''}`}
                >
                  <div className="bg-[#EDF3F7] px-4 py-2 rounded-t text-[#0E2F4B] font-semibold text-sm flex items-center justify-between">
                    Product List
                    <button onClick={() => setIsProductTableMaximized((prev) => !prev)}>
                      {isProductTableMaximized ? (
                        <Minimize className="text-[#0E2F4B]" size={18} />
                      ) : (
                        <Maximize className="text-[#0E2F4B]" size={18} />
                      )}
                    </button>
                  </div>
                  <div className="p-4">
                    <div className="flex items-center mb-2">
                      <label className="text-xs mr-2">Asset Type</label>
                      {/* Product Filter Asset Type Dropdown */}
                      <div className="relative w-64">
                        <button
                          className="border text-black px-3 py-2 text-xs w-full bg-white focus:outline-none flex justify-between items-center"
                          type="button"
                          onClick={() => setShowDropdownProductFilter((prev) => !prev)}
                        >
                          {productFilter
                            ? assetTypes.find((at) => at.asset_type_id === productFilter)?.text || 'All Asset Types'
                            : 'All Asset Types'}
                          <ChevronDown className="ml-2 w-4 h-4 text-gray-500" />
                        </button>
                        {showDropdownProductFilter && (
                          <div
                            className="absolute left-0 right-0 mt-1 bg-white border rounded shadow-lg max-h-48 overflow-y-auto z-10"
                            style={{ minWidth: '100%' }}
                          >
                            <div className="sticky top-0 bg-white px-2 py-2 border-b z-20">
                              <input
                                type="text"
                                className="w-full border px-2 py-1 rounded text-xs"
                                placeholder="Search Asset Types..."
                                value={searchAssetTypeProductFilter}
                                onChange={e => setSearchAssetTypeProductFilter(e.target.value)}
                                autoFocus
                              />
                            </div>
                            {assetTypes
                              .filter(at => at.text.toLowerCase().includes(searchAssetTypeProductFilter.toLowerCase()))
                              .map((at) => (
                                <div
                                  key={at.asset_type_id}
                                  className={`px-4 py-2 cursor-pointer hover:bg-gray-100 text-xs ${productFilter === at.asset_type_id ? 'bg-gray-200' : ''}`}
                                  onClick={() => {
                                    setProductFilter(at.asset_type_id);
                                    setShowDropdownProductFilter(false);
                                    setSearchAssetTypeProductFilter('');
                                  }}
                                >
                                  {at.text}
                                </div>
                              ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="bg-[#0E2F4B] text-white text-sm">
                      <div className="grid grid-cols-4 px-4 py-2 font-semibold border-b-4 border-yellow-400">
                        <div>Asset Type</div>
                        <div>Brand</div>
                        <div>Model</div>
                        <div className="text-center">Actions</div>
                      </div>
                      <div>
                        {products
                          .filter(p => !productFilter || [p.assetType, p.asset_type_id].includes(productFilter))
                          .map((p, i) => (
                            <div
                              key={i}
                              className={`grid grid-cols-4 px-4 py-2 items-center border-b ${i % 2 === 0 ? 'bg-white' : 'bg-gray-100'} text-gray-800`}
                            >
                              <div className="whitespace-normal break-words max-w-xs px-2 py-1">{assetTypes.find(at => at.asset_type_id === (p.assetType || p.asset_type_id))?.text || p.assetType || p.asset_type_id}</div>
                              <div className="whitespace-normal break-words max-w-xs px-2 py-1">{p.brand}</div>
                              <div className="whitespace-normal break-words max-w-xs px-2 py-1">{p.model}</div>
                              <div className="flex justify-center gap-2">
                                <button 
                                  className="cursor-pointer p-1 hover:bg-gray-100 rounded-full" 
                                  title="Delete" 
                                  onClick={() => {
                                    console.log("Delete product clicked", p);
                                    console.log("Current modal state before:", showDeleteModal);
                                    openDeleteModal(p, 'product');
                                    console.log("Current modal state after:", showDeleteModal);
                                    console.log("Current itemToDelete:", itemToDelete);
                                  }}
                                >
                                  <Trash2 className="text-yellow-500" size={18} />
                                </button>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Service Form */}
                <div className="flex flex-wrap items-end gap-4 mb-6">
                  <div className="flex flex-col">
                    <label className="text-xs mb-1">
                      Asset Type <span className="text-red-500">*</span>
                    </label>
                    {/* Service Form Asset Type Dropdown */}
                    <div className="relative w-64">
                      <button
                        className={`border text-black px-3 py-2 text-xs w-full bg-white focus:outline-none flex justify-between items-center ${isServiceFieldInvalid(serviceForm.assetType) ? 'border-red-500' : 'border-gray-300'}`}
                        type="button"
                        onClick={() => setShowDropdownService((prev) => !prev)}
                      >
                        {serviceForm.assetType
                          ? assetTypes.find((at) => at.asset_type_id === serviceForm.assetType)?.text || 'Select Asset Type'
                          : 'Select Asset Type'}
                        <ChevronDown className="ml-2 w-4 h-4 text-gray-500" />
                      </button>
                      {showDropdownService && (
                        <div
                          className="absolute left-0 right-0 mt-1 bg-white border rounded shadow-lg max-h-48 overflow-y-auto z-10"
                          style={{ minWidth: '100%' }}
                        >
                          <div className="sticky top-0 bg-white px-2 py-2 border-b z-20">
                            <input
                              type="text"
                              className="w-full border px-2 py-1 rounded text-xs"
                              placeholder="Search Asset Types..."
                              value={searchAssetTypeService}
                              onChange={e => setSearchAssetTypeService(e.target.value)}
                              autoFocus
                            />
                          </div>
                          {assetTypes
                            .filter(at => at.text.toLowerCase().includes(searchAssetTypeService.toLowerCase()))
                            .map((at) => (
                              <div
                                key={at.asset_type_id}
                                className={`px-4 py-2 cursor-pointer hover:bg-gray-100 text-xs ${serviceForm.assetType === at.asset_type_id ? 'bg-gray-200' : ''}`}
                                onClick={() => {
                                  setServiceForm(f => ({ ...f, assetType: at.asset_type_id }));
                                  setShowDropdownService(false);
                                  setSearchAssetTypeService('');
                                }}
                              >
                                {at.text}
                              </div>
                            ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col min-w-[140px]">
                    <label className="text-xs mb-1">
                      Description <span className="text-red-500">*</span>
                    </label>
                    <input
                      className={`border rounded px-2 py-1 w-full ${isServiceFieldInvalid(serviceForm.description) ? 'border-red-500' : 'border-gray-300'}`}
                      value={serviceForm.description}
                      onChange={e => setServiceForm(f => ({ ...f, description: e.target.value }))}
                      placeholder="Enter Description"
                    />
                  </div>
                  <button
                    className="bg-[#003366] text-white px-6 rounded h-[34px] flex items-center justify-center min-w-[80px]"
                    onClick={handleServiceAdd}
                    type="button"
                  >
                    Add
                  </button>
                </div>
                {/* Service List */}
                <div
                  className={`bg-white rounded shadow mb-8 transition-all duration-300 ${isServiceTableMaximized ? 'fixed inset-0 z-50 p-6 m-6 overflow-auto' : ''}`}
                >
                  <div className="bg-[#EDF3F7] px-4 py-2 rounded-t text-[#0E2F4B] font-semibold text-sm flex items-center justify-between">
                    Service List
                    <button onClick={() => setIsServiceTableMaximized((prev) => !prev)}>
                      {isServiceTableMaximized ? (
                        <Minimize className="text-[#0E2F4B]" size={18} />
                      ) : (
                        <Maximize className="text-[#0E2F4B]" size={18} />
                      )}
                    </button>
                  </div>
                  <div className="p-4">
                    <div className="flex items-center mb-2">
                      <label className="text-xs mr-2">Asset Type</label>
                      {/* Service Filter Asset Type Dropdown */}
                      <div className="relative w-64">
                        <button
                          className="border text-black px-3 py-2 text-xs w-full bg-white focus:outline-none flex justify-between items-center"
                          type="button"
                          onClick={() => setShowDropdownServiceFilter((prev) => !prev)}
                        >
                          {serviceFilter
                            ? assetTypes.find((at) => at.asset_type_id === serviceFilter)?.text || 'All Asset Types'
                            : 'All Asset Types'}
                          <ChevronDown className="ml-2 w-4 h-4 text-gray-500" />
                        </button>
                        {showDropdownServiceFilter && (
                          <div
                            className="absolute left-0 right-0 mt-1 bg-white border rounded shadow-lg max-h-48 overflow-y-auto z-10"
                            style={{ minWidth: '100%' }}
                          >
                            <div className="sticky top-0 bg-white px-2 py-2 border-b z-20">
                              <input
                                type="text"
                                className="w-full border px-2 py-1 rounded text-xs"
                                placeholder="Search Asset Types..."
                                value={searchAssetTypeServiceFilter}
                                onChange={e => setSearchAssetTypeServiceFilter(e.target.value)}
                                autoFocus
                              />
                            </div>
                            {assetTypes
                              .filter(at => at.text.toLowerCase().includes(searchAssetTypeServiceFilter.toLowerCase()))
                              .map((at) => (
                                <div
                                  key={at.asset_type_id}
                                  className={`px-4 py-2 cursor-pointer hover:bg-gray-100 text-xs ${serviceFilter === at.asset_type_id ? 'bg-gray-200' : ''}`}
                                  onClick={() => {
                                    setServiceFilter(at.asset_type_id);
                                    setShowDropdownServiceFilter(false);
                                    setSearchAssetTypeServiceFilter('');
                                  }}
                                >
                                  {at.text}
                                </div>
                              ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="bg-[#0E2F4B] text-white text-sm">
                      <div className="grid grid-cols-3 px-4 py-2 font-semibold border-b-4 border-yellow-400">
                        <div>Asset Type</div>
                        <div>Description</div>
                        <div className="text-center">Actions</div>
                      </div>
                      <div>
                        {services
                          .filter(s => !serviceFilter || [s.assetType, s.asset_type_id].includes(serviceFilter))
                          .map((s, i) => (
                            <div
                              key={i}
                              className={`grid grid-cols-3 px-4 py-2 items-center border-b ${i % 2 === 0 ? 'bg-white' : 'bg-gray-100'} text-gray-800`}
                            >
                              <div className="whitespace-normal break-words max-w-xs px-2 py-1">{assetTypes.find(at => at.asset_type_id === (s.assetType || s.asset_type_id))?.text || s.assetType || s.asset_type_id}</div>
                              <div className="whitespace-normal break-words max-w-xs px-2 py-1">{s.description}</div>
                              <div className="flex justify-center gap-2">
                                <button 
                                  className="cursor-pointer p-1 hover:bg-gray-100 rounded-full" 
                                  title="Delete" 
                                  onClick={() => {
                                    console.log("Delete service clicked", s);
                                    openDeleteModal(s, 'service');
                                  }}
                                >
                                  <Trash2 className="text-yellow-500" size={18} />
                                </button>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal 
        show={showDeleteModal}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        message={
          itemToDelete?.type === 'product'
            ? `Are you sure you want to delete product: ${itemToDelete?.brand} ${itemToDelete?.model}?`
            : `Are you sure you want to delete service: ${itemToDelete?.description}?`
        }
      />

      {/* Dependencies Modal */}
      {showDependencyModal && (
        <div className="fixed inset-0 bg-black bg-opacity-30 backdrop-blur-sm flex justify-center items-center z-50">
          <div className="bg-white w-[600px] rounded shadow-lg">
            {/* Header */}
            <div className="bg-[#003b6f] text-white font-semibold px-6 py-3 flex justify-between items-center rounded-t">
              <span>Cannot Delete - Dependencies Found</span>
              <button
                onClick={() => {
                  setShowDependencyModal(false);
                  setDependencies(null);
                  _setDeleteOption('');
                }}
                className="text-yellow-400 text-xl font-bold"
              >
                ×
              </button>
            </div>

            {/* Divider */}
            <div className="h-[3px] bg-[#ffc107]" />

            {/* Body */}
            <div className="px-6 py-4">
              <div className="mb-4">
                <p className="text-red-600 font-medium mb-2">
                  This {itemToDelete?.type} cannot be deleted because it is being used by:
                </p>
                <ul className="list-disc pl-5 text-gray-700">
                  {dependencies?.vendors.map((vendor, index) => (
                    <li key={index}>{vendor.vendor_name}</li>
                  ))}
                </ul>
              </div>

              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
                <p className="text-sm text-yellow-700">
                  <span className="font-bold">Options:</span>
                  <br />
                  1. Remove this {itemToDelete?.type} from all vendors first and then delete
                  <br />
                  2. View the vendors using this {itemToDelete?.type} and manage their assignments
                </p>
              </div>

              <div className="flex flex-col gap-2">
                <button
                  onClick={async () => {
                    try {
                      console.log('Navigating to vendors page...');
                      setShowDependencyModal(false);
                      
                      // Navigate first
                      await navigate('/master-data/vendors');
                      
                      // Show toast after navigation
                      toast(`Please remove the ${itemToDelete?.type} from the listed vendors first`, {
                        duration: 5000,
                        icon: 'ℹ️'
                      });
                      
                      console.log('Navigation completed');
                    } catch (error) {
                      console.error('Navigation error:', error);
                      toast.error('Failed to navigate to vendors page. Please try again.');
                    }
                  }}
                  className="w-full text-left px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded flex items-center gap-2"
                >
                  <span>➡️ Go to Vendor Management</span>
                  <span className="text-sm text-blue-600">(to remove associations)</span>
                </button>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 px-6 py-4 bg-gray-50 rounded-b">
              <button
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded"
                onClick={() => {
                  setShowDependencyModal(false);
                  setDependencies(null);
                  _setDeleteOption('');
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
