import React, { useState } from "react";
import { Maximize, Minimize, Trash2, History } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import API from '../../lib/axios';
import AssetAssignmentHistory from "./AssetAssignmentHistory";
import useAuditLog from '../../hooks/useAuditLog';
import { DEPT_ASSIGNMENT_APP_ID } from '../../constants/deptAssignmentAuditEvents';
import { EMP_ASSIGNMENT_APP_ID } from '../../constants/empAssignmentAuditEvents';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNavigation } from '../../hooks/useNavigation';

const AssetAssignmentList = ({
  title,
  entityType, // 'department' or 'employee'
  entities,
  selectedEntity,
  selectedEntityIntId,
  onEntitySelect,
  onDelete, // eslint-disable-line no-unused-vars
  assignmentList,
  fetchAssignments,
  // Department filter props
  showDepartmentFilter = false,
  departments = [],
  selectedDepartment = null,
  onDepartmentSelect = () => {},
  onDepartmentChange = () => {}, // Callback to fetch department's employees
}) => {
  const [isMaximized, setIsMaximized] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const navigate = useNavigate();
  const { t } = useLanguage();

  // Initialize audit logging based on entity type
  const appId = entityType === 'employee' ? EMP_ASSIGNMENT_APP_ID : DEPT_ASSIGNMENT_APP_ID;
  const { recordActionByNameWithFetch } = useAuditLog(appId);

  // Get access level for read-only check
  const { getAccessLevel } = useNavigation();
  const accessLevel = getAccessLevel(appId);
  const isReadOnly = accessLevel === 'D';

  const toggleMaximize = () => setIsMaximized((prev) => !prev);

  const handleDelete = (item) => {
    setItemToDelete(item);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    try {
      // Build payload for unassignment
      const payload = {
        dept_id: itemToDelete.dept_id || selectedEntity,
        asset_id: itemToDelete.asset_id,
        org_id: itemToDelete.org_id,
        action: 'C',
        latest_assignment_flag: false
      };
      // Only include employee_int_id for employee assignments
      if (entityType === 'employee' && itemToDelete.employee_int_id) {
        payload.employee_int_id = itemToDelete.employee_int_id;
      }
      await API.put(`/asset-assignments/${itemToDelete.asset_assign_id}`, payload);
      
      // Log unassign action after successful unassignment
      const auditData = {
        assetId: itemToDelete.asset_id,
        action: entityType === 'employee' ? 'Asset Unassigned from Employee' : 'Asset Unassigned from Department'
      };
      
      if (entityType === 'employee') {
        auditData.employeeId = itemToDelete.employee_id || selectedEntity;
        auditData.employeeIntId = itemToDelete.employee_int_id;
        auditData.deptId = itemToDelete.dept_id;
      } else {
        auditData.deptId = itemToDelete.dept_id || selectedEntity;
      }
      
      await recordActionByNameWithFetch('Unassign', auditData);
      
      fetchAssignments();
      setShowDeleteModal(false);
      toast.success(t('departments.assetUnassignedSuccessfully'));
    } catch (err) {
      console.error('Failed to unassign asset', err);
      const errorMessage = err.response?.data?.message || err.response?.data?.error || err.message || 'An error occurred';
      toast.error(`${t('departments.failedToUnassignAsset')}: ${errorMessage}`);
    }
  };

  // Corrected: Directly use selectedEntity for departmentId
  const departmentId = selectedEntity;

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      {/* Selection Section */}
      <div className="bg-white rounded shadow mb-4">
        <div className="bg-[#EDF3F7] px-4 py-2 rounded-t text-[#0E2F4B] font-semibold text-sm">
          {showDepartmentFilter ? t('departments.selectDepartmentAndEmployee') : t('departments.departmentSelection')}
        </div>
        <div className="p-4 flex gap-4 items-end">
          {/* Department Filter Dropdown (Only for Employee view) */}
          {showDepartmentFilter && (
            <div className="w-64">
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('common.department')}</label>
              <select
                className="border px-3 py-2 text-sm w-full bg-white text-black focus:outline-none rounded"
                value={selectedDepartment || ""}
                onChange={(e) => {
                  onDepartmentSelect(e.target.value);
                  onDepartmentChange(e.target.value);
                }}
              >
                <option value="">{t('departments.selectDepartment')}</option>
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          
          {/* Entity Dropdown */}
          {(!showDepartmentFilter || (showDepartmentFilter && selectedDepartment)) && (
            <div className="w-64">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {entityType === 'department' ? t('common.department') : t('employees.title')}
              </label>
              <select
                className="border px-3 py-2 text-sm w-full bg-white text-black focus:outline-none rounded"
                value={selectedEntity || ""}
                onChange={(e) => onEntitySelect(e.target.value)}
              >
                <option value="">
                  {entityType === 'department' ? t('departments.selectDepartment') : t('employees.selectEmployee')}
                </option>
                {entities.map((entity) => (
                  <option key={entity.id} value={entity.id}>
                    {entity.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {!isReadOnly && (
            <div className="flex gap-2">
              <button
                className="bg-[#0E2F4B] text-white px-4 py-2 rounded text-sm disabled:opacity-50 flex items-center gap-2"
                onClick={() => navigate('/asset-selection', {     
                  state: { 
                    entityId: selectedEntity,
                    entityIntId: selectedEntityIntId,
                    entityType: entityType,
                    departmentId: selectedDepartment
                  } 
                })}
                disabled={!selectedEntity || (showDepartmentFilter && !selectedDepartment)}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                {t('employees.assignAsset')}
              </button>
            </div>
          )}
        </div>
      </div>
      
      {/* Asset Assignment List Table */}
      <div
        className={`bg-white rounded shadow transition-all duration-300 ${
          isMaximized ? "fixed inset-0 z-50 p-6 m-6 overflow-auto" : ""
        }`}
      >
        <div className="bg-white rounded shadow">
          <div className="bg-[#EDF3F7] px-4 py-2 rounded-t text-[#0E2F4B] font-semibold text-sm flex items-center justify-between">
            <div className="flex items-center gap-3 w-full justify-between">
              <span>{title || 'Current Assets List'}</span>
              <div className="flex items-center gap-2">
                {(entityType === 'employee' || entityType === 'department') && selectedEntity && (
                  <button
                    onClick={async () => {
                      // Log history view action
                      const auditData = {
                        action: `${entityType === 'department' ? 'Department' : 'Employee'} Assignment History Viewed`
                      };
                      
                      if (entityType === 'department') {
                        auditData.deptId = selectedEntity;
                      } else {
                        auditData.employeeId = selectedEntity;
                        auditData.employeeIntId = selectedEntityIntId;
                      }
                      
                      await recordActionByNameWithFetch('History', auditData);
                      setShowHistory(true);
                    }}
                    className="flex items-center gap-1 px-4 py-2 rounded-lg bg-white/30 backdrop-blur-md border border-white/40 shadow-sm text-[#0E2F4B] font-semibold hover:bg-white/50 transition"
                    style={{ boxShadow: '0 4px 24px 0 rgba(30, 41, 59, 0.08)' }}
                  >
                    <History size={18} className="opacity-80" />
                    <span className="text-sm">{t('employees.history')}</span>
                  </button>
                )}
                <button onClick={toggleMaximize} className="ml-2">
                  {isMaximized ? (
                    <Minimize className="text-[#0E2F4B]" size={18} />
                  ) : (
                    <Maximize className="text-[#0E2F4B]" size={18} />
                  )}
                </button>
              </div>
            </div>
          </div>
          {entityType === 'department' ? (
            <div className="bg-[#0E2F4B] text-white text-sm overflow-hidden">
              <div className={`grid ${isReadOnly ? 'grid-cols-7' : 'grid-cols-8'} px-4 py-2 font-semibold border-b-4 border-yellow-400`}>
                <div>{t('assets.assetId')}</div>
                <div>{t('employees.departmentId')}</div>
                <div>{t('employees.assetTypeName')}</div>
                <div>{t('assets.description')}</div>
                <div>{t('employees.action')}</div>
                <div>{t('employees.assignmentDate')}</div>
                <div>{t('employees.assignedBy')}</div>
                {!isReadOnly && <div className="text-center">{t('common.actions')}</div>}
              </div>
              {assignmentList.length === 0 ? (
                <div className="px-4 py-6 text-center text-gray-500 col-span-8 bg-white rounded-b">{t('employees.noAssetsAssigned')}</div>
              ) : (
                <div className={`${isMaximized ? "max-h-[60vh] overflow-y-auto" : ""}`}> 
                  {assignmentList.map((item, i) => (
                    <div
                      key={item.asset_assign_id || `${item.asset_id}_${i}`}
                      className={`grid ${isReadOnly ? 'grid-cols-7' : 'grid-cols-8'} px-4 py-2 items-center border-b ${
                        i % 2 === 0 ? "bg-white" : "bg-gray-100"
                      } text-gray-800`}
                    >
                      <div>{item.asset_id}</div>
                      <div>{departmentId || '-'}</div>
                      <div>{item.asset_type_name || '-'}</div>
                      <div>{item.description || '-'}</div>
                      <div>{item.action || '-'}</div>
                      <div>{item.action_on ? new Date(item.action_on).toLocaleString() : '-'}</div>
                      <div>{item.action_by || '-'}</div>
                      {!isReadOnly && (
                        <div className="flex justify-center">
                          <button
                            className="bg-yellow-400 hover:bg-yellow-500 text-white text-xs font-semibold py-1 px-3 rounded shadow"
                            onClick={() => handleDelete(item)}
                          >
                            {t('employees.unassign')}
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="bg-[#0E2F4B] text-white text-sm overflow-hidden">
              <div className={`grid ${isReadOnly ? 'grid-cols-7' : 'grid-cols-8'} px-4 py-2 font-semibold border-b-4 border-yellow-400`}>
                <div>{t('assets.assetId')}</div>
                <div>{t('employees.departmentId')}</div>
                <div>{t('employees.orgId')}</div>
                <div>{t('employees.employeeIntId')}</div>
                <div>{t('employees.action')}</div>
                <div>{t('employees.assignmentDate')}</div>
                <div>{t('employees.assignedBy')}</div>
                {!isReadOnly && <div className="text-center">{t('common.actions')}</div>}
              </div>
              {assignmentList.length === 0 && (
                <div className="px-4 py-6 text-center text-gray-500 col-span-7 bg-white rounded-b">
                  {t('employees.noAssetsAssigned')}
                </div>
              )}
              <div className={`${isMaximized ? "max-h-[60vh] overflow-y-auto" : ""}`}> 
                {assignmentList.map((item, i) => (
                  <div
                    key={item.asset_assign_id || `${item.asset_id}_${i}`}
                    className={`grid ${isReadOnly ? 'grid-cols-7' : 'grid-cols-8'} px-4 py-2 items-center border-b ${
                      i % 2 === 0 ? "bg-white" : "bg-gray-100"
                    } text-gray-800`}
                  >
                    <div>{item.asset_id}</div>
                    <div>{item.dept_id}</div>
                    <div>{item.org_id}</div>
                    <div>{item.employee_int_id}</div>
                    <div>{item.action}</div>
                    <div>{item.action_on ? new Date(item.action_on).toLocaleString() : ''}</div>
                    <div>{item.action_by}</div>
                    {!isReadOnly && (
                      <div className="flex justify-center">
                        <button
                          className="bg-yellow-400 hover:bg-yellow-500 text-white text-xs font-semibold py-1 px-3 rounded shadow"
                          onClick={() => handleDelete(item)}
                        >
                          {t('employees.unassign')}
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Delete Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white w-[500px] rounded shadow-lg">
            <div className="bg-[#003b6f] text-white font-semibold px-6 py-3 flex justify-between items-center rounded-t">
              <span>{t('employees.confirmUnassignment')}</span>
              <button
                onClick={() => setShowDeleteModal(false)}
                className="text-yellow-400 text-xl font-bold"
              >
                ×
              </button>
            </div>
            <div className="h-[3px] bg-yellow-400" />
            <div className="px-6 py-6 text-center text-gray-800 text-sm">
              {t('employees.confirmUnassignmentMessage')}
            </div>
            <div className="flex justify-end gap-3 px-6 pb-6">
              <button
                className="bg-gray-300 hover:bg-gray-400 text-gray-700 text-sm font-medium py-1.5 px-5 rounded"
                onClick={() => setShowDeleteModal(false)}
              >
                {t('common.cancel')}
              </button>
              <button
                className="bg-yellow-400 hover:bg-yellow-500 text-white text-sm font-medium py-1.5 px-5 rounded"
                onClick={confirmDelete}
              >
                {t('employees.unassign')}
              </button>
            </div>
          </div>
        </div>
      )}
      {showHistory && (
        <AssetAssignmentHistory 
          onClose={() => setShowHistory(false)} 
          employeeIntId={entityType === 'employee' ? selectedEntityIntId : null}
          deptId={entityType === 'department' ? selectedEntity : null}
          type={entityType}
        />
      )}
    </div>
  );
};

export default AssetAssignmentList;