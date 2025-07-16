import { useEffect, useState } from "react";
import ContentBox from "../../components/ContentBox";
import CustomTable from "../../components/CustomTable";
import { filterData } from "../../utils/filterData";
import { useNavigate } from "react-router-dom";
import API from "../../lib/axios";
import AddEntityForm from '../../components/AddBranch';

const Vendors = () => {
  const navigate = useNavigate();

  const [data, setData] = useState([]);
  const [filterValues, setFilterValues] = useState({});
  const [searchKeyword, setSearchKeyword] = useState(""); // ✅ New
  const [dateRange, setDateRange] = useState({ from: "", to: "" }); // ✅ New

  const [sortConfig, setSortConfig] = useState({
    column: null,
    direction: null,
  });
  const [selectedRows, setSelectedRows] = useState([]);
  // Remove all showAddVendor, loading, and AddEntityForm/modal logic
  // Only keep the vendor list and ContentBox

  const [columns] = useState([
    { label: "Vendor ID", name: "id", visible: true },
    { label: "Vendor Name", name: "text", visible: true },
    { label: "Company", name: "text", visible: true },
    { label: "GST Number", name: "gst_number", visible: true },
    { label: "CIN Number", name: "cin_number", visible: true },
    { label: "Company Email", name: "email", visible: true },
    { label: "Company Number", name: "company_number", visible: true },
    { label: "Address 1", name: "address_1", visible: false },
    { label: "Address 2", name: "address_2", visible: false },
    { label: "City", name: "city", visible: false },
    { label: "State", name: "state", visible: false },
    { label: "Pincode", name: "pincode", visible: false },
    { label: "Ext ID", name: "ext_id", visible: true },
    { label: "Organization ID", name: "org_id", visible: true },
    { label: "Is Active", name: "int_status", visible: true },
    { label: "Created By", name: "created_by", visible: false },
    { label: "Created On", name: "created_on", visible: false },
    { label: "Changed By", name: "changed_by", visible: false },
    { label: "Changed On", name: "changed_on", visible: false },
  ]);

  useEffect(() => {
    const fetchBranches = async () => {
      try {
        const response = await API.get("/branches");
        setData(response.data);
      } catch (error) {
        console.error("Error fetching branches:", error);
      }
    };

    fetchBranches();
  }, []);

  const handleSort = (columnName, direction) => {
    setSortConfig({ column: columnName, direction });
  };

  const handleFilterChange = (name, value) => {
    if (name === "text") {
      setSearchKeyword(value); // ✅ Handle text search
    } else if (name === "fromDate" || name === "toDate") {
      setDateRange((prev) => ({
        ...prev,
        [name === "fromDate" ? "from" : "to"]: value,
      }));
    } else {
      setFilterValues((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedRows.length === 0) return;

    const confirmDelete = window.confirm(
      "Are you sure you want to delete the selected branches?"
    );
    if (!confirmDelete) return;

    try {
      await API.delete("/branches", {
        data: { ids: selectedRows },
      });

      setData((prev) =>
        prev.filter((branch) => !selectedRows.includes(branch.id))
      );
      setSelectedRows([]);
      alert("Branches deleted successfully.");
    } catch (error) {
      console.error("Error deleting branches:", error);
      alert("Failed to delete branches. Please try again.");
    }
  };

  // Remove all handleAddVendor, loading, and AddEntityForm/modal logic
  // Only keep the vendor list and ContentBox

  const filters = columns.map((col) => ({
    label: col.label,
    name: col.name,
    options: [],
    onChange: (value) => handleFilterChange(col.name, value),
  }));

  return (
    <div className="p-4">
      <ContentBox
        filters={filters}
        onFilterChange={handleFilterChange}
        onDeleteSelected={handleDeleteSelected}
        onSort={handleSort}
        data={data}
        sortConfig={sortConfig}
        onAdd={() => setShowAddVendor(true)}
        onDownload={() => console.log("Download Branch")}
      >
        {({ visibleColumns, columnWidth }) => {
          let filteredData = data;

          if (searchKeyword) {
            const keyword = searchKeyword.toLowerCase();

            const searchableFields = columns
              .map((col) => col.name)
              .filter(
                (field) =>
                  typeof data?.[0]?.[field] === "string" ||
                  typeof data?.[0]?.[field] === "number"
              );

            filteredData = filteredData.filter((item) =>
              searchableFields.some((field) => {
                const value = item[field];
                return value?.toString().toLowerCase().includes(keyword);
              })
            );
          }

          // ✅ Apply date range
          if (dateRange.from && dateRange.to) {
            const fromDate = new Date(dateRange.from);
            const toDate = new Date(dateRange.to);

            filteredData = filteredData.filter((item) => {
              const itemDate = new Date(item.created_on); // Ensure field exists
              return itemDate >= fromDate && itemDate <= toDate;
            });
          }

          // ✅ Apply sorting
          if (sortConfig.column && sortConfig.direction) {
            filteredData = [...filteredData].sort((a, b) => {
              const valA = a[sortConfig.column];
              const valB = b[sortConfig.column];

              if (valA == null) return 1;
              if (valB == null) return -1;

              if (!isNaN(valA) && !isNaN(valB)) {
                return sortConfig.direction === "asc"
                  ? valA - valB
                  : valB - valA;
              }

              return sortConfig.direction === "asc"
                ? valA.toString().localeCompare(valB.toString())
                : valB.toString().localeCompare(valA.toString());
            });
          }

          return (
            <CustomTable
              columns={visibleColumns}
              visibleColumns={visibleColumns}
              data={filteredData}
              columnWidth={columnWidth}
              selectedRows={selectedRows}
              setSelectedRows={setSelectedRows}
              onEdit={(row) => console.log("Edit branch:", row)}
              rowKey="id"
            />
          );
        }}
      </ContentBox>
      {/* Add Branch Modal or Inline */}
      {/* Remove all showAddVendor, loading, and AddEntityForm/modal logic */}
      {/* Only keep the vendor list and ContentBox */}
    </div>
  );
};

export default Vendors;
