import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import API from '../lib/axios';
import { toast } from 'react-hot-toast';
import { Save, X, QrCode } from 'lucide-react';

const CreateInspectionFrequency = () => {
  const navigate = useNavigate();
  
  const [assetTypeChecklistMappings, setAssetTypeChecklistMappings] = useState([]);
  const [uomOptions, setUomOptions] = useState([]);
  const [techLoading, setTechLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Tab and scan state
  const [activeTab, setActiveTab] = useState('manual'); // 'manual' or 'scan'
  const [scannedAssetId, setScannedAssetId] = useState('');
  const [showScanner, setShowScanner] = useState(false);
  const scannerRef = useRef(null);
  
  // Form state
  const [selectedMapping, setSelectedMapping] = useState('');
  const [isRecurring, setIsRecurring] = useState(true);
  const [frequency, setFrequency] = useState('');
  const [uom, setUom] = useState('');
  const [text, setText] = useState('');
  const [maintainedBy, setMaintainedBy] = useState('In-House');
  const [technicians, setTechnicians] = useState([]);
  const [selectedTechnician, setSelectedTechnician] = useState('');

  // Fetch asset type checklist mappings
  const fetchChecklistMappings = async () => {
    try {
      const res = await API.get('/asset-type-checklist-mapping/all');
      if (res.data && res.data.data && Array.isArray(res.data.data)) {
        // Transform data to include a display name
        const mappingsWithDisplay = res.data.data.map(m => ({
          ...m,
          displayName: `${m.asset_type_name}${m.asset_name ? ` (${m.asset_name})` : ' (All Assets)'}`,
          rowId: m.asset_id ? `${m.at_id}_${m.asset_id}` : m.at_id
        }));
        setAssetTypeChecklistMappings(mappingsWithDisplay);
      }
    } catch (error) {
      console.error('Error fetching checklist mappings:', error);
      toast.error('Failed to fetch asset type mappings');
      setAssetTypeChecklistMappings([]);
    }
  };

  // Fetch UOM values
  const fetchUOM = async () => {
    try {
      const res = await API.get('/uom');
      let uomData = [];
      
      if (res.data && res.data.data && Array.isArray(res.data.data)) {
        uomData = res.data.data;
      } else if (Array.isArray(res.data)) {
        uomData = res.data;
      }
      
      setUomOptions(uomData.map(u => ({
        id: u.UOM_id || u.uom_id || u.uomId || u.id,
        text: u.UOM || u.uom || u.text
      })));
    } catch (error) {
      console.error('Error fetching UOM values:', error);
      toast.error('Failed to fetch UOM values');
      setUomOptions([]);
    }
  };

  useEffect(() => {
    fetchChecklistMappings();
    fetchUOM();
    // technicians will be loaded for a selected mapping (certified list)
  }, []);

  const fetchTechnicians = async () => {
    try {
      setTechLoading(true);
      const res = await API.get('/employees');
      const data = res.data?.data || res.data || [];
      // expect objects with emp_int_id and name fields
      setTechnicians(data.map(e => ({ emp_int_id: e.emp_int_id || e.employee_id || e.user_id, name: e.name || e.full_name || e.employee_id })));
    } catch (err) {
      console.error('Failed to fetch technicians:', err);
      setTechnicians([]);
    } finally {
      setTechLoading(false);
    }
  };

  // Fetch certified technicians for the selected asset mapping (use inspection-approval endpoint)
  const fetchCertifiedTechniciansForMapping = async (mapping) => {
    try {
      if (!mapping) return;
      console.log('fetchCertifiedTechniciansForMapping: mapping selected ->', mapping);
      // get detailed mapping to obtain aatic_id
      const mappingDetails = await API.get(
        `/asset-type-checklist-mapping/${mapping.at_id}${mapping.asset_id ? '?assetId=' + mapping.asset_id : ''}`
      );
      const detailedItems = mappingDetails.data?.data || [];
      console.log('mapping details returned count:', detailedItems.length);
      if (detailedItems.length === 0) {
        setTechnicians([]);
        return;
      }
      // use asset_type_id when fetching certified technicians (inspectionApproval expects asset type)
      const asset_type_id = detailedItems[0].asset_type_id || detailedItems[0].aatic_asset_type_id || detailedItems[0].asset_type || detailedItems[0].at_id;
      console.log('resolved asset_type_id for certified techs:', asset_type_id);
      if (!asset_type_id) {
        setTechnicians([]);
        return;
      }
      setTechLoading(true);
      const resp = await API.get(`/inspection-approval/technicians/${asset_type_id}`);
      const techs = resp.data?.data || [];
      console.log('certified technicians fetched count:', techs.length, resp.data?.message || '');
      setTechnicians(techs.map(t => ({ emp_int_id: t.emp_int_id || t.employee_id, name: t.name || t.full_name || t.employee_id })));
      setTechLoading(false);
    } catch (err) {
      console.error('Failed to fetch certified technicians for mapping:', err);
      setTechnicians([]);
      setTechLoading(false);
    }
  };

  // When selected mapping or maintainedBy changes, load certified technicians for In-House
  useEffect(() => {
    if (maintainedBy === 'In-House' && selectedMapping) {
      const mapping = assetTypeChecklistMappings.find(m => m.rowId === selectedMapping);
      if (mapping) fetchCertifiedTechniciansForMapping(mapping);
    } else {
      // clear technicians when vendor or no mapping
      setTechnicians([]);
      setSelectedTechnician('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMapping, maintainedBy]);

  // Scanner setup
  useEffect(() => {
    if (showScanner && !scannerRef.current) {
      initializeScanner();
    }

    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(console.error);
        scannerRef.current = null;
      }
    };
  }, [showScanner]);

  // Handle form submission
  const handleCreateFrequency = async (e) => {
    e.preventDefault();
    
    if (!selectedMapping) {
      toast.error('Please select an asset type mapping');
      return;
    }

    // Validation only for recurring inspections
    if (isRecurring) {
      if (!frequency || isNaN(frequency) || parseFloat(frequency) <= 0) {
        toast.error('Please enter a valid frequency for recurring inspections');
        return;
      }

      if (!uom) {
        toast.error('Please select a Unit of Measure for recurring inspections');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      // Get the detailed mapping info
      const mapping = assetTypeChecklistMappings.find(m => m.rowId === selectedMapping);
      
      if (!mapping) {
        toast.error('Selected mapping not found');
        setIsSubmitting(false);
        return;
      }

      // Fetch the detailed mapping to get aatic_id
      const mappingDetails = await API.get(
        `/asset-type-checklist-mapping/${mapping.at_id}${mapping.asset_id ? '?assetId=' + mapping.asset_id : ''}`
      );
      
      const detailedItems = mappingDetails.data?.data || [];
      if (detailedItems.length === 0) {
        toast.error('No checklist items found for this mapping');
        setIsSubmitting(false);
        return;
      }

      const aatic_id = detailedItems[0].aatic_id;

      // Create the inspection frequency
      const payload = {
        aatic_id: aatic_id,
        freq: isRecurring ? parseInt(frequency) : null,
        uom: isRecurring ? uom : null,
        text: text || (isRecurring ? '' : ''),
        maintained_by: maintainedBy,
        is_recurring: isRecurring,
        emp_int_id: maintainedBy === 'In-House' ? (selectedTechnician || null) : null
      };

      await API.post('/inspection-frequencies', payload);
      
      toast.success('Inspection frequency created successfully');
      navigate('/master-data/inspection-frequency');
    } catch (error) {
      console.error('Error creating inspection frequency:', error);
      toast.error(error.response?.data?.message || 'Failed to create inspection frequency');
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
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Create Inspection Frequency</h1>
              <p className="mt-2 text-sm sm:text-base text-gray-600">
                Configure inspection frequency for asset types with inspection required
              </p>
            </div>
            <button
              onClick={() => navigate('/master-data/inspection-frequency')}
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
            <h2 className="text-xl font-semibold">Inspection Frequency Details</h2>
          </div>
          
          <div className="p-4 sm:p-6">
            {/* Tab Navigation */}
            <div className="border-b border-gray-200 mb-6">
              <nav className="-mb-px flex gap-8">
                <button
                  onClick={() => setActiveTab('manual')}
                  className={`py-2 text-sm font-medium ${
                    activeTab === 'manual'
                      ? 'border-b-2 border-[#0E2F4B] text-[#0E2F4B]'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Select Asset Type
                </button>
                <button
                  onClick={() => setActiveTab('scan')}
                  className={`py-2 text-sm font-medium ${
                    activeTab === 'scan'
                      ? 'border-b-2 border-[#0E2F4B] text-[#0E2F4B]'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Scan Asset
                </button>
              </nav>
            </div>

            {activeTab === 'manual' ? (
            <form onSubmit={handleCreateFrequency}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Asset Type Mapping Selection */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Asset Type / Mapping <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={selectedMapping}
                    onChange={(e) => setSelectedMapping(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0E2F4B] focus:border-transparent"
                    required
                  >
                    <option value="">-- Select Asset Type Mapping --</option>
                    {assetTypeChecklistMappings.map((mapping) => (
                      <option key={mapping.rowId} value={mapping.rowId}>
                        {mapping.displayName}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Inspection Frequency Type Selection */}
                {selectedMapping && (
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Inspection Frequency Type <span className="text-red-500">*</span>
                    </label>
                    <div className="flex gap-4 mt-2">
                      <label className="flex items-start cursor-pointer">
                        <input
                          type="radio"
                          name="inspectionFrequencyType"
                          value="recurring"
                          checked={isRecurring === true}
                          onChange={() => setIsRecurring(true)}
                          className="mr-3 mt-1 w-4 h-4 text-[#0E2F4B] focus:ring-[#0E2F4B]"
                          required
                        />
                        <div className="flex flex-col">
                          <span className="font-medium">Recurring</span>
                          <span className="text-xs text-gray-500">Requires frequency and UOM</span>
                        </div>
                      </label>
                      <label className="flex items-center cursor-pointer">
                        <input
                          type="radio"
                          name="inspectionFrequencyType"
                          value="ondemand"
                          checked={isRecurring === false}
                          onChange={() => setIsRecurring(false)}
                          className="mr-3 w-4 h-4 text-[#0E2F4B] focus:ring-[#0E2F4B]"
                          required
                        />
                        <span className="font-medium">On Demand</span>
                      </label>
                    </div>
                  </div>
                )}

                {/* Frequency (only for recurring) */}
                {isRecurring && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Frequency <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      value={frequency}
                      onChange={(e) => setFrequency(e.target.value)}
                      placeholder="e.g. 30"
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0E2F4B] focus:border-transparent"
                      min="1"
                    />
                  </div>
                )}

                {/* UOM (only for recurring) */}
                {isRecurring && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Unit of Measure (UOM) <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={uom}
                      onChange={(e) => setUom(e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0E2F4B] focus:border-transparent"
                    >
                      <option value="">-- Select UOM --</option>
                      {uomOptions.map((opt) => (
                        <option key={opt.id} value={opt.id}>
                          {opt.text}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Text/Description */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Text / Description
                  </label>
                  <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Enter inspection frequency details..."
                    rows="3"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0E2F4B] focus:border-transparent"
                  />
                  {!isRecurring && (
                    <p className="mt-1 text-xs text-gray-500">
                      Leave empty or add notes for on-demand inspections
                    </p>
                  )}
                </div>

                {/* Self / Vendor Managed */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Self / Vendor Managed <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-4 mt-2">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="maintainedBy"
                        value="In-House"
                        checked={maintainedBy === 'In-House'}
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
                        value="Vendor"
                        checked={maintainedBy === 'Vendor'}
                        onChange={(e) => setMaintainedBy(e.target.value)}
                        className="mr-2"
                        required
                      />
                      <span>Vendor</span>
                    </label>
                  </div>
                </div>
                {/* Technician selection for In-House */}
                {maintainedBy === 'In-House' && (
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Technician (Assign)</label>
                    <select
                      value={selectedTechnician}
                      onChange={(e) => setSelectedTechnician(e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0E2F4B] focus:border-transparent"
                      disabled={techLoading}
                    >
                      <option value="">{techLoading ? '-- Loading technicians --' : '-- Select Technician (optional) --'}</option>
                      {technicians.map(t => (
                        <option key={t.emp_int_id} value={t.emp_int_id}>{t.name} ({t.emp_int_id})</option>
                      ))}
                    </select>
                    <p className="mt-1 text-xs text-gray-500">Select a default technician for in-house inspections (optional).</p>
                  </div>
                )}
              </div>

              {/* Buttons */}
              <div className="flex gap-4 mt-8">
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
                  onClick={() => navigate('/master-data/inspection-frequency')}
                  className="px-6 py-2.5 bg-gray-500 text-white rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
            ) : (
            <form onSubmit={handleScanSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Scan Asset / Enter Asset ID
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0E2F4B] focus:border-transparent"
                      placeholder="Scan QR code or enter Asset ID"
                      value={scannedAssetId}
                      onChange={(e) => setScannedAssetId(e.target.value)}
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={startScanner}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <QrCode size={20} />
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Press Enter or click the QR icon to scan
                  </p>
                </div>

                <div className="flex gap-3 justify-end">
                  <button
                    type="button"
                    onClick={() => navigate('/master-data/inspection-frequency')}
                    className="px-6 py-2.5 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!scannedAssetId.trim()}
                    className="px-6 py-2.5 bg-[#0E2F4B] text-white rounded-md hover:bg-[#143d65] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Load Asset
                  </button>
                </div>
              </div>
            </form>
            )}
          </div>

          {/* Scanner Modal */}
          {showScanner && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
                <div className="p-4 border-b flex justify-between items-center">
                  <h3 className="text-lg font-medium text-gray-900">
                    Scan Barcode
                  </h3>
                  <button
                    onClick={stopScanner}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="relative">
                  <div id="qr-reader" className="aspect-[4/3] bg-black">
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-64 h-64 border-2 border-white rounded-lg"></div>
                    </div>
                  </div>
                </div>

                <div className="p-4 text-center">
                  <p className="text-sm text-gray-600">
                    Position barcode in scanning area
                  </p>
                </div>

                <div className="p-4 border-t flex justify-end">
                  <button
                    onClick={stopScanner}
                    className="bg-gray-200 text-gray-800 px-4 py-2 rounded text-sm hover:bg-gray-300 transition-colors"
                  >
                    Cancel
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

export default CreateInspectionFrequency;
