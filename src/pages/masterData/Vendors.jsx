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

const Vendors = () => {
  const navigate = useNavigate();

  const [data, setData] = useState([]);
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
  const { hasEditAccess } = useNavigation();
  const canEdit = hasEditAccess('VENDORS');

  const [columns] = useState([
    { label: "Vendor ID", name: "vendor_id", visible: true },
    { label: "Vendor Name", name: "vendor_name", visible: true },
    { label: "Company", name: "company_name", visible: true },
    { label: "GST Number", name: "gst_number", visible: true },
    { label: "CIN Number", name: "cin_number", visible: true },
    { label: "Company Email", name: "company_email", visible: true },
    { label: "Contact Person", name: "contact_person_name", visible: true },
    { label: "Contact Email", name: "contact_person_email", visible: true },
    { label: "Contact Number", name: "contact_person_number", visible: true },
    { label: "Address Line 1", name: "address_line1", visible: false },
    { label: "Address Line 2", name: "address_line2", visible: false },
    { label: "City", name: "city", visible: false },
    { label: "State", name: "state", visible: false },
    { label: "Pincode", name: "pincode", visible: false },
    { label: "Ext ID", name: "ext_id", visible: false },
    { label: "Organization ID", name: "org_id", visible: false },
    { label: "Is Active", name: "int_status", visible: true },
    { label: "Created By", name: "created_by", visible: false },
    { label: "Created On", name: "created_on", visible: false },
    { label: "Changed By", name: "changed_by", visible: false },
    { label: "Changed On", name: "changed_on", visible: false },
  ]);

  useEffect(() => {
    const fetchVendors = async () => {
      try {
        const response = await API.get("/get-vendors");
        const formattedData = response.data.map(item => ({
          ...item,
          int_status: item.int_status === 1 ? 'Active' : 'Inactive',
          created_on: item.created_on ? new Date(item.created_on).toLocaleString() : '',
          changed_on: item.changed_on ? new Date(item.changed_on).toLocaleString() : ''
        }));
        setData(formattedData);
      } catch (error) {
        console.error("Error fetching vendors:", error);
        toast.error("Failed to fetch vendors");
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

      setData((prev) =>
        prev.filter((vendor) => !selectedRows.includes(vendor.vendor_id))
      );
      setSelectedRows([]);
      toast.success(`${selectedRows.length} vendor(s) deleted successfully`);
      return true; // Return true to indicate successful deletion
    } catch (error) {
      console.error("Error deleting vendors:", error);
      const errorMessage = error.response?.data?.message || "Failed to delete vendors";
      
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

      // Update the data state with the updated vendor
      setData(prev => prev.map(vendor => 
        vendor.vendor_id === editingVendor.vendor_id 
          ? { ...vendor, ...response.data.vendor }
          : vendor
      ));
      
      setShowEditModal(false);
      setEditingVendor(null);
      toast.success("Vendor updated successfully");
    } catch (error) {
      console.error("Error updating vendor:", error);
      const errorMessage = error.response?.data?.message || error.response?.data?.error || "Failed to update vendor";
      toast.error(errorMessage);
    }
  };

  const handleDownload = () => {
    try {
      const filteredData = filterData(data, filterValues, columns.filter(col => col.visible));
      const sortedData = sortData(filteredData);
      const success = exportToExcel(sortedData, columns, "Vendors_List");
      if (success) {
        toast('Vendors exported successfully', { icon: '✅' });
      } else {
        throw new Error('Export failed');
      }
    } catch (error) {
      toast('Failed to export vendors', { icon: '❌' });
    }
  };

  const filters = columns.map((col) => ({
    label: col.label,
    name: col.name,
    options: col.name === 'int_status' ? [
      { label: "Active", value: "Active" },
      { label: "Inactive", value: "Inactive" }
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
        onAdd={canEdit ? () => navigate("/master-data/add-vendor") : null}
        onDeleteSelected={canEdit ? handleDelete : null}
        onDownload={handleDownload}
        data={data}
        selectedRows={selectedRows}
        setSelectedRows={setSelectedRows}
        showAddButton={canEdit}
        showActions={canEdit}
      >
        {({ visibleColumns }) => {
          const filteredData = filterData(data, filterValues, visibleColumns);
          const sortedData = sortData(filteredData);

          return (
            <>
              <CustomTable
                columns={visibleColumns}
                visibleColumns={visibleColumns}
                data={sortedData}
                selectedRows={selectedRows}
                setSelectedRows={setSelectedRows}
                onEdit={canEdit ? handleEdit : null}
                onDelete={canEdit ? (row) => console.log("Delete vendor:", row) : null}
                rowKey="vendor_id"
                showActions={canEdit}
              />
              <EditVendorModal
                show={showEditModal}
                onClose={() => {
                  setShowEditModal(false);
                  setEditingVendor(null);
                }}
                onConfirm={handleUpdate}
                vendor={editingVendor}
              />
            </>
          );
        }}
      </ContentBox>
    </div>
  );
};

export default Vendors;
