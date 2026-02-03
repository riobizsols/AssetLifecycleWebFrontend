import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { toast } from 'react-hot-toast';
import { 
  ArrowLeft,
  Edit,
  Trash2,
  Package,
  Calendar,
  User
} from 'lucide-react';
import API from '../../lib/axios';

const ViewGroupAsset = () => {
  const navigate = useNavigate();
  const { groupId } = useParams();
  const location = useLocation();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [groupData, setGroupData] = useState(null);
  const [groupAssets, setGroupAssets] = useState([]);

  // Mock data for demonstration - replace with actual API calls
  const mockGroupData = {
    group_id: 'GRP001',
    group_name: 'Laptop Group',
    asset_type_id: 'AT001',
    asset_type_name: 'Laptop',
    asset_type_code: 'AT001',
    asset_count: 3,
    created_by: 'Admin User',
    created_date: '2024-01-15',
    status: 'Active',
    description: 'Group for all laptop assets'
  };

  const mockGroupAssets = [
    { asset_id: 'A001', name: 'Dell XPS 13', description: 'Laptop - Dell XPS 13', purchased_on: '2023-01-15', status: 'Active' },
    { asset_id: 'A002', name: 'HP Pavilion', description: 'Laptop - HP Pavilion', purchased_on: '2023-02-20', status: 'Active' },
    { asset_id: 'A003', name: 'Lenovo ThinkPad', description: 'Laptop - Lenovo ThinkPad', purchased_on: '2023-03-10', status: 'Active' }
  ];

  useEffect(() => {
    // Simulate API call to fetch group data
    setTimeout(() => {
      setGroupData(mockGroupData);
      setGroupAssets(mockGroupAssets);
      setLoading(false);
    }, 1000);
  }, [groupId]);

  const handleEdit = () => {
    navigate(`/group-asset/edit/${groupId}`, {
      state: {
        groupData: groupData,
        isEdit: true
      }
    });
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this group?')) {
      setLoading(true);
      try {
        // Mock API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        toast.success('Group deleted successfully!');
        navigate('/group-asset');
      } catch (error) {
        console.error('Error deleting group:', error);
        toast.error('Failed to delete group');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleBack = () => {
    navigate('/group-asset');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading group details...</p>
        </div>
      </div>
    );
  }

  if (!groupData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">Group not found</p>
          <button
            onClick={handleBack}
            className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
          >
            Back to Groups
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center gap-4">
              <button
                onClick={handleBack}
                className="p-2 text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft size={20} />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{groupData.group_name}</h1>
                <p className="text-sm text-gray-600">Group Details</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleEdit}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 flex items-center gap-2"
              >
                <Edit size={16} />
                Edit
              </button>
              <button
                onClick={handleDelete}
                disabled={loading}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Trash2 size={16} />
                Delete
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Group Information */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Group Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="flex items-center gap-3">
              <Package className="text-gray-400" size={20} />
              <div>
                <p className="text-sm text-gray-500">Asset Type</p>
                <p className="font-medium text-gray-900">{groupData.asset_type_code} - {groupData.asset_type_name}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Package className="text-gray-400" size={20} />
              <div>
                <p className="text-sm text-gray-500">Asset Count</p>
                <p className="font-medium text-gray-900">{groupData.asset_count} assets</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <User className="text-gray-400" size={20} />
              <div>
                <p className="text-sm text-gray-500">Created By</p>
                <p className="font-medium text-gray-900">{groupData.created_by}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Calendar className="text-gray-400" size={20} />
              <div>
                <p className="text-sm text-gray-500">Created Date</p>
                <p className="font-medium text-gray-900">{groupData.created_date}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 rounded-full bg-green-400"></div>
              <div>
                <p className="text-sm text-gray-500">Status</p>
                <p className="font-medium text-gray-900">{groupData.status}</p>
              </div>
            </div>
            {groupData.description && (
              <div className="md:col-span-2 lg:col-span-3">
                <p className="text-sm text-gray-500">Description</p>
                <p className="font-medium text-gray-900">{groupData.description}</p>
              </div>
            )}
          </div>
        </div>

        {/* Assets List */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-6 border-b">
            <h2 className="text-lg font-semibold text-gray-900">Group Assets ({groupAssets.length})</h2>
          </div>
          <div className="overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Purchased On
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {groupAssets.map((asset) => (
                  <tr key={asset.asset_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-900">{asset.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{asset.description}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{asset.purchased_on}</td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        asset.status === 'Active' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {asset.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViewGroupAsset; 