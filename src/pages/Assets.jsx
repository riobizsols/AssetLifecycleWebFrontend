import { useEffect, useState } from "react";
import ContentBox from "../components/ContentBox";
import CustomTable from "../components/CustomTable";
import { filterData } from "../utils/filterData";
import API from "../lib/axios";

const Assets = () => {
  const [data, setData] = useState([]);
  const [filterValues, setFilterValues] = useState({});
  const [selectedRows, setSelectedRows] = useState([]); // <-- Add this line

  const [columns, setColumns] = useState([
    { label: "Asset Id", name: "asset_id", visible: true },
    { label: "Asset Type Id", name: "asset_type_id", visible: true },
    { label: "Asset Name", name: "text", visible: true },
    { label: "Serial Number", name: "serial_number", visible: true },
    { label: "Description", name: "description", visible: true },
    { label: "Vendor Id", name: "vendor_id", visible: true },
    { label: "Maintenance Schedule Id", name: "maintsch_id", visible: true },
    { label: "Product/Service Id", name: "prod_serve_id", visible: true },
    { label: "Purchase Cost", name: "purchased_cost", visible: true },
    { label: "Branch Id", name: "branch_id", visible: true },
    { label: "Purchase Date", name: "purchased_on", visible: true },
    { label: "Purchase By", name: "purchased_by", visible: true },
    { label: "Ext Id", name: "ext_id", visible: false },
    { label: "Expiry Date", name: "expiry_date", visible: true },
    { label: "Current Status", name: "current_status", visible: true },
    { label: "Warranty Period", name: "warranty_period", visible: true },
    { label: "Parent Id", name: "parent_id", visible: true },
    { label: "Group Id", name: "group_id", visible: true },
    { label: "Org Id", name: "org_id", visible: true },
    { label: "Created By", name: "created_by", visible: true },
    { label: "Created On", name: "created_on", visible: true },
    { label: "Changed By", name: "changed_by", visible: true },
    { label: "Changed On", name: "changed_on", visible: true },
    
  ]);

  // 👇 Real API fetch — or replace with mockData for local test
  useEffect(() => {
    const fetchAssets = async () => {
      try {
        const res = await API.get("/assets/all-assets");
        setData(res.data);
      } catch (err) {
        console.error("Failed to fetch assets:", err);
      }
    };
    fetchAssets();
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
              selectedRows={selectedRows} // <-- Pass selectedRows
              setSelectedRows={setSelectedRows} // <-- Pass setSelectedRows
              onEdit={handleEdit}
              onDelete={handleDelete}
              rowKey="asset_id"
            />
          );
        }}
      </ContentBox>
    </div>
  );
};

export default Assets;
