import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/useAuthStore";
import { toast } from "react-hot-toast";
import { generateUUID } from '../../utils/uuid';
import { useLanguage } from "../../contexts/LanguageContext";
import {
  ArrowRight,
  ArrowLeft,
  ChevronRight,
  ChevronLeft,
  Save,
  X,
  Search,
  Filter,
  ChevronDown,
  Check,
  Plus,
} from "lucide-react";
import API from "../../lib/axios";
import SearchableDropdown from '../ui/SearchableDropdown';

const CreateScrapSales = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [selectedAssetTypes, setSelectedAssetTypes] = useState([]); // Multi-select
  const [availableAssets, setAvailableAssets] = useState([]);
  const [selectedAssets, setSelectedAssets] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterTerm, setFilterTerm] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [dropdownSearchTerm, setDropdownSearchTerm] = useState("");
  // Asset types from API
  const [assetTypes, setAssetTypes] = useState([]);
  const [loadingAssetTypes, setLoadingAssetTypes] = useState(false);
  const [error, setError] = useState(null);

  // Buyer details
  const [buyerDetails, setBuyerDetails] = useState({
    buyer_name: "",
    buyer_email: "",
    buyer_contact: "",
    company_name: "",
  });

  // Scrap value management
  const [totalScrapValue, setTotalScrapValue] = useState("");
  const [individualValues, setIndividualValues] = useState({});
  const [groupName, setGroupName] = useState("");
  const [collectionDate, setCollectionDate] = useState("");
  const [activeTab, setActiveTab] = useState('Configuration');
  const [uploadRows, setUploadRows] = useState([]); // {id,type,docTypeName,file,previewUrl}
  const [documentTypes, setDocumentTypes] = useState([]);

  // Fetch asset types from API
  useEffect(() => {
    const fetchAssetTypes = async () => {
      setLoadingAssetTypes(true);
      try {
        const res = await API.get("/asset-types");
        const types = res.data?.asset_types || res.data?.rows || res.data || [];
        setAssetTypes(Array.isArray(types) ? types : []);
      } catch (error) {
        console.error("Error fetching asset types:", error);
        setAssetTypes([]);
        toast.error("Failed to fetch asset types");
      } finally {
        setLoadingAssetTypes(false);
      }
    };
    fetchAssetTypes();
  }, []);

  // Fetch document types on component mount
  useEffect(() => {
    fetchDocumentTypes();
  }, []);

  const fetchDocumentTypes = async () => {
    try {
      console.log('Fetching document types for scrap sales...');
      const res = await API.get('/doc-type-objects/object-type/scrap sales');
      console.log('Document types response:', res.data);

      if (res.data && res.data.success && Array.isArray(res.data.data)) {
        // Transform API data to dropdown format
        const docTypes = res.data.data.map(docType => ({
          id: docType.dto_id,  // Use dto_id instead of doc_type
          text: docType.doc_type_text,
          doc_type: docType.doc_type  // Keep doc_type for reference
        }));
        setDocumentTypes(docTypes);
        console.log('Document types loaded:', docTypes);
      } else {
        console.log('No document types found, using fallback');
        setDocumentTypes([]);
      }
    } catch (err) {
      console.error('Error fetching document types:', err);
      toast.error('Failed to load document types');
      setDocumentTypes([]);
    }
  };

  useEffect(() => {
    const fetchAvailableAssets = async () => {
      if (selectedAssetTypes.length === 0) {
        setAvailableAssets([]);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const fetchPromises = selectedAssetTypes.map((typeId) =>
          API.get(`/scrap-assets-by-type/${typeId}`)
        );
        const responses = await Promise.all(fetchPromises);

        // Correctly access the 'scrap_assets' array from each response
        const newAssets = responses.flatMap(
          (response) => response.data.scrap_assets
        );

        console.log("Fetched assets for selected types:", newAssets);

        setAvailableAssets(newAssets);
        setLoading(false);
      } catch (err) {
        console.error("Failed to fetch assets:", err);
        setError("Failed to load assets. Please try again.");
        setLoading(false);
      }
    };

    fetchAvailableAssets();
  }, [selectedAssetTypes]);

  const filteredAvailableAssets = availableAssets.filter(
    (asset) =>
      asset.asset_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      asset.asset_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (asset.asset_description &&
        asset.asset_description
          .toLowerCase()
          .includes(searchTerm.toLowerCase())) ||
      asset.serial_number.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredSelectedAssets = selectedAssets.filter((asset) => {
    return (
      (asset.name?.toLowerCase() || "").includes(filterTerm.toLowerCase()) ||
      (asset.description?.toLowerCase() || "").includes(
        filterTerm.toLowerCase()
      ) ||
      (asset.asset_id?.toLowerCase() || "").includes(filterTerm.toLowerCase())
    );
  });

  // Filter asset types for dropdown search
  const filteredAssetTypes = assetTypes.filter(
    (type) =>
      (type.text || "")
        .toLowerCase()
        .includes(dropdownSearchTerm.toLowerCase()) ||
      (type.asset_type_id || "")
        .toLowerCase()
        .includes(dropdownSearchTerm.toLowerCase())
  );

  const updateEqualValues = (assets) => {
    if (
      totalScrapValue &&
      !Object.values(individualValues).some((v) => v && parseFloat(v) > 0)
    ) {
      const equalValue = (parseFloat(totalScrapValue) / assets.length).toFixed(
        2
      );
      const newIndividualValues = {};
      assets.forEach((asset) => {
        newIndividualValues[asset.asset_id] = equalValue;
      });
      setIndividualValues(newIndividualValues);
    }
  };

  const handleSelectAsset = (asset) => {
    const newSelectedAssets = [...selectedAssets, asset];
    setSelectedAssets(newSelectedAssets);
    setAvailableAssets((prev) =>
      prev.filter((a) => a.asset_id !== asset.asset_id)
    );
    // Initialize individual value for new asset and recalculate equal distribution if needed
    setIndividualValues((prev) => {
      const newValues = {
        ...prev,
        [asset.asset_id]: "",
      };
      if (
        totalScrapValue &&
        !Object.values(prev).some((v) => v && parseFloat(v) > 0)
      ) {
        const equalValue = (
          parseFloat(totalScrapValue) / newSelectedAssets.length
        ).toFixed(2);
        newSelectedAssets.forEach((a) => {
          newValues[a.asset_id] = equalValue;
        });
      }
      return newValues;
    });
  };

  const handleDeselectAsset = (asset) => {
    setAvailableAssets((prev) => [...prev, asset]);
    const newSelectedAssets = selectedAssets.filter(
      (a) => a.asset_id !== asset.asset_id
    );
    setSelectedAssets(newSelectedAssets);
    // Remove individual value for deselected asset and recalculate equal distribution if needed
    setIndividualValues((prev) => {
      const newValues = { ...prev };
      delete newValues[asset.asset_id];
      if (
        totalScrapValue &&
        !Object.values(prev).some(
          (v) => parseFloat(v) > 0 && v !== prev[asset.asset_id]
        )
      ) {
        const equalValue = (
          parseFloat(totalScrapValue) / newSelectedAssets.length
        ).toFixed(2);
        newSelectedAssets.forEach((a) => {
          newValues[a.asset_id] = equalValue;
        });
      }
      return newValues;
    });
  };

  const handleSelectAll = () => {
    const newSelectedAssets = [...selectedAssets, ...filteredAvailableAssets];
    setSelectedAssets(newSelectedAssets);
    setAvailableAssets((prev) =>
      prev.filter(
        (asset) =>
          !filteredAvailableAssets.some(
            (selected) => selected.asset_id === asset.asset_id
          )
      )
    );
    // Initialize individual values for all selected assets and recalculate equal distribution if needed
    setIndividualValues((prev) => {
      const newValues = { ...prev };
      filteredAvailableAssets.forEach((asset) => {
        newValues[asset.asset_id] = "";
      });
      if (
        totalScrapValue &&
        !Object.values(prev).some((v) => v && parseFloat(v) > 0)
      ) {
        const equalValue = (
          parseFloat(totalScrapValue) / newSelectedAssets.length
        ).toFixed(2);
        newSelectedAssets.forEach((asset) => {
          newValues[asset.asset_id] = equalValue;
        });
      }
      return newValues;
    });
  };

  const handleDeselectAll = () => {
    setAvailableAssets((prev) => [...prev, ...filteredSelectedAssets]);
    const newSelectedAssets = selectedAssets.filter(
      (asset) =>
        !filteredSelectedAssets.some(
          (selected) => selected.asset_id === asset.asset_id
        )
    );
    setSelectedAssets(newSelectedAssets);
    // Remove individual values for all deselected assets and recalculate equal distribution if needed
    setIndividualValues((prev) => {
      const newValues = { ...prev };
      filteredSelectedAssets.forEach((asset) => {
        delete newValues[asset.asset_id];
      });
      if (
        totalScrapValue &&
        newSelectedAssets.length > 0 &&
        !Object.values(newValues).some((v) => v && parseFloat(v) > 0)
      ) {
        const equalValue = (
          parseFloat(totalScrapValue) / newSelectedAssets.length
        ).toFixed(2);
        newSelectedAssets.forEach((asset) => {
          newValues[asset.asset_id] = equalValue;
        });
      }
      return newValues;
    });
  };

  const handleAssetTypeSelect = (assetType) => {
    // Avoid duplicates
    if (selectedAssetTypes.includes(assetType.asset_type_id)) {
      toast.error("This asset type is already selected");
      return;
    }
    setSelectedAssetTypes((prev) => [...prev, assetType.asset_type_id]);
    setIsDropdownOpen(false);
    setDropdownSearchTerm("");
  };

  const handleRemoveAssetType = (assetTypeId) => {
    setSelectedAssetTypes((prev) => prev.filter((id) => id !== assetTypeId));
    // Remove selected assets of this type and return them to available
    setAvailableAssets((prev) => {
      const removed = selectedAssets.filter(
        (a) => a.asset_type_id === assetTypeId
      );
      return [...prev, ...removed];
    });
    setSelectedAssets((prev) =>
      prev.filter((a) => a.asset_type_id !== assetTypeId)
    );
    // Clean individual values for removed assets
    setIndividualValues((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((k) => {
        const asset = selectedAssets.find((a) => a.asset_id === k);
        if (asset && asset.asset_type_id === assetTypeId) delete next[k];
      });
      return next;
    });
  };

  const getSelectedAssetTypeNames = () => {
    return selectedAssetTypes.map((typeId) => {
      const type = assetTypes.find((t) => t.asset_type_id === typeId);
      return type ? `${type.asset_type_id} - ${type.text}` : typeId;
    });
  };

  const getDropdownDisplayText = () => {
    if (selectedAssetTypes.length === 0) return t('scrapSales.selectAssetType');
    if (selectedAssetTypes.length === 1) return getSelectedAssetTypeNames()[0];
    return `${selectedAssetTypes.length} ${t('scrapSales.assetTypesSelected')}`;
  };

  const handleIndividualValueChange = (assetId, value) => {
    setIndividualValues((prev) => ({
      ...prev,
      [assetId]: value,
    }));
  };

  const handleBuyerDetailChange = (field, value) => {
    setBuyerDetails((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // Calculate total of individual values
  const totalIndividualValues = Object.values(individualValues).reduce(
    (sum, value) => {
      return sum + (parseFloat(value) || 0);
    },
    0
  );

  // Validation function
  const validateScrapValues = () => {
    const hasTotalValue = totalScrapValue && parseFloat(totalScrapValue) > 0;
    const hasIndividualValues = Object.values(individualValues).some(
      (value) => value && parseFloat(value) > 0
    );

    if (!hasTotalValue && !hasIndividualValues) {
      toast.error(
        "Please provide either total scrap value or individual asset values"
      );
      return false;
    }

    // If we have a total value but no individual values, it's valid (we'll divide equally)
    if (hasTotalValue && !hasIndividualValues) {
      return true;
    }

    if (hasTotalValue && hasIndividualValues) {
      const total = parseFloat(totalScrapValue);
      const individualTotal = totalIndividualValues;

      if (Math.abs(total - individualTotal) > 0.01) {
        // Allow for small floating point differences
        toast.error(
          `Total scrap value (${total}) does not match sum of individual values (${individualTotal})`
        );
        return false;
      }
    }

    return true;
  };

  const handleSave = async () => {
    if (selectedAssets.length === 0) {
      toast.error("Please select at least one asset");
      return;
    }

    if (!validateScrapValues()) {
      return;
    }

    if (!buyerDetails.buyer_name || !buyerDetails.buyer_contact) {
      toast.error("Please fill in required buyer details (name and contact)");
      return;
    }

    if (!collectionDate) {
      toast.error("Please select a collection date");
      return;
    }

    setLoading(true);
    try {
      const scrapSaleData = {
        text: groupName || "Scrap Sale", // Required field, use group name or default
        total_sale_value: parseFloat(totalScrapValue || totalIndividualValues),
        buyer_name: buyerDetails.buyer_name,
        buyer_company: buyerDetails.company_name,
        buyer_phone: buyerDetails.buyer_contact,
        sale_date: new Date().toISOString().split("T")[0],
        collection_date: collectionDate,
        scrapAssets: selectedAssets.map((asset) => ({
          asd_id: asset.asd_id, // The backend expects asd_id
          sale_value: parseFloat(individualValues[asset.asset_id] || 0),
        })),
      };

      console.log("Creating scrap sale:", scrapSaleData);

      const response = await API.post("/scrap-sales", scrapSaleData);

      if (response.data.success) {
        toast.success(
          response.data.message || "Scrap sale created successfully!"
        );
        const scrapId = response.data?.scrap_sale?.ssh_id || response.data?.data?.scrap_id || response.data?.scrap_id || response.data?.id;
        console.log('CreateScrapSales - Response data:', response.data);
        console.log('CreateScrapSales - Extracted scrapId:', scrapId);
        // Upload related documents if any
        if (scrapId && uploadRows.length > 0) {
          for (const r of uploadRows) {
            if (!r.type || !r.file) continue;
            // Check if the selected document type requires a custom name
            const selectedDocType = documentTypes.find(dt => dt.id === r.type);
            if (selectedDocType && (selectedDocType.text.toLowerCase().includes('other') || selectedDocType.doc_type === 'OT') && !r.docTypeName?.trim()) {
              toast.error(`Enter custom name for ${selectedDocType.text} before uploading`);
              continue;
            }
            const fd = new FormData();
            fd.append('file', r.file);
            fd.append('dto_id', r.type);  // Send dto_id instead of doc_type
            fd.append('ssh_id', scrapId);  // Add scrap sale ID
            if (r.type && r.docTypeName?.trim()) {
              fd.append('doc_type_name', r.docTypeName);
            }
            try {
              await API.post(`/scrap-sales-docs/upload`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
            } catch (upErr) {
              console.warn('Scrap sales doc upload failed', upErr);
            }
          }
        }
        navigate("/scrap-sales");
      } else {
        throw new Error(response.data.message || "Failed to create scrap sale");
      }
    } catch (error) {
      console.error("Error creating scrap sale:", error);
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        "Failed to create scrap sale";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate("/scrap-sales");
  };

  // Multi-select display handled via helpers above

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      {/* Header */}
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={handleCancel}
              className="p-2 text-gray-600 hover:text-gray-900 rounded-md hover:bg-gray-100"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {t('scrapSales.createScrapSale')}
              </h1>
              <p className="text-sm text-gray-600">
                {t('scrapSales.selectAssetsAndConfigureDetails')}
              </p>
            </div>
          </div>
        </div>

        {/* Main Content */}
        {/* Asset Type Selection */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            {t('scrapSales.assetType')}
          </h2>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
            <label className="text-sm font-medium text-gray-700 min-w-[80px] sm:min-w-[100px]">
              {t('scrapSales.assetType')}:
            </label>
            <div className="relative flex-1">
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm text-left bg-white flex items-center justify-between"
              >
                <span
                  className={
                    selectedAssetTypes.length > 0
                      ? "text-gray-900"
                      : "text-gray-500"
                  }
                >
                  {getDropdownDisplayText()}
                </span>
                <ChevronDown size={16} className="text-gray-400" />
              </button>

              {/* Selected Asset Type Badges */}
              {selectedAssetTypes.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {getSelectedAssetTypeNames().map((typeName, index) => {
                    const typeId = selectedAssetTypes[index];
                    return (
                      <div
                        key={typeId}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                      >
                        <span>{typeName}</span>
                        <button
                          onClick={() => handleRemoveAssetType(typeId)}
                          className="ml-1 text-blue-600 hover:text-blue-800"
                          title={t('scrapSales.removeAssetType')}
                        >
                          <X size={12} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {isDropdownOpen && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg">
                  <div className="p-2">
                    <div className="relative">
                      <Search
                        className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400"
                        size={16}
                      />
                      <input
                        type="text"
                        placeholder={t('scrapSales.searchAssetTypes')}
                        value={dropdownSearchTerm}
                        onChange={(e) => setDropdownSearchTerm(e.target.value)}
                        className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        autoFocus
                      />
                    </div>

                    {/* Dropdown Options */}
                    <div className="max-h-48 overflow-y-auto">
                      {filteredAssetTypes.length > 0 ? (
                        filteredAssetTypes.map((type) => {
                          const isSelected = selectedAssetTypes.includes(
                            type.asset_type_id
                          );
                          return (
                            <button
                              key={type.asset_type_id}
                              onClick={() => handleAssetTypeSelect(type)}
                              disabled={isSelected}
                              className={`w-full px-3 py-2 text-left hover:bg-gray-100 focus:bg-gray-100 focus:outline-none flex items-center justify-between ${
                                isSelected
                                  ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                                  : ""
                              }`}
                            >
                              <span className="text-sm text-gray-900">
                                {type.asset_type_id} - {type.text}
                              </span>
                              {isSelected && (
                                <Check size={16} className="text-blue-600" />
                              )}
                            </button>
                          );
                        })
                      ) : (
                        <div className="px-3 py-2 text-sm text-gray-500">
                          No asset types found
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => {
                        setIsDropdownOpen(false);
                        setDropdownSearchTerm("");
                        navigate("/master-data/asset-types/add");
                      }}
                      className="w-full px-3 py-2 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md flex items-center justify-center gap-2 font-medium"
                    >
                      <Plus size={16} />
                      Create New Asset Type
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Asset Selection Section */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Asset Selection
          </h2>

          <div className="flex flex-col lg:flex-row gap-6">
            {/* Available Assets */}
            <div className="flex-1">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-md font-medium text-gray-900">
                  Available Assets
                </h3>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search
                      className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400"
                      size={16}
                    />
                    <input
                      type="text"
                      placeholder="Search assets..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8 pr-3 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Available Assets Table */}

              <div className="border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Asset ID
                      </th>
                      <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Description
                      </th>
                      <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Serial Number
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {loading ? (
                      <tr>
                        <td
                          colSpan="4"
                          className="text-center py-4 text-gray-500"
                        >
                          <div className="flex items-center justify-center gap-2">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
                            {t('scrapSales.loadingAssets')}
                          </div>
                        </td>
                      </tr>
                    ) : error ? (
                      <tr>
                        <td
                          colSpan="4"
                          className="text-center py-4 text-red-500"
                        >
                          {error}
                        </td>
                      </tr>
                    ) : filteredAvailableAssets.length > 0 ? (
                      filteredAvailableAssets.map((asset, index) => (
                        <tr
                          key={asset.asd_id}
                          className={`hover:bg-gray-50 cursor-pointer ${
                            index % 2 === 0 ? "bg-white" : "bg-gray-50"
                          }`}
                          onClick={() => handleSelectAsset(asset)}
                        >
                          <td className="px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-900">
                            {asset.asset_id}
                          </td>
                          <td className="px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-900">
                            {asset.asset_name}
                          </td>
                          <td className="px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-900">
                            {asset.asset_description}
                          </td>
                          <td className="px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-900">
                            {asset.serial_number}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan="4"
                          className="text-center py-4 text-gray-500"
                        >
                          {t('scrapSales.noAssetsFoundForSelectedTypes')}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile Controls */}
              <div className="lg:hidden flex justify-center gap-4 py-2 bg-gray-50 rounded-lg mt-2">
                <button
                  onClick={handleSelectAll}
                  disabled={filteredAvailableAssets.length === 0}
                  className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed bg-white border border-gray-300 rounded"
                  title={t('scrapSales.addAllAssets')}
                >
                  {t('scrapSales.addAll')}
                </button>
                <button
                  onClick={handleDeselectAll}
                  disabled={filteredSelectedAssets.length === 0}
                  className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed bg-white border border-gray-300 rounded"
                  title={t('scrapSales.removeAllAssets')}
                >
                  {t('scrapSales.removeAll')}
                </button>
              </div>
            </div>

            {/* Desktop Transfer Controls */}
            <div className="hidden lg:flex flex-col justify-center items-center gap-2 flex-shrink-0 px-2">
              {/* Transfer buttons in order: right single, right all, left single, left all */}
              <div className="flex flex-col gap-1">
                <button
                  onClick={() => handleSelectAsset(filteredAvailableAssets[0])}
                  disabled={filteredAvailableAssets.length === 0}
                  className="p-1 text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
                  title={t('scrapSales.addOneAsset')}
                >
                  <span className="text-lg font-bold">→</span>
                </button>
                <button
                  onClick={handleSelectAll}
                  disabled={filteredAvailableAssets.length === 0}
                  className="p-1 text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
                  title={t('scrapSales.addAllAssets')}
                >
                  <span className="text-lg font-bold">{">>"}</span>
                </button>
                <button
                  onClick={() => handleDeselectAsset(filteredSelectedAssets[0])}
                  disabled={filteredSelectedAssets.length === 0}
                  className="p-1 text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
                  title={t('scrapSales.removeOneAsset')}
                >
                  <span className="text-lg font-bold">←</span>
                </button>
                <button
                  onClick={handleDeselectAll}
                  disabled={filteredSelectedAssets.length === 0}
                  className="p-1 text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
                  title={t('scrapSales.removeAllAssets')}
                >
                  <span className="text-lg font-bold">{"<<"}</span>
                </button>
              </div>
            </div>

            {/* Selected Assets */}
            <div className="flex-1">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-md font-medium text-gray-900">
                  {t('scrapSales.selectedScrapAssets')}
                </h3>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search
                      className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400"
                      size={16}
                    />
                    <input
                      type="text"
                      placeholder={t('scrapSales.searchSelectedAssetsPlaceholder')}
                      value={filterTerm}
                      onChange={(e) => setFilterTerm(e.target.value)}
                      className="pl-8 pr-3 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Selected Assets Table */}
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('scrapSales.assetId')}
                      </th>
                      <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('scrapSales.name')}
                      </th>
                      <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('scrapSales.serialNumber')}
                      </th>
                      <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('scrapSales.value')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredSelectedAssets.map((asset, index) => (
                      <tr
                        key={asset.asset_id}
                        className={`hover:bg-gray-50 ${
                          index % 2 === 0 ? "bg-white" : "bg-gray-50"
                        }`}
                      >
                        <td className="px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-900">
                          {asset.asset_id}
                        </td>
                        <td className="px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-900">
                          {asset.name}
                        </td>
                        <td className="px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-900">
                          {asset.serial_number}
                        </td>
                        <td className="px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-900">
                          <input
                            type="number"
                            placeholder="0"
                            value={individualValues[asset.asset_id] || ""}
                            onChange={(e) =>
                              handleIndividualValueChange(
                                asset.asset_id,
                                e.target.value
                              )
                            }
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-900">
                          <button
                            onClick={() => handleDeselectAsset(asset)}
                            className="text-red-600 hover:text-red-800"
                            title="Remove asset"
                          >
                            <X size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Summary */}
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-sm text-gray-600">
                  {t('scrapSales.totalAssetsSelected')}:{" "}
                  <span className="font-semibold text-gray-900">
                    {selectedAssets.length}
                  </span>
                </p>
                <p className="text-sm text-gray-600">
                  {t('scrapSales.totalIndividualValues')}:{" "}
                  <span className="font-semibold text-gray-900">
                    ₹{totalIndividualValues.toFixed(2)}
                  </span>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Scrap Value Configuration */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            {t('scrapSales.scrapValueConfiguration')}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('scrapSales.groupName')}
              </label>
              <input
                type="text"
                placeholder={t('scrapSales.groupNamePlaceholder')}
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                {t('scrapSales.groupNameOptional')}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('scrapSales.collectionDateRequired')}
              </label>
              <input
                type="date"
                value={collectionDate}
                onChange={(e) => setCollectionDate(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                {t('scrapSales.collectionDateHelp')}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('scrapSales.totalScrapValue')}
              </label>
              <input
                type="number"
                placeholder={t('scrapSales.enterTotalScrapValue')}
                value={totalScrapValue}
                onChange={(e) => {
                  const newValue = e.target.value;
                  setTotalScrapValue(newValue);

                  // If the value is cleared or empty, reset all individual values to empty
                  if (!newValue) {
                    const resetValues = {};
                    selectedAssets.forEach((asset) => {
                      resetValues[asset.asset_id] = "";
                    });
                    setIndividualValues(resetValues);
                    return;
                  }

                  // If no individual values have been manually set, or if all individual values are equal
                  // (meaning they were auto-divided), continue auto-dividing
                  const hasManualValues = Object.values(individualValues).some(
                    (v) => v && parseFloat(v) > 0
                  );
                  const allValuesEqual = Object.values(individualValues).every(
                    (v, i, arr) =>
                      !v || !arr[0] || parseFloat(v) === parseFloat(arr[0])
                  );

                  if (
                    selectedAssets.length > 0 &&
                    (!hasManualValues || allValuesEqual)
                  ) {
                    // Parse the new value as float and check if it's valid
                    const totalValue = parseFloat(newValue);
                    if (!isNaN(totalValue)) {
                      const equalValue = (
                        totalValue / selectedAssets.length
                      ).toFixed(2);
                      const newIndividualValues = {};
                      selectedAssets.forEach((asset) => {
                        newIndividualValues[asset.asset_id] = equalValue;
                      });
                      setIndividualValues(newIndividualValues);
                    }
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                {t('scrapSales.totalScrapValueHelp')}
              </p>
            </div>
          </div>
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <div className="text-sm text-gray-600">
              <p>
                {t('scrapSales.individualValuesTotal')}: ₹{totalIndividualValues.toFixed(2)}
              </p>
              {totalScrapValue && (
                <p
                  className={
                    Math.abs(
                      parseFloat(totalScrapValue) - totalIndividualValues
                    ) > 0.01
                      ? "text-red-600"
                      : "text-green-600"
                  }
                >
                  Difference: ₹
                  {(
                    parseFloat(totalScrapValue) - totalIndividualValues
                  ).toFixed(2)}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Buyer Information */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            {t('scrapSales.buyerInformation')}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('scrapSales.buyerNameRequired')}
              </label>
              <input
                type="text"
                placeholder={t('scrapSales.fullName')}
                value={buyerDetails.buyer_name}
                onChange={(e) =>
                  handleBuyerDetailChange("buyer_name", e.target.value)
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('scrapSales.emailRequired')}
              </label>
              <input
                type="email"
                placeholder={t('scrapSales.emailPlaceholder')}
                value={buyerDetails.buyer_email}
                onChange={(e) =>
                  handleBuyerDetailChange("buyer_email", e.target.value)
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('scrapSales.contactNumberRequired')}
              </label>
              <input
                type="tel"
                placeholder={t('scrapSales.contactNumberPlaceholder')}
                value={buyerDetails.buyer_contact}
                onChange={(e) =>
                  handleBuyerDetailChange("buyer_contact", e.target.value)
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('scrapSales.companyName')}
              </label>
              <input
                type="text"
                placeholder={t('scrapSales.companyNamePlaceholder')}
                value={buyerDetails.company_name}
                onChange={(e) =>
                  handleBuyerDetailChange("company_name", e.target.value)
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Documents Section */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('scrapSales.documents')}</h2>
          <div className="text-sm text-gray-600 mb-3">{t('scrapSales.documentTypesLoadedFromSystem')}</div>
          <div className="flex justify-end mb-3">
            <button 
              type="button" 
              className="px-4 py-2 bg-[#0E2F4B] text-white rounded text-sm flex items-center gap-2 hover:bg-[#1a4971] transition-colors"
              onClick={() => setUploadRows(prev => ([...prev, { id: generateUUID(), type:'', docTypeName:'', file:null, previewUrl:'' }]))}
            >
              <Plus size={16} />
              {t('scrapSales.addDocument')}
            </button>
          </div>
          <div className="space-y-3">
            {uploadRows.length === 0 && <div className="text-sm text-gray-500">{t('scrapSales.noFilesAdded')}</div>}
            {uploadRows.map(r => (
              <div key={r.id} className="grid grid-cols-12 gap-3 items-start bg-white border rounded p-3">
                <div className="col-span-3">
                  <label className="block text-xs font-medium mb-1">{t('scrapSales.documentType')}</label>
                  <SearchableDropdown
                    options={documentTypes}
                    value={r.type}
                    onChange={(value) => setUploadRows(prev => prev.map(x => x.id===r.id?{...x,type:value}:x))}
                    placeholder={t('scrapSales.selectType')}
                    searchPlaceholder={t('scrapSales.searchDocumentTypes')}
                    className="w-full"
                    displayKey="text"
                    valueKey="id"
                  />
                </div>
                {(() => {
                  const selectedDocType = documentTypes.find(dt => dt.id === r.type);
                  const needsCustomName = selectedDocType && selectedDocType.text.toLowerCase().includes('other');
                  return needsCustomName && (
                    <div className="col-span-3">
                      <label className="block text-xs font-medium mb-1">{t('scrapSales.customName')}</label>
                      <input 
                        className="w-full border rounded h-[38px] px-2 text-sm" 
                        value={r.docTypeName} 
                        onChange={e => setUploadRows(prev => prev.map(x => x.id===r.id?{...x,docTypeName:e.target.value}:x))} 
                        placeholder={t('scrapSales.enterCustomNameFor', { docType: selectedDocType?.text })}
                      />
                    </div>
                  );
                })()}
                <div className={(() => {
                  const selectedDocType = documentTypes.find(dt => dt.id === r.type);
                  const needsCustomName = selectedDocType && selectedDocType.text.toLowerCase().includes('other');
                  return needsCustomName ? 'col-span-4' : 'col-span-7';
                })()}>
                  <label className="block text-xs font-medium mb-1">{t('scrapSales.fileMaxSize')}</label>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <input
                        type="file"
                        id={`file-${r.id}`}
                        onChange={e => {
                          const f = e.target.files?.[0] || null;
                          if (f && f.size > 15 * 1024 * 1024) { // 15MB limit
                            toast.error('File size exceeds 15MB limit');
                            e.target.value = '';
                            return;
                          }
                          const previewUrl = f ? URL.createObjectURL(f) : '';
                          setUploadRows(prev => prev.map(x => x.id===r.id?{...x,file:f,previewUrl}:x));
                        }}
                        className="hidden"
                      />
                      <label
                        htmlFor={`file-${r.id}`}
                        className="flex items-center h-[38px] px-4 border border-gray-300 rounded shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer w-full"
                      >
                        <svg className="flex-shrink-0 w-5 h-5 mr-2 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                        </svg>
                        <span className="truncate max-w-[200px] inline-block">
                          {r.file ? r.file.name : 'Choose file'}
                        </span>
                      </label>
                    </div>
                    {r.previewUrl && (
                      <a 
                        href={r.previewUrl} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="h-[38px] inline-flex items-center px-4 bg-[#0E2F4B] text-white rounded shadow-sm text-sm font-medium hover:bg-[#1a4971] transition-colors"
                      >
                        {t('scrapSales.preview')}
                      </a>
                    )}
                    <button 
                      type="button" 
                      onClick={() => setUploadRows(prev => prev.filter(x => x.id!==r.id))}
                      className="h-[38px] inline-flex items-center px-4 border border-gray-300 rounded shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                    >
                      {t('scrapSales.remove')}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-4">
          <button
            onClick={handleCancel}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
          >
            {t('scrapSales.cancel')}
          </button>
          <button
            onClick={handleSave}
            disabled={loading || selectedAssets.length === 0}
            className="px-6 py-2 bg-[#0E2F4B] text-white rounded-md hover:bg-[#143d65] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0E2F4B] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                {t('scrapSales.saving')}
              </>
            ) : (
              <>
                <Save size={16} />
                {t('scrapSales.saveScrapSale')}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateScrapSales;
