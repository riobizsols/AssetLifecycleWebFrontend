import React, { useEffect, useState } from "react";
import { Maximize, Minimize, Pencil, Trash2 } from "lucide-react";
import API from "../../lib/axios";
import { toast } from "react-hot-toast";

const Organization = () => {
  const [orgs, setOrgs] = useState([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState(null);
  const [formName, setFormName] = useState("");
  const [formCode, setFormCode] = useState("");
  const [formCity, setFormCity] = useState("");
  const [isMaximized, setIsMaximized] = useState(false);

  const toggleMaximize = () => setIsMaximized((p) => !p);

  useEffect(() => {
    document.body.style.overflow = isMaximized ? "hidden" : "auto";
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [isMaximized]);

  // Fetch organizations from /orgs
  const fetchOrgs = async () => {
    try {
      const res = await API.get("/orgs");
      setOrgs(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Fetch error:", err);
      setOrgs([]);
    }
  };

  useEffect(() => {
    fetchOrgs();
  }, []);

  const resetForm = () => {
    setFormName("");
    setFormCode("");
    setFormCity("");
    setSelectedOrg(null);
  };

  // Add or update organization
  const handleCreateOrUpdate = async () => {
    // Validation
    if (!formName.trim()) {
      toast.error("Organization name is required");
      return;
    }
    if (!formCode.trim()) {
      toast.error("Organization code is required");
      return;
    }
    if (!formCity.trim()) {
      toast.error("Organization city is required");
      return;
    }

    try {
      if (selectedOrg) {
        // Update
        await API.put("/orgs", {
          org_id: selectedOrg.org_id, // org_id is a string like 'ORG001'
          org_code: formCode.trim(),
          org_name: formName.trim(),
          org_city: formCity.trim(),
        });
        toast.success(`Organization "${formName}" updated successfully`);
      } else {
        // Add
        await API.post("/orgs", {
          org_code: formCode.trim(),
          org_name: formName.trim(),
          org_city: formCity.trim(),
        });
        toast.success(`Organization "${formName}" created successfully`);
      }
      resetForm();
      fetchOrgs();
    } catch (err) {
      console.error("Error:", err);
      const errorMessage = err.response?.data?.message || err.message || "An error occurred";
      toast.error(`Failed to ${selectedOrg ? 'update' : 'create'} organization: ${errorMessage}`);
    }
  };

  // Edit handler
  const handleEdit = (org) => {
    setSelectedOrg(org);
    setShowEditModal(true);
    setFormName(org.org_name || org.name || org.text || "");
    setFormCode(org.org_code || org.code || "");
    setFormCity(org.org_city || org.city || "");
  };

  // Delete handler
  const triggerDelete = (org) => {
    setSelectedOrg(org);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    try {
      await API.delete("/orgs", {
        data: { org_id: selectedOrg.org_id },
      });
      setShowDeleteModal(false);
      resetForm();
      fetchOrgs();
      toast.success(`Organization "${selectedOrg.org_name || selectedOrg.name || selectedOrg.text}" deleted successfully`);
    } catch (err) {
      console.error("Delete error:", err);
      
      // Handle specific foreign key constraint errors
      if (err.response?.data?.error === "Cannot delete organization") {
        const hint = err.response?.data?.hint || "";
        toast.error(
          `${err.response?.data?.message || "Cannot delete organization"}. ${hint}`,
          {
            duration: 6000,
            style: {
              borderRadius: '8px',
              background: '#7F1D1D',
              color: '#fff',
            },
          }
        );
      } else {
        const errorMessage = err.response?.data?.message || err.message || "An error occurred";
        toast.error(`Failed to delete organization: ${errorMessage}`);
      }
    }
  };

  return (
    <div className="flex">
      <div className="flex-1 p-6 bg-gray-100 relative">
        {/* Add / Modify */}
        <div className="bg-white rounded shadow mb-6">
          <div className="bg-[#EDF3F7] px-4 py-2 rounded-t text-[#0E2F4B] font-semibold text-sm">
            Add Organization
          </div>
          <div className="p-4 flex gap-4">
            <input
              className="border px-3 py-2 rounded w-64 text-sm"
              placeholder="Organization Name"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
            />
            <input
              className="border px-3 py-2 rounded w-64 text-sm"
              placeholder="Organization Code"
              value={formCode}
              onChange={(e) => setFormCode(e.target.value)}
            />
            <input
              className="border px-3 py-2 rounded w-64 text-sm"
              placeholder="Organization City"
              value={formCity}
              onChange={(e) => setFormCity(e.target.value)}
            />
            <button
              className="bg-[#0E2F4B] text-white px-4 py-2 rounded text-sm"
              onClick={() => {
                handleCreateOrUpdate();
                resetForm();
              }}
            >
              Add
            </button>
          </div>
        </div>

        {/* Organization List */}
        <div
          className={`bg-white rounded shadow transition-all duration-300 ${
            isMaximized ? "fixed inset-0 z-50 p-6 m-6 overflow-auto" : ""
          }`}
        >
          <div className="bg-white rounded shadow">
            <div className="bg-[#EDF3F7] px-4 py-2 rounded-t text-[#0E2F4B] font-semibold text-sm flex items-center justify-between">
              Organization List
              <button onClick={toggleMaximize}>
                {isMaximized ? (
                  <Minimize className="text-[#0E2F4B]" size={18} />
                ) : (
                  <Maximize className="text-[#0E2F4B]" size={18} />
                )}
              </button>
            </div>

            <div className="bg-[#0E2F4B] text-white text-sm overflow-hidden">
              <div className="grid grid-cols-4 px-4 py-2 font-semibold border-b-4 border-yellow-400">
                <div>Name</div>
                <div>Code</div>
                <div>City</div>
                <div className="text-center">Actions</div>
              </div>
              <div
                className={`${
                  isMaximized ? "max-h-[60vh] overflow-y-auto" : ""
                }`}
              >
                {orgs.map((org, i) => (
                  <div
                    key={org.org_id || org.id || i}
                    className={`grid grid-cols-4 px-4 py-2 items-center border-b ${
                      i % 2 === 0 ? "bg-white" : "bg-gray-100"
                    } text-gray-800`}
                  >
                    <div>{org.org_name || org.name || org.text}</div>
                    <div>{org.org_code || org.code}</div>
                    <div>{org.org_city || org.city}</div>
                    <div className="flex justify-center gap-4">
                      <button onClick={() => handleEdit(org)}>
                        <Pencil className="text-[#0E2F4B]" size={18} />
                      </button>
                      <button onClick={() => triggerDelete(org)}>
                        <Trash2 className="text-yellow-500" size={18} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Edit Modal */}
        {showEditModal && selectedOrg && (
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white w-[500px] rounded shadow-lg">
              <div className="bg-[#003b6f] text-white font-semibold px-6 py-3 flex justify-between items-center rounded-t">
                <span>Update Organization</span>
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    resetForm();
                  }}
                  className="text-yellow-400 text-xl font-bold"
                >
                  ×
                </button>
              </div>
              <div className="h-[3px] bg-yellow-400" />
              <div className="px-6 py-6 space-y-4">
                <div>
                  <label className="text-sm font-medium">Organization ID</label>
                  <input
                    value={selectedOrg?.org_id}
                    className="border px-3 py-2 rounded w-full mt-1 bg-gray-100"
                    disabled
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Organization Name</label>
                  <input
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="border px-3 py-2 rounded w-full mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Organization Code</label>
                  <input
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value)}
                    className="border px-3 py-2 rounded w-full mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Organization City</label>
                  <input
                    value={formCity}
                    onChange={(e) => setFormCity(e.target.value)}
                    className="border px-3 py-2 rounded w-full mt-1"
                  />
                </div>
                <div className="flex justify-end gap-4 mt-6">
                  <button
                    className="bg-gray-300 px-4 py-1 rounded"
                    onClick={() => {
                      setShowEditModal(false);
                      resetForm();
                    }}
                  >
                    Close
                  </button>
                  <button
                    className="bg-yellow-400 px-4 py-1 rounded"
                    onClick={() => {
                      handleCreateOrUpdate();
                      setShowEditModal(false);
                      resetForm();
                    }}
                  >
                    Update
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        {/* Delete Modal */}
        {showDeleteModal && selectedOrg && (
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white w-[500px] rounded shadow-lg">
              <div className="bg-[#003b6f] text-white font-semibold px-6 py-3 flex justify-between items-center rounded-t">
                <span>Confirm Delete</span>
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="text-yellow-400 text-xl font-bold"
                >
                  ×
                </button>
              </div>
              <div className="h-[3px] bg-yellow-400" />
              <div className="px-6 py-6 text-center text-gray-800 text-sm">
                Delete organization <strong>“{selectedOrg.org_name || selectedOrg.name || selectedOrg.text}”</strong>?
              </div>
              <div className="flex justify-end gap-3 px-6 pb-6">
                <button
                  className="bg-gray-300 hover:bg-gray-400 text-gray-700 text-sm font-medium py-1.5 px-5 rounded"
                  onClick={() => setShowDeleteModal(false)}
                >
                  Close
                </button>
                <button
                  className="bg-yellow-400 hover:bg-yellow-500 text-white text-sm font-medium py-1.5 px-5 rounded"
                  onClick={confirmDelete}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Organization;
