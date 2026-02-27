import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../lib/axios';
import { toast } from 'react-hot-toast';
import { Save, X } from 'lucide-react';

const CreateMaintenanceFrequency = () => {
  const navigate = useNavigate();
  
  const [assetTypes, setAssetTypes] = useState([]);
  const [maintenanceTypes, setMaintenanceTypes] = useState([]);
  const [uomOptions, setUomOptions] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form state
  const [selectedAssetType, setSelectedAssetType] = useState('');
  const [isRecurring, setIsRecurring] = useState(true); // New state for recurring/on-demand
  const [frequency, setFrequency] = useState('');
  const [uom, setUom] = useState('');
  const [text, setText] = useState('');
  const [maintainedBy, setMaintainedBy] = useState('Self');
  const [selectedMaintenanceType, setSelectedMaintenanceType] = useState('');
  const [maintLeadType, setMaintLeadType] = useState('');
  const [technicians, setTechnicians] = useState([]);
  const [selectedTechnician, setSelectedTechnician] = useState('');
  const [techLoading, setTechLoading] = useState(false);

  // Fetch asset types (only those with maint_required = true)
  const fetchAssetTypes = async () => {
    try {
      const res = await API.get('/asset-types/maint-required');
      if (res.data && res.data.success && Array.isArray(res.data.data)) {
        setAssetTypes(res.data.data);
      } else if (Array.isArray(res.data)) {
        setAssetTypes(res.data);
      }
    } catch (error) {
      console.error('Error fetching asset types:', error);
      toast.error('Failed to fetch asset types');
      setAssetTypes([]);
    }
  };

  // Fetch maintenance types
  const fetchMaintenanceTypes = async () => {
    try {
      const res = await API.get('/maint-types');
      console.log('Maintenance types API response:', res);
      console.log('Maintenance types data:', res.data);
      
      let types = [];
      if (res.data && res.data.success && Array.isArray(res.data.data)) {
        types = res.data.data;
      } else if (Array.isArray(res.data)) {
        types = res.data;
      } else if (res.data && Array.isArray(res.data.data)) {
        types = res.data.data;
      }
      
      console.log('Parsed maintenance types array:', types);
      console.log('Number of maintenance types:', types.length);
      
      // Backend now filters by int_status = 1, but add safety filter
      const filteredTypes = types.filter(mt => {
        if (!mt || !mt.maint_type_id) return false;
        // Backend filters by int_status = 1, but double-check
        const status = mt.int_status;
        if (status === undefined || status === null) {
          // If status is missing, include it (might be filtered by backend)
          return true;
        }
        // Handle numeric, string, and boolean
        return status === 1 || status === '1' || status === true || status === 'true';
      });
      
      console.log('Final maintenance types to display:', filteredTypes);
      setMaintenanceTypes(filteredTypes);
      
      if (filteredTypes.length === 0) {
        console.warn('No maintenance types found. Raw response:', res.data);
        if (types.length > 0) {
          console.warn('Raw types before filtering:', types);
        }
      }
    } catch (error) {
      console.error('Error fetching maintenance types:', error);
      console.error('Error response:', error.response);
      console.error('Error details:', error.response?.data);
      toast.error('Failed to fetch maintenance types');
      setMaintenanceTypes([]);
    }
  };

  // Fetch UOM values from tblUom
  const fetchUOM = async () => {
    try {
      const res = await API.get('/uom');
      let uomData = [];
      
      if (res.data && res.data.success && Array.isArray(res.data.data)) {
        uomData = res.data.data;
      } else if (Array.isArray(res.data)) {
        uomData = res.data;
      }
      
      // Store full UOM objects with both id and text
      setUomOptions(uomData.map(u => ({
        id: u.UOM_id || u.uom_id,
        text: u.UOM || u.uom || u.text
      })));
      
      console.log('UOM options loaded:', uomData);
    } catch (error) {
      console.error('Error fetching UOM values:', error);
      toast.error('Failed to fetch UOM values');
      setUomOptions([]);
    }
  };

  useEffect(() => {
    fetchAssetTypes();
    fetchMaintenanceTypes();
    fetchUOM();
  }, []);

  // Load certified technicians (from technician-certificates, approved in HR/manager approval) for the selected asset type
  const fetchTechnicians = async () => {
    if (!selectedAssetType) {
      setTechnicians([]);
      return;
    }
    try {
      setTechLoading(true);
      const res = await API.get(`/inspection-approval/technicians/${selectedAssetType}`);
      const data = res.data?.data ?? res.data ?? [];
      const list = Array.isArray(data) ? data : [];
      setTechnicians(
        list.map((t) => ({
          emp_int_id: t.emp_int_id || t.employee_id,
          name: t.full_name || t.name || t.emp_int_id || '',
        }))
      );
    } catch (error) {
      console.error('Error fetching certified technicians:', error);
      setTechnicians([]);
    } finally {
      setTechLoading(false);
    }
  };

  useEffect(() => {
    const normalized = (maintainedBy || '').toString().toLowerCase().replace(/\s|-/g, '');
    if (normalized && !normalized.includes('vendor')) {
      if (selectedAssetType) {
        fetchTechnicians();
      } else {
        setTechnicians([]);
        setSelectedTechnician('');
      }
    } else {
      setTechnicians([]);
      setSelectedTechnician('');
    }
  }, [maintainedBy, selectedAssetType]);

  useEffect(() => {
    if (!selectedAssetType) {
      return;
    }

    const selected = assetTypes.find((at) => at.asset_type_id === selectedAssetType);
    if (selected?.maint_type_id) {
      setSelectedMaintenanceType(selected.maint_type_id);
    }
  }, [selectedAssetType, assetTypes]);

  // Handle form submission
  const handleCreateFrequency = async (e) => {
    e.preventDefault();
    
    if (!selectedAssetType) {
      toast.error('Please select an asset type');
      return;
    }

    // Validation only for recurring maintenance
    if (isRecurring) {
      if (!frequency || isNaN(frequency) || parseFloat(frequency) <= 0) {
        toast.error('Please enter a valid frequency');
        return;
      }

      if (!uom) {
        toast.error('Please select Unit of Measure (UOM)');
        return;
      }
    }

    if (!selectedMaintenanceType) {
      toast.error('Please select a maintenance type');
      return;
    }

    setIsSubmitting(true);
    try {
      const requestData = {
        asset_type_id: selectedAssetType,
        is_recurring: isRecurring,
        maintained_by: maintainedBy,
        maint_type_id: selectedMaintenanceType,
        maint_lead_type: maintLeadType.trim() || null
      };

      // Only include frequency, uom, and text for recurring maintenance
      if (isRecurring) {
        requestData.frequency = parseFloat(frequency);
        requestData.uom = uom;
        requestData.text = text.trim() || `${frequency} ${uom}`;
      } else {
        // For on-demand, set these to null or empty
        requestData.frequency = null;
        requestData.uom = null;
        requestData.text = 'On Demand';
      }

      // For in-house/self maintenance, persist selected technician as emp_int_id
      const maintainedNormalized = (maintainedBy || '').toString().toLowerCase().replace(/\s|-/g, '');
      if (maintainedNormalized && !maintainedNormalized.includes('vendor')) {
        requestData.emp_int_id = selectedTechnician || null;
      } else {
        requestData.emp_int_id = null;
      }

      console.log('Submitting maintenance frequency with data:', requestData);
      
      const res = await API.post('/maintenance-frequencies', requestData);

      if (res.data && res.data.success) {
        toast.success('Maintenance frequency created successfully');
        // Navigate back to the list page
        navigate('/admin-settings-view');
      }
    } catch (error) {
      console.error('Error creating maintenance frequency:', error);
      toast.error(error.response?.data?.message || 'Failed to create maintenance frequency');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Create Maintenance Frequency</h1>
              <p className="mt-2 text-sm sm:text-base text-gray-600">
                Configure maintenance frequency for asset types with maintenance required
              </p>
            </div>
            <button
              onClick={() => navigate('/admin-settings-view')}
              className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:text-gray-900 transition-colors"
            >
              <X size={20} />
              <span className="hidden sm:inline">Close</span>
            </button>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="bg-[#0E2F4B] text-white py-4 px-6 rounded-t-lg border-b-4 border-[#FFC107]">
            <h2 className="text-xl font-semibold">Maintenance Frequency Details</h2>
          </div>
          
          <div className="p-4 sm:p-6">
            <form onSubmit={handleCreateFrequency}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Asset Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={selectedAssetType}
                    onChange={(e) => setSelectedAssetType(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0E2F4B] focus:border-transparent"
                    required
                  >
                    <option value="">-- Select Asset Type --</option>
                    {assetTypes.map((at) => (
                      <option key={at.asset_type_id} value={at.asset_type_id}>
                        {at.text}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Recurring / On-Demand Selection */}
                {selectedAssetType && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Maintenance Type <span className="text-red-500">*</span>
                    </label>
                    <div className="flex gap-4 mt-2">
                      <label className="flex items-center cursor-pointer">
                        <input
                          type="radio"
                          name="maintenanceScheduleType"
                          value="recurring"
                          checked={isRecurring === true}
                          onChange={() => setIsRecurring(true)}
                          className="mr-2 w-4 h-4 text-[#0E2F4B] focus:ring-[#0E2F4B]"
                          required
                        />
                        <span className="font-medium">Recurring</span>
                      </label>
                      <label className="flex items-center cursor-pointer">
                        <input
                          type="radio"
                          name="maintenanceScheduleType"
                          value="ondemand"
                          checked={isRecurring === false}
                          onChange={() => setIsRecurring(false)}
                          className="mr-2 w-4 h-4 text-[#0E2F4B] focus:ring-[#0E2F4B]"
                          required
                        />
                        <span className="font-medium">On Demand</span>
                      </label>
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      {isRecurring 
                        ? 'Recurring maintenance requires frequency and UOM' 
                        : 'On-demand maintenance does not require frequency configuration'}
                    </p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Maintenance Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={selectedMaintenanceType}
                    onChange={(e) => setSelectedMaintenanceType(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0E2F4B] focus:border-transparent"
                    required
                  >
                    <option value="">-- Select Maintenance Type --</option>
                    {maintenanceTypes.map((mt) => (
                      <option key={mt.maint_type_id} value={mt.maint_type_id}>
                        {mt.text}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Maintenance Lead Time
                  </label>
                  <input
                    type="text"
                    value={maintLeadType}
                    onChange={(e) => setMaintLeadType(e.target.value)}
                    placeholder="Enter maintenance lead time"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0E2F4B] focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Frequency <span className="text-red-500">*</span>
                    Frequency {isRecurring && <span className="text-red-500">*</span>}
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value)}
                    placeholder={isRecurring ? "Enter frequency (e.g., 30, 90, 180)" : "Not required for on-demand"}
                    className={`w-full px-4 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0E2F4B] focus:border-transparent ${
                      !isRecurring ? 'bg-gray-100 cursor-not-allowed' : ''
                    }`}
                    required={isRecurring}
                    disabled={!isRecurring}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Unit of Measure (UOM) {isRecurring && <span className="text-red-500">*</span>}
                  </label>
                  <select
                    value={uom}
                    onChange={(e) => setUom(e.target.value)}
                    className={`w-full px-4 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0E2F4B] focus:border-transparent ${
                      !isRecurring ? 'bg-gray-100 cursor-not-allowed' : ''
                    }`}
                    required={isRecurring}
                    disabled={!isRecurring}
                  >
                    <option value="">{isRecurring ? "-- Select UOM --" : "Not required for on-demand"}</option>
                    {uomOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.text}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Text
                  </label>
                  <input
                    type="text"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder={isRecurring ? "Enter description (e.g., Quarterly, Monthly)" : "Will be set as 'On Demand'"}
                    className={`w-full px-4 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0E2F4B] focus:border-transparent ${
                      !isRecurring ? 'bg-gray-100 cursor-not-allowed' : ''
                    }`}
                    disabled={!isRecurring}
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    {isRecurring 
                      ? 'Leave empty to auto-generate from frequency and UOM'
                      : 'Will automatically be set to "On Demand"'}
                  </p>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Self / Vendor Managed <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-4 mt-2">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="maintainedBy"
                        value="Self"
                        checked={maintainedBy === 'Self'}
                        onChange={(e) => setMaintainedBy(e.target.value)}
                        className="mr-2"
                        required
                      />
                      <span>In-House</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="maintainedBy"
                        value="vendor"
                        checked={maintainedBy === 'vendor'}
                        onChange={(e) => setMaintainedBy(e.target.value)}
                        className="mr-2"
                        required
                      />
                      <span>Vendor</span>
                    </label>
                  </div>
                </div>

                {/* Technician selection for in-house/self maintenance – certified technicians only */}
                {(() => {
                  const normalized = (maintainedBy || '')
                    .toString()
                    .toLowerCase()
                    .replace(/\s|-/g, '');
                  if (!normalized || normalized.includes('vendor')) return null;
                  const noAssetType = !selectedAssetType;
                  return (
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Technician (Assign)
                      </label>
                      <select
                        value={selectedTechnician}
                        onChange={(e) => setSelectedTechnician(e.target.value)}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0E2F4B] focus:border-transparent disabled:bg-gray-100"
                        disabled={techLoading || noAssetType}
                      >
                        <option value="">
                          {noAssetType
                            ? '-- Select asset type first --'
                            : techLoading
                              ? '-- Loading certified technicians --'
                              : technicians.length === 0
                                ? '-- No certified technicians for this asset type --'
                                : '-- Select Technician (optional) --'}
                        </option>
                        {technicians.map((t) => (
                          <option key={t.emp_int_id} value={t.emp_int_id}>
                            {t.name}
                          </option>
                        ))}
                      </select>
                      <p className="mt-1 text-xs text-gray-500">
                        {noAssetType
                          ? 'Certified technicians are loaded after you select an asset type (from Technician Certificates, approved in HR/Manager approval).'
                          : 'Only certified technicians for this asset type are shown (optional).'}
                      </p>
                    </div>
                  );
                })()}

              </div>

              <div className="flex gap-4 mt-6">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 bg-[#0E2F4B] text-white rounded-md hover:bg-[#143d65] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0E2F4B] flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save size={18} />
                  <span>{isSubmitting ? 'Saving...' : 'Save Frequency'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/admin-settings-view')}
                  className="px-6 py-2.5 bg-gray-500 text-white rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateMaintenanceFrequency;

