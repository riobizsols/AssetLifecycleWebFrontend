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

const ViewScrapSales = () => {
  const navigate = useNavigate();
  const { scrapId } = useParams();
  const location = useLocation();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [scrapData, setScrapData] = useState(null);

  // Mock data for demonstration - replace with actual API calls
  const mockScrapData = {
    scrap_id: 'SCR001',
    group_name: 'Old Electronics',
    asset_id: 'A001',
    asset_name: 'Dell XPS 13',
    asset_type: 'Laptop',
    scrap_date: '2024-01-15',
    scrap_reason: 'End of Life',
    scrap_value: 500,
    buyer_name: 'John Doe',
    buyer_email: 'john@example.com',
    buyer_contact: 'john@example.com',
    company_name: 'Tech Corp',
    notes: 'Asset was in good condition',
    status: 'Pending',
    created_by: 'Admin User',
    created_date: '2024-01-15',
    updated_by: 'Admin User',
    updated_date: '2024-01-16'
  };

  useEffect(() => {
    // Simulate API call to fetch scrap sale data
    setTimeout(() => {
      setScrapData(mockScrapData);
      setLoading(false);
    }, 1000);
  }, [scrapId]);

  const handleEdit = () => {
    navigate(`/scrap-sales/edit/${scrapId}`, {
      state: {
        scrapData: scrapData,
        isEdit: true
      }
    });
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this scrap sale?')) {
      setLoading(true);
      try {
        // Mock API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        toast.success('Scrap sale deleted successfully!');
        navigate('/scrap-sales');
      } catch (error) {
        console.error('Error deleting scrap sale:', error);
        toast.error('Failed to delete scrap sale');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleBack = () => {
    navigate('/scrap-sales');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading scrap sale details...</p>
        </div>
      </div>
    );
  }

  if (!scrapData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">Scrap sale not found</p>
          <button
            onClick={handleBack}
            className="mt-4 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
          >
            Go Back
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
                <h1 className="text-2xl font-bold text-gray-900">{scrapData.asset_name}</h1>
                <p className="text-sm text-gray-600">Scrap Sale Details</p>
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
        {/* Scrap Sale Information */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Scrap Sale Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="flex items-center gap-3">
              <Package className="text-gray-400" size={20} />
              <div>
                <p className="text-sm text-gray-500">Group Name</p>
                <p className="font-medium text-gray-900">{scrapData.group_name || 'N/A'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Package className="text-gray-400" size={20} />
              <div>
                <p className="text-sm text-gray-500">Asset Name</p>
                <p className="font-medium text-gray-900">{scrapData.asset_name}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Package className="text-gray-400" size={20} />
              <div>
                <p className="text-sm text-gray-500">Asset Type</p>
                <p className="font-medium text-gray-900">{scrapData.asset_type}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <User className="text-gray-400" size={20} />
              <div>
                <p className="text-sm text-gray-500">Scrap Date</p>
                <p className="font-medium text-gray-900">{scrapData.scrap_date}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Calendar className="text-gray-400" size={20} />
              <div>
                <p className="text-sm text-gray-500">Scrap Reason</p>
                <p className="font-medium text-gray-900">{scrapData.scrap_reason}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 rounded-full bg-green-400"></div>
              <div>
                <p className="text-sm text-gray-500">Status</p>
                <p className="font-medium text-gray-900">{scrapData.status}</p>
              </div>
            </div>
            {scrapData.notes && (
              <div className="md:col-span-2 lg:col-span-3">
                <p className="text-sm text-gray-500">Notes</p>
                <p className="font-medium text-gray-900">{scrapData.notes}</p>
              </div>
            )}
          </div>
        </div>

        {/* Scrap Sale Details */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-6 border-b">
            <h2 className="text-lg font-semibold text-gray-900">Scrap Sale Details</h2>
          </div>
          <div className="overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Field
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Value
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                <tr className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-900">Scrap ID</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{scrapData.scrap_id}</td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-900">Asset ID</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{scrapData.asset_id}</td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-900">Scrap Value</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{scrapData.scrap_value}</td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-900">Buyer Name</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{scrapData.buyer_name}</td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-900">Buyer Contact</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{scrapData.buyer_contact}</td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-900">Buyer Address</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{scrapData.buyer_address}</td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-900">Created By</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{scrapData.created_by}</td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-900">Created Date</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{scrapData.created_date}</td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-900">Updated By</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{scrapData.updated_by}</td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-900">Updated Date</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{scrapData.updated_date}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViewScrapSales; 