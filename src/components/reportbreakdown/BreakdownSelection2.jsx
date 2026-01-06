import React, { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Html5Qrcode } from "html5-qrcode";
import { Maximize, Minimize, QrCode, X } from "lucide-react";
import API from "../../lib/axios";
import { toast } from "react-hot-toast";
import { useLanguage } from "../../contexts/LanguageContext";
import { useAuthStore } from "../../store/useAuthStore";

const BreakdownSelection2 = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();
  const { user } = useAuthStore();

  const [assetTypes, setAssetTypes] = useState([]);
  const [selectedAssetType, setSelectedAssetType] = useState(null);
  const [myAssets, setMyAssets] = useState([]);
  const [isMaximized, setIsMaximized] = useState(false);
  const [myAssetsSubTab, setMyAssetsSubTab] = useState("myAssets"); // For My Assets: "myAssets", "select", or "scan"

  const [showScanner, setShowScanner] = useState(false);
  const [myAssetsScannedId, setMyAssetsScannedId] = useState("");
  const scannerRef = useRef(null);

  useEffect(() => {
    fetchAssetTypes();
  }, []);

  // Initialize selection from navigation state if present
  useEffect(() => {
    const incomingType = location.state?.selectedAssetType;
    if (incomingType) {
      setSelectedAssetType(incomingType);
    }
  }, [location.state]);

  useEffect(() => {
    if (myAssetsSubTab === "myAssets" || myAssetsSubTab === "select") {
      fetchMyAssets();
    }
  }, [myAssetsSubTab]);

  const fetchAssetTypes = async () => {
    try {
      const res = await API.get("/asset-types/maint-required");
      // The API returns { success: true, data: [...] } format
      const assetTypesData = res.data.success ? res.data.data : res.data;
      setAssetTypes(Array.isArray(assetTypesData) ? assetTypesData : []);
    } catch (err) {
      console.error(t('breakdownSelection.failedToFetchAssetTypes'), err);
      toast.error(t('breakdownSelection.failedToFetchAssetTypes'));
      setAssetTypes([]);
    }
  };

  const fetchMyAssets = async () => {
    try {
      // Get employee ID from auth store
      const employeeId = user?.emp_int_id;
      if (!employeeId) {
        toast.error("User employee ID not found");
        setMyAssets([]);
        return;
      }

      // Fetch assigned assets for current user
      const res = await API.get(`/asset-assignments/employee/${employeeId}/active`);
      const assignments = Array.isArray(res.data?.data)
        ? res.data.data
        : Array.isArray(res.data)
        ? res.data
        : [];

      if (assignments.length === 0) {
        setMyAssets([]);
        return;
      }

      // Fetch full asset details for each assigned asset
      const assetDetailsPromises = assignments.map(async (assignment) => {
        try {
          const assetRes = await API.get(`/assets/${assignment.asset_id}`);
          // Handle different response structures
          const assetData = assetRes.data?.data || assetRes.data || {};
          return {
            ...assetData,
            asset_id: assignment.asset_id, // Ensure asset_id is present
          };
        } catch (err) {
          console.error(`Failed to fetch asset ${assignment.asset_id}:`, err);
          // Return a minimal asset object if fetch fails
          return {
            asset_id: assignment.asset_id,
            asset_type_id: null,
            text: null,
            description: null,
            asset_type_name: null,
            service_vendor_id: null,
            prod_serv_id: null,
          };
        }
      });

      const assetsWithDetails = await Promise.all(assetDetailsPromises);
      setMyAssets(assetsWithDetails);
    } catch (err) {
      console.error("Failed to fetch my assets", err);
      toast.error("Failed to fetch my assets");
      setMyAssets([]);
    }
  };

  const handleAssetTypeChange = (e) => {
    setSelectedAssetType(e.target.value);
  };

  const startScanner = async () => {
    try {
      setShowScanner(true);
      if (!scannerRef.current) {
        const scanner = new Html5Qrcode("qr-reader");
        scannerRef.current = scanner;
        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 },
          (decodedText) => {
            if (scannerRef.current) {
              scannerRef.current.stop().catch(console.error);
              scannerRef.current = null;
            }
            setMyAssetsScannedId(decodedText);
            setShowScanner(false);
            toast.success(t('breakdownSelection.assetIdScannedSuccessfully'));
          },
          (err) => console.warn("Scan error", err)
        );
      }
    } catch (err) {
      console.error("Error starting scanner", err);
      toast.error(t('breakdownSelection.couldNotAccessCamera'));
      setShowScanner(false);
    }
  };

  const stopScanner = () => {
    if (scannerRef.current) {
      scannerRef.current.stop().catch(console.error);
      scannerRef.current = null;
    }
    setShowScanner(false);
  };

  const goToBreakdownDetails = (asset) => {
    navigate("/breakdown-details2", { state: { asset } });
  };

  const handleScanSubmit = (e) => {
    e.preventDefault();
    if (!myAssetsScannedId) {
      toast.error(t('breakdownSelection.pleaseEnterAssetId'));
      return;
    }
    
    const asset = myAssets.find((a) => a.asset_id === myAssetsScannedId);
    if (!asset) {
      toast.error(t('breakdownSelection.assetNotFoundOrNotAvailable'));
      return;
    }
    goToBreakdownDetails(asset);
  };

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <div className="bg-white rounded shadow mb-4">
        <div className="bg-[#EDF3F7] px-4 py-2 rounded-t text-[#0E2F4B] font-semibold text-sm">
          {t('breakdownSelection.title')}
        </div>
        
        {/* Sub-tabs for My Assets */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex">
            <button
              onClick={() => setMyAssetsSubTab("myAssets")}
              className={`py-2 px-4 text-sm font-medium ${
                myAssetsSubTab === "myAssets"
                  ? "border-b-2 border-[#0E2F4B] text-[#0E2F4B]"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              My Assets
            </button>
            <button
              onClick={() => setMyAssetsSubTab("select")}
              className={`py-2 px-4 text-sm font-medium ${
                myAssetsSubTab === "select"
                  ? "border-b-2 border-[#0E2F4B] text-[#0E2F4B]"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {t('breakdownSelection.selectAsset')}
            </button>
            <button
              onClick={() => setMyAssetsSubTab("scan")}
              className={`py-2 px-4 text-sm font-medium ${
                myAssetsSubTab === "scan"
                  ? "border-b-2 border-[#0E2F4B] text-[#0E2F4B]"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {t('breakdownSelection.scanAsset')}
            </button>
          </nav>
        </div>

        <div className="p-4">
          {myAssetsSubTab === "myAssets" ? (
            <div className="flex gap-4 items-end">
            </div>
          ) : myAssetsSubTab === "select" ? (
            <div className="flex gap-4 items-end">
              <div className="w-64">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('breakdownSelection.assetType')}
                </label>
                <select
                  className="border px-3 py-2 text-sm w-full bg-white text-black focus:outline-none rounded"
                  value={selectedAssetType || ""}
                  onChange={handleAssetTypeChange}
                >
                  <option value="">{t('breakdownSelection.allAssetTypes')}</option>
                  {assetTypes.map((type) => (
                    <option key={type.asset_type_id} value={type.asset_type_id}>
                      {type.text}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : (
            <form onSubmit={handleScanSubmit} className="flex gap-4 items-end">
              <div className="w-64">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('breakdownSelection.assetId')}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    className="border px-3 py-2 text_sm w-full bg-white text-black focus:outline-none rounded"
                    placeholder={t('breakdownSelection.scanOrEnterAssetId')}
                    value={myAssetsScannedId}
                    onChange={(e) => setMyAssetsScannedId(e.target.value)}
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
                  type="submit"
                  className="bg-[#0E2F4B] text-white px-4 py-2 rounded text_sm disabled:opacity-50"
                  disabled={!myAssetsScannedId}
                >
                  {t('breakdownSelection.createBreakdown')}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Asset list for My Assets */}
      {(myAssetsSubTab === "myAssets" || myAssetsSubTab === "select") && (
        <div
          className={`bg-white rounded shadow transition-all duration-300 ${
            isMaximized ? "fixed inset-0 z-50 p-6 m-6 overflow-auto" : ""
          }`}
        >
          <div className="bg-white rounded shadow">
            <div className="bg-[#EDF3F7] px-4 py-2 rounded-t text-[#0E2F4B] font-semibold text-sm flex items-center justify-between">
              {myAssetsSubTab === "myAssets" ? "My Assigned Assets" : t('breakdownSelection.availableAssets')}
              <button onClick={() => setIsMaximized((prev) => !prev)}>
                {isMaximized ? (
                  <Minimize className="text-[#0E2F4B]" size={18} />
                ) : (
                  <Maximize className="text-[#0E2F4B]" size={18} />
                )}
              </button>
            </div>
            <div className="bg-[#0E2F4B] text-white text-sm overflow-hidden">
              {(() => {
                // Filter assets based on selected asset type if in select sub-tab
                const displayAssets = myAssetsSubTab === "select" && selectedAssetType
                  ? myAssets.filter(a => a.asset_type_id === selectedAssetType)
                  : myAssets;
                
                return (
                  <>
                    {displayAssets.length > 0 && (
                      <div
                        className={`grid px-4 py-2 font-semibold border-b-4 border-yellow-400`}
                        style={{ gridTemplateColumns: "repeat(7, minmax(0, 1fr))" }}
                      >
                        <div>{t('breakdownSelection.assetTypeId')}</div>
                        <div>{t('breakdownSelection.assetId')}</div>
                        <div>{t('breakdownSelection.assetTypeName')}</div>
                        <div>{t('breakdownSelection.assetName')}</div>
                        <div>{t('breakdownSelection.serviceVendorId')}</div>
                        <div>{t('breakdownSelection.productServiceId')}</div>
                        <div className="flex justify-center">{t('breakdownSelection.actions')}</div>
                      </div>
                    )}

                    <div
                      className={`${
                        isMaximized ? "max-h-[60vh] overflow-y-auto" : ""
                      }`}
                    >
                      {displayAssets.map((asset, i) => (
                        <div
                          key={asset.asset_id}
                          className={`grid px-4 py-2 items-center border-b ${
                            i % 2 === 0 ? "bg-white" : "bg-gray-100"
                          } text-gray-800 hover:bg-gray-200`}
                          style={{ gridTemplateColumns: "repeat(7, minmax(0, 1fr))" }}
                        >
                          <div>{asset.asset_type_id || "-"}</div>
                          <div>
                            <button
                              className="text-blue-600 underline hover:text-blue-800"
                              onClick={() =>
                                navigate(`/asset-detail/${asset.asset_id}`, {
                                  state: {
                                    hideAssign: true,
                                    backTo: "/breakdown-selection2",
                                    selectedAssetType,
                                  },
                                })
                              }
                            >
                              {asset.asset_id}
                            </button>
                          </div>
                          <div>{asset.asset_type_name || "-"}</div>
                          <div title={asset.text || asset.description || ""}>
                            {(asset.text || asset.description) && (asset.text || asset.description).length > 15
                              ? (asset.text || asset.description).slice(0, 15) + "..."
                              : (asset.text || asset.description || "-")}
                          </div>
                          <div>{asset.service_vendor_id || "-"}</div>
                          <div>{asset.prod_serv_id || "-"}</div>
                          <div className="flex justify-center">
                            <button
                              onClick={() => goToBreakdownDetails(asset)}
                              className="bg-[#0E2F4B] text-white px-3 py-1 rounded text_sm hover:bg-[#1a4971] transition-colors"
                            >
                              {t('breakdownSelection.createBreakdown')}
                            </button>
                          </div>
                        </div>
                      ))}
                      {displayAssets.length === 0 && (
                        <div className="px-4 py-6 text-center text-gray-500 col-span-4 bg-white rounded-b">
                          {myAssetsSubTab === "myAssets" 
                            ? "No assigned assets found"
                            : t('breakdownSelection.noInactiveAssetsFound')}
                        </div>
                      )}
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {showScanner && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="p-4 border-b flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900">
                {t('breakdownSelection.scanBarcode')}
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
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-64 h-64 border-2 border-white rounded-lg"></div>
                </div>
              </div>
            </div>

            <div className="p-4 text-center">
              <p className="text-sm text-gray-600">
                {t('breakdownSelection.positionBarcodeInScanningArea')}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BreakdownSelection2;

