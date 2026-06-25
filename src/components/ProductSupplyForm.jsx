import { showBackendTextToast } from '../utils/errorTranslation';
import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Maximize, Minimize, Trash2 } from "lucide-react";
import API from "../lib/axios";
import { useAuthStore } from "../store/useAuthStore";
import { v4 as uuidv4 } from "uuid";
import SearchableDropdown from "./ui/SearchableDropdown";
import { toast } from "react-hot-toast";
import { useLanguage } from "../contexts/LanguageContext";

const ProductSupplyForm = ({
  vendorId,
  orgId,
  vendorSaved = false,
  onSaveTrigger,
  onTabSaved,
  onPersistVendorDraft,
}) => {
  // Debug logs
  console.log('ProductSupplyForm render:', { vendorId, orgId });
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [assetTypes, setAssetTypes] = useState([]);
  const [brands, setBrands] = useState([]);
  const [models, setModels] = useState([]);

  const [products, setProducts] = useState([]);
  const [form, setForm] = useState({ assetType: "", brand: "", model: "", description: "" });
  const [maximized, setMaximized] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    
    // Reset validation state when user starts typing
    if (submitAttempted) {
      setSubmitAttempted(false);
    }
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

  const refreshBrands = useCallback(async (assetTypeId) => {
    if (!assetTypeId) {
      setBrands([]);
      return;
    }
    try {
      const res = await API.get(`/brands?assetTypeId=${assetTypeId}`);
      setBrands(res.data);
    } catch {
      setBrands([]);
    }
  }, []);

  const refreshModels = useCallback(async (assetTypeId, brand) => {
    if (!assetTypeId || !brand) {
      setModels([]);
      return;
    }
    try {
      const res = await API.get(
        `/models?assetTypeId=${assetTypeId}&brand=${encodeURIComponent(brand)}`
      );
      setModels(res.data);
    } catch {
      setModels([]);
    }
  }, []);

  const goToProdServ = (focus) => {
    if (!form.assetType) return;
    onPersistVendorDraft?.("Product Details");
    sessionStorage.setItem(
      'vendorProductDraft',
      JSON.stringify({ ...form, returnTab: 'Product Details' })
    );
    sessionStorage.setItem('vendorProductReturnTab', 'Product Details');
    const params = new URLSearchParams({
      assetType: form.assetType,
      focus,
      returnTo: 'vendor-add',
    });
    if (focus === 'model' && form.brand) {
      params.set('brand', form.brand);
    }
    navigate(`/master-data/prod-serv?${params.toString()}`);
  };

  const goToAddAssetType = () => {
    onPersistVendorDraft?.("Product Details");
    sessionStorage.setItem("vendorProductReturnTab", "Product Details");
    navigate("/master-data/asset-types/add");
  };

  useEffect(() => {
    const draft = sessionStorage.getItem('vendorProductDraft');
    if (!draft) return;
    try {
      const parsed = JSON.parse(draft);
      if (parsed.assetType) {
        setForm((prev) => ({
          ...prev,
          assetType: parsed.assetType,
          brand: parsed.brand || prev.brand,
          model: parsed.model || prev.model,
        }));
        refreshBrands(parsed.assetType);
        if (parsed.brand) {
          refreshModels(parsed.assetType, parsed.brand);
        }
      }
      sessionStorage.removeItem('vendorProductDraft');
    } catch {
      sessionStorage.removeItem('vendorProductDraft');
    }
  }, [refreshBrands, refreshModels]);

  // On mount, load products from sessionStorage
  useEffect(() => {
    const stored = sessionStorage.getItem('products');
    if (stored) setProducts(JSON.parse(stored));
  }, []);

  // Listen for save trigger from parent
  useEffect(() => {
    if (onSaveTrigger === 'Product Details') {
      handleDone();
    }
  }, [onSaveTrigger]);

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
    // Check if required fields are filled before setting submitAttempted
    if (!form.assetType || !form.brand || !form.model) {
      setSubmitAttempted(true);
      return;
    }

    // Debug: log selected assetType and assetTypes
    console.log("form.assetType:", form.assetType);
    console.log("assetTypes:", assetTypes);

    // Find the selected asset type object by asset_type_id
    const selectedAsset = assetTypes.find((t) => String(t.asset_type_id) === String(form.assetType));
    if (!selectedAsset) {
      showBackendTextToast({
        toast,
        tmdId: 'TMD_I18N_VENDORS_INVALIDASSETTYPESELECTED_5E93A00D',
        fallbackText: t('vendors.invalidAssetTypeSelected') || 'Invalid asset type selected',
        type: 'error',
      });
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
      const newProducts = [...products, { 
        assetType: selectedAsset.asset_type_id, 
        assetTypeText: selectedAsset.text,
        brand: form.brand, 
        model: form.model, 
        description: form.description || form.brand 
      }];
      setProducts(newProducts);
      sessionStorage.setItem('products', JSON.stringify(newProducts));
      setForm({ assetType: "", brand: "", model: "", description: "" });
      setSubmitAttempted(false); // Reset validation state after successful add
      showBackendTextToast({ toast, tmdId: 'TMD_PRODUCT_ADDED_TO_LIST_5E27998E', fallbackText: 'Product added to list', type: 'success' });
    } catch (err) {
      showBackendTextToast({ toast, tmdId: 'TMD_I18N_VENDORS_FAILEDTOADDPRODUCTSUPPLY_32A38E6C', fallbackText: t('vendors.failedToAddProductSupply') + ': ' + (err.response?.data?.error || err.message) || 'Failed to add product supply: ' + (err.response?.data?.error || err.message), type: 'error' });
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
        <span>{t('vendors.productList')}</span>
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
              <th className="px-6 py-3 text-left text-sm font-medium">{t('vendors.assetType')}</th>
              <th className="px-6 py-3 text-left text-sm font-medium">{t('vendors.brand')}</th>
              <th className="px-6 py-3 text-left text-sm font-medium">{t('vendors.model')}</th>
              <th className="px-6 py-3 text-left text-sm font-medium">{t('vendors.description')}</th>
              <th className="px-6 py-3 text-center text-sm font-medium w-20"></th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {products.map((p, idx) => (
              <tr key={idx} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                <td className="px-6 py-2 text-sm text-gray-900">
                  {p.assetTypeText || p.assetType}
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
      console.log('handleDone called', { vendorId, orgId, products, vendorSaved });
      
      // Check vendor dependency
      if (!vendorSaved) {
        showBackendTextToast({
          toast,
          tmdId: 'TMD_I18N_VENDORS_PLEASESAVEVENDORFIRST_4D3BFE9E',
          fallbackText: t('vendors.pleaseSaveVendorFirst') || 'Please save vendor details first before saving products.',
          type: 'error',
        });
        return;
      }
      
      if (!vendorId || !orgId) {
        showBackendTextToast({ toast, tmdId: 'TMD_I18N_VENDORS_VENDORMUSTBECREATEDFIRST_66C0316E', fallbackText: t('vendors.vendorMustBeCreatedFirst') || 'Vendor must be created first.', type: 'error' });
        return;
      }

      setIsSaving(true);
      let productsFromStorage;
      try {
        productsFromStorage = JSON.parse(sessionStorage.getItem('products') || '[]');
      } catch (parseErr) {
        console.error('Error parsing products from sessionStorage:', parseErr);
        showBackendTextToast({ toast, tmdId: 'TMD_I18N_VENDORS_ERRORREADINGPRODUCTSFROMSTORAGE_42DE5425', fallbackText: t('vendors.errorReadingProductsFromStorage') || 'Error reading products from local storage.', type: 'error' });
        return;
      }
      if (!Array.isArray(productsFromStorage)) {
        console.error('productsFromStorage is not an array:', productsFromStorage);
        showBackendTextToast({
          toast,
          tmdId: 'TMD_I18N_VENDORS_INTERNALERRORPRODUCTSDATAINVALID_40DB8923',
          fallbackText: t('vendors.internalErrorProductsDataInvalid') || 'Internal error: products data is invalid.',
          type: 'error',
        });
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
            showBackendTextToast({ toast, tmdId: 'TMD_I18N_VENDORS_NOMATCHINGPRODUCTFOUND_7011AB88', fallbackText: t('vendors.noMatchingProductFound', { product: `${p.assetType}, ${p.brand}, ${p.model}` }) || `No matching product found in master list for: ${p.assetType}, ${p.brand}, ${p.model}`, type: 'error' });
          }
        } catch (apiErr) {
          console.error('Error fetching /prodserv for product:', p, apiErr);
          showBackendTextToast({ toast, tmdId: 'TMD_I18N_VENDORS_ERRORLOOKINGUPPRODUCT_50502E89', fallbackText: t('vendors.errorLookingUpProduct') || 'Error looking up product in master list.', type: 'error' });
        }
      }
      prodServIds = [...new Set(prodServIds)];
      
      if (!prodServIds.length) {
        showBackendTextToast({ toast, tmdId: 'TMD_I18N_VENDORS_NOVALIDPRODUCTSTOLINK_30709AEA', fallbackText: t('vendors.noValidProductsToLink') || 'No valid products to link', type: 'error' });
        return;
      }

      // Link products to vendor
      let successCount = 0;
      let duplicateCount = 0;
      for (const prod_serv_id of prodServIds) {
        try {
          await API.post('/vendor-prod-services', {
            prod_serv_id,
            vendor_id: vendorId,
            org_id: orgId
          });
          successCount++;
        } catch (postErr) {
          console.error('Error linking product:', postErr);
          // Check if it's a duplicate entry (409 Conflict)
          if (postErr.response?.status === 409) {
            duplicateCount++;
            console.log('Product already linked to vendor:', prod_serv_id);
          } else {
            const errorMessage = postErr.response?.data?.message || postErr.response?.data?.error || "Error linking product";
            showBackendTextToast({ toast, tmdId: 'TMD_I18N_VENDORS_ERRORLINKINGPRODUCT_0A01DDC7', fallbackText: errorMessage, type: 'error' });
          }
        }
      }

      // Show final status
      const totalProcessed = successCount + duplicateCount;
      if (totalProcessed === prodServIds.length) {
        if (duplicateCount > 0 && successCount > 0) {
          showBackendTextToast({
            toast,
            tmdId: 'TMD_I18N_VENDORS_PRODUCTSLINKEDSUCCESSFULLYWITHDUP_7F7C7BC8',
            fallbackText: '{{successCount}} products linked successfully, {{duplicateCount}} were already linked',
            type: 'success',
            values: { successCount, duplicateCount },
          });
        } else if (duplicateCount > 0 && successCount === 0) {
          showBackendTextToast({
            toast,
            tmdId: 'TMD_I18N_VENDORS_ALLPRODUCTSALREADYLINKED_5FB0807B',
            fallbackText: 'All {{duplicateCount}} products were already linked to this vendor',
            type: 'success',
            values: { duplicateCount },
          });
        } else {
          showBackendTextToast({ toast, tmdId: 'TMD_ALL_PRODUCTS_LINKED_SUCCESSFULLY_4723C1D1', fallbackText: 'All products linked successfully', type: 'success' });
        }
        // Clear form and storage
        setProducts([]);
        sessionStorage.removeItem('products');
        // Mark tab as saved
        if (onTabSaved) onTabSaved('Product Details');
      } else if (totalProcessed > 0) {
        showBackendTextToast({
          toast,
          tmdId: 'TMD_I18N_VENDORS_PRODUCTSPROCESSEDSUCCESSFULLY_3B13C421',
          fallbackText: '{{totalProcessed}} out of {{totalCount}} products processed successfully',
          type: 'success',
          values: { totalProcessed, totalCount: prodServIds.length },
        });
        // Mark tab as saved even if partial success
        if (onTabSaved) onTabSaved('Product Details');
      } else {
        showBackendTextToast({ toast, tmdId: 'TMD_I18N_VENDORS_FAILEDTOLINKANYPRODUCTS_293A70FD', fallbackText: t('vendors.failedToLinkAnyProducts') || 'Failed to link any products', type: 'error' });
      }
    } catch (err) {
      console.error('Unexpected error in handleDone:', err);
      showBackendTextToast({ toast, tmdId: 'TMD_I18N_VENDORS_UNEXPECTEDERROROCCURRED_39B6A99A', fallbackText: t('vendors.unexpectedErrorOccurred') || 'An unexpected error occurred', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="pb-6">
      {/* Add Product Row */}
      <div className="flex items-end gap-4 mb-8">
        <div>
          <label className="block text-sm text-gray-700 mb-2">
            {t('vendors.assetType')} <span className="text-red-500">*</span>
          </label>
          <SearchableDropdown
            options={assetTypes}
            value={form.assetType}
            onChange={(value) => handleChange({ target: { name: "assetType", value }})}
            placeholder={t('vendors.selectAssetType')}
            searchPlaceholder="Search Asset Types..."
            createNewText={t('vendors.addAssetType', { defaultValue: 'Add Asset Type' })}
            onCreateNew={goToAddAssetType}
            className={`w-48 ${isFieldInvalid(form.assetType) ? 'border border-red-500' : ''}`}
            displayKey="text"
            valueKey="asset_type_id"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-700 mb-2">
            {t('vendors.brand')} <span className="text-red-500">*</span>
          </label>
          <SearchableDropdown
            options={brands.map(brand => ({ id: brand, text: brand }))}
            value={form.brand}
            onChange={(value) => handleChange({ target: { name: "brand", value }})}
            placeholder={t('vendors.selectBrand')}
            searchPlaceholder={t('vendors.searchBrands', { defaultValue: 'Search Brands...' })}
            disabled={!form.assetType}
            createNewText={t('vendors.addBrand', { defaultValue: 'Add Brand' })}
            onCreateNew={form.assetType ? () => goToProdServ('brand') : undefined}
            className={`w-48 ${isFieldInvalid(form.brand) ? 'border border-red-500' : ''}`}
            displayKey="text"
            valueKey="id"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-700 mb-2">
            {t('vendors.model')} <span className="text-red-500">*</span>
          </label>
          <SearchableDropdown
            options={models.map(model => ({ id: model, text: model }))}
            value={form.model}
            onChange={(value) => handleChange({ target: { name: "model", value }})}
            placeholder={t('vendors.selectModel')}
            searchPlaceholder={t('vendors.searchModels', { defaultValue: 'Search Models...' })}
            disabled={!form.brand}
            createNewText={t('vendors.addModel', { defaultValue: 'Add Model' })}
            onCreateNew={form.assetType ? () => goToProdServ('model') : undefined}
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
          {t('vendors.add')}
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
    </div>
  );
};

export default ProductSupplyForm; 