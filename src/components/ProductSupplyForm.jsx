import { useEffect, useState } from "react";
import { Maximize, Minimize, Trash2 } from "lucide-react";
import API from "../lib/axios";
import { useAuthStore } from "../store/useAuthStore";
import { v4 as uuidv4 } from "uuid";
import SearchableDropdown from "./ui/SearchableDropdown";

const ProductSupplyForm = ({ vendorId, orgId }) => {
  // Debug logs
  console.log('ProductSupplyForm render:', { vendorId, orgId });
  const [assetTypes, setAssetTypes] = useState([]);
  const [brands, setBrands] = useState([]);
  const [models, setModels] = useState([]);

  const [products, setProducts] = useState([]);
  const [form, setForm] = useState({ assetType: "", brand: "", model: "", description: "" });
  const [maximized, setMaximized] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  // Fetch brands when assetType changes
  useEffect(() => {
    if (form.assetType) {
      API.get(`/brands?assetTypeId=${form.assetType}`)
        .then(res => setBrands(res.data))
        .catch(() => setBrands([]));
      setForm(prev => ({ ...prev, brand: "", model: "" }));
      setModels([]);
    } else {
      setBrands([]);
      setModels([]);
      setForm(prev => ({ ...prev, brand: "", model: "" }));
    }
  }, [form.assetType]);

  // Fetch models when brand changes
  useEffect(() => {
    if (form.assetType && form.brand) {
      API.get(`/models?assetTypeId=${form.assetType}&brand=${encodeURIComponent(form.brand)}`)
        .then(res => setModels(res.data))
        .catch(() => setModels([]));
      setForm(prev => ({ ...prev, model: "" }));
    } else {
      setModels([]);
      setForm(prev => ({ ...prev, model: "" }));
    }
  }, [form.brand, form.assetType]);

  useEffect(() => {
    fetchAssetTypes();
  }, []);

  // On mount, load products from sessionStorage
  useEffect(() => {
    const stored = sessionStorage.getItem('products');
    if (stored) setProducts(JSON.parse(stored));
  }, []);

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

  // Remove fetchProducts and handleAdd API calls for create/fetch. Use local state for products.
  // On Add, append the new product to products state.
  // Table renders from products state only.
  // Keep dropdown API logic for brands/models/asset types.

  // In handleAdd, after updating products, also update sessionStorage
  const handleAdd = () => {
    setSubmitAttempted(true);
    if (!form.assetType || !form.brand || !form.model) return;

    // Debug: log selected assetType and assetTypes
    console.log("form.assetType:", form.assetType);
    console.log("assetTypes:", assetTypes);

    // Find the selected asset type object by asset_type_id
    const selectedAsset = assetTypes.find((t) => String(t.asset_type_id) === String(form.assetType));
    if (!selectedAsset) {
      alert("Invalid asset type selected");
      return;
    }

    // Log what will be sent
    console.log("Submitting:", {
      assetType: selectedAsset.asset_type_id,
      brand: form.brand,
      model: form.model,
      description: form.description || form.brand,
      ps_type: 'product' // send asset type text as ps_type
    });

    try {
      const newProducts = [...products, { assetType: selectedAsset.asset_type_id, brand: form.brand, model: form.model, description: form.description || form.brand }];
      setProducts(newProducts);
      sessionStorage.setItem('products', JSON.stringify(newProducts));
      setForm({ assetType: "", brand: "", model: "", description: "" });
    } catch (err) {
      alert("Failed to add product supply: " + (err.response?.data?.error || err.message));
    }
  };


  // In handleDelete, after updating products, also update sessionStorage
  const handleDelete = (idx) => {
    const newProducts = products.filter((_, i) => i !== idx);
    setProducts(newProducts);
    sessionStorage.setItem('products', JSON.stringify(newProducts));
  };

  // Helper for invalid field
  const isFieldInvalid = (val) => submitAttempted && !val;

  // Table card content
  const tableCard = (
    <div className="bg-[#F5F8FA] rounded shadow border relative">
      <div className="px-4 py-2 font-semibold text-[#0E2F4B] text-base border-b border-[#FFC107] flex items-center justify-between">
        <span>Product List</span>
        <button
          type="button"
          onClick={() => setMaximized((m) => !m)}
          className="ml-2 text-[#0E2F4B] hover:text-[#FFC107] focus:outline-none"
          title={maximized ? "Minimize" : "Maximize"}
        >
          {maximized ? (
            <Minimize className="h-5 w-5" />
          ) : (
            <Maximize className="h-5 w-5" />
          )}
        </button>
      </div>
      <div className={`overflow-x-auto overflow-y-auto ${maximized ? 'h-full' : 'max-h-[260px]'}`}>{/* Adjust max-h-80 as needed */}
        <table className="min-w-full">
          <thead>
            <tr className="bg-[#0E2F4B] text-white sticky top-0 z-10"> {/* Added sticky top-0 */}
              <th className="px-6 py-3 text-left text-sm font-medium">Asset Type</th>
              <th className="px-6 py-3 text-left text-sm font-medium">Brand</th>
              <th className="px-6 py-3 text-left text-sm font-medium">Model</th>
              <th className="px-6 py-3 text-left text-sm font-medium">Description</th>
              <th className="px-6 py-3 text-center text-sm font-medium w-20"></th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {products.map((p, idx) => (
              <tr key={idx} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                <td className="px-6 py-2 text-sm text-gray-900">
                  {p.assetType}
                </td>

                <td className="px-6 py-2 text-sm text-gray-900">{p.brand}</td>
                <td className="px-6 py-2 text-sm text-gray-900">{p.model}</td>
                <td className="px-6 py-2 text-sm text-gray-900">{p.description}</td>
                <td className="px-6 py-2 text-center">
                  <button
                    onClick={() => handleDelete(idx)}
                    className="text-yellow-500 hover:text-red-600 transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4 inline" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  );

  // Done button logic
  const handleDone = async () => {
    try {
      console.log('handleDone called', { vendorId, orgId, products });
      if (!vendorId || !orgId) {
        alert("Vendor must be created first.");
        return;
      }
      let productsFromStorage;
      try {
        productsFromStorage = JSON.parse(sessionStorage.getItem('products') || '[]');
      } catch (parseErr) {
        console.error('Error parsing products from sessionStorage:', parseErr);
        alert('Error reading products from local storage.');
        return;
      }
      if (!Array.isArray(productsFromStorage)) {
        console.error('productsFromStorage is not an array:', productsFromStorage);
        alert('Internal error: products data is invalid.');
        return;
      }
      let prodServIds = [];
      for (const p of productsFromStorage) {
        try {
          const res = await API.get('/prodserv');
          const match = Array.isArray(res.data)
            ? res.data.find(row => row.asset_type_id === p.assetType && row.brand === p.brand && row.model === p.model)
            : null;
          if (match && match.prod_serv_id) prodServIds.push(match.prod_serv_id);
          else {
            console.warn('No matching prod_serv_id found for product:', p);
            alert(`No matching product found in master list for: ${p.assetType}, ${p.brand}, ${p.model}`);
          }
        } catch (apiErr) {
          console.error('Error fetching /prodserv for product:', p, apiErr);
          alert('Error looking up product in master list.');
        }
      }
      prodServIds = [...new Set(prodServIds)];
      for (const prod_serv_id of prodServIds) {
        try {
          await API.post('/vendor-prod-services', {
            ext_id: uuidv4(),
            prod_serv_id,
            vendor_id: vendorId,
            org_id: orgId
          });
        } catch (postErr) {
          console.error('Error posting to /vendor-prod-services:', postErr);
          alert('Error linking vendor to product.');
        }
      }
      alert('Vendor-Product links created successfully!');
    } catch (err) {
      console.error('Unexpected error in handleDone:', err);
      alert('Unexpected error occurred. See console for details.');
    }
  };

  return (
    <div className="pb-6">
      {/* Add Product Row */}
      <div className="flex items-end gap-4 mb-8">
        <div>
          <label className="block text-sm text-gray-700 mb-2">
            Asset Type <span className="text-red-500">*</span>
          </label>
          <SearchableDropdown
            options={assetTypes}
            value={form.assetType}
            onChange={(value) => handleChange({ target: { name: "assetType", value }})}
            placeholder="Select Asset Type"
            searchPlaceholder="Search Asset Types..."
            createNewText="Create New"
            createNewPath="/master-data/asset-types"
            className={`w-48 ${isFieldInvalid(form.assetType) ? 'border border-red-500' : ''}`}
            displayKey="text"
            valueKey="asset_type_id"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-700 mb-2">
            Brand <span className="text-red-500">*</span>
          </label>
          <SearchableDropdown
            options={brands.map(brand => ({ id: brand, text: brand }))}
            value={form.brand}
            onChange={(value) => handleChange({ target: { name: "brand", value }})}
            placeholder="Select Brand"
            searchPlaceholder="Search Brands..."
            disabled={!form.assetType}
            className={`w-48 ${isFieldInvalid(form.brand) ? 'border border-red-500' : ''}`}
            displayKey="text"
            valueKey="id"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-700 mb-2">
            Model <span className="text-red-500">*</span>
          </label>
          <SearchableDropdown
            options={models.map(model => ({ id: model, text: model }))}
            value={form.model}
            onChange={(value) => handleChange({ target: { name: "model", value }})}
            placeholder="Select Model"
            searchPlaceholder="Search Models..."
            disabled={!form.brand}
            className={`w-48 ${isFieldInvalid(form.model) ? 'border border-red-500' : ''}`}
            displayKey="text"
            valueKey="id"
          />
        </div>


        <button
          type="button"
          onClick={handleAdd}
          className="bg-[#0E2F4B] text-white px-6 py-1 rounded hover:bg-[#1e40af] transition-colors"
        >
          Add
        </button>
      </div>
      {/* Product List Table with maximize/minimize */}
      {maximized ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
          <div className="w-full h-full flex items-center justify-center">
            <div className="bg-white w-11/12 h-5/6 rounded shadow-lg overflow-auto p-4 relative">
              {tableCard}
            </div>
          </div>
        </div>
      ) : (
        tableCard
      )}
      {/* Debug: show products in UI */}
      {/* Remove the <pre> block that displays debug info in the UI. */}
      {/* Just keep the console.log for debugging. */}
      {/* Do not render the <pre> block in the return statement. */}
      {vendorId && orgId && products.length > 0 && (
        <div className="flex justify-end mt-8">
          <button
            type="button"
            className="bg-green-600 text-white px-8 py-2 rounded text-base font-medium hover:bg-green-700 transition"
            onClick={handleDone}
          >
            Done
          </button>
        </div>
      )}
    </div>
  );
};

export default ProductSupplyForm; 