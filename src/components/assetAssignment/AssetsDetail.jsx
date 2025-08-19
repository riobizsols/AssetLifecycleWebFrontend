// AssetFormPage.jsx
import React, { useState, useEffect, useRef } from 'react';
import API from '../../lib/axios';
import toast from 'react-hot-toast';
import { useNavigate, useParams, useLocation } from 'react-router-dom';

const initialForm = {
  assetType: '',
  serialNumber: '',
  description: '',
  maintenanceSchedule: '',
  expiryDate: '',
  warrantyPeriod: '',
  purchaseDate: '',
  purchaseCost: '',
  properties: {},
  purchaseBy: '',
  vendorBrand: '',
  vendorModel: '',
  purchaseSupply: '',
  serviceSupply: '',
  vendorId: '',
  parentAsset: '',
  status: 'Active'
};

const statusOptions = [
  { value: 'Active', label: 'Active' },
  { value: 'Inactive', label: 'Inactive' },
  { value: 'Disposed', label: 'Disposed' }
];

const AssetsDetail = ({ userRole }) => {
  const navigate = useNavigate();
  const [assetDetails, setAssetDetails] = useState(null);
  // Get asset_id from URL params
  const { asset_id } = useParams();
  const location = useLocation();
  const { employee_int_id, dept_id, org_id, hideAssign, backTo, selectedAssetType } = location.state || {};

  // Helper to generate a unique assignment ID
  const generateUniqueId = () => `AA${Date.now()}`;

  const handleAssignAsset = async () => {
    if (!assetDetails || !employee_int_id || !dept_id || !org_id) {
      toast.error('Missing assignment details');
      return;
    }
    try {
      const payload = {
        asset_assign_id: generateUniqueId(),
        dept_id,
        asset_id: assetDetails.asset_id,
        org_id,
        employee_int_id,
        latest_assignment_flag: true,
        action: 'A'
      };
      await API.post('/asset-assignments', payload);
      toast.success('Asset assigned successfully');
      navigate(-1);
    } catch (err) {
      console.error('Failed to assign asset', err);
      const errorMessage = err.response?.data?.message || err.response?.data?.error || err.message || 'An error occurred';
      toast.error(`Failed to assign asset: ${errorMessage}`);
    }
  };

  useEffect(() => {
    if (asset_id) {
      API.get(`/assets/${asset_id}`)
        .then(res => setAssetDetails(res.data))
        .catch(() => toast.error('Failed to fetch asset details'));
    }
  }, [asset_id]);

  return (
    <div className="max-w-7xl mx-auto mt-8 bg-[#F5F8FA] rounded-xl shadow">
      <div className="bg-[#0E2F4B] text-white py-4 px-8 rounded-t-xl border-b-4 border-[#FFC107] flex justify-center items-center">
        <span className="text-2xl font-semibold text-center w-full">Asset Details</span>
      </div>
      
      <form className="p-8">
        {assetDetails && (
        <div className="grid grid-cols-4 gap-6 mb-6">
            {Object.entries(assetDetails).map(([key, value]) => (
              <div key={key} className="col-span-1">
                <label className="block text-sm mb-1 font-medium">{key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</label>
                    <input
                  value={value === null ? 'Not set' : value}
              readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded bg-gray-100 text-sm h-9"
                />
                </div>
              ))}
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
            Cancel
          </button>
          {!hideAssign && (
            <button
              type="button"
              onClick={handleAssignAsset}
              className="bg-[#0E2F4B] text-white px-8 py-2 rounded-lg text-base font-semibold hover:bg-[#1a4971] transition shadow_sm"
              disabled={!assetDetails || !employee_int_id || !dept_id || !org_id}
            >
              Assign
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

export default AssetsDetail;
