import { showBackendTextToast } from '../utils/errorTranslation';
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import API from "../lib/axios";
import { toast } from "react-hot-toast";
import { useAuthStore } from "../store/useAuthStore";
import { 
  ArrowLeft, 
  Save, 
  Edit3,
  X
} from "lucide-react";
import StatusBadge from "../components/StatusBadge";
import { useLanguage } from "../contexts/LanguageContext";
import { useAppData } from "../contexts/AppDataContext";
import { translateMasterDataLabel } from "../utils/masterDataLabel";

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
  const { user } = useAuthStore();

  useEffect(() => {
    fetchDetail();
  }, [id]);

  useEffect(() => {
    if (data?.asset_type_id) {
      fetchChecklist(data.asset_type_id);
      fetchChecklistRecords();
    }
  }, [data]);

  const fetchDetail = async () => {
    try {
      const res = await API.get(`/inspection/${id}`);
      if (res.data.success) {
        setData(res.data.data);
        setStatus(res.data.data.status || 'IN');
        setFormData({
          notes: res.data.data.notes || "",
          inspector_name: res.data.data.inspector_name || '',
          inspector_email: res.data.data.inspector_email || '',
          inspector_phone: res.data.data.inspector_phone || res.data.data.inspector_phno || ''
        });
        // Initialize trigger maintenance checkbox from API value
        setTriggerMaintenance(Boolean(res.data.data.trigger_maintenance));
      }
    } catch (error) {
      console.error("Error fetching inspection:", error);
      showBackendTextToast({ toast, tmdId: 'TMD_FAILED_TO_LOAD_INSPECTION_DETAILS_75F3A40E', fallbackText: t('inspectionExecution.failedToLoadDetails'), type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const fetchChecklist = async (assetType) => {
    setChecklistLoading(true);
    try {
      const res = await API.get(`/inspection/checklist/${assetType}`);
      if (res.data.success) {
        // Deduplicate checklist by insp_check_id to avoid duplicate keys
        const rows = res.data.data || [];
        const seen = new Set();
        const unique = [];
        for (const r of rows) {
          if (!seen.has(r.insp_check_id)) {
            seen.add(r.insp_check_id);
            unique.push(r);
          }
        }
        setChecklist(unique);
      }
    } catch (error) {
      console.error("Error fetching checklist:", error);
      // Don't show error toast as this might be expected for some asset types
    } finally {
      setChecklistLoading(false);
    }
  };

  const fetchChecklistRecords = async () => {
    try {
      const res = await API.get(`/inspection/${id}/records`);
      if (res.data.success) {
        setChecklistRecords(res.data.data);
      }
    } catch (error) {
      console.error("Error fetching checklist records:", error);
    }
  };

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
      : null;
    const max = question.max_range != null && question.max_range !== ''
      ? parseFloat(question.max_range)
      : null;
    return {
      min: Number.isFinite(min) ? min : null,
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

  const isValueOutOfRange = (question, value) => {
    if (question.response_type === 'QN' && value) {
      return !validateValue(question, value);
    }
    return false;
  };

  const validatePendingRecords = (records) => {
    for (const record of records) {
      const question = checklist.find((q) => q.insp_check_id === record.insp_check_id);
      if (!question) continue;
      if (!validateValue(question, record.recorded_value)) {
        return question;
      }
    }
    return null;
  };

  const handleAddRecord = async () => {
    if (!recordedValue.trim()) {
      showBackendTextToast({ toast, tmdId: 'TMD_PLEASE_ENTER_A_VALUE_2C0B41EC', fallbackText: t('inspectionExecution.pleaseEnterValue'), type: 'error' });
      return;
    }

    if (!validateValue(selectedQuestion, recordedValue)) {
      showBackendTextToast({
        toast,
        fallbackText: t('inspectionExecution.valueOutsideRange'),
        type: 'error',
      });
      return;
    }

    // Save locally and mark as pending; will be sent on final save
    const existing = checklistRecords.find(r => r.insp_check_id === selectedQuestion.insp_check_id);
    const newRecord = {
      attirec_id: existing?.attirec_id || null,
      aatisch_id: id,
      insp_check_id: selectedQuestion.insp_check_id,
      recorded_value: recordedValue,
      created_on: new Date().toISOString(),
      created_by: user?.user_id || 'SYSTEM'
    };

    // upsert into checklistRecords
    setChecklistRecords(prev => {
      const without = prev.filter(r => r.insp_check_id !== selectedQuestion.insp_check_id);
      return [...without, newRecord];
    });

    setPendingRecords(prev => {
      const without = prev.filter(r => r.insp_check_id !== selectedQuestion.insp_check_id);
      return [...without, { insp_check_id: selectedQuestion.insp_check_id, recorded_value: recordedValue }];
    });

    showBackendTextToast({ toast, tmdId: 'TMD_VALUE_SAVED_LOCALLY_CLICK_SAVE_TO_PERSIST_ALL_VALUES_02259CFB', fallbackText: t('inspectionExecution.valueSavedLocally'), type: 'success' });
    setShowModal(false);
    setRecordedValue('');
    setSelectedQuestion(null);
  };

  const handleFinalSave = async () => {
    if (Array.isArray(pendingRecords) && pendingRecords.length > 0) {
      const invalidQuestion = validatePendingRecords(pendingRecords);
      if (invalidQuestion) {
        showBackendTextToast({
          toast,
          fallbackText: t('inspectionExecution.valueOutsideRange'),
          type: 'error',
        });
        return;
      }
    }

    setSaving(true);
    try {
      // First, persist any pending checklist records.
      // Also persist inspector fields for vendor inspections even when no checklist records were changed.
      const recPayload = {
        ais_id: id,
        records: pendingRecords,
        notes: formData.notes,
        trigger_maintenance: triggerMaintenance
      };

      // Include inspector fields only for vendor-maintained inspections
      if (data?.vendor_id) {
        recPayload.inspector_name = formData.inspector_name;
        recPayload.inspector_email = formData.inspector_email;
        recPayload.inspector_phone = formData.inspector_phone;
      }

      const shouldSendRecPayload = (Array.isArray(pendingRecords) && pendingRecords.length > 0) ||
        (data?.vendor_id && (formData.inspector_name || formData.inspector_email || formData.inspector_phone));

      if (shouldSendRecPayload) {
        const recRes = await API.post('/inspection/records', recPayload);
        if (recRes.data.success) {
          showBackendTextToast({ toast, tmdId: 'TMD_INSPECTION_UPDATED_SUCCESSFULLY_0C9AFBF8', fallbackText: t('inspectionExecution.updatedSuccessfully'), type: 'success' });
          navigate('/inspection-view');
          return;
        }
      }

      // Then update the inspection schedule
      const payload = {
        status,
        notes: formData.notes,
        trigger_maintenance: triggerMaintenance,
        act_insp_end_date: status === 'CO' ? new Date().toISOString() : null
      };
      const res = await API.put(`/inspection/${id}`, payload);
      if (res.data.success) {
        showBackendTextToast({ toast, tmdId: 'TMD_INSPECTION_UPDATED_SUCCESSFULLY_0C9AFBF8', fallbackText: t('inspectionExecution.updatedSuccessfully'), type: 'success' });
        navigate('/inspection-view');
      }
    } catch (error) {
      console.error("Error updating inspection:", error);
      if (error.response && error.response.data) {
        console.error('Server response:', error.response.data);
        toast.error(error.response.data.message || t('inspectionExecution.failedToUpdate'));
      } else {
        showBackendTextToast({ toast, tmdId: 'TMD_FAILED_TO_UPDATE_INSPECTION_5F02CAA9', fallbackText: t('inspectionExecution.failedToUpdate'), type: 'error' });
      }
    } finally {
      setSaving(false);
    }
  };

  const getRecordedValue = (questionId) => {
    const record = checklistRecords.find(r => r.insp_check_id === questionId);
    return record?.recorded_value || '';
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
  if (!data) return <div className="min-h-screen bg-white flex items-center justify-center text-red-500">{t('inspectionExecution.notFound')}</div>;

  return (
    <div className="min-h-screen bg-white">
      <div className="p-3 max-w-6xl mx-auto">
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
                            {t('inspectionExecution.range')}: {question.min_range ?? t('common.na')} - {question.max_range ?? t('common.na')}
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
          <label className="text-sm font-medium text-gray-700 block mb-2">{t('inspectionExecution.notes')}</label>
          <textarea
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            rows={3}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
            placeholder={t('inspectionExecution.notesPlaceholder')}
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
      {showModal && selectedQuestion && (
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
                    <strong>{t('inspectionExecution.range')}:</strong> {selectedQuestion.min_range ?? t('common.na')} - {selectedQuestion.max_range ?? t('common.na')}
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
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                placeholder={selectedQuestion.response_type === 'QN' ? t('inspectionExecution.enterNumericValue') : t('inspectionExecution.enterTextValue')}
              />
              
              {recordedValue && isValueOutOfRange(selectedQuestion, recordedValue) && (
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
                disabled={!recordedValue.trim() || isValueOutOfRange(selectedQuestion, recordedValue)}
                className={`flex-1 px-4 py-2 rounded-lg transition ${
                  !recordedValue.trim() || isValueOutOfRange(selectedQuestion, recordedValue)
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {t('common.add')}
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
      </div>
    </div>
  );
};

export default InspectionExecutionDetail;