import React, { useState, useEffect, useRef } from 'react';
import API from '../../lib/axios';
import { toast } from 'react-hot-toast';
import { useLanguage } from '../../contexts/LanguageContext';
import { Plus, Edit2, Trash2, X, Save, ChevronDown, ChevronUp, Filter, Search } from 'lucide-react';

const Properties = () => {
  const { t } = useLanguage();
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [expandedProperties, setExpandedProperties] = useState(new Set());
  
  // Form state
  const [propertyName, setPropertyName] = useState('');
  const [listValues, setListValues] = useState(['']);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Edit state
  const [editingProperty, setEditingProperty] = useState(null);
  const [editingPropertyName, setEditingPropertyName] = useState('');
  
  // Filter state
  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const filterMenuRef = useRef(null);

  // Close filter menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (filterMenuRef.current && !filterMenuRef.current.contains(event.target)) {
        setShowFilters(false);
      }
    };

    if (showFilters) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showFilters]);

  // Fetch all properties with their list values
  const fetchProperties = async () => {
    setLoading(true);
    try {
      const res = await API.get('/properties/with-values');
      if (res.data && res.data.success) {
        setProperties(res.data.data || []);
      }
    } catch (error) {
      console.error('Error fetching properties:', error);
      toast.error('Failed to fetch properties');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProperties();
  }, []);

  // Toggle property expansion
  const togglePropertyExpansion = (propId) => {
    setExpandedProperties(prev => {
      const newSet = new Set(prev);
      if (newSet.has(propId)) {
        newSet.delete(propId);
      } else {
        newSet.add(propId);
      }
      return newSet;
    });
  };

  // Add new list value input
  const addListValueInput = () => {
    setListValues([...listValues, '']);
  };

  // Remove list value input
  const removeListValueInput = (index) => {
    setListValues(listValues.filter((_, i) => i !== index));
  };

  // Update list value
  const updateListValue = (index, value) => {
    const newValues = [...listValues];
    newValues[index] = value;
    setListValues(newValues);
  };

  // Handle create property
  const handleCreateProperty = async (e) => {
    e.preventDefault();
    
    if (!propertyName.trim()) {
      toast.error('Property name is required');
      return;
    }

    // Filter out empty values
    const validValues = listValues.filter(v => v && v.trim());

    setIsSubmitting(true);
    try {
      const res = await API.post('/properties/with-values', {
        property: propertyName.trim(),
        listValues: validValues
      });

      if (res.data && res.data.success) {
        toast.success(`Property created successfully with ${validValues.length} list value(s)`);
        setPropertyName('');
        setListValues(['']);
        setShowCreateForm(false);
        fetchProperties();
      }
    } catch (error) {
      console.error('Error creating property:', error);
      
      // Handle duplicate property error
      if (error.response?.data?.code === 'DUPLICATE_PROPERTY') {
        toast.error(
          error.response?.data?.message || 'A property with this name already exists',
          {
            duration: 6000,
            style: {
              background: '#FEF3C7',
              color: '#92400E',
              border: '2px solid #F59E0B',
              padding: '16px',
              fontSize: '14px',
              maxWidth: '500px'
            },
            icon: '⚠️'
          }
        );
      } else {
        toast.error(error.response?.data?.message || 'Failed to create property');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Start editing property
  const handleStartEdit = (property) => {
    setEditingProperty(property.prop_id);
    setEditingPropertyName(property.property);
  };

  // Cancel editing
  const handleCancelEdit = () => {
    setEditingProperty(null);
    setEditingPropertyName('');
  };

  // Handle update property
  const handleUpdateProperty = async (propId) => {
    if (!editingPropertyName.trim()) {
      toast.error('Property name is required');
      return;
    }

    setIsSubmitting(true);
    try {
      // Update property name only
      await API.put(`/properties/${propId}`, {
        property: editingPropertyName.trim()
      });

      toast.success('Property name updated successfully');
      handleCancelEdit();
      fetchProperties();
    } catch (error) {
      console.error('Error updating property:', error);
      
      // Handle duplicate property error
      if (error.response?.data?.code === 'DUPLICATE_PROPERTY') {
        toast.error(
          error.response?.data?.message || 'A property with this name already exists',
          {
            duration: 6000,
            style: {
              background: '#FEF3C7',
              color: '#92400E',
              border: '2px solid #F59E0B',
              padding: '16px',
              fontSize: '14px',
              maxWidth: '500px'
            },
            icon: '⚠️'
          }
        );
      } else {
        toast.error(error.response?.data?.message || 'Failed to update property');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle delete property
  const handleDeleteProperty = async (propId, propertyName) => {
    if (!window.confirm(`Are you sure you want to delete the property "${propertyName}"? This will also delete all associated list values.`)) {
      return;
    }

    try {
      await API.delete(`/properties/${propId}`);
      toast.success('Property deleted successfully');
      fetchProperties();
    } catch (error) {
      console.error('Error deleting property:', error);
      toast.error(error.response?.data?.message || 'Failed to delete property');
    }
  };

  // Handle add list value to existing property
  const handleAddListValue = async (propId, value) => {
    if (!value || !value.trim()) {
      toast.error('Value is required');
      return;
    }

    try {
      await API.post('/properties/list-values', {
        propId: propId,
        value: value.trim()
      });
      toast.success('List value added successfully');
      fetchProperties();
    } catch (error) {
      console.error('Error adding list value:', error);
      toast.error(error.response?.data?.message || 'Failed to add list value');
    }
  };

  // Handle delete list value
  const handleDeleteListValue = async (aplvId, value) => {
    if (!window.confirm(`Are you sure you want to delete the value "${value}"?`)) {
      return;
    }

    try {
      await API.delete(`/properties/list-values/${aplvId}`);
      toast.success('List value deleted successfully');
      fetchProperties();
    } catch (error) {
      console.error('Error deleting list value:', error);
      toast.error(error.response?.data?.message || 'Failed to delete list value');
    }
  };

  // Filter properties based on search term
  const getFilteredProperties = () => {
    if (!searchTerm) return properties;
    
    const searchLower = searchTerm.toLowerCase();
    return properties.filter(property => {
      return property.property.toLowerCase().includes(searchLower);
    });
  };

  // Check if filter is active
  const hasActiveFilters = () => {
    return searchTerm !== '';
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#0E2F4B]">Properties</h1>
        </div>

        {/* Action Bar */}
        <div className="mb-6 flex justify-between items-center gap-3">
          <div className="flex gap-3 items-center relative" ref={filterMenuRef}>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`w-10 h-10 ${hasActiveFilters() ? 'bg-yellow-500 text-white' : 'bg-[#0E2F4B] text-white'} rounded flex items-center justify-center hover:opacity-90 transition-all shadow-sm relative`}
              title="Filter Properties"
            >
              <Filter size={20} />
              {hasActiveFilters() && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white"></span>
              )}
            </button>

            {/* Filter Dropdown Menu */}
            {showFilters && (
              <div className="absolute left-0 top-12 z-40 bg-white border border-gray-300 rounded-lg shadow-lg p-4 min-w-[300px]">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-700">Search Properties</h3>
                  <button
                    onClick={() => setShowFilters(false)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <X size={18} />
                  </button>
                </div>
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by property name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-8 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#0E2F4B] text-sm"
                    autoFocus
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm('')}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      title="Clear search"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Active filter badge */}
            {hasActiveFilters() && (
              <div className="flex items-center border px-3 py-1.5 rounded bg-gray-50">
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setShowFilters(false);
                  }}
                  className="bg-[#0E2F4B] text-[#FFC107] px-2 py-0.5 rounded mr-2 hover:bg-[#143d65] transition-colors"
                  title="Remove filter"
                >
                  <X size={14} />
                </button>
                <div className="flex items-center gap-2">
                  <Search size={14} className="text-gray-500" />
                  <span className="text-sm text-gray-700">{searchTerm}</span>
                </div>
              </div>
            )}
          </div>
          <button
            onClick={() => setShowCreateForm(true)}
            className="w-10 h-10 bg-[#0E2F4B] text-white rounded flex items-center justify-center hover:bg-[#143d65] transition-colors shadow-sm"
            title="Create Property"
          >
            <Plus size={20} />
          </button>
        </div>

        {/* Create Property Modal */}
        {showCreateForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="bg-gradient-to-r from-[#0E2F4B] to-[#1a4d7a] text-white py-4 px-6 border-b-4 border-[#FFC107] flex items-center justify-between sticky top-0 z-10">
                <div>
                  <h2 className="text-xl font-semibold">Create New Property</h2>
                  <p className="text-sm text-white/80 mt-1">Enter property name and its list values</p>
                </div>
                <button
                  onClick={() => {
                    setShowCreateForm(false);
                    setPropertyName('');
                    setListValues(['']);
                  }}
                  className="text-white hover:text-gray-200 transition-colors"
                >
                  <X size={24} />
                </button>
              </div>
              
              {/* Info Banner */}
              <div className="mx-6 mt-4 p-3 bg-blue-50 border-l-4 border-blue-500 rounded">
                <p className="text-sm text-blue-900">
                  <strong>Note:</strong> Property names must be unique. Add values to existing properties or choose a different name.
                </p>
              </div>
              
              <form onSubmit={handleCreateProperty} className="p-6">
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Property Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={propertyName}
                    onChange={(e) => setPropertyName(e.target.value)}
                    placeholder="e.g., Material, Color, Brand"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0E2F4B] focus:border-transparent"
                    required
                    autoFocus
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    This name must be unique across all properties
                  </p>
                </div>

                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <label className="block text-sm font-medium text-gray-700">
                      List Values
                    </label>
                    <button
                      type="button"
                      onClick={addListValueInput}
                      className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 flex items-center gap-1.5 transition-colors"
                    >
                      <Plus size={16} />
                      Add Value
                    </button>
                  </div>
                  
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                    {listValues.map((value, index) => (
                      <div key={index} className="flex gap-2">
                        <input
                          type="text"
                          value={value}
                          onChange={(e) => updateListValue(index, e.target.value)}
                          placeholder={`Value ${index + 1} (e.g., Wood, Metal, Glass)`}
                          className="flex-1 px-4 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0E2F4B]"
                        />
                        {listValues.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeListValueInput(index)}
                            className="px-3 py-2.5 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                          >
                            <X size={18} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  <p className="mt-2 text-xs text-gray-500">
                    Add one or more values for this property. These will be available as dropdown options.
                  </p>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateForm(false);
                      setPropertyName('');
                      setListValues(['']);
                    }}
                    className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-6 py-2.5 bg-[#0E2F4B] text-white rounded-md hover:bg-[#143d65] flex items-center gap-2 disabled:opacity-50 transition-colors"
                  >
                    <Save size={18} />
                    <span>{isSubmitting ? 'Saving...' : 'Save Property'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Properties List */}
        <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="text-center py-20">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#0E2F4B]"></div>
              <p className="mt-4 text-gray-500">Loading properties...</p>
            </div>
          ) : properties.length === 0 ? (
            <div className="text-center py-20">
              <div className="text-gray-400 mb-4">
                <svg className="mx-auto h-16 w-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="text-gray-500 text-lg font-medium">No properties created yet</p>
              <p className="text-sm text-gray-400 mt-2">Click the + button above to create your first property</p>
            </div>
          ) : getFilteredProperties().length === 0 ? (
            <div className="text-center py-20">
              <div className="text-gray-400 mb-4">
                <Filter size={48} className="mx-auto" />
              </div>
              <p className="text-gray-500 text-lg font-medium">No properties match your search</p>
              <p className="text-sm text-gray-400 mt-2">Try adjusting your search criteria</p>
              <button
                onClick={() => {
                  setSearchTerm('');
                  setShowFilters(false);
                }}
                className="mt-4 px-4 py-2 text-sm bg-[#0E2F4B] text-white rounded hover:bg-[#143d65] transition-colors"
              >
                Clear Search
              </button>
            </div>
          ) : (
            <>
              {/* Table Header */}
              <div className="bg-[#0E2F4B] text-white border-b-4 border-[#FFC107]">
                <div className="grid grid-cols-12 gap-4 px-6 py-3 text-sm font-semibold">
                  <div className="col-span-1"></div>
                  <div className="col-span-4">Property Name</div>
                  <div className="col-span-3">List Values</div>
                  <div className="col-span-4 text-right">Actions</div>
                </div>
              </div>

              {/* Table Body */}
              <div className="divide-y divide-gray-200">
                {getFilteredProperties().map((property, index) => (
                  <div key={property.prop_id}>
                    {/* Property Row */}
                    <div className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 transition-colors`}>
                      {editingProperty === property.prop_id ? (
                        <div className="grid grid-cols-12 gap-4 px-6 py-4 items-center">
                          <div className="col-span-1"></div>
                          <div className="col-span-7">
                            <input
                              type="text"
                              value={editingPropertyName}
                              onChange={(e) => setEditingPropertyName(e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#0E2F4B] text-sm"
                              autoFocus
                            />
                          </div>
                          <div className="col-span-4 flex justify-end gap-2">
                            <button
                              onClick={() => handleUpdateProperty(property.prop_id)}
                              disabled={isSubmitting}
                              className="text-green-600 hover:text-green-700 disabled:opacity-50"
                              title="Save"
                            >
                              <Save size={18} />
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              className="text-gray-600 hover:text-gray-700"
                              title="Cancel"
                            >
                              <X size={18} />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-12 gap-4 px-6 py-4 items-center">
                          <div className="col-span-1">
                            <button
                              onClick={() => togglePropertyExpansion(property.prop_id)}
                              className="text-gray-500 hover:text-[#0E2F4B] transition-colors"
                            >
                              {expandedProperties.has(property.prop_id) ? (
                                <ChevronUp size={20} />
                              ) : (
                                <ChevronDown size={20} />
                              )}
                            </button>
                          </div>
                          <div className="col-span-4">
                            <span className="font-medium text-gray-900">{property.property}</span>
                          </div>
                          <div className="col-span-3">
                            <span className="text-sm text-gray-600">
                              {property.list_values && Array.isArray(property.list_values)
                                ? `${property.list_values.length} value(s)`
                                : '0 values'}
                            </span>
                          </div>
                          <div className="col-span-4 flex justify-end gap-3">
                            <button
                              onClick={() => handleStartEdit(property)}
                              className="text-blue-600 hover:text-blue-700"
                              title="Edit"
                            >
                              <Edit2 size={18} />
                            </button>
                            <button
                              onClick={() => handleDeleteProperty(property.prop_id, property.property)}
                              className="text-red-600 hover:text-red-700"
                              title="Delete"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Expanded Content - List Values */}
                    {expandedProperties.has(property.prop_id) && (
                      <div className="bg-gray-100 border-t border-gray-200">
                        <div className="px-6 py-4">
                          <div className="bg-white rounded-lg shadow-sm p-4">
                            <h4 className="font-semibold text-gray-700 mb-3 text-sm uppercase tracking-wide">List Values</h4>
                            
                            {property.list_values && Array.isArray(property.list_values) && property.list_values.length > 0 ? (
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
                                {property.list_values.map((value) => (
                                  <div
                                    key={value.aplv_id}
                                    className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded border border-gray-200 hover:border-gray-300 transition-colors"
                                  >
                                    <span className="text-sm text-gray-900">{value.value}</span>
                                    <button
                                      onClick={() => handleDeleteListValue(value.aplv_id, value.value)}
                                      className="text-red-500 hover:text-red-700 ml-2"
                                      title="Delete value"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-sm text-gray-500 mb-4 py-4 text-center bg-gray-50 rounded border-2 border-dashed border-gray-200">
                                No list values added yet
                              </p>
                            )}
                            
                            {/* Add New Value Form */}
                            <div className="pt-3 border-t border-gray-200">
                              <AddListValueForm
                                propId={property.prop_id}
                                onAdd={handleAddListValue}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// Component for adding list value to existing property
const AddListValueForm = ({ propId, onAdd }) => {
  const [value, setValue] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!value.trim()) {
      toast.error('Value is required');
      return;
    }

    setIsSubmitting(true);
    try {
      await onAdd(propId, value);
      setValue('');
    } catch (error) {
      // Error handling is done in parent component
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Enter new value..."
        className="flex-1 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#0E2F4B] text-sm"
      />
      <button
        type="submit"
        disabled={isSubmitting}
        className="px-4 py-2 bg-[#0E2F4B] text-white rounded hover:bg-[#143d65] flex items-center gap-1 disabled:opacity-50 transition-colors text-sm"
      >
        <Plus size={16} />
        <span>{isSubmitting ? 'Adding...' : 'Add'}</span>
      </button>
    </form>
  );
};

export default Properties;

