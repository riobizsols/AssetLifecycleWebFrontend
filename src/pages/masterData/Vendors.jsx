import { useEffect, useState } from "react";
import ContentBox from "../../components/ContentBox";
import CustomTable from "../../components/CustomTable";
import EditVendorModal from "../../components/EditVendorModal";
import { filterData } from "../../utils/filterData";
import { exportToExcel } from "../../utils/exportToExcel";
import { useNavigate } from "react-router-dom";
import API from "../../lib/axios";
import { toast } from "react-hot-toast";
import { useNavigation } from "../../hooks/useNavigation";
import useAuditLog from "../../hooks/useAuditLog";
import { VENDORS_APP_ID } from "../../constants/vendorsAuditEvents";
import { useLanguage } from "../../contexts/LanguageContext";

const Vendors = () => {
  const navigate = useNavigate();

  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filterValues, setFilterValues] = useState({
    columnFilters: [],
    fromDate: "",
    toDate: ""
  });
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingVendor, setEditingVendor] = useState(null);
  const [selectedRows, setSelectedRows] = useState([]);
  const [sortConfig, setSortConfig] = useState({
    sorts: []
  });
  
  // Access control
  const { hasEditAccess, getAccessLevel } = useNavigation();
  const canEdit = hasEditAccess('VENDORS');
  const accessLevel = getAccessLevel('VENDORS');
  const isReadOnly = accessLevel === 'D';

  // Initialize audit logging
  const { recordActionByNameWithFetch } = useAuditLog(VENDORS_APP_ID);
  
  // Language context
  const { t } = useLanguage();

  // Create columns with translations
  const columns = [
    { label: t('vendors.vendorId'), name: "vendor_id", visible: true },
    { label: t('vendors.vendorName'), name: "vendor_name", visible: true },
    { label: t('vendors.company'), name: "company_name", visible: true },
    { label: t('vendors.status'), name: "int_status", visible: true },
    { label: t('vendors.gstNumber'), name: "gst_number", visible: true },
    { label: t('vendors.cinNumber'), name: "cin_number", visible: true },
    { label: t('vendors.companyEmail'), name: "company_email", visible: true },
    { label: t('vendors.contactPerson'), name: "contact_person_name", visible: true },
    { label: t('vendors.contactEmail'), name: "contact_person_email", visible: true },
    { label: t('vendors.contactNumber'), name: "contact_person_number", visible: true },
    { label: t('vendors.addressLine1'), name: "address_line1", visible: false },
    { label: t('vendors.addressLine2'), name: "address_line2", visible: false },
    { label: t('vendors.city'), name: "city", visible: false },
    { label: t('vendors.state'), name: "state", visible: false },
    { label: t('vendors.pincode'), name: "pincode", visible: false },
    { label: t('vendors.extId'), name: "ext_id", visible: false },
    { label: t('vendors.organizationId'), name: "org_id", visible: false },
    { label: t('vendors.createdBy'), name: "created_by", visible: false },
    { label: t('vendors.createdOn'), name: "created_on", visible: false },
    { label: t('vendors.changedBy'), name: "changed_by", visible: false },
    { label: t('vendors.changedOn'), name: "changed_on", visible: false },
  ];

  useEffect(() => {
    const fetchVendors = async () => {
      setIsLoading(true);
      try {
        const response = await API.get("/get-vendors");
        const formattedData = response.data.map(item => {
          // Map int_status to display text
          let statusText = 'Inactive';
          if (item.int_status === 1) {
            statusText = 'Active';
          } else if (item.int_status === 3) {
            statusText = 'CRApproved';
          } else if (item.int_status === 4) {
            statusText = 'Blocked';
          }
          
          return {
            ...item,
            int_status: statusText,
            created_on: item.created_on ? new Date(item.created_on).toLocaleString() : '',
            changed_on: item.changed_on ? new Date(item.changed_on).toLocaleString() : ''
          };
        });
        setData(formattedData);
      } catch (error) {
        console.error("Error fetching vendors:", error);
        toast.error(t('vendors.failedToFetchVendors'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchVendors();
  }, []);

  const handleSort = (column) => {
    setSortConfig(prevConfig => {
      const { sorts } = prevConfig;
      const existingSort = sorts.find(s => s.column === column);
      
      if (!existingSort) {
        // First click - add ascending sort
        return {
          sorts: [...sorts, { column, direction: 'asc', order: sorts.length + 1 }]
        };
      } else if (existingSort.direction === 'asc') {
        // Second click - change to descending
        return {
          sorts: sorts.map(s => 
            s.column === column 
              ? { ...s, direction: 'desc' }
              : s
          )
        };
      } else {
        // Third click - remove sort
        return {
          sorts: sorts.filter(s => s.column !== column).map((s, idx) => ({
            ...s,
            order: idx + 1
          }))
        };
      }
    });
  };

  const sortData = (data) => {
    if (!sortConfig.sorts.length) return data;

    return [...data].sort((a, b) => {
      for (const { column, direction } of sortConfig.sorts) {
        const aValue = a[column];
        const bValue = b[column];

        if (aValue == null) return 1;
        if (bValue == null) return -1;

        if (!isNaN(aValue) && !isNaN(bValue)) {
          const diff = direction === 'asc' ? aValue - bValue : bValue - aValue;
          if (diff !== 0) return diff;
        } else {
          const diff = direction === 'asc' 
            ? String(aValue).localeCompare(String(bValue))
            : String(bValue).localeCompare(String(aValue));
          if (diff !== 0) return diff;
        }
      }
      return 0;
    });
  };

  const handleFilterChange = (filterType, value) => {
    setFilterValues(prev => {
      if (filterType === 'columnFilters') {
        return {
          ...prev,
          columnFilters: value
        };
      } else if (filterType === 'fromDate' || filterType === 'toDate') {
        return {
          ...prev,
          [filterType]: value
        };
      } else {
        return {
          ...prev,
          [filterType]: value
        };
      }
    });
  };

  const handleDelete = async () => {
    try {
      await API.delete("/delete-vendors", {
        data: { ids: selectedRows },
      });

      // Log delete action
      await recordActionByNameWithFetch('Delete', {
        vendorIds: selectedRows,
        count: selectedRows.length,
        action: `${selectedRows.length} Vendor(s) Deleted`
      });

      setData((prev) =>
        prev.filter((vendor) => !selectedRows.includes(vendor.vendor_id))
      );
      setSelectedRows([]);
      toast.success(t('vendors.vendorsDeletedSuccessfully', { count: selectedRows.length }));
      return true; // Return true to indicate successful deletion
    } catch (error) {
      console.error("Error deleting vendors:", error);
      const errorMessage = error.response?.data?.message || t('vendors.failedToDeleteVendors');
      
      // If there are constraint violation details, show them
      if (error.response?.data?.details) {
        error.response.data.details.forEach(detail => {
          toast.error(detail, { duration: 5000 });
        });
      } else {
        toast.error(errorMessage);
      }
      return false; // Return false to indicate failed deletion
    }
  };

  const handleEdit = (vendor) => {
    setEditingVendor(vendor);
    setShowEditModal(true);
  };

  const handleUpdate = async (formData) => {
    try {
      // Clean up empty/null values for optional fields and preserve required fields
      const cleanedData = {
        ...formData,
        org_id: editingVendor.org_id, // Preserve org_id from existing vendor
        ext_id: editingVendor.ext_id, // Preserve ext_id from existing vendor
        address_line2: formData.address_line2 || null,
        contact_person_name: formData.contact_person_name || null,
        contact_person_email: formData.contact_person_email || null,
        contact_person_number: formData.contact_person_number || null,
        gst_number: formData.gst_number || null,
        cin_number: formData.cin_number || null,
        address_line1: formData.address_line1 || null,
        city: formData.city || null,
        state: formData.state || null,
        pincode: formData.pincode || null,
        changed_by: "USER123", // Replace with actual user ID from context/state
        changed_on: new Date().toISOString()
      };

      const response = await API.put(`/update/${editingVendor.vendor_id}`, cleanedData);

      // Log update action
      await recordActionByNameWithFetch('Update', {
        vendorId: editingVendor.vendor_id,
        vendorName: formData.vendor_name,
        companyName: formData.company_name,
        companyEmail: formData.company_email,
        gstNumber: formData.gst_number,
        contactPerson: formData.contact_person_name,
        contactEmail: formData.contact_person_email,
        contactNumber: formData.contact_person_number,
        action: 'Vendor Updated'
      });

      // Update the data state with the updated vendor
      setData(prev => prev.map(vendor => {
        if (vendor.vendor_id === editingVendor.vendor_id) {
          // Map int_status to display text
          let statusText = 'Inactive';
          const statusValue = response.data.vendor.int_status;
          if (statusValue === 1) {
            statusText = 'Active';
          } else if (statusValue === 3) {
            statusText = 'CRApproved';
          } else if (statusValue === 4) {
            statusText = 'Blocked';
          }
          
          return {
            ...vendor,
            ...response.data.vendor,
            int_status: statusText,
            changed_on: response.data.vendor.changed_on ? new Date(response.data.vendor.changed_on).toLocaleString() : vendor.changed_on
          };
        }
        return vendor;
      }));
      
      setShowEditModal(false);
      setEditingVendor(null);
      toast.success(t('vendors.vendorUpdatedSuccessfully'));
    } catch (error) {
      console.error("Error updating vendor:", error);
      const errorMessage = error.response?.data?.message || error.response?.data?.error || t('vendors.failedToUpdateVendor');
      toast.error(errorMessage);
    }
  };

  const handleDownload = async () => {
    try {
      const filteredData = filterData(data, filterValues, columns.filter(col => col.visible));
      const sortedData = sortData(filteredData);
      const success = exportToExcel(sortedData, columns, "Vendors_List");
      if (success) {
        // Log download action
        await recordActionByNameWithFetch('Download', {
          count: sortedData.length,
          action: 'Vendors Data Downloaded'
        });
        
        toast(t('vendors.vendorsExportedSuccessfully'), { icon: '✅' });
      } else {
        throw new Error(t('vendors.exportFailed'));
      }
    } catch (error) {
      console.error('Error downloading vendors:', error);
      toast(t('vendors.failedToExportVendors'), { icon: '❌' });
    }
  };

  const filters = columns.map((col) => ({
    label: col.label,
    name: col.name,
    options: col.name === 'int_status' ? [
      { label: t('vendors.active'), value: "Active" },
      { label: t('vendors.inactive'), value: "Inactive" }
    ] : [],
    onChange: (value) => handleFilterChange(col.name, value),
  }));

  return (
    <div className="p-4">
      <ContentBox
        filters={filters}
        onFilterChange={handleFilterChange}
        onSort={handleSort}
        sortConfig={sortConfig}
        onAdd={canEdit ? async () => {
          // Log create action when Add button is clicked
          await recordActionByNameWithFetch('Create', {
            action: 'Add Vendor Form Opened'
          });
          navigate("/master-data/add-vendor");
        } : null}
        onDeleteSelected={canEdit ? handleDelete : null}
        onDownload={handleDownload}
        data={data}
        selectedRows={selectedRows}
        setSelectedRows={setSelectedRows}
        showAddButton={canEdit}
        showActions={true}
        isReadOnly={false}
      >
        {({ visibleColumns }) => {
          const filteredData = filterData(data, filterValues, visibleColumns);
          const sortedData = sortData(filteredData);

          if (isLoading) {
            const visibleCols = visibleColumns.filter((col) => col.visible);
            const colSpan = visibleCols.length + 1; // +1 for actions column
            return (
              <>
                <tr>
                  <td colSpan={colSpan} className="text-center py-16">
                    <div className="flex flex-col items-center justify-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                      <p className="text-gray-600">{t('common.loading')}</p>
                    </div>
                  </td>
                </tr>
                <EditVendorModal
                  show={showEditModal}
                  onClose={() => {
                    setShowEditModal(false);
                    setEditingVendor(null);
                  }}
                  onConfirm={handleUpdate}
                  vendor={editingVendor}
                  isReadOnly={isReadOnly}
                />
              </>
            );
          }

          if (sortedData.length === 0) {
            const visibleCols = visibleColumns.filter((col) => col.visible);
            const colSpan = visibleCols.length + 1; // +1 for actions column
            return (
              <>
                <tr>
                  <td colSpan={colSpan} className="text-center py-16">
                    <div className="flex flex-col items-center justify-center">
                      <p className="text-xl font-semibold text-gray-800">
                        {t('common.noDataFound')}
                      </p>
                    </div>
                  </td>
                </tr>
                <EditVendorModal
                  show={showEditModal}
                  onClose={() => {
                    setShowEditModal(false);
                    setEditingVendor(null);
                  }}
                  onConfirm={handleUpdate}
                  vendor={editingVendor}
                  isReadOnly={isReadOnly}
                />
              </>
            );
          }

          return (
            <>
              <CustomTable
                columns={visibleColumns}
                visibleColumns={visibleColumns}
                data={sortedData}
                selectedRows={selectedRows}
                setSelectedRows={setSelectedRows}
                onEdit={handleEdit}
                onDelete={canEdit ? (row) => console.log("Delete vendor:", row) : null}
                rowKey="vendor_id"
                showActions={true}
                isReadOnly={isReadOnly}
                renderCell={(col, row, colIndex) => {
                  // Handle first column with checkbox
                  if (colIndex === 0) {
                    return (
                      <div className="flex items-center gap-2">
                        {!isReadOnly && (
                          <input
                            type="checkbox"
                            checked={selectedRows.includes(row["vendor_id"])}
                            onChange={(e) => {
                              e.stopPropagation();
                              setSelectedRows(prev => 
                                prev.includes(row["vendor_id"]) 
                                  ? prev.filter(id => id !== row["vendor_id"]) 
                                  : [...prev, row["vendor_id"]]
                              );
                            }}
                            className="accent-yellow-400"
                          />
                        )}
                        {row[col.name]}
                      </div>
                    );
                  }
                  return row[col.name];
                }}
              />
              <EditVendorModal
                show={showEditModal}
                onClose={() => {
                  setShowEditModal(false);
                  setEditingVendor(null);
                }}
                onConfirm={handleUpdate}
                vendor={editingVendor}
                isReadOnly={isReadOnly}
              />
            </>
          );
        }}
      </ContentBox>
    </div>
  );
};

export default Vendors;
