import { useEffect, useState } from "react";
import ContentBox from "../../components/ContentBox";
import CustomTable from "../../components/CustomTable";
import { filterData } from "../../utils/filterData"; 
import API from "../../lib/axios";


const Users = () => {
  const [data, setData] = useState([]);
  const [filterValues, setFilterValues] = useState({});
  const [sortConfig, setSortConfig] = useState({
    column: null,
    direction: null,
  });
  const [selectedRows, setSelectedRows] = useState([]);

  const handleSort = (columnName, direction) => {
    if (!columnName || !direction) {
      setSortConfig({ column: null, direction: null });
      return;
    }
    setSortConfig({ column: columnName, direction });
  };

  const [columns, setColumns] = useState([
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

  // Mock Data (you can replace with actual API later)
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await API.get(
          "/users/get-users"
        ); 
        setData(response.data); 
      } catch (error) {
        console.error("Error fetching users:", error);
      }
    };

    fetchUsers();
  }, []);

  const handleFilterChange = (name, value) => {
    setFilterValues((prev) => ({ ...prev, [name]: value }));
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
  

  const filters = columns.map((col) => ({
    label: col.label,
    name: col.name,
    options: [], // no filter here anymore
    onChange: (value) => handleFilterChange(col.name, value),
  }));

  return (
    <div className="p-4">
      <ContentBox
        filters={filters}
        onFilterChange={handleFilterChange}
        onDeleteSelected={handleDeleteSelected}
        onSort={handleSort}
        sortConfig={sortConfig}
        onAdd={() => console.log("Add User")}
        // onDelete={() => console.log("Delete User")}
        onDownload={() => console.log("Download Users")}
      >
        {({ visibleColumns, columnWidth }) => {
          let filteredData = filterData(data, filterValues, columns);

          if (sortConfig.column && sortConfig.direction) {
            filteredData = [...filteredData].sort((a, b) => {
              const valA = a[sortConfig.column];
              const valB = b[sortConfig.column];

              if (valA === null || valA === undefined) return 1;
              if (valB === null || valB === undefined) return -1;

              // Numeric sort
              if (!isNaN(valA) && !isNaN(valB)) {
                return sortConfig.direction === "asc"
                  ? valA - valB
                  : valB - valA;
              }

              // String sort
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
              onEdit={(row) => console.log("Edit:", row)}
              rowKey="user_id"
            />
          );
        }}
      </ContentBox>
    </div>
  );
};

export default Users;
