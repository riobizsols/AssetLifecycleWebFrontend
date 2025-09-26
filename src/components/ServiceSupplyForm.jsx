import { useEffect, useState } from "react";
import { Maximize, Minimize, Trash2 } from "lucide-react";
import API from "../lib/axios";
import { useAuthStore } from "../store/useAuthStore";
import { v4 as uuidv4 } from "uuid";
import SearchableDropdown from "./ui/SearchableDropdown";
import { toast } from "react-hot-toast";
import { useLanguage } from "../contexts/LanguageContext";

const ServiceSupplyForm = ({ vendorId, orgId, vendorSaved = false, onSaveTrigger, onTabSaved }) => {
  // Debug logs
  console.log('ServiceSupplyForm render:', { vendorId, orgId });
  const { t } = useLanguage();
  const [assetTypes, setAssetTypes] = useState([]);
  const [services, setServices] = useState([]);
  const [form, setForm] = useState({ assetType: "", description: "" });
  const [maximized, setMaximized] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [allServiceDescriptions, setAllServiceDescriptions] = useState([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchAssetTypes();
    fetchAllServiceDescriptions();
    // On mount, load services from sessionStorage
    const stored = sessionStorage.getItem('services');
    if (stored) setServices(JSON.parse(stored));
  }, []);

  // Listen for save trigger from parent
  useEffect(() => {
    if (onSaveTrigger === 'Service Details') {
      handleDone();
    }
  }, [onSaveTrigger]);

  

  const fetchAssetTypes = async () => {
    try {
      const res = await API.get('/dept-assets/asset-types');
      setAssetTypes(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Error fetching asset types:", err);
      const errorMessage = err.response?.data?.message || err.response?.data?.error || "Failed to fetch asset types";
      toast.error(errorMessage);
      setAssetTypes([]);
    }
  };

  const fetchAllServiceDescriptions = async () => {
    try {
      const res = await API.get('/prodserv');
      // Only keep those with ps_type === 'service'
      const filtered = Array.isArray(res.data) ? res.data.filter(p => p.ps_type === 'service') : [];
      setAllServiceDescriptions(filtered);
    } catch (err) {
      console.error("Error fetching service descriptions:", err);
      const errorMessage = err.response?.data?.message || err.response?.data?.error || "Failed to fetch service descriptions";
      toast.error(errorMessage);
      setAllServiceDescriptions([]);
    }
  };

  // Filter descriptions based on selected asset type
  const filteredDescriptions = form.assetType
    ? allServiceDescriptions.filter(s => s.asset_type_id === form.assetType)
    : allServiceDescriptions;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    
    // Reset validation state when user starts typing
    if (submitAttempted) {
      setSubmitAttempted(false);
    }
  };

  // Remove fetchServices and handleAdd API calls for create/fetch. Use local state for services.
  // On Add, append the new service to services state.
  // Table renders from services state only.
  // Keep dropdown API logic for asset types and for fetching all service descriptions.
  const handleAdd = () => {
    // Validate required fields first
    if (!form.assetType) {
      setSubmitAttempted(true);
      toast.error(t('vendors.pleaseSelectAnAssetType'));
      return;
    }
    if (!form.description) {
      setSubmitAttempted(true);
      toast.error(t('vendors.descriptionRequired'));
      return;
    }

    // Check if service already exists
    const isDuplicate = services.some(
      service => service.asset_type_id === form.assetType && service.description === form.description
    );
    if (isDuplicate) {
      toast.error(t('vendors.serviceAlreadyAdded') || 'This service is already added');
      return;
    }

    try {
      // Get asset type text for display
      const assetTypeText = assetTypes.find(type => type.asset_type_id === form.assetType)?.text || form.assetType;

      const newServices = [...services, { 
        asset_type_id: form.assetType, 
        description: form.description,
        asset_type_text: assetTypeText // Store text for display
      }];
      setServices(newServices);
      sessionStorage.setItem('services', JSON.stringify(newServices));
      setForm({ assetType: '', description: '' });
      setSubmitAttempted(false); // Reset validation state after successful add
      toast.success("Service added to list");
    } catch (err) {
      console.error("Error adding service:", err);
      toast.error(t('vendors.failedToAddService') || 'Failed to add service');
    }
  };

  // Handle delete from local state
  const handleDelete = (idx) => {
    const newServices = services.filter((_, i) => i !== idx);
    setServices(newServices);
    sessionStorage.setItem('services', JSON.stringify(newServices));
  };

  // Helper for invalid field
  const isFieldInvalid = (val) => submitAttempted && !val;

  // Table card content
  const tableCard = (
    <div className="bg-[#F5F8FA] rounded shadow border relative">
      <div className="px-4 py-2 font-semibold text-[#0E2F4B] text-base border-b border-[#FFC107] flex items-center justify-between">
        <span>{t('vendors.serviceList')}</span>
        <button
          type="button"
          onClick={() => setMaximized((m) => !m)}
          className="ml-2 text-[#0E2F4B] hover:text-[#FFC107] focus:outline-none"
          title={maximized ? "Minimize" : "Maximize"}
        >
          {maximized ? (
            <Minimize className="h-5 w-5" />
          ) : (
            <Maximize className="h-5 w-5" />
          )}
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead>
            <tr className="bg-[#0E2F4B] text-white">
              <th className="px-6 py-3 text-left text-sm font-medium">{t('vendors.assetType')}</th>
              <th className="px-6 py-3 text-left text-sm font-medium">{t('vendors.description')}</th>
              <th className="px-6 py-3 text-center text-sm font-medium w-20"></th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {services.map((p, idx) => (
              <tr key={idx} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                <td className="px-6 py-2 text-sm text-gray-900">{p.asset_type_text || p.asset_type_id}</td>
                <td className="px-6 py-2 text-sm text-gray-900">{p.description}</td>
                <td className="px-6 py-2 text-center">
                  <button 
                    onClick={() => handleDelete(idx)} 
                    className="text-yellow-500 hover:text-red-600 transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  // Done button logic
  const handleDone = async () => {
    try {
      // Check vendor dependency
      if (!vendorSaved) {
        toast.error(t('vendors.pleaseSaveVendorFirst') || 'Please save vendor details first before saving services.');
        return;
      }
      
      // Validate required data
      if (!vendorId || !orgId) {
        toast.error(t('vendors.pleaseCreateVendorFirst'));
        return;
      }

      setIsSaving(true);

      if (!services.length) {
        toast.error(t('vendors.pleaseAddAtLeastOneService') || 'Please add at least one service');
        return;
      }

      // Get services from storage
      let servicesFromStorage;
      try {
        servicesFromStorage = JSON.parse(sessionStorage.getItem('services') || '[]');
        if (!Array.isArray(servicesFromStorage)) {
          throw new Error('Invalid services data');
        }
      } catch (parseErr) {
        console.error('Error parsing services from sessionStorage:', parseErr);
        toast.error(t('vendors.errorReadingServicesData') || 'Error reading services data');
        return;
      }

      // Show loading toast
      const loadingToast = toast.loading('Processing services...');

      // Process each service
      let prodServIds = [];
      for (const s of servicesFromStorage) {
        try {
          const res = await API.get('/prodserv');
          const match = Array.isArray(res.data)
            ? res.data.find(row => 
                row.asset_type_id === s.asset_type_id && 
                row.description === s.description && 
                row.ps_type === 'service'
              )
            : null;

          if (match?.prod_serv_id) {
            prodServIds.push(match.prod_serv_id);
          } else {
            toast.error(t('vendors.serviceNotFound', { service: `${s.asset_type_text || s.asset_type_id} - ${s.description}` }) || `Service not found: ${s.asset_type_text || s.asset_type_id} - ${s.description}`);
          }
        } catch (apiErr) {
          console.error('Error fetching service:', apiErr);
          const errorMessage = apiErr.response?.data?.message || apiErr.response?.data?.error || "Error looking up service";
          toast.error(errorMessage);
          toast.dismiss(loadingToast);
          return;
        }
      }

      // Remove duplicates
      prodServIds = [...new Set(prodServIds)];

      if (!prodServIds.length) {
        toast.error(t('vendors.noValidServicesToLink') || 'No valid services to link');
        toast.dismiss(loadingToast);
        return;
      }

      // Link services to vendor
      let successCount = 0;
      let duplicateCount = 0;
      for (const prod_serv_id of prodServIds) {
        try {
          await API.post('/vendor-prod-services', {
            prod_serv_id,
            vendor_id: vendorId,
            org_id: orgId
          });
          successCount++;
        } catch (postErr) {
          console.error('Error linking service:', postErr);
          // Check if it's a duplicate entry (409 Conflict)
          if (postErr.response?.status === 409) {
            duplicateCount++;
            console.log('Service already linked to vendor:', prod_serv_id);
          } else {
            const errorMessage = postErr.response?.data?.message || postErr.response?.data?.error || "Error linking service";
            toast.error(errorMessage);
          }
        }
      }

      // Clear loading toast
      toast.dismiss(loadingToast);

      // Show final status
      const totalProcessed = successCount + duplicateCount;
      if (totalProcessed === prodServIds.length) {
        if (duplicateCount > 0 && successCount > 0) {
          toast.success(`${successCount} services linked successfully, ${duplicateCount} were already linked`);
        } else if (duplicateCount > 0 && successCount === 0) {
          toast.success(`All ${duplicateCount} services were already linked to this vendor`);
        } else {
          toast.success('All services linked successfully');
        }
        // Clear form and storage
        setServices([]);
        sessionStorage.removeItem('services');
        // Mark tab as saved
        if (onTabSaved) onTabSaved('Service Details');
      } else if (totalProcessed > 0) {
        toast.success(`${totalProcessed} out of ${prodServIds.length} services processed successfully`);
        // Mark tab as saved even if partial success
        if (onTabSaved) onTabSaved('Service Details');
      } else {
        toast.error(t('vendors.failedToLinkAnyServices') || 'Failed to link any services');
      }
    } catch (err) {
      console.error('Unexpected error:', err);
      toast.error(t('vendors.unexpectedErrorOccurred') || 'An unexpected error occurred');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="pb-6">
      {/* Add Service Row (always visible) */}
      <div className="flex items-end gap-4 mb-8">
        <div>
          <label className="block text-sm text-gray-700 mb-2">
            {t('vendors.assetType')} <span className="text-red-500">*</span>
          </label>
          <SearchableDropdown
            options={assetTypes}
            value={form.assetType}
            onChange={(value) => handleChange({ target: { name: "assetType", value }})}
            placeholder={t('vendors.selectAssetType')}
            searchPlaceholder="Search Asset Types..."
            createNewText="Create New"
            createNewPath="/master-data/asset-types"
            className={`w-48 ${isFieldInvalid(form.assetType) ? 'border border-red-500' : ''}`}
            displayKey="text"
            valueKey="asset_type_id"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-700 mb-2">
            {t('vendors.description')} <span className="text-red-500">*</span>
          </label>
          <SearchableDropdown
            options={filteredDescriptions.map(s => ({ id: s.description, text: s.description }))}
            value={form.description}
            onChange={(value) => handleChange({ target: { name: "description", value }})}
            placeholder={t('vendors.selectDescription')}
            searchPlaceholder="Search Descriptions..."
            disabled={!form.assetType}
            className={`w-80 ${isFieldInvalid(form.description) ? 'border border-red-500' : ''}`}
            displayKey="text"
            valueKey="id"
          />
        </div>
        <button
          type="button"
          onClick={handleAdd}
          className="bg-[#0E2F4B] text-white px-6 py-1 rounded hover:bg-[#1e40af] transition-colors"
        >
          {t('vendors.add')}
        </button>
      </div>
      {/* Service List Table with maximize/minimize */}
      {maximized ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
          <div className="w-full h-full flex items-center justify-center">
            <div className="bg-white w-11/12 h-5/6 rounded shadow-lg overflow-auto p-4 relative">
              {tableCard}
            </div>
          </div>
        </div>
      ) : (
        tableCard
      )}
    </div>
  );
};

export default ServiceSupplyForm;