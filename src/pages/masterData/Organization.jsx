import React, { useEffect, useState } from "react";
import { Maximize, Minimize, Pencil, Trash2 } from "lucide-react";
import API from "../../lib/axios";
import { toast } from "react-hot-toast";
import { useNavigation } from "../../hooks/useNavigation";
import useAuditLog from "../../hooks/useAuditLog";
import { ORGANIZATIONS_APP_ID } from "../../constants/organizationsAuditEvents";
import { useLanguage } from "../../contexts/LanguageContext";

const Organization = () => {
  const [orgs, setOrgs] = useState([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState(null);
  const [formName, setFormName] = useState("");
  const [formCode, setFormCode] = useState("");
  const [formCity, setFormCity] = useState("");
  // Add validation state
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  
  // Access control
  const { hasEditAccess } = useNavigation();
  const canEdit = hasEditAccess('ORGANIZATIONS');

  // Initialize audit logging
  const { recordActionByNameWithFetch } = useAuditLog(ORGANIZATIONS_APP_ID);
  
  // Language context
  const { t } = useLanguage();

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
    setSubmitAttempted(false); // Reset submit attempt
  };

  // Validation helper function
  const isFieldInvalid = (value) => {
    return submitAttempted && !value.trim();
  };

  // Add or update organization
  const handleCreateOrUpdate = async () => {
    setSubmitAttempted(true);
    // Validation
    if (!formName.trim()) {
      toast.error(t('organizations.organizationNameRequired'));
      return;
    }
    if (!formCode.trim()) {
      toast.error(t('organizations.organizationCodeRequired'));
      return;
    }
    if (!formCity.trim()) {
      toast.error(t('organizations.organizationCityRequired'));
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
        
        // Log update action
        await recordActionByNameWithFetch('Update', {
          orgId: selectedOrg.org_id,
          orgName: formName.trim(),
          orgCode: formCode.trim(),
          orgCity: formCity.trim(),
          action: 'Organization Updated'
        });
        
        toast.success(t('organizations.organizationUpdatedSuccessfully', { name: formName }));
        setShowEditModal(false);
      } else {
        // Add
        const response = await API.post("/orgs", {
          org_code: formCode.trim(),
          org_name: formName.trim(),
          org_city: formCity.trim(),
        });
        
        // Log create action
        await recordActionByNameWithFetch('Create', {
          orgId: response.data?.org_id || 'NEW_ORG',
          orgName: formName.trim(),
          orgCode: formCode.trim(),
          orgCity: formCity.trim(),
          action: 'Organization Created'
        });
        
        toast.success(t('organizations.organizationCreatedSuccessfully', { name: formName }));
      }
      resetForm();
      fetchOrgs();
    } catch (err) {
      console.error("Error:", err);
      const errorMessage = err.response?.data?.message || err.message || "An error occurred";
      toast.error(`${t('organizations.failedToCreateOrganization', { action: selectedOrg ? t('common.update') : t('common.create') })}: ${errorMessage}`);
    }
  };

  // Edit handler
  const handleEdit = (org) => {
    setSelectedOrg(org);
    setShowEditModal(true);
    setFormName(org.org_name || org.name || org.text || "");
    setFormCode(org.org_code || org.code || "");
    setFormCity(org.org_city || org.city || "");
    setSubmitAttempted(false); // Reset submit attempt for edit
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
      toast.success(t('organizations.organizationDeletedSuccessfully', { name: selectedOrg.org_name || selectedOrg.name || selectedOrg.text }));
    } catch (err) {
      console.error("Delete error:", err);
      
      // Handle specific foreign key constraint errors
      if (err.response?.data?.error === "Cannot delete organization") {
        const hint = err.response?.data?.hint || "";
        toast.error(
          `${err.response?.data?.message || t('organizations.cannotDeleteOrganization')}. ${hint}`,
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
        toast.error(`${t('organizations.failedToDeleteOrganization')}: ${errorMessage}`);
      }
    }
  };

  return (
    <div className="flex">
      <div className="flex-1 p-6 bg-gray-100 relative">
        {/* Add / Modify - Only show for users with edit access */}
        {canEdit && (
          <div className="bg-white rounded shadow mb-6">
            <div className="bg-[#EDF3F7] px-4 py-2 rounded-t text-[#0E2F4B] font-semibold text-sm">
              {t('organizations.addOrganization')}
            </div>
          <div className="p-4 flex gap-4">
            <div className="flex flex-col">
              <label className="text-sm font-medium mb-1">
                {t('organizations.organizationName')} <span className="text-red-500">*</span>
              </label>
              <input
                className={`border px-3 py-2 rounded w-64 text-sm ${isFieldInvalid(formName) ? 'border-red-500' : 'border-gray-300'}`}
                placeholder={t('organizations.organizationName')}
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
              />
            </div>
            <div className="flex flex-col">
              <label className="text-sm font-medium mb-1">
                {t('organizations.organizationCode')} <span className="text-red-500">*</span>
              </label>
              <input
                className={`border px-3 py-2 rounded w-64 text-sm ${isFieldInvalid(formCode) ? 'border-red-500' : 'border-gray-300'}`}
                placeholder={t('organizations.organizationCode')}
                value={formCode}
                onChange={(e) => setFormCode(e.target.value)}
              />
            </div>
            <div className="flex flex-col">
              <label className="text-sm font-medium mb-1">
                {t('organizations.organizationCity')} <span className="text-red-500">*</span>
              </label>
              <input
                className={`border px-3 py-2 rounded w-64 text-sm ${isFieldInvalid(formCity) ? 'border-red-500' : 'border-gray-300'}`}
                placeholder={t('organizations.organizationCity')}
                value={formCity}
                onChange={(e) => setFormCity(e.target.value)}
              />
            </div>
            <button
              className="bg-[#0E2F4B] text-white px-4 py-2 rounded text-sm self-end"
              onClick={handleCreateOrUpdate}
            >
              {t('common.add')}
            </button>
          </div>
        </div>
        )}

        {/* Organization List */}
        <div
          className={`bg-white rounded shadow transition-all duration-300 ${
            isMaximized ? "fixed inset-0 z-50 p-6 m-6 overflow-auto" : ""
          }`}
        >
          <div className="bg-white rounded shadow">
            <div className="bg-[#EDF3F7] px-4 py-2 rounded-t text-[#0E2F4B] font-semibold text-sm flex items-center justify-between">
              {t('organizations.organizationList')}
              <button onClick={toggleMaximize}>
                {isMaximized ? (
                  <Minimize className="text-[#0E2F4B]" size={18} />
                ) : (
                  <Maximize className="text-[#0E2F4B]" size={18} />
                )}
              </button>
            </div>

            <div className="bg-[#0E2F4B] text-white text-sm overflow-hidden">
              <div className={`grid px-4 py-2 font-semibold border-b-4 border-yellow-400 ${canEdit ? 'grid-cols-4' : 'grid-cols-3'}`}>
                <div>{t('organizations.name')}</div>
                <div>{t('organizations.code')}</div>
                <div>{t('organizations.city')}</div>
                {canEdit && <div className="text-center">{t('common.actions')}</div>}
              </div>
              <div
                className={`${
                  isMaximized ? "max-h-[60vh] overflow-y-auto" : ""
                }`}
              >
                {orgs.map((org, i) => (
                  <div
                    key={org.org_id || org.id || i}
                    className={`grid px-4 py-2 items-center border-b ${canEdit ? 'grid-cols-4' : 'grid-cols-3'} ${
                      i % 2 === 0 ? "bg-white" : "bg-gray-100"
                    } text-gray-800`}
                  >
                    <div>{org.org_name || org.name || org.text}</div>
                    <div>{org.org_code || org.code}</div>
                    <div>{org.org_city || org.city}</div>
                    {canEdit && (
                      <div className="flex justify-center gap-4">
                        <button onClick={() => handleEdit(org)}>
                          <Pencil className="text-[#0E2F4B]" size={18} />
                        </button>
                        <button onClick={() => triggerDelete(org)}>
                          <Trash2 className="text-yellow-500" size={18} />
                        </button>
                      </div>
                    )}
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
                <span>{t('organizations.updateOrganization')}</span>
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
                  <label className="text-sm font-medium">{t('organizations.organizationId')}</label>
                  <input
                    value={selectedOrg?.org_id}
                    className="border px-3 py-2 rounded w-full mt-1 bg-gray-100"
                    disabled
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1">
                    {t('organizations.organizationName')} <span className="text-red-500">*</span>
                  </label>
                  <input
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className={`border px-3 py-2 rounded w-full mt-1 ${isFieldInvalid(formName) ? 'border-red-500' : 'border-gray-300'}`}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1">
                    {t('organizations.organizationCode')} <span className="text-red-500">*</span>
                  </label>
                  <input
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value)}
                    className={`border px-3 py-2 rounded w-full mt-1 ${isFieldInvalid(formCode) ? 'border-red-500' : 'border-gray-300'}`}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1">
                    {t('organizations.organizationCity')} <span className="text-red-500">*</span>
                  </label>
                  <input
                    value={formCity}
                    onChange={(e) => setFormCity(e.target.value)}
                    className={`border px-3 py-2 rounded w-full mt-1 ${isFieldInvalid(formCity) ? 'border-red-500' : 'border-gray-300'}`}
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
                    {t('common.close')}
                  </button>
                  <button
                    className="bg-yellow-400 px-4 py-1 rounded"
                    onClick={handleCreateOrUpdate}
                  >
                    {t('common.update')}
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
                <span>{t('organizations.confirmDelete')}</span>
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="text-yellow-400 text-xl font-bold"
                >
                  ×
                </button>
              </div>
              <div className="h-[3px] bg-yellow-400" />
              <div className="px-6 py-6 text-center text-gray-800 text-sm">
                {t('organizations.deleteOrganizationConfirm')} <strong>"{selectedOrg.org_name || selectedOrg.name || selectedOrg.text}"</strong>?
              </div>
              <div className="flex justify-end gap-3 px-6 pb-6">
                <button
                  className="bg-gray-300 hover:bg-gray-400 text-gray-700 text-sm font-medium py-1.5 px-5 rounded"
                  onClick={() => setShowDeleteModal(false)}
                >
                  {t('common.close')}
                </button>
                <button
                  className="bg-yellow-400 hover:bg-yellow-500 text-white text-sm font-medium py-1.5 px-5 rounded"
                  onClick={confirmDelete}
                >
                  {t('common.delete')}
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
