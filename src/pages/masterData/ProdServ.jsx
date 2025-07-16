import React, { useState, useEffect, useRef } from 'react';
import { Trash2, Eye, ChevronDown, Maximize, Minimize } from 'lucide-react';
import API from '../../lib/axios';

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

const tableHeader = 'bg-[#003366] text-white text-left text-sm font-semibold';
const tableRow = 'text-sm text-gray-800';
const tableAltRow = 'bg-gray-100';
const borderBottom = 'border-b-2 border-[#FFC107]';

const initialProducts = [
  { assetType: 'Laptop', brand: 'Lenovo', model: 'L 410', description: 'Lenovo' },
  { assetType: 'Laptop', brand: 'Lenovo', model: 'L 512', description: 'Lenovo' },
  { assetType: 'Monitor', brand: 'BenQ', model: 'B 365', description: 'BenQ' },
  { assetType: 'Mouse', brand: 'Lenovo', model: 'L 190', description: 'Lenovo' },
];
const initialServices = [
  { assetType: 'Laptop', description: 'Lenovo' },
  { assetType: 'Laptop', description: 'Lenovo' },
  { assetType: 'Monitor', description: 'BenQ' },
  { assetType: 'Mouse', description: 'Lenovo' },
];

export default function ProdServ() {
  const [tab, setTab] = useState('product');
  const [productForm, setProductForm] = useState({ assetType: '', brand: '', model: '' });
  const [serviceForm, setServiceForm] = useState({ assetType: '', description: '' });
  const [products, setProducts] = useState(initialProducts);
  const [services, setServices] = useState(initialServices);
  const [productFilter, setProductFilter] = useState('');
  const [serviceFilter, setServiceFilter] = useState('');

  // Asset types for dropdown
  const [assetTypes, setAssetTypes] = useState([]);
  const [searchAssetType, setSearchAssetType] = useState('');
  const dropdownRef = useRef(null);
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

  useEffect(() => {
    const fetchAssetTypes = async () => {
      try {
        const res = await API.get('/dept-assets/asset-types');
        setAssetTypes(res.data);
      } catch (err) {
        setAssetTypes([]);
      }
    };
    fetchAssetTypes();
  }, []);

  // Add useEffect for fetching products and services
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        // Placeholder API endpoint for fetching products
        const res = await API.get('/products');
        setProducts(res.data);
      } catch (err) {
        setProducts([]);
      }
    };
    const fetchServices = async () => {
      try {
        // Placeholder API endpoint for fetching services
        const res = await API.get('/services');
        setServices(res.data);
      } catch (err) {
        setServices([]);
      }
    };
    fetchProducts();
    fetchServices();
  }, []);

  // Update handleProductAdd to use API
  const handleProductAdd = async () => {
    if (!productForm.assetType || !productForm.brand || !productForm.model) return;
    try {
      // Placeholder API endpoint for creating a product
      const res = await API.post('/products', {
        asset_type_id: productForm.assetType,
        brand: productForm.brand,
        model: productForm.model,
      });
      setProducts(prev => [...prev, res.data]);
      setProductForm({ assetType: '', brand: '', model: '' });
    } catch (err) {
      // Optionally handle error
    }
  };

  // Update handleServiceAdd to use API
  const handleServiceAdd = async () => {
    if (!serviceForm.assetType || !serviceForm.description) return;
    try {
      // Placeholder API endpoint for creating a service
      const res = await API.post('/services', {
        asset_type_id: serviceForm.assetType,
        description: serviceForm.description,
      });
      setServices(prev => [...prev, res.data]);
      setServiceForm({ assetType: '', description: '' });
    } catch (err) {
      // Optionally handle error
    }
  };

  // Add delete handlers for products and services
  const handleDeleteProduct = async (product) => {
    try {
      // Placeholder API endpoint for deleting a product
      await API.delete(`/products/${product.id}`);
      setProducts(prev => prev.filter(p => p.id !== product.id));
    } catch (err) {
      // Optionally handle error
    }
  };

  const handleDeleteService = async (service) => {
    try {
      // Placeholder API endpoint for deleting a service
      await API.delete(`/services/${service.id}`);
      setServices(prev => prev.filter(s => s.id !== service.id));
    } catch (err) {
      // Optionally handle error
    }
  };

  return (
    <>
      <style>{placeholderStyle}</style>
      <div className='p-3'>
        <div className="max-w-7xl mx-auto bg-white rounded shadow-lg">
          <div className="bg-[#003366] text-white text-base font-semibold py-3 px-6 rounded-t flex items-center justify-center border-b-4 border-[#FFC107]">
            Product / Service
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
                <div className="flex items-center gap-4 mb-6">
                  <div className="flex flex-col">
                    <label className="text-xs mb-1">Asset Type</label>
                    {/* Product Form Asset Type Dropdown */}
                    <div className="relative w-64">
                      <button
                        className="border text-black px-3 py-2 text-xs w-full bg-white focus:outline-none flex justify-between items-center"
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
                  <div className="flex flex-col">
                    <label className="text-xs mb-1">Brand</label>
                    <input
                      className="border rounded px-2 py-1 min-w-[140px]"
                      value={productForm.brand}
                      onChange={e => setProductForm(f => ({ ...f, brand: e.target.value }))}
                      placeholder="Enter Brand"
                    />
                  </div>
                  <div className="flex flex-col">
                    <label className="text-xs mb-1">Model</label>
                    <input
                      className="border rounded px-2 py-1 min-w-[140px]"
                      value={productForm.model}
                      onChange={e => setProductForm(f => ({ ...f, model: e.target.value }))}
                      placeholder="Enter Model"
                    />
                  </div>
                  <button
                    className="ml-2 bg-[#003366] text-white px-6 py-2 rounded mt-5"
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
                      <div className="grid grid-cols-5 px-4 py-2 font-semibold border-b-4 border-yellow-400">
                        <div>Asset Type</div>
                        <div>Brand</div>
                        <div>Model</div>
                        <div>Description</div>
                        <div className="text-center">Actions</div>
                      </div>
                      <div>
                        {products
                          .filter(p => !productFilter || p.assetType === productFilter)
                          .map((p, i) => (
                            <div
                              key={i}
                              className={`grid grid-cols-5 px-4 py-2 items-center border-b ${i % 2 === 0 ? 'bg-white' : 'bg-gray-100'} text-gray-800`}
                            >
                              <div>{p.assetType}</div>
                              <div>{p.brand}</div>
                              <div>{p.model}</div>
                              <div>{p.description}</div>
                              <div className="flex justify-center gap-2">
                                <span className="cursor-pointer" title="View">
                                  <Eye className="text-[#0E2F4B]" size={18} />
                                </span>
                                <span className="cursor-pointer" title="Delete" onClick={() => handleDeleteProduct(p)}>
                                  <Trash2 className="text-yellow-500" size={18} />
                                </span>
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
                <div className="flex items-center gap-4 mb-6">
                  <div className="flex flex-col">
                    <label className="text-xs mb-1">Asset Type</label>
                    {/* Service Form Asset Type Dropdown */}
                    <div className="relative w-64">
                      <button
                        className="border text-black px-3 py-2 text-xs w-full bg-white focus:outline-none flex justify-between items-center"
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
                  <div className="flex flex-col">
                    <label className="text-xs mb-1">Description</label>
                    <input
                      className="border rounded px-2 py-1 min-w-[140px]"
                      value={serviceForm.description}
                      onChange={e => setServiceForm(f => ({ ...f, description: e.target.value }))}
                      placeholder="Enter Description"
                    />
                  </div>
                  <button
                    className="ml-2 bg-[#003366] text-white px-6 py-2 rounded mt-5"
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
                          .filter(s => !serviceFilter || s.assetType === serviceFilter)
                          .map((s, i) => (
                            <div
                              key={i}
                              className={`grid grid-cols-3 px-4 py-2 items-center border-b ${i % 2 === 0 ? 'bg-white' : 'bg-gray-100'} text-gray-800`}
                            >
                              <div>{s.assetType}</div>
                              <div>{s.description}</div>
                              <div className="flex justify-center gap-2">
                                <span className="cursor-pointer" title="View">
                                  <Eye className="text-[#0E2F4B]" size={18} />
                                </span>
                                <span className="cursor-pointer" title="Delete" onClick={() => handleDeleteService(s)}>
                                  <Trash2 className="text-yellow-500" size={18} />
                                </span>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
            {/* Footer Buttons */}
            <div className="flex justify-end gap-2 pb-8">
              <button className="bg-gray-300 text-gray-700 px-6 py-2 rounded" type="button">Cancel</button>
              <button className="bg-[#003366] text-white px-6 py-2 rounded" type="button">Save</button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
