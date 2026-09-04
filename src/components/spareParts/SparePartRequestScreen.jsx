import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import API from '../../lib/axios';
import { useLanguage } from '../../contexts/LanguageContext';
import { useSparePartListStore } from '../../store/useSparePartListStore';
import { useSparePartApprovalStore } from '../../store/useSparePartApprovalStore';

/**
 * Spare Part Request — categories from tblSPCatATMap by asset type;
 * Request persists selected rows to tblSpareIssue.
 * When a category is selected, Required Quantity uses the same
 * stacked field layout as Spare Part Approval detail (same card, no extra asset details).
 */
export default function SparePartRequestScreen({
  amsId,
  assetTypeId,
  checklistSpareCategories = [],
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
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        let rows = [];

        // Always resolve checklist-required categories from the AMS when available
        if (amsId) {
          try {
            const res = await API.get(
              `/spare-parts/maintenance-list/${amsId}/required-categories`
            );
            rows = (res.data?.data || [])
              .filter((row) => row?.spc_id)
              .map((row) => ({
                spc_id: row.spc_id,
                category_name: row.category_name || row.text || row.spc_id,
                uom: row.uom,
                checklist_item: row.checklist_item,
              }));
          } catch (err) {
            console.warn('Failed to load checklist spare categories:', err);
          }
        }

        // Fallback: prop from detail, then all asset-type mappings
        if (!rows.length && Array.isArray(checklistSpareCategories) && checklistSpareCategories.length) {
          rows = checklistSpareCategories
            .filter((row) => row?.spc_id)
            .map((row) => ({
              spc_id: row.spc_id,
              category_name: row.category_name || row.text || row.spc_id,
              uom: row.uom,
              checklist_item: row.checklist_item,
            }));
        }

        if (!rows.length && assetTypeId) {
          const res = await API.get(
            `/spare-parts/category-mappings/by-asset-type/${assetTypeId}`
          );
          rows = res.data?.data || [];
        }

        if (cancelled) return;

        const byId = new Map();
        rows.forEach((row) => {
          if (row?.spc_id && !byId.has(row.spc_id)) byId.set(row.spc_id, row);
        });
        const unique = [...byId.values()];
        setCategories(unique);
        // Auto-check every loaded category with default quantity 1
        setSelected(
          Object.fromEntries(unique.map((row) => [row.spc_id, '1']))
        );
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
  }, [amsId, assetTypeId, t]);

  const toggleCategory = (spc_id) => {
    setSelected((prev) => {
      const next = { ...prev };
      if (next[spc_id] !== undefined) {
        delete next[spc_id];
      } else {
        next[spc_id] = '1';
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

    for (const item of items) {
      let available = availableQty[item.spc_id];
      if (available === undefined) {
        try {
          const res = await API.get(`/spare-parts/available-quantity/${item.spc_id}`);
          available = Number(res.data?.data?.available_qty);
          if (!Number.isFinite(available) || available < 0) available = 0;
          setAvailableQty((prev) => ({ ...prev, [item.spc_id]: available }));
        } catch {
          available = 0;
        }
      } else {
        available = Number(available);
        if (!Number.isFinite(available) || available < 0) available = 0;
      }
      if (available < item.quantity) {
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
