import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import API from '../../lib/axios';
import { useLanguage } from '../../contexts/LanguageContext';
import { useSparePartListStore } from '../../store/useSparePartListStore';
import { useSparePartApprovalStore } from '../../store/useSparePartApprovalStore';

const OPEN_STATUSES = new Set(['RQ', 'IS', 'IE']);

function statusLabel(status, t) {
  if (status === 'RQ') return t('sparePartList.pendingApproval') || 'Requested';
  if (status === 'IS') return t('sparePartList.issued') || 'Reserved';
  if (status === 'IE') return t('sparePartList.confirmedIssued') || 'Issued';
  return t('sparePartList.requested') || 'Requested';
}

/**
 * Spare Part Request — categories from tblSPCatATMap by asset type;
 * checklist-required categories for amsId are auto-selected at qty 1.
 * Categories already requested (RQ/IS/IE) for this maintenance are locked.
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
  /** spc_id -> { status, quantity, si_id } for open requests on this maintenance */
  const [existingBySpc, setExistingBySpc] = useState({});

  useEffect(() => {
    if (!assetTypeId && !amsId) {
      setCategories([]);
      setSelected({});
      setExistingBySpc({});
      return undefined;
    }

    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [catRes, requiredRes, existingRes] = await Promise.all([
          assetTypeId
            ? API.get(`/spare-parts/category-mappings/by-asset-type/${assetTypeId}`)
            : Promise.resolve({ data: { data: [] } }),
          amsId
            ? API.get(`/spare-parts/maintenance-list/${amsId}/required-categories`).catch(
                () => ({ data: { data: [] } })
              )
            : Promise.resolve({ data: { data: [] } }),
          amsId
            ? API.get(`/spare-parts/maintenance-list/${amsId}/request-details`).catch(
                () => ({ data: { data: null } })
              )
            : Promise.resolve({ data: { data: null } }),
        ]);
        if (cancelled) return;

        const existingMap = {};
        const existingItems = existingRes.data?.data?.items || [];
        existingItems.forEach((item) => {
          if (!item?.spc_id || !OPEN_STATUSES.has(item.status)) return;
          if (existingMap[item.spc_id]) return;
          existingMap[item.spc_id] = {
            status: item.status,
            quantity: item.quantity,
            si_id: item.si_id,
          };
        });
        setExistingBySpc(existingMap);

        const cats = catRes.data?.data || [];
        const requiredRows = requiredRes.data?.data || [];
        const requiredIds = new Set(requiredRows.map((row) => row.spc_id).filter(Boolean));

        const applyInitialSelection = (list) => {
          const initialSelected = {};
          requiredIds.forEach((spc_id) => {
            if (list.some((cat) => cat.spc_id === spc_id) && !existingMap[spc_id]) {
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
        };

        if (cats.length) {
          setCategories(cats);
          applyInitialSelection(cats);
        } else {
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
          applyInitialSelection(unique);
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
    if (existingBySpc[spc_id]) return;
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
    if (existingBySpc[spc_id]) return;
    setSelected((prev) => ({ ...prev, [spc_id]: value }));
  };

  const newRequestItems = useMemo(
    () =>
      Object.entries(selected)
        .filter(
          ([spc_id, qty]) =>
            !existingBySpc[spc_id] &&
            qty !== undefined &&
            qty !== '' &&
            Number(qty) > 0
        )
        .map(([spc_id, quantity]) => ({ spc_id, quantity: Number(quantity) })),
    [selected, existingBySpc]
  );

  const allCategoriesAlreadyRequested =
    categories.length > 0 &&
    categories.every((cat) => Boolean(existingBySpc[cat.spc_id]));

  const handleRequest = async () => {
    if (allCategoriesAlreadyRequested) {
      toast.error(
        t('sparePartList.alreadyRequestedAll') ||
          'All categories for this maintenance are already requested'
      );
      return;
    }

    if (!newRequestItems.length) {
      toast.error(t('sparePartList.selectCategoryAndQuantity'));
      return;
    }

    for (const item of newRequestItems) {
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
        items: newRequestItems,
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
  const lockedInputClass =
    'w-full px-3 py-2 border border-gray-200 rounded bg-gray-50 text-gray-600 cursor-not-allowed';

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
            const existing = existingBySpc[cat.spc_id];
            const isLocked = Boolean(existing);
            const isChecked = isLocked || selected[cat.spc_id] !== undefined;
            const qtyValue = isLocked
              ? String(existing.quantity ?? '')
              : selected[cat.spc_id] || '';

            return (
              <div
                key={cat.spc_id}
                className={`border rounded-md p-3 space-y-4 ${
                  isLocked ? 'bg-gray-50 border-gray-200' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleCategory(cat.spc_id)}
                    disabled={isLocked}
                    className="accent-[#0E2F4B] disabled:opacity-60"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="font-medium text-gray-800">
                        {cat.category_name}
                      </div>
                      {isLocked && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-amber-50 text-amber-800 ring-1 ring-amber-600/20">
                          {statusLabel(existing.status, t)}
                        </span>
                      )}
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
                        value={qtyValue}
                        onChange={(e) =>
                          setQuantity(
                            cat.spc_id,
                            e.target.value.replace(/\D/g, '')
                          )
                        }
                        disabled={isLocked}
                        placeholder={t('sparePartApproval.requiredQuantity')}
                        className={isLocked ? lockedInputClass : editableInputClass}
                      />
                      {isLocked ? (
                        <p className="mt-1 text-xs text-amber-700">
                          {t('sparePartList.alreadyRequestedHint') ||
                            'Already requested for this maintenance — cannot request again'}
                        </p>
                      ) : (
                        availableQty[cat.spc_id] !== undefined && (
                          <p
                            className={`mt-1 text-xs ${
                              Number(availableQty[cat.spc_id]) > 0
                                ? 'text-gray-500'
                                : 'text-amber-600'
                            }`}
                          >
                            Available: {availableQty[cat.spc_id]}
                          </p>
                        )
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
          disabled={
            submitting ||
            loading ||
            allCategoriesAlreadyRequested ||
            newRequestItems.length === 0
          }
          className="px-6 py-2 bg-[#0E2F4B] text-white rounded-md hover:bg-[#14395c] font-medium disabled:opacity-50"
        >
          {submitting
            ? t('common.saving')
            : allCategoriesAlreadyRequested
              ? t('sparePartList.pendingApproval') || 'Requested'
              : t('sparePartList.request')}
        </button>
      </div>
    </div>
  );
}
