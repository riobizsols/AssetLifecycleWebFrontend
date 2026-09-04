import { showBackendTextToast } from '../utils/errorTranslation';
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import API from "../lib/axios";
import { toast } from "react-hot-toast";
import { useAuthStore } from "../store/useAuthStore";
import { useInspectionSyncStore } from "../store/useInspectionSyncStore";
import { 
  Save, 
  Edit3,
  X
} from "lucide-react";
import StatusBadge from "../components/StatusBadge";
import InspectionSyncBanner from "../components/InspectionSyncBanner";
import { useLanguage } from "../contexts/LanguageContext";
import { useAppData } from "../contexts/AppDataContext";
import { translateMasterDataLabel } from "../utils/masterDataLabel";
import {
  getChecklist,
  getPendingRecords,
  getRecords,
  getSchedule,
  upsertChecklist,
  upsertLocalRecord,
  upsertRecordsFromServer,
  upsertSchedule,
  patchScheduleLocal,
} from "../offline/inspectionCache";
import { prefetchInspectionDetail } from "../offline/prefetch";
import { enqueueSaveAndSync } from "../offline/outbox";

function formatQuantitativeRange(question, t) {
  const min =
    question.min_range != null && question.min_range !== ""
      ? question.min_range
      : 0;
  const max =
    question.max_range != null && question.max_range !== ""
      ? question.max_range
      : t("common.notApplicable", "N/A");
  return `${min} - ${max}`;
}

const InspectionExecutionDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { getStatusText } = useAppData();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checklist, setChecklist] = useState([]);
  const [checklistRecords, setChecklistRecords] = useState([]);
  const [pendingRecords, setPendingRecords] = useState([]); // local unsaved records
  const [showModal, setShowModal] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState(null);
  const [recordedValue, setRecordedValue] = useState('');
  const [triggerMaintenance, setTriggerMaintenance] = useState(false);
  const [checklistLoading, setChecklistLoading] = useState(false);
  const [status, setStatus] = useState('IN');
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    notes: ""
  });
  const [offlineAuthBlocked, setOfflineAuthBlocked] = useState(false);
  const { user, token } = useAuthStore();

  const applyDetail = (row, { fromCache = false } = {}) => {
    if (!row) return;
    setData(row);
    setStatus(row.status || 'IN');
    setFormData({
      notes: row.notes || "",
      inspector_name: row.inspector_name || '',
      inspector_email: row.inspector_email || '',
      inspector_phone: row.inspector_phone || row.inspector_phno || ''
    });
    setTriggerMaintenance(Boolean(row.trigger_maintenance));
    useInspectionSyncStore.getState().setFromCache(fromCache);
  };

  const applyRecords = (rows) => {
    const mapped = (rows || []).map((r) => ({
      attirec_id: r.attirec_id ?? null,
      aatisch_id: id,
      insp_check_id: r.insp_check_id,
      recorded_value: r.recorded_value ?? '',
      created_on: r.created_on,
      created_by: r.created_by,
      pending: Boolean(r.pending),
    }));
    setChecklistRecords(mapped);
    setPendingRecords(
      mapped
        .filter((r) => r.pending)
        .map((r) => ({
          insp_check_id: r.insp_check_id,
          recorded_value: r.recorded_value,
        }))
    );
  };

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setOfflineAuthBlocked(false);
      const online = typeof navigator !== 'undefined' ? navigator.onLine : true;

      if (!online && !token) {
        setOfflineAuthBlocked(true);
        setData(null);
        setLoading(false);
        useInspectionSyncStore.getState().setOffline();
        return;
      }

      if (!online) {
        useInspectionSyncStore.getState().setOffline();
        const cached = await getSchedule(id);
        if (cancelled) return;
        if (cached) {
          applyDetail(cached, { fromCache: true });
          const assetType = cached.asset_type_id;
          if (assetType != null) {
            const cl = await getChecklist(assetType);
            if (!cancelled && cl?.questions) {
              setChecklist(cl.questions);
            }
          }
          const recs = await getRecords(id);
          if (!cancelled) applyRecords(recs);
        } else {
          setData(null);
        }
        setLoading(false);
        return;
      }

      try {
        const res = await API.get(`/inspection/${id}`);
        if (cancelled) return;
        if (res.data.success) {
          applyDetail(res.data.data, { fromCache: false });
          await upsertSchedule(res.data.data);
          // Prefetch checklist + records into IndexedDB (and hydrate UI)
          prefetchInspectionDetail(id).catch(() => {});
        }
      } catch (error) {
        console.error("Error fetching inspection:", error);
        const cached = await getSchedule(id);
        if (cancelled) return;
        if (cached) {
          applyDetail(cached, { fromCache: true });
        } else {
          showBackendTextToast({ toast, tmdId: 'TMD_FAILED_TO_LOAD_INSPECTION_DETAILS_75F3A40E', fallbackText: t('inspectionExecution.failedToLoadDetails'), type: 'error' });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [id, token, t]);

  useEffect(() => {
    if (!data?.asset_type_id) return;
    let cancelled = false;

    const loadChecklistAndRecords = async () => {
      const online = typeof navigator !== 'undefined' ? navigator.onLine : true;
      const assetType = data.asset_type_id;

      setChecklistLoading(true);
      try {
        if (online) {
          try {
            const res = await API.get(`/inspection/checklist/${assetType}`);
            if (res.data.success) {
              const rows = res.data.data || [];
              const seen = new Set();
              const unique = [];
              for (const r of rows) {
                if (!seen.has(r.insp_check_id)) {
                  seen.add(r.insp_check_id);
                  unique.push(r);
                }
              }
              if (!cancelled) setChecklist(unique);
              await upsertChecklist(assetType, unique);
            }
          } catch (error) {
            console.error("Error fetching checklist:", error);
            const cl = await getChecklist(assetType);
            if (!cancelled && cl?.questions) setChecklist(cl.questions);
          }

          try {
            const res = await API.get(`/inspection/${id}/records`);
            if (res.data.success) {
              await upsertRecordsFromServer(id, res.data.data || []);
            }
          } catch (error) {
            console.error("Error fetching checklist records:", error);
          }
        } else {
          const cl = await getChecklist(assetType);
          if (!cancelled && cl?.questions) setChecklist(cl.questions);
        }

        const recs = await getRecords(id);
        if (!cancelled) applyRecords(recs);
        // Also merge any pending-only list
        const pending = await getPendingRecords(id);
        if (!cancelled && pending.length) {
          setPendingRecords(pending);
        }
      } finally {
        if (!cancelled) setChecklistLoading(false);
      }
    };

    loadChecklistAndRecords();
    return () => {
      cancelled = true;
    };
  }, [data?.asset_type_id, id]);

  const handleQuestionClick = (question) => {
    setSelectedQuestion(question);
    // Check if there's an existing record for this question
    const existingRecord = checklistRecords.find(r => r.insp_check_id === question.insp_check_id);
    setRecordedValue(existingRecord?.recorded_value || '');
    setShowModal(true);
  };

  const getNumericRange = (question) => {
    const min = question.min_range != null && question.min_range !== ''
      ? parseFloat(question.min_range)
      : 0;
    const max = question.max_range != null && question.max_range !== ''
      ? parseFloat(question.max_range)
      : null;
    return {
      min: Number.isFinite(min) ? min : 0,
      max: Number.isFinite(max) ? max : null,
    };
  };

  const validateValue = (question, value) => {
    if (question.response_type === 'QN') {
      const numValue = parseFloat(value);
      if (isNaN(numValue)) return false;

      const { min, max } = getNumericRange(question);
      if (min !== null && numValue < min) return false;
      if (max !== null && numValue > max) return false;
    }
    return true;
  };

  const getRecordedValue = (questionId) => {
    const record = checklistRecords.find(r => r.insp_check_id === questionId);
    return record?.recorded_value || '';
  };

  const isValueOutOfRange = (question, value) => {
    if (question.response_type === 'QN' && value !== '' && value != null) {
      const numValue = parseFloat(value);
      if (isNaN(numValue)) return false;
      return !validateValue(question, value);
    }
    return false;
  };

  const hasOutOfRangeRecordedValues = () =>
    checklist.some((question) => {
      const value = getRecordedValue(question.insp_check_id);
      return value && isValueOutOfRange(question, value);
    });

  const notesRequired = hasOutOfRangeRecordedValues();

  const handleAddRecord = async () => {
    if (!recordedValue.trim()) {
      showBackendTextToast({ toast, tmdId: 'TMD_PLEASE_ENTER_A_VALUE_2C0B41EC', fallbackText: t('inspectionExecution.pleaseEnterValue'), type: 'error' });
      return;
    }

    // Out-of-range values are allowed; notes become mandatory on final save.
    // Save locally and mark as pending; will be sent on final save
    const existing = checklistRecords.find(r => r.insp_check_id === selectedQuestion.insp_check_id);
    const newRecord = {
      attirec_id: existing?.attirec_id || null,
      aatisch_id: id,
      insp_check_id: selectedQuestion.insp_check_id,
      recorded_value: recordedValue,
      created_on: new Date().toISOString(),
      created_by: user?.user_id || 'SYSTEM',
      pending: true,
    };

    // upsert into checklistRecords
    setChecklistRecords(prev => {
      const without = prev.filter(r => r.insp_check_id !== selectedQuestion.insp_check_id);
      return [...without, newRecord];
    });

    const nextPending = (() => {
      const without = pendingRecords.filter(r => String(r.insp_check_id) !== String(selectedQuestion.insp_check_id));
      return [...without, { insp_check_id: selectedQuestion.insp_check_id, recorded_value: recordedValue }];
    })();
    setPendingRecords(nextPending);

    // Persist to IndexedDB on every change
    try {
      await upsertLocalRecord(id, {
        insp_check_id: selectedQuestion.insp_check_id,
        recorded_value: recordedValue,
        attirec_id: existing?.attirec_id || null,
        created_by: user?.user_id || 'SYSTEM',
      });
    } catch (err) {
      console.error('[inspection-offline] failed to persist answer', err);
    }

    showBackendTextToast({ toast, tmdId: 'TMD_VALUE_SAVED_LOCALLY_CLICK_SAVE_TO_PERSIST_ALL_VALUES_02259CFB', fallbackText: t('inspectionExecution.valueSavedLocally'), type: 'success' });
    setShowModal(false);
    setRecordedValue('');
    setSelectedQuestion(null);
  };

  const handleFinalSave = async () => {
    if (hasOutOfRangeRecordedValues() && !formData.notes.trim()) {
      showBackendTextToast({
        toast,
        fallbackText: t('inspectionExecution.notesRequiredOutOfRange'),
        type: 'error',
      });
      return;
    }

    if (!token) {
      showBackendTextToast({
        toast,
        fallbackText: 'Sign in required to save. Offline login is not available.',
        type: 'error',
      });
      return;
    }

    setSaving(true);
    try {
      const pending = pendingRecords.length
        ? pendingRecords
        : await getPendingRecords(id);

      let recordsPayload = null;
      if (Array.isArray(pending) && pending.length > 0) {
        recordsPayload = {
          ais_id: id,
          records: pending,
          notes: formData.notes,
          trigger_maintenance: triggerMaintenance,
        };

        if (data?.vendor_id) {
          recordsPayload.inspector_name = formData.inspector_name;
          recordsPayload.inspector_email = formData.inspector_email;
          recordsPayload.inspector_phone = formData.inspector_phone;
        }
      }

      const completePayload = {
        status,
        notes: formData.notes,
        trigger_maintenance: triggerMaintenance,
        act_insp_end_date: status === 'CO' ? new Date().toISOString() : null,
      };

      if (data?.vendor_id) {
        completePayload.inspector_name = formData.inspector_name;
        completePayload.inspector_email = formData.inspector_email;
        completePayload.inspector_phno = formData.inspector_phone;
      }

      // Optimistically patch local schedule
      await patchScheduleLocal(id, {
        status,
        notes: formData.notes,
        trigger_maintenance: triggerMaintenance,
        act_insp_end_date: completePayload.act_insp_end_date,
      });

      const result = await enqueueSaveAndSync({
        ais_id: id,
        recordsPayload,
        completePayload,
        hasPendingRecords: Boolean(recordsPayload),
      });

      if (result?.queued) {
        setPendingRecords([]);
        showBackendTextToast({
          toast,
          fallbackText: 'Saved offline. Changes will sync when you are back online.',
          type: 'success',
        });
        navigate('/inspection-view');
        return;
      }

      if (result?.ok === false && result?.reason === 'no_token') {
        throw new Error('Sign in required to sync. Offline login is not available.');
      }

      if (result?.ok === false && result?.reason === 'auth') {
        throw new Error(result.error || 'Authentication failed during sync');
      }

      // Partial failure still queued — inform user
      if (result?.ok === false && result?.reason === 'failed') {
        setPendingRecords([]);
        showBackendTextToast({
          toast,
          fallbackText: result.error || 'Some changes could not sync. They remain queued.',
          type: 'error',
        });
        navigate('/inspection-view');
        return;
      }

      setPendingRecords([]);
      showBackendTextToast({ toast, tmdId: 'TMD_INSPECTION_UPDATED_SUCCESSFULLY_0C9AFBF8', fallbackText: t('inspectionExecution.updatedSuccessfully'), type: 'success' });
      navigate('/inspection-view');
    } catch (error) {
      console.error("Error updating inspection:", error);
      const message = error.response?.data?.message || error.message || t('inspectionExecution.failedToUpdate');
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const parseInspectorFromNotes = (notes) => {
    if (!notes) return null;
    const match = notes.match(/Inspector:\s*(.*)/i);
    if (!match) return null;
    return match[1].trim();
  };

  if (loading) return <div className="min-h-screen bg-white flex items-center justify-center">{t('common.loading')}</div>;

  if (offlineAuthBlocked) {
    return (
      <div className="min-h-screen bg-white p-4">
        <InspectionSyncBanner />
        <div className="flex items-center justify-center text-red-600 text-center max-w-md mx-auto mt-16">
          You are offline and not signed in. Connect to the network and log in to open this inspection. Offline login is not available.
        </div>
      </div>
    );
  }

  if (!data) return <div className="min-h-screen bg-white flex items-center justify-center text-red-500">{t('inspectionExecution.notFound')}</div>;

  return (
    <div className="min-h-screen bg-white">
      <div className="p-3 max-w-6xl mx-auto">
      <InspectionSyncBanner />
      <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden flex flex-col h-[calc(100vh-140px)] min-h-[560px]">
      <div className="flex-1 overflow-y-auto p-6">

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Asset Information */}
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
            <h2 className="text-lg font-medium mb-4 text-gray-700 border-b pb-2">{t('inspectionExecution.assetInformation')}</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                    <label className="text-gray-500 block">{t('inspectionExecution.assetType')}</label>
                    <span className="font-medium">{translateMasterDataLabel(data.asset_type_name, t)}</span>
                </div>
                <div>
                    <label className="text-gray-500 block">{t('inspectionExecution.asset')}</label>
                    <span className="font-medium">{data.asset_code}</span>
                </div>
                <div>
                    <label className="text-gray-500 block">{t('inspectionExecution.serialNo')}</label>
                    <span className="font-medium">{data.serial_number || '-'}</span>
                </div>
                <div>
                    <label className="text-gray-500 block">{t('inspectionExecution.currentStatus')}</label>
                    <StatusBadge status={data.status} />
                </div>
            </div>
        </div>

        {/* Schedule Details */}
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
            <h2 className="text-lg font-medium mb-4 text-gray-700 border-b pb-2">{t('inspectionExecution.scheduleDetails')}</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                    <label className="text-gray-500 block">{t('inspectionExecution.startDate')}</label>
                    <span className="font-medium">
                        {data.act_insp_st_date ? new Date(data.act_insp_st_date).toLocaleDateString() : '-'}
                    </span>
                </div>
                <div>
                    <label className="text-gray-500 block">{t('inspectionExecution.endDate')}</label>
                    <span className="font-medium">
                        {data.act_insp_end_date ? new Date(data.act_insp_end_date).toLocaleDateString() : '-'}
                    </span>
                </div>
                <div>
                    <label className="text-gray-500 block">{t('inspectionExecution.vendor')}</label>
                    <span className="font-medium">{data.vendor_name || '-'}</span>
                </div>
                <div>
                    <label className="text-gray-500 block">{t('inspectionExecution.branch')}</label>
                    <span className="font-medium">{translateMasterDataLabel(data.branch_name, t) || '-'}</span>
                </div>
            </div>
        </div>
        {/* Inspector display removed here to avoid duplication; inspector fields remain in Complete Inspection section */}
      </div>

      {/* Inspection Checklist */}
      <div className="bg-white p-6 rounded-lg shadow border border-gray-200 mb-6">
        <h2 className="text-lg font-medium mb-4 text-gray-700 border-b pb-2">{t('inspectionExecution.inspectionChecklist')}</h2>
        
        {checklistLoading ? (
          <p className="text-gray-500 text-center py-8">{t('inspectionExecution.loadingChecklist')}</p>
        ) : checklist.length === 0 ? (
          <p className="text-gray-500 text-center py-8">{t('inspectionExecution.noChecklistQuestions')}</p>
        ) : (
          <div className="space-y-3">
            {checklist.map((question, index) => {
              const recordedValue = getRecordedValue(question.insp_check_id);
              const isOutOfRange = recordedValue && isValueOutOfRange(question, recordedValue);
              
              return (
                <div 
                  key={question.insp_check_id}
                  className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition cursor-pointer"
                  onClick={() => handleQuestionClick(question)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-800 mb-2">
                        {index + 1}. {translateMasterDataLabel(question.inspection_text, t)}
                      </h3>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span className="bg-gray-100 px-2 py-1 rounded">
                          {question.response_type === 'QN' ? t('inspectionExecution.quantitative') : t('inspectionExecution.qualitative')}
                        </span>
                        {question.response_type === 'QN' && (
                          <span>
                            {t('inspectionExecution.range')}: {formatQuantitativeRange(question, t)}
                          </span>
                        )}
                        {question.response_type === 'QL' && question.expected_value && (
                          <span>{t('inspectionExecution.expected')}: {question.expected_value}</span>
                        )}
                        {recordedValue && (
                          <span className={`font-medium ${isOutOfRange ? 'text-red-600' : 'text-green-600'}`}>
                            {t('inspectionExecution.recorded')}: {recordedValue}
                          </span>
                        )}
                      </div>
                    </div>
                    <Edit3 size={18} className="text-gray-400" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Final Actions */}
      <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
        <h2 className="text-lg font-medium mb-4 text-gray-700 border-b pb-2">{t('inspectionExecution.completeInspection')}</h2>
        
        {/* Notes */}
        <div className="mb-6">
          <label className="text-sm font-medium text-gray-700 block mb-2">
            {t('inspectionExecution.notes')}
            {notesRequired && <span className="text-red-500 ml-1">*</span>}
          </label>
          {notesRequired && (
            <p className="text-sm text-red-600 mb-2">{t('inspectionExecution.notesRequiredHint')}</p>
          )}
          <textarea
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            rows={3}
            required={notesRequired}
            className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition ${
              notesRequired && !formData.notes.trim() ? 'border-red-400' : 'border-gray-300'
            }`}
            placeholder={
              notesRequired
                ? t('inspectionExecution.notesRequiredPlaceholder')
                : t('inspectionExecution.notesPlaceholder')
            }
          />
        </div>

        {/* Inspector fields for vendor-maintained inspections */}
        {data.maintained_by && String(data.maintained_by).toLowerCase() === 'vendor' && (
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-700 mb-2">{t('inspectionExecution.inspectorDetailsVendor')}</h3>
            <div className="grid grid-cols-3 gap-3">
              <input
                name="inspector_name"
                value={formData.inspector_name || ''}
                onChange={handleChange}
                placeholder={t('inspectionExecution.inspectorName')}
                className="w-full p-2 border border-gray-300 rounded"
              />
              <input
                name="inspector_email"
                value={formData.inspector_email || ''}
                onChange={handleChange}
                placeholder={t('inspectionExecution.inspectorEmail')}
                className="w-full p-2 border border-gray-300 rounded"
              />
              <input
                name="inspector_phone"
                value={formData.inspector_phone || ''}
                onChange={handleChange}
                placeholder={t('inspectionExecution.inspectorPhone')}
                className="w-full p-2 border border-gray-300 rounded"
              />
            </div>
          </div>
        )}

      </div>
      </div>
      <div className="shrink-0 border-t border-gray-200 bg-white">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={triggerMaintenance}
                onChange={(e) => setTriggerMaintenance(e.target.checked)}
                className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 border-gray-300"
              />
              <span className="text-sm font-medium text-gray-700">{t('inspectionExecution.triggerMaintenance')}</span>
            </label>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">{t('inspectionExecution.status')}:</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
              >
                <option value="IN">{getStatusText('IN') || t('inspectionView.initiated')}</option>
                <option value="IP">{getStatusText('IP') || t('inspectionView.inProgress')}</option>
                <option value="CO">{getStatusText('CO') || t('inspectionView.completed')}</option>
                <option value="CA">{getStatusText('CA') || t('inspectionView.cancelled')}</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/inspection-view')}
              disabled={saving}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t('common.cancel')}
            </button>
            <button
              onClick={handleFinalSave}
              disabled={(String(data.maintained_by || '').toLowerCase() !== 'vendor' && (data.inspected_by || data.emp_int_id) && String(user?.emp_int_id) !== String(data.inspected_by || data.emp_int_id)) || saving}
              className={`flex items-center px-6 py-2 rounded-lg transition shadow-sm ${((String(data.maintained_by || '').toLowerCase() !== 'vendor' && (data.inspected_by || data.emp_int_id) && String(user?.emp_int_id) !== String(data.inspected_by || data.emp_int_id)) || saving) ? 'bg-gray-300 text-gray-700 cursor-not-allowed' : 'bg-[#0E2F4B] text-white hover:bg-[#1a4a76]'}`}
            >
              {saving ? (
                <span className="flex items-center">
                  <svg className="animate-spin h-4 w-4 mr-2 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path></svg>
                  {t('common.saving')}
                </span>
              ) : (
                <>
                  <Save size={18} className="mr-2" />
                  {t('inspectionExecution.saveChanges')}
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Modal for Recording Values */}
      {showModal && selectedQuestion && (() => {
        const modalOutOfRange = Boolean(
          recordedValue && isValueOutOfRange(selectedQuestion, recordedValue)
        );
        return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full mx-4 border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-800">{t('inspectionExecution.recordValue')}</h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>

            <div className="mb-4">
              <p className="text-gray-700 mb-3">{translateMasterDataLabel(selectedQuestion.inspection_text, t)}</p>
              
              {selectedQuestion.response_type === 'QN' && (
                <div className="bg-gray-50 p-3 rounded mb-3">
                  <p className="text-sm text-gray-600">
                    <strong>{t('inspectionExecution.range')}:</strong> {formatQuantitativeRange(selectedQuestion, t)}
                  </p>
                </div>
              )}
              
              {selectedQuestion.response_type === 'QL' && selectedQuestion.expected_value && (
                <div className="bg-gray-50 p-3 rounded mb-3">
                  <p className="text-sm text-gray-600">
                    <strong>{t('inspectionExecution.expectedValue')}:</strong> {selectedQuestion.expected_value}
                  </p>
                </div>
              )}

              <label className="text-sm font-medium text-gray-700 block mb-2">
                {t('inspectionExecution.recordedValue')}
              </label>
              <input
                type={selectedQuestion.response_type === 'QN' ? 'number' : 'text'}
                value={recordedValue}
                onChange={(e) => setRecordedValue(e.target.value)}
                className={`w-full p-3 border rounded-lg focus:ring-2 outline-none transition ${
                  modalOutOfRange
                    ? 'border-red-500 focus:ring-red-500 focus:border-red-500 text-red-600'
                    : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                }`}
                placeholder={selectedQuestion.response_type === 'QN' ? t('inspectionExecution.enterNumericValue') : t('inspectionExecution.enterTextValue')}
              />
              
              {modalOutOfRange && (
                <p className="text-red-600 text-sm mt-2">
                  {t('inspectionExecution.valueOutsideRange')}
                </p>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleAddRecord}
                disabled={!recordedValue.trim()}
                className={`flex-1 px-4 py-2 rounded-lg transition ${
                  !recordedValue.trim()
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {t('common.add')}
              </button>
            </div>
          </div>
        </div>
        );
      })()}
      </div>
      </div>
    </div>
  );
};

export default InspectionExecutionDetail;