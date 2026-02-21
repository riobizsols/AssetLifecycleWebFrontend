import React, { useState, useEffect, useRef } from "react";
import { 
  Plus, Save, X, Search, 
  AlertCircle, Trash, Info, QrCode
} from "lucide-react";
import { Html5Qrcode } from "html5-qrcode";
import { toast } from "react-hot-toast";
import { useNavigate, useLocation } from "react-router-dom";
import API from "../../lib/axios";

const CreateAssetTypeChecklistMapping = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const editAtId = queryParams.get("atId");
  const editAssetId = queryParams.get("assetId");
  const isEditing = !!editAtId;

  // Form state
  const [modalLoading, setModalLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Dropdown data
  const [assetTypes, setAssetTypes] = useState([]);
  const [assets, setAssets] = useState([]);
  const [allChecklists, setAllChecklists] = useState([]);
  
  // Selection state
  const [selectedAssetTypeId, setSelectedAssetTypeId] = useState("");
  const [selectedAssetId, setSelectedAssetId] = useState("");
  const [mappingRows, setMappingRows] = useState([]);

  // Tab and scan state
  const [activeTab, setActiveTab] = useState('manual');
  const [scannedAssetId, setScannedAssetId] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const scannerRef = useRef(null);

  useEffect(() => {
    fetchAssetTypes();
    fetchAllChecklists();
    if (isEditing) {
      loadMappingDetails(editAtId, editAssetId);
    }
  }, [isEditing]);

  useEffect(() => {
    let timeoutId;
    
    if (showScanner && !scannerRef.current) {
      // Wait for DOM to be ready before initializing scanner
      timeoutId = setTimeout(initializeScanner, 100);
    }
    
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      if (scannerRef.current) {
        scannerRef.current.stop().catch(console.error);
        scannerRef.current = null;
      }
    };
  }, [showScanner]);

  const fetchAssetTypes = async () => {
    try {
      const response = await API.get("/asset-types");
      setAssetTypes(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error("Error fetching asset types:", error);
    }
  };

  const fetchAllChecklists = async () => {
    try {
      const response = await API.get("/inspection-checklists");
      setAllChecklists(Array.isArray(response.data?.data) ? response.data.data : []);
    } catch (error) {
      console.error("Error fetching checklists:", error);
    }
  };

  const loadMappingDetails = async (atId, assetId) => {
    setModalLoading(true);
    try {
      setSelectedAssetTypeId(atId);
      await fetchAssetsByAssetType(atId);
      setSelectedAssetId(assetId || "");
      
      const response = await API.get(`/asset-type-checklist-mapping/${atId}${assetId ? '?assetId=' + assetId : ''}`);
      const mappedItems = Array.isArray(response.data?.data) ? response.data.data : [];
      
      // Load detailed info for checklists
      const detailedRows = mappedItems.map(item => ({
          ...item,
          insp_check_id: item.insp_check_id || item.Insp_check_id,
          min_range: item.min_range || item.Min_Range || "",
          max_range: item.max_range || item.Max_range || "",
          expected_value: item.expected_value || item.Expected_Value || "",
          trigger_maintenance: item.trigger_maintenance === true || item.trigger_maintenance === 'true',
          response_type: item.response_type || (item.irtd_id?.includes('QN') ? 'QN' : 'QL'),
      }));
      setMappingRows(detailedRows);
    } catch (error) {
      console.error("Error loading mapping details:", error);
      toast.error("Failed to load mapping details");
    } finally {
      setModalLoading(false);
    }
  };

  const fetchAssetsByAssetType = async (assetTypeId) => {
    if (!assetTypeId) {
      setAssets([]);
      return;
    }
    try {
      const response = await API.get(`/assets/type/${assetTypeId}`);
      const data = response.data?.data;
      setAssets(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching assets:", error);
      setAssets([]);
    }
  };

  const handleAssetTypeChange = (assetTypeId) => {
    setSelectedAssetTypeId(assetTypeId);
    setSelectedAssetId("");
    setMappingRows([]);
    fetchAssetsByAssetType(assetTypeId);
  };

  const initializeScanner = async () => {
    try {
      // Check if DOM element exists
      const qrReaderElement = document.getElementById("qr-reader");
      if (!qrReaderElement) {
        console.error("QR reader DOM element not found");
        toast.error("Scanner initialization failed: UI element not ready");
        setShowScanner(false);
        return;
      }

      // Check for camera support
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.error("Camera access not supported in this browser");
        toast.error("Camera access not supported. Please use HTTPS and a modern browser (Chrome, Firefox, Safari, Edge).");
        setShowScanner(false);
        return;
      }

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
      console.log("Scanner started successfully");
    } catch (err) {
      console.error("Error starting scanner:", err?.message || err);
      
      // Handle specific error types
      if (err?.message?.includes("NotAllowedError") || err?.message?.includes("Permission denied")) {
        toast.error("Camera access denied. Please allow camera permissions in your browser settings.");
      } else if (err?.message?.includes("NotFoundError") || err?.message?.includes("no camera") || err?.message?.includes("NotFoundException")) {
        toast.error("No camera found on this device. Please check your device has a working camera.");
      } else if (err?.message?.includes("NotSupportedError")) {
        toast.error("Camera API not supported. Please use HTTPS connection.");
      } else {
        toast.error("Could not access camera: " + (err?.message?.substring(0, 50) || "Unknown error"));
      }
      setShowScanner(false);
    }
  };

  const startScanner = () => setShowScanner(true);
  const stopScanner = () => {
    if (scannerRef.current) {
      scannerRef.current.stop().catch(console.error);
      scannerRef.current = null;
    }
    setShowScanner(false);
  };

  const onScanSuccess = (decodedText) => {
    stopScanner();
    setScannedAssetId(decodedText);
    toast.success("Asset ID scanned successfully");
  };

  const onScanError = (error) => console.warn("Scan error:", error);

  const handleScan = async (e) => {
    e.preventDefault();
    if (!scannedAssetId.trim()) {
      toast.error("Please enter or scan an Asset ID");
      return;
    }
    setIsScanning(true);
    try {
      const response = await API.get(`/assets/${scannedAssetId}`);
      const asset = response.data?.data || response.data;
      if (!asset || !asset.asset_id) {
        toast.error("Asset not found");
        return;
      }
      setSelectedAssetTypeId(asset.asset_type_id);
      setSelectedAssetId(asset.asset_id);
      setScannedAssetId("");
      setMappingRows([]);
      await fetchAssetsByAssetType(asset.asset_type_id);
      setActiveTab('manual');
      toast.success(`Asset ${asset.asset_id} loaded successfully`);
    } catch (error) {
      console.error("Error scanning asset:", error);
      toast.error("Asset not found");
    } finally {
      setIsScanning(false);
    }
  };

  const handleAddRow = () => {
    setMappingRows(prev => [...prev, { 
      insp_check_id: "", 
      response_type: "-", 
      min_range: "", 
      max_range: "", 
      expected_value: "", 
      trigger_maintenance: false 
    }]);
  };

  const handleRemoveRow = (index) => {
    const newRows = [...mappingRows];
    newRows.splice(index, 1);
    setMappingRows(newRows);
  };

  const handleQuestionChange = (index, questionId) => {
    const newRows = [...mappingRows];
    if (!questionId) {
      newRows[index] = { ...newRows[index], insp_check_id: "", response_type: "-", min_range: "", max_range: "", expected_value: "", trigger_maintenance: false };
      setMappingRows(newRows);
      return;
    }
    const defaults = allChecklists.find(c => c.ic_id === questionId);
    if (defaults) {
        newRows[index] = {
            ...newRows[index],
            insp_check_id: questionId,
            response_type: defaults.response_type || (defaults.irtd_id?.includes('QN') ? 'QN' : 'QL'),
            min_range: defaults.min_range || "",
            max_range: defaults.max_range || "",
            expected_value: defaults.expected_value || "",
            trigger_maintenance: !!defaults.trigger_maintenance
        };
        setMappingRows(newRows);
    }
  };

  const handleRowChange = (index, field, value) => {
    const newRows = [...mappingRows];
    newRows[index] = { ...newRows[index], [field]: value };
    setMappingRows(newRows);
  };

  const handleSaveMapping = async () => {
    if (!selectedAssetTypeId) {
      toast.error("Asset Type is mandatory");
      return;
    }
    const validRows = mappingRows.filter(row => row.insp_check_id);
    if (validRows.length === 0) {
      toast.error("Please add at least one question mapping");
      return;
    }
    setSaving(true);
    try {
      await API.post("/asset-type-checklist-mapping", {
        assetTypeId: selectedAssetTypeId,
        assetId: selectedAssetId,
        overrideData: validRows
      });
      toast.success("Mapping saved successfully");
      navigate("/master-data/asset-type-checklist-mapping");
    } catch (error) {
      console.error("Error saving mapping:", error);
      toast.error("Failed to save mapping");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pt-2 px-4 pb-4">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {/* Section Header */}
          <div className="bg-[#003b6f] text-white font-semibold px-6 py-4 border-b-4 border-[#ffc107]">
            <span className="text-lg">{isEditing ? "Edit Mapping" : "Create New Asset Type - Checklist Mapping"}</span>
          </div>

          <div className="p-4">
            {modalLoading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4 text-gray-400 font-medium">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent shadow-sm"></div>
                <span className="text-lg tracking-tight">Fetching mapping data...</span>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Selectors with Tabs */}
                <div className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden shadow-inner">
                  <div className="border-b border-gray-200 bg-white">
                    <nav className="-mb-px flex px-6">
                      <button
                        onClick={() => setActiveTab('manual')}
                        className={`py-4 px-8 text-sm font-semibold transition-all ${
                          activeTab === 'manual'
                            ? 'border-b-2 border-[#003b6f] text-[#003b6f]'
                            : 'text-gray-500 hover:text-gray-700'
                        }`}
                      >
                        Select Asset
                      </button>
                      <button
                        onClick={() => setActiveTab('scan')}
                        className={`py-4 px-8 text-sm font-semibold transition-all ${
                          activeTab === 'scan'
                            ? 'border-b-2 border-[#003b6f] text-[#003b6f]'
                            : 'text-gray-500 hover:text-gray-700'
                        }`}
                      >
                        Scan Asset
                      </button>
                    </nav>
                  </div>

                  <div className="p-4">
                    {activeTab === 'manual' ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="space-y-1 text-sm">
                          <label className="block text-xs font-bold text-gray-700 uppercase tracking-tight">
                            Asset Type <span className="text-red-500">*</span>
                          </label>
                          <select
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#003b6f] focus:border-transparent outline-none disabled:bg-gray-100 disabled:text-gray-500 transition-all text-sm font-medium"
                            value={selectedAssetTypeId}
                            onChange={(e) => handleAssetTypeChange(e.target.value)}
                          >
                            <option value="">-- Select Asset Type --</option>
                            {assetTypes.map(at => (
                              <option key={at.asset_type_id} value={at.asset_type_id}>
                                {at.text} ({at.asset_type_id})
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-1 text-sm">
                          <label className="block text-xs font-bold text-gray-700 uppercase tracking-tight">
                            Specific Asset (Optional)
                          </label>
                          <select
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#003b6f] focus:border-transparent outline-none disabled:bg-gray-100 disabled:text-gray-500 transition-all text-sm font-medium"
                            value={selectedAssetId}
                            onChange={(e) => setSelectedAssetId(e.target.value)}
                            disabled={!selectedAssetTypeId}
                          >
                            <option value="">-- All Assets of this type --</option>
                            {assets.map(a => (
                              <option key={a.asset_id} value={a.asset_id}>
                                {a.text} ({a.asset_id})
                              </option>
                            ))}
                          </select>
                          {!selectedAssetTypeId && !isEditing && (
                            <p className="text-xs text-amber-600 flex items-center gap-1 font-normal">
                              <AlertCircle size={12} /> Select Asset Type first
                            </p>
                          )}
                        </div>
                      </div>
                    ) : (
                      <form onSubmit={handleScan} className="max-w-2xl">
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Scan Asset / Enter Asset ID
                        </label>
                        <div className="flex gap-3">
                          <div className="relative flex-1">
                            <input
                              type="text"
                              className="w-full px-4 py-2.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#003b6f] focus:border-transparent outline-none text-sm font-medium pr-10"
                              placeholder="Scan QR code or enter Asset ID"
                              value={scannedAssetId}
                              onChange={(e) => setScannedAssetId(e.target.value)}
                              autoFocus
                            />
                            <button
                              type="button"
                              onClick={startScanner}
                              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                            >
                              <QrCode size={20} />
                            </button>
                          </div>
                          <button
                            type="submit"
                            disabled={isScanning}
                            className="px-8 py-2.5 bg-[#003b6f] text-white rounded-md hover:bg-[#002d54] transition-all disabled:opacity-60 text-sm font-semibold flex items-center gap-2 shadow-md"
                          >
                            {isScanning ? (
                              <><div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" /> Searching...</>
                            ) : (
                              <><Search size={18} /> Search Asset</>
                            )}
                          </button>
                        </div>
                        <p className="text-xs text-gray-500 mt-2 italic">Tip: Use the camera icon to scan a QR code directly from your device</p>
                      </form>
                    )}
                  </div>
                </div>

                {/* Mapping Rows Table */}
                {selectedAssetTypeId && activeTab === 'manual' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-gray-200 pb-3">
                      <h3 className="text-lg font-bold text-gray-900 flex items-center gap-3">
                        Inspection Question Mapping
                        <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold border border-blue-100 shadow-sm">
                          {mappingRows.length} {mappingRows.length === 1 ? 'Question' : 'Questions'} Selected
                        </span>
                      </h3>
                      <button
                        type="button"
                        onClick={handleAddRow}
                        className="flex items-center gap-2 px-5 py-2 text-sm bg-[#ffc107] text-[#003b6f] rounded-md hover:bg-[#ffb300] transition-all shadow-md font-bold uppercase tracking-wider"
                      >
                        <Plus size={18} /> Add New Row
                      </button>
                    </div>

                    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                      <table className="min-w-full text-left border-collapse">
                        <thead className="bg-gray-50 text-gray-700 border-b">
                          <tr>
                            <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest w-2/5">Inspection Question</th>
                            <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest w-24">Min Range</th>
                            <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest w-24">Max Range</th>
                            <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest w-40">Expected Value</th>
                            <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-center w-28">Maint. Trigger</th>
                            <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-center w-20">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {mappingRows.length === 0 ? (
                            <tr>
                              <td colSpan="6" className="p-20 text-center text-gray-400 italic bg-gray-50/20">
                                <div className="flex flex-col items-center gap-2">
                                  <Info size={32} className="text-gray-300" />
                                  <p className="font-medium">No questions mapped yet. Click "Add New Row" to start configuring inspection items.</p>
                                </div>
                              </td>
                            </tr>
                          ) : (
                            mappingRows.map((row, index) => (
                              <tr key={index} className="hover:bg-blue-50/20 group transition-colors">
                                <td className="px-4 py-3">
                                  <select
                                    className="w-full px-4 py-2 border border-gray-200 rounded-md text-sm bg-white focus:ring-1 focus:ring-[#003b6f] focus:border-[#003b6f] outline-none transition-all shadow-sm"
                                    value={row.insp_check_id}
                                    onChange={(e) => handleQuestionChange(index, e.target.value)}
                                  >
                                    <option value="">-- Choose Inspection Question --</option>
                                    {allChecklists.map(c => (
                                      <option key={c.ic_id} value={c.ic_id}>
                                        {c.inspection_question}
                                      </option>
                                    ))}
                                  </select>
                                </td>
                                <td className="px-4 py-3">
                                  <input
                                    type="number"
                                    step="any"
                                    className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm bg-white disabled:bg-gray-100 disabled:text-gray-400 focus:border-[#003b6f] outline-none transition-all"
                                    value={row.min_range || ""}
                                    onChange={(e) => handleRowChange(index, "min_range", e.target.value)}
                                    disabled={row.response_type === 'QL'}
                                    placeholder="---"
                                  />
                                </td>
                                <td className="px-4 py-3">
                                  <input
                                    type="number"
                                    step="any"
                                    className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm bg-white disabled:bg-gray-100 disabled:text-gray-400 focus:border-[#003b6f] outline-none transition-all"
                                    value={row.max_range || ""}
                                    onChange={(e) => handleRowChange(index, "max_range", e.target.value)}
                                    disabled={row.response_type === 'QL'}
                                    placeholder="---"
                                  />
                                </td>
                                <td className="px-4 py-3">
                                  <input
                                    type="text"
                                    className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm bg-white focus:border-[#003b6f] outline-none transition-all"
                                    value={row.expected_value || ""}
                                    onChange={(e) => handleRowChange(index, "expected_value", e.target.value)}
                                    placeholder="Expected..."
                                  />
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <input
                                    type="checkbox"
                                    className="w-5 h-5 text-[#003b6f] rounded cursor-pointer accent-[#003b6f] border-gray-300 transition-all"
                                    checked={!!row.trigger_maintenance}
                                    onChange={(e) => handleRowChange(index, "trigger_maintenance", e.target.checked)}
                                  />
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <button
                                    onClick={() => handleRemoveRow(index)}
                                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-all group-hover:bg-red-50"
                                    title="Remove Row"
                                  >
                                    <Trash size={18} />
                                  </button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="px-6 py-4 bg-gray-50 border-t flex items-center justify-end gap-3 font-semibold uppercase tracking-wider">
              <button
                onClick={() => navigate("/master-data/asset-type-checklist-mapping")}
                className="px-6 py-2 bg-white border border-gray-300 text-gray-700 hover:bg-gray-100 rounded-md transition-all shadow-sm text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveMapping}
                disabled={saving || modalLoading || !selectedAssetTypeId}
                className="flex items-center gap-2 px-8 py-2 bg-[#ffc107] hover:bg-[#ffb300] text-[#003b6f] rounded-md shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                {saving ? (
                  <>Saving...</>
                ) : (
                  <><Save size={16} /> {isEditing ? "Update Mapping" : "Save Mapping"}</>
                )}
              </button>
          </div>
        </div>
      </div>

      {/* Scanner Modal */}
      {showScanner && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="p-4 border-b flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900">Scan Barcode</h3>
              <button type="button" onClick={stopScanner} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <div className="relative">
              <div id="qr-reader" className="aspect-[4/3] bg-black">
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-64 h-64 border-2 border-white rounded-lg" />
                </div>
              </div>
            </div>
            <div className="p-4 text-center">
              <p className="text-sm text-gray-600">Position the barcode within the scanning area.</p>
            </div>
            <div className="p-4 border-t flex justify-end">
              <button
                type="button"
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

export default CreateAssetTypeChecklistMapping;
