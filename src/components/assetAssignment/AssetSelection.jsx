import React, { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Maximize, Minimize, QrCode, X } from "lucide-react";
import { Html5Qrcode } from "html5-qrcode";
import API from "../../lib/axios";
import { toast } from "react-hot-toast";
import useAuditLog from "../../hooks/useAuditLog";
import { DEPT_ASSIGNMENT_APP_ID } from "../../constants/deptAssignmentAuditEvents";
import { EMP_ASSIGNMENT_APP_ID } from "../../constants/empAssignmentAuditEvents";
import { useLanguage } from "../../contexts/LanguageContext";
 

const AssetSelection = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { entityId, entityIntId, entityType, departmentId } =
    location.state || {};

  const [assets, setAssets] = useState([]);
  const [assetTypes, setAssetTypes] = useState([]);
  const [selectedAssetType, setSelectedAssetType] = useState(null);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [isMaximized, setIsMaximized] = useState(false);
  const [activeTab, setActiveTab] = useState("select");
  const [scannedAssetId, setScannedAssetId] = useState("");
  const [filteredAssets, setFilteredAssets] = useState([]);
  const [showScanner, setShowScanner] = useState(false);
  const scannerRef = useRef(null);
  const videoRef = useRef(null);
  const [inactiveAssets, setInactiveAssets] = useState([]);
  const [inactiveAssetsRaw, setInactiveAssetsRaw] = useState([]);

  // Initialize audit logging based on entity type
  const appId = entityType === 'employee' ? EMP_ASSIGNMENT_APP_ID : DEPT_ASSIGNMENT_APP_ID;
  const { recordActionByNameWithFetch } = useAuditLog(appId);

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
          aspectRatio: 1.0,
        },
        onScanSuccess,
        onScanError
      );
    } catch (err) {
      console.error("Error starting scanner:", err);
      toast.error(t('assets.couldNotAccessCamera'));
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
    toast.success(t('assets.assetIdScannedSuccessfully'));
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
    console.log("entityIntId on mount:", entityIntId);
    if (!entityId || !entityType) {
      toast.error(t('assets.invalidNavigation'));
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
      let incoming = [];
      
      // For department assignments, fetch only asset types assigned to that department
      if (entityType === "department" && entityId) {
        const res = await API.get(`/dept-assets/department/${entityId}/asset-types`);
        // Handle nested data structure from backend
        incoming = Array.isArray(res.data.data) ? res.data.data : (Array.isArray(res.data) ? res.data : []);
        // Transform asset_type_name to text for consistency
        incoming = incoming.map(item => ({
          ...item,
          text: item.asset_type_name || item.text
        }));
        console.log('Department asset types for dept', entityId, ':', incoming);
      } 
      else if (entityType === "employee") {
        // For employee assignments, fetch only 'user' assignment type asset types
        const res = await API.get("/dept-assets/asset-types?assignment_type=user");
        incoming = Array.isArray(res.data) ? res.data : [];
        console.log('User assignment type asset types:', incoming);
      }
      else {
        // Fallback: fetch all asset types
        const res = await API.get("/dept-assets/asset-types");
        incoming = Array.isArray(res.data) ? res.data : [];
        console.log('All asset types:', incoming);
      }

      // Backend already filters by assignment_type, so just use the results
      setAssetTypes(incoming);
      console.log('Final asset types:', incoming);
    } catch (err) {
      console.error("Failed to fetch asset types", err);
      toast.error(t('assets.failedToFetchAssetTypes'));
      setAssetTypes([]);
    }
  };

  const fetchAvailableAssets = async () => {
    try {
      const endpoint =
        entityType === "department"
          ? `/admin/available-assets-for-department/${entityId}`
          : `/admin/available-assets-for-employee/${entityId}`;

      const res = await API.get(endpoint);
      setAssets(res.data);
    } catch (err) {
      console.error("Failed to fetch available assets", err);
      toast.error(t('assets.failedToFetchAvailableAssets'));
    }
  };

  const fetchInactiveAssetsByType = async (assetTypeId) => {
    try {
      const res = await API.get(`/assets/type/${assetTypeId}/inactive`);
      // If the response is an object with a 'data' array, use that
      const assetsArr = Array.isArray(res.data.data)
        ? res.data.data
        : Array.isArray(res.data)
        ? res.data
        : [];
      setInactiveAssets(assetsArr);
      setInactiveAssetsRaw(res.data); // for debugging if needed
      console.log(
        "Inactive assets for asset type",
        assetTypeId,
        ":",
        assetsArr
      );
    } catch (err) {
      console.error("Failed to fetch inactive assets", err);
      toast.error(t('assets.failedToFetchInactiveAssets'));
      setInactiveAssets([]);
    }
  };

  // Helper to generate a unique assignment ID
  const generateUniqueId = () => `AA${Date.now()}`;

  const handleAssignAsset = async (asset) => {
    if (!asset) {
      toast.error(t('assets.pleaseSelectAssetFromList'));
      return;
    }
  
    if (!asset.asset_type_id) {
      toast.error(t('assets.assetTypeInformationMissing'));
      return;
    }
  
    try {
      // Fetch asset type details to get assignment_type for validation
      const typeRes = await API.get(`/asset-types/${asset.asset_type_id}`);
      const assetType = typeRes.data;
  
      if (!assetType) {
        toast.error(t('assets.failedToValidateAssetType'));
        return;
      }
  
      if (entityType === "employee") {
        // Logic for Employee Assignment
        if (assetType.assignment_type !== "user") {
          toast.error(t('assets.assetTypeCanOnlyBeAssignedToDepartments'));
          return;
        }
        if (!entityIntId) {
          toast.error(t('assets.employeeInternalIdMissing'));
          return;
        }
  
        const payload = {
          asset_assign_id: generateUniqueId(),
          asset_id: asset.asset_id,
          org_id: asset.org_id,
          dept_id: asset.dept_id || departmentId,
          employee_int_id: entityIntId,
          latest_assignment_flag: true,
          action: "A",
        };
        await API.post("/asset-assignments/employee", payload);
        
        // Log assign action for employee
        await recordActionByNameWithFetch('Assign', {
          assetId: asset.asset_id,
          employeeId: entityIntId,
          deptId: asset.dept_id || departmentId,
          action: 'Asset Assigned to Employee'
        });
        
        toast.success(t('assets.assetAssignedToEmployeeSuccessfully'));
  
      } else if (entityType === "department") {
        // Logic for Department Assignment
        // CORRECTED: Check for 'department' assignment type
        if (assetType.assignment_type !== "department") {
          toast.error(t('assets.assetTypeCanOnlyBeAssignedToUsers'));
          return;
        }
        if (!entityId && !departmentId) {
          toast.error(t('assets.departmentIdMissing'));
          return;
        }
  
        const payload = {
          asset_assign_id: generateUniqueId(),
          asset_id: asset.asset_id,
          org_id: asset.org_id,
          dept_id: asset.dept_id || departmentId || entityId,
          latest_assignment_flag: true,
          action: "A",
        };
        await API.post("/asset-assignments", payload);
        
        // Log assign action for department
        await recordActionByNameWithFetch('Assign', {
          assetId: asset.asset_id,
          deptId: asset.dept_id || departmentId || entityId,
          action: 'Asset Assigned to Department'
        });
        
        toast.success(t('assets.assetAssignedToDepartmentSuccessfully'));
      }
      
      // Redirect after successful assignment
      navigate(-1);
  
    } catch (err) {
      console.error("Failed to assign asset", err);
      const errorMessage =
        err.response?.data?.message || err.response?.data?.error || err.message || "An error occurred";
      toast.error(`${t('assets.failedToAssignAsset')}: ${errorMessage}`);
    }
  };

  // const handleAssignAsset = async (asset) => {
  //   if (!asset) {
  //     toast.error("Please select an asset from the list");
  //     return;
  //   }

  //   // Check if asset type exists and has assignment_type
  //   if (!asset.asset_type_id) {
  //     toast.error("Asset type information is missing");
  //     return;
  //   }

  //   if (entityType === "employee") {
  //     if (!entityIntId) {
  //       toast.error("Employee internal ID is missing");
  //       return;
  //     }

  //     try {
  //       // Fetch asset type details to get assignment_type
  //       const typeRes = await API.get(`/asset-types/${asset.asset_type_id}`);
  //       const assetType = typeRes.data;

  //       if (!assetType) {
  //         toast.error("Failed to validate asset type");
  //         return;
  //       }

  //       if (assetType.assignment_type !== "User") {
  //         toast.error("This asset type can only be assigned to departments");
  //         return;
  //       }

  //       const payload = {
  //         asset_assign_id: generateUniqueId(),
  //         asset_id: asset.asset_id,
  //         org_id: asset.org_id,
  //         dept_id: asset.dept_id || departmentId, // Only use departmentId for employee's department
  //         employee_int_id: entityIntId,
  //         latest_assignment_flag: true,
  //         action: "A",
  //       };
  //       await API.post("/asset-assignments/employee", payload);
  //       toast.success("Asset assigned to employee successfully");
  //       navigate(-1);
  //     } catch (err) {
  //       console.error("Failed to assign asset to employee", err);
  //       const errorMessage =
  //         err.response?.data?.message ||
  //         err.response?.data?.error ||
  //         err.message ||
  //         "An error occurred";
  //       toast.error(`Failed to assign asset: ${errorMessage}`);
  //     }
  //   } else if (entityType === "department") {
  //     if (!entityId && !departmentId) {
  //       toast.error("Department ID missing");
  //       return;
  //     }

  //     try {
  //       // Fetch asset type details to validate assignment
  //       const typeRes = await API.get(`/asset-types/${asset.asset_type_id}`);
  //       const assetType = typeRes.data;

  //       if (!assetType) {
  //         toast.error("Failed to validate asset type");
  //         return;
  //       }

  //       if (assetType.assignment_type !== "Department") {
  //         toast.error("This asset type can only be assigned to users");
  //         return;
  //       }

  //       const payload = {
  //         asset_assign_id: generateUniqueId(),
  //         asset_id: asset.asset_id,
  //         org_id: asset.org_id,
  //         dept_id: asset.dept_id || departmentId || entityId,
  //         latest_assignment_flag: true,
  //         action: "A",
  //       };
  //       await API.post("/asset-assignments", payload);
  //       toast.success("Asset assigned to department successfully");
  //       navigate(-1);
  //     } catch (err) {
  //       console.error("Failed to assign asset to department", err);
  //       const errorMessage =
  //         err.response?.data?.message ||
  //         err.response?.data?.error ||
  //         err.message ||
  //         "An error occurred";
  //       toast.error(`Failed to assign asset: ${errorMessage}`);
  //     }
  //   }
  // };

  const handleScanSubmit = async (e) => {
    e.preventDefault();
    if (!scannedAssetId) {
      toast.error(t('assets.pleaseEnterAssetId'));
      return;
    }
    // Find the asset in inactiveAssets by asset_id
    const asset = inactiveAssets.find((a) => a.asset_id === scannedAssetId);
    if (!asset) {
      toast.error(t('assets.assetNotFoundOrNotAvailable'));
      return;
    }
    handleAssignAsset(asset);
  };

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <div className="bg-white rounded shadow mb-4">
        <div className="bg-[#EDF3F7] px-4 py-2 rounded-t text-[#0E2F4B] font-semibold text-sm">
          {t('assets.assetSelection')}
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
              {t('assets.selectAsset')}
            </button>
            <button
              onClick={() => setActiveTab("scan")}
              className={`py-2 px-4 text-sm font-medium ${
                activeTab === "scan"
                  ? "border-b-2 border-[#0E2F4B] text-[#0E2F4B]"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {t('assets.scanAsset')}
            </button>
          </nav>
        </div>

        <div className="p-4">
          {activeTab === "select" ? (
            // Select Asset Content
            <div className="flex gap-4 items-end">
              <div className="w-64">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('assets.assetType')}
                </label>
                <select
                  className="border px-3 py-2 text-sm w-full bg-white text-black focus:outline-none rounded"
                  value={selectedAssetType || ""}
                  onChange={handleAssetTypeChange}
                >
                  <option value="">{t('assets.allAssetTypes')}</option>
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
                  {t('common.cancel')}
                </button>
              </div>
            </div>
          ) : (
            // Scan Asset Content
            <form onSubmit={handleScanSubmit} className="flex gap-4 items-end">
              <div className="w-64">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('assets.assetId')}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    className="border px-3 py-2 text-sm w-full bg-white text-black focus:outline-none rounded"
                    placeholder={t('assets.scanOrEnterAssetId')}
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
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  className="bg-[#0E2F4B] text-white px-4 py-2 rounded text-sm disabled:opacity-50"
                  disabled={!scannedAssetId}
                >
                  {t('employees.assignAsset')}
                </button>
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
              {t('assets.availableAssets')}
              <button onClick={() => setIsMaximized((prev) => !prev)}>
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
                <div
                  className={`grid px-4 py-2 font-semibold border-b-4 border-yellow-400`}
                  style={{ gridTemplateColumns: "repeat(6, minmax(0, 1fr))" }}
                >
                  <div>{t('assets.assetTypeId')}</div>
                  <div>{t('assets.assetId')}</div>
                  <div>{t('employees.assetTypeName')}</div>
                  <div>{t('assets.assetName')}</div>
                  <div>{t('assets.productServiceId')}</div>
                  <div className="flex justify-center">{t('common.actions')}</div>
                </div>
              )}

              <div
                className={`${
                  isMaximized ? "max-h-[60vh] overflow-y-auto" : ""
                }`}
              >
                {inactiveAssets.map((asset, i) => (
                  <div
                    key={asset.asset_id}
                    className={`grid px-4 py-2 items-center border-b ${
                      i % 2 === 0 ? "bg-white" : "bg-gray-100"
                    } text-gray-800 hover:bg-gray-200 ${
                      selectedAsset === asset.asset_id ? "bg-blue-50" : ""
                    }`}
                    style={{ gridTemplateColumns: "repeat(6, minmax(0, 1fr))" }}
                  >
                    <div>{asset.asset_type_id}</div>
                    <div>
                      <button
                        className="text-blue-600 underline hover:text-blue-800"
                        onClick={() =>
                          navigate(`/asset-detail/${asset.asset_id}`, {
                            state: {
                              employee_int_id: entityIntId,
                              dept_id: asset.dept_id || departmentId,
                              org_id: asset.org_id,
                            },
                          })
                        }
                      >
                        {asset.asset_id}
                      </button>
                    </div>
                    <div>{asset.text}</div>
                    <div title={asset.description}>
                      {asset.description && asset.description.length > 15
                        ? asset.description.slice(0, 15) + "..."
                        : asset.description}
                    </div>
                    <div>{asset.prod_serv_id}</div>
                    <div className="flex justify-center">
                      <button
                        onClick={() => handleAssignAsset(asset)}
                        className="bg-[#0E2F4B] text-white px-3 py-1 rounded text-sm hover:bg-[#1a4971] transition-colors"
                      >
                        {t('employees.assignAsset')}
                      </button>
                    </div>
                  </div>
                ))}
                {inactiveAssets.length === 0 && (
                  <div className="px-4 py-6 text-center text-gray-500 col-span-4 bg-white rounded-b">
                    {t('assets.noInactiveAssetsFound')}
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
                {t('assets.scanBarcode')}
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
                {t('assets.positionBarcodeInScanningArea')}
              </p>
            </div>

            <div className="p-4 border-t flex justify-end">
              <button
                onClick={stopScanner}
                className="bg-gray-200 text-gray-800 px-4 py-2 rounded text-sm hover:bg-gray-300"
              >
                {t('common.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssetSelection;
