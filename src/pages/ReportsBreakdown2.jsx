import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import ContentBox from "../components/ContentBox";
import CustomTable from "../components/CustomTable";
import API from "../lib/axios";
import { filterData } from "../utils/filterData";
import { useNavigation } from "../hooks/useNavigation";
import { useAuthStore } from "../store/useAuthStore";

const ReportsBreakdown2 = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRows, setSelectedRows] = useState([]);
  const [sortConfig, setSortConfig] = useState({ sorts: [] });
  const [filterValues, setFilterValues] = useState({
    columnFilters: [],
    fromDate: "",
    toDate: "",
  });

  // Access control
  const { canEdit, canDelete, getAccessLevel } = useNavigation();
  const hasEditAccess = canEdit('REPORTBREAKDOWN2');
  const hasDeleteAccess = canDelete('REPORTBREAKDOWN2');
  const accessLevel = getAccessLevel('REPORTBREAKDOWN2');
  const isReadOnly = accessLevel === 'D';
  
  // Debug logging
  console.log('ReportsBreakdown2 - Access Level:', accessLevel);
  console.log('ReportsBreakdown2 - Has Edit Access:', hasEditAccess);
  console.log('ReportsBreakdown2 - Has Delete Access:', hasDeleteAccess);
  console.log('ReportsBreakdown2 - Is Read Only:', isReadOnly);
  const [columns] = useState([
    { label: "Breakdown ID", name: "abr_id", visible: true },
    { label: "Asset ID", name: "asset_id", visible: true },
    { label: "Breakdown Code", name: "atbrrc_id", visible: true },
    { label: "Reported By", name: "reported_by", visible: true },
    { label: "Status", name: "status", visible: true },
    { label: "Description", name: "description", visible: true },
    { label: "Org ID", name: "org_id", visible: true },
  ]);

  const handleEdit = (breakdown) => {
    navigate("/edit-breakdown", { state: { breakdown } });
  };

  useEffect(() => {
    const fetchBreakdowns = async () => {
      if (!user) return; // Wait for user data to be available
      
      setIsLoading(true);
      try {
        const res = await API.get("/reportbreakdown/reports");
        const raw = Array.isArray(res.data?.data)
          ? res.data.data
          : Array.isArray(res.data)
          ? res.data
          : [];
        
        // Filter breakdowns created by the current user
        // Match by user_id, emp_int_id, or dept_id depending on what's in reported_by
        const currentUserId = user?.user_id || user?.emp_int_id;
        const currentDeptId = user?.dept_id;
        
        const userBreakdowns = raw.filter((b) => {
          return b.reported_by === currentUserId || b.reported_by === currentDeptId;
        });
        
        const formatted = userBreakdowns.map((b) => ({
          ...b,
          created_on: b.created_at
            ? new Date(b.created_at).toLocaleString()
            : "",
        }));
        setData(formatted);
      } catch (err) {
        console.error("Failed to fetch breakdowns", err);
        setData([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchBreakdowns();
  }, [user]);

  const handleSort = (column) => {
    setSortConfig((prevConfig) => {
      const { sorts } = prevConfig;
      const existingSort = sorts.find((s) => s.column === column);
      if (!existingSort) {
        return {
          sorts: [
            ...sorts,
            { column, direction: "asc", order: sorts.length + 1 },
          ],
        };
      } else if (existingSort.direction === "asc") {
        return {
          sorts: sorts.map((s) =>
            s.column === column ? { ...s, direction: "desc" } : s
          ),
        };
      } else {
        return {
          sorts: sorts
            .filter((s) => s.column !== column)
            .map((s, idx) => ({ ...s, order: idx + 1 })),
        };
      }
    });
  };

  const sortData = (rows) => {
    if (!sortConfig.sorts.length) return rows;
    return [...rows].sort((a, b) => {
      for (const { column, direction } of sortConfig.sorts) {
        const aValue = a[column];
        const bValue = b[column];
        if (aValue == null) return 1;
        if (bValue == null) return -1;
        if (!isNaN(aValue) && !isNaN(bValue)) {
          const diff = direction === "asc" ? aValue - bValue : bValue - aValue;
          if (diff !== 0) return diff;
        } else {
          const diff =
            direction === "asc"
              ? String(aValue).localeCompare(String(bValue))
              : String(bValue).localeCompare(String(aValue));
          if (diff !== 0) return diff;
        }
      }
      return 0;
    });
  };

  const handleFilterChange = (filterType, value) => {
    setFilterValues((prev) => {
      if (filterType === "columnFilters") {
        return { ...prev, columnFilters: value };
      } else if (filterType === "fromDate" || filterType === "toDate") {
        return { ...prev, [filterType]: value };
      } else {
        return { ...prev, [filterType]: value };
      }
    });
  };

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
        onSort={handleSort}
        sortConfig={sortConfig}
        data={data}
        selectedRows={selectedRows}
        setSelectedRows={setSelectedRows}
        showAddButton={hasEditAccess}
        showDeleteButton={hasDeleteAccess}
        showActions={true}
        isReadOnly={isReadOnly}
        onAdd={hasEditAccess ? () => navigate("/breakdown-selection2") : null}
      >
        {({ visibleColumns }) => {
          const filtered = filterData(data, filterValues, visibleColumns);
          const sorted = sortData(filtered);
          return (
            <CustomTable
              visibleColumns={visibleColumns}
              data={isLoading ? [] : sorted}
              selectedRows={selectedRows}
              setSelectedRows={setSelectedRows}
              rowKey="abr_id"
              showActions={true}
              onEdit={handleEdit}
              isReadOnly={isReadOnly}
            />
          );
        }}
      </ContentBox>
    </div>
  );
};

export default ReportsBreakdown2;

