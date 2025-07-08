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
    { label: "Vendor Id", name: "vendor_id", visible: true },
    { label: "Purchase Cost", name: "purchase_cost", visible: true },
    { label: "Expiry Date", name: "expiry_date", visible: true },
    { label: "Warranty Period", name: "warranty_period", visible: true },
    { label: "Branch Code", name: "branch_code", visible: false },
    { label: "Description", name: "description", visible: false },
    { label: "Asset ID", name: "asset_id", visible: false },
    { label: "Additional Column", name: "additional_column", visible: false },
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
        title="Assets"
        filters={filters}
        onFilterChange={handleFilterChange}
        onAdd={() => console.log("Add")}
        onDelete={() => console.log("Delete")}
        onDownload={() => console.log("Download")}
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
