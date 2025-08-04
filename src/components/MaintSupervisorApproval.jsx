import React, { useState, useEffect } from "react";
import { CheckCircle, ArrowLeft } from "lucide-react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import API from "../lib/axios";

export default function MaintSupervisorApproval() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [maintenanceData, setMaintenanceData] = useState(null);
  const [checklist, setChecklist] = useState([]);
  const [loadingChecklist, setLoadingChecklist] = useState(true);
  const [loadingData, setLoadingData] = useState(true);
  const [actionBy, setActionBy] = useState("");
  const [vendor, setVendor] = useState({ name: "", email: "", phone: "" });
  const [status, setStatus] = useState("");
  const [note, setNote] = useState("");
  const [submitAttempted, setSubmitAttempted] = useState(false);

  useEffect(() => {
    if (id) {
      fetchMaintenanceData();
    }
    fetchChecklist();
  }, [id]);

  const fetchMaintenanceData = async () => {
    try {
      setLoadingData(true);
      const res = await API.get(`/approval-detail/maintenance-approvals/${id}`);
      setMaintenanceData(res.data);
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
      const res = await API.get("/api/maintenance/checklist");
      setChecklist(res.data);
    } catch (err) {
      console.error("Failed to fetch checklist:", err);
      setChecklist([]);
    } finally {
      setLoadingChecklist(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitAttempted(true);
    if (status === "aborted" && !note.trim()) return;
    
    API.post("/api/maintenance/supervisor-action", {
      maintenanceId: id,
      actionBy,
      vendor,
      status,
      note,
    })
      .then(() => {
        toast.success("Supervisor action submitted successfully!");
        navigate("/supervisor-approval");
      })
      .catch((err) => {
        console.error("Failed to submit supervisor action:", err);
        toast.error("Failed to submit supervisor action");
      });
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

      {/* Maintenance Details */}
      <div className="mb-8">
        <h2 className="text-xl font-bold text-[#0E2F4B] mb-4">Maintenance Details</h2>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Asset Type</label>
            <div className="text-gray-900">{maintenanceData.asset_type_name || 'N/A'}</div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Asset ID</label>
            <div className="text-gray-900">{maintenanceData.asset_id || 'N/A'}</div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Serial Number</label>
            <div className="text-gray-900">{maintenanceData.serial_number || 'N/A'}</div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Scheduled Date</label>
            <div className="text-gray-900">{maintenanceData.scheduled_date || 'N/A'}</div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Vendor</label>
            <div className="text-gray-900">{maintenanceData.vendor || 'N/A'}</div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
            <div className="text-gray-900">{maintenanceData.department || 'N/A'}</div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Employee</label>
            <div className="text-gray-900">{maintenanceData.employee || 'N/A'}</div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Maintenance Type</label>
            <div className="text-gray-900">{maintenanceData.maintenance_type || 'N/A'}</div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <div className="text-gray-900">{maintenanceData.status || 'N/A'}</div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Days Until Due</label>
            <div className="text-gray-900">{maintenanceData.days_until_due ? `${maintenanceData.days_until_due} days` : 'N/A'}</div>
          </div>
        </div>
      </div>

      {/* Checklist */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <CheckCircle className="text-[#0E2F4B] w-6 h-6" />
          <h2 className="text-lg font-bold">Maintenance Checklist</h2>  
        </div>
        {loadingChecklist ? (
          <div className="text-gray-500">Loading checklist...</div>
        ) : (
          <ul className="list-disc pl-6">
            {checklist.length > 0 ? (
              checklist.map((item, idx) => (
                <li key={item.id || idx} className="mb-1 text-gray-800">
                  {item.text}
                </li>
              ))
            ) : (
              <li className="text-gray-400 italic">No checklist items found.</li>
            )}
          </ul>
        )}
      </div>

      {/* Supervisor Action Form */}
      <div className="border-t pt-6">
        <h3 className="text-lg font-bold text-[#0E2F4B] mb-4">Supervisor Action</h3>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Action By */}
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700">
              Action By <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={actionBy}
              onChange={e => setActionBy(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter your name"
              required
            />
          </div>

          {/* Vendor Details */}
          <div className="grid grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700">
                Vendor Name
              </label>
              <input
                type="text"
                value={vendor.name}
                onChange={e => setVendor(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Vendor name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700">
                Vendor Email
              </label>
              <input
                type="email"
                value={vendor.email}
                onChange={e => setVendor(prev => ({ ...prev, email: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="vendor@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700">
                Vendor Phone
              </label>
              <input
                type="tel"
                value={vendor.phone}
                onChange={e => setVendor(prev => ({ ...prev, phone: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="+1234567890"
              />
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700">
              Status <span className="text-red-500">*</span>
            </label>
            <select
              value={status}
              onChange={e => setStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Select status</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="pending">Pending</option>
              <option value="aborted">Aborted</option>
            </select>
          </div>

          {/* Note */}
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700">
              Note {status === "aborted" && <span className="text-red-500">*</span>}
            </label>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows="4"
              placeholder="Enter any additional notes..."
              required={status === "aborted"}
            />
          </div>

          {/* Submit Button */}
          <div className="flex gap-4">
            <button
              type="submit"
              className="px-6 py-2 bg-[#0E2F4B] text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Submit Supervisor Action
            </button>
            <button
              type="button"
              onClick={() => navigate("/supervisor-approval")}
              className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}