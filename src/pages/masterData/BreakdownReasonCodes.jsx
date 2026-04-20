import React, { useState, useEffect } from 'react';
import API from '../../lib/axios';
import { toast } from 'react-hot-toast';
import { useLanguage } from '../../contexts/LanguageContext';
import { Edit2, Trash2, Save, X } from 'lucide-react';
import ContentBox from '../../components/ContentBox';
import { filterData } from '../../utils/filterData';

const BreakdownReasonCodes = () => {
  const { t } = useLanguage();
  const [reasonCodes, setReasonCodes] = useState([]);
  const [assetTypes, setAssetTypes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedRows, setSelectedRows] = useState([]);
  const [filterValues, setFilterValues] = useState({
    columnFilters: [],
    fromDate: "",
    toDate: ""
  });
  
  // Edit state
  const [editingReasonCode, setEditingReasonCode] = useState(null);
  const [editingReasonCodeText, setEditingReasonCodeText] = useState('');
  const [editingAssetType, setEditingAssetType] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Create form state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newReasonCode, setNewReasonCode] = useState({
    asset_type_id: '',
    text: ''
  });

  // Define columns
  const columns = [
    { label: 'Asset Type', name: 'asset_type_name', visible: true },
    { label: 'Reason Code', name: 'text', visible: true },
  ];

  // Fetch all breakdown reason codes
  const fetchReasonCodes = async () => {
    setLoading(true);
    try {
      const res = await API.get('/breakdown-reason-codes');
      if (res.data && res.data.success) {
        setReasonCodes(res.data.data || []);
      }
    } catch (error) {
      console.error('Error fetching breakdown reason codes:', error);
      toast.error('Failed to fetch breakdown reason codes');
    } finally {
      setLoading(false);
    }
  };

  // Fetch asset types
  const fetchAssetTypes = async () => {
    try {
      const res = await API.get('/asset-types');
      if (res.data && Array.isArray(res.data)) {
        setAssetTypes(res.data.filter(at => at.int_status === 1));
      } else if (res.data && res.data.data) {
        setAssetTypes(res.data.data.filter(at => at.int_status === 1));
      }
    } catch (error) {
      console.error('Error fetching asset types:', error);
      toast.error('Failed to fetch asset types');
    }
  };

  useEffect(() => {
    fetchReasonCodes();
    fetchAssetTypes();
  }, []);

  // Handle create breakdown reason code
  const handleCreateReasonCode = async (e) => {
    e.preventDefault();
    
    if (!newReasonCode.asset_type_id) {
      toast.error('Please select an asset type');
      return;
    }

    if (!newReasonCode.text.trim()) {
      toast.error('Reason code text is required');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await API.post('/breakdown-reason-codes', {
        asset_type_id: newReasonCode.asset_type_id,
        text: newReasonCode.text.trim()
      });

      if (res.data && res.data.success) {
        toast.success('Breakdown reason code created successfully');
        setNewReasonCode({ asset_type_id: '', text: '' });
        setShowCreateModal(false);
        fetchReasonCodes();
      }
    } catch (error) {
      console.error('Error creating breakdown reason code:', error);
      toast.error(error.response?.data?.message || 'Failed to create breakdown reason code');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Start editing reason code
  const handleStartEdit = (reasonCode) => {
    setEditingReasonCode(reasonCode.atbrrc_id);
    setEditingReasonCodeText(reasonCode.text);
    setEditingAssetType(reasonCode.asset_type_id);
  };

  // Cancel editing
  const handleCancelEdit = () => {
    setEditingReasonCode(null);
    setEditingReasonCodeText('');
    setEditingAssetType('');
  };

  // Handle update reason code
  const handleUpdateReasonCode = async (atbrrcId) => {
    if (!editingReasonCodeText.trim()) {
      toast.error('Reason code text is required');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await API.put(`/breakdown-reason-codes/${atbrrcId}`, {
        text: editingReasonCodeText.trim()
      });

      if (res.data && res.data.success) {
        toast.success('Breakdown reason code updated successfully');
        handleCancelEdit();
        fetchReasonCodes();
      }
    } catch (error) {
      console.error('Error updating breakdown reason code:', error);
      toast.error(error.response?.data?.message || 'Failed to update breakdown reason code');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle delete reason code
  const handleDeleteReasonCode = async (atbrrcId, text) => {
    if (!window.confirm(`Are you sure you want to delete the breakdown reason code "${text}"?`)) {
      return;
    }

    try {
      const res = await API.delete(`/breakdown-reason-codes/${atbrrcId}`);
      if (res.data && res.data.success) {
        toast.success('Breakdown reason code deleted successfully');
        fetchReasonCodes();
      }
    } catch (error) {
      console.error('Error deleting breakdown reason code:', error);
      toast.error(error.response?.data?.message || 'Failed to delete breakdown reason code');
    }
  };

  // Handle delete selected
  const handleDeleteSelected = async () => {
    if (selectedRows.length === 0) {
      toast.error('Please select at least one reason code to delete');
      return;
    }

    if (!window.confirm(`Are you sure you want to delete ${selectedRows.length} reason code(s)?`)) {
      return;
    }

    try {
      const deletePromises = selectedRows.map(rowId => 
        API.delete(`/breakdown-reason-codes/${rowId}`)
      );
      await Promise.all(deletePromises);
      toast.success(`${selectedRows.length} reason code(s) deleted successfully`);
      setSelectedRows([]);
      fetchReasonCodes();
    } catch (error) {
      console.error('Error deleting reason codes:', error);
      toast.error('Failed to delete some reason codes');
    }
  };

  // Handle download
  const handleDownload = async () => {
    try {
      const filteredData = filterData(reasonCodes, filterValues, columns.filter(col => col.visible));
      
      // Convert to CSV
      const headers = ['Asset Type', 'Reason Code'];
      const csvContent = [
        headers.join(','),
        ...filteredData.map(item => [
          `"${item.asset_type_name || ''}"`,
          `"${item.text || ''}"`
        ].join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `breakdown_reason_codes_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success('Breakdown reason codes exported successfully');
    } catch (error) {
      console.error('Error exporting data:', error);
      toast.error('Failed to export breakdown reason codes');
    }
  };

  // Handle filter change
  const handleFilterChange = (columnName, value) => {
    if (columnName === "columnFilters") {
      setFilterValues((prev) => ({
        ...prev,
        columnFilters: value,
      }));
    } else if (columnName === "fromDate" || columnName === "toDate") {
      setFilterValues((prev) => ({
        ...prev,
        [columnName]: value,
      }));
    } else {
      setFilterValues((prev) => ({
        ...prev,
        columnFilters: prev.columnFilters.filter((f) => f.column !== columnName),
        ...(value && {
          columnFilters: [
            ...prev.columnFilters.filter((f) => f.column !== columnName),
            { column: columnName, value },
          ],
        }),
      }));
    }
  };

  const filters = columns.map((col) => ({
    label: col.label,
    name: col.name,
    options: [],
    onChange: (value) => handleFilterChange(col.name, value),
  }));

  return (
    <div className="p-4">
      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full mx-4">
            <div className="bg-[#0E2F4B] text-white py-4 px-6 rounded-t-lg border-b-4 border-[#FFC107]">
              <h2 className="text-xl font-semibold">Create New Breakdown Reason Code</h2>
            </div>
            
            <form onSubmit={handleCreateReasonCode} className="p-6">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Asset Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={newReasonCode.asset_type_id}
                  onChange={(e) => setNewReasonCode({ ...newReasonCode, asset_type_id: e.target.value })}
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

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Breakdown Reason Code <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newReasonCode.text}
                  onChange={(e) => setNewReasonCode({ ...newReasonCode, text: e.target.value })}
                  placeholder="Enter breakdown reason code"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0E2F4B] focus:border-transparent"
                  required
                />
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setNewReasonCode({ asset_type_id: '', text: '' });
                  }}
                  className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 bg-[#0E2F4B] text-white rounded-md hover:bg-[#143d65] flex items-center gap-2 disabled:opacity-50"
                >
                  <Save size={18} />
                  {isSubmitting ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ContentBox
        filters={filters}
        onFilterChange={handleFilterChange}
        onAdd={() => setShowCreateModal(true)}
        onDeleteSelected={handleDeleteSelected}
        onDownload={handleDownload}
        data={reasonCodes}
        selectedRows={selectedRows}
        setSelectedRows={setSelectedRows}
        showAddButton={true}
        showDeleteButton={true}
        isReadOnly={false}
      >
        {({ visibleColumns, showActions }) => {
          const filteredData = filterData(reasonCodes, filterValues, visibleColumns);
          const visibleCols = visibleColumns.filter((col) => col.visible);

          if (loading) {
            const colSpan = visibleCols.length + (showActions ? 1 : 0);
            return (
              <tr>
                <td colSpan={colSpan} className="text-center py-16">
                  <div className="flex flex-col items-center justify-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading...</p>
                  </div>
                </td>
              </tr>
            );
          }

          if (filteredData.length === 0) {
            const colSpan = visibleCols.length + (showActions ? 1 : 0);
            return (
              <tr>
                <td colSpan={colSpan} className="text-center py-16">
                  <p className="text-gray-500">No breakdown reason codes found</p>
                </td>
              </tr>
            );
          }

          return filteredData.map((reasonCode) => (
            <tr key={reasonCode.atbrrc_id} className="border-t hover:bg-gray-50">
              {visibleCols.map((col, colIndex) => (
                <td key={colIndex} className="border text-sm px-4 py-2">
                  {colIndex === 0 ? (
                    <div className="flex items-center gap-2">
                      {showActions && (
                        <input
                          type="checkbox"
                          checked={selectedRows.includes(reasonCode.atbrrc_id)}
                          onChange={() => {
                            setSelectedRows((prev) =>
                              prev.includes(reasonCode.atbrrc_id)
                                ? prev.filter((id) => id !== reasonCode.atbrrc_id)
                                : [...prev, reasonCode.atbrrc_id]
                            );
                          }}
                          className="accent-yellow-400"
                          onClick={(e) => e.stopPropagation()}
                        />
                      )}
                      {editingReasonCode === reasonCode.atbrrc_id && col.name === 'text' ? (
                        <div className="flex items-center gap-2 flex-1">
                          <input
                            type="text"
                            value={editingReasonCodeText}
                            onChange={(e) => setEditingReasonCodeText(e.target.value)}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0E2F4B] text-sm"
                            autoFocus
                            onClick={(e) => e.stopPropagation()}
                          />
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleUpdateReasonCode(reasonCode.atbrrc_id);
                            }}
                            disabled={isSubmitting}
                            className="text-green-600 hover:text-green-800 transition-colors"
                            title="Save"
                          >
                            <Save size={16} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCancelEdit();
                            }}
                            className="text-gray-600 hover:text-gray-800 transition-colors"
                            title="Cancel"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ) : (
                        reasonCode[col.name] || '-'
                      )}
                    </div>
                  ) : editingReasonCode === reasonCode.atbrrc_id && col.name === 'text' ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={editingReasonCodeText}
                        onChange={(e) => setEditingReasonCodeText(e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0E2F4B] text-sm"
                        autoFocus
                        onClick={(e) => e.stopPropagation()}
                      />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUpdateReasonCode(reasonCode.atbrrc_id);
                        }}
                        disabled={isSubmitting}
                        className="text-green-600 hover:text-green-800 transition-colors"
                        title="Save"
                      >
                        <Save size={16} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCancelEdit();
                        }}
                        className="text-gray-600 hover:text-gray-800 transition-colors"
                        title="Cancel"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    reasonCode[col.name] || '-'
                  )}
                </td>
              ))}
              {showActions && (
                <td className="border px-4 py-2 flex gap-2 justify-center">
                  {editingReasonCode === reasonCode.atbrrc_id ? null : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStartEdit(reasonCode);
                      }}
                      className="text-blue-600 hover:text-blue-800"
                      title="Edit"
                    >
                      <Edit2 size={16} />
                    </button>
                  )}
                </td>
              )}
            </tr>
          ));
        }}
      </ContentBox>
    </div>
  );
};

export default BreakdownReasonCodes;
