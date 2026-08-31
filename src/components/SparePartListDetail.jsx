import { useEffect, useState } from 'react';
import { ArrowLeft, ClipboardCheck } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import API from '../lib/axios';
import ChecklistModal from './ChecklistModal';
import SparePartRequestScreen from './spareParts/SparePartRequestScreen';
import { useLanguage } from '../contexts/LanguageContext';
import { useSparePartListStore } from '../store/useSparePartListStore';

const isInhouseMaintenance = (value) => {
  const normalized = String(value || '')
    .toLowerCase()
    .replace(/\s|-/g, '');
  return Boolean(normalized) && !normalized.includes('vendor');
};

export default function SparePartListDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();

  const cachedDetail = useSparePartListStore.getState().getCachedDetail(id);
  const [maintenanceData, setMaintenanceData] = useState(cachedDetail);
  const [checklist, setChecklist] = useState([]);
  const [loadingChecklist, setLoadingChecklist] = useState(true);
  const [loadingData, setLoadingData] = useState(!cachedDetail);
  const [showChecklist, setShowChecklist] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingData(true);
      try {
        const detail = await useSparePartListStore.getState().fetchDetail(id, {
          revalidate: true,
          force: !cachedDetail,
        });
        if (!cancelled) setMaintenanceData(detail);
      } catch (err) {
        if (!cancelled) {
          toast.error(err.message || t('sparePartList.failedToFetchDetail'));
        }
      } finally {
        if (!cancelled) setLoadingData(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, cachedDetail, t]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const assetTypeId = maintenanceData?.asset_type_id;
      if (!assetTypeId) {
        setChecklist([]);
        setLoadingChecklist(false);
        return;
      }
      setLoadingChecklist(true);
      try {
        const res = await API.get(`/checklist/asset-type/${assetTypeId}`);
        if (!cancelled) {
          setChecklist(res.data?.success ? res.data.data || [] : []);
        }
      } catch {
        if (!cancelled) setChecklist([]);
      } finally {
        if (!cancelled) setLoadingChecklist(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [maintenanceData?.asset_type_id]);

  const handleRequestSubmitted = () => {
    useSparePartListStore.getState().invalidateListCache();
    navigate('/spare-part-list');
  };

  const maintenanceProvider =
    maintenanceData?.maintenance_provider || maintenanceData?.maintained_by;
  const canRequestSpareParts = isInhouseMaintenance(maintenanceProvider);

  if (loadingData && !maintenanceData) {
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
          onClick={() => navigate('/spare-part-list')}
          className="flex items-center gap-2 text-[#0E2F4B] hover:text-blue-700"
        >
          <ArrowLeft size={20} />
          {t('sparePartList.backToList')}
        </button>
      </div>

      <div className="space-y-6">
        <div className="p-6 rounded-lg border border-gray-200 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-gray-500">{t('sparePartList.assetType')}</div>
              <div className="font-semibold text-gray-800">
                {maintenanceData?.asset_type_name || '-'}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500">
                {t('sparePartList.maintenanceType')}
              </div>
              <div className="font-semibold text-gray-800">
                {maintenanceData?.maintenance_type_name || '-'}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500">
                {t('sparePartList.serialNumber')}
              </div>
              <div className="font-semibold text-gray-800">
                {maintenanceData?.serial_number || '-'}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500">{t('sparePartList.vendor')}</div>
              <div className="font-semibold text-gray-800">
                {maintenanceData?.vendor_name || '-'}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Maintenance Provider</div>
              <div className="font-semibold text-gray-800">
                {maintenanceProvider || '-'}
              </div>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-800">
                {t('maintenanceSupervisor.maintenanceChecklist')}
              </h2>
              <button
                type="button"
                onClick={() => setShowChecklist(true)}
                disabled={loadingChecklist}
                className="px-4 py-2 border border-blue-300 rounded bg-[#0E2F4B] text-white text-sm font-semibold flex items-center gap-2 justify-center hover:bg-[#14395c] transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ClipboardCheck className="w-4 h-4" />
                {loadingChecklist
                  ? t('maintenanceSupervisor.loading')
                  : t('maintenanceSupervisor.viewChecklist')}
              </button>
            </div>
          </div>

          {/* Spare Part Request — same card; quantity fields match approval layout */}
          <div className="border-t border-gray-200 pt-6">
            {canRequestSpareParts ? (
              <SparePartRequestScreen
                embedded
                amsId={id}
                assetTypeId={maintenanceData?.asset_type_id}
                onCancel={() => navigate('/spare-part-list')}
                onSubmitted={handleRequestSubmitted}
              />
            ) : (
              <p className="text-sm text-gray-500">
                Spare part requests are available only for in-house maintenance.
              </p>
            )}
          </div>
        </div>
      </div>

      <ChecklistModal
        assetType={maintenanceData?.asset_type_name || 'Asset'}
        open={showChecklist}
        onClose={() => setShowChecklist(false)}
        checklist={checklist}
      />
    </div>
  );
}
