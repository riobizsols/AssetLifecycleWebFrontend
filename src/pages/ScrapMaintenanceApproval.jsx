import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import ContentBox from "../components/ContentBox";
import CustomTable from "../components/CustomTable";
import { filterData } from "../utils/filterData";
import API from "../lib/axios";
import { toast } from "react-hot-toast";

const ScrapMaintenanceApproval = () => {
  const navigate = useNavigate();
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRows, setSelectedRows] = useState([]);
  const [filterValues, setFilterValues] = useState({
    columnFilters: [],
    fromDate: "",
    toDate: "",
  });

  const [columns] = useState([
    { label: "Workflow ID", name: "wfscrap_h_id", visible: true },
    { label: "Asset Type", name: "asset_type_name", visible: true },
    { label: "Group ID", name: "assetgroup_id", visible: true },
    { label: "Group Name", name: "asset_group_name", visible: true },
    { label: "Assets", name: "asset_count", visible: true },
    { label: "Scrap Sales", name: "is_scrap_sales", visible: true },
    { label: "Status", name: "status", visible: true },
    { label: "Created On", name: "created_on", visible: true },
  ]);

  useEffect(() => {
    fetchApprovals();
  }, []);

  const fetchApprovals = async () => {
    setIsLoading(true);
    try {
      const res = await API.get("/scrap-maintenance/approvals");
      const approvals = res.data?.approvals || [];

      const formatted = approvals.map((row) => ({
        ...row,
        status: row.header_status,
        created_on: row.created_on ? new Date(row.created_on).toLocaleDateString() : "",
        is_scrap_sales: row.is_scrap_sales === "Y" ? "Yes" : "No",
      }));

      setData(formatted);
    } catch (err) {
      console.error("Failed to fetch scrap approvals", err);
      toast.error("Failed to fetch scrap approvals");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilterChange = (columnName, value) => {
    if (columnName === "columnFilters") {
      setFilterValues((prev) => ({ ...prev, columnFilters: value }));
      return;
    }
    if (columnName === "fromDate" || columnName === "toDate") {
      setFilterValues((prev) => ({ ...prev, [columnName]: value }));
      return;
    }

    setFilterValues((prev) => ({
      ...prev,
      columnFilters: prev.columnFilters.filter((f) => f.column !== columnName),
      ...(value && {
        columnFilters: [
          ...prev.columnFilters.filter((f) => f.column !== columnName),
          { column: columnName, value },
        ],
      }),
    }));
  };

  const filters = columns.map((col) => ({
    label: col.label,
    name: col.name,
    options:
      col.name === "status"
        ? [
            { label: "Initiated", value: "IN" },
            { label: "In Progress", value: "IP" },
            { label: "Completed", value: "CO" },
            { label: "Cancelled", value: "CA" },
          ]
        : col.name === "is_scrap_sales"
        ? [
            { label: "Scrap Sales", value: "Yes" },
            { label: "Scrap Assets", value: "No" },
          ]
        : [],
    onChange: (value) => handleFilterChange(col.name, value),
  }));

  const handleRowClick = (row) => {
    navigate(`/scrap-approval-detail/${row.wfscrap_h_id}?context=SCRAPMAINTENANCEAPPROVAL`, {
      state: { context: "SCRAPMAINTENANCEAPPROVAL" },
    });
  };

  return (
    <div className="p-4">
      <ContentBox
        filters={filters}
        onFilterChange={handleFilterChange}
        data={data}
        selectedRows={selectedRows}
        setSelectedRows={setSelectedRows}
        showAddButton={false}
        showDeleteButton={false}
        showActions={false}
        title={null}
      >
        {({ visibleColumns, showActions }) => {
          const filtered = filterData(data, filterValues, visibleColumns);

          const visibleCols = visibleColumns.filter((c) => c.visible);
          const colSpan = visibleCols.length + (showActions ? 1 : 0);

          if (isLoading) {
            return (
              <tr>
                <td colSpan={colSpan} className="text-center py-16">
                  <div className="flex flex-col items-center justify-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading...</p>
                  </div>
                </td>
              </tr>
            );
          }

          if (filtered.length === 0) {
            return (
              <tr>
                <td colSpan={colSpan} className="text-center py-16">
                  <p className="text-xl font-semibold text-gray-800">No Data Found</p>
                </td>
              </tr>
            );
          }

          return (
            <CustomTable
              columns={visibleColumns}
              visibleColumns={visibleColumns}
              data={filtered}
              selectedRows={selectedRows}
              setSelectedRows={setSelectedRows}
              rowKey="wfscrap_h_id"
              showActions={showActions}
              onRowClick={handleRowClick}
            />
          );
        }}
      </ContentBox>
    </div>
  );
};

export default ScrapMaintenanceApproval;

