import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Maximize, Minimize, QrCode, X } from "lucide-react";
import { Html5Qrcode } from "html5-qrcode";
import API from "../lib/axios";
import { toast } from "react-hot-toast";
import SearchableDropdown from "../components/ui/SearchableDropdown";

const CostCenterSelection = () => {
  const navigate = useNavigate();

  const [assetTypes, setAssetTypes] = useState([]);
  const [selectedAssetType, setSelectedAssetType] = useState(null);
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [costCenters, setCostCenters] = useState([]);
  const [selectedCostCenter, setSelectedCostCenter] = useState(null);
  const [assets, setAssets] = useState([]);
  const [isMaximized, setIsMaximized] = useState(false);
  const [activeTab, setActiveTab] = useState("select");
  const [scannedAssetId, setScannedAssetId] = useState("");
  const [showScanner, setShowScanner] = useState(false);
  const scannerRef = useRef(null);
  const [loading, setLoading] = useState(false);
  
  // Confirmation modal state
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingTransfer, setPendingTransfer] = useState(null);

  useEffect(() => {
    fetchAssetTypes();
    fetchBranches();
  }, []);

  // ESC key handler for modals
  useEffect(() => {
    const handleEscKey = (e) => {
      if (e.key === "Escape") {
        if (showConfirmModal) {
          cancelTransfer();
        } else if (showScanner) {
          stopScanner();
        }
      }
    };

    document.addEventListener("keydown", handleEscKey);
    return () => document.removeEventListener("keydown", handleEscKey);
  }, [showConfirmModal, showScanner]);

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

  useEffect(() => {
    if (selectedAssetType) {
      fetchAssetsByType(selectedAssetType);
    } else {
      setAssets([]);
    }
  }, [selectedAssetType]);

  useEffect(() => {
    if (selectedBranch) {
      fetchCostCentersByBranch(selectedBranch);
    } else {
      setCostCenters([]);
      setSelectedCostCenter(null);
    }
  }, [selectedBranch]);

  const fetchAssetTypes = async () => {
    try {
      setLoading(true);
      const response = await API.get("/cost-center-transfer/asset-types");
      setAssetTypes(response.data.assetTypes || []);
    } catch (error) {
      console.error("Failed to fetch asset types:", error);
      toast.error("Failed to load asset types");
    } finally {
      setLoading(false);
    }
  };

  const fetchBranches = async () => {
    try {
      const response = await API.get("/cost-center-transfer/branches");
      setBranches(response.data.branches || []);
    } catch (error) {
      console.error("Failed to fetch branches:", error);
      toast.error("Failed to load branches");
    }
  };

  const fetchAssetsByType = async (assetTypeId) => {
    try {
      setLoading(true);
      const response = await API.get(`/cost-center-transfer/assets/${assetTypeId}`);
      setAssets(response.data.assets || []);
    } catch (error) {
      console.error("Failed to fetch assets:", error);
      toast.error("Failed to load assets");
      setAssets([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchCostCentersByBranch = async (branchId) => {
    try {
      setLoading(true);
      const response = await API.get(`/cost-center-transfer/cost-centers/${branchId}`);
      setCostCenters(response.data.costCenters || []);
    } catch (error) {
      console.error("Failed to fetch cost centers:", error);
      toast.error("Failed to load cost centers");
      setCostCenters([]);
    } finally {
      setLoading(false);
    }
  };

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

  const handleTransferAsset = async (asset) => {
    if (!selectedBranch) {
      toast.error("Please select a target branch");
      return;
    }

    if (!selectedCostCenter) {
      toast.error("Please select a cost center");
      return;
    }

    // Show confirmation modal before transferring
    const branchName = branches.find(b => b.branch_id === selectedBranch)?.branch_name || 'Unknown';
    const ccName = costCenters.find(cc => cc.cc_id === selectedCostCenter)?.cc_name || 'Unknown';
    
    setPendingTransfer({ asset, branchName, ccName });
    setShowConfirmModal(true);
  };

  const confirmTransfer = async () => {
    if (!pendingTransfer) return;

    const { asset } = pendingTransfer;

    try {
      setShowConfirmModal(false);
      setLoading(true);
      const payload = {
        asset_id: asset.asset_id,
        target_branch_id: selectedBranch,
        cost_center_code: selectedCostCenter,
      };

      await API.post("/cost-center-transfer/transfer", payload);
      toast.success("Asset transferred successfully");
      
      // Refresh assets list
      if (selectedAssetType) {
        await fetchAssetsByType(selectedAssetType);
      }
      
      setPendingTransfer(null);
    } catch (error) {
      console.error("Failed to transfer asset:", error);
      const errorMessage = error.response?.data?.message || "Failed to transfer asset";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const cancelTransfer = () => {
    setShowConfirmModal(false);
    setPendingTransfer(null);
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

    if (!selectedCostCenter) {
      toast.error("Please select a cost center");
      return;
    }

    try {
      setLoading(true);
      // First get asset details
      const response = await API.get(`/cost-center-transfer/asset-details/${scannedAssetId}`);
      const assetData = response.data;

      if (!assetData.asset) {
        toast.error("Asset not found");
        setLoading(false);
        return;
      }

      // Show confirmation modal
      const branchName = branches.find(b => b.branch_id === selectedBranch)?.branch_name || 'Unknown';
      const ccName = costCenters.find(cc => cc.cc_id === selectedCostCenter)?.cc_name || 'Unknown';
      
      setPendingTransfer({ 
        asset: { ...assetData.asset, asset_id: scannedAssetId }, 
        branchName, 
        ccName,
        isScanned: true
      });
      setShowConfirmModal(true);
      setLoading(false);
    } catch (error) {
      console.error("Failed to fetch asset details:", error);
      const errorMessage = error.response?.data?.message || "Failed to fetch asset details";
      toast.error(errorMessage);
      setLoading(false);
    }
  };

  const confirmScannedTransfer = async () => {
    if (!pendingTransfer) return;

    try {
      setShowConfirmModal(false);
      setLoading(true);

      const payload = {
        asset_id: scannedAssetId,
        target_branch_id: selectedBranch,
        cost_center_code: selectedCostCenter,
      };

      await API.post("/cost-center-transfer/transfer", payload);
      toast.success("Asset transferred successfully");
      setScannedAssetId("");
      
      // Refresh assets list if asset type is selected
      if (selectedAssetType) {
        await fetchAssetsByType(selectedAssetType);
      }
      
      setPendingTransfer(null);
    } catch (error) {
      console.error("Failed to transfer asset:", error);
      const errorMessage = error.response?.data?.message || "Failed to transfer asset";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
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
                  <SearchableDropdown
                    options={[
                      { id: "", text: "Select Asset Type" },
                      ...assetTypes.map((type) => ({
                        id: type.asset_type_id,
                        text: type.text || type.asset_type_name,
                      })),
                    ]}
                    value={selectedAssetType || ""}
                    onChange={(value) => setSelectedAssetType(value || null)}
                    placeholder="Select Asset Type"
                    searchPlaceholder="Search asset type..."
                    displayKey="text"
                    valueKey="id"
                  />
                </div>

                <div className="w-64">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Target Branch
                  </label>
                  <SearchableDropdown
                    options={[
                      { id: "", text: "Select Branch" },
                      ...branches.map((branch) => ({
                        id: branch.branch_id,
                        text: branch.branch_name,
                      })),
                    ]}
                    value={selectedBranch || ""}
                    onChange={(value) => setSelectedBranch(value || null)}
                    placeholder="Select Branch"
                    searchPlaceholder="Search branch..."
                    displayKey="text"
                    valueKey="id"
                  />
                </div>

                <div className="w-64">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cost Center
                  </label>
                  <SearchableDropdown
                    options={[
                      { id: "", text: "Select Cost Center" },
                      ...costCenters.map((cc) => ({
                        id: cc.cc_id,
                        text: `${cc.cc_name} (${cc.cc_no})`,
                      })),
                    ]}
                    value={selectedCostCenter || ""}
                    onChange={(value) => setSelectedCostCenter(value || null)}
                    placeholder="Select Cost Center"
                    searchPlaceholder="Search cost center..."
                    displayKey="text"
                    valueKey="id"
                    disabled={!selectedBranch}
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
                  <SearchableDropdown
                    options={[
                      { id: "", text: "Select Branch" },
                      ...branches.map((branch) => ({
                        id: branch.branch_id,
                        text: branch.branch_name,
                      })),
                    ]}
                    value={selectedBranch || ""}
                    onChange={(value) => setSelectedBranch(value || null)}
                    placeholder="Select Branch"
                    searchPlaceholder="Search branch..."
                    displayKey="text"
                    valueKey="id"
                  />
                </div>

                <div className="w-64">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cost Center
                  </label>
                  <SearchableDropdown
                    options={[
                      { id: "", text: "Select Cost Center" },
                      ...costCenters.map((cc) => ({
                        id: cc.cc_id,
                        text: `${cc.cc_name} (${cc.cc_no})`,
                      })),
                    ]}
                    value={selectedCostCenter || ""}
                    onChange={(value) => setSelectedCostCenter(value || null)}
                    placeholder="Select Cost Center"
                    searchPlaceholder="Search cost center..."
                    displayKey="text"
                    valueKey="id"
                    disabled={!selectedBranch}
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
                    disabled={!scannedAssetId || !selectedBranch || !selectedCostCenter || loading}
                  >
                    {loading ? "Transferring..." : "Transfer Asset"}
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
                {loading ? (
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
                      <div title={asset.description}>
                        {asset.description && asset.description.length > 20
                          ? asset.description.slice(0, 20) + "..."
                          : asset.description || "-"}
                      </div>
                      <div>{asset.branch_name || "-"}</div>
                      <div>{asset.cost_center_name || "-"}</div>
                      <div className="flex justify-center">
                        <button
                          onClick={() => handleTransferAsset(asset)}
                          className="bg-[#0E2F4B] text-white px-3 py-1 rounded text-sm hover:bg-[#1a4971] transition-colors disabled:opacity-50"
                          disabled={!selectedBranch || !selectedCostCenter || loading}
                        >
                          Transfer
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
      {showConfirmModal && pendingTransfer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="bg-[#0E2F4B] text-white p-4 rounded-t flex justify-between items-center">
              <h3 className="text-lg font-medium">Confirm Transfer</h3>
              <button
                onClick={cancelTransfer}
                className="text-white hover:text-gray-300"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6">
              <p className="text-gray-700 mb-4">
                Are you sure you want to transfer this asset?
              </p>
              
              <div className="bg-gray-50 p-4 rounded space-y-2 text-sm">
                <div>
                  <span className="font-medium text-gray-700">Asset:</span>{" "}
                  <span className="text-gray-900">{pendingTransfer.asset.description}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">To Branch:</span>{" "}
                  <span className="text-gray-900">{pendingTransfer.branchName}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Cost Center:</span>{" "}
                  <span className="text-gray-900">{pendingTransfer.ccName}</span>
                </div>
              </div>
            </div>

            <div className="p-4 border-t flex justify-end gap-2">
              <button
                onClick={cancelTransfer}
                className="bg-gray-200 text-gray-800 px-4 py-2 rounded text-sm hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={pendingTransfer.isScanned ? confirmScannedTransfer : confirmTransfer}
                className="bg-[#0E2F4B] text-white px-4 py-2 rounded text-sm hover:bg-[#1a4971]"
              >
                Confirm Transfer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CostCenterSelection;
