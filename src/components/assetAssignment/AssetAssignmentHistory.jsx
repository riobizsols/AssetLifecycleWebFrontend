import { toast } from 'react-hot-toast';
import { showBackendTextToast } from '../../utils/errorTranslation';
import React, { useEffect, useState } from "react";
import { useLanguage } from '../../contexts/LanguageContext';
import { useAssignmentStore } from '../../store/useAssignmentStore';

function mapRawHistoryRows(rows, loadingLabel) {
  return (rows || []).map((item) => ({
    ...item,
    description: item.description || loadingLabel,
  }));
}

const AssetAssignmentHistory = ({ onClose, employeeIntId, deptId, type = 'employee' }) => {
  const { t } = useLanguage();
  const loadingLabel = t('common.loading') || 'Loading...';

  const [history, setHistory] = useState(() => {
    const cached = useAssignmentStore.getState().getCachedAssignmentHistory({
      type,
      deptId,
      employeeIntId,
    });
    return cached || [];
  });
  const [loading, setLoading] = useState(() => {
    const cached = useAssignmentStore.getState().getCachedAssignmentHistory({
      type,
      deptId,
      employeeIntId,
    });
    return cached == null;
  });

  useEffect(() => {
    if (!employeeIntId && !deptId) return;

    let cancelled = false;

    useAssignmentStore
      .getState()
      .fetchAssignmentHistory({
        type,
        deptId,
        employeeIntId,
        revalidate: true,
        onRaw: (rows) => {
          if (cancelled) return;
          setHistory(mapRawHistoryRows(rows, loadingLabel));
          setLoading(false);
        },
        onEnriched: (rows) => {
          if (cancelled) return;
          setHistory(rows || []);
          setLoading(false);
        },
      })
      .then((rows) => {
        if (!cancelled && rows?.length) {
          setHistory(rows);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          showBackendTextToast({
            toast,
            tmdId: 'TMD_I18N_EMPLOYEES_FAILEDTOFETCHASSIGNMENTHISTORY_18048F76',
            fallbackText: t('employees.failedToFetchAssignmentHistory', { type }),
            type: 'error',
          });
          setHistory([]);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [employeeIntId, deptId, type, t, loadingLabel]);

  const getTitle = () => {
    return type === 'department' ? t('employees.departmentAssetAssignmentHistory') : t('employees.assetAssignmentHistory');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="bg-white rounded-xl shadow-2xl p-0 max-w-6xl w-full relative border border-white/40">
        <div className="sticky top-0 z-20 bg-[#F5F8FA] border-b border-gray-200 rounded-t-xl flex items-center justify-between px-6 py-4 shadow-sm">
          <span className="text-2xl font-bold text-[#0E2F4B]">{getTitle()}</span>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-800 text-2xl font-bold bg-white/80 rounded-full px-3 py-1 shadow ml-4"
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <div style={{ maxHeight: '70vh', overflowY: 'auto' }} className="p-8 space-y-4">
            {loading && history.length === 0 ? (
              <div className="text-center text-gray-500 py-8">{t('employees.loadingHistory')}</div>
            ) : history.length === 0 ? (
              <div className="text-center text-gray-500 py-8">{t('employees.noAssignmentHistoryFound')}</div>
            ) : (
              history.map((item, idx) => (
                <div
                  key={item.asset_assign_id || idx}
                  className={`p-5 rounded-lg flex flex-col md:flex-row md:items-center md:justify-between gap-2 shadow-md transition border-2 ${
                    item.latest_assignment_flag
                      ? "border-green-500 bg-green-50"
                      : "border-gray-300 bg-gray-50"
                  }`}
                  style={{ boxShadow: item.latest_assignment_flag ? '0 2px 8px 0 rgba(34,197,94,0.08)' : '0 2px 8px 0 rgba(0,0,0,0.04)' }}
                >
                  <div className="flex-1">
                    <div className="font-semibold text-lg text-[#0E2F4B] mb-1">
                      <span>{item.asset_type || ''}</span>
                      {item.asset_type && <span className="text-xs text-gray-500"> </span>}
                      <span className="text-xs text-gray-500">({item.asset_id})</span>
                    </div>
                    <div className="text-gray-700 text-sm mb-1">{item.description || '-'}</div>
                    <div className="text-xs text-gray-500">
                      {item.action === 'A' ? 'Assigned on:' : 'Unassigned on:'} {item.action_on ? new Date(item.action_on).toLocaleString() : ''}
                      {type === 'department' && item.employee_name && (
                        <span className="ml-2">• Employee: {item.employee_name}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    {item.latest_assignment_flag ? (
                      <span className="inline-block px-3 py-1 rounded-full bg-green-100 text-green-700 font-semibold text-xs border border-green-400 shadow-sm">Currently Assigned</span>
                    ) : (
                      <span className="inline-block px-3 py-1 rounded-full bg-gray-100 text-gray-700 font-semibold text-xs border border-gray-300 shadow-sm">Previously Assigned</span>
                    )}
                  </div>
                </div>
              ))
            )}
         </div>
      </div>
    </div>
  );
};

export default AssetAssignmentHistory;
