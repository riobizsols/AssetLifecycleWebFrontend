import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import API from "../lib/axios";
import { toast } from "react-hot-toast";
import { useLanguage } from "../contexts/LanguageContext";
import { ArrowRight, Building2, Package, Tag, X, Search, ChevronDown, QrCode, Maximize, Minimize } from "lucide-react";
import { Html5Qrcode } from "html5-qrcode";

// Searchable Select Component
const SearchableSelect = ({ 
  value, 
  onChange, 
  options, 
  placeholder, 
  disabled, 
  loading,
  optionLabel = "text",
  optionValue = "id"
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);

  const filteredOptions = options.filter(option =>
    option[optionLabel]?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedOption = options.find(opt => opt[optionValue] === value);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchTerm("");
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSelect = (option) => {
    onChange(option[optionValue]);
    setIsOpen(false);
    setSearchTerm("");
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-100 text-left flex items-center justify-between"
      >
        <span className={selectedOption ? "text-gray-900" : "text-gray-500"}>
          {loading ? placeholder.replace("Select", "Loading") : (selectedOption?.[optionLabel] || placeholder)}
        </span>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && !disabled && (
        <div className="absolute z-50 w-full mt-1 bg-white border-2 border-gray-300 rounded-lg shadow-lg max-h-64 overflow-hidden">
          <div className="p-2 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                ref={inputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
          <div className="overflow-y-auto max-h-48">
            {filteredOptions.length === 0 ? (
              <div className="px-4 py-3 text-gray-500 text-center">No options found</div>
            ) : (
              filteredOptions.map((option) => (
                <button
                  key={option[optionValue]}
                  type="button"
                  onClick={() => handleSelect(option)}
                  className={`w-full px-4 py-2 text-left hover:bg-gray-100 focus:bg-gray-100 focus:outline-none ${
                    value === option[optionValue] ? "bg-blue-50 text-blue-700 font-medium" : "text-gray-900"
                  }`}
                >
                  {option[optionLabel]}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const CostCenterTransfer = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  // Form state
  const [assetTypes, setAssetTypes] = useState([]);
  const [assets, setAssets] = useState([]);
  const [branches, setBranches] = useState([]);
  const [costCenters, setCostCenters] = useState([]);

  const [selectedAssetType, setSelectedAssetType] = useState("");
  const [selectedAsset, setSelectedAsset] = useState("");
  const [assetDetails, setAssetDetails] = useState(null);
  const [selectedBranch, setSelectedBranch] = useState("");
  const [selectedCostCenter, setSelectedCostCenter] = useState("");

  // UI state
  const [activeTab, setActiveTab] = useState("select");
  const [scannedAssetId, setScannedAssetId] = useState("");
  const [isMaximized, setIsMaximized] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const scannerRef = useRef(null);

  // Loading states
  const [isLoadingAssetTypes, setIsLoadingAssetTypes] = useState(false);
  const [isLoadingAssets, setIsLoadingAssets] = useState(false);
  const [isLoadingBranches, setIsLoadingBranches] = useState(false);
  const [isLoadingCostCenters, setIsLoadingCostCenters] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Confirmation modal state
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmModalData, setConfirmModalData] = useState({ current: "", new: "" });

  // Fetch asset types and branches on mount
  useEffect(() => {
    fetchAssetTypes();
    fetchBranches();
  }, []);

  // Scanner initialization
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

  // ESC key handler
  useEffect(() => {
    const handleEscKey = (e) => {
      if (e.key === "Escape") {
        if (showConfirmModal) {
          handleCancelTransfer();
        } else if (showScanner) {
          stopScanner();
        }
      }
    };

    document.addEventListener("keydown", handleEscKey);
    return () => document.removeEventListener("keydown", handleEscKey);
  }, [showConfirmModal, showScanner]);

  // Fetch assets when asset type changes
  useEffect(() => {
    if (selectedAssetType) {
      fetchAssetsByType(selectedAssetType);
    } else {
      setAssets([]);
      setSelectedAsset("");
      setAssetDetails(null);
    }
  }, [selectedAssetType]);

  // Fetch asset details when asset changes
  useEffect(() => {
    if (selectedAsset) {
      fetchAssetDetails(selectedAsset);
    } else {
      setAssetDetails(null);
    }
  }, [selectedAsset]);

  // Fetch cost centers when branch changes
  useEffect(() => {
    if (selectedBranch) {
      fetchCostCentersByBranch(selectedBranch);
    } else {
      setCostCenters([]);
      setSelectedCostCenter("");
    }
  }, [selectedBranch]);

  // Scanner functions
  const initializeScanner = async () => {
    try {
      const scanner = new Html5Qrcode("qr-reader");
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        },
        onScanSuccess,
        onScanError
      );
    } catch (err) {
      console.error("Error starting scanner:", err);
      toast.error("Could not access camera");
      setShowScanner(false);
    }
  };

  const startScanner = () => {
    setShowScanner(true);
  };

  const onScanSuccess = (decodedText) => {
    if (scannerRef.current) {
      scannerRef.current.stop().catch(console.error);
      scannerRef.current = null;
    }
    setScannedAssetId(decodedText);
    setShowScanner(false);
    toast.success("Asset ID scanned successfully");
  };

  const onScanError = (error) => {
    console.warn("Scan error:", error);
  };

  const stopScanner = () => {
    if (scannerRef.current) {
      scannerRef.current.stop().catch(console.error);
      scannerRef.current = null;
    }
    setShowScanner(false);
  };

  const fetchAssetTypes = async () => {
    setIsLoadingAssetTypes(true);
    try {
      const response = await API.get("/cost-center-transfer/asset-types");
      setAssetTypes(response.data);
    } catch (error) {
      console.error("Error fetching asset types:", error);
      toast.error("Failed to fetch asset types");
    } finally {
      setIsLoadingAssetTypes(false);
    }
  };

  const fetchAssetsByType = async (assetTypeId) => {
    setIsLoadingAssets(true);
    try {
      const response = await API.get(`/cost-center-transfer/assets/${assetTypeId}`);
      setAssets(response.data);
    } catch (error) {
      console.error("Error fetching assets:", error);
      toast.error("Failed to fetch assets");
    } finally {
      setIsLoadingAssets(false);
    }
  };

  const fetchAssetDetails = async (assetId) => {
    try {
      const response = await API.get(`/cost-center-transfer/asset-details/${assetId}`);
      setAssetDetails(response.data);
    } catch (error) {
      console.error("Error fetching asset details:", error);
      toast.error("Failed to fetch asset details");
    }
  };

  const fetchBranches = async () => {
    setIsLoadingBranches(true);
    try {
      const response = await API.get("/cost-center-transfer/branches");
      setBranches(response.data);
    } catch (error) {
      console.error("Error fetching branches:", error);
      toast.error("Failed to fetch branches");
    } finally {
      setIsLoadingBranches(false);
    }
  };

  const fetchCostCentersByBranch = async (branchId) => {
    setIsLoadingCostCenters(true);
    try {
      const response = await API.get(`/cost-center-transfer/cost-centers/${branchId}`);
      setCostCenters(response.data);
    } catch (error) {
      console.error("Error fetching cost centers:", error);
      toast.error("Failed to fetch cost centers");
    } finally {
      setIsLoadingCostCenters(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedAsset || !selectedBranch) {
      toast.error("Please select an asset and target branch");
      return;
    }

    // Check if cost center is being changed
    const currentCostCenter = assetDetails?.cost_center_code;
    const newCostCenter = selectedCostCenter;

    // If cost center is selected and different from current, show confirmation modal
    if (newCostCenter && currentCostCenter !== newCostCenter) {
      const currentCostCenterName = assetDetails?.cost_center_name || "Not assigned";
      const newCostCenterName = costCenters.find(cc => cc.cc_id === newCostCenter)?.text || newCostCenter;
      
      setConfirmModalData({
        current: currentCostCenterName,
        new: newCostCenterName
      });
      setShowConfirmModal(true);
      return;
    }

    // If no cost center change, proceed directly
    await performTransfer();
  };

  const performTransfer = async () => {
    setIsSubmitting(true);
    try {
      const payload = {
        asset_id: selectedAsset,
        branch_id: selectedBranch,
      };

      // Only include cost center if selected
      if (selectedCostCenter) {
        payload.cost_center_code = selectedCostCenter;
      }

      const response = await API.post("/cost-center-transfer/transfer", payload);

      toast.success(response.data.message || "Asset transferred successfully");

      // Reset form
      setSelectedAssetType("");
      setSelectedAsset("");
      setAssetDetails(null);
      setSelectedBranch("");
      setSelectedCostCenter("");
      setAssets([]);
      setCostCenters([]);
    } catch (error) {
      console.error("Error transferring asset:", error);
      const errorMessage = error.response?.data?.error || "Failed to transfer asset";
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleScanSubmit = async (e) => {
    e.preventDefault();
    
    if (!scannedAssetId) {
      toast.error("Please enter an asset ID");
      return;
    }

    if (!selectedBranch) {
      toast.error("Please select a target branch");
      return;
    }

    try {
      setIsSubmitting(true);
      // First get asset details
      const response = await API.get(`/cost-center-transfer/asset-details/${scannedAssetId}`);
      const assetData = response.data;

      if (!assetData.asset) {
        toast.error("Asset not found");
        return;
      }

      // Set asset details for confirmation
      setAssetDetails(assetData);
      setSelectedAsset(scannedAssetId);

      const currentCostCenter = assetData.cost_center_code;
      const newCostCenter = selectedCostCenter;

      // If cost center is selected and different from current, show confirmation modal
      if (newCostCenter && currentCostCenter !== newCostCenter) {
        const currentCostCenterName = assetData.cost_center_name || "Not assigned";
        const newCostCenterName = costCenters.find(cc => cc.cc_id === newCostCenter)?.text || newCostCenter;
        
        setConfirmModalData({
          current: currentCostCenterName,
          new: newCostCenterName
        });
        setShowConfirmModal(true);
        return;
      }

      // If no cost center change, proceed directly
      await performTransfer();
      setScannedAssetId("");
    } catch (error) {
      console.error("Failed to process scanned asset:", error);
      const errorMessage = error.response?.data?.message || "Failed to process asset";
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setSelectedAssetType("");
    setSelectedAsset("");
    setAssetDetails(null);
    setSelectedBranch("");
    setSelectedCostCenter("");
    setAssets([]);
    setCostCenters([]);
  };

  const handleConfirmTransfer = async () => {
    setShowConfirmModal(false);
    await performTransfer();
  };

  const handleCancelTransfer = () => {
    setShowConfirmModal(false);
  };

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <div className="bg-white rounded shadow mb-4">
        <div className="bg-[#EDF3F7] px-4 py-2 rounded-t text-[#0E2F4B] font-semibold text-sm">
          Cost Center Transfer
        </div>
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex">
            <button
              onClick={() => setActiveTab("select")}
              className={`py-2 px-4 text-sm font-medium ${
                activeTab === "select"
                  ? "border-b-2 border-[#0E2F4B] text-[#0E2F4B]"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Select Asset
            </button>
            <button
              onClick={() => setActiveTab("scan")}
              className={`py-2 px-4 text-sm font-medium ${
                activeTab === "scan"
                  ? "border-b-2 border-[#0E2F4B] text-[#0E2F4B]"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Scan Asset
            </button>
          </nav>
        </div>

        <div className="p-4">
          {activeTab === "select" ? (
            // Select Asset Content
            <div className="space-y-4">
              <div className="flex gap-4 items-end flex-wrap">
                <div className="w-64">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Asset Type
                  </label>
                  <SearchableSelect
                    value={selectedAssetType}
                    onChange={setSelectedAssetType}
                    options={[
                      { id: "", text: "Select Asset Type" },
                      ...assetTypes.map(type => ({ id: type.asset_type_id, text: type.text }))
                    ]}
                    placeholder="Select asset type"
                    disabled={isLoadingAssetTypes}
                    loading={isLoadingAssetTypes}
                    optionLabel="text"
                    optionValue="id"
                  />
                </div>

                <div className="w-64">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Target Branch
                  </label>
                  <SearchableSelect
                    value={selectedBranch}
                    onChange={setSelectedBranch}
                    options={[
                      { id: "", text: "Select Branch" },
                      ...branches.map(branch => ({ 
                        id: branch.branch_id, 
                        text: `${branch.text}${branch.city ? ` (${branch.city})` : ''}` 
                      }))
                    ]}
                    placeholder="Select target branch"
                    disabled={isLoadingBranches}
                    loading={isLoadingBranches}
                    optionLabel="text"
                    optionValue="id"
                  />
                </div>

                <div className="w-64">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cost Center
                  </label>
                  <SearchableSelect
                    value={selectedCostCenter}
                    onChange={setSelectedCostCenter}
                    options={[
                      { id: "", text: "Select Cost Center" },
                      ...costCenters.map(cc => ({ 
                        id: cc.cc_id, 
                        text: `${cc.text} (${cc.cc_no})` 
                      }))
                    ]}
                    placeholder="Select cost center"
                    disabled={!selectedBranch || isLoadingCostCenters}
                    loading={isLoadingCostCenters}
                    optionLabel="text"
                    optionValue="id"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    className="bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded text-sm"
                    onClick={() => navigate(-1)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          ) : (
            // Scan Asset Content
            <form onSubmit={handleScanSubmit} className="space-y-4">
              <div className="flex gap-4 items-end flex-wrap">
                <div className="w-64">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Asset ID
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      className="border px-3 py-2 text-sm w-full bg-white text-black focus:outline-none rounded"
                      placeholder="Scan or enter Asset ID"
                      value={scannedAssetId}
                      onChange={(e) => setScannedAssetId(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={startScanner}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <QrCode size={18} />
                    </button>
                  </div>
                </div>

                <div className="w-64">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Target Branch
                  </label>
                  <SearchableSelect
                    value={selectedBranch}
                    onChange={setSelectedBranch}
                    options={[
                      { id: "", text: "Select Branch" },
                      ...branches.map(branch => ({ 
                        id: branch.branch_id, 
                        text: `${branch.text}${branch.city ? ` (${branch.city})` : ''}` 
                      }))
                    ]}
                    placeholder="Select target branch"
                    disabled={isLoadingBranches}
                    loading={isLoadingBranches}
                    optionLabel="text"
                    optionValue="id"
                  />
                </div>

                <div className="w-64">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cost Center
                  </label>
                  <SearchableSelect
                    value={selectedCostCenter}
                    onChange={setSelectedCostCenter}
                    options={[
                      { id: "", text: "Select Cost Center" },
                      ...costCenters.map(cc => ({ 
                        id: cc.cc_id, 
                        text: `${cc.text} (${cc.cc_no})` 
                      }))
                    ]}
                    placeholder="Select cost center"
                    disabled={!selectedBranch || isLoadingCostCenters}
                    loading={isLoadingCostCenters}
                    optionLabel="text"
                    optionValue="id"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    className="bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded text-sm"
                    onClick={() => navigate(-1)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-[#0E2F4B] text-white px-4 py-2 rounded text-sm disabled:opacity-50"
                    disabled={!scannedAssetId || !selectedBranch || isSubmitting}
                  >
                    {isSubmitting ? "Transferring..." : "Transfer Asset"}
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Available Assets List - Only show in select tab */}
      {activeTab === "select" && (
        <div
          className={`bg-white rounded shadow transition-all duration-300 ${
            isMaximized ? "fixed inset-0 z-50 p-6 m-6 overflow-auto" : ""
          }`}
        >
          <div className="bg-white rounded shadow">
            <div className="bg-[#EDF3F7] px-4 py-2 rounded-t text-[#0E2F4B] font-semibold text-sm flex items-center justify-between">
              Available Assets
              <button onClick={() => setIsMaximized((prev) => !prev)}>
                {isMaximized ? (
                  <Minimize className="text-[#0E2F4B]" size={18} />
                ) : (
                  <Maximize className="text-[#0E2F4B]" size={18} />
                )}
              </button>
            </div>
            <div className="bg-[#0E2F4B] text-white text-sm overflow-hidden">
              {/* Custom Table Headers */}
              {assets.length > 0 && (
                <div
                  className="grid px-4 py-2 font-semibold border-b-4 border-yellow-400"
                  style={{ gridTemplateColumns: "repeat(4, minmax(0, 1fr))" }}
                >
                  <div>Asset Name</div>
                  <div>Current Branch</div>
                  <div>Cost Center</div>
                  <div className="flex justify-center">Actions</div>
                </div>
              )}

              <div
                className={`${
                  isMaximized ? "max-h-[60vh] overflow-y-auto" : ""
                }`}
              >
                {isLoadingAssets ? (
                  <div className="px-4 py-6 text-center text-gray-500 bg-white">
                    Loading assets...
                  </div>
                ) : assets.length > 0 ? (
                  assets.map((asset, i) => (
                    <div
                      key={asset.asset_id}
                      className={`grid px-4 py-2 items-center border-b ${
                        i % 2 === 0 ? "bg-white" : "bg-gray-100"
                      } text-gray-800 hover:bg-gray-200`}
                      style={{ gridTemplateColumns: "repeat(4, minmax(0, 1fr))" }}
                    >
                      <div title={asset.text}>
                        {asset.text && asset.text.length > 20
                          ? asset.text.slice(0, 20) + "..."
                          : asset.text || "-"}
                      </div>
                      <div>{asset.branch_name || "-"}</div>
                      <div>{asset.cost_center_name || "-"}</div>
                      <div className="flex justify-center">
                        <button
                          onClick={async () => {
                            setSelectedAsset(asset.asset_id);
                            await fetchAssetDetails(asset.asset_id);
                            setAssetDetails({
                              asset_id: asset.asset_id,
                              text: asset.text,
                              branch_name: asset.branch_name,
                              cost_center_name: asset.cost_center_name,
                              cost_center_code: asset.cost_center_code
                            });
                            
                            // Check if cost center change confirmation is needed
                            const currentCostCenter = asset.cost_center_code;
                            const newCostCenter = selectedCostCenter;

                            if (!selectedBranch) {
                              toast.error("Please select a target branch");
                              return;
                            }

                            if (newCostCenter && currentCostCenter !== newCostCenter) {
                              const currentCostCenterName = asset.cost_center_name || "Not assigned";
                              const newCostCenterName = costCenters.find(cc => cc.cc_id === newCostCenter)?.text || newCostCenter;
                              
                              setConfirmModalData({
                                current: currentCostCenterName,
                                new: newCostCenterName
                              });
                              setShowConfirmModal(true);
                            } else {
                              await performTransfer();
                            }
                          }}
                          className="bg-[#0E2F4B] text-white px-3 py-1 rounded text-sm hover:bg-[#1a4971] transition-colors disabled:opacity-50"
                          disabled={!selectedBranch || isSubmitting}
                        >
                          {isSubmitting ? "..." : "Transfer"}
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="px-4 py-6 text-center text-gray-500 bg-white rounded-b">
                    {selectedAssetType
                      ? "No assets found for selected type"
                      : "Please select an asset type to view available assets"}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Scanner Modal */}
      {showScanner && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="p-4 border-b flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900">
                Scan Barcode/QR Code
              </h3>
              <button
                onClick={stopScanner}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>

            <div className="relative">
              <div id="qr-reader" className="aspect-[4/3] bg-black">
                {/* The scanner will automatically inject the video element here */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-64 h-64 border-2 border-white rounded-lg"></div>
                </div>
              </div>
            </div>

            <div className="p-4 text-center">
              <p className="text-sm text-gray-600">
                Position the barcode/QR code within the scanning area
              </p>
            </div>

            <div className="p-4 border-t flex justify-end">
              <button
                onClick={stopScanner}
                className="bg-gray-200 text-gray-800 px-4 py-2 rounded text-sm hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 animate-fadeIn">
            <div className="bg-[#0E2F4B] text-white px-6 py-4 rounded-t-lg flex items-center justify-between">
              <h3 className="text-xl font-semibold">Confirm Cost Center Change</h3>
              <button
                onClick={handleCancelTransfer}
                disabled={isSubmitting}
                className="hover:bg-white/20 rounded-full p-1 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <p className="text-gray-700 mb-4">The cost center will be changed:</p>
              <div className="bg-gray-50 rounded-lg p-4 mb-6 space-y-3">
                <div>
                  <span className="text-sm text-gray-600 font-medium">Current:</span>
                  <p className="text-gray-900 font-semibold mt-1">{confirmModalData.current}</p>
                </div>
                <div className="border-t pt-3">
                  <span className="text-sm text-gray-600 font-medium">New:</span>
                  <p className="text-[#0E2F4B] font-semibold mt-1">{confirmModalData.new}</p>
                </div>
              </div>
              <p className="text-gray-600 mb-6">Do you want to proceed with this change?</p>
              <div className="flex gap-3">
                <button
                  onClick={handleConfirmTransfer}
                  disabled={isSubmitting}
                  className="flex-1 bg-[#0E2F4B] text-white px-6 py-2.5 rounded-lg hover:bg-[#1a4567] focus:outline-none focus:ring-2 focus:ring-[#0E2F4B] disabled:bg-gray-400 disabled:cursor-not-allowed font-medium transition-colors"
                >
                  {isSubmitting ? "Processing..." : "OK"}
                </button>
                <button
                  onClick={handleCancelTransfer}
                  disabled={isSubmitting}
                  className="flex-1 bg-gray-200 text-gray-700 px-6 py-2.5 rounded-lg hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400 disabled:bg-gray-100 disabled:cursor-not-allowed font-medium transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CostCenterTransfer;
