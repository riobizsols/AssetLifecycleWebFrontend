import { useEffect, useState } from "react";
import ContentBox from "../components/ContentBox";
import CustomTable from "../components/CustomTable";
import { filterData } from "../utils/filterData";

const Assets = () => {
  const [data, setData] = useState([]);
  const [filterValues, setFilterValues] = useState({});

  const [columns, setColumns] = useState([
    { label: "Asset Type", name: "asset_type", visible: true },
    { label: "Current Status", name: "current_status", visible: true },
    {
      label: "Maintenance Schedule",
      name: "maintenance_schedule",
      visible: true,
    },
    { label: "Asset Id", name: "asset_id", visible: true },
    { label: "Ext Id", name: "ext_id", visible: false },
    { label: "Org Id", name: "org_id", visible: false },
    { label: "Asset Name", name: "text", visible: true },
    { label: "Serial Number", name: "serial_number", visible: true },
    { label: "Asset Type Id", name: "asset_type_id", visible: true },
    { label: "Status", name: "status", visible: true },
    { label: "Maintenance Schedule", name: "warranty_period", visible: true },
    { label: "Description", name: "description", visible: true },
    { label: "Purchase Vendor Id", name: "vendor_id", visible: true },
    { label: "Brand", name: "brand", visible: true },
    { label: "Model", name: "model", visible: true },
    { label: "Product Vendor Id", name: "product_vendor_id", visible: true },
    { label: "Service Vendor Id", name: "service_vendor_id", visible: true },
    { label: "Branch Code", name: "branch_code", visible: false },
    { label: "Purchase Cost", name: "purchase_cost", visible: false },
    { label: "Expiry Date", name: "expiry_date", visible: false },
  ]);

  // 👇 Real API fetch — or replace with mockData for local test
  useEffect(() => {
    fetch("/api/assets")
      .then((res) => res.json())
      .then((resData) => setData(resData))
      .catch((err) => console.error("Failed to fetch assets:", err));
  }, []);

  const handleFilterChange = (name, value) => {
    setFilterValues((prev) => ({ ...prev, [name]: value }));
  };

  const handleToggleColumn = (name) => {
    const updated = columns.map((col) =>
      col.name === name ? { ...col, visible: !col.visible } : col
    );
    setColumns(updated);
  };

  const handleEdit = (row) => {
    console.log("Edit:", row);
  };

  const handleDelete = (row) => {
    console.log("Delete:", row);
  };

  const filters = columns.map((col) => ({
    label: col.label,
    name: col.name,
    options: [
      { label: "Yes", value: "yes" },
      { label: "No", value: "no" },
    ],
    onChange: (value) => handleFilterChange(col.name, value),
  }));

  return (
    <div className="p-4">
      <ContentBox
        // title="Assets"
        filters={filters}
        onFilterChange={handleFilterChange}
        onAdd={() => console.log("Add")}
        onDelete={() => console.log("Delete")}
        onDownload={() => console.log("Download")}
        data={data}
      >
        {({ visibleColumns }) => {
          const filteredData = filterData(data, filterValues, visibleColumns);

          return (
            <CustomTable
              columns={visibleColumns}
              visibleColumns={visibleColumns}
              data={filteredData}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          );
        }}
      </ContentBox>
    </div>
  );
};

export default Assets;
