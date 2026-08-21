import { useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import API from '../lib/axios';
import { useLanguage } from '../contexts/LanguageContext';
import { useSparePartApprovalStore } from '../store/useSparePartApprovalStore';
import { useSparePartListStore } from '../store/useSparePartListStore';

export default function SparePartApprovalDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();

  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState(false);
  const [approved, setApproved] = useState(false);

  const loadDetail = async () => {
    setLoading(true);
    try {
      const data = await useSparePartApprovalStore.getState().fetchApprovalDetail(id, {
        force: true,
      });
      setDetail(data);
      setApproved(Boolean(data?.is_approved));
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

  const handleApprove = async () => {
    if (approved || approving || detail?.is_approved) return;

    setApproving(true);
    try {
      await API.post(`/spare-parts/issue-approvals/${id}/approve`);
      toast.success(t('sparePartApproval.approvedSuccessfully'));
      setApproved(true);
      setDetail((prev) => (prev ? { ...prev, is_approved: true, status: 'IS' } : prev));
      useSparePartApprovalStore.getState().invalidateApprovalCache();
      useSparePartListStore.getState().invalidateListCache();
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

  const isApproveDisabled = approved || approving || detail?.is_approved || detail?.status === 'IS' || detail?.status === 'IE';

  if (loading) {
    return (
      <div className="p-6 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
        <p className="text-gray-600">{t('common.loading')}</p>
      </div>
    );
  }

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
            {t('sparePartApproval.assetType')}
          </label>
          <input
            readOnly
            value={detail?.asset_type_name || '-'}
            className="w-full px-3 py-2 border border-gray-300 rounded bg-gray-100 text-gray-700"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('sparePartApproval.category')}
          </label>
          <input
            readOnly
            value={detail?.category_name || detail?.spc_id || '-'}
            className="w-full px-3 py-2 border border-gray-300 rounded bg-gray-100 text-gray-700"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('sparePartApproval.availableQuantity')}
          </label>
          <input
            readOnly
            value={detail?.available_qty ?? 0}
            className="w-full px-3 py-2 border border-gray-300 rounded bg-gray-100 text-gray-700"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('sparePartApproval.requiredQuantity')}
          </label>
          <input
            readOnly
            value={detail?.quantity_issued ?? 0}
            className="w-full px-3 py-2 border border-gray-300 rounded bg-gray-100 text-gray-700"
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
              ? t('sparePartApproval.approved')
              : approving
                ? t('common.saving')
                : t('sparePartApproval.approve')}
          </button>
        </div>
      </div>
    </div>
  );
}
