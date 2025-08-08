import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import API from '../../lib/axios';
import { toast } from 'react-hot-toast';
import { Plus, ArrowLeft, BarChart3, X } from 'lucide-react';
import ContentBox from '../ContentBox';
import CustomTable from '../CustomTable';

const CategoryAssets = () => {
  const navigate = useNavigate();
  const { category } = useParams();
  const { user } = useAuthStore();
  const [scrapAssets, setScrapAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [notes, setNotes] = useState('');

  // Mock data for assets by category
  const mockCategoryAssets = {
    computers: [
      {
        asset_name: 'Dell Laptop',
        serial_number: 'SN12345',
        category: 'Computers',
        location: 'Head Office',
        expiry_date: '2025-08-10',
        status: 'Nearing Expiry',
        action: 'Scrap'
      },
      {
        asset_name: 'HP Printer',
        serial_number: 'SN11223',
        category: 'Computers',
        location: 'Remote Site',
        expiry_date: '2025-08-03',
        status: 'Nearing Expiry',
        action: 'Scrap'
      },
      {
        asset_name: 'Asset 6',
        serial_number: 'SN6',
        category: 'Computers',
        location: 'Head Office',
        expiry_date: '2025-08-10',
        status: 'Nearing Expiry',
        action: 'Scrap'
      },
      {
        asset_name: 'Asset 10',
        serial_number: 'SN10',
        category: 'Computers',
        location: 'Remote Site',
        expiry_date: '2025-08-03',
        status: 'Nearing Expiry',
        action: 'Scrap'
      },
      {
        asset_name: 'Asset 11',
        serial_number: 'SN11',
        category: 'Computers',
        location: 'Head Office',
        expiry_date: '2025-08-10',
        status: 'Nearing Expiry',
        action: 'Scrap'
      },
      {
        asset_name: 'Asset 15',
        serial_number: 'SN15',
        category: 'Computers',
        location: 'Remote Site',
        expiry_date: '2025-08-03',
        status: 'Nearing Expiry',
        action: 'Scrap'
      }
    ],
    furniture: [
      {
        asset_name: 'Office Desk',
        serial_number: 'SN67890',
        category: 'Furniture',
        location: 'Warehouse A',
        expiry_date: '2025-08-14',
        status: 'Nearing Expiry',
        action: 'Scrap'
      },
      {
        asset_name: 'Conference Chair',
        serial_number: 'SN7',
        category: 'Furniture',
        location: 'Warehouse A',
        expiry_date: '2025-08-14',
        status: 'Nearing Expiry',
        action: 'Scrap'
      }
    ],
    vehicles: [
      {
        asset_name: 'Company Van',
        serial_number: 'SN20',
        category: 'Vehicles',
        location: 'Logistics',
        expiry_date: '2025-04-05',
        status: 'Nearing Expiry',
        action: 'Scrap'
      }
    ],
    machinery: [
      {
        asset_name: 'Industrial Drill',
        serial_number: 'SN21',
        category: 'Machinery',
        location: 'Operations',
        expiry_date: '2025-04-10',
        status: 'Nearing Expiry',
        action: 'Scrap'
      }
    ]
  };

  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      const categoryData = mockCategoryAssets[category] || [];
      setScrapAssets(categoryData);
      setLoading(false);
    }, 1000);
  }, [category]);

  const columns = [
    { key: 'asset_name', name: 'asset_name', label: 'ASSET NAME', sortable: true, visible: true },
    { key: 'serial_number', name: 'serial_number', label: 'SERIAL NUMBER', sortable: true, visible: true },
    { key: 'category', name: 'category', label: 'CATEGORY', sortable: true, visible: true },
    { key: 'location', name: 'location', label: 'LOCATION', sortable: true, visible: true },
    { key: 'expiry_date', name: 'expiry_date', label: 'EXPIRY DATE', sortable: true, visible: true },
    { key: 'status', name: 'status', label: 'STATUS', sortable: true, visible: true },
    { key: 'action', name: 'action', label: 'ACTION', sortable: false, visible: true }
  ];

  const handleScrap = (row) => {
    setSelectedAsset(row);
    setShowModal(true);
  };

  const handleSubmitScrap = () => {
    console.log('Submitting scrap asset:', selectedAsset, 'with notes:', notes);
    toast.success(`Asset ${selectedAsset.asset_name} marked for scrapping${notes ? ` with notes: ${notes}` : ''}`);
    setShowModal(false);
    setSelectedAsset(null);
    setNotes('');
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedAsset(null);
    setNotes('');
  };

  // Custom table component for CategoryAssets with custom styling
  const CustomCategoryAssetsTable = ({ visibleColumns, data, selectedRows, setSelectedRows }) => {
    const visible = visibleColumns.filter((col) => col.visible);

    const toggleRow = (keyValue) => {
      setSelectedRows((prev) =>
        prev.includes(keyValue)
          ? prev.filter((rowId) => rowId !== keyValue)
          : [...prev, keyValue]
      );
    };

    return (
      <>
        {data.map((row, rowIndex) => (
          <tr
            key={row.asset_name || rowIndex}
            className="border-t hover:bg-gray-100"
          >
            {visible.map((col, colIndex) => (
              <td key={colIndex} className="border text-xs px-4 py-2">
                {colIndex === 0 ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectedRows.includes(row.asset_name)}
                      onChange={() => toggleRow(row.asset_name)}
                      className="accent-yellow-400"
                    />
                    {col.key === 'status' ? (
                      <span className="px-2 py-1 bg-yellow-100 text-amber-800 text-xs font-medium rounded-full">
                        {row[col.key]}
                      </span>
                    ) : col.key === 'action' ? (
                      <button
                        onClick={() => handleScrap(row)}
                        className="px-3 py-1 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700 transition-colors"
                      >
                        Scrap
                      </button>
                    ) : (
                      row[col.key]
                    )}
                  </div>
                ) : col.key === 'status' ? (
                  <span className="px-2 py-1 bg-yellow-100 text-amber-800 text-xs font-medium rounded-full">
                    {row[col.key]}
                  </span>
                ) : col.key === 'action' ? (
                  <button
                    onClick={() => handleScrap(row)}
                    className="px-3 py-1 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700 transition-colors"
                  >
                    Scrap
                  </button>
                ) : (
                  row[col.key]
                )}
              </td>
            ))}
          </tr>
        ))}
      </>
    );
  };

  const [selectedRows, setSelectedRows] = useState([]);
  const [filterValues, setFilterValues] = useState({});
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  const handleSort = (column) => {
    setSortConfig(prev => ({
      key: column,
      direction: prev.key === column && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const sortData = (data) => {
    if (!sortConfig.key) return data;

    return [...data].sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];

      if (aValue < bValue) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  };

  const filterData = (data, filters, visibleColumns) => {
    return data.filter(item => {
      return visibleColumns.every(column => {
        const filterValue = filters[column.key];
        if (!filterValue) return true;

        const itemValue = String(item[column.key] || '').toLowerCase();
        return itemValue.includes(filterValue.toLowerCase());
      });
    });
  };

  const handleFilterChange = (filterType, value) => {
    setFilterValues(prev => ({
      ...prev,
      [filterType]: value
    }));
  };

  const visibleColumns = columns.filter(col => col.visible);
  const filteredData = filterData(scrapAssets, filterValues, visibleColumns);
  const sortedData = sortData(filteredData);

  const getCategoryDisplayName = (category) => {
    return category.charAt(0).toUpperCase() + category.slice(1);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex justify-between items-center mb-6 p-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/scrap-assets')}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
            title="Back to Dashboard"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-full">
              <BarChart3 className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{getCategoryDisplayName(category)} Assets</h1>
              <p className="text-sm text-gray-600">Assets expiring soon in {getCategoryDisplayName(category)} category</p>
            </div>
          </div>
        </div>
      </div>
      
      <ContentBox
        filters={columns}
        onFilterChange={handleFilterChange}
        onSort={handleSort}
        sortConfig={sortConfig}
        onDeleteSelected={() => {}}
        data={scrapAssets}
        selectedRows={selectedRows}
        setSelectedRows={setSelectedRows}
        onAdd={null}
        showAddButton={false}
        showActions={false}
      >
        {({ visibleColumns, showActions }) => {
          const filteredData = filterData(scrapAssets, filterValues, visibleColumns);
          const sortedData = sortData(filteredData);

          return (
            <CustomCategoryAssetsTable
              visibleColumns={visibleColumns}
              data={sortedData}
              selectedRows={selectedRows}
              setSelectedRows={setSelectedRows}
            />
          );
        }}
      </ContentBox>

      {/* Scrap Asset Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-semibold text-gray-900">Create Scrap Asset</h3>
              <button
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6">
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">Asset: <span className="font-medium text-gray-900">{selectedAsset?.asset_name}</span></p>
                <p className="text-sm text-gray-600">Serial: <span className="font-medium text-gray-900">{selectedAsset?.serial_number}</span></p>
                <p className="text-sm text-gray-600">Category: <span className="font-medium text-gray-900">{selectedAsset?.category}</span></p>
              </div>
              
              <div className="mb-6">
                <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Enter any additional notes about this scrap asset..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                  rows="3"
                />
              </div>
              
              <div className="flex justify-end gap-3">
                <button
                  onClick={handleCloseModal}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitScrap}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-blue-600 rounded-md hover:bg-blue-700 transition-colors"
                >
                  Submit
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CategoryAssets; 