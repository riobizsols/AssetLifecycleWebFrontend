import React, { useState, useEffect } from 'react';
import API from '../../lib/axios';
import toast from 'react-hot-toast';
import { useNavigate, useParams, useLocation, useSearchParams } from 'react-router-dom';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuthStore } from '../../store/useAuthStore';

const AssetsDetail = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { user } = useAuthStore();
  const [assetDetails, setAssetDetails] = useState(null);
  // Get asset_id from URL params
  const { asset_id } = useParams();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { employee_int_id, dept_id, org_id, hideAssign, backTo, selectedAssetType, context, entityId } = location.state || {};
  
  // Get context from URL query params (DEPTASSIGNMENT or EMPASSIGNMENT)
  const contextFromUrl = searchParams.get('context') || context;
  
  // Resolve org_id and dept_id with fallbacks
  const resolvedOrgId = org_id || user?.org_id;
  const resolvedDeptId = dept_id || entityId; // For department assignments, entityId is the dept_id

  // Helper to generate a unique assignment ID
  const generateUniqueId = () => `AA${Date.now()}`;

  // Helper function to translate field names
  const translateFieldName = (key) => {
    const fieldMap = {
      'asset_type_id': t('assetsDetail.assetTypeId'),
      'asset_id': t('assetsDetail.assetId'),
      'text': t('assetsDetail.text'),
      'serial_number': t('assetsDetail.serialNumber'),
      'description': t('assetsDetail.description'),
      'purchase_vendor_id': t('assetsDetail.purchaseVendorId'),
      'service_vendor_id': t('assetsDetail.serviceVendorId'),
      'maintsch_id': t('assetsDetail.maintschId'),
      'purchased_cost': t('assetsDetail.purchasedCost'),
      'purchased_on': t('assetsDetail.purchasedOn'),
      'purchased_by': t('assetsDetail.purchasedBy'),
      'expiry_date': t('assetsDetail.expiryDate'),
      'warranty_period': t('assetsDetail.warrantyPeriod'),
      'parent_asset_id': t('assetsDetail.parentAssetId'),
      'group_id': t('assetsDetail.groupId'),
      'asset_type_name': t('assetsDetail.assetTypeName'),
      'properties': t('assetsDetail.properties')
    };
    return fieldMap[key] || key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const handleAssignAsset = async () => {
    // Check if this is a department assignment (no employee_int_id required)
    const isDepartmentAssignment = contextFromUrl === 'DEPTASSIGNMENT';
    
    // Use resolved values
    const finalDeptId = resolvedDeptId;
    const finalOrgId = resolvedOrgId;
    
    // Debug logging
    console.log('[AssetsDetail] Assign button clicked:', {
      contextFromUrl,
      isDepartmentAssignment,
      assetDetails: assetDetails?.asset_id,
      dept_id: finalDeptId,
      org_id: finalOrgId,
      employee_int_id,
      locationState: location.state
    });
    
    // Validate required fields based on assignment type
    if (!assetDetails) {
      toast.error('Asset details not loaded');
      return;
    }
    
    if (!finalDeptId) {
      toast.error('Department ID is required');
      return;
    }
    
    if (!finalOrgId) {
      toast.error('Organization ID is required');
      return;
    }
    
    // For employee assignments, employee_int_id is required
    if (!isDepartmentAssignment && !employee_int_id) {
      toast.error('Employee ID is required for employee assignments');
      return;
    }
    
    try {
      const payload = {
        asset_assign_id: generateUniqueId(),
        dept_id: finalDeptId,
        asset_id: assetDetails.asset_id,
        org_id: finalOrgId,
        // For department assignments, set employee_int_id to null; for employee assignments, use the provided value
        employee_int_id: isDepartmentAssignment ? null : employee_int_id,
        latest_assignment_flag: true,
        action: 'A'
      };
      
      console.log('[AssetsDetail] Sending assignment payload:', payload);
      
      await API.post('/asset-assignments', payload);
      toast.success(t('assetsDetail.assetAssignedSuccessfully'));
      navigate(-1);
    } catch (err) {
      console.error('[AssetsDetail] Failed to assign asset:', err);
      const errorMessage = err.response?.data?.message || err.response?.data?.error || err.message || 'An error occurred';
      toast.error(`${t('assetsDetail.failedToAssignAsset')}: ${errorMessage}`);
    }
  };

  useEffect(() => {
    if (asset_id) {
      // Pass context parameter to API if available
      const params = contextFromUrl ? { context: contextFromUrl } : {};
      API.get(`/assets/${asset_id}`, { params })
        .then(res => setAssetDetails(res.data))
        .catch(() => toast.error(t('assetsDetail.failedToFetchAssetDetails')));
    }
  }, [asset_id, contextFromUrl, t]);

  return (
    <div className="max-w-7xl mx-auto mt-8 bg-[#F5F8FA] rounded-xl shadow">
      <div className="bg-[#0E2F4B] text-white py-4 px-8 rounded-t-xl border-b-4 border-[#FFC107] flex justify-center items-center">
        <span className="text-2xl font-semibold text-center w-full">{t('assetsDetail.title')}</span>
      </div>
      
      <form className="p-8">
        {assetDetails && (
        <div className="grid grid-cols-4 gap-6 mb-6">
            {Object.entries(assetDetails)
              .filter(([key]) => {
                // Hide these columns from the UI
                const hiddenColumns = [
                  'branch_id', 
                  'prod_serv_id', 
                  'current_status', 
                  'org_id', 
                  'created_by', 
                  'created_on', 
                  'changed_by', 
                  'changed_on',
                  'group_id',
                  'maintsch_id',
                  'parent_asset_type_name',
                  'parent_asset_type_id',
                  'prod_serv_name',
                  'purchase_vendor_id',    // Hide Purchase Vendor ID field
                  'service_vendor_id',     // Hide Service Vendor ID field
                  'purchase_vendor_name',  // Hide as it's shown in place of purchase_vendor_id
                  'service_vendor_name',   // Hide as it's shown in place of service_vendor_id
                  'purchased_by_name'      // Hide as it's shown in place of purchased_by
                ];
                return !hiddenColumns.includes(key);
              })
              .map(([key, value]) => {
                // Handle different value types
                let displayValue;
                if (value === null || value === undefined) {
                  displayValue = t('assetsDetail.notSet');
                } else if (typeof value === 'object') {
                  // For objects (like properties), display as key-value pairs
                  if (Object.keys(value).length === 0) {
                    displayValue = t('assetsDetail.noProperties');
                  } else {
                    displayValue = Object.entries(value)
                      .map(([propKey, propValue]) => `${propKey}: ${propValue}`)
                      .join(', ');
                  }
                } else if (key === 'purchased_on' || key === 'expiry_date') {
                  // Format date fields to human readable format
                  try {
                    const date = new Date(value);
                    if (!isNaN(date.getTime())) {
                      displayValue = date.toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      });
                    } else {
                      displayValue = value;
                    }
                  } catch (error) {
                    displayValue = value;
                  }
                } else if (key === 'purchase_vendor_id') {
                  // Show vendor name instead of ID
                  displayValue = assetDetails.purchase_vendor_name || value || t('assetsDetail.notSet');
                } else if (key === 'service_vendor_id') {
                  // Show vendor name instead of ID
                  displayValue = assetDetails.service_vendor_name || value || t('assetsDetail.notSet');
                } else if (key === 'purchased_by') {
                  // Show username instead of user ID
                  displayValue = assetDetails.purchased_by_name || value || t('assetsDetail.notSet');
                } else {
                  displayValue = value;
                }

                return (
                  <div key={key} className="col-span-1">
                    <label className="block text-sm mb-1 font-medium">{translateFieldName(key)}</label>
                    <input
                      value={displayValue}
                      readOnly
                      className="w-full px-3 py-2 border border-gray-300 rounded bg-gray-100 text-sm h-9"
                    />
                  </div>
                );
              })}
          </div>
        )}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => {
              if (backTo) {
                navigate(backTo, { state: { selectedAssetType } });
              } else {
                navigate(-1);
              }
            }}
            className="bg-gray-300 text-gray-700 px-8 py-2 rounded-lg text-base font-semibold hover:bg-gray-400 transition shadow-sm"
          >
            {t('assetsDetail.cancel')}
          </button>
          {!hideAssign && (() => {
            // Check if this is a department assignment (no employee_int_id required)
            const isDepartmentAssignment = contextFromUrl === 'DEPTASSIGNMENT';
            // Use resolved values for validation
            const isDisabled = !assetDetails || !resolvedDeptId || !resolvedOrgId || (!isDepartmentAssignment && !employee_int_id);
            
            return (
              <button
                type="button"
                onClick={handleAssignAsset}
                className="bg-[#0E2F4B] text-white px-8 py-2 rounded-lg text-base font-semibold hover:bg-[#1a4971] transition shadow_sm disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isDisabled}
                title={isDisabled ? `Missing: ${!assetDetails ? 'Asset details' : !resolvedDeptId ? 'Department ID' : !resolvedOrgId ? 'Organization ID' : !employee_int_id && !isDepartmentAssignment ? 'Employee ID' : 'Unknown'}` : ''}
              >
                {t('assetsDetail.assign')}
              </button>
            );
          })()}
        </div>
      </form>
    </div>
  );
};

export default AssetsDetail;
