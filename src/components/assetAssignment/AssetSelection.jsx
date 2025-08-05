import React, { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Maximize, Minimize, QrCode, X } from "lucide-react";
import { Html5Qrcode } from "html5-qrcode";
import API from "../../lib/axios";
import { toast } from "react-hot-toast";

const AssetSelection = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { entityId, entityIntId, entityType, departmentId } = location.state || {};

  const [assets, setAssets] = useState([]);
  const [assetTypes, setAssetTypes] = useState([]);
  const [selectedAssetType, setSelectedAssetType] = useState(null);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [isMaximized, setIsMaximized] = useState(false);
  const [activeTab, setActiveTab] = useState('select');
  const [scannedAssetId, setScannedAssetId] = useState('');
  const [filteredAssets, setFilteredAssets] = useState([]);
  const [showScanner, setShowScanner] = useState(false);
  const scannerRef = useRef(null);
  const videoRef = useRef(null);
  const [inactiveAssets, setInactiveAssets] = useState([]);
  const [inactiveAssetsRaw, setInactiveAssetsRaw] = useState([]);

  useEffect(() => {
    // Initialize scanner when modal opens
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

  const initializeScanner = async () => {
    try {
      const scanner = new Html5Qrcode("qr-reader");
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0
        },
        onScanSuccess,
        onScanError
      );
    } catch (err) {
      console.error("Error starting scanner:", err);
      toast.error("Could not access camera. Please check permissions.");
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
    toast.success(`Asset ID scanned successfully`);
  };

  const onScanError = (error) => {
    // Handle scan error silently
    console.warn("Scan error:", error);
  };

  const stopScanner = () => {
    if (scannerRef.current) {
      scannerRef.current.stop().catch(console.error);
      scannerRef.current = null;
    }
    setShowScanner(false);
  };

  useEffect(() => {
    // Debug: print entityIntId on mount
    console.log('entityIntId on mount:', entityIntId);
    if (!entityId || !entityType) {
      toast.error("Invalid navigation. Please select an entity first.");
      navigate(-1);
      return;
    }

    fetchAssetTypes();
  }, [entityId, entityType]);

  useEffect(() => {
    if (selectedAssetType) {
      fetchInactiveAssetsByType(selectedAssetType);
    } else {
      setInactiveAssets([]);
    }
    setSelectedAsset(null);
  }, [selectedAssetType]);

  // Handler for asset type selection (no persistence)
  const handleAssetTypeChange = (e) => {
    setSelectedAssetType(e.target.value);
  };

  // No persistence effect needed

  const fetchAssetTypes = async () => {
    try {
      const res = await API.get('/dept-assets/asset-types');
      setAssetTypes(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Failed to fetch asset types", err);
      toast.error("Failed to fetch asset types");
      setAssetTypes([]);
    }
  };

  const fetchAvailableAssets = async () => {
    try {
      const endpoint = entityType === 'department' 
        ? `/admin/available-assets-for-department/${entityId}`
        : `/admin/available-assets-for-employee/${entityId}`;

      const res = await API.get(endpoint);
      setAssets(res.data);
    } catch (err) {
      console.error("Failed to fetch available assets", err);
      toast.error("Failed to fetch available assets");
    }
  };

  const fetchInactiveAssetsByType = async (assetTypeId) => {
    try {
      const res = await API.get(`/assets/type/${assetTypeId}/inactive`);
      // If the response is an object with a 'data' array, use that
      const assetsArr = Array.isArray(res.data.data) ? res.data.data : (Array.isArray(res.data) ? res.data : []);
      setInactiveAssets(assetsArr);
      setInactiveAssetsRaw(res.data); // for debugging if needed
      console.log('Inactive assets for asset type', assetTypeId, ':', assetsArr);
    } catch (err) {
      console.error("Failed to fetch inactive assets", err);
      toast.error("Failed to fetch inactive assets");
      setInactiveAssets([]);
    }
  };

  // Helper to generate a unique assignment ID
  const generateUniqueId = () => `AA${Date.now()}`;

  const handleAssignAsset = async (asset) => {
    if (!asset) {
      toast.error("Please select an asset from the list");
      return;
    }
    if (entityType === 'employee') {
      if (!entityIntId) {
        toast.error("Employee internal ID missing");
        return;
      }
      try {
        const payload = {
          asset_assign_id: generateUniqueId(),
          asset_id: asset.asset_id,
          org_id: asset.org_id,
          dept_id: asset.dept_id || departmentId, // Only use departmentId for employee's department
          employee_int_id: entityIntId,
          latest_assignment_flag: true,
          action: "A"
        };
        await API.post('/asset-assignments/employee', payload);
        toast.success('Asset assigned to employee successfully');
        navigate(-1);
      } catch (err) {
        console.error("Failed to assign asset to employee", err);
        const errorMessage = err.response?.data?.message || err.response?.data?.error || err.message || "An error occurred";
        toast.error(`Failed to assign asset: ${errorMessage}`);
      }
    } else if (entityType === 'department') {
      if (!entityId && !departmentId) {
        toast.error("Department ID missing");
        return;
      }
      try {
        const payload = {
          asset_assign_id: generateUniqueId(),
          asset_id: asset.asset_id,
          org_id: asset.org_id,
          dept_id: asset.dept_id || departmentId || entityId,
          latest_assignment_flag: true,
          action: "A"
        };
        await API.post('/asset-assignments', payload);
        toast.success('Asset assigned to department successfully');
        navigate(-1);
      } catch (err) {
        console.error("Failed to assign asset to department", err);
        const errorMessage = err.response?.data?.message || err.response?.data?.error || err.message || "An error occurred";
        toast.error(`Failed to assign asset: ${errorMessage}`);
      }
    }
  };

  const handleScanSubmit = async (e) => {
    e.preventDefault();
    if (!scannedAssetId) {
      toast.error("Please enter an asset ID");
      return;
    }
    // Find the asset in inactiveAssets by asset_id
    const asset = inactiveAssets.find(a => a.asset_id === scannedAssetId);
    if (!asset) {
      toast.error("Asset not found or not available for assignment");
      return;
    }
    handleAssignAsset(asset);
  };

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <div className="bg-white rounded shadow mb-4">
        <div className="bg-[#EDF3F7] px-4 py-2 rounded-t text-[#0E2F4B] font-semibold text-sm">
          Asset Selection
        </div>
        <div className="border-b border-gray-200"> 
          <nav className="-mb-px flex">
            <button
              onClick={() => setActiveTab('select')}
              className={`py-2 px-4 text-sm font-medium ${
                activeTab === 'select'
                  ? 'border-b-2 border-[#0E2F4B] text-[#0E2F4B]'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Select Asset
            </button>
            <button
              onClick={() => setActiveTab('scan')}
              className={`py-2 px-4 text-sm font-medium ${
                activeTab === 'scan'
                  ? 'border-b-2 border-[#0E2F4B] text-[#0E2F4B]'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Scan Asset
            </button>
          </nav>
        </div>

        <div className="p-4">
          {activeTab === 'select' ? (
            // Select Asset Content
            <div className="flex gap-4 items-end">
              <div className="w-64">
                <label className="block text-sm font-medium text-gray-700 mb-1">Asset Type</label>
                <select
                  className="border px-3 py-2 text-sm w-full bg-white text-black focus:outline-none rounded"
                  value={selectedAssetType || ""}
                  onChange={handleAssetTypeChange}
                >
                  <option value="">All Asset Types</option>
                  {assetTypes.map((type) => (
                    <option key={type.asset_type_id} value={type.asset_type_id}>
                      {type.text}
                    </option>
                  ))}
                </select>
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
          ) : (
            // Scan Asset Content
            <form onSubmit={handleScanSubmit} className="flex gap-4 items-end">
              <div className="w-64">
                <label className="block text-sm font-medium text-gray-700 mb-1">Asset ID</label>
                <div className="relative">
                  <input
                    type="text"
                    className="border px-3 py-2 text-sm w-full bg-white text-black focus:outline-none rounded"
                    placeholder="Scan or enter asset ID"
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
                  disabled={!scannedAssetId}
                >
                  Assign
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Available Assets List - Only show in select tab */}
      {activeTab === 'select' && (
        <div className={`bg-white rounded shadow transition-all duration-300 ${
          isMaximized ? "fixed inset-0 z-50 p-6 m-6 overflow-auto" : ""
        }`}>
          <div className="bg-white rounded shadow">
            <div className="bg-[#EDF3F7] px-4 py-2 rounded-t text-[#0E2F4B] font-semibold text-sm flex items-center justify-between">
              Available Assets
              <button onClick={() => setIsMaximized(prev => !prev)}>
                {isMaximized ? (
                  <Minimize className="text-[#0E2F4B]" size={18} />
                ) : (
                  <Maximize className="text-[#0E2F4B]" size={18} />
                )}
              </button>
            </div>
            <div className="bg-[#0E2F4B] text-white text-sm overflow-hidden">
              {/* Custom Table Headers for selected fields */}
              {inactiveAssets.length > 0 && (
                <div className={`grid px-4 py-2 font-semibold border-b-4 border-yellow-400`} style={{gridTemplateColumns: 'repeat(7, minmax(0, 1fr))'}}>
                  <div>Asset Type ID</div>
                  <div>Asset ID</div>
                  <div>Asset Type Name</div>
                  <div>Asset Name</div>
                  <div>Vendor ID</div>
                  <div>Product/Service ID</div>
                  <div className="flex justify-center">Actions</div>
                </div>
              )}

              <div className={`${isMaximized ? "max-h-[60vh] overflow-y-auto" : ""}`}> 
                {inactiveAssets.map((asset, i) => (
                  <div
                    key={asset.asset_id}
                    className={`grid px-4 py-2 items-center border-b ${
                      i % 2 === 0 ? "bg-white" : "bg-gray-100"
                    } text-gray-800 hover:bg-gray-200 ${
                      selectedAsset === asset.asset_id ? 'bg-blue-50' : ''
                    }`}
                    style={{gridTemplateColumns: 'repeat(7, minmax(0, 1fr))'}}
                  >
                    <div>{asset.asset_type_id}</div>
                    <div>
                      <button
                        className="text-blue-600 underline hover:text-blue-800"
                        onClick={() => navigate(`/asset-detail/${asset.asset_id}`, {
                          state: {
                            employee_int_id: entityIntId,
                            dept_id: asset.dept_id || departmentId,
                            org_id: asset.org_id
                          }
                        })}
                      >
                        {asset.asset_id}
                      </button>
                    </div>
                    <div>{asset.text}</div>
                    <div title={asset.description}>
                      {asset.description && asset.description.length > 15
                        ? asset.description.slice(0, 15) + '...'
                        : asset.description}
                    </div>
                    <div>{asset.vendor_id}</div>
                    <div>{asset.prod_serv_id}</div>
                    <div className="flex justify-center">
                      <button
                        onClick={() => handleAssignAsset(asset)}
                        className="bg-[#0E2F4B] text-white px-3 py-1 rounded text-sm hover:bg-[#1a4971] transition-colors"
                      >
                        Assign
                      </button>
                    </div>
                  </div>
                ))}
                {inactiveAssets.length === 0 && (
                  <div className="px-4 py-6 text-center text-gray-500 col-span-4 bg-white rounded-b">
                    No inactive assets found for this type.
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
              <h3 className="text-lg font-medium text-gray-900">Scan Barcode</h3>
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
                Position the barcode within the scanning area
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
    </div>
  );
};

export default AssetSelection; 