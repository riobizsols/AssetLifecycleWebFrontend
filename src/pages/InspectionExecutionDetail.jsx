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

const InspectionExecutionDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
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
      toast.error("Failed to load inspection details");
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

  const validateValue = (question, value) => {
    if (question.response_type === 'QN') {
      const numValue = parseFloat(value);
      if (isNaN(numValue)) return false;
      
      const min = question.min_range;
      const max = question.max_range;
      
      if (min !== null && numValue < min) return false;
      if (max !== null && numValue > max) return false;
    }
    return true;
  };

  const isValueOutOfRange = (question, value) => {
    if (question.response_type === 'QN' && value) {
      const numValue = parseFloat(value);
      if (isNaN(numValue)) return true;
      
      const min = question.min_range;
      const max = question.max_range;
      
      if (min !== null && numValue < min) return true;
      if (max !== null && numValue > max) return true;
    }
    return false;
  };

  const handleAddRecord = async () => {
    if (!recordedValue.trim()) {
      toast.error("Please enter a value");
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

    toast.success("Value saved locally. Click Save to persist all values.");
    setShowModal(false);
    setRecordedValue('');
    setSelectedQuestion(null);
  };

  const handleFinalSave = async () => {
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
        if (res.data.success) {
          toast.success("Inspection updated successfully");
          navigate('/inspection-view');
        }
      }

      // Then update the inspection schedule
      const payload = {
        status,
        notes: formData.notes,
        trigger_maintenance: triggerMaintenance,
        act_insp_end_date: status === 'CO' ? new Date().toISOString() : null
      };
        setSaving(false);
      const res = await API.put(`/inspection/${id}`, payload);
      if (res.data.success) {
        toast.success("Inspection updated successfully");
        navigate('/inspection-view');
      }
    } catch (error) {
      console.error("Error updating inspection:", error);
      if (error.response && error.response.data) {
        console.error('Server response:', error.response.data);
        toast.error(error.response.data.message || 'Failed to update inspection');
      } else {
        toast.error("Failed to update inspection");
      }
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

  if (loading) return <div className="min-h-screen bg-white flex items-center justify-center">Loading...</div>;
  if (!data) return <div className="min-h-screen bg-white flex items-center justify-center text-red-500">Inspection not found</div>;

  return (
    <div className="min-h-screen bg-white">
      <div className="p-6 max-w-6xl mx-auto">

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Asset Information */}
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
            <h2 className="text-lg font-medium mb-4 text-gray-700 border-b pb-2">Asset Information</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                    <label className="text-gray-500 block">Asset Type</label>
                    <span className="font-medium">{data.asset_type_name}</span>
                </div>
                <div>
                    <label className="text-gray-500 block">Asset</label>
                    <span className="font-medium">{data.asset_code}</span>
                </div>
                <div>
                    <label className="text-gray-500 block">Serial No</label>
                    <span className="font-medium">{data.serial_number || '-'}</span>
                </div>
                <div>
                    <label className="text-gray-500 block">Current Status</label>
                    <StatusBadge status={data.status} />
                </div>
            </div>
        </div>

        {/* Schedule Details */}
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
            <h2 className="text-lg font-medium mb-4 text-gray-700 border-b pb-2">Schedule Details</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                    <label className="text-gray-500 block">Start Date</label>
                    <span className="font-medium">
                        {data.act_insp_st_date ? new Date(data.act_insp_st_date).toLocaleDateString() : '-'}
                    </span>
                </div>
                <div>
                    <label className="text-gray-500 block">End Date</label>
                    <span className="font-medium">
                        {data.act_insp_end_date ? new Date(data.act_insp_end_date).toLocaleDateString() : '-'}
                    </span>
                </div>
                <div>
                    <label className="text-gray-500 block">Vendor</label>
                    <span className="font-medium">{data.vendor_name || '-'}</span>
                </div>
                <div>
                    <label className="text-gray-500 block">Branch</label>
                    <span className="font-medium">{data.branch_name || '-'}</span>
                </div>
            </div>
        </div>
        {/* Inspector display removed here to avoid duplication; inspector fields remain in Complete Inspection section */}
      </div>

      {/* Inspection Checklist */}
      <div className="bg-white p-6 rounded-lg shadow border border-gray-200 mb-6">
        <h2 className="text-lg font-medium mb-4 text-gray-700 border-b pb-2">Inspection Checklist</h2>
        
        {checklistLoading ? (
          <p className="text-gray-500 text-center py-8">Loading checklist...</p>
        ) : checklist.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No checklist questions found for this asset type.</p>
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
                        {index + 1}. {question.inspection_text}
                      </h3>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span className="bg-gray-100 px-2 py-1 rounded">
                          {question.response_type === 'QN' ? 'Quantitative' : 'Qualitative'}
                        </span>
                        {question.response_type === 'QN' && (
                          <span>
                            Range: {question.min_range || 'N/A'} - {question.max_range || 'N/A'}
                          </span>
                        )}
                        {question.response_type === 'QL' && question.expected_value && (
                          <span>Expected: {question.expected_value}</span>
                        )}
                        {recordedValue && (
                          <span className={`font-medium ${isOutOfRange ? 'text-red-600' : 'text-green-600'}`}>
                            Recorded: {recordedValue}
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
        <h2 className="text-lg font-medium mb-4 text-gray-700 border-b pb-2">Complete Inspection</h2>
        
        {/* Notes */}
        <div className="mb-6">
          <label className="text-sm font-medium text-gray-700 block mb-2">Notes</label>
          <textarea
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            rows={3}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
            placeholder="Enter any additional notes or observations..."
          />
        </div>

        {/* Inspector fields for vendor-maintained inspections */}
        {data.maintained_by && String(data.maintained_by).toLowerCase() === 'vendor' && (
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Inspector Details (Vendor)</h3>
            <div className="grid grid-cols-3 gap-3">
              <input
                name="inspector_name"
                value={formData.inspector_name || ''}
                onChange={handleChange}
                placeholder="Inspector Name"
                className="w-full p-2 border border-gray-300 rounded"
              />
              <input
                name="inspector_email"
                value={formData.inspector_email || ''}
                onChange={handleChange}
                placeholder="Inspector Email"
                className="w-full p-2 border border-gray-300 rounded"
              />
              <input
                name="inspector_phone"
                value={formData.inspector_phone || ''}
                onChange={handleChange}
                placeholder="Inspector Phone"
                className="w-full p-2 border border-gray-300 rounded"
              />
            </div>
          </div>
        )}

        <div className="flex items-center justify-between pt-4 border-t">
          <div className="flex items-center gap-6">
            {/* Trigger Maintenance */}
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={triggerMaintenance}
                onChange={(e) => setTriggerMaintenance(e.target.checked)}
                className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 border-gray-300"
              />
              <span className="text-sm font-medium text-gray-700">Trigger Maintenance</span>
            </label>

            {/* Status Dropdown */}
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Status:</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
              >
                <option value="IN">Initiated</option>
                <option value="IP">In Progress</option>
                <option value="CO">Completed</option>
                <option value="CA">Cancelled</option>
              </select>
            </div>
          </div>

          <button
            onClick={handleFinalSave}
            disabled={(String(data.maintained_by || '').toLowerCase() !== 'vendor' && (data.inspected_by || data.emp_int_id) && String(user?.emp_int_id) !== String(data.inspected_by || data.emp_int_id)) || saving}
            className={`flex items-center px-6 py-2 rounded-lg transition shadow-sm ${((String(data.maintained_by || '').toLowerCase() !== 'vendor' && (data.inspected_by || data.emp_int_id) && String(user?.emp_int_id) !== String(data.inspected_by || data.emp_int_id)) || saving) ? 'bg-gray-300 text-gray-700 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
          >
            {saving ? (
              <span className="flex items-center">
                <svg className="animate-spin h-4 w-4 mr-2 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path></svg>
                Saving...
              </span>
            ) : (
              <>
                <Save size={18} className="mr-2" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </div>

      {/* Modal for Recording Values */}
      {showModal && selectedQuestion && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full mx-4 border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-800">Record Value</h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>

            <div className="mb-4">
              <p className="text-gray-700 mb-3">{selectedQuestion.inspection_text}</p>
              
              {selectedQuestion.response_type === 'QN' && (
                <div className="bg-gray-50 p-3 rounded mb-3">
                  <p className="text-sm text-gray-600">
                    <strong>Range:</strong> {selectedQuestion.min_range || 'N/A'} - {selectedQuestion.max_range || 'N/A'}
                  </p>
                </div>
              )}
              
              {selectedQuestion.response_type === 'QL' && selectedQuestion.expected_value && (
                <div className="bg-gray-50 p-3 rounded mb-3">
                  <p className="text-sm text-gray-600">
                    <strong>Expected Value:</strong> {selectedQuestion.expected_value}
                  </p>
                </div>
              )}

              <label className="text-sm font-medium text-gray-700 block mb-2">
                Recorded Value
              </label>
              <input
                type={selectedQuestion.response_type === 'QN' ? 'number' : 'text'}
                value={recordedValue}
                onChange={(e) => setRecordedValue(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                placeholder={`Enter ${selectedQuestion.response_type === 'QN' ? 'numeric' : 'text'} value...`}
              />
              
              {recordedValue && isValueOutOfRange(selectedQuestion, recordedValue) && (
                <p className="text-red-600 text-sm mt-2">
                  ⚠️ Value is outside the expected range
                </p>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleAddRecord}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default InspectionExecutionDetail;