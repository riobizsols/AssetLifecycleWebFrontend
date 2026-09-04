import { showBackendTextToast } from '../../utils/errorTranslation';
import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { ChevronDown, Check, Search, Save } from 'lucide-react';
import API from '../../lib/axios';
import { invalidateCache } from '../../utils/apiCache';

const mappingListPath = '/master-data/spare-parts-configuration?tab=mapping';

const AddSparePartAssetTypeMapping = () => {
  const navigate = useNavigate();
  const { assetTypeId: routeAssetTypeId } = useParams();
  const [searchParams] = useSearchParams();
  const editAssetTypeId =
    routeAssetTypeId || searchParams.get('asset_type_id') || '';
  const isEditMode = Boolean(editAssetTypeId);
  const dropdownRef = useRef(null);

  const [assetTypes, setAssetTypes] = useState([]);
  const [allCategories, setAllCategories] = useState([]);
  const [selectedAssetType, setSelectedAssetType] = useState('');
  const [availableCategories, setAvailableCategories] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [dropdownSearchTerm, setDropdownSearchTerm] = useState('');
  const [selectedSearchTerm, setSelectedSearchTerm] = useState('');
  const [loadingAssetTypes, setLoadingAssetTypes] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadOptions = async () => {
      setLoadingAssetTypes(true);
      try {
        const [atRes, catRes] = await Promise.all([
          API.get('/asset-types'),
          API.get('/spare-parts/categories?orgWide=true'),
        ]);
        const types = Array.isArray(atRes.data)
          ? atRes.data
          : Array.isArray(atRes.data?.data)
            ? atRes.data.data
            : [];
        setAssetTypes(
          types.filter((at) => {
            const status = at.int_status;
            return status === 1 || status === '1' || status === true || status === 'Active' || status == null;
          })
        );
        const categories = Array.isArray(catRes.data?.data) ? catRes.data.data : [];
        setAllCategories(categories);
        if (editAssetTypeId) {
          setSelectedAssetType(editAssetTypeId);
          await loadCategoriesForAssetType(editAssetTypeId, categories);
        }
      } catch (error) {
        console.error('Error loading mapping options:', error);
        showBackendTextToast({
          toast,
          fallbackText: 'Failed to load mapping options',
          type: 'error',
        });
      } finally {
        setLoadingAssetTypes(false);
      }
    };
    loadOptions();
  }, [editAssetTypeId]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadCategoriesForAssetType = async (assetTypeId, categoriesList = allCategories) => {
    if (!assetTypeId) {
      setAvailableCategories([]);
      setSelectedCategories([]);
      return;
    }
    setLoadingCategories(true);
    try {
      let categories = categoriesList;
      if (!categories.length) {
        const catRes = await API.get('/spare-parts/categories?orgWide=true');
        categories = Array.isArray(catRes.data?.data) ? catRes.data.data : [];
        setAllCategories(categories);
      }
      const res = await API.get(`/spare-parts/category-mappings/by-asset-type/${assetTypeId}`);
      const mapped = Array.isArray(res.data?.data) ? res.data.data : [];
      const mappedIds = new Set(mapped.map((row) => row.spc_id));
      setSelectedCategories(categories.filter((cat) => mappedIds.has(cat.spc_id)));
      setAvailableCategories(categories.filter((cat) => !mappedIds.has(cat.spc_id)));
    } catch (error) {
      console.error('Error loading mapped categories:', error);
      setSelectedCategories([]);
      setAvailableCategories(categoriesList);
    } finally {
      setLoadingCategories(false);
    }
  };

  const handleAssetTypeSelect = (assetType) => {
    const assetTypeId = assetType.asset_type_id;
    setAvailableCategories([]);
    setSelectedCategories([]);
    setSelectedAssetType(assetTypeId);
    setIsDropdownOpen(false);
    setDropdownSearchTerm('');
    setSelectedSearchTerm('');
    loadCategoriesForAssetType(assetTypeId, allCategories);
  };

  const handleSelectCategory = (category) => {
    if (!category) return;
    setSelectedCategories((prev) =>
      prev.some((item) => item.spc_id === category.spc_id) ? prev : [...prev, category]
    );
    setAvailableCategories((prev) => prev.filter((item) => item.spc_id !== category.spc_id));
  };

  const handleDeselectCategory = (category) => {
    if (!category) return;
    setAvailableCategories((prev) =>
      prev.some((item) => item.spc_id === category.spc_id) ? prev : [...prev, category]
    );
    setSelectedCategories((prev) => prev.filter((item) => item.spc_id !== category.spc_id));
  };

  const handleSelectAll = () => {
    setSelectedCategories((prev) => [...prev, ...availableCategories]);
    setAvailableCategories([]);
  };

  const handleDeselectAll = () => {
    setAvailableCategories((prev) => [...prev, ...filteredSelectedCategories]);
    setSelectedCategories((prev) =>
      prev.filter((item) => !filteredSelectedCategories.some((sel) => sel.spc_id === item.spc_id))
    );
  };

  const filteredAssetTypes = assetTypes.filter(
    (type) =>
      type.text?.toLowerCase().includes(dropdownSearchTerm.toLowerCase()) ||
      type.asset_type_id?.toLowerCase().includes(dropdownSearchTerm.toLowerCase())
  );

  const filteredSelectedCategories = selectedCategories.filter(
    (cat) =>
      cat.text?.toLowerCase().includes(selectedSearchTerm.toLowerCase()) ||
      cat.spc_id?.toLowerCase().includes(selectedSearchTerm.toLowerCase())
  );

  const selectedAssetTypeRecord = assetTypes.find((type) => type.asset_type_id === selectedAssetType);
  const dropdownDisplayText = selectedAssetTypeRecord
    ? selectedAssetTypeRecord.text
    : 'Select asset type';

  const handleSave = async () => {
    if (!selectedAssetType) {
      showBackendTextToast({
        toast,
        fallbackText: 'Please select an asset type',
        type: 'error',
      });
      return;
    }
    if (!selectedCategories.length) {
      showBackendTextToast({
        toast,
        fallbackText: 'Please select at least one category',
        type: 'error',
      });
      return;
    }

    setSaving(true);
    try {
      await API.post('/spare-parts/category-mappings/bulk', {
        asset_type_id: selectedAssetType,
        spc_ids: selectedCategories.map((cat) => cat.spc_id),
      });
      invalidateCache('spare-parts:');
      showBackendTextToast({
        toast,
        tmdId: 'TMD_SP_MAP_SAVED',
        fallbackText: 'Asset type mapping saved successfully',
        type: 'success',
      });
      navigate(mappingListPath);
    } catch (error) {
      console.error('Error saving mappings:', error);
      showBackendTextToast({
        toast,
        tmdId: 'TMD_SP_MAP_SAVE_FAILED',
        fallbackText:
          error.response?.data?.error ||
          error.response?.data?.message ||
          'Failed to save asset type mapping',
        type: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 flex flex-col min-h-0">
          <div className="bg-white rounded-lg shadow-sm border p-4 sm:p-6 mb-4 sm:mb-6 flex-shrink-0">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
              <label className="text-sm font-medium text-gray-700 min-w-[80px] sm:min-w-[100px]">
                Asset Type
              </label>
              <div className="relative flex-1" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => {
                    if (!isEditMode) setIsDropdownOpen((open) => !open);
                  }}
                  disabled={isEditMode}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm text-left flex items-center justify-between ${
                    isEditMode ? 'bg-gray-50 cursor-not-allowed' : 'bg-white'
                  }`}
                >
                  <span className={selectedAssetType ? 'text-gray-900' : 'text-gray-500'}>
                    {dropdownDisplayText}
                  </span>
                  <ChevronDown size={16} className="text-gray-400" />
                </button>
                {isDropdownOpen && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-hidden">
                    <div className="p-2 border-b border-gray-200">
                      <div className="relative">
                        <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                        <input
                          type="text"
                          placeholder="Select asset type"
                          value={dropdownSearchTerm}
                          onChange={(e) => setDropdownSearchTerm(e.target.value)}
                          className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                          autoFocus
                        />
                      </div>
                    </div>
                    <div className="max-h-48 overflow-y-auto">
                      {loadingAssetTypes ? (
                        <div className="px-3 py-2 text-sm text-gray-500">Loading asset types...</div>
                      ) : filteredAssetTypes.length > 0 ? (
                        filteredAssetTypes.map((type) => (
                          <button
                            key={type.asset_type_id}
                            type="button"
                            onClick={() => handleAssetTypeSelect(type)}
                            className="w-full px-3 py-2 text-left hover:bg-gray-100 focus:bg-gray-100 focus:outline-none flex items-center justify-between"
                          >
                            <span className="text-sm text-gray-900 truncate">
                              {type.text}
                            </span>
                            {selectedAssetType === type.asset_type_id && (
                              <Check size={16} className="text-blue-600" />
                            )}
                          </button>
                        ))
                      ) : (
                        <div className="px-3 py-2 text-sm text-gray-500">No asset types found</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex-1 flex flex-col lg:flex-row gap-4 sm:gap-6">
            <div className="bg-white rounded-lg shadow-sm border flex flex-col flex-1 lg:flex-[2] h-[500px]">
              <div className="p-4 border-b flex-shrink-0">
                <h2 className="text-lg font-semibold text-gray-900">Category</h2>
              </div>
              <div className="flex-1 overflow-hidden">
                <div className="h-full overflow-auto">
                  {loadingCategories ? (
                    <div className="flex items-center justify-center h-32">
                      <div className="text-gray-500">Loading categories...</div>
                    </div>
                  ) : !selectedAssetType ? (
                    <div className="flex items-center justify-center h-32">
                      <div className="text-gray-500">Please select an asset type to view categories</div>
                    </div>
                  ) : availableCategories.length === 0 ? (
                    <div className="flex items-center justify-center h-32">
                      <div className="text-gray-500">No categories available</div>
                    </div>
                  ) : (
                    <table className="w-full">
                      <tbody className="bg-white divide-y divide-gray-200">
                        {availableCategories.map((category, index) => (
                          <tr
                            key={category.spc_id}
                            className={`hover:bg-gray-50 cursor-pointer ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                            onClick={() => handleSelectCategory(category)}
                          >
                            <td className="px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-900">
                              {category.text}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>

            <div className="hidden lg:flex flex-col justify-center items-center gap-2 flex-shrink-0 px-2">
              <div className="flex flex-col gap-1">
                <button
                  type="button"
                  onClick={() => handleSelectCategory(availableCategories[0])}
                  disabled={availableCategories.length === 0}
                  className="p-2 text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Add one category"
                >
                  <span className="text-lg font-bold">→</span>
                </button>
                <button
                  type="button"
                  onClick={handleSelectAll}
                  disabled={availableCategories.length === 0}
                  className="p-2 text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Add all categories"
                >
                  <span className="text-lg font-bold">{'>>'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDeselectCategory(filteredSelectedCategories[0])}
                  disabled={filteredSelectedCategories.length === 0}
                  className="p-2 text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Remove one category"
                >
                  <span className="text-lg font-bold">←</span>
                </button>
                <button
                  type="button"
                  onClick={handleDeselectAll}
                  disabled={filteredSelectedCategories.length === 0}
                  className="p-2 text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Remove all categories"
                >
                  <span className="text-lg font-bold">{'<<'}</span>
                </button>
              </div>
            </div>

            <div className="lg:hidden flex justify-center gap-4 py-2 bg-gray-50 rounded-lg">
              <button
                type="button"
                onClick={handleSelectAll}
                disabled={availableCategories.length === 0}
                className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed bg-white border border-gray-300 rounded"
              >
                Add all
              </button>
              <button
                type="button"
                onClick={handleDeselectAll}
                disabled={filteredSelectedCategories.length === 0}
                className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed bg-white border border-gray-300 rounded"
              >
                Remove all
              </button>
            </div>

            <div className="bg-white rounded-lg shadow-sm border flex flex-col flex-1 lg:flex-[2] h-[500px]">
              <div className="p-4 border-b flex-shrink-0">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Selected Category</h2>
                <div className="relative mb-0">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                  <input
                    type="text"
                    placeholder="Search selected categories..."
                    value={selectedSearchTerm}
                    onChange={(e) => setSelectedSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  />
                </div>
              </div>
              <div className="flex-1 overflow-hidden">
                <div className="h-full overflow-auto">
                  <table className="w-full">
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredSelectedCategories.map((category, index) => (
                        <tr
                          key={category.spc_id}
                          className={`hover:bg-gray-50 cursor-pointer ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                          onClick={() => handleDeselectCategory(category)}
                        >
                          <td className="px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-900">
                            {category.text}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 sm:mt-6 bg-white rounded-lg shadow-sm border p-4 flex-shrink-0">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-2 sm:gap-0">
              <p className="text-sm text-gray-600">
                Total categories selected: {selectedCategories.length}
              </p>
              <div className="flex gap-2 sm:gap-3">
                <button
                  type="button"
                  onClick={() => navigate(mappingListPath)}
                  className="px-3 sm:px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 text-sm sm:text-base"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving || !selectedAssetType || selectedCategories.length === 0}
                  className="px-4 sm:px-6 py-2 bg-[#0E2F4B] text-white rounded-md hover:bg-[#143d65] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0E2F4B] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm sm:text-base"
                >
                  {saving ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  ) : (
                    <Save size={16} />
                  )}
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddSparePartAssetTypeMapping;
