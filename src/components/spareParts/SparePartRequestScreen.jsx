import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import API from '../../lib/axios';
import { useLanguage } from '../../contexts/LanguageContext';
import { useSparePartListStore } from '../../store/useSparePartListStore';
import { useSparePartApprovalStore } from '../../store/useSparePartApprovalStore';

/**
 * Spare Part Request — categories from tblSPCatATMap by asset type;
 * checklist-required categories for amsId are auto-selected at qty 1.
 * Request persists selected rows to tblSpareIssue.
 */
export default function SparePartRequestScreen({
  amsId,
  assetTypeId,
  onCancel,
  onSubmitted,
  embedded = false,
}) {
  const { t } = useLanguage();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selected, setSelected] = useState({});
  const [availableQty, setAvailableQty] = useState({});

  useEffect(() => {
    if (!assetTypeId && !amsId) {
      setCategories([]);
      setSelected({});
      return undefined;
    }

    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [catRes, requiredRes] = await Promise.all([
          assetTypeId
            ? API.get(`/spare-parts/category-mappings/by-asset-type/${assetTypeId}`)
            : Promise.resolve({ data: { data: [] } }),
          amsId
            ? API.get(`/spare-parts/maintenance-list/${amsId}/required-categories`).catch(
                () => ({ data: { data: [] } })
              )
            : Promise.resolve({ data: { data: [] } }),
        ]);
        if (cancelled) return;

        const cats = catRes.data?.data || [];
        const requiredRows = requiredRes.data?.data || [];
        const requiredIds = new Set(requiredRows.map((row) => row.spc_id).filter(Boolean));

        if (cats.length) {
          setCategories(cats);
          const initialSelected = {};
          requiredIds.forEach((spc_id) => {
            if (cats.some((cat) => cat.spc_id === spc_id)) {
              initialSelected[spc_id] = '1';
            }
          });
          setSelected(initialSelected);
          Object.keys(initialSelected).forEach((spc_id) => {
            API.get(`/spare-parts/available-quantity/${spc_id}`)
              .then((res) => {
                if (cancelled) return;
                const available = Number(res.data?.data?.available_qty);
                if (Number.isFinite(available) && available >= 0) {
                  setAvailableQty((prev) => ({ ...prev, [spc_id]: available }));
                }
              })
              .catch(() => {});
          });
        } else {
          // No asset-type mappings: fall back to checklist-required rows
          const byId = new Map();
          requiredRows.forEach((row) => {
            if (row?.spc_id && !byId.has(row.spc_id)) byId.set(row.spc_id, row);
          });
          const unique = [...byId.values()].map((row) => ({
            spc_id: row.spc_id,
            category_name: row.category_name || row.text || row.spc_id,
            uom: row.uom,
            checklist_item: row.checklist_item,
          }));
          setCategories(unique);
          setSelected(Object.fromEntries(unique.map((row) => [row.spc_id, '1'])));
          unique.forEach((row) => {
            API.get(`/spare-parts/available-quantity/${row.spc_id}`)
              .then((res) => {
                if (cancelled) return;
                const available = Number(res.data?.data?.available_qty);
                if (Number.isFinite(available) && available >= 0) {
                  setAvailableQty((prev) => ({ ...prev, [row.spc_id]: available }));
                }
              })
              .catch(() => {});
          });
        }
        setAvailableQty({});
      } catch (err) {
        if (!cancelled) {
          toast.error(
            err.response?.data?.error || t('sparePartList.failedToLoadCategories')
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [assetTypeId, amsId, t]);

  const prefetchAvailableQty = async (spc_id) => {
    if (!spc_id || availableQty[spc_id] !== undefined) return;
    try {
      const res = await API.get(`/spare-parts/available-quantity/${spc_id}`);
      const available = Number(res.data?.data?.available_qty);
      if (Number.isFinite(available) && available >= 0) {
        setAvailableQty((prev) => ({ ...prev, [spc_id]: available }));
      }
    } catch {
      // Soft hint only — request submit still relies on backend validation.
    }
  };

  const toggleCategory = (spc_id) => {
    setSelected((prev) => {
      const next = { ...prev };
      if (next[spc_id] !== undefined) {
        delete next[spc_id];
      } else {
        next[spc_id] = '1';
        prefetchAvailableQty(spc_id);
      }
      return next;
    });
  };

  const setQuantity = (spc_id, value) => {
    setSelected((prev) => ({ ...prev, [spc_id]: value }));
  };

  const handleRequest = async () => {
    const items = Object.entries(selected)
      .filter(([, qty]) => qty !== undefined && qty !== '' && Number(qty) > 0)
      .map(([spc_id, quantity]) => ({ spc_id, quantity: Number(quantity) }));

    if (!items.length) {
      toast.error(t('sparePartList.selectCategoryAndQuantity'));
      return;
    }

    // Soft client-side stock hint only. Never treat qty-check network errors as
    // "0 available" — that falsely fails requests; backend is the source of truth.
    for (const item of items) {
      let available = availableQty[item.spc_id];
      if (available === undefined) {
        try {
          const res = await API.get(`/spare-parts/available-quantity/${item.spc_id}`);
          available = Number(res.data?.data?.available_qty);
          if (!Number.isFinite(available) || available < 0) available = null;
          else setAvailableQty((prev) => ({ ...prev, [item.spc_id]: available }));
        } catch {
          available = null;
        }
      } else {
        available = Number(available);
        if (!Number.isFinite(available) || available < 0) available = null;
      }
      if (available !== null && available < item.quantity) {
        toast.error(
          `Insufficient stock. Available: ${available}, Requested: ${item.quantity}`
        );
        return;
      }
    }

    setSubmitting(true);
    try {
      await API.post('/spare-parts/issue-requests', {
        assetmaintsch_id: amsId,
        items,
      });
      toast.success(t('sparePartList.requestSubmitted'));
      useSparePartListStore.getState().invalidateListCache();
      useSparePartApprovalStore.getState().invalidateApprovalCache();
      onSubmitted?.();
    } catch (err) {
      toast.error(err.response?.data?.error || t('sparePartList.requestFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  const fieldLabelClass = 'block text-sm font-medium text-gray-700 mb-1';
  const editableInputClass =
    'w-full px-3 py-2 border border-gray-300 rounded bg-white text-gray-700';

  return (
    <div className={embedded ? 'space-y-6' : 'p-6 rounded-lg border border-gray-200 space-y-6'}>
      <h2 className="text-xl font-semibold text-gray-800">
        {t('sparePartList.sparePartRequest')}
      </h2>

      {loading ? (
        <p className="text-gray-500">{t('common.loading')}</p>
      ) : categories.length === 0 ? (
        <p className="text-gray-400 italic">
          {t('sparePartList.noCategoriesForAssetType')}
        </p>
      ) : (
        <div className="space-y-3">
          <div className="text-sm font-medium text-gray-600">
            {t('sparePartList.category') || 'Category'}
          </div>
          {categories.map((cat) => {
            const isChecked = selected[cat.spc_id] !== undefined;
            return (
              <div key={cat.spc_id} className="border rounded-md p-3 space-y-4">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleCategory(cat.spc_id)}
                    className="accent-[#0E2F4B]"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-800">
                      {cat.category_name}
                    </div>
                    {cat.checklist_item && (
                      <div className="text-xs text-gray-500">
                        {cat.checklist_item}
                      </div>
                    )}
                    {(cat.brand || cat.model) && (
                      <div className="text-xs text-gray-500">
                        {[cat.brand, cat.model].filter(Boolean).join(' / ')}
                      </div>
                    )}
                  </div>
                </div>

                {isChecked && (
                  <div className="space-y-4 pl-7">
                    <div>
                      <label className={fieldLabelClass}>
                        {t('sparePartApproval.requiredQuantity')}
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={selected[cat.spc_id] || ''}
                        onChange={(e) =>
                          setQuantity(
                            cat.spc_id,
                            e.target.value.replace(/\D/g, '')
                          )
                        }
                        placeholder={t('sparePartApproval.requiredQuantity')}
                        className={editableInputClass}
                      />
                      {availableQty[cat.spc_id] !== undefined && (
                        <p
                          className={`mt-1 text-xs ${
                            Number(availableQty[cat.spc_id]) > 0
                              ? 'text-gray-500'
                              : 'text-amber-600'
                          }`}
                        >
                          Available: {availableQty[cat.spc_id]}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="flex justify-end gap-3 pt-2 border-t border-gray-200">
        <button
          type="button"
          onClick={onCancel}
          className="px-6 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 font-medium"
        >
          {t('common.cancel')}
        </button>
        <button
          type="button"
          onClick={handleRequest}
          disabled={submitting || loading}
          className="px-6 py-2 bg-[#0E2F4B] text-white rounded-md hover:bg-[#14395c] font-medium disabled:opacity-50"
        >
          {submitting ? t('common.saving') : t('sparePartList.request')}
        </button>
      </div>
    </div>
  );
}
