import { useEffect, useState, useMemo } from "react";
import ContentBox from "../../components/ContentBox";
import CustomTable from "../../components/CustomTable";
// import { filterData as applyFilterLogic } from "../../utils/filterData"; // You might not need this if you're doing filtering in useMemo
import API from "../../lib/axios";

const Users = () => {
  const [data, setData] = useState([]); // Raw data fetched from API
  const [filterValues, setFilterValues] = useState({
    columnFilters: [], // This will be an array like: [{ column: 'status', value: 'Active' }]
    fromDate: "",
    toDate: "",
  });
  const [sortConfig, setSortConfig] = useState({
    column: null,
    direction: null,
  });
  const [selectedRows, setSelectedRows] = useState([]);

  // Define your columns structure once
  const [columns] = useState([
    { label: "Ext ID", name: "ext_id", visible: true },
    { label: "Organization ID", name: "org_id", visible: true },
    { label: "User ID", name: "user_id", visible: true },
    { label: "Full Name", name: "full_name", visible: true },
    { label: "Email", name: "email", visible: true },
    { label: "Mobile Number", name: "phone", visible: true },
    { label: "Role", name: "job_role_id", visible: true },
    { label: "Password", name: "password", visible: false },
    { label: "Created By", name: "created_by", visible: false },
    { label: "Created On", name: "created_on", visible: false },
    { label: "Changed By", name: "changed_by", visible: false },
    { label: "Changed On", name: "changed_on", visible: false },
    { label: "Reset Token", name: "reset_token", visible: false },
    { label: "Reset Token Expiry", name: "reset_token_expiry", visible: false },
    { label: "Last Accessed", name: "last_accessed", visible: false },
    { label: "Time Zone", name: "time_zone", visible: false },
    { label: "Date Format", name: "date_format", visible: false },
    { label: "Language", name: "language_code", visible: false },
    { label: "Is Active", name: "int_status", visible: false },
  ]);

  // Filters definition to pass to ContentBox
  const filtersForContentBox = columns.map((col) => ({
    label: col.label,
    name: col.name,
  }));

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await API.get("/users/get-users");
        setData(response.data);
      } catch (error) {
        console.error("Error fetching users:", error);
      }
    };
    fetchUsers();
  }, []);

  const handleFilterChange = (filterType, value) => {
    // This correctly updates filterValues based on what ContentBox sends
    setFilterValues((prev) => ({ ...prev, [filterType]: value }));
  };

  const handleSort = (columnName, direction) => {
    if (!columnName || !direction) {
      setSortConfig({ column: null, direction: null });
      return;
    }
    setSortConfig({ column: columnName, direction });
  };

  const handleDeleteSelected = async () => {
    if (selectedRows.length === 0) return;

    const confirmDelete = window.confirm(
      "Are you sure you want to delete the selected users?"
    );
    if (!confirmDelete) return;

    try {
      await API.delete("/users/delete-users", {
        data: { user_ids: selectedRows }, // Axios requires data to be in `data` for DELETE
      });

      // Update UI after deletion
      setData((prev) =>
        prev.filter((user) => !selectedRows.includes(user.user_id))
      );
      setSelectedRows([]);
      console.log("Users deleted successfully.");
    } catch (error) {
      console.error("Error deleting users:", error);
      alert("Failed to delete users. Please try again.");
    }
  };

  // --- Memoized Filtering and Sorting Logic ---
  const filteredAndSortedData = useMemo(() => {
    let currentData = [...data]; // Start with the raw fetched data

    // Apply column filters
    if (filterValues.columnFilters && filterValues.columnFilters.length > 0) {
      currentData = currentData.filter((item) => {
        // A row must satisfy ALL active column filters
        return filterValues.columnFilters.every((cf) => {
          if (cf.column && cf.value) {
            // Compare string representations to avoid strict type issues
            // This is crucial for matching filter values from dropdown to data
            return String(item[cf.column]) === String(cf.value);
          }
          return true; // If a filter entry is incomplete, it doesn't exclude rows
        });
      });
    }

    // Apply date range filter (assuming you have a 'created_on' or similar date field)
    if (filterValues.fromDate && filterValues.toDate) {
      currentData = currentData.filter((item) => {
        const itemDate = new Date(item.created_on); // **IMPORTANT:** Change 'created_on' to your actual date column name in your data
        const fromDate = new Date(filterValues.fromDate);
        const toDate = new Date(filterValues.toDate);
        // Compare dates, ensuring to include the end date by setting to the end of the day
        fromDate.setHours(0, 0, 0, 0);
        toDate.setHours(23, 59, 59, 999);
        return itemDate >= fromDate && itemDate <= toDate;
      });
    }

    // Apply sorting
    if (sortConfig.column && sortConfig.direction) {
      currentData.sort((a, b) => {
        const valA = a[sortConfig.column];
        const valB = b[sortConfig.column];

        // Handle null/undefined values for consistent sorting behavior
        if (valA === null || valA === undefined) return 1;
        if (valB === null || valB === undefined) return -1;

        // Numeric sort (robustly convert to number)
        if (!isNaN(Number(valA)) && !isNaN(Number(valB))) {
          return sortConfig.direction === "asc"
            ? Number(valA) - Number(valB)
            : Number(valB) - Number(valA);
        }

        // String sort (case-insensitive for better user experience)
        return sortConfig.direction === "asc"
          ? String(valA).localeCompare(String(valB), undefined, {
              sensitivity: "base",
            })
          : String(valB).localeCompare(String(valA), undefined, {
              sensitivity: "base",
            });
      });
    }

    return currentData;
  }, [data, filterValues, sortConfig]); // Dependencies for recalculation

  return (
    <div className="p-4">
      <ContentBox
        // title="Users List"
        filters={filtersForContentBox}
        onFilterChange={handleFilterChange}
        onDeleteSelected={handleDeleteSelected}
        onSort={handleSort}
        sortConfig={sortConfig}
        data={data} // Pass the RAW data here so ContentBox can populate dropdowns
        selectedRows={selectedRows}
        setSelectedRows={setSelectedRows}
      >
        {({ visibleColumns }) => (
          <CustomTable
            columns={visibleColumns}
            visibleColumns={visibleColumns} // Pass visibleColumns explicitly to CustomTable if it uses it
            data={filteredAndSortedData} // Pass the FILTERED AND SORTED data to CustomTable
            selectedRows={selectedRows}
            setSelectedRows={setSelectedRows}
            onEdit={(row) => console.log("Edit:", row)}
            rowKey="user_id"
          />
        )}
      </ContentBox>
    </div>
  );
};

export default Users;
