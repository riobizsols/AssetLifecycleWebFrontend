import React, { useState, useEffect } from "react";
import { CheckCircle, ArrowLeft, ClipboardCheck } from "lucide-react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import API from "../lib/axios";
import ChecklistModal from "./ChecklistModal";

export default function MaintSupervisorApproval() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [maintenanceData, setMaintenanceData] = useState(null);
  const [checklist, setChecklist] = useState([]);
  const [loadingChecklist, setLoadingChecklist] = useState(true);
  const [loadingData, setLoadingData] = useState(true);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [showChecklist, setShowChecklist] = useState(false);
  
  // Form state for updatable fields
  const [formData, setFormData] = useState({
    notes: "",
    status: "",
    po_number: "",
    invoice: "",
    technician_name: "",
    technician_email: "",
    technician_phno: ""
  });

  useEffect(() => {
    if (id) {
      fetchMaintenanceData();
    }
  }, [id]);

  // Fetch checklist when maintenance data is available
  useEffect(() => {
    if (maintenanceData?.asset_type_id) {
      fetchChecklist();
    }
  }, [maintenanceData]);

  const fetchMaintenanceData = async () => {
    try {
      setLoadingData(true);
      const apiUrl = `/maintenance-schedules/${id}`;
      const res = await API.get(apiUrl);
      if (res.data.success) {
        setMaintenanceData(res.data.data);
        // Initialize form data with existing values
        setFormData({
          notes: res.data.data.notes || "",
          status: res.data.data.status || "",
          po_number: res.data.data.po_number || "",
          invoice: res.data.data.invoice || "",
          technician_name: res.data.data.technician_name || "",
          technician_email: res.data.data.technician_email || "",
          technician_phno: res.data.data.technician_phno || ""
        });
      } else {
        toast.error(res.data.message || "Failed to fetch maintenance data");
      }
    } catch (err) {
      console.error("Failed to fetch maintenance data:", err);
      toast.error("Failed to fetch maintenance data");
    } finally {
      setLoadingData(false);
    }
  };

  const fetchChecklist = async () => {
    setLoadingChecklist(true);
    try {
      // Get checklist for the specific asset type
      if (maintenanceData?.asset_type_id) {
        const apiUrl = `/checklist/asset-type/${maintenanceData.asset_type_id}`;
        const res = await API.get(apiUrl);
        
        // The API returns { success: true, data: [...], count: 3 }
        if (res.data && res.data.success && Array.isArray(res.data.data)) {
          setChecklist(res.data.data);
        } else {
          setChecklist([]);
        }
      } else {
        setChecklist([]);
      }
    } catch (err) {
      console.error("Failed to fetch checklist:", err);
      setChecklist([]);
    } finally {
      setLoadingChecklist(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitAttempted(true);
    
    // Validation
    if (!formData.status) {
      toast.error("Status is required");
      return;
    }
    
    try {
      const updateData = {
        ...formData
      };
      
      const res = await API.put(`/maintenance-schedules/${id}`, updateData);
      
      if (res.data.success) {
        toast.success("Maintenance schedule updated successfully!");
        navigate("/supervisor-approval");
      } else {
        toast.error(res.data.message || "Failed to update maintenance schedule");
      }
    } catch (err) {
      console.error("Failed to update maintenance schedule:", err);
      toast.error("Failed to update maintenance schedule");
    }
  };

  if (loadingData) {
    return (
      <div className="max-w-7xl mx-auto min-h-[600px] overflow-y-auto p-8 bg-white md:rounded shadow-lg mt-155">
        <div className="text-center text-gray-500">Loading maintenance data...</div>
      </div>
    );
  }

  if (!maintenanceData) {
    return (
      <div className="max-w-7xl mx-auto min-h-[600px] overflow-y-auto p-8 bg-white md:rounded shadow-lg mt-155">
        <div className="text-center text-red-500">Maintenance record not found</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto min-h-[600px] overflow-y-auto p-8 bg-white md:rounded shadow-lg mt-155">
      {/* Header with Back Button */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate("/supervisor-approval")}
          className="flex items-center gap-2 text-[#0E2F4B] hover:text-blue-700"
        >
          <ArrowLeft size={20} />
          Back to Supervisor Approvals
        </button>
      </div>

      {/* Main Content */}
      <div className="space-y-6">
        {/* Checklist Section - At the Top */}
        <div className="p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-800">Maintenance Checklist</h2>
            <button
              type="button"
              onClick={() => setShowChecklist(true)}
              disabled={loadingChecklist || checklist.length === 0}
              className="px-4 py-2 border border-blue-300 rounded bg-[#0E2F4B] text-white text-sm font-semibold flex items-center gap-2 justify-center hover:bg-[#14395c] transition disabled:opacity-50 disabled:cursor-not-allowed"
              title="View and complete the asset maintenance checklist"
            >
              <ClipboardCheck className="w-4 h-4" />
              {loadingChecklist ? "Loading..." : "View Checklist"}
            </button>
          </div>
        </div>

        {/* Update Form - Only Fields That Need to be Updated */}
        <div className="bg-gray-50 p-6 rounded-lg">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Update Maintenance Schedule</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  name="technician_name"
                  value={formData.technician_name}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter technician name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input
                  type="tel"
                  name="technician_phno"
                  value={formData.technician_phno}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter technician phone"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">Select status</option>
                  <option value="IN">Initiated</option>
                  <option value="IP">In Progress</option>
                  <option value="CO">Completed</option>
                  <option value="CA">Cancelled</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">PO Number</label>
                <input
                  type="text"
                  name="po_number"
                  value={formData.po_number}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter PO number"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Invoice</label>
                <input
                  type="text"
                  name="invoice"
                  value={formData.invoice}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter invoice number"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  name="technician_email"
                  value={formData.technician_email}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter technician email"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter any additional notes..."
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={() => navigate("/supervisor-approval")}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#0E2F4B] hover:bg-[#14395c] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Submit
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Checklist Modal */}
      <ChecklistModal
        assetType={maintenanceData?.asset_type_name || "Asset"}
        open={showChecklist}
        onClose={() => setShowChecklist(false)}
        checklist={checklist}
      />
    </div>
  );
}