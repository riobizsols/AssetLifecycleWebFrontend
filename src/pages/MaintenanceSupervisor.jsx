import React, { useState, useEffect } from "react";
import { CheckCircle } from "lucide-react";
import API from "../lib/axios";

export default function MaintenanceSupervisor() {
  const [checklist, setChecklist] = useState([]);
  const [loadingChecklist, setLoadingChecklist] = useState(true);
  const [actionBy, setActionBy] = useState("");
  const [vendor, setVendor] = useState({ name: "", email: "", phone: "" });
  const [status, setStatus] = useState("");
  const [note, setNote] = useState("");
  const [submitAttempted, setSubmitAttempted] = useState(false);

  useEffect(() => {
    setLoadingChecklist(true);
    API.get("/api/maintenance/checklist") // Replace with your endpoint
      .then(res => setChecklist(res.data))
      .catch(() => setChecklist([]))
      .finally(() => setLoadingChecklist(false));
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitAttempted(true);
    if (status === "aborted" && !note.trim()) return;
    API.post("/api/maintenance/supervisor-action", {
      actionBy,
      vendor,
      status,
      note,
    })
      .then(() => alert("Submitted!"))
      .catch(() => alert("Failed to submit!"));
  };

  return (
    <div className="max-w-7xl mx-auto min-h-[600px] overflow-y-auto p-8 bg-white md:rounded shadow-lg mt-155">
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

      {/* Action By */}
      <div className="mb-6">
        <label className="block text-sm font-medium mb-1 text-gray-700">
          Action By
        </label>
        <input
          type="text"
          value={actionBy}
          onChange={e => setActionBy(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
          placeholder="Enter your name"
        />
      </div>

      {/* Vendor Details */}
      <div className="mb-6 grid grid-cols-3 gap-6">
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-700">
            Vendor Name
          </label>
          <input
            type="text"
            value={vendor.name}
            onChange={e => setVendor(v => ({ ...v, name: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-700">
            Vendor Email
          </label>
          <input
            type="email"
            value={vendor.email}
            onChange={e => setVendor(v => ({ ...v, email: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-700">
            Vendor Phone
          </label>
          <input
            type="text"
            value={vendor.phone}
            onChange={e => setVendor(v => ({ ...v, phone: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
          />
        </div>
      </div>

      {/* Status Dropdown */}
      <div className="mb-8">
        <label className="block text-sm font-medium mb-1 text-gray-700">
          Status
        </label>
        <select
          value={status}
          onChange={e => setStatus(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
        >
          <option value="">Select status</option>
          <option value="completed">Completed</option>
          <option value="aborted">Aborted</option>
        </select>
      </div>

      {/* Note (if aborted) */}
      {status === "aborted" && (
        <div className="mb-8">
          <label className="block text-sm font-medium mb-1 text-gray-700">
            Note <span className="text-red-500">*</span>
          </label>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            className={`w-full px-3 py-2 border rounded text-sm ${submitAttempted && !note.trim() ? "border-red-500" : "border-gray-300"}`}
            placeholder="Please provide a reason for aborting..."
            rows={3}
          />
          {submitAttempted && !note.trim() && (
            <div className="text-red-500 text-xs mt-1">Note is required to abort.</div>
          )}
        </div>
      )}

      {/* Submit Button */}
      <div className="flex justify-end">
        <button
          className="px-6 py-2 bg-[#0E2F4B] text-white rounded font-semibold hover:bg-[#14395c] transition"
          onClick={handleSubmit}
        >
          Submit
        </button>
      </div>
    </div>
  );
}