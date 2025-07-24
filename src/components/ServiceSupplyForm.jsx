import { useEffect, useState } from "react";
import { Maximize, Minimize, Trash2 } from "lucide-react";
import API from "../lib/axios";
import { useAuthStore } from "../store/useAuthStore";
import { v4 as uuidv4 } from "uuid";
import SearchableDropdown from "./ui/SearchableDropdown";
import { toast } from "react-hot-toast";

const ServiceSupplyForm = ({ vendorId, orgId }) => {
  // Debug logs
  console.log('ServiceSupplyForm render:', { vendorId, orgId });
  const [assetTypes, setAssetTypes] = useState([]);
  const [services, setServices] = useState([]);
  const [form, setForm] = useState({ assetType: "", description: "" });
  const [maximized, setMaximized] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [allServiceDescriptions, setAllServiceDescriptions] = useState([]);

  useEffect(() => {
    fetchAssetTypes();
    fetchAllServiceDescriptions();
    // On mount, load services from sessionStorage
    const stored = sessionStorage.getItem('services');
    if (stored) setServices(JSON.parse(stored));
  }, []);

  

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
  };

  // Remove fetchServices and handleAdd API calls for create/fetch. Use local state for services.
  // On Add, append the new service to services state.
  // Table renders from services state only.
  // Keep dropdown API logic for asset types and for fetching all service descriptions.
  const handleAdd = () => {
    setSubmitAttempted(true);
    // Validate required fields
    if (!form.assetType) {
      toast.error("Please select an asset type");
      return;
    }
    if (!form.description) {
      toast.error("Please select a description");
      return;
    }

    // Check if service already exists
    const isDuplicate = services.some(
      service => service.asset_type_id === form.assetType && service.description === form.description
    );
    if (isDuplicate) {
      toast.error("This service is already added");
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
      toast.success("Service added successfully");
    } catch (err) {
      console.error("Error adding service:", err);
      toast.error("Failed to add service");
    }
  };

  // Helper for invalid field
  const isFieldInvalid = (val) => submitAttempted && !val;

  // Table card content
  const tableCard = (
    <div className="bg-[#F5F8FA] rounded shadow border relative">
      <div className="px-4 py-2 font-semibold text-[#0E2F4B] text-base border-b border-[#FFC107] flex items-center justify-between">
        <span>Service List</span>
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
              <th className="px-6 py-3 text-left text-sm font-medium">Asset Type</th>
              <th className="px-6 py-3 text-left text-sm font-medium">Description</th>
              <th className="px-6 py-3 text-center text-sm font-medium w-20"></th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {services.map((p, idx) => (
              <tr key={idx} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                <td className="px-6 py-2 text-sm text-gray-900">{p.asset_type_id}</td>
                <td className="px-6 py-2 text-sm text-gray-900">{p.description}</td>
                <td className="px-6 py-2 text-center">
                  {/* Delete button could call backend if needed */}
                  <button 
                    onClick={() => alert('Delete from backend not implemented')} 
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
      // Validate required data
      if (!vendorId || !orgId) {
        toast.error("Please create vendor first");
        return;
      }

      if (!services.length) {
        toast.error("Please add at least one service");
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
        toast.error('Error reading services data');
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
            toast.error(`Service not found: ${s.asset_type_text || s.asset_type_id} - ${s.description}`);
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
        toast.error("No valid services to link");
        toast.dismiss(loadingToast);
        return;
      }

      // Link services to vendor
      let successCount = 0;
      for (const prod_serv_id of prodServIds) {
        try {
          await API.post('/vendor-prod-services', {
            ext_id: uuidv4(),
            prod_serv_id,
            vendor_id: vendorId,
            org_id: orgId
          });
          successCount++;
        } catch (postErr) {
          console.error('Error linking service:', postErr);
          const errorMessage = postErr.response?.data?.message || postErr.response?.data?.error || "Error linking service";
          toast.error(errorMessage);
        }
      }

      // Clear loading toast
      toast.dismiss(loadingToast);

      // Show final status
      if (successCount === prodServIds.length) {
        toast.success('All services linked successfully');
        // Clear form and storage
        setServices([]);
        sessionStorage.removeItem('services');
      } else if (successCount > 0) {
        toast.success(`${successCount} out of ${prodServIds.length} services linked successfully`);
      } else {
        toast.error('Failed to link any services');
      }
    } catch (err) {
      console.error('Unexpected error:', err);
      toast.error('An unexpected error occurred');
    }
  };

  return (
    <div className="pb-6">
      {/* Add Service Row (always visible) */}
      <div className="flex items-end gap-4 mb-8">
        <div>
          <label className="block text-sm text-gray-700 mb-2">
            Asset Type <span className="text-red-500">*</span>
          </label>
          <SearchableDropdown
            options={assetTypes}
            value={form.assetType}
            onChange={(value) => handleChange({ target: { name: "assetType", value }})}
            placeholder="Select Asset Type"
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
            Description <span className="text-red-500">*</span>
          </label>
          <SearchableDropdown
            options={filteredDescriptions.map(s => ({ id: s.description, text: s.description }))}
            value={form.description}
            onChange={(value) => handleChange({ target: { name: "description", value }})}
            placeholder="Select Description"
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
          Add
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
      {/* Done button below the table */}
      {vendorId && orgId && services.length > 0 && (
        <div className="flex justify-end mt-8">
          <button
            type="button"
            className="bg-green-600 text-white px-8 py-2 rounded text-base font-medium hover:bg-green-700 transition"
            onClick={handleDone}
          >
            Done
          </button>
        </div>
      )}
    </div>
  );
};

export default ServiceSupplyForm;