import { useEffect, useState } from "react";
import ContentBox from "../components/ContentBox";
import CustomTable from "../components/CustomTable";
import { filterData } from "../utils/filterData";
import { exportToExcel } from "../utils/exportToExcel";
import { useNavigate } from "react-router-dom";
import API from "../lib/axios";
import { toast } from "react-hot-toast";

const Assets = () => {
  const navigate = useNavigate();
  const [data, setData] = useState([]);
  const [filterValues, setFilterValues] = useState({
    columnFilters: [],
    fromDate: "",
    toDate: ""
  });
  const [selectedRows, setSelectedRows] = useState([]);
  const [sortConfig, setSortConfig] = useState({
    sorts: []
  });

  const [columns] = useState([
    { label: "Asset Id", name: "asset_id", visible: true },
    { label: "Asset Type Id", name: "asset_type_id", visible: true },
    { label: "Asset Name", name: "text", visible: true },
    { label: "Serial Number", name: "serial_number", visible: true },
    { label: "Description", name: "description", visible: true },
    { label: "Current Status", name: "current_status", visible: true },
    { label: "Purchase Cost", name: "purchased_cost", visible: true },
    { label: "Purchase Date", name: "purchased_on", visible: true },
    { label: "Purchase By", name: "purchased_by", visible: true },
    { label: "Expiry Date", name: "expiry_date", visible: true },
    { label: "Warranty Period", name: "warranty_period", visible: true },
    { label: "Branch Id", name: "branch_id", visible: true },
    { label: "Vendor Id", name: "vendor_id", visible: true },
    { label: "Parent Id", name: "parent_id", visible: true },
    { label: "Group Id", name: "group_id", visible: true },
    { label: "Maintenance Schedule Id", name: "maintsch_id", visible: false },
    { label: "Product/Service Id", name: "prod_serve_id", visible: false },
    { label: "Ext Id", name: "ext_id", visible: false },
    { label: "Org Id", name: "org_id", visible: false },
    { label: "Created By", name: "created_by", visible: false },
    { label: "Created On", name: "created_on", visible: false },
    { label: "Changed By", name: "changed_by", visible: false },
    { label: "Changed On", name: "changed_on", visible: false }
  ]);

  useEffect(() => {
    const fetchAssets = async () => {
      try {
        const res = await API.get("/assets/all-assets");
        const formattedData = res.data.map(item => ({
          ...item,
          current_status: item.current_status === 1 ? 'Active' : 'Inactive',
          purchased_on: item.purchased_on ? new Date(item.purchased_on).toLocaleString() : '',
          expiry_date: item.expiry_date ? new Date(item.expiry_date).toLocaleString() : '',
          created_on: item.created_on ? new Date(item.created_on).toLocaleString() : '',
          changed_on: item.changed_on ? new Date(item.changed_on).toLocaleString() : '',
          purchased_cost: item.purchased_cost ? `₹${item.purchased_cost.toLocaleString()}` : ''
        }));
        setData(formattedData);
      } catch (err) {
        console.error("Failed to fetch assets:", err);
        toast.error("Failed to fetch assets");
      }
    };
    fetchAssets();
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

        // Remove currency symbol and commas for cost comparison
        if (column === 'purchased_cost') {
          const aNum = parseFloat(String(aValue).replace(/[₹,]/g, ''));
          const bNum = parseFloat(String(bValue).replace(/[₹,]/g, ''));
          if (!isNaN(aNum) && !isNaN(bNum)) {
            const diff = direction === 'asc' ? aNum - bNum : bNum - aNum;
            if (diff !== 0) return diff;
            continue;
          }
        }

        // Handle date fields
        if (['purchased_on', 'expiry_date', 'created_on', 'changed_on'].includes(column)) {
          const aDate = new Date(aValue);
          const bDate = new Date(bValue);
          if (!isNaN(aDate) && !isNaN(bDate)) {
            const diff = direction === 'asc' ? aDate - bDate : bDate - aDate;
            if (diff !== 0) return diff;
            continue;
          }
        }

        // Default string comparison
        const diff = direction === 'asc' 
          ? String(aValue).localeCompare(String(bValue))
          : String(bValue).localeCompare(String(aValue));
        if (diff !== 0) return diff;
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

  const handleDeleteSelected = async () => {
    if (selectedRows.length === 0) {
      toast.error("Please select assets to delete");
      return;
    }

    const confirmDelete = window.confirm(
      "Are you sure you want to delete the selected assets?"
    );
    if (!confirmDelete) return;

    try {
      await API.delete("/assets", {
        data: { ids: selectedRows },
      });

      setData((prev) =>
        prev.filter((asset) => !selectedRows.includes(asset.asset_id))
      );
      setSelectedRows([]);
      toast.success("Assets deleted successfully");
    } catch (error) {
      console.error("Error deleting assets:", error);
      toast.error("Failed to delete assets");
    }
  };

  const handleDownload = () => {
    try {
      const filteredData = filterData(data, filterValues, columns.filter(col => col.visible));
      const sortedData = sortData(filteredData);
      const success = exportToExcel(sortedData, columns, "Assets_List");
      if (success) {
        toast('Assets exported successfully', { icon: '✅' });
      } else {
        throw new Error('Export failed');
      }
    } catch (error) {
      toast('Failed to export assets', { icon: '❌' });
    }
  };

  const filters = columns.map((col) => ({
    label: col.label,
    name: col.name,
    options: col.name === 'current_status' ? [
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
        onAdd={() => navigate("/assets/add")}
        onDelete={handleDeleteSelected}
        onDownload={handleDownload}
        data={data}
        selectedRows={selectedRows}
        setSelectedRows={setSelectedRows}
      >
        {({ visibleColumns }) => {
          const filteredData = filterData(data, filterValues, visibleColumns);
          const sortedData = sortData(filteredData);

          return (
            <CustomTable
              columns={visibleColumns}
              visibleColumns={visibleColumns}
              data={sortedData}
              selectedRows={selectedRows}
              setSelectedRows={setSelectedRows}
              onEdit={(row) => console.log("Edit asset:", row)}
              onDelete={(row) => console.log("Delete asset:", row)}
              rowKey="asset_id"
            />
          );
        }}
      </ContentBox>
    </div>
  );
};

export default Assets;
