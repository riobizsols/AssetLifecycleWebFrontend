import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../lib/axios';
import { toast } from 'react-hot-toast';
import { Save, X } from 'lucide-react';

const CreateInspectionFrequency = () => {
  const navigate = useNavigate();
  
  const [assetTypeChecklistMappings, setAssetTypeChecklistMappings] = useState([]);
  const [uomOptions, setUomOptions] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form state
  const [selectedMapping, setSelectedMapping] = useState('');
  const [isRecurring, setIsRecurring] = useState(true);
  const [frequency, setFrequency] = useState('');
  const [uom, setUom] = useState('');
  const [text, setText] = useState('');
  const [maintainedBy, setMaintainedBy] = useState('In-House');

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
        id: u.UOM_id || u.uom_id,
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
  }, []);

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
        is_recurring: isRecurring
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
                        <option key={opt.id} value={opt.text}>
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
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateInspectionFrequency;
