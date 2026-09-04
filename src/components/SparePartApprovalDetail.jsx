import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import API from '../lib/axios';
import { useLanguage } from '../contexts/LanguageContext';
import { useSparePartApprovalStore } from '../store/useSparePartApprovalStore';
import { useSparePartListStore } from '../store/useSparePartListStore';

const mapBrand = (brand) => ({
  spb_id: brand.spb_id || brand.spbId || brand.brand_id,
  text: brand.text || brand.brandName || brand.brand_name || brand.name,
});

const mapModel = (model) => ({
  spm_id: model.spm_id || model.spbmId || model.model_id,
  spb_id: model.spb_id || model.spbId,
  text: model.text || model.modelName || model.model_name || model.name,
});

const asList = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.rows)) return payload.rows;
  return [];
};

const fieldClass =
  'w-full px-3 py-2 border border-gray-300 rounded text-gray-700';
const readOnlyClass = `${fieldClass} bg-gray-100`;
const inputClass = `${fieldClass} bg-white disabled:bg-gray-100 disabled:text-gray-500`;
const dropdownClass = inputClass;

export default function SparePartApprovalDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();

  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState(false);
  const [approved, setApproved] = useState(false);

  const [assetName, setAssetName] = useState('');
  const [assetType, setAssetType] = useState('');
  const [category, setCategory] = useState('');
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [models, setModels] = useState([]);
  const [spbId, setSpbId] = useState('');
  const [spmId, setSpmId] = useState('');
  const [pendingBrandId, setPendingBrandId] = useState('');
  const [pendingBrandName, setPendingBrandName] = useState('');
  const [pendingModelId, setPendingModelId] = useState('');
  const [pendingModelName, setPendingModelName] = useState('');
  const [requiredQty, setRequiredQty] = useState('');
  const [availableQty, setAvailableQty] = useState('');
  const [availableQtyLoading, setAvailableQtyLoading] = useState(false);
  const [brandsLoading, setBrandsLoading] = useState(false);
  const [modelsLoading, setModelsLoading] = useState(false);

  const loadDetail = async () => {
    setLoading(true);
    try {
      const data = await useSparePartApprovalStore.getState().fetchApprovalDetail(id, {
        force: true,
      });
      setDetail(data);
      setApproved(Boolean(data?.is_approved));
      setAssetName(data?.asset_name || data?.serial_number || '');
      setAssetType(data?.asset_type_name || '');
      setCategory(data?.category_name || '');
      setPendingBrandId(data?.spb_id || data?.brand_id || '');
      setPendingBrandName(data?.brand_name || '');
      setPendingModelId(data?.spm_id || data?.model_id || '');
      setPendingModelName(data?.model_name || '');
      setSpbId('');
      setSpmId('');
      const qty = data?.quantity_issued;
      setRequiredQty(
        qty != null && qty !== '' && Number.isFinite(Number(qty))
          ? String(qty)
          : ''
      );
      const avail = Number(data?.available_qty);
      setAvailableQty(Number.isFinite(avail) ? String(avail) : '');
    } catch (err) {
      toast.error(err.message || t('sparePartApproval.failedToFetchDetail'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDetail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const isLocked =
    approved ||
    Boolean(detail?.is_approved) ||
    detail?.status === 'IS' ||
    detail?.status === 'IE';

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await API.get('/spare-parts/categories', { params: { orgWide: true } });
        if (cancelled) return;
        setCategories(
          asList(res.data)
            .map((row) => ({
              spc_id: row.spc_id,
              text: row.text || row.category_name || row.name,
            }))
            .filter((row) => row.spc_id && row.text)
        );
      } catch (_) {
        if (!cancelled) setCategories([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const spcId = useMemo(() => {
    if (detail?.spc_id) return detail.spc_id;
    const typed = category.trim().toLowerCase();
    if (!typed) return '';
    const match = categories.find(
      (row) => String(row.text || '').trim().toLowerCase() === typed
    );
    return match?.spc_id || '';
  }, [category, categories, detail?.spc_id]);

  useEffect(() => {
    if (!spcId) {
      setBrands([]);
      setSpbId('');
      setSpmId('');
      setModels([]);
      return;
    }
    let cancelled = false;
    (async () => {
      setBrandsLoading(true);
      try {
        const res = await API.get('/spare-parts/brands', {
          params: { spc_id: spcId },
        });
        if (cancelled) return;
        const nextBrands = asList(res.data)
          .map(mapBrand)
          .filter((row) => row.spb_id && row.text);
        setBrands(nextBrands);

        const byId = pendingBrandId
          ? nextBrands.find((b) => String(b.spb_id) === String(pendingBrandId))
          : null;
        const byName = pendingBrandName
          ? nextBrands.find(
              (b) =>
                String(b.text || '').trim().toLowerCase() ===
                String(pendingBrandName).trim().toLowerCase()
            )
          : null;
        const matched = byId || byName || (nextBrands.length === 1 ? nextBrands[0] : null);
        setSpbId(matched?.spb_id || '');
        if (!matched) {
          setSpmId('');
          setModels([]);
        }
      } catch (err) {
        if (!cancelled) {
          setBrands([]);
          toast.error(err.response?.data?.error || t('sparePartApproval.failedToFetchDetail'));
        }
      } finally {
        if (!cancelled) setBrandsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [spcId, pendingBrandId, pendingBrandName, t]);

  useEffect(() => {
    if (!spcId || !spbId) {
      setModels([]);
      return;
    }
    let cancelled = false;
    (async () => {
      setModelsLoading(true);
      try {
        const res = await API.get('/spare-parts/models', {
          params: { spc_id: spcId, spb_id: spbId },
        });
        if (cancelled) return;
        const nextModels = asList(res.data)
          .map(mapModel)
          .filter((row) => row.spm_id && row.text);
        setModels(nextModels);

        const byId = pendingModelId
          ? nextModels.find((m) => String(m.spm_id) === String(pendingModelId))
          : null;
        const byName = pendingModelName
          ? nextModels.find(
              (m) =>
                String(m.text || '').trim().toLowerCase() ===
                String(pendingModelName).trim().toLowerCase()
            )
          : null;
        const matched = byId || byName || (nextModels.length === 1 ? nextModels[0] : null);
        setSpmId(matched?.spm_id || '');
      } catch (err) {
        if (!cancelled) {
          setModels([]);
          toast.error(err.response?.data?.error || t('sparePartApproval.failedToFetchDetail'));
        }
      } finally {
        if (!cancelled) setModelsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [spcId, spbId, pendingModelId, pendingModelName, t]);

  useEffect(() => {
    if (!spcId) {
      if (!detail?.available_qty && detail?.available_qty !== 0) {
        setAvailableQty('');
      }
      setAvailableQtyLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setAvailableQtyLoading(true);
      try {
        const res = await API.get(`/spare-parts/available-quantity/${spcId}`);
        if (cancelled) return;
        const qty = Number(res.data?.data?.available_qty);
        setAvailableQty(Number.isFinite(qty) ? String(qty) : '');
      } catch (_) {
        if (!cancelled) setAvailableQty('');
      } finally {
        if (!cancelled) setAvailableQtyLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [spcId, detail?.available_qty]);

  const handleBrandChange = (value) => {
    setPendingBrandId(value);
    setPendingBrandName('');
    setPendingModelId('');
    setPendingModelName('');
    setSpbId(value);
    setSpmId('');
    setModels([]);
  };

  const handleApprove = async () => {
    if (approved || approving || detail?.is_approved) return;
    if (!assetName.trim()) {
      toast.error(t('sparePartApproval.assetNameRequired'));
      return;
    }
    if (!assetType.trim()) {
      toast.error(t('sparePartApproval.assetTypeRequired'));
      return;
    }
    if (!category.trim()) {
      toast.error(t('sparePartApproval.categoryRequired'));
      return;
    }
    if (brands.length && !spbId) {
      toast.error(t('sparePartApproval.brandRequired'));
      return;
    }
    if ((models.length || spbId) && !spmId) {
      toast.error(t('sparePartApproval.modelRequired'));
      return;
    }
    const qty = Number(requiredQty);
    if (!requiredQty.trim() || !Number.isFinite(qty) || qty <= 0) {
      toast.error(t('sparePartApproval.requiredQuantityRequired'));
      return;
    }

    setApproving(true);
    try {
      await API.post(`/spare-parts/issue-approvals/${id}/approve`, {
        asset_name: assetName.trim(),
        asset_type: assetType.trim(),
        category: category.trim(),
        spc_id: spcId || null,
        spb_id: spbId || null,
        spm_id: spmId || null,
        quantity_issued: qty,
      });
      toast.success(t('sparePartApproval.approvedSuccessfully'));
      useSparePartApprovalStore.getState().invalidateApprovalCache();
      useSparePartListStore.getState().invalidateListCache();
      navigate('/spare-part-approval');
    } catch (err) {
      const code = err.response?.data?.code;
      if (code === 'ALREADY_APPROVED') {
        setApproved(true);
        toast.error(t('sparePartApproval.alreadyApproved'));
      } else {
        toast.error(err.response?.data?.error || t('sparePartApproval.approveFailed'));
      }
    } finally {
      setApproving(false);
    }
  };

  const isApproveDisabled =
    isLocked ||
    approving ||
    brandsLoading ||
    modelsLoading ||
    !assetName.trim() ||
    !assetType.trim() ||
    !category.trim() ||
    !requiredQty.trim() ||
    (brands.length > 0 && !spbId) ||
    (models.length > 0 && !spmId);

  if (loading) {
    return (
      <div className="p-6 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
        <p className="text-gray-600">{t('common.loading')}</p>
      </div>
    );
  }

  const brandPlaceholder = !spcId
    ? t('sparePartApproval.selectBrand')
    : brandsLoading
      ? t('common.loading')
      : brands.length
        ? t('sparePartApproval.selectBrand')
        : t('sparePartApproval.noBrands');
  const modelPlaceholder = !spbId
    ? t('sparePartApproval.selectBrandFirst')
    : modelsLoading
      ? t('common.loading')
      : models.length
        ? t('sparePartApproval.selectModel')
        : t('sparePartApproval.noModels');

  return (
    <div className="max-w-7xl mx-auto min-h-[600px] overflow-y-auto p-8 bg-white md:rounded shadow-lg">
      <div className="flex items-center gap-4 mb-6">
        <button
          type="button"
          onClick={() => navigate('/spare-part-approval')}
          className="flex items-center gap-2 text-[#0E2F4B] hover:text-blue-700"
        >
          <ArrowLeft size={20} />
          {t('sparePartApproval.backToList')}
        </button>
      </div>

      <div className="p-6 rounded-lg border border-gray-200 space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('sparePartApproval.assetName')}
          </label>
          <input
            type="text"
            value={assetName}
            readOnly
            placeholder={t('sparePartApproval.selectAssetName')}
            className={readOnlyClass}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('sparePartApproval.assetType')}
          </label>
          <input
            type="text"
            value={assetType}
            readOnly
            placeholder={t('sparePartApproval.selectAssetType')}
            className={readOnlyClass}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('sparePartApproval.category')}
          </label>
          <input
            type="text"
            value={category}
            readOnly
            placeholder={t('sparePartApproval.selectCategory')}
            className={readOnlyClass}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('sparePartApproval.brand')}
          </label>
          <select
            value={spbId}
            onChange={(e) => handleBrandChange(e.target.value)}
            disabled={isLocked || brandsLoading || !spcId}
            className={dropdownClass}
          >
            <option value="">{brandPlaceholder}</option>
            {brands.map((brand) => (
              <option key={brand.spb_id} value={brand.spb_id}>
                {brand.text}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('sparePartApproval.model')}
          </label>
          <select
            value={spmId}
            onChange={(e) => {
              setPendingModelId(e.target.value);
              setPendingModelName('');
              setSpmId(e.target.value);
            }}
            disabled={isLocked || modelsLoading || !spbId}
            className={dropdownClass}
          >
            <option value="">{modelPlaceholder}</option>
            {models.map((model) => (
              <option key={model.spm_id} value={model.spm_id}>
                {model.text}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('sparePartApproval.availableQuantity')}
          </label>
          <input
            readOnly
            value={
              availableQtyLoading
                ? t('common.loading')
                : availableQty
            }
            placeholder={t('sparePartApproval.availableQuantity')}
            className={readOnlyClass}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('sparePartApproval.requiredQuantity')}
          </label>
          <input
            type="text"
            inputMode="decimal"
            value={requiredQty}
            onChange={(e) => {
              const value = e.target.value;
              if (value === '' || /^\d*\.?\d*$/.test(value)) {
                setRequiredQty(value);
              }
            }}
            placeholder={t('sparePartApproval.enterRequiredQuantity')}
            disabled={isLocked}
            className={inputClass}
          />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <button
            type="button"
            onClick={() => navigate('/spare-part-approval')}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            {t('common.cancel')}
          </button>
          <button
            type="button"
            onClick={handleApprove}
            disabled={isApproveDisabled}
            className="px-4 py-2 rounded-md text-white bg-[#0E2F4B] hover:bg-[#14395c] disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {approved || detail?.is_approved
              ? t('sparePartApproval.reserved')
              : approving
                ? t('common.saving')
                : t('sparePartApproval.reserve')}
          </button>
        </div>
      </div>
    </div>
  );
}
