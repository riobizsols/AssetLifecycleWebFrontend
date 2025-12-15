import React, { useState, useEffect } from 'react';
import API from '../../lib/axios';
import { toast } from 'react-hot-toast';
import { useLanguage } from '../../contexts/LanguageContext';
import { Plus, Edit2, Trash2, X, Save, ChevronDown, ChevronUp } from 'lucide-react';

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
      toast.error(error.response?.data?.message || 'Failed to create property');
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
    setEditingListValues([]);
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
      toast.error(error.response?.data?.message || 'Failed to update property');
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

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Properties Management</h1>
            <p className="mt-2 text-sm sm:text-base text-gray-600">
              Create and manage properties with their list values
            </p>
          </div>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="px-4 sm:px-6 py-2.5 bg-[#0E2F4B] text-white rounded-md hover:bg-[#143d65] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0E2F4B] flex items-center gap-2 transition-colors"
          >
            <Plus size={20} />
            <span>{showCreateForm ? 'Cancel' : 'Create Property'}</span>
          </button>
        </div>

        {/* Create Property Form */}
        {showCreateForm && (
          <div className="bg-white rounded-lg shadow-sm border mb-6">
            <div className="bg-[#0E2F4B] text-white py-4 px-6 rounded-t-lg border-b-4 border-[#FFC107]">
              <h2 className="text-xl font-semibold">Create New Property</h2>
              <p className="text-sm text-white/80 mt-1">Enter property name and its list values</p>
            </div>
            
            <form onSubmit={handleCreateProperty} className="p-4 sm:p-6">
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Property Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={propertyName}
                  onChange={(e) => setPropertyName(e.target.value)}
                  placeholder="Enter property name (e.g., Material, Color, Brand)"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0E2F4B] focus:border-transparent"
                  required
                />
              </div>

              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-medium text-gray-700">
                    List Values
                  </label>
                  <button
                    type="button"
                    onClick={addListValueInput}
                    className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 flex items-center gap-1.5"
                  >
                    <Plus size={16} />
                    Add Value
                  </button>
                </div>
                
                <div className="space-y-2">
                  {listValues.map((value, index) => (
                    <div key={index} className="flex gap-2">
                      <input
                        type="text"
                        value={value}
                        onChange={(e) => updateListValue(index, e.target.value)}
                        placeholder={`Enter value ${index + 1} (e.g., Wood, Metal, Glass)`}
                        className="flex-1 px-4 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0E2F4B] focus:border-transparent"
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
                  Add one or more values for this property. These will be available as dropdown options when assigning properties to assets.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 bg-[#0E2F4B] text-white rounded-md hover:bg-[#143d65] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0E2F4B] flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save size={18} />
                  <span>{isSubmitting ? 'Saving...' : 'Save Property'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateForm(false);
                    setPropertyName('');
                    setListValues(['']);
                  }}
                  className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Properties List */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="bg-[#0E2F4B] text-white py-4 px-6 rounded-t-lg border-b-4 border-[#FFC107]">
            <h2 className="text-xl font-semibold">Existing Properties</h2>
            <p className="text-sm text-white/80 mt-1">Click on a property to view and manage its list values</p>
          </div>
          
          <div className="p-4 sm:p-6">
            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#0E2F4B]"></div>
                <p className="mt-2 text-gray-500">Loading properties...</p>
              </div>
            ) : properties.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                <p className="text-gray-500">No properties created yet</p>
                <p className="text-sm text-gray-400 mt-1">Click "Create Property" to add your first property</p>
              </div>
            ) : (
              <div className="space-y-4">
                {properties.map((property) => (
                  <div
                    key={property.prop_id}
                    className="border border-gray-200 rounded-lg overflow-hidden hover:border-gray-300 transition-colors"
                  >
                    {/* Property Header */}
                    <div className="bg-gray-50 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      {editingProperty === property.prop_id ? (
                        <div className="flex-1 flex flex-col sm:flex-row gap-2 w-full">
                          <input
                            type="text"
                            value={editingPropertyName}
                            onChange={(e) => setEditingPropertyName(e.target.value)}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0E2F4B]"
                            autoFocus
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleUpdateProperty(property.prop_id)}
                              disabled={isSubmitting}
                              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center gap-2 disabled:opacity-50"
                            >
                              <Save size={16} />
                              Save
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 flex items-center gap-2"
                            >
                              <X size={16} />
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex-1 flex items-center gap-3">
                            <button
                              onClick={() => togglePropertyExpansion(property.prop_id)}
                              className="text-gray-500 hover:text-gray-700 transition-colors"
                            >
                              {expandedProperties.has(property.prop_id) ? (
                                <ChevronUp size={20} />
                              ) : (
                                <ChevronDown size={20} />
                              )}
                            </button>
                            <div>
                              <h3 className="font-semibold text-gray-900">{property.property}</h3>
                              <p className="text-sm text-gray-500">
                                {property.list_values && Array.isArray(property.list_values)
                                  ? `${property.list_values.length} list value(s)`
                                  : '0 list values'}
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleStartEdit(property)}
                              className="px-3 py-1.5 text-blue-600 hover:bg-blue-50 rounded-md flex items-center gap-1.5 transition-colors"
                            >
                              <Edit2 size={16} />
                              <span className="hidden sm:inline">Edit</span>
                            </button>
                            <button
                              onClick={() => handleDeleteProperty(property.prop_id, property.property)}
                              className="px-3 py-1.5 text-red-600 hover:bg-red-50 rounded-md flex items-center gap-1.5 transition-colors"
                            >
                              <Trash2 size={16} />
                              <span className="hidden sm:inline">Delete</span>
                            </button>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Expanded Content - List Values */}
                    {expandedProperties.has(property.prop_id) && (
                      <div className="p-4 border-t border-gray-200 bg-white">
                        <div className="mb-4">
                          <h4 className="font-medium text-gray-900 mb-3">List Values</h4>
                          {property.list_values && Array.isArray(property.list_values) && property.list_values.length > 0 ? (
                            <div className="space-y-2 mb-4">
                              {property.list_values.map((value) => (
                                <div
                                  key={value.aplv_id}
                                  className="flex items-center justify-between p-3 bg-gray-50 rounded-md border border-gray-200"
                                >
                                  <span className="text-gray-900">{value.value}</span>
                                  <button
                                    onClick={() => handleDeleteListValue(value.aplv_id, value.value)}
                                    className="px-2 py-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-gray-500 mb-4">No list values added yet</p>
                          )}
                          
                          {/* Add New Value Form */}
                          <AddListValueForm
                            propId={property.prop_id}
                            onAdd={handleAddListValue}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
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
        placeholder="Enter new list value"
        className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0E2F4B] focus:border-transparent"
      />
      <button
        type="submit"
        disabled={isSubmitting}
        className="px-4 py-2 bg-[#0E2F4B] text-white rounded-md hover:bg-[#143d65] flex items-center gap-2 disabled:opacity-50"
      >
        <Plus size={18} />
        <span>Add</span>
      </button>
    </form>
  );
};

export default Properties;

