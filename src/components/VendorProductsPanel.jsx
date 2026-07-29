import { useCallback, useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import API from '../lib/axios';
import SearchableDropdown from './ui/SearchableDropdown';
import { showBackendTextToast } from '../utils/errorTranslation';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuthStore } from '../store/useAuthStore';

/**
 * Manage product links for an existing vendor (add / remove).
 * Unlinking clears the vendor↔product association so either side can be deleted.
 */
const VendorProductsPanel = ({ vendorId, orgId, isReadOnly = false }) => {
  const { t } = useLanguage();
  const authOrgId = useAuthStore((s) => s.user?.org_id);
  const effectiveOrgId = orgId || authOrgId;
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [removingId, setRemovingId] = useState(null);
  const [assetTypes, setAssetTypes] = useState([]);
  const [brands, setBrands] = useState([]);
  const [models, setModels] = useState([]);
  const [form, setForm] = useState({ assetType: '', brand: '', model: '' });
  const [submitAttempted, setSubmitAttempted] = useState(false);

  const loadLinks = useCallback(async () => {
    if (!vendorId) return;
    setLoading(true);
    try {
      const res = await API.get(`/vendor-prod-services/vendor/${vendorId}`);
      setLinks(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Failed to load vendor products:', err);
      setLinks([]);
      showBackendTextToast({
        toast,
        tmdId: 'TMD_I18N_VENDORS_FAILEDTOLOADPRODUCTS_0A01DDC7',
        fallbackText: 'Failed to load linked products',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  }, [vendorId]);

  useEffect(() => {
    loadLinks();
  }, [loadLinks]);

  useEffect(() => {
    API.get('/dept-assets/asset-types')
      .then((res) => setAssetTypes(Array.isArray(res.data) ? res.data : []))
      .catch(() => setAssetTypes([]));
  }, []);

  useEffect(() => {
    if (!form.assetType) {
      setBrands([]);
      setModels([]);
      return;
    }
    API.get(`/brands?assetTypeId=${form.assetType}`)
      .then((res) => setBrands(Array.isArray(res.data) ? res.data : []))
      .catch(() => setBrands([]));
    setForm((prev) => ({ ...prev, brand: '', model: '' }));
    setModels([]);
  }, [form.assetType]);

  useEffect(() => {
    if (!form.assetType || !form.brand) {
      setModels([]);
      return;
    }
    API.get(`/models?assetTypeId=${form.assetType}&brand=${encodeURIComponent(form.brand)}`)
      .then((res) => setModels(Array.isArray(res.data) ? res.data : []))
      .catch(() => setModels([]));
    setForm((prev) => ({ ...prev, model: '' }));
  }, [form.brand, form.assetType]);

  const brandOptions = (Array.isArray(brands) ? brands : []).map((b) =>
    typeof b === 'string' ? { id: b, text: b } : { id: b.brand || b.text || String(b), text: b.brand || b.text || String(b) }
  );
  const modelOptions = (Array.isArray(models) ? models : []).map((m) =>
    typeof m === 'string' ? { id: m, text: m } : { id: m.model || m.text || String(m), text: m.model || m.text || String(m) }
  );

  const handleAdd = async () => {
    if (!form.assetType || !form.brand || !form.model) {
      setSubmitAttempted(true);
      return;
    }
    if (!vendorId || !effectiveOrgId) {
      showBackendTextToast({
        toast,
        tmdId: 'TMD_I18N_VENDORS_VENDORMUSTBECREATEDFIRST_66C0316E',
        fallbackText: 'Vendor must be created first',
        type: 'error',
      });
      return;
    }

    setAdding(true);
    try {
      const res = await API.get('/prodserv');
      const all = Array.isArray(res.data) ? res.data : [];
      const match = all.find(
        (row) =>
          String(row.asset_type_id) === String(form.assetType) &&
          row.brand === form.brand &&
          row.model === form.model
      );
      if (!match?.prod_serv_id) {
        showBackendTextToast({
          toast,
          tmdId: 'TMD_I18N_VENDORS_NOMATCHINGPRODUCTFOUND_7011AB88',
          fallbackText: `No matching product found in master list for: ${form.assetType}, ${form.brand}, ${form.model}`,
          type: 'error',
        });
        return;
      }

      await API.post('/vendor-prod-services', {
        prod_serv_id: match.prod_serv_id,
        vendor_id: vendorId,
        org_id: effectiveOrgId,
      });

      showBackendTextToast({
        toast,
        tmdId: 'TMD_PRODUCT_ADDED_TO_LIST_5E27998E',
        fallbackText: 'Product linked successfully',
        type: 'success',
      });
      setForm({ assetType: '', brand: '', model: '' });
      setSubmitAttempted(false);
      await loadLinks();
    } catch (err) {
      if (err.response?.status === 409) {
        showBackendTextToast({
          toast,
          tmdId: 'TMD_I18N_VENDORS_PRODUCTALREADYLINKED_0A01DDC7',
          fallbackText: 'This product is already linked to the vendor',
          type: 'error',
        });
      } else {
        const msg =
          err.response?.data?.message ||
          err.response?.data?.error ||
          'Failed to link product';
        showBackendTextToast({
          toast,
          tmdId: 'TMD_I18N_VENDORS_ERRORLINKINGPRODUCT_0A01DDC7',
          fallbackText: msg,
          type: 'error',
        });
      }
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (venProdServId) => {
    if (!venProdServId || isReadOnly) return;
    if (
      !window.confirm(
        'Remove this product from the vendor? You can delete the vendor or product afterward if nothing else is linked.'
      )
    ) {
      return;
    }

    setRemovingId(venProdServId);
    try {
      await API.delete(`/vendor-prod-services/${venProdServId}`);
      showBackendTextToast({
        toast,
        tmdId: 'TMD_I18N_VENDORS_PRODUCTUNLINKED_0A01DDC7',
        fallbackText: 'Product removed from vendor',
        type: 'success',
      });
      await loadLinks();
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        'Failed to remove product from vendor';
      showBackendTextToast({
        toast,
        tmdId: 'TMD_I18N_VENDORS_FAILEDTOUNLINKPRODUCT_0A01DDC7',
        fallbackText: msg,
        type: 'error',
      });
    } finally {
      setRemovingId(null);
    }
  };

  const invalid = (val) => submitAttempted && !val;

  return (
    <div className="p-6 space-y-6">
      {!isReadOnly && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('vendors.assetType')} <span className="text-red-500">*</span>
            </label>
            <SearchableDropdown
              options={assetTypes}
              value={form.assetType}
              onChange={(val) => setForm((prev) => ({ ...prev, assetType: val }))}
              placeholder={t('vendors.selectAssetType')}
              displayKey="text"
              valueKey="asset_type_id"
              className={invalid(form.assetType) ? 'border-red-500' : ''}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('vendors.brand')} <span className="text-red-500">*</span>
            </label>
            <SearchableDropdown
              options={brandOptions}
              value={form.brand}
              onChange={(val) => setForm((prev) => ({ ...prev, brand: val }))}
              placeholder={t('vendors.selectBrand')}
              disabled={!form.assetType}
              displayKey="text"
              valueKey="id"
              className={invalid(form.brand) ? 'border-red-500' : ''}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('vendors.model')} <span className="text-red-500">*</span>
            </label>
            <SearchableDropdown
              options={modelOptions}
              value={form.model}
              onChange={(val) => setForm((prev) => ({ ...prev, model: val }))}
              placeholder={t('vendors.selectModel')}
              disabled={!form.brand}
              displayKey="text"
              valueKey="id"
              className={invalid(form.model) ? 'border-red-500' : ''}
            />
          </div>
          <div>
            <button
              type="button"
              onClick={handleAdd}
              disabled={adding}
              className="w-full bg-[#0E2F4B] hover:bg-[#1a4a76] disabled:opacity-60 text-white text-sm font-medium py-2 px-4 rounded"
            >
              {adding ? 'Saving...' : 'Add Product'}
            </button>
          </div>
        </div>
      )}

      <div className="border rounded-lg overflow-hidden bg-white">
        <div className="px-4 py-2 font-semibold text-[#0E2F4B] text-sm border-b bg-gray-50">
          {t('vendors.productList')}
        </div>
        {loading ? (
          <div className="p-4 text-sm text-gray-500 text-center">Loading...</div>
        ) : links.length === 0 ? (
          <div className="p-4 text-sm text-gray-500 text-center">
            No products linked to this vendor.
          </div>
        ) : (
          <div className="overflow-x-auto max-h-[360px]">
            <table className="w-full text-sm">
              <thead className="bg-[#0E2F4B] text-white sticky top-0">
                <tr>
                  <th className="px-4 py-2 text-left font-medium">{t('vendors.assetType')}</th>
                  <th className="px-4 py-2 text-left font-medium">{t('vendors.brand')}</th>
                  <th className="px-4 py-2 text-left font-medium">{t('vendors.model')}</th>
                  <th className="px-4 py-2 text-left font-medium">{t('vendors.description')}</th>
                  {!isReadOnly && <th className="px-4 py-2 text-center font-medium w-16" />}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {links.map((row) => (
                  <tr key={row.ven_prod_serv_id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-gray-900">
                      {row.asset_type_text || row.asset_type_id || '—'}
                    </td>
                    <td className="px-4 py-2 text-gray-900">{row.brand || '—'}</td>
                    <td className="px-4 py-2 text-gray-900">{row.model || '—'}</td>
                    <td className="px-4 py-2 text-gray-900">{row.description || '—'}</td>
                    {!isReadOnly && (
                      <td className="px-4 py-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemove(row.ven_prod_serv_id)}
                          disabled={removingId === row.ven_prod_serv_id}
                          className="text-yellow-500 hover:text-red-600 disabled:opacity-50"
                          title="Remove from vendor"
                        >
                          <Trash2 className="h-4 w-4 inline" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default VendorProductsPanel;
