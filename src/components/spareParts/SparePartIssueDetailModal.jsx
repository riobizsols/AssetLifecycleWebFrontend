import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import API from '../../lib/axios';
import { useLanguage } from '../../contexts/LanguageContext';

const formatWhen = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const statusLabel = (status, t) => {
  if (status === 'IE') return t('sparePartList.confirmedIssued');
  if (status === 'IS') return t('sparePartList.issued');
  if (status === 'RQ') return t('sparePartList.pendingApproval');
  return '-';
};

const statusClass = (status) => {
  if (status === 'IE') return 'text-sky-600';
  if (status === 'IS') return 'text-green-600';
  if (status === 'RQ') return 'text-amber-600';
  return 'text-gray-700';
};

function Field({ label, value, valueClassName = '' }) {
  return (
    <div>
      <div className="text-xs text-gray-500">{label}</div>
      <div className={`font-semibold text-gray-800 break-words ${valueClassName}`}>
        {value || '-'}
      </div>
    </div>
  );
}

export default function SparePartIssueDetailModal({ row, onClose }) {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [detail, setDetail] = useState(null);

  useEffect(() => {
    if (!row?.ams_id) return undefined;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      setDetail(null);
      try {
        const res = await API.get(
          `/spare-parts/maintenance-list/${encodeURIComponent(row.ams_id)}/request-details`
        );
        if (!cancelled) setDetail(res.data?.data || null);
      } catch (err) {
        if (!cancelled) {
          setError(err.response?.data?.error || t('sparePartIssue.failedToFetchDetails'));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [row?.ams_id, t]);

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!row) return null;

  const header = detail || row;
  const items = detail?.items || [];

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-[80] p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-3xl relative max-h-[90vh] flex flex-col"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="spare-issue-detail-title"
      >
        <div className="flex items-start justify-between px-6 py-4 border-b bg-[#0E2F4B] text-white rounded-t-xl flex-shrink-0">
          <div className="min-w-0">
            <h3 id="spare-issue-detail-title" className="text-lg font-bold leading-tight">
              {t('sparePartIssue.requestDetails')}
            </h3>
            <p className="text-xs text-white/80 mt-1 truncate">
              {header.asset_type_name || row.asset_type_name || '-'}
              {header.serial_number ? ` · ${header.serial_number}` : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-white/80 hover:text-white flex-shrink-0 ml-3"
            aria-label={t('sparePartIssue.close')}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="px-6 py-5 overflow-y-auto flex-1 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label={t('sparePartList.assetType')} value={header.asset_type_name || row.asset_type_name} />
            <Field label={t('sparePartList.serialNumber')} value={header.serial_number || row.serial_number} />
            <Field
              label={t('sparePartList.description')}
              value={header.asset_description || row.asset_description}
            />
            <Field
              label={t('sparePartList.maintenanceType')}
              value={header.maintenance_type_name || row.maintenance_type_name}
            />
            <Field label={t('sparePartList.vendor')} value={header.vendor_name || row.vendor_name} />
            <Field
              label={t('sparePartList.status')}
              value={statusLabel(row.status, t)}
              valueClassName={statusClass(row.status)}
            />
          </div>

          {loading && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#0E2F4B] mx-auto mb-3" />
              <p className="text-gray-600 text-sm">{t('common.loading')}</p>
            </div>
          )}

          {!loading && error && (
            <p className="text-sm text-red-600">{error}</p>
          )}

          {!loading && !error && items.length === 0 && (
            <p className="text-sm text-gray-500">{t('sparePartIssue.noRequestDetails')}</p>
          )}

          {!loading && !error && items.map((item) => {
            const quantity = item.quantity != null && item.quantity !== ''
              ? `${item.quantity}${item.uom ? ` ${item.uom}` : ''}`
              : '-';
            return (
              <div
                key={item.si_id}
                className="border border-gray-200 rounded-lg p-4 space-y-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs text-gray-500">{t('sparePartIssue.sparePartName')}</div>
                    <div className="text-base font-semibold text-[#0E2F4B]">
                      {item.spare_part_name || item.spc_id || '-'}
                    </div>
                  </div>
                  <span className={`text-sm font-semibold ${statusClass(item.status)}`}>
                    {statusLabel(item.status, t)}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label={t('sparePartIssue.requestedBy')} value={item.requested_by_name} />
                  <Field label={t('sparePartIssue.requestedOn')} value={formatWhen(item.requested_on)} />
                  <Field label={t('sparePartIssue.approvedBy')} value={item.approved_by_name} />
                  <Field label={t('sparePartIssue.approvedOn')} value={formatWhen(item.approved_on)} />
                  <Field label={t('sparePartList.quantity')} value={quantity} />
                  {item.brand_name ? (
                    <Field label={t('sparePartIssue.brand')} value={item.brand_name} />
                  ) : null}
                  {item.model_name ? (
                    <Field label={t('sparePartIssue.model')} value={item.model_name} />
                  ) : null}
                  {item.status === 'IE' ? (
                    <>
                      <Field label={t('sparePartIssue.issuedBy')} value={item.issued_by_name} />
                      <Field label={t('sparePartIssue.issuedOn')} value={formatWhen(item.issued_on)} />
                    </>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>

        <div className="px-6 py-3 border-t flex justify-end flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-[#0E2F4B] text-white text-sm font-medium rounded hover:bg-[#14395c]"
          >
            {t('sparePartIssue.close')}
          </button>
        </div>
      </div>
    </div>
  );
}
