import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../lib/axios';
import { toast } from 'react-hot-toast';
import { useLanguage } from '../contexts/LanguageContext';
import { Plus, Edit2, Trash2, Save, X, Filter, Minus, ChevronDown } from 'lucide-react';
import { filterData } from '../utils/filterData';

const MaintenanceFrequency = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('frequency'); // frequency, checklist

  // First Tab - Maintenance Frequency
  const [maintenanceTypes, setMaintenanceTypes] = useState([]);
  const [uomOptions, setUomOptions] = useState([]);
  const [frequencies, setFrequencies] = useState([]);
  const [allFrequencies, setAllFrequencies] = useState([]); // Store all frequencies for filtering
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Edit state
  const [editingFrequency, setEditingFrequency] = useState(null);
  const [editingFormData, setEditingFormData] = useState({});

  // Filter state
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);
  const [columnFilters, setColumnFilters] = useState([{ column: '', value: '' }]);
  const [filterValues, setFilterValues] = useState({
    columnFilters: [],
    fromDate: '',
    toDate: ''
  });
  const [activeFilters, setActiveFilters] = useState([]);
  const [searchableDropdownOpen, setSearchableDropdownOpen] = useState({});
  const [searchableDropdownSearch, setSearchableDropdownSearch] = useState({});
  const dropdownRef = useRef({});
  const filterMenuRef = useRef(null);

  // Define columns for filtering
  const columns = [
    { label: 'Asset Type', name: 'asset_type_name' },
    { label: 'Frequency', name: 'frequency' },
    { label: 'Text', name: 'text' },
    { label: 'Maintained By', name: 'maintained_by' },
    { label: 'Maintenance Type', name: 'maint_type_name' },
    { label: 'Lead Time', name: 'maint_lead_type' }
  ];

  // Second Tab - Checklist
  const [selectedFreqId, setSelectedFreqId] = useState('');
  const [selectedFrequencyData, setSelectedFrequencyData] = useState(null);
  const [checklistItems, setChecklistItems] = useState([]);
  const [newChecklistItem, setNewChecklistItem] = useState('');
  const [loadingChecklist, setLoadingChecklist] = useState(false);

  // Fetch maintenance types
  const fetchMaintenanceTypes = async () => {
    try {
      const res = await API.get('/maint-types');
      console.log('Maintenance types API response:', res);
      console.log('Maintenance types data:', res.data);
      
      let types = [];
      if (Array.isArray(res.data)) {
        types = res.data;
      } else if (res.data && Array.isArray(res.data.data)) {
        types = res.data.data;
      } else if (res.data && res.data.success && Array.isArray(res.data.data)) {
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

  // Helper function to get UOM text from UOM_id or UOM text
  const getUomText = (uomValue) => {
    if (!uomValue) return '';
    
    // Normalize the UOM value - remove any extra spaces
    const normalizedValue = String(uomValue).trim();
    
    // If it looks like an ID (starts with "UOM" and has numbers), look it up
    if (normalizedValue.match(/^UOM\d+/i)) {
      const uomOption = uomOptions.find(u => {
        const optionId = String(u.id || '').trim();
        return optionId === normalizedValue || optionId.toUpperCase() === normalizedValue.toUpperCase();
      });
      if (uomOption && uomOption.text) {
        return uomOption.text;
      }
    }
    
    // If it's already text (like "Days", "Months"), check if it exists in our options
    const uomOption = uomOptions.find(u => {
      const optionText = String(u.text || '').trim();
      const optionId = String(u.id || '').trim();
      return optionText === normalizedValue || 
             optionId === normalizedValue ||
             optionText.toLowerCase() === normalizedValue.toLowerCase() ||
             optionId.toUpperCase() === normalizedValue.toUpperCase();
    });
    
    if (uomOption && uomOption.text) {
      return uomOption.text;
    }
    
    // If not found, return the original value (might already be text)
    return normalizedValue;
  };

  // Fetch all maintenance frequencies
  const fetchFrequencies = async () => {
    setLoading(true);
    try {
      const res = await API.get('/maintenance-frequencies');
      if (res.data && res.data.success) {
        const data = res.data.data || [];
        setAllFrequencies(data);
        // Apply filters if any
        applyFilters(data);
      }
    } catch (error) {
      console.error('Error fetching maintenance frequencies:', error);
      toast.error('Failed to fetch maintenance frequencies');
    } finally {
      setLoading(false);
    }
  };

  // Apply filters to data
  const applyFilters = (data) => {
    let filteredData = [...data];
    
    // Apply column filters
    if (filterValues.columnFilters && filterValues.columnFilters.length > 0) {
      // Process filters to handle maint_lead_type with "days" suffix
      const processedFilters = filterValues.columnFilters.map(filter => {
        if (filter.column === 'maint_lead_type' && filter.value && filter.value.includes('days')) {
          // Extract numeric value from "X days" format
          const numericValue = filter.value.replace(/\s*days?\s*/i, '').trim();
          return { ...filter, value: numericValue };
        }
        return filter;
      });
      
      filteredData = filterData(filteredData, { columnFilters: processedFilters }, columns);
    }
    
    setFrequencies(filteredData);
  };

  // Handle filter change
  const handleFilterChange = (columnName, value) => {
    if (columnName === "columnFilters") {
      setFilterValues((prev) => ({
        ...prev,
        columnFilters: value,
      }));
      
      // Update active filters
      if (value && value.length > 0) {
        setActiveFilters((prev) => {
          const existing = prev.find(f => f.type === "search");
          if (existing) {
            return prev;
          }
          return [...prev, { type: "search" }];
        });
      } else {
        setActiveFilters((prev) => prev.filter(f => f.type !== "search"));
      }
    } else if (columnName === "fromDate" || columnName === "toDate") {
      setFilterValues((prev) => ({
        ...prev,
        [columnName]: value,
      }));
    }
  };

  // Filter handler functions
  const handleColumnChange = (index, column) => {
    const updated = [...columnFilters];
    updated[index].column = column;
    updated[index].value = "";
    setColumnFilters(updated);
    
    const validFilters = updated.filter((f) => f.column && f.value);
    handleFilterChange("columnFilters", validFilters);
  };

  const handleValueChange = (index, value) => {
    const updated = [...columnFilters];
    updated[index].value = value;
    setColumnFilters(updated);
    
    const validFilters = updated.filter((f) => f.column && f.value);
    handleFilterChange("columnFilters", validFilters);
  };

  const addColumnFilter = () => {
    setColumnFilters([...columnFilters, { column: "", value: "" }]);
  };

  const removeColumnFilter = (index) => {
    const updated = columnFilters.filter((_, i) => i !== index);
    setColumnFilters(updated);
    
    if (updated.length === 0 && activeFilters.some((f) => f.type === "search")) {
      setActiveFilters((prev) => prev.filter((f) => f.type !== "search"));
    }
    
    const validFilters = updated.filter((f) => f.column && f.value);
    handleFilterChange("columnFilters", validFilters);
  };

  const handleRemoveFilter = (index) => {
    if (activeFilters[index].type === "search") {
      setColumnFilters([{ column: "", value: "" }]);
      handleFilterChange("columnFilters", []);
    }
    setActiveFilters((prev) => prev.filter((_, i) => i !== index));
  };

  // Searchable dropdown handlers
  const toggleSearchableDropdown = (index) => {
    setSearchableDropdownOpen(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const handleSearchableDropdownSearch = (index, searchTerm) => {
    setSearchableDropdownSearch(prev => ({
      ...prev,
      [index]: searchTerm
    }));
  };

  const selectSearchableValue = (index, value) => {
    handleValueChange(index, value);
    setSearchableDropdownOpen(prev => ({
      ...prev,
      [index]: false
    }));
    setSearchableDropdownSearch(prev => ({
      ...prev,
      [index]: ""
    }));
  };

  // Handle click outside to close searchable dropdowns
  useEffect(() => {
    const handleClickOutside = (event) => {
      Object.keys(searchableDropdownOpen).forEach(index => {
        if (searchableDropdownOpen[index] && 
            dropdownRef.current[index] && 
            !dropdownRef.current[index].contains(event.target)) {
          setSearchableDropdownOpen(prev => ({
            ...prev,
            [index]: false
          }));
          setSearchableDropdownSearch(prev => ({
            ...prev,
            [index]: ""
          }));
        }
      });
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [searchableDropdownOpen]);

  // Handle click outside to close filter menu
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (filterMenuOpen && 
          filterMenuRef.current && 
          !filterMenuRef.current.contains(event.target) &&
          !event.target.closest('button[title="Filter"]')) {
        setFilterMenuOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [filterMenuOpen]);

  // Apply filters when filterValues change
  useEffect(() => {
    if (allFrequencies.length > 0) {
      applyFilters(allFrequencies);
    }
  }, [filterValues]);

  // Fetch checklist items
  const fetchChecklistItems = async (freqId) => {
    if (!freqId) {
      setChecklistItems([]);
      return;
    }
    setLoadingChecklist(true);
    try {
      const res = await API.get(`/maintenance-frequencies/${freqId}/checklist`);
      if (res.data && res.data.success) {
        setChecklistItems(res.data.data || []);
      }
    } catch (error) {
      console.error('Error fetching checklist items:', error);
      toast.error('Failed to fetch checklist items');
    } finally {
      setLoadingChecklist(false);
    }
  };

  useEffect(() => {
    fetchMaintenanceTypes();
    fetchUOM();
    fetchFrequencies();
  }, []);

  useEffect(() => {
    if (selectedFreqId) {
      // Find the selected frequency data
      const freqData = frequencies.find(f => f.at_main_freq_id === selectedFreqId);
      if (freqData) {
        setSelectedFrequencyData(freqData);
        fetchChecklistItems(selectedFreqId);
      }
    } else {
      setSelectedFrequencyData(null);
      setChecklistItems([]);
    }
  }, [selectedFreqId, frequencies]);


  // Start editing
  const handleStartEdit = (freq) => {
    setEditingFrequency(freq.at_main_freq_id);
    
    // Find UOM_id from UOM text for dropdown
    const uomOption = uomOptions.find(u => u.text === freq.uom);
    const uomId = uomOption ? uomOption.id : freq.uom; // Fallback to text if not found
    
    setEditingFormData({
      asset_type_id: freq.asset_type_id,
      is_recurring: freq.is_recurring !== undefined ? freq.is_recurring : true,
      frequency: freq.frequency ? freq.frequency.toString() : '',
      uom: uomId || '',
      text: freq.text || '',
      maintained_by: freq.maintained_by,
      maint_type_id: freq.maint_type_id
    });
  };

  // Cancel editing
  const handleCancelEdit = () => {
    setEditingFrequency(null);
    setEditingFormData({});
  };

  // Handle update maintenance frequency
  const handleUpdateFrequency = async (id) => {
    const isRecurring = editingFormData.is_recurring;

    // Validation only for recurring maintenance
    if (isRecurring) {
      if (!editingFormData.frequency || isNaN(editingFormData.frequency) || parseFloat(editingFormData.frequency) <= 0) {
        toast.error('Please enter a valid frequency');
        return;
      }

      if (!editingFormData.uom) {
        toast.error('Please select Unit of Measure (UOM)');
        return;
      }
    }

    if (!editingFormData.maint_type_id) {
      toast.error('Please select a maintenance type');
      return;
    }

    setIsSubmitting(true);
    try {
      const requestData = {
        is_recurring: isRecurring,
        maintained_by: editingFormData.maintained_by,
        maint_type_id: editingFormData.maint_type_id
      };

      // Only include frequency, uom, and text for recurring maintenance
      if (isRecurring) {
        requestData.frequency = parseFloat(editingFormData.frequency);
        requestData.uom = editingFormData.uom;
        requestData.text = editingFormData.text?.trim() || `${editingFormData.frequency} ${editingFormData.uom}`;
      } else {
        // For on-demand, set these to null
        requestData.frequency = null;
        requestData.uom = null;
        requestData.text = 'On Demand';
      }

      const res = await API.put(`/maintenance-frequencies/${id}`, requestData);

      if (res.data && res.data.success) {
        toast.success('Maintenance frequency updated successfully');
        handleCancelEdit();
        fetchFrequencies();
      }
    } catch (error) {
      console.error('Error updating maintenance frequency:', error);
      toast.error(error.response?.data?.message || 'Failed to update maintenance frequency');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle delete maintenance frequency
  const handleDeleteFrequency = async (id, text) => {
    if (!window.confirm(`Are you sure you want to delete the maintenance frequency "${text}"? This will also delete all associated checklist items.`)) {
      return;
    }

    try {
      const res = await API.delete(`/maintenance-frequencies/${id}`);
      if (res.data && res.data.success) {
        toast.success('Maintenance frequency deleted successfully');
        fetchFrequencies();
        if (selectedFreqId === id) {
          setSelectedFreqId('');
        }
      }
    } catch (error) {
      console.error('Error deleting maintenance frequency:', error);
      toast.error(error.response?.data?.message || 'Failed to delete maintenance frequency');
    }
  };

  // Handle add checklist item
  const handleAddChecklistItem = async (e) => {
    e.preventDefault();
    
    if (!selectedFreqId) {
      toast.error('Please select a frequency from the dropdown');
      return;
    }

    if (!newChecklistItem.trim()) {
      toast.error('Please enter a checklist item');
      return;
    }

    try {
      const res = await API.post(`/maintenance-frequencies/${selectedFreqId}/checklist`, {
        asset_type_id: selectedFrequencyData.asset_type_id,
        text: newChecklistItem.trim()
      });

      if (res.data && res.data.success) {
        toast.success('Checklist item added successfully');
        setNewChecklistItem('');
        fetchChecklistItems(selectedFreqId);
      }
    } catch (error) {
      console.error('Error adding checklist item:', error);
      toast.error(error.response?.data?.message || 'Failed to add checklist item');
    }
  };

  // Handle delete checklist item
  const handleDeleteChecklistItem = async (itemId, itemText) => {
    if (!window.confirm(`Are you sure you want to delete the checklist item "${itemText}"?`)) {
      return;
    }

    try {
      const res = await API.delete(`/maintenance-frequencies/${selectedFreqId}/checklist/${itemId}`);
      if (res.data && res.data.success) {
        toast.success('Checklist item deleted successfully');
        fetchChecklistItems(selectedFreqId);
      }
    } catch (error) {
      console.error('Error deleting checklist item:', error);
      toast.error(error.response?.data?.message || 'Failed to delete checklist item');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Maintenance Frequency</h1>
          <p className="mt-2 text-sm sm:text-base text-gray-600">
            Configure maintenance frequencies and checklists for asset types
          </p>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm border mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex flex-wrap -mb-px" aria-label="Tabs">
              <button
                onClick={() => setActiveTab('frequency')}
                className={`flex-1 sm:flex-none px-4 sm:px-6 py-3 sm:py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'frequency'
                    ? 'border-[#0E2F4B] text-[#0E2F4B]'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Maintenance Frequency
              </button>
              <button
                onClick={() => setActiveTab('checklist')}
                className={`flex-1 sm:flex-none px-4 sm:px-6 py-3 sm:py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'checklist'
                    ? 'border-[#0E2F4B] text-[#0E2F4B]'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Checklist
              </button>
            </nav>
          </div>
        </div>

        {/* First Tab - Maintenance Frequency */}
        {activeTab === 'frequency' && (
          <>
            {/* Table Header with Actions */}
            <div className="flex items-center justify-end mb-4">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setFilterMenuOpen(!filterMenuOpen)}
                  className="flex items-center justify-center text-white border border-gray-300 rounded px-3 py-2 hover:bg-[#143d65] bg-[#0E2F4B]"
                  title="Filter"
                >
                  <Filter size={18} />
                </button>
                <button
                  onClick={() => navigate('/admin-settings/maintenance-frequency/add')}
                  className="flex items-center justify-center text-white border border-gray-300 rounded px-3 py-2 hover:bg-[#143d65] bg-[#0E2F4B]"
                  title="Create Maintenance Frequency"
                >
                  <Plus size={18} />
                </button>
              </div>
            </div>
            <div>
              {/* Filter Menu */}
              {filterMenuOpen && (
                <div ref={filterMenuRef} className="mb-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Show active filters with remove buttons */}
                      {activeFilters.map((filter, idx) => (
                        <div
                          key={idx}
                          className="flex items-center border px-2 py-1 rounded bg-gray-50"
                        >
                          <button
                            onClick={() => handleRemoveFilter(idx)}
                            className="bg-[#0E2F4B] text-[#FFC107] px-1 h-full"
                          >
                            <Minus size={14} />
                          </button>

                          {filter.type === "search" && (
                            <div className="flex flex-wrap items-center gap-2 ml-2">
                              {columnFilters.map((cf, index) => {
                                // Get options for the column dropdown
                                const columnOptions = columns.map((col) => (
                                  <option key={col.name} value={col.name}>
                                    {col.label}
                                  </option>
                                ));

                                // Get unique values for the value dropdown based on selected column
                                const valueOptions = cf.column
                                  ? [
                                      ...new Set(
                                        allFrequencies.map((item) => {
                                          const value = item[cf.column];
                                          // Handle null/undefined values
                                          if (value === null || value === undefined) {
                                            return "N/A";
                                          }
                                          // Handle maint_lead_type with "days" suffix
                                          if (cf.column === 'maint_lead_type' && value) {
                                            return `${value} days`;
                                          }
                                          // Return string values as-is
                                          return String(value);
                                        })
                                      ),
                                    ]
                                  : [];

                                return (
                                  <div key={index} className="flex items-center gap-2">
                                    {/* Minus button for individual column filter */}
                                    {columnFilters.length > 1 && (
                                      <button
                                        onClick={() => removeColumnFilter(index)}
                                        className="bg-gray-300 text-gray-700 px-1 rounded-full"
                                        title="Remove this column filter"
                                      >
                                        <Minus size={12} />
                                      </button>
                                    )}
                                    <select
                                      className="border text-sm px-2 py-1"
                                      value={cf.column}
                                      onChange={(e) =>
                                        handleColumnChange(index, e.target.value)
                                      }
                                    >
                                      <option value="">Select column</option>
                                      {columnOptions}
                                    </select>

                                    {/* Searchable Value dropdown, visible only if a column is selected */}
                                    {cf.column && (
                                      <div className="relative" ref={el => dropdownRef.current[index] = el}>
                                        <button
                                          type="button"
                                          className="border text-sm px-2 py-1 bg-white w-40 text-left flex items-center justify-between"
                                          onClick={() => toggleSearchableDropdown(index)}
                                        >
                                          <span className={cf.value ? "" : "text-gray-500"}>
                                            {cf.value || "Select value"}
                                          </span>
                                          <ChevronDown size={14} />
                                        </button>
                                        
                                        {searchableDropdownOpen[index] && (
                                          <div className="absolute z-50 mt-1 bg-white border rounded shadow-lg w-40 max-h-60 overflow-hidden">
                                            <div className="p-2 border-b">
                                              <input
                                                type="text"
                                                placeholder="Search..."
                                                value={searchableDropdownSearch[index] || ""}
                                                onChange={(e) => handleSearchableDropdownSearch(index, e.target.value)}
                                                className="w-full px-2 py-1 border text-sm focus:outline-none focus:ring-1 focus:ring-[#FFC107]"
                                                onClick={(e) => e.stopPropagation()}
                                              />
                                            </div>
                                            <div className="max-h-48 overflow-y-auto">
                                              <div
                                                className="px-2 py-1 text-sm text-gray-500 hover:bg-gray-100 cursor-pointer"
                                                onClick={() => selectSearchableValue(index, "")}
                                              >
                                                Select value
                                              </div>
                                              {valueOptions
                                                .filter(val => 
                                                  !searchableDropdownSearch[index] || 
                                                  val.toLowerCase().includes(searchableDropdownSearch[index].toLowerCase())
                                                )
                                                .map((val, i) => (
                                                <div
                                                  key={i}
                                                  className="px-2 py-1 text-sm hover:bg-gray-100 cursor-pointer"
                                                  onClick={() => selectSearchableValue(index, val)}
                                                >
                                                  {val}
                                                </div>
                                              ))}
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    )}

                                    {/* Plus button, visible only for the last column filter */}
                                    {index === columnFilters.length - 1 && (
                                      <button
                                        onClick={addColumnFilter}
                                        className="text-[#FFC107] bg-[#0E2F4B] px-1"
                                        title="Add another column filter"
                                      >
                                        <Plus size={14} />
                                      </button>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      ))}
                      
                      {/* Show column filter UI even when no active filters (for initial filter creation) */}
                      {activeFilters.length === 0 && (
                        <div className="flex items-center border px-2 py-1 rounded bg-gray-50">
                          <div className="flex flex-wrap items-center gap-2">
                            {columnFilters.map((cf, index) => {
                              // Get options for the column dropdown
                              const columnOptions = columns.map((col) => (
                                <option key={col.name} value={col.name}>
                                  {col.label}
                                </option>
                              ));

                              // Get unique values for the value dropdown based on selected column
                              const valueOptions = cf.column
                                ? [
                                    ...new Set(
                                      allFrequencies.map((item) => {
                                        const value = item[cf.column];
                                        // Handle null/undefined values
                                        if (value === null || value === undefined) {
                                          return "N/A";
                                        }
                                        // Handle maint_lead_type with "days" suffix
                                        if (cf.column === 'maint_lead_type' && value) {
                                          return `${value} days`;
                                        }
                                        // Return string values as-is
                                        return String(value);
                                      })
                                    ),
                                  ]
                                : [];

                              return (
                                <div key={index} className="flex items-center gap-2">
                                  {/* Minus button for individual column filter */}
                                  {columnFilters.length > 1 && (
                                    <button
                                      onClick={() => removeColumnFilter(index)}
                                      className="bg-gray-300 text-gray-700 px-1 rounded-full"
                                      title="Remove this column filter"
                                    >
                                      <Minus size={12} />
                                    </button>
                                  )}
                                  <select
                                    className="border text-sm px-2 py-1"
                                    value={cf.column}
                                    onChange={(e) =>
                                      handleColumnChange(index, e.target.value)
                                    }
                                  >
                                    <option value="">Select column</option>
                                    {columnOptions}
                                  </select>

                                  {/* Searchable Value dropdown, visible only if a column is selected */}
                                  {cf.column && (
                                    <div className="relative" ref={el => dropdownRef.current[index] = el}>
                                      <button
                                        type="button"
                                        className="border text-sm px-2 py-1 bg-white w-40 text-left flex items-center justify-between"
                                        onClick={() => toggleSearchableDropdown(index)}
                                      >
                                        <span className={cf.value ? "" : "text-gray-500"}>
                                          {cf.value || "Select value"}
                                        </span>
                                        <ChevronDown size={14} />
                                      </button>
                                      
                                      {searchableDropdownOpen[index] && (
                                        <div className="absolute z-50 mt-1 bg-white border rounded shadow-lg w-40 max-h-60 overflow-hidden">
                                          <div className="p-2 border-b">
                                            <input
                                              type="text"
                                              placeholder="Search..."
                                              value={searchableDropdownSearch[index] || ""}
                                              onChange={(e) => handleSearchableDropdownSearch(index, e.target.value)}
                                              className="w-full px-2 py-1 border text-sm focus:outline-none focus:ring-1 focus:ring-[#FFC107]"
                                              onClick={(e) => e.stopPropagation()}
                                            />
                                          </div>
                                          <div className="max-h-48 overflow-y-auto">
                                            <div
                                              className="px-2 py-1 text-sm text-gray-500 hover:bg-gray-100 cursor-pointer"
                                              onClick={() => selectSearchableValue(index, "")}
                                            >
                                              Select value
                                            </div>
                                            {valueOptions
                                              .filter(val => 
                                                !searchableDropdownSearch[index] || 
                                                val.toLowerCase().includes(searchableDropdownSearch[index].toLowerCase())
                                              )
                                              .map((val, i) => (
                                              <div
                                                key={i}
                                                className="px-2 py-1 text-sm hover:bg-gray-100 cursor-pointer"
                                                onClick={() => selectSearchableValue(index, val)}
                                              >
                                                {val}
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  )}

                                  {/* Plus button, visible only for the last column filter */}
                                  {index === columnFilters.length - 1 && (
                                    <button
                                      onClick={addColumnFilter}
                                      className="text-[#FFC107] bg-[#0E2F4B] px-1"
                                      title="Add another column filter"
                                    >
                                      <Plus size={14} />
                                    </button>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Table */}
              {loading ? (
                <div className="text-center py-16">
                  <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#0E2F4B]"></div>
                  <p className="mt-4 text-gray-600">Loading...</p>
                </div>
              ) : frequencies.length === 0 ? (
                <div className="text-center py-16 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                  <p className="text-gray-500 text-lg">No maintenance frequencies created yet</p>
                  <p className="text-sm text-gray-400 mt-2">Create your first maintenance frequency above</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full border border-gray-200">
                    <thead className="sticky top-0 z-10 bg-[#0E2F4B] border-b-4 border-[#FFC107]">
                      <tr className="text-white text-sm font-medium">
                        <th className="px-4 py-3 text-left">Asset Type</th>
                        <th className="px-4 py-3 text-left">Frequency</th>
                        <th className="px-4 py-3 text-left">Text</th>
                        <th className="px-4 py-3 text-left">Maintained By</th>
                        <th className="px-4 py-3 text-left">Maintenance Type</th>
                        <th className="px-4 py-3 text-left">Lead Time</th>
                        <th className="px-4 py-3 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {frequencies.map((freq, index) => (
                        <tr
                          key={freq.at_main_freq_id}
                          className={`border-t ${
                            index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                          } hover:bg-gray-100 transition-colors`}
                        >
                          {editingFrequency === freq.at_main_freq_id ? (
                            <>
                              <td colSpan="7" className="px-4 py-4">
                                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                    {/* Recurring / On-Demand Selection */}
                                    <div>
                                      <label className="block text-xs font-medium text-gray-700 mb-1">Maintenance Type</label>
                                      <div className="flex gap-4 mt-2">
                                        <label className="flex items-center cursor-pointer text-sm">
                                          <input
                                            type="radio"
                                            name={`maintenanceScheduleType_${freq.at_main_freq_id}`}
                                            value="recurring"
                                            checked={editingFormData.is_recurring === true}
                                            onChange={() => setEditingFormData({...editingFormData, is_recurring: true})}
                                            className="mr-2 w-4 h-4 text-[#0E2F4B] focus:ring-[#0E2F4B]"
                                          />
                                          <span className="font-medium">Recurring</span>
                                        </label>
                                        <label className="flex items-center cursor-pointer text-sm">
                                          <input
                                            type="radio"
                                            name={`maintenanceScheduleType_${freq.at_main_freq_id}`}
                                            value="ondemand"
                                            checked={editingFormData.is_recurring === false}
                                            onChange={() => setEditingFormData({...editingFormData, is_recurring: false})}
                                            className="mr-2 w-4 h-4 text-[#0E2F4B] focus:ring-[#0E2F4B]"
                                          />
                                          <span className="font-medium">On Demand</span>
                                        </label>
                                      </div>
                                      <p className="mt-1 text-xs text-gray-500">
                                        {editingFormData.is_recurring 
                                          ? 'Recurring maintenance requires frequency and UOM' 
                                          : 'On-demand maintenance does not require frequency configuration'}
                                      </p>
                                    </div>

                                    <div>
                                      <label className="block text-xs font-medium text-gray-700 mb-1">
                                        Frequency {editingFormData.is_recurring && <span className="text-red-500">*</span>}
                                      </label>
                                      <input
                                        type="number"
                                        value={editingFormData.frequency}
                                        onChange={(e) => setEditingFormData({...editingFormData, frequency: e.target.value})}
                                        placeholder={editingFormData.is_recurring ? "Enter frequency" : "Not required for on-demand"}
                                        className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0E2F4B] text-sm ${
                                          !editingFormData.is_recurring ? 'bg-gray-100 cursor-not-allowed' : ''
                                        }`}
                                        disabled={!editingFormData.is_recurring}
                                      />
                                    </div>

                                    <div>
                                      <label className="block text-xs font-medium text-gray-700 mb-1">
                                        Unit of Measure (UOM) {editingFormData.is_recurring && <span className="text-red-500">*</span>}
                                      </label>
                                      <select
                                        value={editingFormData.uom || ''}
                                        onChange={(e) => setEditingFormData({...editingFormData, uom: e.target.value})}
                                        className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0E2F4B] text-sm ${
                                          !editingFormData.is_recurring ? 'bg-gray-100 cursor-not-allowed' : ''
                                        }`}
                                        disabled={!editingFormData.is_recurring}
                                      >
                                        <option value="">{editingFormData.is_recurring ? "-- Select UOM --" : "Not required for on-demand"}</option>
                                        {uomOptions.map((option) => (
                                          <option key={option.id} value={option.id}>
                                            {option.text}
                                          </option>
                                        ))}
                                      </select>
                                    </div>

                                    <div>
                                      <label className="block text-xs font-medium text-gray-700 mb-1">Text</label>
                                      <input
                                        type="text"
                                        value={editingFormData.text || ''}
                                        onChange={(e) => setEditingFormData({...editingFormData, text: e.target.value})}
                                        placeholder={editingFormData.is_recurring ? "Enter description" : "Will be set as 'On Demand'"}
                                        className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0E2F4B] text-sm ${
                                          !editingFormData.is_recurring ? 'bg-gray-100 cursor-not-allowed' : ''
                                        }`}
                                        disabled={!editingFormData.is_recurring}
                                      />
                                      <p className="mt-1 text-xs text-gray-500">
                                        {editingFormData.is_recurring 
                                          ? 'Leave empty to auto-generate from frequency and UOM'
                                          : 'Will automatically be set to "On Demand"'}
                                      </p>
                                    </div>

                                    <div>
                                      <label className="block text-xs font-medium text-gray-700 mb-1">Self / Vendor Managed</label>
                                      <div className="flex gap-4 mt-2">
                                        <label className="flex items-center text-sm">
                                          <input
                                            type="radio"
                                            name={`maintainedBy_${freq.at_main_freq_id}`}
                                            value="Self"
                                            checked={editingFormData.maintained_by === 'Self'}
                                            onChange={(e) => setEditingFormData({...editingFormData, maintained_by: e.target.value})}
                                            className="mr-2"
                                          />
                                          Self
                                        </label>
                                        <label className="flex items-center text-sm">
                                          <input
                                            type="radio"
                                            name={`maintainedBy_${freq.at_main_freq_id}`}
                                            value="vendor"
                                            checked={editingFormData.maintained_by === 'vendor'}
                                            onChange={(e) => setEditingFormData({...editingFormData, maintained_by: e.target.value})}
                                            className="mr-2"
                                          />
                                          Vendor
                                        </label>
                                      </div>
                                    </div>

                                    <div>
                                      <label className="block text-xs font-medium text-gray-700 mb-1">Maintenance Category</label>
                                      <select
                                        value={editingFormData.maint_type_id || ''}
                                        onChange={(e) => setEditingFormData({...editingFormData, maint_type_id: e.target.value})}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0E2F4B] text-sm"
                                      >
                                        <option value="">-- Select --</option>
                                        {maintenanceTypes.map((mt) => (
                                          <option key={mt.maint_type_id} value={mt.maint_type_id}>
                                            {mt.text}
                                          </option>
                                        ))}
                                      </select>
                                    </div>
                                  </div>
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => handleUpdateFrequency(freq.at_main_freq_id)}
                                      disabled={isSubmitting}
                                      className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center gap-2 disabled:opacity-50 text-sm"
                                    >
                                      <Save size={16} />
                                      Save
                                    </button>
                                    <button
                                      onClick={handleCancelEdit}
                                      className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 flex items-center gap-2 text-sm"
                                    >
                                      <X size={16} />
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              </td>
                            </>
                          ) : (
                            <>
                              <td className="px-4 py-3 text-sm text-gray-900 border">
                                {freq.asset_type_name || 'N/A'}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-900 border">
                                {freq.frequency} {getUomText(freq.uom)}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-600 border">
                                {freq.text || '-'}
                              </td>
                              <td className="px-4 py-3 text-sm border">
                                <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                                  {freq.maintained_by}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-sm border">
                                {freq.maint_type_name ? (
                                  <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                                    {freq.maint_type_name}
                                  </span>
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-900 border">
                                {freq.maint_lead_type ? `${freq.maint_lead_type} days` : '-'}
                              </td>
                              <td className="px-4 py-3 text-center border">
                                <div className="flex items-center justify-center gap-2">
                                  <button
                                    onClick={() => handleStartEdit(freq)}
                                    className="text-blue-600 hover:text-blue-800 transition-colors"
                                    title="Edit"
                                  >
                                    <Edit2 size={16} />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteFrequency(freq.at_main_freq_id, freq.text)}
                                    className="text-red-600 hover:text-red-800 transition-colors"
                                    title="Delete"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </div>
                              </td>
                            </>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        {/* Second Tab - Checklist */}
        {activeTab === 'checklist' && (
          <div>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Frequency Text <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedFreqId}
                  onChange={(e) => setSelectedFreqId(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0E2F4B] focus:border-transparent"
                >
                  <option value="">-- Select Frequency --</option>
                   {frequencies.map((freq) => (
                      <option key={freq.at_main_freq_id} value={freq.at_main_freq_id}>
                        {freq.asset_type_name}
                      </option>
                    ))}
                </select>
              </div>

              {selectedFrequencyData && (
                <>
                  {/* Display Frequency Info */}
                  <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex flex-wrap items-center gap-4">
                      <div>
                        <span className="text-xs text-gray-600">Frequency:</span>
                        <span className="ml-2 font-semibold text-gray-900">{selectedFrequencyData.frequency} {getUomText(selectedFrequencyData.uom)}</span>
                      </div>
                      <div>
                      </div>
                      <div>
                        <span className="text-xs text-gray-600">Asset Type:</span>
                        <span className="ml-2 font-semibold text-gray-900">{selectedFrequencyData.asset_type_name}</span>
                      </div>
                    </div>
                  </div>

                  {/* Add Checklist Item Form */}
                  <form onSubmit={handleAddChecklistItem} className="mb-6">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newChecklistItem}
                        onChange={(e) => setNewChecklistItem(e.target.value)}
                        placeholder="Enter checklist item"
                        className="flex-1 px-4 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0E2F4B] focus:border-transparent"
                      />
                      <button
                        type="submit"
                        className="px-6 py-2.5 bg-[#0E2F4B] text-white rounded-md hover:bg-[#143d65] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0E2F4B] flex items-center gap-2 transition-colors"
                      >
                        <Plus size={18} />
                        <span>Add</span>
                      </button>
                    </div>
                  </form>

                  {/* Checklist Items List */}
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-4 text-lg">Checklist Items</h3>
                    {loadingChecklist ? (
                      <div className="text-center py-16">
                        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#0E2F4B]"></div>
                        <p className="mt-4 text-gray-600">Loading...</p>
                      </div>
                    ) : checklistItems.length === 0 ? (
                      <div className="text-center py-16 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                        <p className="text-gray-500 text-lg">No checklist items added yet</p>
                        <p className="text-sm text-gray-400 mt-2">Add checklist items using the form above</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="min-w-full border border-gray-200">
                          <thead className="sticky top-0 z-10 bg-[#0E2F4B] border-b-4 border-[#FFC107]">
                            <tr className="text-white text-sm font-medium">
                              <th className="px-4 py-3 text-left">Checklist Item</th>
                              <th className="px-4 py-3 text-center">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {checklistItems.map((item, index) => (
                              <tr
                                key={item.at_main_checklist_id}
                                className={`border-t ${
                                  index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                                } hover:bg-gray-100 transition-colors`}
                              >
                                <td className="px-4 py-3 text-sm text-gray-900 border">
                                  {item.text}
                                </td>
                                <td className="px-4 py-3 text-center border">
                                  <button
                                    onClick={() => handleDeleteChecklistItem(item.at_main_checklist_id, item.text)}
                                    className="text-red-600 hover:text-red-800 transition-colors"
                                    title="Delete"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </>
              )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MaintenanceFrequency;

